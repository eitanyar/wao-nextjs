import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runEngine, loadConfig } from './lib/engine.mjs';
import { createDfsClient, cacheKey, BudgetExceededError } from './lib/dfs.mjs';
import { professionVolume, ticketProxy, scoreStage1 } from './lib/stage1.mjs';
import { businessStrength, topStrength, compositeScore, gaps, orderRows, s3Band, relevant, categoryId } from './lib/stage2.mjs';
import { parseProfessions, parseRegions, SPEC_PATH } from './lib/spec.mjs';
import { createFakeFetch, networkForbidden } from './fixtures/fake-dataforseo.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../..');
const FIXTURE_CONFIG = path.join(HERE, 'fixtures/config');
const EXPECTED = path.join(HERE, 'fixtures/expected');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'market-scan-'));
const OUT_FILES = ['stage1-pairs.csv', 'stage1-pairs.json', 'stage1-pairs.md', 'stage1-cells.csv', 'stage1-cells.json', 'stage1-cells.md', 'stage1-diagnostics.json', 'stage2-pilot.csv', 'stage2-pilot.json', 'stage2-pilot.md'];

function dirs(base) {
  return { configDir: FIXTURE_CONFIG, cacheDir: path.join(base, 'cache'), outDir: path.join(base, 'out'), privateDir: path.join(base, 'private'), ledgerDir: path.join(base, 'runs') };
}
async function fullRun(base, fetchImpl, extra = {}) {
  const s1 = await runEngine({ stage: '1', ...dirs(base), token: 'fake', fetchImpl, ...extra });
  const s2 = await runEngine({ stage: 'pilot', ...dirs(base), token: 'fake', fetchImpl, ...extra });
  return { s1, s2 };
}
const read = (dir, f) => fs.readFileSync(path.join(dir, f));

test('cached-fixture run is byte-identical, makes zero network calls, and matches the golden output', async () => {
  const base = tmp();
  const first = await fullRun(base, createFakeFetch());
  assert.equal(first.s1.network_calls, 3 + 2 * 2); // 2 coded cities + country, 2 professions x 2 regions
  assert.equal(first.s1.spent_usd, 0.278);
  const firstOut = Object.fromEntries(OUT_FILES.map(f => [f, read(path.join(base, 'out'), f)]));

  const second = await fullRun(base, networkForbidden());
  assert.equal(second.s1.network_calls, 0);
  assert.equal(second.s2.network_calls, 0);
  assert.equal(second.s1.cache_hits, first.s1.requests);
  for (const f of OUT_FILES) assert.ok(read(path.join(base, 'out'), f).equals(firstOut[f]), `${f} changed on cached rerun`);

  // An independent replay into a fresh output dir from the same cache is identical too.
  const replay = { ...dirs(base), outDir: path.join(base, 'out2') };
  await runEngine({ stage: '1', ...replay, offline: true });
  await runEngine({ stage: 'pilot', ...replay, offline: true });
  for (const f of OUT_FILES) assert.ok(read(path.join(base, 'out2'), f).equals(firstOut[f]), `${f} differs on offline replay`);

  if (process.env.MARKET_SCAN_UPDATE_GOLDEN === '1') {
    fs.mkdirSync(EXPECTED, { recursive: true });
    for (const f of OUT_FILES) fs.writeFileSync(path.join(EXPECTED, f), firstOut[f]);
  }
  for (const f of OUT_FILES) assert.ok(read(EXPECTED, f).equals(firstOut[f]), `${f} differs from fixtures/expected`);
});

test('a cache hit never calls fetch, even with a token and network allowed', async () => {
  const base = tmp();
  const params = { keyword: 'alpha one', location_coordinate: '32,34.8', language_code: 'he', depth: 10 };
  const prices = loadConfig(FIXTURE_CONFIG).run.prices_usd;
  let calls = 0;
  const live = createDfsClient({ token: 'fake', fetchImpl: createFakeFetch({ onCall: () => { calls += 1; } }), cacheDir: base, capUsd: 1, prices });
  await live.call('/serp/google/organic/live/advanced', params);
  assert.equal(calls, 1);
  const again = createDfsClient({ token: 'fake', fetchImpl: networkForbidden(), cacheDir: base, capUsd: 0, prices });
  await again.call('/serp/google/organic/live/advanced', { depth: 10, language_code: 'he', location_coordinate: '32,34.8', keyword: 'alpha one' }); // key order irrelevant
  assert.equal(again.ledger.cacheHits, 1);
  assert.equal(again.ledger.networkCalls, 0);
  assert.equal(cacheKey('/x', { a: 1, b: 2 }), cacheKey('/x', { b: 2, a: 1 }));
});

