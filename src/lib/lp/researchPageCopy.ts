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
}

const COPY_SYSTEM_PROMPT =
  'You are Tamar, a Hebrew conversion copywriter. Follow the supplied research brief and JSON schema exactly. Return only the requested JSON object, with no prose or markdown.';

const QA_SYSTEM_PROMPT =
  'You are Noa, a Hebrew language QA editor. Correct only language and typography in the supplied JSON, preserve all factual claims and structure, and return only valid JSON.';

const COPY_FIELDS = {
  heroHeadline: 68, heroSubheadline: 90, heroCta: 15, aboutBlurb: 320,
  servicesHeadline: 35, faqHeadline: 30, guaranteeBlock: 100,
  formHeadline: 35, stickyBarLine: 25, aboutPageHeadline: 50, aboutPageBody: 400,
} as const;
const OPTIONAL_FIELDS = {
  reviewFeatured: 400, reviewContext: 160, responseTimeBadge: 100,
} as const;
const SITE_COPY_KEYS = [
  ...Object.keys(COPY_FIELDS), ...Object.keys(OPTIONAL_FIELDS),
  'trustBarItems', 'serviceItems', 'faqItems', 'scarcityLine', 'serviceDetails',
];

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
  if (value.scarcityLine !== null ||
    (value.reviewFeatured === null) !== (value.reviewContext === null) ||
    !boundedArray(value.trustBarItems, 4, item => boundedString(item, 20)) ||
    !boundedArray(value.serviceItems, 6, item => boundedString(item, 25)) ||
    !boundedArray(value.faqItems, 20, item => stringPair(item, ['q', 'a'], [120, 120])) ||
    !boundedArray(value.serviceDetails, 6, item => stringPair(item, ['name', 'description'], [25, 80]))) invalidCopy();
  try {
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 16 * 1024) invalidCopy();
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
  if (own.includes('scarcityLine') && value.scarcityLine !== null) out.push({ field: 'scarcityLine', rule: 'must_be_null' });
  if ((value.reviewFeatured === null) !== (value.reviewContext === null)) {
    out.push({ field: 'reviewFeatured+reviewContext', rule: 'both_or_neither', actual: value.reviewFeatured === null ? 'reviewContext_only' : 'reviewFeatured_only' });
  }
  out.push(...arrayViolations('trustBarItems', value.trustBarItems, 4, (entry, index) => {
    const violation = stringViolation(`trustBarItems[${index}]`, entry, 20);
    return violation ? [violation] : [];
  }));
  out.push(...arrayViolations('serviceItems', value.serviceItems, 6, (entry, index) => {
    const violation = stringViolation(`serviceItems[${index}]`, entry, 25);
    return violation ? [violation] : [];
  }));
  out.push(...arrayViolations('faqItems', value.faqItems, 20, (entry, index) => pairViolations(`faqItems[${index}]`, entry, ['q', 'a'], [120, 120])));
  out.push(...arrayViolations('serviceDetails', value.serviceDetails, 6, (entry, index) => pairViolations(`serviceDetails[${index}]`, entry, ['name', 'description'], [25, 80])));
  try {
    const bytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
    if (bytes > 16 * 1024) out.push({ field: '$', rule: 'max_bytes', limit: 16 * 1024, actual: bytes });
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

function parseGeneratedCopy(raw: string, stage: CopyValidationStage): SiteCopy {
  if (typeof raw !== 'string') throw new GeneratedCopyValidationError(stage, [{ field: '$', rule: 'type', actual: typeof raw }]);
  const bytes = Buffer.byteLength(raw, 'utf8');
  if (bytes > 16 * 1024) throw new GeneratedCopyValidationError(stage, [{ field: '$', rule: 'max_bytes', limit: 16 * 1024, actual: bytes }]);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new GeneratedCopyValidationError(stage, [{ field: '$', rule: 'invalid_json' }]);
  }
  assertCopyAt(stage, value);
  return value;
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

export async function generateResearchPageCopy(
  brief: PageBrief,
  data: CollectedData,
  dependencies: ResearchPageCopyDependencies = {},
): Promise<SiteCopy> {
  const callJson = dependencies.callJson ?? callQwenJSON;
  const prompt = `${buildResearchPageCopyPrompt(brief)}\n\nOWNER FACTS AND SITE COPY SCHEMA:\n${buildSiteCopyPrompt(data)}`;
  const tamarRaw = await callJson(COPY_SYSTEM_PROMPT, prompt, { thinkingBudget: 1500 });
  const tamarCopy = parseGeneratedCopy(tamarRaw, 'tamar');
  const noaRaw = await callJson(QA_SYSTEM_PROMPT, JSON.stringify(tamarCopy), { think: false });
  const noaCopy = parseGeneratedCopy(noaRaw, 'noa');
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
