/**
 * Research-bound site copy generation.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from './lpCopyPrompt';
import { buildLpCopyPrompt, buildSiteCopyPrompt, primaryCtaLabel } from './lpCopyPrompt';
import { callQwenJSON, type CallQwenJSONOptions } from '../ai/qwen-fast';
import type { PageBrief } from '../site-bot/research/pageBrief';
import type { SiteResearchDossier } from '../site-bot/research/types';
import { CLAIM_RULES, PLURAL_ADDRESS_TOKENS, SERVICE_DESCRIPTION_MIN_CHARS, WE_FORM_TOKENS } from './copyGates.config';
import { briefFactTexts } from '../site-bot/research/pageBrief';
import { codeOwnedFactTemplates, droppedOwnerFactKeys, ownerFacts, proofItemsFromFacts, responseScope, trustBarFromFacts, type OwnerFactTemplates } from './ownerFactCopy';
import { buildFearPromiseSpec, buildSameDayScopeSpec, type FearPromiseSpec, type SameDayScopeSpec } from './claimScope';
import { costFaq, formatShekels, ownerPricing, pricingPromisePhrases } from './researchedPricing';
import { proseSentences, restatementMatches, type FactRestatementSpec, type RestatementFact } from './factRestatement';
import { budgetStrings, repetitionBudgetDecisions, type BudgetOptions, type BudgetString } from './repetitionBudget';
import { applyQaAnswerLeads, assembleQaItems, planQa, qaAnswerLead, type QaPlan } from './qaCodeOwned';
import {
  DEPTH_BLOCK_KEYS,
  DEPTH_BLOCK_LIMITS,
  DEPTH_BLOCKS,
  DEPTH_BLOCKS_MAX_BYTES,
  depthShapeViolations,
  dropDepthItems,
  mergeDepthBlocks,
  rendersDepthBlocks,
  settleDepthBlocks,
  TERM_DENSITY_SHORT_PAGE_WORDS,
  type DepthBlockId,
} from './depthBlocks';
import {
  ARRIVAL_TOKENS,
  BAD_IDIOM_NOTES,
  BAD_IDIOMS,
  CLAIM_TOKENS,
  CTA_LABEL_SETS,
  GENERIC_ADJECTIVE_EXEMPT_PHRASES,
  GENERIC_ADJECTIVE_PHRASES,
  GENERIC_ADJECTIVE_WORDS,
  HERO_CTA_OVERRIDE,
  M2A6_PROMPT_RULES,
  M2B_EVERY_PAGE_RULE_IDS,
  M2B_PROMPT_RULES_AFTER_M2B2,
  M2B2_EVERY_PAGE_RULE_IDS,
  M2B2_PROMPT_RULES,
  NO_FINAL_PERIOD_FIELDS,
  PREPOSITION_PROMPT_LINE,
  SENTENCE_FINAL_PERIOD_FIELDS,
  SERVICES_HEADLINE_OPTIONS,
  STICKY_ACTION_TOKENS,
  TRADE_TERMS,
  TRUST_BAR_FILLER_PHRASES,
  TRUST_BAR_MAX_CHARS,
  TRUST_BAR_MAX_ITEMS,
  TYPOGRAPHY_RULE_TEXT,
  VOICE_PROMPT_RULES,
} from './generationData';
import {
  RESEARCHED_RENDERED_FIELDS,
  researchedGatedFieldsFor,
  researchedRenderedFieldsFor,
  researchedUngeneratedFieldsFor,
  rendersSiteSections,
  rendersStory,
} from './researchedSite';
import {
  blockingGateHits,
  buildAreaTile,
  copyGateContext,
  depthGateHits,
  DIFFERENTIATOR_SIGNATURE_CAP,
  differentiatorGroups,
  describeGateViolation,
  effectiveReviewQuote,
  reviewQuoteDropReason,
  fixTimeScope,
  GATE_RULES,
  pageVisibleWords,
  phraseRepeatFreeTokens,
  isAreaTile,
  PHRASE_REPEAT_MAX_FIELDS,
  PHRASE_REPEAT_MIN_WORDS,
  CLAUSE_REPEAT_MIN_WORDS,
  isInstallService,
  promptSignatureVariants,
  runCopyGates,
  serviceStage,
  SIGNATURE_GROUPS,
  slugVertical,
  STICKY_ARRIVAL_TOKENS,
  warningGateHits,
  withPlaceListPrefixes,
  type CopyGateContext,
  type HeroCapPageFacts,
  type ServiceStage,
  claimScopeSentenceRules,
} from './copyGates';

export type QwenJsonCaller = (
  systemPrompt: string,
  userMessage: string,
  options?: CallQwenJSONOptions,
) => Promise<string>;

export interface ResearchPageCopyDependencies {
  callJson?: QwenJsonCaller;
  /** Bounded LLM repair calls per page, shared across the Tamar and Noa stages. Default and max: MAX_COPY_REPAIRS. */
  maxRepairs?: number;
  /** Last-resort safe fixes (list-count trims, half-set review pair -> null). Default true. Never truncates text. */
  deterministicFixes?: boolean;
  /** Diagnostics: field names, limits, lengths and fix kinds only, never copy text. */
  onEvent?: (event: CopyRepairEvent) => void;
  /** Deterministic copy gates (M2a.1). Default true. */
  gates?: boolean;
  /** M2a.5: heroHeadlines of the site's pages generated before this one (duplicate-hook gate). */
  priorHeroHeadlines?: readonly string[];
  /** M2a.6: aboutPageHeadline / aboutPageBody of the site's pages generated before this one (route order). */
  priorAboutPageHeadlines?: readonly string[];
  priorAboutPageBodies?: readonly string[];
  /** M2a.7: hero-cap facts (masked labels, AC page) of the site's pages generated before this one, aligned with priorHeroHeadlines. */
  priorHeroFacts?: readonly HeroCapPageFacts[];
  /** 2026-11-10 (Noa's pattern F): the homepage's trust-bar proof-point wording, reused term for term on later pages. */
  siteTerms?: readonly string[];
  /**
   * Copy v2 slice 3: the generation prompt. 'v2' (the default once code owns the facts) is the short code-owns-facts prompt;
   * 'v1' keeps today's prompt for one A/B round. While the fact templates are pending only v1 exists (resolvePromptVersion).
   */
  promptVersion?: PromptVersion;
  /** Copy v2 slice 5: the clause keys of the homepage's own statements (siteGenerationContext), for the site-wide budget. */
  priorMechanismKeys?: readonly string[];
  /** Copy v2 slice 7: run the warn-only promise-contradiction judge (default PROMISE_JUDGE_ENABLED, which is off). */
  promiseJudge?: boolean;
}

export type PromptVersion = 'v1' | 'v2';

/** Copy v2 slice 3: the prompt a page gets. v2 needs code-owned facts; while the templates are pending every page gets v1. */
export function resolvePromptVersion(brief: Pick<PageBrief, 'site'>, requested?: PromptVersion): PromptVersion {
  if (!codeOwnsFacts(brief)) return 'v1';
  return requested ?? 'v2';
}

/**
 * Singular-male address rule (M2a.1, B). The forbidden forms are the gate's token data
 * (copyGates.config.ts), so the prompt and the gate can never drift apart.
 */
export const SINGULAR_ADDRESS_RULE =
  `ADDRESS (hard rule, binding): address the reader in the singular masculine second person only, as one man. Never use plural or second-person-plural forms. Forbidden forms, including with attached prefix letters: ${PLURAL_ADDRESS_TOKENS.map(entry => entry.token).join(', ')}. VOICE (grammar only): the owner speaks in the first-person singular, never in the first-person plural. Forbidden: ${WE_FORM_TOKENS.map(entry => entry.token).join(', ')}. This is a grammar rule, not a fact about the business: never state or imply that the owner works alone, answers the phone personally, or has no subcontractors or no call centre, unless an owner fact says so.`;

/**
 * Hebrew typography spec for the Noa and repair stages: Noa's typographyRule (M2a.2), copied
 * byte-exact by scripts/site-bot/build-generation-data.mjs into generationData.ts (escapes only).
 */
export const TYPOGRAPHY_RULE = TYPOGRAPHY_RULE_TEXT;

/** M2a.4: the reduplicated "line by line" form takes a maqaf (gate_reduplication_dash). Escape-only. */
export const REDUPLICATION_RULE =
  'A repeated word pair (the "line by line" form) is joined by a maqaf (\u05BE) with no spaces, never by a hyphen, a dash or a space.';

// ---------------------------------------------------------------------------
// M2a.5: Tamar's voice rules (data section 19.6, English, byte-exact from generationData.ts). The rules
// refer to Hebrew lists by name; voiceListLines() inserts those lists, all from generationData.ts.
// ---------------------------------------------------------------------------

function voiceRule(id: string): string {
  const rule = VOICE_PROMPT_RULES.find(item => item.id === id);
  if (!rule) throw new Error(`generationData has no voice prompt rule ${id}`);
  return `- ${rule.text}`;
}

/**
 * Rerun-3 item 3 (phrase bleed): the v2 model-facing prompts print no code-gate token list. A printed ban list primes the
 * model to write its phrases (a signature-phrase entry appeared verbatim on two sites whose owners never named it). The gates
 * keep every list in code; the v2 rules state the rule without the tokens. v1 stays byte-identical (A/B pin).
 */
export const SINGULAR_ADDRESS_RULE_V2 =
  'ADDRESS (hard rule, binding): address the reader in the singular masculine second person only, as one man. Never use plural or second-person-plural forms, including with attached prefix letters. VOICE (grammar only): the owner speaks in the first-person singular, never in the first-person plural. This is a grammar rule, not a fact about the business: never state or imply that the owner works alone, answers the phone personally, or has no subcontractors or no call centre, unless an owner fact says so.';

/** The P3 / P5 sentences that name a token list, and their v2 list-free replacement ('' = the sentence is removed). */
const V2_LIST_REFERENCE_CUTS: ReadonlyArray<readonly [string, string, string]> = [
  ['P3', 'Never use the words in `genericAdjectiveWords` or `genericAdjectivePhrases`.', 'Never use a generic quality adjective or a generic quality phrase.'],
  ['P5', ' Never use the tokens in `badIdiomTokens`; use the listed replacement idea instead.', ''],
];

/** A voice rule for the v2 prompts: the sentence naming a token list is replaced (asserted present exactly once). */
export function voiceRuleV2(id: string): string {
  let text = voiceRule(id);
  for (const [rule, cut, replacement] of V2_LIST_REFERENCE_CUTS) {
    if (rule !== id) continue;
    const at = text.indexOf(cut);
    if (at < 0 || text.indexOf(cut, at + 1) >= 0) throw new Error(`generationData rule ${id} changed; update the copy v2 list-reference cut.`);
    text = `${text.slice(0, at)}${replacement}${text.slice(at + cut.length)}`;
  }
  return text;
}

/** The section 19 Hebrew lists that the P-rules name (never the matching-only signature spellings). */
export function voiceListLines(options: { stickyArrival?: boolean; differentiatorGroups?: readonly string[] } = {}): string[] {
  const differentiator = options.differentiatorGroups ?? [];
  return [
    `- genericAdjectiveWords: ${JSON.stringify(GENERIC_ADJECTIVE_WORDS)}`,
    `- genericAdjectivePhrases: ${JSON.stringify(GENERIC_ADJECTIVE_PHRASES)}`,
    `- These exact phrases are not quality claims and stay allowed: ${JSON.stringify(GENERIC_ADJECTIVE_EXEMPT_PHRASES)}`,
    `- badIdiomTokens (never write the tokens; use the replacement idea, re-inflected to fit the sentence): ${JSON.stringify(BAD_IDIOMS.map(entry => ({ never: entry.tokens, meant: entry.meant, instead: entry.replacement, ...(entry.replacementFeminine ? { insteadFeminine: entry.replacementFeminine } : {}) })))}`,
    ...BAD_IDIOM_NOTES.map(note => `  ${note}`),
    `- signatureWordTokens (each inner list is one signature phrase; at most one of them, once, per page): ${JSON.stringify(Object.keys(SIGNATURE_GROUPS).map(promptSignatureVariants))}`,
    // M2a.6 (Adam): the owner's own differentiator phrase may appear twice per page.
    ...differentiator.map(group => `  The owner's differentiator phrase ${JSON.stringify(promptSignatureVariants(group))} may appear at most ${DIFFERENTIATOR_SIGNATURE_CAP} times per page.`),
    `- stickyActionTokens: ${JSON.stringify(options.stickyArrival === false ? STICKY_ACTION_TOKENS.filter(token => !STICKY_ARRIVAL_TOKENS.includes(token)) : STICKY_ACTION_TOKENS)}`,
  ];
}

/** Voice rules for the Tamar and repair system prompts (P3 words, P4 subject, P5 idioms) with their lists. */
const VOICE_SYSTEM_RULES = `VOICE (binding):\n${[voiceRule('P3'), voiceRule('P4'), voiceRule('P5')].join('\n')}\nLists named above:\n${voiceListLines().slice(0, 5).join('\n')}`;

/** M2a.6: Tamar's section 20.8 prompt rule by id (English, byte-exact). */
function m2a6Rule(id: string): string {
  const rule = M2A6_PROMPT_RULES.find(item => item.id === id);
  if (!rule) throw new Error(`generationData has no section 20 prompt rule ${id}`);
  return `- ${rule.text}`;
}

/** M2a.6: section 20.6 trade terms for the prompt (acOnly entries only on an AC page). Never auto-replaced. */
export function tradeTermLine(acPage: boolean): string {
  return `- tradeTermTokens (never write the wrong term; use the correct one, re-inflected to fit the sentence): ${JSON.stringify(TRADE_TERMS.filter(entry => !entry.acOnly || acPage).map(entry => ({
    ...(entry.tokens.length ? { never: entry.match === 'leadVerb' ? (entry.leadVerbs ?? []).map(verb => `${verb} ${entry.tokens[0]}`) : entry.tokens } : {}),
    meant: entry.meant, instead: entry.replacement, ...(entry.replacementPair ? { insteadForTwoVerbs: entry.replacementPair } : {}),
  })))}`;
}

/** M2a.6: R2 (scene), R3 (before), R6 (trade accuracy) also bind the Tamar and repair system prompts; M2a.7: plus Noa's verb / preposition line. */
const M2A6_SYSTEM_RULES = `${[m2a6Rule('R2'), m2a6Rule('R3'), m2a6Rule('R6'), `- ${PREPOSITION_PROMPT_LINE}`].join('\n')}`;

const COPY_SYSTEM_PROMPT =
  `You are Tamar, a Hebrew conversion copywriter. Follow the supplied research brief and JSON schema exactly. Return only the requested JSON object, with no prose or markdown.\n\n${SINGULAR_ADDRESS_RULE}`;

/** M2a.5: the research-site Tamar prompt adds the voice rules; the plain prompt stays as it was. */
const SITE_COPY_SYSTEM_PROMPT = `${COPY_SYSTEM_PROMPT}\n\n${VOICE_SYSTEM_RULES}\n${M2A6_SYSTEM_RULES}`;

const QA_SYSTEM_PROMPT =
  `You are Noa, a Hebrew language QA editor. Correct only language and typography in the supplied JSON, preserve all factual claims and structure, and return only valid JSON.\n\n${SINGULAR_ADDRESS_RULE} If any field breaks this rule, rewrite that sentence in singular masculine address.\n\n${TYPOGRAPHY_RULE} ${REDUPLICATION_RULE}`;

const REPAIR_SYSTEM_PROMPT =
  `You are Tamar, a Hebrew conversion copywriter. You are repairing specific fields of a site-copy JSON object that broke hard validator limits or copy rules. Return only a JSON object containing exactly the requested keys, with no prose or markdown.\n\n${SINGULAR_ADDRESS_RULE}\n\n${TYPOGRAPHY_RULE} ${REDUPLICATION_RULE}`;

/** M2a.5: research-site repairs also carry the voice rules, so a repair never trades one hit for another. */
const SITE_REPAIR_SYSTEM_PROMPT = `${REPAIR_SYSTEM_PROMPT}\n\n${VOICE_SYSTEM_RULES}\n${M2A6_SYSTEM_RULES}`;

/**
 * Copy v2 slice 3: the v2 system prompts. Tamar's carries only the role and the address rule (the v2 user prompt holds the
 * rest); the repair prompt keeps the voice rules, with pattern A in place of P4 (no aboutBlurb / sticky-bar mentions).
 */
// Rerun-3 item 3: the v2 system prompts carry the list-free address rule and no token list.
const SITE_COPY_SYSTEM_PROMPT_V2 = COPY_SYSTEM_PROMPT.replace(SINGULAR_ADDRESS_RULE, SINGULAR_ADDRESS_RULE_V2);
const SITE_REPAIR_SYSTEM_PROMPT_V2 = `${REPAIR_SYSTEM_PROMPT.replace(SINGULAR_ADDRESS_RULE, SINGULAR_ADDRESS_RULE_V2)}\n\nVOICE (binding):\n${[voiceRuleV2('P3'), '- A. Subject: in body text, a sentence that starts with a first-person present-tense verb carries the first-person subject pronoun, unless the previous sentence already does.', voiceRuleV2('P5')].join('\n')}\n${M2A6_SYSTEM_RULES}`;
const QA_SYSTEM_PROMPT_V2 = QA_SYSTEM_PROMPT.replace(SINGULAR_ADDRESS_RULE, SINGULAR_ADDRESS_RULE_V2);
/** Rerun-3 item 3 (tests / diagnostics): the v2 system prompts as sent. */
export const PROMPT_V2_SYSTEM_PROMPTS: Readonly<Record<'tamar' | 'repair' | 'noa', string>> = { tamar: SITE_COPY_SYSTEM_PROMPT_V2, repair: SITE_REPAIR_SYSTEM_PROMPT_V2, noa: QA_SYSTEM_PROMPT_V2 };

// ---------------------------------------------------------------------------
// Hard limits: the single source of truth for the validator, the violation
// explainer, the generation prompt and the repair prompt (paid-journey v2 M2a, B4).
// ---------------------------------------------------------------------------

/** Required, non-empty string fields: max characters (JS string length). */
export const SITE_COPY_STRING_LIMITS = {
  // M2a.6: heroCta is system-set on research sites; the section 20.7 planned/phone label is longer than the
  // old 15, so the limit is the longest system label (derived, never a hand-kept number).
  heroHeadline: 68, heroSubheadline: 90, heroCta: Math.max(15, HERO_CTA_OVERRIDE.planned.phone.length), aboutBlurb: 320,
  servicesHeadline: 35, faqHeadline: 30,
  formHeadline: 35, stickyBarLine: 25, aboutPageHeadline: 50, aboutPageBody: 400,
} as const;
/** Optional string-or-null fields: max characters when set. */
export const SITE_COPY_OPTIONAL_STRING_LIMITS = {
  reviewFeatured: 400, reviewContext: 160, responseTimeBadge: 100,
  // M2a.2 (item 7): null when the owner has no guarantee; the renderer then omits the block.
  guaranteeBlock: 100,
} as const;
/** Lists of plain strings. */
export const SITE_COPY_STRING_LIST_LIMITS = {
  // M2b.1e (section 22.2, Maya-confirmed at 360 px): the trust bar shares its caps with the gate (one constant each).
  trustBarItems: { maxItems: TRUST_BAR_MAX_ITEMS, itemMaxChars: TRUST_BAR_MAX_CHARS },
  serviceItems: { maxItems: 6, itemMaxChars: 25 },
} as const;
/** Lists of two-key objects; maxChars is per key, in keys order. */
export const SITE_COPY_PAIR_LIST_LIMITS = {
  faqItems: { maxItems: 20, keys: ['q', 'a'], maxChars: [120, 120] },
  serviceDetails: { maxItems: 6, keys: ['name', 'description'], maxChars: [25, 80] },
} as const;
/**
 * M2b.1h (pitch-first copy): fields that may be absent (every record saved before M2b.1h lacks them). When present: a
 * non-empty string within the limit, or null. pitch = the free sales letter of a pitch-first page (homepage, service hub),
 * stored on the page record and never rendered; storyHeadline / storyBody = the homepage story section.
 */
export const PITCH_MIN_WORDS = 120;
export const PITCH_MAX_WORDS = 220;
export const STORY_MIN_SENTENCES = 3;
export const STORY_MAX_SENTENCES = 5;
export const SITE_COPY_OPTIONAL_PRESENCE_LIMITS = { pitch: 1600, storyHeadline: 40, storyBody: 360 } as const;
type OptionalPresenceKey = keyof typeof SITE_COPY_OPTIONAL_PRESENCE_LIMITS;
const OPTIONAL_PRESENCE_KEYS = Object.keys(SITE_COPY_OPTIONAL_PRESENCE_LIMITS) as OptionalPresenceKey[];
export const STORY_FIELDS_M2B1H: readonly OptionalPresenceKey[] = ['storyHeadline', 'storyBody'];
export const SITE_COPY_MAX_BYTES = 16 * 1024;
/** Fields that must always be null. */
export const SITE_COPY_ALWAYS_NULL = ['scarcityLine'] as const;
/**
 * Review pair (M2a.1, Adam's decision): [quote, context]. The quote may stand alone
 * (no star rating); a context without a quote is invalid.
 */
export const SITE_COPY_BOTH_OR_NEITHER = ['reviewFeatured', 'reviewContext'] as const;
export const SITE_COPY_REVIEW_PAIR = SITE_COPY_BOTH_OR_NEITHER;
/** Upper bound on LLM repair calls per generated page. */
export const MAX_COPY_REPAIRS = 2;

const COPY_FIELDS = SITE_COPY_STRING_LIMITS;
const OPTIONAL_FIELDS = SITE_COPY_OPTIONAL_STRING_LIMITS;
type StringListKey = keyof typeof SITE_COPY_STRING_LIST_LIMITS;
type PairListKey = keyof typeof SITE_COPY_PAIR_LIST_LIMITS;
const STRING_LIST_KEYS = Object.keys(SITE_COPY_STRING_LIST_LIMITS) as StringListKey[];
const PAIR_LIST_KEYS = Object.keys(SITE_COPY_PAIR_LIST_LIMITS) as PairListKey[];
const SITE_COPY_KEYS = [
  ...Object.keys(COPY_FIELDS), ...Object.keys(OPTIONAL_FIELDS),
  'trustBarItems', 'serviceItems', 'faqItems', 'scarcityLine', 'serviceDetails',
];
/** Exactly the keys a SiteCopy object must have (validator order). */
export const SITE_COPY_KEY_LIST: readonly string[] = SITE_COPY_KEYS;

