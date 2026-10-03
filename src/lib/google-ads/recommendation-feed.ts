import {
  BRAND_BASELINE_DEGRADATION_MULTIPLIER,
  campaignType,
  resolveCplCeilingIls,
} from './cpl-ceiling';

export type RecommendationRisk = 'low' | 'medium' | 'high';
export type RecommendationExecutionPath = 'apply_direct' | 'alert_task' | 'tracking_audit';

/** Freeze the exposed Set's mutation surface as well as its object properties. */
function frozenSet(values: string[]): ReadonlySet<string> {
  const valuesSet = new Set(values);
  return Object.freeze(new Proxy(valuesSet, {
    get(target, property) {
      if (property === 'add' || property === 'delete' || property === 'clear') {
        return () => { throw new TypeError('Recommendation reject set is immutable'); };
      }
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }));
}

/** Explicit spend-growth and targeting-expansion exclusions from priority-4 section 1.2. */
export const RECOMMENDATION_REJECT_TYPES = frozenSet([
  'CAMPAIGN_BUDGET',
  'FORECASTING_CAMPAIGN_BUDGET',
  'MARGINAL_ROI_CAMPAIGN_BUDGET',
  'TARGET_CPA_OPT_IN',
  'TARGET_ROAS_OPT_IN',
  'MAXIMIZE_CONVERSIONS_OPT_IN',
  'MAXIMIZE_CONVERSION_VALUE_OPT_IN',
  'MAXIMIZE_CLICKS_OPT_IN',
  'ENHANCED_CPC_OPT_IN',
  'RAISE_TARGET_CPA_BID_TOO_LOW',
  'RAISE_TARGET_CPA',
  'FORECASTING_SET_TARGET_CPA',
  'LOWER_TARGET_ROAS',
  'FORECASTING_SET_TARGET_ROAS',
  'SET_TARGET_CPA',
  'SET_TARGET_ROAS',
  'SEARCH_PARTNERS_OPT_IN',
  'DISPLAY_EXPANSION_OPT_IN',
  'KEYWORD_MATCH_TYPE',
  'USE_BROAD_MATCH_KEYWORD',
  'CUSTOM_AUDIENCE_OPT_IN',
  'SHOPPING_TARGET_ALL_OFFERS',
  'PERFORMANCE_MAX_OPT_IN',
]);

type AllowMetadata = Readonly<{
  risk: RecommendationRisk;
  copyReviewRequired: boolean;
  executionPath: RecommendationExecutionPath;
}>;

function allow(
  risk: RecommendationRisk,
  copyReviewRequired = false,
  executionPath: RecommendationExecutionPath = 'apply_direct'
): AllowMetadata {
  return Object.freeze({ risk, copyReviewRequired, executionPath });
}

/** Explicit priority-4 section 1.3 allowlist, including currently inapplicable types. */
export const RECOMMENDATION_ALLOW_TYPES: Readonly<Record<string, AllowMetadata>> = Object.freeze({
  OPTIMIZE_AD_ROTATION: allow('low'),
  CALLOUT_ASSET: allow('medium', true),
  SITELINK_ASSET: allow('medium', true),
  CALL_ASSET: allow('medium', true),
  RESPONSIVE_SEARCH_AD_ASSET: allow('medium', true),
  RESPONSIVE_SEARCH_AD: allow('medium', true),
  RESPONSIVE_SEARCH_AD_IMPROVE_AD_STRENGTH: allow('medium', true),
  IMPROVE_PERFORMANCE_MAX_AD_STRENGTH: allow('medium', true),
  IMPROVE_DEMAND_GEN_AD_STRENGTH: allow('medium', true),
  TEXT_AD: allow('low'),
  SHOPPING_ADD_AGE_GROUP: allow('low'),
  SHOPPING_ADD_COLOR: allow('low'),
  SHOPPING_ADD_GENDER: allow('low'),
  SHOPPING_ADD_GTIN: allow('low'),
  SHOPPING_ADD_MORE_IDENTIFIERS: allow('low'),
  SHOPPING_ADD_SIZE: allow('low'),
  SHOPPING_FIX_DISAPPROVED_PRODUCTS: allow('low', false, 'alert_task'),
  SHOPPING_FIX_SUSPENDED_MERCHANT_CENTER_ACCOUNT: allow('low', false, 'alert_task'),
  SHOPPING_FIX_MERCHANT_CENTER_ACCOUNT_SUSPENSION_WARNING: allow('low', false, 'alert_task'),
  REFRESH_CUSTOMER_MATCH_LIST: allow('low'),
  IMPROVE_GOOGLE_TAG_COVERAGE: allow('medium', false, 'tracking_audit'),
});

type ConditionalMetadata = Readonly<{
  risk: RecommendationRisk;
  requiredCardFraming: string;
}>;

function conditional(risk: RecommendationRisk, requiredCardFraming: string): ConditionalMetadata {
  return Object.freeze({ risk, requiredCardFraming });
}

/** These types require evidence and an explicit human veto, not automatic approval. */
export const RECOMMENDATION_CONDITIONAL_TYPES: Readonly<Record<string, ConditionalMetadata>> = Object.freeze({
  MOVE_UNUSED_BUDGET: conditional('medium', 'Show donor and receiver trailing CPL side by side, receiver under its campaign-type ceiling, and unchanged account budget; veto otherwise.'),
  KEYWORD: conditional('medium', 'Show the existing converting keeper search term, keyword coverage gap, and projected CPL; veto if cross-match or ceiling evidence is missing.'),
  DYNAMIC_IMAGE_EXTENSION_OPT_IN: conditional('medium', 'Show the generated image preview for brand review and veto before approval.'),
  LEAD_FORM_ASSET: conditional('high', 'Show landing-page versus native-form conversion and CRM tracking impact; require engineering assessment and veto before approval.'),
  UPGRADE_SMART_SHOPPING_CAMPAIGN_TO_PERFORMANCE_MAX: conditional('high', 'Show source campaign and verified deprecation deadline versus optional migration; deadline-driven work requires a separate project and veto.'),
  UPGRADE_LOCAL_CAMPAIGN_TO_PERFORMANCE_MAX: conditional('high', 'Show source campaign and verified deprecation deadline versus optional migration; deadline-driven work requires a separate project and veto.'),
  MIGRATE_DYNAMIC_SEARCH_ADS_CAMPAIGN_TO_PERFORMANCE_MAX: conditional('high', 'Show source campaign and verified deprecation deadline versus optional migration; deadline-driven work requires a separate project and veto.'),
  SHOPPING_MIGRATE_REGULAR_SHOPPING_CAMPAIGN_OFFERS_TO_PERFORMANCE_MAX: conditional('high', 'Show source campaign and verified deprecation deadline versus optional migration; deadline-driven work requires a separate project and veto.'),
  PERFORMANCE_MAX_FINAL_URL_OPT_IN: conditional('medium', 'Show currently eligible and newly eligible final URLs side by side; veto unwanted destinations.'),
});

export function classifyRecommendationType(type: string): {
  decision: 'allow' | 'conditional' | 'reject';
  reason: string;
} {
  if (RECOMMENDATION_REJECT_TYPES.has(type)) return { decision: 'reject', reason: 'reject_set' };
  if (Object.hasOwn(RECOMMENDATION_ALLOW_TYPES, type)) return { decision: 'allow', reason: 'allow_set' };
  if (Object.hasOwn(RECOMMENDATION_CONDITIONAL_TYPES, type)) {
    return { decision: 'conditional', reason: 'conditional_set' };
  }
  return { decision: 'reject', reason: 'unclassified_fail_closed' };
}

export interface RecommendationCeilingInput {
  clientId: string;
  campaignName: string;
  projectedCostIls?: number;
  projectedConversions?: number;
  brandBaselineCplIls?: number;
}

/**
 * Gate only a confirmed projection breach. No impact projection is a no-op; a brand
 * without a supplied positive baseline is not blocked because this gate is evidence-gated.
 * Only brand uses its baseline; non-brand and seasonal-remarketing use their respective
 * resolved absolute ceilings.
 */
export function gateRecommendationOnCplCeiling(params: RecommendationCeilingInput): {
  blocked: boolean;
  reason: string;
} {
  const { projectedCostIls, projectedConversions } = params;
  if (
    projectedCostIls === undefined || !Number.isFinite(projectedCostIls) || projectedCostIls < 0 ||
    projectedConversions === undefined || !Number.isFinite(projectedConversions) || projectedConversions <= 0
  ) return { blocked: false, reason: 'no_projection_noop' };

  const projectedCpl = projectedCostIls / projectedConversions;
  if (!Number.isFinite(projectedCpl)) return { blocked: false, reason: 'no_projection_noop' };

  const type = campaignType(params.campaignName, params.clientId);
  if (type === 'brand') {
    const baseline = params.brandBaselineCplIls;
    if (baseline === undefined || !Number.isFinite(baseline) || baseline <= 0) {
      return { blocked: false, reason: 'brand_baseline_unavailable' };
    }
    return projectedCpl > BRAND_BASELINE_DEGRADATION_MULTIPLIER * baseline
      ? { blocked: true, reason: 'brand_baseline_breach' }
      : { blocked: false, reason: 'within_brand_baseline' };
  }

  const ceiling = resolveCplCeilingIls({ clientId: params.clientId, type });
  if (ceiling === undefined) return { blocked: false, reason: 'ceiling_unavailable' };
  return projectedCpl > ceiling
    ? { blocked: true, reason: 'cpl_ceiling_breach' }
    : { blocked: false, reason: 'within_cpl_ceiling' };
}

export function evaluateRecommendation(input: RecommendationCeilingInput & { type: string }): {
  decision: 'allow' | 'conditional' | 'reject';
  reason: string;
  risk?: RecommendationRisk;
  copyReviewRequired: boolean;
  executionPath?: RecommendationExecutionPath;
  requiredCardFraming?: string;
  ceiling?: { blocked: boolean; reason: string };
} {
  const classified = classifyRecommendationType(input.type);
  if (classified.decision === 'reject') {
    return { ...classified, copyReviewRequired: false };
  }
  const ceiling = gateRecommendationOnCplCeiling(input);
  if (ceiling.blocked) {
    return { decision: 'reject', reason: ceiling.reason, copyReviewRequired: false, ceiling };
  }
  if (classified.decision === 'allow') {
    const metadata = RECOMMENDATION_ALLOW_TYPES[input.type];
    return { ...classified, ...metadata, ceiling };
  }
  const metadata = RECOMMENDATION_CONDITIONAL_TYPES[input.type];
  return {
    ...classified,
    ...metadata,
    copyReviewRequired: input.type === 'DYNAMIC_IMAGE_EXTENSION_OPT_IN' || input.type === 'LEAD_FORM_ASSET',
    ceiling,
  };
}
