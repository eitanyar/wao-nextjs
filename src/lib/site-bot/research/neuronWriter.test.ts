import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  createServiceQuery,
  evaluateServiceContent,
  getServiceQuery,
  listNeuronProjects,
  NEURON_WRITER_BASE_URL,
  pollServiceQuery,
  type NeuronWriterOptions,
} from './neuronWriter';

type FetchCall = { url: string; init?: RequestInit };
type Json = Record<string, unknown>;

/** The real Hebrew /get-query response captured 2026-11-10 (one approved query; key, project and share tokens redacted). */
const FIXTURE_PATH = path.join(process.cwd(), 'src/lib/site-bot/research/testdata/neuronwriter-get-query-he.json');
const realResponse = (): Json => JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) as Json;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createFetch(responses: Array<unknown | Response>) {
  const calls: FetchCall[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init });
    const response = responses.shift();
    if (response instanceof Response) return response;
    return jsonResponse(response);
  };
  return { calls, fetch };
}

function options(fetch: typeof globalThis.fetch, overrides: Partial<NeuronWriterOptions> = {}): NeuronWriterOptions {
  return {
    apiKey: 'test-neuron-key',
    projectId: 'project-1',
    fetch,
    queryIds: new Map(),
    ...overrides,
  };
}

/** POST /list-projects answers with a bare array of { project, name, language, engine } (NeuronWriter API docs). */
const validProject = [{ project: 'project-1', name: 'Example', engine: 'google.co.il', language: 'Hebrew' }];
const serviceInput = { serviceKeyword: 'service term', intentCluster: 'primary service', pageClass: 'service' };

test('the adapter talks to app.neuronwriter.com (api.neuronwriter.com does not resolve)', () => {
  assert.equal(NEURON_WRITER_BASE_URL, 'https://app.neuronwriter.com/neuron-api/0.5/writer');
});

test('listNeuronProjects POSTs /list-projects with the API key only as an X-API-KEY header and parses the bare array', async () => {
  const mock = createFetch([validProject]);
  const projects = await listNeuronProjects(options(mock.fetch));

  assert.deepEqual(projects, [{ id: 'project-1', name: 'Example', searchEngine: 'google.co.il', language: 'Hebrew' }]);
  assert.equal(mock.calls[0].url, `${NEURON_WRITER_BASE_URL}/list-projects`);
  assert.equal(mock.calls[0].init?.method, 'POST');
  assert.equal((mock.calls[0].init?.headers as Record<string, string>)['X-API-KEY'], 'test-neuron-key');
  assert.ok(!String(mock.calls[0].init?.body ?? '').includes('test-neuron-key'));
});

test('createServiceQuery rejects non-service pages before any provider request', async () => {
  const mock = createFetch([]);
  await assert.rejects(
    () => createServiceQuery({ ...serviceInput, pageClass: 'blog' }, options(mock.fetch)),
    /only supports service page analyses/
  );
  assert.equal(mock.calls.length, 0);
});

test('createServiceQuery validates the Hebrew google.co.il project and sends the documented /new-query body', async () => {
  const mock = createFetch([
    validProject,
    { query: 'query-1', query_url: 'https://app.neuronwriter.example/analysis/view/query-1' },
  ]);

  const result = await createServiceQuery(serviceInput, options(mock.fetch));

  // The real /new-query answers with the new ID only: the analysis is not ready yet.
  assert.equal(result.id, 'query-1');
  assert.equal(result.status, 'waiting');
  assert.deepEqual(result.bodyTermUsage, []);
  assert.equal(mock.calls[1].url, `${NEURON_WRITER_BASE_URL}/new-query`);
  assert.deepEqual(JSON.parse(String(mock.calls[1].init?.body)), {
    project: 'project-1', keyword: 'service term', engine: 'google.co.il', language: 'Hebrew', competitors_mode: 'top-intent',
  });
});

