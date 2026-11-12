import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  buildVerifiedLeadConversionsQuery,
  cplGateConversions,
  fetchVerifiedLeadConversionsByCampaign,
  mapVerifiedConversionRows,
  type EnumeratedCampaign,
} from './campaign-enumeration';
import { buildCycleDigest, runAutonomousClientCycle, type AutonomousCycleDependencies } from './autonomous-cycle';
import { buildGoogleAdsOperatorTasks } from './operator';
import { evaluateCampaignAge } from './campaignAge';
import { writeAutonomyPolicy, type GoogleAdsAutonomyPolicy } from './autonomy';
import type { CampaignConfig } from '../crm/intelligence';

/**
 * ads-bot-phase2 spec §11 "Step 0" — 0e (cycle wiring), 0f (verified-only GAQL) and 0g (the
 * budget_tune CPL gate uses the verified count). Temp dirs only; nothing touches data/clients.
 */

const VERIFIED = 'customers/1725891566/conversionActions/7705676785';
const now = new Date('2026-11-12T08:00:00.000Z');

function enumerated(overrides: Partial<EnumeratedCampaign> = {}): EnumeratedCampaign {
  return { campaignId: '111', campaignName: 'Search', advertisingChannelType: 'SEARCH', isDsaSetting: false, type: 'non-brand', spendIls: 300, conversions: 10, cpl: 30, ...overrides };
}

function campaign(): CampaignConfig {
  return {
    slug: 'step0-campaign',
    mode: 'test',
    customerId: '1725891566',
    businessName: 'Step0',
    targetDailyBudget: 150,
    avgJobValue: 1000,
    closeRateEstimate: 0.2,
    cplCeilingIls: 100,
    verifiedLeadConversionResourceName: VERIFIED,
    closedDealConversionResourceName: null,
    createdAt: '2026-08-01T00:00:00.000Z',
  };
}

// ── 0f ───────────────────────────────────────────────────────────────────────
test('0f: verified-only GAQL filters by the verified-lead resource name and reads metrics.conversions', () => {
  const q = buildVerifiedLeadConversionsQuery(VERIFIED);
  assert.match(q, new RegExp(`WHERE segments\\.conversion_action = '${VERIFIED.replace(/\//g, '\\/')}'`));
  assert.match(q, /metrics\.conversions/);
  assert.doesNotMatch(q, /all_conversions/);
  assert.match(q, /segments\.date DURING LAST_30_DAYS/);
  const ranged = buildVerifiedLeadConversionsQuery(VERIFIED, { startDate: '2026-10-01', endDate: '2026-10-31' });
  assert.match(ranged, /segments\.date BETWEEN '2026-10-01' AND '2026-10-31'/);
});

test('0f: malformed resource names and dates never reach the query', () => {
  assert.throws(() => buildVerifiedLeadConversionsQuery("customers/1/conversionActions/2' OR 1=1"));
  assert.throws(() => buildVerifiedLeadConversionsQuery(VERIFIED, { startDate: '2026-10-01', endDate: "x' OR '1" }));
});

test('0f: mapper sums per campaign and ignores rows for any other conversion action', () => {
  const map = mapVerifiedConversionRows([
    { campaign: { id: 111 }, segments: { conversion_action: VERIFIED }, metrics: { conversions: 2 } },
    { campaign: { id: '111' }, segments: { conversion_action: VERIFIED }, metrics: { conversions: '1.5' } },
    { campaign: { id: 111 }, segments: { conversion_action: 'customers/1725891566/conversionActions/999' }, metrics: { conversions: 40 } },
    { campaign: { id: 222 }, segments: { conversion_action: VERIFIED }, metrics: { conversions: 1 } },
  ], VERIFIED);
  assert.equal(map.get('111'), 3.5);
  assert.equal(map.get('222'), 1);
});

