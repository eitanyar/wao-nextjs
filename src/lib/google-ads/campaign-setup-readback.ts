/**
 * Read-back of a freshly created Ads Bot campaign (Dror's create-campaign triage, 2026-11-12,
 * plus the batch-A AI Max guard). GAQL SELECTs only; the pure `evaluateCampaignSetup` turns the
 * rows into named checks so the route, the sandbox run and Roni read the same verdict.
 *
 * Checks:
 *   - locations: every positive location/proximity criterion is one we sent, none is Israel
 *     (2376) unless the business is remote, and positive_geo_target_type = PRESENCE
 *   - no positive bid adjustments: no campaign criterion has bid_modifier > 1
 *   - Search Partners off, Display off
 *   - AI Max off, text customization + final URL expansion OPTED_OUT, no campaign-level broad match
 *   - call reporting on; the call asset reports to the AD_CALL action at resource level; that
 *     action is AD_CALL, secondary, 60s+
 *   - keywords: plain text (no [ ] " +), EXACT or PHRASE only
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { enums } from 'google-ads-api';
import { ISRAEL_GEO_TARGET_CONSTANT } from './geo-targeting';

type Num = number | string | null | undefined;

export interface CampaignSetupRows {
  campaign?: {
    network_settings?: { target_google_search?: boolean | null; target_search_network?: boolean | null; target_content_network?: boolean | null; target_partner_search_network?: boolean | null };
    geo_target_type_setting?: { positive_geo_target_type?: Num };
    ai_max_setting?: { enable_ai_max?: boolean | null };
    asset_automation_settings?: Array<{ asset_automation_type?: Num; asset_automation_status?: Num }> | null;
    keyword_match_type?: Num;
    target_spend?: { cpc_bid_ceiling_micros?: Num };
  };
  criteria: Array<{ type?: Num; negative?: boolean | null; bid_modifier?: number | null; location?: { geo_target_constant?: string | null }; proximity?: { radius?: number | null } }>;
  callReporting?: { call_reporting_enabled?: boolean | null; call_conversion_reporting_enabled?: boolean | null; call_conversion_action?: string | null };
  callAssets: Array<{ call_conversion_reporting_state?: Num; call_conversion_action?: string | null }>;
  callAction?: { resource_name?: string | null; type?: Num; primary_for_goal?: boolean | null; phone_call_duration_seconds?: Num };
  keywords: Array<{ text?: string | null; match_type?: Num; negative?: boolean | null }>;
}

export interface CampaignSetupExpectation {
  /** Geo target constants we sent (location criteria). */
  geoTargetConstants: string[];
  /** Number of proximity criteria we sent. */
  proximityCount: number;
  remote: boolean;
  callConversionResourceName: string | null;
  /** True when the business has a phone (a call asset was attempted). */
  expectCallAsset: boolean;
  cpcCapMicros: number;
}

export interface CampaignSetupVerdict {
  ok: boolean;
  checks: Record<string, boolean>;
  issues: string[];
}

const n = (value: Num) => (value === null || value === undefined || value === '' ? undefined : Number.isNaN(Number(value)) ? value : Number(value));
const is = (value: Num, enumValue: number, name: string) => n(value) === enumValue || value === name;

