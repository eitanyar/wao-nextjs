import assert from 'node:assert/strict';
import test from 'node:test';
import { ACQUISITION_GATE_IDS } from './riskPolicy';
import { normalizeResearchKeyword, parseResearchInput, validateCandidateHostname, validateResearchRun } from './validation';
import type { Candidate, OrchestrationStage, ResearchRun } from './types';

const stamp = '2026-01-01T00:00:00.000Z';
const later = '2026-01-01T00:00:01.000Z';
const digest = 'a'.repeat(64);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const input = (runId: string) => ({ runId, keywords: ['topic research'], waybackUrls: ['https://archive.test/topic'], requestedCandidates: ['a.test', 'b.test'], requestedAt: stamp });
const base = (id: string, provider: string) => ({ id, sourceUrl: `https://evidence.test/${id}`, provider, tool: 'fixture', method: 'lookup', retrievedAt: stamp, freshnessHours: 0, confidence: 100, rawResponseDigest: digest });

function candidate(hostname: string, suffix: string): Candidate {
  return {
    hostname, topicalFit: 80, businessFit: 70,
    historicalEvidence: [{ ...base(`history-${suffix}`, 'wayback'), capturedAt: stamp, topicalTags: ['topic'], continuityScore: 75 }],
    domainStatusEvidence: [{ ...base(`status-${suffix}`, 'domain-status'), availability: 'unregistered_signal', observedAt: stamp }],
    openSeoEvidence: [{ ...base(`open-${suffix}`, 'open-seo'), provider: 'open-seo' as const, domainRank: 20, pageRank: 10, targetSpamScore: 4, backlinks: 30, referringDomains: 8, organicTraffic: 6, organicKeywords: 5 }],
    mozAuthorityEvidence: [{ ...base(`moz-${suffix}`, 'moz-data-api-v3'), provider: 'moz-data-api-v3' as const, pageAuthority: 30, domainAuthority: 40, spamScore: 2 }],
    riskGates: [{ id: `risk-${suffix}`, status: 'pass' as const, reason: 'clean', evidenceIds: [`history-${suffix}`] }],
  };
}

function legacyFixture(): ResearchRun {
  return { schemaVersion: 1, runId: 'legacy-run', createdAt: stamp, updatedAt: stamp, stage: 'scored', disposition: 'hold', input: input('legacy-run'), candidates: [candidate('a.test', 'legacy')], scores: [], providerUsage: [] };
}

function orchestratedFixture(): ResearchRun {
  const first = candidate('a.test', 'one');
  const second = candidate('b.test', 'two');
  const evidenceIds = [...first.historicalEvidence, ...first.domainStatusEvidence, ...first.openSeoEvidence, ...first.mozAuthorityEvidence].map(item => item.id);
  return {
    schemaVersion: 1, runId: 'orchestrated-run', createdAt: stamp, updatedAt: stamp, stage: 'stored', disposition: 'hold', input: input('orchestrated-run'), candidates: [first, second],
    scores: [{ hostname: first.hostname, score: 70, confidence: 80, components: { topicalFit: 80, historicalContinuity: 75, businessFit: 70, authority: 35, cleanliness: 98 }, evidenceIds: [evidenceIds[0]], penalties: [{ code: 'none', points: 0, evidenceIds: [evidenceIds[1]] }], missingFields: ['none'], formulaVersion: 1 }],
    providerUsage: [{ provider: 'open-seo', operation: 'lookup', units: 0, estimatedCostUsd: null, retrievedAt: stamp }],
    orchestration: {
      stage: 'complete', approvedOpenSeoCredits: 1, approvedMozCalls: 1, estimatedOpenSeoCredits: 0, observedOpenSeoCredits: 0, observedMozCalls: 0, observedHttpAttempts: 0,
      stageHistory: (['validated', 'discovered', 'status_checked', 'niche_enriched', 'authority_enriched', 'risk_gated', 'ranked', 'complete'] as OrchestrationStage[]).map(stage => ({ stage, completedAt: stamp })),
      truncations: [{ stage: 'discovered', originalCount: 2, retainedCount: 1, skippedHostnames: ['b.test'], reason: 'cap' }],
      skips: [{ stage: 'discovered', hostname: 'b.test', reason: 'duplicate' }],
      providerOperations: [{ id: 'operation-one', provider: 'wayback', operation: 'history', units: 0, httpAttempts: 0, evidenceIds: [evidenceIds[0]], recordedAt: stamp }],
      candidateEvidenceOutcomes: [{ id: 'outcome-one', hostname: 'a.test', provider: 'wayback', stage: 'discovered', status: 'successful', reason: null, operationId: 'operation-one', evidenceIds: [evidenceIds[0]], recordedAt: stamp }],
      holdReasons: ['manual_review'], failureReasons: ['none'], acquisitionGates: ACQUISITION_GATE_IDS.map((id, index) => ({ id, status: 'unknown' as const, reason: 'manual', evidenceIds: index === 0 ? [evidenceIds[0]] : [] })),
    },
  };
}

