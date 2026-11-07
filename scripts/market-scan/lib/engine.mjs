import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createDfsClient, estimateCost, canonicalJson, BudgetExceededError } from './dfs.mjs';
import { planStage1, scoreStage1, organicParams, hasLocalPack } from './stage1.mjs';
import { planStep1, planStep2, planStage1Rebuy, stage1RebuySerps, step1Gate, scoreCells, m4CellSpecs, resolveCells, isHarediFlagged, ORGANIC_ENDPOINT } from './stage2.mjs';
import { ORGANIC_SCHEMA } from './dfs.mjs';
import { homepageCache, homepageTextStore, runHomepageChecks } from './homepage.mjs';
import { writeTable, writeJson, toMarkdown } from './output.mjs';

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
export const STAGE2_COLUMNS = ['rank', 'cell_id', 'expect', 'calibration', 'ranked', 'slug', 'trade_he', 'region', 'city', 'city_he', 'ring', 'population', 'urgency_lead_gen', 'V_region', 'V_cell', 'V_source', 'T_p_usd', 'M', 'value_usd', 'region_pass', 'region_advance',
  'stopped_at', 'gate_reason', 'maps_bought', 'points', 'S3_step1', 'S3_step1_low', 'S3_step1_high', 'S3', 'S3_band', 'S3_points', 'top3_s', 'lf_top3_joined', 'lf_top3_paid', 'W', 'P', 'P_w', 'pooled', 'pooled_into', 'pool_members',
  'L_share', 'D_share', 'O', 'organic_counted', 'organic_unresolved', 'local_pool', 'local_default', 'has_ai_overview',
  'kit_level', 'score', 'score_unkilled', 'kill_reason', 'flags', 'lf_pack_overlap', 'lead_gen_listings', 'homepage_checked', 'homepage_failed', 'homepage_not_checked', 'maps_items_t1', 'maps_items_t2', 'relevant_ranked', 'run_id'];
// Compact view for the ranked M4 markdown table.
export const M4_MD_COLUMNS = ['rank', 'slug', 'trade_he', 'region', 'city', 'city_he', 'ring', 'pool_members', 'urgency_lead_gen', 'value_usd', 'points', 'S3_step1', 'S3', 'S3_band', 'P', 'P_w', 'L_share', 'D_share', 'O', 'score', 'kill_reason', 'kit_level'];

