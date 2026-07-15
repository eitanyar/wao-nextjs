/**
 * Evaluates whether a client is eligible for an approval-gated live Google Ads
 * pilot. This is deliberately read-only: it never enables live mutations.
 */
export function assessLiveReadiness({ clientId, record, managerCredentialsConfigured, liveModeEnabled }) {
  const requirements = [
    ['clientAccountOwned', 'Client-owned Google Ads account confirmed'],
    ['clientBillingAccepted', 'Client-owned billing profile and Google billing terms accepted'],
    ['mccInvitationAccepted', 'WAO MCC manager invitation accepted'],
    ['approvalContactConfirmed', 'Named approval contact confirmed'],
    ['liveConsentRecorded', 'Explicit live-pilot consent recorded'],
    ['auditLogEnabled', 'Immutable approval/audit log enabled'],
  ].map(([key, label]) => ({ key, label, complete: record?.[key] === true }));

  requirements.unshift({
    key: 'managerCredentialsConfigured',
    label: 'WAO manager OAuth and MCC credentials configured',
    complete: managerCredentialsConfigured,
  });

  const missing = requirements.filter(requirement => !requirement.complete);
  return {
    clientId,
    eligibleForPilot: missing.length === 0 && liveModeEnabled === false,
    liveMutationsEnabled: liveModeEnabled,
    requirements,
    missing: missing.map(requirement => requirement.key),
    nextAction: missing.length
      ? `Complete: ${missing[0].label}.`
      : 'Ready for a single explicitly approved live-pilot operation. Live mode remains locked until that approval is recorded.',
  };
}
