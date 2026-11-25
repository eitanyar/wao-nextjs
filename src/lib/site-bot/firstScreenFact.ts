/**
 * Site Bot step 2c: the first-screen fact rule (a)-(e) of docs/missions/site-bot-step2-interview-preview-2026-11-25.md
 * (Fable 5.2 on Koray K-01; Yonatan sign-off 2026-11-25). Home page only. Pure.
 *
 * (a) The hero subheadline carries at least one eligible owner fact and the generation record keeps its id
 *     (firstScreenFactId). If no eligible fact fits, a code-built trust-bar item rendered from an interview `credential`
 *     fact (its cred-* id) satisfies the rule. Fact words in the title or H1 never count (only heroSubheadline is read
 *     here), and nothing here touches the title formula or the H1 gate.
 * (b) Eligible: status confirmed, or edited (his ownerText). Priority:
 *       1. job (no serviceId, or a homepage service)   2. tool   3. local (every place it names is a homepage service
 *       area)   4. non-money price_rule (no digits, no shekel sign)   5. number (his exact digits, not one the trust bar
 *       shows)
 *     A credential goes in the trust bar only. A refusal is never used. A fact with a condition is used only with that
 *     condition stated (the carry check requires it).
 * (c) The subheadline limit (90), the one-verb-sentence shape and every truth gate are the existing generator's
 *     (researchPageCopy.ts); the prompt rule asks for it and for no service + city pair (firstScreenRule below).
 * (d) The meta description derivation lives with the renderer (researchedSite.ts homepageMetaDescription).
 * (e) No eligible fact fits: the preview still renders; the caller logs `first_screen_fact_missing`.
 *
 * "Carries" is a deterministic word-overlap check (Hebrew one- and two-letter prefixes folded, the page's own anchor
 * words never count): step 3's ledger replaces it with sentence-to-fact links.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (the prefix letters are \u escapes).
 */
import type { InterviewFact, InterviewFactSet, InterviewFactType } from './interviewFacts';
import { localitiesNamedIn, type Locality } from './servedAreas';

/** A fact the writer may use: confirmed, or edited (his own correction is the text). */
export interface UsableFact {
  id: string;
  type: InterviewFactType;
  text: string;
  condition?: string;
  serviceId?: string;
  /** True when the text is his correction (status edited). */
  edited?: boolean;
}

/** Confirmed and edited facts only (pending and removed are never used). Edited -> ownerText. */
export function usableFacts(set: InterviewFactSet | null | undefined): UsableFact[] {
  if (!set || !Array.isArray(set.facts)) return [];
  return set.facts.flatMap((fact: InterviewFact): UsableFact[] => {
    if (fact.status !== 'confirmed' && fact.status !== 'edited') return [];
    const text = (fact.status === 'edited' && fact.ownerText ? fact.ownerText : fact.quote).trim();
    if (!text) return [];
    return [{
      id: fact.id, type: fact.type, text,
      ...(fact.condition && fact.status !== 'edited' ? { condition: fact.condition } : {}),
      ...(fact.serviceId ? { serviceId: fact.serviceId } : {}),
      ...(fact.status === 'edited' && fact.ownerText ? { edited: true } : {}),
    }];
  });
}

export interface FirstScreenContext {
  /** The owner-service evidence ids the homepage covers (dossier owner-service:* assertions of its services). */
  homeServiceIds: readonly string[];
  /** researchedServiceAreas(home): the places the homepage names. */
  serviceAreas: readonly string[];
  localities: readonly Locality[];
  /** Digit runs the code-built trust bar shows (years, rating, review count...). */
  trustBarNumbers: readonly string[];
}

