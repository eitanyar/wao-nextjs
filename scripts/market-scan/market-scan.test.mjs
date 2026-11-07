import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runEngine, loadConfig } from './lib/engine.mjs';
import { createDfsClient, cacheKey, cachePath, BudgetExceededError, projectResult, breadcrumbHost, ORGANIC_SCHEMA } from './lib/dfs.mjs';
import { professionVolume, ticketProxy, scoreStage1 } from './lib/stage1.mjs';
import { businessStrength, strengthComponents, topStrength, compositeScore, gaps, orderRows, s3Band, categoryId, joinLf, planStep1, ORGANIC_ENDPOINT } from './lib/stage2.mjs';
import { classifyRelevance, titleTerms } from './lib/relevance.mjs';
import { classifyOrganic } from './lib/organic.mjs';
import { checkHomepage, homepageCache, robotsAllows, siteVerdict, HOMEPAGE_CACHE_SUBDIR } from './lib/homepage.mjs';
import { parseProfessions, parseRegions, SPEC_PATH } from './lib/spec.mjs';
import { extractR12, mergeR12 } from './apply-r12.mjs';
import { createFakeFetch, networkForbidden, createFakeWeb } from './fixtures/fake-dataforseo.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../..');
const FIXTURE_CONFIG = path.join(HERE, 'fixtures/config');
const EXPECTED = path.join(HERE, 'fixtures/expected');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'market-scan-'));
const OUT_FILES = ['stage1-pairs.csv', 'stage1-pairs.json', 'stage1-pairs.md', 'stage1-cells.csv', 'stage1-cells.json', 'stage1-cells.md', 'stage1-diagnostics.json', 'stage2-pilot.csv', 'stage2-pilot.json', 'stage2-pilot.md', 'stage2-category-diagnostics.json', 'stage2-proximity.json'];
const webForbidden = () => async url => { throw new Error(`open-web call attempted during a cached run: ${url}`); };
const FIXED_NOW = () => new Date('2026-11-07T12:00:00Z');

function dirs(base) {
  return { configDir: FIXTURE_CONFIG, cacheDir: path.join(base, 'cache'), outDir: path.join(base, 'out'), privateDir: path.join(base, 'private'), ledgerDir: path.join(base, 'runs') };
}
async function fullRun(base, fetchImpl, extra = {}) {
  const s1 = await runEngine({ stage: '1', ...dirs(base), token: 'fake', fetchImpl, now: FIXED_NOW, ...extra });
  const s2 = await runEngine({ stage: 'pilot', ...dirs(base), token: 'fake', fetchImpl, siteFetchImpl: createFakeWeb(), now: FIXED_NOW, ...extra });
  return { s1, s2 };
}
const read = (dir, f) => fs.readFileSync(path.join(dir, f));

