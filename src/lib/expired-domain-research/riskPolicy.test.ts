import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveResearchDisposition } from './runResearch';
import { evaluateCandidateRisks, requiredAcquisitionGates, type RiskInput } from './riskPolicy';
import type { RiskGate } from './types';

const hardCodes = ['malware', 'phishing', 'adult', 'gambling', 'pharma_abuse', 'clear_unrelated_multi_era_topic_pivot'];
const holdCodes = ['trademark_confusion', 'archived_personal_data', 'redirect_ambiguity', 'unsupported_status', 'contradictory_status', 'excessive_moz_spam'];
const input = (evidence: RiskInput['evidence'], mandatoryEvidencePresent = true, mozComplete = true): RiskInput => ({ evidence, mandatoryEvidencePresent, mozComplete });
const gate = (id: string, status: RiskGate['status']): RiskGate => ({ id, status, reason: id, evidenceIds: [] });

test('each hard code rejects only when its record has linked evidence', () => {
  for (const code of hardCodes) {
    const linked = evaluateCandidateRisks(input([{ id: `id-${code}`, code }]));
    assert.equal(linked.hardFailure, true, code);
    assert.deepEqual(linked.gates, [{ id: 'hard_risk', status: 'fail', reason: code, evidenceIds: [`id-${code}`] }], code);
    assert.equal(evaluateCandidateRisks(input([{ id: '', code }])).hardFailure, false, `${code} empty id`);
  }
});

test('hard risk reasons and evidence are linked, sorted, and deduplicated', () => {
  const evaluation = evaluateCandidateRisks(input([
    { id: 'z-hard', code: 'phishing' }, { id: 'a-hard', code: 'malware' }, { id: 'a-hard', code: 'malware' },
    { id: 'hold-id', code: 'trademark_confusion' }, { id: 'unknown-id', code: 'unknown' }, { id: '', code: 'adult' },
  ]));
  assert.equal(evaluation.hardFailure, true);
  assert.deepEqual(evaluation.gates[0], { id: 'hard_risk', status: 'fail', reason: 'malware,phishing', evidenceIds: ['a-hard', 'z-hard'] });
  assert.deepEqual(evaluation.evidenceIds, ['a-hard', 'hold-id', 'unknown-id', 'z-hard']);
  assert.equal(evaluateCandidateRisks(input([{ id: 'hold-id', code: 'trademark_confusion' }, { id: 'unknown-id', code: 'unknown' }])).hardFailure, false);
});

test('each evidence-driven hold gate uses only its own linked evidence', () => {
  for (const code of holdCodes) {
    const otherCode = code === 'trademark_confusion' ? 'archived_personal_data' : 'trademark_confusion';
    const evaluation = evaluateCandidateRisks(input([
      { id: 'z-own', code }, { id: 'a-own', code }, { id: 'a-own', code },
      { id: 'other-hold', code: otherCode }, { id: 'hard-id', code: 'malware' }, { id: 'unknown-id', code: 'unknown' },
    ]));
    const held = evaluation.gates.find(candidate => candidate.id === code);
    assert.deepEqual(held, { id: code, status: 'hold', reason: code, evidenceIds: ['a-own', 'z-own'] }, code);
  }
});

test('stale provider hold is emitted only for linked stale evidence', () => {
  const stale = evaluateCandidateRisks(input([{ id: 'z-stale', code: 'unknown', stale: true }, { id: 'a-stale', code: 'unknown', stale: true }, { id: '', code: 'unknown', stale: true }, { id: 'fresh', code: 'unknown' }]));
  assert.deepEqual(stale.gates, [{ id: 'stale_provider_evidence', status: 'hold', reason: 'stale_provider_evidence', evidenceIds: ['a-stale', 'z-stale'] }]);
  assert.equal(evaluateCandidateRisks(input([{ id: '', code: 'unknown', stale: true }])).gates.some(candidate => candidate.id === 'stale_provider_evidence'), false);
});

test('missing input holds are evidence-free and deterministic with evidence-driven holds', () => {
  const evaluation = evaluateCandidateRisks(input([{ id: 'z-redirect', code: 'redirect_ambiguity' }, { id: 'a-trademark', code: 'trademark_confusion' }], false, false));
  assert.deepEqual(evaluation.gates, [
    { id: 'missing_exact_moz_metrics', status: 'hold', reason: 'missing_exact_moz_metrics', evidenceIds: [] },
    { id: 'missing_mandatory_evidence', status: 'hold', reason: 'missing_mandatory_evidence', evidenceIds: [] },
    { id: 'redirect_ambiguity', status: 'hold', reason: 'redirect_ambiguity', evidenceIds: ['z-redirect'] },
    { id: 'trademark_confusion', status: 'hold', reason: 'trademark_confusion', evidenceIds: ['a-trademark'] },
  ]);
  assert.deepEqual(evaluation.holdReasons, ['missing_exact_moz_metrics', 'missing_mandatory_evidence', 'redirect_ambiguity', 'trademark_confusion']);
});

test('risk evaluation is immutable and canonical under reordered duplicated inputs', () => {
  const source = input([{ id: 'z', code: 'phishing' }, { id: 'a', code: 'redirect_ambiguity' }, { id: 'z', code: 'phishing' }, { id: '', code: 'unknown', stale: true }]);
  const before = JSON.stringify(source);
  const reversed = input([...source.evidence].reverse());
  assert.equal(JSON.stringify(evaluateCandidateRisks(source)), JSON.stringify(evaluateCandidateRisks(reversed)));
  assert.equal(JSON.stringify(source), before);
});

test('manual acquisition gates remain fixed, ordered, unresolved, and evidence-free', () => {
  assert.deepEqual(requiredAcquisitionGates(), [
    'registrar_inventory_and_price', 'trademark_and_brand_clearance', 'historical_content_rights', 'backlink_manual_review',
    'redirect_and_indexation_history', 'sanctions_and_abuse_check', 'acquisition_budget_approval', 'final_human_acquisition_decision',
  ].map(id => ({ id, status: 'unknown', reason: 'manual_acquisition_review_required', evidenceIds: [] })));
});

test('research disposition applies hard failure, blocking, and manual-gate boundaries without mutation', () => {
  const gates = [gate('manual-one', 'pass'), gate('manual-two', 'pass')];
  const before = JSON.stringify(gates);
  const rows = [
    { hardFailure: true, blocking: false, acquisitionGates: gates, expected: 'reject' },
    { hardFailure: true, blocking: true, acquisitionGates: [], expected: 'reject' },
    { hardFailure: false, blocking: true, acquisitionGates: gates, expected: 'hold' },
    { hardFailure: false, blocking: false, acquisitionGates: [gate('manual-one', 'unknown')], expected: 'hold' },
    { hardFailure: false, blocking: false, acquisitionGates: gates, expected: 'manual_due_diligence_required' },
    { hardFailure: false, blocking: false, acquisitionGates: [], expected: 'manual_due_diligence_required' },
  ];
  for (const row of rows) assert.equal(deriveResearchDisposition(row), row.expected);
  assert.equal(JSON.stringify(gates), before);
});