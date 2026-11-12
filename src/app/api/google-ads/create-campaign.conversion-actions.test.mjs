import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const routePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'create-campaign', 'route.ts');
const route = fs.readFileSync(routePath, 'utf8');

test('uses qualified and converted lead categories for new offline conversion actions', () => {
  const verifiedLead = route.match(/name: 'ליד מאומת',[\s\S]*?category: enums\.ConversionActionCategory\.(\w+)/);
  const closedDeal = route.match(/name: 'עסקה סגורה',[\s\S]*?category: enums\.ConversionActionCategory\.(\w+)/);

  assert.equal(verifiedLead?.[1], 'QUALIFIED_LEAD');
  assert.equal(closedDeal?.[1], 'CONVERTED_LEAD');
});

test('uses the required Maximize Clicks and EU political advertising campaign fields', () => {
  const campaign = route.match(/const campaignRes = await newCustomer\.campaigns\.create\(\[\{([\s\S]*?)\}\]\);/);

  assert.match(campaign?.[1] || '', /target_spend:\s*\{\s*cpc_bid_ceiling_micros:\s*cpcCapMicros\s*\}/);
  assert.match(route, /const cpcCapIls = cpcCapIlsForNiche\(collectedData\.businessNiche\);/);
  assert.match(campaign?.[1] || '', /contains_eu_political_advertising:\s*enums\.EuPoliticalAdvertisingStatus\.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING/);
  assert.doesNotMatch(campaign?.[1] || '', /bidding_strategy_type:/);
});

// ── Dror create-campaign triage 2026-11-12 (fixes 1-4) + batch-A AI Max guard ──

const campaignBlock = route.match(/const campaignRes = await newCustomer\.campaigns\.create\(\[\{([\s\S]*?)\}\]\);/)?.[1] || '';
const accountCreateAt = route.indexOf('mccCustomer.customers.createCustomerClient(');

test('fix 1: location targets resolved and blocked BEFORE the account exists; PRESENCE; no hard-coded Israel', () => {
  const geoAt = route.indexOf('const geo = await resolveGeoTargeting(');
  const blockAt = route.indexOf("error: 'location_targeting_unresolved'");
  assert.ok(geoAt > 0 && blockAt > geoAt && accountCreateAt > blockAt, 'geo resolve + 4xx block precede step 1');
  assert.match(route, /locale: 'he', country_code: 'IL'/);
  assert.match(route, /\{ status: 422 \}/);
  assert.match(campaignBlock, /geo_target_type_setting: buildGeoTargetTypeSetting\(\)/);
  assert.match(route, /campaignCriteria\.create\(buildLocationCriteria\(campaignResourceName, geo\.targets\)\)/);
  assert.doesNotMatch(route, /geoTargetConstants\/2376/);
  assert.match(route, /geoTargeting: summarizeGeoTargets\(geo\)/);
});

test('fix 2: AD_CALL secondary 60s action, call asset reports to it at resource level, call reporting on', () => {
  const block = route.slice(route.indexOf('newCustomer.conversionActions.create(['), route.indexOf('const verifiedLeadConversionResourceName'));
  assert.match(block, /type: enums\.ConversionActionType\.AD_CALL/);
  assert.match(block, /phone_call_duration_seconds: CALL_CONVERSION_MIN_SECONDS/);
  assert.match(route, /const CALL_CONVERSION_MIN_SECONDS = 60;/);
  assert.match(block, /value_settings: \{ default_value: 0, always_use_default_value: true \}/);
  assert.match(route, /results\[3\]\?\.resource_name[\s\S]*results\[4\]\?\.resource_name[\s\S]*results\[5\]\?\.resource_name/);
  assert.match(route, /call_conversion_reporting_state: enums\.CallConversionReportingState\.USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION,\s*call_conversion_action: callConversionResourceName/);
  assert.match(route, /call_reporting_enabled: true,\s*call_conversion_reporting_enabled: true/);
  assert.match(route, /configureVerifiedLeadOnlyGoals\(newCustomer, campaignResourceName, verifiedLeadConversionResourceName\)/);
});

test('fix 3: strategy validated before readiness and step 1; normalized keywords; negatives default; Search Partners off', () => {
  const validateAt = route.indexOf('validateCampaignStrategy(strategy)');
  assert.ok(validateAt > 0 && validateAt < route.indexOf('evaluatePaidSearchReadiness(') && validateAt < accountCreateAt);
  assert.match(route, /keyword: \{ text: kw\.text, match_type: kw\.matchType === 'EXACT' \? enums\.KeywordMatchType\.EXACT : enums\.KeywordMatchType\.PHRASE \}/);
  assert.match(route, /\.\.\.normalizedNegatives\.map\(/);
  assert.doesNotMatch(route, /strategy\.negativeKeywords\.map/);
  assert.match(campaignBlock, /target_search_network: false/);
});

test('AI Max guard: AI Max off, text + final URL automation opted out, no campaign broad match, no bid modifiers', () => {
  assert.match(campaignBlock, /ai_max_setting: \{ enable_ai_max: false \}/);
  assert.match(campaignBlock, /AssetAutomationType\.TEXT_ASSET_AUTOMATION, asset_automation_status: enums\.AssetAutomationStatus\.OPTED_OUT/);
  assert.match(campaignBlock, /AssetAutomationType\.FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION, asset_automation_status: enums\.AssetAutomationStatus\.OPTED_OUT/);
  assert.doesNotMatch(campaignBlock, /keyword_match_type:/);
  assert.doesNotMatch(route, /bid_modifier/);
  assert.match(route, /evaluateCampaignSetup\(/);
});

test('bot fallback strategy has no negativeKeywords (route defaults them) and fix-4 prompt drift is gone', () => {
  const bot = fs.readFileSync(path.join(path.dirname(routePath), '..', '..', 'bot', 'route.ts'), 'utf8');
  const fallback = bot.slice(bot.indexOf('function generateFallbackStrategyAndCopy'), bot.indexOf('// ── Turn questions for simulation'));
  assert.ok(fallback.length > 0);
  assert.doesNotMatch(fallback, /negativeKeywords/);
  assert.doesNotMatch(bot, /Local Services Ads/);
  const prompts = fs.readFileSync(path.join(path.dirname(routePath), '..', '..', '..', '..', 'lib', 'bot', 'prompts.ts'), 'utf8');
  for (const gone of [/auto-switches/, /Manual CPC/, /avgJobValue × closeRate × 0\.3/, /LOCKSMITH REDIRECT RULE/, /Local Services Ads/, /9\.9/]) assert.doesNotMatch(prompts, gone);
  const rows = prompts.split('\n').filter((l) => /^\| .+\|\s*[\d,]+\s*\|\s*[\d,]+\s*\|\s*\d+\s*\|$/.test(l));
  assert.ok(rows.length >= 15);
  for (const row of rows) {
    const [, , min, rec] = row.split('|').map((c) => Number(c.trim().replace(/,/g, '')));
    assert.ok(min >= 1500 && rec >= min, row);
  }
});
