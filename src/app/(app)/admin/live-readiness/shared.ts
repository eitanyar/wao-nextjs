/**
 * Plain (non-"use server") module shared between the live-readiness admin
 * page and its server action. Server-action files may only export async
 * functions (every export becomes a callable action), so the shared
 * constants/types/parsing logic used by both live here instead.
 *
 * The actual parsing/validation logic lives in ./live-readiness-form.js
 * (plain JS, not TS) specifically so it stays directly unit-testable with
 * `node --test` without a TypeScript loader — see
 * ./live-readiness-form.test.mjs. This file just layers types on top.
 */
import {
  READINESS_KEYS as READINESS_KEYS_UNTYPED,
  parseLiveReadinessSubmission as parseLiveReadinessSubmissionUntyped,
} from './live-readiness-form.js';

/**
 * Keep this union in sync with READINESS_KEYS in ./live-readiness-form.js.
 * Duplicated here only because that file is intentionally plain JS (see
 * above) and TS can't derive a literal union from an unannotated JS array
 * under `allowJs` — without this, `key` in `for (const key of READINESS_KEYS)`
 * would widen to `string`, which can't index LiveReadinessRecord.
 */
export type ReadinessKey =
  | 'clientAccountOwned'
  | 'clientBillingAccepted'
  | 'mccInvitationAccepted'
  | 'approvalContactConfirmed'
  | 'liveConsentRecorded'
  | 'auditLogEnabled';

export type LiveReadinessRecord = {
  [K in ReadinessKey]?: boolean;
} & {
  /** Free-text evidence of the client's consent — see spec §1.3. */
  liveConsentEvidence?: string;
};

export type ParsedLiveReadinessSubmission =
  | { ok: true; clientId: string; patch: Record<ReadinessKey, boolean>; evidenceNote: string }
  | { ok: false; error: 'invalid-client' }
  | { ok: false; error: 'missing-consent-evidence'; clientId: string };

/** Typed re-export — the array literal (and its order) still comes solely from the .js file. */
export const READINESS_KEYS = READINESS_KEYS_UNTYPED as readonly ReadinessKey[];

/** Typed wrapper — all actual parsing/validation logic runs in the .js file (single source of truth). */
export function parseLiveReadinessSubmission(formData: FormData): ParsedLiveReadinessSubmission {
  return parseLiveReadinessSubmissionUntyped(formData);
}
