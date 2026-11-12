import assert from 'node:assert/strict';
import test from 'node:test';
import { enums } from 'google-ads-api';
import { evaluateCampaignSetup, readCampaignSetup, type CampaignSetupRows, type CampaignSetupExpectation } from './campaign-setup-readback';

const CALL = 'customers/1/conversionActions/66';
const expected: CampaignSetupExpectation = {
  geoTargetConstants: ['geoTargetConstants/1007975', 'geoTargetConstants/1007974'],
  proximityCount: 0,
  remote: false,
  callConversionResourceName: CALL,
  expectCallAsset: true,
  cpcCapMicros: 20_000_000,
};

function goodRows(): CampaignSetupRows {
  return {
    campaign: {
      network_settings: { target_google_search: true, target_search_network: false, target_content_network: false, target_partner_search_network: false },
      geo_target_type_setting: { positive_geo_target_type: enums.PositiveGeoTargetType.PRESENCE },
      ai_max_setting: { enable_ai_max: false },
      asset_automation_settings: [
        { asset_automation_type: enums.AssetAutomationType.TEXT_ASSET_AUTOMATION, asset_automation_status: enums.AssetAutomationStatus.OPTED_OUT },
        { asset_automation_type: enums.AssetAutomationType.FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION, asset_automation_status: enums.AssetAutomationStatus.OPTED_OUT },
      ],
      keyword_match_type: 0,
      target_spend: { cpc_bid_ceiling_micros: 20_000_000 },
    },
    criteria: [
      { type: enums.CriterionType.LOCATION, location: { geo_target_constant: 'geoTargetConstants/1007975' } },
      { type: enums.CriterionType.LOCATION, location: { geo_target_constant: 'geoTargetConstants/1007974' } },
    ],
    callReporting: { call_reporting_enabled: true, call_conversion_reporting_enabled: true, call_conversion_action: CALL },
    callAssets: [{ call_conversion_reporting_state: enums.CallConversionReportingState.USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION, call_conversion_action: CALL }],
    callAction: { resource_name: CALL, type: enums.ConversionActionType.AD_CALL, primary_for_goal: false, phone_call_duration_seconds: 60 },
    keywords: [
      { text: 'plumber haifa', match_type: enums.KeywordMatchType.EXACT },
      { text: 'plumber', match_type: enums.KeywordMatchType.PHRASE },
      { text: 'free', match_type: enums.KeywordMatchType.BROAD, negative: true },
    ],
  };
}

test('a correct setup passes every check', () => {
  const v = evaluateCampaignSetup(goodRows(), expected);
  assert.deepEqual(v.issues, []);
  assert.equal(v.ok, true);
});

test('each regression is caught by its named check', () => {
  const cases: Array<[string, (r: CampaignSetupRows) => void]> = [
    ['locations_match_sent', (r) => r.criteria.push({ location: { geo_target_constant: 'geoTargetConstants/2376' } })],
    ['no_all_israel_for_local', (r) => { r.criteria = [{ location: { geo_target_constant: 'geoTargetConstants/2376' } }]; }],
    ['presence_only', (r) => { r.campaign!.geo_target_type_setting = { positive_geo_target_type: enums.PositiveGeoTargetType.PRESENCE_OR_INTEREST }; }],
    ['no_positive_bid_adjustments', (r) => { r.criteria[0].bid_modifier = 1.2; }],
    ['search_partners_off', (r) => { r.campaign!.network_settings!.target_search_network = true; }],
    ['cpc_cap_matches_trade', (r) => { r.campaign!.target_spend = { cpc_bid_ceiling_micros: 15_000_000 }; }],
    ['ai_max_off', (r) => { r.campaign!.ai_max_setting = { enable_ai_max: true }; }],
    ['asset_automation_opted_out', (r) => { r.campaign!.asset_automation_settings![0].asset_automation_status = enums.AssetAutomationStatus.OPTED_IN; }],
    ['no_campaign_broad_match', (r) => { r.campaign!.keyword_match_type = enums.CampaignKeywordMatchType.BROAD; }],
    ['call_reporting_on', (r) => { r.callReporting = { call_reporting_enabled: false }; }],
    ['call_asset_points_to_call_action', (r) => { r.callAssets = [{ call_conversion_reporting_state: enums.CallConversionReportingState.DISABLED }]; }],
    ['call_action_secondary_ad_call', (r) => { r.callAction = { ...r.callAction, primary_for_goal: true }; }],
    ['keywords_plain_exact_or_phrase', (r) => { r.keywords[0] = { text: '[plumber]', match_type: enums.KeywordMatchType.EXACT }; }],
    ['keywords_plain_exact_or_phrase', (r) => { r.keywords[1] = { text: 'plumber', match_type: enums.KeywordMatchType.BROAD }; }],
  ];
  for (const [check, mutate] of cases) {
    const rows = goodRows();
    mutate(rows);
    const v = evaluateCampaignSetup(rows, expected);
    assert.equal(v.ok, false, check);
    assert.equal(v.checks[check], false, check);
  }
});

test('remote may target Israel; a storefront radius counts as its proximity criterion', () => {
  const remote = goodRows();
  remote.criteria = [{ location: { geo_target_constant: 'geoTargetConstants/2376' } }];
  assert.equal(evaluateCampaignSetup(remote, { ...expected, remote: true, geoTargetConstants: ['geoTargetConstants/2376'] }).ok, true);
  const store = goodRows();
  store.criteria = [{ proximity: { radius: 10 } }];
  assert.equal(evaluateCampaignSetup(store, { ...expected, geoTargetConstants: [], proximityCount: 1 }).ok, true);
});

test('readCampaignSetup only SELECTs and refuses a malformed resource name', async () => {
  const queries: string[] = [];
  const customer = { query: async (q: string) => { queries.push(q); return []; } };
  await readCampaignSetup(customer, 'customers/1/campaigns/2', CALL);
  assert.equal(queries.length, 6);
  assert.ok(queries.every((q) => /^\s*SELECT /.test(q)));
  await assert.rejects(() => readCampaignSetup(customer, "customers/1/campaigns/2' OR 1=1", null));
});
