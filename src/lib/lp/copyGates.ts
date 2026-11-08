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
import { buildLpCopyPrompt, hasRealReviewQuote } from './lpCopyPrompt';
import {
  AC_SEGMENT_KEYWORD,
  AC_VERTICAL_SLUG_KEYWORDS,
  ARRIVAL_TOKENS,
  ARRIVE_LOCATE_LEAD_PREFIXES,
  ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS,
  BAD_IDIOMS,
  BEFORE_CAP,
  BEFORE_TIME_WORD_EXCLUSIONS,
  BEFORE_TOKENS,
  ELECTRIC_SLUG_KEYWORDS,
  HERO_SIGNATURE_CAP,
  MORAL_ENDING_FOLLOWING_EXCLUSIONS,
  MORAL_ENDING_TOKENS,
  MORAL_FIELDS,
  SERVICE_DETAILS_OPENER_TOKEN,
  SIGNATURE_WORD_TOKEN_ADDITIONS,
  STICKY_BARE_FORMS,
  STICKY_PROBLEM_WORDS,
  STICKY_WHOLE_WORD_PREFIXES,
  STICKY_WHOLE_WORDS,
  STORY_CUSTOMER_NOUNS,
  STORY_FIELDS,
  STORY_NOUN_PREFIXES,
  STORY_PAST_VERBS,
  STORY_QUANTIFIER_EXCLUSIONS,
  STORY_QUANTIFIER_PREFIXES,
  STORY_TIME_ANCHORS,
  STORY_VERB_PREFIXES,
  TILES_BREAK_EXCLUSIONS_PRECEDING_WORD,
  TILES_BREAK_FORMS,
  TILES_BREAK_PREFIX_LETTERS,
  TILES_BREAK_STRIP_PREFIXES,
  TIME_WORD_TOKENS,
  TRADE_TERMS,
  BARE_VERB_EXCLUSIONS,
  BARE_VERB_FIELDS,
  BARE_VERB_SENTENCE_OPENERS,
  CLAIM_TOKEN_WORD_END,
  CLAIM_TOKENS,
  DAY_LETTERS,
  EMERGENCY_SERVICE_KINDS,
  FIX_TIME_LEAD_TOKENS,
  FIX_TIME_WITHIN_WORDS,
  FREE_CALLOUT_TOKENS,
  FREE_EXCLUSION_WORDS,
  FREE_SCOPE_NOUNS,
  FREE_TOKENS,
  GUARD_CUSTOMER_STEMS,
  GENERIC_ADJECTIVE_EXEMPT_PHRASES,
  GENERIC_ADJECTIVE_PHRASES,
  GENERIC_ADJECTIVE_PREFIX_LETTERS,
  GENERIC_ADJECTIVE_WORDS,
  GUARD_SPEECH_VERBS,
  OWNER_VOICE_FIELDS,
  PLANNED_SERVICE_KINDS,
  SAME_DAY_FINISH_VERBS,
  SAME_DAY_TOKENS,
  SERVICE_AREA_HEAD_TOKENS,
  SERVICE_AREA_LAMED_HEADS,
  SERVICE_AREA_NEARBY_TOKENS,
  SERVICE_AREA_REGION_TOKENS,
  SERVICE_AREA_TAIL_TOKENS,
  SERVICE_LABEL_PINS,
  SIGNATURE_WORD_TOKENS,
  STICKY_ACTION_TOKENS,
  SUBJECT_CARRY_PREFIXES,
  SUBJECT_CARRY_TOKENS,
} from './generationData';
import {
  CLAIM_EXCLUDED_FACT_FIELDS,
  CLAIM_RULES,
  FACT_PHRASE_EXEMPT_FIELDS,
  FACT_PHRASE_FIELDS,
  FACT_PHRASE_MAX_WORDS,
  FACT_PHRASE_MIN_WORD_LETTERS,
  FACT_PHRASE_REPEAT_MAX,
  FACT_PHRASE_TEXT_FIELDS,
  FACT_REPEAT_MAX,
  FIX_TIME_EXCLUDED_FIELDS,
  FREE_EXCLUDED_FIELDS,
  FREE_SCOPE_EN,
  FREE_WORDS_EN,
  PLURAL_ADDRESS_TOKENS,
  QUOTE_OVERLAP_MIN_CHARS,
  SAME_DAY_ARRIVAL_FIELD,
  SAME_DAY_FINISH_FIELDS,
  SAME_DAY_FINISH_KEYWORDS,
  SERVICE_AREA_EXCLUDED_FIELDS,
  SERVICE_AREA_OWNER_FIELDS,
  SERVICE_AREA_WIDENING_KEYWORDS,
  SERVICE_DESCRIPTION_MIN_CHARS,
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
  // M2a.4
  reduplicationDash: 'gate_reduplication_dash',
  nameSpelling: 'gate_name_spelling',
  shortDescription: 'gate_short_description',
  // M2a.4 round 2 (Noa section 16)
  serviceArea: 'gate_service_area',
  // M2a.5 (Tamar section 19 voice rules + the duplicate-hook check)
  genericAdjective: 'gate_generic_adjective',
  badIdiom: 'gate_bad_idiom',
  signatureRepeat: 'gate_signature_repeat',
  duplicateHook: 'gate_duplicate_hook',
  stickyAction: 'gate_sticky_action',
  bareVerbOpener: 'gate_bare_verb_opener',
  // M2a.6 (Tamar section 20 + Adam's site-wide checks + Yonatan's H1 anchor)
  heroSignatureCap: 'gate_hero_signature_cap',
  duplicateAboutHeadline: 'gate_duplicate_about_headline',
  duplicateAboutOpening: 'gate_duplicate_about_opening',
  inventedStory: 'gate_invented_story',
  moralEnding: 'gate_moral_ending',
  beforeCap: 'gate_before_cap',
  stickyNaming: 'gate_sticky_naming',
  serviceDetailsOpener: 'gate_service_details_opener',
  tradeTerm: 'gate_trade_term',
  heroAnchor: 'gate_hero_anchor',
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
  /** M2a.4: the owner's first name exactly as in the facts (the prompt's self-introduction name). */
  ownerFirstName?: string | null;
  /** M2a.4: research-bound site page (serviceDetails descriptions have a minimum length). */
  researchSite?: boolean;
  /** M2a.5: the owner's business name, masked before the section 19.1 generic-adjective match. */
  businessName?: string | null;
  /** M2a.5: heroHeadline of every page already generated for this site (duplicate-hook check). */
  priorHeroHeadlines?: readonly string[];
  /** M2a.6: aboutPageHeadline / aboutPageBody of every page already generated for this site (route order). */
  priorAboutPageHeadlines?: readonly string[];
  priorAboutPageBodies?: readonly string[];
  /** M2a.6: the slug that decides the page's vertical (money page: its own; homepage: its first service). */
  pageSlug?: string;
  /** M2a.6 (Yonatan): the title's search anchor, page.seo.name and page.seo.city; the gate is off when anchorName is unset. */
  anchorName?: string | null;
  anchorCity?: string | null;
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
  // M2a.4 (Noa section 10 prefix note): 'vav' = an optional vav prefix only.
  const prefix = entry.allowPrefix === 'vav' ? '\u05D5?' : entry.allowPrefix ? `[${PREFIX_LETTERS}]{0,2}` : '';
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
  const text = rule.excludedFields?.length ? ownerFactsWithout(ctx, rule.excludedFields) : ctx.ownerFactsText;
  const facts = text.toLowerCase();
  if (rule.ownerKeywords.some(keyword => facts.includes(keyword.toLowerCase()))) return true;
  return rule.tokens.some(token => claimTokenIn(text, token));
}

/** Owner facts without some fields (M2a.4); falls back to the concatenated facts for hand-built contexts. */
function ownerFactsWithout(ctx: CopyGateContext, excluded: readonly string[]): string {
  const fields = Object.entries(ctx.ownerFields);
  if (!fields.length) return ctx.ownerFactsText;
  return fields.flatMap(([key, value]) => {
    if (CLAIM_EXCLUDED_FACT_FIELDS.includes(key) || excluded.includes(key)) return [];
    return typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }).join('\n');
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
  return ownerClaimScope(ctx, fixTimeOwnerTexts(ctx), sentence => {
    const lower = sentence.toLowerCase();
    return rule.ownerKeywords.some(keyword => lower.includes(keyword.toLowerCase())) || fixTimeSentences(sentence, ctx.serviceLabels).claims.length > 0;
  });
}

