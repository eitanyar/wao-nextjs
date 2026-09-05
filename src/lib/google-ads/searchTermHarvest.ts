/**
 * Google Ads Search Term Harvester.
 * Identifies high-converting search queries suitable for promotion to explicit keywords.
 * 
 * HEBREW-SAFETY: ZERO Hebrew bytes authored in this module. All identifiers are ASCII.
 */

export interface SearchTermHarvestCandidate {
  query: string;
  campaignId: string;
  adGroupResourceName: string;
  conversions: number;
  spendIls: number;
  cplIls: number;
  recommendedMatchType: 'exact' | 'phrase';
}

export function evaluateSearchTermHarvesting(params: {
  searchTerms: Array<{
    query: string;
    conversions: number;
    spendIls: number;
    isExistingKeyword?: boolean;
    hasNegativeKeywordConflict?: boolean;
    adGroupResourceName?: string;
  }>;
  targetCplIls?: number;
  campaignId: string;
}): SearchTermHarvestCandidate[] {
  const targetCpl = params.targetCplIls;
  if (!Number.isFinite(targetCpl) || targetCpl === undefined || targetCpl <= 0) return [];
  const candidates: SearchTermHarvestCandidate[] = [];

  for (const term of params.searchTerms) {
    if (term.isExistingKeyword || term.hasNegativeKeywordConflict || !term.adGroupResourceName) continue;
    if (term.conversions >= 2) {
      const cpl = term.spendIls / term.conversions;
      if (Number.isFinite(cpl) && cpl <= targetCpl) {
        candidates.push({
          query: term.query,
          campaignId: params.campaignId,
          adGroupResourceName: term.adGroupResourceName,
          conversions: term.conversions,
          spendIls: term.spendIls,
          cplIls: Math.round(cpl * 100) / 100,
          recommendedMatchType: term.conversions >= 4 ? 'exact' : 'phrase',
        });
      }
    }
  }

  return candidates;
}