const PRIORITY: readonly InterviewFactType[] = ['job', 'tool', 'local', 'price_rule', 'number'];
const DIGITS = /\d+/g;
const SHEKEL = /[\u20AA]|\u05E9["\u05F4]\u05D7/;

const placeKey = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

function localNamesOnlyHomeAreas(text: string, context: FirstScreenContext): boolean {
  const areas = new Set(context.serviceAreas.map(placeKey));
  return localitiesNamedIn(text, context.localities)
    .every(place => [place.he_name, ...(place.he_aliases ?? [])].some(name => areas.has(placeKey(name))));
}

/** Why a fact is (not) eligible for the first screen; null = eligible. */
export function firstScreenIneligibility(fact: UsableFact, context: FirstScreenContext): string | null {
  switch (fact.type) {
    case 'credential': return 'credential_trust_bar_only';
    case 'refusal': return 'refusal_never_used';
    case 'job': return !fact.serviceId || context.homeServiceIds.includes(fact.serviceId) ? null : 'job_other_service';
    case 'tool': return null;
    case 'local': return localNamesOnlyHomeAreas(`${fact.text} ${fact.condition ?? ''}`, context) ? null : 'local_outside_area';
    case 'price_rule': return /\d/.test(fact.text) || SHEKEL.test(fact.text) ? 'price_rule_money' : null;
    case 'number': {
      const digits = fact.text.match(DIGITS) ?? [];
      if (!digits.length) return 'number_without_digits';
      return digits.every(run => context.trustBarNumbers.includes(run)) ? 'number_on_trust_bar' : null;
    }
    default: return 'unknown_type';
  }
}

/** The eligible facts in rule (b) priority order (stable within a type: the fact set's order). */
export function firstScreenCandidates(facts: readonly UsableFact[], context: FirstScreenContext): UsableFact[] {
  return PRIORITY.flatMap(type => facts.filter(fact => fact.type === type && firstScreenIneligibility(fact, context) === null));
}

// ---------------------------------------------------------------------------------------------------------------------
// The carry check

/** Hebrew one-letter prefixes (vav, he, bet, lamed, mem, shin, kaf), folded up to twice. */
const PREFIX_LETTERS = '\u05D5\u05D4\u05D1\u05DC\u05DE\u05E9\u05DB';
const NIQQUD = /[\u0591-\u05C7]/g;

function tokens(text: string): string[] {
  return text.normalize('NFC').replace(NIQQUD, '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(token => token.length >= 2);
}

function variants(token: string): string[] {
  const out = [token];
  let current = token;
  for (let i = 0; i < 2; i++) {
    if (current.length > 3 && PREFIX_LETTERS.includes(current[0])) {
      current = current.slice(1);
      out.push(current);
    } else break;
  }
  return out;
}

function stems(text: string): Set<string> {
  return new Set(tokens(text).flatMap(variants));
}

/** The content words of a fact text: three letters or more, minus the page's own anchor words (name, city, business). */
function contentTokens(text: string, exclude: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  return tokens(text).filter(token => {
    if (token.length < 3 || /^\d+$/.test(token)) return false;
    if (variants(token).some(item => exclude.has(item))) return false;
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

/** The words that never count as carrying a fact: the page's trade / city / business name (they are on the page anyway). */
export function anchorExclusions(...texts: Array<string | null | undefined>): Set<string> {
  return new Set(texts.flatMap(text => (text ? [...stems(text)] : [])));
}

/**
 * True when `subheadline` carries `fact`: every digit run of the fact (and of its condition) appears in it, and enough of
 * the fact's content words do (2 for a short fact, up to 3 for a long one; all of them for a fact of one or two words);
 * a condition needs at least one of its own words too.
 */
export function subheadlineCarriesFact(subheadline: string, fact: Pick<UsableFact, 'text' | 'condition'>, exclude: ReadonlySet<string> = new Set()): boolean {
  const sub = stems(subheadline);
  const subDigits = new Set(subheadline.match(DIGITS) ?? []);
  const factDigits = [...(fact.text.match(DIGITS) ?? []), ...((fact.condition ?? '').match(DIGITS) ?? [])];
  if (factDigits.some(run => !subDigits.has(run))) return false;
  const hit = (token: string) => variants(token).some(item => sub.has(item));
  const words = contentTokens(fact.text, exclude);
  const matched = words.filter(hit).length;
  const need = words.length <= 2 ? words.length : Math.min(3, Math.max(2, Math.ceil(words.length * 0.3)));
  if (words.length === 0 && factDigits.length === 0) return false;
  if (matched < need) return false;
  if (fact.condition) {
    const conditionWords = contentTokens(fact.condition, exclude);
    if (conditionWords.length && !conditionWords.some(hit)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------
// Resolution after generation

export type FirstScreenSource = 'subheadline' | 'trust_bar';

export interface FirstScreenOutcome {
  firstScreenFactId: string | null;
  source: FirstScreenSource | null;
  /** The eligible candidates the prompt named, in priority order. */
  candidateIds: string[];
  /** Rule (e): no eligible fact fits (the caller logs first_screen_fact_missing). */
  missing: boolean;
}

/** A credential fact and the trust-bar item the code built from it (null = the bar shows no item from it). */
export interface CredentialTrustItem {
  factId: string;
  item: string | null;
}

/**
 * Which fact the generated first screen carries: the first candidate the subheadline carries, else the first credential
 * fact whose code-built trust-bar item is rendered, else missing.
 */
export function resolveFirstScreen(
  heroSubheadline: string,
  candidates: readonly UsableFact[],
  credentialItems: readonly CredentialTrustItem[],
  renderedTrustBar: readonly string[],
  exclude: ReadonlySet<string> = new Set(),
): FirstScreenOutcome {
  const candidateIds = candidates.map(fact => fact.id);
  const carried = candidates.find(fact => subheadlineCarriesFact(heroSubheadline, fact, exclude));
  if (carried) return { firstScreenFactId: carried.id, source: 'subheadline', candidateIds, missing: false };
  const shown = new Set(renderedTrustBar.map(item => item.normalize('NFC').trim()));
  const credential = credentialItems.find(entry => entry.item && shown.has(entry.item.normalize('NFC').trim()));
  if (credential) return { firstScreenFactId: credential.factId, source: 'trust_bar', candidateIds, missing: false };
  return { firstScreenFactId: null, source: null, candidateIds, missing: true };
}

/** The digit runs of the code-built trust bar (rule b5). */
export function trustBarNumbers(items: readonly string[]): string[] {
  return [...new Set(items.flatMap(item => item.match(DIGITS) ?? []))];
}

/** The brief constraint id that carries the first-screen instruction (one definition: researchPageCopy.ts). */
export { FIRST_SCREEN_CONSTRAINT_ID } from '../lp/researchPageCopy';
/** The brief evidence id of one interview fact (firstPartyProof). */
export function interviewEvidenceId(factId: string): string {
  return `interview-${factId}`;
}