test('createServiceQuery refuses a project that is not Hebrew on google.co.il', async () => {
  const mock = createFetch([[{ project: 'project-1', name: 'Example', engine: 'google.com', language: 'English' }]]);
  await assert.rejects(() => createServiceQuery(serviceInput, options(mock.fetch)), /must use google\.co\.il and Hebrew/);
  assert.equal(mock.calls.length, 1);
});

test('existing service clusters reuse their query ID through get-query without another new-query request', async () => {
  const queryIds = new Map<string, string>();
  const mock = createFetch([
    validProject,
    { query: 'query-1' },
    { status: 'ready', query: 'query-1', terms: { content_basic: [{ t: 'ready term', usage_pc: 80, sugg_usage: [1, 3] }] } },
  ]);
  const adapterOptions = options(mock.fetch, { queryIds });

  await createServiceQuery(serviceInput, adapterOptions);
  const ready = await createServiceQuery(serviceInput, adapterOptions);

  assert.equal(ready.status, 'ready');
  assert.deepEqual(ready.bodyTerms, ['ready term']);
  assert.deepEqual(ready.bodyTermUsage, [{ t: 'ready term', min: 1, max: 3, usagePc: 80, tier: 'basic' }]);
  assert.deepEqual(mock.calls.map(call => call.url.split('/').pop()), ['list-projects', 'new-query', 'get-query']);
  assert.deepEqual(JSON.parse(String(mock.calls[2].init?.body)), { query: 'query-1' });
});

test('getServiceQuery rejects malformed provider responses without exposing the API key', async () => {
  const mock = createFetch([{ status: 'ready' }]);
  await assert.rejects(
    () => getServiceQuery('query-1', serviceInput, options(mock.fetch)),
    error => error instanceof Error && /missing query ID/.test(error.message) && !error.message.includes('test-neuron-key')
  );
});

test('the real Hebrew /get-query response has the shape the old parser assumed away (confirmed bugs)', () => {
  const raw = realResponse();
  const terms = raw.terms as Json;
  const ideas = raw.ideas as Json;
  const metrics = raw.metrics as Json;
  // ID: a string at the root `query` (the old parser looked for id / query_id and threw "missing query ID").
  assert.equal(typeof raw.query, 'string');
  assert.equal(raw.id, undefined);
  // metrics.word_count is nested { median, target } (the old numberRecord dropped it).
  assert.equal(typeof (metrics.word_count as Json).target, 'number');
  // Body terms are content_basic / content_extended items { t, usage_pc, sugg_usage }, not terms.body.
  assert.equal(terms.body, undefined);
  assert.ok(Array.isArray(terms.content_basic) && Array.isArray(terms.content_extended));
  assert.deepEqual(Object.keys((terms.content_basic as Json[])[0]).sort(), ['sugg_usage', 't', 'usage_pc']);
  // Questions live under ideas.*, items { q }; the topic matrix is an object keyed by question.
  assert.equal(raw.questions, undefined);
  assert.deepEqual(Object.keys(ideas).sort(), ['content_questions', 'people_also_ask', 'suggest_questions', 'topic_matrix']);
  assert.deepEqual(Object.keys((ideas.content_questions as Json[])[0]), ['q']);
  // The meta-description terms are terms.desc (not terms.meta); there is no terms.meta.
  assert.equal(terms.meta, undefined);
  assert.ok(Array.isArray(terms.desc));
});

