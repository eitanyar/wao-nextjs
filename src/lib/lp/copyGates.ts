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
import { buildLpCopyPrompt } from './lpCopyPrompt';
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
  DIFFERENTIATOR_CAP,
  DIFFERENTIATOR_EXCLUDED_GROUPS,
  DIFFERENTIATOR_FEAR_KEYWORDS,
  DIFFERENTIATOR_SOURCE_FIELDS_ADD,
  DIFFERENTIATOR_USP_KEYWORDS,
  SERVICES_HEADLINE_OPTIONS,
  TRUST_BAR_FILLER_PHRASES,
  TRUST_BAR_MAX_CHARS,
  TRUST_BAR_MAX_ITEMS,
  ELECTRIC_SLUG_KEYWORDS,
  EXTRA_GATE_FIELDS,
  HERO_CAP_AC_ONLY,
  HERO_CAP_CONCEPT_ADDITIONS,
  NAME_INTRO_LEAD_INS,
  NAME_INTRO_TOKEN,
  PREPOSITION_PAIR_NEXT_LETTER,
  PREPOSITION_SKIP_ADVERBS,
  WRONG_PREPOSITION_TOKENS,
  HERO_SIGNATURE_CAP,
  MORAL_ENDING_FOLLOWING_EXCLUSIONS,
  MORAL_ENDING_TOKENS,
  MORAL_FIELDS,
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
  ABOUT_CARD_ECHO_MIN_WORDS,
  CARD_PHRASE_ECHO_MIN_LETTERS,
  CARD_PHRASE_ECHO_MIN_WORDS,
  CITY_PREFIX_LETTERS,
  CITY_PREFIX_LIST_JOINS,
  FACT_PHRASE_EXEMPT_FIELDS_RESEARCH,
  PLACE_LIST_BUILD,
  USP_TOOL_GROUPS,
  WARRANTY_DEFINITE_BARE_DURATION,
} from './generationData';
import { PREFIX_LETTERS } from './hebrewPrefixLetters';
import { factRestatementHits, proseSentences, type FactRestatementSpec } from './factRestatement';
import { fearPromiseMatches, sameDayOutOfScope, type FearPromiseSpec, type SameDayScopeSpec } from './claimScope';
import {
  DEPTH_REFERENCE_KEYS,
  factTraceHits,
  stemSet,
  termDensityHits,
  visibleCopyStrings,
  visibleWordCount,
  type FactTraceKind,
} from './depthBlocks';
import {
  CAMERA_SATISFIES_ONLY,
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
  WARRANTY_SPELLED_DURATION_SOURCE,
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
  tradeTerm: 'gate_trade_term',
  heroAnchor: 'gate_hero_anchor',
  // M2a.7 (Noa section 20.6 typo gates)
  tripledLetter: 'gate_tripled_letter',
  wrongPreposition: 'gate_wrong_preposition',
  // M2b.1d (Tamar section 22.2)
  servicesHeadlineSet: 'gate_services_headline_set',
  aboutHeadlinePromise: 'gate_about_headline_promise',
  trustBarFiller: 'gate_trust_bar_filler',
  trustBarSize: 'gate_trust_bar_size',
  // M2b.1g (Tamar section 23.2; Yonatan's about-headline place guard)
  uspToolRequired: 'gate_usp_tool_required',
  foreignTool: 'gate_foreign_tool',
  aboutHeadlineTrustRepeat: 'gate_about_headline_trust_repeat',
  aboutHeadlinePlaces: 'gate_about_headline_places',
  aboutCardEcho: 'gate_about_card_echo',
  cardPhraseEcho: 'gate_card_phrase_echo',
  warrantyDefinite: 'gate_warranty_definite_bare_duration',
  // M2b.1h (pitch-first copy): block verbatim repetition across fields; no foreign script in any generated field.
  phraseRepeat: 'gate_phrase_repeat',
  foreignScript: 'gate_foreign_script',
  // 2026-11-10 generator fixes (Tamar's clause budget; Noa's pattern A as a warning).
  clauseRepeat: 'gate_clause_repeat',
  subjectPronoun: 'gate_subject_pronoun',
  // Content depth (2026-11-10): every service-page block item traces to the owner facts it cites; NeuronWriter terms stay
  // within their suggested usage.
  factTrace: 'gate_fact_trace',
  termDensity: 'gate_term_density',
  // Copy v2 slice 4: a model field restates an owner fact the code already shows (trust bar, proof, prices).
  factRestatement: 'gate_fact_restatement',
  /** Copy v2 slice 6: a model-written Q&A answer names the business (the code-built lead already does). */
  qaBrandInAnswer: 'gate_qa_brand_in_answer',
  /** Rerun-3 item 4: a sentence negates a word of the owner's fear that his usp / guarantee does not (claimScope.ts). */
  fearPromise: 'gate_fear_promise',
  /** Rerun-3 item 5: a same-day word without a response fact, in a sentence naming no place of the owner's response tail. */
  sameDayScope: 'gate_same_day_scope',
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
  /**
   * M2a.7: the copy fields the research-site renderer shows (RESEARCHED_RENDERED_FIELDS in researchedSite.ts). When set, a
   * hit on any other field is a warning, except ALWAYS_BLOCKING_RULES; unset (legacy sites) = every hit blocks.
   */
  renderedFields?: readonly string[];
  /** M2a.7: hero-cap facts (masked service labels, AC page) of every page already generated, aligned with priorHeroHeadlines. */
  priorHeroFacts?: readonly HeroCapPageFacts[];
  /**
   * M2b.1d (Tamar's cost note, Adam-approved): top-level fields this page does not generate, because its page type does not
   * render them (the about section and the service cards off the homepage / services hub). The system fills them; no gate
   * runs on them.
   */
  ungeneratedFields?: readonly string[];
  /**
   * Copy v2 slice 2 (code owns the facts): top-level fields the code builds from owner facts through fixed templates
   * (trustBarItems, proofItems, proofHeadline; researchPageCopy CODE_OWNED_FACT_FIELDS). Set only while the fact templates
   * are complete. No gate hit ever lands on them (the per-page GATE_EXEMPT_FIELDS); their text still counts as a source
   * where a gate compares other fields against the page. Unset = today's model-written path.
   */
  codeOwnedFields?: readonly string[];
  /**
   * M2b.1h (pitch-first pages): the promise may be restated in fresh words, so the two-word phrase cap (gate_fact_repeat
   * `phrase:` hits) is a warning here; the digit cap (`fact:`) and the verbatim phrase gate (gate_phrase_repeat) still block.
   */
  promiseRestatement?: boolean;
  /**
   * M2b.1h: the rendered fields (gated and warn-only) that gate_phrase_repeat compares. Unset = the gate is off. System-set
   * strings are never compared (heroCta, servicesHeadline, serviceDetails[].name, the area tile, FAQ, review).
   */
  phraseRepeatFields?: readonly string[];
  /**
   * Content depth (service pages): the brief's citable owner facts, its question-pool IDs and its NeuronWriter terms. Set =
   * the fact-trace and term-density gates run on the depth blocks; unset (every other page and legacy sites) = off.
   */
  depth?: CopyGateDepth;
  /**
   * Copy v2 slice 4: the code-owned owner facts (digits and phrases) no model field may restate (factRestatement.ts). Set only
   * while code owns the facts; unset = the gate is off (today's path).
   */
  factRestatement?: FactRestatementSpec;
  /**
   * Copy v2 slice 6: the Q&A of a code-owned page. The first `codeItems` qaItems are code-built (whole items code-owned) and
   * every item's `q` is the pool question (code-owned); no gate hit lands on them. Set only while code owns the facts.
   */
  qaCodeOwnership?: QaCodeOwnership;
  /** Copy v2 slice 6: the page's qaAnswerLead (removed before gate_qa_brand_in_answer reads an answer). */
  qaAnswerLead?: string | null;
  /** Rerun-3 item 4: gate_fear_promise inputs (unset = off). */
  fearPromise?: FearPromiseSpec;
  /** Rerun-3 item 5: gate_same_day_scope inputs (unset = off: the owner has a response fact). */
  sameDayScope?: SameDayScopeSpec;
  /**
   * Rerun-3b bug B: every field this page renders, the warn-only ones included (researchedRenderedFieldsFor). A
   * CLAIM_SCOPE_GATE_RULES hit in one of them always blocks (so it is dropped where the field allows it, else one repair,
   * then the page fails); a hit in an unrendered field is a warning. Unset = the renderedFields rule below applies.
   */
  claimScopeFields?: readonly string[];
}

/** Content depth gate inputs (see CopyGateContext.depth). */
export interface CopyGateDepth {
  factTexts: Readonly<Record<string, string>>;
  questionIds: readonly string[];
  terms: ReadonlyArray<{ t: string; min: number; max: number }>;
}

/** M2a.7: what the site-wide hero cap needs of one page: the service labels masked in its hero, and whether it is an AC page. */
export interface HeroCapPageFacts {
  maskLabels: readonly string[];
  acPage: boolean;
}

/** One non-blocking finding for human review (never copy text). */
export interface GateReviewFlag {
  field: string;
  flag: 'arrival_time_in_installation_heading';
}

const HEBREW_LETTER = '\u05D0-\u05EA';
const HEBREW = new RegExp(`[${HEBREW_LETTER}]`);
// vav, shin, he, bet, kaf, lamed, mem: the attachable prefix letters (M2b.1g: defined in hebrewPrefixLetters.ts).
export { PREFIX_LETTERS };

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

