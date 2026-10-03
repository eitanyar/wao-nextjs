import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RECOMMENDATION_ALLOW_TYPES,
  RECOMMENDATION_CONDITIONAL_TYPES,
  RECOMMENDATION_REJECT_TYPES,
  classifyRecommendationType,
  evaluateRecommendation,
  gateRecommendationOnCplCeiling,
} from './recommendation-feed';
import {
  BRAND_BASELINE_DEGRADATION_MULTIPLIER,
  CPL_CEILING_ILS_BY_CLIENT_AND_TYPE,
  SEASONAL_REMARKETING_EXACT_CAMPAIGNS,
} from './cpl-ceiling';

const rejectTypes = [
  'CAMPAIGN_BUDGET', 'FORECASTING_CAMPAIGN_BUDGET', 'MARGINAL_ROI_CAMPAIGN_BUDGET',
  'TARGET_CPA_OPT_IN', 'TARGET_ROAS_OPT_IN', 'MAXIMIZE_CONVERSIONS_OPT_IN',
  'MAXIMIZE_CONVERSION_VALUE_OPT_IN', 'MAXIMIZE_CLICKS_OPT_IN', 'ENHANCED_CPC_OPT_IN',
  'RAISE_TARGET_CPA_BID_TOO_LOW', 'RAISE_TARGET_CPA', 'FORECASTING_SET_TARGET_CPA',
  'LOWER_TARGET_ROAS', 'FORECASTING_SET_TARGET_ROAS', 'SET_TARGET_CPA', 'SET_TARGET_ROAS',
  'SEARCH_PARTNERS_OPT_IN', 'DISPLAY_EXPANSION_OPT_IN', 'KEYWORD_MATCH_TYPE',
  'USE_BROAD_MATCH_KEYWORD', 'CUSTOM_AUDIENCE_OPT_IN', 'SHOPPING_TARGET_ALL_OFFERS',
  'PERFORMANCE_MAX_OPT_IN',
];

const allowRows: Array<[string, 'low' | 'medium', 'apply_direct' | 'alert_task' | 'tracking_audit', boolean]> = [
  ['OPTIMIZE_AD_ROTATION', 'low', 'apply_direct', false],
  ['CALLOUT_ASSET', 'medium', 'apply_direct', true],
  ['SITELINK_ASSET', 'medium', 'apply_direct', true],
  ['CALL_ASSET', 'medium', 'apply_direct', true],
  ['RESPONSIVE_SEARCH_AD_ASSET', 'medium', 'apply_direct', true],
  ['RESPONSIVE_SEARCH_AD', 'medium', 'apply_direct', true],
  ['RESPONSIVE_SEARCH_AD_IMPROVE_AD_STRENGTH', 'medium', 'apply_direct', true],
  ['IMPROVE_PERFORMANCE_MAX_AD_STRENGTH', 'medium', 'apply_direct', true],
  ['IMPROVE_DEMAND_GEN_AD_STRENGTH', 'medium', 'apply_direct', true],
  ['TEXT_AD', 'low', 'apply_direct', false],
  ['SHOPPING_ADD_AGE_GROUP', 'low', 'apply_direct', false],
  ['SHOPPING_ADD_COLOR', 'low', 'apply_direct', false],
  ['SHOPPING_ADD_GENDER', 'low', 'apply_direct', false],
  ['SHOPPING_ADD_GTIN', 'low', 'apply_direct', false],
  ['SHOPPING_ADD_MORE_IDENTIFIERS', 'low', 'apply_direct', false],
  ['SHOPPING_ADD_SIZE', 'low', 'apply_direct', false],
  ['SHOPPING_FIX_DISAPPROVED_PRODUCTS', 'low', 'alert_task', false],
  ['SHOPPING_FIX_SUSPENDED_MERCHANT_CENTER_ACCOUNT', 'low', 'alert_task', false],
  ['SHOPPING_FIX_MERCHANT_CENTER_ACCOUNT_SUSPENSION_WARNING', 'low', 'alert_task', false],
  ['REFRESH_CUSTOMER_MATCH_LIST', 'low', 'apply_direct', false],
  ['IMPROVE_GOOGLE_TAG_COVERAGE', 'medium', 'tracking_audit', false],
];

