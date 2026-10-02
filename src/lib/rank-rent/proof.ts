export const PROOF_SCHEMA_VERSION = 1 as const;

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const FORBIDDEN = /^(name|phone|email|address|revenue|customerid|clientid|token|secret|password|credential|privatekey|apikey|cookie|authorizationheader)$/i;
const EXCLUSION_CODES = ['missing_baseline', 'incomplete_attribution', 'consent_unavailable', 'noncomparable_window', 'test_or_duplicate_lead', 'unsupported_outcome', 'stale_evidence'] as const;
const SOURCE_TYPES = ['search_console', 'analytics', 'lead_event', 'delivery_receipt', 'outcome_record', 'support_log', 'operator_log', 'cost_record', 'owner_control_record'] as const;
const CONFIDENCES = ['high', 'medium', 'low'] as const;
const ROLES = ['site_owner', 'lead_recipient', 'service_provider'] as const;
const INTEGER_METRICS = ['eligibleIndexedPages', 'impressions', 'queryCoverage', 'attributedLeads', 'qualifiedLeads', 'contactedLeads', 'bookedLeads', 'wonLeads', 'attributionCompleteLeads', 'supportIncidents', 'operatorMinutes'] as const;

type ExclusionCode = (typeof EXCLUSION_CODES)[number];
type SourceType = (typeof SOURCE_TYPES)[number];
type Confidence = (typeof CONFIDENCES)[number];
type ConsentRole = (typeof ROLES)[number];


export interface ProofMetrics {
  eligibleIndexedPages: number;
  impressions: number;
  queryCoverage: number;
  attributedLeads: number;
  qualifiedLeads: number;
  contactedLeads: number;
  bookedLeads: number;
  wonLeads: number;
  attributionCompleteLeads: number;
  supportIncidents: number;
  operatorMinutes: number;
  responseTimeMinutes: { sampleSize: number; p50: number; p90: number };
  wonValueRange: { currency: 'ILS'; sampleSize: number; lower: number; upper: number };
  costsIls: { provider: number; content: number; maintenance: number };
}

export interface ProofEvidence { evidenceId: string; sourceType: SourceType; observedAt: string; confidence: Confidence }
export interface ProofSnapshot { windowStart: string; windowEnd: string; capturedAt: string; evidence: ProofEvidence[]; metrics: ProofMetrics }
export interface PublicationConsent { consentId: string; subjectRef: string; role: ConsentRole; status: 'approved' | 'revoked'; approvedAt: string; revokedAt?: string; expiresAt: string; scopeDigest: string; sourceEvidenceId: string }
export interface ValidatedProofCohort { schemaVersion: 1; cohortId: string; methodology: 'before_after_observational'; siteCount: number; exclusions: { reasonCode: ExclusionCode; count: number }[]; baseline: ProofSnapshot; after: ProofSnapshot; publicationConsents: PublicationConsent[]; assembledAt: string }
export type ProofBuildResult = { ok: true; cohort: ValidatedProofCohort } | { ok: false; code: string };
export type ProofComparison = { relationship: 'observed_association'; causality: 'not_established'; metrics: Record<string, { baseline: number | null; after: number | null; absoluteChange: number | null; percentageChange: number | null }>; rates: Record<string, { baseline: number | null; after: number | null; absoluteChange: number | null; percentageChange: number | null }> };
export type CaseStudyReadiness = { status: 'insufficient' | 'internal_only' | 'publishable_with_approval'; reasons: string[]; relationship: 'observed_association'; causality: 'not_established'; founderApprovalRequired: true };
export type ProofRedactionResult = { ok: true; publication: Record<string, unknown> } | { ok: false; code: string };

