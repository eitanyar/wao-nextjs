/**
 * Site Bot ads-first launch, build step 1: what the confirmed free-check result offers the owner, in place of the old
 * "build my site" CTA. Exactly one of:
 *
 *   not_eligible_has_site   the picked GBP already links a website (Places websiteUri)          no CTA
 *   not_eligible_trade      the primary category is EXPLICITLY outside launch scope              trade waiting list
 *   not_eligible_profile    Places says the business is not OPERATIONAL, or it has zero ratings no CTA (one cause shown)
 *   waitlist_preopen        eligible, but the SITE_BOT_PAID_FLOW gate is closed (prod default)  waiting list
 *   waitlist_full           eligible, gate open, but the launch cap is reached (launchStore.ts) waiting list
 *   eligible                eligible, gate open, a spot is free                                 the existing CTA
 *
 * Checks run in that order, so a business with a website never sees the trade or profile block. Only data the audit
 * lookup already stores is used. The per-business part (profileEligibility) lives in profileEligibility.ts, because the
 * trade-scope match reads the GBP taxonomy JSON and this module ships to the browser.
 * The profile block shows ONE cause (profileBlockCause): 'closed' when not OPERATIONAL (wins), else 'no_ratings'. "Unverified" is NOT a signal here: Places does not expose GBP verification, so the
 * profile block never claims it. A missing businessStatus (records written before it was kept) is no signal either.
 *
 * Pure and browser-safe. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
export type ProfileEligibility = 'has_site' | 'trade' | 'profile' | 'eligible';

export const SITE_BOT_OFFERS = [
  'not_eligible_has_site',
  'not_eligible_trade',
  'not_eligible_profile',
  'waitlist_preopen',
  'waitlist_full',
  'eligible',
] as const;

export type SiteBotOffer = (typeof SITE_BOT_OFFERS)[number];

/**
 * Why a business is on the waiting list. 'location' (step 2a) is never an audit offer: it is written only by the interview
 * session's work-location exit (interviewSession.ts), with the contact the owner already gave, so waitlistReason() never
 * returns it and the public waiting-list POST can never pick it.
 */
export type WaitlistReason = 'preopen' | 'full' | 'trade' | 'location';

/** Why the profile block shows: the business is marked closed (any non-OPERATIONAL status), or it has no ratings. */
export type ProfileBlockCause = 'closed' | 'no_ratings';

/** The audit snapshot fields the decision reads (AuditCandidateSnapshot in auditStore.ts). */
export interface EligibilityCandidate {
  hasWebsite: boolean;
  types: readonly string[];
  primaryType?: string;
  /** Places primaryTypeDisplayName (the audit asks for languageCode=he). Absent on older records. */
  primaryTypeDisplayName?: string;
  businessStatus?: string;
  hasRating: boolean;
  userRatingCount?: number;
}

export function isSiteBotOffer(value: unknown): value is SiteBotOffer {
  return typeof value === 'string' && (SITE_BOT_OFFERS as readonly string[]).includes(value);
}

/** True when the profile carries at least one rating. Places omits userRatingCount when it is zero. */
export function hasRatings(candidate: Pick<EligibilityCandidate, 'hasRating' | 'userRatingCount'>): boolean {
  if (typeof candidate.userRatingCount === 'number') return candidate.userRatingCount > 0;
  return candidate.hasRating === true;
}

/** Places businessStatus present and not OPERATIONAL (CLOSED_TEMPORARILY / CLOSED_PERMANENTLY / anything else). */
export function isNotOperational(candidate: Pick<EligibilityCandidate, 'businessStatus'>): boolean {
  return typeof candidate.businessStatus === 'string' && candidate.businessStatus.trim() !== ''
    && candidate.businessStatus !== 'OPERATIONAL';
}

export function isProfileBlockCause(value: unknown): value is ProfileBlockCause {
  return value === 'closed' || value === 'no_ratings';
}

/** The one cause the profile block names, or null when the profile is fine. Closed wins when both apply. */
export function profileBlockCause(
  candidate: Pick<EligibilityCandidate, 'businessStatus' | 'hasRating' | 'userRatingCount'>,
): ProfileBlockCause | null {
  if (isNotOperational(candidate)) return 'closed';
  if (!hasRatings(candidate)) return 'no_ratings';
  return null;
}

/**
 * The full decision. `hasSpot` is read only when the gate is open (a closed gate never consults the cap), and must be
 * true for an owner who already holds an interview spot, so he keeps it after the cap fills.
 */
export function siteBotOffer(profile: ProfileEligibility, gate: { open: boolean; hasSpot: () => boolean }): SiteBotOffer {
  if (profile === 'has_site') return 'not_eligible_has_site';
  if (profile === 'trade') return 'not_eligible_trade';
  if (profile === 'profile') return 'not_eligible_profile';
  if (!gate.open) return 'waitlist_preopen';
  return gate.hasSpot() ? 'eligible' : 'waitlist_full';
}

/** The waiting-list reason an offer carries, or null when the offer shows no waiting-list form. */
export function waitlistReason(offer: SiteBotOffer): WaitlistReason | null {
  if (offer === 'waitlist_preopen') return 'preopen';
  if (offer === 'waitlist_full') return 'full';
  if (offer === 'not_eligible_trade') return 'trade';
  return null;
}
