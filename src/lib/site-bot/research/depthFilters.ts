/**
 * Content depth (2026-11-10): the predicates that keep NeuronWriter suggestions honest before they reach a service brief
 * (Yonatan: terms are suggestions, never requirements; no competitor brands, no other cities, no unoffered services, no
 * prices). Pure; pageBrief.ts applies them through DepthTextFilters.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (place names come from the tracked locality JSON, everything else
 * from the caller's data).
 */
import { prefixForms, stemSet, textWords } from '../../lp/depthBlocks';
import { PREFIX_LETTERS } from '../../lp/hebrewPrefixLetters';
import { matchedVertical } from '../../lp/verticalDetect';
import type { VerticalKey } from '../../lp/verticalThemes';
import type { DepthTextFilters } from './pageBrief';
import type { Locality } from '../servedAreas';

const bare = (word: string) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').normalize('NFC').toLowerCase();
const words = (text: string) => textWords(text).map(bare).filter(Boolean);

/** Title separators: a pipe sets off the site / brand part of a result title; dashes split it further. */
const BRAND_SEPARATOR = /\s\|\s/;
const SEGMENT_SEPARATOR = /\s[|\-\u2013\u2014]\s/;

/**
 * Brand vocabulary of the competitor result titles: the words after the last " | " of each title (the site / brand part),
 * minus generic words: the stems of NeuronWriter's basic content terms (words most competitors use) and the anchor text
 * (the keyword, the owner's services, places, trade and business name). Latin words are left out (Latin terms are dropped
 * by filterSuggestedTerms anyway). Coarse on purpose: a dropped suggestion costs nothing, a competitor's name in the copy does.
 */
export function competitorBrandWords(titles: readonly string[], basicTerms: readonly string[], anchorText: string): Set<string> {
  const generic = new Set([...stemSet(basicTerms.join(' ')), ...stemSet(anchorText)]);
  const out = new Set<string>();
  for (const title of titles) {
    const parts = title.split(BRAND_SEPARATOR);
    if (parts.length < 2) continue;
    for (const segment of parts[parts.length - 1].split(SEGMENT_SEPARATOR)) {
      for (const word of words(segment)) {
        if (/[a-z0-9]/.test(word) || word.length < 2) continue;
        if (prefixForms(word).some(form => generic.has(form))) continue;
        out.add(word);
      }
    }
  }
  return out;
}

function namesAny(text: string, vocabulary: ReadonlySet<string>): boolean {
  return words(text).some(word => prefixForms(word).some(form => vocabulary.has(form)));
}

/** The place names of a locality (name and aliases), each as a word list. */
function localityNames(locality: Locality): string[][] {
  return [locality.he_name, ...(locality.he_aliases ?? [])].map(words).filter(list => list.length > 0);
}

/** The locative prefix letter (bet), from the shared prefix-letter constant (no Hebrew literal here). */
const LOCATIVE_PREFIX = PREFIX_LETTERS[3];

/**
 * True when a text names an Israeli locality the owner did not state: a whole locality name (its first word may carry a
 * prefix letter), or a multi-word text ending in "b<first word of a multi-word locality>" (NeuronWriter cuts terms short,
 * e.g. "<trade> b<first word of a two-word town>"). The cut-short form needs the locative prefix and a preceding word, so an
 * ordinary word that happens to start a town name is not a place.
 */
export function namesOtherLocality(text: string, localities: readonly Locality[], ownerPlaces: readonly string[]): boolean {
  const owned = new Set(ownerPlaces.map(place => words(place).join(' ')).filter(Boolean));
  const tokens = words(text);
  if (!tokens.length) return false;
  for (const locality of localities) {
    const names = localityNames(locality);
    if (names.some(name => owned.has(name.join(' ')))) continue;
    for (const name of names) {
      for (let at = 0; at + name.length <= tokens.length; at++) {
        const first = prefixForms(tokens[at]).includes(name[0]);
        if (first && name.slice(1).every((word, offset) => tokens[at + 1 + offset] === word)) return true;
      }
      const last = tokens[tokens.length - 1];
      if (name.length > 1 && tokens.length > 1 && last.startsWith(LOCATIVE_PREFIX) && last.slice(1) === name[0]) return true;
    }
  }
  return false;
}

export interface DepthFilterInput {
  competitorTitles: readonly string[];
  basicTerms: readonly string[];
  /** Keyword, the owner's services, trade, places and business name (never brand words). */
  anchorText: string;
  ownerPlaces: readonly string[];
  localities: readonly Locality[];
  /** The site's vertical: a text naming another vertical's trade words is an unoffered service. */
  siteVertical: VerticalKey;
  /** Service-area widening (the copy gate's own check, e.g. "and surroundings"). */
  widensArea?: (text: string) => boolean;
  /** The page's search keyword (a Latin keyword allows Latin terms). */
  keyword?: string;
}

/**
 * The four depth filters. Limits, stated for the report: brands = title brand words (coarse); places = the tracked locality
 * list plus the gate's widening check; unoffered services = another vertical's trade words only (no per-trade service list
 * exists yet); price = digits, currency and percent signs only (no Hebrew price lexicon exists yet: needs Noa).
 */
export function buildDepthFilters(input: DepthFilterInput): DepthTextFilters {
  const brands = competitorBrandWords(input.competitorTitles, input.basicTerms, input.anchorText);
  return {
    competitorBrand: text => namesAny(text, brands),
    otherPlace: text => namesOtherLocality(text, input.localities, input.ownerPlaces) || Boolean(input.widensArea?.(text)),
    unofferedService: text => {
      const vertical = matchedVertical(text);
      return vertical !== null && vertical !== input.siteVertical;
    },
    price: text => /[\d\u20AA$%]/u.test(text),
    latinAllowed: /[A-Za-z]/.test(input.keyword ?? ''),
  };
}
