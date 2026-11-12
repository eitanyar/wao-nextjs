/**
 * Rerun-3 items 4-5: two claim gates on the model-written fields of a research page.
 *
 * gate_fear_promise (item 4, "fear into guarantee"): a sentence that negates a content word of the owner's idealClientFear
 * (a negation / "without" word from Noa's parseNegationWords, followed within FEAR_NEGATION_WINDOW words by a fear content
 * word) is a promise the owner never made, unless his usp or guarantee states that same negation (the same fear word after a
 * negation word). Fear content words: words of the fear of at least FEAR_MIN_STEM letters (after at most two attached prefix
 * letters), minus the trade, the business name, the service labels and the places (they name the job, not the fear).
 *
 * gate_same_day_scope (item 5): on a page the owner gave no same-day grant for, a sentence may carry a same-day token (Noa's
 * parseSameDayWords) only when it names a place from the owner's response place tail. Site Bot launch step 2: a grant is per
 * page, not per owner. The response fact grants every page unless its text names services; a usp / guarantee sentence with a
 * same-day token grants the services it names (ownerNamedServices), or every page when it names none. The homepage and the
 * service hub (no page service) take only the grants that name no service.
 *
 * Matching: whole words, NFC, at most two attached prefix letters (PREFIX_LETTERS) on either side. Fix order (the generator):
 * drop the sentence where the field is droppable, one repair for every other field, then the page fails.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (every token list is read from the owner data or the template file).
 */
import { PREFIX_LETTERS } from './hebrewPrefixLetters';

export const FEAR_NEGATION_WINDOW = 3;
export const FEAR_MIN_STEM = 3;