test('cached-fixture run is byte-identical, makes zero network calls, and matches the golden output', async () => {
  const base = tmp();
  const first = await fullRun(base, createFakeFetch());
  assert.equal(first.s1.network_calls, 3 + 2 * 2); // 2 coded cities + country, 2 professions x 2 regions
  assert.equal(first.s1.spent_usd, 0.278);
  const firstOut = Object.fromEntries(OUT_FILES.map(f => [f, read(path.join(base, 'out'), f)]));

  const second = await fullRun(base, networkForbidden(), { siteFetchImpl: webForbidden() });
  assert.equal(second.s1.network_calls, 0);
  assert.equal(second.s2.network_calls, 0);
  assert.equal(second.s1.cache_hits, first.s1.requests);
  for (const f of OUT_FILES) assert.ok(read(path.join(base, 'out'), f).equals(firstOut[f]), `${f} changed on cached rerun`);

  // An independent replay into a fresh output dir from the same cache is identical too.
  const replay = { ...dirs(base), outDir: path.join(base, 'out2') };
  await runEngine({ stage: '1', ...replay, offline: true, now: FIXED_NOW });
  await runEngine({ stage: 'pilot', ...replay, offline: true, now: FIXED_NOW });
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

test('Stage-2 formulas match a hand-computed example (spec 4.4-5.3, R1 missing-field policy, R10)', () => {
  const run = loadConfig(FIXTURE_CONFIG).run;
  const ctx = { run, profession: { terms: ['alpha one', 'alpha two'] }, city: { he_name: 'City One' } };
  // Maxed business: 0.40 + 0.15 + 0.20 + 0.10 + 0.15 = 1.0
  const strong = { title: 'alpha one Pro', domain: 'alpha.example', total_photos: 50, rating: { value: 5, votes_count: 150 } };
  assert.equal(Math.round(businessStrength(strong, ctx) * 1e9) / 1e9, 1);
  // 9 votes: 0.40 * log10(10)/log10(151) = 0.183570; rating 4.25 -> 0.075; facebook is not a site -> 0;
  // 25 photos -> 0.05; not stuffed -> 0. All fields present -> no renormalisation. Total 0.308570.
  const mid = { title: 'Biz', domain: 'facebook.com', total_photos: 25, rating: { value: 4.25, votes_count: 9 } };
  assert.ok(Math.abs(businessStrength(mid, ctx) - 0.30857) < 1e-5);
  // No domain = no website (a real 0); total_photos absent = missing -> dropped, weights renormalised by 0.90.
  assert.ok(Math.abs(businessStrength({ title: 'x', rating: { value: 5, votes_count: 4 } }, ctx) - 0.4 * Math.log10(5) / Math.log10(151) / 0.9) < 1e-12);
  // Local Finder item: website hidden behind a Google redirect -> real_site missing, photos missing:
  // (0.40 * 1 + 0.15 * 1) / 0.70 = 0.785714 (never scored as 0 - that would fake weakness).
  const lf = { cid: '5', title: 'x', domain: 'google.com', url: 'https://google.com/goto?url=AB', rating: { value: 5, votes_count: 150 } };
  assert.deepEqual(strengthComponents(lf, ctx), { reviews: 1, rating: 1, real_site: null, photos: null, stuffed: 0 });
  assert.ok(Math.abs(businessStrength(lf, ctx) - 0.55 / 0.7) < 1e-12);
  // cid join to the Maps pool fills the missing fields: 0.40 + 0.15 + 0.20 + 0.10 = 0.85
  const joined = joinLf(lf, new Map([['5', { domain: 'b.example', total_photos: 50 }]]));
  assert.equal(joined._joined, true);
  assert.ok(Math.abs(businessStrength(joined, ctx) - 0.85) < 1e-12);
  // joined to a Maps item with no website -> the LF redirect does not survive: real_site = 0
  assert.equal(strengthComponents(joinLf(lf, new Map([['5', { total_photos: 0 }]])), ctx).real_site, 0);
  assert.equal(joinLf(lf, new Map())._joined, false);
  // Empty third slot counts 0: (1.0 + 0.30857 + 0) / 3 = 0.43619
  assert.ok(Math.abs(topStrength([strong, mid], ctx).S3 - 0.43619) < 1e-5);
  assert.equal(s3Band(0.7, run), 'saturated');
  assert.equal(s3Band(0.4, run), 'open');
  assert.equal(s3Band(0.55, run), 'middle');
  assert.equal(gaps({ is_claimed: false, rating: { votes_count: 2 } }, run).length, 6);
  // R10: 1200 * (1 - 0.5)^2 * min(1, 9/15) * 0.9 = 162
  assert.deepEqual(compositeScore({ value: 1200, S3: 0.5, P_w: 9, O: 0.9, flags: [], stage1Pass: true }, run), { score_unkilled: 162, score: 162, kill_reason: '' });
  const killed = compositeScore({ value: 1200, S3: 0.8, P_w: 5, O: 1, flags: ['haredi_majority'], stage1Pass: true }, run);
  assert.equal(killed.score, 0);
  assert.equal(killed.kill_reason, 'saturated;P_w<8;haredi_majority');
  // step-1 kill: no prospect pool, so the score is 0 and the unkilled score is unknown (null)
  assert.deepEqual(compositeScore({ value: 1200, S3: 0.9, P_w: null, flags: [], stage1Pass: true }, run), { score_unkilled: null, score: 0, kill_reason: 'saturated' });
  // Ordering: within 5% -> kit level wins over raw score, then P_w.
  const rows = [{ score: 100, kit_level: 0, P_w: 20, S3: 0.3, slug: 'a', city: 'x' }, { score: 97, kit_level: 2, P_w: 20, S3: 0.3, slug: 'b', city: 'x' }, { score: 50, kit_level: 2, P_w: 20, S3: 0.3, slug: 'c', city: 'x' }];
  assert.deepEqual(orderRows(rows, run).map(r => r.slug), ['b', 'a', 'c']);
});

test('organic cache keeps the real domain, url and title (M3 blocker regression)', () => {
  // The live provider returns Google redirects for every organic item on Israeli SERPs: the real
  // host survives only in `breadcrumb`. v1 kept just `domain` -> "google.com" everywhere.
  const raw = [{ item_types: ['organic', 'local_pack'], items: [
    { type: 'organic', rank_group: 1, rank_absolute: 7, domain: 'google.com', url: 'https://google.com/goto?url=CAES', title: 'Roof sealing', breadcrumb: 'https://www.adler.example › roofs', website_name: 'Adler', description: 'long snippet' },
    { type: 'organic', rank_group: 2, rank_absolute: 8, domain: 'www.direct.example', url: 'https://www.direct.example/page', title: 'Direct' },
    { type: 'organic', rank_group: 3, rank_absolute: 9, domain: 'google.com', url: 'https://google.com/goto?url=X', title: 'No crumb' },
    { type: 'local_pack', rank_group: 1, rank_absolute: 2, domain: 'google.com', title: 'Pack biz', cid: '42', url: 'https://google.com/goto?url=P' },
  ] }];
  const data = projectResult(ORGANIC_ENDPOINT, raw);
  assert.equal(data.schema, ORGANIC_SCHEMA);
  const [a, b, c, pack] = data.items;
  assert.deepEqual([a.domain, a.url, a.title, a.domain_source], ['www.adler.example', null, 'Roof sealing', 'breadcrumb']);
  assert.deepEqual([b.domain, b.url, b.title, b.domain_source], ['www.direct.example', 'https://www.direct.example/page', 'Direct', 'domain']);
  assert.deepEqual([c.domain, c.domain_source], [null, 'unresolved']);
  assert.equal(a.description, undefined); // minimal fields only
  assert.equal(pack.cid, '42');
  assert.equal(breadcrumbHost('news.example › article'), 'news.example');
  assert.equal(breadcrumbHost('not a url'), null);
  // No organic item in a projected v2 SERP may carry a Google host while a breadcrumb exists.
  assert.ok(data.items.filter(i => i.type === 'organic').every(i => !/google\./.test(i.domain ?? '')));

  // A v1 (M2) cache entry is still served to Stage 1 (local-pack presence only) but is a miss for
  // Stage 2, which needs schema 2 -> it is re-bought once and overwritten.
  const base = tmp();
  const params = { keyword: 'alpha one', location_coordinate: '31,34.9', language_code: 'he', depth: 10 };
  const file = cachePath(base, ORGANIC_ENDPOINT, params);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ endpoint: ORGANIC_ENDPOINT, params, data: { item_types: ['organic'], items: [{ type: 'organic', rank_group: 1, domain: 'google.com' }] } }));
  const prices = loadConfig(FIXTURE_CONFIG).run.prices_usd;
  let calls = 0;
  const client = createDfsClient({ token: 'fake', fetchImpl: createFakeFetch({ onCall: () => { calls += 1; } }), cacheDir: base, capUsd: 1, prices });
  assert.equal(client.has(ORGANIC_ENDPOINT, params), true);
  assert.equal(client.has(ORGANIC_ENDPOINT, params, ORGANIC_SCHEMA), false);
  return client.call(ORGANIC_ENDPOINT, params, ORGANIC_SCHEMA).then(fresh => {
    assert.equal(calls, 1);
    assert.equal(fresh.schema, ORGANIC_SCHEMA);
    assert.ok(fresh.items.filter(i => i.type === 'organic').some(i => i.domain === 'www.dir.example'));
    assert.equal(client.has(ORGANIC_ENDPOINT, params, ORGANIC_SCHEMA), true);
  });
});

