import type { RiskGate } from './types';

export const ACQUISITION_GATE_IDS = ['registrar_inventory_and_price', 'trademark_and_brand_clearance', 'historical_content_rights', 'backlink_manual_review', 'redirect_and_indexation_history', 'sanctions_and_abuse_check', 'acquisition_budget_approval', 'final_human_acquisition_decision'] as const;
export interface RiskInput { evidence: Array<{ id: string; code: string; stale?: boolean }>; mandatoryEvidencePresent: boolean; mozComplete: boolean; }
export interface RiskEvaluation { gates: RiskGate[]; hardFailure: boolean; holdReasons: string[]; evidenceIds: string[]; }

export function requiredAcquisitionGates(): RiskGate[] { return ACQUISITION_GATE_IDS.map(id => ({ id, status: 'unknown', reason: 'manual_acquisition_review_required', evidenceIds: [] })); }

export function evaluateCandidateRisks(input: RiskInput): RiskEvaluation {
  const evidence = input.evidence ?? [];
  const linkedEvidence = evidence.filter(item => item.id);
  const ids = [...new Set(linkedEvidence.map(item => item.id))].sort();
  const linkedIds = (code: string): string[] => [...new Set(linkedEvidence.filter(item => item.code === code).map(item => item.id))].sort();
  const hardCodes = ['malware', 'phishing', 'adult', 'gambling', 'pharma_abuse', 'clear_unrelated_multi_era_topic_pivot'];
  const presentHardCodes = hardCodes.filter(code => linkedIds(code).length).sort();
  const hardFailure = presentHardCodes.length > 0;
  const holdReasons = [
    ...(!input.mandatoryEvidencePresent ? ['missing_mandatory_evidence'] : []),
    ...(!input.mozComplete ? ['missing_exact_moz_metrics'] : []),
    ...linkedEvidence.some(item => item.stale) ? ['stale_provider_evidence'] : [],
    ...['trademark_confusion', 'archived_personal_data', 'redirect_ambiguity', 'unsupported_status', 'contradictory_status', 'excessive_moz_spam'].filter(code => linkedIds(code).length),
  ].sort();
  const gates: RiskGate[] = [];
  if (hardFailure) gates.push({ id: 'hard_risk', status: 'fail', reason: presentHardCodes.join(','), evidenceIds: [...new Set(presentHardCodes.flatMap(linkedIds))].sort() });
  for (const reason of holdReasons) gates.push({ id: reason, status: 'hold', reason, evidenceIds: reason === 'missing_mandatory_evidence' || reason === 'missing_exact_moz_metrics' ? [] : reason === 'stale_provider_evidence' ? [...new Set(linkedEvidence.filter(item => item.stale).map(item => item.id))].sort() : linkedIds(reason) });
  return { gates, hardFailure, holdReasons, evidenceIds: ids };
}
