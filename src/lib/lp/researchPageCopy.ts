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
import { PLURAL_ADDRESS_TOKENS, SERVICE_DESCRIPTION_MIN_CHARS, WE_FORM_TOKENS } from './copyGates.config';
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
  DIFFERENTIATOR_SIGNATURE_CAP,
  differentiatorGroups,
  describeGateViolation,
  effectiveReviewQuote,
  fixTimeScope,
  GATE_RULES,
  isAreaTile,
  PHRASE_REPEAT_MAX_FIELDS,
  PHRASE_REPEAT_MIN_WORDS,
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

function stringPair(value: unknown, keys: readonly string[], limits: readonly number[]): boolean {
  if (!plainObject(value)) return false;
  if (Reflect.ownKeys(value).length !== keys.length) return false;
  for (let index = 0; index < keys.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, keys[index]);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor) || !boundedString(descriptor.value, limits[index])) return false;
  }
  return Reflect.ownKeys(value).every(key => typeof key === 'string' && keys.includes(key));
}

/** M2b.1d: an ungenerated required string field may be exactly empty. */
function allowedEmpty(key: string, value: unknown, options: SiteCopyShapeOptions): boolean {
  return value === '' && (options.ungenerated ?? []).includes(key);
}

export function assertBoundedGeneratedSiteCopy(value: unknown, options: SiteCopyShapeOptions = {}): asserts value is SiteCopy {
  if (!plainObject(value)) invalidCopy();
  exactFields(value, SITE_COPY_KEYS, OPTIONAL_PRESENCE_KEYS);
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
      return !boundedArray(value[key], limit.maxItems, item => stringPair(item, limit.keys, limit.maxChars));
    })) invalidCopy();
  try {
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > SITE_COPY_MAX_BYTES) invalidCopy();
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

