import { rankCandidates } from './scoring';
import { requiredAcquisitionGates } from './riskPolicy';
import { validateCandidateHostname, validateResearchRun } from './validation';
import type { Candidate, CandidateEvidenceOutcome, DomainStatusEvidence, EvidenceOutcomeStatus, EvidenceProvider, HistoricalEvidence, MozAuthorityEvidence, OpenSeoEvidence, OrchestrationMetadata, OrchestrationStage, ResearchDisposition, ResearchInput, ResearchRun, RiskGate } from './types';

export interface CreateDependencies { now: () => Date; id: () => string; }
export interface CandidateEvidenceResult<T> { hostname: string; status: EvidenceOutcomeStatus; reason: string | null; evidence: T[]; }
export interface CandidateEvidenceBatch<T> { operation: string; status: EvidenceOutcomeStatus; results: CandidateEvidenceResult<T>[]; skipped: Array<{ hostname: string; reason: string }>; operations: number; httpAttempts: number; observedCredits?: number; remainingCredits?: number; estimatedCredits?: number; }
export interface DiscoveryResult { candidates: string[]; evidence: CandidateEvidenceResult<HistoricalEvidence>[]; }
export interface ResearchDependencies { now: () => Date; id?: () => string; persist: (run: ResearchRun) => Promise<boolean>; read?: (runId: string) => Promise<ResearchRun | null>; discover: () => Promise<DiscoveryResult>; history: (hostnames: string[]) => Promise<CandidateEvidenceBatch<HistoricalEvidence>>; status: (hostnames: string[]) => Promise<CandidateEvidenceBatch<DomainStatusEvidence>>; openSeo: (hostnames: string[]) => Promise<CandidateEvidenceBatch<OpenSeoEvidence>>; moz: (hostnames: string[]) => Promise<CandidateEvidenceBatch<MozAuthorityEvidence>>; }
export interface ResearchOutcome { status: OrchestrationStage; run: ResearchRun; reason?: string; }

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const emptyCandidate = (hostname: string): Candidate => ({ hostname, topicalFit: null, businessFit: null, historicalEvidence: [], domainStatusEvidence: [], openSeoEvidence: [], mozAuthorityEvidence: [], riskGates: [] });
const validApproval = (credits: number, calls: number): boolean => Number.isInteger(credits) && credits >= 0 && credits <= 2000 && Number.isInteger(calls) && calls >= 0 && calls <= 10;
const makeId = (deps: Pick<ResearchDependencies, 'id'> | CreateDependencies, fallback: string): string => deps.id ? deps.id() : fallback;
const bucket = (candidate: Candidate, provider: EvidenceProvider): Array<{ id: string }> => provider === 'wayback' ? candidate.historicalEvidence : provider === 'domain-status' ? candidate.domainStatusEvidence : provider === 'open-seo' ? candidate.openSeoEvidence : candidate.mozAuthorityEvidence;
const isFresh = (evidence: { retrievedAt: string }[], now: Date, hours: number): boolean => evidence.some(item => now.getTime() - Date.parse(item.retrievedAt) <= hours * 60 * 60 * 1000);
const providerTargets = (run: ResearchRun, provider: EvidenceProvider, now: Date): string[] => {
  const candidates = provider === 'wayback' ? run.candidates.slice(0, 50) : provider === 'domain-status' ? run.candidates.slice(0, 25) : provider === 'open-seo' ? run.candidates.slice(0, 3) : run.candidates.slice(0, 10);
  const ttl = provider === 'wayback' ? 720 : provider === 'domain-status' ? 24 : provider === 'open-seo' ? 12 : 168;
  return candidates.filter(candidate => !isFresh(bucket(candidate, provider) as unknown as Array<{ retrievedAt: string }>, now, ttl)).map(candidate => candidate.hostname);
};
const earliestRefreshStage = (run: ResearchRun, now: Date): OrchestrationStage | null => {
  if (providerTargets(run, 'wayback', now).length) return 'discovered';
  if (providerTargets(run, 'domain-status', now).length) return 'status_checked';
  if (providerTargets(run, 'open-seo', now).length) return 'niche_enriched';
  if (providerTargets(run, 'moz-data-api-v3', now).length) return 'authority_enriched';
  return null;
};