test('getServiceQuery parses the real Hebrew response: word target, term ranges, questions, competitors', async () => {
  const raw = realResponse();
  const terms = raw.terms as Record<string, Json[]>;
  const ideas = raw.ideas as Record<string, unknown>;
  const mock = createFetch([raw]);
  const result = await getServiceQuery(String(raw.query), { serviceKeyword: String(raw.keyword), intentCluster: String(raw.keyword) }, options(mock.fetch));

  assert.equal(result.id, raw.query);
  assert.equal(result.status, 'ready');
  const wordCount = (raw.metrics as Record<string, Json>).word_count;
  assert.equal(result.wordTarget, wordCount.target);
  assert.equal(result.wordMedian, wordCount.median);
  assert.equal(result.metrics['word_count.target'], wordCount.target);
  assert.equal(result.metrics['readability.target'], (raw.metrics as Record<string, Json>).readability.target);

  const usage = result.bodyTermUsage ?? [];
  assert.equal(usage.length, terms.content_basic.length + terms.content_extended.length);
  const first = terms.content_basic[0];
  const range = first.sugg_usage as number[];
  assert.deepEqual(usage[0], { t: first.t, min: range[0], max: range[1], usagePc: first.usage_pc, tier: 'basic' });
  assert.equal(usage[terms.content_basic.length].tier, 'extended');
  assert.ok(usage.every(term => term.min >= 0 && term.max >= term.min));
  assert.deepEqual(result.h2Terms, [...new Set(terms.h2.map(item => item.t))]);
  assert.deepEqual(result.titleTerms, [...new Set(terms.title.map(item => item.t))]);
  assert.deepEqual(result.metaTerms, [...new Set(terms.desc.map(item => item.t))]);

  const contentQuestions = (ideas.content_questions as Json[]).map(item => item.q);
  assert.deepEqual(result.contentQuestions, [...new Set(contentQuestions)]);
  const matrix = ideas.topic_matrix as Record<string, { importance: number }>;
  const topic = result.topicQuestions ?? [];
  assert.equal(topic.length, Object.keys(matrix).length);
  for (let index = 1; index < topic.length; index++) assert.ok(matrix[topic[index - 1]].importance >= matrix[topic[index]].importance);
  assert.deepEqual(result.paaQuestions, []);
  assert.deepEqual(result.suggestedQuestions, []);
  assert.deepEqual(result.entities, []);

  const competitors = raw.competitors as Json[];
  assert.equal(result.competitors.length, competitors.length);
  assert.deepEqual(result.competitors[0], { url: competitors[0].url, title: competitors[0].title, score: competitors[0].content_score });
});

test('pollServiceQuery waits (bounded) until get-query reports ready, and stops at the attempt cap', async () => {
  const sleeps: number[] = [];
  const sleep = async (ms: number) => { sleeps.push(ms); };
  const ready = createFetch([{ status: 'waiting', query: 'q1' }, { status: 'in progress', query: 'q1' }, { status: 'ready', query: 'q1' }]);
  const result = await pollServiceQuery('q1', serviceInput, options(ready.fetch), { attempts: 5, intervalMs: 7, sleep });
  assert.equal(result.status, 'ready');
  assert.equal(ready.calls.length, 3);
  assert.deepEqual(sleeps, [7, 7]);
  assert.ok(ready.calls.every(call => call.url.endsWith('/get-query')));

  const never = createFetch([{ status: 'in progress', query: 'q2' }, { status: 'in progress', query: 'q2' }, { status: 'in progress', query: 'q2' }]);
  const stuck = await pollServiceQuery('q2', serviceInput, options(never.fetch), { attempts: 2, intervalMs: 0, sleep });
  assert.equal(stuck.status, 'waiting');
  assert.equal(never.calls.length, 2);
});

test('evaluateServiceContent uses evaluation only and never sends import-content or revision fields', async () => {
  const mock = createFetch([{ status: 'ok', content_score: 82 }]);

  const result = await evaluateServiceContent('query-1', {
    html: '<main>content</main>', title: 'Title', description: 'Description',
  }, options(mock.fetch));

  assert.deepEqual(result, { score: 82, metrics: {}, terms: [], entities: [], questions: [] });
  assert.equal(mock.calls[0].url, `${NEURON_WRITER_BASE_URL}/evaluate-content`);
  assert.deepEqual(JSON.parse(String(mock.calls[0].init?.body)), {
    query: 'query-1', html: '<main>content</main>', title: 'Title', description: 'Description',
  });
});
