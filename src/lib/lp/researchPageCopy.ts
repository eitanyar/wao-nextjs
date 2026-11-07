/**
 * Research-bound site copy generation.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from './lpCopyPrompt';
import { buildSiteCopyPrompt } from './lpCopyPrompt';
import { callQwenJSON, type CallQwenJSONOptions } from '../ai/qwen-fast';
import type { PageBrief } from '../site-bot/research/pageBrief';
import type { SiteResearchDossier } from '../site-bot/research/types';

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
}

const COPY_SYSTEM_PROMPT =
  'You are Tamar, a Hebrew conversion copywriter. Follow the supplied research brief and JSON schema exactly. Return only the requested JSON object, with no prose or markdown.';

const QA_SYSTEM_PROMPT =
  'You are Noa, a Hebrew language QA editor. Correct only language and typography in the supplied JSON, preserve all factual claims and structure, and return only valid JSON.';

const REPAIR_SYSTEM_PROMPT =
  'You are Tamar, a Hebrew conversion copywriter. You are repairing specific fields of a site-copy JSON object that broke hard validator limits. Return only a JSON object containing exactly the requested keys, with no prose or markdown.';

// ---------------------------------------------------------------------------
// Hard limits: the single source of truth for the validator, the violation
// explainer, the generation prompt and the repair prompt (paid-journey v2 M2a, B4).
// ---------------------------------------------------------------------------

/** Required, non-empty string fields: max characters (JS string length). */
export const SITE_COPY_STRING_LIMITS = {
  heroHeadline: 68, heroSubheadline: 90, heroCta: 15, aboutBlurb: 320,
  servicesHeadline: 35, faqHeadline: 30, guaranteeBlock: 100,
  formHeadline: 35, stickyBarLine: 25, aboutPageHeadline: 50, aboutPageBody: 400,
} as const;
/** Optional string-or-null fields: max characters when set. */
export const SITE_COPY_OPTIONAL_STRING_LIMITS = {
  reviewFeatured: 400, reviewContext: 160, responseTimeBadge: 100,
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
/** Fields that must be both set or both null. */
export const SITE_COPY_BOTH_OR_NEITHER = ['reviewFeatured', 'reviewContext'] as const;
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
    (value[SITE_COPY_BOTH_OR_NEITHER[0]] === null) !== (value[SITE_COPY_BOTH_OR_NEITHER[1]] === null) ||
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
  const [pairA, pairB] = SITE_COPY_BOTH_OR_NEITHER;
  if ((value[pairA] === null) !== (value[pairB] === null)) {
    out.push({ field: `${pairA}+${pairB}`, rule: 'both_or_neither', actual: value[pairA] === null ? `${pairB}_only` : `${pairA}_only` });
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

export function buildResearchPageCopyPrompt(brief: PageBrief): string {
  return `RESEARCH BRIEF (authoritative; use no claim not supported here):
${JSON.stringify({
  page: brief.page,
  persona: brief.persona,
  offer: brief.waoOffer,
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
- Use only facts included in allowedFacts, entities, queries, persona, offer, or FAQ candidates.
- Do not make any claim prohibited by prohibitedClaims or fill an information gap with an inference.
- If faqPolicy is none, output an empty faqItems array.
- Otherwise faqItems may contain only the supplied FAQ candidates, retaining their supplied question and answer.
- Keep required internal-link targets limited to links.

The following owner-fact prompt provides the required SiteCopy JSON schema. Treat owner facts as context only; use a fact in output only when the research brief authorizes it.`;
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
    `- ${SITE_COPY_BOTH_OR_NEITHER.join(' and ')}: both strings or both null, never one without the other. Never invent a ${SITE_COPY_BOTH_OR_NEITHER[1]}; if the data supplies no star rating or other context for the quote, or the quote is longer than ${SITE_COPY_OPTIONAL_STRING_LIMITS.reviewFeatured} characters, set BOTH to null. Never shorten or rephrase a quote.`,
    `- ${SITE_COPY_ALWAYS_NULL.join(', ')}: always null.`,
    '- faqItems: follow the faqPolicy rule in the research rules above.',
    `- Output exactly these keys and no others: ${SITE_COPY_KEYS.join(', ')}.`,
    `- The whole JSON object must be at most ${SITE_COPY_MAX_BYTES} bytes in UTF-8.`,
    '- If a field is too long, rephrase it shorter in complete, natural wording. Never cut text mid-word or mid-sentence and never use an ellipsis.',
  ];
  return lines.join('\n');
}

export type CopyRepairEventKind = 'violations' | 'repair' | 'stage_retry' | 'deterministic_fix';

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
  remaining: number;
  used: number;
  deterministicFixes: boolean;
  emit: (event: CopyRepairEvent) => void;
}