const conditionalRows: Array<[string, 'medium' | 'high']> = [
  ['MOVE_UNUSED_BUDGET', 'medium'], ['KEYWORD', 'medium'],
  ['DYNAMIC_IMAGE_EXTENSION_OPT_IN', 'medium'], ['LEAD_FORM_ASSET', 'high'],
  ['UPGRADE_SMART_SHOPPING_CAMPAIGN_TO_PERFORMANCE_MAX', 'high'],
  ['UPGRADE_LOCAL_CAMPAIGN_TO_PERFORMANCE_MAX', 'high'],
  ['MIGRATE_DYNAMIC_SEARCH_ADS_CAMPAIGN_TO_PERFORMANCE_MAX', 'high'],
  ['SHOPPING_MIGRATE_REGULAR_SHOPPING_CAMPAIGN_OFFERS_TO_PERFORMANCE_MAX', 'high'],
  ['PERFORMANCE_MAX_FINAL_URL_OPT_IN', 'medium'],
];

const base = { clientId: 'retter', campaignName: 'synthetic prospecting' };

test('section 1.2: every explicit reject type is never surfaced', () => {
  assert.deepEqual([...RECOMMENDATION_REJECT_TYPES].sort(), rejectTypes.slice().sort());
  assert.equal(Object.isFrozen(RECOMMENDATION_REJECT_TYPES), true);
  assert.throws(() => (RECOMMENDATION_REJECT_TYPES as Set<string>).add('SOME_FUTURE_TYPE'), TypeError);
  assert.throws(() => (RECOMMENDATION_REJECT_TYPES as Set<string>).delete('CAMPAIGN_BUDGET'), TypeError);
  for (const type of rejectTypes) {
    assert.deepEqual(classifyRecommendationType(type), { decision: 'reject', reason: 'reject_set' }, type);
  }
});

test('unknown enum values and object-prototype keys fail closed', () => {
  for (const type of ['SOME_FUTURE_TYPE', '', 'optimize_ad_rotation', 'SHOPPING_ADD_PRODUCTS_TO_CAMPAIGN', '__proto__', 'constructor']) {
    assert.deepEqual(classifyRecommendationType(type), { decision: 'reject', reason: 'unclassified_fail_closed' }, type);
  }
});

test('section 1.3: all and only allow rows carry exact risk, path, and copy flag', () => {
  assert.deepEqual(Object.keys(RECOMMENDATION_ALLOW_TYPES).sort(), allowRows.map(([type]) => type).sort());
  for (const [type, risk, executionPath, copyReviewRequired] of allowRows) {
    assert.deepEqual(classifyRecommendationType(type), { decision: 'allow', reason: 'allow_set' }, type);
    assert.deepEqual(RECOMMENDATION_ALLOW_TYPES[type], { risk, executionPath, copyReviewRequired }, type);
    const result = evaluateRecommendation({ ...base, type });
    assert.equal(result.decision, 'allow', type);
    assert.equal(result.executionPath, executionPath, type);
    assert.equal(result.copyReviewRequired, copyReviewRequired, type);
  }
});

test('section 1.4: all and only conditional rows require framing and preserve risk', () => {
  assert.deepEqual(Object.keys(RECOMMENDATION_CONDITIONAL_TYPES).sort(), conditionalRows.map(([type]) => type).sort());
  for (const [type, risk] of conditionalRows) {
    assert.deepEqual(classifyRecommendationType(type), { decision: 'conditional', reason: 'conditional_set' }, type);
    assert.equal(RECOMMENDATION_CONDITIONAL_TYPES[type].risk, risk, type);
    assert.ok(RECOMMENDATION_CONDITIONAL_TYPES[type].requiredCardFraming.length > 0, type);
    assert.equal(evaluateRecommendation({ ...base, type }).decision, 'conditional', type);
  }
  assert.equal(evaluateRecommendation({ ...base, type: 'DYNAMIC_IMAGE_EXTENSION_OPT_IN' }).copyReviewRequired, true);
  assert.equal(evaluateRecommendation({ ...base, type: 'LEAD_FORM_ASSET' }).copyReviewRequired, true);
});

test('non-brand ceilings for both clients block only projected CPL above the configured value', () => {
  for (const clientId of ['retter', 'aasada']) {
    const ceiling = CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand;
    const input = { clientId, campaignName: 'synthetic prospecting', projectedConversions: 2 };
    assert.deepEqual(gateRecommendationOnCplCeiling({ ...input, projectedCostIls: (ceiling + 1) * 2 }),
      { blocked: true, reason: 'cpl_ceiling_breach' });
    assert.deepEqual(gateRecommendationOnCplCeiling({ ...input, projectedCostIls: ceiling * 2 }),
      { blocked: false, reason: 'within_cpl_ceiling' });
    assert.equal(gateRecommendationOnCplCeiling({ ...input, projectedCostIls: (ceiling - 1) * 2 }).blocked, false);
  }
});

