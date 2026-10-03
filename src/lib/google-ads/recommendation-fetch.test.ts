import assert from 'node:assert/strict';
import test from 'node:test';
import type { WeeklyDigest } from '../crm/intelligence';
import { buildGoogleAdsOperatorTasks } from './operator';
import {
  fetchTagCoverageRecommendations,
  mapTagCoverageRecommendationRows,
  type RawTagCoverageRecommendationRow,
} from './recommendation-fetch';

const customerId = '1234567890';
const campaignId = '1001';
const resource = `customers/${customerId}/recommendations/tag-one`;
const campaign = `customers/${customerId}/campaigns/${campaignId}`;
const scope = { customerId, enabledCampaignIds: [campaignId, '1002'] };
const row = (resource_name: unknown = resource, campaignResource: unknown = campaign,
  type: unknown = 'IMPROVE_GOOGLE_TAG_COVERAGE'): RawTagCoverageRecommendationRow => ({
  recommendation: { type, resource_name, campaign: campaignResource },
});

function digest(): WeeklyDigest {
  return {
    slug: 'synthetic-only', campaignName: 'Not the Ads campaign', windowDays: 7,
    totals: { cpl: undefined, verifiedLeads: 0 },
    pacing: { status: 'on-track', mode: 'live' }, alerts: [], nextActions: [],
  } as unknown as WeeklyDigest;
}

function tasks(recommendations?: ReturnType<typeof mapTagCoverageRecommendationRows>[string]) {
  return buildGoogleAdsOperatorTasks({
    clientId: 'synthetic-client', digest: digest(), campaignId,
    campaignName: 'Actual synthetic campaign', campaignAge: { phase: 'growth', ageDays: 30 },
    recommendations,
  });
}

const audits = (result: ReturnType<typeof tasks>) =>
  result.filter((task) => task.taskId.startsWith('recommendation-'));

const failQuery = async (): Promise<RawTagCoverageRecommendationRow[]> => {
  assert.fail('unexpected provider/query call');
};

test('injected customer query yields one campaign-scoped inert audit with actual lifecycle', async () => {
  let calls = 0;
  const query = async (id: string, gaql: string) => {
    calls++;
    assert.equal(id, customerId);
    assert.match(gaql, /SELECT recommendation\.resource_name, recommendation\.type, recommendation\.campaign\s+FROM recommendation/);
    assert.match(gaql, /WHERE recommendation\.type = IMPROVE_GOOGLE_TAG_COVERAGE/);
    assert.doesNotMatch(gaql, /impact|apply|dismiss|metrics\./i);
    return [row()];
  };
  const mapped = await fetchTagCoverageRecommendations({ ...scope, query });
  assert.equal(calls, 1);
  const [audit] = audits(tasks(mapped[campaignId]));
  assert.equal(audits(tasks(mapped[campaignId])).length, 1);
  assert.equal(audit.kind, 'tracking_audit');
  assert.equal(audit.risk, 'medium');
  assert.equal(audit.source, 'alert');
  assert.equal(audit.campaignId, campaignId);
  assert.equal(audit.campaignPhase, 'growth');
  assert.equal(audit.campaignAgeDays, 30);
  assert.match(audit.whyNeeded, /Actual synthetic campaign/);
  assert.doesNotMatch(audit.whyNeeded, /Not the Ads campaign/);
  assert.match(audit.taskId, /tag-one/);
  assert.deepEqual(tasks(), tasks([]));
  assert.deepEqual(mapped, { [campaignId]: [{ type: 'IMPROVE_GOOGLE_TAG_COVERAGE', resourceName: resource }] });
});

