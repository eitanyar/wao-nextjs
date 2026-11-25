/**
 * Site Bot ads-first launch, build step 1: the waiting list behind the eligibility block (POST /api/site-bot/waitlist).
 *
 * The browser sends only what the owner typed (name, phone, optional email) plus the auditId + placeId of the confirmed
 * check. Everything else stored with the entry (business name, primary category, reason, timestamp) is derived on the
 * server from the audit record and the live offer decision, so a crafted request cannot pick its own reason or business.
 * A waiting-list entry is accepted only when the offer for that business really shows the form (preopen / full / trade).
 *
 * Pure apart from the injected deps. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { toE164IL } from '../tracking/conversions';
import { waitlistReason, type SiteBotOffer, type WaitlistReason } from './eligibility';
import { primaryCategoryId } from './launchTrades';
import type { AuditCandidateSnapshot } from './auditStore';
import type { WaitlistAdd, WaitlistEntry, WaitlistEntryInput } from './launchStore';

export type WaitlistErrorCode = 'invalid_input' | 'not_found' | 'not_eligible' | 'unavailable';

export class WaitlistError extends Error {
  constructor(readonly code: WaitlistErrorCode) {
    super(code);
  }
}

export interface WaitlistSubmission {
  auditId: string;
  placeId: string;
  name: string;
  /** E.164 (+972...). */
  phone: string;
  email: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACE_ID = /^[A-Za-z0-9_-]{8,256}$/;
const EMAIL = /^[^\s@<>"',;]{1,64}@[a-z0-9.-]+\.[a-z0-9-]{2,63}$/i;
// C0/C1 controls and the bidi embedding / override / isolate controls: never part of a name.
const CONTROL = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/;
const ALLOWED_KEYS = new Set(['auditId', 'placeId', 'name', 'phone', 'email']);

function text(value: unknown, max: number, required: boolean): string {
  if (value === undefined || value === null) {
    if (required) throw new WaitlistError('invalid_input');
    return '';
  }
  if (typeof value !== 'string' || value.length > max || CONTROL.test(value)) throw new WaitlistError('invalid_input');
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (required && !trimmed) throw new WaitlistError('invalid_input');
  return trimmed;
}

/** Israeli phone (mobile or landline) -> E.164, or null. The same rule the browser uses to enable the submit button. */
export function israeliPhone(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 40 || CONTROL.test(value)) return null;
  if (!/^[\d\s()+-]+$/.test(value.trim())) return null;
  return toE164IL(value);
}

/** The email rule the server applies (after trim + lower case); the form uses it to flag a malformed address. */
export function isWaitlistEmail(value: string): boolean {
  return EMAIL.test(value.trim().toLowerCase());
}

/** Strict: unknown keys, wrong types, control characters, a non-Israeli phone or a bad email -> invalid_input. */
export function normalizeWaitlistSubmission(body: unknown): WaitlistSubmission {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new WaitlistError('invalid_input');
  const value = body as Record<string, unknown>;
  if (Object.keys(value).some(key => !ALLOWED_KEYS.has(key))) throw new WaitlistError('invalid_input');
  if (typeof value.auditId !== 'string' || !UUID.test(value.auditId)) throw new WaitlistError('invalid_input');
  if (typeof value.placeId !== 'string' || !PLACE_ID.test(value.placeId)) throw new WaitlistError('invalid_input');
  const name = text(value.name, 120, true);
  const phone = israeliPhone(value.phone);
  if (!phone) throw new WaitlistError('invalid_input');
  const email = text(value.email, 254, false).toLowerCase();
  if (email && !EMAIL.test(email)) throw new WaitlistError('invalid_input');
  return { auditId: value.auditId.toLowerCase(), placeId: value.placeId, name, phone, email: email || null };
}

export interface WaitlistDeps {
  findCandidate: (auditId: string, placeId: string) => Promise<AuditCandidateSnapshot | null>;
  offerFor: (candidate: AuditCandidateSnapshot) => Promise<SiteBotOffer>;
  add: (input: WaitlistEntryInput) => WaitlistAdd;
  /** Never throws (sendWaitlistAlert). Not awaited by the caller's reply. */
  alert: (entry: WaitlistEntry) => Promise<unknown>;
  /** The category stored with the entry (server: offerState.waitlistCategoryFor). Default: the first non-generic type. */
  categoryFor?: (candidate: AuditCandidateSnapshot) => string | null;
}

export type WaitlistResult = { ok: true; reason: WaitlistReason };

export async function submitWaitlist(submission: WaitlistSubmission, deps: WaitlistDeps): Promise<WaitlistResult> {
  const candidate = await deps.findCandidate(submission.auditId, submission.placeId);
  if (!candidate) throw new WaitlistError('not_found');
  const reason = waitlistReason(await deps.offerFor(candidate));
  if (!reason) throw new WaitlistError('not_eligible');
  const added = deps.add({
    reason,
    auditId: submission.auditId,
    placeId: submission.placeId,
    businessName: candidate.displayName.slice(0, 200),
    category: (deps.categoryFor ?? primaryCategoryId)(candidate),
    name: submission.name,
    phone: submission.phone,
    email: submission.email,
  });
  if (added.status === 'unavailable') throw new WaitlistError('unavailable');
  // A repeat (same phone, same business) is acknowledged without a second alert.
  if (added.status === 'added') void deps.alert(added.entry);
  return { ok: true, reason };
}