test('0f: reader sends the filtered query and maps; an API error is a result, not a throw', async () => {
  const seen: string[] = [];
  const ok = await fetchVerifiedLeadConversionsByCampaign({
    customer: { query: async (gaql: string) => { seen.push(gaql); return [{ campaign: { id: 111 }, segments: { conversion_action: VERIFIED }, metrics: { conversions: 4 } }]; } },
    verifiedLeadConversionResourceName: VERIFIED,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.ok && ok.byCampaign.get('111'), 4);
  assert.ok(seen[0]?.includes(`segments.conversion_action = '${VERIFIED}'`));
  const failed = await fetchVerifiedLeadConversionsByCampaign({ customer: { query: async () => { throw new Error('boom'); } }, verifiedLeadConversionResourceName: VERIFIED });
  assert.deepEqual(failed, { ok: false, error: 'boom' });
});

// ── 0g ───────────────────────────────────────────────────────────────────────
test('0g: cplGateConversions — verified count when read, undefined on error, all_conversions only without a WAO action', () => {
  assert.equal(cplGateConversions(enumerated({ verifiedConversionsSource: 'verified_lead', verifiedConversions: 1 })), 1);
  assert.equal(cplGateConversions(enumerated({ verifiedConversionsSource: 'verified_lead' })), 0);
  assert.equal(cplGateConversions(enumerated({ verifiedConversionsSource: 'error' })), undefined);
  assert.equal(cplGateConversions(enumerated({ verifiedConversionsSource: 'not_configured' })), 10);
  assert.equal(cplGateConversions(enumerated()), 10);
});

// Three CRM leads in the window, one closed, so the digest raises no lead/close alerts and the
// campaign is past launch (growth): only pacing and the CPL ceiling decide budget_tune.
const LEADS = [
  { id: 1, slug: 'step0-campaign', date: '2026-11-01 10:00', quality: 'GOOD', closed: true, revenue: 1000 },
  { id: 2, slug: 'step0-campaign', date: '2026-11-02 10:00', quality: 'GOOD' },
  { id: 3, slug: 'step0-campaign', date: '2026-11-03 10:00', quality: 'GOOD' },
];
const campaignAge = evaluateCampaignAge({ startDate: '2026-08-01T00:00:00.000Z', referenceDate: now });

test('0g regression: budget_tune CPL gate uses the verified count, not all_conversions', () => {
  // ₪300 spend over 30 days. all_conversions = 10 (₪30/lead, under the ₪100 ceiling) but only 1
  // verified lead (₪300/lead, over it). Pacing is "under", which offers budget_tune unless the
  // ceiling is breached.
  const verifiedDigest = buildCycleDigest({ campaign: campaign(), enumerated: enumerated({ verifiedConversionsSource: 'verified_lead', verifiedConversions: 1 }), now, leads: LEADS });
  assert.equal(verifiedDigest.totals.cpl, 300);
  const verifiedTasks = buildGoogleAdsOperatorTasks({ clientId: 'step0-client', digest: verifiedDigest, campaignConfig: campaign(), campaignAge, campaignId: '111', campaignName: 'Search' });
  assert.ok(!verifiedTasks.some(t => t.kind === 'budget_tune'), 'over-ceiling verified CPL must block budget_tune');
  assert.ok(verifiedTasks.some(t => t.kind === 'search_term_cleanup'));

  // The same campaign gated on all_conversions (the pre-fix behaviour) would have been offered a
  // budget increase — this is the bug 0g fixes.
  const legacyDigest = buildCycleDigest({ campaign: campaign(), enumerated: enumerated({ verifiedConversionsSource: 'not_configured' }), now, leads: LEADS });
  assert.equal(legacyDigest.totals.cpl, 30);
  const legacyTasks = buildGoogleAdsOperatorTasks({ clientId: 'step0-client', digest: legacyDigest, campaignConfig: campaign(), campaignAge, campaignId: '111', campaignName: 'Search' });
  assert.ok(legacyTasks.some(t => t.kind === 'budget_tune'));
});

// ── Cycle wiring (0e retry, 0g fail-closed) ──────────────────────────────────
function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'signal-integrity-step0-'));
}

function policy(): GoogleAdsAutonomyPolicy {
  return {
    version: 1,
    clientId: 'client-a',
    mode: 'autonomous',
    authorizedAt: '2026-09-01T00:00:00.000Z',
    authorizedBy: 'owner',
    termsVersion: '2026-09',
    allowedKinds: ['budget_tune', 'search_term_cleanup', 'search_term_harvest'],
    maxDailyBudgetIls: 500,
    maxBudgetChangePctPerRun: 20,
    maxActionsPerRun: 2,
    cooldownHours: 24,
    killSwitch: false,
    clickProtection: { provider: 'fraudblocker', status: 'protected', verifiedAt: '2026-11-11T00:00:00.000Z', maxAgeDays: 7 },
  };
}