test('the USD cap halts a run before the call that would exceed it', async () => {
  // Preflight: estimate above cap -> nothing is called at all.
  const base = tmp();
  let calls = 0;
  await assert.rejects(
    runEngine({ stage: '1', ...dirs(base), token: 'fake', fetchImpl: createFakeFetch({ onCall: () => { calls += 1; } }), cap: 0.1 }),
    err => err instanceof BudgetExceededError && /preflight/.test(err.message),
  );
  assert.equal(calls, 0);
  assert.equal(fs.existsSync(path.join(base, 'cache')), false);

  // In-run guard: provider charges more than the price table -> the next call is refused.
  const prices = loadConfig(FIXTURE_CONFIG).run.prices_usd;
  const client = createDfsClient({ token: 'fake', fetchImpl: createFakeFetch({ costs: { '/serp/google/organic/live/advanced': 0.6 } }), cacheDir: tmp(), capUsd: 1, prices });
  const p = i => ({ keyword: `k${i}`, location_coordinate: '32,34.8', language_code: 'he', depth: 10 });
  await client.call('/serp/google/organic/live/advanced', p(1));
  await assert.rejects(client.call('/serp/google/organic/live/advanced', p(2)).then(() => client.call('/serp/google/organic/live/advanced', p(3))), BudgetExceededError);
  assert.ok(client.ledger.spentUsd <= 1.2 + 1e-9);
  assert.equal(client.ledger.networkCalls, 2);
  // CLI-level: caps can be lowered, never raised.
  await assert.rejects(runEngine({ stage: '1', ...dirs(tmp()), cap: 10.01, estimateOnly: true }), /never raised/);
});

test('Stage-1 formulas match a hand-computed example (spec 3.2-3.7)', () => {
  // Grouped dedupe (3.3): identical volume + identical monthly series counts once.
  const series = [{ year: 2026, month: 1, search_volume: 50 }];
  const byKw = new Map([['a', { search_volume: 50, monthly_searches: series }], ['b', { search_volume: 50, monthly_searches: series }], ['c', { search_volume: 20, monthly_searches: [] }]]);
  const v = professionVolume(['a', 'b', 'c'], byKw);
  assert.equal(v.total, 70);
  assert.deepEqual(v.perTerm.map(t => t.grouped), [false, true, false]);
  // Ticket (3.5): (2*1000 + 4*1000) / 2000 = 3.0; cpc null -> high bid fallback.
  assert.equal(ticketProxy([{ cpc: 2, counted: 1000 }, { cpc: 4, counted: 1000 }]), 3);
  assert.equal(ticketProxy([{ cpc: null, high_top_of_page_bid: 1.5, counted: 10 }, { cpc: null, high_top_of_page_bid: null, counted: 999 }]), 1.5);

  // Full fixture: see fixtures/fake-dataforseo.mjs for the inputs.
  const config = loadConfig(FIXTURE_CONFIG);
  const base = tmp();
  return fullRun(base, createFakeFetch()).then(() => {
    const client = createDfsClient({ cacheDir: path.join(base, 'cache'), capUsd: 0, prices: config.run.prices_usd, offline: true });
    const { pairs, cells } = scoreStage1(config, (e, p) => client.peek(e, p));
    const pair = (s, r) => pairs.find(x => x.slug === s && x.region === r);
    const cell = (s, c) => cells.find(x => x.slug === s && x.city === c);
    // alpha: T = 3.0. R1: V = 300 + 100 = 400 (c2 has no code), pack -> M = 1, value = 1200.
    assert.deepEqual([pair('alpha', 'R1').V_region, pair('alpha', 'R1').T_p_usd, pair('alpha', 'R1').M, pair('alpha', 'R1').value_usd], [400, 3, 1, 1200]);
    // R2: alpha one/two grouped -> V = 50, no pack -> M = 0.4, value = 50 * 3 * 0.4 = 60.
    assert.deepEqual([pair('alpha', 'R2').V_region, pair('alpha', 'R2').M, pair('alpha', 'R2').value_usd], [50, 0.4, 60]);
    // beta: country beta two grouped with beta one -> T = high bid of beta one = 1.0.
    // R1: V = 40 (< 50 in c1 -> imputed 40 * 1000/1500 = 26.6667), no pack -> value 16.
    assert.equal(pair('beta', 'R1').T_p_usd, 1);
    assert.equal(pair('beta', 'R1').value_usd, 16);
    assert.deepEqual([cell('beta', 'c1').V_cell, cell('beta', 'c1').V_source], [26.6667, 'imputed']);
    // c2 has no Ads code -> imputed from region: alpha 400 * 500/1500 = 133.3333, value 400.
    assert.deepEqual([cell('alpha', 'c2').V_cell, cell('alpha', 'c2').V_source, cell('alpha', 'c2').value_usd], [133.3333, 'imputed', 400]);
    assert.deepEqual([cell('alpha', 'c1').V_cell, cell('alpha', 'c1').V_source], [400, 'measured']);
    // Pass rule (3.7): 4 pairs -> top 2 by value; only alpha R1 also has V_region >= 150.
    assert.deepEqual(pairs.map(p => [p.slug, p.region, p.stage1_pass]), [['alpha', 'R1', true], ['alpha', 'R2', false], ['beta', 'R1', false], ['beta', 'R2', false]]);
  });
});

