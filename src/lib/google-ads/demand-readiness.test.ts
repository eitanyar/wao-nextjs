import assert from 'node:assert/strict';
import test from 'node:test';

import { getEstimatedCPC, getKeywordDemand } from '../ads/keywordPlanner';
import {
  evaluatePaidSearchReadiness,
  executePaidSearchMutationIfReady,
  paidSearchReadinessBlockedResponse,
} from './demand-readiness';

test('keyword demand normalizes mocked provider evidence without a live request', async () => {
  let requestSeen: unknown;
  const demand = await getKeywordDemand(['alpha', 'alpha', 'beta'], 'Test City', {
    geoTargetId: '2376',
    languageId: '1000',
    fetchIdeas: async (request: { keyword_and_url_seed: { keywords: string[] } }) => {
      requestSeen = request;
      return {
        keyword_idea_results: [
          {
            text: 'alpha',
            keyword_idea_metrics: {
              avg_monthly_searches: '120',
              competition: 'HIGH',
              low_top_of_page_bid_micros: '3000000',
              high_top_of_page_bid_micros: '5000000',
            },
          },
          {
            keyword_text: 'beta',
            keywordIdeaMetrics: {
              avgMonthlySearches: 80,
              competition: 'LOW',
              lowTopOfPageBidMicros: 1000000,
              highTopOfPageBidMicros: 2000000,
            },
          },
        ],
      };
    },
  });

  if (!demand) throw new Error('mocked demand should be returned');
  assert.deepEqual((requestSeen as { keyword_and_url_seed: { keywords: string[] } }).keyword_and_url_seed.keywords, ['alpha', 'beta']);
  assert.equal(demand.providerEvidence, true);
  assert.equal(demand.aggregate.monthlySearches, 200);
  assert.equal(demand.ideas[0].highTopOfPageBidIls, 5);
  assert.equal(demand.ideas[1].lowTopOfPageBidIls, 1);
});

test('estimated CPC stays compatible and is derived from mocked demand evidence', async () => {
  const cpc = await getEstimatedCPC(['alpha'], 'Test City', {
    geoTargetId: '2376',
    languageId: '1000',
    fetchIdeas: async () => ({
      results: [{
        text: 'alpha',
        keyword_idea_metrics: {
          low_top_of_page_bid_micros: 2000000,
          high_top_of_page_bid_micros: 6000000,
        },
      }],
    }),
  });

  assert.equal(cpc, 4);
});

test('live readiness accepts only evidence with configured volume and viable lead economics', () => {
  const decision = evaluatePaidSearchReadiness({
    mode: 'live',
    commercialSeeds: ['alpha'],
    demand: {
      providerEvidence: true,
      ideas: [{ text: 'alpha', avgMonthlySearches: 200, competition: 'HIGH', lowTopOfPageBidIls: 3, highTopOfPageBidIls: 5 }],
      aggregate: { monthlySearches: 200, lowTopOfPageBidIls: 3, highTopOfPageBidIls: 5 },
      retrievedAt: '2026-09-03T00:00:00.000Z',
      geoTargetId: '2376',
      languageId: '1000',
    },
    minMonthlySearches: 100,
    dailyBudgetIls: 100,
    estimatedLeadConversionRate: 0.1,
    cplCeilingIls: 60,
  });

  assert.equal(decision.status, 'ready');
  assert.equal(decision.evidence.estimatedLeadCostIls, 50);
});

test('missing live evidence blocks before a mutation callback can run', async () => {
  let mutations = 0;
  const decision = evaluatePaidSearchReadiness({
    mode: 'live',
    commercialSeeds: ['alpha'],
    demand: null,
    minMonthlySearches: undefined,
    dailyBudgetIls: 100,
    estimatedLeadConversionRate: 0.1,
    cplCeilingIls: 60,
  });

  await executePaidSearchMutationIfReady(decision, async () => {
    mutations += 1;
  });
  assert.equal(decision.status, 'blocked');
  assert.ok(decision.reasons.includes('provider_evidence_missing'));
  assert.ok(decision.reasons.includes('monthly_search_floor_missing'));
  assert.equal(mutations, 0);
});

test('blocked live readiness returns the route response contract with reasons and evidence', async () => {
  const decision = evaluatePaidSearchReadiness({
    mode: 'live',
    commercialSeeds: [],
    demand: null,
    dailyBudgetIls: 100,
  });
  const response = paidSearchReadinessBlockedResponse(decision);
  const body = await response.json() as { error: string; reasons: string[]; evidence: { providerEvidence: boolean } };

  assert.equal(response.status, 422);
  assert.equal(body.error, 'Paid search demand readiness blocked');
  assert.ok(body.reasons.includes('commercial_seeds_missing'));
  assert.equal(body.evidence.providerEvidence, false);
});

test('simulation is explicitly simulation-only and never ready', () => {
  const decision = evaluatePaidSearchReadiness({
    mode: 'test',
    commercialSeeds: ['alpha'],
    demand: null,
    dailyBudgetIls: 100,
  });

  assert.equal(decision.status, 'simulation_only');
  assert.equal(decision.ready, false);
});