function rejectedRows(title: string, rows: Array<{ name: string; mutate: (run: ResearchRun) => void }>): void {
  test(title, () => {
    for (const row of rows) {
      const run = orchestratedFixture();
      assert.equal(validateResearchRun(run), true, `${row.name}: base fixture`);
      row.mutate(run);
      const mutated = JSON.stringify(run);
      assert.equal(validateResearchRun(run), false, row.name);
      assert.equal(JSON.stringify(run), mutated, `${row.name}: validation is pure`);
    }
  });
}

test('research input normalizes Unicode keywords and rejects unsafe targets', () => {
  assert.equal(normalizeResearchKeyword('\u00a0topic\u00a0 research '), 'topic research');
  assert.deepEqual(parseResearchInput(input('input-run')), input('input-run'));
  assert.throws(() => parseResearchInput({ ...input('input-run'), waybackUrls: ['file:///etc/passwd'] }));
  assert.throws(() => parseResearchInput({ ...input('input-run'), waybackUrls: ['https://user:pass@example.test/'] }));
  assert.throws(() => parseResearchInput({ ...input('input-run'), waybackUrls: ['http://127.0.0.1/'] }));
  assert.equal(validateCandidateHostname('example.test'), true);
  assert.equal(validateCandidateHostname('localhost'), false);
});

test('valid schema-v1 legacy and orchestrated fixtures are pure and legacy round-trips', () => {
  for (const fixture of [legacyFixture(), orchestratedFixture()]) {
    const before = JSON.stringify(fixture);
    assert.equal(validateResearchRun(fixture), true);
    assert.equal(JSON.stringify(fixture), before);
  }
  const legacy = legacyFixture();
  assert.deepEqual(JSON.parse(JSON.stringify(legacy)), legacy);
  assert.equal(orchestratedFixture().orchestration?.acquisitionGates.length, 8);
});

test('stage history accepts an in-prefix resume rewind and matching final terminal', () => {
  const rewind = orchestratedFixture();
  rewind.orchestration!.stage = 'risk_gated';
  assert.equal(validateResearchRun(rewind), true);
  const held = orchestratedFixture();
  held.orchestration!.stage = 'held';
  held.orchestration!.stageHistory.push({ stage: 'held', completedAt: stamp });
  assert.equal(validateResearchRun(held), true);
});

rejectedRows('numeric and provider usage boundaries reject independently', [
  { name: 'fractional approved open seo', mutate: run => { run.orchestration!.approvedOpenSeoCredits = 0.5; } },
  { name: 'negative approved open seo', mutate: run => { run.orchestration!.approvedOpenSeoCredits = -1; } },
  { name: 'open seo approval ceiling', mutate: run => { run.orchestration!.approvedOpenSeoCredits = 2001; } },
  { name: 'fractional approved moz', mutate: run => { run.orchestration!.approvedMozCalls = 0.5; } },
  { name: 'moz approval ceiling', mutate: run => { run.orchestration!.approvedMozCalls = 11; } },
  { name: 'non finite counter', mutate: run => { run.orchestration!.observedHttpAttempts = Number.NaN; } },
  { name: 'negative counter', mutate: run => { run.orchestration!.estimatedOpenSeoCredits = -1; } },
  { name: 'fractional counter', mutate: run => { run.orchestration!.observedMozCalls = 0.5; } },
  { name: 'observed open seo over approval', mutate: run => { run.orchestration!.observedOpenSeoCredits = 2; } },
  { name: 'observed moz over approval', mutate: run => { run.orchestration!.observedMozCalls = 2; } },
  { name: 'negative operation units', mutate: run => { run.orchestration!.providerOperations[0].units = -1; } },
  { name: 'fractional operation attempts', mutate: run => { run.orchestration!.providerOperations[0].httpAttempts = 0.5; } },
  { name: 'negative usage units', mutate: run => { run.providerUsage[0].units = -1; } },
  { name: 'fractional usage units', mutate: run => { run.providerUsage[0].units = 0.5; } },
  { name: 'negative cost', mutate: run => { run.providerUsage[0].estimatedCostUsd = -1; } },
  { name: 'non finite cost', mutate: run => { run.providerUsage[0].estimatedCostUsd = Number.POSITIVE_INFINITY; } },
]);

rejectedRows('temporal boundaries reject later and decreasing persisted records', [
  { name: 'invalid run timestamp', mutate: run => { run.updatedAt = 'invalid'; } },
  { name: 'created after updated', mutate: run => { run.createdAt = later; } },
  { name: 'decreasing history', mutate: run => { run.orchestration!.stageHistory[1].completedAt = '2025-12-31T23:59:59.000Z'; } },
  { name: 'later evidence', mutate: run => { run.candidates[0].historicalEvidence[0].retrievedAt = later; } },
  { name: 'later captured evidence', mutate: run => { run.candidates[0].historicalEvidence[0].capturedAt = later; } },
  { name: 'later status observation', mutate: run => { run.candidates[0].domainStatusEvidence[0].observedAt = later; } },
  { name: 'later operation', mutate: run => { run.orchestration!.providerOperations[0].recordedAt = later; } },
  { name: 'later outcome', mutate: run => { run.orchestration!.candidateEvidenceOutcomes![0].recordedAt = later; } },
  { name: 'later usage', mutate: run => { run.providerUsage[0].retrievedAt = later; } },
]);

