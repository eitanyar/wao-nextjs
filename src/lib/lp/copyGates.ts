/**
 * Deterministic copy gates for research-bound site copy (paid-journey v2 M2a.1, A1-A5).
 *
 * Gates only DETECT. They never edit Hebrew: a hit becomes a CopyViolation that the
 * repair loop sends back to the model; a page still failing after the repair budget
 * fails. The token data lives in copyGates.config.ts (byte-exact reviewer examples).
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import type { CollectedData } from '../bot/prompts';
import { hasRealReviewQuote } from './lpCopyPrompt';
import {
  ARRIVAL_TOKENS,
  CLAIM_TOKEN_WORD_END,
  CLAIM_TOKENS,
  DAY_LETTERS,
  FIX_TIME_LEAD_TOKENS,
  FIX_TIME_WITHIN_WORDS,
  GUARD_CUSTOMER_STEMS,
  GUARD_SPEECH_VERBS,
  SERVICE_LABEL_PINS,
} from './generationData';
import {
  CLAIM_EXCLUDED_FACT_FIELDS,
  CLAIM_RULES,
  FACT_PHRASE_EXEMPT_FIELDS,
  FACT_PHRASE_FIELDS,
  FACT_PHRASE_MAX_WORDS,
  FACT_PHRASE_MIN_WORD_LETTERS,
  FACT_PHRASE_TEXT_FIELDS,
  FACT_REPEAT_MAX,
  FIX_TIME_EXCLUDED_FIELDS,
  PLURAL_ADDRESS_TOKENS,
  QUOTE_OVERLAP_MIN_CHARS,
  WAO_SERVICE_TERMS_HE,
  WAO_SERVICE_TERMS_LATIN,
  WE_FORM_TOKENS,
  type GateToken,
} from './copyGates.config';

export const GATE_RULES = {
  plural: 'gate_plural_address',
  we: 'gate_we_form',
  asciiQuote: 'gate_ascii_quote',
  unconfirmedService: 'gate_unconfirmed_service',
  claim: 'gate_unsupported_claim',
  waoOffer: 'gate_wao_offer',
  quoteOverlap: 'gate_quote_overlap',
  reviewContext: 'gate_review_context_unsupported',
  // M2a.2
  hours: 'gate_model_hours',
  placeHyphen: 'gate_place_hyphen',
  gereshQuote: 'gate_geresh_quote',
  cityPrefix: 'gate_city_prefix',
  customerAttribution: 'gate_customer_attribution',
  factRepeat: 'gate_fact_repeat',
  // M2a.3
  availability: 'gate_availability',
  installArrival: 'gate_install_arrival',
  customerSource: 'gate_customer_source_claim',
} as const;
export type GateRule = (typeof GATE_RULES)[keyof typeof GATE_RULES];

export interface GateViolation {
  field: string;
  rule: GateRule;
  /** Config entry id or token index (never copy text): e.g. "plural:4", "claim:warranty". */
  actual?: string;
}

export interface CopyGateContext {
  /** Solo-operator site: first-person plural ("we") forms are rejected. */
  soloOperator: boolean;
  /** Owner-confirmed service names, as displayed. Empty = service gate off. */
  serviceLabels: readonly string[];
  /** All owner-supplied facts, concatenated (authorises claims). */
  ownerFactsText: string;
  /** Owner fields consulted by CLAIM_RULES[].ownerFields. */
  ownerFields: Partial<Record<string, unknown>>;
  /** The owner's verbatim customer quote, if any. */
  reviewQuote: string | null;
  /** Star rating supplied by the owner, if any (authorises a reviewContext). */
  starRating: string | null;
  /** M2a.2: owner-stated place display names (base city first), for the maqaf and bet-prefix gates. */
  places?: readonly string[];
  /** M2a.2: owner fact phrases (digit runs of FACT_PHRASE_FIELDS), capped at FACT_REPEAT_MAX per page. */
  factPhrases?: readonly string[];
  /** M2a.3: owner Hebrew fact clauses (guarantee, pricingNotes, usp) for the phrase-level cap. */
  ownerPhraseTexts?: readonly string[];
  /** M2a.3: the owner's wording of each service, aligned with serviceLabels (scopes fix_time). */
  serviceSources?: readonly string[];
  /** M2a.3: this page's own service label; null/unset on the homepage. */
  pageServiceLabel?: string | null;
  /** M2a.3: this page is about an installation service (no arrival-time promise here). */
  installPage?: boolean;
  /** M2a.3: names that may repeat freely (business, owner); excluded from phrase keys. */
  freeNames?: readonly string[];
}

/** One non-blocking finding for human review (never copy text). */
export interface GateReviewFlag {
  field: string;
  flag: 'arrival_time_in_installation_heading';
}

const HEBREW_LETTER = '\u05D0-\u05EA';
const HEBREW = new RegExp(`[${HEBREW_LETTER}]`);
// vav, shin, he, bet, kaf, lamed, mem: the attachable prefix letters.
const PREFIX_LETTERS = '\u05D5\u05E9\u05D4\u05D1\u05DB\u05DC\u05DE';

