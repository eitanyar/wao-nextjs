import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createDfsClient, estimateCost, canonicalJson, BudgetExceededError } from './dfs.mjs';
import { planStage1, scoreStage1 } from './stage1.mjs';
import { planStep1, planStep2, step1Gate, scorePilot } from './stage2.mjs';
import { homepageCache, runHomepageChecks } from './homepage.mjs';
import { writeTable, writeJson } from './output.mjs';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

export function loadConfig(configDir) {
  const professions = readJson(path.join(configDir, 'professions.json')).professions;
  const areas = readJson(path.join(configDir, 'areas.json'));
  const run = readJson(path.join(configDir, 'run-config.json'));
  const runId = createHash('sha256').update(canonicalJson({ professions, areas: areas.regions, run })).digest('hex').slice(0, 12);
  return { professions, areas, run, runId };
}

export const STAGE1_PAIR_COLUMNS = ['value_rank', 'slug', 'trade_he', 'region', 'region_name', 'V_region', 'T_p_usd', 'M', 'value_usd', 'stage1_pass', 'advance', 'fail_reason', 'kit_level', 'urgency_lead_gen', 'run_id'];
export const STAGE1_CELL_COLUMNS = ['value_rank', 'slug', 'trade_he', 'region', 'city', 'city_he', 'ring', 'population', 'V_region', 'V_city_measured', 'V_cell', 'V_source', 'T_p_usd', 'M', 'value_usd', 'region_pass', 'region_advance', 'kit_level', 'urgency_lead_gen', 'flags', 'run_id'];
export const STAGE2_COLUMNS = ['rank', 'cell_id', 'expect', 'slug', 'trade_he', 'region', 'city', 'city_he', 'ring', 'urgency_lead_gen', 'V_region', 'V_cell', 'V_source', 'T_p_usd', 'M', 'value_usd', 'region_pass', 'region_advance',
  'stopped_at', 'maps_bought', 'S3_step1', 'S3', 'S3_band', 'top3_s', 'lf_top3_joined', 'lf_top3_paid', 'W', 'P', 'P_w', 'pooled', 'L_share', 'D_share', 'O', 'organic_counted', 'organic_unresolved', 'has_ai_overview',
  'kit_level', 'score', 'score_unkilled', 'kill_reason', 'flags', 'lf_pack_overlap', 'lead_gen_listings', 'homepage_checked', 'homepage_errors', 'maps_items_t1', 'maps_items_t2', 'relevant_ranked', 'run_id'];

async function execute(client, requests, workers = 4) {
  const queue = [...requests];
  let halted = null;
  async function worker() {
    while (queue.length && !halted) {
      const r = queue.shift();
      try {
        await client.call(r.endpoint, r.params, r.minSchema);
      } catch (err) {
        halted = halted ?? err;
      }
    }
  }
  await Promise.all(Array.from({ length: workers }, worker));
  if (halted) throw halted;
}

