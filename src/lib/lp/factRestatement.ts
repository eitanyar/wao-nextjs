/**
 * Copy v2 slice 4 (docs/missions/site-bot-code-owns-facts-2026-11-10.md): gate_fact_restatement. Once code owns the facts
 * (ownerFactCopy.ts), the trust bar, the B6 proof, the price promise line and the cost FAQ state the owner's years, licence,
 * warranty, response time and prices in fixed wording. A model-written field that restates one of them fails the page
 * (always blocking), except one allowance: heroHeadline or heroSubheadline may carry ONE of them, once, when it is part of
 * the owner's usp (the hebrew-plumber usp "arrives within 20 minutes" is itself a fact).
 *
 * Pure: the spec (digits and phrases per fact) is built by researchPageCopy.factRestatementSpec from the owner data, the
 * fact templates and the existing claim tokens; this module never imports the gate module (no cycle).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (letters are built from code points).
 */
import { PREFIX_LETTERS } from './hebrewPrefixLetters';

export type RestatementKind = 'years' | 'warranty' | 'license' | 'response' | 'price';

/** One code-owned fact: the owner's digit runs and the word phrases that restate it. */
export interface RestatementFact {
  kind: RestatementKind;
  digits: readonly string[];
  phrases: readonly string[];
}

export interface FactRestatementSpec {
  facts: readonly RestatementFact[];
  /** The owner's usp (any language): the hero allowance needs the restated digits or phrase to be part of it. */
  usp: string;
}

/** One restatement in one string: the fact kind and the matched text (a digit run or a phrase). */
export interface RestatementMatch {
  kind: RestatementKind;
  text: string;
}

/** The fields whose single usp restatement is allowed (the hero). */
export const RESTATEMENT_HERO_FIELDS: readonly string[] = ['heroHeadline', 'heroSubheadline'];

const HEB = `${String.fromCharCode(0x05d0)}-${String.fromCharCode(0x05ea)}`;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const normalized = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim();

function digitPattern(digits: string): RegExp {
  return new RegExp(`(?<![\\d.,])${escapeRegExp(digits)}(?![\\d])`, 'gu');
}

function phrasePattern(phrase: string): RegExp {
  return new RegExp(`(?<![${HEB}A-Za-z])[${PREFIX_LETTERS}]{0,2}${escapeRegExp(normalized(phrase))}(?![${HEB}A-Za-z])`, 'giu');
}

/** Every restatement in one string, in text order (overlapping matches of the same kind counted once). */
export function restatementMatches(value: string, spec: FactRestatementSpec): RestatementMatch[] {
  const text = normalized(value);
  const found: Array<RestatementMatch & { at: number; end: number }> = [];
  for (const fact of spec.facts) {
    const patterns = [...fact.digits.filter(Boolean).map(digitPattern), ...fact.phrases.filter(item => item.trim()).map(phrasePattern)];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const at = match.index ?? 0;
        const end = at + match[0].length;
        if (found.some(item => item.kind === fact.kind && at < item.end && end > item.at)) continue;
        found.push({ kind: fact.kind, text: match[0], at, end });
      }
    }
  }
  return found.sort((a, b) => a.at - b.at).map(({ kind, text: matched }) => ({ kind, text: matched }));
}

/** True when the restated text is part of the owner's usp (digits as a whole number; a phrase as words). */
export function inUsp(match: RestatementMatch, usp: string): boolean {
  const own = normalized(usp);
  if (!own) return false;
  return /^\d/.test(match.text) ? digitPattern(match.text).test(own) : phrasePattern(match.text).test(own);
}

export interface RestatementHit {
  field: string;
  kind: RestatementKind;
}

/**
 * The restatement hits of a page's model-written strings (one hit per field and kind). The hero allowance: when the hero
 * fields together carry exactly one restatement and it is part of the usp, it is not a hit.
 */
export function factRestatementHits(strings: ReadonlyArray<{ field: string; value: string }>, spec: FactRestatementSpec): RestatementHit[] {
  const perField = strings.map(item => ({ field: item.field, matches: restatementMatches(item.value, spec) }));
  const hero = perField.filter(item => RESTATEMENT_HERO_FIELDS.includes(item.field));
  const heroMatches = hero.flatMap(item => item.matches);
  const allowed = heroMatches.length === 1 && inUsp(heroMatches[0], spec.usp) ? hero.find(item => item.matches.length === 1)?.field ?? null : null;
  const out: RestatementHit[] = [];
  for (const item of perField) {
    if (item.field === allowed) continue;
    for (const kind of [...new Set(item.matches.map(match => match.kind))]) out.push({ field: item.field, kind });
  }
  return out;
}

/** Sentences of a prose field, punctuation kept (split after . ! or ?), for the sentence drop. */
export function proseSentences(value: string): string[] {
  return value.split(/(?<=[.!?])\s+/u).map(part => part.trim()).filter(Boolean);
}