test('two-step pilot: a saturated cell stops at step 1 before any Maps call; survivors buy Maps', async () => {
  const base = tmp();
  await runEngine({ stage: '1', ...dirs(base), token: 'fake', fetchImpl: createFakeFetch(), now: FIXED_NOW });
  const calls = [];
  const est = await runEngine({ stage: 'pilot', ...dirs(base), estimateOnly: true });
  assert.equal(est.estimate_usd, 0.022); // worst case: 5 step-1 + 6 Maps
  const s2 = await runEngine({ stage: 'pilot', ...dirs(base), token: 'fake', fetchImpl: createFakeFetch({ onCall: (e, t) => calls.push({ e, t }) }), now: FIXED_NOW });
  const maps = calls.filter(c => c.e.includes('/maps/'));
  assert.equal(maps.length, 4); // B and C, 2 terms each
  assert.ok(maps.every(c => !c.t.location_coordinate.startsWith('32,')), 'Maps was bought for the saturated cell A');
  assert.deepEqual(s2.step1_survivors, ['B', 'C']);
  assert.equal(s2.spent_usd, 0.018);
  const rows = JSON.parse(fs.readFileSync(path.join(base, 'out', 'stage2-pilot.json'), 'utf8'));
  const A = rows.find(r => r.cell_id === 'A');
  assert.deepEqual([A.stopped_at, A.maps_bought, A.S3_band, A.kill_reason, A.P_w, A.score], ['step1', false, 'saturated', 'saturated', null, 0]);
  // strong LF top 3: (0.40 * 1 + 0.15 * 0.9333 + 0.15 * 1) / 0.70 per business
  assert.equal(A.S3, 0.9857);
  assert.equal(A.lf_pack_overlap, 3); // LF top 3 vs organic local_pack cross-check
  const B = rows.find(r => r.cell_id === 'B');
  assert.deepEqual([B.stopped_at, B.maps_bought, B.lf_top3_joined], ['step2', true, 2]);
  // proximity probe: north keeps 3 of 3, south 1 of 3 -> mean 2
  const prox = JSON.parse(fs.readFileSync(path.join(base, 'out', 'stage2-proximity.json'), 'utf8'));
  assert.deepEqual(prox.cells[0].probes.map(p => p.survivors), [3, 1]);
  assert.equal(prox.mean_survivors_of_3, 2);
  // the pilot planner asks organic for schema 2 only
  assert.ok(planStep1(loadConfig(FIXTURE_CONFIG)).filter(r => r.endpoint === ORGANIC_ENDPOINT).every(r => r.minSchema === ORGANIC_SCHEMA));
});

