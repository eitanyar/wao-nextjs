import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  runAllAutonomousClientCycles,
  runAutonomousClientCycle,
  type AutonomousCycleDependencies,
} from './autonomous-cycle';
import { readAutonomousActionEvents, writeAutonomyPolicy, type GoogleAdsAutonomyPolicy } from './autonomy';
import type { GoogleAdsOperatorTask } from './operator';
import type { CampaignConfig, WeeklyDigest } from '../crm/intelligence';

const now = new Date('2026-09-04T00:00:00.000Z');

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'autonomous-cycle-test-'));
}

function policy(overrides: Partial<GoogleAdsAutonomyPolicy> = {}): GoogleAdsAutonomyPolicy {
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
    clickProtection: { provider: 'fraudblocker', status: 'protected', verifiedAt: '2026-09-03T00:00:00.000Z', maxAgeDays: 7 },
    ...overrides,
  };
}

function campaign(): CampaignConfig {
  return { slug: 'campaign-a', mode: 'test', businessName: 'Test', targetDailyBudget: 100, createdAt: '2026-07-01T00:00:00.000Z' } as CampaignConfig;
}

function digest(): WeeklyDigest {
  return { slug: 'campaign-a', customerId: '123', campaignName: 'Test', windowDays: 30, windowStart: '2026-08-05T00:00:00.000Z', windowEnd: '2026-09-04T00:00:00.000Z', totals: { spendIls: 200, verifiedLeads: 4, cpl: 50 }, alerts: [], nextActions: [], pacing: { status: 'under' } } as unknown as WeeklyDigest;
}

function task(kind: GoogleAdsOperatorTask['kind'] = 'search_term_cleanup'): GoogleAdsOperatorTask {
  return { taskId: `task-${kind}`, clientId: 'client-a', campaignId: '111', campaignPhase: 'growth', campaignAgeDays: 60, kind, title: kind, whyNeeded: 'evidence', recommendedAction: 'act', risk: 'low', source: 'alert', order: 1 };
}

function dependencies(overrides: Partial<AutonomousCycleDependencies> = {}): AutonomousCycleDependencies {
  return {
    now: () => now,
    listClientIds: () => ['client-a'],
    loadClient: () => ({ customerId: '123', campaign: campaign() }),
    enumerateCampaigns: async () => [{ campaignId: '111', campaignName: 'Test campaign', advertisingChannelType: 'SEARCH', isDsaSetting: false, type: 'non-brand', spendIls: 200, conversions: 4, cpl: 50 }],
    buildDigest: () => digest(),
    deriveTasks: () => [task()],
    execute: async () => ({ success: true }),
    syncFraudBlockerHealth: async () => ({ status: 'protected', verifiedAt: now.toISOString(), syncedAt: now.toISOString() }),
    ...overrides,
  };
}

test('shadow mode writes proposed evidence and performs no mutation or approval write', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy({ mode: 'shadow' }), baseDir);
  let executions = 0;
  const result = await runAutonomousClientCycle('client-a', { baseDir, runtimeDir: tempDir(), dependencies: dependencies({ execute: async () => { executions += 1; return { success: true }; } }) });

  assert.equal(result.status, 'ok');
  assert.equal(executions, 0);
  assert.equal(result.actions[0]?.status, 'proposed');
  assert.equal(readAutonomousActionEvents('client-a', baseDir)[0]?.status, 'proposed');
  assert.equal(fs.existsSync(path.join(baseDir, 'client-a', 'tasks', 'google-ads', 'approvals.jsonl')), false);
});

test('autonomous mode re-derives before one allowed mutation and records execution', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  let derives = 0;
  let executions = 0;
  const result = await runAutonomousClientCycle('client-a', { baseDir, runtimeDir: tempDir(), dependencies: dependencies({ deriveTasks: () => { derives += 1; return [task()]; }, execute: async () => { executions += 1; return { success: true, details: { verified: true } }; } }) });

  assert.equal(result.status, 'ok');
  assert.equal(derives, 2);
  assert.equal(executions, 1);
  assert.equal(result.actions[0]?.status, 'executed');
  assert.deepEqual(readAutonomousActionEvents('client-a', baseDir).map(event => event.status), ['executing', 'executed']);
});