test('brand baseline gate uses the shared multiplier, with absent baseline evidence not blocked', () => {
  const input = { clientId: 'retter', campaignName: 'brand synthetic', projectedConversions: 2, brandBaselineCplIls: 20 };
  assert.equal(gateRecommendationOnCplCeiling({ ...input, projectedCostIls: 2 * 20 * BRAND_BASELINE_DEGRADATION_MULTIPLIER }).blocked, false);
  assert.deepEqual(gateRecommendationOnCplCeiling({ ...input, projectedCostIls: 2 * 31 }),
    { blocked: true, reason: 'brand_baseline_breach' });
  assert.deepEqual(gateRecommendationOnCplCeiling({ ...input, brandBaselineCplIls: undefined, projectedCostIls: 1000 }),
    { blocked: false, reason: 'brand_baseline_unavailable' });
});

test('seasonal-remarketing uses its resolved absolute ceiling, not the brand baseline', () => {
  const campaignName = SEASONAL_REMARKETING_EXACT_CAMPAIGNS.aasada[0].campaignName;
  const ceiling = CPL_CEILING_ILS_BY_CLIENT_AND_TYPE.aasada.seasonalRemarketing;
  assert.notEqual(ceiling, undefined);
  const input = { clientId: 'aasada', campaignName, projectedConversions: 1, brandBaselineCplIls: 40 };
  assert.deepEqual(gateRecommendationOnCplCeiling({ ...input, projectedCostIls: ceiling! + 1 }),
    { blocked: true, reason: 'cpl_ceiling_breach' });
  for (const projectedCostIls of [ceiling!, ceiling! - 1, 61]) {
    assert.deepEqual(gateRecommendationOnCplCeiling({ ...input, projectedCostIls }),
      { blocked: false, reason: 'within_cpl_ceiling' });
  }
  assert.deepEqual(gateRecommendationOnCplCeiling({ ...input, brandBaselineCplIls: undefined, projectedCostIls: ceiling! + 1 }),
    { blocked: true, reason: 'cpl_ceiling_breach' });

  const type = 'OPTIMIZE_AD_ROTATION';
  const rejected = evaluateRecommendation({ ...input, type, projectedCostIls: ceiling! + 1 });
  assert.equal(rejected.decision, 'reject');
  assert.equal(rejected.reason, 'cpl_ceiling_breach');
  assert.deepEqual(rejected.ceiling, { blocked: true, reason: 'cpl_ceiling_breach' });
  const allowed = evaluateRecommendation({ ...input, type, projectedCostIls: 61 });
  assert.equal(allowed.decision, 'allow');
  assert.equal(allowed.reason, 'allow_set');
  assert.deepEqual(allowed.ceiling, { blocked: false, reason: 'within_cpl_ceiling' });
});

test('no projection is a no-op, including invalid and non-finite impact', () => {
  for (const impact of [
    {}, { projectedCostIls: 200 }, { projectedCostIls: 200, projectedConversions: 0 },
    { projectedCostIls: Infinity, projectedConversions: 1 },
    { projectedCostIls: -1, projectedConversions: 1 },
    { projectedCostIls: 200, projectedConversions: NaN },
  ]) {
    assert.deepEqual(gateRecommendationOnCplCeiling({ ...base, ...impact }),
      { blocked: false, reason: 'no_projection_noop' });
  }
  assert.deepEqual(gateRecommendationOnCplCeiling({ clientId: 'synthetic', campaignName: 'prospecting', projectedCostIls: 100, projectedConversions: 1 }),
    { blocked: false, reason: 'ceiling_unavailable' });
});

test('composed entry point short-circuits rejects and blocks allow and conditional breaches', () => {
  const projection = { ...base, projectedCostIls: 300, projectedConversions: 1 };
  const rejected = evaluateRecommendation({ ...projection, type: 'CAMPAIGN_BUDGET' });
  assert.deepEqual(rejected, { decision: 'reject', reason: 'reject_set', copyReviewRequired: false });
  assert.equal(Object.hasOwn(rejected, 'ceiling'), false);
  const unknown = evaluateRecommendation({ ...projection, type: 'SOME_FUTURE_TYPE' });
  assert.equal(unknown.decision, 'reject');
  assert.equal(Object.hasOwn(unknown, 'ceiling'), false);
  for (const type of ['OPTIMIZE_AD_ROTATION', 'KEYWORD']) {
    const result = evaluateRecommendation({ ...projection, type });
    assert.equal(result.decision, 'reject');
    assert.equal(result.reason, 'cpl_ceiling_breach');
    assert.deepEqual(result.ceiling, { blocked: true, reason: 'cpl_ceiling_breach' });
  }
});
