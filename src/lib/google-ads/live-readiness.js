/**
 * Per-client live-readiness model for the Ads Bot (Decision D2, mission
 * docs/missions/ads-bot-first-paying-client-2026-11-22.md).
 *
 * Ownership model: WAO creates the client's Google Ads account under the WAO
 * MCC and invites the client as ADMIN. The record lives at
 * data/clients/{clientId}/live-readiness.json.
 *
 * Plain JS (no Next/fs) so it is unit-testable with `node --test` and is the
 * single source of truth for the keys, the admin form, the admin page, the
 * client-facing GET route and the mutation gate (access-policy.js).
 *
 * Key sources (who is meant to set each key):
 *  - polled: set by the Google Ads poll job (mission item 4, not built yet;
 *    until then admin-settable through /admin/live-readiness).
 *  - system: set by checkout / consent capture (not built yet; admin-settable
 *    until then).
 *  - admin:  ticked by WAO staff.
 *
 * Stages:
 *  - pre-account: can be true before the Google Ads account exists. Live
 *    create-campaign (which creates the account) needs only these.
 *  - post-account: can only become true after the account exists. Every other
 *    live mutation route needs the full set.
 */

export const VERIFICATION_STATUSES = ['unknown', 'pending', 'failed', 'not-required', 'verified'];

/** Verification statuses that count as complete. Anything else (incl. missing) blocks. */
export const VERIFICATION_COMPLETE_STATUSES = ['not-required', 'verified'];

export const READINESS_REQUIREMENTS = [
  {
    key: 'accountCreatedWithClientAdmin',
    kind: 'boolean',
    source: 'polled',
    stage: 'post-account',
    label: 'Google Ads account created under the WAO MCC with the client invited as ADMIN',
  },
  {
    key: 'clientAdminInviteAccepted',
    kind: 'boolean',
    source: 'polled',
    stage: 'post-account',
    label: 'Client accepted the ADMIN invitation',
  },
  {
    key: 'billingApproved',
    kind: 'boolean',
    source: 'polled',
    stage: 'post-account',
    label: "Client's own billing set up in Google Ads and approved",
  },
  {
    key: 'verificationStatus',
    kind: 'verification',
    source: 'polled',
    stage: 'post-account',
    label: 'Google advertiser verification not required or completed',
  },
  {
    key: 'feePaid',
    kind: 'boolean',
    source: 'system',
    stage: 'pre-account',
    label: 'Ads Bot fee paid',
  },
  {
    key: 'termsConsent',
    kind: 'consent',
    source: 'system',
    stage: 'pre-account',
    label: 'Terms and autonomy consent recorded (terms version and timestamp)',
  },
  {
    key: 'approvalContactConfirmed',
    kind: 'boolean',
    source: 'admin',
    stage: 'pre-account',
    label: 'Named approval contact confirmed',
  },
];

export const READINESS_KEYS = READINESS_REQUIREMENTS.map(requirement => requirement.key);
export const BOOLEAN_READINESS_KEYS = READINESS_REQUIREMENTS
  .filter(requirement => requirement.kind === 'boolean')
  .map(requirement => requirement.key);
export const PRE_ACCOUNT_READINESS_KEYS = READINESS_REQUIREMENTS
  .filter(requirement => requirement.stage === 'pre-account')
  .map(requirement => requirement.key);

/**
 * @param {unknown} value
 * @returns {value is { termsVersion: string, consentedAt: string }}
 */
export function isTermsConsentComplete(value) {
  if (!value || typeof value !== 'object') return false;
  const { termsVersion, consentedAt } = /** @type {any} */ (value);
  return typeof termsVersion === 'string'
    && termsVersion.trim() !== ''
    && typeof consentedAt === 'string'
    && Number.isFinite(Date.parse(consentedAt));
}

/**
 * @param {unknown} record
 * @param {string} key
 */
export function isReadinessKeyComplete(record, key) {
  const requirement = READINESS_REQUIREMENTS.find(item => item.key === key);
  if (!requirement || !record || typeof record !== 'object') return false;
  const value = record[key];
  if (requirement.kind === 'boolean') return value === true;
  if (requirement.kind === 'verification') {
    return typeof value === 'string' && VERIFICATION_COMPLETE_STATUSES.includes(value);
  }
  return isTermsConsentComplete(value);
}

/**
 * Missing keys for a mutation gate. `stage: 'pre-account'` checks only the keys
 * that can be true before the account exists (live create-campaign);
 * `stage: 'full'` checks every key.
 *
 * @param {unknown} record
 * @param {'pre-account' | 'full'} [stage]
 * @returns {string[]}
 */
export function missingReadinessKeys(record, stage = 'full') {
  const keys = stage === 'pre-account' ? PRE_ACCOUNT_READINESS_KEYS : READINESS_KEYS;
  return keys.filter(key => !isReadinessKeyComplete(record, key));
}

/**
 * Display verdict for the admin page and the client-facing GET route.
 * Read-only: it never enables live mutations.
 */
export function assessLiveReadiness({ clientId, record, managerCredentialsConfigured, liveModeEnabled }) {
  const requirements = READINESS_REQUIREMENTS.map(({ key, label, source, stage }) => ({
    key,
    label,
    source,
    stage,
    complete: isReadinessKeyComplete(record, key),
  }));

  requirements.unshift({
    key: 'managerCredentialsConfigured',
    label: 'WAO manager OAuth and MCC credentials configured',
    source: 'env',
    stage: 'pre-account',
    complete: managerCredentialsConfigured === true,
  });

  const missing = requirements.filter(requirement => !requirement.complete);
  const recordComplete = missingReadinessKeys(record, 'full').length === 0;
  return {
    clientId,
    eligibleForPilot: missing.length === 0,
    recordComplete,
    preAccountComplete: missingReadinessKeys(record, 'pre-account').length === 0,
    liveMutationsEnabled: liveModeEnabled === true,
    requirements,
    missing: missing.map(requirement => requirement.key),
    nextAction: missing.length
      ? `Complete: ${missing[0].label}.`
      : liveModeEnabled === true
        ? 'Readiness complete. Live mutations are allowed for this client.'
        : 'Readiness complete. Live mutations stay off until GOOGLE_ADS_ENABLE_LIVE_MODE is on.',
  };
}