function cycleDeps(overrides: Partial<AutonomousCycleDependencies> = {}): AutonomousCycleDependencies {
  return {
    now: () => now,
    loadClient: () => ({ customerId: '1725891566', campaign: campaign() }),
    enumerateCampaigns: async () => [enumerated({ verifiedConversionsSource: 'verified_lead', verifiedConversions: 1 })],
    buildDigest: ({ campaign: c, enumerated: e, now: n }) => buildCycleDigest({ campaign: c, enumerated: e, now: n, leads: LEADS }),
    deriveTasks: (clientId, digest, c, e) => buildGoogleAdsOperatorTasks({ clientId, digest, campaignConfig: c, campaignAge, campaignId: e.campaignId, campaignName: e.campaignName }),
    execute: async () => ({ success: true }),
    syncFraudBlockerHealth: async () => ({ status: 'protected', verifiedAt: now.toISOString(), syncedAt: now.toISOString() }),
    runHybridShadowPlan: async () => ({ status: 'skipped' }) as never,
    retryLeadUploads: async () => ({ attempted: 0, ok: 0, failed: 0, persistErrors: 0, leads: [] }),
    ...overrides,
  };
}

test('0e: the cycle runs the upload retry once per client run and reports it', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  const calls: Array<{ clientId: string; now: Date }> = [];
  const result = await runAutonomousClientCycle('client-a', {
    baseDir,
    runtimeDir: tempDir(),
    dependencies: cycleDeps({ retryLeadUploads: async (p) => { calls.push(p); return { attempted: 1, ok: 1, failed: 0, persistErrors: 0, leads: [{ leadId: 7, types: ['verified-lead'], statuses: ['ok'] }] }; } }),
  });
  assert.equal(result.status, 'ok');
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.clientId, 'client-a');
  assert.deepEqual(result.uploadRetry, { attempted: 1, ok: 1, failed: 0, persistErrors: 0, leads: [{ leadId: 7, types: ['verified-lead'], statuses: ['ok'] }] });
});

test('0e: a throwing retry never breaks the cycle', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  const result = await runAutonomousClientCycle('client-a', { baseDir, runtimeDir: tempDir(), dependencies: cycleDeps({ retryLeadUploads: async () => { throw new Error('leads store down'); } }) });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.uploadRetry, { error: 'leads store down' });
});

test('0g: the autonomous cycle never executes budget_tune on an over-ceiling verified CPL', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  const executed: string[] = [];
  const result = await runAutonomousClientCycle('client-a', { baseDir, runtimeDir: tempDir(), dependencies: cycleDeps({ execute: async ({ task }) => { executed.push(task.kind); return { success: true }; } }) });
  assert.equal(result.status, 'ok');
  assert.ok(!executed.includes('budget_tune'));
  assert.ok(!result.actions.some(a => a.kind === 'budget_tune'));
});

test('0g control: the same cycle gated on all_conversions would have executed budget_tune', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  const executed: string[] = [];
  await runAutonomousClientCycle('client-a', {
    baseDir,
    runtimeDir: tempDir(),
    dependencies: cycleDeps({
      enumerateCampaigns: async () => [enumerated({ verifiedConversionsSource: 'not_configured' })],
      execute: async ({ task }) => { executed.push(task.kind); return { success: true }; },
    }),
  });
  assert.ok(executed.includes('budget_tune'));
});

test('0g: a failed verified-lead read skips the campaign (fail closed), no task, no execution', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  let executions = 0;
  const result = await runAutonomousClientCycle('client-a', {
    baseDir,
    runtimeDir: tempDir(),
    dependencies: cycleDeps({
      enumerateCampaigns: async () => [enumerated({ verifiedConversionsSource: 'error' })],
      execute: async () => { executions += 1; return { success: true }; },
    }),
  });
  assert.equal(result.status, 'ok');
  assert.equal(executions, 0);
  assert.equal(result.actions.length, 0);
  assert.deepEqual(result.skippedCampaigns, [{ campaignId: '111', reason: 'verified_conversions_unavailable' }]);
});