/** M2b.1d: the gated strings of the fields this page generates (ctx.ungeneratedFields are system-filled and never gated). */
function generatedStrings(copy: Record<string, unknown>, ctx: Pick<CopyGateContext, 'ungeneratedFields'>): Array<{ field: string; value: string }> {
  const skip = ctx.ungeneratedFields ?? [];
  return gatedStrings(copy).filter(item => !skip.includes(item.field.split(/[.[]/)[0]));
}

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
            // Content depth: factIds / questionId are references to the brief, never page copy.
            if (DEPTH_REFERENCE_KEYS.includes(inner)) continue;
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

/**
 * The owner's customer quote as it may be shown on a research site: verbatim and mostly Hebrew; else null.
 * 2026-11-10 (reviewQuote bug): the legacy LP bot's "no reviews" check (hasRealReviewQuote: the quote contains the
 * no-word marker anywhere) is not applied here. It nulled real praise that uses that common word, and the Site-Bot
 * intake never asks the free-text yes / no review turn; an explicit "no trust assets" answer still means no quote.
 */
export function effectiveReviewQuote(data: CollectedData): string | null {
  const quote = typeof data.reviewQuote === 'string' ? data.reviewQuote.trim() : '';
  return quote && data.hasTrustAssets !== false && isMostlyHebrew(quote) ? quote : null;
}

/** Why an owner quote that exists is not shown on a research site (null: shown, or there is none). */
export function reviewQuoteDropReason(data: CollectedData, maxChars: number): 'not_hebrew' | 'too_long' | 'no_trust_assets' | null {
  const quote = typeof data.reviewQuote === 'string' ? data.reviewQuote.trim() : '';
  if (!quote) return null;
  if (data.hasTrustAssets === false) return 'no_trust_assets';
  if (!isMostlyHebrew(quote)) return 'not_hebrew';
  return quote.length > maxChars ? 'too_long' : null;
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

// ---------------------------------------------------------------------------
// M2b.1g (section 23.2 e): place lists. A place matches with up to three attached prefix letters; a space, an ASCII
// hyphen and a maqaf are the same separator inside a place name (as in placeHyphenHit). A later place belongs to the
// previous place's list only through a CITY_PREFIX_LIST_JOINS join: ", ", or one space with the place's prefix starting
// with the conjunction letter. The list's locative letter is the last letter of the first place's prefix (one of
// CITY_PREFIX_LETTERS); every later place's prefix must end with that same letter.
// ---------------------------------------------------------------------------

const PLACE_SEPARATOR = '[\\s\\-\u05BE]+';
const [LIST_SEPARATOR, LIST_CONJUNCTION_JOIN] = CITY_PREFIX_LIST_JOINS;
const LIST_CONJUNCTION_SPACE = LIST_CONJUNCTION_JOIN.slice(0, 1);
const LIST_CONJUNCTION = LIST_CONJUNCTION_JOIN.slice(1);
if (LIST_CONJUNCTION_SPACE !== ' ' || LIST_CONJUNCTION !== PLACE_LIST_BUILD.lastJoin) throw new Error('copyGates: the city-prefix list joins changed; update the place-list code');
const LOCATIVE_LETTERS: ReadonlySet<string> = new Set(CITY_PREFIX_LETTERS);

function placeListPattern(place: string): RegExp {
  const body = place.trim().split(/[\s\-\u05BE]+/).filter(Boolean).map(escapeRegExp).join(PLACE_SEPARATOR);
  return new RegExp(`(?<!${HEB_CLASS})([${PREFIX_LETTERS}]{0,3}?)${body}(?!${HEB_CLASS})`, 'gu');
}

/** One owner place found in a text: its span (prefix letters included), the attached prefix and the owner's display name. */
export interface PlaceHit { start: number; end: number; prefix: string; place: string }

/** Owner Hebrew places in a text, in order; a hit inside a longer hit is dropped. */
export function placeHits(text: string, places: readonly string[]): PlaceHit[] {
  const hits: PlaceHit[] = [];
  for (const place of [...new Set(places.map(item => item.trim()))].filter(item => HEBREW.test(item))) {
    for (const match of text.matchAll(placeListPattern(place))) hits.push({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length, prefix: match[1] ?? '', place });
  }
  const kept = hits.filter(hit => !hits.some(other => other !== hit && other.end - other.start > hit.end - hit.start && other.start <= hit.start && other.end >= hit.end));
  return kept.sort((a, b) => a.start - b.start).filter((hit, index, all) => index === 0 || hit.start !== all[index - 1].start);
}

function joinsList(text: string, previous: PlaceHit, current: PlaceHit): boolean {
  const between = text.slice(previous.end, current.start);
  return between === LIST_SEPARATOR || (between === LIST_CONJUNCTION_SPACE && current.prefix.startsWith(LIST_CONJUNCTION));
}

/** Place lists of a text (section 23.2 e): runs of owner places joined only by the list joins. A single place is a list of one. */
export function placeLists(text: string, places: readonly string[]): PlaceHit[][] {
  const lists: PlaceHit[][] = [];
  for (const hit of placeHits(text, places)) {
    const last = lists[lists.length - 1];
    if (last && joinsList(text, last[last.length - 1], hit)) last.push(hit);
    else lists.push([hit]);
  }
  return lists;
}

/** The locative letter of a prefix: its last letter, when that is one of CITY_PREFIX_LETTERS; else null. */
function locativeOf(prefix: string): string | null {
  const letter = prefix.slice(-1);
  return LOCATIVE_LETTERS.has(letter) ? letter : null;
}

/**
 * city_prefix (item 10, M2b.1g section 23.2 e): in a list of known places whose first place carries a locative prefix
 * (bet, lamed or mem), every later place in that list must carry the same letter at the end of its prefix.
 */
function cityPrefixHit(value: string, places: readonly string[]): boolean {
  if (places.filter(place => HEBREW.test(place)).length < 2) return false;
  return sentences(value).some(sentence => placeLists(sentence, places).some(list => {
    const letter = list.length > 1 ? locativeOf(list[0].prefix) : null;
    return Boolean(letter) && list.slice(1).some(hit => hit.prefix.slice(-1) !== letter);
  }));
}

/**
 * A place list built from the area array (section 23.2 e, placeListBuild): `letter` on every place, joined with the
 * separator and a final conjunction ("A, B and C"). Plain concatenation is correct for every town (ba-initial ones too).
 */
export function buildPlaceList(places: readonly string[], letter = ''): string {
  const names = places.map(place => place.trim()).filter(Boolean);
  if (names.length <= 1) return names.length ? `${letter}${names[0]}` : '';
  const head = names.slice(0, -1).map(name => `${letter}${name}`).join(PLACE_LIST_BUILD.separator);
  return `${head}${LIST_CONJUNCTION_SPACE}${PLACE_LIST_BUILD.lastJoin}${letter}${names[names.length - 1]}`;
}

/**
 * The trust-bar area tile (section 23.2 e): the owner's places, base city first, with no prefix. M2b.1g engineer rule:
 * when the whole list is longer than `maxChars` code points, the longest leading run that fits (the base city always
 * leads; the full list still renders in the service-areas section and schema). Null when nothing fits or no place.
 */
export function buildAreaTile(places: readonly string[], maxChars: number): string | null {
  const names = places.map(place => place.trim()).filter(Boolean);
  for (let count = names.length; count > 0; count--) {
    const tile = buildPlaceList(names.slice(0, count), PLACE_LIST_BUILD.trustTilePrefix);
    if (codePointLength(tile) <= maxChars) return tile;
  }
  return null;
}

/** True when a trust-bar item is only a list of owner places (no other word): a model-written area tile. */
export function isAreaTile(item: string, places: readonly string[]): boolean {
  const hits = placeHits(item, places);
  if (!hits.length) return false;
  let rest = item;
  for (const hit of [...hits].reverse()) rest = `${rest.slice(0, hit.start)} ${rest.slice(hit.end)}`;
  return rest.replace(/[\s,]/g, '') === '';
}

/**
 * The badge place part built in code (section 23.2 e): every multi-place list whose first place carries a locative prefix
 * is rebuilt from the owner's place names with that letter on every place (the first place keeps any conjunction before
 * its letter). Only the list span changes; the rest of the string is untouched.
 */
export function withPlaceListPrefixes(value: string, places: readonly string[]): string {
  let out = value;
  for (const list of placeLists(value, places).reverse()) {
    const letter = list.length > 1 ? locativeOf(list[0].prefix) : null;
    if (!letter) continue;
    const rebuilt = `${list[0].prefix.slice(0, -1)}${buildPlaceList(list.map(hit => hit.place), letter)}`;
    out = `${out.slice(0, list[0].start)}${rebuilt}${out.slice(list[list.length - 1].end)}`;
  }
  return out;
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
/**
 * M2a.7 (Noa section 21): the name opener is a homograph, so it is a name intro only at a sentence start (the start of
 * the field, or right after ". ", "? " or "! ") or right after a NAME_INTRO_LEAD_INS entry (a whole word) plus ", ".
 * Whole word, no prefix letters. The same position rule makes it a subject-carry word (section 19.5).
 */
const NAME_INTRO_POSITION = `(?:^\\s*|(?<=[.?!] )|(?<=(?<!${HEB_CLASS})(?:${[...NAME_INTRO_LEAD_INS].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')}), ))`;
const NAME_OPENER_PATTERN = NAME_INTRO_TOKEN ? new RegExp(`${NAME_INTRO_POSITION}${escapeRegExp(NAME_INTRO_TOKEN)}\\s+([^\\s,.;:!?\u2014]+)`, 'gu') : null;
/** M2a.7: the name opener as a subject-carry word: same position rule, whole word. */
const NAME_INTRO_CARRY_PATTERN = new RegExp(`${NAME_INTRO_POSITION}${escapeRegExp(NAME_INTRO_TOKEN)}(?!${HEB_CLASS})`, 'u');

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

/** Copy v2 slice 6: what the gates and the budget treat as code-owned in qaItems (see CopyGateContext.qaCodeOwnership). */
export interface QaCodeOwnership {
  codeItems: number;
}

/** True when a field path is code-owned under the Q&A ownership (a code-built item, or any item's question). */
export function isCodeOwnedQaField(field: string, ownership: QaCodeOwnership | undefined): boolean {
  if (!ownership) return false;
  const match = /^qaItems\[(\d+)\](?:\.(\w+))?$/.exec(field);
  if (!match) return false;
  return Number(match[1]) < ownership.codeItems || match[2] === 'q';
}

/** An answer without a leading qaAnswerLead (a record that already carries it, settled again). */
export function withoutQaLead(answer: string, lead: string | null | undefined): string {
  if (!lead) return answer;
  const text = answer.trimStart();
  return text.startsWith(lead) ? text.slice(lead.length).trimStart() : answer;
}

/** Copy v2 slice 6: gate_qa_brand_in_answer on the model-written answers (code-built items are skipped). */
function qaBrandHits(copy: Record<string, unknown>, ctx: CopyGateContext): GateViolation[] {
  const name = (ctx.businessName ?? '').normalize('NFC').trim().toLowerCase();
  const items = copy.qaItems;
  const ownership = ctx.qaCodeOwnership;
  if (!ownership || !name || !Array.isArray(items)) return [];
  const out: GateViolation[] = [];
  items.forEach((item, index) => {
    if (index < ownership.codeItems || !item || typeof item !== 'object') return;
    const answer = (item as Record<string, unknown>).a;
    if (typeof answer === 'string' && withoutQaLead(answer, ctx.qaAnswerLead).normalize('NFC').toLowerCase().includes(name)) {
      out.push({ field: `qaItems[${index}].a`, rule: GATE_RULES.qaBrandInAnswer });
    }
  });
  return out;
}

/** Hits on code-owned fields (top-level code-built fields, code-built Q&A items, every Q&A question) are dropped. */
function withoutCodeOwnedHits<T extends { field: string }>(hits: T[], ctx: Pick<CopyGateContext, 'codeOwnedFields' | 'qaCodeOwnership'>): T[] {
  const owned = ctx.codeOwnedFields ?? [];
  if (!owned.length && !ctx.qaCodeOwnership) return hits;
  return hits.filter(hit => !owned.includes(topFieldOf(hit.field)) && !isCodeOwnedQaField(hit.field, ctx.qaCodeOwnership));
}

function countMatches(value: string, pattern: RegExp): number {
  return (value.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) ?? []).length;
}

// ---------------------------------------------------------------------------
// M2a.5: Tamar's section 19 voice rules (docs/copy/site-bot-generation-data.md). Every token list is
// in generationData.ts; owner-voice fields only. Gates detect; nothing is ever auto-replaced.
// ---------------------------------------------------------------------------

/**
 * M2b.1h: the story section (storyHeadline / storyBody, homepage) and the unrendered pitch are owner-voice fields too, so the
 * voice gates (and the invented-story truth gate) reach them. Engineer-placed extension of the data list; story hits stay
 * warnings while the story fields are warn-only, and only the truth gates ever run on the pitch (PITCH_GATE_RULES).
 */
export const M2B1H_VOICE_FIELDS: readonly string[] = ['storyHeadline', 'storyBody', 'pitch'];
const VOICE_FIELD_PATTERNS = [...OWNER_VOICE_FIELDS, ...M2B1H_VOICE_FIELDS].map(name => new RegExp(`^${name.includes('[]')
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
// M2a.7 (section 21): the name-intro token carries the subject only by NAME_INTRO_CARRY_PATTERN; the others keep the 19.5 rule.
const PRONOUN_CARRY_PATTERN = new RegExp(
  `(?<!${HEB_CLASS})(?:${wordAlternatives(SUBJECT_CARRY_PREFIXES)})?(?:${wordAlternatives(SUBJECT_CARRY_TOKENS.filter(token => token !== NAME_INTRO_TOKEN))})(?!${HEB_CLASS})`, 'u');
const SUBJECT_CARRY_PATTERN = { test: (sentence: string): boolean => PRONOUN_CARRY_PATTERN.test(sentence) || NAME_INTRO_CARRY_PATTERN.test(sentence) };
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

/** The per-page signature cap for the group(s) holding the owner's own differentiator (section 20.1, M2a.7); every other group stays at 1. */
export const DIFFERENTIATOR_SIGNATURE_CAP: number = DIFFERENTIATOR_CAP;

/**
 * Owner fields the differentiator is read from (section 20.1, M2a.7: the guarantee too, when it states a work method;
 * M2b.1d, section 22.2: the customer's fear, DIFFERENTIATOR_SOURCE_FIELDS_ADD).
 */
export const DIFFERENTIATOR_SOURCE_FIELDS: readonly string[] = ['usp', 'guarantee', ...DIFFERENTIATOR_SOURCE_FIELDS_ADD];
/** M2b.1d: the source fields whose English text is matched on word boundaries (the fear), not as plain substrings. */
const WORD_BOUNDARY_SOURCE_FIELDS: readonly string[] = DIFFERENTIATOR_SOURCE_FIELDS_ADD;
/**
 * M2b.1d (Adam): an English fear keyword matches on word boundaries, so "mess" never matches inside "message". The word
 * may end in one of these suffixes (plural, -y, past), so "messes", "messy", "tiles" and "surprises" still match.
 */
export const FEAR_KEYWORD_SUFFIXES: readonly string[] = ['s', 'es', 'y', 'd', 'ed'];
const FEAR_SUFFIX_ALT = `(?:${FEAR_KEYWORD_SUFFIXES.join('|')})?`;
const englishKeywordPattern = (keyword: string) => new RegExp(`(?<![a-z])${escapeRegExp(keyword)}${FEAR_SUFFIX_ALT}(?![a-z])`);
const FEAR_KEYWORD_GROUPS: ReadonlyArray<[string, RegExp[]]> = [...new Set([...Object.keys(DIFFERENTIATOR_USP_KEYWORDS), ...Object.keys(DIFFERENTIATOR_FEAR_KEYWORDS)])]
  .map(group => [group, [...(DIFFERENTIATOR_USP_KEYWORDS[group] ?? []), ...(DIFFERENTIATOR_FEAR_KEYWORDS[group] ?? [])].map(englishKeywordPattern)]);

/** M2b.1d: the signature groups an English fear names (lower-cased, hyphens to spaces; usp + fear keywords, word boundaries). */
export function fearKeywordGroups(fear: string): string[] {
  const english = fear.toLowerCase().replace(/-/g, ' ');
  return FEAR_KEYWORD_GROUPS.filter(([, patterns]) => patterns.some(pattern => pattern.test(english))).map(([group]) => group);
}

/**
 * Signature groups holding the owner's own differentiator (section 20.1, M2a.7; M2b.1d: the fear too, English keywords on
 * word boundaries): a Hebrew usp / guarantee / fear with a section
 * 19.3 / 20.1 variant of the group, or an English one with a DIFFERENTIATOR_USP_KEYWORDS entry of the group (case-insensitive
 * substring, hyphens read as spaces). A keyword only states a work method, so a guarantee that matches one states a method.
 * DIFFERENTIATOR_EXCLUDED_GROUPS never count. Returned in signature-group order.
 */
export function differentiatorGroups(ctx: Pick<CopyGateContext, 'ownerFields'>): string[] {
  const found = new Set<string>();
  for (const key of DIFFERENTIATOR_SOURCE_FIELDS) {
    const value = ctx.ownerFields?.[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    for (const group of Object.keys(signatureCounts(value))) found.add(group);
    if (WORD_BOUNDARY_SOURCE_FIELDS.includes(key)) {
      for (const group of fearKeywordGroups(value)) found.add(group);
      continue;
    }
    const english = value.toLowerCase().replace(/-/g, ' ');
    for (const [group, keywords] of Object.entries(DIFFERENTIATOR_USP_KEYWORDS)) if (keywords.some(keyword => english.includes(keyword))) found.add(group);
  }
  for (const group of DIFFERENTIATOR_EXCLUDED_GROUPS) found.delete(group);
  return Object.keys(SIGNATURE_GROUPS).filter(group => found.has(group));
}

/** A hero with the given service labels masked (longest first), so an entry inside the page's own label never counts. */
function maskHeroLabels(headline: string, labels: readonly string[]): string {
  let out = headline;
  for (const label of [...labels].map(item => item.trim()).filter(Boolean).sort((a, b) => b.length - a.length)) out = out.split(label).join(VOICE_MASK);
  return out;
}

/**
 * Signature groups one hero counts for in the site-wide hero cap (section 20.1, M2a.7): the page's own service label(s)
 * masked first, then the per-page signature variants plus HERO_CAP_CONCEPT_ADDITIONS (plain substring; HERO_CAP_AC_ONLY
 * entries only on an AC page).
 */
export function heroCapGroups(headline: string, facts: HeroCapPageFacts = { maskLabels: [], acPage: false }): string[] {
  const masked = maskHeroLabels(headline, facts.maskLabels);
  const groups = new Set(Object.keys(signatureCounts(masked)));
  for (const [group, entries] of Object.entries(HERO_CAP_CONCEPT_ADDITIONS)) {
    if (entries.some(entry => (facts.acPage || !HERO_CAP_AC_ONLY.includes(entry)) && masked.includes(entry))) groups.add(group);
  }
  return Object.keys(SIGNATURE_GROUPS).filter(group => groups.has(group));
}

/** Hero-cap facts of the page being gated: its own label (homepage: every serviceItems label) and its vertical. */
export function currentHeroCapFacts(copy: Record<string, unknown>, ctx: Pick<CopyGateContext, 'pageServiceLabel' | 'serviceLabels' | 'pageSlug'>): HeroCapPageFacts {
  const items = Array.isArray(copy.serviceItems) ? copy.serviceItems.filter((item): item is string => typeof item === 'string') : [];
  return {
    maskLabels: ctx.pageServiceLabel ? [ctx.pageServiceLabel] : items.length ? items : [...ctx.serviceLabels],
    acPage: slugVertical(ctx.pageSlug ?? '') === 'ac',
  };
}

/**
 * Site-wide hero cap (section 20.1): the groups of this hero that already appear in HERO_SIGNATURE_CAP earlier heroes.
 * M2a.7: groups per heroCapGroups(); `priorFacts` aligns with `prior` (a missing entry uses this page's facts).
 */
export function heroSignatureCapGroups(headline: string, prior: readonly string[], facts?: HeroCapPageFacts, priorFacts: readonly HeroCapPageFacts[] = []): string[] {
  const own = facts ?? { maskLabels: [], acPage: false };
  const earlier = prior.map((other, index) => heroCapGroups(other, priorFacts[index] ?? { maskLabels: own.maskLabels, acPage: own.acPage }));
  return heroCapGroups(headline, own).filter(group => earlier.filter(groups => groups.includes(group)).length >= HERO_SIGNATURE_CAP);
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

// ---------------------------------------------------------------------------
// M2b.1d: Tamar's section 22.2 gates (about headline, services headline closed set, trust bar). Hebrew data from
// generationData.ts; nothing is auto-replaced except the services headline, which withSystemFields sets from the set.
// ---------------------------------------------------------------------------

/**
 * aboutHeadlineNoPromise (section 22.2): what makes an about headline repeat the hero's promise. 'signature:<group>' for a
 * section 19.3 / 20.1 variant (tile-breaking forms included); 'concept:<group>' for a heroCapConceptAdditions entry, after
 * masking the page's own service label(s) (homepage: every serviceItems label), AC-only entries only on an AC page;
 * 'before' for a beforeTokens hit (left edge, time-word exclusion). Each kind once; one hit per group (signature first).
 */
export function aboutHeadlinePromiseKinds(headline: string, facts: HeroCapPageFacts = { maskLabels: [], acPage: false }): string[] {
  const signature = Object.keys(signatureCounts(headline));
  const kinds = signature.map(group => `signature:${group}`);
  const masked = maskHeroLabels(headline, facts.maskLabels);
  for (const [group, entries] of Object.entries(HERO_CAP_CONCEPT_ADDITIONS)) {
    if (signature.includes(group)) continue; // one hit per group: the signature variant already names it
    if (entries.some(entry => (facts.acPage || !HERO_CAP_AC_ONLY.includes(entry)) && masked.includes(entry))) kinds.push(`concept:${group}`);
  }
  if (beforeHitCount(headline) > 0) kinds.push('before');
  return kinds;
}

/** The services headline closed set (section 22.2): byte-identical to one SERVICES_HEADLINE_OPTIONS entry after trimming. */
export function servicesHeadlineInSet(value: string): boolean {
  return SERVICES_HEADLINE_OPTIONS.includes(value.trim());
}

/** Unicode code points of a string (section 22.2: spaces and punctuation count). */
export function codePointLength(value: string): number {
  return [...value].length;
}

/**
 * Trust-bar gates (section 22.2): a TRUST_BAR_FILLER_PHRASES substring (Adam M2b.1d: exempt when the phrase appears verbatim
 * in the owner's own facts, as the solo-operator wording is), more than TRUST_BAR_MAX_ITEMS items (each item past the cap is
 * one hit, so the safe item drop can remove it) and an item over TRUST_BAR_MAX_CHARS code points.
 */
export function trustBarHits(copy: Record<string, unknown>, ctx: Pick<CopyGateContext, 'ownerFactsText'>): GateViolation[] {
  const items = Array.isArray(copy.trustBarItems) ? copy.trustBarItems : [];
  const out: GateViolation[] = [];
  items.forEach((item, index) => {
    if (typeof item !== 'string') return;
    const field = `trustBarItems[${index}]`;
    TRUST_BAR_FILLER_PHRASES.forEach((phrase, at) => {
      if (item.includes(phrase) && !ctx.ownerFactsText.includes(phrase)) out.push({ field, rule: GATE_RULES.trustBarFiller, actual: `trust_filler:${at}` });
    });
    if (index >= TRUST_BAR_MAX_ITEMS) out.push({ field, rule: GATE_RULES.trustBarSize, actual: `trust_items:${items.length}` });
    if (codePointLength(item) > TRUST_BAR_MAX_CHARS) out.push({ field, rule: GATE_RULES.trustBarSize, actual: `trust_chars:${codePointLength(item)}` });
  });
  return out;
}

// ---------------------------------------------------------------------------
// M2b.1g: Tamar's section 23.2 gates (the owner's tool, about headline vs trust bar, about / card echo, the definite
// warranty) and Yonatan's about-headline place guard. Hebrew data from generationData.ts and copyGates.config.ts.
// ---------------------------------------------------------------------------

const CAMERA_GROUP = 'camera';
const THERMAL_GROUP = 'thermal';
/** The usp tool groups in data order. */
export const USP_TOOL_GROUP_IDS: readonly string[] = Object.keys(USP_TOOL_GROUPS);
if (!USP_TOOL_GROUP_IDS.includes(CAMERA_GROUP) || !USP_TOOL_GROUP_IDS.includes(THERMAL_GROUP)) throw new Error('copyGates: the usp tool groups changed; update the tool gates');

/**
 * The stems that satisfy uspToolRequired for a group (Adam M2b.1g): the group's `he` stems, plus CAMERA_SATISFIES_ONLY for
 * the camera group. foreignTool uses the `he` stems only (toolForeignStems).
 */
export function toolSatisfyStems(group: string): readonly string[] {
  const stems = USP_TOOL_GROUPS[group]?.he ?? [];
  return group === CAMERA_GROUP ? [...stems, ...CAMERA_SATISFIES_ONLY] : stems;
}
export function toolForeignStems(group: string): readonly string[] {
  return USP_TOOL_GROUPS[group]?.he ?? [];
}

/**
 * The tool groups the owner's usp names (section 23.2 a): an English uspKeywords entry (lower-cased usp, plain substring)
 * or a Hebrew stem (plain substring; engineer reading: the satisfy stems, so a usp with the camera verb names the camera).
 */
export function uspToolGroups(ctx: Pick<CopyGateContext, 'ownerFields'>): string[] {
  const usp = ctx.ownerFields?.usp;
  if (typeof usp !== 'string' || !usp.trim()) return [];
  const lower = usp.toLowerCase();
  return USP_TOOL_GROUP_IDS.filter(group => USP_TOOL_GROUPS[group].uspKeywords.some(keyword => lower.includes(keyword)) || toolSatisfyStems(group).some(stem => usp.includes(stem)));
}

/** The groups a page may name (section 23.2 a): the usp's groups, and the camera group whenever the thermal group is one. */
export function allowedToolGroups(ctx: Pick<CopyGateContext, 'ownerFields'>): Set<string> {
  const groups = new Set(uspToolGroups(ctx));
  if (groups.has(THERMAL_GROUP)) groups.add(CAMERA_GROUP);
  return groups;
}

/** A value with the owner-confirmed service labels masked (longest first): a stem inside a label is exempt. */
function maskServiceLabels(value: string, labels: readonly string[]): string {
  return maskHeroLabels(value, labels);
}

/** The foreign tool groups one string names: a `he` stem of a group the page may not name, outside the masked labels. */
export function foreignToolGroups(value: string, allowed: ReadonlySet<string>, labels: readonly string[], exemptGroups: ReadonlySet<string> = new Set()): string[] {
  const masked = maskServiceLabels(value, labels);
  return USP_TOOL_GROUP_IDS.filter(group => !allowed.has(group) && !exemptGroups.has(group) && toolForeignStems(group).some(stem => masked.includes(stem)));
}

/** The groups whose stem appears in an owner-confirmed card label: the whole card (label and description) is exempt for them (Adam M2b.1g). */
function cardExemptGroups(name: unknown, labels: readonly string[]): Set<string> {
  const label = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : '';
  if (!label || !labels.some(item => item.replace(/\s+/g, ' ').trim() === label)) return new Set();
  return new Set(USP_TOOL_GROUP_IDS.filter(group => toolForeignStems(group).some(stem => label.includes(stem))));
}

/** Echo tokens (section 23.2 c): punctuation and em-dash removed, whitespace split, word-internal hyphen to maqaf, one leading vav stripped. */
export function echoTokens(value: string): string[] {
  return value.replace(/[,.;:!?\u2014]/g, '').split(/\s+/).filter(Boolean)
    .map(token => token.replace(/(?<=\p{L})-(?=\p{L})/gu, '\u05BE'))
    .map(token => (token.length > 1 && token.startsWith(VAV) ? token.slice(1) : token));
}

/** Longest run of consecutive equal tokens shared by two token lists. */
export function longestSharedRun(a: readonly string[], b: readonly string[]): number {
  let best = 0;
  let previous = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const current = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        current[j] = previous[j - 1] + 1;
        if (current[j] > best) best = current[j];
      }
    }
    previous = current;
  }
  return best;
}

const hebrewLetterCount = (token: string) => (token.match(new RegExp(HEB_CLASS, 'gu')) ?? []).length;
/** cardPhraseEcho (section 23.2): two adjacent tokens, each with CARD_PHRASE_ECHO_MIN_LETTERS+ Hebrew letters, shared by two cards. */
export function sharedCardPhrase(a: string, b: string): boolean {
  const pairs = (tokens: string[]) => {
    const out = new Set<string>();
    for (let i = 0; i + CARD_PHRASE_ECHO_MIN_WORDS <= tokens.length; i++) {
      const run = tokens.slice(i, i + CARD_PHRASE_ECHO_MIN_WORDS);
      if (run.every(token => hebrewLetterCount(token) >= CARD_PHRASE_ECHO_MIN_LETTERS)) out.add(run.join(' '));
    }
    return out;
  };
  const left = pairs(echoTokens(a));
  return [...pairs(echoTokens(b))].some(key => left.has(key));
}

// ---------------------------------------------------------------------------
// M2b.1h: block verbatim, allow restatement. The page's one big promise may come back in fresh words in several fields; the
// same run of PHRASE_REPEAT_MIN_WORDS+ consecutive words may appear in at most PHRASE_REPEAT_MAX_FIELDS rendered fields.
// ---------------------------------------------------------------------------

/** System-set strings that gate_phrase_repeat never compares (the model cannot change them, so a repair could not fix them). */
const PHRASE_REPEAT_SYSTEM_FIELDS: readonly string[] = ['heroCta', 'servicesHeadline', 'serviceItems', 'faqItems', 'reviewFeatured', 'reviewContext', 'scarcityLine'];

/** The counting unit of a field path (the trust bar is one field, like the section 23 fact count), or null when never compared. */
function phraseRepeatUnit(field: string): string | null {
  const top = topFieldOf(field);
  if (PHRASE_REPEAT_SYSTEM_FIELDS.includes(top) || /^serviceDetails\[\d+\]\.name$/.test(field)) return null;
  return top === 'trustBarItems' ? 'trustBarItems' : field;
}

/** Tokens that never make a run count on their own: the owner's names, places, service labels and the page's search anchor. */
export function phraseRepeatFreeTokens(ctx: Pick<CopyGateContext, 'serviceLabels' | 'places' | 'freeNames' | 'anchorName' | 'anchorCity'>): Set<string> {
  return new Set([...ctx.serviceLabels, ...(ctx.places ?? []), ...(ctx.freeNames ?? []), ctx.anchorName ?? '', ctx.anchorCity ?? ''].flatMap(echoTokens));
}

/** A free token, also with up to two attached prefix letters. */
function isPhraseFreeToken(token: string, free: ReadonlySet<string>): boolean {
  if (free.has(token)) return true;
  for (let strip = 1; strip <= 2 && strip < token.length; strip++) {
    if (!PREFIX_LETTERS.includes(token[strip - 1])) break;
    if (free.has(token.slice(strip))) return true;
  }
  return false;
}

/**
 * The counted runs of one string (echoTokens): every run of PHRASE_REPEAT_MIN_WORDS consecutive tokens with at least two
 * tokens that are not free, so the required search anchor (trade + city) or a service label + town never counts as a repeat.
 */
export function phraseRepeatKeys(value: string, free: ReadonlySet<string>): string[] {
  const tokens = echoTokens(value.normalize('NFC'));
  const out = new Set<string>();
  for (let i = 0; i + PHRASE_REPEAT_MIN_WORDS <= tokens.length; i++) {
    const run = tokens.slice(i, i + PHRASE_REPEAT_MIN_WORDS);
    if (run.filter(token => !isPhraseFreeToken(token, free)).length >= 2) out.add(run.join(' '));
  }
  return [...out];
}

/**
 * gate_phrase_repeat: a counted run in more than PHRASE_REPEAT_MAX_FIELDS of the page's phraseRepeatFields fails each field
 * past the cap, in gate order (gated fields first, so a warn-only field such as the story never pushes a gated field over).
 * The system-built area tile is not compared. `actual` is `phrase_repeat:<index>` into the phrases kept for the repair prompt.
 */
function phraseRepeatHits(strings: Array<{ field: string; value: string }>, ctx: CopyGateContext): GateViolation[] {
  const allowed = ctx.phraseRepeatFields ?? [];
  const free = phraseRepeatFreeTokens(ctx);
  const places = ctx.places ?? [];
  const units = new Map<string, Set<string>>();
  const phrases: string[] = [];
  const hitFields = new Set<string>();
  const out: GateViolation[] = [];
  for (const { field, value } of strings) {
    const unit = allowed.includes(topFieldOf(field)) ? phraseRepeatUnit(field) : null;
    if (!unit || (unit === 'trustBarItems' && isAreaTile(value.trim(), places))) continue;
    for (const key of phraseRepeatKeys(value, free)) {
      const seen = units.get(key) ?? new Set<string>();
      if (seen.has(unit)) continue;
      seen.add(unit);
      units.set(key, seen);
      if (seen.size > PHRASE_REPEAT_MAX_FIELDS && !hitFields.has(field)) {
        hitFields.add(field);
        const known = phrases.indexOf(key);
        out.push({ field, rule: GATE_RULES.phraseRepeat, actual: `phrase_repeat:${known >= 0 ? known : phrases.push(key) - 1}` });
      }
    }
  }
  LAST_REPEATED_PHRASES.set(ctx, phrases);
  return out;
}

// ---------------------------------------------------------------------------
// 2026-11-10 (Tamar, clause-level repetition budget): each fact gets one full statement plus at most one short reference
// per page. gate_clause_repeat: the same run of CLAUSE_REPEAT_MIN_WORDS+ consecutive words INSIDE one clause (clauses split
// at sentence and clause punctuation, so a run never spans two clauses) in more than CLAUSE_REPEAT_MAX_FIELDS field of the
// page fails every later field. A short reference (fewer words in common) never hits. On a service page with depth blocks
// the B6 proof items are the designated home of the proof facts: they are counted first, so the other field is the repeat.
// ---------------------------------------------------------------------------

export const CLAUSE_REPEAT_MIN_WORDS = 4;
export const CLAUSE_REPEAT_MAX_FIELDS = 1;
/** Fields that state the proof facts in full by design on a depth page (B6); counted before every other field. */
export const PROOF_HOME_FIELDS: readonly string[] = ['proofItems'];

/** The counted clause runs of one string: CLAUSE_REPEAT_MIN_WORDS consecutive tokens of one clause, at least two not free. */
export function clauseRepeatKeys(value: string, free: ReadonlySet<string>): string[] {
  const out = new Set<string>();
  for (const clause of value.normalize('NFC').split(CLAUSE_SPLIT)) {
    const tokens = echoTokens(clause);
    for (let i = 0; i + CLAUSE_REPEAT_MIN_WORDS <= tokens.length; i++) {
      const run = tokens.slice(i, i + CLAUSE_REPEAT_MIN_WORDS);
      if (run.filter(token => !isPhraseFreeToken(token, free)).length >= 2) out.add(run.join(' '));
    }
  }
  return [...out];
}

const LAST_REPEATED_CLAUSES = new WeakMap<CopyGateContext, string[]>();

function clauseRepeatHits(strings: Array<{ field: string; value: string }>, ctx: CopyGateContext): GateViolation[] {
  const allowed = ctx.phraseRepeatFields ?? [];
  const free = phraseRepeatFreeTokens(ctx);
  const places = ctx.places ?? [];
  const home = (field: string) => Boolean(ctx.depth) && PROOF_HOME_FIELDS.includes(topFieldOf(field));
  const ordered = [...strings.filter(item => home(item.field)), ...strings.filter(item => !home(item.field))];
  const owners = new Map<string, Set<string>>();
  const clauses: string[] = [];
  const hitFields = new Set<string>();
  const out: GateViolation[] = [];
  for (const { field, value } of ordered) {
    const unit = allowed.includes(topFieldOf(field)) ? phraseRepeatUnit(field) : null;
    if (!unit || (unit === 'trustBarItems' && isAreaTile(value.trim(), places))) continue;
    // The B6 items are one home: the proof block states each fact once, across its items.
    const counted = home(field) ? topFieldOf(field) : unit;
    for (const key of clauseRepeatKeys(value, free)) {
      const seen = owners.get(key) ?? new Set<string>();
      if (seen.has(counted)) continue;
      seen.add(counted);
      owners.set(key, seen);
      if (seen.size > CLAUSE_REPEAT_MAX_FIELDS && !hitFields.has(field)) {
        hitFields.add(field);
        const known = clauses.indexOf(key);
        out.push({ field, rule: GATE_RULES.clauseRepeat, actual: `clause_repeat:${known >= 0 ? known : clauses.push(key) - 1}` });
      }
    }
  }
  LAST_REPEATED_CLAUSES.set(ctx, clauses);
  return out;
}

/**
 * 2026-11-10 (Noa's pattern A, deterministic part; warning only): body fields beyond the about pair (where
 * gate_bare_verb_opener already blocks) whose sentence opens with a listed bare first-person verb and carries no subject.
 * Uses Tamar's section 19.5 lists unchanged (BARE_VERB_SENTENCE_OPENERS, SUBJECT_CARRY_TOKENS); fragments stay allowed in
 * the hero subheadline, badges and the trust bar, which are not listed here.
 */
export const SUBJECT_PRONOUN_WARN_FIELDS: readonly RegExp[] = [
  /^storyBody$/, /^serviceDetails\[\d+\]\.description$/, /^processSteps\[\d+\]\.text$/, /^proofItems\[\d+\]\.text$/, /^qaItems\[\d+\]\.a$/,
];

/** The digit runs of a string. */
const digitRuns = (value: string) => new Set(value.match(/\d+/g) ?? []);

/**
 * aboutHeadlineNoTrustRepeat (section 23.2 b): 'digits' when the headline shares a digit run with a trust-bar item;
 * 'item:<i>' when it holds a trimmed trust item verbatim. M2b.1g engineer rule: the system-built area tile (a pure place
 * list, isAreaTile) is not compared verbatim, since C2 allows one town; Yonatan's place guard covers place lists.
 */
export function aboutHeadlineTrustRepeats(headline: string, trustItems: readonly unknown[], places: readonly string[]): string[] {
  const out: string[] = [];
  const digits = digitRuns(headline);
  const items = trustItems.filter((item): item is string => typeof item === 'string');
  if (items.some(item => [...digitRuns(item)].some(run => digits.has(run)))) out.push('digits');
  items.forEach((item, index) => {
    const trimmed = item.trim();
    if (trimmed && headline.includes(trimmed) && !isAreaTile(trimmed, places)) out.push(`item:${index}`);
  });
  return out;
}

/** Yonatan (M2b.1g, C2 guard): the distinct owner places an about headline names. */
export function aboutHeadlinePlaceCount(headline: string, places: readonly string[]): number {
  return new Set(placeHits(headline, places).map(hit => hit.place)).size;
}
/** Yonatan's guard: at most this many places in the about headline. */
export const ABOUT_HEADLINE_MAX_PLACES = 1;

const WARRANTY_DURATION_ANCHOR = '\\s+(?:';
/**
 * warrantyDefiniteBareDuration (section 23.2) plus the spelled-out durations (Adam M2b.1g, Noa's regex): the data pattern
 * with WARRANTY_SPELLED_DURATION_SOURCE added as one more duration alternative, after the same definite warranty.
 */
export const WARRANTY_DEFINITE_PATTERN: RegExp = (() => {
  const source = WARRANTY_DEFINITE_BARE_DURATION.pattern;
  const at = source.indexOf(WARRANTY_DURATION_ANCHOR);
  if (at < 0 || source.indexOf(WARRANTY_DURATION_ANCHOR, at + 1) >= 0) throw new Error('copyGates: the warranty pattern changed; update the spelled-duration splice');
  const splice = at + WARRANTY_DURATION_ANCHOR.length;
  return new RegExp(`${source.slice(0, splice)}(?:${WARRANTY_SPELLED_DURATION_SOURCE})|${source.slice(splice)}`, WARRANTY_DEFINITE_BARE_DURATION.flags);
})();

/** True when the field is rendered on this page (unset renderedFields: every field). */
function isRenderedField(field: string, ctx: Pick<CopyGateContext, 'renderedFields'>): boolean {
  return !ctx.renderedFields || ctx.renderedFields.includes(topFieldOf(field));
}

/** Section 23.2 gates for one research page (rendered fields only; the about checks only where the about section is generated). */
function m2b2Gates(copy: Record<string, unknown>, strings: Array<{ field: string; value: string }>, ctx: CopyGateContext): GateViolation[] {
  const out: GateViolation[] = [];
  const allowed = allowedToolGroups(ctx);
  const places = ctx.places ?? [];
  const details = Array.isArray(copy.serviceDetails) ? copy.serviceDetails : [];
  for (const { field, value } of strings) {
    if (!isRenderedField(field, ctx)) continue;
    const card = /^serviceDetails\[(\d+)\]\./.exec(field);
    const cardItem = card ? details[Number(card[1])] : undefined;
    const exempt = card ? cardExemptGroups(cardItem && typeof cardItem === 'object' ? (cardItem as Record<string, unknown>).name : undefined, ctx.serviceLabels) : new Set<string>();
    for (const group of foreignToolGroups(value, allowed, ctx.serviceLabels, exempt)) out.push({ field, rule: GATE_RULES.foreignTool, actual: `foreign_tool:${group}` });
    if (WARRANTY_DEFINITE_PATTERN.test(value)) out.push({ field, rule: GATE_RULES.warrantyDefinite, actual: 'warranty:definite_bare_duration' });
  }
  const skip = ctx.ungeneratedFields ?? [];
  const body = !skip.includes('aboutPageBody') && isRenderedField('aboutPageBody', ctx) && typeof copy.aboutPageBody === 'string' ? copy.aboutPageBody : null;
  if (body !== null) {
    for (const group of uspToolGroups(ctx)) {
      if (!toolSatisfyStems(group).some(stem => body.includes(stem))) out.push({ field: 'aboutPageBody', rule: GATE_RULES.uspToolRequired, actual: `usp_tool:${group}` });
    }
  }
  const headline = !skip.includes('aboutPageHeadline') && isRenderedField('aboutPageHeadline', ctx) && typeof copy.aboutPageHeadline === 'string' ? copy.aboutPageHeadline : null;
  if (headline !== null && headline.trim()) {
    for (const kind of aboutHeadlineTrustRepeats(headline, Array.isArray(copy.trustBarItems) ? copy.trustBarItems : [], places)) out.push({ field: 'aboutPageHeadline', rule: GATE_RULES.aboutHeadlineTrustRepeat, actual: `about_trust:${kind}` });
    const count = aboutHeadlinePlaceCount(headline, places);
    if (count > ABOUT_HEADLINE_MAX_PLACES) out.push({ field: 'aboutPageHeadline', rule: GATE_RULES.aboutHeadlinePlaces, actual: `about_places:${count}` });
  }
  if (!skip.includes('serviceDetails') && isRenderedField('serviceDetails', ctx)) {
    const descriptions = details.map(item => (item && typeof item === 'object' && typeof (item as Record<string, unknown>).description === 'string' ? (item as Record<string, unknown>).description as string : null));
    const bodyTokens = body !== null && body.trim() ? echoTokens(body) : null;
    descriptions.forEach((description, index) => {
      if (description === null) return;
      const field = `serviceDetails[${index}].description`;
      if (bodyTokens) {
        const run = longestSharedRun(bodyTokens, echoTokens(description));
        if (run >= ABOUT_CARD_ECHO_MIN_WORDS) out.push({ field, rule: GATE_RULES.aboutCardEcho, actual: `about_card_echo:${run}` });
      }
      for (let earlier = 0; earlier < index; earlier++) {
        const other = descriptions[earlier];
        if (other !== null && sharedCardPhrase(other, description)) { out.push({ field, rule: GATE_RULES.cardPhraseEcho, actual: `card_phrase_echo:${earlier}` }); break; }
      }
    });
  }
  return out;
}

/** Field-path matchers for a list of data-file field names (`a[].b` matches `a[3].b`). */
function fieldMatchers(names: readonly string[]): RegExp[] {
  return names.map(name => new RegExp(`^${name.includes('[]')
    ? name.split('[]').map(escapeRegExp).join('\\[\\d+\\]')
    : `${escapeRegExp(name)}(?:\\[\\d+\\])?`}$`));
}
// M2b.1h: the story body and the pitch are checked for invented past-job stories too (a truth gate).
const STORY_FIELD_PATTERNS = fieldMatchers([...STORY_FIELDS, 'storyBody', 'pitch']);
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

const LEAD_PREFIX_ALT = wordAlternatives(ARRIVE_LOCATE_LEAD_PREFIXES);
/** M2a.7: the trade terms whose match rule is a section 20.6 prose note (the build script asserts the notes). */
const PREPOSITION_ID = 'services_headline_preposition';
const WATER_ID = 'water_flows_again';
/** M2a.7: trade terms that also run on EXTRA_GATE_FIELDS (section 20.6: "this gate names its own field"). */
export const EXTRA_FIELD_TRADE_IDS: readonly string[] = [PREPOSITION_ID];
const SKIP_ADVERB_SET = new Set(PREPOSITION_SKIP_ADVERBS);
const FOLLOWING_WORDS = new RegExp(`^ (${HEB_CLASS}+)(?: (${HEB_CLASS}+))?`, 'u');

/**
 * services_headline_preposition (section 20.6, M2a.7): token 0 (one verb) is a plain substring with no Hebrew letter right
 * before it; token 1 (two verbs) is a plain substring unless a space and a word starting with PREPOSITION_PAIR_NEXT_LETTER
 * follow it, after skipping at most one PREPOSITION_SKIP_ADVERBS word.
 */
function prepositionNoteHit(value: string, tokens: readonly string[]): boolean {
  const [single, pair] = tokens;
  if (new RegExp(`(?<!${HEB_CLASS})${escapeRegExp(single)}`, 'u').test(value)) return true;
  for (let at = value.indexOf(pair); at >= 0; at = value.indexOf(pair, at + 1)) {
    const next = FOLLOWING_WORDS.exec(value.slice(at + pair.length));
    const word = next && SKIP_ADVERB_SET.has(next[1]) ? next[2] : next?.[1];
    if (!word || !word.startsWith(PREPOSITION_PAIR_NEXT_LETTER)) return true;
  }
  return false;
}

/**
 * water_flows_again (section 20.6, M2a.7): token 0 is a whole word (its own vav prefix only, no Hebrew letter after);
 * token 1 is a plain substring with no Hebrew letter before it except that same vav.
 */
function waterNotePattern(tokens: readonly string[]): RegExp {
  const [whole, phrase] = tokens;
  const vav = whole.slice(0, whole.length - phrase.split(' ')[0].length);
  return new RegExp(`(?<!${HEB_CLASS})(?:${escapeRegExp(whole)}(?!${HEB_CLASS})|(?:${escapeRegExp(vav)})?${escapeRegExp(phrase)})`, 'gu');
}

const TRADE_GATES = TRADE_TERMS.filter(entry => entry.type !== 'promptOnly').map(entry => ({
  entry,
  pattern: entry.match === 'note'
    ? entry.id === WATER_ID ? waterNotePattern(entry.tokens) : null
    : entry.match === 'leadVerb'
    ? new RegExp(`(?<!${HEB_CLASS})(?:${LEAD_PREFIX_ALT})?(?:${wordAlternatives(entry.leadVerbs ?? [])}) (?:${wordAlternatives(entry.tokens)})(?!${HEB_CLASS})`, 'gu')
    : entry.match === 'wholeWord'
      ? new RegExp(`(?<!${HEB_CLASS})[${entry.prefixLetters.join('')}]*(?:${wordAlternatives(entry.tokens)})(?!${HEB_CLASS})`, 'gu')
      : new RegExp(wordAlternatives(entry.tokens), 'gu'),
}));
if (TRADE_GATES.some(({ entry, pattern }) => entry.match === 'note' && entry.id !== PREPOSITION_ID && !pattern)) throw new Error('copyGates: a note-matched trade term has no matcher');
const AC_SEWAGE_ID = 'ac_sewage';
const NEXT_WORD = new RegExp(`^\\s+(${HEB_CLASS}+)`, 'u');

/**
 * Trade-term gate ids hit by one string (section 20.6); acOnly entries only on an AC page. M2a.7: with `extraFieldOnly`
 * (a field of EXTRA_GATE_FIELDS), only the EXTRA_FIELD_TRADE_IDS entries run.
 */
export function tradeTermHits(value: string, acPage: boolean, extraFieldOnly = false): string[] {
  const hits: string[] = [];
  for (const { entry, pattern } of TRADE_GATES) {
    if (entry.acOnly && !acPage) continue;
    if (extraFieldOnly && !EXTRA_FIELD_TRADE_IDS.includes(entry.id)) continue;
    if (entry.id === PREPOSITION_ID) {
      if (prepositionNoteHit(value, entry.tokens)) hits.push(entry.id);
      continue;
    }
    if (!pattern) continue;
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

/**
 * M2a.7 (Noa section 20.6) tripled_letter: a Hebrew letter (U+05D0-U+05EA) three or more times in a row, except vav, which
 * needs four or more (a vav prefix on a word that starts with a double vav is legal). No Hebrew data.
 */
const TRIPLED_LETTER_PATTERN = new RegExp(`([\u05D0-\u05D4\u05D6-\u05EA])\\1\\1|${VAV}{4}`, 'u');
export function tripledLetterHit(value: string): boolean {
  return TRIPLED_LETTER_PATTERN.test(value);
}

/** M2a.7 (Noa section 20.6): wrong-preposition token indices in one string (no Hebrew letter before or after the token). */
const WRONG_PREPOSITION_PATTERNS = WRONG_PREPOSITION_TOKENS.map(token => new RegExp(`(?<!${HEB_CLASS})${escapeRegExp(token)}(?!${HEB_CLASS})`, 'u'));
export function wrongPrepositionHits(value: string): number[] {
  return WRONG_PREPOSITION_PATTERNS.flatMap((pattern, index) => (pattern.test(value) ? [index] : []));
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
    const ownerVoice = isOwnerVoiceField(field);
    // M2a.7 (Noa section 20.6): the typo gates and services_headline_preposition also cover EXTRA_GATE_FIELDS.
    const extraField = !ownerVoice && EXTRA_GATE_FIELDS.includes(field);
    // 2026-11-10 (Noa's pattern A beyond the about pair; warning only): body fields, owner-voice or not (depth items too).
    if (!BARE_VERB_FIELD_SET.has(field) && SUBJECT_PRONOUN_WARN_FIELDS.some(pattern => pattern.test(field))) {
      for (const index of new Set(bareVerbOpenerHits(value))) out.push({ field, rule: GATE_RULES.subjectPronoun, actual: `opener:${index}` });
    }
    if (!ownerVoice && !extraField) continue;
    if (tripledLetterHit(value)) out.push({ field, rule: GATE_RULES.tripledLetter, actual: 'typo:tripled_letter' });
    for (const index of wrongPrepositionHits(value)) out.push({ field, rule: GATE_RULES.wrongPreposition, actual: `wrong_preposition:${index}` });
    if (extraField) {
      for (const id of tradeTermHits(value, vertical === 'ac', true)) out.push({ field, rule: GATE_RULES.tradeTerm, actual: `trade:${id}` });
      continue;
    }
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
    // M2a.7: each hero with its own service label(s) masked; a prior page without facts gets every service label masked.
    const own = currentHeroCapFacts(copy, ctx);
    const priorFacts = ctx.priorHeroHeadlines.map((_, index) => ctx.priorHeroFacts?.[index] ?? { maskLabels: [...ctx.serviceLabels], acPage: own.acPage });
    for (const group of heroSignatureCapGroups(copy.heroHeadline, ctx.priorHeroHeadlines, own, priorFacts)) out.push({ field: 'heroHeadline', rule: GATE_RULES.heroSignatureCap, actual: `hero_cap:${group}` });
  }
  // M2b.1d (section 22.2): the about checks run only on pages that generate (render) the about section; the earlier pages
  // they compare with are the homepage / services hub only (siteGenerationContext filters them).
  const skip = ctx.ungeneratedFields ?? [];
  if (!skip.includes('aboutPageHeadline') && typeof copy.aboutPageHeadline === 'string') {
    if (ctx.priorAboutPageHeadlines?.length && duplicateAboutHeadline(copy.aboutPageHeadline, ctx.priorAboutPageHeadlines)) {
      out.push({ field: 'aboutPageHeadline', rule: GATE_RULES.duplicateAboutHeadline, actual: 'duplicate:about_headline' });
    }
    for (const kind of aboutHeadlinePromiseKinds(copy.aboutPageHeadline, currentHeroCapFacts(copy, ctx))) out.push({ field: 'aboutPageHeadline', rule: GATE_RULES.aboutHeadlinePromise, actual: `about_promise:${kind}` });
  }
  if (!skip.includes('aboutPageBody') && typeof copy.aboutPageBody === 'string' && ctx.priorAboutPageBodies?.length && duplicateAboutOpening(copy.aboutPageBody, ctx.priorAboutPageBodies)) {
    out.push({ field: 'aboutPageBody', rule: GATE_RULES.duplicateAboutOpening, actual: 'duplicate:about_opening' });
  }
  if (!skip.includes('servicesHeadline') && typeof copy.servicesHeadline === 'string' && !servicesHeadlineInSet(copy.servicesHeadline)) {
    out.push({ field: 'servicesHeadline', rule: GATE_RULES.servicesHeadlineSet, actual: 'services_headline:not_in_set' });
  }
  if (!skip.includes('trustBarItems')) out.push(...trustBarHits(copy, ctx));
  // Yonatan's H1 anchor: heroHeadline holds the exact page name and city (normalised), else the renderer swaps the H1.
  if (typeof copy.heroHeadline === 'string' && ctx.anchorName) {
    const missing = heroAnchorMissing(copy.heroHeadline, ctx.anchorName, ctx.anchorCity);
    if (missing) out.push({ field: 'heroHeadline', rule: GATE_RULES.heroAnchor, actual: `missing:${missing}` });
  }
  return out;
}

// ---------------------------------------------------------------------------
// M2a.7 (Eitan-approved until M2b): on a research site a gate hit in a field the renderer does not show is a warning
// (logged, never fails the page, never spends repair budget), except ALWAYS_BLOCKING_RULES. WARNING_ONLY_RULES are
// warnings in every field (data sections 20.2 and 20.5, M2a.7). Legacy sites (no renderedFields) are unchanged.
// ---------------------------------------------------------------------------

/** Trust and fact gates: they fail the page in every field, rendered or not (they will render from M2b). */
export const ALWAYS_BLOCKING_RULES: readonly GateRule[] = [
  GATE_RULES.inventedStory,
  GATE_RULES.claim, // every claim:* fact gate, including price_lock, free:*, same_day_*, fix_time, solo_operator, license_grade
  GATE_RULES.serviceArea,
  GATE_RULES.nameSpelling,
  // Engineer additions (same trust / fact class; flagged in the M2a.7 report):
  GATE_RULES.customerAttribution,
  GATE_RULES.customerSource,
  GATE_RULES.waoOffer,
  GATE_RULES.unconfirmedService,
  GATE_RULES.availability,
  GATE_RULES.installArrival,
  GATE_RULES.hours,
  // M2b.1g (section 23.2 a): naming a tool the owner does not use is a false claim about him (the claim class).
  GATE_RULES.foreignTool,
  // M2b.1h: a CJK / Cyrillic / Arabic character in any generated field (the AGENTS.md served-HTML check, at generation time).
  GATE_RULES.foreignScript,
  // Content depth (2026-11-10, Yonatan's hard gates): block items trace to cited owner facts; terms within suggested usage.
  GATE_RULES.factTrace,
  GATE_RULES.termDensity,
  // Copy v2 slice 4: restating a code-owned owner fact fails the page in every field (story and depth blocks too).
  GATE_RULES.factRestatement,
  // Copy v2 slice 6: the business name inside a model-written Q&A answer (dropped deterministically before any repair).
  GATE_RULES.qaBrandInAnswer,
];

/** M2b.1h: the only gates that run on the unrendered pitch: the truth / owner-fact gates and the foreign-script check. */
export const PITCH_GATE_RULES: readonly GateRule[] = ALWAYS_BLOCKING_RULES;

/** M2b.1h: characters of a script that never belongs in the Hebrew copy (Chinese, Japanese, Korean, Cyrillic, Arabic). */
export const FOREIGN_SCRIPT_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}]/u;

/** M2b.1h (gate_phrase_repeat): a run of this many consecutive words ... */
export const PHRASE_REPEAT_MIN_WORDS = 4;
/** ... may appear in at most this many rendered fields of a page (the trust bar counts as one field). */
export const PHRASE_REPEAT_MAX_FIELDS = 2;
/**
 * Former gates that are warnings only, in every field (M2a.7: the same-opening check). M2b.1d (section 22.2): the
 * serviceDetails opener cap is deleted; the same-opening check compares the homepage and the services hub only.
 */
export const WARNING_ONLY_RULES: readonly GateRule[] = [
  GATE_RULES.duplicateAboutOpening,
  // M2b.1g (section 23.2): warn-only for the rescore; a hard gate only if every rescore hit is a real echo.
  GATE_RULES.cardPhraseEcho,
  // 2026-11-10 (Noa's pattern A beyond the about pair): logged for the next eval; the verb list covers Tamar's openers only.
  GATE_RULES.subjectPronoun,
];

/** M2b.1h: on a pitch-first page, the two-word phrase cap (gate_fact_repeat `phrase:`) is a warning (CopyGateContext.promiseRestatement). */
export function isRelaxedPhraseCapHit(hit: Pick<GateViolation, 'rule' | 'actual'>, ctx: Pick<CopyGateContext, 'promiseRestatement'>): boolean {
  return Boolean(ctx.promiseRestatement) && hit.rule === GATE_RULES.factRepeat && (hit.actual ?? '').startsWith('phrase:');
}

/**
 * Rerun-3b bug B (Adam's policy): a fear-promise or same-day hit in a rendered field is never warn-only. It blocks in every
 * rendered field, the RESEARCHED_RENDERED_WARN_ONLY_FIELDS ones (story, depth blocks) included, so the drop step removes it
 * where the field is droppable and anything else gets one repair, then fails the page (CopyGateContext.claimScopeFields).
 */
export const CLAIM_SCOPE_GATE_RULES: readonly GateRule[] = [GATE_RULES.fearPromise, GATE_RULES.sameDayScope];

type WarningContext = Pick<CopyGateContext, 'renderedFields' | 'promiseRestatement'> & Partial<Pick<CopyGateContext, 'claimScopeFields'>>;

/** True when a gate hit is a warning, not a page failure (see ALWAYS_BLOCKING_RULES / WARNING_ONLY_RULES). */
export function isWarningHit(hit: Pick<GateViolation, 'field' | 'rule' | 'actual'>, ctx: WarningContext): boolean {
  if (WARNING_ONLY_RULES.includes(hit.rule)) return true;
  if (isRelaxedPhraseCapHit(hit, ctx)) return true;
  if (ctx.claimScopeFields && CLAIM_SCOPE_GATE_RULES.includes(hit.rule)) return !ctx.claimScopeFields.includes(topFieldOf(hit.field));
  if (!ctx.renderedFields || ALWAYS_BLOCKING_RULES.includes(hit.rule)) return false;
  return !ctx.renderedFields.includes(topFieldOf(hit.field));
}
/** The hits that fail the page. */
export function blockingGateHits<T extends Pick<GateViolation, 'field' | 'rule' | 'actual'>>(hits: readonly T[], ctx: WarningContext): T[] {
  return hits.filter(hit => !isWarningHit(hit, ctx));
}
/** The hits that are only logged. */
export function warningGateHits<T extends Pick<GateViolation, 'field' | 'rule' | 'actual'>>(hits: readonly T[], ctx: WarningContext): T[] {
  return hits.filter(hit => isWarningHit(hit, ctx));
}

/**
 * Gated strings in gate order. With renderedFields, the rendered fields come first (otherwise in copy order), so a
 * per-page count (signature, before, fact repeats) lands on a rendered field only when the rendered fields alone break it.
 */
function gateOrder(strings: Array<{ field: string; value: string }>, renderedFields?: readonly string[]): Array<{ field: string; value: string }> {
  if (!renderedFields) return strings;
  const rendered = (item: { field: string }) => renderedFields.includes(topFieldOf(item.field));
  return [...strings.filter(rendered), ...strings.filter(item => !rendered(item))];
}

/**
 * Run every gate. Returns violations (field paths + rule + config id), never copy text.
 * M2b.1h: the unrendered `pitch` is kept out of the page's gates (and out of every per-page count); it gets its own run, of
 * which only the PITCH_GATE_RULES hits are kept.
 */
export function runCopyGates(copy: Record<string, unknown>, ctx: CopyGateContext): GateViolation[] {
  // Copy v2 slice 2: hits on code-owned fields are dropped (the fields are system-built, never repaired). Slice 6: the
  // code-built Q&A items and every Q&A question too.
  return withoutCodeOwnedHits(runAllGates(copy, ctx), ctx);
}

function runAllGates(copy: Record<string, unknown>, ctx: CopyGateContext): GateViolation[] {
  if (!Object.prototype.hasOwnProperty.call(copy, 'pitch')) return [...runPageGates(copy, ctx), ...depthGateHits(copy, ctx), ...restatementGateHits(copy, ctx), ...qaBrandHits(copy, ctx), ...claimScopeHits(copy, ctx)];
  const { pitch, ...page } = copy;
  const out = runPageGates(page, ctx);
  out.push(...depthGateHits(page, ctx));
  out.push(...restatementGateHits(page, ctx));
  out.push(...qaBrandHits(page, ctx));
  out.push(...claimScopeHits(page, ctx));
  if (typeof pitch === 'string' && pitch.trim()) out.push(...pitchGateHits(pitch, ctx));
  return out;
}

/** Content depth: tool groups a text names (owner-confirmed service labels masked, as in gate_foreign_tool). */
function depthToolGroups(text: string, ctx: Pick<CopyGateContext, 'serviceLabels'>): string[] {
  const masked = maskServiceLabels(text, ctx.serviceLabels);
  const lower = masked.toLowerCase();
  return USP_TOOL_GROUP_IDS.filter(group => toolSatisfyStems(group).some(stem => masked.includes(stem)) || USP_TOOL_GROUPS[group].uspKeywords.some(keyword => lower.includes(keyword)));
}

/** Content depth: the visible words of a page (its rendered fields; every generated field when the context has none). */
export function pageVisibleWords(copy: Record<string, unknown>, ctx: Pick<CopyGateContext, 'phraseRepeatFields'>): number {
  const fields = ctx.phraseRepeatFields ?? Object.keys(copy).filter(key => key !== 'pitch');
  return visibleWordCount(visibleCopyStrings(copy, fields));
}

/** Content depth: the anchor stems exempt from term density (the H1 head term, the city, the places, the business name). */
function depthAnchorStems(ctx: CopyGateContext): Set<string> {
  return stemSet([ctx.anchorName, ctx.anchorCity, ctx.businessName, ...(ctx.places ?? [])].filter((item): item is string => typeof item === 'string').join(' '));
}

/**
 * Content depth (2026-11-10): the fact-trace and term-density gates of the service-page blocks (both always block).
 * Actual ids: `trace:<kind>[:<tool group>]`, `term:<index into ctx.depth.terms>:<count>/<limit>` (never copy text).
 */
export function depthGateHits(copy: Record<string, unknown>, ctx: CopyGateContext): GateViolation[] {
  const depth = ctx.depth;
  if (!depth) return [];
  const out: GateViolation[] = [];
  const trace = factTraceHits(copy, { factTexts: depth.factTexts, questionIds: depth.questionIds }, {
    toolGroups: text => depthToolGroups(text, ctx),
    tellsStory: text => inventedStoryKinds(text).length > 0,
  });
  for (const hit of trace) out.push({ field: hit.field, rule: GATE_RULES.factTrace, actual: `trace:${hit.kind}${hit.detail ? `:${hit.detail}` : ''}` });
  for (const hit of termDensityHits(copy, depth.terms, pageVisibleWords(copy, ctx), depthAnchorStems(ctx))) {
    out.push({ field: hit.field, rule: GATE_RULES.termDensity, actual: `term:${hit.termIndex}:${hit.count}/${hit.limit}` });
  }
  // Copy v2 slice 2: the code-built proof items are never traced or dropped (gate_fact_trace off on proofItems). Slice 6:
  // nor are the code-built Q&A items.
  return withoutCodeOwnedHits(out, ctx);
}

/** Content depth: the trace kinds of a hit's actual id (repair text and the deterministic item drop). */
export function factTraceKind(actual: string | undefined): FactTraceKind | null {
  const kind = (actual ?? '').split(':')[1];
  return ['fact_ids', 'unknown_fact', 'number', 'tool', 'story', 'question'].includes(kind) ? kind as FactTraceKind : null;
}

/** M2b.1h: the truth / foreign-script hits of the pitch, gated alone (no prior pages, no page counts; it is its own field). */
function pitchGateHits(pitch: string, ctx: CopyGateContext): GateViolation[] {
  const alone: CopyGateContext = {
    ...ctx, renderedFields: ['pitch'], ungeneratedFields: [], phraseRepeatFields: undefined,
    priorHeroHeadlines: [], priorAboutPageHeadlines: [], priorAboutPageBodies: [], priorHeroFacts: [],
  };
  return runPageGates({ pitch }, alone).filter(hit => hit.field === 'pitch' && PITCH_GATE_RULES.includes(hit.rule));
}

/** The model-written strings the restatement gate reads: generated fields minus the system-set service names / headline. */
export function restatementGateStrings(copy: Record<string, unknown>, ctx: CopyGateContext): Array<{ field: string; value: string }> {
  return generatedStrings(copy, ctx).filter(item => item.field !== 'servicesHeadline' && !/^serviceDetails\[\d+\]\.name$/.test(item.field) && item.value.trim());
}

/** Copy v2 slice 4: gate_fact_restatement (off unless ctx.factRestatement is set; never on the unrendered pitch). */
function restatementGateHits(copy: Record<string, unknown>, ctx: CopyGateContext): GateViolation[] {
  if (!ctx.factRestatement) return [];
  return factRestatementHits(restatementGateStrings(copy, ctx), ctx.factRestatement).map(hit => ({ field: hit.field, rule: GATE_RULES.factRestatement, actual: `restatement:${hit.kind}` }));
}

/** The sentences of one gated string (prose split at . ! ?; a short field is one sentence). */
export function claimSentences(value: string): string[] {
  return proseSentences(value);
}

/** Rerun-3 items 4-5: true when a sentence breaks gate_fear_promise / gate_same_day_scope under this context. */
export function claimScopeSentenceRules(sentence: string, ctx: Pick<CopyGateContext, 'fearPromise' | 'sameDayScope'>): GateRule[] {
  const out: GateRule[] = [];
  if (ctx.fearPromise && fearPromiseMatches(sentence, ctx.fearPromise).length) out.push(GATE_RULES.fearPromise);
  if (ctx.sameDayScope && sameDayOutOfScope(sentence, ctx.sameDayScope)) out.push(GATE_RULES.sameDayScope);
  return out;
}

/** Rerun-3 items 4-5: the claim-scope hits of the model-written strings (never the pitch, the services headline or card names). */
function claimScopeHits(copy: Record<string, unknown>, ctx: CopyGateContext): GateViolation[] {
  if (!ctx.fearPromise && !ctx.sameDayScope) return [];
  const out: GateViolation[] = [];
  for (const item of restatementGateStrings(copy, ctx)) {
    const rules = new Set(claimSentences(item.value).flatMap(sentence => claimScopeSentenceRules(sentence, ctx)));
    for (const rule of rules) out.push({ field: item.field, rule });
  }
  return out;
}

function runPageGates(copy: Record<string, unknown>, ctx: CopyGateContext): GateViolation[] {
  const out: GateViolation[] = [];
  const strings = gateOrder(generatedStrings(copy, ctx), ctx.renderedFields);
  const authorised = CLAIM_RULES.map((_, index) => claimAuthorised(index, ctx));
  const quote = ctx.reviewQuote ? normalizeSpace(ctx.reviewQuote) : '';
  const places = ctx.places ?? [];
  const factPatterns = (ctx.factPhrases ?? []).map(phrase => new RegExp(`(?<!\\d)${escapeRegExp(phrase)}(?!\\d)`, 'g'));
  const factSeen = factPatterns.map(() => 0);
  const phrases = pagePhrases(copy, ctx);
  LAST_PHRASES.set(ctx, phrases);
  const phraseSeen = phrases.map(() => 0);
  const phraseUnits = phrases.map(() => new Set<string>());
  // M2b.1g: research sites (renderedFields set) count rendered fields only, with the section 23 phrase-cap exemptions.
  const researchCounts = Boolean(ctx.researchSite && ctx.renderedFields);
  const phraseExempt = researchCounts ? FACT_PHRASE_EXEMPT_FIELDS_RESEARCH : FACT_PHRASE_EXEMPT_FIELDS;
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
    // M2b.1g (section 23.2 f): on a research site both fact counters count the page's rendered fields only.
    // 2026-11-10: on a service page with depth blocks, B6 is the designated home of the proof facts; it never counts
    // against the per-page proof-point caps.
    const counted = (!researchCounts || isRenderedField(field, ctx)) && !(ctx.depth && PROOF_HOME_FIELDS.includes(topFieldOf(field)));
    if (counted) factPatterns.forEach((pattern, index) => {
      const count = countMatches(value, pattern);
      if (!count) return;
      factSeen[index] += count;
      if (factSeen[index] > FACT_REPEAT_MAX) out.push({ field, rule: GATE_RULES.factRepeat, actual: `fact:${index}` });
    });
    if (counted && !phraseExempt.includes(topFieldOf(field))) {
      // M2a.4: a field counts once per phrase; the cap is FACT_PHRASE_REPEAT_MAX fields per page. M2b.1g: on a research
      // site the trust bar counts, as one field (all its items together).
      const unit = researchCounts && topFieldOf(field) === 'trustBarItems' ? 'trustBarItems' : field;
      phrases.forEach((phrase, index) => {
        if (!phraseMentions(value, phrase) || phraseUnits[index].has(unit)) return;
        phraseUnits[index].add(unit);
        phraseSeen[index] += 1;
        if (phraseSeen[index] > FACT_PHRASE_REPEAT_MAX) out.push({ field, rule: GATE_RULES.factRepeat, actual: `phrase:${index}` });
      });
    }
    if (availabilityHit(value, ctx)) out.push({ field, rule: GATE_RULES.availability });
    if (ctx.installPage && arrivalTimeHit(value)) out.push({ field, rule: GATE_RULES.installArrival });
    if (customerKeys.some(pattern => new RegExp(pattern.source, 'u').test(value))) out.push({ field, rule: GATE_RULES.customerSource });
    if (REDUPLICATION_DASH_PATTERN.test(value)) out.push({ field, rule: GATE_RULES.reduplicationDash });
    if (ctx.researchSite && FOREIGN_SCRIPT_PATTERN.test(value)) out.push({ field, rule: GATE_RULES.foreignScript, actual: 'foreign_script:non_hebrew' });
    if (nameSpellingHit(value, ctx)) out.push({ field, rule: GATE_RULES.nameSpelling });
    // Copy v2 slices 4-5: with code-owned facts a card may lose its description (dropped whole; the card keeps its name).
    if (ctx.researchSite && /^serviceDetails\[\d+\]\.description$/.test(field) && value.trim().length < SERVICE_DESCRIPTION_MIN_CHARS && !(value === '' && ctx.codeOwnedFields?.length)) {
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
    const details = (ctx.ungeneratedFields ?? []).includes('serviceDetails') ? null : copy.serviceDetails;
    if (Array.isArray(details)) details.forEach((item, index) => {
      const name = item && typeof item === 'object' ? (item as Record<string, unknown>).name : undefined;
      if (typeof name !== 'string' || !allowed.has(normalizeSpace(name))) out.push({ field: `serviceDetails[${index}].name`, rule: GATE_RULES.unconfirmedService });
    });
  }

  // A review context is only supportable from an owner-supplied star rating.
  if (typeof copy.reviewContext === 'string' && !ctx.starRating) out.push({ field: 'reviewContext', rule: GATE_RULES.reviewContext });
  // M2a.5: section 19 voice gates and the duplicate-hook check (research-bound sites only). M2b.1g: section 23 gates.
  if (ctx.researchSite) out.push(...voiceGates(copy, strings, ctx), ...m2b2Gates(copy, strings, ctx));
  // M2b.1h: the same phrase of PHRASE_REPEAT_MIN_WORDS+ words in more than PHRASE_REPEAT_MAX_FIELDS rendered fields.
  if (ctx.researchSite && ctx.phraseRepeatFields) out.push(...phraseRepeatHits(strings, ctx));
  // 2026-11-10: one full statement per clause per page (Tamar's clause budget).
  if (ctx.researchSite && ctx.phraseRepeatFields) out.push(...clauseRepeatHits(strings, ctx));
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
    for (const { field, value } of generatedStrings(copy, ctx)) {
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
  /** M2a.7: fields the research renderer shows (hits elsewhere are warnings); unset = every hit blocks. */
  renderedFields?: readonly string[];
  /** M2a.7: hero-cap facts of the pages generated before this one (aligned with priorHeroHeadlines). */
  priorHeroFacts?: readonly HeroCapPageFacts[];
  /** M2b.1d: top-level fields this page does not generate (never gated). */
  ungeneratedFields?: readonly string[];
  /** Copy v2 slice 2: code-built fields (see CopyGateContext.codeOwnedFields). */
  codeOwnedFields?: readonly string[];
  /** M2b.1h: pitch-first page (see CopyGateContext.promiseRestatement). */
  promiseRestatement?: boolean;
  /** M2b.1h: the rendered fields gate_phrase_repeat compares (see CopyGateContext.phraseRepeatFields). */
  phraseRepeatFields?: readonly string[];
  /** Content depth: the service page's depth gate inputs (see CopyGateContext.depth). */
  depth?: CopyGateDepth;
  /** Copy v2 slice 4: see CopyGateContext.factRestatement. */
  factRestatement?: FactRestatementSpec;
  /** Copy v2 slice 6: see CopyGateContext.qaCodeOwnership / qaAnswerLead. */
  qaCodeOwnership?: QaCodeOwnership;
  qaAnswerLead?: string | null;
  /** Rerun-3 items 4-5: see CopyGateContext.fearPromise / sameDayScope. */
  fearPromise?: FearPromiseSpec;
  sameDayScope?: SameDayScopeSpec;
  /** Rerun-3b bug B: see CopyGateContext.claimScopeFields. */
  claimScopeFields?: readonly string[];
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
    ...(page.renderedFields ? { renderedFields: [...page.renderedFields] } : {}),
    ...(page.priorHeroFacts ? { priorHeroFacts: page.priorHeroFacts } : {}),
    ...(page.ungeneratedFields?.length ? { ungeneratedFields: [...page.ungeneratedFields] } : {}),
    ...(page.codeOwnedFields?.length ? { codeOwnedFields: [...page.codeOwnedFields] } : {}),
    ...(page.promiseRestatement ? { promiseRestatement: true } : {}),
    ...(page.phraseRepeatFields ? { phraseRepeatFields: [...page.phraseRepeatFields] } : {}),
    ...(page.depth ? { depth: page.depth } : {}),
    ...(page.factRestatement ? { factRestatement: page.factRestatement } : {}),
    ...(page.qaCodeOwnership ? { qaCodeOwnership: { ...page.qaCodeOwnership } } : {}),
    ...(page.qaAnswerLead ? { qaAnswerLead: page.qaAnswerLead } : {}),
    ...(page.fearPromise ? { fearPromise: page.fearPromise } : {}),
    ...(page.sameDayScope ? { sameDayScope: page.sameDayScope } : {}),
    ...(page.claimScopeFields ? { claimScopeFields: [...page.claimScopeFields] } : {}),
  };
}

/** The phrases of the copy last gated with this context (set by runCopyGates; used by describeGateViolation). */
const LAST_PHRASES = new WeakMap<CopyGateContext, FactPhrase[]>();
/** M2b.1h: the repeated runs of the copy last gated with this context (gate_phrase_repeat; used by describeGateViolation). */
const LAST_REPEATED_PHRASES = new WeakMap<CopyGateContext, string[]>();
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
      return `${violation.field} lists places with a locative prefix (${CITY_PREFIX_LETTERS.join(', ')}) on the first place only; attach the same letter to every place in the list (also after the conjunction \u05D5, and also before a town that already starts with that letter)`;
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
    case GATE_RULES.qaBrandInAnswer:
      return `${violation.field} names the business; the system already puts the business name and city in front of every answer, so write the answer without the business name, in the owner's first person`;
    case GATE_RULES.fearPromise:
      return `${violation.field} promises that the customer's fear will not happen (a "without" or "no" sentence about the thing he fears), which the owner never promised; remove that promise and say what the owner actually does instead, in his own facts`;
    case GATE_RULES.sameDayScope:
      return `${violation.field} promises a same-day visit or job, but the owner gave no general response time; remove the same-day promise from this field`;
    case GATE_RULES.factRestatement:
      return `${violation.field} restates an owner fact (${(violation.actual ?? '').split(':')[1] ?? 'fact'}: years in the trade, licence, warranty, response time or price) that the system already shows on this page in fixed wording; remove it from this field entirely and say something the page does not say yet (never the fact in other words or other numbers)`;
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
      const concepts = HERO_CAP_CONCEPT_ADDITIONS[group] ?? [];
      return `${violation.field} uses the signature phrase ${JSON.stringify(promptSignatureVariants(group))}${concepts.length ? ` (or one of the same idea: ${JSON.stringify(concepts)})` : ''}, which already appears in ${HERO_SIGNATURE_CAP} earlier hero headlines of this site; the owner's differentiator belongs only in the home hero and the one service hero it fits best. Rewrite this headline to lead with this service's own pain or moment, without that phrase or any paraphrase of it`;
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
    case GATE_RULES.aboutHeadlinePromise: {
      const [, kind, group] = (violation.actual ?? '').split(':');
      const what = kind === 'before'
        ? `a "before" construction (${JSON.stringify(BEFORE_TOKENS)})`
        : `the signature phrase ${JSON.stringify(promptSignatureVariants(group ?? ''))}${kind === 'concept' ? ` (or one of the same idea: ${JSON.stringify(HERO_CAP_CONCEPT_ADDITIONS[group ?? ''] ?? [])})` : ''}`;
      return `${violation.field} repeats the hero's promise with ${what}; the about headline introduces the man, not the promise. In at most 7 words, build it from what he does with his tool or his hands (first person, at most 6 words) or from one town of his area with his trade; his first name may come first only when it is written in Hebrew. No number, no trust-bar item, no signature phrase or synonym, no "before" construction, no quality adjective`;
    }
    case GATE_RULES.uspToolRequired: {
      const group = (violation.actual ?? '').split(':')[1] ?? '';
      return `${violation.field} never names the owner's own tool from his usp (${group}); in the sentence about what he does when he arrives, name that tool and what he does with it, in plain trade words, using one of these words: ${JSON.stringify(toolSatisfyStems(group))}. Do not name any other tool`;
    }
    case GATE_RULES.foreignTool: {
      const group = (violation.actual ?? '').split(':')[1] ?? '';
      const own = uspToolGroups(ctx);
      return `${violation.field} names a tool this owner never named (${group}: ${JSON.stringify(toolForeignStems(group))}); that is a false claim about him. Remove it and describe ${own.length ? `his own tool from his usp (${own.join(', ')})` : 'the check he does with his hands and eyes'} instead. Never copy a scene from the instructions`;
    }
    case GATE_RULES.aboutHeadlineTrustRepeat:
      return `${violation.field} repeats ${(violation.actual ?? '').includes('digits') ? 'a number' : 'an item'} of the trust bar, which already gave the years and the warranty; rewrite it from what he does with his tool or his hands (first person, at most 6 words) or from one town of his area with his trade, with no number and no trust-bar item, at most 7 words`;
    case GATE_RULES.aboutHeadlinePlaces:
      return `${violation.field} names more than ${ABOUT_HEADLINE_MAX_PLACES} place; name at most one town, naturally, never a list of towns and never "<town> and surroundings". Prefer a neighbouring town he serves over repeating the hero's city: ${(ctx.places ?? []).join(' / ')}`;
    case GATE_RULES.aboutCardEcho:
      return `${violation.field} repeats ${(violation.actual ?? '').split(':')[1] ?? ABOUT_CARD_ECHO_MIN_WORDS} words in a row of the about body; the explanation of how he works appears once on the page, and the about body keeps it. Rewrite this card in its own words and end it on its own result`;
    case GATE_RULES.cardPhraseEcho:
      return `${violation.field} shares a phrase with an earlier service card; each card ends on its own result, in its own words`;
    case GATE_RULES.warrantyDefinite:
      return `${violation.field} writes the warranty with the article and a bare duration, which is ungrammatical; follow rule C4: in a full sentence write the duration with the prefix lamed, and the warranty is received, never seen`;
    case GATE_RULES.servicesHeadlineSet:
      return `${violation.field} must be exactly one of these entries, word for word: ${JSON.stringify(SERVICES_HEADLINE_OPTIONS)}`;
    case GATE_RULES.trustBarFiller: {
      const phrase = TRUST_BAR_FILLER_PHRASES[index];
      return `${violation.field} uses the filler phrase ${JSON.stringify(phrase ?? '')}, which claims something a customer cannot check; replace the item with a checkable fact from the owner facts (years in the trade, a licence or certification, the warranty length, the service area, or the response time), as a short noun phrase. Never use any of: ${JSON.stringify(TRUST_BAR_FILLER_PHRASES)}`;
    }
    case GATE_RULES.trustBarSize: {
      const kind = (violation.actual ?? '').split(':')[0];
      return kind === 'trust_items'
        ? `trustBarItems has more than ${TRUST_BAR_MAX_ITEMS} items; keep at most ${TRUST_BAR_MAX_ITEMS}, one per kind (years, credential, warranty, service area, response time), and drop the rest`
        : `${violation.field} is longer than ${TRUST_BAR_MAX_CHARS} characters; write it as a shorter noun phrase with no verb, at most ${TRUST_BAR_MAX_CHARS} characters including spaces`;
    }
    case GATE_RULES.tradeTerm: {
      const entry = TRADE_TERMS.find(item => item.id === (violation.actual ?? '').split(':')[1]);
      if (!entry) return `${violation.field} uses a wrong trade term; rewrite it with the correct term`;
      if (entry.replacementPair) {
        return `${violation.field} uses ${JSON.stringify(entry.tokens)} with the wrong preposition (meant: ${entry.meant}); rewrite the whole sentence in plain native Hebrew: for one verb use ${JSON.stringify(entry.replacement)}, for two verbs that share one object use ${JSON.stringify(entry.replacementPair)}, keeping every word in agreement`;
      }
      return `${violation.field} uses ${JSON.stringify(entry.match === 'leadVerb' ? (entry.leadVerbs ?? []).map(verb => `${verb} ${entry.tokens[0]}`) : entry.tokens)}, which is the wrong ${entry.type === 'spellingFix' ? 'spelling' : 'term'} (meant: ${entry.meant}); rewrite the whole sentence in plain native Hebrew with this idea: ${JSON.stringify(entry.replacement)}, keeping every word in agreement`;
    }
    case GATE_RULES.tripledLetter:
      return `${violation.field} has the same Hebrew letter three or more times in a row (a typo); rewrite that word with its correct spelling`;
    case GATE_RULES.wrongPreposition: {
      const token = WRONG_PREPOSITION_TOKENS[index];
      return `${violation.field} uses ${JSON.stringify(token ?? '')}, the wrong preposition after this verb of fear (it takes the prefix lamed or mem, never this one); rewrite that phrase with the correct preposition, keeping the owner's verb`;
    }
    case GATE_RULES.heroAnchor: {
      const missing = (violation.actual ?? '').split(':')[1];
      const name = JSON.stringify(ctx.anchorName ?? '');
      const city = ctx.anchorCity ? JSON.stringify(ctx.anchorCity) : null;
      // M2b.1h: no fixed headline shape; keep the headline's promise and fit the anchor in where it reads naturally.
      return `${violation.field} is missing ${missing === 'both' ? 'the page name and the city' : missing === 'city' ? 'the city' : 'the page name'} of this page's search anchor; keep the headline's promise, and add the exact page name ${name}${city ? ` and the exact city ${city}` : ''} where they read naturally, character for character, and stay within the heroHeadline length limit stated for this field (shorten the rest of the headline, never the anchor)`;
    }
    case GATE_RULES.phraseRepeat: {
      const phrase = (LAST_REPEATED_PHRASES.get(ctx) ?? [])[index] ?? '';
      return `${violation.field} repeats the phrase ${JSON.stringify(phrase)} word for word, and ${PHRASE_REPEAT_MAX_FIELDS} other fields of this page already use it; keep the idea here only if it serves the reader, and then say it in fresh words (no run of ${PHRASE_REPEAT_MIN_WORDS} or more of the same words), or drop it from this field`;
    }
    case GATE_RULES.clauseRepeat: {
      const clause = (LAST_REPEATED_CLAUSES.get(ctx) ?? [])[index] ?? '';
      return `${violation.field} repeats the clause ${JSON.stringify(clause)} that another field of this page already states; each fact is stated in full once per page${ctx.depth ? ' (on this page the proof block is its home)' : ''}. Here, either drop it or refer to it in at most three words, and use the space for something the page has not said yet`;
    }
    case GATE_RULES.subjectPronoun: {
      const opener = BARE_VERB_SENTENCE_OPENERS[index];
      return `${violation.field} has a sentence that starts with the bare first-person verb ${JSON.stringify(opener ?? '')} with no subject; give that sentence its subject (${JSON.stringify(SUBJECT_CARRY_TOKENS[0] ?? '')}), or join it to a previous sentence that already has it`;
    }
    case GATE_RULES.foreignScript:
      return `${violation.field} contains characters of a non-Hebrew script (Chinese, Japanese, Korean, Cyrillic or Arabic); rewrite it in Hebrew only (a proper name in Latin letters is fine)`;
    case GATE_RULES.factTrace: {
      const kind = factTraceKind(violation.actual);
      if (kind === 'fact_ids' || kind === 'unknown_fact') return `${violation.field} must list the IDs of the owner facts this item was written from, using only IDs from allowedFacts / entities / offer / serviceFacts in the research brief`;
      if (kind === 'question') return `${violation.field} must be the id of one question in questionPool`;
      if (kind === 'number') return `${violation.field} states a number that is not in the owner facts it cites; remove the number or cite the fact that states it`;
      if (kind === 'tool') return `${violation.field} names a tool or method that is not in the owner facts it cites; remove it`;
      if (kind === 'story') return `${violation.field} tells a customer story that is not in the owner facts it cites; remove the story`;
      return `${violation.field} contains a claim that is not in the owner facts it cites`;
    }
    case GATE_RULES.termDensity: {
      const [, termIndex, ratio] = (violation.actual ?? '').split(':');
      const term = ctx.depth?.terms[Number(termIndex)]?.t;
      return `${violation.field} uses the search term ${term ? JSON.stringify(term) : 'listed in suggestedTerms'} more often than allowed on this page (${ratio ?? 'over the limit'} uses across the process, Q&A and proof blocks); use it less, never stuff search terms`;
    }
    default:
      return `${violation.field}: ${violation.rule}`;
  }
}
