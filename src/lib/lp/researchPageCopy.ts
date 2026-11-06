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

function parseGeneratedCopy(raw: string): SiteCopy {
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > 16 * 1024) invalidCopy();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    invalidCopy();
  }
  assertBoundedGeneratedSiteCopy(value);
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
  const tamarCopy = parseGeneratedCopy(tamarRaw);
  const noaRaw = await callJson(QA_SYSTEM_PROMPT, JSON.stringify(tamarCopy), { think: false });
  const noaCopy = parseGeneratedCopy(noaRaw);
  const finalCopy = applyFaqPolicy(noaCopy, brief);
  assertBoundedGeneratedSiteCopy(finalCopy);
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
