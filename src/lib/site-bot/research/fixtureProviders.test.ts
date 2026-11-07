import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createFixtureFetch, fixtureResearchProviders, type FixtureFetchCall } from './fixtureProviders';
import { resolveResearchProviderMode, runSiteResearch } from './runResearch';

const owner = { sourceId: 'fixture-owner', capturedAt: '2026-11-07T00:00:00.000Z' };
const input = {
  businessTruth: {
    businessName: 'TEST Fixture Plumbing',
    serviceModel: 'remote' as const,
    confirmedServices: [{ value: 'Pipe Repair', owner }, { value: 'Leak Detection', owner }],
    moneyPriorities: [{ value: 'Pipe Repair', owner }],
  },
  seeds: ['Pipe Repair', 'Leak Detection'],
};

const ENV_KEYS = ['SITE_BOT_RESEARCH_PROVIDERS', 'NODE_ENV', 'DATAFORSEO_TOKEN', 'NEURONWRITER_API_KEY', 'NEURONWRITER_PROJECT_ID'] as const;

async function withEnv<T>(env: Partial<Record<(typeof ENV_KEYS)[number], string>>, fn: () => Promise<T>): Promise<T> {
  const saved = ENV_KEYS.map(key => [key, process.env[key]] as const);
  const mutableEnv = process.env as Record<string, string | undefined>;
  try {
    for (const key of ENV_KEYS) delete mutableEnv[key];
    Object.assign(mutableEnv, env);
    return await fn();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete mutableEnv[key];
      else mutableEnv[key] = value;
    }
  }
}

function captureConsole(method: 'error' | 'warn') {
  const original = console[method];
  const lines: string[] = [];
  console[method] = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
  return { lines, restore: () => { console[method] = original; } };
}

test('provider mode: live by default, fixture only off production, unknown values fail closed off production', () => {
  for (const value of [undefined, '', 'live']) {
    for (const NODE_ENV of [undefined, 'development', 'test', 'production']) {
      assert.equal(resolveResearchProviderMode({ SITE_BOT_RESEARCH_PROVIDERS: value, NODE_ENV }), 'live', `${value}/${NODE_ENV}`);
    }
  }
  for (const NODE_ENV of [undefined, 'development', 'test']) {
    assert.equal(resolveResearchProviderMode({ SITE_BOT_RESEARCH_PROVIDERS: 'fixture', NODE_ENV }), 'fixture');
    for (const value of ['Fixture', ' fixture', 'fixtures', '1', 'true']) {
      assert.throws(() => resolveResearchProviderMode({ SITE_BOT_RESEARCH_PROVIDERS: value, NODE_ENV }), /SITE_BOT_RESEARCH_PROVIDERS/);
    }
  }
  const errors = captureConsole('error');
  try {
    for (const value of ['fixture', 'Fixture', 'anything']) {
      assert.equal(resolveResearchProviderMode({ SITE_BOT_RESEARCH_PROVIDERS: value, NODE_ENV: 'production' }), 'live');
    }
  } finally { errors.restore(); }
  assert.equal(errors.lines.length, 3);
  assert.ok(errors.lines.every(line => /IGNORED in production/.test(line)));
});

test('fixture mode runs research end to end with zero network and no provider credentials', async () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-research-fixture-'));
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = (async () => { networkCalls += 1; throw new Error('network is forbidden in fixture mode'); }) as typeof fetch;
  const warnings = captureConsole('warn');
  try {
    const result = await withEnv({ SITE_BOT_RESEARCH_PROVIDERS: 'fixture', NODE_ENV: 'test' }, () => (
      runSiteResearch('fixture-run-1', input, { baseDir, now: () => new Date('2026-11-07T12:00:00.000Z') })
    ));
    assert.equal(networkCalls, 0);
    assert.equal(result.dossier.status, 'architecture_ready', JSON.stringify(result.dossier.humanGates));
    for (const stage of ['seed_expansion', 'shortlist', 'neuron_enrichment', 'evidence_graph', 'usage_ledger', 'readiness'] as const) {
      assert.ok(result.stages.includes(stage), stage);
    }
    assert.ok(result.dossier.keywordEvidence.length >= 6);
    assert.ok(result.dossier.serpObservations.length > 0);
    assert.ok(result.dossier.serpObservations.every(item => !item.observedUrl || new URL(item.observedUrl).hostname.endsWith('.example')));
    assert.ok(result.dossier.providerUsage.length >= 4);
    assert.ok(result.dossier.providerUsage.every(usage => usage.providerRecordId?.startsWith('fixture-')), 'fixture dossier is identifiable');
    assert.ok(result.dossier.evidence.filter(item => item.id.startsWith('neuron-query:')).every(item => item.providerRecordId?.startsWith('fixture-neuron-')));
    assert.ok(fs.existsSync(path.join(baseDir, 'fixture-run-1', 'dossier.json')));
    assert.equal(warnings.lines.filter(line => /FIXTURE providers active/.test(line)).length, 1);
  } finally {
    warnings.restore();
    globalThis.fetch = originalFetch;
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
});

test('default (unset) mode still goes to the live adapters', async () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-research-live-'));
  try {
    const result = await withEnv({}, () => runSiteResearch('live-run-1', input, { baseDir }));
    // No DATAFORSEO_TOKEN: the live adapter refuses before any request, exactly as before.
    assert.equal(result.dossier.status, 'held');
    assert.ok(result.dossier.humanGates.some(gate => gate.id === 'provider_outage' && /DATAFORSEO_TOKEN is required/.test(gate.note ?? '')));
  } finally { fs.rmSync(baseDir, { recursive: true, force: true }); }
});

test('fixture transport serves only recorded endpoints and records every call', async () => {
  const calls: FixtureFetchCall[] = [];
  const fetch = createFixtureFetch(calls);
  await assert.rejects(fetch('https://api.dataforseo.com/v3/unknown/endpoint', { method: 'POST', body: '[]' }), /no recording/);
  await assert.rejects(fetch('https://example.com/'), /no recording/);
  const providers = fixtureResearchProviders(calls);
  const expanded = await providers.dataForSeo.expand(['Alpha']);
  assert.deepEqual(expanded.keywords, ['Alpha', 'Alpha price', 'Alpha near me']);
  assert.ok(expanded.taskIds.every(id => id.startsWith('fixture-related-')));
  assert.equal(calls.length, 3);
});
