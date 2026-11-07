import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runEngine, loadConfig } from './lib/engine.mjs';
import { createDfsClient, cacheKey, cachePath, originalPath, BudgetExceededError, projectResult, breadcrumbHost, ORGANIC_SCHEMA } from './lib/dfs.mjs';
import { professionVolume, ticketProxy, scoreStage1, organicParams } from './lib/stage1.mjs';
import { businessStrength, strengthComponents, topStrength, compositeScore, gaps, orderRows, s3Band, categoryId, joinLf, planStep1, planStep2, step1Gate, proximityPoints, cellPoints, assignProspects, poolRing2, ORGANIC_ENDPOINT, LOCAL_FINDER_ENDPOINT, MAPS_ENDPOINT, e164Il, phoneBlock, bestKnownIndex, lfView, lfSiteHost, leadGenNetworks, leadGenPhones, isLeadGen, titleRule, citiesNamedIn, outOfCellTarget, prospectWeight } from './lib/stage2.mjs';
import { mergeInto } from './apply-r2-12.mjs';
import { classifyRelevance, titleTerms } from './lib/relevance.mjs';
import { classifyOrganic, nationalBrandDomains } from './lib/organic.mjs';
import { checkHomepage, checkHomepageFull, homepageCache, homepageTextStore, robotsAllows, siteVerdict, siteOutcome, confirmNxdomains, HOMEPAGE_CACHE_SUBDIR, HOMEPAGE_TEXT_SUBDIR } from './lib/homepage.mjs';
import { parseProfessions, parseRegions, SPEC_PATH } from './lib/spec.mjs';
import { extractR12, mergeR12 } from './apply-r12.mjs';
import { extractR2_12, mergeR2_12 } from './apply-r2-12.mjs';
import { extractR3_8, mergeR3_8 } from './apply-r3-8.mjs';
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

