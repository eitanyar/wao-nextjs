/**
 * Canonical, provider-agnostic research dossier contracts.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export const RESEARCH_STATUSES = [
  'pending',
  'researching',
  'needs_input',
  'architecture_ready',
  'copy_ready',
  'held',
  'deploy_ready',
  'failed',
] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];
export type EvidenceSourceKind =
  | 'website'
  | 'search'
  | 'keyword_provider'
  | 'serp_provider'
  | 'provider'
  | 'manual';
export type AssertionStatus = 'unknown' | 'verified' | 'contested' | 'held';

export interface ExternalProvenance {
  sourceKind: EvidenceSourceKind;
  sourceUrl?: string;
  providerRecordId?: string;
  retrievedAt: string;
  confidence: number;
  assertionStatus: AssertionStatus;
  timeSensitive?: boolean;
  expiresAt?: string;
}

export interface EvidenceNode extends ExternalProvenance {
  id: string;
  claim: string;
}

export interface EvidenceEdge {
  fromEvidenceId: string;
  toEvidenceId: string;
  relationship: 'supports' | 'contradicts' | 'refines';
}

export interface KeywordEvidence extends ExternalProvenance {
  keyword: string;
  searchVolume?: number;
  intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
}

export interface SerpObservation extends ExternalProvenance {
  query: string;
  rank?: number;
  observedUrl?: string;
  observation: string;
}

export interface PageOpportunity {
  id: string;
  targetPath: string;
  opportunity: string;
  evidenceIds: string[];
  status: 'unknown' | 'held' | 'ready';
}

export interface InternalLinkEdge {
  fromPath: string;
  toPath: string;
  rationale: string;
  evidenceIds: string[];
}

export interface ProviderUsage extends ExternalProvenance {
  provider: string;
  operation: string;
  units: number;
  estimatedCostUsd?: number;
}

export interface HumanGate {
  id: string;
  requiredFor: ResearchStatus;
  status: 'pending' | 'approved' | 'rejected' | 'held';
  requestedAt: string;
  resolvedAt?: string;
  note?: string;
}

export interface ResearchGateApproval {
  evidenceDigest: string;
  approvedAt: string;
}

export interface ResearchPipelineChecks {
  copy?: 'pass' | 'skip' | 'pending' | 'held';
  hebrewQa?: 'pass' | 'skip' | 'pending' | 'held';
  neuronEvaluation?: 'pass' | 'skip' | 'pending' | 'held';
  duplicateCannibalization?: 'pass' | 'skip' | 'pending' | 'held';
}

export interface BusinessTruthModel {
  businessName: string;
  assertions: EvidenceNode[];
  status: AssertionStatus;
}

export interface SiteResearchDossier {
  researchId: string;
  status: ResearchStatus;
  createdAt: string;
  updatedAt: string;
  businessTruth: BusinessTruthModel;
  evidence: EvidenceNode[];
  evidenceEdges: EvidenceEdge[];
  keywordEvidence: KeywordEvidence[];
  serpObservations: SerpObservation[];
  pageOpportunities: PageOpportunity[];
  internalLinkEdges: InternalLinkEdge[];
  providerUsage: ProviderUsage[];
  humanGates: HumanGate[];
  researchGateApprovals?: Record<string, ResearchGateApproval>;
  pipelineChecks?: ResearchPipelineChecks;
}

const RESEARCH_STATUS_TRANSITIONS: Readonly<Record<ResearchStatus, readonly ResearchStatus[]>> = {
  pending: ['researching', 'held', 'failed'],
  researching: ['needs_input', 'architecture_ready', 'held', 'failed'],
  needs_input: ['researching', 'held', 'failed'],
  architecture_ready: ['copy_ready', 'held', 'failed'],
  copy_ready: ['deploy_ready', 'held', 'failed'],
  held: ['researching', 'needs_input', 'failed'],
  deploy_ready: ['held', 'failed'],
  failed: [],
};

export function transitionResearchStatus(
  current: ResearchStatus,
  next: ResearchStatus
): ResearchStatus {
  if (!RESEARCH_STATUS_TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid research status transition: ${current} -> ${next}`);
  }

  return next;
}