const STAGE_KEYS = { 1: 'stage1', pilot: 'stage2-pilot', m4: 'stage2-full' };
const reqKey = r => `${r.endpoint}|${canonicalJson(r.params)}|${r.minSchema ?? 1}`;
const dedupe = list => [...new Map(list.map(r => [reqKey(r), r])).values()];

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
  const stageKey = STAGE_KEYS[stage];
  if (!stageKey) throw new Error(`unknown stage ${stage} (use 1, pilot or m4)`);
  const configuredCap = run.caps_usd[stageKey];
  if (configuredCap === undefined) throw new Error(`no approved cap for ${stageKey} in run-config.json caps_usd`);
  if (cap !== undefined && !(cap <= configuredCap)) throw new Error(`--cap ${cap} exceeds the approved ${stageKey} cap ${configuredCap}; caps are never raised from the CLI`);
  const capUsd = cap ?? configuredCap;

  const client = createDfsClient({ token, fetchImpl, cacheDir, capUsd, prices: run.prices_usd, rateLimits: run.rate_limits, offline, log, now, organicFields: run.stage2.organic_store_fields });
  const isUncached = r => !client.has(r.endpoint, r.params, r.minSchema);
  const costOf = list => list.reduce((n, r) => n + estimateCost(r.endpoint, r.params, run.prices_usd), 0);
  const round6 = x => Math.round(x * 1e6) / 1e6;
  // Stage 1 always scores on the first-fetched sample (2.3 re-buy never shifts it).
  const getOriginal = (e, p) => client.peekOriginal(e, p);
  const get = (endpoint, params, minSchema) => client.peek(endpoint, params, minSchema);
  const mode = stage === 'm4' ? 'm4' : 'pilot';

  let stage1 = null;
  let specs = null;
  let rebuy = [];
  let step1;
  let step2Worst = [];
  if (stage === '1') {
    step1 = planStage1(config);
  } else {
    try {
      stage1 = scoreStage1(config, getOriginal);
    } catch (err) {
      if (stage === 'm4' || !err.missing) throw err; // M4 scope comes from the Stage-1 advancing pairs
      stage1 = { cells: null, pairs: null }; // pilot without a Stage-1 cache: value columns stay empty
    }
    specs = stage === 'm4' ? m4CellSpecs(config, stage1.pairs) : run.pilot.cells;
    if (stage === 'm4' && run.stage1.organic_rebuy_m4) rebuy = planStage1Rebuy(config);
    step1 = planStep1(config, specs, mode);
    // Step 2 is only bought for step-1 survivors, unknown before step 1 runs, so the preflight
    // prices the worst case: every cell that is not step-1-only survives.
    const cells = resolveCells(specs, config);
    const eligible = cells.filter(c => c.force_step2 || !(run.stage2.flagged_cells_step1_only && isHarediFlagged(c.city))).map(c => c.id);
    step2Worst = planStep2(config, eligible, specs);
  }
  const requests = dedupe([...rebuy, ...step1, ...step2Worst]);
  const uncached = requests.filter(isUncached);
  const uncached1 = dedupe([...rebuy, ...step1]).filter(isUncached);
  const estimateUsd = costOf(uncached);
  const plan = { stage: stageKey, run_id: runId, requests: requests.length, uncached: uncached.length, estimate_usd: round6(estimateUsd), cap_usd: capUsd };
  if (stage !== '1') {
    Object.assign(plan, {
      cells: specs.length,
      rebuy_uncached: rebuy.filter(isUncached).length,
      step1_uncached: dedupe(step1).filter(isUncached).length,
      step1_estimate_usd: round6(costOf(uncached1)),
      step2_worst_case_uncached: uncached.length - uncached1.length,
      step2_worst_case_usd: round6(estimateUsd - costOf(uncached1)),
    });
  }
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
  let gate = null;
  try {
    if (!offline) await execute(client, uncached1);
    if (stage !== '1') {
      gate = step1Gate(config, get, { specs, mode });
      if (gate.missing.length) throw new Error(`step 1 inputs missing${offline ? ' (offline)' : ' after fetch'}: ${gate.missing.slice(0, 5).join(', ')}${gate.missing.length > 5 ? ', ...' : ''}`);
      const step2 = dedupe(planStep2(config, gate.survivors, specs));
      step2Bought = step2.filter(isUncached);
      plan.step1_survivors = stage === 'm4' ? gate.survivors.length : gate.survivors;
      log(`step 1: ${gate.survivors.length} of ${gate.cells.length} cells survive; step 2 uncached requests: ${step2Bought.length}${offline ? ' (offline: not bought, reported pending)' : ''}`);
      if (!offline) await execute(client, step2Bought);
    }
  } catch (err) {
    saveLedger(`halted: ${err.name}: ${err.message}`);
    err.ledger = { ...plan, spent_usd: client.ledger.spentUsd, network_calls: client.ledger.networkCalls };
    throw err;
  }
  saveLedger('ok');

  const tag = rows => rows.map(r => ({ ...r, run_id: runId }));
  let outputs;
  if (stage === '1') {
    stage1 = scoreStage1(config, getOriginal);
    writeTable(outDir, 'stage1-pairs', tag(stage1.pairs), STAGE1_PAIR_COLUMNS, `Stage 1 - profession x region pairs (run ${runId})`);
    writeTable(outDir, 'stage1-cells', tag(stage1.cells), STAGE1_CELL_COLUMNS, `Stage 1 - top 50 profession x city cells (run ${runId})`, 50);
    writeJson(path.join(outDir, 'stage1-diagnostics.json'), { run_id: runId, ...stage1.diagnostics });
    outputs = { pairs: stage1.pairs.length, cells: stage1.cells.length, advancing: stage1.pairs.filter(p => p.advance).length };
  } else {
    const rebuySerps = stage1RebuySerps(config, get);
    const scoreOpts = { specs, mode, pendingOk: offline, rebuySerps };
    // Pass 1 finds the hosts that need the free homepage check; pass 2 scores with the results.
    const hc = run.homepage_check;
    const siteCache = hc?.enabled ? homepageCache(cacheDir, hc, now) : null;
    const textStore = hc?.enabled ? homepageTextStore(privateDir, hc, now) : null;
    let homepageFetched = 0;
    let scored = scoreCells(config, get, stage1.cells, scoreOpts);
    if (siteCache) {
      siteCache.purge();
      textStore.purge();
      if (siteFetchImpl && !offline) homepageFetched = await runHomepageChecks(scored.hostsNeeded, { cache: siteCache, textStore, fetchImpl: siteFetchImpl, cfg: hc, now, log });
      const checks = new Map(scored.hostsNeeded.map(h => [h, siteCache.get(h)]).filter(([, v]) => v));
      const texts = new Map(scored.hostsNeeded.map(h => [h, textStore.get(h)]).filter(([, v]) => v).map(([h, v]) => [h, { title: v.title, h1: v.first_h1 }]));
      scored = scoreCells(config, get, stage1.cells, { ...scoreOpts, siteChecks: checks, siteTexts: texts });
    }
    const homepage = homepageSummary(scored, siteCache);
    if (stage === 'pilot') {
      const pilot = { ...scored, proximity: pilotProximity(scored.proximity, run) };
      writeTable(outDir, 'stage2-pilot', tag(pilot.rows), STAGE2_COLUMNS, `Stage 2 pilot (run ${runId})`);
      writeJson(path.join(outDir, 'stage2-category-diagnostics.json'), { run_id: runId, note: 'R4: per cell, every top-20 Maps category text that matched no rule (append-only rule extensions: Yonatan)', cells: pilot.categoryDiagnostics });
      writeJson(path.join(outDir, 'stage2-proximity.json'), { run_id: runId, ...pilot.proximity });
      writeJson(path.join(privateDir, 'stage2-pilot-businesses.json'), pilot.privateRows);
      writeJson(path.join(privateDir, 'stage2-organic-rows.json'), pilot.organicRows);
      outputs = { rows: pilot.rows.length, private_rows: pilot.privateRows.length, step1_gate: pilot.gate, maps_calls_bought: step2Bought.length, homepage_hosts: pilot.hostsNeeded.length, homepage_fetched: homepageFetched, homepage };
    } else {
      const m4 = writeM4(outDir, privateDir, scored, { runId, run, stage1, config, get, getOriginal, homepage, tag });
      outputs = { ...m4, step2_requests_bought: step2Bought.length, homepage_hosts: scored.hostsNeeded.length, homepage_fetched: homepageFetched };
    }
  }
  return { ...plan, ...outputs, spent_usd: Math.round(client.ledger.spentUsd * 1e6) / 1e6, network_calls: client.ledger.networkCalls, cache_hits: requests.length - uncached.length };
}

