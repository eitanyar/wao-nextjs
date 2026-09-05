import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildOnboardingAutonomyPolicy } from './autonomy-consent';
import { readAutonomyPolicy, writeAutonomyPolicy } from './autonomy';

test('unchecked consent does not create an autonomy policy', () => {
  assert.equal(buildOnboardingAutonomyPolicy({
    clientId: 'test-client',
    mode: 'test',
    autonomyConsent: false,
    autonomyConsentTimestamp: undefined,
    autonomyTermsVersion: undefined,
    dailyBudgetIls: 300,
    authorizedBy: 'test-client',
  }), null);
});

test('sandbox consent persists a bounded autonomous policy in temporary storage', () => {
  const policy = buildOnboardingAutonomyPolicy({
    clientId: 'test-client',
    mode: 'test',
    autonomyConsent: true,
    autonomyConsentTimestamp: '2026-09-04T00:00:00.000Z',
    autonomyTermsVersion: 'terms-v1',
    dailyBudgetIls: 300,
    authorizedBy: 'test-client',
  });

  assert.deepEqual(policy, {
    version: 1,
    clientId: 'test-client',
    mode: 'autonomous',
    authorizedAt: '2026-09-04T00:00:00.000Z',
    authorizedBy: 'test-client',
    termsVersion: 'terms-v1',
    allowedKinds: ['budget_tune', 'search_term_cleanup', 'search_term_harvest'],
    maxDailyBudgetIls: 300,
    maxBudgetChangePctPerRun: 15,
    maxActionsPerRun: 20,
    cooldownHours: 24,
    killSwitch: false,
    clickProtection: { provider: 'fraudblocker', status: 'unknown', verifiedAt: null, maxAgeDays: 7 },
  });
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onboarding-autonomy-'));
  assert.equal(writeAutonomyPolicy(policy!, baseDir), true);
  assert.deepEqual(readAutonomyPolicy('test-client', baseDir), policy);
});

test('live consent remains shadow when legal version does not exactly match', () => {
  const policy = buildOnboardingAutonomyPolicy({
    clientId: 'live-client',
    mode: 'live',
    autonomyConsent: true,
    autonomyConsentTimestamp: '2026-09-04T00:00:00.000Z',
    autonomyTermsVersion: 'submitted-v1',
    dailyBudgetIls: 300,
    authorizedBy: 'live-client',
    legalTermsVersion: 'released-v1',
  });

  assert.equal(policy?.mode, 'shadow');
  assert.equal(policy?.clickProtection.status, 'unknown');
});