/**
 * Scope of an owner claim (M2a.3 fix_time, M2a.4 same-day finish): null = no authorising owner sentence;
 * 'all' = one names no service; otherwise the service labels the authorising sentences name.
 */
function ownerClaimScope(ctx: CopyGateContext, ownerSentences: readonly string[], authorises: (sentence: string) => boolean): 'all' | Set<string> | null {
  const labels = ctx.serviceLabels;
  const sources = ctx.serviceSources ?? [];
  let all = false;
  const scoped = new Set<string>();
  for (const sentence of ownerSentences) {
    if (!authorises(sentence)) continue;
    const lower = sentence.toLowerCase();
    const words = new Set(lower.split(/[^a-z]+/).filter(word => word.length >= 4 && !SCOPE_STOP_WORDS.has(word)));
    const named = labels.filter((label, index) => sentence.includes(label) ||
      (sources[index] ?? '').toLowerCase().split(/[^a-z]+/).some(word => word.length >= 4 && !SCOPE_STOP_WORDS.has(word) && words.has(word)));
    if (!named.length) all = true;
    for (const label of named) scoped.add(label);
  }
  if (all) return 'all';
  return scoped.size ? scoped : null;
}

// ---------------------------------------------------------------------------
// M2a.4 same-day promises (Noa section 14). A sentence with a same-day token is a same-day promise:
// with a finish verb it promises to finish the job that day (owner usp / guarantee only, scoped to the
// services it names); otherwise with an arrival token it is an arrival promise (the owner's response
// time authorises it). A same-day sentence with neither is held to the arrival rule (engineer default,
// flagged to Noa). Plain substring matching.
// ---------------------------------------------------------------------------

/** Owner sentences of the fields that may authorise a same-day finish (usp / guarantee). */
function sameDayFinishOwnerTexts(ctx: CopyGateContext): string[] {
  return SAME_DAY_FINISH_FIELDS.flatMap(field => {
    const value = ctx.ownerFields[field];
    return typeof value === 'string' ? sentences(value) : [];
  });
}

/** Same-day finish authorisation scope (null = not authorised). */
export function sameDayFinishScope(ctx: CopyGateContext): 'all' | Set<string> | null {
  return ownerClaimScope(ctx, sameDayFinishOwnerTexts(ctx), sentence => {
    const lower = sentence.toLowerCase();
    return SAME_DAY_FINISH_KEYWORDS.some(keyword => lower.includes(keyword)) ||
      (SAME_DAY_TOKENS.some(token => sentence.includes(token)) && SAME_DAY_FINISH_VERBS.some(verb => sentence.includes(verb)));
  });
}

function ownerStatesResponseTime(ctx: CopyGateContext): boolean {
  const value = ctx.ownerFields[SAME_DAY_ARRIVAL_FIELD];
  return typeof value === 'string' && value.trim().length > 0;
}

/** Same-day claim ids of one string: 'same_day_finish' and/or 'same_day_arrival' (unauthorised ones only). */
function sameDayHits(value: string, ctx: CopyGateContext, finishScope: 'all' | Set<string> | null): string[] {
  const hits = new Set<string>();
  for (const sentence of sentences(value)) {
    if (!SAME_DAY_TOKENS.some(token => sentence.includes(token))) continue;
    const named = ctx.serviceLabels.filter(label => label && sentence.includes(label));
    // Noa (M2a.4 call 1): with neither a finish verb nor an arrival token, a sentence naming a service label is a finish promise.
    if (SAME_DAY_FINISH_VERBS.some(verb => sentence.includes(verb)) || (!hasArrival(sentence) && named.length)) {
      if (fixTimeClaimUnauthorised(named, finishScope, ctx)) hits.add('same_day_finish');
    } else if (!ownerStatesResponseTime(ctx)) {
      hits.add('same_day_arrival');
    }
  }
  return [...hits];
}

// ---------------------------------------------------------------------------
// M2a.4 typography and names.
// ---------------------------------------------------------------------------

/** A reduplicated Hebrew word joined by a hyphen or en-dash (the line-by-line form takes a maqaf). */
const REDUPLICATION_DASH_PATTERN = new RegExp(`(?<!${HEB_CLASS})(${HEB_CLASS}{2,})\\s*[-\u2013]\\s*\\1(?!${HEB_CLASS})`, 'u');

const OPENER_PROBE = 'ZQXOWNERPROBE';
/**
 * The self-introduction opener word ("my name is", the first of the legacy prompt's two openers), read
 * from the prompt template at load time so the gate and the prompt never drift. Empty if the template changed.
 */
export const NAME_OPENER: string = (() => {
  const match = new RegExp(`Open with: "(\\S+) ${OPENER_PROBE}," or "(\\S+) ${OPENER_PROBE},"`).exec(buildLpCopyPrompt({ ownerName: OPENER_PROBE }));
  return match ? match[1] : '';
})();
const NAME_OPENER_PATTERN = NAME_OPENER ? new RegExp(`(?<!${HEB_CLASS})${escapeRegExp(NAME_OPENER)}\\s+([^\\s,.;:!?\u2014]+)`, 'gu') : null;

/** True when the self-introduction names the owner in another spelling or script (e.g. a transliterated Latin name). */
function nameSpellingHit(value: string, ctx: CopyGateContext): boolean {
  const name = ctx.ownerFirstName;
  if (!name || !NAME_OPENER_PATTERN) return false;
  for (const match of value.matchAll(NAME_OPENER_PATTERN)) if (match[1] !== name) return true;
  return false;
}

// ---------------------------------------------------------------------------
// M2a.4 round 2: service-area widening (Noa section 16). The owner's Hebrew place labels (the identity
// step's base city + service area, gatePlaces) are masked first, so a region token inside a city name
// never hits; the mask marks where a place stood for the tail / head rules.
// ---------------------------------------------------------------------------

const PLACE_MARK = '\uE000';
/** Section 16 prefix letters for head and region tokens: vav, bet, lamed, mem, shin, kaf (never he). */
const AREA_PREFIX = '[\u05D5\u05D1\u05DC\u05DE\u05E9\u05DB]{0,3}';
const LAMED = '\u05DC';
const alternatives = (tokens: readonly string[]) => [...tokens].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|');
const REGION_ALT = alternatives(SERVICE_AREA_REGION_TOKENS);
const REGION_PATTERN = new RegExp(`(?<!${HEB_CLASS})${AREA_PREFIX}(${REGION_ALT})(?!${HEB_CLASS})`, 'gu');
/** A place: the mask (after prefix letters) or a region token. */
const PLACE_WORD = `(?:${AREA_PREFIX}${PLACE_MARK}|${AREA_PREFIX}(?:${REGION_ALT})(?!${HEB_CLASS}))`;
const TAIL_PATTERN = new RegExp(`${PLACE_MARK}(?:\\s|,\\s)(${alternatives(SERVICE_AREA_TAIL_TOKENS)})(?!${HEB_CLASS})`, 'gu');
const LAMED_HEADS = SERVICE_AREA_HEAD_TOKENS.filter(token => SERVICE_AREA_LAMED_HEADS.includes(token));
const DIRECT_HEADS = SERVICE_AREA_HEAD_TOKENS.filter(token => !SERVICE_AREA_LAMED_HEADS.includes(token));
const HEAD_PATTERN = new RegExp(
  `(?<!${HEB_CLASS})${AREA_PREFIX}(?:(${alternatives(DIRECT_HEADS)})\\s+${PLACE_WORD}|(${alternatives(LAMED_HEADS)})\\s+${LAMED}${PLACE_MARK})`, 'gu');

/** Owner Hebrew place labels, longest first (the mask order). */
function maskPlaces(value: string, places: readonly string[]): string {
  let out = value;
  for (const place of [...places].filter(item => HEBREW.test(item)).sort((a, b) => b.length - a.length)) out = out.split(place).join(PLACE_MARK);
  return out;
}

export interface ServiceAreaHit { kind: 'tail' | 'head' | 'region' | 'nearby'; token: string }

