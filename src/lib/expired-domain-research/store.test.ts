import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getResearchRunPath, listResearchRuns, readResearchRun, writeResearchRunAtomic } from './store';
import type { ResearchRun } from './types';

const digest = 'c'.repeat(64);
function run(runId = 'run-1', updatedAt = '2026-01-01T00:00:00.000Z'): ResearchRun { const input = { runId, keywords: ['topic research'], waybackUrls: ['https://web.archive.org/web/*/example.test'], requestedCandidates: ['example.test'], requestedAt: '2026-01-01T00:00:00.000Z' }; const evidence = { id: 'moz-1', sourceUrl: 'https://api.moz.com/data', provider: 'moz-data-api-v3' as const, tool: 'moz', method: 'lookup', retrievedAt: updatedAt, freshnessHours: 1, confidence: 90, rawResponseDigest: digest }; return { schemaVersion: 1, runId, createdAt: input.requestedAt, updatedAt, stage: 'stored', disposition: 'hold', input, candidates: [{ hostname: 'example.test', topicalFit: 80, businessFit: 70, historicalEvidence: [], domainStatusEvidence: [], openSeoEvidence: [], mozAuthorityEvidence: [{ ...evidence, pageAuthority: 30, domainAuthority: 40, spamScore: 2 }], riskGates: [] }], scores: [], providerUsage: [] }; }

test('research storage atomically round trips bounded records and hides input summaries', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'domain-research-store-'));
  try {
    assert.equal(writeResearchRunAtomic(run(), root), true);
    assert.deepEqual(readResearchRun('run-1', root), run());
    assert.deepEqual(listResearchRuns(root), [{ runId: 'run-1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', stage: 'stored', disposition: 'hold', candidateCount: 1 }]);
    assert.equal(getResearchRunPath('../escape', root), null);
    assert.equal(readResearchRun('../escape', root), null);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('research storage orders summaries newest first', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'domain-research-store-'));
  try {
    assert.equal(writeResearchRunAtomic(run('older', '2026-01-01T00:00:00.000Z'), root), true);
    assert.equal(writeResearchRunAtomic(run('newer', '2026-01-02T00:00:00.000Z'), root), true);
    assert.deepEqual(listResearchRuns(root).map(summary => summary.runId), ['newer', 'older']);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