test('Stage-2 formulas match a hand-computed example (spec 4.4-5.3)', () => {
  const run = loadConfig(FIXTURE_CONFIG).run;
  const ctx = { run, profession: { terms: ['alpha one', 'alpha two'] }, city: { he_name: 'City One' } };
  // Maxed business: 0.40 + 0.15 + 0.20 + 0.10 + 0.15 = 1.0
  const strong = { title: 'alpha one Pro', domain: 'alpha.example', total_photos: 50, rating: { value: 5, votes_count: 150 } };
  assert.equal(Math.round(businessStrength(strong, ctx) * 1e9) / 1e9, 1);
  // 9 votes: 0.40 * log10(10)/log10(151) = 0.40 * 0.458926 = 0.183570; rating 4.25 -> 0.15 * 0.5 = 0.075;
  // facebook domain is not a site -> 0; 25 photos -> 0.10 * 0.5 = 0.05; not stuffed -> 0. Total 0.308570.
  const mid = { title: 'Biz', domain: 'facebook.com', total_photos: 25, rating: { value: 4.25, votes_count: 9 } };
  assert.ok(Math.abs(businessStrength(mid, ctx) - 0.30857) < 1e-5);
  // < 5 votes -> rating term is 0 even at 5 stars.
  assert.ok(Math.abs(businessStrength({ title: 'x', rating: { value: 5, votes_count: 4 } }, ctx) - 0.4 * Math.log10(5) / Math.log10(151)) < 1e-12);
  // Empty third slot counts 0: (1.0 + 0.30857 + 0) / 3 = 0.43619
  assert.ok(Math.abs(topStrength([strong, mid], ctx).S3 - 0.43619) < 1e-5);
  assert.equal(s3Band(0.7, run), 'saturated');
  assert.equal(s3Band(0.4, run), 'open');
  assert.equal(s3Band(0.55, run), 'middle');
  // Gaps: no website, single category, few photos, missing hours, unclaimed, few reviews = 6
  assert.equal(gaps({ is_claimed: false, rating: { votes_count: 2 } }, run).length, 6);
  // Composite: 1200 * (1 - 0.5)^2 * min(1, 9/15) = 1200 * 0.25 * 0.6 = 180
  assert.deepEqual(compositeScore({ value: 1200, S3: 0.5, P: 9, flags: [], stage1Pass: true }, run), { score_unkilled: 180, score: 180, kill_reason: '' });
  const killed = compositeScore({ value: 1200, S3: 0.8, P: 5, flags: ['haredi_majority'], stage1Pass: true }, run);
  assert.equal(killed.score, 0);
  assert.equal(killed.kill_reason, 'saturated;P<8;haredi_majority');
  // Ordering: within 5% -> kit level wins over raw score.
  const rows = [{ score: 100, kit_level: 0, P: 20, S3: 0.3, slug: 'a', city: 'x' }, { score: 97, kit_level: 2, P: 20, S3: 0.3, slug: 'b', city: 'x' }, { score: 50, kit_level: 2, P: 20, S3: 0.3, slug: 'c', city: 'x' }];
  assert.deepEqual(orderRows(rows, run).map(r => r.slug), ['b', 'a', 'c']);
});

