export const RESEARCH_SCHEMA_VERSION = 1 as const;

export type ResearchDisposition = 'reject' | 'hold' | 'manual_due_diligence_required';
export type ResearchStage = 'input_validated' | 'evidence_collected' | 'scored' | 'stored';
export type OrchestrationStage = 'validated' | 'discovered' | 'status_checked' | 'niche_enriched' | 'authority_enriched' | 'risk_gated' | 'ranked' | 'complete' | 'held' | 'failed';
export type AvailabilityLabel = 'registered_active' | 'registered_parked' | 'registered_inactive' | 'unregistered_signal' | 'unknown';
export interface EvidenceRecord { id: string; sourceUrl: string; provider: string; tool: string; method: string; retrievedAt: string; freshnessHours: number; confidence: number; rawResponseDigest: string; }
export interface HistoricalEvidence extends EvidenceRecord { capturedAt: string; topicalTags: string[]; continuityScore: number | null; }
export interface DomainStatusEvidence extends EvidenceRecord { availability: AvailabilityLabel; observedAt: string; }
export interface OpenSeoEvidence extends EvidenceRecord { provider: 'dataforseo-labs' | 'open-seo'; domainRank: number | null; pageRank: number | null; targetSpamScore: number | null; backlinks: number | null; referringDomains: number | null; organicTraffic: number | null; organicKeywords: number | null; }
export interface MozAuthorityEvidence extends EvidenceRecord { provider: 'moz-data-api-v3'; pageAuthority: number | null; domainAuthority: number | null; spamScore: number | null; }
export interface RiskGate { id: string; status: 'pass' | 'hold' | 'fail' | 'unknown'; reason: string; evidenceIds: string[]; }
export interface ProviderUsage { provider: string; operation: string; units: number; estimatedCostUsd: number | null; retrievedAt: string; }
export interface Candidate { hostname: string; topicalFit: number | null; businessFit: number | null; historicalEvidence: HistoricalEvidence[]; domainStatusEvidence: DomainStatusEvidence[]; openSeoEvidence: OpenSeoEvidence[]; mozAuthorityEvidence: MozAuthorityEvidence[]; riskGates: RiskGate[]; }
export interface CandidateScore { hostname: string; score: number; confidence: number; components: { topicalFit: number; historicalContinuity: number; businessFit: number; authority: number; cleanliness: number; }; evidenceIds: string[]; penalties: Array<{ code: string; points: number; evidenceIds: string[] }>; missingFields: string[]; formulaVersion: 1; }
export interface ResearchInput { runId: string; keywords: string[]; waybackUrls: string[]; requestedCandidates: string[]; requestedAt: string; }
export interface OrchestrationStageEntry { stage: OrchestrationStage; completedAt: string; }
export interface CandidateTruncation { stage: OrchestrationStage; originalCount: number; retainedCount: number; skippedHostnames: string[]; reason: string; }
export type EvidenceProvider = 'wayback' | 'domain-status' | 'open-seo' | 'moz-data-api-v3';
export type EvidenceOutcomeStatus = 'successful' | 'negative' | 'partial' | 'unavailable' | 'auth-unavailable' | 'quota-unavailable' | 'rate-limited' | 'provider-schema-changed';
export interface CandidateEvidenceOutcome { id: string; hostname: string; provider: EvidenceProvider; stage: OrchestrationStage; status: EvidenceOutcomeStatus; reason: string | null; operationId: string; evidenceIds: string[]; recordedAt: string; }
export interface ProviderOperation { id: string; provider: EvidenceProvider; operation: string; units: number; httpAttempts: number; evidenceIds: string[]; recordedAt: string; }
export interface ResearchSkip { stage: OrchestrationStage; hostname: string; reason: string; }
export interface OrchestrationMetadata { stage: OrchestrationStage; approvedOpenSeoCredits: number; approvedMozCalls: number; estimatedOpenSeoCredits: number; observedOpenSeoCredits: number; observedMozCalls: number; observedHttpAttempts: number; stageHistory: OrchestrationStageEntry[]; truncations: CandidateTruncation[]; skips: ResearchSkip[]; providerOperations: ProviderOperation[]; candidateEvidenceOutcomes?: CandidateEvidenceOutcome[]; holdReasons: string[]; failureReasons: string[]; acquisitionGates: RiskGate[]; }
export interface ResearchRun { schemaVersion: 1; runId: string; createdAt: string; updatedAt: string; stage: ResearchStage; disposition: ResearchDisposition; input: ResearchInput; candidates: Candidate[]; scores: CandidateScore[]; providerUsage: ProviderUsage[]; orchestration?: OrchestrationMetadata; }
