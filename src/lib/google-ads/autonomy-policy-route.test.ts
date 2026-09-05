import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAutonomyPolicyRequest } from './autonomy-policy-route';
import type { GoogleAdsAutonomyPolicy } from './autonomy';

function policy(): GoogleAdsAutonomyPolicy {
  return {
    version: 1,
    clientId: 'test-client',
    mode: 'autonomous',
    authorizedAt: '2026-09-04T00:00:00.000Z',
    authorizedBy: 'test-client',
    termsVersion: 'terms-v1',
    allowedKinds: ['budget_tune', 'search_term_cleanup', 'search_term_harvest'],
    maxDailyBudgetIls: 500,
    maxBudgetChangePctPerRun: 15,
    maxActionsPerRun: 20,
    cooldownHours: 24,
    killSwitch: false,
    clickProtection: { provider: 'fraudblocker', status: 'unknown', verifiedAt: null, maxAgeDays: 7 },
  };
}

test('policy route requires a session client', async () => {
  const response = await handleAutonomyPolicyRequest(new Request('http://localhost'), null);
  assert.equal(response.status, 401);
});

test('policy route returns policy and events for session client', async () => {
  const response = await handleAutonomyPolicyRequest(new Request('http://localhost'), 'test-client', {
    readPolicy: () => policy(),
    readEvents: () => [{
      actionId: 'event-1', sourceTaskId: 'task-1', evidenceIds: [], policyVersion: 1,
      policyDigest: 'digest', before: null, after: null, decisionReason: 'allowed',
      attempt: 1, createdAt: '2026-09-04T00:00:00.000Z', status: 'proposed',
    }],
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).events[0].actionId, 'event-1');
});

test('policy route accepts immediate stop and lower authority only', async () => {
  const written: GoogleAdsAutonomyPolicy[] = [];
  const response = await handleAutonomyPolicyRequest(new Request('http://localhost', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ killSwitch: true, maxDailyBudgetIls: 400, maxBudgetChangePctPerRun: 10, maxActionsPerRun: 10, cooldownHours: 48 }),
  }), 'test-client', {
    readPolicy: () => policy(),
    writePolicy: (item: GoogleAdsAutonomyPolicy) => { written.push(item); return true; },
  });
  assert.equal(response.status, 200);
  assert.equal(written[0]?.killSwitch, true);
  assert.equal(written[0]?.mode, 'autonomous');
  assert.equal(written[0]?.maxDailyBudgetIls, 400);
  assert.equal(written[0]?.cooldownHours, 48);
});

test('policy route refuses authority expansion and re-enabling', async () => {
  for (const body of [
    { killSwitch: false },
    { mode: 'autonomous' },
    { maxDailyBudgetIls: 501 },
    { maxBudgetChangePctPerRun: 16 },
    { maxActionsPerRun: 21 },
    { cooldownHours: 12 },
  ]) {
    const response = await handleAutonomyPolicyRequest(new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }), 'test-client', { readPolicy: () => policy() });
    assert.equal(response.status, 400, JSON.stringify(body));
  }
});