/**
 * M2b.1d: shape options of the bounded validator. `ungenerated` lists the top-level fields the page does not generate
 * (ungeneratedFieldsFor): those string fields may be empty, and serviceDetails may be an empty list (it always may).
 * Everything else is unchanged, so copy saved before M2b.1d (all fields filled) still passes.
 */
export interface SiteCopyShapeOptions {
  ungenerated?: readonly string[];
  /**
   * Copy v2 slices 4-5: a serviceDetails description may be exactly '' (the drop path removed it; the card keeps its name and
   * the renderer omits the line). Set only while code owns the facts, and for stored research records (relaxation only).
   */
  emptyCardDescriptions?: boolean;
  /**
   * The site's owner-confirmed service labels (site identity). A serviceDetails name that is exactly one of them is valid at
   * the label's own length: the prompt orders card names to match the labels character for character, and a label is the
   * owner's verbatim wording (never cut), so the card-name limit is derived from the labels rather than capping them. The
   * card heading wraps (grid cell minmax 220px, no nowrap), so a longer label only adds a line. Any other name keeps the
   * fixed limit.
   */
  serviceLabels?: readonly string[];
}

/** The keys of one pair list that may be '' under these shape options. */
function pairEmptyKeys(key: string, options: SiteCopyShapeOptions): readonly string[] {
  return key === 'serviceDetails' && options.emptyCardDescriptions ? ['description'] : [];
}

/** The per-key limits of one pair-list entry: a serviceDetails name equal to an owner label may be that label's length. */
function pairLimits(key: string, entry: unknown, limits: readonly number[], options: SiteCopyShapeOptions): readonly number[] {
  if (key !== 'serviceDetails' || !options.serviceLabels?.length || !plainObject(entry)) return limits;
  const name = entry.name;
  return typeof name === 'string' && options.serviceLabels.includes(name) && name.length > limits[0] ? [name.length, ...limits.slice(1)] : limits;
}

/** The longest owner label over the fixed card-name limit (prompt wording), or 0. */
export function longServiceLabelChars(labels: readonly string[] = []): number {
  const max = SITE_COPY_PAIR_LIST_LIMITS.serviceDetails.maxChars[0];
  return labels.reduce((longest, label) => (label.length > max && label.length > longest ? label.length : longest), 0);
}

function invalidCopy(): never {
  throw new Error('Invalid bounded generated site copy.');
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactFields(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void {
  const own = Reflect.ownKeys(value);
  if (own.some(key => typeof key !== 'string' || (!required.includes(key) && !optional.includes(key)))) invalidCopy();
  if (required.some(key => !own.includes(key))) invalidCopy();
  // M2b.1h: the optional-presence keys are checked like the required ones when present.
  const keys = [...required, ...optional.filter(key => own.includes(key))];
  if (keys.some(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return !descriptor || !descriptor.enumerable || !('value' in descriptor);
  })) invalidCopy();
}

function boundedString(value: unknown, max: number): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function boundedArray(value: unknown, max: number, check: (item: unknown) => boolean): boolean {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max ||
    Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor) || !check(descriptor.value)) return false;
  }
  return true;
}

function stringPair(value: unknown, keys: readonly string[], limits: readonly number[], emptyKeys: readonly string[] = []): boolean {
  if (!plainObject(value)) return false;
  if (Reflect.ownKeys(value).length !== keys.length) return false;
  for (let index = 0; index < keys.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, keys[index]);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return false;
    if (!boundedString(descriptor.value, limits[index]) && !(descriptor.value === '' && emptyKeys.includes(keys[index]))) return false;
  }
  return Reflect.ownKeys(value).every(key => typeof key === 'string' && keys.includes(key));
}

/** M2b.1d: an ungenerated required string field may be exactly empty. */
function allowedEmpty(key: string, value: unknown, options: SiteCopyShapeOptions): boolean {
  return value === '' && (options.ungenerated ?? []).includes(key);
}

/** Content depth: the optional-presence keys of the bounded validator (pitch / story, and the depth blocks). */
const PRESENCE_KEYS: readonly string[] = [...OPTIONAL_PRESENCE_KEYS, ...DEPTH_BLOCK_KEYS];

/** The copy without its depth keys (the base byte budget; the depth blocks have their own). */
function withoutDepthKeys(value: Record<string, unknown>): Record<string, unknown> {
  if (!DEPTH_BLOCK_KEYS.some(key => key in value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !DEPTH_BLOCK_KEYS.includes(key)));
}

export function assertBoundedGeneratedSiteCopy(value: unknown, options: SiteCopyShapeOptions = {}): asserts value is SiteCopy {
  if (!plainObject(value)) invalidCopy();
  exactFields(value, SITE_COPY_KEYS, PRESENCE_KEYS);
  if (depthShapeViolations(value).length) invalidCopy();
  for (const [key, max] of Object.entries(COPY_FIELDS)) {
    if (!boundedString(value[key], max) && !allowedEmpty(key, value[key], options)) invalidCopy();
  }
  for (const [key, max] of Object.entries(OPTIONAL_FIELDS)) {
    if (value[key] !== null && !boundedString(value[key], max)) invalidCopy();
  }
  for (const [key, max] of Object.entries(SITE_COPY_OPTIONAL_PRESENCE_LIMITS)) {
    if (key in value && value[key] !== null && !boundedString(value[key], max)) invalidCopy();
  }
  if (SITE_COPY_ALWAYS_NULL.some(key => value[key] !== null) ||
    (value[SITE_COPY_REVIEW_PAIR[0]] === null && value[SITE_COPY_REVIEW_PAIR[1]] !== null) ||
    STRING_LIST_KEYS.some(key => {
      const limit = SITE_COPY_STRING_LIST_LIMITS[key];
      return !boundedArray(value[key], limit.maxItems, item => boundedString(item, limit.itemMaxChars));
    }) ||
    PAIR_LIST_KEYS.some(key => {
      const limit = SITE_COPY_PAIR_LIST_LIMITS[key];
      return !boundedArray(value[key], limit.maxItems, item => stringPair(item, limit.keys, pairLimits(key, item, limit.maxChars, options), pairEmptyKeys(key, options)));
    })) invalidCopy();
  try {
    if (Buffer.byteLength(JSON.stringify(withoutDepthKeys(value)), 'utf8') > SITE_COPY_MAX_BYTES) invalidCopy();
  } catch {
    invalidCopy();
  }
}

export type CopyValidationStage = 'tamar' | 'noa' | 'final';

/** One reason a generated SiteCopy failed the bounded validator. Lengths only, never copy text. */
export interface CopyViolation {
  field: string;
  rule: string;
  limit?: number;
  actual?: number | string;
}

/**
 * Thrown where the bounded validator rejects generated copy. Same message as the
 * plain validator error; additionally carries every violation found so the caller
 * can log field + limit + actual (paid-journey v2 M0.5, B4 part).
 */
export class GeneratedCopyValidationError extends Error {
  readonly stage: CopyValidationStage;
  readonly violations: CopyViolation[];

  constructor(stage: CopyValidationStage, violations: CopyViolation[]) {
    // name stays 'Error' so String(error) is unchanged for existing callers/tests.
    super('Invalid bounded generated site copy.');
    this.stage = stage;
    this.violations = violations;
  }
}

function stringViolation(field: string, value: unknown, max: number): CopyViolation | null {
  if (typeof value !== 'string') return { field, rule: 'type', actual: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value };
  if (value.trim().length === 0) return { field, rule: 'empty' };
  if (value.length > max) return { field, rule: 'max_length', limit: max, actual: value.length };
  return null;
}

function arrayViolations(
  field: string,
  value: unknown,
  max: number,
  item: (entry: unknown, index: number) => CopyViolation[],
): CopyViolation[] {
  if (!Array.isArray(value)) return [{ field, rule: 'type', actual: value === null ? 'null' : typeof value }];
  const out: CopyViolation[] = [];
  if (value.length > max) out.push({ field, rule: 'max_items', limit: max, actual: value.length });
  value.forEach((entry, index) => out.push(...item(entry, index)));
  return out;
}

function pairViolations(field: string, entry: unknown, keys: readonly string[], limits: readonly number[], emptyKeys: readonly string[] = []): CopyViolation[] {
  if (!plainObject(entry)) return [{ field, rule: 'type', actual: entry === null ? 'null' : Array.isArray(entry) ? 'array' : typeof entry }];
  const out: CopyViolation[] = [];
  for (const key of Object.keys(entry)) if (!keys.includes(key)) out.push({ field: `${field}.${key}`, rule: 'unexpected' });
  keys.forEach((key, index) => {
    if (entry[key] === '' && emptyKeys.includes(key)) return;
    const violation = stringViolation(`${field}.${key}`, entry[key], limits[index]);
    if (violation) out.push(violation);
  });
  return out;
}

/**
 * Explains why assertBoundedGeneratedSiteCopy rejects a value: every violation, not
 * just the first. Diagnostic only; the assert stays the single source of truth.
 */
export function explainGeneratedSiteCopyViolations(value: unknown, options: SiteCopyShapeOptions = {}): CopyViolation[] {
  if (!plainObject(value)) return [{ field: '$', rule: 'not_object' }];
  const out: CopyViolation[] = [];
  const own = Object.keys(value);
  for (const key of SITE_COPY_KEYS) if (!own.includes(key)) out.push({ field: key, rule: 'missing' });
  for (const key of own) if (!SITE_COPY_KEYS.includes(key) && !PRESENCE_KEYS.includes(key)) out.push({ field: key, rule: 'unexpected' });
  out.push(...depthShapeViolations(value));
  for (const [key, max] of Object.entries(COPY_FIELDS)) {
    if (!own.includes(key) || allowedEmpty(key, value[key], options)) continue;
    const violation = stringViolation(key, value[key], max);
    if (violation) out.push(violation);
  }
  for (const [key, max] of Object.entries(OPTIONAL_FIELDS)) {
    if (!own.includes(key) || value[key] === null) continue;
    const violation = stringViolation(key, value[key], max);
    if (violation) out.push(violation);
  }
  for (const [key, max] of Object.entries(SITE_COPY_OPTIONAL_PRESENCE_LIMITS)) {
    if (!own.includes(key) || value[key] === null) continue;
    const violation = stringViolation(key, value[key], max);
    if (violation) out.push(violation);
  }
  for (const key of SITE_COPY_ALWAYS_NULL) {
    if (own.includes(key) && value[key] !== null) out.push({ field: key, rule: 'must_be_null' });
  }
  const [pairA, pairB] = SITE_COPY_REVIEW_PAIR;
  if (value[pairA] === null && value[pairB] !== null) {
    out.push({ field: `${pairA}+${pairB}`, rule: 'context_requires_quote', actual: `${pairB}_only` });
  }
  for (const key of STRING_LIST_KEYS) {
    const limit = SITE_COPY_STRING_LIST_LIMITS[key];
    out.push(...arrayViolations(key, value[key], limit.maxItems, (entry, index) => {
      const violation = stringViolation(`${key}[${index}]`, entry, limit.itemMaxChars);
      return violation ? [violation] : [];
    }));
  }
  // Pair lists keep the M0.5 report order: faqItems before serviceDetails.
  for (const key of PAIR_LIST_KEYS) {
    const limit = SITE_COPY_PAIR_LIST_LIMITS[key];
    out.push(...arrayViolations(key, value[key], limit.maxItems, (entry, index) => pairViolations(`${key}[${index}]`, entry, limit.keys, pairLimits(key, entry, limit.maxChars, options), pairEmptyKeys(key, options))));
  }
  try {
    const bytes = Buffer.byteLength(JSON.stringify(withoutDepthKeys(value)), 'utf8');
    if (bytes > SITE_COPY_MAX_BYTES) out.push({ field: '$', rule: 'max_bytes', limit: SITE_COPY_MAX_BYTES, actual: bytes });
  } catch {
    out.push({ field: '$', rule: 'not_serializable' });
  }
  return out;
}

function assertCopyAt(stage: CopyValidationStage, value: unknown, options: SiteCopyShapeOptions = {}): asserts value is SiteCopy {
  try {
    assertBoundedGeneratedSiteCopy(value, options);
  } catch {
    const violations = explainGeneratedSiteCopyViolations(value, options);
    // The assert also rejects shapes the explainer does not itemise (e.g. accessor properties).
    throw new GeneratedCopyValidationError(stage, violations.length ? violations : [{ field: '$', rule: 'structure' }]);
  }
}

function supportedFaqItems(brief: PageBrief): SiteCopy['faqItems'] {
  if (brief.faqPolicy === 'none') return [];
  return brief.faqCandidates.map(candidate => ({ q: candidate.question, a: candidate.answer }));
}

function applyFaqPolicy(copy: SiteCopy, brief: PageBrief): SiteCopy {
  return { ...copy, faqItems: supportedFaqItems(brief) };
}

/** M2a.1 copy rules (English). Site-specific lines only when the brief carries site facts. */
/** The proof-point copy rule of a page that is not pitch-first (unchanged since M2a). */
export const PROOF_POINT_RULE = '- Every proof point you put in trustBarItems or guaranteeBlock (and every owner guarantee, pricing or USP point) may appear in at most two other fields of the page, in any wording; the system counts it. In serviceDetails descriptions, describe the service itself instead of repeating proof points.';
/** M2b.1h: the proof-point copy rule of a pitch-first page: proof points stay capped, the one big promise may be restated in fresh words. */
export const PITCH_FIRST_PROOF_POINT_RULE = '- Every proof point you put in trustBarItems or guaranteeBlock (years, a licence, the warranty, the area) may appear in at most two other fields of the page. The one big promise (from the owner\'s usp, guarantee or pricing) may come back in more fields, each time in fresh words (see PITCH FIRST below). In serviceDetails descriptions, describe the service itself instead of repeating proof points.';

/**
 * Copy v2 slice 2: the LICENSE rule when code owns the facts. The credential is code-built (trust bar / B6) and a non-Hebrew
 * licence never reaches the model, so only the Hebrew-wording and no-grade clauses stay.
 */
export const LICENSE_RULE_CODE_OWNED = '- LICENSE (binding): if the owner\'s license wording is in Hebrew, name it exactly in that wording, with one consistent term on every page. Never translate a license or map it to a license grade, level or title (for example "master"), and never add a grade the owner did not state in Hebrew.';

export function buildResearchCopyRules(brief: PageBrief, data: CollectedData = {}, siteTerms?: readonly string[]): string[] {
  const site = brief.site;
  const codeOwns = codeOwnsFacts(brief);
  const rules = [
    SINGULAR_ADDRESS_RULE,
    '- Use each owner fact at most twice per page; rotate proof points across fields instead of repeating the same fact.',
    pitchFirstPage(brief) ? PITCH_FIRST_PROOF_POINT_RULE : PROOF_POINT_RULE,
    '- When a field must be shorter, cut a whole idea. Never shorten by dropping a verb\'s object or leaving a sentence grammatically incomplete.',
    '- Owner facts may arrive translated or in English. Render their meaning in native, idiomatic Hebrew; never mirror an English idiom or English word order, and never copy English wording into the copy (proper names excepted).',
    '- The customer quote may appear only in reviewFeatured, which the system fills in verbatim. Never quote, paraphrase or echo it in any other field.',
    '- heroCta is fixed by the system: output it exactly as given in the schema.',
    '- reviewFeatured is filled in by the system: output it exactly as given in the schema. reviewContext: only when the data supplies a star rating, otherwise null.',
    // Copy v2 slice 2: with code-owned facts the badge and the guarantee block are not generated (never rendered on a
    // research site), and the licence is never shown to the model in English, so the "say only that he is licensed"
    // downgrade is gone.
    ...(codeOwns ? [] : ['- responseTimeBadge: when the owner gave a response time, write a short native Hebrew badge from it; otherwise null.']),
    codeOwns ? LICENSE_RULE_CODE_OWNED : '- LICENSE (binding): if the owner\'s license wording is in Hebrew, name it exactly in that wording, with one consistent term on every page. If it is not in Hebrew (it arrived translated), say only that he is licensed: never translate or map it to a license grade, level or title (for example "master"), never add a grade the owner did not state in Hebrew.',
    '- HOURS (binding): never write business days or hours in any field: no day names, no day letters, no clock times. The system shows the owner\'s hours.',
    ...(codeOwns ? [] : ['- guaranteeBlock: when the schema gives it as null (the owner has no guarantee), output null. Never write a filler promise in its place.']),
    '- Never attribute a statement to a customer or to customers (no "a customer told me", no "customers say"). The only customer voice on the page is the verbatim quote in reviewFeatured, when there is one.',
    '- When you list several places as locations, attach the locative prefix letter (\u05D1) to every place in the list, including after the conjunction (\u05D5); never only to the first.',
    '- Write place names exactly as given in the service-area local fact: never insert a hyphen or maqaf into a place name.',
    '- Name only the places in the service-area local fact (use their display names); never a wider region and never "and surroundings".',
    // M2a.3 (items 7-8).
    '- The customer quote and the customer\'s fear are not owner facts. Never turn what a customer said (for example that the price did not change, a fast arrival, a clean job) or the opposite of the customer\'s fear (for example "the price never changes", "no surprises in the price") into the owner\'s promise or guarantee, unless an owner fact states it.',
    '- AVAILABILITY (binding): state hours or availability only in the owner\'s own terms. Never write an availability figure such as 24/7 or 24/6 unless the owner wrote exactly that figure.',
    // M2a.4.
    '- VOICE (binding): the first-person plural is forbidden in every tense and form, not only the listed words: no "we did", "we started", "we will", "our" or "us". The owner always speaks as "I".',
    '- NAMES (binding): write the business name and the owner\'s name exactly as they appear in the owner facts, in their original script and spelling, character for character. Never transliterate a Latin name into Hebrew letters and never translate a name.',
    '- SERVICE AREA (binding): every field, including trustBarItems, names only the places in the service-area local fact. Never add a region, a district, nearby towns or "and surroundings", even when the owner gave a travel distance.',
    '- FREE OF CHARGE (binding): never say that anything is free or at no cost unless an owner fact says that exact item is free. A free quote does not make an inspection, a visit or a repair free.',
    '- PRICE (binding): never promise that the price is fixed, final or will not change, or that nothing will be added to it, unless an owner fact states it. A customer review never counts as an owner fact.',
    '- SAME DAY (binding): promise a same-day arrival only when the owner gave a response time. Promise to finish or fix a job the same day only when the owner\'s USP or guarantee says so, and only for the service it names.',
    `- ${REDUPLICATION_RULE}`,
  ];
  if (site) {
    const scope = fixTimeScope(briefGateContext(brief, data));
    if (isInstallPage(brief)) {
      rules.push('- INSTALLATION PAGE (binding): this page is about an installation service. Never state an arrival or response time on it (no "arrives within <time>"): the emergency response time belongs on repair pages only.');
    }
    if (scope instanceof Set) rules.push(`- A same-day / fix-within promise from the owner covers only these services: ${JSON.stringify([...scope])}. Never extend it to any other service.`);
    // M2b.1d: the serviceDetails lines only on a page that generates the service cards.
    const cards = !ungeneratedFieldsFor(brief).includes('serviceDetails');
    rules.push(
      ...(cards ? [`- serviceDetails descriptions: one complete sentence of at least ${SERVICE_DESCRIPTION_MIN_CHARS} characters on what the service includes for the customer (within the length limit); never just the service name restated.`] : []),
      cards
        ? `- serviceItems is filled in by the system. serviceDetails: at most one entry per service; every name must be exactly one of these owner-confirmed service names, character for character: ${JSON.stringify(site.serviceLabels)}. Never add any other service.`
        : '- serviceItems is filled in by the system.',
      heroAnchorRule(brief),
      site.ownerIntroPage
        ? '- The "my name is <first name>" opener appears once per site: this is that page. Use it at most once here (aboutBlurb); aboutPageBody must not repeat it.'
        : '- The "my name is <first name>" opener appears once per site and the homepage already has it. Do not open aboutBlurb or aboutPageBody with it or any other self-introduction by name; this overrides the ABOUT SECTION opener instruction below.',
    );
    rules.push(...buildVoiceRules(brief, data));
    // 2026-11-10 generator fixes (Tamar items 1-3, Noa's patterns A-H).
    rules.push(...FACT_LEDGER_RULES, ...repetitionBudgetRules(brief), ...(pitchFirstPage(brief) ? cutContractRules(brief) : []), ...HEBREW_PATTERN_RULES);
    const terms = siteTermsRule(siteTerms);
    if (terms && brief.page.pageClass !== 'homepage') rules.push(terms);
  }
  return rules;
}

// ---------------------------------------------------------------------------
// 2026-11-10 generator fixes from the M2b.1h eval (Tamar: fact ledger, cut contract, clause budget; Noa: Hebrew patterns
// A-H). English only and abstract: no Hebrew example lines (rule examples leak into output).
// ---------------------------------------------------------------------------

/** Tamar item 1: the fact ledger, decided before the pitch (or the copy) is written. */
export const FACT_LEDGER_RULES: readonly string[] = [
  '- FACT LEDGER (binding; in your reasoning, before you write the pitch or any field; do not output it): list every claim you plan to make (each tool, process step, outcome, scope, credential and its tier, time or availability, and logistics such as who comes, when and how) and next to each the owner field it comes from. Drop every claim that has no named owner field.',
  '- FEAR IS NOT A GUARANTEE (binding): answer the customer\'s fear only with what the owner states, at the strength he states it. Never turn the fear into an absolute promise or guarantee (never "never", "always", "guaranteed" or "zero risk" unless an owner field says exactly that).',
  '- CREDENTIAL TIER (binding): name every credential at exactly the tier the owner states. Never raise it (a trained or certified person into a licensed, senior or master one) and never lower it (a licensed owner into merely experienced).',
  '- LOGISTICS (binding): who comes, when, how and with what is stated the same way in every field. No field may contradict, widen or vary what another field says about it.',
  '- USP ABOVE THE FOLD (binding): every clause of the owner\'s usp, including any time or availability clause, appears above the fold: in heroHeadline, heroSubheadline or the trust bar. Never leave a usp clause only further down the page.',
];

/** Tamar item 3: the clause-level repetition budget (gate_clause_repeat counts it). */
export function repetitionBudgetRules(brief: Pick<PageBrief, 'site' | 'page' | 'blocksEnabled'>): string[] {
  return [
    `- REPETITION BUDGET (binding): each owner fact gets one full statement on the page plus at most one short reference (three words or fewer) in one other field. Never the same run of ${CLAUSE_REPEAT_MIN_WORDS} or more words in two fields, not even inside a longer sentence; the system checks every clause.`,
    ...(depthLayout(brief).includes('proof') ? ['- PROOF HOME (binding on this page): proofItems is the home of the proof facts (years, licence, warranty, response time). State each of them in full there, once; anywhere else on this page, at most a short reference. The proof-point counts above do not count proofItems.'] : []),
  ];
}

