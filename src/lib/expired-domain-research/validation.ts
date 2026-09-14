import type { Candidate, ResearchInput, ResearchRun } from './types';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/u;
const ORCHESTRATION_STAGES = ['validated', 'discovered', 'status_checked', 'niche_enriched', 'authority_enriched', 'risk_gated', 'ranked', 'complete', 'held', 'failed'] as const;
const NORMAL_STAGES = ORCHESTRATION_STAGES.slice(0, 8);
const PROVIDERS = ['wayback', 'domain-status', 'open-seo', 'moz-data-api-v3'];
const OUTCOMES = ['successful', 'negative', 'partial', 'unavailable', 'auth-unavailable', 'quota-unavailable', 'rate-limited', 'provider-schema-changed'];
const SCORE = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const RECORD = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const ISO = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const unique = (values: unknown[]): boolean => new Set(values).size === values.length;
const atOrBefore = (value: unknown, limit: number): boolean => ISO(value) && Date.parse(value) <= limit;

export function normalizeResearchKeyword(value: string): string {
  const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  const length = Array.from(normalized).length;
  if (length < 2 || length > 120 || CONTROL.test(normalized)) throw new Error('Research keyword must contain 2-120 Unicode code points without control characters');
  return normalized;
}

function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower === '::1') return true;
  const ipv4 = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:');
  const octets = ipv4.slice(1).map(Number);
  if (octets.some(value => value > 255)) return true;
  return octets[0] === 0 || octets[0] === 10 || octets[0] === 127 || (octets[0] === 169 && octets[1] === 254) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168);
}

function validateHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048 || CONTROL.test(value)) return false;
  try { const parsed = new URL(value); return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !parsed.username && !parsed.password && !isPrivateHostname(parsed.hostname); } catch { return false; }
}

export function validateCandidateHostname(value: string): boolean {
  if (typeof value !== 'string' || value.length > 253 || CONTROL.test(value) || value.endsWith('.')) return false;
  const hostname = value.toLowerCase();
  return !isPrivateHostname(hostname) && hostname.includes('.') && hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}

export function parseResearchInput(value: unknown): ResearchInput {
  if (!RECORD(value) || !nonEmpty(value.runId) || !SAFE_ID.test(value.runId) || !ISO(value.requestedAt) || !Array.isArray(value.keywords) || value.keywords.length === 0 || !Array.isArray(value.waybackUrls) || !Array.isArray(value.requestedCandidates) || value.requestedCandidates.length > 50) throw new Error('Invalid research input');
  const keywords = value.keywords.map(keyword => { if (typeof keyword !== 'string') throw new Error('Invalid research keyword'); return normalizeResearchKeyword(keyword); });
  if (!unique(keywords.map(keyword => keyword.toLocaleLowerCase())) || !value.waybackUrls.every(validateHttpUrl) || !value.requestedCandidates.every(candidate => typeof candidate === 'string' && validateCandidateHostname(candidate))) throw new Error('Invalid research input');
  return { runId: value.runId, keywords, waybackUrls: [...value.waybackUrls], requestedCandidates: [...value.requestedCandidates], requestedAt: value.requestedAt };
}

function validateEvidence(value: unknown, updated: number): boolean {
  return RECORD(value) && nonEmpty(value.id) && validateHttpUrl(value.sourceUrl) && nonEmpty(value.provider) && nonEmpty(value.tool) && nonEmpty(value.method) && atOrBefore(value.retrievedAt, updated) && typeof value.freshnessHours === 'number' && Number.isFinite(value.freshnessHours) && value.freshnessHours >= 0 && SCORE(value.confidence) && typeof value.rawResponseDigest === 'string' && /^[a-f0-9]{64}$/i.test(value.rawResponseDigest);
}

function validateGate(value: unknown, evidence: Set<string>): boolean {
  return RECORD(value) && nonEmpty(value.id) && ['pass', 'hold', 'fail', 'unknown'].includes(String(value.status)) && nonEmpty(value.reason) && Array.isArray(value.evidenceIds) && unique(value.evidenceIds) && value.evidenceIds.every(id => typeof id === 'string' && evidence.has(id));
}

