import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readResearchDossier, writeResearchDossierAtomic } from './researchStore';
import type { SiteResearchDossier } from './types';
import { deriveOpenResearchGates, persistResearchGateApproval } from './gates';
import { OWNER_ANSWERABLE_GATE_TYPES, OWNER_GATE_WINDOW_MS, recordOwnerResearchGates, STORED_ANSWER_GATE_TYPES, submitOwnerResearchGate, validateOwnerGateAnswer } from './ownerGates';
import { gateAnsweredCollectedData } from './gateAnswers';
import { assertDeployReady, deriveNextPipelineAction } from './pipelineState';

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

// 2026-11-20 (post-payment screen): ambiguous_intent is staff-only. The pay page never shows it, the owner path refuses it,
// staff answer it through the admin path and generation applies that answer; an unanswered one never blocks the research.
test('ambiguous_intent: hidden from the owner pay path, staff-answerable, never blocking', async () => {
  assert.ok(!OWNER_ANSWERABLE_GATE_TYPES.includes('ambiguous_intent'));
  assert.ok(STORED_ANSWER_GATE_TYPES.includes('ambiguous_intent'));
  const { baseDir, remove } = await store();
  const data = { primaryService: 'Service Alpha', researchGateAnswers: { ambiguous_intent: { candidates: ['Alpha', 'Beta'] } } };
  const gates = deriveOpenResearchGates(A, data);
  const ambiguous = gates.find(gate => gate.type === 'ambiguous_intent')!;
  assert.ok(ambiguous, 'the gate exists for this research');
  // Recorded for the pay page: every gate except ambiguous_intent (the callback hands the pay page only these).
  const recorded = await recordOwnerResearchGates(A, gates, { baseDir, now: at(0) });
  assert.deepEqual(recorded.map(gate => gate.type), gates.filter(gate => gate.type !== 'ambiguous_intent').map(gate => gate.type));
  assert.ok(!(await readResearchDossier(A, baseDir))!.ownerResearchGates!.some(gate => gate.type === 'ambiguous_intent'));
  // The owner path refuses it even when it is injected.
  const injected = await readResearchDossier(A, baseDir);
  injected!.ownerResearchGates = [...injected!.ownerResearchGates!, { id: ambiguous.id, type: 'ambiguous_intent', evidenceDigest: ambiguous.evidenceDigest, issuedAt: T0.toISOString() }];
  assert.ok(await writeResearchDossierAtomic(A, injected!, baseDir));
  assert.equal((await submitOwnerResearchGate(A, ambiguous.id, ambiguous.evidenceDigest, 'Alpha', { baseDir, now: at(1000) })).status, 'not_found');
  // Unanswered, it blocks nothing: the pipeline reads humanGates only.
  const open = (await readResearchDossier(A, baseDir))!;
  assert.equal(deriveNextPipelineAction({ charged: true, researchId: A, dossier: { ...open, status: 'architecture_ready' } }).reasons.includes('approval_not_granted'), false);
  assert.equal(assertDeployReady({ ...open, status: 'deploy_ready', pipelineChecks: { copy: 'pass', hebrewQa: 'pass', neuronEvaluation: 'pass', duplicateCannibalization: 'pass' } }).ready, true);
  // Staff answer it through the admin path; generation applies the stored staff answer.
  const staff = await persistResearchGateApproval(A, ambiguous, data, ambiguous.evidenceDigest, { baseDir, now: at(2000), staffAnswer: 'Alpha' });
  assert.equal(staff.status, 'approved');
  const applied = gateAnsweredCollectedData(data, await readResearchDossier(A, baseDir));
  assert.equal(applied.researchGateAnswers?.ambiguous_intent, 'Alpha');
  remove();
});
