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
  ADMIN_SAVE_KEYS as ADMIN_SAVE_KEYS_UNTYPED,
  BOOLEAN_READINESS_KEYS as BOOLEAN_READINESS_KEYS_UNTYPED,
  mergeReadinessPatch as mergeReadinessPatchUntyped,
  parseAdminSaveSubmission as parseAdminSaveSubmissionUntyped,
  READINESS_KEYS as READINESS_KEYS_UNTYPED,
  VERIFICATION_STATUSES as VERIFICATION_STATUSES_UNTYPED,
  parseLiveReadinessSubmission as parseLiveReadinessSubmissionUntyped,
} from './live-readiness-form.js';
import type { LiveReadinessRecord, VerificationStatus } from '@/lib/google-ads/live-readiness-store';

export type { LiveReadinessRecord, VerificationStatus };

/** Keep in sync with READINESS_REQUIREMENTS in src/lib/google-ads/live-readiness.js. */
export type ReadinessKey = keyof LiveReadinessRecord;

export type BooleanReadinessKey =
  | 'accountCreatedWithClientAdmin'
  | 'clientAdminInviteAccepted'
  | 'billingApproved'
  | 'feePaid'
  | 'approvalContactConfirmed';

export type ParsedLiveReadinessSubmission =
  | { ok: true; clientId: string; patch: Required<{ [K in ReadinessKey]: LiveReadinessRecord[K] }> }
  | { ok: false; error: 'invalid-client' }
  | { ok: false; error: 'invalid-verification-status' | 'invalid-terms-consent'; clientId: string };

/** Typed re-exports — the arrays (and their order) still come solely from the .js model. */
export const READINESS_KEYS = READINESS_KEYS_UNTYPED as readonly ReadinessKey[];
export const BOOLEAN_READINESS_KEYS = BOOLEAN_READINESS_KEYS_UNTYPED as readonly BooleanReadinessKey[];
export const VERIFICATION_STATUSES = VERIFICATION_STATUSES_UNTYPED as readonly VerificationStatus[];

export const ADMIN_SAVE_KEYS = ADMIN_SAVE_KEYS_UNTYPED as readonly ReadinessKey[];

export type ParsedAdminSave =
  | { ok: true; clientId: string; patch: Partial<LiveReadinessRecord> }
  | { ok: false; error: 'invalid-client' };

export function parseAdminSaveSubmission(formData: FormData): ParsedAdminSave {
  return parseAdminSaveSubmissionUntyped(formData) as ParsedAdminSave;
}

export function mergeReadinessPatch(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
  keys: readonly string[],
): { next: Record<string, unknown>; changes: Array<{ key: string; from: unknown; to: unknown }> } {
  return mergeReadinessPatchUntyped(existing, patch, keys);
}

/** Typed wrapper — all actual parsing/validation logic runs in the .js file (single source of truth). */
export function parseLiveReadinessSubmission(formData: FormData): ParsedLiveReadinessSubmission {
  return parseLiveReadinessSubmissionUntyped(formData) as ParsedLiveReadinessSubmission;
}
