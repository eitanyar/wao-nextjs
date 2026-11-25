/**
 * Site Bot ads-first launch, build step 1: the server-side wiring of the offer decision (eligibility.ts) to the runtime
 * paid-flow gate (paidFlowGate.ts), the audit store and the launch cap (launchStore.ts).
 *
 * Used by: /api/site-bot/audit-result (which offer the result shows), /api/site-bot/waitlist (the reason is derived here,
 * never trusted from the browser), /site-bot/start (read-only: may this request see the interview?) and
 * /api/site-bot/interview-start (claims the spot).
 *
 * Closed gate: the cap store is never opened; every eligible business gets 'waitlist_preopen'.
 * Any store or config failure counts as "no spot" (fail closed).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { readAuditRecord, UUID_REGEX } from './auditStore';
import type { AuditCandidateSnapshot, AuditRecord } from './auditStore';
import { profileEligibility, siteBotOffer, type SiteBotOffer } from './eligibility';
import { isPaidFlowAllowedForRequest } from './paidFlowGate';
import {
  hasInterviewSpot, interviewSpotAvailable, parseLaunchCapLimits, reserveInterviewStart, withLaunchStore,
  type InterviewReservation, type LaunchCapLimits, type LaunchStore,
} from './launchStore';

/** Same shape as startIntake.ts PLACE_ID (kept local so the audit-result route does not pull in the intake model). */
export const PLACE_ID = /^[A-Za-z0-9_-]{8,256}$/;

export interface OfferDeps {
  gateOpen: () => Promise<boolean>;
  withStore: <T>(fn: (store: LaunchStore) => T, fallback: T) => T;
  limits: () => LaunchCapLimits | null;
  readAudit: (auditId: string) => Promise<AuditRecord | null>;
}

export const defaultOfferDeps: OfferDeps = {
  gateOpen: isPaidFlowAllowedForRequest,
  withStore: (fn, fallback) => withLaunchStore(fn, fallback),
  limits: () => parseLaunchCapLimits(),
  readAudit: auditId => readAuditRecord(auditId),
};

function spotFor(placeId: string, deps: OfferDeps): boolean {
  const limits = deps.limits();
  if (!limits) return false;
  return deps.withStore(store => interviewSpotAvailable(store, placeId, limits), false);
}

/** The offer for one confirmed audit candidate. The gate is asked first; the cap only when it is open. */
export async function resolveOffer(candidate: AuditCandidateSnapshot, deps: OfferDeps = defaultOfferDeps): Promise<SiteBotOffer> {
  const profile = profileEligibility(candidate);
  if (profile !== 'eligible') return siteBotOffer(profile, { open: false, hasSpot: () => false });
  const open = await deps.gateOpen();
  return siteBotOffer(profile, { open, hasSpot: () => spotFor(candidate.placeId, deps) });
}

export type CandidateLookup = { kind: 'found'; record: AuditRecord; candidate: AuditCandidateSnapshot } | { kind: 'no_audit' };

/** The stored, unexpired candidate for a well-formed auditId + placeId pair. */
export async function findAuditCandidate(auditId: unknown, placeId: unknown, deps: OfferDeps = defaultOfferDeps): Promise<CandidateLookup> {
  if (typeof auditId !== 'string' || !UUID_REGEX.test(auditId) || typeof placeId !== 'string' || !PLACE_ID.test(placeId)) {
    return { kind: 'no_audit' };
  }
  const record = await deps.readAudit(auditId);
  const candidate = record?.candidates.find(value => value.placeId === placeId);
  return record && candidate ? { kind: 'found', record, candidate } : { kind: 'no_audit' };
}

export type InterviewDecision = { kind: 'allowed' } | { kind: 'no_audit' } | { kind: 'blocked'; offer: SiteBotOffer };

/**
 * Read-only check for /site-bot/start, AFTER the caller passed the paid-flow gate: the audit must exist, the business
 * must be eligible, and it must hold a spot or one must be free. Nothing is claimed here (a GET never consumes a spot).
 */
export async function interviewStartDecision(auditId: unknown, placeId: unknown, deps: OfferDeps = defaultOfferDeps): Promise<InterviewDecision> {
  const found = await findAuditCandidate(auditId, placeId, deps);
  if (found.kind !== 'found') return found;
  const offer = await resolveOffer(found.candidate, deps);
  return offer === 'eligible' ? { kind: 'allowed' } : { kind: 'blocked', offer };
}

export type InterviewClaim = { kind: 'no_audit' } | { kind: 'blocked'; offer: SiteBotOffer } | { kind: 'claimed'; status: 'reserved' | 'already' };

/** The claim behind POST /api/site-bot/interview-start (gate already passed by its stub). */
export async function claimInterviewStart(auditId: unknown, placeId: unknown, deps: OfferDeps = defaultOfferDeps): Promise<InterviewClaim> {
  const found = await findAuditCandidate(auditId, placeId, deps);
  if (found.kind !== 'found') return found;
  const profile = profileEligibility(found.candidate);
  if (profile !== 'eligible') return { kind: 'blocked', offer: siteBotOffer(profile, { open: true, hasSpot: () => false }) };
  if (!(await deps.gateOpen())) return { kind: 'blocked', offer: 'waitlist_preopen' };
  const limits = deps.limits();
  const reservation: InterviewReservation = limits
    ? deps.withStore(store => reserveInterviewStart(store, found.candidate.placeId, found.record.auditId, limits), { status: 'unavailable' })
    : { status: 'unavailable' };
  if (reservation.status === 'reserved' || reservation.status === 'already') return { kind: 'claimed', status: reservation.status };
  return { kind: 'blocked', offer: 'waitlist_full' };
}

/** Checkout init: true only when this audit + place exists and the business holds an interview spot (claimed above). */
export async function interviewSpotHeld(auditId: unknown, placeId: unknown, deps: OfferDeps = defaultOfferDeps): Promise<boolean> {
  const found = await findAuditCandidate(auditId, placeId, deps);
  if (found.kind !== 'found') return false;
  return deps.withStore(store => hasInterviewSpot(store, found.candidate.placeId), false);
}

/** The audit page URL that shows this business its current offer (the full / pre-open waiting list, or a block). */
export function auditResultPath(auditId: string, placeId: string): string {
  return `/site-bot/audit?${new URLSearchParams({ auditId, placeId }).toString()}`;
}