function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function exact(value: Record<string, unknown>, fields: readonly string[]): boolean { const keys = Object.keys(value); return keys.length === fields.length && keys.every(key => fields.includes(key)); }
function member<T extends readonly string[]>(values: T, value: unknown): value is T[number] { return typeof value === 'string' && values.includes(value); }
function timestamp(value: unknown): value is string { return typeof value === 'string' && UTC.test(value) && Number.isFinite(Date.parse(value)); }
function time(value: string): number { return Date.parse(value); }
function safeInteger(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0); }
function safeNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && !Object.is(value, -0); }
function sortedUnique(values: string[]): boolean { return values.every((value, index) => index === 0 || values[index - 1] < value); }
function array(value: unknown): value is unknown[] { return Array.isArray(value) && Object.keys(value).length === value.length; }
function detached<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function hasForbiddenKey(value: unknown): boolean { if (array(value)) return value.some(hasForbiddenKey); if (!object(value)) return false; return Object.entries(value).some(([key, item]) => FORBIDDEN.test(key) || hasForbiddenKey(item)); }
function hasSharedObject(value: unknown, seen = new WeakSet<object>()): boolean { if (!object(value) && !array(value)) return false; const item = value as object; if (seen.has(item)) return true; seen.add(item); return Object.values(item).some(child => hasSharedObject(child, seen)); }
function validation(code: string): ProofBuildResult { return { ok: false, code }; }
function days(start: string, end: string): number { return (time(end) - time(start)) / 86400000; }

function metrics(value: unknown): ProofMetrics | null {
  if (!object(value) || !exact(value, [...INTEGER_METRICS, 'responseTimeMinutes', 'wonValueRange', 'costsIls'])) return null;
  if (!INTEGER_METRICS.every(key => safeInteger(value[key]))) return null;
  if (!object(value.responseTimeMinutes) || !exact(value.responseTimeMinutes, ['sampleSize', 'p50', 'p90']) || !safeInteger(value.responseTimeMinutes.sampleSize) || !safeNumber(value.responseTimeMinutes.p50) || !safeNumber(value.responseTimeMinutes.p90)) return null;
  if (!object(value.wonValueRange) || !exact(value.wonValueRange, ['currency', 'sampleSize', 'lower', 'upper']) || value.wonValueRange.currency !== 'ILS' || !safeInteger(value.wonValueRange.sampleSize) || !safeNumber(value.wonValueRange.lower) || !safeNumber(value.wonValueRange.upper)) return null;
  if (!object(value.costsIls) || !exact(value.costsIls, ['provider', 'content', 'maintenance']) || !safeNumber(value.costsIls.provider) || !safeNumber(value.costsIls.content) || !safeNumber(value.costsIls.maintenance)) return null;
  const output = value as unknown as ProofMetrics;
  if (output.qualifiedLeads > output.attributedLeads || output.contactedLeads > output.attributedLeads || output.bookedLeads > output.contactedLeads || output.wonLeads > output.bookedLeads || output.attributionCompleteLeads > output.attributedLeads || output.responseTimeMinutes.sampleSize > output.attributedLeads || output.responseTimeMinutes.p50 > output.responseTimeMinutes.p90 || output.wonValueRange.sampleSize !== output.wonLeads || output.wonValueRange.lower > output.wonValueRange.upper) return null;
  return detached(output);
}

function snapshot(value: unknown, assembledAt: string): ProofSnapshot | null {
  if (!object(value) || !exact(value, ['windowStart', 'windowEnd', 'capturedAt', 'evidence', 'metrics']) || !timestamp(value.windowStart) || !timestamp(value.windowEnd) || !timestamp(value.capturedAt) || !array(value.evidence)) return null;
  if (time(value.windowStart) >= time(value.windowEnd) || days(value.windowStart, value.windowEnd) < 28 || time(value.capturedAt) < time(value.windowEnd) || time(value.capturedAt) > time(assembledAt)) return null;
  const evidence: ProofEvidence[] = [];
  for (const item of value.evidence) {
    if (!object(item) || !exact(item, ['evidenceId', 'sourceType', 'observedAt', 'confidence']) || typeof item.evidenceId !== 'string' || !ID.test(item.evidenceId) || !member(SOURCE_TYPES, item.sourceType) || !timestamp(item.observedAt) || !member(CONFIDENCES, item.confidence)) return null;
    const observed = time(item.observedAt);
    if (observed < time(value.windowStart) || observed > time(value.capturedAt)) return null;
    evidence.push({ evidenceId: item.evidenceId, sourceType: item.sourceType, observedAt: item.observedAt, confidence: item.confidence });
  }
  if (!sortedUnique(evidence.map(item => item.evidenceId))) return null;
  const parsed = metrics(value.metrics);
  return parsed ? { windowStart: value.windowStart, windowEnd: value.windowEnd, capturedAt: value.capturedAt, evidence, metrics: parsed } : null;
}