/** Tamar item 2: the cut contract of a pitch-first page (story lines on the homepage only). */
export function cutContractRules(brief: Pick<PageBrief, 'site' | 'page'>): string[] {
  const story = storyPage(brief);
  return [
    '- CUT CONTRACT (binding): heroSubheadline is one benefit sentence built on a verb: what the reader gets. Never a list of nouns, features or proof points joined by commas.',
    ...(story ? [
      '- storyBody keeps the pitch\'s single highest-tension agitation line, states the mechanism once, and ends on the reader\'s outcome (his situation once the job is done), never on the tool or on the owner.',
      '- storyBody and aboutPageBody use different moments: never the same scene, time, room or step in both. If one is set at the moment of the problem, the other opens on a different moment of the job.',
    ] : []),
  ];
}

/** Noa's Hebrew patterns A-H (M2b.1h eval), as abstract English rules. G keeps the anchor rule unchanged (H1 changes need Yonatan). */
export const HEBREW_PATTERN_RULES: readonly string[] = [
  'HEBREW PATTERNS (Noa, binding on every field):',
  '- A. Subject: in body text (story, about, service descriptions, process steps, proof items, answers), a sentence that starts with a first-person present-tense verb carries the first-person subject pronoun, unless the previous sentence already does. Verbless fragments are allowed only in the hero subheadline, badges and the trust bar.',
  '- B. Modals: a "shouldn\'t" or "doesn\'t have to" construction takes its idiomatic Hebrew form and always carries the verb it completes; never a bare modal.',
  '- C. Collocations: use the fixed verb and noun pairs a native speaker uses: the verb that goes with giving a warranty, the trade\'s own noun for the fault, and the verb that goes with closing or sealing it. Never pair a noun with a verb translated literally from English.',
  '- D. After a verb, describe the action with the adverb form, never with an adjective that agrees with a noun.',
  '- E. Write the words of the "all / everything" family in standard full spelling, the same way everywhere.',
  '- F. One term per concept per site: the credential, the warranty and the years in the trade each get one term. The homepage sets it; every other page reuses the homepage\'s exact term, never a synonym or a different construction.',
  '- G. Question hooks: when heroHeadline opens with a question or a hook, it describes a state that is true for the reader who searched this page, right now; its tail (the promise) must be backed by the body of the page. The anchor rule above applies unchanged.',
  '- H. Every transitive verb has its object, every relative clause has its verb, and abbreviations and quotes use the Hebrew geresh and gershayim, never ASCII apostrophes or quotes.',
];

/** Pattern F on a page after the homepage: the homepage's own proof-point wording, to reuse term for term. */
export function siteTermsRule(siteTerms: readonly string[] | undefined): string | null {
  const terms = (siteTerms ?? []).map(item => item.trim()).filter(Boolean);
  return terms.length ? `- SITE TERMS (pattern F): the homepage words its proof points as ${JSON.stringify(terms)}. When this page names the same credential, warranty or years, use the homepage's term for it exactly; never a synonym.` : null;
}

/**
 * Yonatan's H1 anchor rule (M2a.6, signed off), replacing the M2a.1 soft "where it reads naturally" line. The
 * anchor is the title's page.seo name and city; the example interpolates the title formula's city prefix.
 */
export function heroAnchorRule(brief: PageBrief): string {
  const site = brief.site;
  if (!site) return '';
  const name = JSON.stringify(site.pageName);
  const city = site.city ? JSON.stringify(site.city) : null;
  const home = brief.page.pageClass === 'homepage';
  const subject = home ? `This homepage's search anchor is the trade ${name}` : `This page's search anchor is ${name}`;
  // M2b.1h: the forced '<hook>? <name city> \u2014 <differentiator>' pattern is gone; the anchor words and the gate stay.
  return `- ${subject}${city ? ` in ${city}` : ''}. heroHeadline MUST contain ${home ? 'the trade ' : ''}${name} exactly${city ? ` and ${city} exactly` : ''}, character for character, wherever they read naturally.`;
}

/** M2b.1h: a pitch-first page (research site, homepage or service hub): the model writes a free pitch first and cuts the fields from it. */
/** M2b.1h (Adam): pitch-first pages also decide stage / promise / mechanism before the pitch; Qwen is flat-rate, so only latency grows. */
export const PITCH_FIRST_THINKING_BUDGET = 3000;

export function pitchFirstPage(brief: Pick<PageBrief, 'site' | 'page'>): boolean {
  return Boolean(brief.site) && rendersSiteSections(brief.page.pageClass);
}

/** M2b.1h: a page that generates (and renders) the story section: the research-site homepage. */
export function storyPage(brief: Pick<PageBrief, 'site' | 'page'>): boolean {
  return Boolean(brief.site) && rendersStory(brief.page.pageClass);
}

/**
 * M2b.1h (Adam, Eitan-approved 2026-11-10): on a pitch-first page the promise may be restated in fresh words, and the hero has
 * no fixed shape. These byte-exact English cuts relax the count caps of the data-file rules (P1, R1, B1, B6) on those pages
 * only; each anchor must occur exactly once in its rule (a data edit fails the prompt build instead of silently skipping).
 * The placement rules stay: the promise never goes in the trust bar, the services headline, a card or the about headline.
 */
export const PITCH_FIRST_RULE_EDITS: Readonly<Record<string, ReadonlyArray<readonly [string, string]>>> = {
  P1: [
    ['P1 \u2014 One differentiator, said once. State the owner\'s main differentiator in full once per page, in the hero or the about body, and at most once more anywhere else on that page. Every other field must add something new:',
      'P1 \u2014 One differentiator, one big promise. The owner\'s main differentiator is the page\'s one big promise: the hero headline carries it, and other fields may restate it in fresh words (see PITCH FIRST), never with the same phrase. Every field must also add something new:'],
  ],
  R1: [
    ['Don\'t use synonyms or paraphrases to repeat it; any phrasing of the same idea counts as a repeat.',
      'Don\'t use synonyms or paraphrases to repeat it in another hero; in a hero, any phrasing of the same idea counts as a repeat. Within this page, restating it in fresh words is allowed (see PITCH FIRST).'],
  ],
  B1: [
    ['B1 \u2014 Promise twice, proof once.', 'B1 \u2014 One promise, restated in fresh words.'],
    ['  - It appears exactly twice on the page: once in the hero (the headline or the subheadline, never both) and once in the about body.',
      `  - The hero headline carries it. It may come back in fresh words in the subheadline, the story section (homepage) and the about body, wherever it serves the reader. Never the same phrase of ${PHRASE_REPEAT_MIN_WORDS} or more words in more than ${PHRASE_REPEAT_MAX_FIELDS} fields.`],
    ['  - It never appears, in any wording or synonym, in the trust bar, the services headline, a service card or the about headline.',
      '  - It never appears in the trust bar, the services headline, a service card or the about headline: those fields have their own jobs (rules B2 to B5).'],
  ],
  B6: [
    ['This is the proof behind the hero\'s promise, and the only place on the page where the promise may come back, once.',
      'This is the proof behind the hero\'s promise; when the promise comes back here, say it in fresh words.'],
  ],
};

/** M2b.1h: rules dropped on a pitch-first page: R7 / R8 force the hook-then-anchor hero shape (the anchor stays in heroAnchorRule). */
export const PITCH_FIRST_DROPPED_RULE_IDS: readonly string[] = ['R7', 'R8'];

/** One rule's text on a pitch-first page (PITCH_FIRST_RULE_EDITS applied, each anchor asserted unique). */
export function pitchFirstRuleText(rule: { id: string; text: string }): string {
  let text = rule.text;
  for (const [from, to] of PITCH_FIRST_RULE_EDITS[rule.id] ?? []) {
    const at = text.indexOf(from);
    if (at < 0 || text.indexOf(from, at + 1) >= 0) throw new Error(`generationData rule ${rule.id} changed; update the M2b.1h pitch-first edit.`);
    text = `${text.slice(0, at)}${to}${text.slice(at + from.length)}`;
  }
  return text;
}

/**
 * M2b.1h: the direct-response toolkit (copywriter.md, "Direct-response formulas \u2014 the fathers' toolkit", the 8 points and
 * the process paragraph), adapted to the generator: the owner speaks in the first person, the facts are only his facts, and
 * every example is abstract English (a concrete example once leaked into output as an invented tool).
 */
export const DIRECT_RESPONSE_TOOLKIT: readonly string[] = [
  '1. Position first (Schwartz, Breakthrough Advertising). Decide the reader\'s awareness stage and the market\'s sophistication stage (how many similar promises he has already heard). Channel a desire he already has; never try to create one. At high sophistication, lead with the unique mechanism: the specific how that makes this owner\'s promise believable.',
  '2. One big promise. Every section serves it. Restate it deliberately in fresh words; never the same phrase twice.',
  '3. Headline (Caples, Ogilvy; Bly\'s 4 U\'s). The headline carries the promise: self-interest, news or curiosity. Make it useful, urgent, unique and ultra-specific. Specific numbers and concrete nouns beat adjectives.',
  '4. Reason-why and specificity (Hopkins, Scientific Advertising). Every claim gets a reason or a checkable fact, and the only facts are the owner\'s facts. A number the owner gave beats an adjective; the owner\'s own method, described plainly, beats a quality word.',
  '5. Body (PAS + Sugarman\'s slippery slide). Problem, then agitate (the felt scene: the reader is there, now), then the solution through the mechanism. Each sentence\'s only job is to make him read the next one.',
  '6. Features to benefits (FAB). Feature, then what it does, then what he gets. End on his outcome, not the tool.',
  '7. Objections and risk reversal (Halbert, Kennedy). Answer his fear before he says it, with what the owner actually offers (his price policy, his warranty, his method), never with a promise the owner did not make. Then a reason to act now, taken from the owner\'s facts (never an invented deadline, discount or scarcity), and the moment after the problem is solved.',
  '8. Rhythm. Mix short punches with longer lines. Read it aloud: if every sentence has the same length, it reads as AI.',
];

/** M2b.1h: the PITCH FIRST prompt section of a pitch-first page (English only; story lines on the homepage). */
export function buildPitchFirstSection(brief: Pick<PageBrief, 'site' | 'page'>): string {
  const story = storyPage(brief);
  const limits = SITE_COPY_OPTIONAL_PRESENCE_LIMITS;
  return [
    'PITCH FIRST (binding on this page; it overrides any instruction to write the copy field by field):',
    'You write this page the way the classic direct-response masters did. The owner speaks in the first person, to one reader, in the singular. The only facts you may use are the owner\'s facts and the research brief above: never a number, tool, place, price policy, guarantee or story they do not state.',
    '',
    'Before you write anything, decide three things in your reasoning (do not output them):',
    '- The reader\'s awareness stage and the market\'s sophistication stage.',
    '- The one big promise of this page, from the owner\'s usp (or, if it has none, from his strongest fact against the customer\'s fear).',
    '- The unique mechanism: the specific how, from the owner\'s usp, that makes the promise believable.',
    '',
    'The toolkit (use the formula that fits each part):',
    ...DIRECT_RESPONSE_TOOLKIT,
    '',
    'Process for this page: first write the whole pitch as one free-flowing short sales letter, with no field limits. Then cut and fit it into the required fields, keeping the strongest lines. Never write field by field from scratch.',
    '',
    `- "pitch" is the first key of your JSON output: that sales letter, ${PITCH_MIN_WORDS} to ${PITCH_MAX_WORDS} words of Hebrew prose (at most ${limits.pitch} characters), in the owner's first person, addressed to the reader. No field limit applies to it, but every binding rule above does: no claim beyond the owner's facts, no business days or hours, no customer quote, no past-job story. The system stores it and never shows it.`,
    '- Then write every other key by cutting it from the pitch: keep its strongest lines, and fit each one to its field\'s limit and rules.',
    '- heroHeadline carries the one big promise. It has no fixed shape: no required hook, question, dash or clause order. It must still contain the anchor words (see the anchor rule above) and stay within its length limit.',
    `- Restate the promise in fresh words where it serves the page; never reuse the same phrase. The same run of ${PHRASE_REPEAT_MIN_WORDS} or more consecutive words may appear in at most ${PHRASE_REPEAT_MAX_FIELDS} fields of the page (the trust bar counts as one field); the system counts it.`,
    ...(story ? [
      `- storyBody: the story section, shown right below the hero. ${STORY_MIN_SENTENCES} to ${STORY_MAX_SENTENCES} sentences, at most ${limits.storyBody} characters, taken from the pitch's strongest lines: the felt scene of the reader's problem, then the owner's mechanism. First person, varied sentence length, and none of the hero's wording.`,
      `- storyHeadline: the story section's heading, at most ${limits.storyHeadline} characters, or null. It names the scene or the mechanism, never the hero's promise word for word.`,
    ] : []),
  ].join('\n');
}

/** Service slug that decides the page's stage: the money page's own slug; on the homepage, its first service (section 19.4). */
export function stageSlug(brief: PageBrief): string {
  const path = brief.page.pageClass === 'homepage'
    ? brief.links.find(link => link.relationship === 'service_child')?.targetPath ?? ''
    : brief.page.targetPath;
  return path.split('/').filter(Boolean).pop() ?? '';
}

/** The page's service stage (section 19.4). */
export function pageStage(brief: PageBrief): ServiceStage {
  return serviceStage(stageSlug(brief));
}

/**
 * M2a.5: Tamar's prompt rules P1-P7 (section 19.6, byte-exact) plus the lists they name and this page's
 * stage CTA set. Every CTA string still passes the fact gates of this page, so a label the owner's facts
 * cannot carry (an arrival or same-day promise without a response time) is never offered.
 */
/**
 * M2b.1d: the section 22.3 rules of this page (all six on a page that generates the about section; else the every-page ones).
 * M2b.1g: with the section 23.3 cuts (C2 replaces the B5 option list, C1 the B6 example; build-generation-data asserts them).
 */
export function m2bRulesFor(brief: PageBrief): ReadonlyArray<{ id: string; text: string }> {
  const sections = !ungeneratedFieldsFor(brief).includes('aboutPageBody');
  return M2B_PROMPT_RULES_AFTER_M2B2.filter(rule => sections || M2B_EVERY_PAGE_RULE_IDS.includes(rule.id));
}

/** M2b.1g: the section 23.3 rules of this page (all six on a page that generates the about section; else C4 and C5). */
export function m2b2RulesFor(brief: PageBrief): ReadonlyArray<{ id: string; text: string }> {
  const sections = !ungeneratedFieldsFor(brief).includes('aboutPageBody');
  return M2B2_PROMPT_RULES.filter(rule => sections || M2B2_EVERY_PAGE_RULE_IDS.includes(rule.id));
}

/** M2b.1g (section 23.2 d): whether the research renderer shows the guarantee block (C4 is written conditionally on it). */
export const GUARANTEE_BLOCK_RENDERED: boolean = RESEARCHED_RENDERED_FIELDS.includes('guaranteeBlock');

/**
 * M2b.1g (Yonatan, C2 guard; English, engineer-placed): at most one place in the about headline, natural, never a town list
 * or "and surroundings"; a neighbouring served town is preferred over the hero city. Gated by gate_about_headline_places.
 */
export const ABOUT_HEADLINE_PLACE_RULE = '- About headline place (SEO guard, binding): aboutPageHeadline names at most one place, and only where it reads naturally. Never a list of towns, and never "<town> and surroundings". When you name a place there, prefer a neighbouring town from his service area over repeating the hero\'s city.';

/** M2b.1g (C5): the trust-bar area tile is system-built from the area array; the model writes the other items only. */
export function trustTileRule(brief: PageBrief): string | null {
  const tile = buildAreaTile(gatePlaces(brief), TRUST_BAR_MAX_CHARS);
  return tile ? `- trustBarItems: the system builds the service-area item (rule C5) and adds it as one of the ${TRUST_BAR_MAX_ITEMS} items. Write at most ${TRUST_BAR_MAX_ITEMS - 1} items yourself, and none of them may be a place or a list of places.` : null;
}

export function buildVoiceRules(brief: PageBrief, data: CollectedData = {}): string[] {
  const stage = pageStage(brief);
  const gates = briefGateContext(brief, data);
  const responseTime = typeof data.responseTime === 'string' && data.responseTime.trim().length > 0;
  // An arrival promise (section 8 tokens) needs the owner's response time; every other fact gate runs as usual.
  const passes = (line: string) => runCopyGates({ formHeadline: line }, gates).length === 0 && (responseTime || !ARRIVAL_TOKENS.some(token => line.includes(token)));
  const set = CTA_LABEL_SETS[stage];
  // M2b.1h: on a pitch-first page the count caps are relaxed (PITCH_FIRST_RULE_EDITS) and the hero-shape rules R7 / R8 drop.
  const pitch = pitchFirstPage(brief);
  const text = (rule: { id: string; text: string }) => `- ${pitch ? pitchFirstRuleText(rule) : rule.text}`;
  return [
    'VOICE RULES (Tamar, binding; the Hebrew lists they name are given after them):',
    ...VOICE_PROMPT_RULES.map(text),
    // M2a.6: Tamar's section 20.8 rules R1-R8 (byte-exact; M2a.7 adds R8), and Noa's verb / preposition line (M2a.7).
    ...M2A6_PROMPT_RULES.filter(rule => !pitch || !PITCH_FIRST_DROPPED_RULE_IDS.includes(rule.id)).map(text),
    `- ${PREPOSITION_PROMPT_LINE}`,
    // M2b.1d: Tamar's section 22.3 rules (byte-exact): B2 on every page, the rest only where the about section and the
    // service cards render (and are generated).
    ...m2bRulesFor(brief).map(text),
    // M2b.1g: Tamar's section 23.3 rules (byte-exact): C4 and C5 on every page, the rest where the about section renders;
    // Yonatan's about-headline place guard with C2; the guarantee-block fact C4 reads; the C5 trust-tile note.
    ...m2b2RulesFor(brief).map(rule => `- ${rule.text}`),
    ...(m2b2RulesFor(brief).some(rule => rule.id === 'C2') ? [ABOUT_HEADLINE_PLACE_RULE] : []),
    `- guaranteeBlockRendered on this page (rule C4): ${GUARANTEE_BLOCK_RENDERED}.`,
    // Copy v2 slice 2: with code-owned facts the whole trust bar is system-built (no C5 tile note).
    ...[codeOwnsFacts(brief) ? null : trustTileRule(brief)].filter((line): line is string => Boolean(line)),
    'Lists named in the voice rules:',
    ...voiceListLines({ stickyArrival: responseTime, differentiatorGroups: differentiatorGroups(gates) }),
    `- trustBarFillerPhrases: ${JSON.stringify(TRUST_BAR_FILLER_PHRASES)}`,
    ...(m2bRulesFor(brief).some(rule => rule.id === 'B3') ? [`- servicesHeadlineOptions: ${JSON.stringify(SERVICES_HEADLINE_OPTIONS)}`] : []),
    tradeTermLine(slugVertical(stageSlug(brief)) === 'ac'),
    `- This page's stage (section 19.4 above): ${stage}. heroCta is fixed by the system (on this page: ${JSON.stringify(researchHeroCta(brief, data))}; the stickyBarLine must differ from it); choose formHeadline from these ctaLabelSets entries for this stage. Labels: ${JSON.stringify(set.formHeadline.labels.filter(passes))}. Patterns (use one as a pattern, adapted to this service): ${JSON.stringify(set.formHeadline.examples.filter(passes))}. formHeadlineFallback, only when nothing more specific fits: ${JSON.stringify(passes(CTA_LABEL_SETS.formHeadlineFallback) ? CTA_LABEL_SETS.formHeadlineFallback : '')}.`,
  ];
}

export function buildResearchPageCopyPrompt(brief: PageBrief, data: CollectedData = {}, siteTerms?: readonly string[]): string {
  const codeOwns = codeOwnsFacts(brief);
  // Copy v2 slice 2: an owner answer that is English non-numeric text (droppedOwnerFactKeys) is never shown to the model.
  const hidden = modelHiddenProofIds(brief, data);
  return `RESEARCH BRIEF (authoritative; use no claim not supported here):
${JSON.stringify({
  page: brief.page,
  persona: brief.persona,
  entities: brief.approvedEntityAnchors,
  queries: brief.targetQueries,
  allowedFacts: {
    firstPartyProof: hidden.length ? brief.firstPartyProof.filter(item => !hidden.includes(item.id)) : brief.firstPartyProof,
    localFacts: brief.assertableLocalFacts,
    customerDecisions: brief.customerDecisions,
    constraints: brief.constraints,
    ...(depthPage(brief) && brief.serviceFacts?.length ? { serviceFacts: brief.serviceFacts } : {}),
  },
  ...(depthPage(brief) ? {
    offer: brief.waoOffer,
    lengthBand: brief.lengthBand,
    // Copy v2 slice 2: the B6 proof is code-built, so the model is told it is not one of its blocks.
    blocksEnabled: codeOwns && brief.blocksEnabled ? { ...brief.blocksEnabled, proof: false } : brief.blocksEnabled,
    ...(brief.blocksEnabled?.qa ? { questionPool: brief.questionPool ?? [] } : {}),
    suggestedTerms: brief.suggestedTerms ?? [],
  } : {}),
  informationGainGaps: brief.informationGainGaps,
  prohibitedClaims: brief.prohibitedClaims,
  faqPolicy: brief.faqPolicy,
  faqCandidates: brief.faqCandidates,
  links: brief.links,
})}

RESEARCH RULES:
- Generate only the approved page identified by page.id and page.targetPath.
- Use only facts included in allowedFacts, entities, queries, persona, or FAQ candidates.
- Do not make any claim prohibited by prohibitedClaims or fill an information gap with an inference.
- If faqPolicy is none, output an empty faqItems array.
- Otherwise faqItems may contain only the supplied FAQ candidates, retaining their supplied question and answer.
- Keep required internal-link targets limited to links.

COPY RULES (binding):
${buildResearchCopyRules(brief, data, siteTerms).join('\n')}
${pitchFirstPage(brief) ? `\n${buildPitchFirstSection(brief)}\n` : ''}${depthPage(brief) ? `\n${buildDepthSection(brief)}\n` : ''}
The following owner-fact prompt provides the required SiteCopy JSON schema. Treat its owner facts as context only; use a fact in output only when the research brief authorizes it. Its HARD RULES, BANNED PHRASES, address and voice rules are NOT context: they are binding, together with the COPY RULES above.`;
}

// ---------------------------------------------------------------------------
// Content depth (Yonatan, Eitan-approved 2026-11-10; before-M3 part): B1 process, B4 Q&A, B6 proof on service pages.
// Every instruction is English; the model writes the Hebrew. No Hebrew examples (rule examples leak into output).
// ---------------------------------------------------------------------------

