/**
 * Google Ads Campaign Age Lifecycle evaluator.
 * Evaluates campaign maturity phase based on start / first impression date.
 * 
 * HEBREW-SAFETY: ZERO Hebrew bytes authored in this module. All identifiers are ASCII.
 */

export type CampaignLifecyclePhase = 'launch' | 'growth' | 'maturity';

export interface CampaignAgeEvaluation {
  ageDays: number;
  phase: CampaignLifecyclePhase;
  startDate?: string;
  firstImpressionDate?: string;
}

export function evaluateCampaignAge(params: {
  startDate?: string;
  firstImpressionDate?: string;
  referenceDate?: Date;
}): CampaignAgeEvaluation {
  const ref = params.referenceDate ?? new Date();
  const dateStr = params.startDate ?? params.firstImpressionDate;

  if (!dateStr) {
    return {
      ageDays: 30,
      phase: 'growth',
      startDate: params.startDate,
      firstImpressionDate: params.firstImpressionDate,
    };
  }

  const start = new Date(dateStr);
  const diffMs = ref.getTime() - start.getTime();
  const ageDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  let phase: CampaignLifecyclePhase = 'growth';
  if (ageDays < 14) {
    phase = 'launch';
  } else if (ageDays <= 45) {
    phase = 'growth';
  } else {
    phase = 'maturity';
  }

  return {
    ageDays,
    phase,
    startDate: params.startDate,
    firstImpressionDate: params.firstImpressionDate,
  };
}