function validateCandidate(value: unknown, updated: number): value is Candidate {
  if (!RECORD(value) || typeof value.hostname !== 'string' || !validateCandidateHostname(value.hostname) || ![value.topicalFit, value.businessFit].every(item => item === null || SCORE(item)) || !['historicalEvidence', 'domainStatusEvidence', 'openSeoEvidence', 'mozAuthorityEvidence', 'riskGates'].every(key => Array.isArray(value[key]))) return false;
  const evidence = [...value.historicalEvidence as unknown[], ...value.domainStatusEvidence as unknown[], ...value.openSeoEvidence as unknown[], ...value.mozAuthorityEvidence as unknown[]] as Array<Record<string, unknown>>;
  if (!unique(evidence.map(item => item.id)) || !evidence.every(item => validateEvidence(item, updated))) return false;
  const ids = new Set(evidence.map(item => String(item.id)));
  return (value.historicalEvidence as Array<Record<string, unknown>>).every(item => atOrBefore(item.capturedAt, updated) && Array.isArray(item.topicalTags) && item.topicalTags.every(nonEmpty) && (item.continuityScore === null || SCORE(item.continuityScore)))
    && (value.domainStatusEvidence as Array<Record<string, unknown>>).every(item => ['registered_active', 'registered_parked', 'registered_inactive', 'unregistered_signal', 'unknown'].includes(String(item.availability)) && atOrBefore(item.observedAt, updated))
    && (value.openSeoEvidence as Array<Record<string, unknown>>).every(item => ['dataforseo-labs', 'open-seo'].includes(String(item.provider)) && ['domainRank', 'pageRank', 'targetSpamScore', 'backlinks', 'referringDomains', 'organicTraffic', 'organicKeywords'].every(key => item[key] === null || (typeof item[key] === 'number' && Number.isFinite(item[key]) && item[key] >= 0)))
    && (value.mozAuthorityEvidence as Array<Record<string, unknown>>).every(item => item.provider === 'moz-data-api-v3' && [item.pageAuthority, item.domainAuthority, item.spamScore].every(metric => metric === null || SCORE(metric)))
    && unique((value.riskGates as Array<Record<string, unknown>>).map(gate => gate.id))
    && (value.riskGates as unknown[]).every(gate => validateGate(gate, ids));
}

