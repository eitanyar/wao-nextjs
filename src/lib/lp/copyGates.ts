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
  DAY_LETTERS,
  FIX_TIME_WITHIN,
  GUARD_CUSTOMER_STEMS,
  GUARD_SPEECH_VERBS,
  SERVICE_LABEL_PINS,
} from './generationData';
import {
  CLAIM_EXCLUDED_FACT_FIELDS,
  CLAIM_RULES,
  FACT_PHRASE_FIELDS,
  FACT_REPEAT_MAX,
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
  return rule.tokens.some(token => ctx.ownerFactsText.includes(token));
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
/** "within" followed by a digit (Noa's fix_time sentence check). */
const WITHIN_NUMBER_PATTERN = new RegExp(`(?<!${HEB_CLASS})${escapeRegExp(FIX_TIME_WITHIN)}\\s*[-\u05BE]?\\s*\\d`, 'u');
const FIX_TIME_INDEX = CLAIM_RULES.findIndex(rule => rule.id === 'fix_time');
const BET_LETTER = '\u05D1';
/** First word of the pinned installation label: marks a service label as an installation service. */
const INSTALL_WORD = (SERVICE_LABEL_PINS['water heater install'] ?? '').split(' ')[0];
const HEADING_FIELDS = /^(?:heroHeadline|servicesHeadline|formHeadline|aboutPageHeadline|faqHeadline|serviceDetails\[\d+\]\.name)$/;

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

/** fix_time sentence check: a service label + "within <number>" in one sentence, unless the verb is arrival. */
function fixTimeSentence(value: string, labels: readonly string[]): 'hit' | 'arrival' | null {
  let arrival = false;
  for (const sentence of sentences(value)) {
    if (!WITHIN_NUMBER_PATTERN.test(sentence) || !labels.some(label => label && sentence.includes(label))) continue;
    if (ARRIVAL_TOKENS.some(token => sentence.includes(token))) arrival = true;
    else return 'hit';
  }
  return arrival ? 'arrival' : null;
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
      const hit = rule.perToken
        ? rule.tokens.some(token => value.includes(token) && !tokenAuthorised(token, ctx))
        : !authorised[index] && rule.tokens.some(token => value.includes(token));
      if (hit) out.push({ field, rule: GATE_RULES.claim, actual: `claim:${rule.id}` });
    });
    if (FIX_TIME_INDEX >= 0 && !authorised[FIX_TIME_INDEX] && !out.some(hit => hit.field === field && hit.actual === 'claim:fix_time') &&
      fixTimeSentence(value, ctx.serviceLabels) === 'hit') {
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
 * Non-blocking findings for human review (Noa \u00A72): an arrival time ("within <n>" with an arrival
 * verb) inside a heading about an installation service.
 */
export function copyReviewFlags(copy: Record<string, unknown>, ctx: CopyGateContext): GateReviewFlag[] {
  const install = INSTALL_WORD ? ctx.serviceLabels.filter(label => label.startsWith(INSTALL_WORD)) : [];
  if (!install.length) return [];
  return gatedStrings(copy)
    .filter(({ field, value }) => HEADING_FIELDS.test(field) && fixTimeSentence(value, install) === 'arrival')
    .map(({ field }) => ({ field, flag: 'arrival_time_in_installation_heading' as const }));
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

/** Build the gate context from owner data plus the page's confirmed service names and owner-stated places. */
export function copyGateContext(data: CollectedData, serviceLabels: readonly string[], soloOperator = true, places: readonly string[] = []): CopyGateContext {
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
  };
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
      if (id === 'fix_time') return `${violation.field} promises a time to fix or finish a job that the owner did not state; remove the time promise (an arrival time stated by the owner is fine)`;
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
    case GATE_RULES.factRepeat:
      return `${violation.field} repeats the owner fact "${(ctx.factPhrases ?? [])[index] ?? ''}" more than ${FACT_REPEAT_MAX} times on this page; remove it from this field and use a different proof point or none`;
    default:
      return `${violation.field}: ${violation.rule}`;
  }
}
