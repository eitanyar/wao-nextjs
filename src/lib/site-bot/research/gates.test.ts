import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  applyResearchGateAnswer,
  approveResearchGate,
  deriveOpenResearchGates,
  persistResearchGateApproval,
} from './gates';
import type { CollectedData } from '../../bot/prompts';

function temporaryStore(): { baseDir: string; remove(): void } {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-gates-'));
  return { baseDir, remove: () => fs.rmSync(baseDir, { recursive: true, force: true }) };
}

const completeData: CollectedData = {
  primaryService: 'Service Alpha',
  secondaryServices: 'Service Beta',
  serviceAttributes: { 'Service Alpha': 'attribute' },
  targetLocation: 'Area Alpha',
  travelBoundary: 'Area Alpha',
  geographicExclusions: [],
  priorityServices: ['Service Alpha'],
};

test('deriveOpenResearchGates keeps high-confidence research uninterrupted', () => {
  assert.deepEqual(deriveOpenResearchGates('research-gates-1', completeData), []);
});

test('deriveOpenResearchGates creates targeted gates for boundary, attributes, geography, priority, and ambiguity', () => {
  const gates = deriveOpenResearchGates('research-gates-2', {
    primaryService: 'Service Alpha',
    researchGateAnswers: { ambiguous_intent: { candidates: ['Service Alpha', 'Service Beta'] } },
  });

  assert.deepEqual(gates.map(gate => gate.type), [
    'business_boundary',
    'service_attributes',
    'geography',
    'money_services',
    'ambiguous_intent',
  ]);
  assert.equal(new Set(gates.map(gate => gate.id)).size, gates.length);
});

test('approveResearchGate is idempotent for the same digest and rejects stale evidence', () => {
  const gate = deriveOpenResearchGates('research-gates-3', { primaryService: 'Service Alpha' })[0]!;
  const first = approveResearchGate({}, gate, gate.evidenceDigest, '2026-09-02T12:00:00.000Z');
  const repeated = approveResearchGate(first.collectedData, gate, gate.evidenceDigest, '2026-09-02T12:01:00.000Z');
  const stale = approveResearchGate(first.collectedData, gate, 'stale-digest', '2026-09-02T12:01:00.000Z');

  assert.equal(first.status, 'approved');
  assert.equal(repeated.status, 'already_approved');
  assert.equal(stale.status, 'stale');
});

test('applyResearchGateAnswer writes only the structured field for its gate', () => {
  const gates = deriveOpenResearchGates('research-gates-4', { primaryService: 'Service Alpha' });
  const geography = gates.find(gate => gate.type === 'geography')!;
  const updated = applyResearchGateAnswer({}, geography, {
    travelBoundary: 'Area Alpha',
    geographicExclusions: ['Area Beta'],
  });

  assert.deepEqual(updated.travelBoundary, 'Area Alpha');
  assert.deepEqual(updated.geographicExclusions, ['Area Beta']);
  assert.equal(updated.priorityServices, undefined);
});

test('persistResearchGateApproval writes the digest-bound approval to the research dossier', async () => {
  const store = temporaryStore();
  const gate = deriveOpenResearchGates('research-gates-5', { primaryService: 'Service Alpha' })[0]!;
  try {
    const result = await persistResearchGateApproval('research-gates-5', gate, {}, gate.evidenceDigest, {
      baseDir: store.baseDir,
      now: () => new Date('2026-09-02T12:00:00.000Z'),
    });

    assert.equal(result.status, 'approved');
    assert.equal(fs.existsSync(path.join(store.baseDir, 'research-gates-5', 'dossier.json')), true);
    assert.equal(result.dossier.researchGateApprovals?.[gate.id]?.evidenceDigest, gate.evidenceDigest);
  } finally {
    store.remove();
  }
});
