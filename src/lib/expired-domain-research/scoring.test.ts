import test from 'node:test';
import assert from 'node:assert/strict';
import { rankCandidates, scoreCandidate } from './scoring';
import type { Candidate } from './types';

const digest = 'b'.repeat(64);
const evidence = { sourceUrl: 'https://evidence.test/', provider: 'source', tool: 'tool', method: 'method', retrievedAt: '2026-01-01T00:00:00.000Z', freshnessHours: 1, confidence: 90, rawResponseDigest: digest };
function candidate(hostname: string, moz = true): Candidate { return { hostname, topicalFit: 80, businessFit: 80, historicalEvidence: [{ ...evidence, id: `${hostname}-history`, capturedAt: evidence.retrievedAt, topicalTags: ['topic'], continuityScore: 80 }], domainStatusEvidence: [{ ...evidence, id: `${hostname}-status`, availability: 'registered_inactive', observedAt: evidence.retrievedAt }], openSeoEvidence: [], mozAuthorityEvidence: [{ ...evidence, id: `${hostname}-moz`, provider: 'moz-data-api-v3', pageAuthority: moz ? 80 : null, domainAuthority: 80, spamScore: 10 }], riskGates: [] }; }

test('candidate score uses fixed components and records exact evidence IDs', () => {
  const result = scoreCandidate(candidate('complete.test'));
  assert.deepEqual(result.components, { topicalFit: 80, historicalContinuity: 80, businessFit: 80, authority: 80, cleanliness: 90 });
  assert.equal(result.score, 81.5);
  assert.deepEqual(result.evidenceIds, ['complete.test-history', 'complete.test-moz', 'complete.test-status']);
  assert.deepEqual(result.missingFields, []);
});

test('missing Moz metrics lower confidence and cannot beat equal complete evidence', () => {
  const ranked = rankCandidates([candidate('missing.test', false), candidate('complete.test')]);
  assert.equal(ranked[0].hostname, 'complete.test');
  assert.equal(ranked[1].missingFields.includes('moz_metrics_incomplete'), true);
  assert.ok(ranked[1].confidence < ranked[0].confidence);
});

test('risky redirects become explicit score penalties', () => {
  const risky = candidate('risky.test');
  risky.riskGates.push({ id: 'risky_redirect', status: 'fail', reason: 'redirect', evidenceIds: ['risky.test-status'] });
  assert.deepEqual(scoreCandidate(risky).penalties, [{ code: 'risky_redirect', points: 25, evidenceIds: ['risky.test-status'] }]);
});