/** Fields the system fills (never model-authored) are exempt from text gates. */
export const GATE_EXEMPT_FIELDS: readonly string[] = ['heroCta', 'serviceItems', 'reviewFeatured', 'faqItems', 'scarcityLine'];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function tokenPattern(entry: GateToken): RegExp {
  const prefix = entry.allowPrefix ? `[${PREFIX_LETTERS}]{0,2}` : '';
  return new RegExp(`(?<![${HEBREW_LETTER}])${prefix}${escapeRegExp(entry.token)}(?![${HEBREW_LETTER}])`, 'u');
}

/**
 * Claim-token matcher (M2a.3): a plain substring, except Noa's CLAIM_TOKEN_WORD_END tokens, which
 * match only when no Hebrew letter follows (so the street token never matches inside a city name).
 */
export function claimTokenPattern(token: string): RegExp {
  return new RegExp(`${escapeRegExp(token)}${CLAIM_TOKEN_WORD_END.includes(token) ? `(?![${HEBREW_LETTER}])` : ''}`, 'u');
}
const CLAIM_PATTERNS = new Map(CLAIM_RULES.flatMap(rule => rule.tokens).map(token => [token, claimTokenPattern(token)]));
function claimTokenIn(value: string, token: string): boolean {
  return (CLAIM_PATTERNS.get(token) ?? claimTokenPattern(token)).test(value);
}

const PLURAL_PATTERNS = PLURAL_ADDRESS_TOKENS.map(tokenPattern);
const WE_PATTERNS = WE_FORM_TOKENS.map(tokenPattern);
const LATIN_WAO_PATTERNS = WAO_SERVICE_TERMS_LATIN.map(term => new RegExp(`(?<![A-Za-z])${escapeRegExp(term)}(?![A-Za-z])`, 'i'));

/** Every gated (model-authored) string in a copy object, with its field path. */
export function gatedStrings(copy: Record<string, unknown>): Array<{ field: string; value: string }> {
  const out: Array<{ field: string; value: string }> = [];
  for (const [key, value] of Object.entries(copy)) {
    if (GATE_EXEMPT_FIELDS.includes(key)) continue;
    if (typeof value === 'string') out.push({ field: key, value });
    else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string') out.push({ field: `${key}[${index}]`, value: item });
        else if (item && typeof item === 'object') {
          for (const [inner, innerValue] of Object.entries(item as Record<string, unknown>)) {
            if (typeof innerValue === 'string') out.push({ field: `${key}[${index}].${inner}`, value: innerValue });
          }
        }
      });
    }
  }
  return out;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Length of the longest common substring (whitespace-normalised). */
export function longestCommonSubstring(a: string, b: string): number {
  const x = normalizeSpace(a);
  const y = normalizeSpace(b);
  if (!x || !y) return 0;
  let best = 0;
  let previous = new Array<number>(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const current = new Array<number>(y.length + 1).fill(0);
    for (let j = 1; j <= y.length; j++) {
      if (x[i - 1] === y[j - 1]) {
        current[j] = previous[j - 1] + 1;
        if (current[j] > best) best = current[j];
      }
    }
    previous = current;
  }
  return best;
}