test('Stage-2 formulas match a hand-computed example (spec 4.4-5.3, legacy R1 renormalise policy, R10)', () => {
  const run = structuredClone(loadConfig(FIXTURE_CONFIG).run);
  run.stage2.s3_missing_field_policy = 'renormalize'; // legacy policy kept selectable; 2.1 neutral is tested below
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
  // 2.1 neutral fill, strong LF top 3: 0.40 * 1 + 0.15 * 0.9333 + 0.5 * (0.20 + 0.10) + 0.15 * 1 = 0.84 >= 0.75
  assert.equal(A.S3, 0.84);
  assert.equal(A.gate_reason, 'step1_saturated');
  assert.equal(A.lf_pack_overlap, null); // organic is a step-2 purchase now (2.11); killed cells never read it
  const B = rows.find(r => r.cell_id === 'B');
  assert.deepEqual([B.stopped_at, B.maps_bought, B.lf_top3_joined], ['step2', true, 2]);
  // proximity probe: north keeps 3 of 3, south 1 of 3 -> mean 2
  const prox = JSON.parse(fs.readFileSync(path.join(base, 'out', 'stage2-proximity.json'), 'utf8'));
  assert.deepEqual(prox.cells[0].probes.map(p => p.survivors), [3, 1]);
  assert.equal(prox.mean_survivors_of_3, 2);
  // organic moved to step 2 (2.11) and is always asked for schema 2
  const cfg = loadConfig(FIXTURE_CONFIG);
  assert.equal(planStep1(cfg).filter(r => r.endpoint === ORGANIC_ENDPOINT).length, 0);
  assert.ok(planStep2(cfg, ['A', 'B', 'C']).filter(r => r.endpoint === ORGANIC_ENDPOINT).every(r => r.minSchema === ORGANIC_SCHEMA));
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
  // R12 rules with the 2.12 replacements (roofing / renovation conditional) - all byte-exact from the spec.
  const r2 = extractR2_12(spec);
  const expectedRules = structuredClone(r12.stage2.category_rules);
  for (const [slug, rule] of Object.entries(r2.stage2.category_rules)) Object.assign(expectedRules[slug], rule);
  // + Revision 3 (3.8): movers category exclude_append
  const r3 = extractR3_8(spec);
  for (const [slug, rule] of Object.entries(r3.stage2.category_rules)) expectedRules[slug].exclude = [...new Set([...expectedRules[slug].exclude, ...rule.exclude_append])];
  assert.deepEqual(runConfig.stage2.category_rules, expectedRules);
  assert.deepEqual(runConfig.stage2.generic_categories, r12.stage2.generic_categories);
  assert.deepEqual(runConfig.languages, { ads_language_code: 'iw', serp_language_code: 'he' });
  assert.deepEqual(runConfig.stage2.zooms, ['13z']);
  for (const k of ['category_allowlist', 'prospect_min_gaps', 'prospect_pass', 'prospect_kill_below']) assert.equal(runConfig.stage2[k], undefined, k);
  assert.equal(runConfig.pilot.cells.length, 6);
  // idempotent: R12 then 2.12 again changes nothing
  const again = mergeR3_8(mergeR2_12(mergeR12(runConfig, r12, runConfig.r12_applied.spec_sha256), r2, runConfig.r2_12_applied.spec_sha256), r3, runConfig.r3_8_applied.spec_sha256);
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
  // R7 + 2.2 on B's organic top 10: directory, social, local (pool), local (default, half weight),
  // unresolved, media -> counted 5, L_share (1 + 0.5) / 5 = 0.3, D_share 1/5, O = 0.80 + 0.40 * 0.3 = 0.92.
  assert.deepEqual([B.organic_counted, B.organic_unresolved, B.L_share, B.D_share, B.O, B.has_ai_overview, B.local_pool, B.local_default], [5, 1, 0.3, 0.2, 0.92, true, 1, 1]);
  const run = loadConfig(FIXTURE_CONFIG).run;
  const allDirs = classifyOrganic({ items: [1, 2].map(i => ({ type: 'organic', rank_group: i, domain: `www.dir.example` })) }, { run });
  assert.deepEqual([allDirs.L_share, allDirs.O], [0, 0.8]);
  const allLocal = classifyOrganic({ items: [{ type: 'organic', rank_group: 1, domain: 'a.example' }] }, { run, poolDomains: new Set(['a.example']) });
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
  // 2.7: the cache record carries no page text; title / first h1 live in the private store only
  const ALLOWED = new Set(['schema', 'host', 'checked_at', 'site_check', 'reason', 'scheme_tried', 'status', 'final_host', 'fetch_ok', 'parked', 'https', 'viewport', 'internal_paths', 'multi_page', 'fetch_ms', 'fetch_ms_note', 'platform', 'bytes', 'error', 'requests']);
  for (const { text } of recs) {
    assert.ok(!/[<>]/.test(text), 'cached homepage record contains markup');
    assert.ok(!/secretInlineScript|doctype|xxxxxxxx/i.test(text), 'cached homepage record contains page body');
    for (const k of Object.keys(JSON.parse(text))) assert.ok(ALLOWED.has(k), `unexpected cached field ${k}`);
  }
  const byHost = Object.fromEntries(recs.map(r => JSON.parse(r.text)).map(r => [r.host, r]));
  assert.equal(byHost['robots.example'].site_check, 'skipped_robots');
  assert.deepEqual([byHost['site13.example'].scheme_tried, byHost['site13.example'].https, byHost['site13.example'].viewport, byHost['site13.example'].fetch_ok], ['http', false, false, true]);
  assert.deepEqual([byHost['site12.example'].internal_paths, byHost['site12.example'].multi_page, byHost['site12.example'].platform, byHost['site12.example'].title], [3, true, 'wordpress', undefined]);
  assert.deepEqual([byHost['b7.example'].final_host, byHost['b7.example'].platform], ['www.b7.example', 'wix']);
  // 2.5: a 500 after one retry is a hard failure
  assert.deepEqual([byHost['b8.example'].status, byHost['b8.example'].site_check, byHost['b8.example'].reason], [500, 'failed', 'status_5xx_after_retry']);
  const texts = homepageTextStore(path.join(base, 'private'), loadConfig(FIXTURE_CONFIG).run.homepage_check, FIXED_NOW);
  assert.deepEqual(texts.get('site12.example'), { host: 'site12.example', checked_at: '2026-11-07T12:00:00.000Z', title: 'alpha one in City Three', first_h1: 'Welcome' });
  // weak-site rule
  const cfg = loadConfig(FIXTURE_CONFIG).run.homepage_check;
  const ctx = { cityNames: ['City Three'], titleTerms: ['alpha one'] };
  assert.deepEqual(siteVerdict(byHost['site12.example'], { title: 'alpha one in City Three', h1: 'Welcome' }, ctx, cfg), { city_hit: true, service_hit: true, hard: false, soft: 0, weak_site: false });
  assert.equal(siteVerdict(byHost['site13.example'], { title: 'Home', h1: 'Hello' }, ctx, cfg).weak_site, true); // hard: no https, no viewport
  assert.equal(siteVerdict({ site_check: 'ok', fetch_ok: true, https: true, viewport: true, multi_page: true, fetch_ms: 100 }, { title: 'Home', h1: '' }, ctx, cfg).weak_site, true); // soft 2: no city + no service
  assert.equal(siteVerdict({ site_check: 'skipped_robots' }, null, ctx, cfg), null);
  assert.equal(siteVerdict(byHost['b8.example'], null, ctx, cfg).weak_site, true);
  // robots parsing
  assert.equal(robotsAllows('User-agent: *\nDisallow: /', cfg.user_agent), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nAllow: /$', cfg.user_agent), true);
  assert.equal(robotsAllows('User-agent: WAO-MarketScan\nDisallow:\n\nUser-agent: *\nDisallow: /', cfg.user_agent), true);
  assert.equal(robotsAllows('', cfg.user_agent), true);
  // NXDOMAIN host -> failed record (2.5 hard fail), never throws
  const err = await checkHomepage('nowhere.example', { fetchImpl: createFakeWeb(), cfg, now: FIXED_NOW });
  assert.deepEqual([err.site_check, err.fetch_ok, err.reason], ['failed', false, 'dns_nxdomain']);
  // 30-day retention
  const later = homepageCache(path.join(base, 'cache'), cfg, () => new Date('2026-12-08T12:00:00Z'));
  assert.equal(later.get('site12.example'), undefined);
  assert.equal(later.purge(), 5);
  assert.equal(fs.readdirSync(dir).length, 0);
  const laterText = homepageTextStore(path.join(base, 'private'), cfg, () => new Date('2026-12-08T12:00:00Z'));
  assert.equal(laterText.get('site12.example'), undefined);
  assert.ok(laterText.purge() >= 1);
  assert.equal(fs.readdirSync(path.join(base, 'private', HOMEPAGE_TEXT_SUBDIR)).length, 0);
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
  const sources = ['run.mjs', 'build-config.mjs', 'free-checks.mjs', 'category-catalog.mjs', 'apply-r12.mjs', 'apply-r2-12.mjs', 'apply-r3-8.mjs', 'confirm-nxdomain.mjs', 'price-check.mjs', 'lib/spec.mjs', 'lib/cities.mjs', 'lib/dfs.mjs', 'lib/stage1.mjs', 'lib/stage2.mjs', 'lib/engine.mjs', 'lib/output.mjs', 'lib/relevance.mjs', 'lib/organic.mjs', 'lib/homepage.mjs'];
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

// ---- Revision 2 (spec 2.1-2.12) -----------------------------------------------------------------
const fixtureConfig = () => loadConfig(FIXTURE_CONFIG);
const lfRedirect = (cid, title, votes = 150, rating = 5) => ({ type: 'local_pack', rank_group: 1, cid: String(cid), title, domain: 'google.com', url: `https://google.com/goto?url=${cid}`, rating: { value: rating, votes_count: votes } });

test('2.1 neutral fill: missing = 0.5 x weight, bounds 0 / 1; step-1 gate kills only at >= 0.75', () => {
  const config = fixtureConfig();
  const { run } = config;
  const ctx = { run, profession: { terms: ['alpha one'] }, city: { he_name: 'City One' } };
  const lf = lfRedirect(5, 'x');
  // site + photos unknown: 0.40 + 0.15 + 0.5 * (0.20 + 0.10) = 0.70; low 0.55; high 0.85
  assert.ok(Math.abs(businessStrength(lf, ctx) - 0.70) < 1e-12);
  assert.ok(Math.abs(businessStrength(lf, ctx, 0) - 0.55) < 1e-12);
  assert.ok(Math.abs(businessStrength(lf, ctx, 1) - 0.85) < 1e-12);
  // no website at all is a known 0 - only photos is missing: 0.40 + 0.15 + 0 + 0.05 = 0.60
  assert.ok(Math.abs(businessStrength({ cid: '6', title: 'x', rating: { value: 5, votes_count: 150 } }, ctx) - 0.60) < 1e-12);
  // gate on synthetic LF responses
  const lfFor = items => (endpoint, params) => (endpoint === LOCAL_FINDER_ENDPOINT ? { items: items(params) } : undefined);
  const three = title => () => [1, 2, 3].map(i => ({ ...lfRedirect(i, title), rank_group: i }));
  const gate = (specs, items) => step1Gate(config, lfFor(items), { specs, mode: 'm4' }).cells.map(c => [c.cell.id, Math.round(c.S3_step1 * 1e4) / 1e4, c.survives, c.gate_reason]);
  // 0.70 survives step 1 (0.70 is the joined-S3 kill, not the step-1 kill); stuffed titles -> 0.85 killed
  assert.deepEqual(gate([{ id: 'X', profession: 'alpha', city: 'c3' }], three('plain')), [['X', 0.7, true, 'step1_pass']]);
  assert.deepEqual(gate([{ id: 'X', profession: 'alpha', city: 'c3' }], three('alpha one Pro')), [['X', 0.85, false, 'step1_saturated']]);
  // haredi-flagged cell: step 1 only whatever its S3; calibration cell: forced through
  assert.deepEqual(gate([{ id: 'H', profession: 'alpha', city: 'c2' }], three('plain')), [['H', 0.7, false, 'haredi_flag_step1_only']]);
  assert.deepEqual(gate([{ id: 'K', profession: 'alpha', city: 'c3', force_step2: true }], three('alpha one Pro')), [['K', 0.85, true, 'forced_calibration']]);
});

test('2.9 proximity: N/S for big cities, extra E/W per city, none for flagged cells; pilot probes logged only', () => {
  const config = fixtureConfig();
  const { run } = config;
  const city = { lat: 32, lng: 34.8 };
  // 3 km = 0.02695 deg latitude; longitude scaled by cos(32 deg) -> 0.03178
  assert.deepEqual(proximityPoints(city, 3, ['N', 'S', 'E', 'W']), [
    { dir: 'north', lat: 32.02695, lng: 34.8 }, { dir: 'south', lat: 31.97305, lng: 34.8 },
    { dir: 'east', lat: 32, lng: 34.83178 }, { dir: 'west', lat: 32, lng: 34.76822 },
  ]);
  const [c1, c2, c3] = ['c1', 'c2', 'c3'].map(slug => config.areas.regions.flatMap(r => r.cities).find(c => c.slug === slug));
  const dirs = (cityObj, mode, extra = {}) => cellPoints({ city: cityObj, ...extra }, run, mode);
  assert.deepEqual(dirs(c1, 'm4').scored.map(p => p.dir), ['centroid', 'north', 'south', 'east', 'west']); // pop 1000 > 900, + E/W by city
  assert.deepEqual(dirs(c3, 'm4').scored.map(p => p.dir), ['centroid', 'north', 'south']);
  assert.deepEqual(dirs(c2, 'm4').scored.map(p => p.dir), ['centroid']); // haredi-flagged: no probes
  assert.deepEqual(dirs(c1, 'pilot', { proximity_probe: true }), { scored: [{ dir: 'centroid', lat: 32, lng: 34.8 }], logged: proximityPoints(c1, 3) });
  // the N/S points are byte-identical to the M3 probes, so cached probes are reused
  assert.deepEqual(proximityPoints(c1, 3).map(p => p.dir), ['north', 'south']);
});

test('2.2 organic lists match by host suffix; chain_retail class; default hosts count half', () => {
  const run = fixtureConfig().run;
  const o = (rank, domain) => ({ type: 'organic', rank_group: rank, domain });
  const data = { items: [o(1, 'www.dir.example'), o(2, 'he-il.facebook.com'), o(3, 'sub.news.example'), o(4, 'bigbox.example'), o(5, 'pool.example'), o(6, 'nat.example'), o(7, 'other.example'), o(8, 'x.press.example')] };
  const res = classifyOrganic(data, { run, poolDomains: new Set(['pool.example']), nationalDomains: new Set(['nat.example']) });
  assert.deepEqual(res.rows.map(r => r.class), ['directory', 'social', 'media_info', 'chain_retail', 'local_site_pool', 'national_brand', 'local_default', 'media_info']);
  // L_share = (1 pool + 0.5 x 1 default) / 8 = 0.1875; D_share 1/8; O = 0.80 + 0.40 x 0.1875 = 0.875
  assert.deepEqual([res.L_share, res.D_share, res.O, res.local_pool, res.local_default], [0.1875, 0.125, 0.875, 1, 1]);
});

test('2.3 national brand: >= 3 regions across re-buy + cell SERPs; a Maps-pool match still wins', () => {
  const run = fixtureConfig().run;
  const serp = hosts => ({ items: hosts.map((d, i) => ({ type: 'organic', rank_group: i + 1, domain: d })) });
  const national = nationalBrandDomains([
    { profession: 'alpha', region: 'R1', data: serp(['www.nat.example', 'two.example']) },
    { profession: 'alpha', region: 'R2', data: serp(['nat.example', 'two.example']) },
    { profession: 'alpha', region: 'R3', data: serp(['nat.example']) }, // e.g. a cell SERP in a third region
    { profession: 'beta', region: 'R4', data: serp(['nat.example']) }, // other profession: not counted
  ], 3);
  assert.deepEqual([...national.get('alpha')], ['nat.example']);
  assert.deepEqual([...national.get('beta')], []);
  const res = classifyOrganic(serp(['nat.example']), { run, nationalDomains: national.get('alpha') });
  assert.equal(res.rows[0].class, 'national_brand');
  assert.equal(classifyOrganic(serp(['nat.example']), { run, nationalDomains: national.get('alpha'), poolDomains: new Set(['nat.example']) }).rows[0].class, 'local_site_pool');
});

test('2.3 re-buy: the schema upgrade preserves the original Stage-1 sample', async () => {
  const base = tmp();
  const config = fixtureConfig();
  const params = organicParams(config.professions[0], config.areas.regions[0], config.run);
  const file = cachePath(base, ORGANIC_ENDPOINT, params);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const v1 = { item_types: ['organic'], items: [{ type: 'organic', rank_group: 1, domain: 'google.com' }] }; // no local pack
  fs.writeFileSync(file, JSON.stringify({ endpoint: ORGANIC_ENDPOINT, params, data: v1 }));
  const client = createDfsClient({ token: 'fake', fetchImpl: createFakeFetch(), cacheDir: base, capUsd: 1, prices: config.run.prices_usd });
  const fresh = await client.call(ORGANIC_ENDPOINT, params, ORGANIC_SCHEMA);
  assert.equal(fresh.schema, ORGANIC_SCHEMA);
  assert.ok(fs.existsSync(originalPath(file)));
  assert.deepEqual(client.peekOriginal(ORGANIC_ENDPOINT, params), v1); // Stage 1 keeps scoring on this
  assert.equal(client.peek(ORGANIC_ENDPOINT, params, ORGANIC_SCHEMA).schema, ORGANIC_SCHEMA);
  // a second upgrade-write never overwrites the preserved original
  fs.writeFileSync(file, JSON.stringify({ endpoint: ORGANIC_ENDPOINT, params, data: v1 }));
  await client.call(ORGANIC_ENDPOINT, params, ORGANIC_SCHEMA);
  assert.deepEqual(client.peekOriginal(ORGANIC_ENDPOINT, params), v1);
});

test('2.5 / 2.6 anti-bot and fetch failures: challenges are not_checked, never failed; robots first', async () => {
  const cfg = fixtureConfig().run.homepage_check;
  const ok = { status: 200, type: 'text/html', body: `<html><head><title>t</title><meta name="viewport" content="width=device-width"></head><body><h1>h</h1>${'x'.repeat(5000)}</body></html>` };
  const r404 = { status: 404, type: 'text/plain', body: '' };
  const sites = {
    'https://sg.example/robots.txt': r404, 'https://sg.example/': { status: 202, headers: { 'sg-captcha': 'challenge' }, body: '<meta http-equiv="refresh" content="0;/.well-known/sgcaptcha/">' },
    'https://cf.example/robots.txt': r404, 'https://cf.example/': { status: 403, headers: { 'cf-mitigated': 'challenge' }, body: 'x'.repeat(9000) },
    'https://jam.example/robots.txt': r404, 'https://jam.example/': { status: 200, body: '<html><title>Just a moment...</title></html>' },
    'https://rate.example/robots.txt': r404, 'https://rate.example/': { status: 429, body: '' },
    'https://odd.example/robots.txt': r404, 'https://odd.example/': { status: 406, body: 'Not Acceptable' },
    'https://slow.example/robots.txt': r404, 'https://slow.example/': { throws: 'timeout' },
    'https://retry.example/robots.txt': r404, 'https://retry.example/': { sequence: [{ throws: 'timeout' }, ok] },
    'https://gone.example/robots.txt': r404, 'https://gone.example/': { status: 410, body: '' },
    'https://down.example/robots.txt': r404, 'https://down.example/': { status: 500, body: 'oops' },
    'https://busy.example/robots.txt': r404, 'https://busy.example/': { status: 503, body: '<p>imunify360 bot protection</p>' },
    'https://tls.example/robots.txt': { throws: 'CERT_HAS_EXPIRED' }, 'http://tls.example/robots.txt': { throws: 'ECONNREFUSED' },
    'https://r5.example/robots.txt': { status: 503, type: 'text/plain', body: '' },
    'https://r4.example/robots.txt': { status: 403, type: 'text/plain', body: '' }, 'https://r4.example/': ok,
    'https://parked.example/robots.txt': r404, 'https://parked.example/': { status: 200, body: '<html><title>x</title></html>' },
  };
  const calls = [];
  const fetchImpl = createFakeWeb({ sites, onCall: u => calls.push(u) });
  const check = async host => checkHomepage(host, { fetchImpl, cfg, now: FIXED_NOW });
  const outcome = async host => { const r = await check(host); return [r.site_check, r.reason]; };
  assert.deepEqual(await outcome('sg.example'), ['blocked', 'challenge_202']); // SiteGround 202 + sg-captcha
  assert.deepEqual(await outcome('cf.example'), ['blocked', 'challenge_403']);
  assert.deepEqual(await outcome('jam.example'), ['blocked', 'challenge_200']); // challenge marker, never "parked"
  assert.deepEqual(await outcome('rate.example'), ['blocked', 'status_429']);
  assert.deepEqual(await outcome('odd.example'), ['blocked', 'status_406']);
  assert.deepEqual(await outcome('slow.example'), ['timeout', 'timeout_twice']);
  assert.equal(calls.filter(u => u === 'https://slow.example/').length, 2); // one retry
  assert.equal((await check('retry.example')).site_check, 'ok');
  assert.deepEqual(await outcome('gone.example'), ['failed', 'status_404_410']);
  assert.deepEqual(await outcome('down.example'), ['failed', 'status_5xx_after_retry']);
  assert.equal(calls.filter(u => u === 'https://down.example/').length, 2);
  assert.deepEqual(await outcome('busy.example'), ['blocked', 'challenge_503']); // 503 + marker: not retried, not failed
  assert.deepEqual(await outcome('tls.example'), ['failed', 'connect_or_tls_both_schemes']);
  assert.ok(calls.filter(u => u.includes('tls.example')).length <= 4);
  assert.deepEqual(await outcome('r5.example'), ['skipped_robots', 'robots_503']); // RFC 9309: 5xx -> disallow
  assert.equal(calls.includes('https://r5.example/'), false);
  assert.equal((await check('r4.example')).site_check, 'ok'); // RFC 9309: 4xx -> allowed
  assert.deepEqual(await outcome('parked.example'), ['failed', 'parked']);
  assert.deepEqual(await outcome('nx.example'), ['failed', 'dns_nxdomain']);
  // robots before the homepage, always
  for (const host of ['sg.example', 'gone.example', 'r4.example']) assert.ok(calls.indexOf(`https://${host}/robots.txt`) < calls.indexOf(`https://${host}/`));
  // weights: not checked -> 1.00, failed -> 1.10 (has a domain)
  const ctx = { cityNames: ['City'], titleTerms: ['alpha'] };
  assert.equal(siteVerdict(await check('sg.example'), null, ctx, cfg), null);
  assert.equal(siteVerdict(await check('gone.example'), null, ctx, cfg).weak_site, true);
  // the full check returns page text separately from the cacheable record (2.7)
  const full = await checkHomepageFull('r4.example', { fetchImpl, cfg, now: FIXED_NOW });
  assert.deepEqual(full.text, { title: 't', h1: 'h' });
  assert.equal(full.record.title, undefined);
});

test('2.8 one business -> one cell per profession: nearest centroid, tie -> city slug asc', () => {
  const run = fixtureConfig().run;
  const b = (id, lat, lng) => ({ _id: id, cid: id, phone: `+972-${id}`, rating: { votes_count: 3 }, latitude: lat, longitude: lng, address_info: { city: 'Elsewhere' } });
  const cell = (slug, city, lat, lng, items) => ({ cellKey: `${slug}|${city}`, cell: { profession: { slug } }, city: { slug: city, lat, lng, he_name: city }, lfTop3: [], lfTop3Ids: new Set(), ranked: items, rawRank: new Map(items.map(x => [x._id, 5])) });
  const near = b('1', 31.01, 34.9); // nearer cz (31.0) than ca (31.04)
  const tie = b('2', 31.02, 34.9); // equidistant from ca (31.04) and cz (31.0)
  const cells = [cell('alpha', 'cz', 31.0, 34.9, [near, tie]), cell('alpha', 'ca', 31.04, 34.9, [near, tie]), cell('beta', 'cz', 31.0, 34.9, [tie])];
  const out = assignProspects(cells, new Set(), new Map(), run);
  assert.deepEqual(out.get('alpha|cz').map(p => p.id), ['1']);
  assert.deepEqual(out.get('alpha|ca').map(p => p.id), ['2']); // tie -> city slug asc ("ca" < "cz")
  assert.deepEqual(out.get('beta|cz').map(p => p.id), ['2']); // same cid may count in another profession
  // a business in the LF top 3 of any scored point never counts as a prospect
  const inTop = cell('alpha', 'cq', 31.0, 34.9, [near]);
  inTop.lfTop3Ids = new Set(['1']);
  assert.deepEqual(assignProspects([inTop], new Set(), new Map(), run).get('alpha|cq'), []);
});

test('2.8 ring2 pooling: P_w summed, S3 / O population-weighted, value summed; core never pools', () => {
  const run = fixtureConfig().run;
  const row = (city, ring, extra) => ({ cell_id: city, slug: 'alpha', trade_he: 'T', region: 'R9', city, ring, maps_bought: true, ranked: true, flags: '', P: 4, kit_level: 1, W: 0.5, ...extra });
  const rows = [
    row('t1', 'ring2', { population: 1000, S3: 0.5, O: 1.0, value_usd: 100, P_w: 5 }),
    row('t2', 'ring2', { population: 3000, S3: 0.6, O: 0.9, value_usd: 200, P_w: 6 }),
    row('t3', 'ring2', { population: 500, S3: 0.75, O: 1, value_usd: 50, P_w: 4 }), // saturated: never pooled
    row('t4', 'ring2', { population: 500, S3: 0.3, O: 1, value_usd: 50, P_w: 20 }), // P_w >= 15: stands alone
    row('k1', 'core', { population: 9000, S3: 0.3, O: 1, value_usd: 500, P_w: 3 }),
  ];
  const [cluster, ...more] = poolRing2(rows, run);
  assert.equal(more.length, 0);
  // S3 = (1000 x 0.5 + 3000 x 0.6) / 4000 = 0.575; O = 0.925; score = 300 x 0.425^2 x 11/15 x 0.925 = 36.7572
  assert.deepEqual([cluster.cell_id, cluster.pool_members, cluster.P_w, cluster.S3, cluster.O, cluster.value_usd, cluster.score, cluster.kill_reason], ['alpha@R9-ring2', 't1;t2', 11, 0.575, 0.925, 300, 36.7572, '']);
  assert.deepEqual(rows.map(r => r.pooled_into ?? null), ['alpha@R9-ring2', 'alpha@R9-ring2', null, null, null]);
});

async function m4Fixture() {
  const base = tmp();
  const cfgDir = path.join(base, 'config');
  fs.cpSync(FIXTURE_CONFIG, cfgDir, { recursive: true });
  const runCfg = JSON.parse(fs.readFileSync(path.join(cfgDir, 'run-config.json'), 'utf8'));
  Object.assign(runCfg.stage1, { min_region_volume: 0, value_top_fraction: 1, max_pairs_per_profession: 1 }); // alpha R1 + beta R1 advance
  fs.writeFileSync(path.join(cfgDir, 'run-config.json'), JSON.stringify(runCfg));
  const d = { ...dirs(base), configDir: cfgDir };
  await runEngine({ stage: '1', ...d, token: 'fake', fetchImpl: createFakeFetch(), now: FIXED_NOW });
  return { base, d };
}
const M4_FILES = ['m4-cells.csv', 'm4-cells.json', 'm4-cells.md', 'm4-top.md', 'm4-summary.json', 'm4-category-diagnostics.json', 'm4-organic-diagnostics.json', 'm4-proximity.json'];

test('M4 on fixtures: flagged cells step 1 only, calibration forced + unranked, multi-point S3, determinism, cap', async () => {
  const { base, d } = await m4Fixture();
  const est = await runEngine({ stage: 'm4', ...d, estimateOnly: true });
  // cells: alpha@c1 (5 points), alpha@c2 (flagged, 1), beta@c1 (5), beta@c2 (flagged, 1), K = alpha x c3 (3 points)
  assert.equal(est.cells, 5);
  assert.equal(est.step1_uncached, 15);
  // worst-case step 2: alpha@c1, beta@c1, K -> 2 Maps each (organic: c1 and c3 are region anchors, cached by Stage 1)
  assert.equal(est.step2_worst_case_uncached, 6);
  assert.equal(est.estimate_usd, 0.042);
  // the cap is checked on the worst case before any call, and never raised
  let calls = 0;
  await assert.rejects(runEngine({ stage: 'm4', ...d, token: 'fake', fetchImpl: createFakeFetch({ onCall: () => { calls += 1; } }), cap: 0.04 }), err => err instanceof BudgetExceededError && /preflight/.test(err.message));
  assert.equal(calls, 0);
  await assert.rejects(runEngine({ stage: 'm4', ...d, cap: 1.01, estimateOnly: true }), /never raised/);

  const seen = [];
  const live = await runEngine({ stage: 'm4', ...d, token: 'fake', fetchImpl: createFakeFetch({ onCall: (e, t) => seen.push({ e, t }) }), siteFetchImpl: createFakeWeb(), now: FIXED_NOW });
  const maps = seen.filter(c => c.e === MAPS_ENDPOINT);
  // no Maps for the step-1 kill (alpha@c1) or the flagged cells (c2 = 32.05): beta@c1 + K only
  assert.deepEqual(maps.map(c => `${c.t.keyword}@${c.t.location_coordinate}`).sort(), ['alpha one@31,34.9,13z', 'alpha two@31,34.9,13z', 'beta one@32,34.8,13z', 'beta two@32,34.8,13z']);
  assert.equal(seen.filter(c => c.e === LOCAL_FINDER_ENDPOINT).length, 15);
  assert.ok(!seen.some(c => c.t.location_coordinate?.startsWith('32.05')) || seen.filter(c => c.t.location_coordinate?.startsWith('32.05')).every(c => c.e === LOCAL_FINDER_ENDPOINT));
  assert.equal(live.spent_usd, 0.038);
  const rows = JSON.parse(fs.readFileSync(path.join(base, 'out', 'm4-cells.json'), 'utf8'));
  const by = id => rows.find(r => r.cell_id === id);
  assert.deepEqual([by('alpha@c1').points, by('alpha@c1').gate_reason, by('alpha@c1').maps_bought, by('alpha@c1').kill_reason], [5, 'step1_saturated', false, 'saturated']);
  assert.deepEqual([by('alpha@c2').points, by('alpha@c2').gate_reason, by('alpha@c2').maps_bought, by('alpha@c2').kill_reason], [1, 'haredi_flag_step1_only', false, 'saturated;haredi_majority']);
  assert.deepEqual([by('K').ranked, by('K').rank, by('K').gate_reason, by('K').maps_bought, by('K').points, by('K').calibration], [false, null, 'forced_calibration', true, 3, 'K']);
  // alpha@c1 points: centroid strong (0.84), north = same three (0.84), south = 1 strong + 2 new strong, E/W fall back to the weak list
  assert.equal(by('alpha@c1').S3_points.split('/').length, 5);
  assert.equal(by('beta@c1').maps_bought, true);
  const summary = JSON.parse(fs.readFileSync(path.join(base, 'out', 'm4-summary.json'), 'utf8'));
  assert.deepEqual(summary.step1, { killed_saturated: 1, flagged_step1_only: 2, passed: 1, forced: 1, multi_point_cells: 3 });
  // committed outputs carry no business names, phones or domains
  for (const f of M4_FILES) {
    const text = fs.readFileSync(path.join(base, 'out', f), 'utf8');
    assert.ok(!/Biz \d|Seven Co|\+972|\.example/.test(text), `${f} leaks business data`);
  }
  assert.ok(fs.readFileSync(path.join(base, 'private', 'm4-businesses.json'), 'utf8').includes('+972'));
  assert.ok(fs.existsSync(path.join(base, 'private', 'm4-default-hosts.json')));

  // determinism: cached rerun and offline replay are byte-identical with zero network calls
  const first = Object.fromEntries(M4_FILES.map(f => [f, read(path.join(base, 'out'), f)]));
  const again = await runEngine({ stage: 'm4', ...d, token: 'fake', fetchImpl: networkForbidden(), siteFetchImpl: webForbidden(), now: FIXED_NOW });
  assert.equal(again.network_calls, 0);
  for (const f of M4_FILES) assert.ok(read(path.join(base, 'out'), f).equals(first[f]), `${f} changed on cached rerun`);
  await runEngine({ stage: 'm4', ...d, outDir: path.join(base, 'out2'), offline: true, now: FIXED_NOW });
  for (const f of M4_FILES) assert.ok(read(path.join(base, 'out2'), f).equals(first[f]), `${f} differs on offline replay`);
});

test('2.12 config: merged byte-exact from the spec; cap 6 approved; *_append arrays appended', () => {
  const spec = fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8');
  const patch = extractR2_12(spec);
  const runConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/market-scanner/run-config.json'), 'utf8'));
  assert.equal(runConfig.caps_usd['stage2-full'], 6);
  assert.equal(runConfig.stage2.s3_missing_field_policy, 'neutral');
  assert.equal(runConfig.stage2.step1_kill_s3, 0.75);
  assert.deepEqual(runConfig.stage2.proximity, patch.stage2.proximity);
  assert.deepEqual(runConfig.stage2.category_rules.roofing.conditional, patch.stage2.category_rules.roofing.conditional);
  assert.deepEqual(runConfig.stage2.category_rules.renovation.conditional, patch.stage2.category_rules.renovation.conditional);
  for (const k of ['organic_directories', 'organic_media', 'not_a_site']) for (const d of patch.stage2[`${k}_append`]) assert.ok(runConfig.stage2[k].includes(d), `${k} misses ${d}`);
  assert.deepEqual(runConfig.homepage_check.challenge_markers, patch.homepage_check.challenge_markers);
  assert.deepEqual(runConfig.m4, patch.m4);
  assert.deepEqual(mergeR2_12(runConfig, patch, runConfig.r2_12_applied.spec_sha256), runConfig); // idempotent
});

// ---- Revision 3 (spec 3.1-3.8) ------------------------------------------------------------------
// All fixtures below are synthetic: invented cids, 555-range phone numbers, .example domains.
const SPEC_TEXT = () => fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8');
// The fixture run-config with the spec's 3.8 block merged in (exactly what apply-r3-8.mjs merges).
function rev3Run(overrides = {}) {
  return mergeInto(mergeInto(fixtureConfig().run, extractR3_8(SPEC_TEXT())), overrides);
}
const ctxFor = run => ({ run, profession: { slug: 'movers-x', terms: ['alpha one'] }, city: { he_name: 'City One' } });
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('3.1 field precedence: Ashkelon-mover + broker case - Maps if joined, else best known, else neutral', () => {
  const run = rev3Run();
  const ctx = ctxFor(run);
  // The cached pattern, synthetic ids: the mover has rating null in 6 of 7 LF responses and 21
  // reviews at 5.0 in one LF response and in Maps; the broker shows 1,100 in 2 of 5 responses.
  const lfNull = (cid, title) => ({ type: 'local_pack', rank_group: 1, cid, title, domain: null, url: null, rating: null, phone: '052-555-0100' });
  const mover = cid => lfNull(cid, 'Mover Co');
  const lfResponses = [
    ...Array.from({ length: 6 }, () => [mover('900001'), lfNull('900002', 'Broker')]),
    [{ ...mover('900001'), rating: { value: 5, votes_count: 21 } }, { ...lfNull('900002', 'Broker'), rating: { value: 4.6, votes_count: 1100 } }],
    [{ ...lfNull('900002', 'Broker'), rating: { value: 4.6, votes_count: 1100 } }],
  ];
  const mapsItem = { cid: '900001', title: 'Mover Co', domain: null, total_photos: 12, rating: { value: 5, votes_count: 21 } };
  const known = bestKnownIndex([...lfResponses, [mapsItem]]);
  assert.deepEqual(known.get('900001'), { votes_count: 21, value: 5 });
  assert.deepEqual(known.get('900002'), { votes_count: 1100, value: 4.6 });
  // joined: every field from Maps, votes included (the old engine scored this slot as 0 reviews)
  const joined = lfView(mover('900001'), { poolByCid: new Map([['900001', mapsItem]]), known, run });
  assert.deepEqual([joined._joined, joined._votes_source, joined.rating.votes_count, joined.total_photos], [true, 'maps', 21, 12]);
  // Maps item without a website is a known "no site" (0); LF never is
  assert.equal(strengthComponents(joined, ctx).real_site, 0);
  // unjoined broker: best known 1,100 -> reviews saturate; site unknown -> neutral, not 0
  const broker = lfView(lfNull('900002', 'Broker'), { known, run });
  assert.deepEqual([broker._joined, broker._votes_source, broker.rating.votes_count, broker._site_known], [false, 'best_known', 1100, false]);
  assert.deepEqual(strengthComponents(broker, ctx), { reviews: 1, rating: Math.min(1, (4.6 - 3.5) / 1.5), real_site: null, photos: null, stuffed: 0 });
  // 0.40 + 0.15 x 0.7333 + 0.5 x (0.20 + 0.10) + 0 = 0.66
  assert.ok(near(businessStrength(broker, ctx), 0.4 + 0.15 * (1.1 / 1.5) + 0.15));
  // a cid never rated anywhere -> neutral votes and rating (0.5 x their weights), not 0 reviews
  const unknown = lfView(lfNull('900003', 'Nobody'), { known, run });
  assert.equal(unknown._votes_source, 'neutral');
  assert.deepEqual(strengthComponents(unknown, ctx), { reviews: null, rating: null, real_site: null, photos: null, stuffed: 0 });
  assert.ok(near(businessStrength(unknown, ctx), 0.5 * 0.85));
  // the legacy engine scored the same null-rating item as a 0-review listing with no site
  const legacy = fixtureConfig().run;
  assert.ok(near(businessStrength(lfNull('900002', 'Broker'), ctxFor(legacy)), 0.5 * 0.10));
  // LF `domain` "google.com" or null is NEVER "known no site"; a direct url or a url= redirect
  // parameter that is itself a URL gives the real host; the provider's opaque goto token gives none.
  for (const item of [{ domain: 'google.com', url: 'https://google.com/goto?url=CAESopaque' }, { domain: null, url: null }, { domain: 'google.com' }]) {
    assert.equal(strengthComponents(lfView({ cid: '7', title: 'x', ...item }, { run }), ctx).real_site, null);
  }
  assert.equal(lfSiteHost({ url: 'https://google.com/url?q=https://www.mover.example/he' }), 'mover.example');
  assert.equal(lfSiteHost({ url: 'https://www.mover.example/' }), 'mover.example');
  assert.equal(lfSiteHost({ url: 'https://google.com/goto?url=CAESopaque' }), null);
  assert.equal(strengthComponents(lfView({ cid: '7', title: 'x', url: 'https://google.com/url?q=https://www.mover.example/' }, { run }), ctx).real_site, 1);
  // a joined item whose Maps listing has no rating is 0 reviews (Maps is the truth), not neutral
  const noRating = lfView({ ...mover('900001'), rating: { value: 5, votes_count: 99 } }, { poolByCid: new Map([['900001', { cid: '900001' }]]), known, run });
  assert.deepEqual([noRating._votes_source, noRating.rating], ['maps', null]);
  assert.equal(strengthComponents(noRating, ctx).reviews, 0);
  // best known: items without a cid carry no evidence; equal votes -> the higher rating
  const idx = bestKnownIndex([[{ title: 'no cid', rating: { votes_count: 500, value: 5 } }, { cid: 'a', rating: { votes_count: 9, value: 4 } }, { cid: 'a', rating: { votes_count: 9, value: 4.5 } }]]);
  assert.deepEqual([...idx.keys()], ['a']);
  assert.deepEqual(idx.get('a'), { votes_count: 9, value: 4.5 });
});

test('3.1 at step 1: best known over every LF response; every change raises or holds S3_step1', () => {
  const legacyCfg = fixtureConfig();
  const cfg = { ...legacyCfg, run: rev3Run() };
  // cell X (c3) LF: null ratings and no domain; cell Y (c1) LF carries the same cids with votes.
  const item = (cid, rank, rating) => ({ type: 'local_pack', rank_group: rank, cid, title: `Biz ${cid}`, domain: null, url: null, rating, phone: null });
  const get = (endpoint, params) => {
    if (endpoint !== LOCAL_FINDER_ENDPOINT) return undefined;
    if (params.location_coordinate.startsWith('31,')) return { items: [item('k1', 1, null), item('k2', 2, null), item('k3', 3, null)] };
    return { items: [item('k1', 1, { value: 5, votes_count: 150 }), item('k2', 2, { value: 5, votes_count: 150 }), item('k9', 3, null)] };
  };
  const specs = [{ id: 'X', profession: 'alpha', city: 'c3' }, { id: 'Y', profession: 'alpha', city: 'c1' }];
  const s3 = c => Object.fromEntries(step1Gate(c, get, { specs, mode: 'pilot' }).cells.map(x => [x.cell.id, Math.round(x.S3_step1 * 1e4) / 1e4]));
  const before = s3(legacyCfg);
  const after = s3(cfg);
  // legacy: 0 reviews and "no site" everywhere in X -> 0; Rev 3: k1/k2 take 150 votes from Y's
  // response (0.40 + 0.15 + 0.15 neutral site/photos = 0.70), k3 is fully neutral (0.425).
  assert.equal(before.X, 0.05); // only photos counted as missing
  assert.equal(after.X, Math.round(((0.7 + 0.7 + 0.425) / 3) * 1e4) / 1e4);
  for (const id of Object.keys(before)) assert.ok(after[id] >= before[id], `${id} dropped`);
});

test('3.2 E.164 on both sources: LF "05X-" and Maps "+9725X-" are one number; 1-700 too', () => {
  assert.equal(e164Il('052-555-0101'), '+972525550101');
  assert.equal(e164Il('+97252-555-0101'), '+972525550101');
  assert.equal(e164Il('08-955-5010'), '+97289555010');
  assert.equal(e164Il('+9728-955-5010'), '+97289555010');
  assert.equal(e164Il('1-700-555-010'), '+9721700555010'); // LF
  assert.equal(e164Il('+972-1-700-555-010'), '+9721700555010'); // Maps
  assert.equal(e164Il(null), null);
  assert.equal(phoneBlock('052-555-0101'), '0525550');
  assert.equal(phoneBlock('+97252-555-0199'), '0525550');
  assert.equal(phoneBlock('+972123'), null); // too short to have a block
  // R5.3 (iii) with E.164: a Maps-flagged phone matches the same number printed LF-style
  const run = rev3Run();
  const pool = ['a', 'b'].map(id => ({ _id: id, cid: id, phone: '+97252-555-0111' }));
  const flagged = leadGenPhones([{ cellKey: 'beta|c1', urgency: true, pool }], run).get('beta|c1');
  assert.equal(isLeadGen({ phone: '052-555-0111' }, flagged, run), true);
  // the legacy key could not match the 1-700 forms across sources
  const legacyRun = fixtureConfig().run;
  const legacyFlag = leadGenPhones([{ cellKey: 'beta|c1', urgency: true, pool: ['a', 'b'].map(id => ({ _id: id, cid: id, phone: '+972-1-700-555-010' })) }], legacyRun).get('beta|c1');
  assert.equal(isLeadGen({ phone: '1-700-555-010' }, legacyFlag, legacyRun), false);
  assert.equal(isLeadGen({ phone: '1-700-555-010' }, leadGenPhones([{ cellKey: 'beta|c1', urgency: true, pool: ['a', 'b'].map(id => ({ _id: id, cid: id, phone: '+972-1-700-555-010' })) }], run).get('beta|c1'), run), true);
});

test('3.2 lead-gen networks: shared 7-digit phone block, shared domain, 0.60 floor in the LF top 3', () => {
  const run = rev3Run();
  const prof = slug => ({ slug, terms: [`${slug} one`] });
  const city = n => ({ slug: `c${n}`, he_name: `Town${n}` });
  const e = (p, c, items) => ({ cellKey: `${p}|c${c}`, profession: prof(p), city: city(c), items });
  // block 054-555-1: three cids across two cells (two professions), two stuffed -> network
  const net = [
    e('lock', 1, [{ cid: 'n1', phone: '054-555-1001', title: 'lock one in Town1 Avi' }, { cid: 'n2', phone: '+97254-555-1002', title: 'lock one Town1 Beni' }]),
    e('acr', 2, [{ cid: 'n3', phone: '054-555-1093', title: 'Gadi services' }]),
  ];
  // block 050-555-2: three cids, two cells, only one stuffed -> innocent; block 050-555-3: 3 cids, 1 cell -> innocent
  const innocent = [
    e('lock', 1, [{ cid: 'i1', phone: '050-555-2001', title: 'lock one Dan' }, { cid: 'i2', phone: '050-555-2002', title: 'Eli' }]),
    e('lock', 3, [{ cid: 'i3', phone: '050-555-2003', title: 'Fadi' }, ...[1, 2, 3].map(i => ({ cid: `j${i}`, phone: `050-555-300${i}`, title: 'lock one Town3' }))]),
  ];
  // shared real domain: two cids in one profession -> network; across professions or a
  // NOT_A_SITE host -> not
  const domains = [
    e('keys', 1, [{ cid: 'd1', domain: 'www.keys.example' }, { cid: 'd2', domain: 'keys.example' }, { cid: 'f1', domain: 'facebook.com' }, { cid: 'f2', domain: 'he-il.facebook.com' }]),
    e('keys', 2, [{ cid: 'x1', domain: 'solo.example' }]),
    e('other', 2, [{ cid: 'x2', domain: 'solo.example' }]),
  ];
  const flags = leadGenNetworks([...net, ...innocent, ...domains], run);
  assert.deepEqual([...flags.keys()].sort(), ['d1', 'd2', 'n1', 'n2', 'n3']);
  assert.deepEqual([...flags.get('n3')], ['phone_block']);
  assert.deepEqual([...flags.get('d1')], ['shared_domain']);
  // without the Revision 3 config: no network rules at all
  assert.equal(leadGenNetworks([...net, ...domains], fixtureConfig().run).size, 0);
  // floor: a 1-review network listing in the LF top 3 scores 0.60; a strong one keeps its score
  const ctx = ctxFor(run);
  const weak = { cid: 'n1', title: 'x', domain: null, url: null, rating: { value: 5, votes_count: 1 }, phone: '054-555-1001' };
  const strong = { cid: 'n2', title: 'x', domain: null, url: null, rating: { value: 5, votes_count: 150 }, phone: '054-555-1002' };
  const networks = flags;
  const [w, st, plain] = [weak, strong, { ...weak, cid: 'p1' }].map(b => lfView(b, { known: bestKnownIndex([[weak, strong]]), networks, run }));
  const top = topStrength([w, st, plain], ctx);
  assert.equal(top.top3[0], 0.6);
  assert.ok(near(top.top3[1], 0.4 + 0.15 + 0.15));
  assert.ok(top.top3[2] < 0.6);
  // network listings are never prospects
  const b = { _id: 'n1', cid: 'n1', phone: '054-555-1001', title: 'Avi', rating: { votes_count: 3 }, latitude: 31, longitude: 34.9, address_info: { city: 'x' } };
  const cell = { cellKey: 'lock|cz', cell: { profession: { slug: 'lock' } }, city: { slug: 'cz', lat: 31, lng: 34.9, he_name: 'cz' }, lfTop3: [], lfTop3Ids: new Set(), ranked: [b], rawRank: new Map([['n1', 5]]) };
  const out = assignProspects([cell], new Set(), new Map(), run, { networks });
  assert.deepEqual(out.get('lock|cz'), []);
  assert.equal(out.diag.get('lock|cz').network, 1);
});

test('3.3 title excludes, nationwide stem, out-of-cell titles (prospect pool only)', () => {
  // Rules with synthetic English stems; the real Hebrew stems are checked byte-exact in the 3.8 test.
  const run = rev3Run({ stage2: { title_exclude: { alpha: ['Garage'] }, title_chain_stems: ['Nationwide'], category_rules: { alpha: { exclude: ['store'] } } } });
  const alpha = { slug: 'alpha', terms: ['alpha one'] };
  assert.equal(titleRule({ title: 'Car Garage alpha one' }, alpha, run), 'title_exclude');
  assert.equal(titleRule({ title: 'alpha one store' }, alpha, run), 'title_exclude'); // category exclude stems match titles too
  assert.equal(titleRule({ title: 'Movers Nationwide' }, alpha, run), 'title_chain');
  assert.equal(titleRule({ title: 'alpha one Dan' }, alpha, run), null);
  assert.equal(titleRule({ title: 'Car Garage' }, alpha, fixtureConfig().run), null); // legacy: off
  // city names: a town whose name contains another town's name matches only as itself; a hit
  // glued to a following letter is part of a longer word
  const cities = [
    { slug: 'big', he_name: 'Bigtown', region: 'R9', ring: 'core', lat: 31.8, lng: 34.65 },
    { slug: 'yav', he_name: 'Yav', region: 'R9', ring: 'ring2', lat: 31.88, lng: 34.74 },
    { slug: 'gan-yav', he_name: 'Gan Yav', region: 'R9', ring: 'ring2', lat: 31.79, lng: 34.7 },
    { slug: 'ged', he_name: 'Ged', region: 'R9', ring: 'ring2', lat: 31.81, lng: 34.78 },
  ];
  assert.deepEqual(citiesNamedIn('Locks in Gan Yav', cities).map(c => c.slug), ['gan-yav']);
  assert.deepEqual(citiesNamedIn('Locks in Yav and Bigtown', cities).map(c => c.slug), ['big', 'yav']);
  assert.deepEqual(citiesNamedIn('Yavor locks', cities), []);
  const ganYav = { city: cities[2] };
  assert.equal(outOfCellTarget({ title: 'Locks Bigtown' }, ganYav, cities).slug, 'big'); // the spill
  assert.equal(outOfCellTarget({ title: 'Locks Ged' }, ganYav, cities), null); // a ring2 pool member stays
  assert.equal(outOfCellTarget({ title: 'Locks Gan Yav Bigtown' }, ganYav, cities), null); // names its own town
  assert.equal(outOfCellTarget({ title: 'Locks Dan' }, ganYav, cities), null);
  assert.equal(outOfCellTarget({ title: 'Locks Yav' }, { city: cities[0] }, cities).slug, 'yav'); // core: no pool members
  // engine: the Bigtown-titled listing leaves the Gan Yav pool and counts in Bigtown; a listing
  // naming a town with no cell is dropped; off-trade titles never count
  const biz = (id, title) => ({ _id: id, cid: id, phone: `050-555-40${id}`, title, rating: { votes_count: 3 }, latitude: 31.79, longitude: 34.7, address_info: { city: 'x' } });
  const mk = (c, items) => ({ cellKey: `alpha|${c.slug}`, cell: { profession: alpha, city: c }, city: c, lfTop3: [], lfTop3Ids: new Set(), ranked: items, rawRank: new Map(items.map(x => [x._id, 5])) });
  const spill = biz('11', 'Locks Bigtown');
  const cells = [mk(cities[2], [spill, biz('12', 'Locks Fartown'), biz('15', 'Locks Yav'), biz('13', 'Car Garage'), biz('14', 'Locks Dan')]), mk(cities[0], [])];
  const out = assignProspects(cells, new Set(), new Map(), run, { cities: [...cities, { slug: 'far', he_name: 'Fartown', region: 'R8', ring: 'core', lat: 32.8, lng: 35.0 }] });
  assert.deepEqual(out.get('alpha|gan-yav').map(p => p.id), ['14', '15']); // 15 names a ring2 pool member: stays
  assert.deepEqual(out.get('alpha|big').map(p => [p.id, p.from]), [['11', 'alpha|gan-yav']]);
  assert.deepEqual(out.diag.get('alpha|gan-yav'), { title_exclude: 1, title_chain: 0, network: 0, out_of_cell_moved: 1, out_of_cell_dropped: 1, moved_in: 0 });
  assert.equal(out.diag.get('alpha|big').moved_in, 1);
});

test('3.4 O = 1.0 for every cell; L_share / D_share stay as output', () => {
  const run = rev3Run();
  const o = (rank, domain) => ({ type: 'organic', rank_group: rank, domain });
  const res = classifyOrganic({ items: [o(1, 'www.dir.example'), o(2, 'pool.example'), o(3, 'other.example')] }, { run, poolDomains: new Set(['pool.example']) });
  assert.equal(res.O, 1);
  assert.ok(near(res.L_share, 1.5 / 3));
  assert.ok(near(res.D_share, 1 / 3));
  assert.equal(compositeScore({ value: 1200, S3: 0.5, P_w: 15, O: res.O, flags: [], stage1Pass: true }, run).score, 300);
});

test('3.5 site_dead: confirmed NXDOMAIN / parked / 404-410 weigh 1.25; failed 1.10; DoH confirmation', async () => {
  const run = rev3Run();
  const hc = run.homepage_check;
  const rec = (reason, extra = {}) => ({ schema: 2, host: 'h.example', checked_at: '2026-11-07T12:00:00.000Z', site_check: 'failed', reason, fetch_ok: false, https: false, viewport: false, ...extra });
  assert.equal(siteOutcome(rec('dns_nxdomain', { nxdomain_confirmed: true }), hc), 'site_dead');
  assert.equal(siteOutcome(rec('dns_nxdomain'), hc), 'failed'); // local resolver only: not confirmed
  assert.equal(siteOutcome(rec('parked'), hc), 'site_dead');
  assert.equal(siteOutcome(rec('status_404_410'), hc), 'site_dead');
  assert.equal(siteOutcome(rec('connect_or_tls_both_schemes'), hc), 'failed');
  assert.equal(siteOutcome(rec('status_5xx_after_retry'), hc), 'failed');
  assert.equal(siteOutcome({ site_check: 'blocked' }, hc), 'blocked');
  assert.equal(siteOutcome(rec('parked'), fixtureConfig().run.homepage_check), 'failed'); // legacy
  const ctx = { run, siteCtx: { cityNames: ['City'], titleTerms: ['alpha'] } };
  const b = { domain: 'h.example' };
  assert.deepEqual(prospectWeight(b, rec('parked'), ctx), { w_b: 1.25, site: 'dead', verdict: null });
  assert.equal(prospectWeight(b, rec('connect_or_tls_both_schemes'), ctx).w_b, 1.1);
  assert.equal(prospectWeight(b, rec('dns_nxdomain'), ctx).site, 'failed');
  // DoH: Status 3 -> confirmed; Status 0 -> re-fetched once; anything else -> unconfirmed. Idempotent.
  const base = tmp();
  const cache = homepageCache(base, hc, FIXED_NOW);
  for (const host of ['gone.example', 'flaky.example', 'servfail.example']) cache.set(host, { ...rec('dns_nxdomain'), host });
  cache.set('ok.example', { schema: 2, host: 'ok.example', checked_at: '2026-11-07T12:00:00.000Z', site_check: 'ok' });
  const doh = [];
  const status = { 'gone.example': 3, 'flaky.example': 0, 'servfail.example': 2 };
  const dohFetch = async url => { doh.push(url); const host = new URL(url).searchParams.get('name'); return { ok: true, json: async () => ({ Status: status[host] }) }; };
  const web = createFakeWeb({ sites: { 'https://flaky.example/robots.txt': { status: 404, type: 'text/plain', body: '' }, 'https://flaky.example/': { status: 200, body: `<html><head><title>t</title><meta name="viewport" content="width=device-width"></head><body><h1>h</h1>${'x'.repeat(5000)}</body></html>` } } });
  const res = await confirmNxdomains({ cache, fetchImpl: dohFetch, siteFetchImpl: web, cfg: hc, now: FIXED_NOW });
  assert.deepEqual(res, { candidates: 3, confirmed: 1, resolves_refetched: 1, refetch_outcomes: { 'ok:': 1 }, unconfirmed: 1 });
  assert.equal(siteOutcome(cache.get('gone.example'), hc), 'site_dead');
  assert.equal(cache.get('flaky.example').site_check, 'ok');
  assert.equal(siteOutcome(cache.get('servfail.example'), hc), 'failed');
  assert.ok(doh.every(u => /^https:\/\/(dns\.google|cloudflare-dns\.com)\//.test(u)));
  assert.equal(doh.filter(u => u.includes('servfail')).length, 2); // second resolver tried
  const again = await confirmNxdomains({ cache, fetchImpl: async () => { throw new Error('re-checked a confirmed record'); }, cfg: hc, now: FIXED_NOW });
  assert.equal(again.candidates, 0);
});

test('3.8 config: merged byte-exact from the spec (Hebrew stems included); idempotent', () => {
  const spec = SPEC_TEXT();
  const patch = extractR3_8(spec);
  const runConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/market-scanner/run-config.json'), 'utf8'));
  for (const k of ['lf_field_precedence', 'lf_domain_trust', 'lf_url_redirect_parse', 'phone_normalize', 'lead_gen_network', 'title_exclude', 'title_chain_stems', 'out_of_cell_title_rule', 'organic_factor']) assert.deepEqual(runConfig.stage2[k], patch.stage2[k], k);
  assert.deepEqual(runConfig.stage2.organic_factor, { base: 1, slope: 0 });
  assert.deepEqual(runConfig.homepage_check.weights, { site_dead: 1.25, failed: 1.1 });
  for (const x of patch.stage2.category_rules.movers.exclude_append) assert.ok(runConfig.stage2.category_rules.movers.exclude.includes(x));
  // every Hebrew stem in the config also appears verbatim in the 3.3 prose
  const s33 = spec.slice(spec.indexOf('\n## 3.3 '), spec.indexOf('\n## 3.4 '));
  for (const stem of [...Object.values(runConfig.stage2.title_exclude).flat(), ...runConfig.stage2.title_chain_stems, ...patch.stage2.category_rules.movers.exclude_append]) assert.ok(s33.includes(`\`${stem}`) || s33.includes(` ${stem}`), stem);
  assert.deepEqual(mergeR3_8(runConfig, patch, runConfig.r3_8_applied.spec_sha256), runConfig);
});

test('M4 with Revision 3 on fixtures: zero network, determinism, no PII, slot-source counts', async () => {
  const { base, d } = await m4Fixture();
  // the fixture M4 cache is bought once with the legacy config, then re-scored offline with Rev 3
  await runEngine({ stage: 'm4', ...d, token: 'fake', fetchImpl: createFakeFetch(), siteFetchImpl: createFakeWeb(), now: FIXED_NOW });
  const runCfg = JSON.parse(fs.readFileSync(path.join(d.configDir, 'run-config.json'), 'utf8'));
  fs.writeFileSync(path.join(d.configDir, 'run-config.json'), JSON.stringify(mergeInto(runCfg, extractR3_8(SPEC_TEXT()))));
  const a = await runEngine({ stage: 'm4', ...d, outDir: path.join(base, 'r3a'), offline: true, fetchImpl: networkForbidden(), siteFetchImpl: webForbidden(), now: FIXED_NOW });
  const b = await runEngine({ stage: 'm4', ...d, outDir: path.join(base, 'r3b'), offline: true, fetchImpl: networkForbidden(), siteFetchImpl: webForbidden(), now: FIXED_NOW });
  assert.deepEqual([a.network_calls, a.spent_usd, b.network_calls], [0, 0, 0]);
  for (const f of M4_FILES) assert.ok(read(path.join(base, 'r3a'), f).equals(read(path.join(base, 'r3b'), f)), `${f} not deterministic`);
  for (const f of M4_FILES) assert.ok(!/Biz \d|Seven Co|\+972|05\d-|\.example/.test(fs.readFileSync(path.join(base, 'r3a', f), 'utf8')), `${f} leaks business data`);
  const rows = JSON.parse(fs.readFileSync(path.join(base, 'r3a', 'm4-cells.json'), 'utf8'));
  for (const r of rows.filter(x => x.ring !== 'ring2_pool')) assert.ok(r.lf_slots_maps + r.lf_slots_best_known + r.lf_slots_neutral <= 3 * r.points, r.cell_id);
  assert.ok(rows.some(r => r.lf_slots_maps > 0) && rows.some(r => r.lf_slots_best_known + r.lf_slots_neutral > 0));
  assert.ok(rows.every(r => r.O === 1 || r.O === null));
  const summary = JSON.parse(fs.readFileSync(path.join(base, 'r3a', 'm4-summary.json'), 'utf8'));
  assert.ok(summary.revision3 && summary.revision3.lf_slots_step2);
});
