/**
 * Site Bot step 2c: what the generator gets from the interview (the input side of step 3's fact ledger). Pure.
 *
 * Facts (docs/missions/site-bot-step2-interview-preview-2026-11-25.md, 2c item 2): the writer may use only the confirmed /
 * edited interview facts (edited = his ownerText) plus the existing Google / research facts. Removed and pending facts are
 * never used:
 *   - every usable fact except credentials and refusals goes to the generation data (CollectedData.interviewFacts, so the
 *     copy gates count it as an owner fact) and to the page brief as approved first-party proof (`interview-<id>`);
 *   - a credential is code-built into the trust bar from the credentials-step field it came from: a REMOVED credential
 *     fact removes that field from the generation data (the site no longer states it); an EDITED one replaces the field
 *     with his correction when it keeps the field's shape (years: digits only), else the field is dropped and his
 *     correction joins the interview facts as text (never rendered as a code-built claim);
 *   - a refusal is never used (rule b) and stays out of the generation altogether.
 *
 * Work location (2c item 4; VISION.md "locationType conditional", Yonatan's sign-off): the session's workLocation (2a)
 * frames the site honestly. HOME = on-location only: serviceModel 'field', no street address, and a brief constraint
 * that no studio / shop / place customers come to is implied. MIX = both: serviceModel 'mixed'; the street address stays
 * only when it is the business's published Google address (the audit candidate's formattedAddress), else it is dropped.
 * Not asked (every other trade) = unchanged. OWN_PLACE / ONLINE never reach generation (2a exits them).
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (constraint texts are English; owner text is moved, never typed).
 */
import type { CollectedData } from '../bot/prompts';
import type { BriefEvidence } from './research/pageBrief';
import type { CredentialField } from './interviewFacts';
import type { WorkLocation } from './workLocation';
import { FIRST_SCREEN_CONSTRAINT_ID, interviewEvidenceId, type UsableFact } from './firstScreenFact';

const CREDENTIAL_FIELD_OF_ID: Readonly<Record<string, CredentialField>> = {
  'cred-years': 'yearsInField',
  'cred-license': 'license',
  'cred-guarantee': 'guarantee',
};

/** Brief evidence values are bounded (pageBrief.ts MAX_EVIDENCE_VALUE_CHARS = 240). */
const MAX_FACT_EVIDENCE_CHARS = 240;
/** At most this many interview facts reach one brief (the proof section holds 24 items). */
export const MAX_BRIEF_INTERVIEW_FACTS = 12;

const TYPE_LABEL: Readonly<Record<string, string>> = {
  job: 'a recent job', tool: 'a tool or brand he uses', local: 'a local detail', price_rule: 'how he prices',
  number: 'a number with what it counts',
};

const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const addressKey = (value: string) => value.normalize('NFC').replace(/[\s,]+/g, ' ').trim().toLowerCase();

/** The street address is the published Google address of the business (exact, whitespace / comma insensitive). */
export function isPublishedAddress(streetAddress: string | undefined, publishedAddress: string | null | undefined): boolean {
  const street = clean(streetAddress);
  const published = clean(publishedAddress);
  return Boolean(street && published) && addressKey(street) === addressKey(published);
}

/** Yonatan sign-off 2026-11-25: appended to both MIX constraints. */
const MIX_HOME_STATES_BOTH = 'The home page states both: that he comes to the customer, and that he also works at his own place.';

/**
 * Writer constraints on every interview-generated page (Yonatan sign-off 2026-11-25, C2 and C3 iii). English prompt text.
 */
export const INTERVIEW_WRITER_CONSTRAINTS: readonly BriefEvidence[] = [
  { id: 'constraint-no-relative-time', status: 'approved', value: 'Never carry a relative time word from a fact (last week, yesterday, a month ago, this month) into site copy; state what happened without when.' },
  { id: 'constraint-fact-claim-link', status: 'approved', value: 'Do not link a fact to a USP or tool claim unless the fact itself states it.' },
];

/** The work-location framing of the generation data (see the header). */
export function frameWorkLocation(data: CollectedData, workLocation: WorkLocation | null | undefined, publishedAddress: string | null | undefined): CollectedData {
  if (workLocation !== 'HOME' && workLocation !== 'MIX') return data;
  const next: CollectedData = { ...data, serviceModel: workLocation === 'HOME' ? 'field' : 'mixed' };
  if (workLocation === 'HOME' || !isPublishedAddress(data.streetAddress, publishedAddress)) delete next.streetAddress;
  return next;
}