test('caps and cooldown block repeat mutation with stable action IDs', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy({ maxActionsPerRun: 1 }), baseDir);
  let executions = 0;
  const options = { baseDir, runtimeDir: tempDir(), dependencies: dependencies({ execute: async () => { executions += 1; return { success: true }; } }) };
  const first = await runAutonomousClientCycle('client-a', options);
  const second = await runAutonomousClientCycle('client-a', options);

  assert.equal(first.actions[0]?.actionId, second.actions[0]?.actionId);
  assert.equal(executions, 1);
  assert.equal(second.actions[0]?.status, 'blocked');
  assert.equal(second.actions[0]?.reason, 'cooldown_active');
});

test('existing per-client lock blocks overlapping execution', async () => {
  const baseDir = tempDir();
  const runtimeDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  fs.writeFileSync(path.join(runtimeDir, 'client-a.lock'), String(process.pid));
  const result = await runAutonomousClientCycle('client-a', { baseDir, runtimeDir, dependencies: dependencies() });
  assert.equal(result.status, 'locked');
});

test('unsupported diagnostics are blocked and executor failures remain isolated by client', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  writeAutonomyPolicy({ ...policy(), clientId: 'client-b' }, baseDir);
  let executions = 0;
  const result = await runAllAutonomousClientCycles({ baseDir, runtimeDir: tempDir(), dependencies: dependencies({
    listClientIds: () => ['client-a', 'client-b'],
    loadClient: clientId => ({ customerId: clientId, campaign: campaign() }),
    deriveTasks: clientId => [clientId === 'client-a' ? task('general_review') : task()],
    execute: async ({ clientId }) => { executions += 1; return clientId === 'client-b' ? { success: false, error: 'provider failed' } : { success: true }; },
  }) });

  assert.equal(result.clients.length, 2);
  assert.equal(result.clients[0]?.actions[0]?.reason, 'non_executable_kind');
  assert.equal(result.clients[1]?.actions[0]?.status, 'failed');
  assert.equal(executions, 1);
});

test('hybrid shadow planner failures do not block allowed Ads execution', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  let executions = 0;
  const result = await runAutonomousClientCycle('client-a', {
    baseDir,
    runtimeDir: tempDir(),
    dependencies: dependencies({
      execute: async () => { executions += 1; return { success: true }; },
      runHybridShadowPlan: async () => ({ status: 'error', error: 'fixture planner failure' }),
    }),
  });

  assert.equal(result.status, 'ok');
  assert.equal(executions, 1);
  assert.equal(result.hybrid?.status, 'error');
});


test('health synchronization runs before policy evaluation and blocks only the failed client', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  writeAutonomyPolicy({ ...policy(), clientId: 'client-b' }, baseDir);
  let executions = 0;
  const result = await runAllAutonomousClientCycles({ baseDir, runtimeDir: tempDir(), dependencies: dependencies({
    listClientIds: () => ['client-a', 'client-b'],
    loadClient: clientId => ({ customerId: clientId, campaign: campaign() }),
    syncFraudBlockerHealth: async ({ clientId }) => clientId === 'client-a'
      ? { status: 'rate_limited', verifiedAt: null, syncedAt: null }
      : { status: 'protected', verifiedAt: now.toISOString(), syncedAt: now.toISOString() },
    execute: async () => { executions += 1; return { success: true }; },
  }) });

  assert.equal(result.clients[0]?.actions[0]?.reason, 'click_protection_unavailable');
  assert.equal(result.clients[0]?.fraudBlockerHealth?.status, 'rate_limited');
  assert.equal(result.clients[1]?.actions[0]?.status, 'executed');
  assert.equal(executions, 1);
});


test('cycle forwards aggregate-only Fraud Blocker evidence to the hybrid snapshot path', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy({ mode: 'shadow' }), baseDir);
  let received: unknown;
  const result = await runAutonomousClientCycle('client-a', {
    baseDir,
    runtimeDir: tempDir(),
    dependencies: dependencies({
      syncFraudBlockerHealth: async () => ({
        status: 'protected',
        verifiedAt: now.toISOString(),
        syncedAt: now.toISOString(),
        summary: { channelCounts: { google_ads: 2 }, deviceCounts: { mobile: 2 }, fraudTypeCounts: { bot: 2 } },
      }),
      runHybridShadowPlan: async (params) => {
        received = params.fraudBlocker;
        return { status: 'ok' };
      },
    }),
  });
  assert.equal(result.status, 'ok');
  assert.deepEqual(received, { channelCounts: { google_ads: 2 }, deviceCounts: { mobile: 2 }, fraudTypeCounts: { bot: 2 } });
});