/** True when this page generates depth blocks: a research service page whose brief enables at least one block. */
export function depthPage(brief: Pick<PageBrief, 'site' | 'page' | 'blocksEnabled'>): boolean {
  return Boolean(brief.site && brief.blocksEnabled) && rendersDepthBlocks(brief.page.pageClass) && Object.values(brief.blocksEnabled ?? {}).some(Boolean);
}

/** The depth blocks this page generates, in output order. */
export function depthLayout(brief: Pick<PageBrief, 'site' | 'page' | 'blocksEnabled'>): DepthBlockId[] {
  return depthPage(brief) ? DEPTH_BLOCKS.filter(block => brief.blocksEnabled?.[block.id]).map(block => block.id) : [];
}

/**
 * Adam (2026-11-10, d): the Q&A minimum is DEPTH_BLOCK_LIMITS.qa.minItems (2) once code owns the facts. The v1 path (fact
 * templates pending) keeps its frozen prompt wording, V1_QA_MIN_ITEMS, so its prompts stay byte-identical (the validator's
 * lower minimum only relaxes it).
 */
export const V1_QA_MIN_ITEMS = 3;
export function promptQaMinItems(): number {
  return codeOwnedFactTemplates() ? DEPTH_BLOCK_LIMITS.qa.minItems : V1_QA_MIN_ITEMS;
}

/** Hard-limit text of one depth key (null for any other field). */
export function describeDepthLimit(field: string): string | null {
  const limits = DEPTH_BLOCK_LIMITS;
  if (['processHeadline', 'qaHeadline', 'proofHeadline'].includes(field)) return `string or null, max ${limits.headlineMaxChars} characters when set`;
  if (field === 'processSteps') return `array of ${limits.process.minItems} to ${limits.process.maxItems} objects {"text", "factIds"}, or null; each text max ${limits.process.maxWords} words and ${limits.process.maxChars} characters; factIds 1 to ${limits.maxFactIds} fact ids`;
  if (field === 'qaItems') return `array of ${promptQaMinItems()} to ${limits.qa.maxItems} objects {"questionId", "q", "a", "factIds"}, or null; q max ${limits.qa.maxQuestionChars} characters; a max ${limits.qa.maxAnswerWords} words and ${limits.qa.maxAnswerChars} characters; factIds 1 to ${limits.maxFactIds} fact ids`;
  if (field === 'proofItems') return `array of ${limits.proof.minItems} to ${limits.proof.maxItems} objects {"text", "factIds"}, or null; each text max ${limits.proof.maxWords} words and ${limits.proof.maxChars} characters; factIds 1 to ${limits.maxFactIds} fact ids`;
  return null;
}

/** Noa's note on a page with depth blocks: she corrects the text keys only; the references stay. */
export const DEPTH_NOA_NOTE = 'DEPTH BLOCKS: in processSteps, qaItems and proofItems, correct only the text keys (text, q, a) and the headlines. Keep every factIds and questionId exactly as given, keep the items in the same order, and never add or remove an item.';

/** The DEPTH BLOCKS prompt section of a service page (English only; one line per enabled block). */
export function buildDepthSection(brief: PageBrief, data?: CollectedData): string {
  const band = brief.lengthBand;
  const limits = DEPTH_BLOCK_LIMITS;
  const site = brief.site;
  const enabled = brief.blocksEnabled;
  const name = site ? JSON.stringify(site.pageName) : 'the page name';
  const business = site ? JSON.stringify(site.businessName) : 'the business';
  const city = site?.city ? JSON.stringify(site.city) : null;
  return [
    'DEPTH BLOCKS (binding on this service page):',
    'This page answers the searcher in more depth than a short landing page, but only with the owner\'s facts.',
    ...(band ? [`- Length: aim for about ${band.target} visible words on the whole page, never more than ${band.ceiling}. Never pad: when the facts run out, write less. A shorter true page beats a longer generic one, and a sentence that would be true of any business in this trade is filler: leave it out.`] : []),
    '- Every block item lists in "factIds" the ids of the owner facts it was written from: ids from allowedFacts, entities and offer in the research brief only (never a query, the persona or a question id). Every number, tool, method and story in an item must appear in the facts it cites. The system checks this and removes any item that fails.',
    ...(enabled?.process ? [
      `- processSteps (B1): how a typical job of this service runs, from the first call to the end, as ${limits.process.minItems} to ${limits.process.maxItems} steps in order. Each step at most ${limits.process.maxWords} words, in the owner's first person, taken from serviceFacts and the other owner facts only. If the facts do not describe at least ${limits.process.minItems} real steps, output null for processSteps and processHeadline.`,
      `- processHeadline: the heading of the steps, at most ${limits.headlineMaxChars} characters, or null.`,
    ] : []),
    ...(enabled?.qa && data && codeOwnedQa(brief, data) ? codeOwnedQaRules(brief, data) : []),
    ...(enabled?.qa && !(data && codeOwnedQa(brief, data)) ? [
      `- qaItems (B4): ${promptQaMinItems()} to ${limits.qa.maxItems} questions from questionPool that the owner's facts answer. Each item: "questionId" (the id of the question in questionPool), "q" (that question in natural Hebrew, addressed to one person in the singular, keeping its meaning), "a" (the answer, at most ${limits.qa.maxAnswerWords} words) and "factIds".`,
      `- Each answer's first sentence answers the question directly and names the business (${business})${city ? ` and the base city (${city})` : ''}. Answer only from the owner facts: skip every question his facts do not answer, and never guess. If fewer than ${promptQaMinItems()} questions can be answered, output null for qaItems and qaHeadline.`,
      `- qaHeadline: the heading of the questions, at most ${limits.headlineMaxChars} characters, or null.`,
    ] : []),
    ...(enabled?.proof && !codeOwnsFacts(brief) ? [
      `- proofItems (B6): ${limits.proof.minItems} to ${limits.proof.maxItems} short facts the owner stated that prove his work (for example his years in the trade, his license, his warranty or his response time, only where he stated them), each at most ${limits.proof.maxWords} words and each citing its fact. The customer review is shown by the system next to them: never quote, paraphrase or mention it here.`,
      `- proofHeadline: the heading of the proof, at most ${limits.headlineMaxChars} characters, or null.`,
    ] : []),
    `- The block headings never repeat ${name} word for word: the page's main heading carries it.`,
    `- suggestedTerms are optional wording ideas from competitor pages, never requirements. Use a term only where it reads naturally and the owner's facts support it, at most its "max" times across these blocks, and at most once when the page is shorter than ${TERM_DENSITY_SHORT_PAGE_WORDS} words. Never stuff terms, never name a competitor, and never let a term add a claim.`,
    codeOwnsFacts(brief)
      ? `- Shapes: "processSteps": [{"text": "", "factIds": [""]}], "qaItems": [{"questionId": "", "q": "", "a": "", "factIds": [""]}]. Leave out the keys of every block that is not listed above. The system builds the proof block (proofHeadline, proofItems): never output those keys.`
      : `- Shapes: "processSteps": [{"text": "", "factIds": [""]}], "qaItems": [{"questionId": "", "q": "", "a": "", "factIds": [""]}], "proofItems": [{"text": "", "factIds": [""]}]. Leave out the keys of every block that is not listed above.`,
  ].join('\n');
}

export function buildSimulationGenerationResult(data: CollectedData) {
  return {
    mode: 'simulation' as const,
    source: 'deterministic' as const,
    businessName: data.businessName || data.businessNiche || '',
    primaryService: data.primaryService || data.businessNiche || '',
    deployable: false,
  };
}

// ---------------------------------------------------------------------------
// B4: limits stated in the prompt, bounded repair pass, safe deterministic fixes.
// Every instruction below is English; the model writes the Hebrew copy.
// ---------------------------------------------------------------------------

/**
 * English hard-limits block, generated from the validator constants so the prompt
 * can never drift from what assertBoundedGeneratedSiteCopy enforces.
 */
export function buildSiteCopyHardLimitsBlock(heading = 'HARD LIMITS', omit: readonly string[] = [], layout: CopyLayout = {}): string {
  // M2b.1d: `omit` = the fields this page does not generate (ungeneratedFieldsFor); they leave the block and the key list.
  // M2b.1h: `layout` adds the pitch (first key) and the story fields where the page generates them.
  const keep = (key: string) => !omit.includes(key);
  const presence = SITE_COPY_OPTIONAL_PRESENCE_LIMITS;
  const depthKeys = DEPTH_BLOCKS.filter(block => layout.depth?.includes(block.id)).flatMap(block => [block.headline, block.items]).filter(keep);
  const keys = [...(layout.pitch ? ['pitch'] : []), ...SITE_COPY_KEYS.filter(keep), ...(layout.story ? STORY_FIELDS_M2B1H : []), ...depthKeys];
  const lines: string[] = [
    `${heading} (validator-enforced; output that breaks any of these is rejected. They override every softer length or count guidance above):`,
    '- Length means the number of characters in the string, counting every letter, space, digit and punctuation mark. Aim for at most 85% of each limit to leave a margin.',
    `- Required non-empty strings (every one must be present and non-empty${keep('faqHeadline') ? ', including faqHeadline when faqItems is empty' : ''}):`,
    ...Object.entries(SITE_COPY_STRING_LIMITS).filter(([key]) => keep(key)).map(([key, max]) => `  - ${key}: max ${max} characters`),
    '- Optional fields (a string, or null):',
    ...Object.entries(SITE_COPY_OPTIONAL_STRING_LIMITS).filter(([key]) => keep(key)).map(([key, max]) => `  - ${key}: max ${max} characters when set`),
    ...(layout.story ? STORY_FIELDS_M2B1H.map(key => `  - ${key}: max ${presence[key]} characters when set`) : []),
    ...(layout.pitch ? [`- pitch (string): ${PITCH_MIN_WORDS} to ${PITCH_MAX_WORDS} words, max ${presence.pitch} characters. It is the only limit on the pitch.`] : []),
    ...depthKeys.map(key => `- ${key}: ${describeDepthLimit(key)}`),
    '- Lists:',
    ...STRING_LIST_KEYS.filter(keep).map(key => {
      const limit = SITE_COPY_STRING_LIST_LIMITS[key];
      return `  - ${key}: at most ${limit.maxItems} strings; each string max ${limit.itemMaxChars} characters`;
    }),
    ...PAIR_LIST_KEYS.filter(keep).map(key => {
      const limit = SITE_COPY_PAIR_LIST_LIMITS[key];
      const parts = limit.keys.map((name, index) => `"${name}" max ${limit.maxChars[index]} characters`).join(', ');
      // Bug-1 fix (rerun 3): a card name that must equal a longer owner label may be that label's length.
      const long = key === 'serviceDetails' ? longServiceLabelChars(layout.serviceLabels) : 0;
      const labelNote = long ? ` (a "name" that is exactly one of the owner-confirmed service names keeps that name's length, up to ${long} characters)` : '';
      return `  - ${key}: at most ${limit.maxItems} objects with exactly the keys ${limit.keys.map(name => `"${name}"`).join(' and ')}; ${parts}${labelNote}`;
    }),
    `- ${SITE_COPY_REVIEW_PAIR[0]} is the owner's quote, verbatim, and may stand alone. ${SITE_COPY_REVIEW_PAIR[1]} may be set only when ${SITE_COPY_REVIEW_PAIR[0]} is set and the data supplies a star rating; otherwise ${SITE_COPY_REVIEW_PAIR[1]} is null. Never invent a ${SITE_COPY_REVIEW_PAIR[1]}. Never shorten or rephrase a quote.`,
    `- ${SITE_COPY_ALWAYS_NULL.join(', ')}: always null.`,
    '- faqItems: follow the faqPolicy rule in the research rules above.',
    `- Output exactly these keys and no others${layout.pitch ? ', with pitch first' : ''}: ${keys.join(', ')}.`,
    `- The whole JSON object must be at most ${SITE_COPY_MAX_BYTES} bytes in UTF-8.`,
    '- If a field is too long, rephrase it shorter in complete, natural wording. Never cut text mid-word or mid-sentence and never use an ellipsis.',
  ];
  return lines.join('\n');
}

export type CopyRepairEventKind = 'violations' | 'repair' | 'stage_retry' | 'deterministic_fix' | 'warnings';

/** Diagnostic event from the copy pipeline. Field names, limits and lengths only. */
export interface CopyRepairEvent {
  stage: CopyValidationStage;
  kind: CopyRepairEventKind;
  attempt?: number;
  violations?: CopyViolation[];
  fields?: string[];
  fixes?: string[];
}

interface RepairContext {
  callJson: QwenJsonCaller;
  brief: PageBrief;
  data: CollectedData;
  remaining: number;
  used: number;
  deterministicFixes: boolean;
  /** Copy gates (M2a.1); null = gates off. */
  gates: CopyGateContext | null;
  emit: (event: CopyRepairEvent) => void;
  /** Copy v2 slice 3: the prompt version of this page (repairs use the matching system prompt). */
  promptVersion?: PromptVersion;
  /** Copy v2 slice 4: repair calls already spent on restatement hits (shared by the Tamar and Noa stages). */
  restatementRepairs?: number;
  /** Rerun-3 items 4-5: repair calls already spent on claim-scope hits (shared by the stages). */
  claimScopeRepairs?: number;
  /** Copy v2 slice 5: the homepage's clause keys (site-wide budget). */
  priorMechanismKeys?: readonly string[];
}

/**
 * Copy v2 slices 4-5: the deterministic drops of a settled copy (code-owned facts only): restated facts first, then the
 * repetition budget. Logged as one deterministic_fix event; never a repair.
 */
function settleWithDrops(ctx: RepairContext, stage: CopyValidationStage, value: Loose): Loose {
  const fixes = applyDeterministicDrops(value, ctx.brief, ctx.data, ctx.gates, ctx.priorMechanismKeys);
  if (fixes.length) ctx.emit({ stage, kind: 'deterministic_fix', fixes });
  return value;
}

/** The slice 4-5 drops in place (off while the fact templates are pending or the gates are off). Returns the fix notes. */
export function applyDeterministicDrops(value: Loose, brief: PageBrief, data: CollectedData, gates: CopyGateContext | null, priorMechanismKeys?: readonly string[]): string[] {
  if (!gates?.factRestatement) return [];
  return [...dropRestatements(value, gates), ...dropClaimScope(value, gates), ...dropQaBrandAnswers(value, gates), ...applyRepetitionBudget(value, brief, data, gates, priorMechanismKeys)];
}

/** The budget inputs of a page: its rendered strings in render order (code-built ones included) and the options. */
export function repetitionBudgetInputs(value: Loose, brief: PageBrief, data: CollectedData, gates: CopyGateContext, priorMechanismKeys?: readonly string[]): { strings: BudgetString[]; options: BudgetOptions } {
  const built = codeBuiltFactStrings(brief, data);
  const strings = budgetStrings(value, {
    pricePromises: built?.pricePromises ?? [],
    costFaq: built?.costFaq ?? null,
    codeOwnedFields: gates.codeOwnedFields ?? [],
    qaCodeItems: gates.qaCodeOwnership?.codeItems ?? 0,
  }, researchedRenderedFieldsFor(brief.page.pageClass));
  return { strings, options: { free: phraseRepeatFreeTokens(gates), minSentences: PROSE_MIN_SENTENCES, ...(priorMechanismKeys?.length ? { priorKeys: priorMechanismKeys } : {}) } };
}

/**
 * Copy v2 slice 5: apply the repetition budget (repetitionBudget.ts) in place: one drop plan for every decision (so sentence
 * indices stay those of the text the decisions read). Notes: budget_drop_sentence / budget_drop_item (with the reason),
 * story_headline_echo, story_about_echo; plus the depth-block notes when a block falls below its minimum.
 */
export function applyRepetitionBudget(value: Loose, brief: PageBrief, data: CollectedData, gates: CopyGateContext, priorMechanismKeys?: readonly string[]): string[] {
  const { strings, options } = repetitionBudgetInputs(value, brief, data, gates, priorMechanismKeys);
  const decisions = repetitionBudgetDecisions(value, strings, options);
  if (!decisions.length) return [];
  const plan = emptyDropPlan();
  const notes: string[] = [];
  for (const decision of decisions) {
    if (!planFieldDrop(plan, decision.field, decision.sentence)) continue;
    const where = decision.sentence === undefined ? decision.field : `${decision.field}#${decision.sentence}`;
    if (decision.reason === 'story_headline_echo' || decision.reason === 'story_about_echo') notes.push(`${decision.reason}:${where}`);
    else notes.push(`${decision.sentence === undefined ? 'budget_drop_item' : 'budget_drop_sentence'}:${where}:${decision.reason}`);
  }
  const applied = applyDropPlan(value, plan, 'budget');
  return [...notes, ...applied.filter(note => note.includes('drop_depth_block'))];
}

type Loose = Record<string, unknown>;

function topField(field: string): string {
  return field.split(/[.[+]/)[0];
}

/** Fields the system fills in; never sent to the model for repair. */
const SYSTEM_FIELDS = ['heroCta', 'serviceItems', 'reviewFeatured', 'faqItems'];

/** True when the owner stated a guarantee (item 7: otherwise guaranteeBlock is system-null). */
export function ownerHasGuarantee(data: CollectedData): boolean {
  return typeof data.guarantee === 'string' && data.guarantee.trim().length > 0;
}
/** Gate rules settled by a safe fix, not by the model. */
const SAFE_FIX_GATE_RULES: readonly string[] = [GATE_RULES.reviewContext];

export function isGateRule(rule: string): boolean {
  return rule.startsWith('gate_');
}

/** Violations a model can reasonably repair. Pair rule, always-null, extras, FAQs and system fields are not sent to the model. */
function repairableFields(violations: CopyViolation[], systemFields: readonly string[] = ['faqItems']): string[] {
  const fields = new Set<string>();
  for (const violation of violations) {
    if (violation.field === '$' || violation.rule === 'context_requires_quote' || violation.rule === 'must_be_null' ||
      SAFE_FIX_GATE_RULES.includes(violation.rule)) continue;
    const field = topField(violation.field);
    const known = SITE_COPY_KEYS.includes(field) || PRESENCE_KEYS.includes(field);
    if (systemFields.includes(field) || !known || (SITE_COPY_ALWAYS_NULL as readonly string[]).includes(field)) continue;
    if (violation.rule === 'unexpected' && !violation.field.includes('.')) continue;
    fields.add(field);
  }
  return [...SITE_COPY_KEYS, ...PRESENCE_KEYS].filter(key => fields.has(key));
}

function structural(violations: CopyViolation[]): boolean {
  return violations.some(violation => violation.field === '$');
}

function describeLimit(field: string): string {
  if (field in SITE_COPY_STRING_LIMITS) return `non-empty string, max ${SITE_COPY_STRING_LIMITS[field as keyof typeof SITE_COPY_STRING_LIMITS]} characters`;
  if (field in SITE_COPY_OPTIONAL_STRING_LIMITS) return `string or null, max ${SITE_COPY_OPTIONAL_STRING_LIMITS[field as keyof typeof SITE_COPY_OPTIONAL_STRING_LIMITS]} characters when set`;
  if (field === 'pitch') return `string or null: the free sales letter, ${PITCH_MIN_WORDS} to ${PITCH_MAX_WORDS} words, max ${SITE_COPY_OPTIONAL_PRESENCE_LIMITS.pitch} characters`;
  if (field in SITE_COPY_OPTIONAL_PRESENCE_LIMITS) return `string or null, max ${SITE_COPY_OPTIONAL_PRESENCE_LIMITS[field as OptionalPresenceKey]} characters when set`;
  const depth = describeDepthLimit(field);
  if (depth) return depth;
  if (field in SITE_COPY_STRING_LIST_LIMITS) {
    const limit = SITE_COPY_STRING_LIST_LIMITS[field as StringListKey];
    return `array of at most ${limit.maxItems} non-empty strings, each max ${limit.itemMaxChars} characters`;
  }
  if (field in SITE_COPY_PAIR_LIST_LIMITS) {
    const limit = SITE_COPY_PAIR_LIST_LIMITS[field as PairListKey];
    return `array of at most ${limit.maxItems} objects with exactly the keys ${limit.keys.join(', ')}; ${limit.keys.map((key, index) => `${key} max ${limit.maxChars[index]} characters`).join(', ')}`;
  }
  return 'see hard limits';
}

function describeProblem(violation: CopyViolation, gates?: CopyGateContext | null): string {
  const where = violation.field;
  if (isGateRule(violation.rule) && gates) {
    return describeGateViolation({ field: where, rule: violation.rule as never, ...(typeof violation.actual === 'string' ? { actual: violation.actual } : {}) }, gates);
  }
  if (violation.rule === 'max_length') return `${where} is ${violation.actual} characters (max ${violation.limit})`;
  if (violation.rule === 'max_items') return `${where} has ${violation.actual} items (max ${violation.limit})`;
  if (violation.rule === 'missing') return `${where} is missing`;
  if (violation.rule === 'empty') return `${where} is empty`;
  if (violation.rule === 'type') return `${where} has the wrong type (${violation.actual})`;
  if (violation.rule === 'unexpected') return `${where} is not an allowed key`;
  return `${where}: ${violation.rule}`;
}

/** English repair request: only the violating fields, each with its limit, its problems and current value. */
export function buildCopyRepairPrompt(copy: Loose, violations: CopyViolation[], fields: string[], gates?: CopyGateContext | null): string {
  const blocks = fields.map(field => {
    const problems = violations.filter(violation => topField(violation.field) === field).map(violation => describeProblem(violation, gates));
    return `- ${field}: ${describeLimit(field)}.\n  Problems: ${problems.join('; ')}.\n  Current value: ${JSON.stringify(copy[field] ?? null)}`;
  });
  return `These fields of a site-copy JSON object broke hard validator limits or copy rules. Rewrite ONLY these fields so that each one is within its limit and fixes every listed problem.

RULES:
- Keep the same language, meaning, facts and voice as the current value. Do not add any claim, number, name or promise that is not already in the current value.
- Shorten by cutting a whole idea and rephrasing into complete, natural wording. Never drop a verb's object, never cut text mid-word or mid-sentence and never use an ellipsis.
- Length means the number of characters in the string, counting every letter, space, digit and punctuation mark. Aim for at most 85% of each limit.
- For a list with too many items, keep the most specific items and drop the rest; do not merge items.
- Return a JSON object with exactly these keys: ${fields.join(', ')}.

FIELDS TO FIX:
${blocks.join('\n')}`;
}

/** The raw-response byte cap of a page: the base budget, plus the depth-block budget on a page that generates them. */
function rawMaxBytes(brief: PageBrief): number {
  return SITE_COPY_MAX_BYTES + (depthPage(brief) ? DEPTH_BLOCKS_MAX_BYTES : 0);
}

function parseLoose(raw: unknown, rawMax: number = SITE_COPY_MAX_BYTES): { value?: Loose; violations: CopyViolation[] } {
  if (typeof raw !== 'string') return { violations: [{ field: '$', rule: 'type', actual: typeof raw }] };
  const bytes = Buffer.byteLength(raw, 'utf8');
  if (bytes > rawMax) return { violations: [{ field: '$', rule: 'max_bytes', limit: rawMax, actual: bytes }] };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { violations: [{ field: '$', rule: 'invalid_json' }] };
  }
  if (!plainObject(value)) return { violations: [{ field: '$', rule: 'not_object' }] };
  return { value, violations: [] };
}

