/**
 * Canonical, provider-agnostic research dossier contracts.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { ResearchedCopyReviewPacket } from './copyReviewPacket';
import type { SiteIdentity } from '../siteIdentity';

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
  /** Set by the copy_ready plan (M2a): renderer page class for this opportunity. */
  pageClass?: string;
  /** Set by the copy_ready plan (M2a): the research-time ID this generator-safe ID replaced. */
  sourceOpportunityId?: string;
  /** Set by the copy_ready plan (M2a.1): plain display name of the owner-confirmed service. */
  displayName?: string;
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

/** One NeuronWriter question with the ideas group it came from. */
export interface NeuronQuestion {
  question: string;
  source: 'paa' | 'suggested' | 'topic' | 'content';
}

/**
 * Content depth (2026-11-10): the NeuronWriter analysis of one shortlisted service keyword, stored by applyNeuron() so it
 * reaches the page briefs. Suggestions only: titleTerms / h1Terms are deliberately not stored (they never flow into the
 * title, the H1 or the hero badge; Yonatan's formula).
 */
export interface NeuronQueryData {
  queryId: string;
  keyword: string;
  status: 'waiting' | 'ready';
  retrievedAt: string;
  /** metrics.word_count.target (competitor median-derived visible word target). */
  wordTarget?: number;
  h2Terms: string[];
  /** Content terms with NeuronWriter's suggested usage range (sugg_usage [min, max]). */
  bodyTerms: Array<{ t: string; min: number; max: number; tier?: 'basic' | 'extended' }>;
  entities: string[];
  /** PAA first, then suggested, topic-matrix and content questions (deduped, in that order). */
  questions: NeuronQuestion[];
  /** Competitor result titles (brand filtering of terms and questions). */
  competitorTitles: string[];
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
  approvedCopyReviewPacket?: ResearchedCopyReviewPacket;
  pipelineChecks?: ResearchPipelineChecks;
  /** Set once by the copy_ready plan (M2a.1): service labels/slugs, trade and service-area labels. Never regenerated. */
  siteIdentity?: SiteIdentity;
  /** Content depth (2026-11-10): NeuronWriter analysis per shortlisted service keyword (key: the keyword). */
  neuronQueries?: Record<string, NeuronQueryData>;
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
