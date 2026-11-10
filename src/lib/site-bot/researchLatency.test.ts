// Research latency (2026-11-10, before M3): the NeuronWriter stage creates every query up front, polls them in parallel
// under one overall budget (default 90 s), and records not-ready keywords as neuron_pending. Injected clock + sleep.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveNeuronBudgetMs, runSiteResearch, type ResearchProviders } from './research/runResearch';

const owner = { sourceId: 'owner-1', capturedAt: '2026-09-02T00:00:00.000Z' };
const input = {
  businessTruth: {
    businessName: 'Example Business',
    serviceModel: 'remote' as const,
    confirmedServices: [{ value: 'Service Alpha', owner }],
    moneyPriorities: [{ value: 'Priority Alpha', owner }],
  },
  seeds: ['Service Alpha'],
};
const clock0 = () => new Date('2026-09-02T12:00:00.000Z');

function temporaryStore(): { baseDir: string; remove(): void } {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-research-latency-'));
  return { baseDir, remove: () => fs.rmSync(baseDir, { recursive: true, force: true }) };
}

function providers(overrides: Partial<ResearchProviders> = {}): ResearchProviders {
  const usage = (operation: string) => ({ calls: 1, estimatedCostUsd: 0.01, entries: [{ operation, taskIds: [`${operation}-1`], estimatedCostUsd: 0.01 }] });
  return {
    dataForSeo: {
      async expand(seeds) { return { keywords: [...seeds, 'Service Beta'], taskIds: ['seed-1'], usage: usage('seed') }; },
      async metrics(keywords) { return { metrics: keywords.map(keyword => ({ keyword, searchVolume: 10, trend: [], zeroVolumeUncertain: false })), taskIds: ['metrics-1'], usage: usage('metrics') }; },
      async intent(keywords) { return { intents: keywords.map(keyword => ({ keyword, intent: 'commercial' as const })), taskIds: ['intent-1'], usage: usage('intent') }; },
      async serps(keywords) { return { evidence: keywords.map(query => ({ query, taskId: 'serp-1', localPack: [], organic: [{ rank: 1, url: 'https://example.test', classification: 'local_business' as const }], exclusions: [] })), taskIds: ['serp-1'], usage: usage('serp') }; },
    },
    neuron: {
      async create(service) { return neuronQuery(`query-${service.serviceKeyword}`, service.serviceKeyword, 'ready'); },
      async get(queryId, service) { return neuronQuery(queryId, service.serviceKeyword, 'ready'); },
    },
    ...overrides,
  };
}

function neuronQuery(id: string, keyword: string, status: 'ready' | 'waiting') {
  return { id, status, serviceKeyword: keyword, intentCluster: keyword, metrics: {}, titleTerms: [], metaTerms: [], h1Terms: [], h2Terms: [], bodyTerms: [], entities: [], suggestedQuestions: [], paaQuestions: [], contentQuestions: [], competitors: [] };
}

function fakeClock() {
  let ms = 0;
  const sleeps: number[] = [];
  return { clockMs: () => ms, sleep: async (wait: number) => { sleeps.push(wait); ms += wait; }, sleeps, elapsed: () => ms };
}