function validatorViolations(value: Loose, options: SiteCopyShapeOptions = {}): CopyViolation[] {
  try {
    assertBoundedGeneratedSiteCopy(value, options);
    return [];
  } catch {
    const violations = explainGeneratedSiteCopyViolations(value, options);
    return violations.length ? violations : [{ field: '$', rule: 'structure' }];
  }
}

/** Copy-gate hits that fail the page, as CopyViolations (field + rule + config id; never copy text). M2a.7: warnings excluded. */
export function gateViolations(value: Loose, gates: CopyGateContext | null): CopyViolation[] {
  if (!gates) return [];
  return blockingGateHits(runCopyGates(value, gates), gates).map(hit => ({ field: hit.field, rule: hit.rule, ...(hit.actual ? { actual: hit.actual } : {}) }));
}

/** M2a.7: copy-gate hits that are warnings only (unrendered research-site fields, WARNING_ONLY_RULES); logged, never repaired. */
export function gateWarnings(value: Loose, gates: CopyGateContext | null): CopyViolation[] {
  if (!gates) return [];
  return warningGateHits(runCopyGates(value, gates), gates).map(hit => ({ field: hit.field, rule: hit.rule, ...(hit.actual ? { actual: hit.actual } : {}) }));
}

function currentViolations(value: Loose, gates: CopyGateContext | null = null, options: SiteCopyShapeOptions = {}): CopyViolation[] {
  return [...validatorViolations(value, options), ...gateViolations(value, gates)];
}

/**
 * Last-resort fixes that cannot damage copy: drop whole list items past the item
 * limit or over their character limit (M2a.3; only while another item remains), null a review context that has no quote, set always-null fields (missing or
 * not) to null, drop unknown keys. With gates: drop whole serviceDetails entries naming
 * a service the owner did not confirm, and null a reviewContext with no star rating.
 * Never shortens or edits any string, and never nulls the owner's quote.
 */
export function applySafeDeterministicFixes(value: Loose, gates: CopyGateContext | null = null): { value: Loose; fixes: string[] } {
  const next: Loose = { ...value };
  const fixes: string[] = [];
  for (const key of Object.keys(next)) {
    if (!SITE_COPY_KEYS.includes(key) && !PRESENCE_KEYS.includes(key)) {
      delete next[key];
      fixes.push(`drop_unexpected:${key}`);
    }
  }
  for (const key of STRING_LIST_KEYS) {
    const list = next[key];
    const max = SITE_COPY_STRING_LIST_LIMITS[key].maxItems;
    if (Array.isArray(list) && list.length > max) {
      next[key] = list.slice(0, max);
      fixes.push(`trim_items:${key}:${list.length}->${max}`);
    }
    // M2a.3: a whole item over its character limit is dropped (never shortened), only while another item remains.
    const current = next[key];
    const itemMax = SITE_COPY_STRING_LIST_LIMITS[key].itemMaxChars;
    if (Array.isArray(current)) {
      const kept = current.filter(item => !(typeof item === 'string' && item.length > itemMax));
      if (kept.length && kept.length !== current.length) {
        next[key] = kept;
        fixes.push(`drop_overlong_items:${key}:${current.length}->${kept.length}`);
      }
    }
  }
  if (gates?.serviceLabels.length && Array.isArray(next.serviceDetails)) {
    const allowed = new Set(gates.serviceLabels.map(label => label.replace(/\s+/g, ' ').trim()));
    const kept = next.serviceDetails.filter(item => {
      const name = plainObject(item) ? item.name : undefined;
      return typeof name === 'string' && allowed.has(name.replace(/\s+/g, ' ').trim());
    });
    if (kept.length !== next.serviceDetails.length) {
      fixes.push(`drop_unconfirmed:serviceDetails:${next.serviceDetails.length}->${kept.length}`);
      next.serviceDetails = kept;
    }
  }
  for (const key of PAIR_LIST_KEYS) {
    const list = next[key];
    const max = SITE_COPY_PAIR_LIST_LIMITS[key].maxItems;
    if (Array.isArray(list) && list.length > max) {
      next[key] = list.slice(0, max);
      fixes.push(`trim_items:${key}:${list.length}->${max}`);
    }
  }
  const [quoteKey, contextKey] = SITE_COPY_REVIEW_PAIR;
  if (contextKey in next && next[contextKey] !== null && (next[quoteKey] === null || (gates && !gates.starRating))) {
    next[contextKey] = null;
    fixes.push(`null_field:${contextKey}`);
  }
  for (const key of SITE_COPY_ALWAYS_NULL) {
    if (next[key] !== null) {
      // A missing or non-null always-null field has exactly one valid value.
      fixes.push(`${key in next ? 'null_field' : 'add_null_field'}:${key}`);
      next[key] = null;
    }
  }
  // Content depth: an item that fails the fact trace or the term density is dropped whole (never edited); a block left under
  // its minimum is dropped with its headline. Skip rather than guess (Yonatan).
  if (gates?.depth) fixes.push(...dropFailingDepthItems(next, gates));
  // M2a.5 (Adam): when one trustBarItems entry is the page's only gate hit and at least
  // TRUST_BAR_MIN_KEPT other items remain, drop that whole item (never edited) instead of failing.
  // Copy v2 slice 2: a code-built trust bar is never trimmed or dropped (no gate hit lands on it).
  if (gates && Array.isArray(next.trustBarItems) && !gates.codeOwnedFields?.includes('trustBarItems')) {
    // M2a.7: blocking hits only (a warning never fails the page, so it never needs the drop).
    const all = blockingGateHits(runCopyGates(next, gates), gates);
    // M2b.1d: the item-count hit (section 22.2) marks the items past the cap, not a bad item. Alone, the items past the
    // cap are dropped (whole items, never edited, like trim_items); next to one bad item it is ignored, since dropping
    // that item may bring the list under the cap (the re-gate below decides).
    const hits = all.filter(hit => !isTrustBarCountHit(hit));
    if (!hits.length && all.length) {
      const kept = next.trustBarItems.slice(0, TRUST_BAR_MAX_ITEMS);
      const candidate = { ...next, trustBarItems: kept };
      if (blockingGateHits(runCopyGates(candidate, gates), gates).length === 0) {
        fixes.push(`trim_gated_items:trustBarItems:${next.trustBarItems.length}->${kept.length}`);
        return { value: candidate, fixes };
      }
    }
    const indices = new Set(hits.map(hit => /^trustBarItems\[(\d+)\]$/.exec(hit.field)?.[1] ?? 'other'));
    const [only] = [...indices];
    if (hits.length && indices.size === 1 && only !== 'other' && next.trustBarItems.length - 1 >= TRUST_BAR_MIN_KEPT) {
      const kept = next.trustBarItems.filter((_, index) => index !== Number(only));
      const candidate = { ...next, trustBarItems: kept };
      if (blockingGateHits(runCopyGates(candidate, gates), gates).length === 0) {
        fixes.push(`drop_gated_item:trustBarItems:${next.trustBarItems.length}->${kept.length}`);
        return { value: candidate, fixes };
      }
    }
  }
  return { value: next, fixes };
}

/** Content depth: the block and item index of a depth field path (null for a headline or a non-depth field). */
function depthItemOf(field: string): { block: DepthBlockId; index: number } | null {
  for (const block of DEPTH_BLOCKS) {
    const match = new RegExp(`^${block.items}\\[(\\d+)\\]`).exec(field);
    if (match) return { block: block.id, index: Number(match[1]) };
  }
  return null;
}

/** Content depth: drop the depth items with blocking fact-trace / term-density hits until none remain (bounded). */
function dropFailingDepthItems(next: Loose, gates: CopyGateContext): string[] {
  const fixes: string[] = [];
  for (let round = 0; round < 12; round++) {
    const hits = blockingGateHits(depthGateHits(next, gates), gates);
    if (!hits.length) break;
    const drop = new Map<DepthBlockId, Set<number>>();
    const headlines = new Set<string>();
    for (const hit of hits) {
      const item = depthItemOf(hit.field);
      if (item) {
        const set = drop.get(item.block) ?? new Set<number>();
        set.add(item.index);
        drop.set(item.block, set);
        // Term density: one item per term per round, so the count falls one item at a time.
        if (hit.rule === GATE_RULES.termDensity) break;
      } else if ((DEPTH_BLOCKS as ReadonlyArray<{ headline: string }>).some(block => block.headline === hit.field)) {
        headlines.add(hit.field);
      }
    }
    for (const field of headlines) {
      next[field] = null;
      fixes.push(`null_depth_headline:${field}`);
    }
    fixes.push(...dropDepthItems(next, drop));
    if (!drop.size && !headlines.size) break;
  }
  return fixes;
}

/** M2a.5: a gated trust-bar item is dropped only while at least this many other items remain. M2b.1e (B2: two facts, two items): 2. */
export const TRUST_BAR_MIN_KEPT = 2;

/** M2b.1d: the section 22.2 item-count hit (trustBarItems past TRUST_BAR_MAX_ITEMS). */
function isTrustBarCountHit(hit: { rule: string; actual?: string }): boolean {
  return hit.rule === GATE_RULES.trustBarSize && (hit.actual ?? '').startsWith('trust_items:');
}

/**
 * System-filled fields, re-applied after every model response:
 * - faqItems: the brief's supported candidates (a discarded model FAQ can never fail a page);
 * - with site facts (M2a.1): heroCta = the fixed singular label, serviceItems = the
 *   owner-confirmed service names, reviewFeatured = the owner's quote verbatim (or null).
 * - M2a.2: reviewFeatured is null unless the quote is mostly Hebrew script (never translated);
 *   guaranteeBlock is null when the owner has no guarantee (no filler guarantee).
 */
/**
 * heroCta on a research site (M2a.6, Tamar section 20.7): the system contact label, except on a planned-stage
 * page of a phone site, where it is HERO_CTA_OVERRIDE.planned.phone. A phone site is one whose system label is
 * the call label (primaryCtaLabel's phone branch, which is also its default); WhatsApp-only and form-only sites
 * keep their label, as do emergency and neutral pages.
 */
export function researchHeroCta(brief: PageBrief, data: CollectedData): string {
  const label = primaryCtaLabel(data);
  return pageStage(brief) === 'planned' && label === primaryCtaLabel({}) ? HERO_CTA_OVERRIDE.planned.phone : label;
}

/**
 * M2b.1d (Tamar's cost note, Adam-approved): the top-level fields this page does not generate. On a research site, a page
 * type that does not render the about section and the service cards (everything except the homepage and the services hub)
 * never generates aboutPageHeadline, aboutPageBody, servicesHeadline or serviceDetails: they leave the prompt and the
 * schema, no gate runs on them, and withSystemFields fills them. Legacy (no site facts): none.
 */
export function ungeneratedFieldsFor(brief: PageBrief): readonly string[] {
  if (!brief.site) return [];
  const base = researchedUngeneratedFieldsFor(brief.page.pageClass);
  // Copy v2 slice 2: with complete fact templates the code builds the trust bar and the proof, and the fields a research
  // page never renders are not generated. While the templates are pending: unchanged.
  return codeOwnsFacts(brief) ? [...base, ...CODE_OWNED_FACT_FIELDS, ...RESEARCH_UNRENDERED_FIELDS] : base;
}

/**
 * Copy v2 slice 2 (docs/missions/site-bot-code-owns-facts-2026-11-10.md): the fields the code builds from the owner facts
 * (ownerFactCopy.ts) while the fact templates are complete. Gate-exempt (CopyGateContext.codeOwnedFields), system-filled,
 * hidden from Noa, never repaired.
 */
export const CODE_OWNED_FACT_FIELDS: readonly string[] = ['trustBarItems', 'proofItems', 'proofHeadline'];
/**
 * Copy v2 slice 2: SiteCopy fields a research site never renders (researchedSite.ts RESEARCHED_RENDERED_FIELDS note):
 * not generated while code owns the facts; withSystemFields sets the strings to '' and the optional ones to null.
 */
export const RESEARCH_UNRENDERED_FIELDS: readonly string[] = ['stickyBarLine', 'aboutBlurb', 'guaranteeBlock', 'responseTimeBadge', 'faqHeadline'];
const RESEARCH_UNRENDERED_NULL_FIELDS: readonly string[] = ['guaranteeBlock', 'responseTimeBadge'];

/** Copy v2 slice 2: true when this research page's trust bar and proof are code-built (fact templates complete). */
export function codeOwnsFacts(brief: Pick<PageBrief, 'site'>): boolean {
  return Boolean(brief.site) && codeOwnedFactTemplates() !== null;
}

// ---------------------------------------------------------------------------
// Copy v2 slice 4: gate_fact_restatement inputs and the cheaper fix path (drop first, then one repair, then fail).
// ---------------------------------------------------------------------------

/** Fact template keys whose fixed wording (slots removed) is a "years in the trade" phrase (optional keys skipped). */
export const YEARS_PHRASE_TEMPLATE_KEYS: readonly string[] = ['trustYears', 'trustYearsOne', 'trustYearsTwo'];

/** A template's fixed words (slots and sentence punctuation removed), when at least two words remain; else null. */
export function templatePhrase(template: string | undefined): string | null {
  if (typeof template !== 'string') return null;
  const words = template.replace(/\{[a-z]+\}/g, ' ').replace(/[.,:;!?]/g, ' ').normalize('NFC').trim().split(/\s+/u).filter(Boolean);
  return words.length >= 2 ? words.join(' ') : null;
}

function digitRunsOf(value: unknown, minLength = 1): string[] {
  const text = typeof value === 'string' ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
  return [...new Set((text.match(/\d+/g) ?? []).filter(run => run.length >= minLength))];
}

const answered = (value: unknown) => (typeof value === 'string' && value.trim().length > 0) || (typeof value === 'number' && Number.isFinite(value));

/**
 * The restatement spec of one page: per code-owned fact the owner gave, its digit runs and its word phrases (years: the
 * template's fixed wording; warranty: the existing warranty claim tokens; licence: the license_grade claim tokens and his
 * Hebrew wording verbatim). Single-digit warranty / response runs are left to the warranty words (a bare "1" is too common).
 */
export function factRestatementSpec(brief: PageBrief, data: CollectedData, templates: OwnerFactTemplates): FactRestatementSpec {
  const facts: RestatementFact[] = [];
  const parsed = ownerFacts(data, brief, templates);
  if (answered(data.yearsInField)) {
    const record = templates as unknown as Record<string, unknown>;
    const phrases = YEARS_PHRASE_TEMPLATE_KEYS.map(key => templatePhrase(record[key] as string | undefined)).filter((item): item is string => Boolean(item));
    facts.push({ kind: 'years', digits: [...new Set([...(parsed.years ? [parsed.years.slots.n] : []), ...digitRunsOf(data.yearsInField)])], phrases });
  }
  if (answered(data.guarantee)) {
    facts.push({ kind: 'warranty', digits: digitRunsOf(data.guarantee, 2), phrases: CLAIM_RULES.find(rule => rule.id === 'warranty')?.tokens ?? [] });
  }
  if (answered(data.license)) {
    const wording = parsed.license?.kind === 'license' ? [parsed.license.slots.license] : [];
    facts.push({ kind: 'license', digits: digitRunsOf(data.license, 3), phrases: [...(CLAIM_TOKENS.license_grade ?? []), ...wording] });
  }
  // A same-day answer is shown as the same-day chip: its words are not restated either.
  if (answered(data.responseTime)) facts.push({ kind: 'response', digits: digitRunsOf(data.responseTime, 2), phrases: parsed.response?.slots.sameDay === '1' ? templates.parseSameDayWords : [] });
  const pricing = ownerPricing(data);
  const amounts = [...(pricing.calloutFee !== null ? [pricing.calloutFee] : []), ...pricing.startingPrices.map(item => item.from)];
  if (amounts.length) {
    facts.push({ kind: 'price', digits: [...new Set(amounts.flatMap(amount => [String(amount), formatShekels(amount).replace(/\s*\S$/u, '')]))], phrases: pricingPromisePhrases(data) });
  } else if (pricingPromisePhrases(data).length) {
    // The hero price promise line is code-built too: its exact phrases are never restated.
    facts.push({ kind: 'price', digits: [], phrases: pricingPromisePhrases(data) });
  }
  return { facts, usp: typeof data.usp === 'string' ? data.usp : '' };
}

/** The minimum sentence count a prose field keeps when the system drops a sentence (story: STORY_MIN_SENTENCES; about: B6). */
export const PROSE_MIN_SENTENCES: Readonly<Record<string, number>> = { storyBody: STORY_MIN_SENTENCES, aboutPageBody: 3 };
/** Model fields the system may set to null when they break a drop rule (the renderer shows the approved fallback heading). */
const NULLABLE_HEADINGS: readonly string[] = ['storyHeadline', 'processHeadline', 'qaHeadline'];

/** Fields whose every restatement / budget fix is a drop, never a repair (whole items or sentences; nothing is edited). */
export interface DropPlan {
  /** Prose field -> sentence indices to drop. */
  sentences: Map<string, Set<number>>;
  /** serviceDetails indices whose description is dropped (the card keeps its name). */
  cardDescriptions: Set<number>;
  /** Depth items to drop. */
  depthItems: Map<DepthBlockId, Set<number>>;
  /** Headings set to null. */
  headings: Set<string>;
}

export function emptyDropPlan(): DropPlan {
  return { sentences: new Map(), cardDescriptions: new Set(), depthItems: new Map(), headings: new Set() };
}

/** Plan the drop of one field path (false when the field cannot be dropped: it goes to the repair). */
export function planFieldDrop(plan: DropPlan, field: string, sentenceIndex?: number): boolean {
  const card = /^serviceDetails\[(\d+)\]\.description$/.exec(field);
  if (card) { plan.cardDescriptions.add(Number(card[1])); return true; }
  const depth = depthItemOf(field);
  if (depth && depth.block !== 'proof') {
    const set = plan.depthItems.get(depth.block) ?? new Set<number>();
    set.add(depth.index);
    plan.depthItems.set(depth.block, set);
    return true;
  }
  if (NULLABLE_HEADINGS.includes(field)) { plan.headings.add(field); return true; }
  if (field in PROSE_MIN_SENTENCES && sentenceIndex !== undefined) {
    const set = plan.sentences.get(field) ?? new Set<number>();
    set.add(sentenceIndex);
    plan.sentences.set(field, set);
    return true;
  }
  return false;
}

/**
 * Apply a drop plan in place. A prose field keeps its minimum sentence count (a drop that would break it is skipped: the gate
 * then stays and the field goes to the repair); a depth block below its minimum becomes null with its headline. Returns the
 * fix notes (field names and counts; never copy text).
 */
export function applyDropPlan(copy: Loose, plan: DropPlan, tag: string): string[] {
  const fixes: string[] = [];
  for (const [field, drop] of plan.sentences) {
    const value = copy[field];
    if (typeof value !== 'string') continue;
    const parts = proseSentences(value);
    const kept = parts.filter((_, index) => !drop.has(index));
    if (kept.length === parts.length || kept.length < (PROSE_MIN_SENTENCES[field] ?? parts.length)) continue;
    copy[field] = kept.join(' ');
    fixes.push(`${tag}_drop_sentence:${field}:${parts.length}->${kept.length}`);
  }
  if (plan.cardDescriptions.size && Array.isArray(copy.serviceDetails)) {
    copy.serviceDetails = copy.serviceDetails.map((item, index) => {
      if (!plan.cardDescriptions.has(index) || !plainObject(item) || item.description === '') return item;
      fixes.push(`${tag}_drop_item:serviceDetails[${index}].description`);
      return { ...item, description: '' };
    });
  }
  for (const field of plan.headings) {
    if (typeof copy[field] === 'string') {
      copy[field] = null;
      fixes.push(`${tag}_null:${field}`);
    }
  }
  if (plan.depthItems.size) fixes.push(...dropDepthItems(copy, plan.depthItems).map(fix => `${tag}_${fix}`));
  return fixes;
}

/**
 * Copy v2 slice 4: drop what restates a code-owned fact (story / about sentence while the minimum holds; card description;
 * process step or Q&A item; a nullable heading). Whatever cannot be dropped stays a blocking hit: one repair, then the page fails.
 */
export function dropRestatements(copy: Loose, gates: CopyGateContext): string[] {
  const spec = gates.factRestatement;
  if (!spec) return [];
  const hits = blockingGateHits(runCopyGates(copy, gates), gates).filter(hit => hit.rule === GATE_RULES.factRestatement);
  if (!hits.length) return [];
  const plan = emptyDropPlan();
  for (const field of new Set(hits.map(hit => hit.field))) {
    if (field in PROSE_MIN_SENTENCES) {
      const value = copy[field];
      if (typeof value !== 'string') continue;
      proseSentences(value).forEach((sentence, index) => { if (restatementMatches(sentence, spec).length) planFieldDrop(plan, field, index); });
    } else {
      planFieldDrop(plan, field);
    }
  }
  return applyDropPlan(copy, plan, 'restatement');
}

/** Rerun-3 items 4-5: the rules whose hits are dropped where the field allows it, then get one repair, then fail the page. */
export const CLAIM_SCOPE_RULES: readonly string[] = [GATE_RULES.fearPromise, GATE_RULES.sameDayScope];
export const CLAIM_SCOPE_MAX_REPAIRS = 1;

/**
 * Rerun-3 items 4-5: drop what breaks gate_fear_promise / gate_same_day_scope where the field is droppable: the sentence of a
 * prose field (keeping its minimum), a card description, a depth item, a nullable heading. Other fields (hero, H1 ...) keep
 * the hit for one repair.
 */
export function dropClaimScope(copy: Loose, gates: CopyGateContext): string[] {
  if (!gates.fearPromise && !gates.sameDayScope) return [];
  const hits = blockingGateHits(runCopyGates(copy, gates), gates).filter(hit => CLAIM_SCOPE_RULES.includes(hit.rule));
  if (!hits.length) return [];
  const plan = emptyDropPlan();
  for (const field of new Set(hits.map(hit => hit.field))) {
    if (field in PROSE_MIN_SENTENCES) {
      const value = copy[field];
      if (typeof value !== 'string') continue;
      proseSentences(value).forEach((sentence, index) => { if (claimScopeSentenceRules(sentence, gates).length) planFieldDrop(plan, field, index); });
    } else {
      planFieldDrop(plan, field);
    }
  }
  return applyDropPlan(copy, plan, 'claim_scope');
}