function validateOrchestration(value: unknown, candidates: Candidate[], evidence: Set<string>, created: number, updated: number): boolean {
  if (!RECORD(value) || !ORCHESTRATION_STAGES.includes(value.stage as typeof ORCHESTRATION_STAGES[number])) return false;
  if (!Number.isInteger(value.approvedOpenSeoCredits) || Number(value.approvedOpenSeoCredits) < 0 || Number(value.approvedOpenSeoCredits) > 2000 || !Number.isInteger(value.approvedMozCalls) || Number(value.approvedMozCalls) < 0 || Number(value.approvedMozCalls) > 10 || !['estimatedOpenSeoCredits', 'observedOpenSeoCredits', 'observedMozCalls', 'observedHttpAttempts'].every(key => Number.isInteger(value[key]) && Number(value[key]) >= 0) || Number(value.observedOpenSeoCredits) > Number(value.approvedOpenSeoCredits) || Number(value.observedMozCalls) > Number(value.approvedMozCalls)) return false;
  if (!['stageHistory', 'truncations', 'skips', 'providerOperations', 'holdReasons', 'failureReasons', 'acquisitionGates'].every(key => Array.isArray(value[key]))) return false;
  const history = value.stageHistory as Array<Record<string, unknown>>;
  const stages = history.map(item => String(item.stage));
  const terminal = stages.at(-1);
  if (!history.length || !unique(stages) || !history.every(item => ORCHESTRATION_STAGES.includes(item.stage as typeof ORCHESTRATION_STAGES[number]) && atOrBefore(item.completedAt, updated) && Date.parse(String(item.completedAt)) >= created) || !history.every((item, index) => index === 0 || Date.parse(String(item.completedAt)) >= Date.parse(String(history[index - 1].completedAt)))) return false;
  const normal = terminal === 'held' || terminal === 'failed' ? stages.slice(0, -1) : stages;
  if (!normal.every((stage, index) => stage === NORMAL_STAGES[index]) || ((terminal === 'held' || terminal === 'failed') ? value.stage !== terminal : ['held', 'failed'].includes(String(value.stage)) || (NORMAL_STAGES as readonly string[]).indexOf(String(value.stage)) > normal.length - 1)) return false;
  const hostnames = new Set(candidates.map(candidate => candidate.hostname));
  const operations = value.providerOperations as Array<Record<string, unknown>>;
  if (!unique(operations.map(item => item.id)) || !operations.every(item => nonEmpty(item.id) && PROVIDERS.includes(String(item.provider)) && nonEmpty(item.operation) && Number.isInteger(item.units) && Number(item.units) >= 0 && Number.isInteger(item.httpAttempts) && Number(item.httpAttempts) >= 0 && atOrBefore(item.recordedAt, updated) && Array.isArray(item.evidenceIds) && unique(item.evidenceIds) && item.evidenceIds.every(id => typeof id === 'string' && evidence.has(id)))) return false;
  if (!(value.truncations as Array<Record<string, unknown>>).every(item => ORCHESTRATION_STAGES.includes(item.stage as typeof ORCHESTRATION_STAGES[number]) && Number.isInteger(item.originalCount) && Number.isInteger(item.retainedCount) && Number(item.originalCount) >= Number(item.retainedCount) && Number(item.retainedCount) >= 0 && nonEmpty(item.reason) && Array.isArray(item.skippedHostnames) && unique(item.skippedHostnames) && item.skippedHostnames.length === Number(item.originalCount) - Number(item.retainedCount) && item.skippedHostnames.every(hostname => typeof hostname === 'string' && validateCandidateHostname(hostname) && hostnames.has(hostname)))) return false;
  if (!(value.skips as Array<Record<string, unknown>>).every(item => ORCHESTRATION_STAGES.includes(item.stage as typeof ORCHESTRATION_STAGES[number]) && typeof item.hostname === 'string' && hostnames.has(item.hostname) && nonEmpty(item.reason))) return false;
  if (!(value.holdReasons as unknown[]).every(nonEmpty) || !unique(value.holdReasons as unknown[]) || !(value.failureReasons as unknown[]).every(nonEmpty) || !unique(value.failureReasons as unknown[]) || !unique((value.acquisitionGates as Array<Record<string, unknown>>).map(gate => gate.id)) || !(value.acquisitionGates as unknown[]).every(gate => validateGate(gate, evidence))) return false;
  const outcomes = value.candidateEvidenceOutcomes;
  if (outcomes === undefined) return true;
  if (!Array.isArray(outcomes) || !unique(outcomes.map(item => RECORD(item) ? item.id : item))) return false;
  return outcomes.every(item => { if (!RECORD(item) || !nonEmpty(item.id) || !hostnames.has(String(item.hostname)) || !PROVIDERS.includes(String(item.provider)) || !ORCHESTRATION_STAGES.includes(item.stage as typeof ORCHESTRATION_STAGES[number]) || !OUTCOMES.includes(String(item.status)) || (item.reason !== null && !nonEmpty(item.reason)) || !nonEmpty(item.operationId) || !atOrBefore(item.recordedAt, updated) || !Array.isArray(item.evidenceIds) || !unique(item.evidenceIds)) return false; const operation = operations.find(entry => entry.id === item.operationId); if (!operation || operation.provider !== item.provider || !Array.isArray(operation.evidenceIds)) return false; const operationEvidenceIds = operation.evidenceIds as unknown[]; const candidate = candidates.find(entry => entry.hostname === item.hostname); const candidateEvidence = candidate ? new Set((item.provider === 'wayback' ? candidate.historicalEvidence : item.provider === 'domain-status' ? candidate.domainStatusEvidence : item.provider === 'open-seo' ? candidate.openSeoEvidence : candidate.mozAuthorityEvidence).map(entry => entry.id)) : new Set<string>(); return item.evidenceIds.every(id => typeof id === 'string' && candidateEvidence.has(id) && operationEvidenceIds.includes(id)); });
}

