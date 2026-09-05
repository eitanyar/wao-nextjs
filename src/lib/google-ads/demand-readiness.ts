export interface KeywordDemandIdea {
  text: string;
  avgMonthlySearches: number;
  competition: string | null;
  lowTopOfPageBidIls: number | null;
  highTopOfPageBidIls: number | null;
}

export interface KeywordDemandEvidence {
  providerEvidence: boolean;
  ideas: KeywordDemandIdea[];
  aggregate: {
    monthlySearches: number;
    lowTopOfPageBidIls: number | null;
    highTopOfPageBidIls: number | null;
  };
  retrievedAt: string;
  geoTargetId: string;
  languageId: string;
}

export type PaidSearchReadinessReason =
  | 'commercial_seeds_missing'
  | 'provider_evidence_missing'
  | 'monthly_search_floor_missing'
  | 'monthly_search_floor_not_met'
  | 'bid_evidence_missing'
  | 'daily_budget_invalid'
  | 'lead_conversion_rate_missing'
  | 'cpl_ceiling_missing'
  | 'estimated_lead_cost_exceeds_ceiling';

export interface PaidSearchReadinessInput {
  mode: 'test' | 'live';
  commercialSeeds: string[];
  demand: KeywordDemandEvidence | null;
  minMonthlySearches?: number;
  dailyBudgetIls?: number;
  estimatedLeadConversionRate?: number;
  cplCeilingIls?: number;
}

export interface PaidSearchDemandEvidenceSummary {
  providerEvidence: boolean;
  retrievedAt: string | null;
  geoTargetId: string | null;
  languageId: string | null;
  commercialSeedCount: number;
  ideaCount: number;
  aggregateMonthlySearches: number | null;
  lowTopOfPageBidIls: number | null;
  highTopOfPageBidIls: number | null;
  estimatedLeadConversionRate: number | null;
  estimatedLeadCostIls: number | null;
  cplCeilingIls: number | null;
  uncertainty: string[];
}

export interface PaidSearchReadinessDecision {
  status: 'ready' | 'blocked' | 'simulation_only';
  ready: boolean;
  reasons: PaidSearchReadinessReason[];
  evidence: PaidSearchDemandEvidenceSummary;
}

function positiveFinite(value: number | undefined | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function average(values: Array<number | null>): number | null {
  const finite = values.filter((value): value is number => positiveFinite(value));
  if (!finite.length) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

export function evaluatePaidSearchReadiness(input: PaidSearchReadinessInput): PaidSearchReadinessDecision {
  const seeds = Array.from(new Set(input.commercialSeeds.map(seed => seed.trim()).filter(Boolean)));
  const demand = input.demand;
  const highBid = demand?.aggregate.highTopOfPageBidIls ?? null;
  const lowBid = demand?.aggregate.lowTopOfPageBidIls ?? null;
  const bidForEconomics = positiveFinite(highBid) ? highBid : average(demand?.ideas.map(idea => idea.highTopOfPageBidIls) ?? []);
  const estimatedLeadCostIls = positiveFinite(bidForEconomics) && positiveFinite(input.estimatedLeadConversionRate)
    ? bidForEconomics / input.estimatedLeadConversionRate
    : null;
  const uncertainty: string[] = [];
  const reasons: PaidSearchReadinessReason[] = [];

  if (!seeds.length) reasons.push('commercial_seeds_missing');
  if (!demand?.providerEvidence || !demand.ideas.length) reasons.push('provider_evidence_missing');
  if (!positiveFinite(input.minMonthlySearches)) reasons.push('monthly_search_floor_missing');
  if (positiveFinite(input.minMonthlySearches) && (!demand || demand.aggregate.monthlySearches < input.minMonthlySearches)) {
    reasons.push('monthly_search_floor_not_met');
  }
  if (!positiveFinite(lowBid) || !positiveFinite(highBid)) reasons.push('bid_evidence_missing');
  if (!positiveFinite(input.dailyBudgetIls)) reasons.push('daily_budget_invalid');
  if (!positiveFinite(input.estimatedLeadConversionRate) || input.estimatedLeadConversionRate > 1) {
    reasons.push('lead_conversion_rate_missing');
  }
  if (!positiveFinite(input.cplCeilingIls)) reasons.push('cpl_ceiling_missing');
  if (positiveFinite(estimatedLeadCostIls) && positiveFinite(input.cplCeilingIls) && estimatedLeadCostIls > input.cplCeilingIls) {
    reasons.push('estimated_lead_cost_exceeds_ceiling');
  }

  if (!demand?.providerEvidence) uncertainty.push('provider_data_unavailable');
  if (!positiveFinite(input.minMonthlySearches)) uncertainty.push('monthly_search_floor_unconfigured');
  if (!positiveFinite(input.estimatedLeadConversionRate)) uncertainty.push('lead_conversion_rate_unavailable');
  if (!positiveFinite(input.cplCeilingIls)) uncertainty.push('cpl_ceiling_unavailable');

  const evidence: PaidSearchDemandEvidenceSummary = {
    providerEvidence: demand?.providerEvidence ?? false,
    retrievedAt: demand?.retrievedAt ?? null,
    geoTargetId: demand?.geoTargetId ?? null,
    languageId: demand?.languageId ?? null,
    commercialSeedCount: seeds.length,
    ideaCount: demand?.ideas.length ?? 0,
    aggregateMonthlySearches: demand?.aggregate.monthlySearches ?? null,
    lowTopOfPageBidIls: lowBid,
    highTopOfPageBidIls: highBid,
    estimatedLeadConversionRate: input.estimatedLeadConversionRate ?? null,
    estimatedLeadCostIls,
    cplCeilingIls: input.cplCeilingIls ?? null,
    uncertainty,
  };

  if (input.mode === 'test') {
    return { status: 'simulation_only', ready: false, reasons, evidence };
  }
  return reasons.length
    ? { status: 'blocked', ready: false, reasons, evidence }
    : { status: 'ready', ready: true, reasons, evidence };
}

export function paidSearchReadinessBlockedResponse(decision: PaidSearchReadinessDecision): Response {
  return Response.json(
    {
      error: 'Paid search demand readiness blocked',
      reasons: decision.reasons,
      evidence: decision.evidence,
    },
    { status: 422 }
  );
}

export async function executePaidSearchMutationIfReady<T>(
  decision: PaidSearchReadinessDecision,
  mutation: () => Promise<T>
): Promise<T | undefined> {
  if (!decision.ready) return undefined;
  return mutation();
}