/** Copy v2 slice 6: a model-written Q&A answer that names the business is dropped (never repaired; the lead names it). */
export function dropQaBrandAnswers(copy: Loose, gates: CopyGateContext): string[] {
  if (!gates.qaCodeOwnership) return [];
  const hits = runCopyGates(copy, gates).filter(hit => hit.rule === GATE_RULES.qaBrandInAnswer);
  if (!hits.length) return [];
  const plan = emptyDropPlan();
  for (const field of new Set(hits.map(hit => hit.field))) planFieldDrop(plan, field);
  return applyDropPlan(copy, plan, 'qa_brand');
}

const HEB_LETTER = '[\u05D0-\u05EA]';
/**
 * Copy v2 slice 8: ASCII quote marks in Hebrew text become the Hebrew marks, deterministically: a single-quoted Hebrew run
 * becomes a gershayim pair; " between Hebrew letters (an abbreviation) and every other " become gershayim; ' after a Hebrew
 * letter (a geresh) and every other ' become geresh. Text without Hebrew is returned unchanged.
 */
export function hebrewQuoteMarks(text: string): string {
  if (!new RegExp(HEB_LETTER, 'u').test(text) || !/["']/.test(text)) return text;
  return text
    .replace(new RegExp(`(?<!${HEB_LETTER})'(${HEB_LETTER}[^'\n]*?)'(?!${HEB_LETTER})`, 'gu'), '\u05F4$1\u05F4')
    .replace(/"/g, '\u05F4')
    .replace(/'/g, '\u05F3');
}

/** Copy v2 slice 7 (warn-only): the judge call is stubbed and OFF; promote only after Noa reads its precision (>= 90%). */
export const PROMISE_JUDGE_ENABLED = false;
/** The fields the judge reads (hero, story, about, cards). */
export const PROMISE_JUDGE_FIELDS: readonly string[] = ['heroHeadline', 'heroSubheadline', 'storyBody', 'aboutPageBody', 'serviceDetails'];
export const PROMISE_JUDGE_SYSTEM_PROMPT = 'You check one Hebrew landing page for internal contradictions. Reply with JSON only.';

/** The judge's message: the page's promise fields, and the JSON shape it must return. English instructions only. */
export function buildPromiseJudgeMessage(copy: Loose): string {
  const fields = Object.fromEntries(PROMISE_JUDGE_FIELDS.filter(key => key in copy).map(key => [key, copy[key]]));
  return `PAGE FIELDS:\n${JSON.stringify(fields)}\n\nState the page's one main promise as heroHeadline and heroSubheadline make it (including any order of the work: something done before something else). Then list every sentence in the other fields that contradicts that promise or its order, quoted exactly. Output JSON only: {"promise": "", "contradictingSentences": [{"field": "", "sentence": ""}]}`;
}

/**
 * Copy v2 slice 7: the warn-only promise-contradiction judge (think:false). Off unless enabled; logged as warnings, never
 * repaired, never fails the page; a failed or malformed call is ignored. Field names and counts only, never copy text.
 */
export async function promiseContradictionWarnings(copy: Loose, callJson: QwenJsonCaller, enabled: boolean = PROMISE_JUDGE_ENABLED): Promise<CopyViolation[]> {
  if (!enabled) return [];
  try {
    const raw = await callJson(PROMISE_JUDGE_SYSTEM_PROMPT, buildPromiseJudgeMessage(copy), { think: false });
    const parsed: unknown = JSON.parse(raw);
    const list = plainObject(parsed) && Array.isArray(parsed.contradictingSentences) ? parsed.contradictingSentences : [];
    const fields = list.flatMap(item => (plainObject(item) && typeof item.field === 'string' && PROMISE_JUDGE_FIELDS.includes(topField(item.field)) ? [topField(item.field)] : []));
    return [...new Set(fields)].map(field => ({ field, rule: 'gate_promise_contradiction', actual: fields.filter(item => item === field).length }));
  } catch {
    return [];
  }
}

/** Copy v2 slice 4: restatement hits get one repair per page; after that they are not sent to the model again (the page fails). */
export const RESTATEMENT_MAX_REPAIRS = 1;

/** Copy v2 slice 2: the brief proof ids of owner answers the model never sees (English non-numeric text). */
function modelHiddenProofIds(brief: PageBrief, data: CollectedData): string[] {
  const templates = brief.site ? codeOwnedFactTemplates() : null;
  return templates ? droppedOwnerFactKeys(data, templates).map(key => `proof-${String(key)}`) : [];
}

/**
 * Copy v2 slice 2: shape options for validating a stored research page record. Relaxation only: the never-rendered strings may
 * be '' (copy generated with code-owned facts); copy saved before passes exactly as before.
 */
export function researchedRecordShapeOptions(classification: string, serviceLabels: readonly string[] = []): SiteCopyShapeOptions {
  return { ungenerated: [...researchedUngeneratedFieldsFor(classification), ...RESEARCH_UNRENDERED_FIELDS], emptyCardDescriptions: true, ...(serviceLabels.length ? { serviceLabels: [...serviceLabels] } : {}) };
}

/** M2b.1d: the bounded-validator shape options of a brief's page. */
export function shapeOptions(brief: PageBrief): SiteCopyShapeOptions {
  const ungenerated = ungeneratedFieldsFor(brief);
  // Bug-1 fix (rerun 3): card names may equal an owner label longer than the fixed limit.
  const labels = brief.site?.serviceLabels ?? [];
  const named = longServiceLabelChars(labels) ? { serviceLabels: [...labels] } : {};
  // Copy v2 slices 4-5: a dropped card description is '' (code-owned facts only).
  if (codeOwnsFacts(brief)) return { ungenerated, emptyCardDescriptions: true, ...named };
  return ungenerated.length || named.serviceLabels ? { ...(ungenerated.length ? { ungenerated } : {}), ...named } : {};
}

/**
 * M2b.1d (section 22.2): the services headline is a closed set. A value byte-identical to an entry after trimming becomes
 * that entry; anything else becomes the first entry (deterministic, never a repair call: the H2 is a fixed signpost).
 */
export function normalizedServicesHeadline(value: unknown): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return SERVICES_HEADLINE_OPTIONS.includes(trimmed) ? trimmed : SERVICES_HEADLINE_OPTIONS[0];
}

export function withSystemFields(value: Loose, brief: PageBrief, data: CollectedData): Loose {
  const next: Loose = { ...value, faqItems: supportedFaqItems(brief) };
  // Copy v2 slice 6: code-built Q&A items first (owner facts on pool questions), then the model's items on the other pool
  // questions with the pool wording as q (the lead goes in front of each answer after the final gates).
  const qa = codeOwnedQa(brief, data);
  if (qa && ('qaItems' in next || qa.plan.codeItems.length)) next.qaItems = assembleQaItems(next.qaItems, qa.plan, qa.lead);
  // Content depth: the blocks stay only on a service page that may generate them (settleDepthBlocks drops the rest).
  settleDepthBlocks(next, depthPage(brief) ? brief.blocksEnabled ?? null : null, brief.site?.pageName ?? null);
  if (!brief.site) return next;
  // M2b.1h: the pitch (pitch-first pages) and the story fields (homepage) stay only where the page generates them, and only as
  // a non-empty string within the limit (else null: dropped whole, never edited; settleStage logs why). An absent key stays absent.
  for (const key of OPTIONAL_PRESENCE_KEYS) {
    if (!(key === 'pitch' ? pitchFirstPage(brief) : storyPage(brief))) { delete next[key]; continue; }
    if (!(key in next)) continue;
    const field = next[key];
    next[key] = typeof field === 'string' && field.trim() && field.length <= SITE_COPY_OPTIONAL_PRESENCE_LIMITS[key] ? field : null;
  }
  // Copy v2 slice 8: the unrendered pitch gets the deterministic ASCII-quote -> geresh / gershayim fix (no Noa stage sees it).
  if (typeof next.pitch === 'string' && codeOwnedFactTemplates()) next.pitch = hebrewQuoteMarks(next.pitch);
  // M2b.1d: ungenerated fields are system-filled (empty about pair and cards; the first services headline entry), and the
  // services headline of a page that generates it is normalised to the closed set.
  const ungenerated = ungeneratedFieldsFor(brief);
  if (ungenerated.includes('aboutPageHeadline')) next.aboutPageHeadline = '';
  if (ungenerated.includes('aboutPageBody')) next.aboutPageBody = '';
  if (ungenerated.includes('serviceDetails')) next.serviceDetails = [];
  next.servicesHeadline = normalizedServicesHeadline(ungenerated.includes('servicesHeadline') ? null : next.servicesHeadline);
  next.heroCta = researchHeroCta(brief, data);
  const itemLimit = SITE_COPY_STRING_LIST_LIMITS.serviceItems;
  next.serviceItems = brief.site.serviceLabels.filter(label => label.length <= itemLimit.itemMaxChars).slice(0, itemLimit.maxItems);
  const quote = effectiveReviewQuote(data);
  next.reviewFeatured = quote && quote.length <= SITE_COPY_OPTIONAL_STRING_LIMITS.reviewFeatured ? quote : null;
  if (!ownerHasGuarantee(data)) next.guaranteeBlock = null;
  // M2a.3 (item 6): the response-time badge is the emergency arrival promise; never on an installation page.
  if (isInstallPage(brief)) next.responseTimeBadge = null;
  // M2b.1g (section 23.2 e): the trust-bar area tile and the badge's place list are built from the area array.
  const places = gatePlaces(brief);
  const templates = codeOwnedFactTemplates();
  if (templates) {
    // Copy v2 slice 2: the trust bar and the B6 proof are code-built from the owner facts; the proof heading falls back to
    // the approved label; the never-rendered fields are system-blank.
    const facts = ownerFacts(data, brief, templates);
    const options = { installPage: isInstallPage(brief) };
    next.trustBarItems = trustBarFromFacts(facts, options, templates);
    if (depthPage(brief) && brief.blocksEnabled?.proof) {
      const proof = proofItemsFromFacts(facts, options, templates);
      next.proofItems = proof.length ? proof : null;
      next.proofHeadline = null;
    }
    for (const key of RESEARCH_UNRENDERED_FIELDS) next[key] = RESEARCH_UNRENDERED_NULL_FIELDS.includes(key) ? null : '';
  } else {
    if (Array.isArray(next.trustBarItems)) next.trustBarItems = withAreaTile(next.trustBarItems, places);
    if (typeof next.responseTimeBadge === 'string') next.responseTimeBadge = withPlaceListPrefixes(next.responseTimeBadge, places);
  }
  // M2b.1g (section 23.2, Noa's slip 3): sentence-final periods, then the invariant.
  normalizeFinalPeriods(next);
  assertFinalPeriods(next);
  return next;
}

/**
 * M2b.1g (section 23.2 e): the trust bar with the system-built area tile. A model-written area tile (an item that is only
 * owner places) is replaced in place by the built one (and any second one dropped); otherwise the tile is appended while the
 * bar has room. Other items are never edited.
 */
export function withAreaTile(items: readonly unknown[], places: readonly string[]): unknown[] {
  const tile = buildAreaTile(places, TRUST_BAR_MAX_CHARS);
  if (!tile) return [...items];
  const isTile = (item: unknown) => typeof item === 'string' && isAreaTile(item, places);
  const at = items.findIndex(isTile);
  if (at >= 0) return items.flatMap((item, index) => (index === at ? [tile] : isTile(item) ? [] : [item]));
  return items.length < TRUST_BAR_MAX_ITEMS ? [...items, tile] : [...items];
}

/** A sentence-final mark, allowing closing quotes / a bracket after it (section 23.2: . ! or ?). */
const SENTENCE_END = /[.!?][\u05F4\u201D")]*\s*$/u;
const LABEL_PERIOD = /\.+\s*$/u;

/** Apply `fn` to every non-empty string of one data-file field name (`a`, `a[]` or `a[].b`), in place. */
function mapFieldStrings(copy: Loose, name: string, fn: (value: string) => string): void {
  const [top, inner] = name.split('[]');
  if (inner === undefined) {
    const value = copy[top];
    if (typeof value === 'string' && value.trim()) copy[top] = fn(value);
    return;
  }
  const list = copy[top];
  if (!Array.isArray(list)) return;
  const key = inner.replace(/^\./, '');
  copy[top] = list.map(item => {
    if (!key) return typeof item === 'string' && item.trim() ? fn(item) : item;
    if (!plainObject(item) || typeof item[key] !== 'string' || !(item[key] as string).trim()) return item;
    return { ...item, [key]: fn(item[key] as string) };
  });
}

/** Every non-empty string of one data-file field name, with its path (for the invariant). */
function fieldStrings(copy: Loose, name: string): Array<{ field: string; value: string }> {
  const out: Array<{ field: string; value: string }> = [];
  mapFieldStrings({ ...copy }, name, value => { out.push({ field: name, value }); return value; });
  return out;
}

/**
 * M2b.1g (section 23.2, Noa's slip 3): SENTENCE_FINAL_PERIOD_FIELDS end with "." unless they already end with . ! or ?;
 * NO_FINAL_PERIOD_FIELDS lose a trailing ".". Punctuation only; heroSubheadline is untouched (Noa owns it).
 */
/** M2b.1h: the story body is a sentence field and its headline a label field (engineer extension of the section 23.2 lists). */
export const M2B1H_SENTENCE_FIELDS: readonly string[] = ['storyBody'];
export const M2B1H_LABEL_FIELDS: readonly string[] = ['storyHeadline'];
const sentenceFields = () => [...SENTENCE_FINAL_PERIOD_FIELDS, ...M2B1H_SENTENCE_FIELDS];
const labelFields = () => [...NO_FINAL_PERIOD_FIELDS, ...M2B1H_LABEL_FIELDS];

export function normalizeFinalPeriods(copy: Loose): Loose {
  for (const name of sentenceFields()) mapFieldStrings(copy, name, value => (SENTENCE_END.test(value) ? value : `${value.trimEnd()}.`));
  for (const name of labelFields()) mapFieldStrings(copy, name, value => (LABEL_PERIOD.test(value) ? value.replace(LABEL_PERIOD, '') : value));
  return copy;
}

/** The section 23.2 assertion: every sentence field ends in . ! or ?, and no label field ends in ".". Throws otherwise. */
export function assertFinalPeriods(copy: Loose): void {
  for (const name of sentenceFields()) {
    for (const { field, value } of fieldStrings(copy, name)) if (!SENTENCE_END.test(value)) throw new Error(`site copy punctuation invariant: ${field} has no sentence-final mark`);
  }
  for (const name of labelFields()) {
    for (const { field, value } of fieldStrings(copy, name)) if (LABEL_PERIOD.test(value)) throw new Error(`site copy punctuation invariant: ${field} ends with a period`);
  }
}

async function repairFields(ctx: RepairContext, stage: CopyValidationStage, value: Loose, violations: CopyViolation[], fields: string[]): Promise<Loose> {
  ctx.remaining--;
  ctx.used++;
  ctx.emit({ stage, kind: 'repair', attempt: ctx.used, fields, violations });
  const system = !ctx.brief.site ? REPAIR_SYSTEM_PROMPT : ctx.promptVersion === 'v2' ? SITE_REPAIR_SYSTEM_PROMPT_V2 : SITE_REPAIR_SYSTEM_PROMPT;
  const raw = await ctx.callJson(system, buildCopyRepairPrompt(value, violations, fields, ctx.gates), { thinkingBudget: 1000 });
  const parsed = parseLoose(raw, rawMaxBytes(ctx.brief));
  if (!parsed.value) return value;
  const merged: Loose = { ...value };
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(parsed.value, field)) merged[field] = parsed.value[field];
  }
  return merged;
}

function systemFieldsFor(ctx: RepairContext): readonly string[] {
  if (!ctx.brief.site) return ['faqItems'];
  // M2b.1d: the fields this page does not generate are system-filled, and the services headline is system-normalised.
  const fields = [...(ownerHasGuarantee(ctx.data) ? SYSTEM_FIELDS : [...SYSTEM_FIELDS, 'guaranteeBlock']), ...ungeneratedFieldsFor(ctx.brief)];
  return isInstallPage(ctx.brief) ? [...fields, 'responseTimeBadge'] : fields;
}

/** Validate one stage's output against the validator and the gates, spending repair budget, then safe fixes; throws with what remains. */
async function settleStage(ctx: RepairContext, stage: CopyValidationStage, call: () => Promise<string>): Promise<SiteCopy> {
  const settle = (raw: Loose) => settleWithDrops(ctx, stage, withSystemFields(raw, ctx.brief, ctx.data));
  // M2b.1h: the pitch / story shape notes of each fresh model response (warnings only; never repaired, never fail the page).
  const note = (raw: Loose | undefined) => {
    const warnings = raw ? optionalFieldWarnings(raw, ctx.brief, stage) : [];
    if (warnings.length) ctx.emit({ stage, kind: 'warnings', violations: warnings });
  };
  let parsed = parseLoose(await call(), rawMaxBytes(ctx.brief));
  note(parsed.value);
  let value = parsed.value ? settle(parsed.value) : undefined;
  for (;;) {
    const violations = value ? currentViolations(value, ctx.gates, shapeOptions(ctx.brief)) : parsed.violations;
    if (value && violations.length === 0) {
      emitWarnings(stage, value, ctx.gates, ctx.emit);
      return value as unknown as SiteCopy;
    }
    ctx.emit({ stage, kind: 'violations', violations });
    if (ctx.remaining <= 0) break;
    if (!value || structural(violations)) {
      ctx.remaining--;
      ctx.used++;
      ctx.emit({ stage, kind: 'stage_retry', attempt: ctx.used, violations });
      parsed = parseLoose(await call(), rawMaxBytes(ctx.brief));
      note(parsed.value);
      value = parsed.value ? settle(parsed.value) : undefined;
      continue;
    }
    // Copy v2 slice 4: restatement hits get RESTATEMENT_MAX_REPAIRS repair per page; after that the page fails on them.
    const restated = violations.filter(violation => violation.rule === GATE_RULES.factRestatement);
    // Rerun-3 items 4-5: claim-scope hits get CLAIM_SCOPE_MAX_REPAIRS repair per page too (counted separately).
    const scoped = violations.filter(violation => CLAIM_SCOPE_RULES.includes(violation.rule));
    const spentRestatement = (ctx.restatementRepairs ?? 0) >= RESTATEMENT_MAX_REPAIRS;
    const spentScope = (ctx.claimScopeRepairs ?? 0) >= CLAIM_SCOPE_MAX_REPAIRS;
    const sendable = violations.filter(violation => !(spentRestatement && restated.includes(violation)) && !(spentScope && scoped.includes(violation)));
    const fields = repairableFields(sendable, systemFieldsFor(ctx));
    if (!fields.length) break;
    if (restated.length && !spentRestatement) ctx.restatementRepairs = (ctx.restatementRepairs ?? 0) + 1;
    if (scoped.length && !spentScope) ctx.claimScopeRepairs = (ctx.claimScopeRepairs ?? 0) + 1;
    value = settle(await repairFields(ctx, stage, value, sendable, fields));
  }
  if (!value) throw new GeneratedCopyValidationError(stage, parsed.violations);
  if (ctx.deterministicFixes) {
    const fixed = applySafeDeterministicFixes(value, ctx.gates);
    if (fixed.fixes.length) {
      ctx.emit({ stage, kind: 'deterministic_fix', fixes: fixed.fixes });
      value = fixed.value;
    }
  }
  assertCopyAt(stage, value, shapeOptions(ctx.brief));
  assertGatesAt(stage, value, ctx.gates, ctx.emit);
  return value as unknown as SiteCopy;
}

/** Sentences of a text (split after . ! or ?), for the story's sentence-count note. */
function sentenceCount(value: string): number {
  return value.split(/(?<=[.!?])\s+/u).filter(part => part.trim()).length;
}

/**
 * M2b.1h: shape notes on the pitch (Tamar stage; Noa never sees it) and the story fields (homepage) of a raw model response:
 * missing, over the limit (withSystemFields then drops it), the pitch word count and the story sentence count. Lengths and
 * counts only, never copy text.
 */
export function optionalFieldWarnings(raw: Loose, brief: PageBrief, stage: CopyValidationStage): CopyViolation[] {
  const out: CopyViolation[] = [];
  const check = (key: OptionalPresenceKey, required: boolean) => {
    const value = raw[key];
    if (value === undefined) { if (required) out.push({ field: key, rule: 'missing' }); return null; }
    if (value === null) return null;
    if (typeof value !== 'string' || !value.trim()) { out.push({ field: key, rule: typeof value === 'string' ? 'empty' : 'type' }); return null; }
    const max = SITE_COPY_OPTIONAL_PRESENCE_LIMITS[key];
    if (value.length > max) { out.push({ field: key, rule: 'max_length', limit: max, actual: value.length }); return null; }
    return value;
  };
  if (pitchFirstPage(brief) && stage === 'tamar') {
    const pitch = check('pitch', true);
    const words = pitch ? pitch.trim().split(/\s+/u).length : 0;
    if (pitch && (words < PITCH_MIN_WORDS || words > PITCH_MAX_WORDS)) out.push({ field: 'pitch', rule: 'word_count', limit: PITCH_MAX_WORDS, actual: words });
  }
  if (depthPage(brief)) {
    const clone: Loose = { ...raw };
    for (const note of settleDepthBlocks(clone, brief.blocksEnabled ?? null, brief.site?.pageName ?? null)) out.push(note);
    for (const block of DEPTH_BLOCKS) if (brief.blocksEnabled?.[block.id] && !(block.items in raw)) out.push({ field: block.items, rule: 'missing' });
  }
  if (storyPage(brief)) {
    check('storyHeadline', false);
    const body = check('storyBody', true);
    const sentences = body ? sentenceCount(body) : 0;
    if (body && (sentences < STORY_MIN_SENTENCES || sentences > STORY_MAX_SENTENCES)) out.push({ field: 'storyBody', rule: 'sentence_count', limit: STORY_MAX_SENTENCES, actual: sentences });
  }
  return out;
}

/** M2a.7: one 'warnings' event for the settled copy of a stage (gate hits that never fail the page). */
function emitWarnings(stage: CopyValidationStage, value: Loose, gates: CopyGateContext | null, emit?: (event: CopyRepairEvent) => void): void {
  const warnings = gateWarnings(value, gates);
  if (warnings.length) emit?.({ stage, kind: 'warnings', violations: warnings });
}

/** Throws on blocking gate hits; M2a.7: first logs the warnings of the settled copy (one 'warnings' event per stage). */
function assertGatesAt(stage: CopyValidationStage, value: Loose, gates: CopyGateContext | null, emit?: (event: CopyRepairEvent) => void): void {
  emitWarnings(stage, value, gates, emit);
  const hits = gateViolations(value, gates);
  if (hits.length) throw new GeneratedCopyValidationError(stage, hits);
}

const LEGACY_PERSONA_LINE = "You are Tamar, WAO's Sabra conversion copywriter.";
const RESEARCH_PERSONA_LINE = 'You are Tamar, a Sabra conversion copywriter writing for one local business.';

/**
 * M2a.3 (item 4): the legacy banned-phrase list explains one ban with an invented solo-operator
 * example (answers personally, no call centre). The research prompt cuts that parenthetical (from
 * this anchor to the end of its closing line), so the model is never shown an unstated solo claim.
 */
const SOLO_EXAMPLE_START = '   (banned only BARE';
const SOLO_EXAMPLE_END = ')\n';

/** The legacy prompt's invented license-grade example (aboutBlurb opener); cut from the research prompt (item 3). */
const LICENSE_EXAMPLE_START = 'Example 2 \u2014 aboutBlurb opener';
const LICENSE_EXAMPLE_END = 'Example 3 \u2014';

function ownerFactText(data: CollectedData): string {
  return Object.values(data).filter((value): value is string => typeof value === 'string').join('\n');
}

export function buildResearchPageGenerationPrompt(brief: PageBrief, data: CollectedData, siteTerms?: readonly string[]): string {
  // M2a.2: a quote that is not mostly Hebrew never reaches the model (never translated, item 8),
  // and with no owner guarantee the schema shows guaranteeBlock as null (item 7).
  const quoteData: CollectedData = brief.site && !effectiveReviewQuote(data) ? { ...data, reviewQuote: '' } : data;
  // Copy v2 slice 2: an owner answer that is English non-numeric text never reaches the model (never translated).
  const factTemplates = brief.site ? codeOwnedFactTemplates() : null;
  const hiddenKeys = factTemplates ? droppedOwnerFactKeys(data, factTemplates) : [];
  const promptData: CollectedData = hiddenKeys.length ? { ...quoteData, ...Object.fromEntries(hiddenKeys.map(key => [key, ''])) } : quoteData;
  const schemaOptions = {
    blankResponseTimeBadge: true,
    ...(brief.site ? { relevanceTerm: brief.site.relevanceTerm, nullGuarantee: !ownerHasGuarantee(data) } : {}),
  };
  // M2b.1d: a page that does not render the about section and the service cards gets the LP schema (no about-page /
  // service-detail block or keys) without the servicesHeadline key; the system fills those fields.
  const omit = ungeneratedFieldsFor(brief);
  const lpSchema = omit.includes('serviceDetails');
  const baseSchema = lpSchema ? withoutSchemaKey(buildLpCopyPrompt(promptData, schemaOptions), 'servicesHeadline') : buildSiteCopyPrompt(promptData, schemaOptions);
  // Copy v2 slice 2: the code-owned and never-rendered keys leave the schema's OUTPUT object too.
  const schema = codeOwnsFacts(brief) ? withoutSchemaLines(baseSchema, ['trustBarItems', ...RESEARCH_UNRENDERED_FIELDS]) : baseSchema;
  // A4: the client copy prompt never names WAO (a WAO-offer leak put a copywriting agency's services on a plumber page).
  if (!schema.includes(LEGACY_PERSONA_LINE)) throw new Error('Site copy schema prompt persona line changed; update the research persona swap.');
  let clientSchema = schema.replace(LEGACY_PERSONA_LINE, RESEARCH_PERSONA_LINE);
  if (brief.site) {
    const start = clientSchema.indexOf(LICENSE_EXAMPLE_START);
    const end = clientSchema.indexOf(LICENSE_EXAMPLE_END, start);
    if (start < 0 || end < 0) throw new Error('Site copy schema prompt license example changed; update the research example cut.');
    clientSchema = `${clientSchema.slice(0, start)}${clientSchema.slice(end)}`;
    const soloStart = clientSchema.indexOf(SOLO_EXAMPLE_START);
    const soloEnd = clientSchema.indexOf(SOLO_EXAMPLE_END, clientSchema.indexOf('e.g.', soloStart));
    if (soloStart < 0 || soloEnd < 0) throw new Error('Site copy schema prompt solo example changed; update the research example cut.');
    clientSchema = `${clientSchema.slice(0, soloStart)}${clientSchema.slice(soloEnd + 1)}`;
    // Owner facts may authorise a solo claim; the prompt template itself never may.
    const template = buildSiteCopyPrompt({}, { blankResponseTimeBadge: true });
    if ((CLAIM_TOKENS.solo_operator ?? []).some(token => template.includes(token) && clientSchema.includes(token) && !ownerFactText(data).includes(token))) {
      throw new Error('Site copy schema prompt shows an unstated solo-operator claim; update the research example cut.');
    }
  }
  if (pitchFirstPage(brief)) clientSchema = pitchFirstSchema(clientSchema, storyPage(brief));
  return `${buildResearchPageCopyPrompt(brief, data, siteTerms)}\n\nOWNER FACTS AND SITE COPY SCHEMA:\n${clientSchema}\n\n${buildSiteCopyHardLimitsBlock('HARD LIMITS', omit, layoutFor(brief))}`;
}

// ---------------------------------------------------------------------------
// Copy v2 slice 3 (docs/missions/site-bot-code-owns-facts-2026-11-10.md, "New prompt skeleton"): the short prompt of a page
// whose owner facts are code-built. English only and abstract (no Hebrew examples: rule examples leak into output); the only
// Hebrew it carries is moved, never typed: the code-built fact strings, the owner's own data, and the data-file lists.
// v1 (buildResearchPageGenerationPrompt) stays byte-identical for one A/B round.
// ---------------------------------------------------------------------------

/**
 * Copy v2 slice 6: the Q&A plan and answer lead of a code-owned service page with a Q&A block (null otherwise: pending
 * templates, no depth page, Q&A off).
 */
export function codeOwnedQa(brief: PageBrief, data: CollectedData): { plan: QaPlan; lead: string | null } | null {
  const templates = brief.site ? codeOwnedFactTemplates() : null;
  if (!templates || !depthPage(brief) || !brief.blocksEnabled?.qa) return null;
  return { plan: planQa(brief, data, templates, { installPage: isInstallPage(brief) }), lead: qaAnswerLead(brief, data, templates) };
}

/** Copy v2 slice 6: how many leading qaItems of a page are code-built (rescore / diagnostics). */
export function codeQaItemCount(copy: Loose, brief: PageBrief, data: CollectedData): number {
  const qa = codeOwnedQa(brief, data);
  return qa && Array.isArray(copy.qaItems) ? Math.min(qa.plan.codeItems.length, copy.qaItems.length) : 0;
}

/**
 * Copy v2 slice 6, after the final gates: the qaAnswerLead in front of every model-written answer (in the same string, so
 * it renders in the same paragraph). Returns the fix notes; nothing on other pages.
 */
export function withQaAnswerLeads(copy: Loose, brief: PageBrief, data: CollectedData): string[] {
  const qa = codeOwnedQa(brief, data);
  return qa ? applyQaAnswerLeads(copy, { codeItems: qa.plan.codeItems.length }, qa.lead) : [];
}

/** The code-built strings of one page (what the reader already sees from the system), or null while the templates are pending. */
export interface CodeBuiltFactStrings {
  trustBarItems: string[];
  proofItems: string[];
  pricePromises: string[];
  costFaq: { q: string; a: string } | null;
}

export function codeBuiltFactStrings(brief: PageBrief, data: CollectedData): CodeBuiltFactStrings | null {
  const templates = brief.site ? codeOwnedFactTemplates() : null;
  if (!templates || !brief.site) return null;
  const facts = ownerFacts(data, brief, templates);
  const options = { installPage: isInstallPage(brief) };
  const proof = depthPage(brief) && brief.blocksEnabled?.proof ? proofItemsFromFacts(facts, options, templates).map(item => item.text) : [];
  const faq = rendersDepthBlocks(brief.page.pageClass)
    ? costFaq(data, { service: brief.site.pageName, city: brief.site.city ?? null, business: data.businessName || data.businessNiche || '' })
    : null;
  return {
    trustBarItems: trustBarFromFacts(facts, options, templates),
    proofItems: proof,
    pricePromises: pricingPromisePhrases(data),
    costFaq: faq ? { q: faq.q, a: faq.a } : null,
  };
}

/** One v2 prompt section: a heading and its binding rules (each rule one line starting with "- "). */
export interface PromptV2Section {
  heading: string;
  rules: string[];
}

/** P6 without its sticky-bar sentence (the sticky bar is never generated or rendered on a research site). Asserted anchor. */
export const P6_STICKY_SENTENCE = ' The sticky bar always contains an action from `stickyActionTokens` and never repeats the hero CTA.';
function p6WithoutSticky(): string {
  const text = voiceRule('P6');
  const at = text.indexOf(P6_STICKY_SENTENCE);
  if (at < 0 || text.indexOf(P6_STICKY_SENTENCE, at + 1) >= 0) throw new Error('generationData rule P6 changed; update the copy v2 sticky cut.');
  return `${text.slice(0, at)}${text.slice(at + P6_STICKY_SENTENCE.length)}`;
}

/** v2 ALREADY ON THE PAGE rule: the code-built strings, which the model never restates (gate_fact_restatement checks it). */
export function alreadyOnPageRule(strings: CodeBuiltFactStrings | null): string {
  const shown = strings ? [...strings.pricePromises, ...strings.trustBarItems, ...strings.proofItems, ...(strings.costFaq ? [strings.costFaq.q, strings.costFaq.a] : [])] : [];
  return `- ALREADY ON THE PAGE (binding): the system shows the owner's years in the trade, licence, warranty, response time, rating and prices itself, in fixed wording${shown.length ? `: ${JSON.stringify(shown)}` : ''}. Never restate any of them, or their numbers, in a field you write; the system checks every field. One exception: heroHeadline or heroSubheadline may carry one of them once, in the owner's exact digits, when it is part of his usp.`;
}

/** Copy v2: the rules of one page, by section (the count is asserted in the tests). */
export function buildResearchCopyRulesV2(brief: PageBrief, data: CollectedData = {}): PromptV2Section[] {
  const site = brief.site;
  const sections = rendersSiteSections(brief.page.pageClass) && Boolean(site);
  const story = storyPage(brief);
  const pitch = pitchFirstPage(brief);
  const limits = SITE_COPY_OPTIONAL_PRESENCE_LIMITS;
  const scope = site ? fixTimeScope(briefGateContext(brief, data)) : null;
  const truth = [
    '- VOICE (binding): the first-person plural is forbidden in every tense and form, not only the listed words: no "we did", "we started", "we will", "our" or "us". The owner always speaks as "I".',
    '- NAMES (binding): write the business name and the owner\'s name exactly as they appear in the owner facts, in their original script and spelling, character for character. Never transliterate a Latin name into Hebrew letters and never translate a name.',
    '- Owner facts may arrive translated or in English. Render their meaning in native, idiomatic Hebrew; never mirror an English idiom or English word order, and never copy English wording into the copy (proper names excepted).',
    '- HOURS AND AVAILABILITY (binding): never write business days, hours or clock times (the system shows the owner\'s hours), and never an availability figure such as 24/7 unless the owner wrote exactly that figure.',
    '- SERVICE AREA (binding): name only the places in the service-area local fact, by their display names and exactly as written (never insert a hyphen or maqaf); never a region, a district, nearby towns or "and surroundings". When you list several places as locations, attach the locative prefix letter (\u05D1) to every place in the list, including after the conjunction (\u05D5).',
    '- SAME DAY (binding): promise a same-day arrival only when the owner gave a response time. Promise to finish or fix a job the same day only when the owner\'s USP or guarantee says so, and only for the service it names.',
    ...(site && isInstallPage(brief) ? ['- INSTALLATION PAGE (binding): this page is about an installation service. Never state an arrival or response time on it (no "arrives within <time>"): the emergency response time belongs on repair pages only.'] : []),
    ...(scope instanceof Set ? [`- A same-day / fix-within promise from the owner covers only these services: ${JSON.stringify([...scope])}. Never extend it to any other service.`] : []),
    '- CUSTOMER VOICE (binding): the customer quote appears only in reviewFeatured, which the system fills in verbatim. Never quote, paraphrase or echo it in another field, never attribute a statement to a customer or to customers, and never turn what a customer said, or the opposite of his fear, into the owner\'s promise.',
    FACT_LEDGER_RULES[1],
    '- FACT LEDGER (binding; in your reasoning, before you write; do not output it): list every tool and every process step you plan to name, and next to each the owner field it comes from. Drop every one that has no named owner field.',
    '- heroCta, reviewFeatured, serviceItems and faqItems are filled in by the system: output them exactly as given in the schema. reviewContext: only when the data supplies a star rating, otherwise null.',
  ];
  const out: PromptV2Section[] = [
    { heading: 'ROLE AND FACTS', rules: [
      `- ${SINGULAR_ADDRESS_RULE_V2}`,
      '- FACTS (binding): use only the facts in the research brief and the owner facts below. Never add a number, tool, place, price, guarantee, credential or story they do not state, and never fill an information gap with an inference or make a claim listed in prohibitedClaims.',
      alreadyOnPageRule(codeBuiltFactStrings(brief, data)),
    ] },
    { heading: 'TRUTH', rules: truth },
  ];
  if (pitch) {
    out.push({ heading: 'PITCH FIRST (it overrides any instruction to write the copy field by field)', rules: [
      '- Before you write anything, decide three things in your reasoning (do not output them): the reader\'s awareness stage and the market\'s sophistication stage; the one big promise of this page, from the owner\'s usp (or, if it has none, from his strongest fact against the customer\'s fear); and the unique mechanism: the specific how, from the owner\'s usp, that makes the promise believable.',
      '- Use the direct-response toolkit listed below, the formula that fits each part.',
      `- First write the whole pitch as one free-flowing short sales letter. "pitch" is the first key of your JSON output: ${PITCH_MIN_WORDS} to ${PITCH_MAX_WORDS} words of Hebrew prose (at most ${limits.pitch} characters), in the owner's first person, addressed to the reader; every binding rule applies to it. The system stores it and never shows it.`,
      '- Then write every other key by cutting it from the pitch: keep its strongest lines, and fit each one to its field\'s limit and job. Never write field by field from scratch.',
    ] });
  }
  const fields: string[] = [
    heroAnchorRule(brief),
    ...(pitch ? ['- heroHeadline carries the one big promise. It has no fixed shape: no required hook, question, dash or clause order.'] : []),
    cutContractRules(brief)[0],
    ...(story ? [
      `- storyBody: the story section right below the hero, ${STORY_MIN_SENTENCES} to ${STORY_MAX_SENTENCES} sentences (at most ${limits.storyBody} characters): the felt scene of the reader's problem, his highest-tension moment, the owner's mechanism stated once, and an ending on the reader's outcome, never on the tool or the owner.`,
      `- storyHeadline: the story's heading (at most ${limits.storyHeadline} characters) or null. It names the scene or the mechanism in words of its own: never the hero's promise and never a sentence of storyBody.`,
    ] : []),
    ...(sections ? [
      `- aboutPageHeadline: introduces the man who will knock on the door: what he does with his tool or his hands in the first person, or one town from his area with his trade (prefer a neighbouring town over the hero's city). At most 7 words, no number, never a list of towns, a signature phrase, a "before" construction or a quality adjective.`,
      `- aboutPageBody: ${STORY_MIN_SENTENCES} or 4 sentences: one scene in the second person and present tense of the problem itself, set at a different moment from ${story ? 'storyBody' : 'the hero'}; then what the owner physically does when he arrives, naming the tool or method of his usp; then something the reader can check after he leaves. Never open it with a self-introduction by name.`,
      `- ${M2B_PROMPT_RULES_AFTER_M2B2.find(rule => rule.id === 'B3')?.text ?? 'B3: use one entry of servicesHeadlineOptions, word for word.'}`,
      `- serviceDetails: at most one card per service, each name exactly one of ${JSON.stringify(site?.serviceLabels ?? [])}, character for character. Each description is one full first-person sentence of 8 to 14 words (at least ${SERVICE_DESCRIPTION_MIN_CHARS} characters): present-tense verbs in the order he works, one physical detail that belongs only to that service, ending on a result the homeowner can check. Never the differentiator, a fact the system shows, a price or a "before" construction, and no two cards start with the same three words.`,
    ] : []),
    ...(brief.page.pageClass === 'homepage' ? ['- The usp\'s mechanism \u2014 the specific how, not just its outcome \u2014 appears in heroHeadline or heroSubheadline, unless the code-built trust bar already shows it.'] : []),
    `- formHeadline: ${formHeadlineChoice(brief, data)}`,
    '- ORDER AND LOGISTICS (binding): who comes, when, how and with what is stated the same way in every field. heroHeadline and heroSubheadline may claim an order of the work (something done before something else) only when the owner\'s usp states that order, and every other field keeps it.',
  ];
  out.push({ heading: 'FIELD JOBS', rules: fields });
  out.push({ heading: 'REPETITION', rules: [
    `- REPETITION BUDGET (binding): each idea gets one full statement on the page, plus at most one short reference (three words or fewer) in one other field. Never the same run of ${CLAUSE_REPEAT_MIN_WORDS} or more words in two fields, not even inside a longer sentence.`,
    '- The system drops what adds nothing new: a card description, process step or answer whose words are already on the page is removed, and so is a sentence of the story or the about body that repeats another field. Every item must add a new step, detail or outcome.',
  ] });
  out.push({ heading: 'VOICE', rules: [
    voiceRuleV2('P3'),
    HEBREW_PATTERN_RULES[1],
    voiceRuleV2('P5'),
    p6WithoutSticky(),
    m2a6Rule('R2'),
    m2a6Rule('R6'),
    `- ${M2B2_PROMPT_RULES.find(rule => rule.id === 'C1')?.text ?? ''}`,
    `- NATIVE HEBREW (binding): a "shouldn't" or "doesn't have to" construction takes its idiomatic Hebrew form and carries its verb; use the fixed verb and noun pairs a native speaker uses, never a literal translation from English; after a verb, use the adverb form; write the "all / everything" family in standard full spelling; every transitive verb has its object and its correct preposition, and every relative clause its verb; abbreviations and quotes take the Hebrew geresh and gershayim. ${REDUPLICATION_RULE}`,
  ] });
  return out;
}

/** v2 formHeadline line: this page's stage CTA set (the v1 set, filtered by the same fact gates; no sticky-bar mention). */
function formHeadlineChoice(brief: PageBrief, data: CollectedData): string {
  const stage = pageStage(brief);
  const gates = briefGateContext(brief, data);
  const responseTime = typeof data.responseTime === 'string' && data.responseTime.trim().length > 0;
  const passes = (line: string) => runCopyGates({ formHeadline: line }, gates).length === 0 && (responseTime || !ARRIVAL_TOKENS.some(token => line.includes(token)));
  const set = CTA_LABEL_SETS[stage];
  // Rerun-3 item 3: the example patterns (other trades' phrases) are not printed; the label set and the fallback are a choice.
  return `this page's stage is ${stage}; choose from these labels: ${JSON.stringify(set.formHeadline.labels.filter(passes))}, or write a short invitation in the same shape about this service. Only when nothing more specific fits: ${JSON.stringify(passes(CTA_LABEL_SETS.formHeadlineFallback) ? CTA_LABEL_SETS.formHeadlineFallback : '')}.`;
}

/** Copy v2: the number of binding rules of a page's v2 prompt (lists, the toolkit and the depth section excluded). */
export function promptV2RuleCount(brief: PageBrief, data: CollectedData = {}): number {
  return buildResearchCopyRulesV2(brief, data).reduce((total, section) => total + section.rules.length, 0);
}

/** v2 lists the rules name (data-file lists, moved byte-exact; no sticky-bar or trust-bar lists). */
function v2ListLines(brief: PageBrief, data: CollectedData): string[] {
  void data;
  // Rerun-3 item 3: no gate token list (generic adjectives and their exemptions, bad idioms and their replacements, signature
  // phrases and the differentiator cap line, trade terms, legacy cadence words). Only the closed set the model picks from.
  return rendersSiteSections(brief.page.pageClass) ? [`- servicesHeadlineOptions: ${JSON.stringify(SERVICES_HEADLINE_OPTIONS)}`] : [];
}

/** v2 owner facts: the narrative answers only (the code-built facts are listed in ALREADY ON THE PAGE), labelled in English. */
export const V2_OWNER_FACT_KEYS: ReadonlyArray<readonly [keyof CollectedData, string]> = [
  ['businessName', 'Business name'], ['ownerName', 'Owner name'], ['businessNiche', 'Trade'], ['primaryService', 'Primary service'],
  ['secondaryServices', 'Other services'], ['targetLocation', 'Base city'], ['specificCities', 'Service area'], ['serviceModel', 'Service model'],
  ['idealClient', 'Ideal client'], ['idealClientFear', 'Ideal client fear'], ['usp', 'USP'], ['exclusions', 'Exclusions'], ['urgencyLevel', 'Urgency'],
];

function v2OwnerFactLines(data: CollectedData): string[] {
  return V2_OWNER_FACT_KEYS.flatMap(([key, label]) => {
    const value = data[key];
    return typeof value === 'string' && value.trim() ? [`- ${label}: ${value.trim()}`] : [];
  });
}

/** v2 OUTPUT skeleton, built from the page's key list (system values filled in). */
export function v2OutputSkeleton(brief: PageBrief, data: CollectedData): string {
  const omit = ungeneratedFieldsFor(brief);
  const layout = layoutFor(brief);
  const quote = effectiveReviewQuote(data);
  const review = quote && quote.length <= SITE_COPY_OPTIONAL_STRING_LIMITS.reviewFeatured ? quote : null;
  const labels = brief.site?.serviceLabels ?? [];
  const value = (key: string): unknown => {
    switch (key) {
      case 'heroCta': return researchHeroCta(brief, data);
      case 'reviewFeatured': return review;
      case 'reviewContext': return review && data.starRating ? '' : null;
      case 'scarcityLine': return null;
      case 'guaranteeBlock': case 'responseTimeBadge': return null;
      case 'serviceItems': return labels.filter(label => label.length <= SITE_COPY_STRING_LIST_LIMITS.serviceItems.itemMaxChars).slice(0, SITE_COPY_STRING_LIST_LIMITS.serviceItems.maxItems);
      case 'faqItems': return [];
      case 'trustBarItems': return [];
      case 'serviceDetails': return labels.slice(0, SITE_COPY_PAIR_LIST_LIMITS.serviceDetails.maxItems).map(name => ({ name, description: '' }));
      case 'storyHeadline': case 'storyBody': case 'pitch': return '';
      default: return '';
    }
  };
  const keys = [...(layout.pitch ? ['pitch'] : []), ...SITE_COPY_KEYS.filter(key => !omit.includes(key)), ...(layout.story ? STORY_FIELDS_M2B1H : [])];
  return JSON.stringify(Object.fromEntries(keys.map(key => [key, value(key)])), null, 2);
}

/** Copy v2: the whole Tamar prompt of a page whose facts are code-built (resolvePromptVersion === 'v2'). */
export function buildResearchPageGenerationPromptV2(brief: PageBrief, data: CollectedData): string {
  if (!codeOwnsFacts(brief)) throw new Error('copy v2 prompt needs code-owned facts (fact templates pending)');
  const hidden = modelHiddenProofIds(brief, data);
  const sections = buildResearchCopyRulesV2(brief, data);
  const brief2 = {
    page: brief.page,
    persona: brief.persona,
    entities: brief.approvedEntityAnchors,
    queries: brief.targetQueries,
    allowedFacts: {
      firstPartyProof: hidden.length ? brief.firstPartyProof.filter(item => !hidden.includes(item.id)) : brief.firstPartyProof,
      localFacts: brief.assertableLocalFacts,
      customerDecisions: brief.customerDecisions,
      constraints: brief.constraints,
      ...(depthPage(brief) && brief.serviceFacts?.length ? { serviceFacts: brief.serviceFacts } : {}),
    },
    ...(depthPage(brief) ? {
      offer: brief.waoOffer,
      lengthBand: brief.lengthBand,
      blocksEnabled: brief.blocksEnabled ? { ...brief.blocksEnabled, proof: false } : brief.blocksEnabled,
      // Copy v2 slice 6: questions on a code-owned fact never reach the model (code-built or dropped).
      ...(brief.blocksEnabled?.qa ? { questionPool: codeOwnedQa(brief, data)?.plan.modelPool ?? brief.questionPool ?? [] } : {}),
      suggestedTerms: brief.suggestedTerms ?? [],
    } : {}),
    informationGainGaps: brief.informationGainGaps,
    prohibitedClaims: brief.prohibitedClaims,
    links: brief.links,
  };
  const ruleText = sections.map(section => `${section.heading}:\n${section.rules.join('\n')}`).join('\n\n');
  return `RESEARCH BRIEF (authoritative; use no claim not supported here; generate only the page identified by page.id and page.targetPath, and link only to links):
${JSON.stringify(brief2)}

COPY RULES (binding):
${ruleText}
${pitchFirstPage(brief) ? `\nDIRECT-RESPONSE TOOLKIT:\n${DIRECT_RESPONSE_TOOLKIT.join('\n')}\n` : ''}${depthPage(brief) ? `\n${buildDepthSection(brief, data)}\n` : ''}
LISTS NAMED IN THE RULES:
${v2ListLines(brief, data).join('\n')}

OWNER FACTS (context; the binding rules above decide what you may use):
${v2OwnerFactLines(data).join('\n')}

OUTPUT (JSON only, no markdown; the system values are filled in):
${v2OutputSkeleton(brief, data)}

${replaceOnce(buildSiteCopyHardLimitsBlock('HARD LIMITS', ungeneratedFieldsFor(brief), layoutFor(brief)), V1_FAQ_LIMIT_LINE, V2_FAQ_LIMIT_LINE, 'faqItems hard-limit line')}`;
}

/**
 * Copy v2 slice 6 (+ Yonatan's amendment): the Q&A lines of a code-owned service page. The model answers only the pool it is
 * given; the system adds the code-built items, keeps the pool wording as q and puts the lead in front of every answer.
 */
export function codeOwnedQaRules(brief: PageBrief, data: CollectedData): string[] {
  const qa = codeOwnedQa(brief, data);
  const limits = DEPTH_BLOCK_LIMITS;
  const built = qa?.plan.codeItems.length ?? 0;
  const room = Math.max(0, limits.qa.maxItems - built);
  const need = Math.max(0, limits.qa.minItems - built);
  return [
    `- qaItems (B4): at most ${room} questions from questionPool that the owner's facts answer${built ? ` (the system adds ${built} more itself, on the facts it shows)` : ''}. Each item: "questionId" (the id of the question in questionPool), "q" (that question exactly as written in questionPool; the system keeps the pool wording), "a" (the answer, in the owner's first person, at most ${limits.qa.maxAnswerWords} words) and "factIds".`,
    '- Answer the question directly in the first sentence: yes or no, or the fact itself. Write each answer self-contained: never a pointer such as "as above", "see below" or "as I said".',
    `- Never name the business in an answer: the system puts ${JSON.stringify(qa?.lead ?? '')} in front of every answer. Answer only from the owner facts: skip every question his facts do not answer, and never guess.${need ? ` If fewer than ${need} questions can be answered, output null for qaItems and qaHeadline.` : ' If none can be answered, output an empty list for qaItems.'}`,
    `- qaHeadline: the heading of the questions, at most ${limits.headlineMaxChars} characters, or null.`,
  ];
}

/** v2 has no faqPolicy rule (faqItems are system-filled), so the hard-limits faq line says so. */
export const V1_FAQ_LIMIT_LINE = '- faqItems: follow the faqPolicy rule in the research rules above.';
export const V2_FAQ_LIMIT_LINE = '- faqItems: filled in by the system; output it exactly as given in the schema.';

/** M2b.1h: the legacy schema's hero shape line; on a pitch-first page the headline carries the promise instead. */
export const LEGACY_HERO_SHAPE_LINE = "- heroHeadline: open with the client's fear/problem, close with the relief. Max 68 chars.";
export const PITCH_FIRST_HERO_LINE = '- heroHeadline: carries the one big promise, in no fixed shape (see PITCH FIRST). Max 68 chars.';

/** One asserted replacement in the schema template (exactly one occurrence, else the M2b.1h cut is stale). */
function replaceOnce(text: string, from: string, to: string, what: string): string {
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + 1) >= 0) throw new Error(`Site copy schema prompt ${what} changed; update the M2b.1h schema cut.`);
  return `${text.slice(0, at)}${to}${text.slice(at + from.length)}`;
}