/** The brief constraint of the framing (English; null when the question was not asked). */
export function workLocationConstraint(workLocation: WorkLocation | null | undefined, data: CollectedData): BriefEvidence | null {
  if (workLocation === 'HOME') {
    return { id: 'constraint-work-location', status: 'approved', value: 'Work location (owner-stated): he works only at the customer\'s place, on location. Never imply a studio, a shop, an office or any place customers come to, and never invite a visit.' };
  }
  if (workLocation === 'MIX') {
    return {
      id: 'constraint-work-location', status: 'approved',
      value: clean(data.streetAddress)
        ? `Work location (owner-stated): he works both at the customer's place and at his own place. Name his own place only by the street address in the owner facts. ${MIX_HOME_STATES_BOTH}`
        : `Work location (owner-stated): he works both at the customer's place and at his own place. No address is published: never state an address or invite walk-in visits. ${MIX_HOME_STATES_BOTH} Present his own place as by appointment only.`,
    };
  }
  return null;
}

/** The facts the writer sees as text (no credential, no refusal). */
export function writerFacts(facts: readonly UsableFact[]): UsableFact[] {
  return facts.filter(fact => fact.type !== 'credential' && fact.type !== 'refusal');
}

/**
 * The generation data: framing, credential decisions, and the usable facts as owner-fact strings. `allFacts` is the whole
 * stored set's review state (id + status + ownerText), so a REMOVED credential is honoured.
 */
export function interviewGenerationData(
  data: CollectedData,
  input: {
    usable: readonly UsableFact[];
    removedIds: readonly string[];
    workLocation: WorkLocation | null | undefined;
    publishedAddress: string | null | undefined;
  },
): CollectedData {
  const next: CollectedData = { ...frameWorkLocation(data, input.workLocation, input.publishedAddress) };
  const extraTexts: string[] = [];
  for (const id of input.removedIds) {
    const field = CREDENTIAL_FIELD_OF_ID[id];
    if (field) delete next[field];
  }
  for (const fact of input.usable) {
    if (fact.type !== 'credential' || !fact.edited) continue;
    const field = CREDENTIAL_FIELD_OF_ID[fact.id];
    if (!field) continue;
    // An edited credential: years keep the field when his correction is digits only; anything else drops the code-built
    // field (a licence / warranty claim is never built from free text) and keeps his words as plain text.
    if (field === 'yearsInField' && /^\d{1,2}$/.test(fact.text)) { next.yearsInField = fact.text; continue; }
    delete next[field];
    extraTexts.push(fact.text);
  }
  const texts = [...writerFacts(input.usable).map(fact => (fact.condition ? `${fact.text} (${fact.condition})` : fact.text)), ...extraTexts];
  if (texts.length) next.interviewFacts = texts;
  else delete next.interviewFacts;
  return next;
}

/** One interview fact as approved brief proof (bounded; an over-long one is left out of the brief, never cut). */
export function factEvidence(fact: UsableFact): BriefEvidence | null {
  const value = `Owner's own words (${TYPE_LABEL[fact.type] ?? fact.type}): ${fact.text}${fact.condition ? ` | only with his condition: ${fact.condition}` : ''}`;
  return value.length <= MAX_FACT_EVIDENCE_CHARS ? { id: interviewEvidenceId(fact.id), value, status: 'approved' } : null;
}

/**
 * The homepage's first-screen instruction (first-screen fact v2, rule a): the subheadline is a free USP sentence and the
 * system renders the owner's fact as a quote line (firstScreenFact.ts). It names no fact: the writer never picks it.
 */
export function firstScreenConstraint(): BriefEvidence {
  return {
    id: FIRST_SCREEN_CONSTRAINT_ID,
    status: 'approved',
    value: 'First screen: heroSubheadline is a free USP sentence in the third person about the business; it never quotes or paraphrases an owner fact. The system shows one owner fact as a quote line under it.',
  };
}

/** What buildPageBriefs adds from the interview (researchToSite.ts). */
export interface InterviewBriefOptions {
  /** Writer facts, priority-ordered, as brief evidence. */
  facts: readonly UsableFact[];
  /** Homepage only: the first-screen rule applies (the preview's homepage generation). */
  firstScreen: boolean;
  workLocation: WorkLocation | null;
}
