import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPodcastAutocomplete, fetchPodcastKeywordIdeas, fetchPodcastSearchVolume } from './dataForSeo';

function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }
function provider(items: unknown[], id = 'task-1', cost = 0.12) { return { tasks: [{ id, cost, status_code: 20000, result: [{ items }] }] }; }
class SafetyFailure extends Error { constructor() { super('abort safety timer fired'); this.name = 'SafetyFailure'; } }
type PendingState = { started: number; settled: number; active: number; safetyTimers: number; signals: AbortSignal[] };
const pendingState = (): PendingState => ({ started: 0, settled: 0, active: 0, safetyTimers: 0, signals: [] });
function pendingFetch(state: PendingState) {
  return async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const signal = init?.signal;
    assert.ok(signal);
    state.started += 1;
    state.active += 1;
    state.signals.push(signal);
    return new Promise<Response>((_resolve, reject) => {
      let done = false;
      const safety = setTimeout(() => settle(new SafetyFailure()), 250);
      state.safetyTimers += 1;
      const onAbort = () => settle(signal.reason);
      const settle = (error: unknown) => {
        if (done) return;
        done = true;
        clearTimeout(safety);
        state.safetyTimers -= 1;
        signal.removeEventListener('abort', onAbort);
        state.active -= 1;
        state.settled += 1;
        reject(error);
      };
      if (signal.aborted) onAbort(); else signal.addEventListener('abort', onAbort, { once: true });
    });
  };
}
function assertSettled(state: PendingState) { assert.equal(state.started, state.settled); assert.equal(state.active, 0); assert.equal(state.safetyTimers, 0); }

test('pre-aborted caller rejects before fetch or budget charge', async () => {
  const caller = new AbortController(); const budget = { calls: 0 }; let fetches = 0; const expected = new Error('caller stop'); caller.abort(expected);
  await assert.rejects(() => fetchPodcastKeywordIdeas(['topic one'], { token: 'test-token', budget, signal: caller.signal, fetch: async () => { fetches += 1; return response(provider([])); } }), error => { assert.equal(error, expected); return true; });
  assert.equal(fetches, 0); assert.equal(budget.calls, 0);
});

test('in-flight caller abort settles autocomplete and charges one attempt', async () => {
  const caller = new AbortController(); const budget = { calls: 0 }; const state = pendingState(); const expected = new Error('caller stop');
  const operation = fetchPodcastAutocomplete('topic one', { token: 'test-token', budget, signal: caller.signal, fetch: pendingFetch(state) });
  queueMicrotask(() => caller.abort(expected));
  await assert.rejects(operation, error => { assert.equal(error, expected); return true; });
  assert.equal(budget.calls, 1); assert.equal(state.signals[0].aborted, true); assert.equal(state.signals[0].reason, expected); assertSettled(state);
});

test('explicit timeout settles search volume with TimeoutError and charges one attempt', async () => {
  const budget = { calls: 0 }; const state = pendingState();
  await assert.rejects(() => fetchPodcastSearchVolume(['topic one'], { token: 'test-token', budget, timeoutMs: 5, fetch: pendingFetch(state) }), error => { assert.equal(error instanceof SafetyFailure, false); assert.equal((error as { name?: unknown }).name, 'TimeoutError'); return true; });
  assert.equal(budget.calls, 1); assert.equal(state.signals[0].aborted, true); assert.equal(state.signals[0].reason?.name, 'TimeoutError'); assertSettled(state);
});

test('shared budget caps failure paths at three attempted calls without retries', async () => {
  const budget = { calls: 0 }; let fetches = 0;
  const failedFetch = async () => { fetches += 1; throw new Error('transport unavailable'); };
  await assert.rejects(() => fetchPodcastKeywordIdeas(['topic one'], { token: 'test-token', budget, fetch: failedFetch }));
  await assert.rejects(() => fetchPodcastAutocomplete('topic one', { token: 'test-token', budget, fetch: failedFetch }));
  await assert.rejects(() => fetchPodcastSearchVolume(['topic one'], { token: 'test-token', budget, fetch: failedFetch }));
  await assert.rejects(() => fetchPodcastKeywordIdeas(['topic one'], { token: 'test-token', budget, fetch: failedFetch }), /ceiling/);
  assert.equal(budget.calls, 3); assert.equal(fetches, 3);
});