/** M2b.1h: the schema of a pitch-first page: "pitch" as the first output key, the story keys (homepage), the free hero line. */
export function pitchFirstSchema(schema: string, story: boolean): string {
  let out = replaceOnce(schema, LEGACY_HERO_SHAPE_LINE, PITCH_FIRST_HERO_LINE, 'hero shape line');
  out = replaceOnce(out, '{\n  "heroHeadline": "",', '{\n  "pitch": "",\n  "heroHeadline": "",', 'first output key');
  if (story) out = replaceOnce(out, '\n  "heroSubheadline": "",', '\n  "heroSubheadline": "",\n  "storyHeadline": "",\n  "storyBody": "",', 'heroSubheadline key');
  return out;
}

/** M2b.1h: which optional-presence fields a page generates (the hard-limits block and the output key list). */
export interface CopyLayout {
  pitch?: boolean;
  story?: boolean;
  /** Content depth: the depth blocks this page generates (empty / unset = none). */
  depth?: readonly DepthBlockId[];
  /** The owner-confirmed service labels (card names may equal a label longer than the fixed limit). */
  serviceLabels?: readonly string[];
}

export function layoutFor(brief: Pick<PageBrief, 'site' | 'page' | 'blocksEnabled'>): CopyLayout {
  const depth = depthLayout(brief);
  const labels = brief.site?.serviceLabels ?? [];
  return { pitch: pitchFirstPage(brief), story: storyPage(brief), ...(depth.length ? { depth } : {}), ...(longServiceLabelChars(labels) ? { serviceLabels: [...labels] } : {}) };
}