test('config Hebrew is sliced byte-exact from the spec and engine sources carry no Hebrew', () => {
  const spec = fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8');
  const professions = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/market-scanner/professions.json'), 'utf8')).professions;
  const areas = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/market-scanner/areas.json'), 'utf8'));
  assert.deepEqual(professions.map(p => p.terms), parseProfessions(spec).map(p => p.terms.map(t => t.term)));
  for (const p of professions) {
    assert.ok(spec.includes(`| ${p.trade_he} |`), p.slug);
    for (const t of p.terms) assert.ok(spec.includes(`\`${t}\``), `${p.slug}: ${t}`);
  }
  const specCities = parseRegions(spec).flatMap(r => [...r.core, ...r.ring2].map(c => c.he_name));
  assert.deepEqual(areas.regions.flatMap(r => r.cities.map(c => c.he_name)), specCities);
  assert.equal(specCities.length, 71);
  const sources = ['run.mjs', 'build-config.mjs', 'free-checks.mjs', 'category-catalog.mjs', 'lib/spec.mjs', 'lib/cities.mjs', 'lib/dfs.mjs', 'lib/stage1.mjs', 'lib/stage2.mjs', 'lib/engine.mjs', 'lib/output.mjs'];
  for (const f of sources) assert.ok(!/[\u0590-\u05ff]/.test(fs.readFileSync(path.join(HERE, f), 'utf8')), `${f} contains Hebrew`);
});

test('relevance falls back to category text ids (Hebrew Maps items have no category_ids)', () => {
  const allow = [categoryId('Roofer'), 'roofing_contractor'];
  assert.equal(relevant({ category: 'Roofer' }, allow), true);
  assert.equal(relevant({ category: 'Plumber', additional_categories: ['Roofer'] }, allow), true);
  assert.equal(relevant({ category_ids: ['roofing_contractor'] }, allow), true);
  assert.equal(relevant({ category: 'Plumber' }, allow), false);
  assert.equal(relevant({ category: 'Roofer', is_directory_item: true }, allow), false);
  assert.match(categoryId('x'), /^cat-[0-9a-f]{8}$/);
});

test('40102 No Search Results is cached as a billed empty SERP and never re-bought', async () => {
  const base = tmp();
  const prices = loadConfig(FIXTURE_CONFIG).run.prices_usd;
  let calls = 0;
  const empty = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({ tasks: [{ id: 't', status_code: 40102, status_message: 'No Search Results.', cost: 0.002, result: null }] }) }; };
  const params = { keyword: 'nothing', location_coordinate: '32,34.8,15z', language_code: 'he', depth: 100 };
  const a = createDfsClient({ token: 'fake', fetchImpl: empty, cacheDir: base, capUsd: 1, prices });
  assert.deepEqual(await a.call('/serp/google/maps/live/advanced', params), { items_count: null, items: [], no_results: true });
  assert.equal(a.ledger.spentUsd, 0.002);
  const b = createDfsClient({ token: 'fake', fetchImpl: networkForbidden(), cacheDir: base, capUsd: 1, prices });
  assert.equal((await b.call('/serp/google/maps/live/advanced', params)).no_results, true);
  assert.equal(calls, 1);
});
