#!/usr/bin/env node
/**
 * READ-ONLY offline-conversion upload diagnostics (ads-bot-phase2 spec §3 0b / F4).
 *
 * For every customer that has a WAO CampaignConfig in data/campaigns/*.json (or the ids passed
 * with --customer), prints:
 *   1. conversion actions (type, category, origin, status, primary_for_goal, all-time
 *      conversions / all_conversions);
 *   2. offline_conversion_upload_conversion_action_summary (Google's per-action upload
 *      diagnostics: successful / failed event counts and the error reasons);
 *   3. offline_conversion_upload_client_summary (same, per upload client);
 *   4. customer_conversion_goal (which category/origin pairs are biddable).
 *
 * Only `customer.query()` (GAQL SELECT) is ever called — no mutate, no upload. Never writes a
 * file. Run:
 *   node scripts/google-ads-upload-diagnostics.mjs [--customer 1234567890[:test|:live]]...
 */
import fs from 'node:fs';
import path from 'node:path';
import { GoogleAdsApi } from 'google-ads-api';

const repoRoot = process.cwd();

function loadEnvLocal() {
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvLocal();

function targetsFromArgs() {
  const out = [];
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--customer' && argv[i + 1]) {
      const [customerId, mode = 'live'] = argv[i + 1].split(':');
      out.push({ customerId: customerId.replace(/-/g, ''), mode, slug: '(cli)' });
      i += 1;
    }
  }
  return out;
}

function targetsFromCampaignConfigs() {
  const dir = path.join(repoRoot, 'data', 'campaigns');
  const seen = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const config = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (!config.customerId || seen.has(config.customerId)) continue;
    seen.set(config.customerId, {
      customerId: String(config.customerId).replace(/-/g, ''),
      mode: config.mode === 'test' ? 'test' : 'live',
      slug: config.slug,
      verified: config.verifiedLeadConversionResourceName || null,
      closed: config.closedDealConversionResourceName || null,
    });
  }
  return [...seen.values()];
}

function accountFor(mode) {
  // The test MCC is reachable with the main refresh token when no dedicated test token exists.
  const refreshToken = mode === 'test'
    ? (process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN || process.env.GOOGLE_ADS_REFRESH_TOKEN)
    : process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const mccId = (mode === 'test' ? process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID : process.env.GOOGLE_ADS_MCC_CUSTOMER_ID)?.replace(/-/g, '');
  return { refreshToken, mccId };
}

function errText(err) {
  if (err?.errors?.length) return err.errors.map((e) => `${JSON.stringify(e.error_code)} ${e.message}`).join('; ');
  return err instanceof Error ? err.message : String(err);
}

const QUERIES = {
  conversion_actions: `
    SELECT conversion_action.resource_name, conversion_action.name, conversion_action.type,
      conversion_action.category, conversion_action.origin, conversion_action.status,
      conversion_action.primary_for_goal
    FROM conversion_action`,
  // Google-recorded conversions per action since 2026-07-01 (all_conversions includes
  // secondary actions; conversions only primary ones).
  conversions_by_action: `
    SELECT segments.conversion_action, segments.conversion_action_name,
      metrics.all_conversions, metrics.conversions
    FROM customer
    WHERE segments.date BETWEEN '2026-07-01' AND '${new Date().toISOString().slice(0, 10)}'`,
  upload_action_summary: `
    SELECT offline_conversion_upload_conversion_action_summary.conversion_action_name,
      offline_conversion_upload_conversion_action_summary.client,
      offline_conversion_upload_conversion_action_summary.status,
      offline_conversion_upload_conversion_action_summary.total_event_count,
      offline_conversion_upload_conversion_action_summary.successful_event_count,
      offline_conversion_upload_conversion_action_summary.pending_event_count,
      offline_conversion_upload_conversion_action_summary.last_upload_date_time,
      offline_conversion_upload_conversion_action_summary.daily_summaries,
      offline_conversion_upload_conversion_action_summary.job_summaries,
      offline_conversion_upload_conversion_action_summary.alerts
    FROM offline_conversion_upload_conversion_action_summary`,
  upload_client_summary: `
    SELECT offline_conversion_upload_client_summary.client,
      offline_conversion_upload_client_summary.status,
      offline_conversion_upload_client_summary.total_event_count,
      offline_conversion_upload_client_summary.successful_event_count,
      offline_conversion_upload_client_summary.success_rate,
      offline_conversion_upload_client_summary.pending_event_count,
      offline_conversion_upload_client_summary.last_upload_date_time,
      offline_conversion_upload_client_summary.alerts
    FROM offline_conversion_upload_client_summary`,
  customer_conversion_goals: `
    SELECT customer_conversion_goal.category, customer_conversion_goal.origin, customer_conversion_goal.biddable
    FROM customer_conversion_goal`,
};

async function main() {
  const { GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN } = process.env;
  if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_DEVELOPER_TOKEN) {
    console.error('Google Ads API credentials not configured');
    process.exit(1);
  }
  const client = new GoogleAdsApi({ client_id: GOOGLE_ADS_CLIENT_ID, client_secret: GOOGLE_ADS_CLIENT_SECRET, developer_token: GOOGLE_ADS_DEVELOPER_TOKEN });
  const cliTargets = targetsFromArgs();
  const targets = cliTargets.length ? cliTargets : targetsFromCampaignConfigs();

  for (const target of targets) {
    const { refreshToken, mccId } = accountFor(target.mode);
    console.log(`\n==== customer ${target.customerId} (${target.mode}, slug ${target.slug}) via MCC ${mccId}`);
    if (target.verified !== undefined) console.log(`  config verified-lead: ${target.verified}\n  config closed-deal:   ${target.closed}`);
    if (!refreshToken || !mccId) {
      console.log('  SKIP: credentials missing for this mode');
      continue;
    }
    const customer = client.Customer({ customer_id: target.customerId, login_customer_id: mccId, refresh_token: refreshToken });
    for (const [label, query] of Object.entries(QUERIES)) {
      try {
        const rows = await customer.query(query);
        console.log(`  -- ${label}: ${rows.length} row(s)`);
        for (const row of rows) console.log('    ' + JSON.stringify(row));
      } catch (err) {
        console.log(`  -- ${label}: ERROR ${errText(err)}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(errText(err));
  process.exit(1);
});