/**
 * Copy v2 slice 2: the schema's OUTPUT object without the `"key": <value>` line of each key (asserted: exactly one per key);
 * a trailing comma left before the closing brace is removed.
 */
function withoutSchemaLines(schema: string, keys: readonly string[]): string {
  let out = schema;
  for (const key of keys) {
    const pattern = new RegExp(`\\n  "${key}": [^\\n]*`, 'g');
    const hits = out.match(pattern) ?? [];
    if (hits.length !== 1) throw new Error(`Site copy schema prompt ${key} line changed; update the copy v2 schema cut.`);
    out = out.replace(pattern, '');
  }
  const close = out.lastIndexOf('\n}');
  return close > 0 && out[close - 1] === ',' ? `${out.slice(0, close - 1)}${out.slice(close)}` : out;
}

/** M2b.1d: the schema template without one `"key": "",` line (asserted: exactly one such line). */
function withoutSchemaKey(schema: string, key: string): string {
  const line = `\n  "${key}": "",`;
  const at = schema.indexOf(line);
  if (at < 0 || schema.indexOf(line, at + 1) >= 0) throw new Error(`Site copy schema prompt ${key} line changed; update the M2b.1d schema cut.`);
  return `${schema.slice(0, at)}${schema.slice(at + line.length)}`;
}

/** True when the brief's page is about an installation service (item 6). */
export function isInstallPage(brief: PageBrief): boolean {
  const site = brief.site;
  if (!site || brief.page.pageClass === 'homepage') return false;
  const index = site.serviceLabels.indexOf(site.pageName);
  return isInstallService(site.pageName, index >= 0 ? site.serviceSources?.[index] ?? '' : '');
}

/**
 * Rerun-3 items 4-5: the claim-scope specs of a page. Fear words exclude the trade, the business name, the service labels and
 * the places; the owner's usp and guarantee may negate a fear word themselves. The same-day gate is on only without a response
 * fact; a sentence naming a place of the owner's response place tail may keep the same-day words.
 */
export function claimScopeSpecs(brief: PageBrief, data: CollectedData, templates: OwnerFactTemplates): { fearPromise?: FearPromiseSpec; sameDayScope?: SameDayScopeSpec } {
  const site = brief.site;
  const places = gatePlaces(brief);
  const excluded = [data.businessNiche, data.businessName, site?.businessName, site?.pageName, ...(site?.serviceLabels ?? []), ...places].filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  const fear = buildFearPromiseSpec(data.idealClientFear, templates.parseNegationWords, excluded, [data.usp, data.guarantee]);
  const scope = responseScope(data.responseTime, templates);
  const sameDay = buildSameDayScopeSpec(Boolean(ownerFacts(data, brief, templates).response), templates.parseSameDayWords, scope.kind === 'scoped' ? scope.scope : null, places);
  return { ...(fear ? { fearPromise: fear } : {}), ...(sameDay ? { sameDayScope: sameDay } : {}) };
}

/** The gate context for one brief (M2a.3: service scope, page service, installation page). */
export function briefGateContext(brief: PageBrief, data: CollectedData): CopyGateContext {
  const site = brief.site;
  return copyGateContext(data, site?.serviceLabels ?? [], site?.soloOperator ?? true, gatePlaces(brief), {
    serviceSources: site?.serviceSources ?? [],
    pageServiceLabel: site && brief.page.pageClass !== 'homepage' ? site.pageName : null,
    installPage: isInstallPage(brief),
    researchSite: Boolean(site),
    // M2a.6: vertical slug (section 20.4 / 20.6) and Yonatan's H1 anchor (the same strings as page.seo, which build the title).
    pageSlug: site ? stageSlug(brief) : '',
    anchorName: site ? site.pageName : null,
    anchorCity: site ? site.city : null,
    // M2a.7: hits outside the rendered fields are warnings (research sites only). M2b.1: rendered fields still held
    // warn-only for the next voice round (RESEARCHED_RENDERED_WARN_ONLY_FIELDS) are excluded too. M2b.1b: per page type
    // (about / service cards render on the homepage and service hub only).
    ...(site ? { renderedFields: researchedGatedFieldsFor(brief.page.pageClass) } : {}),
    // M2b.1d: the fields this page does not generate are never gated.
    ...(site ? { ungeneratedFields: [...ungeneratedFieldsFor(brief)] } : {}),
    // Copy v2 slice 2: the code-built fields never carry a gate hit (set only while the fact templates are complete).
    ...(site && codeOwnsFacts(brief) ? { codeOwnedFields: [...CODE_OWNED_FACT_FIELDS] } : {}),
    // Copy v2 slice 4: the code-owned facts no model field may restate (gate_fact_restatement).
    ...(site && codeOwnsFacts(brief) ? { factRestatement: factRestatementSpec(brief, data, codeOwnedFactTemplates() as OwnerFactTemplates) } : {}),
    // Rerun-3 items 4-5: fear-into-promise and same-day-without-scope (code-owned facts only).
    ...(site && codeOwnsFacts(brief) ? claimScopeSpecs(brief, data, codeOwnedFactTemplates() as OwnerFactTemplates) : {}),
    // M2b.1h: pitch-first pages may restate the promise in fresh words; every research page blocks verbatim repeats.
    ...(site ? { promiseRestatement: pitchFirstPage(brief), phraseRepeatFields: researchedRenderedFieldsFor(brief.page.pageClass) } : {}),
    // Copy v2 slice 6: the code-built Q&A items and every pool question are code-owned; the lead is not the model's.
    ...(() => {
      const qa = codeOwnedQa(brief, data);
      return qa ? { qaCodeOwnership: { codeItems: qa.plan.codeItems.length }, qaAnswerLead: qa.lead } : {};
    })(),
    // Content depth: the fact-trace and term-density inputs of a service page with depth blocks.
    ...(depthPage(brief) ? { depth: {
      factTexts: Object.fromEntries(briefFactTexts(brief)),
      questionIds: (brief.questionPool ?? []).map(item => item.id),
      terms: brief.suggestedTerms ?? [],
    } } : {}),
  });
}

/** M2a.7: this page's hero-cap facts for the later pages of the site (own label, homepage: every serviceItems label; AC vertical). */
export function heroCapFacts(brief: PageBrief, copy: Pick<SiteCopy, 'serviceItems'>): HeroCapPageFacts {
  const site = brief.site;
  const home = brief.page.pageClass === 'homepage';
  return {
    maskLabels: home ? [...(copy.serviceItems ?? site?.serviceLabels ?? [])] : site ? [site.pageName] : [],
    acPage: slugVertical(stageSlug(brief)) === 'ac',
  };
}

/** Owner-stated places for the place gates: base city first, then the service area. */
export function gatePlaces(brief: PageBrief): string[] {
  const site = brief.site;
  return site ? [...new Set([...(site.city ? [site.city] : []), ...site.serviceArea])] : [];
}

export function buildNoaQaMessage(copy: SiteCopy, brief?: PageBrief): string {
  const fixed = brief?.site
    ? '\n\nSYSTEM FIELDS (never change them): heroCta, serviceItems, reviewFeatured, faqItems, and every serviceDetails[].name.'
    : '';
  // M2b.1d: the fields this page does not generate never reach Noa (withSystemFields fills them again).
  const omit = brief ? ungeneratedFieldsFor(brief) : [];
  // M2b.1h: Noa never sees the pitch (it is not shown; the system carries Tamar's over); the story fields are hers to correct.
  const hidden = [...omit, 'pitch'];
  const shown = Object.keys(copy).some(key => hidden.includes(key)) ? Object.fromEntries(Object.entries(copy).filter(([key]) => !hidden.includes(key))) : copy;
  const labels = brief?.site?.serviceLabels ?? [];
  const layout: CopyLayout = brief ? { story: storyPage(brief), depth: depthLayout(brief), ...(longServiceLabelChars(labels) ? { serviceLabels: [...labels] } : {}) } : {};
  const depthNote = layout.depth?.length ? `\n\n${DEPTH_NOA_NOTE}` : '';
  return `${JSON.stringify(shown)}\n\n${buildSiteCopyHardLimitsBlock('HARD LIMITS FOR YOUR CORRECTIONS (never lengthen a field past its limit)', omit, layout)}${fixed}${depthNote}`;
}

export async function generateResearchPageCopy(
  brief: PageBrief,
  data: CollectedData,
  dependencies: ResearchPageCopyDependencies = {},
): Promise<SiteCopy> {
  const callJson = dependencies.callJson ?? callQwenJSON;
  const requested = dependencies.maxRepairs ?? MAX_COPY_REPAIRS;
  const version = resolvePromptVersion(brief, dependencies.promptVersion);
  const ctx: RepairContext = {
    callJson,
    brief,
    data,
    remaining: Number.isInteger(requested) ? Math.max(0, Math.min(MAX_COPY_REPAIRS, requested)) : MAX_COPY_REPAIRS,
    used: 0,
    deterministicFixes: dependencies.deterministicFixes ?? true,
    gates: dependencies.gates === false ? null : {
      ...briefGateContext(brief, data),
      priorHeroHeadlines: [...(dependencies.priorHeroHeadlines ?? [])],
      priorAboutPageHeadlines: [...(dependencies.priorAboutPageHeadlines ?? [])],
      priorAboutPageBodies: [...(dependencies.priorAboutPageBodies ?? [])],
      ...(dependencies.priorHeroFacts ? { priorHeroFacts: [...dependencies.priorHeroFacts] } : {}),
    },
    emit: event => {
      try { dependencies.onEvent?.(event); } catch { /* diagnostics never break generation */ }
    },
    promptVersion: version,
    ...(dependencies.priorMechanismKeys?.length ? { priorMechanismKeys: [...dependencies.priorMechanismKeys] } : {}),
  };
  const prompt = version === 'v2' ? buildResearchPageGenerationPromptV2(brief, data) : buildResearchPageGenerationPrompt(brief, data, dependencies.siteTerms);
  const tamarSystem = !brief.site ? COPY_SYSTEM_PROMPT : version === 'v2' ? SITE_COPY_SYSTEM_PROMPT_V2 : SITE_COPY_SYSTEM_PROMPT;
  const tamarCopy = await settleStage(ctx, 'tamar', () => callJson(tamarSystem, prompt, { thinkingBudget: pitchFirstPage(brief) ? PITCH_FIRST_THINKING_BUDGET : 1500 }));
  // Content depth: Tamar's factIds / questionId go back into Noa's raw answer before it is settled (Noa edits text only).
  const noaCall = async () => withTamarDepthReferences(await callJson(brief.site && version === 'v2' ? QA_SYSTEM_PROMPT_V2 : QA_SYSTEM_PROMPT, buildNoaQaMessage(tamarCopy, brief), { think: false }), tamarCopy as unknown as Loose, brief);
  const noaCopy = await settleStage(ctx, 'noa', noaCall);
  // Copy v2 slice 7: the warn-only promise-contradiction judge (off by default; never repaired).
  const contradictions = await promiseContradictionWarnings(noaCopy as unknown as Loose, callJson, dependencies.promiseJudge ?? PROMISE_JUDGE_ENABLED);
  if (contradictions.length) ctx.emit({ stage: 'noa', kind: 'warnings', violations: contradictions });
  const finalCopy = withSystemFields(carryOptionalFields(applyFaqPolicy(noaCopy, brief) as unknown as Loose, tamarCopy as unknown as Loose), brief, data) as unknown as SiteCopy;
  const finalFixes = applyDeterministicDrops(finalCopy as unknown as Loose, brief, data, ctx.gates, ctx.priorMechanismKeys);
  if (finalFixes.length) ctx.emit({ stage: 'final', kind: 'deterministic_fix', fixes: finalFixes });
  assertCopyAt('final', finalCopy, shapeOptions(brief));
  assertGatesAt('final', finalCopy as unknown as Loose, ctx.gates, ctx.emit);
  // Copy v2 slice 6: the answer lead goes in after the final gates (it names the business; the gates read the model's words).
  const leadFixes = withQaAnswerLeads(finalCopy as unknown as Loose, brief, data);
  if (leadFixes.length) ctx.emit({ stage: 'final', kind: 'deterministic_fix', fixes: leadFixes });
  assertCopyAt('final', finalCopy, shapeOptions(brief));
  const gap = depthLengthNote(finalCopy as unknown as Loose, brief);
  if (gap) ctx.emit({ stage: 'final', kind: 'warnings', violations: [gap] });
  // 2026-11-10 (reviewQuote bug): an owner quote the site cannot show is logged, never silently dropped.
  const dropped = brief.site ? reviewQuoteDropReason(data, SITE_COPY_OPTIONAL_STRING_LIMITS.reviewFeatured) : null;
  if (dropped) ctx.emit({ stage: 'final', kind: 'warnings', violations: [{ field: 'reviewFeatured', rule: `review_dropped_${dropped}` }] });
  return finalCopy;
}

/** Content depth: Noa's raw JSON with Tamar's depth references merged back (unparseable or non-depth answers pass unchanged). */
export function withTamarDepthReferences(raw: string, tamar: Loose, brief: PageBrief): string {
  if (!depthPage(brief) || typeof raw !== 'string') return raw;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!plainObject(parsed)) return raw;
    return JSON.stringify(mergeDepthBlocks(parsed, tamar));
  } catch {
    return raw;
  }
}

/**
 * Content depth: the page-length note of a service page with depth blocks (never pads, never fails): `fact_gap` under the
 * band's floor (a monthly owner question later), `below_target` between the floor and the target. Counts only.
 */
export function depthLengthNote(copy: Loose, brief: PageBrief): CopyViolation | null {
  if (!depthPage(brief) || !brief.lengthBand) return null;
  const words = pageVisibleWords(copy, { phraseRepeatFields: researchedRenderedFieldsFor(brief.page.pageClass) });
  if (words < brief.lengthBand.floor) return { field: '$page', rule: 'fact_gap', limit: brief.lengthBand.floor, actual: words };
  if (words < brief.lengthBand.target) return { field: '$page', rule: 'below_target', limit: brief.lengthBand.target, actual: words };
  return null;
}

/**
 * M2b.1h: the pitch is Tamar's (Noa never sees it), and a story key Noa's output lacks comes back from Tamar's settled copy
 * (an explicit null from Noa stays null).
 */
export function carryOptionalFields(noa: Loose, tamar: Loose): Loose {
  // Content depth: Noa's text corrections, Tamar's factIds / questionId (and any block key Noa dropped).
  const next: Loose = mergeDepthBlocks(noa, tamar);
  if ('pitch' in tamar) next.pitch = tamar.pitch;
  for (const key of STORY_FIELDS_M2B1H) if (!(key in next) && key in tamar) next[key] = tamar[key];
  return next;
}

export function isApprovedPortfolioBrief(dossier: SiteResearchDossier, brief: PageBrief): boolean {
  return dossier.status === 'copy_ready'
    && dossier.pageOpportunities.some(page => (
      page.id === brief.page.id
      && page.targetPath === brief.page.targetPath
      && page.status === 'ready'
    ));
}
