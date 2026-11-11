/**
 * Content depth (2026-11-10): the predicates that keep NeuronWriter suggestions honest before they reach a service brief
 * (Yonatan: terms are suggestions, never requirements; no competitor brands, no other cities, no unoffered services, no
 * prices). Pure; pageBrief.ts applies them through DepthTextFilters.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (place names come from the tracked locality JSON, everything else
 * from the caller's data).
 */
import fs from 'node:fs';
import path from 'node:path';
import { prefixForms, stemSet, textWords } from '../../lp/depthBlocks';
import { PREFIX_LETTERS } from '../../lp/hebrewPrefixLetters';
import { matchedVertical, tradeKeywordsIn } from '../../lp/verticalDetect';
import type { VerticalKey } from '../../lp/verticalThemes';
import type { DepthTextFilters } from './pageBrief';
import type { Locality } from '../servedAreas';
import { PRICE_LEXICON_DATA } from './priceLexiconData';

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

// ---------------------------------------------------------------------------
// Price lexicon (Tamar -> Noa, docs/copy/site-bot-price-lexicon-2026-11-10.json, loaded byte-exact when present).
// Matching rule (Noa, recorded in the file under _matching):
// - priceStems: substring of the term;
// - pricePhrases: a whole space-separated word sequence anywhere in the term, after stripping punctuation and hyphens
//   (ASCII double quote and gershayim are one character; ASCII apostrophe and geresh likewise). Never a raw substring
//   (a phrase inside a longer word is not a hit) and never whole-term equality (a phrase inside a longer term is a hit).
// ---------------------------------------------------------------------------

export const PRICE_LEXICON_PATH = 'docs/copy/site-bot-price-lexicon-2026-11-10.json';

export interface PriceLexicon {
  priceStems: string[];
  pricePhrases: string[];
}

const GERSHAYIM = '\u05F4';
const GERESH = '\u05F3';

