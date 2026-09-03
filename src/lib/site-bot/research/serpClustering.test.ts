import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSerpOverlap,
  clusterKeywordEvidence,
  findAmbiguousClusters,
  type KeywordClusterInput,
} from './serpClustering';

const base = (keyword: string, intent: KeywordClusterInput['intent'], taskId: string, urls: string[]): KeywordClusterInput => ({
  keyword,
  intent,
  evidenceQueryIds: [taskId],
  serp: { organic: urls.map(url => ({ url, classification: 'local_business' })), exclusions: [] },
});

test('calculateSerpOverlap normalizes URL variants and domain variants before Jaccard comparison', () => {
  const overlap = calculateSerpOverlap(
    [{ url: 'HTTPS://Example.test/Service/?ref=one', classification: 'local_business' }],
    [{ url: 'https://example.test/service', classification: 'local_business' }],
  );

  assert.equal(overlap, 1);
});

test('clusterKeywordEvidence merges synonym candidates with compatible intent and the same strong SERP', () => {
  const result = clusterKeywordEvidence([
    base('service alpha', 'commercial', 'query-1', ['https://one.test/a', 'https://two.test/a', 'https://three.test/a']),
    base('alpha service', 'commercial', 'query-2', ['https://one.test/a/', 'https://two.test/a/', 'https://three.test/a/']),
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].decision, 'merge');
  assert.equal(result[0].confidence, 1);
  assert.deepEqual(result[0].evidenceQueryIds, ['query-1', 'query-2']);
  assert.match(result[0].rationale, /strong SERP overlap/);
});

test('clusterKeywordEvidence gates distinct intents despite the same SERP', () => {
  const urls = ['https://one.test/a', 'https://two.test/a', 'https://three.test/a'];
  const result = clusterKeywordEvidence([
    base('alpha overview', 'informational', 'query-1', urls),
    base('buy alpha', 'transactional', 'query-2', urls),
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].decision, 'gate');
  assert.ok(result[0].gateReasons?.includes('mixed_intent'));
});

test('clusterKeywordEvidence gates sparse SERPs and retains excluded result classifications', () => {
  const result = clusterKeywordEvidence([
    { ...base('alpha city one', 'commercial', 'query-1', ['https://one.test/a']), serp: { organic: [{ url: 'https://one.test/a', classification: 'local_business' }], exclusions: [{ url: 'https://directory.test/a', classification: 'directory_aggregator', reason: 'directory_aggregator' }] } },
    { ...base('alpha city two', 'commercial', 'query-2', ['https://one.test/a']), serp: { organic: [{ url: 'https://one.test/a', classification: 'local_business' }], exclusions: [{ url: 'https://directory.test/b', classification: 'directory_aggregator', reason: 'directory_aggregator' }] } },
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].decision, 'gate');
  assert.ok(result[0].gateReasons?.includes('sparse_serp'));
  assert.equal(result[0].excludedResultTypes?.[0], 'directory_aggregator');
});

test('clusterKeywordEvidence gates directory-dominated and middle-band result mismatches without city-only splits', () => {
  const result = clusterKeywordEvidence([
    { ...base('alpha city one', 'commercial', 'query-1', ['https://one.test/a', 'https://two.test/a', 'https://three.test/a']), serp: { organic: [{ url: 'https://one.test/a', classification: 'local_business' }, { url: 'https://two.test/a', classification: 'local_business' }, { url: 'https://three.test/a', classification: 'local_business' }], exclusions: [{ url: 'https://directory.test/a', classification: 'directory_aggregator', reason: 'directory_aggregator' }, { url: 'https://directory-two.test/a', classification: 'directory_aggregator', reason: 'directory_aggregator' }, { url: 'https://directory-three.test/a', classification: 'directory_aggregator', reason: 'directory_aggregator' }] } },
    { ...base('alpha city two', 'commercial', 'query-2', ['https://one.test/a', 'https://two.test/a', 'https://five.test/a']), serp: { organic: [{ url: 'https://one.test/a', classification: 'informational' }, { url: 'https://two.test/a', classification: 'local_business' }, { url: 'https://five.test/a', classification: 'local_business' }], exclusions: [{ url: 'https://directory.test/b', classification: 'directory_aggregator', reason: 'directory_aggregator' }, { url: 'https://directory-two.test/b', classification: 'directory_aggregator', reason: 'directory_aggregator' }, { url: 'https://directory-three.test/b', classification: 'directory_aggregator', reason: 'directory_aggregator' }] } },
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].decision, 'gate');
  assert.ok(result[0].gateReasons?.includes('middle_band_overlap'));
  assert.ok(result[0].gateReasons?.includes('directory_dominated'));
  assert.ok(result[0].gateReasons?.includes('result_mismatch'));
});

test('findAmbiguousClusters returns only human-gated decisions with persisted rationale', () => {
  const clusters = clusterKeywordEvidence([
    base('alpha city one', 'commercial', 'query-1', ['https://one.test/a']),
    base('alpha city two', 'commercial', 'query-2', ['https://one.test/a']),
    base('beta', 'commercial', 'query-3', ['https://beta.test/a', 'https://beta-two.test/a', 'https://beta-three.test/a']),
  ]);

  const ambiguous = findAmbiguousClusters(clusters);

  assert.equal(ambiguous.length, 1);
  assert.equal(ambiguous[0].decision, 'gate');
  assert.ok(ambiguous[0].rationale.length > 0);
});