type Loose = Record<string, unknown>;

function topField(field: string): string {
  return field.split(/[.[+]/)[0];
}

/** Violations a model can reasonably repair. Pair rule, always-null, extras and FAQs are not sent to the model. */
function repairableFields(violations: CopyViolation[]): string[] {
  const fields = new Set<string>();
  for (const violation of violations) {
    if (violation.field === '$' || violation.rule === 'both_or_neither' || violation.rule === 'must_be_null') continue;
    const field = topField(violation.field);
    if (field === 'faqItems' || !SITE_COPY_KEYS.includes(field) || (SITE_COPY_ALWAYS_NULL as readonly string[]).includes(field)) continue;
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

function describeProblem(violation: CopyViolation): string {
  const where = violation.field;
  if (violation.rule === 'max_length') return `${where} is ${violation.actual} characters (max ${violation.limit})`;
  if (violation.rule === 'max_items') return `${where} has ${violation.actual} items (max ${violation.limit})`;
  if (violation.rule === 'missing') return `${where} is missing`;
  if (violation.rule === 'empty') return `${where} is empty`;
  if (violation.rule === 'type') return `${where} has the wrong type (${violation.actual})`;
  if (violation.rule === 'unexpected') return `${where} is not an allowed key`;
  return `${where}: ${violation.rule}`;
}

/** English repair request: only the violating fields, each with its limit, its actual length and current value. */
export function buildCopyRepairPrompt(copy: Loose, violations: CopyViolation[], fields: string[]): string {
  const blocks = fields.map(field => {
    const problems = violations.filter(violation => topField(violation.field) === field).map(describeProblem);
    return `- ${field}: ${describeLimit(field)}.\n  Problems: ${problems.join('; ')}.\n  Current value: ${JSON.stringify(copy[field] ?? null)}`;
  });
  return `These fields of a site-copy JSON object broke hard validator limits. Rewrite ONLY these fields so that each one is within its limit.

RULES:
- Keep the same language, meaning, facts and voice as the current value. Do not add any claim, number, name or promise that is not already in the current value.
- Shorten by rephrasing into complete, natural wording. Never cut text mid-word or mid-sentence and never use an ellipsis.
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

function currentViolations(value: Loose): CopyViolation[] {
  try {
    assertBoundedGeneratedSiteCopy(value);
    return [];
  } catch {
    const violations = explainGeneratedSiteCopyViolations(value);
    return violations.length ? violations : [{ field: '$', rule: 'structure' }];
  }
}

/**
 * Last-resort fixes that cannot damage copy: drop whole list items past the item
 * limit, null a half-set review pair, set always-null fields (missing or not) to null,
 * drop unknown keys.
 * Never shortens or edits any string.
 */
export function applySafeDeterministicFixes(value: Loose): { value: Loose; fixes: string[] } {
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
  }
  for (const key of PAIR_LIST_KEYS) {
    const list = next[key];
    const max = SITE_COPY_PAIR_LIST_LIMITS[key].maxItems;
    if (Array.isArray(list) && list.length > max) {
      next[key] = list.slice(0, max);
      fixes.push(`trim_items:${key}:${list.length}->${max}`);
    }
  }
  const [pairA, pairB] = SITE_COPY_BOTH_OR_NEITHER;
  if (pairA in next && pairB in next && (next[pairA] === null) !== (next[pairB] === null)) {
    next[pairA] = null;
    next[pairB] = null;
    fixes.push(`null_pair:${pairA}+${pairB}`);
  }
  for (const key of SITE_COPY_ALWAYS_NULL) {
    if (next[key] !== null) {
      // A missing or non-null always-null field has exactly one valid value.
      fixes.push(`${key in next ? 'null_field' : 'add_null_field'}:${key}`);
      next[key] = null;
    }
  }
  return { value: next, fixes };
}

function withFaqPolicy(value: Loose, brief: PageBrief): Loose {
  // FAQs are never model-authored on research pages: the brief's supported candidates
  // replace them before validation, so a discarded model FAQ can never fail a page.
  return { ...value, faqItems: supportedFaqItems(brief) };
}

async function repairFields(ctx: RepairContext, stage: CopyValidationStage, value: Loose, violations: CopyViolation[], fields: string[]): Promise<Loose> {
  ctx.remaining--;
  ctx.used++;
  ctx.emit({ stage, kind: 'repair', attempt: ctx.used, fields, violations });
  const raw = await ctx.callJson(REPAIR_SYSTEM_PROMPT, buildCopyRepairPrompt(value, violations, fields), { thinkingBudget: 1000 });
  const parsed = parseLoose(raw);
  if (!parsed.value) return value;
  const merged: Loose = { ...value };
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(parsed.value, field)) merged[field] = parsed.value[field];
  }
  return merged;
}

/** Validate one stage's output, spending repair budget, then safe fixes; throws with what remains. */
async function settleStage(ctx: RepairContext, stage: CopyValidationStage, call: () => Promise<string>): Promise<SiteCopy> {
  let parsed = parseLoose(await call());
  let value = parsed.value ? withFaqPolicy(parsed.value, ctx.brief) : undefined;
  for (;;) {
    const violations = value ? currentViolations(value) : parsed.violations;
    if (value && violations.length === 0) return value as unknown as SiteCopy;
    ctx.emit({ stage, kind: 'violations', violations });
    if (ctx.remaining <= 0) break;
    if (!value || structural(violations)) {
      ctx.remaining--;
      ctx.used++;
      ctx.emit({ stage, kind: 'stage_retry', attempt: ctx.used, violations });
      parsed = parseLoose(await call());
      value = parsed.value ? withFaqPolicy(parsed.value, ctx.brief) : undefined;
      continue;
    }
    const fields = repairableFields(violations);
    if (!fields.length) break;
    value = withFaqPolicy(await repairFields(ctx, stage, value, violations, fields), ctx.brief);
  }
  if (!value) throw new GeneratedCopyValidationError(stage, parsed.violations);
  if (ctx.deterministicFixes) {
    const fixed = applySafeDeterministicFixes(value);
    if (fixed.fixes.length) {
      ctx.emit({ stage, kind: 'deterministic_fix', fixes: fixed.fixes });
      value = fixed.value;
    }
  }
  assertCopyAt(stage, value);
  return value as unknown as SiteCopy;
}

export function buildResearchPageGenerationPrompt(brief: PageBrief, data: CollectedData): string {
  return `${buildResearchPageCopyPrompt(brief)}\n\nOWNER FACTS AND SITE COPY SCHEMA:\n${buildSiteCopyPrompt(data)}\n\n${buildSiteCopyHardLimitsBlock()}`;
}

export function buildNoaQaMessage(copy: SiteCopy): string {
  return `${JSON.stringify(copy)}\n\n${buildSiteCopyHardLimitsBlock('HARD LIMITS FOR YOUR CORRECTIONS (never lengthen a field past its limit)')}`;
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
    remaining: Number.isInteger(requested) ? Math.max(0, Math.min(MAX_COPY_REPAIRS, requested)) : MAX_COPY_REPAIRS,
    used: 0,
    deterministicFixes: dependencies.deterministicFixes ?? true,
    emit: event => {
      try { dependencies.onEvent?.(event); } catch { /* diagnostics never break generation */ }
    },
  };
  const prompt = buildResearchPageGenerationPrompt(brief, data);
  const tamarCopy = await settleStage(ctx, 'tamar', () => callJson(COPY_SYSTEM_PROMPT, prompt, { thinkingBudget: 1500 }));
  const noaCopy = await settleStage(ctx, 'noa', () => callJson(QA_SYSTEM_PROMPT, buildNoaQaMessage(tamarCopy), { think: false }));
  const finalCopy = applyFaqPolicy(noaCopy, brief);
  assertCopyAt('final', finalCopy);
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
