import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ResearchBudgetExceededError } from './dataForSeoResearch';
import { resumeSiteResearch, runSiteResearch, type ResearchProviders } from './runResearch';

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

function temporaryStore(): { baseDir: string; remove(): void } {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-research-'));
  return { baseDir, remove: () => fs.rmSync(baseDir, { recursive: true, force: true }) };
}

function providers(overrides: Partial<ResearchProviders> = {}): ResearchProviders {
  return {
    dataForSeo: {
      async expand(seeds) {
        return { keywords: [...seeds, 'Service Beta'], taskIds: ['seed-1'], usage: { calls: 1, estimatedCostUsd: 0.01, entries: [{ operation: 'seed', taskIds: ['seed-1'], estimatedCostUsd: 0.01 }] } };
      },
      async metrics(keywords) {
        return { metrics: keywords.map(keyword => ({ keyword, searchVolume: 10, trend: [], zeroVolumeUncertain: false })), taskIds: ['metrics-1'], usage: { calls: 1, estimatedCostUsd: 0.01, entries: [{ operation: 'metrics', taskIds: ['metrics-1'], estimatedCostUsd: 0.01 }] } };
      },
      async intent(keywords) {
        return { intents: keywords.map(keyword => ({ keyword, intent: 'commercial' as const })), taskIds: ['intent-1'], usage: { calls: 1, estimatedCostUsd: 0.01, entries: [{ operation: 'intent', taskIds: ['intent-1'], estimatedCostUsd: 0.01 }] } };
      },
      async serps(keywords) {
        return { evidence: keywords.map(query => ({ query, taskId: 'serp-1', localPack: [], organic: [{ rank: 1, url: 'https://example.test', classification: 'local_business' as const }], exclusions: [] })), taskIds: ['serp-1'], usage: { calls: 1, estimatedCostUsd: 0.01, entries: [{ operation: 'serp', taskIds: ['serp-1'], estimatedCostUsd: 0.01 }] } };
      },
    },
    neuron: {
      async create(service) {
        return { id: `query-${service.serviceKeyword}`, status: 'ready' as const, serviceKeyword: service.serviceKeyword, intentCluster: service.intentCluster, metrics: {}, titleTerms: [], metaTerms: [], h1Terms: [], h2Terms: [], bodyTerms: [], entities: [], suggestedQuestions: ['Question Alpha'], paaQuestions: [], contentQuestions: [], competitors: [] };
      },
      async get(queryId, service) {
        return { id: queryId, status: 'ready' as const, serviceKeyword: service.serviceKeyword, intentCluster: service.intentCluster, metrics: {}, titleTerms: [], metaTerms: [], h1Terms: [], h2Terms: [], bodyTerms: [], entities: [], suggestedQuestions: [], paaQuestions: [], contentQuestions: [], competitors: [] };
      },
    },
    ...overrides,
  };
}

const clock = () => new Date('2026-09-02T12:00:00.000Z');

test('complete research persists every artifact, usage record, and readiness state', async () => {
  const store = temporaryStore();
  try {
    const result = await runSiteResearch('research-1', input, { providers: providers(), baseDir: store.baseDir, now: clock });
    assert.equal(result.dossier.status, 'architecture_ready');
    assert.ok(result.stages.includes('readiness'));
    assert.ok(result.dossier.keywordEvidence.length > 0);
    assert.ok(result.dossier.serpObservations.length > 0);
    assert.ok(result.dossier.providerUsage.length >= 4);
    assert.equal(fs.existsSync(path.join(store.baseDir, 'research-1', 'dossier.json')), true);
  } finally { store.remove(); }
});

test('interrupted runs resume without repeating completed paid stages', async () => {
  const store = temporaryStore();
  let metricsCalls = 0;
  const interrupted = providers({ dataForSeo: { ...providers().dataForSeo, async metrics(keywords) { metricsCalls += 1; if (metricsCalls === 1) throw new Error('temporary outage'); return providers().dataForSeo.metrics(keywords); } } });
  try {
    const first = await runSiteResearch('research-2', input, { providers: interrupted, baseDir: store.baseDir, now: clock });
    assert.equal(first.dossier.status, 'held');
    const resumed = await resumeSiteResearch('research-2', input, { providers: providers(), baseDir: store.baseDir, now: clock });
    assert.equal(resumed.dossier.status, 'architecture_ready');
    assert.equal(metricsCalls, 1);
  } finally { store.remove(); }
});

test('stale demand cache refreshes while fresh stages remain reusable', async () => {
  const store = temporaryStore();
  let metricCalls = 0;
  const counted = providers({ dataForSeo: { ...providers().dataForSeo, async metrics(keywords) { metricCalls += 1; return providers().dataForSeo.metrics(keywords); } } });
  try {
    await runSiteResearch('research-3', input, { providers: counted, baseDir: store.baseDir, now: clock });
    await resumeSiteResearch('research-3', input, { providers: counted, baseDir: store.baseDir, now: () => new Date('2026-12-02T12:00:00.000Z') });
    assert.equal(metricCalls, 2);
  } finally { store.remove(); }
});

test('budget exhaustion holds the dossier and preserves completed evidence', async () => {
  const store = temporaryStore();
  try {
    const exhausted = providers({ dataForSeo: { ...providers().dataForSeo, async metrics() { throw new ResearchBudgetExceededError('budget exhausted'); } } });
    const result = await runSiteResearch('research-4', input, { providers: exhausted, baseDir: store.baseDir, now: clock });
    assert.equal(result.dossier.status, 'held');
    assert.ok(result.dossier.keywordEvidence.some(item => item.keyword === 'Service Alpha'));
  } finally { store.remove(); }
});

test('provider outages hold incomplete research instead of reporting success', async () => {
  const store = temporaryStore();
  try {
    const unavailable = providers({ dataForSeo: { ...providers().dataForSeo, async serps() { throw new Error('provider unavailable'); } } });
    const result = await runSiteResearch('research-5', input, { providers: unavailable, baseDir: store.baseDir, now: clock });
    assert.equal(result.dossier.status, 'held');
    assert.ok(result.gates.some(gate => gate.id === 'provider_outage'));
  } finally { store.remove(); }
});

test('insufficient owner evidence holds research before paid work begins', async () => {
  const store = temporaryStore();
  let calls = 0;
  const unavailable = providers({ dataForSeo: { ...providers().dataForSeo, async expand() { calls += 1; return providers().dataForSeo.expand([]); } } });
  try {
    const result = await runSiteResearch('research-6', { businessTruth: { businessName: 'Incomplete', serviceModel: 'field' } }, { providers: unavailable, baseDir: store.baseDir, now: clock });
    assert.equal(result.dossier.status, 'held');
    assert.equal(calls, 0);
    assert.ok(result.gates.some(gate => gate.id.startsWith('truth_')));
  } finally { store.remove(); }
});