function areaOwnerText(ctx: CopyGateContext, fields: readonly string[] | null): string {
  const entries = Object.entries(ctx.ownerFields);
  if (!entries.length) return fields ? '' : ctx.ownerFactsText;
  return entries.filter(([key]) => (fields ? fields.includes(key) : true) && !SERVICE_AREA_EXCLUDED_FIELDS.includes(key) && !CLAIM_EXCLUDED_FACT_FIELDS.includes(key))
    .flatMap(([, value]) => (typeof value === 'string' ? [value] : [])).join('\n');
}

/** Unauthorised widening phrases in one string (Noa section 16). */
export function serviceAreaHits(value: string, ctx: CopyGateContext): ServiceAreaHit[] {
  const masked = maskPlaces(value, ctx.places ?? []);
  const owner = areaOwnerText(ctx, null);
  const area = areaOwnerText(ctx, SERVICE_AREA_OWNER_FIELDS);
  const areaLower = area.toLowerCase();
  // A tail / head / nearby phrase only when the owner's own area answer widens the area itself.
  const widened = SERVICE_AREA_WIDENING_KEYWORDS.some(keyword => areaLower.includes(keyword)) ||
    [...SERVICE_AREA_TAIL_TOKENS, ...SERVICE_AREA_HEAD_TOKENS, ...SERVICE_AREA_NEARBY_TOKENS].some(token => area.includes(token));
  const hits: ServiceAreaHit[] = [];
  for (const match of masked.matchAll(REGION_PATTERN)) if (!owner.includes(match[1])) hits.push({ kind: 'region', token: match[1] });
  if (!widened) {
    for (const match of masked.matchAll(TAIL_PATTERN)) hits.push({ kind: 'tail', token: match[1] });
    for (const match of masked.matchAll(HEAD_PATTERN)) hits.push({ kind: 'head', token: match[1] ?? match[2] });
    for (const token of SERVICE_AREA_NEARBY_TOKENS) if (masked.includes(token)) hits.push({ kind: 'nearby', token });
  }
  return hits;
}

// ---------------------------------------------------------------------------
// M2a.4 round 2: free claims (Noa section 17). A free token is scoped by the nearest scope noun in its
// clause (before it, else after it; longest match first); the owner must have said free for that class.
// ---------------------------------------------------------------------------

const FREE_CLAUSE_SPLIT = /[.,\u2014:;?!\n]+/;
const FREE_EXCLUSION_PATTERN = new RegExp(`^\\s*(?:${alternatives(FREE_EXCLUSION_WORDS)})(?!${HEB_CLASS})`, 'u');

interface Span { start: number; end: number; value: string }

