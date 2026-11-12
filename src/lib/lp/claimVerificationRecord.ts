/**
 * Site Bot launch step 2 (B4): the staff-check record stored with the approved copy-review packet, and its validator.
 * Dependency-free (the copy-review packet module and its sandboxed deploy test load it). The rules that use it live in
 * claimVerification.ts. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
export type VerifiableClaim = 'licence' | 'warranty';
export const VERIFIABLE_CLAIMS: readonly VerifiableClaim[] = ['licence', 'warranty'];

/** One staff check: who confirmed the claim and on which date (YYYY-MM-DD). */
export interface StaffClaimCheck {
  verifiedBy: string;
  verifiedAt: string;
}

/** The staff checks stored with the approved copy-review packet. A claim without an entry is unverified. */
export type ClaimVerification = Partial<Record<VerifiableClaim, StaffClaimCheck>>;

export const VERIFIED_BY_MAX_CHARS = 80;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** A real calendar date in YYYY-MM-DD, not after `now` (plus one day of clock slack). */
function validDate(value: unknown, now: Date): boolean {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== value) return false;
  return date.getTime() <= now.getTime() + 24 * 60 * 60 * 1000;
}

/** True for { verifiedBy, verifiedAt } with exactly those keys: a non-empty name (trimmed, no control characters) and a date. */
export function isStaffClaimCheck(value: unknown, now: Date = new Date()): value is StaffClaimCheck {
  if (!object(value) || Object.keys(value).sort().join(',') !== 'verifiedAt,verifiedBy') return false;
  const name = value.verifiedBy;
  return typeof name === 'string' && name === name.trim() && name.length > 0 && name.length <= VERIFIED_BY_MAX_CHARS && !/[\x00-\x1F\x7F]/.test(name)
    && validDate(value.verifiedAt, now);
}

/** A stored verification object (keys among VERIFIABLE_CLAIMS, each a valid check), or null when anything is off. */
export function parseClaimVerification(value: unknown, now: Date = new Date()): ClaimVerification | null {
  if (!object(value)) return null;
  const out: ClaimVerification = {};
  for (const [key, check] of Object.entries(value)) {
    if (!VERIFIABLE_CLAIMS.includes(key as VerifiableClaim) || !isStaffClaimCheck(check, now)) return null;
    out[key as VerifiableClaim] = { verifiedBy: check.verifiedBy, verifiedAt: check.verifiedAt };
  }
  return out;
}
