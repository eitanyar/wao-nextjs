import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import * as ts from 'typescript';
import type { CampaignConfig } from '../crm/intelligence';
import type { GoogleAdsOperatorTask } from './operator';
import { executeGoogleAdsOperatorTask } from './executor';
import type { buildClient } from './mutations';

const campaign = { slug: 'synthetic', mode: 'test', createdAt: '2026-01-01' } as CampaignConfig;
const audit = {
  taskId: 'audit-1', clientId: 'synthetic-client', campaignId: '456', kind: 'tracking_audit',
  title: 'Inspect tracking', recommendedAction: 'Investigate manually',
} as GoogleAdsOperatorTask;
const fail = (label: string): never => { throw new Error(`Unexpected ${label}`); };

type RouteResponse = { status: number; body: Record<string, unknown> };
type Route = { POST: (req: { json: () => Promise<unknown> }) => Promise<RouteResponse> };

function loadRoute(options: { kind?: GoogleAdsOperatorTask['kind']; authenticated?: boolean; entitled?: boolean; stale?: boolean; decisionRecorded?: boolean } = {}) {
  const events: string[] = [];
  const track = (event: string) => { events.push(event); };
  const task = { ...audit, kind: options.kind ?? 'tracking_audit' };
  const approval = { taskId: task.taskId, status: 'approved' };
  const dependencies: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (body: Record<string, unknown>, init?: { status: number }) => ({ body, status: init?.status ?? 200 }) } },
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'synthetic-session' }) }) },
    '@/lib/client-auth': { COOKIE_NAME: 'synthetic-cookie', verifySessionToken: async () => options.authenticated === false ? null : 'synthetic-client' },
    '@/lib/geo/client': { getClientRecord: () => ({ entitlements: [] }) },
    '@/lib/operator/flags': { hasOperatorAccess: () => options.entitled !== false },
    '@/lib/crm/intelligence': {
      loadClientGoogleAdsIndex: () => ({ primarySlug: 'synthetic', primaryCustomerId: '123' }),
      loadCampaignConfigBySlug: () => campaign,
      buildWeeklyDigest: () => ({ windowEnd: '2026-01-02T00:00:00Z', totals: { cpl: null, verifiedLeads: 0, spendIls: 0 } }),
    },
    '@/lib/google-ads/operator': {
      buildGoogleAdsOperatorTasks: () => { track('lookup'); return options.stale ? [] : [task]; },
      readGoogleAdsApprovals: () => { track('read approvals'); return options.decisionRecorded ? [approval] : []; },
      buildApprovalRecord: (...args: unknown[]) => { track('build approval'); return { ...approval, status: args[3] }; },
      appendGoogleAdsApproval: () => { track('append approval'); return options.kind ? undefined : fail('approval append'); },
      updateGoogleAdsApproval: () => { track('update approval'); return options.kind ? undefined : fail('approval update'); },
    },
    '@/lib/mail': { sendGoogleAdsOperatorApprovalEmail: async () => { track('email'); if (!options.kind) fail('email'); } },
    '@/lib/google-ads/executor': { executeGoogleAdsOperatorTask: async () => { track('executor'); if (!options.kind) fail('executor'); return { success: true }; } },
    '@/lib/google-ads/campaign-enumeration': { enumerateEnabledCampaigns: async () => { track('enumerate'); return [{ campaignId: '456', campaignName: 'Synthetic', spendIls: 0, conversions: 0 }]; } },
    '@/lib/google-ads/campaignAge': { evaluateCampaignAge: () => ({ phase: 'growth', ageDays: 30 }) },
  };
  const source = fs.readFileSync(path.join(process.cwd(), 'src/app/api/google-ads/operator-task/route.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Partial<Route> = {};
  vm.runInNewContext(output, { exports, Date, console, require: (name: string) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected module: ${name}`);
    return dependencies[name];
  } }, { filename: 'operator-task/route.ts' });
  assert.ok(exports.POST);
  return { POST: exports.POST, events };
}

function request(decision: 'approve' | 'reject', taskId = 'audit-1') {
  return { json: async () => ({ taskId, decision, correctionNote: 'Synthetic rejection note' }) };
}

test('located tracking audit approve and reject return 409 before approvals, email, executor or provider', async () => {
  for (const decision of ['approve', 'reject'] as const) {
    for (const decisionRecorded of [false, true]) {
      const { POST, events } = loadRoute({ decisionRecorded });
      const response = await POST(request(decision));
      assert.equal(response.status, 409, `${decision}/${decisionRecorded}`);
      assert.match(String(response.body.error), /Manual investigation required/);
      assert.deepEqual(events, ['enumerate', 'lookup']);
    }
  }
});

test('unauthenticated, unentitled and stale decisions retain their existing response and do not write approvals', async () => {
  const unauthorized = loadRoute({ authenticated: false });
  assert.equal((await unauthorized.POST(request('approve'))).status, 401);
  assert.deepEqual(unauthorized.events, []);
  const forbidden = loadRoute({ entitled: false });
  assert.equal((await forbidden.POST(request('reject'))).status, 403);
  assert.deepEqual(forbidden.events, []);
  const stale = loadRoute({ stale: true });
  assert.equal((await stale.POST(request('reject'))).status, 404);
  assert.deepEqual(stale.events, ['enumerate', 'lookup']);
});

test('non-audit approve and reject retain approval, notification, and execution behavior', async () => {
  const approved = loadRoute({ kind: 'general_review' });
  const approvalResponse = await approved.POST(request('approve'));
  assert.equal(approvalResponse.status, 200);
  assert.equal(approvalResponse.body.success, true);
  assert.deepEqual(approved.events, ['enumerate', 'lookup', 'read approvals', 'build approval', 'append approval', 'executor', 'update approval', 'email']);
  const rejected = loadRoute({ kind: 'general_review' });
  const rejectionResponse = await rejected.POST(request('reject'));
  assert.equal(rejectionResponse.status, 200);
  assert.equal(rejectionResponse.body.success, true);
  assert.deepEqual(rejected.events, ['enumerate', 'lookup', 'read approvals', 'build approval', 'append approval', 'email']);
});

test('direct tracking audit executor fails before any customer query or mutation', async () => {
  const clientInstance = new Proxy({}, { get: () => fail('customer/provider access') }) as ReturnType<typeof buildClient>;
  const result = await executeGoogleAdsOperatorTask({ task: audit, campaignConfig: campaign, campaignId: '456', clientInstance });
  assert.equal(result.success, false);
  assert.match(result.error ?? '', /Manual investigation required/);
});
