/**
 * Google Ads Search Term Harvester.
 * Identifies high-converting search queries suitable for promotion to explicit keywords.
 * 
 * HEBREW-SAFETY: ZERO Hebrew bytes authored in this module. All identifiers are ASCII.
 */

export interface SearchTermHarvestCandidate {
  query: string;
  campaignId: string;
  adGroupId?: string;
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
    adGroupId?: string;
  }>;
  targetCplIls?: number;
  campaignId: string;
}): SearchTermHarvestCandidate[] {
  const targetCpl = params.targetCplIls ?? 150;
  const candidates: SearchTermHarvestCandidate[] = [];

  for (const term of params.searchTerms) {
    if (term.isExistingKeyword) continue;
    if (term.conversions >= 2) {
      const cpl = term.spendIls / term.conversions;
      if (cpl <= targetCpl * 1.2) {
        candidates.push({
          query: term.query,
          campaignId: params.campaignId,
          adGroupId: term.adGroupId,
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
