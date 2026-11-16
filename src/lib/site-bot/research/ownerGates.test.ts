import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readResearchDossier, writeResearchDossierAtomic } from './researchStore';
import type { SiteResearchDossier } from './types';
import { deriveOpenResearchGates } from './gates';
import { OWNER_GATE_WINDOW_MS, recordOwnerResearchGates, submitOwnerResearchGate, validateOwnerGateAnswer } from './ownerGates';

const A = '123e4567-e89b-42d3-a456-426614174000';
const B = '00000000-0000-4000-8000-000000000000';
const T0 = new Date('2026-11-16T20:00:00.000Z');

function fixture(researchId: string): SiteResearchDossier {
  return {
    researchId, status: 'researching', createdAt: T0.toISOString(), updatedAt: T0.toISOString(),
    businessTruth: { businessName: 'Test Business', assertions: [], status: 'unknown' },
    evidence: [], evidenceEdges: [], keywordEvidence: [], serpObservations: [], pageOpportunities: [], internalLinkEdges: [], providerUsage: [],
    humanGates: [],
  } as unknown as SiteResearchDossier;
}

async function store() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'owner-gates-'));
  assert.ok(await writeResearchDossierAtomic(A, fixture(A), baseDir));
  assert.ok(await writeResearchDossierAtomic(B, fixture(B), baseDir));
  return { baseDir, remove: () => fs.rmSync(baseDir, { recursive: true, force: true }) };
}

const at = (ms: number) => () => new Date(T0.getTime() + ms);

test('owner gate: recorded at checkout, approved once with the validated answer stored, then closed', async () => {
  const { baseDir, remove } = await store();
  const gates = deriveOpenResearchGates(A, { primaryService: 'Service Alpha' });
  const recorded = await recordOwnerResearchGates(A, gates, { baseDir, now: at(0) });
  assert.equal(recorded.length, gates.length);
  const boundary = gates.find(gate => gate.type === 'business_boundary')!;

  const first = await submitOwnerResearchGate(A, boundary.id, boundary.evidenceDigest, { services: ['Service Beta'], extra: 'dropped' }, { baseDir, now: at(1000) });
  assert.equal(first.status, 'approved');
  const saved = (await readResearchDossier(A, baseDir, { bounded: true }))!;
  assert.equal(saved.researchGateApprovals?.[boundary.id]?.evidenceDigest, boundary.evidenceDigest);
  const record = saved.ownerResearchGates!.find(gate => gate.id === boundary.id)!;
  assert.deepEqual(record.answer, { services: ['Service Beta'] });
  assert.ok(record.answeredAt);

  const again = await submitOwnerResearchGate(A, boundary.id, boundary.evidenceDigest, { services: ['Service Gamma'] }, { baseDir, now: at(2000) });
  assert.equal(again.status, 'closed');
  remove();
});

test('owner gate: another research, unknown gate, stale digest, invalid answer and expiry are refused', async () => {
  const { baseDir, remove } = await store();
  const gates = deriveOpenResearchGates(A, { primaryService: 'Service Alpha' });
  await recordOwnerResearchGates(A, gates, { baseDir, now: at(0) });
  const geography = gates.find(gate => gate.type === 'geography')!;

  // Research B has no owner gates: A's gate (or any gate) is forbidden there and B's dossier stays untouched.
  assert.equal((await submitOwnerResearchGate(B, geography.id, geography.evidenceDigest, { travelBoundary: 'x' }, { baseDir, now: at(1) })).status, 'forbidden');
  assert.equal((await readResearchDossier(B, baseDir, { bounded: true }))!.researchGateApprovals, undefined);
  assert.equal((await submitOwnerResearchGate(A, `${A}:geography:forged`, 'forged', { travelBoundary: 'x' }, { baseDir, now: at(1) })).status, 'not_found');
  assert.equal((await submitOwnerResearchGate(A, geography.id, 'old-digest', { travelBoundary: 'x' }, { baseDir, now: at(1) })).status, 'stale');
  assert.equal((await submitOwnerResearchGate(A, geography.id, geography.evidenceDigest, { travelBoundary: '' }, { baseDir, now: at(1) })).status, 'invalid_answer');
  assert.equal((await submitOwnerResearchGate(A, geography.id, geography.evidenceDigest, { travelBoundary: 'x' }, { baseDir, now: at(OWNER_GATE_WINDOW_MS + 1) })).status, 'closed');
  assert.equal((await readResearchDossier(A, baseDir, { bounded: true }))!.researchGateApprovals, undefined);
  remove();
});

test('validateOwnerGateAnswer enforces shape and size per gate type', () => {
  assert.deepEqual(validateOwnerGateAnswer('money_services', { priorityServices: ['a', 'b'] }), { priorityServices: ['a', 'b'] });
  assert.equal(validateOwnerGateAnswer('money_services', { priorityServices: Array.from({ length: 21 }, (_, i) => `s${i}`) }), null);
  assert.equal(validateOwnerGateAnswer('business_boundary', { services: ['x'.repeat(201)] }), null);
  assert.deepEqual(validateOwnerGateAnswer('geography', { travelBoundary: 'Area', geographicExclusions: [] }), { travelBoundary: 'Area', geographicExclusions: [] });
  assert.equal(validateOwnerGateAnswer('geography', { travelBoundary: 'Area', geographicExclusions: [1] }), null);
  assert.deepEqual(validateOwnerGateAnswer('service_attributes', { serviceAttributes: { Alpha: 'fast' } }), { serviceAttributes: { Alpha: 'fast' } });
  assert.equal(validateOwnerGateAnswer('service_attributes', { serviceAttributes: {} }), null);
  assert.equal(validateOwnerGateAnswer('ambiguous_intent', 'y'.repeat(1001)), null);
  assert.equal(validateOwnerGateAnswer('ambiguous_intent', 'Alpha'), 'Alpha');
});
