import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { decideHybridDemand, runHybridShadowPlan } from './planner';
import { appendHybridDecision, appendHybridSnapshot, readHybridDecisions, readHybridSnapshots } from './snapshotStore';
import type { HybridSnapshot } from './types';

const now = new Date('2026-09-04T00:00:00.000Z');

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hybrid-planner-test-'));
}

function snapshot(overrides: Partial<HybridSnapshot> = {}): HybridSnapshot {
  return {
    id: 'snapshot-current',
    createdAt: now.toISOString(),
    clientId: 'client-a',
    campaignId: 'campaign-a',
    window: { start: '2026-08-05T00:00:00.000Z', end: now.toISOString(), days: 30 },
    campaignAge: { ageDays: 60, phase: 'maturity' },
    ads: { spendIls: 500, conversions: 20, cpl: 25, paidQueryIds: ['query-a'] },
    crm: { leads: 20, qualified: 12, booked: 8, closed: 5, revenue: 2500 },
    attribution: { channelCounts: { paid_search: 20 }, confidenceCounts: { high: 20 }, reliable: true },
    gsc: {
      generatedAt: '2026-09-03T00:00:00.000Z',
      overlapRows: [{ query: 'query-a', position: 2, impressions: 100, clicks: 10 }],
    },
    sourceTimestamps: { ads: now.toISOString(), crm: now.toISOString(), gsc: '2026-09-03T00:00:00.000Z' },
    missingEvidenceReasons: [],
    ...overrides,
  };
}

test('holds when required evidence is missing', () => {
  const result = decideHybridDemand({ snapshot: snapshot({ missingEvidenceReasons: ['gsc_overlap_missing'] }), history: [], now });
  assert.equal(result.kind, 'hold_insufficient_evidence');
  assert.equal(result.execution, 'shadow_only');
  assert.ok(result.uncertaintyReasons.includes('gsc_overlap_missing'));
});

test('maintains profitable paid coverage despite organic overlap', () => {
  const result = decideHybridDemand({ snapshot: snapshot(), history: [], now, cplCeilingIls: 50 });
  assert.equal(result.kind, 'maintain_profitable_paid');
});

test('flags inefficient paid coverage without a mutation instruction', () => {
  const result = decideHybridDemand({ snapshot: snapshot({ ads: { spendIls: 500, conversions: 5, cpl: 100, paidQueryIds: ['query-a'] } }), history: [], now, cplCeilingIls: 50 });
  assert.equal(result.kind, 'repair_paid_efficiency');
  assert.equal(result.execution, 'shadow_only');
  assert.equal(result.cleanupTaskRef, undefined);
});

test('candidates stable organic paid overlap for an incrementality test only with comparable history', () => {
  const previous = snapshot({ id: 'snapshot-previous', createdAt: '2026-08-05T00:00:00.000Z', window: { start: '2026-07-06T00:00:00.000Z', end: '2026-08-05T00:00:00.000Z', days: 30 }, gsc: { generatedAt: '2026-08-04T00:00:00.000Z', overlapRows: [{ query: 'query-a', position: 3, impressions: 100, clicks: 10 }] }, sourceTimestamps: { ads: '2026-08-05T00:00:00.000Z', crm: '2026-08-05T00:00:00.000Z', gsc: '2026-08-04T00:00:00.000Z' } });
  const result = decideHybridDemand({ snapshot: snapshot(), history: [previous], now, cplCeilingIls: 50, minIncrementalityConversions: 10 });
  assert.equal(result.kind, 'candidate_incrementality_test');
  assert.equal(result.execution, 'shadow_only');
});

test('holds when attribution confidence is not reliable', () => {
  const result = decideHybridDemand({ snapshot: snapshot({ attribution: { channelCounts: { paid_search: 20 }, confidenceCounts: { low: 20 }, reliable: false } }), history: [], now, cplCeilingIls: 50 });
  assert.equal(result.kind, 'hold_insufficient_evidence');
  assert.ok(result.uncertaintyReasons.includes('attribution_unreliable'));
});

test('holds when GSC evidence is stale', () => {
  const result = decideHybridDemand({ snapshot: snapshot({ gsc: { generatedAt: '2026-07-01T00:00:00.000Z', overlapRows: [] }, sourceTimestamps: { ads: now.toISOString(), crm: now.toISOString(), gsc: '2026-07-01T00:00:00.000Z' } }), history: [], now });
  assert.equal(result.kind, 'hold_insufficient_evidence');
  assert.ok(result.uncertaintyReasons.includes('gsc_stale'));
});

test('appends immutable snapshots and shadow decisions under an injected base directory', () => {
  const baseDir = tempDir();
  appendHybridSnapshot(snapshot(), baseDir);
  appendHybridDecision({ ...decideHybridDemand({ snapshot: snapshot(), history: [], now }), id: 'decision-a', clientId: 'client-a', campaignId: 'campaign-a', snapshotId: 'snapshot-current', createdAt: now.toISOString() }, baseDir);
  assert.equal(readHybridSnapshots('client-a', baseDir).length, 1);
  assert.equal(readHybridDecisions('client-a', baseDir)[0]?.execution, 'shadow_only');
  assert.equal(fs.existsSync(path.join(baseDir, 'client-a', 'hybrid', 'snapshots.jsonl')), true);
});

test('planner failure is isolated from the supplied cycle callback', async () => {
  let cycleRan = false;
  const result = await runHybridShadowPlan({ clientId: 'client-a', now, collectSnapshot: () => { throw new Error('fixture failure'); } });
  await Promise.resolve().then(() => { cycleRan = true; });
  assert.equal(result.status, 'error');
  assert.equal(cycleRan, true);
});