function pairViolations(field: string, entry: unknown, keys: readonly string[], limits: readonly number[]): CopyViolation[] {
  if (!plainObject(entry)) return [{ field, rule: 'type', actual: entry === null ? 'null' : Array.isArray(entry) ? 'array' : typeof entry }];
  const out: CopyViolation[] = [];
  for (const key of Object.keys(entry)) if (!keys.includes(key)) out.push({ field: `${field}.${key}`, rule: 'unexpected' });
  keys.forEach((key, index) => {
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
  for (const key of own) if (!SITE_COPY_KEYS.includes(key) && !(OPTIONAL_PRESENCE_KEYS as string[]).includes(key)) out.push({ field: key, rule: 'unexpected' });
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
    out.push(...arrayViolations(key, value[key], limit.maxItems, (entry, index) => pairViolations(`${key}[${index}]`, entry, limit.keys, limit.maxChars)));
  }
  try {
    const bytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
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

export function buildResearchCopyRules(brief: PageBrief, data: CollectedData = {}): string[] {
  const site = brief.site;
  const rules = [
    SINGULAR_ADDRESS_RULE,
    '- Use each owner fact at most twice per page; rotate proof points across fields instead of repeating the same fact.',
    pitchFirstPage(brief) ? PITCH_FIRST_PROOF_POINT_RULE : PROOF_POINT_RULE,
    '- When a field must be shorter, cut a whole idea. Never shorten by dropping a verb\'s object or leaving a sentence grammatically incomplete.',
    '- Owner facts may arrive translated or in English. Render their meaning in native, idiomatic Hebrew; never mirror an English idiom or English word order, and never copy English wording into the copy (proper names excepted).',
    '- The customer quote may appear only in reviewFeatured, which the system fills in verbatim. Never quote, paraphrase or echo it in any other field.',
    '- heroCta is fixed by the system: output it exactly as given in the schema.',
    '- reviewFeatured is filled in by the system: output it exactly as given in the schema. reviewContext: only when the data supplies a star rating, otherwise null.',
    '- responseTimeBadge: when the owner gave a response time, write a short native Hebrew badge from it; otherwise null.',
    '- LICENSE (binding): if the owner\'s license wording is in Hebrew, name it exactly in that wording, with one consistent term on every page. If it is not in Hebrew (it arrived translated), say only that he is licensed: never translate or map it to a license grade, level or title (for example "master"), never add a grade the owner did not state in Hebrew.',
    '- HOURS (binding): never write business days or hours in any field: no day names, no day letters, no clock times. The system shows the owner\'s hours.',
    '- guaranteeBlock: when the schema gives it as null (the owner has no guarantee), output null. Never write a filler promise in its place.',
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
  }
  return rules;
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
    ...[trustTileRule(brief)].filter((line): line is string => Boolean(line)),
    'Lists named in the voice rules:',
    ...voiceListLines({ stickyArrival: responseTime, differentiatorGroups: differentiatorGroups(gates) }),
    `- trustBarFillerPhrases: ${JSON.stringify(TRUST_BAR_FILLER_PHRASES)}`,
    ...(m2bRulesFor(brief).some(rule => rule.id === 'B3') ? [`- servicesHeadlineOptions: ${JSON.stringify(SERVICES_HEADLINE_OPTIONS)}`] : []),
    tradeTermLine(slugVertical(stageSlug(brief)) === 'ac'),
    `- This page's stage (section 19.4 above): ${stage}. heroCta is fixed by the system (on this page: ${JSON.stringify(researchHeroCta(brief, data))}; the stickyBarLine must differ from it); choose formHeadline from these ctaLabelSets entries for this stage. Labels: ${JSON.stringify(set.formHeadline.labels.filter(passes))}. Patterns (use one as a pattern, adapted to this service): ${JSON.stringify(set.formHeadline.examples.filter(passes))}. formHeadlineFallback, only when nothing more specific fits: ${JSON.stringify(passes(CTA_LABEL_SETS.formHeadlineFallback) ? CTA_LABEL_SETS.formHeadlineFallback : '')}.`,
  ];
}

export function buildResearchPageCopyPrompt(brief: PageBrief, data: CollectedData = {}): string {
  return `RESEARCH BRIEF (authoritative; use no claim not supported here):
${JSON.stringify({
  page: brief.page,
  persona: brief.persona,
  entities: brief.approvedEntityAnchors,
  queries: brief.targetQueries,
  allowedFacts: {
    firstPartyProof: brief.firstPartyProof,
    localFacts: brief.assertableLocalFacts,
    customerDecisions: brief.customerDecisions,
    constraints: brief.constraints,
  },
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
${buildResearchCopyRules(brief, data).join('\n')}
${pitchFirstPage(brief) ? `\n${buildPitchFirstSection(brief)}\n` : ''}
The following owner-fact prompt provides the required SiteCopy JSON schema. Treat its owner facts as context only; use a fact in output only when the research brief authorizes it. Its HARD RULES, BANNED PHRASES, address and voice rules are NOT context: they are binding, together with the COPY RULES above.`;
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
  const keys = [...(layout.pitch ? ['pitch'] : []), ...SITE_COPY_KEYS.filter(keep), ...(layout.story ? STORY_FIELDS_M2B1H : [])];
  const lines: string[] = [
    `${heading} (validator-enforced; output that breaks any of these is rejected. They override every softer length or count guidance above):`,
    '- Length means the number of characters in the string, counting every letter, space, digit and punctuation mark. Aim for at most 85% of each limit to leave a margin.',
    '- Required non-empty strings (every one must be present and non-empty, including faqHeadline when faqItems is empty):',
    ...Object.entries(SITE_COPY_STRING_LIMITS).filter(([key]) => keep(key)).map(([key, max]) => `  - ${key}: max ${max} characters`),
    '- Optional fields (a string, or null):',
    ...Object.entries(SITE_COPY_OPTIONAL_STRING_LIMITS).map(([key, max]) => `  - ${key}: max ${max} characters when set`),
    ...(layout.story ? STORY_FIELDS_M2B1H.map(key => `  - ${key}: max ${presence[key]} characters when set`) : []),
    ...(layout.pitch ? [`- pitch (string): ${PITCH_MIN_WORDS} to ${PITCH_MAX_WORDS} words, max ${presence.pitch} characters. It is the only limit on the pitch.`] : []),
    '- Lists:',
    ...STRING_LIST_KEYS.filter(keep).map(key => {
      const limit = SITE_COPY_STRING_LIST_LIMITS[key];
      return `  - ${key}: at most ${limit.maxItems} strings; each string max ${limit.itemMaxChars} characters`;
    }),
    ...PAIR_LIST_KEYS.filter(keep).map(key => {
      const limit = SITE_COPY_PAIR_LIST_LIMITS[key];
      const parts = limit.keys.map((name, index) => `"${name}" max ${limit.maxChars[index]} characters`).join(', ');
      return `  - ${key}: at most ${limit.maxItems} objects with exactly the keys ${limit.keys.map(name => `"${name}"`).join(' and ')}; ${parts}`;
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
    const known = SITE_COPY_KEYS.includes(field) || (OPTIONAL_PRESENCE_KEYS as string[]).includes(field);
    if (systemFields.includes(field) || !known || (SITE_COPY_ALWAYS_NULL as readonly string[]).includes(field)) continue;
    if (violation.rule === 'unexpected' && !violation.field.includes('.')) continue;
    fields.add(field);
  }
  return [...SITE_COPY_KEYS, ...OPTIONAL_PRESENCE_KEYS].filter(key => fields.has(key));
}

function structural(violations: CopyViolation[]): boolean {
  return violations.some(violation => violation.field === '$');
}

function describeLimit(field: string): string {
  if (field in SITE_COPY_STRING_LIMITS) return `non-empty string, max ${SITE_COPY_STRING_LIMITS[field as keyof typeof SITE_COPY_STRING_LIMITS]} characters`;
  if (field in SITE_COPY_OPTIONAL_STRING_LIMITS) return `string or null, max ${SITE_COPY_OPTIONAL_STRING_LIMITS[field as keyof typeof SITE_COPY_OPTIONAL_STRING_LIMITS]} characters when set`;
  if (field === 'pitch') return `string or null: the free sales letter, ${PITCH_MIN_WORDS} to ${PITCH_MAX_WORDS} words, max ${SITE_COPY_OPTIONAL_PRESENCE_LIMITS.pitch} characters`;
  if (field in SITE_COPY_OPTIONAL_PRESENCE_LIMITS) return `string or null, max ${SITE_COPY_OPTIONAL_PRESENCE_LIMITS[field as OptionalPresenceKey]} characters when set`;
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

function parseLoose(raw: unknown): { value?: Loose; violations: CopyViolation[] } {
  if (typeof raw !== 'string') return { violations: [{ field: '$', rule: 'type', actual: typeof raw }] };
  const bytes = Buffer.byteLength(raw, 'utf8');
  if (bytes > SITE_COPY_MAX_BYTES) return { violations: [{ field: '$', rule: 'max_bytes', limit: SITE_COPY_MAX_BYTES, actual: bytes }] };
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
    if (!SITE_COPY_KEYS.includes(key) && !(OPTIONAL_PRESENCE_KEYS as string[]).includes(key)) {
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
  // M2a.5 (Adam): when one trustBarItems entry is the page's only gate hit and at least
  // TRUST_BAR_MIN_KEPT other items remain, drop that whole item (never edited) instead of failing.
  if (gates && Array.isArray(next.trustBarItems)) {
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
  return brief.site ? researchedUngeneratedFieldsFor(brief.page.pageClass) : [];
}

/** M2b.1d: the bounded-validator shape options of a brief's page. */
export function shapeOptions(brief: PageBrief): SiteCopyShapeOptions {
  const ungenerated = ungeneratedFieldsFor(brief);
  return ungenerated.length ? { ungenerated } : {};
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
  if (!brief.site) return next;
  // M2b.1h: the pitch (pitch-first pages) and the story fields (homepage) stay only where the page generates them, and only as
  // a non-empty string within the limit (else null: dropped whole, never edited; settleStage logs why). An absent key stays absent.
  for (const key of OPTIONAL_PRESENCE_KEYS) {
    if (!(key === 'pitch' ? pitchFirstPage(brief) : storyPage(brief))) { delete next[key]; continue; }
    if (!(key in next)) continue;
    const field = next[key];
    next[key] = typeof field === 'string' && field.trim() && field.length <= SITE_COPY_OPTIONAL_PRESENCE_LIMITS[key] ? field : null;
  }
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
  if (Array.isArray(next.trustBarItems)) next.trustBarItems = withAreaTile(next.trustBarItems, places);
  if (typeof next.responseTimeBadge === 'string') next.responseTimeBadge = withPlaceListPrefixes(next.responseTimeBadge, places);
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
  const raw = await ctx.callJson(ctx.brief.site ? SITE_REPAIR_SYSTEM_PROMPT : REPAIR_SYSTEM_PROMPT, buildCopyRepairPrompt(value, violations, fields, ctx.gates), { thinkingBudget: 1000 });
  const parsed = parseLoose(raw);
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
  const settle = (raw: Loose) => withSystemFields(raw, ctx.brief, ctx.data);
  // M2b.1h: the pitch / story shape notes of each fresh model response (warnings only; never repaired, never fail the page).
  const note = (raw: Loose | undefined) => {
    const warnings = raw ? optionalFieldWarnings(raw, ctx.brief, stage) : [];
    if (warnings.length) ctx.emit({ stage, kind: 'warnings', violations: warnings });
  };
  let parsed = parseLoose(await call());
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
      parsed = parseLoose(await call());
      note(parsed.value);
      value = parsed.value ? settle(parsed.value) : undefined;
      continue;
    }
    const fields = repairableFields(violations, systemFieldsFor(ctx));
    if (!fields.length) break;
    value = settle(await repairFields(ctx, stage, value, violations, fields));
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

export function buildResearchPageGenerationPrompt(brief: PageBrief, data: CollectedData): string {
  // M2a.2: a quote that is not mostly Hebrew never reaches the model (never translated, item 8),
  // and with no owner guarantee the schema shows guaranteeBlock as null (item 7).
  const promptData: CollectedData = brief.site && !effectiveReviewQuote(data) ? { ...data, reviewQuote: '' } : data;
  const schemaOptions = {
    blankResponseTimeBadge: true,
    ...(brief.site ? { relevanceTerm: brief.site.relevanceTerm, nullGuarantee: !ownerHasGuarantee(data) } : {}),
  };
  // M2b.1d: a page that does not render the about section and the service cards gets the LP schema (no about-page /
  // service-detail block or keys) without the servicesHeadline key; the system fills those fields.
  const omit = ungeneratedFieldsFor(brief);
  const schema = omit.length ? withoutSchemaKey(buildLpCopyPrompt(promptData, schemaOptions), 'servicesHeadline') : buildSiteCopyPrompt(promptData, schemaOptions);
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
  return `${buildResearchPageCopyPrompt(brief, data)}\n\nOWNER FACTS AND SITE COPY SCHEMA:\n${clientSchema}\n\n${buildSiteCopyHardLimitsBlock('HARD LIMITS', omit, layoutFor(brief))}`;
}

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
}

export function layoutFor(brief: Pick<PageBrief, 'site' | 'page'>): CopyLayout {
  return { pitch: pitchFirstPage(brief), story: storyPage(brief) };
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
    // M2b.1h: pitch-first pages may restate the promise in fresh words; every research page blocks verbatim repeats.
    ...(site ? { promiseRestatement: pitchFirstPage(brief), phraseRepeatFields: researchedRenderedFieldsFor(brief.page.pageClass) } : {}),
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
  const layout = brief ? { story: storyPage(brief) } : {};
  return `${JSON.stringify(shown)}\n\n${buildSiteCopyHardLimitsBlock('HARD LIMITS FOR YOUR CORRECTIONS (never lengthen a field past its limit)', omit, layout)}${fixed}`;
}

export async function generateResearchPageCopy(
  brief: PageBrief,
  data: CollectedData,
  dependencies: ResearchPageCopyDependencies = {},
): Promise<SiteCopy> {
  const callJson = dependencies.callJson ?? callQwenJSON;
  const requested = dependencies.maxRepairs ?? MAX_COPY_REPAIRS;
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
  };
  const prompt = buildResearchPageGenerationPrompt(brief, data);
  const tamarCopy = await settleStage(ctx, 'tamar', () => callJson(brief.site ? SITE_COPY_SYSTEM_PROMPT : COPY_SYSTEM_PROMPT, prompt, { thinkingBudget: pitchFirstPage(brief) ? PITCH_FIRST_THINKING_BUDGET : 1500 }));
  const noaCopy = await settleStage(ctx, 'noa', () => callJson(QA_SYSTEM_PROMPT, buildNoaQaMessage(tamarCopy, brief), { think: false }));
  const finalCopy = withSystemFields(carryOptionalFields(applyFaqPolicy(noaCopy, brief) as unknown as Loose, tamarCopy as unknown as Loose), brief, data) as unknown as SiteCopy;
  assertCopyAt('final', finalCopy, shapeOptions(brief));
  assertGatesAt('final', finalCopy as unknown as Loose, ctx.gates, ctx.emit);
  return finalCopy;
}

/**
 * M2b.1h: the pitch is Tamar's (Noa never sees it), and a story key Noa's output lacks comes back from Tamar's settled copy
 * (an explicit null from Noa stays null).
 */
export function carryOptionalFields(noa: Loose, tamar: Loose): Loose {
  const next: Loose = { ...noa };
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