function provenance(snapshotValue: ProofSnapshot): boolean {
  const source = new Set(snapshotValue.evidence.map(item => item.sourceType));
  const m = snapshotValue.metrics;
  if ((m.eligibleIndexedPages || m.impressions || m.queryCoverage) && !source.has('search_console')) return false;
  if ((m.attributedLeads || m.qualifiedLeads || m.contactedLeads || m.bookedLeads || m.wonLeads || m.attributionCompleteLeads) && !source.has('lead_event')) return false;
  if ((m.contactedLeads || m.bookedLeads || m.responseTimeMinutes.sampleSize) && !source.has('delivery_receipt')) return false;
  if ((m.wonLeads || m.wonValueRange.sampleSize) && !source.has('outcome_record')) return false;
  if (m.supportIncidents && !source.has('support_log')) return false;
  if (m.operatorMinutes && !source.has('operator_log')) return false;
  if ((m.costsIls.provider || m.costsIls.content || m.costsIls.maintenance) && !source.has('cost_record')) return false;
  return source.has('owner_control_record');
}

export function buildProofCohort(input: unknown, currentIso: string): ProofBuildResult {
  try {
    if (!timestamp(currentIso) || hasForbiddenKey(input) || hasSharedObject(input) || !object(input) || !exact(input, ['schemaVersion', 'cohortId', 'methodology', 'siteCount', 'exclusions', 'baseline', 'after', 'publicationConsents', 'assembledAt'])) return validation('invalid_schema');
    if (input.schemaVersion !== PROOF_SCHEMA_VERSION || typeof input.cohortId !== 'string' || !ID.test(input.cohortId) || input.methodology !== 'before_after_observational' || !safeInteger(input.siteCount) || input.siteCount === 0 || !timestamp(input.assembledAt) || time(input.assembledAt) > time(currentIso) || !array(input.exclusions) || !array(input.publicationConsents)) return validation('invalid_root');
    const exclusions: { reasonCode: ExclusionCode; count: number }[] = [];
    for (const item of input.exclusions) { if (!object(item) || !exact(item, ['reasonCode', 'count']) || !member(EXCLUSION_CODES, item.reasonCode) || !safeInteger(item.count) || item.count === 0) return validation('invalid_exclusion'); exclusions.push({ reasonCode: item.reasonCode, count: item.count }); }
    if (!sortedUnique(exclusions.map(item => item.reasonCode)) || exclusions.reduce((total, item) => total + item.count, 0) > input.siteCount) return validation('invalid_exclusion');
    const baseline = snapshot(input.baseline, input.assembledAt); const after = snapshot(input.after, input.assembledAt);
    if (!baseline || !after || time(baseline.windowEnd) > time(after.windowStart)) return validation('invalid_snapshot');
    const evidence = [...baseline.evidence, ...after.evidence];
    if (new Set(evidence.map(item => item.evidenceId)).size !== evidence.length || !provenance(baseline) || !provenance(after)) return validation('invalid_provenance');
    const evidenceById = new Map(evidence.map(item => [item.evidenceId, item])); const consents: PublicationConsent[] = []; const pairs = new Set<string>(); const consentIds = new Set<string>();
    for (const item of input.publicationConsents) {
      if (!object(item) || !exact(item, ['consentId', 'subjectRef', 'role', 'status', 'approvedAt', 'revokedAt', 'expiresAt', 'scopeDigest', 'sourceEvidenceId'].filter(field => field !== 'revokedAt' || item.revokedAt !== undefined)) || typeof item.consentId !== 'string' || !ID.test(item.consentId) || typeof item.subjectRef !== 'string' || !ID.test(item.subjectRef) || !member(ROLES, item.role) || !member(['approved', 'revoked'] as const, item.status) || !timestamp(item.approvedAt) || !timestamp(item.expiresAt) || !DIGEST.test(String(item.scopeDigest)) || typeof item.sourceEvidenceId !== 'string' || !ID.test(item.sourceEvidenceId)) return validation('invalid_consent');
      if (item.revokedAt !== undefined && !timestamp(item.revokedAt)) return validation('invalid_consent');
      const source = evidenceById.get(item.sourceEvidenceId); const pair = `${item.role}:${item.subjectRef}`;
      if (!source || consentIds.has(item.consentId) || pairs.has(pair) || time(item.approvedAt) < time(source.observedAt) || time(item.expiresAt) <= time(item.approvedAt) || (item.status === 'revoked' && (!item.revokedAt || time(item.revokedAt) < time(item.approvedAt))) || (item.status === 'approved' && item.revokedAt !== undefined)) return validation('invalid_consent');
      consentIds.add(item.consentId); pairs.add(pair); consents.push({ consentId: item.consentId, subjectRef: item.subjectRef, role: item.role, status: item.status, approvedAt: item.approvedAt, ...(item.revokedAt ? { revokedAt: item.revokedAt } : {}), expiresAt: item.expiresAt, scopeDigest: String(item.scopeDigest), sourceEvidenceId: item.sourceEvidenceId });
    }
    if (!ROLES.every(role => consents.some(item => item.role === role))) return validation('invalid_consent');
    return { ok: true, cohort: detached({ schemaVersion: 1, cohortId: input.cohortId, methodology: 'before_after_observational', siteCount: input.siteCount, exclusions, baseline, after, publicationConsents: consents, assembledAt: input.assembledAt }) };
  } catch { return validation('invalid_input'); }
}

