import assert from 'node:assert/strict';
import test from 'node:test';
import { enums } from 'google-ads-api';
import type { CampaignConfig } from '../crm/intelligence';
import type { GoogleAdsOperatorTask } from './operator';
import { executeGoogleAdsOperatorTask } from './executor';
import { buildClient } from './mutations';

process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN = 'mock-refresh-token';
process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID = '123';

const campaignConfig: CampaignConfig = {
  clientId: 'harvest-test',
  mode: 'test',
  customerId: '123',
  slug: 'harvest-test',
  avgJobValue: 1000,
  closeRateEstimate: 0.5,
  verifiedLeadConversionResourceName: null,
  closedDealConversionResourceName: null,
  createdAt: '2026-01-01T00:00:00Z',
  cplCeilingIls: 100,
};

function task(): GoogleAdsOperatorTask {
  return {
    taskId: 'harvest-task',
    clientId: 'harvest-test',
    campaignId: '456',
    campaignPhase: 'growth',
    campaignAgeDays: 30,
    kind: 'search_term_harvest',
    title: 'Promote profitable search queries to keywords',
    whyNeeded: 'Evidence must be re-evaluated at execution time.',
    recommendedAction: 'Create exact or phrase keywords only.',
    risk: 'low',
    source: 'next-action',
    order: 1,
  };
}

interface CriterionOperation {
  ad_group: string;
  negative: boolean;
  keyword: { text: string; match_type: number };
}

function mockClient(options: { failPhrase?: boolean; includeBroadNegativeConflict?: boolean } = {}) {
  const createCalls: CriterionOperation[][] = [];
  const customer = {
    query: async (query: string) => {
      if (query.includes('FROM search_term_view')) {
        const rows = [
          { search_term_view: { search_term: 'exact winner' }, campaign: { id: '456', name: 'Generic campaign' }, ad_group: { id: '1' }, metrics: { cost_micros: 300_000_000, all_conversions: 4 } },
          { search_term_view: { search_term: 'exact winner' }, campaign: { id: '456', name: 'Generic campaign' }, ad_group: { id: '1' }, metrics: { cost_micros: 300_000_000, all_conversions: 4 } },
          { search_term_view: { search_term: 'phrase winner' }, campaign: { id: '456', name: 'Generic campaign' }, ad_group: { id: '2' }, metrics: { cost_micros: 240_000_000, all_conversions: 3 } },
          { search_term_view: { search_term: 'phrase winner' }, campaign: { id: '456', name: 'Generic campaign' }, ad_group: { id: '2' }, metrics: { cost_micros: 240_000_000, all_conversions: 3 } },
          { search_term_view: { search_term: 'already enabled' }, campaign: { id: '456', name: 'Generic campaign' }, ad_group: { id: '3' }, metrics: { cost_micros: 100_000_000, all_conversions: 2 } },
          { search_term_view: { search_term: 'blocked term' }, campaign: { id: '456', name: 'Generic campaign' }, ad_group: { id: '4' }, metrics: { cost_micros: 100_000_000, all_conversions: 2 } },
        ];
        if (options.includeBroadNegativeConflict) {
          rows.push({ search_term_view: { search_term: 'blocked broad suffix' }, campaign: { id: '456', name: 'Generic campaign' }, ad_group: { id: '5' }, metrics: { cost_micros: 100_000_000, all_conversions: 2 } });
        }
        return rows;
      }
      if (query.includes('ad_group_criterion.negative')) {
        const rows = [
          { ad_group: { id: '3' }, ad_group_criterion: { negative: false, status: 'ENABLED', keyword: { text: 'already enabled', match_type: 'EXACT' } } },
          { ad_group: { id: '4' }, ad_group_criterion: { negative: true, status: 'ENABLED', keyword: { text: 'blocked', match_type: 'PHRASE' } } },
        ];
        if (options.includeBroadNegativeConflict) {
          rows.push({ ad_group: { id: '5' }, ad_group_criterion: { negative: true, status: 'ENABLED', keyword: { text: 'blocked broad', match_type: 'BROAD' } } });
        }
        return rows;
      }
      throw new Error(`Unexpected query: ${query}`);
    },
    adGroupCriteria: {
      create: async (operations: CriterionOperation[]) => {
        createCalls.push(operations);
        const first = operations[0];
        if (options.failPhrase && first.ad_group.endsWith('/2')) throw new Error('phrase mutation failed');
        return { results: [{ resource_name: 'customers/123/adGroupCriteria/1' }] };
      },
    },
  };
  return { Customer: () => customer, createCalls } as unknown as ReturnType<typeof buildClient> & { createCalls: CriterionOperation[][] };
}

test('harvest executor sends only exact or phrase positive keyword payloads and avoids duplicates', async () => {
  const client = mockClient();
  const result = await executeGoogleAdsOperatorTask({ task: task(), campaignConfig, campaignId: '456', clientInstance: client });

  assert.equal(result.success, true, result.error);
  assert.equal(client.createCalls.length, 2);
  const operations = client.createCalls.flat();
  assert.equal(operations.length, 2);
  assert.equal(operations[0].negative, false);
  assert.equal(operations[0].keyword.text, 'exact winner');
  assert.equal(operations[0].keyword.match_type, enums.KeywordMatchType.EXACT);
  assert.notEqual(operations[0].keyword.match_type, enums.KeywordMatchType.BROAD);
  assert.equal(operations[1].negative, false);
  assert.equal(operations[1].keyword.text, 'phrase winner');
  assert.equal(operations[1].keyword.match_type, enums.KeywordMatchType.PHRASE);
  assert.notEqual(operations[1].keyword.match_type, enums.KeywordMatchType.BROAD);
});

test('harvest executor reports partial mutations without retrying conflicting or enabled terms', async () => {
  const client = mockClient({ failPhrase: true });
  const result = await executeGoogleAdsOperatorTask({ task: task(), campaignConfig, campaignId: '456', clientInstance: client });

  assert.equal(result.success, true, result.error);
  assert.match(result.error ?? '', /Added 1\/2 positive keywords; 1 group\(s\) failed/);
  assert.equal(client.createCalls.length, 2);
});

test('harvest executor skips queries blocked by enabled broad negatives', async () => {
  const client = mockClient({ includeBroadNegativeConflict: true });
  const result = await executeGoogleAdsOperatorTask({ task: task(), campaignConfig, campaignId: '456', clientInstance: client });

  assert.equal(result.success, true, result.error);
  assert.equal(client.createCalls.length, 2);
  assert.ok(client.createCalls.flat().every((operation) => operation.ad_group !== 'customers/123/adGroups/5'));
});

test('harvest executor rejects launch and unknown lifecycle tasks before reading or mutating', async () => {
  for (const campaignPhase of ['launch', 'unknown'] as const) {
    const client = mockClient();
    const result = await executeGoogleAdsOperatorTask({
      task: { ...task(), campaignPhase, campaignAgeDays: campaignPhase === 'launch' ? 5 : null },
      campaignConfig,
      campaignId: '456',
      clientInstance: client,
    });

    assert.equal(result.success, false, campaignPhase);
    assert.match(result.error ?? '', /only permitted for growth or maturity campaigns/i);
    assert.equal(client.createCalls.length, 0, campaignPhase);
  }
});
