#!/usr/bin/env node
/**
 * Verified-lead-only conversion goals for EXISTING accounts (ads-bot-phase2 spec §3 0a).
 *
 * For one named client, for every WAO-created Google Ads account bound to it
 * (data/clients/<id>/google-ads.json → data/campaigns/<slug>.json):
 *   - conversion_action.primary_for_goal: true only on the configured verified-lead action;
 *   - customer_conversion_goal / campaign_conversion_goal: biddable only for QUALIFIED_LEAD.
 * Accounts are refused (left untouched) when they have no configured verified-lead action or
 * carry enabled conversion actions outside the five WAO ones — that is a founder-managed
 * account whose own goals this must never switch off.
 *
 * Modes (dry run is the default and never writes anything, locally or at Google):
 *   --client <id>        required
 *   (default)            dry run: GAQL reads only, prints the plan
 *   --validate-only      also sends the plan with validate_only=true (Google checks it, changes nothing)
 *   --apply              mutates, reads back, records lastGoalChangeAt in
 *                        <clientsDir>/<id>/tasks/google-ads/bidding-phase.json
 *   --confirm-live       additionally required for --apply on a live (non-test) account
 *   --state-fixture <f>  dry run against a JSON fixture instead of Google (no credentials, no
 *                        network): { "<customerId>": { "conversion_action": [...],
 *                        "customer_conversion_goal": [...], "campaign_conversion_goal": [...] } }
 *                        Refused together with --apply / --validate-only.
 *
 * An --apply on an account that is already verified-lead-only records `signalIntegritySince`
 * (soak start) without a goal change. Directory overrides (tests / fixtures): WAO_CLIENTS_DIR,
 * WAO_CAMPAIGNS_DIR.
 *
 * Example: node scripts/google-ads-verified-lead-goal-backfill.mjs --client google-ads-sandbox
 */
import fs from 'node:fs';
import path from 'node:path';
import { GoogleAdsApi } from 'google-ads-api';
import {
  applyVerifiedLeadOnlyGoals,
  goalBackfillRefusals,
  planVerifiedLeadOnlyGoals,
  readConversionGoalState,
} from '../src/lib/google-ads/conversion-goals.js';
import { recordGoalChange, recordSignalIntegrity } from '../src/lib/google-ads/bidding-phase-state.js';

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

function parseArgs(argv) {
  const args = { client: null, apply: false, validateOnly: false, confirmLive: false, stateFixture: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--client') { args.client = argv[i + 1] ?? null; i += 1; }
    else if (a === '--apply') args.apply = true;
    else if (a === '--validate-only') args.validateOnly = true;
    else if (a === '--confirm-live') args.confirmLive = true;
    else if (a === '--state-fixture') { args.stateFixture = argv[i + 1] ?? null; i += 1; if (!args.stateFixture) throw new Error('--state-fixture needs a file'); }
    else if (a === '--dry-run') { /* default */ }
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.client || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(args.client)) throw new Error('--client <id> is required');
  if (args.apply && args.validateOnly) throw new Error('--apply and --validate-only are exclusive');
  if (args.stateFixture && (args.apply || args.validateOnly)) throw new Error('--state-fixture is dry-run only');
  return args;
}

function clientsDir() {
  const override = process.env.WAO_CLIENTS_DIR?.trim();
  return override ? path.resolve(override) : path.join(repoRoot, 'data', 'clients');
}

function campaignsDir() {
  const override = process.env.WAO_CAMPAIGNS_DIR?.trim();
  return override ? path.resolve(override) : path.join(repoRoot, 'data', 'campaigns');
}

