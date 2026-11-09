/**
 * Research-bound site copy generation.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from './lpCopyPrompt';
import { buildSiteCopyPrompt, primaryCtaLabel } from './lpCopyPrompt';
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
  PREPOSITION_PROMPT_LINE,
  STICKY_ACTION_TOKENS,
  TRADE_TERMS,
  TYPOGRAPHY_RULE_TEXT,
  VOICE_PROMPT_RULES,
} from './generationData';
import { pageNameWithCity, researchedGatedFieldsFor } from './researchedSite';
import {
  blockingGateHits,
  copyGateContext,
  DIFFERENTIATOR_SIGNATURE_CAP,
  differentiatorGroups,
  describeGateViolation,
  effectiveReviewQuote,
  fixTimeScope,
  GATE_RULES,
  isInstallService,
  promptSignatureVariants,
  runCopyGates,
  serviceStage,
  SIGNATURE_GROUPS,
  slugVertical,
  STICKY_ARRIVAL_TOKENS,
  warningGateHits,
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
  trustBarItems: { maxItems: 4, itemMaxChars: 20 },
  serviceItems: { maxItems: 6, itemMaxChars: 25 },
} as const;
/** Lists of two-key objects; maxChars is per key, in keys order. */
export const SITE_COPY_PAIR_LIST_LIMITS = {
  faqItems: { maxItems: 20, keys: ['q', 'a'], maxChars: [120, 120] },
  serviceDetails: { maxItems: 6, keys: ['name', 'description'], maxChars: [25, 80] },
} as const;
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

