/**
 * Site Bot launch step 2 (MVP review B4 and section 5.2): staff-checked claims.
 *
 * A licence (licence text, a licence number, a registered-contractor answer) and a warranty the owner typed himself (the
 * credentials step's "other" field, or any legacy free text) come from intake with no check. For the pilot the founder's
 * plan is a human check before go-live: staff confirm the claim at the copy-review approval (the approved packet that
 * deploy/route.ts already requires), stored as { verifiedBy, verifiedAt } per claim. Without that record the generated
 * site carries no such claim: the renderer drops it from the trust bar, the proof, the Q&A and the FAQ, and drops every
 * prose sentence that states it. Fail closed: a heading the renderer cannot drop blocks the render (researchedClaimBlockers).
 *
 * Not checked here: a warranty picked from the fixed chips (WARRANTY_PICKER_VALUES): it is the owner's own explicit choice
 * of a stated duration (the attestation review 5.2 asks for), there is no registry to check it against, and its wording is
 * code-built. The customer's verbatim review quote is the customer's words, not a business claim, and is never edited.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (every token is read from the data files or the owner's answers).
 */
import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from './lpCopyPrompt';
import { CLAIM_RULES } from './copyGates.config';
import { CLAIM_TOKENS } from './generationData';
import { codeOwnedFactTemplates, licenseDocumentNouns, OWNER_FACT_TEMPLATES, ownerFacts, proofText, trustText, type OwnerFact, type OwnerFactTemplates } from './ownerFactCopy';
import { proseSentences, restatementMatches, type FactRestatementSpec, type RestatementFact } from './factRestatement';
import { NO_WARRANTY_VALUE, WARRANTY_PICKER_VALUES } from '../site-bot/credentialsCopy';

export { isStaffClaimCheck, parseClaimVerification, VERIFIABLE_CLAIMS, VERIFIED_BY_MAX_CHARS } from './claimVerificationRecord';
export type { ClaimVerification, StaffClaimCheck, VerifiableClaim } from './claimVerificationRecord';
import { parseClaimVerification } from './claimVerificationRecord';
import type { VerifiableClaim } from './claimVerificationRecord';

const text = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

/** True when the warranty is one of the fixed picker chips (or the "no warranty" code value): no staff check needed. */
export function warrantyFromFixedChip(value: unknown): boolean {
  const raw = text(value);
  return raw === NO_WARRANTY_VALUE || Object.values(WARRANTY_PICKER_VALUES).includes(raw);
}

/** The claims this owner data carries that need a staff check (a licence answer of any kind; a free-text warranty). */
export function claimsNeedingCheck(data: Pick<CollectedData, 'license' | 'guarantee'>): VerifiableClaim[] {
  const out: VerifiableClaim[] = [];
  if (text(data.license)) out.push('licence');
  if (text(data.guarantee) && !warrantyFromFixedChip(data.guarantee)) out.push('warranty');
  return out;
}

/** The claims that need a check and have none (absent or invalid verification = every claim unverified). */
export function unverifiedClaims(data: Pick<CollectedData, 'license' | 'guarantee'>, verification: unknown): VerifiableClaim[] {
  const parsed = verification === undefined || verification === null ? {} : parseClaimVerification(verification);
  return claimsNeedingCheck(data).filter(claim => !parsed?.[claim]);
}

function digitRuns(value: unknown, min: number): string[] {
  return [...new Set((text(value).match(/\d[\d-]*\d|\d/g) ?? []).map(run => run.replace(/-/g, '')).filter(run => run.length >= min))];
}

/** Fact slots that hold the owner's own words (never a parsed number such as a duration in months). */
const OWNER_TEXT_SLOTS = ['license', 'detail', 'scope', 'proofVerbatim', 'warranty'];

function factStrings(fact: OwnerFact | undefined, templates: OwnerFactTemplates): string[] {
  if (!fact) return [];
  const own = OWNER_TEXT_SLOTS.map(key => fact.slots[key]);
  return [trustText(fact, templates), proofText(fact, templates), ...own].filter((item): item is string => typeof item === 'string' && [...item.trim()].length >= 3);
}

/** What states an unverified claim: per claim its digit runs and phrases (the code-built strings, the owner's words, the claim tokens). */
export function unverifiedClaimSpec(data: CollectedData, verification: unknown, templates: OwnerFactTemplates = codeOwnedFactTemplates() ?? OWNER_FACT_TEMPLATES): FactRestatementSpec | null {
  const claims = unverifiedClaims(data, verification);
  if (!claims.length) return null;
  const facts = ownerFacts(data, { firstPartyProof: [] }, templates);
  const out: RestatementFact[] = [];
  if (claims.includes('licence')) {
    out.push({
      kind: 'license',
      digits: digitRuns(data.license, 3),
      phrases: [...new Set([...(CLAIM_TOKENS.license_grade ?? []), ...licenseDocumentNouns(templates), ...factStrings(facts.license, templates), ...(templates.trustContractorRegistered ? [templates.trustContractorRegistered] : [])])],
    });
  }
  if (claims.includes('warranty')) {
    out.push({
      kind: 'warranty',
      digits: digitRuns(data.guarantee, 2),
      phrases: [...new Set([...(CLAIM_RULES.find(rule => rule.id === 'warranty')?.tokens ?? []), ...factStrings(facts.warranty, templates)])],
    });
  }
  return { facts: out, usp: '' };
}

