import type { CollectedData } from '../../bot/prompts';
import type { ResearchGate } from '../research/gates';

export interface CheckoutResearchResult {
  dossier: {
    status: string;
    humanGates: Array<{ status: string }>;
  };
}

export interface CompletePaidCheckoutResearchParams {
  sessionId: string;
  runResearch: () => Promise<CheckoutResearchResult>;
  openResearchGateCount: number;
  collectedData?: CollectedData;
  openResearchGates?: ResearchGate[];
  removePending: () => void;
}

export async function completePaidCheckoutResearch({
  sessionId,
  runResearch,
  openResearchGateCount,
  collectedData,
  openResearchGates,
  removePending,
}: CompletePaidCheckoutResearchParams) {
  const result = await runResearch();
  removePending();
  return {
    success: true,
    charged: true,
    researchId: sessionId,
    status: result.dossier.status,
    openGateCount: openResearchGateCount + result.dossier.humanGates.filter(gate => gate.status !== 'approved').length,
    ...(collectedData !== undefined ? { collectedData } : {}),
    ...(openResearchGates !== undefined ? { openResearchGates } : {}),
  };
}