// siteFetchImpl: the HTTP client for the free R8 homepage check. null (the default) = the check is
// not run (prospects weigh 1.00 "unchecked") - tests and replays never touch the open web.
export async function runEngine({ stage, configDir, cacheDir, outDir, privateDir, ledgerDir, cap, offline = false, estimateOnly = false, token, fetchImpl, siteFetchImpl = null, log = () => {}, now = () => new Date() }) {
  const config = loadConfig(configDir);
  const { run, runId } = config;
  const stageKey = stage === '1' ? 'stage1' : stage === 'pilot' ? 'stage2-pilot' : null;
  if (!stageKey) throw new Error(`unknown stage ${stage} (use 1 or pilot)`);
  const configuredCap = run.caps_usd[stageKey];
  if (cap !== undefined && !(cap <= configuredCap)) throw new Error(`--cap ${cap} exceeds the approved ${stageKey} cap ${configuredCap}; caps are never raised from the CLI`);
  const capUsd = cap ?? configuredCap;

  const client = createDfsClient({ token, fetchImpl, cacheDir, capUsd, prices: run.prices_usd, rateLimits: run.rate_limits, offline, log, now, organicFields: run.stage2.organic_store_fields });
  const isUncached = r => !client.has(r.endpoint, r.params, r.minSchema);
  const costOf = list => list.reduce((n, r) => n + estimateCost(r.endpoint, r.params, run.prices_usd), 0);
  const round6 = x => Math.round(x * 1e6) / 1e6;
  // Pilot = two steps. Step 2 (Maps) is only bought for step-1 survivors, which are unknown before
  // step 1 runs, so the preflight prices the worst case: every cell survives.
  const step1 = stage === '1' ? planStage1(config) : planStep1(config);
  const step2Worst = stage === '1' ? [] : planStep2(config, run.pilot.cells.map(c => c.id));
  const requests = [...step1, ...step2Worst];
  const uncached = requests.filter(isUncached);
  const uncached1 = step1.filter(isUncached);
  const estimateUsd = costOf(uncached);
  const plan = { stage: stageKey, run_id: runId, requests: requests.length, uncached: uncached.length, estimate_usd: round6(estimateUsd), cap_usd: capUsd };
  if (stage !== '1') Object.assign(plan, { step1_uncached: uncached1.length, step1_estimate_usd: round6(costOf(uncached1)), step2_worst_case_uncached: uncached.length - uncached1.length });
  if (estimateOnly) return plan;

  const ledgerFile = path.join(ledgerDir, `${stageKey}-${now().toISOString().replace(/[:.]/g, '-')}.json`);
  const saveLedger = status => {
    if (!client.ledger.networkCalls && status === 'ok') return; // pure cache replay: nothing to record
    writeJson(ledgerFile, { ...plan, status, ...client.ledger });
  };
  if (!offline && estimateUsd > capUsd + 1e-9) {
    const err = new BudgetExceededError(`preflight: estimate $${estimateUsd.toFixed(4)} for ${uncached.length} uncached requests exceeds cap $${capUsd}; nothing was called`);
    err.ledger = plan;
    throw err;
  }
  let step2Bought = [];
  try {
    await execute(client, uncached1);
    if (stage !== '1') {
      const gate = step1Gate(config, (e, p, m) => client.peek(e, p, m));
      if (gate.missing.length) throw new Error(`step 1 inputs missing after fetch: ${gate.missing.join(', ')}`);
      const step2 = planStep2(config, gate.survivors);
      step2Bought = step2.filter(isUncached);
      plan.step1_survivors = gate.survivors;
      log(`step 1: survivors ${gate.survivors.join(',') || 'none'} (killed before Maps: ${gate.cells.filter(c => !c.survives).map(c => c.cell.id).join(',') || 'none'})`);
      await execute(client, step2Bought);
    }
  } catch (err) {
    saveLedger(`halted: ${err.name}: ${err.message}`);
    err.ledger = { ...plan, spent_usd: client.ledger.spentUsd, network_calls: client.ledger.networkCalls };
    throw err;
  }
  saveLedger('ok');

  const get = (endpoint, params, minSchema) => client.peek(endpoint, params, minSchema);
  let stage1;
  try {
    stage1 = scoreStage1(config, get);
  } catch (err) {
    if (stage === '1' || !err.missing) throw err;
    stage1 = { cells: null }; // pilot without a Stage-1 cache: value columns stay empty
  }
  const tag = rows => rows.map(r => ({ ...r, run_id: runId }));
  let outputs;
  if (stage === '1') {
    writeTable(outDir, 'stage1-pairs', tag(stage1.pairs), STAGE1_PAIR_COLUMNS, `Stage 1 - profession x region pairs (run ${runId})`);
    writeTable(outDir, 'stage1-cells', tag(stage1.cells), STAGE1_CELL_COLUMNS, `Stage 1 - top 50 profession x city cells (run ${runId})`, 50);
    writeJson(path.join(outDir, 'stage1-diagnostics.json'), { run_id: runId, ...stage1.diagnostics });
    outputs = { pairs: stage1.pairs.length, cells: stage1.cells.length, advancing: stage1.pairs.filter(p => p.advance).length };
  } else {
    // Pass 1 finds the hosts that need the free homepage check; pass 2 scores with the results.
    const hc = run.homepage_check;
    const siteCache = hc?.enabled ? homepageCache(cacheDir, hc, now) : null;
    let homepageFetched = 0;
    let pilot = scorePilot(config, get, stage1.cells);
    if (siteCache) {
      siteCache.purge();
      if (siteFetchImpl && !offline) homepageFetched = await runHomepageChecks(pilot.hostsNeeded, { cache: siteCache, fetchImpl: siteFetchImpl, cfg: hc, now, log });
      const checks = new Map(pilot.hostsNeeded.map(h => [h, siteCache.get(h)]).filter(([, v]) => v));
      pilot = scorePilot(config, get, stage1.cells, checks);
    }
    writeTable(outDir, 'stage2-pilot', tag(pilot.rows), STAGE2_COLUMNS, `Stage 2 pilot (run ${runId})`);
    writeJson(path.join(outDir, 'stage2-category-diagnostics.json'), { run_id: runId, note: 'R4: per cell, every top-20 Maps category text that matched no rule (append-only rule extensions: Yonatan)', cells: pilot.categoryDiagnostics });
    writeJson(path.join(outDir, 'stage2-proximity.json'), { run_id: runId, ...pilot.proximity });
    writeJson(path.join(privateDir, 'stage2-pilot-businesses.json'), pilot.privateRows);
    writeJson(path.join(privateDir, 'stage2-organic-rows.json'), pilot.organicRows);
    outputs = { rows: pilot.rows.length, private_rows: pilot.privateRows.length, step1_gate: pilot.gate, maps_calls_bought: step2Bought.length, homepage_hosts: pilot.hostsNeeded.length, homepage_fetched: homepageFetched };
  }
  return { ...plan, ...outputs, spent_usd: Math.round(client.ledger.spentUsd * 1e6) / 1e6, network_calls: client.ledger.networkCalls, cache_hits: requests.length - uncached.length };
}
