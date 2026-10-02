import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProofCohort, compareBaselineToOutcome, evaluateCaseStudyReadiness, redactProofForPublication } from './proof';

const NOW = '2026-08-31T00:00:00.000Z';
const DIGEST = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function metrics(overrides: Record<string, unknown> = {}) {
  return {
    eligibleIndexedPages: 1, impressions: 10, queryCoverage: 2, attributedLeads: 24,
    qualifiedLeads: 20, contactedLeads: 18, bookedLeads: 12, wonLeads: 8,
    attributionCompleteLeads: 22, supportIncidents: 1, operatorMinutes: 10,
    responseTimeMinutes: { sampleSize: 18, p50: 5, p90: 12 },
    wonValueRange: { currency: 'ILS', sampleSize: 8, lower: 100, upper: 200 },
    costsIls: { provider: 10, content: 20, maintenance: 30 }, ...overrides,
  };
}
function snapshot(prefix: string, start: string, end: string, captured: string, overrides: Record<string, unknown> = {}) {
  const sources = ['search_console', 'lead_event', 'delivery_receipt', 'outcome_record', 'support_log', 'operator_log', 'cost_record', 'owner_control_record'];
  return { windowStart: start, windowEnd: end, capturedAt: captured, evidence: sources.map((sourceType, index) => ({ evidenceId: `${prefix}${index}`, sourceType, observedAt: end, confidence: 'high' })), metrics: metrics(), ...overrides };
}
function cohort(overrides: Record<string, unknown> = {}) {
  const baseline = snapshot('b', '2026-05-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z');
  const after = snapshot('a', '2026-06-02T00:00:00.000Z', '2026-07-03T00:00:00.000Z', '2026-07-04T00:00:00.000Z');
  const sourceEvidenceId = 'a0';
  return { schemaVersion: 1, cohortId: 'cohort1', methodology: 'before_after_observational', siteCount: 3, exclusions: [], baseline, after, publicationConsents: ['site_owner', 'lead_recipient', 'service_provider'].map((role, index) => ({ consentId: `c${index}`, subjectRef: `s${index}`, role, status: 'approved', approvedAt: '2026-07-03T00:00:00.000Z', expiresAt: '2026-12-01T00:00:00.000Z', scopeDigest: DIGEST, sourceEvidenceId })), assembledAt: '2026-07-05T00:00:00.000Z', ...overrides };
}
function valid(value: unknown) { const result = buildProofCohort(value, NOW); if (!result.ok) throw new Error(result.code); assert.equal(result.ok, true); return result.cohort; }

test('buildProofCohort rejects schema, forbidden keys, and unsafe boundaries', () => {
  const invalidExclusion = cohort({ exclusions: [{ reasonCode: 'stale_evidence', count: 0 }] });
  const shortWindow = cohort({ baseline: snapshot('b', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z', '2026-06-21T00:00:00.000Z') });
  const inputs = [null, {}, { ...cohort(), extra: true }, { ...cohort(), customerId: 'x' }, invalidExclusion, shortWindow];
  for (const input of inputs) assert.equal(buildProofCohort(input, NOW).ok, false);
});

test('buildProofCohort rejects numeric relationships and missing evidence provenance', () => {
  const badMetrics = metrics({ qualifiedLeads: 25 });
  assert.equal(buildProofCohort(cohort({ after: snapshot('a', '2026-06-02T00:00:00.000Z', '2026-07-03T00:00:00.000Z', '2026-07-04T00:00:00.000Z', { metrics: badMetrics }) }), NOW).ok, false);
  const missing = snapshot('a', '2026-06-02T00:00:00.000Z', '2026-07-03T00:00:00.000Z', '2026-07-04T00:00:00.000Z');
  missing.evidence = missing.evidence.filter(item => item.sourceType !== 'outcome_record');
  assert.equal(buildProofCohort(cohort({ after: missing }), NOW).ok, false);
});

test('comparison is deterministic and preserves null zero denominators', () => {
  const input = cohort(); const parsed = valid(input); const first = compareBaselineToOutcome(parsed); const second = compareBaselineToOutcome(parsed);
  assert.deepEqual(first, second); assert.equal(first.relationship, 'observed_association'); assert.equal(first.causality, 'not_established');
  const zero = cohort(); (zero.baseline as { metrics: Record<string, unknown> }).metrics = metrics({ attributedLeads: 0, qualifiedLeads: 0, contactedLeads: 0, bookedLeads: 0, wonLeads: 0, attributionCompleteLeads: 0, responseTimeMinutes: { sampleSize: 0, p50: 0, p90: 0 }, wonValueRange: { currency: 'ILS', sampleSize: 0, lower: 0, upper: 0 } });
  const comparison = compareBaselineToOutcome(valid(zero)); assert.equal(comparison.rates.attributionCompleteness.baseline, null); assert.equal(comparison.metrics.attributedLeads.percentageChange, null);
});

test('readiness applies insufficient and internal privacy gates deterministically', () => {
  const parsed = valid(cohort()); const comparison = compareBaselineToOutcome(parsed); assert.equal(evaluateCaseStudyReadiness(parsed, comparison, NOW).status, 'publishable_with_approval');
  const small = valid(cohort({ siteCount: 2 })); assert.equal(evaluateCaseStudyReadiness(small, compareBaselineToOutcome(small), NOW).status, 'internal_only');
  const traffic = cohort(); (traffic.after as { metrics: Record<string, unknown> }).metrics = metrics({ attributedLeads: 0, qualifiedLeads: 0, contactedLeads: 0, bookedLeads: 0, wonLeads: 0, attributionCompleteLeads: 0, responseTimeMinutes: { sampleSize: 0, p50: 0, p90: 0 }, wonValueRange: { currency: 'ILS', sampleSize: 0, lower: 0, upper: 0 } });
  const trafficParsed = valid(traffic); assert.equal(evaluateCaseStudyReadiness(trafficParsed, compareBaselineToOutcome(trafficParsed), NOW).status, 'insufficient');
});

test('redaction fails closed for approval digest mismatch and never mutates input', () => {
  const input = cohort(); const before = JSON.stringify(input); const parsed = valid(input); const comparison = compareBaselineToOutcome(parsed); const readiness = evaluateCaseStudyReadiness(parsed, comparison, NOW);
  const approval = { approvalId: 'approval1', cohortId: 'cohort1', approverRole: 'founder', status: 'approved', approvedAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-10-01T00:00:00.000Z', scopeDigest: DIGEST };
  const result = redactProofForPublication(parsed, comparison, readiness, approval, NOW); assert.deepEqual(result, { ok: false, code: 'approval_digest_mismatch' }); assert.equal(JSON.stringify(input), before);
});