test('R4 category rules: exact / contains+exclude / generic+title / conditional+title, with unmatched diagnostics', () => {
  const run = loadConfig(FIXTURE_CONFIG).run;
  const alpha = { slug: 'alpha', terms: ['alpha one', 'alpha two'] };
  const c = b => classifyRelevance(b, alpha, run);
  assert.deepEqual(c({ category: 'Alpha Contractor' }), { relevant: true, via: 'exact', unmatched: [] });
  assert.deepEqual(c({ category: 'Roof alpha store' }), { relevant: false, via: null, unmatched: [] }); // excluded, not "unmatched"
  assert.equal(c({ category: 'Contractor', title: 'alpha one Works' }).via, 'generic_title');
  assert.equal(c({ category: 'Contractor', title: 'Works' }).relevant, false);
  assert.equal(c({ title: 'the alf shop' }).via, 'generic_title'); // null primary + title_terms_extra stem
  assert.equal(c({ category: 'General Builder', title: 'Zed' }).relevant, false);
  assert.equal(c({ category: 'General Builder', title: 'the alf builders' }).via, 'conditional_title');
  assert.deepEqual(c({ category: 'Mystery', additional_categories: ['Alpha Contractor'] }), { relevant: true, via: 'exact', unmatched: ['Mystery'] });
  assert.equal(c({ category: 'Alpha Contractor', is_directory_item: true }).via, 'directory');
  assert.deepEqual(titleTerms(alpha, run), ['alpha one', 'alpha two', 'alpha', 'alf']);
  assert.match(categoryId('x'), /^cat-[0-9a-f]{8}$/);

  // Engine diagnostics: every top-20 category text that matched no rule, per cell.
  const base = tmp();
  return fullRun(base, createFakeFetch()).then(() => {
    const diag = JSON.parse(fs.readFileSync(path.join(base, 'out', 'stage2-category-diagnostics.json'), 'utf8'));
    const B = diag.cells.find(x => x.cell_id === 'B');
    assert.ok(B.unmatched.some(u => u.category === 'Mystery Category' && u.items === 1 && u.items_relevant_anyway === 0));
    assert.deepEqual(B.top20_relevance, { exact: 8, not_relevant: 2, generic_title: 1, conditional_title: 1, directory: 1 });
    assert.match(diag.cells.find(x => x.cell_id === 'A').skipped, /step 1/);
  });
});

