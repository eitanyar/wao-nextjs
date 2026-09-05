import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  appendAutonomousActionEvent,
  evaluateAutonomousAction,
  readAutonomyPolicy,
  readAutonomousActionEvents,
  writeAutonomyPolicy,
  type GoogleAdsAutonomyPolicy,
} from './autonomy';

function makeTempBaseDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'google-ads-autonomy-test-'));
}

function policy(overrides: Partial<GoogleAdsAutonomyPolicy> = {}): GoogleAdsAutonomyPolicy {
  return {
    version: 1,
    clientId: 'test-client',
    mode: 'autonomous',
    authorizedAt: '2026-09-01T00:00:00.000Z',
    authorizedBy: 'test-owner',
    termsVersion: '2026-09',
    allowedKinds: ['budget_tune', 'search_term_cleanup', 'search_term_harvest'],
    maxDailyBudgetIls: 500,
    maxBudgetChangePctPerRun: 10,
    maxActionsPerRun: 2,
    cooldownHours: 24,
    killSwitch: false,
    clickProtection: {
      provider: 'fraudblocker',
      status: 'protected',
      verifiedAt: '2026-09-02T00:00:00.000Z',
      maxAgeDays: 7,
    },
    ...overrides,
  };
}

function evaluate(overrides: Parameters<typeof evaluateAutonomousAction>[0] = {
  clientId: 'test-client',
  policy: policy(),
  kind: 'budget_tune',
  reversible: true,
  requestedDailyBudgetIls: 450,
  budgetChangePct: 5,
  actionsExecutedThisRun: 0,
  now: new Date('2026-09-03T00:00:00.000Z'),
}) {
  return evaluateAutonomousAction(overrides);
}

test('policy storage is temp-only, atomic, and idempotent', () => {
  const baseDir = makeTempBaseDir();
  const item = policy();

  assert.equal(writeAutonomyPolicy(item, baseDir), true);
  assert.equal(writeAutonomyPolicy(item, baseDir), true);
  assert.deepEqual(readAutonomyPolicy(item.clientId, baseDir), item);
  assert.equal(fs.existsSync(path.join(process.cwd(), 'data', 'clients', item.clientId, 'google-ads-autonomy.json')), false);
});

test('missing policy and shadow mode fail closed', () => {
  assert.equal(evaluate({ ...evaluate().input, policy: null }).allowed, false);
  assert.equal(evaluate({ ...evaluate().input, policy: policy({ mode: 'shadow' }) }).reason, 'mode_not_autonomous');
});

test('authorization client matching, action caps, cooldown, and kill switch block execution', () => {
  const base = evaluate().input;
  assert.equal(evaluate({ ...base, policy: policy({ clientId: 'another-client' }) }).reason, 'client_mismatch');
  assert.equal(evaluate({ ...base, policy: policy({ authorizedAt: '' }) }).reason, 'authorization_missing');
  assert.equal(evaluate({ ...base, policy: policy({ killSwitch: true }) }).reason, 'kill_switch_enabled');
  assert.equal(evaluate({ ...base, actionsExecutedThisRun: 2 }).reason, 'action_cap_exceeded');
  assert.equal(evaluate({ ...base, lastExecutedAt: '2026-09-02T12:00:00.000Z' }).reason, 'cooldown_active');
});

test('budget and reversibility bounds block execution while permitted action is allowed', () => {
  const base = evaluate().input;
  assert.equal(evaluate({ ...base, requestedDailyBudgetIls: 501 }).reason, 'daily_budget_cap_exceeded');
  assert.equal(evaluate({ ...base, budgetChangePct: 11 }).reason, 'budget_change_cap_exceeded');
  assert.equal(evaluate({ ...base, reversible: false }).reason, 'action_not_reversible');
  assert.equal(evaluate(base).allowed, true);
});

test('required click protection fails closed when stale or unavailable', () => {
  const base = evaluate().input;
  assert.equal(evaluate({ ...base, requireClickProtection: true, policy: policy({ clickProtection: { provider: 'none', status: 'unprotected', verifiedAt: null, maxAgeDays: 7 } }) }).reason, 'click_protection_unavailable');
  assert.equal(evaluate({ ...base, requireClickProtection: true, policy: policy({ clickProtection: { provider: 'fraudblocker', status: 'protected', verifiedAt: '2026-08-20T00:00:00.000Z', maxAgeDays: 7 } }) }).reason, 'click_protection_stale');
});

test('append-only event ledger preserves stable action fields and policy digest', () => {
  const baseDir = makeTempBaseDir();
  const item = policy();
  const decision = evaluate();
  appendAutonomousActionEvent(item.clientId, {
    actionId: 'action-001',
    sourceTaskId: 'task-001',
    evidenceIds: ['evidence-001'],
    policyVersion: 1,
    policyDigest: decision.policyDigest!,
    before: { budget: 400 },
    after: { budget: 420 },
    decisionReason: decision.reason,
    attempt: 1,
    createdAt: '2026-09-03T00:00:00.000Z',
    status: 'proposed',
  }, baseDir);
  appendAutonomousActionEvent(item.clientId, {
    actionId: 'action-001',
    sourceTaskId: 'task-001',
    evidenceIds: ['evidence-001'],
    policyVersion: 1,
    policyDigest: decision.policyDigest!,
    before: { budget: 400 },
    after: { budget: 420 },
    decisionReason: decision.reason,
    attempt: 2,
    createdAt: '2026-09-03T00:01:00.000Z',
    status: 'executing',
  }, baseDir);

  const events = readAutonomousActionEvents(item.clientId, baseDir);
  assert.equal(events.length, 2);
  assert.equal(events[0].actionId, 'action-001');
  assert.match(events[0].policyDigest, /^[a-f0-9]{64}$/);
  assert.equal(fs.existsSync(path.join(process.cwd(), 'data', 'clients', item.clientId, 'tasks', 'google-ads', 'autonomous-actions.jsonl')), false);
});