export function validateResearchRun(value: unknown): value is ResearchRun {
  if (!RECORD(value) || value.schemaVersion !== 1 || !nonEmpty(value.runId) || !SAFE_ID.test(value.runId) || !ISO(value.createdAt) || !ISO(value.updatedAt) || Date.parse(value.createdAt) > Date.parse(value.updatedAt) || !['input_validated', 'evidence_collected', 'scored', 'stored'].includes(String(value.stage)) || !['reject', 'hold', 'manual_due_diligence_required'].includes(String(value.disposition))) return false;
  try {
    const input = parseResearchInput(value.input); const updated = Date.parse(value.updatedAt); const created = Date.parse(value.createdAt);
    if (input.runId !== value.runId || !Array.isArray(value.candidates) || !value.candidates.every(candidate => validateCandidate(candidate, updated)) || !unique(value.candidates.map(candidate => candidate.hostname)) || !Array.isArray(value.scores) || !Array.isArray(value.providerUsage)) return false;
    const byHostname = new Map(value.candidates.map(candidate => [candidate.hostname, new Set([...candidate.historicalEvidence, ...candidate.domainStatusEvidence, ...candidate.openSeoEvidence, ...candidate.mozAuthorityEvidence].map(item => item.id))]));
    const evidence = new Set([...byHostname.values()].flatMap(ids => [...ids]));
    if (evidence.size !== value.candidates.flatMap(candidate => [...candidate.historicalEvidence, ...candidate.domainStatusEvidence, ...candidate.openSeoEvidence, ...candidate.mozAuthorityEvidence]).length) return false;
    if (!unique(value.scores.map(score => RECORD(score) ? score.hostname : score)) || !value.scores.every(score => RECORD(score) && byHostname.has(String(score.hostname)) && SCORE(score.score) && SCORE(score.confidence) && score.formulaVersion === 1 && RECORD(score.components) && ['topicalFit', 'historicalContinuity', 'businessFit', 'authority', 'cleanliness'].every(key => SCORE((score.components as Record<string, unknown>)[key])) && Object.keys(score.components as Record<string, unknown>).length === 5 && Array.isArray(score.evidenceIds) && unique(score.evidenceIds) && score.evidenceIds.every(id => typeof id === 'string' && byHostname.get(String(score.hostname))?.has(id)) && Array.isArray(score.penalties) && score.penalties.every(penalty => RECORD(penalty) && nonEmpty(penalty.code) && typeof penalty.points === 'number' && Number.isFinite(penalty.points) && penalty.points >= 0 && Array.isArray(penalty.evidenceIds) && unique(penalty.evidenceIds) && penalty.evidenceIds.every(id => typeof id === 'string' && byHostname.get(String(score.hostname))?.has(id))) && Array.isArray(score.missingFields) && unique(score.missingFields) && score.missingFields.every(nonEmpty))) return false;
    const usageKeys = new Set<string>();
    if (!value.providerUsage.every(usage => RECORD(usage) && nonEmpty(usage.provider) && nonEmpty(usage.operation) && Number.isInteger(usage.units) && Number(usage.units) >= 0 && (usage.estimatedCostUsd === null || (typeof usage.estimatedCostUsd === 'number' && Number.isFinite(usage.estimatedCostUsd) && usage.estimatedCostUsd >= 0)) && atOrBefore(usage.retrievedAt, updated) && !usageKeys.has(`${usage.provider}\u0000${usage.operation}\u0000${usage.retrievedAt}`) && (usageKeys.add(`${usage.provider}\u0000${usage.operation}\u0000${usage.retrievedAt}`), true))) return false;
    return value.orchestration === undefined || validateOrchestration(value.orchestration, value.candidates, evidence, created, updated);
  } catch { return false; }
}