function homepageSummary(scored, siteCache) {
  const out = { hosts: scored.hostsNeeded.length, cached: 0, by_outcome: {}, by_reason: {} };
  if (!siteCache) return out;
  for (const h of scored.hostsNeeded) {
    const rec = siteCache.get(h);
    if (!rec) continue;
    out.cached += 1;
    out.by_outcome[rec.site_check] = (out.by_outcome[rec.site_check] ?? 0) + 1;
    if (rec.reason) out.by_reason[rec.reason] = (out.by_reason[rec.reason] ?? 0) + 1;
  }
  out.by_outcome = Object.fromEntries(Object.entries(out.by_outcome).sort());
  out.by_reason = Object.fromEntries(Object.entries(out.by_reason).sort());
  out.failed_fraction = out.cached ? Math.round((out.by_outcome.failed ?? 0) / out.cached * 1e4) / 1e4 : null;
  return out;
}

function pilotProximity(prox, run) {
  const cells = prox.filter(p => p.logged_probes.length).map(p => {
    const k = p.logged_probes.filter(x => x.survivors !== null);
    return { cell_id: p.cell_id, profession: p.profession, city: p.city, offset_km: run.pilot.proximity_probe_offset_km, probes: p.logged_probes, mean_survivors_of_3: k.length ? Math.round(k.reduce((n, x) => n + x.survivors, 0) / k.length * 1e4) / 1e4 : null };
  });
  const means = cells.filter(p => p.mean_survivors_of_3 !== null);
  return { cells, mean_survivors_of_3: means.length ? Math.round(means.reduce((n, p) => n + p.mean_survivors_of_3, 0) / means.length * 1e4) / 1e4 : null, rule: 'spec 2.9: proximity is a property of the cell; M4 scores big-city cells on a 3-point (Jerusalem 5-point) mean S3. Pilot probes are logged only.' };
}

