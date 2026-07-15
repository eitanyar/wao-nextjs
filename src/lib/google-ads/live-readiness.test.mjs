import test from 'node:test';
import assert from 'node:assert/strict';
import { assessLiveReadiness } from './live-readiness.js';

test('live readiness remains ineligible until every pilot prerequisite is recorded', () => {
  const result = assessLiveReadiness({
    clientId: 'pilot-client',
    record: { clientAccountOwned: true },
    managerCredentialsConfigured: true,
    liveModeEnabled: false,
  });

  assert.equal(result.eligibleForPilot, false);
  assert.deepEqual(result.missing, [
    'clientBillingAccepted',
    'mccInvitationAccepted',
    'approvalContactConfirmed',
    'liveConsentRecorded',
    'auditLogEnabled',
  ]);
});

test('live readiness never enables mutations itself', () => {
  const result = assessLiveReadiness({
    clientId: 'pilot-client',
    record: {
      clientAccountOwned: true,
      clientBillingAccepted: true,
      mccInvitationAccepted: true,
      approvalContactConfirmed: true,
      liveConsentRecorded: true,
      auditLogEnabled: true,
    },
    managerCredentialsConfigured: true,
    liveModeEnabled: false,
  });

  assert.equal(result.eligibleForPilot, true);
  assert.equal(result.liveMutationsEnabled, false);
});