export function evaluateCampaignSetup(rows: CampaignSetupRows, expected: CampaignSetupExpectation): CampaignSetupVerdict {
  const checks: Record<string, boolean> = {};
  const issues: string[] = [];
  const check = (name: string, pass: boolean, issue: string) => {
    checks[name] = pass;
    if (!pass) issues.push(issue);
  };

  const c = rows.campaign ?? {};
  const positive = rows.criteria.filter((r) => r.negative !== true);
  const locations = positive.filter((r) => r.location?.geo_target_constant).map((r) => String(r.location!.geo_target_constant));
  const proximities = positive.filter((r) => r.proximity && (r.proximity.radius ?? 0) > 0);
  const expectedSet = new Set(expected.geoTargetConstants);
  check('locations_match_sent', locations.length === expectedSet.size && locations.every((g) => expectedSet.has(g)) && proximities.length === expected.proximityCount,
    `location criteria ${JSON.stringify(locations)} (+${proximities.length} radius) differ from sent ${JSON.stringify([...expectedSet])} (+${expected.proximityCount} radius)`);
  check('no_all_israel_for_local', expected.remote || !locations.includes(ISRAEL_GEO_TARGET_CONSTANT), 'a non-remote business targets all of Israel (2376)');
  check('presence_only', is(c.geo_target_type_setting?.positive_geo_target_type, enums.PositiveGeoTargetType.PRESENCE, 'PRESENCE'), `positive_geo_target_type is ${String(c.geo_target_type_setting?.positive_geo_target_type)}, not PRESENCE`);
  check('no_positive_bid_adjustments', rows.criteria.every((r) => r.bid_modifier === null || r.bid_modifier === undefined || Number(r.bid_modifier) <= 1), 'a campaign criterion has a positive bid adjustment (bid_modifier > 1)');

  check('search_partners_off', c.network_settings?.target_search_network === false || c.network_settings?.target_search_network === undefined || c.network_settings?.target_search_network === null,
    'Search Partners (target_search_network) is on');
  check('display_off', c.network_settings?.target_content_network !== true, 'Display (target_content_network) is on');
  check('cpc_cap_matches_trade', n(c.target_spend?.cpc_bid_ceiling_micros) === expected.cpcCapMicros, `cpc_bid_ceiling_micros ${String(c.target_spend?.cpc_bid_ceiling_micros)} != ${expected.cpcCapMicros}`);

  check('ai_max_off', c.ai_max_setting?.enable_ai_max !== true, 'AI Max is enabled');
  const automation = c.asset_automation_settings ?? [];
  const optedIn = automation.filter((a) => is(a.asset_automation_status, enums.AssetAutomationStatus.OPTED_IN, 'OPTED_IN'));
  check('asset_automation_opted_out', optedIn.length === 0, `asset automation opted in: ${JSON.stringify(optedIn)}`);
  check('no_campaign_broad_match', !is(c.keyword_match_type, enums.CampaignKeywordMatchType.BROAD, 'BROAD'), 'campaign-level broad match is on');

  check('call_reporting_on', rows.callReporting?.call_reporting_enabled === true && rows.callReporting?.call_conversion_reporting_enabled === true, `call reporting setting ${JSON.stringify(rows.callReporting ?? null)}`);
  if (expected.expectCallAsset) {
    const asset = rows.callAssets[0];
    check('call_asset_points_to_call_action',
      !!asset && is(asset.call_conversion_reporting_state, enums.CallConversionReportingState.USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION, 'USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION')
        && !!expected.callConversionResourceName && asset.call_conversion_action === expected.callConversionResourceName,
      `call asset ${JSON.stringify(asset ?? null)} does not report to ${expected.callConversionResourceName}`);
  }
  const action = rows.callAction;
  check('call_action_secondary_ad_call',
    !!action && is(action.type, enums.ConversionActionType.AD_CALL, 'AD_CALL') && action.primary_for_goal === false && Number(n(action.phone_call_duration_seconds) ?? 0) >= 60,
    `call conversion action ${JSON.stringify(action ?? null)} is not AD_CALL / secondary / 60s+`);

  const positiveKeywords = rows.keywords.filter((k) => k.negative !== true);
  const allowed = new Set<number>([enums.KeywordMatchType.EXACT, enums.KeywordMatchType.PHRASE]);
  check('keywords_plain_exact_or_phrase',
    positiveKeywords.length > 0 && positiveKeywords.every((k) => !!k.text && !/[[\]"+\u201C\u201D]/.test(k.text) && (allowed.has(Number(n(k.match_type))) || k.match_type === 'EXACT' || k.match_type === 'PHRASE')),
    `keywords not plain EXACT/PHRASE: ${JSON.stringify(positiveKeywords)}`);

  return { ok: issues.length === 0, checks, issues };
}

interface QueryCustomer {
  query: (gaql: string) => Promise<unknown[]>;
}

const RESOURCE = /^customers\/\d+\/(campaigns|conversionActions)\/\d+$/;

/** Reads the rows evaluateCampaignSetup needs (SELECT only). */
export async function readCampaignSetup(customer: QueryCustomer, campaignResourceName: string, callConversionResourceName: string | null): Promise<CampaignSetupRows> {
  if (!RESOURCE.test(campaignResourceName)) throw new Error(`bad campaign resource name: ${campaignResourceName}`);
  const where = `campaign.resource_name = '${campaignResourceName}'`;
  const [campaignRows, criteriaRows, customerRows, assetRows, keywordRows] = await Promise.all([
    customer.query(`SELECT campaign.network_settings.target_google_search, campaign.network_settings.target_search_network,
        campaign.network_settings.target_content_network, campaign.network_settings.target_partner_search_network,
        campaign.geo_target_type_setting.positive_geo_target_type, campaign.ai_max_setting.enable_ai_max,
        campaign.asset_automation_settings, campaign.keyword_match_type, campaign.target_spend.cpc_bid_ceiling_micros
      FROM campaign WHERE ${where}`),
    customer.query(`SELECT campaign_criterion.type, campaign_criterion.negative, campaign_criterion.bid_modifier,
        campaign_criterion.location.geo_target_constant, campaign_criterion.proximity.radius
      FROM campaign_criterion WHERE ${where}`),
    customer.query(`SELECT customer.call_reporting_setting.call_reporting_enabled,
        customer.call_reporting_setting.call_conversion_reporting_enabled, customer.call_reporting_setting.call_conversion_action
      FROM customer`),
    customer.query(`SELECT asset.call_asset.call_conversion_reporting_state, asset.call_asset.call_conversion_action
      FROM campaign_asset WHERE ${where} AND campaign_asset.field_type = 'CALL'`),
    customer.query(`SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.negative
      FROM ad_group_criterion WHERE ${where} AND ad_group_criterion.type = 'KEYWORD'`),
  ]);
  let callAction: CampaignSetupRows['callAction'];
  if (callConversionResourceName && RESOURCE.test(callConversionResourceName)) {
    const actionRows = await customer.query(`SELECT conversion_action.resource_name, conversion_action.type,
        conversion_action.primary_for_goal, conversion_action.phone_call_duration_seconds
      FROM conversion_action WHERE conversion_action.resource_name = '${callConversionResourceName}'`);
    callAction = (actionRows[0] as { conversion_action?: CampaignSetupRows['callAction'] } | undefined)?.conversion_action;
  }
  type Row = Record<string, unknown>;
  return {
    campaign: ((campaignRows[0] as Row | undefined)?.campaign ?? undefined) as CampaignSetupRows['campaign'],
    criteria: (criteriaRows as Row[]).map((r) => r.campaign_criterion).filter(Boolean) as CampaignSetupRows['criteria'],
    callReporting: ((customerRows[0] as Row | undefined)?.customer as { call_reporting_setting?: CampaignSetupRows['callReporting'] } | undefined)?.call_reporting_setting,
    callAssets: (assetRows as Row[]).map((r) => (r.asset as { call_asset?: CampaignSetupRows['callAssets'][number] } | undefined)?.call_asset).filter(Boolean) as CampaignSetupRows['callAssets'],
    callAction,
    keywords: (keywordRows as Row[]).map((r) => {
      const c = r.ad_group_criterion as { keyword?: { text?: string | null; match_type?: Num }; negative?: boolean | null } | undefined;
      return { text: c?.keyword?.text, match_type: c?.keyword?.match_type, negative: c?.negative };
    }),
  };
}
