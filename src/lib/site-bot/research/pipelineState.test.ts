import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDeployReady,
  deriveNextPipelineAction,
  type PipelineResearchDossier,
} from './pipelineState';

function dossier(overrides: Partial<PipelineResearchDossier> = {}): PipelineResearchDossier {
  return {
    researchId: 'research-alpha',
    status: 'architecture_ready',
    humanGates: [],
    ...overrides,
  };
}

test('deriveNextPipelineAction starts one durable research run after a successful charge', () => {
  assert.deepEqual(deriveNextPipelineAction({ charged: true, researchId: 'research-alpha' }), {
    action: 'start_research',
    reasons: [],
  });
});

test('deriveNextPipelineAction reports needs-input and held research without a deploy action', () => {
  assert.deepEqual(deriveNextPipelineAction({ charged: true, dossier: dossier({ status: 'needs_input' }) }), {
    action: 'needs_input',
    reasons: ['research_needs_input'],
  });
  assert.deepEqual(deriveNextPipelineAction({ charged: true, dossier: dossier({ status: 'held' }) }), {
    action: 'held',
    reasons: ['research_held'],
  });
});

test('assertDeployReady rejects missing approval, copy, QA, Neuron, and duplicate evidence', () => {
  const result = assertDeployReady(dossier());
  assert.equal(result.ready, false);
  assert.deepEqual(result.reasons, [
    'copy_not_ready',
    'hebrew_qa_not_passed',
    'neuron_evaluation_not_passed',
    'duplicate_cannibalization_not_passed',
    'deploy_not_ready',
  ]);
});

test('assertDeployReady accepts a fully approved and evaluated deploy-ready dossier', () => {
  const result = assertDeployReady(dossier({
    status: 'deploy_ready',
    pipelineChecks: {
      copy: 'pass',
      hebrewQa: 'pass',
      neuronEvaluation: 'pass',
      duplicateCannibalization: 'pass',
    },
  }));
  assert.deepEqual(result, { ready: true, reasons: [] });
  assert.deepEqual(deriveNextPipelineAction({ charged: true, dossier: dossier({
    status: 'deploy_ready',
    pipelineChecks: {
      copy: 'pass', hebrewQa: 'pass', neuronEvaluation: 'pass', duplicateCannibalization: 'pass',
    },
  }) }), { action: 'deploy', reasons: [] });
});

test('simulation is explicitly non-production and deploy-rejected except for the offline test flag', () => {
  const readySimulation = dossier({
    status: 'deploy_ready',
    pipelineChecks: {
      copy: 'pass', hebrewQa: 'pass', neuronEvaluation: 'skip', duplicateCannibalization: 'pass',
    },
  });
  assert.deepEqual(assertDeployReady(readySimulation, { simulation: true }).reasons, ['simulation_deploy_rejected']);
  assert.deepEqual(assertDeployReady(readySimulation, { simulation: true, allowOfflineSimulationDeploy: true }), { ready: true, reasons: [] });
});

test('deriveNextPipelineAction treats repeated charged callbacks as a status read instead of another research start', () => {
  assert.deepEqual(deriveNextPipelineAction({ charged: true, dossier: dossier({ status: 'researching' }) }), {
    action: 'research_status',
    reasons: [],
  });
});