function claimAuthorised(ruleIndex: number, ctx: CopyGateContext): boolean {
  const rule = CLAIM_RULES[ruleIndex];
  if (rule.perToken) return false; // decided token by token in tokenAuthorised()
  if (rule.ownerFields.some(field => {
    const value = ctx.ownerFields[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  })) return true;
  const facts = ctx.ownerFactsText.toLowerCase();
  if (rule.ownerKeywords.some(keyword => facts.includes(keyword.toLowerCase()))) return true;
  return rule.tokens.some(token => claimTokenIn(ctx.ownerFactsText, token));
}

/** Per-token rules (license_grade): only the exact token the owner stated is allowed. */
function tokenAuthorised(token: string, ctx: CopyGateContext): boolean {
  return ctx.ownerFactsText.includes(token);
}

const HEB_CLASS = `[${HEBREW_LETTER}]`;
const DASHES = '[-\u2013\u2014\u05BE]';
/** Clock times (07:00, 8:30). The model never writes hours; the system shows the owner's. */
const TIME_PATTERN = /(?<!\d)(?:[01]?\d|2[0-4]):[0-5]\d(?!\d)/;
/** A day-letter range (Noa's day letters) such as Sunday-Thursday. */
const DAY_RANGE_PATTERN = new RegExp(`(?:${DAY_LETTERS.map(escapeRegExp).join('|')})\\s*${DASHES}\\s*(?:${DAY_LETTERS.map(escapeRegExp).join('|')})`, 'u');
/** A geresh opening a word (never an abbreviation mark) and a geresh closing it: a geresh used as quotation marks. */
const GERESH_QUOTE_PATTERN = new RegExp(`(?<!${HEB_CLASS})\u05F3${HEB_CLASS}[^\u05F3\\n]*?${HEB_CLASS}\u05F3(?!${HEB_CLASS})`, 'u');
const WITHIN_ALTERNATIVES = [...FIX_TIME_WITHIN_WORDS].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|');
/**
 * Noa section 7: a time promise is a lead token (after optional prefix letters) followed by optional
 * spaces and a digit or a word that starts with one of the within-words ("while" usages never match).
 */
const TIME_PROMISE_PATTERN = new RegExp(
  `(?<!${HEB_CLASS})[${PREFIX_LETTERS}]{0,2}(?:${[...FIX_TIME_LEAD_TOKENS].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})\\s*[-\u05BE]?\\s*(?:\\d|(?:${WITHIN_ALTERNATIVES}))`, 'u');
/** A number followed by a time-unit word ("20 <minutes>"): an arrival time on an installation page. */
const NUMBER_WITHIN_PATTERN = new RegExp(`\\d\\s*[-\u05BE]?\\s*(?:${WITHIN_ALTERNATIVES})`, 'u');
/** A within-word as a whole word (prefix letters allowed): a same-day style phrase without a lead token. */
const WITHIN_WORD_PATTERN = new RegExp(`(?<!${HEB_CLASS})[${PREFIX_LETTERS}]{0,2}(?:${WITHIN_ALTERNATIVES})(?!${HEB_CLASS})`, 'u');
/** Fix verbs: the first word of each Noa fix_time token ("<verb> <lead>"), as whole words. */
export const FIX_TIME_VERBS: readonly string[] = [...new Set((CLAIM_TOKENS.fix_time ?? []).map(token => token.split(' ')[0]).filter(Boolean))];
const FIX_VERB_PATTERN = new RegExp(`(?<!${HEB_CLASS})[${PREFIX_LETTERS}]{0,2}(?:${FIX_TIME_VERBS.map(escapeRegExp).join('|')})(?!${HEB_CLASS})`, 'u');
const FIX_TIME_INDEX = CLAIM_RULES.findIndex(rule => rule.id === 'fix_time');
const BET_LETTER = '\u05D1';
/** First word of the pinned installation label: marks a service label as an installation service. */
const INSTALL_WORD = (SERVICE_LABEL_PINS['water heater install'] ?? '').split(' ')[0];
/** M2a.3 (item 6): fields checked by the arrival-on-installation review flag (headings plus the short proof lines). */
const HEADING_FIELDS = /^(?:heroHeadline|heroSubheadline|stickyBarLine|trustBarItems\[\d+\]|servicesHeadline|formHeadline|aboutPageHeadline|faqHeadline|serviceDetails\[\d+\]\.name)$/;
/** An availability figure such as 24/7 (item 8): allowed only in the owner's exact wording. */
const AVAILABILITY_PATTERN = /(?<![\d/])(\d{1,2})\s*\/\s*(\d{1,2})(?![\d/])/g;

/** True when a service (label + owner wording) is an installation service. */
export function isInstallService(label: string, source = ''): boolean {
  return Boolean((INSTALL_WORD && label.startsWith(INSTALL_WORD)) || /\binstall/i.test(source));
}

/** Sentences of one string (Noa's sentence-level checks). */
export function sentences(value: string): string[] {
  return value.split(/[.!?\n]+/).map(item => item.trim()).filter(Boolean);
}

/** Hebrew share of the letters in a string (Hebrew / (Hebrew + Latin)); 0 when there are none. */
export function hebrewShare(value: string): number {
  const hebrew = (value.match(new RegExp(HEB_CLASS, 'gu')) ?? []).length;
  const latin = (value.match(/[A-Za-z]/g) ?? []).length;
  return hebrew + latin ? hebrew / (hebrew + latin) : 0;
}

/** True when the text is mostly Hebrew script (item 8: a quote is shown only then, never translated). */
export function isMostlyHebrew(value: string): boolean {
  return hebrewShare(value) > 0.5;
}

/** The owner's customer quote as it may be shown: verbatim, real, and mostly Hebrew; else null. */
export function effectiveReviewQuote(data: CollectedData): string | null {
  const quote = typeof data.reviewQuote === 'string' ? data.reviewQuote.trim() : '';
  return quote && hasRealReviewQuote(data) && isMostlyHebrew(quote) ? quote : null;
}

function placePattern(place: string, prefix: boolean): RegExp {
  const body = place.trim().split(/\s+/).map(escapeRegExp).join('\\s+');
  return new RegExp(`(?<!${HEB_CLASS})${prefix ? `([${PREFIX_LETTERS}]{0,3}?)` : ''}${body}(?!${HEB_CLASS})`, 'gu');
}

/** Place names with a hyphen or maqaf where the owner's name has a space. */
function placeHyphenHit(value: string, places: readonly string[]): boolean {
  return places.some(place => {
    const parts = place.trim().split(/\s+/);
    if (parts.length < 2 || !HEBREW.test(place)) return false;
    // Attached prefix letters (bet, vav, ...) may precede the place name.
    return new RegExp(`(?<!${HEB_CLASS})[${PREFIX_LETTERS}]{0,3}${parts.map(escapeRegExp).join(`\\s*[-\u05BE]\\s*`)}(?!${HEB_CLASS})`, 'u').test(value);
  });
}

/**
 * A locative list of known places must carry the bet prefix on every place (item 10): when the
 * first place of a sentence has it, every later place in that sentence needs it too.
 */
function cityPrefixHit(value: string, places: readonly string[]): boolean {
  const hebrewPlaces = places.filter(place => HEBREW.test(place));
  if (hebrewPlaces.length < 2) return false;
  return sentences(value).some(sentence => {
    const found: Array<{ at: number; prefix: string }> = [];
    for (const place of hebrewPlaces) {
      for (const match of sentence.matchAll(placePattern(place, true))) found.push({ at: match.index ?? 0, prefix: match[1] ?? '' });
    }
    if (found.length < 2) return false;
    found.sort((a, b) => a.at - b.at);
    return found[0].prefix.includes(BET_LETTER) && found.slice(1).some(item => !item.prefix.includes(BET_LETTER));
  });
}

function customerAttributionHit(value: string): boolean {
  return sentences(value).some(sentence =>
    GUARD_CUSTOMER_STEMS.some(stem => sentence.includes(stem)) && GUARD_SPEECH_VERBS.some(verb => sentence.includes(verb)));
}

function hasArrival(sentence: string): boolean {
  return ARRIVAL_TOKENS.some(token => sentence.includes(token));
}

/**
 * fix_time sentence check (Noa sections 2 + 7): a time promise (lead token + digit or within-word) in a
 * sentence that names a service label or a fix verb is a fix-time claim, unless the sentence is about
 * arrival. With `sameDay` (M2a.3, item 7: only when the owner's fix-time claim is scoped to some
 * services), a fix verb plus a whole within-word without a lead token (a same-day style phrase) is a
 * claim too. Returns the labels each claim sentence names (empty array = no label in that sentence).
 */
function fixTimeSentences(value: string, labels: readonly string[], sameDay = false): { claims: string[][]; arrival: boolean } {
  const claims: string[][] = [];
  let arrival = false;
  for (const sentence of sentences(value)) {
    if (!TIME_PROMISE_PATTERN.test(sentence)) {
      if (sameDay && FIX_VERB_PATTERN.test(sentence) && WITHIN_WORD_PATTERN.test(sentence) && !hasArrival(sentence)) {
        claims.push(labels.filter(label => label && sentence.includes(label)));
      }
      continue;
    }
    const named = labels.filter(label => label && sentence.includes(label));
    if (!named.length && !FIX_VERB_PATTERN.test(sentence)) continue;
    if (hasArrival(sentence)) arrival = true;
    else claims.push(named);
  }
  return { claims, arrival };
}

/** Owner text fields that may authorise a fix_time claim (never the customer's words or the response time). */
function fixTimeOwnerTexts(ctx: CopyGateContext): string[] {
  const fields = Object.entries(ctx.ownerFields).filter(([, value]) => typeof value === 'string');
  // Without per-field owner data (hand-built contexts), the concatenated owner facts are the source.
  if (!fields.length) return sentences(ctx.ownerFactsText);
  return fields.flatMap(([key, value]) =>
    CLAIM_EXCLUDED_FACT_FIELDS.includes(key) || FIX_TIME_EXCLUDED_FIELDS.includes(key) ? [] : sentences(value as string));
}

const SCOPE_STOP_WORDS = new Set(['with', 'from', 'that', 'this', 'every', 'same', 'day', 'within', 'into', 'your', 'over', 'service', 'services']);

/**
 * fix_time authorisation scope (M2a.3, item 7): null = not authorised; 'all' = authorised for every
 * service; otherwise the service labels the authorising owner sentence names (by owner wording or label).
 */
export function fixTimeScope(ctx: CopyGateContext): 'all' | Set<string> | null {
  const rule = CLAIM_RULES[FIX_TIME_INDEX];
  if (!rule) return null;
  const labels = ctx.serviceLabels;
  const sources = ctx.serviceSources ?? [];
  let all = false;
  const scoped = new Set<string>();
  for (const sentence of fixTimeOwnerTexts(ctx)) {
    const lower = sentence.toLowerCase();
    const english = rule.ownerKeywords.some(keyword => lower.includes(keyword.toLowerCase()));
    const hebrew = !english && fixTimeSentences(sentence, labels).claims.length > 0;
    if (!english && !hebrew) continue;
    const words = new Set(lower.split(/[^a-z]+/).filter(word => word.length >= 4 && !SCOPE_STOP_WORDS.has(word)));
    const named = labels.filter((label, index) => sentence.includes(label) ||
      (sources[index] ?? '').toLowerCase().split(/[^a-z]+/).some(word => word.length >= 4 && !SCOPE_STOP_WORDS.has(word) && words.has(word)));
    if (!named.length) all = true;
    for (const label of named) scoped.add(label);
  }
  if (all) return 'all';
  return scoped.size ? scoped : null;
}

/** True when one fix_time claim sentence is outside the owner's authorised scope. */
function fixTimeClaimUnauthorised(named: string[], scope: 'all' | Set<string> | null, ctx: CopyGateContext): boolean {
  if (scope === 'all') return false;
  if (!scope) return true;
  if (named.length) return named.some(label => !scope.has(label));
  return Boolean(ctx.pageServiceLabel && !scope.has(ctx.pageServiceLabel));
}

/** An arrival time (arrival token + time promise or "<n> <time unit>") in one sentence (item 6). */
function arrivalTimeHit(value: string): boolean {
  return sentences(value).some(sentence => hasArrival(sentence) && (TIME_PROMISE_PATTERN.test(sentence) || NUMBER_WITHIN_PATTERN.test(sentence)));
}

/** Availability figures (N/M) in the copy that are not in the owner's own words (item 8). */
function availabilityHit(value: string, ctx: CopyGateContext): boolean {
  const facts = ctx.ownerFactsText.replace(/\s+/g, '');
  for (const match of value.matchAll(AVAILABILITY_PATTERN)) {
    if (!facts.includes(`${match[1]}/${match[2]}`)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// M2a.3 phrase-level repetition and customer-source claims (items 5 and 7).
// A phrase key is two adjacent Hebrew words, each with FACT_PHRASE_MIN_WORD_LETTERS+ letters, inside
// one clause. Keys that are part of a service label, a place or a free name never count.
// ---------------------------------------------------------------------------

const CLAUSE_SPLIT = /[,.;:!?()\n\u2013\u2014]+|\s-\s/;
const HEBREW_WORD = new RegExp(`^[${HEBREW_LETTER}]+$`, 'u');

/**
 * Two-word phrase keys of a text (deterministic; see FACT_PHRASE_MIN_WORD_LETTERS). With `maxWords`,
 * only the first words of each clause (the head of a proof point) form keys.
 */
export function phraseKeys(text: string, maxWords = Infinity): string[] {
  const keys: string[] = [];
  for (const clause of text.split(CLAUSE_SPLIT)) {
    const words = clause.trim().split(/\s+/).slice(0, maxWords).map(word => word.replace(/^[\u05F3\u05F4"'-]+|[\u05F3\u05F4"'-]+$/g, ''));
    for (let i = 0; i + 1 < words.length; i++) {
      const [a, b] = [words[i], words[i + 1]];
      if (HEBREW_WORD.test(a) && HEBREW_WORD.test(b) && a.length >= FACT_PHRASE_MIN_WORD_LETTERS && b.length >= FACT_PHRASE_MIN_WORD_LETTERS) keys.push(`${a} ${b}`);
    }
  }
  return [...new Set(keys)];
}

function keyPattern(key: string): RegExp {
  const [a, b] = key.split(' ');
  return new RegExp(`(?<!${HEB_CLASS})[${PREFIX_LETTERS}]{0,2}${escapeRegExp(a)}\\s+${escapeRegExp(b)}(?!${HEB_CLASS})`, 'gu');
}

/** True when the key (or the key without up to two leading prefix letters) occurs in the free names. */
function isFreeKey(key: string, free: string): boolean {
  for (let strip = 0; strip <= 2; strip++) {
    if (strip && !PREFIX_LETTERS.includes(key[strip - 1])) break;
    const rest = key.slice(strip);
    if (rest.split(' ')[0].length >= FACT_PHRASE_MIN_WORD_LETTERS - 1 && keyPattern(rest).test(free)) return true;
  }
  return false;
}

function freeText(ctx: CopyGateContext): string {
  return [...ctx.serviceLabels, ...(ctx.places ?? []), ...(ctx.freeNames ?? [])].join('\n');
}

export interface FactPhrase {
  /** First source text of the phrase (owner clause or the page's own proof line), for the repair prompt. */
  display: string;
  keys: string[];
}

/** Phrases for one page: owner Hebrew clauses + this page's trust bar items and guarantee block, merged by shared keys. */
export function pagePhrases(copy: Record<string, unknown>, ctx: CopyGateContext): FactPhrase[] {
  const free = freeText(ctx);
  const sourceTexts: string[] = [...(ctx.ownerPhraseTexts ?? [])];
  if (Array.isArray(copy.trustBarItems)) for (const item of copy.trustBarItems) if (typeof item === 'string') sourceTexts.push(item);
  if (typeof copy.guaranteeBlock === 'string') sourceTexts.push(copy.guaranteeBlock);
  const phrases: FactPhrase[] = [];
  for (const text of sourceTexts) {
    for (const clause of text.split(CLAUSE_SPLIT)) {
      const keys = phraseKeys(clause, FACT_PHRASE_MAX_WORDS).filter(key => !isFreeKey(key, free));
      if (!keys.length) continue;
      const overlapping = phrases.filter(phrase => phrase.keys.some(key => keys.includes(key)));
      if (!overlapping.length) { phrases.push({ display: clause.trim(), keys }); continue; }
      const [first, ...rest] = overlapping;
      first.keys = [...new Set([...first.keys, ...keys, ...rest.flatMap(phrase => phrase.keys)])];
      for (const phrase of rest) phrases.splice(phrases.indexOf(phrase), 1);
    }
  }
  return phrases;
}

/** Mentions of one phrase in a string: matches of any of its keys, overlapping matches merged. */
function phraseMentions(value: string, phrase: FactPhrase): number {
  const spans: Array<[number, number]> = [];
  for (const key of phrase.keys) for (const match of value.matchAll(keyPattern(key))) spans.push([match.index ?? 0, (match.index ?? 0) + match[0].length]);
  spans.sort((a, b) => a[0] - b[0]);
  let count = 0;
  let end = -1;
  for (const [start, stop] of spans) {
    if (start > end) count++;
    end = Math.max(end, stop);
  }
  return count;
}

/** Phrase keys of the owner's Hebrew customer quote that are not also owner facts (item 7). */
export function customerOnlyKeys(ctx: CopyGateContext): string[] {
  if (!ctx.reviewQuote) return [];
  const free = `${freeText(ctx)}\n${ctx.ownerFactsText}`;
  return phraseKeys(ctx.reviewQuote).filter(key => !isFreeKey(key, free));
}

function topFieldOf(field: string): string {
  return field.split(/[.[]/)[0];
}

function countMatches(value: string, pattern: RegExp): number {
  return (value.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) ?? []).length;
}

/** Run every gate. Returns violations (field paths + rule + config id), never copy text. */
export function runCopyGates(copy: Record<string, unknown>, ctx: CopyGateContext): GateViolation[] {
  const out: GateViolation[] = [];
  const strings = gatedStrings(copy);
  const authorised = CLAIM_RULES.map((_, index) => claimAuthorised(index, ctx));
  const quote = ctx.reviewQuote ? normalizeSpace(ctx.reviewQuote) : '';
  const places = ctx.places ?? [];
  const factPatterns = (ctx.factPhrases ?? []).map(phrase => new RegExp(`(?<!\\d)${escapeRegExp(phrase)}(?!\\d)`, 'g'));
  const factSeen = factPatterns.map(() => 0);
  const phrases = pagePhrases(copy, ctx);
  LAST_PHRASES.set(ctx, phrases);
  const phraseSeen = phrases.map(() => 0);
  const scope = FIX_TIME_INDEX >= 0 ? fixTimeScope(ctx) : 'all';
  const customerKeys = customerOnlyKeys(ctx).map(keyPattern);

  for (const { field, value } of strings) {
    PLURAL_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(value)) out.push({ field, rule: GATE_RULES.plural, actual: `plural:${index}` });
    });
    if (ctx.soloOperator) {
      WE_PATTERNS.forEach((pattern, index) => {
        if (pattern.test(value)) out.push({ field, rule: GATE_RULES.we, actual: `we:${index}` });
      });
    }
    if (HEBREW.test(value) && /["']/.test(value)) out.push({ field, rule: GATE_RULES.asciiQuote });
    CLAIM_RULES.forEach((rule, index) => {
      if (rule.sentenceOnly) return;
      const hit = rule.perToken
        ? rule.tokens.some(token => claimTokenIn(value, token) && !tokenAuthorised(token, ctx))
        : !authorised[index] && rule.tokens.some(token => claimTokenIn(value, token));
      if (hit) out.push({ field, rule: GATE_RULES.claim, actual: `claim:${rule.id}` });
    });
    if (FIX_TIME_INDEX >= 0 && fixTimeSentences(value, ctx.serviceLabels, scope instanceof Set).claims.some(named => fixTimeClaimUnauthorised(named, scope, ctx))) {
      out.push({ field, rule: GATE_RULES.claim, actual: 'claim:fix_time' });
    }
    WAO_SERVICE_TERMS_HE.forEach((term, index) => {
      if (value.includes(term)) out.push({ field, rule: GATE_RULES.waoOffer, actual: `wao_he:${index}` });
    });
    LATIN_WAO_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(value)) out.push({ field, rule: GATE_RULES.waoOffer, actual: `wao_latin:${index}` });
    });
    if (quote.length >= QUOTE_OVERLAP_MIN_CHARS && longestCommonSubstring(value, quote) >= QUOTE_OVERLAP_MIN_CHARS) {
      out.push({ field, rule: GATE_RULES.quoteOverlap });
    }
    if (TIME_PATTERN.test(value) || DAY_RANGE_PATTERN.test(value)) out.push({ field, rule: GATE_RULES.hours });
    if (placeHyphenHit(value, places)) out.push({ field, rule: GATE_RULES.placeHyphen });
    if (GERESH_QUOTE_PATTERN.test(value)) out.push({ field, rule: GATE_RULES.gereshQuote });
    if (cityPrefixHit(value, places)) out.push({ field, rule: GATE_RULES.cityPrefix });
    if (customerAttributionHit(value)) out.push({ field, rule: GATE_RULES.customerAttribution });
    factPatterns.forEach((pattern, index) => {
      const count = countMatches(value, pattern);
      if (!count) return;
      factSeen[index] += count;
      if (factSeen[index] > FACT_REPEAT_MAX) out.push({ field, rule: GATE_RULES.factRepeat, actual: `fact:${index}` });
    });
    if (!FACT_PHRASE_EXEMPT_FIELDS.includes(topFieldOf(field))) {
      phrases.forEach((phrase, index) => {
        const count = phraseMentions(value, phrase);
        if (!count) return;
        phraseSeen[index] += count;
        if (phraseSeen[index] > FACT_REPEAT_MAX) out.push({ field, rule: GATE_RULES.factRepeat, actual: `phrase:${index}` });
      });
    }
    if (availabilityHit(value, ctx)) out.push({ field, rule: GATE_RULES.availability });
    if (ctx.installPage && arrivalTimeHit(value)) out.push({ field, rule: GATE_RULES.installArrival });
    if (customerKeys.some(pattern => new RegExp(pattern.source, 'u').test(value))) out.push({ field, rule: GATE_RULES.customerSource });
  }

  // Unconfirmed services: every serviceItems / serviceDetails[].name entry must be an owner-confirmed name.
  if (ctx.serviceLabels.length) {
    const allowed = new Set(ctx.serviceLabels.map(normalizeSpace));
    const items = copy.serviceItems;
    if (Array.isArray(items)) items.forEach((item, index) => {
      if (typeof item !== 'string' || !allowed.has(normalizeSpace(item))) out.push({ field: `serviceItems[${index}]`, rule: GATE_RULES.unconfirmedService });
    });
    const details = copy.serviceDetails;
    if (Array.isArray(details)) details.forEach((item, index) => {
      const name = item && typeof item === 'object' ? (item as Record<string, unknown>).name : undefined;
      if (typeof name !== 'string' || !allowed.has(normalizeSpace(name))) out.push({ field: `serviceDetails[${index}].name`, rule: GATE_RULES.unconfirmedService });
    });
  }

  // A review context is only supportable from an owner-supplied star rating.
  if (typeof copy.reviewContext === 'string' && !ctx.starRating) out.push({ field: 'reviewContext', rule: GATE_RULES.reviewContext });
  return out;
}

/**
 * Non-blocking finding for human review (Noa \u00A72, widened in M2a.3, item 6): an arrival time (time
 * promise with an arrival token) in a heading or short proof line that names an installation service.
 * On an installation PAGE the same phrase is a hard gate (gate_install_arrival).
 */
export function copyReviewFlags(copy: Record<string, unknown>, ctx: CopyGateContext): GateReviewFlag[] {
  const flags: GateReviewFlag[] = [];
  const sources = ctx.serviceSources ?? [];
  const install = ctx.serviceLabels.filter((label, index) => isInstallService(label, sources[index] ?? ''));
  if (install.length) {
    for (const { field, value } of gatedStrings(copy)) {
      if (HEADING_FIELDS.test(field) && fixTimeSentences(value, install).arrival &&
        sentences(value).some(sentence => install.some(label => sentence.includes(label)) && hasArrival(sentence) && TIME_PROMISE_PATTERN.test(sentence))) {
        flags.push({ field, flag: 'arrival_time_in_installation_heading' });
      }
    }
  }
  return flags;
}

/** Owner fact phrases (item 9): distinct digit runs in FACT_PHRASE_FIELDS, as they appear in copy. */
export function ownerFactPhrases(data: CollectedData): string[] {
  const out = new Set<string>();
  for (const field of FACT_PHRASE_FIELDS) {
    const value = (data as Record<string, unknown>)[field];
    if (typeof value === 'string') for (const run of value.match(/\d+(?:\.\d+)?/g) ?? []) out.add(run);
  }
  return [...out];
}

/** Owner Hebrew fact texts for the phrase-level cap (item 5): FACT_PHRASE_TEXT_FIELDS, Hebrew only. */
export function ownerPhraseTexts(data: CollectedData): string[] {
  return FACT_PHRASE_TEXT_FIELDS.flatMap(field => {
    const value = (data as Record<string, unknown>)[field];
    return typeof value === 'string' && HEBREW.test(value) ? [value] : [];
  });
}

/** Page facts for the M2a.3 gates (service scope, installation page); all optional. */
export interface CopyGatePageOptions {
  serviceSources?: readonly string[];
  pageServiceLabel?: string | null;
  installPage?: boolean;
}

/** Build the gate context from owner data plus the page's confirmed service names and owner-stated places. */
export function copyGateContext(data: CollectedData, serviceLabels: readonly string[], soloOperator = true, places: readonly string[] = [], page: CopyGatePageOptions = {}): CopyGateContext {
  const collect = (entries: Array<[string, unknown]>) => entries.flatMap(([, value]) => (typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []));
  const facts = collect(Object.entries(data).filter(([key]) => !CLAIM_EXCLUDED_FACT_FIELDS.includes(key)));
  const star = typeof data.starRating === 'string' && data.starRating.trim() ? data.starRating.trim() : null;
  return {
    soloOperator,
    serviceLabels,
    ownerFactsText: facts.join('\n'),
    ownerFields: data as Partial<Record<string, unknown>>,
    reviewQuote: effectiveReviewQuote(data),
    starRating: star,
    places: [...new Set(places.map(place => place.trim()).filter(Boolean))],
    factPhrases: ownerFactPhrases(data),
    ownerPhraseTexts: ownerPhraseTexts(data),
    serviceSources: page.serviceSources ?? [],
    pageServiceLabel: page.pageServiceLabel ?? null,
    installPage: page.installPage ?? false,
    freeNames: [data.businessName, data.ownerName].filter((name): name is string => typeof name === 'string' && name.trim().length > 0),
  };
}

/** The phrases of the copy last gated with this context (set by runCopyGates; used by describeGateViolation). */
const LAST_PHRASES = new WeakMap<CopyGateContext, FactPhrase[]>();
function pagePhrasesFor(ctx: CopyGateContext): FactPhrase[] {
  return LAST_PHRASES.get(ctx) ?? [];
}

/** English guidance for one gate hit, used in the repair prompt (token data from config, no copy text). */
export function describeGateViolation(violation: GateViolation, ctx: CopyGateContext): string {
  const index = Number((violation.actual ?? '').split(':')[1]);
  switch (violation.rule) {
    case GATE_RULES.plural:
      return `${violation.field} uses plural / second-person-plural address (form: ${PLURAL_ADDRESS_TOKENS[index]?.token ?? 'plural'}); rewrite in singular masculine address`;
    case GATE_RULES.we:
      return `${violation.field} uses a first-person plural form (${WE_FORM_TOKENS[index]?.token ?? 'we'}); this is a solo operator, write in first-person singular`;
    case GATE_RULES.asciiQuote:
      return `${violation.field} contains an ASCII quote mark (" or ') inside Hebrew; use gershayim (\u05F4) or geresh (\u05F3) instead`;
    case GATE_RULES.unconfirmedService:
      return `${violation.field} is not an owner-confirmed service; use exactly one of: ${ctx.serviceLabels.join(' / ')}`;
    case GATE_RULES.claim: {
      const id = (violation.actual ?? '').split(':')[1];
      if (id === 'license_grade') return `${violation.field} names a license grade the owner did not state; name the license only in the owner's own wording, or just say he is licensed, with no grade or title`;
      if (id === 'fix_time') return `${violation.field} promises a time to fix or finish a job that the owner did not state for this service; remove the time promise (an arrival time stated by the owner is fine)`;
      if (id === 'solo_operator') return `${violation.field} states or implies that the owner works alone, answers personally or has no subcontractors / call centre; the owner never said so, remove that claim (first-person singular is only the grammar of the copy)`;
      return `${violation.field} makes a "${id}" claim that is not in the owner facts; remove that claim entirely`;
    }
    case GATE_RULES.waoOffer:
      return `${violation.field} mentions a marketing / copywriting service that this business does not offer; remove it`;
    case GATE_RULES.quoteOverlap:
      return `${violation.field} repeats the customer quote; the quote may appear only in reviewFeatured, so rewrite this field without it`;
    case GATE_RULES.reviewContext:
      return `${violation.field} has no owner-supplied star rating to rest on; set it to null`;
    case GATE_RULES.hours:
      return `${violation.field} writes business days or hours; remove every day name, day letter and clock time (the system shows the owner's hours)`;
    case GATE_RULES.placeHyphen:
      return `${violation.field} puts a hyphen or maqaf inside a place name; write the place name exactly as given, with a space: ${(ctx.places ?? []).join(' / ')}`;
    case GATE_RULES.gereshQuote:
      return `${violation.field} uses a geresh (\u05F3) as a quotation mark; use a gershayim pair (\u05F4...\u05F4) or rephrase without quotes`;
    case GATE_RULES.cityPrefix:
      return `${violation.field} lists places with the locative prefix (\u05D1) on the first place only; attach it to every place in the list (also after the conjunction \u05D5)`;
    case GATE_RULES.customerAttribution:
      return `${violation.field} attributes a statement to a customer; remove it (only the verbatim quote in reviewFeatured may speak for a customer)`;
    case GATE_RULES.factRepeat: {
      if ((violation.actual ?? '').startsWith('phrase:')) {
        const phrase = pagePhrasesFor(ctx)[index];
        return `${violation.field} repeats the proof point "${phrase?.display ?? ''}" more than ${FACT_REPEAT_MAX} times on this page (counted wording: ${(phrase?.keys ?? []).map(key => `"${key}"`).join(', ')}; the trust bar, guarantee block and response badge do not count); remove that proof point and its wording from this field entirely and use a different proof point or none`;
      }
      return `${violation.field} repeats the owner fact "${(ctx.factPhrases ?? [])[index] ?? ''}" more than ${FACT_REPEAT_MAX} times on this page; remove it from this field and use a different proof point or none`;
    }
    case GATE_RULES.availability:
      return `${violation.field} writes an availability figure (such as 24/7) that is not in the owner's own words; remove it or use the owner's exact availability wording`;
    case GATE_RULES.installArrival:
      return `${violation.field} states an arrival or response time on an installation page; remove the arrival time from this field (the emergency response time belongs on repair pages only)`;
    case GATE_RULES.customerSource:
      return `${violation.field} turns words from the customer's review into the owner's own claim; remove them (a customer's experience is not the owner's promise)`;
    default:
      return `${violation.field}: ${violation.rule}`;
  }
}