function change(before: number, after: number) { return { baseline: before, after, absoluteChange: after - before, percentageChange: before === 0 ? null : ((after - before) / before) * 100 }; }
function rate(numerator: number, denominator: number): number | null { return denominator === 0 ? null : numerator / denominator; }
function totalCost(m: ProofMetrics): number { return m.costsIls.provider + m.costsIls.content + m.costsIls.maintenance; }

export function compareBaselineToOutcome(cohort: ValidatedProofCohort): ProofComparison {
  const base = cohort.baseline.metrics; const after = cohort.after.metrics; const result: Record<string, { baseline: number | null; after: number | null; absoluteChange: number | null; percentageChange: number | null }> = {};
  for (const key of INTEGER_METRICS) result[key] = change(base[key], after[key]);
  result.responseTimeP50 = change(base.responseTimeMinutes.p50, after.responseTimeMinutes.p50); result.responseTimeP90 = change(base.responseTimeMinutes.p90, after.responseTimeMinutes.p90); result.wonValueLower = change(base.wonValueRange.lower, after.wonValueRange.lower); result.wonValueUpper = change(base.wonValueRange.upper, after.wonValueRange.upper); result.totalCost = change(totalCost(base), totalCost(after));
  const pairs: Array<[string, number | null, number | null]> = [['attributionCompleteness', rate(base.attributionCompleteLeads, base.attributedLeads), rate(after.attributionCompleteLeads, after.attributedLeads)], ['qualifiedRate', rate(base.qualifiedLeads, base.attributedLeads), rate(after.qualifiedLeads, after.attributedLeads)], ['contactedRate', rate(base.contactedLeads, base.attributedLeads), rate(after.contactedLeads, after.attributedLeads)], ['bookedRate', rate(base.bookedLeads, base.contactedLeads), rate(after.bookedLeads, after.contactedLeads)], ['wonRate', rate(base.wonLeads, base.bookedLeads), rate(after.wonLeads, after.bookedLeads)], ['costPerAttributedLead', rate(totalCost(base), base.attributedLeads), rate(totalCost(after), after.attributedLeads)], ['costPerWonLead', rate(totalCost(base), base.wonLeads), rate(totalCost(after), after.wonLeads)]];
  const rates: ProofComparison['rates'] = {}; for (const [key, before, next] of pairs) rates[key] = before === null || next === null ? { baseline: before, after: next, absoluteChange: null, percentageChange: null } : change(before, next);
  return detached({ relationship: 'observed_association', causality: 'not_established', metrics: result, rates });
}