/** The result of one page's scrub: the copy without the claim, the paths dropped, and the paths that cannot be dropped. */
export interface ClaimScrub {
  copy: SiteCopy;
  dropped: string[];
  blocked: string[];
}

/** Headings that may become null (the renderer then shows its approved fallback heading). */
const NULLABLE_HEADINGS = ['storyHeadline', 'processHeadline', 'qaHeadline', 'proofHeadline'] as const;
/** Headings that may become empty (the renderer then shows a hidden nav-text heading, or does not render them). */
const EMPTYABLE_HEADINGS = ['aboutPageHeadline', 'faqHeadline', 'servicesHeadline', 'stickyBarLine', 'aboutBlurb'] as const;
/** Headings the page cannot lose: a claim there blocks the render (fail closed, never an edited heading). */
const REQUIRED_HEADINGS = ['heroHeadline', 'heroCta', 'formHeadline'] as const;
/** Prose fields: the sentences stating the claim go; an emptied field becomes '' (or null where the type allows it). */
const PROSE_FIELDS = ['heroSubheadline', 'aboutPageBody', 'storyBody'] as const;
const NULLABLE_PROSE = ['guaranteeBlock', 'responseTimeBadge', 'scarcityLine', 'reviewContext'] as const;

/**
 * One page's copy without the unverified claims (a deep copy; the input is not changed). Lists lose whole items; prose loses
 * whole sentences; nothing is rewritten. `blocked` lists the fields that would have to change wording (a required heading,
 * or a hero subheadline / meta description left empty).
 */
export function withoutUnverifiedClaims(copy: SiteCopy, spec: FactRestatementSpec | null): ClaimScrub {
  const out = structuredClone(copy) as SiteCopy & Record<string, unknown>;
  const dropped: string[] = [];
  const blocked: string[] = [];
  if (!spec) return { copy: out, dropped, blocked };
  const states = (value: unknown) => typeof value === 'string' && restatementMatches(value, spec).length > 0;
  const withoutSentences = (value: string, field: string): string => {
    const sentences = proseSentences(value);
    const kept = sentences.filter(sentence => !states(sentence));
    if (kept.length === sentences.length) return value;
    dropped.push(field);
    return kept.join(' ');
  };
  for (const field of REQUIRED_HEADINGS) if (states(out[field])) blocked.push(field);
  for (const field of NULLABLE_HEADINGS) if (states(out[field])) { out[field] = null; dropped.push(field); }
  for (const field of EMPTYABLE_HEADINGS) if (states(out[field])) { out[field] = ''; dropped.push(field); }
  for (const field of PROSE_FIELDS) {
    const value = out[field];
    if (typeof value !== 'string' || !states(value)) continue;
    const kept = withoutSentences(value, field);
    if (field === 'heroSubheadline' && !kept.trim()) blocked.push(field);
    out[field] = kept;
  }
  for (const field of NULLABLE_PROSE) {
    const value = out[field];
    if (typeof value !== 'string' || !states(value)) continue;
    const kept = withoutSentences(value, field);
    out[field] = kept.trim() ? kept : null;
  }
  const list = <T>(field: string, items: T[] | null | undefined, hit: (item: T) => boolean): T[] | null | undefined => {
    if (!Array.isArray(items)) return items;
    const kept = items.filter(item => !hit(item));
    if (kept.length !== items.length) dropped.push(field);
    return kept;
  };
  out.trustBarItems = list('trustBarItems', out.trustBarItems, item => states(item)) ?? [];
  out.serviceItems = list('serviceItems', out.serviceItems, item => states(item)) ?? [];
  out.faqItems = list('faqItems', out.faqItems, item => states(item?.q) || states(item?.a)) ?? [];
  if (out.qaItems) out.qaItems = list('qaItems', out.qaItems, item => states(item?.q) || states(item?.a)) ?? null;
  if (out.proofItems) out.proofItems = list('proofItems', out.proofItems, item => states(item?.text)) ?? null;
  if (out.processSteps) out.processSteps = list('processSteps', out.processSteps, item => states(item?.text)) ?? null;
  // Service cards keep their owner-confirmed names; a description loses the sentences that state the claim.
  out.serviceDetails = (out.serviceDetails ?? []).map((item, index) => (item && states(item.description)
    ? { ...item, description: withoutSentences(item.description, `serviceDetails[${index}].description`) }
    : item));
  return { copy: out, dropped: [...new Set(dropped)], blocked };
}

/** Thrown by the renderer when an unverified claim sits in a field it cannot drop (see researchedClaimBlockers). */
export class UnverifiedClaimError extends Error {
  constructor(readonly blocked: string[]) {
    super(`Unverified licence / warranty claim in a field the renderer cannot drop: ${blocked.join(', ')}. Record the staff check at the copy-review approval, or regenerate the page.`);
    this.name = 'UnverifiedClaimError';
  }
}

/** The `<opportunityId>:<field>` entries that block a render (empty = the site renders with the claims dropped). */
export function researchedClaimBlockers(pages: ReadonlyArray<{ opportunityId: string; copy: SiteCopy }>, data: CollectedData, verification: unknown): string[] {
  const spec = unverifiedClaimSpec(data, verification);
  if (!spec) return [];
  return pages.flatMap(page => withoutUnverifiedClaims(page.copy, spec).blocked.map(field => `${page.opportunityId}:${field}`));
}
