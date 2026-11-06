import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getResearchPath, readResearchDossier, writeResearchDossierAtomic } from './researchStore';
import type { SiteResearchDossier } from './types';
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

function fixture(researchId: string): SiteResearchDossier {
  return {
    researchId, status: 'researching', createdAt: '2026-09-02T10:00:00.000Z', updatedAt: '2026-09-02T10:00:00.000Z',
    businessTruth: { businessName: 'Test Business', assertions: [], status: 'unknown' },
    evidence: [], evidenceEdges: [], keywordEvidence: [], serpObservations: [], pageOpportunities: [], internalLinkEdges: [], providerUsage: [],
    humanGates: [{ id: 'review', requiredFor: 'copy_ready', status: 'pending', requestedAt: '2026-09-02T10:00:00.000Z' }],
  };
}

test('persistResearchGateApproval refuses absent, malformed, oversized, symlinked and nonregular dossiers without writes', async () => {
  const store = temporaryStore();
  const researchId = 'research-gates-5';
  const file = getResearchPath(researchId, store.baseDir)!;
  const gate = deriveOpenResearchGates(researchId, { primaryService: 'Service Alpha' })[0]!;
  const approve = () => persistResearchGateApproval(researchId, gate, {}, gate.evidenceDigest, { baseDir: store.baseDir });
  try {
    assert.deepEqual(await approve(), { status: 'not_found' });
    assert.equal(fs.existsSync(path.dirname(file)), false);

    fs.mkdirSync(path.dirname(file));
    fs.writeFileSync(file, '{invalid json');
    assert.deepEqual(await approve(), { status: 'not_found' });
    assert.equal(fs.readFileSync(file, 'utf8'), '{invalid json');

    fs.writeFileSync(file, Buffer.alloc(16 * 1024 * 1024 + 1, 0x20));
    assert.deepEqual(await approve(), { status: 'not_found' });
    assert.equal(fs.statSync(file).size, 16 * 1024 * 1024 + 1);

    const target = path.join(store.baseDir, 'target.json');
    fs.writeFileSync(target, JSON.stringify(fixture(researchId)));
    fs.rmSync(file);
    fs.symlinkSync(target, file);
    assert.deepEqual(await approve(), { status: 'not_found' });
    assert.equal(fs.lstatSync(file).isSymbolicLink(), true);
    assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), fixture(researchId));

    fs.rmSync(file);
    fs.mkdirSync(file);
    assert.deepEqual(await approve(), { status: 'not_found' });
    assert.equal(fs.statSync(file).isDirectory(), true);

    fs.rmSync(path.dirname(file), { recursive: true });
    fs.symlinkSync(path.join(store.baseDir, 'missing-directory'), path.dirname(file));
    assert.deepEqual(await approve(), { status: 'not_found' });
    assert.equal(fs.existsSync(path.join(store.baseDir, 'missing-directory')), false);
  } finally {
    store.remove();
  }
});

test('persistResearchGateApproval uses only stored approvals and preserves existing dossier fields', async () => {
  const store = temporaryStore();
  const researchId = 'research-gates-6';
  const gate = deriveOpenResearchGates(researchId, { primaryService: 'Service Alpha' })[0]!;
  const unrelated = { evidenceDigest: 'stored-digest', approvedAt: 'original-time' };
  const dossier = { ...fixture(researchId), researchGateApprovals: { unrelated } };
  const file = getResearchPath(researchId, store.baseDir)!;
  const forged = { unrelated: { evidenceDigest: 'forged', approvedAt: 'forged' }, injected: { evidenceDigest: 'forged', approvedAt: 'forged' }, [gate.id]: { evidenceDigest: gate.evidenceDigest, approvedAt: 'forged' } };
  const collectedData: CollectedData = { primaryService: 'Service Alpha', travelBoundary: 'Area Alpha', researchGateApprovals: forged };
  const options = { baseDir: store.baseDir, now: () => new Date('2026-09-02T12:00:00.000Z') };
  try {
    assert.equal(await writeResearchDossierAtomic(researchId, dossier, store.baseDir), true);
    const stale = await persistResearchGateApproval(researchId, gate, collectedData, 'stale-digest', options);
    assert.equal(stale.status, 'stale');
    assert.deepEqual(stale.status === 'stale' && stale.collectedData.researchGateApprovals, { unrelated });
    assert.deepEqual(await readResearchDossier(researchId, store.baseDir), dossier);

    const result = await persistResearchGateApproval(researchId, gate, collectedData, gate.evidenceDigest, options);
    assert.equal(result.status, 'approved');
    assert.equal(result.status === 'approved' && result.collectedData.travelBoundary, 'Area Alpha');
    const expectedApprovals = { unrelated, [gate.id]: { evidenceDigest: gate.evidenceDigest, approvedAt: '2026-09-02T12:00:00.000Z' } };
    assert.deepEqual(result.status === 'approved' && result.collectedData.researchGateApprovals, expectedApprovals);
    const stored = await readResearchDossier(researchId, store.baseDir);
    assert.deepEqual(stored, { ...dossier, updatedAt: '2026-09-02T12:00:00.000Z', researchGateApprovals: expectedApprovals });
    assert.equal(fs.statSync(file).isFile(), true);

    const replay = await persistResearchGateApproval(researchId, gate, collectedData, gate.evidenceDigest, options);
    assert.equal(replay.status, 'already_approved');
    assert.deepEqual(replay.status === 'already_approved' && replay.collectedData.researchGateApprovals, expectedApprovals);
    assert.deepEqual(await readResearchDossier(researchId, store.baseDir), stored);
  } finally {
    store.remove();
  }
});