test('R12 config: all 17 professions have category rules copied byte-exact from the spec', () => {
  const spec = fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8');
  const r12 = extractR12(spec);
  const runConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/market-scanner/run-config.json'), 'utf8'));
  const professions = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/market-scanner/professions.json'), 'utf8')).professions;
  assert.deepEqual(Object.keys(runConfig.stage2.category_rules).sort(), professions.map(p => p.slug).sort());
  assert.deepEqual(runConfig.stage2.category_rules, r12.stage2.category_rules);
  assert.deepEqual(runConfig.stage2.generic_categories, r12.stage2.generic_categories);
  assert.deepEqual(runConfig.languages, { ads_language_code: 'iw', serp_language_code: 'he' });
  assert.deepEqual(runConfig.stage2.zooms, ['13z']);
  for (const k of ['category_allowlist', 'prospect_min_gaps', 'prospect_pass', 'prospect_kill_below']) assert.equal(runConfig.stage2[k], undefined, k);
  assert.equal(runConfig.pilot.cells.length, 6);
  // idempotent: merging again changes nothing but the provenance stamp
  const again = mergeR12(runConfig, r12, runConfig.r12_applied.spec_sha256);
  assert.deepEqual(again, runConfig);
});

test('R6 prospects: weak ranking gate, lead-gen phones, weighted count; R7 directory multiplier', async () => {
  const base = tmp();
  await fullRun(base, createFakeFetch());
  const rows = JSON.parse(fs.readFileSync(path.join(base, 'out', 'stage2-pilot.json'), 'utf8'));
  const priv = JSON.parse(fs.readFileSync(path.join(base, 'private', 'stage2-pilot-businesses.json'), 'utf8'));
  const prospects = cell => priv.filter(r => r.cell_id === cell && r.role === 'prospect');
  // B: 10 no site (1.25), 12 OK site (1.00), 13 weak site (1.10), 18 robots-skipped (1.00) = 4.35.
  // Excluded: 7/8 (LF top 3), 16 (best raw rank 2 < 4), 11 (exclude stem), 14 (no rule), 15 (directory),
  // 17 (no phone), 19 (outside the cell), 20 (not alive).
  assert.deepEqual(prospects('B').map(r => [r.cid, r.w_b, r.site]), [['10', 1.25, 'none'], ['12', 1, 'ok'], ['13', 1.1, 'weak'], ['18', 1, 'skipped_robots']]);
  const B = rows.find(r => r.cell_id === 'B');
  assert.deepEqual([B.P, B.P_w], [4, 4.35]);
  assert.match(B.kill_reason, /P_w<8/);
  // C (urgency trade): 30 and 31 share one phone -> lead_gen, never prospects; 32 (no site) is.
  assert.deepEqual(prospects('C').map(r => [r.cid, r.w_b]), [['32', 1.25]]);
  const C = rows.find(r => r.cell_id === 'C');
  assert.deepEqual([C.urgency_lead_gen, C.lead_gen_listings, C.P, C.P_w], [true, 2, 1, 1.25]);
  // R7 on B's organic top 10: directory, social, local (pool), local (default), unresolved, media
  // -> counted 5, L_share 2/5, D_share 1/5, O = 0.80 + 0.40 * 0.4 = 0.96; AI Overview logged.
  assert.deepEqual([B.organic_counted, B.organic_unresolved, B.L_share, B.D_share, B.O, B.has_ai_overview], [5, 1, 0.4, 0.2, 0.96, true]);
  const run = loadConfig(FIXTURE_CONFIG).run;
  const allDirs = classifyOrganic({ items: [1, 2].map(i => ({ type: 'organic', rank_group: i, domain: `www.dir.example` })) }, { run });
  assert.deepEqual([allDirs.L_share, allDirs.O], [0, 0.8]);
  const allLocal = classifyOrganic({ items: [{ type: 'organic', rank_group: 1, domain: 'a.example' }] }, { run });
  assert.ok(Math.abs(allLocal.O - 1.2) < 1e-12);
  const national = classifyOrganic({ items: [{ type: 'organic', rank_group: 1, domain: 'chain.example' }, { type: 'organic', rank_group: 2, domain: 'pool.example' }] }, { run, chainDomains: new Set(['chain.example', 'pool.example']), poolDomains: new Set(['pool.example']) });
  assert.deepEqual(national.rows.map(r => r.class), ['national_brand', 'local_site_pool']); // pool match beats chain flag
});

