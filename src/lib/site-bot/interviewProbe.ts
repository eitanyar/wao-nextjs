/**
 * Site Bot step 2b: the vague-answer probe detector of the interview (interviewQuestions.ts asks it once per question).
 *
 * Deterministic, no model call: an answer is "only generic claims" when
 *   1. it matches one of the generic-claim patterns, AND
 *   2. it carries no concrete marker, AND
 *   3. it is short (at most PROBE_MAX_WORDS words; a longer answer is a story, and the probe would only annoy).
 * A concrete marker is: a digit (a number, a price, a time, a year), a time / warranty word, an Israeli locality name
 * (the tracked locality list, servedAreas.ts), a Latin-script word of two letters or more (a brand or a model, e.g.
 * "Grohe", "Tadiran"), or one of the owner's own service / trade names (his card and the 3 intake questions).
 *
 * The generic-claim words and the time words are the existing lists of the differentiator probe on the /site-bot/start page
 * (isGenericUsp), moved here byte-exact as \u escapes. There is no Hebrew lexicon of named objects or faults yet, so an
 * answer that names one only in Hebrew (and nothing else concrete) can still be probed: that costs one nudge, never a
 * loop (the probe fires once per question, and whatever comes after it is accepted).
 *
 * Server-side (the interview-step route); also browser-safe.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (every Hebrew pattern is a \u escape).
 */
import { ISRAELI_LOCALITIES } from './israeliLocalities';
import { localitiesNamedIn, type Locality } from './servedAreas';

/** Generic self-praise (the differentiator probe's list, byte-exact). */
export const GENERIC_CLAIM = /\u05DE\u05E7\u05E6\u05D5\u05E2\u05D9|\u05D0\u05DE\u05D9\u05DF|\u05D0\u05D9\u05DB\u05D5\u05EA|\u05D9\u05D7\u05E1 \u05D0\u05D9\u05E9\u05D9|\u05D4\u05DB\u05D9 \u05D8\u05D5\u05D1|\u05D4\u05D8\u05D5\u05D1 \u05D1\u05D9\u05D5\u05EA\u05E8|\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05D4\u05D5\u05D2\u05E0\u05D9\u05DD|\u05D6\u05DE\u05D9\u05E0\u05D5\u05EA|\u05E0\u05D9\u05E1\u05D9\u05D5\u05DF/;
/** Time and warranty words (the differentiator probe's concrete list, byte-exact). */
export const TIME_WORD = /\u05D3\u05E7\u05D5\u05EA|\u05E9\u05E2\u05D4|\u05E9\u05D1\u05EA|\u05EA\u05D5\u05DA|\u05D0\u05D7\u05E8\u05D9\u05D5\u05EA|\u05E9\u05E0\u05D4|\u05E9\u05E0\u05D9\u05DD/;
const LATIN_WORD = /[A-Za-z]{2,}/;
const DIGIT = /\d/;

export const PROBE_MAX_WORDS = 20;

export interface ProbeContext {
  /** The owner's own service and trade names (priorityServices, primaryService, businessNiche). */
  ownTerms?: readonly string[];
  localities?: readonly Locality[];
}

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** The first concrete marker found, or null. Exported for tests and for the facts screen's own checks. */
export function concreteMarker(text: string, context: ProbeContext = {}): 'digit' | 'time' | 'latin' | 'own_term' | 'locality' | null {
  if (DIGIT.test(text)) return 'digit';
  if (TIME_WORD.test(text)) return 'time';
  if (LATIN_WORD.test(text)) return 'latin';
  const normalized = text.normalize('NFC');
  for (const term of context.ownTerms ?? []) {
    const needle = typeof term === 'string' ? term.normalize('NFC').trim() : '';
    if (needle.length >= 2 && normalized.includes(needle)) return 'own_term';
  }
  if (localitiesNamedIn(text, context.localities ?? ISRAELI_LOCALITIES).length > 0) return 'locality';
  return null;
}

export function hasGenericClaim(text: string): boolean {
  return GENERIC_CLAIM.test(text);
}

/** True when the answer holds only generic claims: the probe shows (once per question). */
export function isGenericOnlyAnswer(text: string, context: ProbeContext = {}): boolean {
  const trimmed = text.trim();
  if (!trimmed || !hasGenericClaim(trimmed)) return false;
  if (words(trimmed).length > PROBE_MAX_WORDS) return false;
  return concreteMarker(trimmed, context) === null;
}