test('duplicates are per resource and campaign, with deterministic order and no raw row spread', () => {
  const another = `customers/${customerId}/recommendations/tag-two`;
  const extra = { recommendation: { ...row().recommendation, impact: 'do-not-expose' } };
  const mapped = mapTagCoverageRecommendationRows([
    row(), row(), row(another), row(resource, `customers/${customerId}/campaigns/1002`),
    extra,
  ], scope);
  assert.equal(audits(tasks(mapped[campaignId])).length, 2);
  assert.equal(audits(tasks(mapped['1002'])).length, 1);
  assert.deepEqual(mapped, {
    [campaignId]: [
      { type: 'IMPROVE_GOOGLE_TAG_COVERAGE', resourceName: resource },
      { type: 'IMPROVE_GOOGLE_TAG_COVERAGE', resourceName: another },
    ],
    '1002': [{ type: 'IMPROVE_GOOGLE_TAG_COVERAGE', resourceName: resource }],
  });
});

test('unknown, rejected, conditional and other allowed types fail closed before builder', () => {
  for (const type of ['FUTURE_UNKNOWN_TYPE', 'CAMPAIGN_BUDGET', 'KEYWORD', 'OPTIMIZE_AD_ROTATION',
    'LEAD_FORM_ASSET', null, 53]) {
    const mapped = mapTagCoverageRecommendationRows([row(resource, campaign, type)], scope);
    assert.deepEqual(mapped, {}, String(type));
    assert.deepEqual(audits(tasks(mapped[campaignId])), [], String(type));
  }
  assert.deepEqual(mapTagCoverageRecommendationRows([
    { recommendation: { resource_name: resource, campaign } },
  ], scope), {});
});

test('customer, campaign and resource mismatches or malformed IDs fail closed', () => {
  const invalid = [
    row(resource, `customers/9999999999/campaigns/${campaignId}`),
    row('customers/9999999999/recommendations/tag-one'),
    row(resource, 'customers/1234567890/campaigns/9000'),
    row(resource, null), row('', campaign), row('   ', campaign),
    row(`customers/${customerId}/recommendations/`, campaign),
    row(`customers/${customerId}/recommendations/a/b`, campaign),
    row(`customers/${customerId}/recommendations/a b`, campaign),
    row(resource, `customers/${customerId}/campaigns/0`),
    row(resource, `customers/${customerId}/campaigns/01001`),
    row(resource, `customers/${customerId}/campaigns/non-numeric`),
    row(resource, `customers/0/campaigns/${campaignId}`),
    {}, { recommendation: null },
  ];
  for (const bad of invalid) {
    const mapped = mapTagCoverageRecommendationRows([bad], scope);
    assert.deepEqual(mapped, {}, JSON.stringify(bad));
    assert.deepEqual(audits(tasks(mapped[campaignId])), []);
  }
  assert.deepEqual(mapTagCoverageRecommendationRows([row()], { ...scope, customerId: '0' }), {});
  assert.deepEqual(mapTagCoverageRecommendationRows([row()], { ...scope, enabledCampaignIds: ['01001'] }), {});
});

test('query rejection degrades to empty without logging account data or invoking any other adapter', async () => {
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = () => assert.fail('unexpected log');
  console.error = () => assert.fail('unexpected log');
  try {
    let calls = 0;
    const result = await fetchTagCoverageRecommendations({
      ...scope,
      query: async (id, gaql) => {
        calls++;
        assert.equal(id, customerId);
        assert.match(gaql, /FROM recommendation/);
        throw new Error('synthetic provider failure with account payload');
      },
    });
    assert.equal(calls, 1);
    assert.deepEqual(result, {});
    assert.deepEqual(audits(tasks(result[campaignId])), []);
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
});

test('zero enabled campaigns or invalid customer never invoke query', async () => {
  for (const params of [
    { ...scope, enabledCampaignIds: [] },
    { ...scope, enabledCampaignIds: ['0', 'not-an-id'] },
    { ...scope, customerId: 'not-an-id' },
  ]) {
    assert.deepEqual(await fetchTagCoverageRecommendations({ ...params, query: failQuery }), {});
  }
});