test('neuron stage creates every query before polling and polls them in parallel rounds', async () => {
  const store = temporaryStore();
  const events: string[] = [];
  const readyAfter = new Map([['Service Alpha', 2], ['Service Beta', 3]]);
  const gets = new Map<string, number>();
  const clock = fakeClock();
  const neuron: ResearchProviders['neuron'] = {
    async create(service) { events.push(`create:${service.serviceKeyword}`); return neuronQuery(`q-${service.serviceKeyword}`, service.serviceKeyword, 'waiting'); },
    async get(queryId, service) {
      const count = (gets.get(service.serviceKeyword) ?? 0) + 1;
      gets.set(service.serviceKeyword, count);
      events.push(`get:${service.serviceKeyword}@${clock.elapsed()}`);
      return neuronQuery(queryId, service.serviceKeyword, count >= (readyAfter.get(service.serviceKeyword) ?? 1) ? 'ready' : 'waiting');
    },
  };
  try {
    const result = await runSiteResearch('research-latency-1', input, { providers: providers({ neuron }), baseDir: store.baseDir, now: clock0, neuron: { budgetMs: 90_000, intervalMs: 15_000, sleep: clock.sleep, clockMs: clock.clockMs } });
    assert.equal(result.dossier.status, 'architecture_ready');
    const firstGet = events.findIndex(event => event.startsWith('get:'));
    assert.deepEqual(events.slice(0, firstGet).sort(), ['create:Service Alpha', 'create:Service Beta']);
    // Round 1 immediate (t=0), round 2 at 15 s (Alpha ready), round 3 at 30 s (Beta ready): 30 s total, not 2 x sequential.
    assert.ok(events.includes('get:Service Alpha@0') && events.includes('get:Service Beta@0'));
    assert.ok(events.includes('get:Service Beta@15000'));
    assert.deepEqual(clock.sleeps, [15_000, 15_000]);
    assert.equal(result.dossier.neuronQueries?.['Service Alpha']?.status, 'ready');
    assert.equal(result.dossier.neuronQueries?.['Service Beta']?.status, 'ready');
    assert.equal(result.dossier.neuronPending, undefined);
  } finally { store.remove(); }
});

test('neuron stage stops at the overall budget and records not-ready keywords as neuron_pending', async () => {
  const store = temporaryStore();
  const clock = fakeClock();
  const neuron: ResearchProviders['neuron'] = {
    async create(service) { return neuronQuery(`q-${service.serviceKeyword}`, service.serviceKeyword, service.serviceKeyword === 'Service Alpha' ? 'ready' : 'waiting'); },
    async get(queryId, service) { return neuronQuery(queryId, service.serviceKeyword, 'waiting'); },
  };
  try {
    const result = await runSiteResearch('research-latency-2', input, { providers: providers({ neuron }), baseDir: store.baseDir, now: clock0, neuron: { sleep: clock.sleep, clockMs: clock.clockMs } });
    assert.equal(result.dossier.status, 'architecture_ready');
    assert.equal(clock.elapsed(), 90_000, 'default budget is 90 s for the whole stage');
    assert.ok(clock.sleeps.every(wait => wait <= 15_000));
    assert.deepEqual(result.dossier.neuronPending, [{ keyword: 'Service Beta', queryId: 'q-Service Beta', status: 'neuron_pending', recordedAt: clock0().toISOString() }]);
    assert.equal(result.dossier.neuronQueries?.['Service Alpha']?.status, 'ready');
    assert.equal(result.dossier.neuronQueries?.['Service Beta']?.status, 'waiting');
  } finally { store.remove(); }
});

test('neuron stage honours a configured budget, never sleeps past it, and treats a failing get as still pending', async () => {
  const store = temporaryStore();
  const clock = fakeClock();
  const neuron: ResearchProviders['neuron'] = {
    async create(service) { return neuronQuery(`q-${service.serviceKeyword}`, service.serviceKeyword, 'waiting'); },
    async get() { throw new Error('transient'); },
  };
  try {
    const result = await runSiteResearch('research-latency-3', input, { providers: providers({ neuron }), baseDir: store.baseDir, now: clock0, neuron: { budgetMs: 20_000, intervalMs: 15_000, sleep: clock.sleep, clockMs: clock.clockMs } });
    assert.equal(result.dossier.status, 'architecture_ready');
    assert.deepEqual(clock.sleeps, [15_000, 5_000]);
    assert.deepEqual(result.dossier.neuronPending?.map(item => item.keyword).sort(), ['Service Alpha', 'Service Beta']);
  } finally { store.remove(); }
});

test('neuron budget resolves from the option, then SITE_BOT_NEURON_BUDGET_MS, then 90 s', () => {
  assert.equal(resolveNeuronBudgetMs(5_000, { SITE_BOT_NEURON_BUDGET_MS: '1000' }), 5_000);
  assert.equal(resolveNeuronBudgetMs(undefined, { SITE_BOT_NEURON_BUDGET_MS: '1000' }), 1_000);
  assert.equal(resolveNeuronBudgetMs(undefined, { SITE_BOT_NEURON_BUDGET_MS: 'abc' }), 90_000);
  assert.equal(resolveNeuronBudgetMs(undefined, {}), 90_000);
});
