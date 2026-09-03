/**
 * Durable paid-research and deployment state gates.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import type { HumanGate, ResearchStatus } from './types';

export type PipelineCheckStatus = 'pass' | 'skip' | 'pending' | 'held';
export type PipelineAction = 'start_research' | 'research_status' | 'needs_input' | 'held' | 'generate' | 'deploy';
export type PipelineHoldReason =
  | 'research_needs_input'
  | 'research_held'
  | 'architecture_not_ready'
  | 'approval_not_granted'
  | 'copy_not_ready'
  | 'hebrew_qa_not_passed'
  | 'neuron_evaluation_not_passed'
  | 'duplicate_cannibalization_not_passed'
  | 'deploy_not_ready'
  | 'simulation_deploy_rejected';

export interface PipelineChecks {
  copy?: PipelineCheckStatus;
  hebrewQa?: PipelineCheckStatus;
  neuronEvaluation?: PipelineCheckStatus;
  duplicateCannibalization?: PipelineCheckStatus;
}

export interface PipelineResearchDossier {
  researchId: string;
  status: ResearchStatus;
  humanGates: Pick<HumanGate, 'status'>[];
  pipelineChecks?: PipelineChecks;
}

export interface PipelineActionInput {
  charged: boolean;
  researchId?: string;
  dossier?: PipelineResearchDossier | null;
  simulation?: boolean;
  allowOfflineSimulationDeploy?: boolean;
}

export interface PipelineActionResult {
  action: PipelineAction;
  reasons: PipelineHoldReason[];
}

export interface DeployReadiness {
  ready: boolean;
  reasons: PipelineHoldReason[];
}

function approved(dossier: PipelineResearchDossier): boolean {
  return dossier.humanGates.every(gate => gate.status === 'approved');
}

function passing(check: PipelineCheckStatus | undefined, allowSkip = false): boolean {
  return check === 'pass' || (allowSkip && check === 'skip');
}

export function assertDeployReady(
  dossier: PipelineResearchDossier,
  options: Pick<PipelineActionInput, 'simulation' | 'allowOfflineSimulationDeploy'> = {},
): DeployReadiness {
  const reasons: PipelineHoldReason[] = [];
  if (options.simulation && !options.allowOfflineSimulationDeploy) reasons.push('simulation_deploy_rejected');
  if (!approved(dossier)) reasons.push('approval_not_granted');
  if (!passing(dossier.pipelineChecks?.copy)) reasons.push('copy_not_ready');
  if (!passing(dossier.pipelineChecks?.hebrewQa)) reasons.push('hebrew_qa_not_passed');
  if (!passing(dossier.pipelineChecks?.neuronEvaluation, true)) reasons.push('neuron_evaluation_not_passed');
  if (!passing(dossier.pipelineChecks?.duplicateCannibalization)) reasons.push('duplicate_cannibalization_not_passed');
  if (dossier.status !== 'deploy_ready') reasons.push('deploy_not_ready');
  return { ready: reasons.length === 0, reasons };
}

export function deriveNextPipelineAction(input: PipelineActionInput): PipelineActionResult {
  if (!input.charged) return { action: 'held', reasons: ['approval_not_granted'] };
  if (!input.dossier) return { action: 'start_research', reasons: [] };
  if (input.dossier.status === 'needs_input') return { action: 'needs_input', reasons: ['research_needs_input'] };
  if (input.dossier.status === 'held' || input.dossier.status === 'failed') return { action: 'held', reasons: ['research_held'] };
  if (input.dossier.status === 'pending' || input.dossier.status === 'researching') return { action: 'research_status', reasons: [] };
  if (input.dossier.status === 'architecture_ready') {
    return approved(input.dossier)
      ? { action: 'generate', reasons: [] }
      : { action: 'held', reasons: ['approval_not_granted'] };
  }
  if (input.dossier.status === 'copy_ready') {
    return approved(input.dossier)
      ? { action: 'generate', reasons: [] }
      : { action: 'held', reasons: ['approval_not_granted'] };
  }
  const readiness = assertDeployReady(input.dossier, input);
  return readiness.ready ? { action: 'deploy', reasons: [] } : { action: 'held', reasons: readiness.reasons };
}
