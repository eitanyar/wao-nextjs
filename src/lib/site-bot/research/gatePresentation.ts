import type { CollectedData } from '../../bot/prompts';
import type { ResearchGateType } from './gates';
import type { RESEARCH_COPY } from '../researchCopy';

export const RESEARCH_PROGRESS_KEYS = [
  'progress_truth',
  'progress_keywords',
  'progress_serps',
  'progress_architecture',
  'progress_copy',
] as const satisfies readonly (keyof typeof RESEARCH_COPY)[];

const GATE_COPY_KEYS: Record<ResearchGateType, keyof typeof RESEARCH_COPY> = {
  business_boundary: 'gate_business_boundary',
  service_attributes: 'gate_service_attributes',
  geography: 'gate_geography',
  money_services: 'gate_money_services',
  ambiguous_intent: 'gate_ambiguous_intent',
};

export function researchGateCopyKey(type: ResearchGateType): keyof typeof RESEARCH_COPY {
  return GATE_COPY_KEYS[type];
}

export function buildResearchGateAnswer(
  type: ResearchGateType,
  rawAnswer: string,
  collectedData: CollectedData,
): unknown | null {
  const answer = rawAnswer.trim();
  if (!answer) return null;

  switch (type) {
    case 'business_boundary':
      return { services: answer.split(',').map((service) => service.trim()).filter(Boolean) };
    case 'service_attributes':
      return { serviceAttributes: { [collectedData.primaryService?.trim() || 'primaryService']: answer } };
    case 'geography':
      return { travelBoundary: answer, geographicExclusions: [] };
    case 'money_services':
      return { priorityServices: answer.split(',').map((service) => service.trim()).filter(Boolean) };
    case 'ambiguous_intent':
      return answer;
  }
}