export function createResearchRun(input: ResearchInput, options: CreateDependencies & { approvedOpenSeoCredits: number; approvedMozCalls: number }): ResearchRun {
  if (!validApproval(options.approvedOpenSeoCredits, options.approvedMozCalls)) throw new Error('invalid_approval');
  const timestamp = options.now().toISOString();
  return { schemaVersion: 1, runId: input.runId, createdAt: timestamp, updatedAt: timestamp, stage: 'input_validated', disposition: 'hold', input: { ...input, keywords: [...input.keywords], waybackUrls: [...input.waybackUrls], requestedCandidates: [...input.requestedCandidates] }, candidates: [], scores: [], providerUsage: [], orchestration: { stage: 'validated', approvedOpenSeoCredits: options.approvedOpenSeoCredits, approvedMozCalls: options.approvedMozCalls, estimatedOpenSeoCredits: 0, observedOpenSeoCredits: 0, observedMozCalls: 0, observedHttpAttempts: 0, stageHistory: [{ stage: 'validated', completedAt: timestamp }], truncations: [], skips: [], providerOperations: [], candidateEvidenceOutcomes: [], holdReasons: [], failureReasons: [], acquisitionGates: requiredAcquisitionGates() } };
}
export function deriveResearchDisposition(input: { hardFailure: boolean; blocking: boolean; acquisitionGates: RiskGate[] }): ResearchDisposition { return input.hardFailure ? 'reject' : input.blocking || input.acquisitionGates.some(gate => gate.status !== 'pass') ? 'hold' : 'manual_due_diligence_required'; }
function meta(run: ResearchRun): OrchestrationMetadata { if (!run.orchestration) throw new Error('orchestration_missing'); return run.orchestration; }
async function persistTransition(run: ResearchRun, stage: OrchestrationStage, deps: ResearchDependencies): Promise<boolean> { const current = meta(run); const timestamp = deps.now().toISOString(); current.stage = stage; if (!current.stageHistory.some(item => item.stage === stage)) current.stageHistory.push({ stage, completedAt: timestamp }); run.updatedAt = timestamp; if (await deps.persist(clone(run))) return true; current.stage = 'failed'; if (!current.failureReasons.includes('persistence_failed')) current.failureReasons.push('persistence_failed'); return false; }
async function hold(run: ResearchRun, reason: string, deps: ResearchDependencies): Promise<ResearchOutcome> { const current = meta(run); if (!current.holdReasons.includes(reason)) current.holdReasons.push(reason); current.holdReasons.sort(); run.disposition = 'hold'; return await persistTransition(run, 'held', deps) ? { status: 'held', run, reason } : { status: 'failed', run, reason: 'persistence_failed' }; }
function recordSkip(run: ResearchRun, stage: OrchestrationStage, hostname: string, reason: string): void { const current = meta(run); if (!current.skips.some(item => item.stage === stage && item.hostname === hostname && item.reason === reason)) current.skips.push({ stage, hostname, reason }); }
function normalize(raw: string): string | null { const value = raw.toLowerCase().trim(); return validateCandidateHostname(value) ? value : null; }
function evidenceValid(provider: EvidenceProvider, evidence: { id: string; provider: string }): boolean { return typeof evidence.id === 'string' && evidence.id.length > 0 && (provider === 'wayback' || provider === 'domain-status' ? true : provider === 'open-seo' ? evidence.provider === 'open-seo' || evidence.provider === 'dataforseo-labs' : evidence.provider === 'moz-data-api-v3'); }
function validNonnegativeInteger(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0; }
function batchAccountingError<T>(run: ResearchRun, provider: EvidenceProvider, requested: Set<string>, batch: CandidateEvidenceBatch<T>, requireComplete: boolean): string | null {
  const current = meta(run);
  if (typeof batch.operation !== 'string' || batch.operation.length === 0 || !validNonnegativeInteger(batch.operations) || !validNonnegativeInteger(batch.httpAttempts) || !Array.isArray(batch.results) || !Array.isArray(batch.skipped)) return 'batch_accounting_invalid';
  if (![batch.observedCredits, batch.remainingCredits, batch.estimatedCredits].every(value => value === undefined || validNonnegativeInteger(value))) return 'batch_accounting_invalid';
  if (provider === 'open-seo' && ((batch.observedCredits !== undefined && current.observedOpenSeoCredits + batch.observedCredits > current.approvedOpenSeoCredits) || (batch.estimatedCredits !== undefined && batch.estimatedCredits > current.approvedOpenSeoCredits))) return 'openseo_approval_exceeded';
  if (provider === 'moz-data-api-v3' && current.observedMozCalls + batch.operations > current.approvedMozCalls) return 'moz_approval_exceeded';
  const returned = new Set<string>();
  for (const item of batch.results) { const hostname = normalize(item.hostname); if (!hostname || !requested.has(hostname) || returned.has(hostname)) return 'adapter_hostname_invalid'; returned.add(hostname); }
  for (const item of batch.skipped) { const hostname = normalize(item.hostname); if (!hostname || !requested.has(hostname) || returned.has(hostname) || typeof item.reason !== 'string' || item.reason.length === 0) return 'adapter_skip_hostname_invalid'; returned.add(hostname); }
  return !requireComplete || returned.size === requested.size ? null : 'adapter_results_incomplete';
}
function applyBatch<T extends { id: string; provider: string }>(run: ResearchRun, provider: EvidenceProvider, stage: OrchestrationStage, requested: Set<string>, batch: CandidateEvidenceBatch<T>, deps: ResearchDependencies, requireComplete = true): string | null {
  const current = meta(run); const outcomes = current.candidateEvidenceOutcomes ?? (current.candidateEvidenceOutcomes = []);
  const accounting = batchAccountingError(run, provider, requested, batch, requireComplete); if (accounting) return accounting;
  for (const item of batch.results) {
    const hostname = normalize(item.hostname); const candidate = hostname ? run.candidates.find(value => value.hostname === hostname) : undefined;
    if (!hostname || !candidate || !requested.has(hostname)) return 'adapter_hostname_invalid';
    if (item.evidence.some(evidence => !evidenceValid(provider, evidence))) return 'evidence_provider_mismatch';
    if (item.evidence.some(evidence => run.candidates.some(other => other !== candidate && bucket(other, provider).some(value => value.id === evidence.id)))) return 'cross_candidate_evidence';
  }
  for (const skip of batch.skipped) { const hostname = normalize(skip.hostname); if (!hostname || !requested.has(hostname)) return 'adapter_skip_hostname_invalid'; recordSkip(run, stage, hostname, skip.reason); }
  for (const item of batch.results) {
    const hostname = normalize(item.hostname)!; const candidate = run.candidates.find(value => value.hostname === hostname)!; const target = bucket(candidate, provider) as T[];
    for (const evidence of item.evidence) { if (target.some(value => value.id === evidence.id)) continue; if (run.candidates.some(other => other !== candidate && bucket(other, provider).some(value => value.id === evidence.id))) return 'duplicate_evidence_id'; target.push(clone(evidence)); }
    const evidenceIds = item.evidence.map(evidence => evidence.id); const operationId = makeId(deps, `${provider}:${current.providerOperations.length}`); const outcomeId = makeId(deps, `${provider}:outcome:${outcomes.length}`);
    if (current.providerOperations.some(operation => operation.id === operationId) || outcomes.some(outcome => outcome.id === outcomeId)) return 'duplicate_operation_or_outcome_id';
    current.providerOperations.push({ id: operationId, provider, operation: batch.operation, units: provider === 'open-seo' ? batch.observedCredits ?? 0 : provider === 'moz-data-api-v3' ? 1 : 0, httpAttempts: batch.httpAttempts, evidenceIds, recordedAt: deps.now().toISOString() });
    const outcome: CandidateEvidenceOutcome = { id: outcomeId, hostname, provider, stage, status: item.status, reason: item.reason, operationId, evidenceIds, recordedAt: deps.now().toISOString() }; outcomes.push(outcome);
  }
  current.observedHttpAttempts += batch.httpAttempts;
  if (provider === 'open-seo') { current.observedOpenSeoCredits += batch.observedCredits ?? 0; current.estimatedOpenSeoCredits = Math.max(current.estimatedOpenSeoCredits, batch.estimatedCredits ?? 0); run.providerUsage.push({ provider, operation: batch.operation, units: batch.observedCredits ?? 0, estimatedCostUsd: null, retrievedAt: deps.now().toISOString() }); }
  if (provider === 'moz-data-api-v3') { current.observedMozCalls += batch.operations; run.providerUsage.push({ provider, operation: batch.operation, units: batch.operations, estimatedCostUsd: null, retrievedAt: deps.now().toISOString() }); }
  return null;
}
async function collect<T extends { id: string; provider: string }>(run: ResearchRun, provider: EvidenceProvider, stage: OrchestrationStage, hostnames: string[], request: (names: string[]) => Promise<CandidateEvidenceBatch<T>>, deps: ResearchDependencies): Promise<ResearchOutcome | null> { if (!hostnames.length) return null; const batch = await request(hostnames); const invalid = applyBatch(run, provider, stage, new Set(hostnames), batch, deps); return invalid ? hold(run, invalid, deps) : null; }