test('R8 homepage check: robots respected, http fallback, derived fields only - never raw HTML', async () => {
  const base = tmp();
  const web = [];
  await runEngine({ stage: '1', ...dirs(base), token: 'fake', fetchImpl: createFakeFetch(), now: FIXED_NOW });
  await runEngine({ stage: 'pilot', ...dirs(base), token: 'fake', fetchImpl: createFakeFetch(), siteFetchImpl: createFakeWeb({ onCall: (u, init) => web.push([u, init.headers?.['User-Agent']]) }), now: FIXED_NOW });
  assert.ok(web.every(([, ua]) => ua === 'WAO-MarketScan/1.0 (+https://www.wao.co.il)'));
  assert.ok(!web.some(([u]) => u === 'https://robots.example/'), 'homepage fetched although robots.txt disallows /');
  const dir = path.join(base, 'cache', HOMEPAGE_CACHE_SUBDIR);
  const recs = fs.readdirSync(dir).map(f => ({ f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));
  assert.equal(recs.length, 5);
  const ALLOWED = new Set(['host', 'checked_at', 'site_check', 'scheme_tried', 'status', 'final_host', 'fetch_ok', 'parked', 'https', 'viewport', 'title', 'h1', 'internal_paths', 'multi_page', 'fetch_ms', 'fetch_ms_note', 'platform', 'bytes', 'error']);
  for (const { text } of recs) {
    assert.ok(!/[<>]/.test(text), 'cached homepage record contains markup');
    assert.ok(!/secretInlineScript|doctype|xxxxxxxx/i.test(text), 'cached homepage record contains page body');
    for (const k of Object.keys(JSON.parse(text))) assert.ok(ALLOWED.has(k), `unexpected cached field ${k}`);
  }
  const byHost = Object.fromEntries(recs.map(r => JSON.parse(r.text)).map(r => [r.host, r]));
  assert.equal(byHost['robots.example'].site_check, 'skipped_robots');
  assert.deepEqual([byHost['site13.example'].scheme_tried, byHost['site13.example'].https, byHost['site13.example'].viewport, byHost['site13.example'].fetch_ok], ['http', false, false, true]);
  assert.deepEqual([byHost['site12.example'].internal_paths, byHost['site12.example'].multi_page, byHost['site12.example'].platform, byHost['site12.example'].title], [3, true, 'wordpress', 'alpha one in City Three']);
  assert.deepEqual([byHost['b7.example'].final_host, byHost['b7.example'].platform], ['www.b7.example', 'wix']);
  assert.deepEqual([byHost['b8.example'].status, byHost['b8.example'].fetch_ok], [500, false]);
  // weak-site rule
  const cfg = loadConfig(FIXTURE_CONFIG).run.homepage_check;
  const ctx = { cityNames: ['City Three'], titleTerms: ['alpha one'] };
  assert.deepEqual(siteVerdict(byHost['site12.example'], ctx, cfg), { city_hit: true, service_hit: true, hard: false, soft: 0, weak_site: false });
  assert.equal(siteVerdict(byHost['site13.example'], ctx, cfg).weak_site, true); // hard: no https, no viewport
  assert.equal(siteVerdict({ fetch_ok: true, https: true, viewport: true, title: 'Home', h1: '', multi_page: true, fetch_ms: 100 }, ctx, cfg).weak_site, true); // soft 2: no city + no service
  assert.equal(siteVerdict({ site_check: 'skipped_robots' }, ctx, cfg), null);
  // robots parsing
  assert.equal(robotsAllows('User-agent: *\nDisallow: /', cfg.user_agent), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nAllow: /$', cfg.user_agent), true);
  assert.equal(robotsAllows('User-agent: WAO-MarketScan\nDisallow:\n\nUser-agent: *\nDisallow: /', cfg.user_agent), true);
  assert.equal(robotsAllows('', cfg.user_agent), true);
  // unreachable host -> error record, never throws
  const err = await checkHomepage('nowhere.example', { fetchImpl: createFakeWeb(), cfg, now: FIXED_NOW });
  assert.deepEqual([err.site_check, err.fetch_ok, err.error], ['error', false, 'ENOTFOUND']);
  // 30-day retention
  const later = homepageCache(path.join(base, 'cache'), cfg, () => new Date('2026-12-08T12:00:00Z'));
  assert.equal(later.get('site12.example'), undefined);
  assert.equal(later.purge(), 5);
  assert.equal(fs.readdirSync(dir).length, 0);
});

test('Stage-1 R5: per-profession region cap and grouped dedupe only at volume >= 50', async () => {
  const series = [{ year: 2026, month: 1, search_volume: 10 }];
  const low = new Map([['a', { search_volume: 10, monthly_searches: series }], ['b', { search_volume: 10, monthly_searches: series }]]);
  assert.equal(professionVolume(['a', 'b'], low, 50).total, 20); // both at the 10-search floor: summed
  assert.equal(professionVolume(['a', 'b'], low, 1).total, 10);
  // Per-profession cap: with the pass rule opened up, at most 1 region per profession advances.
  const base = tmp();
  const cfgDir = path.join(base, 'config');
  fs.cpSync(FIXTURE_CONFIG, cfgDir, { recursive: true });
  const runCfg = JSON.parse(fs.readFileSync(path.join(cfgDir, 'run-config.json'), 'utf8'));
  Object.assign(runCfg.stage1, { min_region_volume: 0, value_top_fraction: 1, max_pairs_per_profession: 1 });
  fs.writeFileSync(path.join(cfgDir, 'run-config.json'), JSON.stringify(runCfg));
  await runEngine({ stage: '1', ...dirs(base), configDir: cfgDir, token: 'fake', fetchImpl: createFakeFetch() });
  const pairs = JSON.parse(fs.readFileSync(path.join(base, 'out', 'stage1-pairs.json'), 'utf8'));
  assert.deepEqual(pairs.map(p => [p.slug, p.region, p.advance, p.fail_reason]), [
    ['alpha', 'R1', true, ''], ['alpha', 'R2', false, 'over_profession_cap_1'], ['beta', 'R1', true, ''], ['beta', 'R2', false, 'over_profession_cap_1'],
  ]);
  assert.equal(pairs.find(p => p.slug === 'beta').urgency_lead_gen, true);
});

test('the pilot cap is checked on the worst case before any call and can never be raised', async () => {
  const base = tmp();
  await runEngine({ stage: '1', ...dirs(base), token: 'fake', fetchImpl: createFakeFetch() });
  let calls = 0;
  await assert.rejects(
    runEngine({ stage: 'pilot', ...dirs(base), token: 'fake', fetchImpl: createFakeFetch({ onCall: () => { calls += 1; } }), cap: 0.02 }), // worst case 0.022
    err => err instanceof BudgetExceededError && /preflight/.test(err.message),
  );
  assert.equal(calls, 0);
  await assert.rejects(runEngine({ stage: 'pilot', ...dirs(tmp()), cap: 1.01, estimateOnly: true }), /never raised/);
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
  const sources = ['run.mjs', 'build-config.mjs', 'free-checks.mjs', 'category-catalog.mjs', 'apply-r12.mjs', 'lib/spec.mjs', 'lib/cities.mjs', 'lib/dfs.mjs', 'lib/stage1.mjs', 'lib/stage2.mjs', 'lib/engine.mjs', 'lib/output.mjs', 'lib/relevance.mjs', 'lib/organic.mjs', 'lib/homepage.mjs'];
  for (const f of sources) assert.ok(!/[\u0590-\u05ff]/.test(fs.readFileSync(path.join(HERE, f), 'utf8')), `${f} contains Hebrew`);
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
