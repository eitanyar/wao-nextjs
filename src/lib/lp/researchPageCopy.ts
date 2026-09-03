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
  const tamarCopy = JSON.parse(tamarRaw) as SiteCopy;
  const noaRaw = await callJson(QA_SYSTEM_PROMPT, JSON.stringify(tamarCopy), { think: false });
  return applyFaqPolicy(JSON.parse(noaRaw) as SiteCopy, brief);
}

export function isApprovedPortfolioBrief(dossier: SiteResearchDossier, brief: PageBrief): boolean {
  return dossier.status === 'copy_ready'
    && dossier.pageOpportunities.some(page => (
      page.id === brief.page.id
      && page.targetPath === brief.page.targetPath
      && page.status === 'ready'
    ));
}
