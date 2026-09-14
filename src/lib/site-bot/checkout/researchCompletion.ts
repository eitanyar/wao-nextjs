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
  removePending: () => void;
}

export async function completePaidCheckoutResearch({
  sessionId,
  runResearch,
  openResearchGateCount,
  removePending,
}: CompletePaidCheckoutResearchParams) {
  const result = await runResearch();
  removePending();
  return {
    success: true,
    charged: true,
    researchId: sessionId,
    status: result.dossier.status,
    statusUrl: `/api/site-bot/research/status?researchId=${encodeURIComponent(sessionId)}`,
    openGateCount: openResearchGateCount + result.dossier.humanGates.filter(gate => gate.status !== 'approved').length,
  };
}