export async function runExpiredDomainResearch(run: ResearchRun, deps: ResearchDependencies): Promise<ResearchOutcome> {
  let current: OrchestrationMetadata; try { current = meta(run); } catch { return { status: 'failed', run, reason: 'orchestration_missing' }; }
  if (!validApproval(current.approvedOpenSeoCredits, current.approvedMozCalls)) return { status: 'failed', run, reason: 'invalid_approval' };
  if (current.stage === 'complete' || current.stage === 'held' || current.stage === 'failed') return { status: current.stage, run };
  if (current.stage === 'validated') { const discovered = await deps.discover(); const seen = new Set<string>(); const hosts: string[] = []; for (const raw of [...run.input.requestedCandidates, ...discovered.candidates]) { const hostname = normalize(raw); if (!hostname) { recordSkip(run, 'discovered', raw, 'invalid_hostname'); continue; } if (seen.has(hostname)) { recordSkip(run, 'discovered', hostname, 'duplicate_hostname'); continue; } seen.add(hostname); hosts.push(hostname); } const retained = hosts.slice(0, 50); run.candidates = retained.map(emptyCandidate); if (hosts.length > 50) { const skipped = hosts.slice(50); current.truncations.push({ stage: 'discovered', originalCount: hosts.length, retainedCount: 50, skippedHostnames: skipped, reason: 'candidate_cap_50' }); skipped.forEach(hostname => recordSkip(run, 'discovered', hostname, 'candidate_cap_50')); } const invalid = applyBatch(run, 'wayback', 'discovered', new Set(retained), { operation: 'discover', status: 'successful', results: discovered.evidence, skipped: [], operations: 0, httpAttempts: 0 }, deps, false); if (invalid) return hold(run, invalid, deps); if (!await persistTransition(run, 'discovered', deps)) return { status: 'failed', run, reason: 'persistence_failed' }; }
  if (current.stage === 'discovered') { const history = await collect(run, 'wayback', 'discovered', providerTargets(run, 'wayback', deps.now()), deps.history, deps); if (history) return history; if (!await persistTransition(run, 'status_checked', deps)) return { status: 'failed', run, reason: 'persistence_failed' }; }
  if (current.stage === 'status_checked') { const status = await collect(run, 'domain-status', 'status_checked', providerTargets(run, 'domain-status', deps.now()), deps.status, deps); if (status) return status; current.estimatedOpenSeoCredits = Math.min(current.approvedOpenSeoCredits, providerTargets(run, 'open-seo', deps.now()).length); if (!await persistTransition(run, 'niche_enriched', deps)) return { status: 'failed', run, reason: 'persistence_failed' }; }
  if (current.stage === 'niche_enriched') { const names = providerTargets(run, 'open-seo', deps.now()); const estimate = Math.min(current.approvedOpenSeoCredits, names.length); if (current.estimatedOpenSeoCredits !== estimate) { current.estimatedOpenSeoCredits = estimate; if (!await persistTransition(run, 'niche_enriched', deps)) return { status: 'failed', run, reason: 'persistence_failed' }; } if (names.length && current.approvedOpenSeoCredits === 0) return hold(run, 'openseo_approval_zero', deps); const result = await collect(run, 'open-seo', 'niche_enriched', names, deps.openSeo, deps); if (result) return result; if (current.observedOpenSeoCredits > current.approvedOpenSeoCredits) return hold(run, 'openseo_approval_exceeded', deps); if (!await persistTransition(run, 'authority_enriched', deps)) return { status: 'failed', run, reason: 'persistence_failed' }; }
  if (current.stage === 'authority_enriched') { const names = providerTargets(run, 'moz-data-api-v3', deps.now()); if (names.length && current.approvedMozCalls === 0) return hold(run, 'moz_approval_zero', deps); const result = await collect(run, 'moz-data-api-v3', 'authority_enriched', names, deps.moz, deps); if (result) return result; if (current.observedMozCalls > current.approvedMozCalls) return hold(run, 'moz_approval_exceeded', deps); if (!await persistTransition(run, 'risk_gated', deps)) return { status: 'failed', run, reason: 'persistence_failed' }; }
  if (current.stage === 'risk_gated') { if (!await persistTransition(run, 'ranked', deps)) return { status: 'failed', run, reason: 'persistence_failed' }; }
  if (current.stage === 'ranked') { run.scores = rankCandidates(run.candidates); run.disposition = deriveResearchDisposition({ hardFailure: false, blocking: false, acquisitionGates: current.acquisitionGates }); if (!await persistTransition(run, 'complete', deps)) return { status: 'failed', run, reason: 'persistence_failed' }; return { status: 'complete', run }; }
  return { status: current.stage, run };
}
export async function resumeExpiredDomainResearch(runOrId: ResearchRun | string, approvals: { approvedOpenSeoCredits: number; approvedMozCalls: number }, deps: ResearchDependencies): Promise<ResearchOutcome> {
  if (!validApproval(approvals.approvedOpenSeoCredits, approvals.approvedMozCalls)) throw new Error('invalid_resume_approval');
  const run = typeof runOrId === 'string' ? await deps.read?.(runOrId) : runOrId;
  if (!run || !validateResearchRun(run) || !run.orchestration) throw new Error('invalid_resume_run');
  const current = run.orchestration;
  if (current.stage === 'complete') return { status: 'complete', run };
  const refreshStage = earliestRefreshStage(run, deps.now());
  if (current.stage === 'held' || current.stage === 'failed') {
    current.stage = refreshStage ?? 'risk_gated';
    current.stageHistory = current.stageHistory.filter(entry => entry.stage !== 'held' && entry.stage !== 'failed');
  } else if (refreshStage && ['validated', 'discovered', 'status_checked', 'niche_enriched', 'authority_enriched', 'risk_gated', 'ranked', 'complete'].indexOf(refreshStage) < ['validated', 'discovered', 'status_checked', 'niche_enriched', 'authority_enriched', 'risk_gated', 'ranked', 'complete'].indexOf(current.stage)) {
    current.stage = refreshStage;
  }
  current.approvedOpenSeoCredits = approvals.approvedOpenSeoCredits;
  current.approvedMozCalls = approvals.approvedMozCalls;
  if (!await deps.persist(clone(run))) return { status: 'failed', run, reason: 'persistence_failed' };
  return runExpiredDomainResearch(run, deps);
}