rejectedRows('stage history structure rejects invalid prefixes and terminals', [
  { name: 'skipped prefix stage', mutate: run => { run.orchestration!.stageHistory[1].stage = 'status_checked'; } },
  { name: 'duplicate stage', mutate: run => { run.orchestration!.stageHistory[1].stage = 'validated'; } },
  { name: 'current stage outside prefix', mutate: run => { run.orchestration!.stage = 'held'; } },
  { name: 'post terminal stage', mutate: run => { run.orchestration!.stageHistory.push({ stage: 'held', completedAt: stamp }, { stage: 'failed', completedAt: stamp }); } },
  { name: 'terminal mismatch', mutate: run => { run.orchestration!.stageHistory.push({ stage: 'held', completedAt: stamp }); } },
]);

rejectedRows('identity and reference integrity rejects duplicates and cross-candidate links', [
  { name: 'duplicate candidate hostname', mutate: run => { run.candidates[1].hostname = 'a.test'; } },
  { name: 'duplicate global evidence id', mutate: run => { run.candidates[1].historicalEvidence[0].id = run.candidates[0].historicalEvidence[0].id; } },
  { name: 'duplicate score hostname', mutate: run => { run.scores.push(clone(run.scores[0])); } },
  { name: 'duplicate candidate gate id', mutate: run => { run.candidates[0].riskGates.push(clone(run.candidates[0].riskGates[0])); } },
  { name: 'duplicate operation id', mutate: run => { run.orchestration!.providerOperations.push(clone(run.orchestration!.providerOperations[0])); } },
  { name: 'duplicate outcome id', mutate: run => { run.orchestration!.candidateEvidenceOutcomes!.push(clone(run.orchestration!.candidateEvidenceOutcomes![0])); } },
  { name: 'duplicate acquisition id', mutate: run => { run.orchestration!.acquisitionGates[1].id = run.orchestration!.acquisitionGates[0].id; } },
  { name: 'duplicate usage tuple', mutate: run => { run.providerUsage.push(clone(run.providerUsage[0])); } },
  { name: 'score missing candidate', mutate: run => { run.scores[0].hostname = 'missing.test'; } },
  { name: 'score foreign evidence', mutate: run => { run.scores[0].evidenceIds = ['history-two']; } },
  { name: 'duplicate score reference', mutate: run => { run.scores[0].evidenceIds.push(run.scores[0].evidenceIds[0]); } },
  { name: 'outcome provider crossover', mutate: run => { run.orchestration!.candidateEvidenceOutcomes![0].provider = 'moz-data-api-v3'; } },
]);

rejectedRows('orchestration entry and provider shapes reject malformed values', [
  { name: 'truncation count mismatch', mutate: run => { run.orchestration!.truncations[0].retainedCount = 0; } },
  { name: 'truncation unknown hostname', mutate: run => { run.orchestration!.truncations[0].skippedHostnames = ['missing.test']; } },
  { name: 'skip unknown hostname', mutate: run => { run.orchestration!.skips[0].hostname = 'missing.test'; } },
  { name: 'empty hold reason', mutate: run => { run.orchestration!.holdReasons = ['']; } },
  { name: 'duplicate failure reason', mutate: run => { run.orchestration!.failureReasons = ['same', 'same']; } },
  { name: 'empty operation name', mutate: run => { run.orchestration!.providerOperations[0].operation = ''; } },
  { name: 'empty outcome id', mutate: run => { run.orchestration!.candidateEvidenceOutcomes![0].id = ''; } },
  { name: 'missing operation evidence', mutate: run => { run.orchestration!.providerOperations[0].evidenceIds = ['missing']; } },
  { name: 'open seo provider crossover', mutate: run => { (run.candidates[0].openSeoEvidence[0] as { provider: string }).provider = 'moz-data-api-v3'; } },
  { name: 'open seo negative metric', mutate: run => { run.candidates[0].openSeoEvidence[0].backlinks = -1; } },
  { name: 'moz provider crossover', mutate: run => { (run.candidates[0].mozAuthorityEvidence[0] as { provider: string }).provider = 'open-seo'; } },
  { name: 'moz metric over score range', mutate: run => { run.candidates[0].mozAuthorityEvidence[0].spamScore = 101; } },
  { name: 'missing score component', mutate: run => { delete (run.scores[0].components as Record<string, number>).authority; } },
  { name: 'extra score component', mutate: run => { (run.scores[0].components as Record<string, number>).extra = 1; } },
]);