const WORD = /[\p{L}\p{M}\u05F3\u05F4'"\u05BE-]+/gu;

/** The words of a text (letters, geresh / gershayim and maqaf kept inside a word), NFC. */
export function claimWords(text: string): string[] {
  return (text.normalize('NFC').match(WORD) ?? []).flatMap(word => word.split('\u05BE')).map(word => word.replace(/^['"\u05F3\u05F4-]+|['"\u05F3\u05F4-]+$/g, '')).filter(Boolean);
}

/** A word and its forms without one or two attached prefix letters. */
export function wordForms(word: string): string[] {
  const out = [word];
  let rest = word;
  for (let i = 0; i < 2 && rest.length > 1 && PREFIX_LETTERS.includes(rest[0]); i++) {
    rest = rest.slice(1);
    out.push(rest);
  }
  return out;
}

function sameWord(a: string, b: string): boolean {
  const forms = new Set(wordForms(a));
  return wordForms(b).some(form => forms.has(form));
}

/** Conjunction / relative letters (vav, shin) that may attach to a negation word; no other prefix (a mem-prefixed word is not one). */
const NEGATION_PREFIXES = '\u05D5\u05E9';

/** A text word is the negation word itself, or it with one attached vav / shin. */
function negationWord(word: string, negation: string): boolean {
  return word === negation || (word.length > negation.length && NEGATION_PREFIXES.includes(word[0]) && word.slice(1) === negation);
}

/** Forms of at least FEAR_MIN_STEM letters (the ones a match may use). */
function stemForms(word: string): string[] {
  return wordForms(word).filter(form => [...form].length >= FEAR_MIN_STEM);
}

export interface FearPromiseSpec {
  /** One entry per fear content word: its matchable forms. */
  fearWords: string[][];
  /** Negation words / phrases (parseNegationWords), each as its words. */
  negations: string[][];
  /** Indices into fearWords the owner's usp / guarantee negates himself (allowed). */
  ownerNegated: number[];
}

/** Indices of the fear words a text negates (a negation followed within the window by that fear word). */
export function negatedFearWords(text: string, spec: Pick<FearPromiseSpec, 'fearWords' | 'negations'>): number[] {
  const words = claimWords(text);
  const out = new Set<number>();
  for (let at = 0; at < words.length; at++) {
    const negation = spec.negations.find(phrase => phrase.length && phrase.every((part, offset) => words[at + offset] !== undefined && negationWord(words[at + offset], part)));
    if (!negation) continue;
    const after = words.slice(at + negation.length, at + negation.length + FEAR_NEGATION_WINDOW);
    spec.fearWords.forEach((forms, index) => {
      if (after.some(word => stemForms(word).some(form => forms.includes(form)))) out.add(index);
    });
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * The spec of one page, or null without a fear or a negation list. `excluded` = the trade, the business name, the service labels
 * and the places (their words never count as fear words). `ownerTexts` = the usp and the guarantee.
 */
export function buildFearPromiseSpec(fear: unknown, negationWords: readonly string[], excluded: readonly string[], ownerTexts: readonly unknown[]): FearPromiseSpec | null {
  if (typeof fear !== 'string' || !fear.trim()) return null;
  const negations = negationWords.map(item => claimWords(item)).filter(item => item.length);
  if (!negations.length) return null;
  const skip = excluded.flatMap(item => claimWords(item));
  const negationParts = negations.flat();
  const fearWords: string[][] = [];
  for (const word of claimWords(fear)) {
    const forms = stemForms(word);
    if (!forms.length) continue;
    if (skip.some(other => sameWord(other, word)) || negationParts.some(part => sameWord(part, word))) continue;
    if (fearWords.some(existing => existing.some(form => forms.includes(form)))) continue;
    fearWords.push(forms);
  }
  if (!fearWords.length) return null;
  const ownerNegated = [...new Set(ownerTexts.flatMap(text => (typeof text === 'string' ? negatedFearWords(text, { fearWords, negations }) : [])))].sort((a, b) => a - b);
  return { fearWords, negations, ownerNegated };
}

/** The fear words a sentence negates that the owner did not negate himself (empty = no hit). */
export function fearPromiseMatches(sentence: string, spec: FearPromiseSpec): number[] {
  return negatedFearWords(sentence, spec).filter(index => !spec.ownerNegated.includes(index));
}

export interface SameDayScopeSpec {
  /** Same-day words / phrases (parseSameDayWords), each as its words. */
  sameDay: string[][];
  /** Places named in the owner's response place tail (a sentence naming one may carry the same-day words). */
  tailPlaces: string[][];
}

function containsPhrase(words: readonly string[], phrase: readonly string[]): boolean {
  if (!phrase.length) return false;
  for (let at = 0; at + phrase.length <= words.length; at++) {
    if (phrase.every((part, offset) => sameWord(words[at + offset], part))) return true;
  }
  return false;
}

/**
 * The spec of a page the owner gave no same-day grant for (null when this page has one, see pageHasSameDayGrant, or no
 * same-day list is configured).
 */
export function buildSameDayScopeSpec(pageGranted: boolean, sameDayWords: readonly string[], tail: string | null, places: readonly string[]): SameDayScopeSpec | null {
  if (pageGranted) return null;
  const sameDay = sameDayWords.map(item => claimWords(item)).filter(item => item.length);
  if (!sameDay.length) return null;
  const tailWords = tail ? claimWords(tail) : [];
  const tailPlaces = places.map(place => claimWords(place)).filter(place => place.length && containsPhrase(tailWords, place));
  return { sameDay, tailPlaces };
}

/** True when a sentence carries a same-day word and names no place of the owner's response tail. */
export function sameDayOutOfScope(sentence: string, spec: SameDayScopeSpec): boolean {
  const words = claimWords(sentence);
  if (!spec.sameDay.some(phrase => containsPhrase(words, phrase))) return false;
  return !spec.tailPlaces.some(place => containsPhrase(words, place));
}

// ---------------------------------------------------------------------------
// Site Bot launch step 2 (capability 1, MVP review B2): which services an owner promise covers.
// ---------------------------------------------------------------------------

/** Shortest label word (after prefix letters) that may name a service on its own. */
export const SERVICE_WORD_MIN = 3;
/** Most letters two forms of one word may differ by in length (singular / plural, construct state). */
const SERVICE_WORD_MAX_LENGTH_GAP = 2;

/**
 * Two word forms are one word: equal, or the same word with a different ending (a plural or construct suffix). Both at least
 * SERVICE_WORD_MIN letters, lengths at most SERVICE_WORD_MAX_LENGTH_GAP apart, and they share a run from the start of at least
 * the shorter form's length (shorter forms below 5 letters) or its length minus one (5 letters and more: a final letter that
 * changes, e.g. a feminine ending into a plural one). Code points, NFC.
 */
export function sameServiceWord(a: string, b: string): boolean {
  if (a === b) return true;
  const x = [...a];
  const y = [...b];
  const shorter = Math.min(x.length, y.length);
  if (shorter < SERVICE_WORD_MIN || Math.abs(x.length - y.length) > SERVICE_WORD_MAX_LENGTH_GAP) return false;
  let common = 0;
  while (common < shorter && x[common] === y[common]) common++;
  return common >= (shorter >= 5 ? shorter - 1 : shorter);
}

function namesWord(textWords: readonly string[], labelWord: string): boolean {
  const labelForms = wordForms(labelWord).filter(form => [...form].length >= SERVICE_WORD_MIN);
  return textWords.some(word => wordForms(word).some(form => labelForms.some(labelForm => sameServiceWord(form, labelForm))));
}

/**
 * The service labels an owner text names: the label as a phrase, or one of the label's distinctive words (a word of at least
 * SERVICE_WORD_MIN letters after prefix letters, matched with sameServiceWord). Not distinctive: a word every label carries
 * (with two labels or more) and the words of `excluded` (the trade, the business name, the places). Whole words, NFC.
 *
 * The B2 root cause: the claim scope used to name a service only by the exact label or an English source word, so a Hebrew usp
 * that names the job in its own words (a verb form plus the label's noun) named no service and read as business-wide.
 */
export function ownerNamedServices(text: unknown, labels: readonly string[], excluded: readonly string[] = []): string[] {
  if (typeof text !== 'string' || !text.trim()) return [];
  const words = claimWords(text);
  const skip = excluded.flatMap(item => claimWords(item));
  const labelWords = labels.map(label => claimWords(label));
  const shared = (word: string) => labelWords.length > 1 && labelWords.every(list => list.some(other => sameWord(other, word)));
  return labels.filter((label, index) => {
    const own = labelWords[index];
    if (!own.length) return false;
    if (containsPhrase(words, own)) return true;
    // A Latin label word names the service from 4 letters (the English rule of copyGates.ownerClaimScope: no "and" / "for").
    const long = (word: string) => !/^[A-Za-z]+$/.test(word) || word.length >= 4;
    return own.some(word => long(word) && !shared(word) && !skip.some(other => sameWord(other, word)) && namesWord(words, word));
  });
}

/** One owner same-day grant: the services it covers (empty = every page, the homepage included). */
export interface SameDayGrant {
  source: 'response' | 'usp' | 'guarantee';
  services: string[];
}

/** Sentences of an owner text (split after . ! ? ; or a line break). */
function ownerSentences(text: unknown): string[] {
  return typeof text === 'string' ? text.split(/(?<=[.!?;])\s+|\n+/u).map(part => part.trim()).filter(Boolean) : [];
}

export interface SameDayGrantInput {
  /** True when the owner has a response fact (ownerFacts().response). */
  responseFact: boolean;
  responseTime?: unknown;
  usp?: unknown;
  guarantee?: unknown;
}

/**
 * The owner's same-day grants: the response fact (scoped to the services its text names, else every page), and every usp /
 * guarantee sentence that carries a same-day word (scoped the same way).
 */
export function sameDayGrants(input: SameDayGrantInput, sameDayWords: readonly string[], labels: readonly string[], excluded: readonly string[] = []): SameDayGrant[] {
  const sameDay = sameDayWords.map(item => claimWords(item)).filter(item => item.length);
  const grants: SameDayGrant[] = [];
  if (input.responseFact) grants.push({ source: 'response', services: ownerNamedServices(input.responseTime, labels, excluded) });
  for (const source of ['usp', 'guarantee'] as const) {
    for (const sentence of ownerSentences(input[source])) {
      const words = claimWords(sentence);
      if (sameDay.some(phrase => containsPhrase(words, phrase))) grants.push({ source, services: ownerNamedServices(sentence, labels, excluded) });
    }
  }
  return grants;
}

/** True when a grant covers this page: a grant that names no service, or one naming the page's service (null = homepage / hub). */
export function pageHasSameDayGrant(grants: readonly SameDayGrant[], pageService: string | null): boolean {
  return grants.some(grant => !grant.services.length || (pageService !== null && grant.services.includes(pageService)));
}