test('invalid timeout options reject before every adapter fetch or budget charge', async () => {
  const operations = [
    (options: Parameters<typeof fetchPodcastKeywordIdeas>[1]) => fetchPodcastKeywordIdeas(['topic one'], options),
    (options: Parameters<typeof fetchPodcastAutocomplete>[1]) => fetchPodcastAutocomplete('topic one', options),
    (options: Parameters<typeof fetchPodcastSearchVolume>[1]) => fetchPodcastSearchVolume(['topic one'], options),
  ];
  for (const timeoutMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) for (const operation of operations) {
    const budget = { calls: 0 }; let fetches = 0;
    await assert.rejects(() => operation({ token: 'test-token', budget, timeoutMs, fetch: async () => { fetches += 1; return response(provider([])); } }), /Invalid DataForSEO timeout/);
    assert.equal(fetches, 0); assert.equal(budget.calls, 0);
  }
});

test('keyword ideas sends the bounded exact task and preserves adapter provenance', async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const result = await fetchPodcastKeywordIdeas(['topic one', 'topic two'], { token: 'test-token', fetch: async (url, init) => { calls.push({ url: String(url), body: JSON.parse(String(init?.body)) }); return response(provider([{ keyword: 'topic one', keyword_info: { search_volume: 120, monthly_searches: [{ year: 2026, month: 1, search_volume: 120 }] } }])); } });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/dataforseo_labs\/google\/keyword_ideas\/live$/);
  assert.deepEqual(calls[0].body, [{ keywords: ['topic one', 'topic two'], closely_variants: false, limit: 30, include_serp_info: false, include_clickstream_data: false, location_code: 2376, language_code: 'he' }]);
  assert.deepEqual(result.candidates[0], { phrase: 'topic one', searchVolume: 120, monthlySearches: [{ year: 2026, month: 1, searchVolume: 120 }], source: 'keyword_ideas', taskIds: ['task-1'], providerCostUsd: 0.12 });
});

test('adapter rejects HTTP, task, malformed responses and charges attempted calls', async () => {
  const budget = { calls: 0 };
  await assert.rejects(() => fetchPodcastKeywordIdeas(['topic one'], { token: 'test-token', budget, fetch: async () => response({}, 500) }), /HTTP 500/);
  assert.equal(budget.calls, 1);
  await assert.rejects(() => fetchPodcastKeywordIdeas(['topic one'], { token: 'test-token', budget, fetch: async () => response({ tasks: [{ status_code: 40000, result: [] }] }) }), /task failed/);
  assert.equal(budget.calls, 2);
  await assert.rejects(() => fetchPodcastKeywordIdeas(['topic one'], { token: 'test-token', budget, fetch: async () => response({}) }), /malformed/);
  assert.equal(budget.calls, 3);
  await assert.rejects(() => fetchPodcastKeywordIdeas(['topic one'], { token: 'test-token', budget, fetch: async () => response(provider([])) }), /ceiling/);
});

test('autocomplete and volume have exact bounded request behavior', async () => {
  const bodies: unknown[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => { bodies.push(JSON.parse(String(init?.body))); return String(url).includes('autocomplete') ? response(provider([{ keyword: 'topic one' }, { suggestion: 'topic two' }, { suggestion: 'topic two' }], 'auto-1', 0.02)) : response(provider([{ keyword: 'topic two', search_volume: 50, monthly_searches: [] }], 'volume-1', 0.03)); };
  const auto = await fetchPodcastAutocomplete('topic one', { token: 'test-token', fetch });
  const volume = await fetchPodcastSearchVolume(auto.suggestions, { token: 'test-token', fetch });
  assert.deepEqual(auto.suggestions, ['topic one', 'topic two']);
  assert.deepEqual(bodies[0], [{ keyword: 'topic one', location_code: 2376, language_code: 'he' }]);
  assert.deepEqual(bodies[1], [{ keywords: ['topic one', 'topic two'], location_code: 2376, language_code: 'he' }]);
  assert.deepEqual(volume.usage, { operation: 'search_volume', taskIds: ['volume-1'], costUsd: 0.03 });
});

test('direct volume preserves provider provenance null zero and history', async () => {
  const result = await fetchPodcastSearchVolume(['zero phrase', 'null phrase'], {
    token: 'test-token',
    fetch: async () => response(provider([
      { keyword: 'zero phrase', search_volume: 0, monthly_searches: [{ year: 2026, month: 2, search_volume: 0 }] },
      { keyword: 'null phrase', search_volume: null, monthly_searches: [{ year: 2026, month: 1, search_volume: 7 }] },
    ], 'volume-2', 0.07)),
  });
  assert.deepEqual(result.candidates, [
    { phrase: 'zero phrase', searchVolume: 0, monthlySearches: [{ year: 2026, month: 2, searchVolume: 0 }], source: 'search_volume', taskIds: ['volume-2'], providerCostUsd: 0.07 },
    { phrase: 'null phrase', searchVolume: null, monthlySearches: [{ year: 2026, month: 1, searchVolume: 7 }], source: 'search_volume', taskIds: ['volume-2'], providerCostUsd: 0.07 },
  ]);
});