export function evaluateCaseStudyReadiness(cohort: ValidatedProofCohort, comparison: ProofComparison, currentIso: string): CaseStudyReadiness {
  const insufficient = new Set<string>(); const internal = new Set<string>(); const snapshots = [cohort.baseline, cohort.after];
  if (!timestamp(currentIso) || comparison.relationship !== 'observed_association' || comparison.causality !== 'not_established') insufficient.add('invalid_comparison');
  if (snapshots.some(item => !item.evidence.some(evidence => evidence.sourceType === 'owner_control_record'))) insufficient.add('missing_owner_control');
  if (snapshots.some(item => item.metrics.attributedLeads > 0 && item.metrics.attributionCompleteLeads / item.metrics.attributedLeads < 0.8)) insufficient.add('incomplete_attribution');
  if (cohort.after.metrics.attributedLeads === 0 || cohort.after.metrics.qualifiedLeads === 0) insufficient.add('traffic_only');
  if (snapshots.some(item => !item.evidence.some(evidence => evidence.sourceType === 'delivery_receipt' || evidence.sourceType === 'outcome_record'))) insufficient.add('missing_outcome_provenance');
  if (snapshots.some(item => time(currentIso) - time(item.capturedAt) > 90 * 86400000)) insufficient.add('stale_evidence');
  if (Math.abs(days(cohort.baseline.windowStart, cohort.baseline.windowEnd) - days(cohort.after.windowStart, cohort.after.windowEnd)) > 7) insufficient.add('noncomparable_window');
  if (!insufficient.size) { if (cohort.siteCount < 3) internal.add('small_cohort'); if (cohort.after.metrics.attributedLeads < 20) internal.add('insufficient_after_leads'); if (snapshots.some(item => item.evidence.some(evidence => evidence.confidence === 'low'))) internal.add('low_confidence'); if (cohort.publicationConsents.some(item => item.status !== 'approved' || time(item.expiresAt) <= time(currentIso))) internal.add('consent_not_current'); }
  const reasons = [...(insufficient.size ? insufficient : internal)].sort(); return { status: insufficient.size ? 'insufficient' : internal.size ? 'internal_only' : 'publishable_with_approval', reasons, relationship: 'observed_association', causality: 'not_established', founderApprovalRequired: true };
}

function canonical(value: unknown): string { if (array(value)) return `[${value.map(canonical).join(',')}]`; if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`; return JSON.stringify(value); }
function digest(value: unknown): string { const hashes = [2166136261, 2246822519, 3266489917, 668265263]; const text = canonical(value); for (let index = 0; index < text.length; index += 1) for (let part = 0; part < hashes.length; part += 1) hashes[part] = Math.imul(hashes[part] ^ (text.charCodeAt(index) + part), 16777619 + part * 2) >>> 0; return hashes.map((value, index) => `${value.toString(16).padStart(8, '0')}${Math.imul(value ^ (index + 1), 2654435761).toString(16).padStart(8, '0')}`).join(''); }
function safePayload(cohort: ValidatedProofCohort, comparison: ProofComparison, readiness: CaseStudyReadiness): Record<string, unknown> { const confidence = { high: 0, medium: 0, low: 0 }; for (const evidence of [...cohort.baseline.evidence, ...cohort.after.evidence]) confidence[evidence.confidence] += 1; return { methodology: cohort.methodology, siteCount: cohort.siteCount, exclusions: cohort.exclusions, baseline: { windowStart: cohort.baseline.windowStart, windowEnd: cohort.baseline.windowEnd, metrics: cohort.baseline.metrics }, after: { windowStart: cohort.after.windowStart, windowEnd: cohort.after.windowEnd, metrics: cohort.after.metrics }, comparison, relationship: readiness.relationship, causality: readiness.causality, confidenceDistribution: confidence }; }

export function redactProofForPublication(cohort: ValidatedProofCohort, comparison: ProofComparison, readiness: CaseStudyReadiness, approval: unknown, currentIso: string): ProofRedactionResult {
  try {
    if (!timestamp(currentIso) || readiness.status !== 'publishable_with_approval' || cohort.siteCount < 3 || !object(approval) || !exact(approval, ['approvalId', 'cohortId', 'approverRole', 'status', 'approvedAt', 'expiresAt', 'scopeDigest']) || typeof approval.approvalId !== 'string' || !ID.test(approval.approvalId) || approval.cohortId !== cohort.cohortId || approval.approverRole !== 'founder' || approval.status !== 'approved' || !timestamp(approval.approvedAt) || !timestamp(approval.expiresAt) || !DIGEST.test(String(approval.scopeDigest)) || time(approval.approvedAt) > time(currentIso) || time(approval.expiresAt) <= time(currentIso) || time(approval.expiresAt) <= time(approval.approvedAt)) return { ok: false, code: 'invalid_approval' };
    const payload = safePayload(cohort, comparison, readiness); if (digest(payload) !== approval.scopeDigest) return { ok: false, code: 'approval_digest_mismatch' }; return { ok: true, publication: detached({ ...payload, approvalRecorded: true }) };
  } catch { return { ok: false, code: 'redaction_failed' }; }
}
