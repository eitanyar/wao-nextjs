import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createDfsClient, estimateCost, canonicalJson, BudgetExceededError } from './dfs.mjs';
import { planStage1, scoreStage1 } from './stage1.mjs';
import { planPilot, scorePilot } from './stage2.mjs';
import { writeTable, writeJson } from './output.mjs';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

export function loadConfig(configDir) {
  const professions = readJson(path.join(configDir, 'professions.json')).professions;
  const areas = readJson(path.join(configDir, 'areas.json'));
  const run = readJson(path.join(configDir, 'run-config.json'));
  const runId = createHash('sha256').update(canonicalJson({ professions, areas: areas.regions, run })).digest('hex').slice(0, 12);
  return { professions, areas, run, runId };
}

export const STAGE1_PAIR_COLUMNS = ['value_rank', 'slug', 'trade_he', 'region', 'region_name', 'V_region', 'T_p_usd', 'M', 'value_usd', 'stage1_pass', 'advance', 'fail_reason', 'kit_level', 'run_id'];
export const STAGE1_CELL_COLUMNS = ['value_rank', 'slug', 'trade_he', 'region', 'city', 'city_he', 'ring', 'population', 'V_region', 'V_city_measured', 'V_cell', 'V_source', 'T_p_usd', 'M', 'value_usd', 'region_pass', 'region_advance', 'kit_level', 'flags', 'run_id'];
export const STAGE2_COLUMNS = ['rank', 'zoom', 'cell_id', 'expect', 'slug', 'trade_he', 'region', 'city', 'city_he', 'ring', 'V_region', 'V_cell', 'V_source', 'T_p_usd', 'M', 'value_usd', 'S3', 'S3_band', 'top3_s', 'W', 'P', 'pooled', 'kit_level', 'score', 'score_unkilled', 'kill_reason', 'flags', 'maps_items_t1', 'maps_items_t2', 'relevant_ranked', 'lf_overlap_top3', 'organic_local_pack', 'search_places_false_top20_overlap', 'run_id'];

async function execute(client, requests, workers = 4) {
  const queue = [...requests];
  let halted = null;
  async function worker() {
    while (queue.length && !halted) {
      const r = queue.shift();
      try {
        await client.call(r.endpoint, r.params);
      } catch (err) {
        halted = halted ?? err;
      }
    }
  }
  await Promise.all(Array.from({ length: workers }, worker));
  if (halted) throw halted;
}

export async function runEngine({ stage, configDir, cacheDir, outDir, privateDir, ledgerDir, cap, offline = false, estimateOnly = false, token, fetchImpl, log = () => {}, now = () => new Date() }) {
  const config = loadConfig(configDir);
  const { run, runId } = config;
  const stageKey = stage === '1' ? 'stage1' : stage === 'pilot' ? 'stage2-pilot' : null;
  if (!stageKey) throw new Error(`unknown stage ${stage} (use 1 or pilot)`);
  const configuredCap = run.caps_usd[stageKey];
  if (cap !== undefined && !(cap <= configuredCap)) throw new Error(`--cap ${cap} exceeds the approved ${stageKey} cap ${configuredCap}; caps are never raised from the CLI`);
  const capUsd = cap ?? configuredCap;

  const client = createDfsClient({ token, fetchImpl, cacheDir, capUsd, prices: run.prices_usd, rateLimits: run.rate_limits, offline, log, now });
  const requests = stage === '1' ? planStage1(config) : planPilot(config);
  const uncached = requests.filter(r => !client.has(r.endpoint, r.params));
  const estimateUsd = uncached.reduce((n, r) => n + estimateCost(r.endpoint, r.params, run.prices_usd), 0);
  const plan = { stage: stageKey, run_id: runId, requests: requests.length, uncached: uncached.length, estimate_usd: Math.round(estimateUsd * 1e6) / 1e6, cap_usd: capUsd };
  if (estimateOnly) return plan;

  const ledgerFile = path.join(ledgerDir, `${stageKey}-${now().toISOString().replace(/[:.]/g, '-')}.json`);
  const saveLedger = status => {
    if (!uncached.length && status === 'ok') return; // pure cache replay: nothing to record
    writeJson(ledgerFile, { ...plan, status, ...client.ledger });
  };
  if (!offline && estimateUsd > capUsd + 1e-9) {
    const err = new BudgetExceededError(`preflight: estimate $${estimateUsd.toFixed(4)} for ${uncached.length} uncached requests exceeds cap $${capUsd}; nothing was called`);
    err.ledger = plan;
    throw err;
  }
  try {
    await execute(client, uncached);
  } catch (err) {
    saveLedger(`halted: ${err.name}: ${err.message}`);
    err.ledger = { ...plan, spent_usd: client.ledger.spentUsd, network_calls: client.ledger.networkCalls };
    throw err;
  }
  saveLedger('ok');

  const get = (endpoint, params) => client.peek(endpoint, params);
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
    const pilot = scorePilot(config, get, stage1.cells);
    writeTable(outDir, 'stage2-pilot', tag(pilot.rows), STAGE2_COLUMNS, `Stage 2 pilot (run ${runId})`);
    writeJson(path.join(privateDir, 'stage2-pilot-businesses.json'), pilot.privateRows);
    outputs = { rows: pilot.rows.length, private_rows: pilot.privateRows.length };
  }
  return { ...plan, ...outputs, spent_usd: Math.round(client.ledger.spentUsd * 1e6) / 1e6, network_calls: client.ledger.networkCalls, cache_hits: requests.length - uncached.length };
}
