import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ResearchBudgetExceededError,
  classifySearchIntent,
  expandServiceSeeds,
  fetchKeywordMetrics,
  fetchLocalSerpEvidence,
  type ResearchAdapterOptions,
} from './dataForSeoResearch';

type FetchCall = { url: string; init?: RequestInit };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createFetch(responses: Array<unknown | Response>) {
  const calls: FetchCall[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init });
    const response = responses.shift();
    if (response instanceof Response) return response;
    return jsonResponse(response);
  };

  return { calls, fetch };
}

function options(fetch: typeof globalThis.fetch, overrides: Partial<ResearchAdapterOptions> = {}): ResearchAdapterOptions {
  return {
    token: 'test-token',
    fetch,
    now: () => new Date('2026-09-02T12:00:00.000Z'),
    cache: new Map(),
    ...overrides,
  };
}

test('expandServiceSeeds batches related-keyword requests and normalizes provider output', async () => {
  const mock = createFetch([
    {
      tasks: [{ id: 'related-1', cost: 0.02, result: [{ items: [
        { keyword_data: { keyword: 'seed one' } },
        { keyword_data: { keyword: 'related one' } },
      ] }] }],
    },
  ]);

  const result = await expandServiceSeeds(['seed one', 'seed two'], options(mock.fetch));

  assert.deepEqual(result.keywords, ['seed one', 'seed two', 'related one']);
  assert.equal(result.taskIds[0], 'related-1');
  assert.equal(result.usage.estimatedCostUsd, 0.02);
  assert.equal(mock.calls.length, 1);
  assert.match(mock.calls[0].url, /dataforseo_labs\/google\/related_keywords\/live$/);
  assert.deepEqual(JSON.parse(String(mock.calls[0].init?.body)), [{
    keyword: 'seed one', location_code: 2376, language_code: 'he', limit: 100,
  }, {
    keyword: 'seed two', location_code: 2376, language_code: 'he', limit: 100,
  }]);
  assert.equal(mock.calls[0].init?.headers && (mock.calls[0].init.headers as Record<string, string>).Authorization, 'Basic test-token');
});

test('fetchKeywordMetrics batches keywords and keeps zero-volume demand uncertain', async () => {
  const mock = createFetch([
    {
      tasks: [{ id: 'volume-1', cost: 0.01, result: [{ items: [
        { keyword: 'alpha', search_volume: 80, monthly_searches: [{ year: 2026, month: 8, search_volume: 80 }], cpc: 1.5, competition: 0.4, competition_level: 'MEDIUM', keyword_difficulty: 37 },
        { keyword: 'beta', search_volume: 0, monthly_searches: [], cpc: null, competition: null },
      ] }] }],
    },
  ]);

  const result = await fetchKeywordMetrics(['alpha', 'beta'], options(mock.fetch));

  assert.deepEqual(result.metrics, [{
    keyword: 'alpha', searchVolume: 80, trend: [{ year: 2026, month: 8, searchVolume: 80 }], cpc: 1.5, paidCompetition: 0.4, paidCompetitionLevel: 'MEDIUM', providerDifficulty: 37, zeroVolumeUncertain: false,
  }, {
    keyword: 'beta', searchVolume: 0, trend: [], zeroVolumeUncertain: true,
  }]);
  assert.match(mock.calls[0].url, /keywords_data\/google\/search_volume\/live$/);
  assert.deepEqual(JSON.parse(String(mock.calls[0].init?.body))[0].keywords, ['alpha', 'beta']);
});

test('classifySearchIntent returns provider intent and caches metrics for ninety days', async () => {
  const cache = new Map();
  const mock = createFetch([{ tasks: [{ id: 'intent-1', cost: 0.01, result: [{ items: [
    { keyword: 'alpha', search_intent_info: { main_intent: 'commercial' } },
  ] }] }] }]);
  const adapterOptions = options(mock.fetch, { cache });

  const first = await classifySearchIntent(['alpha'], adapterOptions);
  const second = await classifySearchIntent(['alpha'], adapterOptions);

  assert.deepEqual(first.intents, [{ keyword: 'alpha', intent: 'commercial' }]);
  assert.deepEqual(second, first);
  assert.equal(mock.calls.length, 1);
});

test('fetchLocalSerpEvidence separates local pack, relevant local organic results, and explicit exclusions', async () => {
  const mock = createFetch([{ tasks: [{ id: 'serp-1', cost: 0.03, result: [{ items: [
    { type: 'local_pack', items: [
      { rank_group: 1, title: 'Local A', url: 'https://local-a.test', domain: 'local-a.test' },
      { rank_group: 2, title: 'Local B', url: 'https://local-b.test', domain: 'local-b.test' },
      { rank_group: 3, title: 'Local C', url: 'https://local-c.test', domain: 'local-c.test' },
      { rank_group: 4, title: 'Local D', url: 'https://local-d.test', domain: 'local-d.test' },
    ] },
    { type: 'organic', rank_group: 1, title: 'Local service', url: 'https://service.test', domain: 'service.test' },
    { type: 'organic', rank_group: 2, title: 'Directory', url: 'https://directory.test/listing', domain: 'directory.test' },
    { type: 'organic', rank_group: 3, title: 'Guide', url: 'https://guide.test/article', domain: 'guide.test', is_featured_snippet: true },
  ] }] }] }]);

  const result = await fetchLocalSerpEvidence(['local service'], options(mock.fetch));

  assert.equal(result.evidence[0].localPack.length, 3);
  assert.deepEqual(result.evidence[0].organic.map(item => item.classification), ['local_business']);
  assert.deepEqual(result.evidence[0].exclusions.map(item => item.classification), ['directory_aggregator', 'informational']);
  assert.match(mock.calls[0].url, /serp\/google\/organic\/live\/advanced$/);
  assert.deepEqual(JSON.parse(String(mock.calls[0].init?.body))[0], {
    keyword: 'local service', location_code: 2376, language_code: 'he', device: 'desktop', os: 'windows', depth: 20,
  });
});

test('cache expiration, provider errors, and per-run cost ceilings are deterministic', async () => {
  const cache = new Map();
  const mock = createFetch([
    { tasks: [{ id: 'intent-1', cost: 0.01, result: [{ items: [{ keyword: 'alpha', search_intent_info: { main_intent: 'commercial' } }] }] }] },
    { tasks: [{ id: 'intent-2', cost: 0.01, result: [{ items: [{ keyword: 'alpha', search_intent_info: { main_intent: 'transactional' } }] }] }] },
    jsonResponse({ tasks: [{ status_code: 50000, status_message: 'provider failure' }] }),
  ]);
  const firstOptions = options(mock.fetch, { cache, now: () => new Date('2026-01-01T00:00:00.000Z') });
  await classifySearchIntent(['alpha'], firstOptions);
  const expired = await classifySearchIntent(['alpha'], options(mock.fetch, {
    cache, now: () => new Date('2026-04-02T00:00:00.000Z'),
  }));
  assert.deepEqual(expired.intents, [{ keyword: 'alpha', intent: 'transactional' }]);
  await assert.rejects(() => classifySearchIntent(['broken'], options(mock.fetch)), /DataForSEO task failed/);

  const ceilingMock = createFetch([{ tasks: [{ id: 'costly', cost: 0.02, result: [{ items: [] }] }] }]);
  await assert.rejects(
    () => expandServiceSeeds(['alpha'], options(ceilingMock.fetch, { maxUsdPerRun: 0.01 })),
    ResearchBudgetExceededError
  );
});
