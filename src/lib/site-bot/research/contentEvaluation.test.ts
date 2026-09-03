import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePageAgainstBrief } from './contentEvaluation';

const serviceInput = {
  page: { id: 'service-alpha', pageClass: 'service' },
  queryId: 'query-alpha',
  content: { html: '<main>Alpha service</main>', title: 'Alpha service', description: 'Local alpha service' },
  approvedItems: [
    { value: 'alpha service', kind: 'term' as const, relevance: 0.9 },
    { value: 'local provider', kind: 'entity' as const, relevance: 0.8 },
  ],
  competitorScores: [60, 70, 80],
};

test('evaluatePageAgainstBrief persists a competitor-relative passing first attempt', async () => {
  const persisted: unknown[] = [];
  const result = await evaluatePageAgainstBrief(serviceInput, {
    evaluate: async () => ({ score: 75, terms: ['alpha service'], entities: ['local provider'], overused: [] }),
    persist: async snapshot => { persisted.push(snapshot); },
  });

  assert.equal(result.status, 'pass');
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0]?.scoreDelta, 5);
  assert.deepEqual(persisted, [result]);
});

test('evaluatePageAgainstBrief applies one concise approved revision and persists both attempts', async () => {
  const persisted: Array<{ attempts: unknown[] }> = [];
  let revisionDelta: unknown;
  const result = await evaluatePageAgainstBrief(serviceInput, {
    evaluate: async (_queryId, content) => content.html.includes('revised')
      ? { score: 75, terms: ['alpha service'], entities: ['local provider'], overused: [] }
      : { score: 65, terms: [], entities: [], overused: [] },
    revise: async (content, delta) => {
      revisionDelta = delta;
      return { ...content, html: '<main>revised alpha service</main>' };
    },
    persist: async snapshot => { persisted.push(snapshot); },
  });

  assert.equal(result.status, 'revision_pass');
  assert.equal(result.attempts.length, 2);
  assert.deepEqual(revisionDelta, {
    missingApprovedTerms: ['alpha service'], missingApprovedEntities: ['local provider'], unsupported: [], overused: [],
  });
  assert.deepEqual(persisted.map(snapshot => snapshot.attempts.length), [1, 2]);
});

test('evaluatePageAgainstBrief holds after a second miss without another revision', async () => {
  let evaluations = 0;
  let revisions = 0;
  const result = await evaluatePageAgainstBrief(serviceInput, {
    evaluate: async () => {
      evaluations += 1;
      return { score: 50, terms: [], entities: [], overused: [] };
    },
    revise: async content => {
      revisions += 1;
      return content;
    },
  });

  assert.equal(result.status, 'held');
  assert.equal(result.holdReason, 'second_miss');
  assert.equal(result.attempts.length, 2);
  assert.equal(evaluations, 2);
  assert.equal(revisions, 1);
});

test('evaluatePageAgainstBrief skips non-service pages without creating an analysis', async () => {
  let evaluations = 0;
  const result = await evaluatePageAgainstBrief({ ...serviceInput, page: { id: 'home', pageClass: 'homepage' } }, {
    evaluate: async () => {
      evaluations += 1;
      return { score: 100, terms: [], entities: [] };
    },
  });

  assert.equal(result.status, 'skipped');
  assert.deepEqual(result.attempts, []);
  assert.equal(evaluations, 0);
});

test('evaluatePageAgainstBrief reuses the stored service query ID', async () => {
  const queryIds: string[] = [];
  await evaluatePageAgainstBrief(serviceInput, {
    evaluate: async queryId => {
      queryIds.push(queryId);
      return { score: 75, terms: ['alpha service'], entities: ['local provider'] };
    },
  });

  assert.deepEqual(queryIds, ['query-alpha']);
});

test('evaluatePageAgainstBrief sends overuse warnings through the one revision delta', async () => {
  let revisionDelta: { overused: string[] } | undefined;
  const result = await evaluatePageAgainstBrief(serviceInput, {
    evaluate: async (_queryId, content) => content.html.includes('revised')
      ? { score: 75, terms: ['alpha service'], entities: ['local provider'], overused: [] }
      : { score: 75, terms: ['alpha service'], entities: ['local provider'], overused: ['alpha service'] },
    revise: async (content, delta) => {
      revisionDelta = delta;
      return { ...content, html: '<main>revised</main>' };
    },
  });

  assert.equal(result.status, 'revision_pass');
  assert.deepEqual(revisionDelta?.overused, ['alpha service']);
});

test('evaluatePageAgainstBrief holds and records a provider outage', async () => {
  const persisted: unknown[] = [];
  const result = await evaluatePageAgainstBrief(serviceInput, {
    evaluate: async () => { throw new Error('provider unavailable'); },
    persist: async snapshot => { persisted.push(snapshot); },
  });

  assert.equal(result.status, 'held');
  assert.equal(result.holdReason, 'provider_outage');
  assert.deepEqual(result.attempts, []);
  assert.deepEqual(persisted, [result]);
});