/** Non-overlapping occurrences of the tokens in a text, longest match first. */
function spans(text: string, tokens: readonly string[]): Span[] {
  const found: Span[] = [];
  for (const token of [...tokens].sort((a, b) => b.length - a.length)) {
    for (let at = text.indexOf(token); at >= 0; at = text.indexOf(token, at + 1)) {
      const span = { start: at, end: at + token.length, value: token };
      if (!found.some(item => item.start < span.end && span.start < item.end)) found.push(span);
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

const SCOPE_CLASS_OF = new Map<string, string>(Object.entries(FREE_SCOPE_NOUNS).flatMap(([cls, nouns]) => nouns.map(noun => [noun, cls] as [string, string])));
const SCOPE_NOUNS = [...SCOPE_CLASS_OF.keys()];

/** Free claims of one string: their scope class, or null when the clause has no scope noun. */
export function freeClaims(value: string): Array<string | null> {
  const out: Array<string | null> = [];
  for (const clause of value.split(FREE_CLAUSE_SPLIT)) {
    const nouns = spans(clause, SCOPE_NOUNS);
    for (const span of spans(clause, [...FREE_CALLOUT_TOKENS, ...FREE_TOKENS])) {
      if (FREE_CALLOUT_TOKENS.includes(span.value)) { out.push('callout'); continue; }
      if (FREE_EXCLUSION_PATTERN.test(clause.slice(span.end))) continue;
      const others = nouns.filter(noun => noun.end <= span.start || noun.start >= span.end);
      const before = others.filter(noun => noun.end <= span.start).pop();
      const after = others.find(noun => noun.start >= span.end);
      const noun = before ?? after;
      out.push(noun ? SCOPE_CLASS_OF.get(noun.value) ?? null : null);
    }
  }
  return out;
}

function englishWordPattern(words: readonly string[]): RegExp {
  return new RegExp(`(?<![a-z])(?:${[...words].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})(?![a-z])`, 'g');
}
const FREE_WORD_EN_PATTERN = englishWordPattern(FREE_WORDS_EN);
const SCOPE_EN = Object.entries(FREE_SCOPE_EN).flatMap(([cls, nouns]) => nouns.map(noun => ({ cls, noun })));

/** Free-scope classes the owner authorised: one owner clause holds a free word and a scope noun of the class. */
export function ownerFreeClasses(ctx: CopyGateContext): Set<string> {
  const classes = new Set<string>();
  const entries = Object.entries(ctx.ownerFields);
  const texts = entries.length
    ? entries.filter(([key]) => !FREE_EXCLUDED_FIELDS.includes(key) && !CLAIM_EXCLUDED_FACT_FIELDS.includes(key)).flatMap(([, value]) => (typeof value === 'string' ? [value] : []))
    : [ctx.ownerFactsText];
  for (const text of texts) {
    for (const clause of text.split(FREE_CLAUSE_SPLIT)) {
      if (spans(clause, [...FREE_CALLOUT_TOKENS, ...FREE_TOKENS]).length) {
        for (const span of spans(clause, SCOPE_NOUNS)) classes.add(SCOPE_CLASS_OF.get(span.value)!);
        if (spans(clause, FREE_CALLOUT_TOKENS).length) classes.add('callout');
      }
      const lower = clause.toLowerCase();
      if (new RegExp(FREE_WORD_EN_PATTERN.source).test(lower)) {
        // Longest English scope noun first; a shorter noun inside a longer one does not count.
        let rest = lower;
        for (const { cls, noun } of [...SCOPE_EN].sort((a, b) => b.noun.length - a.noun.length)) {
          const pattern = englishWordPattern([noun]);
          if (pattern.test(rest)) { classes.add(cls); rest = rest.replace(englishWordPattern([noun]), ' '); }
        }
      }
    }
  }
  return classes;
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

// ---------------------------------------------------------------------------
// M2a.5: Tamar's section 19 voice rules (docs/copy/site-bot-generation-data.md). Every token list is
// in generationData.ts; owner-voice fields only. Gates detect; nothing is ever auto-replaced.
// ---------------------------------------------------------------------------

const VOICE_FIELD_PATTERNS = OWNER_VOICE_FIELDS.map(name => new RegExp(`^${name.includes('[]')
  ? name.split('[]').map(escapeRegExp).join('\\[\\d+\\]')
  : `${escapeRegExp(name)}(?:\\[\\d+\\])?`}$`));
/** True when a gated field path is an owner-voice field (section 19 field scope). */
export function isOwnerVoiceField(field: string): boolean {
  return VOICE_FIELD_PATTERNS.some(pattern => pattern.test(field));
}

const VOICE_MASK = '\uE001';
const wordAlternatives = (tokens: readonly string[]) => [...tokens].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|');
const GENERIC_WORD_PATTERNS = GENERIC_ADJECTIVE_WORDS.map(word =>
  new RegExp(`(?<!${HEB_CLASS})[${GENERIC_ADJECTIVE_PREFIX_LETTERS.join('')}]*${escapeRegExp(word)}(?!${HEB_CLASS})`, 'gu'));

/** A value with the owner's business name and the exempt phrases masked (section 19.1). */
function maskGeneric(value: string, ctx: Pick<CopyGateContext, 'businessName'>): string {
  let out = value;
  const masks = [...(ctx.businessName?.trim() ? [ctx.businessName.trim()] : []), ...GENERIC_ADJECTIVE_EXEMPT_PHRASES].sort((a, b) => b.length - a.length);
  for (const mask of masks) out = out.split(mask).join(VOICE_MASK);
  return out;
}

export interface GenericAdjectiveHit { kind: 'word' | 'phrase'; index: number }

/** Every generic-adjective occurrence in one string (section 19.1), after masking. */
export function genericAdjectiveHits(value: string, ctx: Pick<CopyGateContext, 'businessName'>): GenericAdjectiveHit[] {
  const masked = maskGeneric(value, ctx);
  const hits: GenericAdjectiveHit[] = [];
  GENERIC_WORD_PATTERNS.forEach((pattern, index) => {
    hits.push(...Array.from(masked.matchAll(pattern), () => ({ kind: 'word' as const, index })));
  });
  GENERIC_ADJECTIVE_PHRASES.forEach((phrase, index) => {
    for (let at = masked.indexOf(phrase); at >= 0; at = masked.indexOf(phrase, at + phrase.length)) hits.push({ kind: 'phrase', index });
  });
  return hits;
}

/** Section 19.2 gate entries ('gate' and 'spellingFix'; 'promptOnly' never gates). */
const IDIOM_GATES = BAD_IDIOMS.filter(entry => entry.type !== 'promptOnly').map(entry => ({
  id: entry.id,
  patterns: entry.tokens.map(token => entry.wholeWord
    ? new RegExp(`(?<!${HEB_CLASS})[${entry.prefixLetters.join('')}]*${escapeRegExp(token)}(?!${HEB_CLASS})`, 'u')
    : new RegExp(escapeRegExp(token), 'u')),
}));

/** Bad-idiom gate ids hit by one string (section 19.2). */
export function badIdiomHits(value: string): string[] {
  return IDIOM_GATES.filter(entry => entry.patterns.some(pattern => pattern.test(value))).map(entry => entry.id);
}

/** M2a.6: section 19.3 groups with the section 20.1 additions appended (pointByPoint is a new group). */
export const SIGNATURE_GROUPS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  [...new Set([...Object.keys(SIGNATURE_WORD_TOKENS), ...Object.keys(SIGNATURE_WORD_TOKEN_ADDITIONS)])]
    .map(group => [group, [...(SIGNATURE_WORD_TOKENS[group] ?? []), ...(SIGNATURE_WORD_TOKEN_ADDITIONS[group] ?? [])]]));
/** The section 20.1 group that also counts the tile-breaking forms. */
export const TILES_GROUP = 'tiles';

/** True when a word, as written or with leading prefix letters stripped one by one, is in the list. */
function strippedWordIn(word: string, prefixes: readonly string[], list: readonly string[]): boolean {
  for (let rest = word; rest; rest = rest.slice(1)) {
    if (list.includes(rest)) return true;
    if (!prefixes.includes(rest[0])) return false;
  }
  return false;
}

/** The Hebrew word right before a position (only whitespace between), or null. */
function wordBefore(value: string, at: number): string | null {
  return new RegExp(`(${HEB_CLASS}+)\\s+$`, 'u').exec(value.slice(0, at))?.[1] ?? null;
}

const TILES_BREAK_PATTERN = new RegExp(
  `(?<!${HEB_CLASS})[${TILES_BREAK_PREFIX_LETTERS.join('')}]*(?:${wordAlternatives(TILES_BREAK_FORMS)})(?!${HEB_CLASS})`, 'gu');

/** Section 20.1: tile-breaking forms (whole word, prefixes), unless the preceding word (prefixes stripped) is an exclusion. */
export function tilesBreakSpans(value: string): Span[] {
  const out: Span[] = [];
  for (const match of value.matchAll(TILES_BREAK_PATTERN)) {
    const at = match.index ?? 0;
    const before = wordBefore(value, at);
    if (before && strippedWordIn(before, TILES_BREAK_STRIP_PREFIXES, TILES_BREAK_EXCLUSIONS_PRECEDING_WORD)) continue;
    out.push({ start: at, end: at + match[0].length, value: match[0] });
  }
  return out;
}

/**
 * Signature-phrase hits per group in one string: non-overlapping, longest variant first (section 19.3);
 * M2a.6: the section 20.1 additions count, and tiles also counts its breaking forms (an overlap counts once).
 */
export function signatureCounts(value: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [group, variants] of Object.entries(SIGNATURE_GROUPS)) {
    const found = spans(value, variants);
    if (group === TILES_GROUP) {
      for (const span of tilesBreakSpans(value)) if (!found.some(item => item.start < span.end && span.start < item.end)) found.push(span);
    }
    if (found.length) out[group] = found.length;
  }
  return out;
}

/**
 * Signature variants that may be shown to the model: every variant except the hyphen and space
 * spellings of a maqaf variant (section 19.3: matching only, never shown or inserted into a prompt).
 */
export function promptSignatureVariants(group: string): string[] {
  const variants = SIGNATURE_GROUPS[group] ?? [];
  const matchingOnly = new Set(variants.filter(item => item.includes('\u05BE')).flatMap(item => [item.split('\u05BE').join('-'), item.split('\u05BE').join(' ')]));
  return [...variants.filter(item => !matchingOnly.has(item)), ...(group === TILES_GROUP ? TILES_BREAK_FORMS : [])];
}

/** The hero hook: the text before the first question mark or em-dash (trimmed); null when it has neither. */
export function heroHook(headline: string): string | null {
  const at = headline.search(/[?\u2014]/);
  return at >= 0 ? headline.slice(0, at).trim() : null;
}

/** Duplicate-hook kind against the site's earlier heroHeadlines: 'headline', 'hook' or null. */
export function duplicateHookKind(headline: string, prior: readonly string[]): 'headline' | 'hook' | null {
  if (prior.includes(headline)) return 'headline';
  const hook = heroHook(headline);
  return hook && prior.some(other => heroHook(other) === hook) ? 'hook' : null;
}

/** Sticky-action tokens that are also arrival promises (section 8): they need the owner's response time. */
export const STICKY_ARRIVAL_TOKENS: readonly string[] = STICKY_ACTION_TOKENS.filter(token => ARRIVAL_TOKENS.includes(token));

/** Sticky-bar problems (section 19.4): no action token, equal to the hero CTA, an unauthorised arrival action. */
export function stickyActionProblems(value: string, heroCta: unknown, ctx: CopyGateContext): Array<'no_action' | 'equals_cta' | 'arrival'> {
  const out: Array<'no_action' | 'equals_cta' | 'arrival'> = [];
  if (!STICKY_ACTION_TOKENS.some(token => value.includes(token))) out.push('no_action');
  if (typeof heroCta === 'string' && value === heroCta) out.push('equals_cta');
  if (STICKY_ARRIVAL_TOKENS.some(token => value.includes(token)) && !ownerStatesResponseTime(ctx)) out.push('arrival');
  return out;
}

const BARE_VERB_FIELD_SET = new Set(BARE_VERB_FIELDS);
const SUBJECT_CARRY_PATTERN = new RegExp(
  `(?<!${HEB_CLASS})(?:${wordAlternatives(SUBJECT_CARRY_PREFIXES)})?(?:${wordAlternatives(SUBJECT_CARRY_TOKENS)})(?!${HEB_CLASS})`, 'u');
const FIRST_HEBREW_WORD = new RegExp(`^${HEB_CLASS}+`, 'u');

/**
 * Bare-verb sentence openers in one aboutBlurb / aboutPageBody value (section 19.5): a sentence (start
 * of the field, or after ". ", "? ", "! ") whose first word is exactly an opener, unless it starts with
 * an exclusion phrase or the previous sentence (or, engineer reading of P4, the sentence itself) holds a
 * subject-carry word. Returns the opener indices hit.
 */
export function bareVerbOpenerHits(value: string): number[] {
  const parts = value.split(/(?<=[.?!])\s+/).map(item => item.trim()).filter(Boolean);
  const hits: number[] = [];
  parts.forEach((sentence, index) => {
    const word = FIRST_HEBREW_WORD.exec(sentence)?.[0];
    const opener = word ? BARE_VERB_SENTENCE_OPENERS.indexOf(word) : -1;
    if (opener < 0) return;
    if (BARE_VERB_EXCLUSIONS.some(phrase => sentence.startsWith(phrase))) return;
    if (SUBJECT_CARRY_PATTERN.test(sentence)) return;
    if (index > 0 && SUBJECT_CARRY_PATTERN.test(parts[index - 1])) return;
    hits.push(opener);
  });
  return hits;
}

export type ServiceStage = 'emergency' | 'planned' | 'neutral';
/** Service stage from a service slug (section 19.4): lower-case substring; both lists = emergency. */
export function serviceStage(slug: string): ServiceStage {
  const lower = slug.toLowerCase();
  if (EMERGENCY_SERVICE_KINDS.some(kind => lower.includes(kind))) return 'emergency';
  if (PLANNED_SERVICE_KINDS.some(kind => lower.includes(kind))) return 'planned';
  return 'neutral';
}

// ---------------------------------------------------------------------------
// M2a.6: Tamar's section 20 voice rules, Adam's site-wide checks and Yonatan's H1 anchor gate. Every Hebrew
// token is in generationData.ts (byte-exact from the data file). Gates detect; nothing is auto-replaced.
// ---------------------------------------------------------------------------

/** Adam (M2a.6): the per-page signature cap for the group(s) holding the owner's own differentiator; every other group stays at 1. */
export const DIFFERENTIATOR_SIGNATURE_CAP = 2;

/** Signature groups that the owner's own differentiator (usp) carries a token of (Adam: their per-page cap is 2). */
export function differentiatorGroups(ctx: Pick<CopyGateContext, 'ownerFields'>): string[] {
  const usp = ctx.ownerFields?.usp;
  return typeof usp === 'string' ? Object.keys(signatureCounts(usp)) : [];
}

/** Site-wide hero cap (section 20.1): the groups of this hero that already appear in HERO_SIGNATURE_CAP earlier heroes. */
export function heroSignatureCapGroups(headline: string, prior: readonly string[]): string[] {
  return Object.keys(signatureCounts(headline)).filter(group => prior.filter(other => signatureCounts(other)[group]).length >= HERO_SIGNATURE_CAP);
}

/** Section 20.1: an aboutPageHeadline byte-identical (after trimming) to an earlier page's. */
export function duplicateAboutHeadline(headline: string, prior: readonly string[]): boolean {
  const own = headline.trim();
  return Boolean(own) && prior.some(other => other.trim() === own);
}

/** Section 20.2: the first three whitespace tokens of aboutPageBody, punctuation stripped from the third; null with fewer than three. */
export function aboutOpeningKey(body: string): string | null {
  const tokens = body.trim().split(/\s+/).filter(Boolean).slice(0, 3);
  if (tokens.length < 3) return null;
  tokens[2] = tokens[2].replace(/\p{P}/gu, '');
  return tokens.join(' ');
}

/** Section 20.2: this aboutPageBody opens with the same three words as an earlier page's. */
export function duplicateAboutOpening(body: string, prior: readonly string[]): boolean {
  const key = aboutOpeningKey(body);
  return key !== null && prior.some(other => aboutOpeningKey(other) === key);
}

/** Field-path matchers for a list of data-file field names (`a[].b` matches `a[3].b`). */
function fieldMatchers(names: readonly string[]): RegExp[] {
  return names.map(name => new RegExp(`^${name.includes('[]')
    ? name.split('[]').map(escapeRegExp).join('\\[\\d+\\]')
    : `${escapeRegExp(name)}(?:\\[\\d+\\])?`}$`));
}
const STORY_FIELD_PATTERNS = fieldMatchers(STORY_FIELDS);
const MORAL_FIELD_PATTERNS = fieldMatchers(MORAL_FIELDS);
const VAV = '\u05D5';

const STORY_NOUN_PATTERN = new RegExp(
  `(?<!${HEB_CLASS})(?:${wordAlternatives(STORY_NOUN_PREFIXES)})?(?:${wordAlternatives(STORY_CUSTOMER_NOUNS)})(?!${HEB_CLASS})`, 'gu');
const STORY_VERB_PATTERN = new RegExp(
  `(?<!${HEB_CLASS})(?:${wordAlternatives(STORY_VERB_PREFIXES)})?(?:${wordAlternatives(STORY_PAST_VERBS)})(?!${HEB_CLASS})`, 'u');

/**
 * Invented customer story in one string (section 20.2): 'noun_verb' (pattern A: a customer noun, not after a
 * quantifier, with a past verb later in the same clause) and/or 'time_anchor' (pattern B: a clause opening with
 * a past-time anchor, a single vav allowed). Clauses as in section 17.
 */
export function inventedStoryKinds(value: string): Array<'noun_verb' | 'time_anchor'> {
  const kinds = new Set<'noun_verb' | 'time_anchor'>();
  for (const clause of value.split(FREE_CLAUSE_SPLIT)) {
    for (const match of clause.matchAll(STORY_NOUN_PATTERN)) {
      const at = match.index ?? 0;
      const before = wordBefore(clause, at);
      if (before && strippedWordIn(before, STORY_QUANTIFIER_PREFIXES, STORY_QUANTIFIER_EXCLUSIONS)) continue;
      if (STORY_VERB_PATTERN.test(clause.slice(at + match[0].length))) kinds.add('noun_verb');
    }
    const opening = clause.trim();
    if (STORY_TIME_ANCHORS.some(anchor => opening.startsWith(anchor) || opening.startsWith(`${VAV}${anchor}`))) kinds.add('time_anchor');
  }
  return [...kinds];
}

/** The Hebrew word that starts at a position (the shin of a TIME_WORD_TOKENS token). */
function wordAt(value: string, at: number): string {
  return new RegExp(`^${HEB_CLASS}+`, 'u').exec(value.slice(at))?.[0] ?? '';
}

/** True when the hit of a TIME_WORD_TOKENS token at `at` is a time phrase (its last letter starts a BEFORE_TIME_WORD_EXCLUSIONS word). */
function timeWordExcluded(value: string, token: string, at: number): boolean {
  return TIME_WORD_TOKENS.includes(token) && BEFORE_TIME_WORD_EXCLUSIONS.includes(wordAt(value, at + token.length - 1));
}

/** Moral-ending token indices in one string (section 20.2): plain substring, minus the following-word and time-word exclusions. */
export function moralEndingHits(value: string): number[] {
  const hits: number[] = [];
  MORAL_ENDING_TOKENS.forEach((token, index) => {
    for (let at = value.indexOf(token); at >= 0; at = value.indexOf(token, at + token.length)) {
      const after = value.slice(at + token.length);
      if (MORAL_ENDING_FOLLOWING_EXCLUSIONS.some(word => after.startsWith(` ${word}`))) continue;
      if (timeWordExcluded(value, token, at)) continue;
      hits.push(index);
    }
  });
  return hits;
}

const BEFORE_PATTERNS = BEFORE_TOKENS.map(token => ({ token, pattern: new RegExp(`(?<!${HEB_CLASS})${VAV}?${escapeRegExp(token)}`, 'gu') }));

/** "Before" hits in one string (section 20.3): left edge (a single vav allowed), the time-word exclusion on its shin token. */
export function beforeHitCount(value: string): number {
  let count = 0;
  for (const { token, pattern } of BEFORE_PATTERNS) {
    for (const match of value.matchAll(pattern)) {
      const at = (match.index ?? 0) + match[0].length - token.length;
      if (!timeWordExcluded(value, token, at)) count++;
    }
  }
  return count;
}

export type Vertical = 'ac' | 'electric' | 'plumbing';
/** AC vertical (section 20.6): a hyphen segment equal to AC_SEGMENT_KEYWORD, or another keyword as a substring. */
export function isAcSlug(slug: string): boolean {
  const lower = slug.toLowerCase();
  return AC_VERTICAL_SLUG_KEYWORDS.some(keyword => keyword === AC_SEGMENT_KEYWORD ? lower.split('-').includes(keyword) : lower.includes(keyword));
}
/** Vertical of a slug (section 20.4): ac, electric (ELECTRIC_SLUG_KEYWORDS substring), else plumbing. */
export function slugVertical(slug: string): Vertical {
  if (isAcSlug(slug)) return 'ac';
  const lower = slug.toLowerCase();
  return ELECTRIC_SLUG_KEYWORDS.some(keyword => lower.includes(keyword)) ? 'electric' : 'plumbing';
}

const STICKY_WHOLE_PATTERNS = new Map(STICKY_WHOLE_WORDS.map(word => [word,
  new RegExp(`(?<!${HEB_CLASS})[${STICKY_WHOLE_WORD_PREFIXES.join('')}]*${escapeRegExp(word)}(?!${HEB_CLASS})`, 'u')]));

/** The problem words of a vertical plus the general words (section 20.4). */
export function stickyProblemWordsFor(vertical: Vertical): string[] {
  return [...STICKY_PROBLEM_WORDS[vertical], ...STICKY_PROBLEM_WORDS.general];
}

/** Sticky naming (section 20.4): 'bare' (a bare action form) or 'unnamed' (names neither the service nor a problem word). */
export function stickyNamingProblems(value: string, serviceLabel: string | null, vertical: Vertical): Array<'bare' | 'unnamed'> {
  const core = value.trim().replace(/[!.\s]+$/u, '');
  if (STICKY_BARE_FORMS.includes(core)) return ['bare'];
  if (serviceLabel && value.includes(serviceLabel)) return [];
  const named = stickyProblemWordsFor(vertical).some(word => STICKY_WHOLE_PATTERNS.get(word)?.test(value) ?? value.includes(word));
  return named ? [] : ['unnamed'];
}

/** Section 20.5: indices of the serviceDetails descriptions that start with the opener word past the floor(half) cap. */
export function serviceDetailsOpenerOverCap(copy: Record<string, unknown>): number[] {
  const details = Array.isArray(copy.serviceDetails) ? copy.serviceDetails : [];
  const starts = details.flatMap((item, index) => {
    const description = item && typeof item === 'object' ? (item as Record<string, unknown>).description : undefined;
    return typeof description === 'string' && description.trimStart().startsWith(`${SERVICE_DETAILS_OPENER_TOKEN} `) ? [index] : [];
  });
  const cap = Math.floor(details.length / 2);
  return starts.length > cap ? starts.slice(cap) : [];
}

const LEAD_PREFIX_ALT = wordAlternatives(ARRIVE_LOCATE_LEAD_PREFIXES);
const TRADE_GATES = TRADE_TERMS.filter(entry => entry.type !== 'promptOnly').map(entry => ({
  entry,
  pattern: entry.match === 'leadVerb'
    ? new RegExp(`(?<!${HEB_CLASS})(?:${LEAD_PREFIX_ALT})?(?:${wordAlternatives(entry.leadVerbs ?? [])}) (?:${wordAlternatives(entry.tokens)})(?!${HEB_CLASS})`, 'gu')
    : entry.match === 'wholeWord'
      ? new RegExp(`(?<!${HEB_CLASS})[${entry.prefixLetters.join('')}]*(?:${wordAlternatives(entry.tokens)})(?!${HEB_CLASS})`, 'gu')
      : new RegExp(wordAlternatives(entry.tokens), 'gu'),
}));
const AC_SEWAGE_ID = 'ac_sewage';
const NEXT_WORD = new RegExp(`^\\s+(${HEB_CLASS}+)`, 'u');

/** Trade-term gate ids hit by one string (section 20.6); acOnly entries only on an AC page. */
export function tradeTermHits(value: string, acPage: boolean): string[] {
  const hits: string[] = [];
  for (const { entry, pattern } of TRADE_GATES) {
    if (entry.acOnly && !acPage) continue;
    const hit = [...value.matchAll(pattern)].some(match => {
      const at = match.index ?? 0;
      if (entry.match === 'leadVerb') {
        const next = NEXT_WORD.exec(value.slice(at + match[0].length))?.[1];
        return !(next && ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS.includes(next));
      }
      // Noa (ac_sewage): ignored when its replacement word (the condensate drain) is earlier in the same clause (section 17 clauses).
      if (entry.id === AC_SEWAGE_ID && (value.slice(0, at).split(FREE_CLAUSE_SPLIT).pop() ?? '').includes(entry.replacement)) return false;
      return true;
    });
    if (hit) hits.push(entry.id);
  }
  return hits;
}

/** Yonatan (M2a.6): NFC, whitespace runs (NBSP included) to one space, trimmed. No other folding. */
export function normalizeAnchorText(value: string): string {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Yonatan's H1 anchor rule: what the heroHeadline lacks of the page name and city ('name' | 'city' | 'both'), or null. */
export function heroAnchorMissing(headline: string, name: string, city: string | null | undefined): 'name' | 'city' | 'both' | null {
  const hook = normalizeAnchorText(headline);
  const place = city == null ? '' : normalizeAnchorText(city);
  const hasName = hook.includes(normalizeAnchorText(name));
  const hasCity = !place || hook.includes(place);
  return hasName && hasCity ? null : !hasName && !hasCity ? 'both' : !hasName ? 'name' : 'city';
}

/** Section 19 + duplicate-hook gates for one page (owner-voice fields only). */
function voiceGates(copy: Record<string, unknown>, strings: Array<{ field: string; value: string }>, ctx: CopyGateContext): GateViolation[] {
  const out: GateViolation[] = [];
  const signatureSeen: Record<string, number> = {};
  // M2a.6 (Adam): the owner's differentiator group(s) may appear twice per page.
  const differentiator = new Set(differentiatorGroups(ctx));
  const vertical = slugVertical(ctx.pageSlug ?? '');
  const serviceLabel = ctx.pageServiceLabel ?? (Array.isArray(copy.serviceItems) && typeof copy.serviceItems[0] === 'string' ? copy.serviceItems[0] : null);
  let beforeSeen = 0;
  for (const { field, value } of strings) {
    if (!isOwnerVoiceField(field)) continue;
    if (STORY_FIELD_PATTERNS.some(pattern => pattern.test(field))) {
      for (const kind of inventedStoryKinds(value)) out.push({ field, rule: GATE_RULES.inventedStory, actual: `story:${kind}` });
    }
    if (MORAL_FIELD_PATTERNS.some(pattern => pattern.test(field))) {
      for (const index of new Set(moralEndingHits(value))) out.push({ field, rule: GATE_RULES.moralEnding, actual: `moral:${index}` });
    }
    const before = beforeHitCount(value);
    if (before) {
      beforeSeen += before;
      if (beforeSeen > BEFORE_CAP) out.push({ field, rule: GATE_RULES.beforeCap, actual: `before:${beforeSeen}` });
    }
    for (const id of tradeTermHits(value, vertical === 'ac')) out.push({ field, rule: GATE_RULES.tradeTerm, actual: `trade:${id}` });
    if (field === 'stickyBarLine') {
      for (const problem of stickyNamingProblems(value, serviceLabel, vertical)) out.push({ field, rule: GATE_RULES.stickyNaming, actual: `sticky_naming:${problem}` });
    }
    const generic = new Set(genericAdjectiveHits(value, ctx).map(hit => `generic_${hit.kind}:${hit.index}`));
    for (const actual of generic) out.push({ field, rule: GATE_RULES.genericAdjective, actual });
    for (const id of badIdiomHits(value)) out.push({ field, rule: GATE_RULES.badIdiom, actual: `idiom:${id}` });
    for (const [group, count] of Object.entries(signatureCounts(value))) {
      signatureSeen[group] = (signatureSeen[group] ?? 0) + count;
      if (signatureSeen[group] > (differentiator.has(group) ? DIFFERENTIATOR_SIGNATURE_CAP : 1)) out.push({ field, rule: GATE_RULES.signatureRepeat, actual: `signature:${group}` });
    }
    if (BARE_VERB_FIELD_SET.has(field)) {
      for (const index of new Set(bareVerbOpenerHits(value))) out.push({ field, rule: GATE_RULES.bareVerbOpener, actual: `opener:${index}` });
    }
    if (field === 'stickyBarLine') {
      for (const problem of stickyActionProblems(value, copy.heroCta, ctx)) out.push({ field, rule: GATE_RULES.stickyAction, actual: `sticky:${problem}` });
    }
  }
  if (typeof copy.heroHeadline === 'string' && ctx.priorHeroHeadlines?.length) {
    const kind = duplicateHookKind(copy.heroHeadline, ctx.priorHeroHeadlines);
    if (kind) out.push({ field: 'heroHeadline', rule: GATE_RULES.duplicateHook, actual: `duplicate:${kind}` });
  }
  // M2a.6: site-wide checks against the pages generated before this one (route order, home first).
  if (typeof copy.heroHeadline === 'string' && ctx.priorHeroHeadlines?.length) {
    for (const group of heroSignatureCapGroups(copy.heroHeadline, ctx.priorHeroHeadlines)) out.push({ field: 'heroHeadline', rule: GATE_RULES.heroSignatureCap, actual: `hero_cap:${group}` });
  }
  if (typeof copy.aboutPageHeadline === 'string' && ctx.priorAboutPageHeadlines?.length && duplicateAboutHeadline(copy.aboutPageHeadline, ctx.priorAboutPageHeadlines)) {
    out.push({ field: 'aboutPageHeadline', rule: GATE_RULES.duplicateAboutHeadline, actual: 'duplicate:about_headline' });
  }
  if (typeof copy.aboutPageBody === 'string' && ctx.priorAboutPageBodies?.length && duplicateAboutOpening(copy.aboutPageBody, ctx.priorAboutPageBodies)) {
    out.push({ field: 'aboutPageBody', rule: GATE_RULES.duplicateAboutOpening, actual: 'duplicate:about_opening' });
  }
  for (const index of serviceDetailsOpenerOverCap(copy)) out.push({ field: `serviceDetails[${index}].description`, rule: GATE_RULES.serviceDetailsOpener, actual: `opener_cap:${index}` });
  // Yonatan's H1 anchor: heroHeadline holds the exact page name and city (normalised), else the renderer swaps the H1.
  if (typeof copy.heroHeadline === 'string' && ctx.anchorName) {
    const missing = heroAnchorMissing(copy.heroHeadline, ctx.anchorName, ctx.anchorCity);
    if (missing) out.push({ field: 'heroHeadline', rule: GATE_RULES.heroAnchor, actual: `missing:${missing}` });
  }
  return out;
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
  const finishScope = sameDayFinishScope(ctx);
  const freeClasses = ownerFreeClasses(ctx);
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
    for (const id of sameDayHits(value, ctx, finishScope)) out.push({ field, rule: GATE_RULES.claim, actual: `claim:${id}` });
    for (const cls of new Set(freeClaims(value).filter(item => item === null || !freeClasses.has(item)))) {
      out.push({ field, rule: GATE_RULES.claim, actual: `claim:free:${cls ?? 'unscoped'}` });
    }
    for (const kind of new Set(serviceAreaHits(value, ctx).map(hit => hit.kind))) out.push({ field, rule: GATE_RULES.serviceArea, actual: `service_area:${kind}` });
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
      // M2a.4: a field counts once per phrase; the cap is FACT_PHRASE_REPEAT_MAX fields per page.
      phrases.forEach((phrase, index) => {
        if (!phraseMentions(value, phrase)) return;
        phraseSeen[index] += 1;
        if (phraseSeen[index] > FACT_PHRASE_REPEAT_MAX) out.push({ field, rule: GATE_RULES.factRepeat, actual: `phrase:${index}` });
      });
    }
    if (availabilityHit(value, ctx)) out.push({ field, rule: GATE_RULES.availability });
    if (ctx.installPage && arrivalTimeHit(value)) out.push({ field, rule: GATE_RULES.installArrival });
    if (customerKeys.some(pattern => new RegExp(pattern.source, 'u').test(value))) out.push({ field, rule: GATE_RULES.customerSource });
    if (REDUPLICATION_DASH_PATTERN.test(value)) out.push({ field, rule: GATE_RULES.reduplicationDash });
    if (nameSpellingHit(value, ctx)) out.push({ field, rule: GATE_RULES.nameSpelling });
    if (ctx.researchSite && /^serviceDetails\[\d+\]\.description$/.test(field) && value.trim().length < SERVICE_DESCRIPTION_MIN_CHARS) {
      out.push({ field, rule: GATE_RULES.shortDescription });
    }
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
  // M2a.5: section 19 voice gates and the duplicate-hook check (research-bound sites only).
  if (ctx.researchSite) out.push(...voiceGates(copy, strings, ctx));
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
  /** M2a.4: research-bound site page (service description minimum length). */
  researchSite?: boolean;
  /** M2a.5: heroHeadlines of the site's pages generated before this one (duplicate-hook check). */
  priorHeroHeadlines?: readonly string[];
  /** M2a.6: aboutPageHeadline / aboutPageBody of the pages generated before this one. */
  priorAboutPageHeadlines?: readonly string[];
  priorAboutPageBodies?: readonly string[];
  /** M2a.6: slug that decides the vertical (section 20.4 / 20.6). */
  pageSlug?: string;
  /** M2a.6 (Yonatan): the title's search anchor (page.seo.name / page.seo.city). */
  anchorName?: string | null;
  anchorCity?: string | null;
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
    // Same first name as the prompt's self-introduction (lpCopyPrompt.ts): owner name, else business name.
    ownerFirstName: (data.ownerName || data.businessName || '').split(/[\s,]/)[0] || null,
    researchSite: page.researchSite ?? false,
    businessName: typeof data.businessName === 'string' && data.businessName.trim() ? data.businessName.trim() : null,
    priorHeroHeadlines: page.priorHeroHeadlines ?? [],
    priorAboutPageHeadlines: page.priorAboutPageHeadlines ?? [],
    priorAboutPageBodies: page.priorAboutPageBodies ?? [],
    pageSlug: page.pageSlug ?? '',
    anchorName: page.anchorName ?? null,
    anchorCity: page.anchorCity ?? null,
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
      if (id === 'free') {
        const cls = (violation.actual ?? '').split(':')[2];
        return cls === 'unscoped'
          ? `${violation.field} says something is free without saying what; remove the free claim`
          : `${violation.field} says the ${cls.replace('_', ' ')} is free; the owner never said that this is free, remove the free claim (only what the owner said is free may be called free)`;
      }
      if (id === 'price_lock') return `${violation.field} promises that the price is fixed or will not change, or that nothing will be added to it; the owner never stated that, remove the price promise (naming the customer's fear of surprises is fine, promising it away is not)`;
      if (id === 'same_day_finish') return `${violation.field} promises to finish or fix the job the same day; the owner did not state a same-day fix for this service, remove that promise (an owner-stated arrival time is fine)`;
      if (id === 'same_day_arrival') return `${violation.field} promises a same-day arrival; the owner gave no response time, remove that promise`;
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
        return `${violation.field} repeats the proof point "${phrase?.display ?? ''}" in more than ${FACT_PHRASE_REPEAT_MAX} fields of this page (counted wording: ${(phrase?.keys ?? []).map(key => `"${key}"`).join(', ')}; the trust bar, guarantee block and response badge do not count); remove that proof point and its wording from this field entirely and use a different proof point or none`;
      }
      return `${violation.field} repeats the owner fact "${(ctx.factPhrases ?? [])[index] ?? ''}" more than ${FACT_REPEAT_MAX} times on this page; remove it from this field and use a different proof point or none`;
    }
    case GATE_RULES.availability:
      return `${violation.field} writes an availability figure (such as 24/7) that is not in the owner's own words; remove it or use the owner's exact availability wording`;
    case GATE_RULES.installArrival:
      return `${violation.field} states an arrival or response time on an installation page; remove the arrival time from this field (the emergency response time belongs on repair pages only)`;
    case GATE_RULES.customerSource:
      return `${violation.field} turns words from the customer's review into the owner's own claim; remove them (a customer's experience is not the owner's promise)`;
    case GATE_RULES.reduplicationDash:
      return `${violation.field} joins a repeated word with a hyphen or dash; join the two words with a maqaf (\u05BE) and no spaces`;
    case GATE_RULES.nameSpelling:
      return `${violation.field} introduces the owner by a name spelled differently from the owner facts (for example a Latin name written in Hebrew letters); write the name exactly as given, character for character: ${JSON.stringify(ctx.ownerFirstName ?? '')}`;
    case GATE_RULES.serviceArea:
      return `${violation.field} widens the service area beyond the places the owner named (a region, "and surroundings", "the area of", nearby towns); name only these places: ${(ctx.places ?? []).join(' / ')}. A travel distance may be stated as a number, never as "surroundings"`;
    case GATE_RULES.shortDescription:
      return `${violation.field} is shorter than ${SERVICE_DESCRIPTION_MIN_CHARS} characters; write one complete sentence on what this service includes for the customer (at least ${SERVICE_DESCRIPTION_MIN_CHARS} characters, within the limit), without repeating proof points`;
    case GATE_RULES.genericAdjective: {
      const [kind, at] = (violation.actual ?? '').split(':');
      const token = kind === 'generic_phrase' ? GENERIC_ADJECTIVE_PHRASES[Number(at)] : GENERIC_ADJECTIVE_WORDS[Number(at)];
      return `${violation.field} uses the empty quality ${kind === 'generic_phrase' ? 'phrase' : 'word'} ${JSON.stringify(token ?? '')}, which claims quality without saying what the owner does; replace it with the concrete physical action behind it (what he opens, checks, measures, takes apart, shows the customer or cleans up), in verbs. Do not use any other word or phrase from that list either: ${JSON.stringify([...GENERIC_ADJECTIVE_WORDS, ...GENERIC_ADJECTIVE_PHRASES])}`;
    }
    case GATE_RULES.badIdiom: {
      const entry = BAD_IDIOMS.find(item => item.id === (violation.actual ?? '').split(':')[1]);
      if (!entry) return `${violation.field} uses a wrong or non-native idiom; rewrite it in plain native Hebrew`;
      return `${violation.field} uses ${JSON.stringify(entry.tokens)}, which does not mean what is intended (meant: ${entry.meant}); rewrite the whole sentence in plain native Hebrew with this idea: ${JSON.stringify(entry.replacement)}${entry.replacementFeminine ? ` (feminine subject: ${JSON.stringify(entry.replacementFeminine)})` : ''}, keeping every adjective and verb in agreement`;
    }
    case GATE_RULES.signatureRepeat: {
      const group = (violation.actual ?? '').split(':')[1] ?? '';
      const cap = differentiatorGroups(ctx).includes(group) ? DIFFERENTIATOR_SIGNATURE_CAP : 1;
      return `${violation.field} repeats the signature phrase ${JSON.stringify(promptSignatureVariants(group))}, which already appears elsewhere on this page (at most ${cap === 1 ? 'once' : `${cap} times`} per page, in any spelling); remove it from this field and say something new instead: a different owner fact, a consequence for the customer, or a concrete step of the job`;
    }
    case GATE_RULES.duplicateHook:
      return `${violation.field} repeats the hero headline, or its opening hook before the first question mark or em-dash, of another page of this site; write a new headline for this page that opens with this service's own pain or moment, not the same opening`;
    case GATE_RULES.stickyAction: {
      const problem = (violation.actual ?? '').split(':')[1];
      if (problem === 'equals_cta') return `${violation.field} is identical to the hero button label; write a different short action line that contains one of these actions: ${JSON.stringify(STICKY_ACTION_TOKENS.filter(token => !STICKY_ARRIVAL_TOKENS.includes(token) || ownerStatesResponseTime(ctx)))}`;
      if (problem === 'arrival') return `${violation.field} promises an arrival (${JSON.stringify(STICKY_ARRIVAL_TOKENS)}) but the owner gave no response time; use a different action from: ${JSON.stringify(STICKY_ACTION_TOKENS.filter(token => !STICKY_ARRIVAL_TOKENS.includes(token)))}`;
      return `${violation.field} must be a short action line, not a label or a claim; it must contain one of these actions: ${JSON.stringify(STICKY_ACTION_TOKENS.filter(token => !STICKY_ARRIVAL_TOKENS.includes(token) || ownerStatesResponseTime(ctx)))}, and it must differ from the hero button label`;
    }
    case GATE_RULES.bareVerbOpener: {
      const opener = BARE_VERB_SENTENCE_OPENERS[index];
      return `${violation.field} has a sentence that starts with the bare first-person verb ${JSON.stringify(opener ?? '')} with no subject; give that sentence its subject (${JSON.stringify(SUBJECT_CARRY_TOKENS[0] ?? '')}), or join it to a previous sentence that already has it. Never open a sentence or paragraph with a bare verb or a bare-noun fragment`;
    }
    case GATE_RULES.heroSignatureCap: {
      const group = (violation.actual ?? '').split(':')[1] ?? '';
      return `${violation.field} uses the signature phrase ${JSON.stringify(promptSignatureVariants(group))}, which already appears in ${HERO_SIGNATURE_CAP} earlier hero headlines of this site; the owner's differentiator belongs only in the home hero and the one service hero it fits best. Rewrite this headline to lead with this service's own pain or moment, without that phrase or any paraphrase of it`;
    }
    case GATE_RULES.duplicateAboutHeadline:
      return `${violation.field} is identical to the aboutPageHeadline of another page of this site; write a new about headline for this page, about this service`;
    case GATE_RULES.duplicateAboutOpening:
      return `${violation.field} opens with the same first three words as the aboutPageBody of another page of this site; open this page's about body with different words, from this service's own scene`;
    case GATE_RULES.inventedStory: {
      const kind = (violation.actual ?? '').split(':')[1];
      return `${violation.field} narrates a past job${kind === 'time_anchor' ? ' (a clause opens with a past-time phrase)' : ' (a customer did something in the past)'}; the owner never gave a real job story, so this is an invented case study. Rewrite it in the second person, present tense: the reader, in his home, now. No past customer, named or unnamed, and no specific past occasion. Do not use these words for it: ${JSON.stringify([...STORY_CUSTOMER_NOUNS, ...STORY_TIME_ANCHORS])}`;
    }
    case GATE_RULES.moralEnding: {
      const token = MORAL_ENDING_TOKENS[index];
      return `${violation.field} draws a lesson, a motto or a principle (${JSON.stringify(token ?? '')}); end on a fact or on what the customer gets instead. Do not use any of: ${JSON.stringify(MORAL_ENDING_TOKENS)}`;
    }
    case GATE_RULES.beforeCap:
      return `${violation.field} brings this page to more than ${BEFORE_CAP} uses of the "before" construction (${JSON.stringify(BEFORE_TOKENS)}); remove it from this field and show the order of the work with a concrete sequence of steps instead`;
    case GATE_RULES.stickyNaming: {
      const problem = (violation.actual ?? '').split(':')[1];
      const vertical = slugVertical(ctx.pageSlug ?? '');
      const label = ctx.pageServiceLabel;
      return `${violation.field} ${problem === 'bare' ? 'is a bare action with nothing else' : 'names neither the customer\'s problem nor the service'}; the sticky bar must name the problem or the service plus an action: a problem-word question plus an action, or "tell me what the [appliance] is doing". Use one of these problem words${label ? ` or the service name ${JSON.stringify(label)}` : ''}: ${JSON.stringify(stickyProblemWordsFor(vertical))}`;
    }
    case GATE_RULES.serviceDetailsOpener:
      return `${violation.field} starts with ${JSON.stringify(SERVICE_DETAILS_OPENER_TOKEN)} like more than half of this page's service descriptions; start this one with the action or the object instead`;
    case GATE_RULES.tradeTerm: {
      const entry = TRADE_TERMS.find(item => item.id === (violation.actual ?? '').split(':')[1]);
      if (!entry) return `${violation.field} uses a wrong trade term; rewrite it with the correct term`;
      return `${violation.field} uses ${JSON.stringify(entry.match === 'leadVerb' ? (entry.leadVerbs ?? []).map(verb => `${verb} ${entry.tokens[0]}`) : entry.tokens)}, which is the wrong ${entry.type === 'spellingFix' ? 'spelling' : 'term'} (meant: ${entry.meant}); rewrite the whole sentence in plain native Hebrew with this idea: ${JSON.stringify(entry.replacement)}, keeping every word in agreement`;
    }
    case GATE_RULES.heroAnchor: {
      const missing = (violation.actual ?? '').split(':')[1];
      const name = JSON.stringify(ctx.anchorName ?? '');
      const city = ctx.anchorCity ? JSON.stringify(ctx.anchorCity) : null;
      return `${violation.field} is missing ${missing === 'both' ? 'the page name and the city' : missing === 'city' ? 'the city' : 'the page name'} of this page's search anchor; keep the opening hook clause exactly as it is, then add the exact page name ${name}${city ? ` and the exact city ${city}` : ''} in the next clause, character for character, and stay within the heroHeadline length limit stated for this field (shorten the rest of the headline, never the anchor)`;
    }
    default:
      return `${violation.field}: ${violation.rule}`;
  }
}