function invalidCopy(): never {
  throw new Error('Invalid bounded generated site copy.');
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactFields(value: Record<string, unknown>, keys: readonly string[]): void {
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some(key => typeof key !== 'string' || !keys.includes(key))) invalidCopy();
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

export function assertBoundedGeneratedSiteCopy(value: unknown): asserts value is SiteCopy {
  if (!plainObject(value)) invalidCopy();
  exactFields(value, SITE_COPY_KEYS);
  for (const [key, max] of Object.entries(COPY_FIELDS)) {
    if (!boundedString(value[key], max)) invalidCopy();
  }
  for (const [key, max] of Object.entries(OPTIONAL_FIELDS)) {
    if (value[key] !== null && !boundedString(value[key], max)) invalidCopy();
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
export function explainGeneratedSiteCopyViolations(value: unknown): CopyViolation[] {
  if (!plainObject(value)) return [{ field: '$', rule: 'not_object' }];
  const out: CopyViolation[] = [];
  const own = Object.keys(value);
  for (const key of SITE_COPY_KEYS) if (!own.includes(key)) out.push({ field: key, rule: 'missing' });
  for (const key of own) if (!SITE_COPY_KEYS.includes(key)) out.push({ field: key, rule: 'unexpected' });
  for (const [key, max] of Object.entries(COPY_FIELDS)) {
    if (!own.includes(key)) continue;
    const violation = stringViolation(key, value[key], max);
    if (violation) out.push(violation);
  }
  for (const [key, max] of Object.entries(OPTIONAL_FIELDS)) {
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

function assertCopyAt(stage: CopyValidationStage, value: unknown): asserts value is SiteCopy {
  try {
    assertBoundedGeneratedSiteCopy(value);
  } catch {
    const violations = explainGeneratedSiteCopyViolations(value);
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
export function buildResearchCopyRules(brief: PageBrief, data: CollectedData = {}): string[] {
  const site = brief.site;
  const rules = [
    SINGULAR_ADDRESS_RULE,
    '- Use each owner fact at most twice per page; rotate proof points across fields instead of repeating the same fact.',
    '- Every proof point you put in trustBarItems or guaranteeBlock (and every owner guarantee, pricing or USP point) may appear in at most two other fields of the page, in any wording; the system counts it. In serviceDetails descriptions, describe the service itself instead of repeating proof points.',
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
    rules.push(
      `- serviceDetails descriptions: one complete sentence of at least ${SERVICE_DESCRIPTION_MIN_CHARS} characters on what the service includes for the customer (within the length limit); never just the service name restated.`,
      `- serviceItems is filled in by the system. serviceDetails: at most one entry per service; every name must be exactly one of these owner-confirmed service names, character for character: ${JSON.stringify(site.serviceLabels)}. Never add any other service.`,
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
  return `- ${subject}${city ? ` in ${city}` : ''}. heroHeadline MUST contain ${home ? 'the trade ' : ''}${name} exactly${city ? ` and ${city} exactly` : ''}. Open with the customer's pain as a short first clause if you want, then put the anchor in the next clause: '<hook>? ${pageNameWithCity(site.pageName, site.city)} \u2014 <differentiator>'.`;
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
export function buildVoiceRules(brief: PageBrief, data: CollectedData = {}): string[] {
  const stage = pageStage(brief);
  const gates = briefGateContext(brief, data);
  const responseTime = typeof data.responseTime === 'string' && data.responseTime.trim().length > 0;
  // An arrival promise (section 8 tokens) needs the owner's response time; every other fact gate runs as usual.
  const passes = (line: string) => runCopyGates({ formHeadline: line }, gates).length === 0 && (responseTime || !ARRIVAL_TOKENS.some(token => line.includes(token)));
  const set = CTA_LABEL_SETS[stage];
  return [
    'VOICE RULES (Tamar, binding; the Hebrew lists they name are given after them):',
    ...VOICE_PROMPT_RULES.map(rule => `- ${rule.text}`),
    // M2a.6: Tamar's section 20.8 rules R1-R8 (byte-exact; M2a.7 adds R8), and Noa's verb / preposition line (M2a.7).
    ...M2A6_PROMPT_RULES.map(rule => `- ${rule.text}`),
    `- ${PREPOSITION_PROMPT_LINE}`,
    'Lists named in the voice rules:',
    ...voiceListLines({ stickyArrival: responseTime, differentiatorGroups: differentiatorGroups(gates) }),
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
export function buildSiteCopyHardLimitsBlock(heading = 'HARD LIMITS'): string {
  const lines: string[] = [
    `${heading} (validator-enforced; output that breaks any of these is rejected. They override every softer length or count guidance above):`,
    '- Length means the number of characters in the string, counting every letter, space, digit and punctuation mark. Aim for at most 85% of each limit to leave a margin.',
    '- Required non-empty strings (every one must be present and non-empty, including faqHeadline when faqItems is empty):',
    ...Object.entries(SITE_COPY_STRING_LIMITS).map(([key, max]) => `  - ${key}: max ${max} characters`),
    '- Optional fields (a string, or null):',
    ...Object.entries(SITE_COPY_OPTIONAL_STRING_LIMITS).map(([key, max]) => `  - ${key}: max ${max} characters when set`),
    '- Lists:',
    ...STRING_LIST_KEYS.map(key => {
      const limit = SITE_COPY_STRING_LIST_LIMITS[key];
      return `  - ${key}: at most ${limit.maxItems} strings; each string max ${limit.itemMaxChars} characters`;
    }),
    ...PAIR_LIST_KEYS.map(key => {
      const limit = SITE_COPY_PAIR_LIST_LIMITS[key];
      const parts = limit.keys.map((name, index) => `"${name}" max ${limit.maxChars[index]} characters`).join(', ');
      return `  - ${key}: at most ${limit.maxItems} objects with exactly the keys ${limit.keys.map(name => `"${name}"`).join(' and ')}; ${parts}`;
    }),
    `- ${SITE_COPY_REVIEW_PAIR[0]} is the owner's quote, verbatim, and may stand alone. ${SITE_COPY_REVIEW_PAIR[1]} may be set only when ${SITE_COPY_REVIEW_PAIR[0]} is set and the data supplies a star rating; otherwise ${SITE_COPY_REVIEW_PAIR[1]} is null. Never invent a ${SITE_COPY_REVIEW_PAIR[1]}. Never shorten or rephrase a quote.`,
    `- ${SITE_COPY_ALWAYS_NULL.join(', ')}: always null.`,
    '- faqItems: follow the faqPolicy rule in the research rules above.',
    `- Output exactly these keys and no others: ${SITE_COPY_KEYS.join(', ')}.`,
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
    if (systemFields.includes(field) || !SITE_COPY_KEYS.includes(field) || (SITE_COPY_ALWAYS_NULL as readonly string[]).includes(field)) continue;
    if (violation.rule === 'unexpected' && !violation.field.includes('.')) continue;
    fields.add(field);
  }
  return SITE_COPY_KEYS.filter(key => fields.has(key));
}

function structural(violations: CopyViolation[]): boolean {
  return violations.some(violation => violation.field === '$');
}

function describeLimit(field: string): string {
  if (field in SITE_COPY_STRING_LIMITS) return `non-empty string, max ${SITE_COPY_STRING_LIMITS[field as keyof typeof SITE_COPY_STRING_LIMITS]} characters`;
  if (field in SITE_COPY_OPTIONAL_STRING_LIMITS) return `string or null, max ${SITE_COPY_OPTIONAL_STRING_LIMITS[field as keyof typeof SITE_COPY_OPTIONAL_STRING_LIMITS]} characters when set`;
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

function validatorViolations(value: Loose): CopyViolation[] {
  try {
    assertBoundedGeneratedSiteCopy(value);
    return [];
  } catch {
    const violations = explainGeneratedSiteCopyViolations(value);
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

function currentViolations(value: Loose, gates: CopyGateContext | null = null): CopyViolation[] {
  return [...validatorViolations(value), ...gateViolations(value, gates)];
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
    if (!SITE_COPY_KEYS.includes(key)) {
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
    const hits = blockingGateHits(runCopyGates(next, gates), gates);
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

/** M2a.5: a gated trust-bar item is dropped only while at least this many other items remain. */
export const TRUST_BAR_MIN_KEPT = 3;

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

export function withSystemFields(value: Loose, brief: PageBrief, data: CollectedData): Loose {
  const next: Loose = { ...value, faqItems: supportedFaqItems(brief) };
  if (!brief.site) return next;
  next.heroCta = researchHeroCta(brief, data);
  const itemLimit = SITE_COPY_STRING_LIST_LIMITS.serviceItems;
  next.serviceItems = brief.site.serviceLabels.filter(label => label.length <= itemLimit.itemMaxChars).slice(0, itemLimit.maxItems);
  const quote = effectiveReviewQuote(data);
  next.reviewFeatured = quote && quote.length <= SITE_COPY_OPTIONAL_STRING_LIMITS.reviewFeatured ? quote : null;
  if (!ownerHasGuarantee(data)) next.guaranteeBlock = null;
  // M2a.3 (item 6): the response-time badge is the emergency arrival promise; never on an installation page.
  if (isInstallPage(brief)) next.responseTimeBadge = null;
  return next;
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
  const fields = ownerHasGuarantee(ctx.data) ? SYSTEM_FIELDS : [...SYSTEM_FIELDS, 'guaranteeBlock'];
  return isInstallPage(ctx.brief) ? [...fields, 'responseTimeBadge'] : fields;
}

/** Validate one stage's output against the validator and the gates, spending repair budget, then safe fixes; throws with what remains. */
async function settleStage(ctx: RepairContext, stage: CopyValidationStage, call: () => Promise<string>): Promise<SiteCopy> {
  const settle = (raw: Loose) => withSystemFields(raw, ctx.brief, ctx.data);
  let parsed = parseLoose(await call());
  let value = parsed.value ? settle(parsed.value) : undefined;
  for (;;) {
    const violations = value ? currentViolations(value, ctx.gates) : parsed.violations;
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
  assertCopyAt(stage, value);
  assertGatesAt(stage, value, ctx.gates, ctx.emit);
  return value as unknown as SiteCopy;
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
  const schema = buildSiteCopyPrompt(promptData, {
    blankResponseTimeBadge: true,
    ...(brief.site ? { relevanceTerm: brief.site.relevanceTerm, nullGuarantee: !ownerHasGuarantee(data) } : {}),
  });
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
  return `${buildResearchPageCopyPrompt(brief, data)}\n\nOWNER FACTS AND SITE COPY SCHEMA:\n${clientSchema}\n\n${buildSiteCopyHardLimitsBlock()}`;
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
  return `${JSON.stringify(copy)}\n\n${buildSiteCopyHardLimitsBlock('HARD LIMITS FOR YOUR CORRECTIONS (never lengthen a field past its limit)')}${fixed}`;
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
  const tamarCopy = await settleStage(ctx, 'tamar', () => callJson(brief.site ? SITE_COPY_SYSTEM_PROMPT : COPY_SYSTEM_PROMPT, prompt, { thinkingBudget: 1500 }));
  const noaCopy = await settleStage(ctx, 'noa', () => callJson(QA_SYSTEM_PROMPT, buildNoaQaMessage(tamarCopy, brief), { think: false }));
  const finalCopy = withSystemFields(applyFaqPolicy(noaCopy, brief) as unknown as Loose, brief, data) as unknown as SiteCopy;
  assertCopyAt('final', finalCopy);
  assertGatesAt('final', finalCopy as unknown as Loose, ctx.gates, ctx.emit);
  return finalCopy;
}

export function isApprovedPortfolioBrief(dossier: SiteResearchDossier, brief: PageBrief): boolean {
  return dossier.status === 'copy_ready'
    && dossier.pageOpportunities.some(page => (
      page.id === brief.page.id
      && page.targetPath === brief.page.targetPath
      && page.status === 'ready'
    ));
}