/** A read-only stand-in for a google-ads-api Customer, answering GAQL from a fixture. */
function fixtureCustomer(fixture, customerId) {
  const state = fixture[customerId];
  if (!state) throw new Error(`state fixture has no customer ${customerId}`);
  return {
    query: async (gaql) => {
      const resource = gaql.match(/FROM\s+(\w+)/)?.[1];
      if (!resource || !Array.isArray(state[resource])) throw new Error(`state fixture has no ${resource} rows`);
      return state[resource].map((row) => ({ [resource]: row }));
    },
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function accountFor(mode) {
  const refreshToken = mode === 'test'
    ? (process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN || process.env.GOOGLE_ADS_REFRESH_TOKEN)
    : process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const mccId = (mode === 'test' ? process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID : process.env.GOOGLE_ADS_MCC_CUSTOMER_ID)?.replace(/-/g, '');
  if (!refreshToken || !mccId) throw new Error(`Google Ads ${mode} credentials missing`);
  return { refreshToken, mccId };
}

function errText(err) {
  if (err?.errors?.length) return err.errors.map((e) => `${JSON.stringify(e.error_code)} ${e.message}`).join('; ');
  return err instanceof Error ? err.message : String(err);
}

function printPlan(plan) {
  const total = plan.actions.length + plan.customerGoals.length + plan.campaignGoals.length;
  console.log(`  plan: ${plan.actions.length} action(s), ${plan.customerGoals.length} customer goal(s), ${plan.campaignGoals.length} campaign goal(s)`);
  for (const op of plan.actions) console.log(`    action   ${op.resource_name} (category ${op.category}) primary_for_goal ${op.from} -> ${op.primary_for_goal}`);
  for (const op of plan.customerGoals) console.log(`    customer ${op.resource_name} biddable ${op.from} -> ${op.biddable}`);
  for (const op of plan.campaignGoals) console.log(`    campaign ${op.resource_name} biddable ${op.from} -> ${op.biddable}`);
  return total;
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  const modeLabel = args.apply ? 'APPLY' : args.validateOnly ? 'VALIDATE-ONLY (no change)' : 'DRY RUN (no change)';
  console.log(`verified-lead goal backfill — client ${args.client} — ${modeLabel}`);

  const indexPath = path.join(clientsDir(), args.client, 'google-ads.json');
  if (!fs.existsSync(indexPath)) throw new Error(`No google-ads.json for client ${args.client}`);
  const index = readJson(indexPath);

  const fixture = args.stateFixture ? readJson(path.resolve(args.stateFixture)) : null;
  let api = null;
  if (!fixture) {
    const { GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN } = process.env;
    if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_DEVELOPER_TOKEN) throw new Error('Google Ads API credentials not configured');
    api = new GoogleAdsApi({ client_id: GOOGLE_ADS_CLIENT_ID, client_secret: GOOGLE_ADS_CLIENT_SECRET, developer_token: GOOGLE_ADS_DEVELOPER_TOKEN });
  } else {
    console.log(`state fixture: ${args.stateFixture} (no Google calls)`);
  }

  const seen = new Set();
  let failures = 0;
  for (const link of index.campaigns ?? []) {
    const configPath = path.join(campaignsDir(), `${link.slug}.json`);
    if (!fs.existsSync(configPath)) { console.log(`\n-- ${link.slug}: no campaign config, skipped`); continue; }
    const config = readJson(configPath);
    const customerId = String(config.customerId).replace(/-/g, '');
    if (seen.has(customerId)) continue;
    seen.add(customerId);
    const mode = config.mode === 'test' ? 'test' : 'live';
    console.log(`\n-- customer ${customerId} (${mode}, slug ${config.slug})`);

    try {
      let customer;
      if (fixture) {
        customer = fixtureCustomer(fixture, customerId);
      } else {
        const { refreshToken, mccId } = accountFor(mode);
        customer = api.Customer({ customer_id: customerId, login_customer_id: mccId, refresh_token: refreshToken });
      }
      const state = await readConversionGoalState(customer);
      const refusals = goalBackfillRefusals(state.actions, config.verifiedLeadConversionResourceName);
      if (refusals.length) {
        for (const r of refusals) console.log(`  REFUSED: ${r}`);
        continue;
      }
      const plan = planVerifiedLeadOnlyGoals(state, config.verifiedLeadConversionResourceName);
      const total = printPlan(plan);
      if (!total) {
        console.log('  already verified-lead-only; nothing to do');
        // No goal change, but step 0 is now confirmed for this account: start its soak.
        if (args.apply && (mode !== 'live' || args.confirmLive)) {
          const recorded = recordSignalIntegrity({ clientId: args.client, baseDir: clientsDir(), at: new Date().toISOString(), customerId, source: 'verified-lead-goal-backfill' });
          console.log(recorded ? `  signalIntegritySince ${recorded.signalIntegritySince}` : '  WARNING: bidding-phase.json write failed');
        }
        continue;
      }

      if (args.validateOnly) {
        await applyVerifiedLeadOnlyGoals(customer, plan, { validateOnly: true });
        console.log('  validate_only: Google accepted the plan (nothing changed)');
        continue;
      }
      if (!args.apply) continue;
      if (mode === 'live' && !args.confirmLive) { console.log('  SKIPPED: live account needs --confirm-live'); continue; }

      const applied = await applyVerifiedLeadOnlyGoals(customer, plan);
      console.log(`  applied: ${JSON.stringify(applied)}`);
      const after = planVerifiedLeadOnlyGoals(await readConversionGoalState(customer), config.verifiedLeadConversionResourceName);
      const remaining = after.actions.length + after.customerGoals.length + after.campaignGoals.length;
      if (remaining) {
        failures += 1;
        console.log('  READ-BACK MISMATCH:');
        printPlan(after);
        continue;
      }
      const recorded = recordGoalChange({ clientId: args.client, baseDir: clientsDir(), at: new Date().toISOString(), customerId, source: 'verified-lead-goal-backfill' });
      console.log(recorded ? `  recorded lastGoalChangeAt ${recorded.lastGoalChangeAt}` : '  WARNING: bidding-phase.json write failed');
    } catch (err) {
      failures += 1;
      console.log(`  ERROR: ${errText(err)}`);
    }
  }
  if (failures) process.exitCode = 1;
}

main().catch((err) => {
  console.error(errText(err));
  process.exit(1);
});