// M4 outputs: committed = aggregates only (no business names, phones or domains);
// private = business-level rows, organic rows and the default-host list (domains).
function writeM4(outDir, privateDir, scored, { runId, run, stage1, config, get, getOriginal, homepage, tag }) {
  const rows = scored.rows;
  writeTable(outDir, 'm4-cells', tag(rows), STAGE2_COLUMNS, `M4 - Stage 2-4 ranked cells (run ${runId})`, 0);
  const ranked = rows.filter(r => r.rank !== null && r.score > 0);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'm4-top.md'), toMarkdown(ranked.slice(0, 40), M4_MD_COLUMNS, `M4 - top 40 scored cells (run ${runId}; full table in m4-cells.csv)`));

  const cellRows = rows.filter(r => r.ring !== 'ring2_pool');
  const count = f => cellRows.filter(f).length;
  const summary = {
    run_id: runId,
    cells: cellRows.length,
    ranked_cells: count(r => r.ranked),
    calibration_cells: cellRows.filter(r => r.calibration).map(r => ({ cell_id: r.cell_id, slug: r.slug, city: r.city, S3_step1: r.S3_step1, S3: r.S3, S3_band: r.S3_band, P_w: r.P_w, score_unkilled: r.score_unkilled })),
    step1: {
      killed_saturated: count(r => r.gate_reason === 'step1_saturated'),
      flagged_step1_only: count(r => r.gate_reason === 'haredi_flag_step1_only'),
      passed: count(r => r.gate_reason === 'step1_pass'),
      forced: count(r => r.gate_reason === 'forced_calibration'),
      multi_point_cells: count(r => r.points > 1),
    },
    step2: {
      bought: count(r => r.maps_bought),
      pending: count(r => r.stopped_at === 'pending_step2'),
      killed_saturated_joined: count(r => r.maps_bought && r.S3_band === 'saturated'),
      killed_pw_below: count(r => r.maps_bought && /P_w</.test(r.kill_reason)),
      pooled_members: count(r => r.pooled_into),
      survived_scored: count(r => r.ranked && r.score > 0),
    },
    ring2_pools: rows.filter(r => r.ring === 'ring2_pool').map(r => ({ cell_id: r.cell_id, members: r.pool_members, P_w: r.P_w, S3: r.S3, score: r.score, kill_reason: r.kill_reason })),
    bands_final: Object.fromEntries(['open', 'middle', 'saturated'].map(b => [b, count(r => r.S3_band === b)])),
    homepage,
  };
  writeJson(path.join(outDir, 'm4-summary.json'), summary);

  // R4 diagnostics: per cell + aggregated per profession (category texts only - no business data).
  const agg = new Map();
  for (const c of scored.categoryDiagnostics) {
    for (const u of c.unmatched ?? []) {
      const key = `${c.profession}|${u.category}`;
      const e = agg.get(key) ?? { profession: c.profession, category: u.category, items: 0, items_relevant_anyway: 0, cells: 0 };
      e.items += u.items; e.items_relevant_anyway += u.items_relevant_anyway; e.cells += 1;
      agg.set(key, e);
    }
  }
  const unmatched = [...agg.values()].sort((a, b) => a.profession.localeCompare(b.profession, 'en') || (b.items - a.items) || a.category.localeCompare(b.category));
  writeJson(path.join(outDir, 'm4-category-diagnostics.json'), { run_id: runId, note: 'R4/2.10: every top-20 Maps category text that matched no rule. by_profession = aggregate across M4 cells (append-only rule extensions: Yonatan)', by_profession: unmatched, cells: scored.categoryDiagnostics });

  // 2.2.4 default hosts: committed = counts only; the host list itself is private (domains).
  const dh = scored.defaultHosts;
  const classTotals = {};
  for (const o of scored.organicRows) for (const r of o.rows) classTotals[r.class] = (classTotals[r.class] ?? 0) + 1;
  // 2.3 re-buy vs the original Stage-1 sample: local-pack presence flips (informational; Stage 1 keeps the original)
  const flips = [];
  let rebought = 0;
  for (const p of config.professions) {
    for (const r of config.areas.regions) {
      const params = organicParams(p, r, run);
      const now2 = get(ORGANIC_ENDPOINT, params, ORGANIC_SCHEMA);
      if (!now2) continue;
      rebought += 1;
      const orig = getOriginal(ORGANIC_ENDPOINT, params);
      if (hasLocalPack(orig) !== hasLocalPack(now2)) flips.push({ slug: p.slug, region: r.id, original_pack: hasLocalPack(orig), rebuy_pack: hasLocalPack(now2) });
    }
  }
  writeJson(path.join(outDir, 'm4-organic-diagnostics.json'), {
    run_id: runId,
    note: '2.2-2.3: organic classes across M4 step-2 cells. Host names are private (data/market-scan/private/m4-default-hosts.json).',
    serps_for_national_rule: scored.nationalSerpsCounted,
    stage1_rebuy_serps: rebought,
    stage1_rebuy_local_pack_flips: flips,
    class_totals: Object.fromEntries(Object.entries(classTotals).sort()),
    default_hosts: { distinct: dh.length, in_2plus_cells: dh.filter(h => h.cells >= 2).length, in_2plus_regions: dh.filter(h => h.regions >= 2).length, in_1_cell: dh.filter(h => h.cells === 1).length },
  });
  writeJson(path.join(outDir, 'm4-proximity.json'), { run_id: runId, rule: '2.9: pop > 150k and not haredi-flagged -> mean S3 of centroid + 3 km N/S (Jerusalem + E/W)', cells: scored.proximity });

  writeJson(path.join(privateDir, 'm4-businesses.json'), scored.privateRows);
  writeJson(path.join(privateDir, 'm4-organic-rows.json'), scored.organicRows);
  writeJson(path.join(privateDir, 'm4-default-hosts.json'), { run_id: runId, note: '2.2.4: every local_default host with its cell / region count (for Yonatan; private - domains)', hosts: dh });
  return { rows: rows.length, private_rows: scored.privateRows.length, summary };
}
