import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessLiveReadiness,
  isReadinessKeyComplete,
  missingReadinessKeys,
  PRE_ACCOUNT_READINESS_KEYS,
  READINESS_KEYS,
  READINESS_REQUIREMENTS,
} from './live-readiness.js';

const COMPLETE = {
  accountCreatedWithClientAdmin: true,
  clientAdminInviteAccepted: true,
  billingApproved: true,
  verificationStatus: 'verified',
  feePaid: true,
  termsConsent: { termsVersion: 'v1', consentedAt: '2026-11-22T10:00:00.000Z' },
  approvalContactConfirmed: true,
};

test('D2 readiness keys: polled, system-set and admin-ticked, in that order', () => {
  assert.deepEqual(READINESS_KEYS, [
    'accountCreatedWithClientAdmin',
    'clientAdminInviteAccepted',
    'billingApproved',
    'verificationStatus',
    'feePaid',
    'termsConsent',
    'approvalContactConfirmed',
  ]);
  assert.deepEqual(
    READINESS_REQUIREMENTS.map(r => r.source),
    ['polled', 'polled', 'polled', 'polled', 'system', 'system', 'admin'],
  );
  assert.deepEqual(PRE_ACCOUNT_READINESS_KEYS, ['feePaid', 'termsConsent', 'approvalContactConfirmed']);
});

test('a missing or empty record is incomplete at both stages', () => {
  for (const record of [undefined, null, {}, 'x', []]) {
    assert.deepEqual(missingReadinessKeys(record, 'full'), READINESS_KEYS);
    assert.deepEqual(missingReadinessKeys(record, 'pre-account'), PRE_ACCOUNT_READINESS_KEYS);
  }
});

test('booleans must be exactly true', () => {
  assert.equal(isReadinessKeyComplete({ feePaid: 'true' }, 'feePaid'), false);
  assert.equal(isReadinessKeyComplete({ feePaid: 1 }, 'feePaid'), false);
  assert.equal(isReadinessKeyComplete({ feePaid: true }, 'feePaid'), true);
});

test('verification: only not-required or verified count', () => {
  for (const status of ['unknown', 'pending', 'failed', '', undefined, true]) {
    assert.equal(isReadinessKeyComplete({ verificationStatus: status }, 'verificationStatus'), false, String(status));
  }
  for (const status of ['not-required', 'verified']) {
    assert.equal(isReadinessKeyComplete({ verificationStatus: status }, 'verificationStatus'), true);
  }
});

test('terms consent needs a version and a parseable timestamp', () => {
  for (const termsConsent of [true, null, {}, { termsVersion: 'v1' }, { consentedAt: '2026-11-22T10:00:00Z' },
    { termsVersion: ' ', consentedAt: '2026-11-22T10:00:00Z' }, { termsVersion: 'v1', consentedAt: 'yesterday' }]) {
    assert.equal(isReadinessKeyComplete({ termsConsent }, 'termsConsent'), false, JSON.stringify(termsConsent));
  }
  assert.equal(isReadinessKeyComplete({ termsConsent: COMPLETE.termsConsent }, 'termsConsent'), true);
});

test('pre-D2 legacy keys never satisfy the new model', () => {
  const legacy = {
    clientAccountOwned: true, clientBillingAccepted: true, mccInvitationAccepted: true,
    approvalContactConfirmed: true, liveConsentRecorded: true, auditLogEnabled: true,
  };
  assert.deepEqual(missingReadinessKeys(legacy, 'full'), READINESS_KEYS.filter(k => k !== 'approvalContactConfirmed'));
});

test('a complete record has nothing missing at either stage', () => {
  assert.deepEqual(missingReadinessKeys(COMPLETE, 'full'), []);
  assert.deepEqual(missingReadinessKeys(COMPLETE, 'pre-account'), []);
});

test('assessLiveReadiness reports completeness and never enables mutations itself', () => {
  const partial = assessLiveReadiness({ clientId: 'c', record: { feePaid: true }, managerCredentialsConfigured: true, liveModeEnabled: false });
  assert.equal(partial.eligibleForPilot, false);
  assert.equal(partial.recordComplete, false);
  assert.equal(partial.missing[0], 'accountCreatedWithClientAdmin');
  assert.ok(!partial.missing.includes('feePaid'));

  const full = assessLiveReadiness({ clientId: 'c', record: COMPLETE, managerCredentialsConfigured: true, liveModeEnabled: false });
  assert.equal(full.eligibleForPilot, true);
  assert.equal(full.recordComplete, true);
  assert.equal(full.liveMutationsEnabled, false);

  const noCreds = assessLiveReadiness({ clientId: 'c', record: COMPLETE, managerCredentialsConfigured: false, liveModeEnabled: true });
  assert.equal(noCreds.eligibleForPilot, false);
  assert.deepEqual(noCreds.missing, ['managerCredentialsConfigured']);
});
