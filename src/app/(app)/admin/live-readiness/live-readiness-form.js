/**
 * Plain JS (not TS) so it can be unit-tested directly with `node --test`,
 * mirroring `src/lib/google-ads/live-readiness.js`. No Next.js or fs
 * dependency here — pure form parsing/validation only. Consumed by
 * `./shared.ts`, which layers TypeScript types on top for the page/action.
 *
 * See docs/specs/priority-5-live-readiness-consent-ui.md.
 */

/**
 * The six attestation keys `assessLiveReadiness()` reads from
 * `data/clients/{clientId}/live-readiness.json`. This is the ONLY set of
 * keys ever read from a submitted form or written to disk — per spec §1.4,
 * any other field on the form is ignored.
 */
export const READINESS_KEYS = [
  'clientAccountOwned',
  'clientBillingAccepted',
  'mccInvitationAccepted',
  'approvalContactConfirmed',
  'liveConsentRecorded',
  'auditLogEnabled',
];

/**
 * Pure parsing/validation of a submitted live-readiness form. Enforces:
 *  - clientId must match /^[a-z0-9-]+$/i (existence of the client dir is
 *    checked separately by the caller, since that needs fs access).
 *  - setting liveConsentRecorded=true requires a non-empty free-text
 *    evidence note (spec §1.3).
 *  - only the six known keys above are ever read off the form (spec §1.4).
 *
 * @param {FormData} formData
 * @returns {{ ok: true, clientId: string, patch: Record<string, boolean>, evidenceNote: string }
 *          | { ok: false, error: 'invalid-client' }
 *          | { ok: false, error: 'missing-consent-evidence', clientId: string }}
 */
export function parseLiveReadinessSubmission(formData) {
  const clientId = (formData.get('clientId') ?? '').toString().trim();
  if (!clientId || !/^[a-z0-9-]+$/i.test(clientId)) {
    return { ok: false, error: 'invalid-client' };
  }

  const patch = {};
  for (const key of READINESS_KEYS) {
    patch[key] = formData.get(key) === 'on';
  }

  const evidenceNote = (formData.get('liveConsentEvidence') ?? '').toString().trim();

  if (patch.liveConsentRecorded && !evidenceNote) {
    return { ok: false, error: 'missing-consent-evidence', clientId };
  }

  return { ok: true, clientId, patch, evidenceNote };
}
