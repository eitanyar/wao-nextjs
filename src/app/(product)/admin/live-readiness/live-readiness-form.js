/**
 * Plain JS (not TS) so it can be unit-tested directly with `node --test`,
 * mirroring `src/lib/google-ads/live-readiness.js`. No Next.js or fs
 * dependency here — pure form parsing/validation only. Consumed by
 * `./shared.ts`, which layers TypeScript types on top for the page/action.
 *
 * Keys follow the Decision D2 readiness model in
 * src/lib/google-ads/live-readiness.js (single source of truth). Until the
 * poll job (mission item 4) and checkout exist, every key — polled, system
 * and admin — is admin-settable here.
 */
import {
  BOOLEAN_READINESS_KEYS,
  READINESS_KEYS,
  VERIFICATION_STATUSES,
} from '../../../../lib/google-ads/live-readiness.js';

export { BOOLEAN_READINESS_KEYS, READINESS_KEYS, VERIFICATION_STATUSES };

/**
 * Pure parsing/validation of a submitted live-readiness form. Enforces:
 *  - clientId must match /^[a-z0-9-]+$/i (existence of the client dir is
 *    checked separately by the caller, since that needs fs access).
 *  - boolean keys are checkboxes ('on' = true, absent = false).
 *  - verificationStatus must be one of VERIFICATION_STATUSES (absent = 'unknown').
 *  - termsConsent needs BOTH a terms version and a parseable timestamp, or
 *    neither (= cleared). The timestamp is normalized to ISO-8601 UTC.
 *  - only the readiness keys are ever read off the form; any other field is ignored.
 *
 * @param {FormData} formData
 * @returns {{ ok: true, clientId: string, patch: Record<string, unknown> }
 *          | { ok: false, error: 'invalid-client' }
 *          | { ok: false, error: 'invalid-verification-status' | 'invalid-terms-consent', clientId: string }}
 */
export function parseLiveReadinessSubmission(formData) {
  const clientId = (formData.get('clientId') ?? '').toString().trim();
  if (!clientId || !/^[a-z0-9-]+$/i.test(clientId)) {
    return { ok: false, error: 'invalid-client' };
  }

  /** @type {Record<string, unknown>} */
  const patch = {};
  for (const key of BOOLEAN_READINESS_KEYS) {
    patch[key] = formData.get(key) === 'on';
  }

  const verificationStatus = (formData.get('verificationStatus') ?? '').toString().trim() || 'unknown';
  if (!VERIFICATION_STATUSES.includes(verificationStatus)) {
    return { ok: false, error: 'invalid-verification-status', clientId };
  }
  patch.verificationStatus = verificationStatus;

  const termsVersion = (formData.get('termsConsentVersion') ?? '').toString().trim();
  const consentedAtRaw = (formData.get('termsConsentAt') ?? '').toString().trim();
  if (!termsVersion && !consentedAtRaw) {
    patch.termsConsent = null;
  } else {
    const consentedAtMs = Date.parse(consentedAtRaw);
    if (!termsVersion || !consentedAtRaw || !Number.isFinite(consentedAtMs)) {
      return { ok: false, error: 'invalid-terms-consent', clientId };
    }
    patch.termsConsent = { termsVersion, consentedAt: new Date(consentedAtMs).toISOString() };
  }

  return { ok: true, clientId, patch };
}