/** Phrase-matching normal form: NFC, lower case, quote marks unified, hyphens / maqaf / dashes and other punctuation to spaces. */
export function priceWords(text: string): string[] {
  const unified = text.normalize('NFC').toLowerCase()
    .replace(/["\u201C\u201D\u05F4]/gu, GERSHAYIM)
    .replace(/['\u2018\u2019\u05F3]/gu, GERESH)
    .replace(/[-\u05BE\u2010-\u2015]/gu, ' ')
    .replace(/[^\p{L}\p{N}\p{M}\u05F3\u05F4\s]/gu, ' ');
  // A quote mark at a word edge is punctuation (a quoted word); inside a word it is part of an abbreviation.
  return unified.split(/\s+/).map(word => word.replace(/^[\u05F3\u05F4]+|[\u05F3\u05F4]+$/gu, '')).filter(Boolean);
}

function validLexicon(value: unknown): value is PriceLexicon {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : null;
  const list = (entry: unknown) => Array.isArray(entry) && entry.every(item => typeof item === 'string');
  return Boolean(record && list(record.priceStems) && list(record.pricePhrases));
}

/** The price lexicon from PRICE_LEXICON_PATH (under `root`, default the working directory); null when absent or malformed. */
export function loadPriceLexicon(root: string = process.cwd(), file: string = PRICE_LEXICON_PATH): PriceLexicon | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    if (!validLexicon(parsed)) return null;
    return { priceStems: parsed.priceStems.filter(item => item.trim()), pricePhrases: parsed.pricePhrases.filter(item => item.trim()) };
  } catch {
    return null;
  }
}

let cachedLexicon: PriceLexicon | undefined;
/**
 * The process-wide price lexicon (read once): the file when present (the working tree), else the generated copy
 * (priceLexiconData.ts, byte-exact from the same file; the standalone build does not ship docs/).
 */
export function defaultPriceLexicon(): PriceLexicon {
  if (cachedLexicon === undefined) cachedLexicon = loadPriceLexicon() ?? PRICE_LEXICON_DATA;
  return cachedLexicon;
}

/** A price-lexicon predicate under Noa's matching rule (see above). */
export function priceLexiconMatcher(lexicon: PriceLexicon): (text: string) => boolean {
  const stems = lexicon.priceStems.map(stem => stem.normalize('NFC').toLowerCase());
  const phrases = lexicon.pricePhrases.map(priceWords).filter(list => list.length > 0);
  return text => {
    const raw = text.normalize('NFC').toLowerCase();
    if (stems.some(stem => raw.includes(stem))) return true;
    const tokens = priceWords(text);
    return phrases.some(phrase => {
      for (let at = 0; at + phrase.length <= tokens.length; at++) {
        if (phrase.every((word, offset) => tokens[at + offset] === word)) return true;
      }
      return false;
    });
  };
}

export interface DepthFilterInput {
  competitorTitles: readonly string[];
  basicTerms: readonly string[];
  /** Keyword, the owner's services, trade, places and business name (never brand words). */
  anchorText: string;
  ownerPlaces: readonly string[];
  localities: readonly Locality[];
  /**
   * The site's vertical: a text naming another vertical's trade words is an unoffered service. Callers resolve it with
   * siteVerticalFor (niche, else primary service, else the skilled-trades fallback).
   */
  siteVertical: VerticalKey;
  /**
   * Rerun-3b bug A: the verticals the owner's own confirmed services name (page subject, labels, primary service). They are
   * offered by definition, so a question naming the page's own service is never an "unoffered service", even when the
   * free-text niche resolves to another vertical (or to the skilled-trades fallback).
   */
  offeredVerticals?: readonly VerticalKey[];
  /**
   * 2026-11-11 (positive relevance, questions only): this page's anchor texts -- the subject, the page label, the page
   * queries / keyword and NeuronWriter's basic terms. A pool question passes only if one of its words shares a stem (prefix
   * forms) with one of these words. Unset = no relevance check.
   */
  relevanceTerms?: readonly string[];
  /** Words never counted as a shared anchor (the owner's places and the business name: a city alone is not relevance). */
  relevanceExclude?: readonly string[];
  /** Service-area widening (the copy gate's own check, e.g. "and surroundings"). */
  widensArea?: (text: string) => boolean;
  /** The page's search keyword (a Latin keyword allows Latin terms). */
  keyword?: string;
  /** Price lexicon; default the Noa-gated file at PRICE_LEXICON_PATH (null: digits / currency / percent only). */
  priceLexicon?: PriceLexicon | null;
}

/**
 * 2026-11-11 (Yonatan): the site vertical of the depth filter -- the niche's matched vertical, else the primary service's,
 * else the skilled-trades fallback (detectVertical's own fallback). A Latin / unmapped niche no longer forces the fallback
 * when the owner's primary service names a vertical.
 */
export function siteVerticalFor(niche: string | undefined, primaryService: string | undefined): VerticalKey {
  return matchedVertical(niche ?? '') ?? matchedVertical(primaryService ?? '') ?? 'skilled-trades';
}

/** A relevance word keeps at least this many letters (shorter words are function words / prefixes, never an anchor). */
export const RELEVANCE_MIN_WORD_LETTERS = 3;

/** A word this long or longer may drop its final letter when compared (a final inflection letter, e.g. singular vs plural). */
export const RELEVANCE_INFLECTION_MIN_LETTERS = 5;

/**
 * Two word forms share a stem: equal, or the longer starts with the shorter (a suffix added), or -- when the shorter has
 * RELEVANCE_INFLECTION_MIN_LETTERS letters or more -- with the shorter minus its final letter (a final letter changed).
 * Letter-agnostic: no language data.
 */
export function sharesStem(left: string, right: string): boolean {
  if (left === right) return true;
  const [short, long] = left.length <= right.length ? [left, right] : [right, left];
  if (short.length < RELEVANCE_MIN_WORD_LETTERS) return false;
  const head = short.length >= RELEVANCE_INFLECTION_MIN_LETTERS ? short.slice(0, -1) : short;
  return long.startsWith(head);
}

/**
 * Positive relevance (2026-11-11): true when the text shares at least one anchor with the page's anchor texts: a word (in
 * some prefix form, through sharesStem; minus the excluded words -- places, business name -- and words under
 * RELEVANCE_MIN_WORD_LETTERS), or a trade keyword of the vertical map (tradeKeywordsIn: the same trade stem in another
 * word form).
 */
export function relevanceMatcher(anchorTexts: readonly string[], exclude: readonly string[] = []): (text: string) => boolean {
  const excluded = stemSet(exclude.join(' '));
  const anchors = new Set<string>();
  for (const word of words(anchorTexts.join(' '))) {
    if (prefixForms(word).some(form => excluded.has(form))) continue;
    for (const form of prefixForms(word)) if (form.length >= RELEVANCE_MIN_WORD_LETTERS && !excluded.has(form)) anchors.add(form);
  }
  const tradeAnchors = new Set(tradeKeywordsIn(anchorTexts.join(' ')));
  const anchorList = [...anchors];
  return text => words(text).some(word => prefixForms(word).some(form => anchors.has(form) || anchorList.some(anchor => sharesStem(form, anchor))))
    || tradeKeywordsIn(text).some(keyword => tradeAnchors.has(keyword));
}

/**
 * The four depth filters (plus the questions' positive relevance check when relevanceTerms is set). Limits, stated for the report: brands = title brand words (coarse); places = the tracked locality
 * list plus the gate's widening check; unoffered services = another vertical's trade words only (no per-trade service list
 * exists yet); price = digits, currency and percent signs, plus the Noa-gated price lexicon when its file is present.
 */
export function buildDepthFilters(input: DepthFilterInput): DepthTextFilters {
  const brands = competitorBrandWords(input.competitorTitles, input.basicTerms, input.anchorText);
  const lexicon = input.priceLexicon === undefined ? defaultPriceLexicon() : input.priceLexicon;
  const lexiconHit = lexicon ? priceLexiconMatcher(lexicon) : () => false;
  return {
    competitorBrand: text => namesAny(text, brands),
    otherPlace: text => namesOtherLocality(text, input.localities, input.ownerPlaces) || Boolean(input.widensArea?.(text)),
    unofferedService: text => {
      const vertical = matchedVertical(text);
      return vertical !== null && vertical !== input.siteVertical && !(input.offeredVerticals ?? []).includes(vertical);
    },
    price: text => /[\d\u20AA$%]/u.test(text) || lexiconHit(text),
    latinAllowed: /[A-Za-z]/.test(input.keyword ?? ''),
    ...(input.relevanceTerms ? { relevant: relevanceMatcher(input.relevanceTerms, input.relevanceExclude ?? []) } : {}),
  };
}
