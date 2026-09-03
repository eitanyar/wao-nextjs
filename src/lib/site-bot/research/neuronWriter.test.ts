import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createServiceQuery,
  evaluateServiceContent,
  getServiceQuery,
  listNeuronProjects,
  type NeuronWriterOptions,
} from './neuronWriter';

type FetchCall = { url: string; init?: RequestInit };

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

const validProject = { projects: [{ id: 'project-1', search_engine: 'google.co.il', language: 'Hebrew' }] };
const serviceInput = { serviceKeyword: 'service term', intentCluster: 'primary service', pageClass: 'service' };

test('listNeuronProjects sends the API key only as an X-API-KEY request header', async () => {
  const mock = createFetch([validProject]);
  const projects = await listNeuronProjects(options(mock.fetch));

  assert.deepEqual(projects, [{ id: 'project-1', searchEngine: 'google.co.il', language: 'Hebrew' }]);
  assert.equal(mock.calls[0].url, 'https://api.neuronwriter.com/neuron-api/0.5/writer/projects');
  assert.equal((mock.calls[0].init?.headers as Record<string, string>)['X-API-KEY'], 'test-neuron-key');
  assert.equal(String(mock.calls[0].init?.body ?? ''), '');
});

test('createServiceQuery rejects non-service pages before any provider request', async () => {
  const mock = createFetch([]);
  await assert.rejects(
    () => createServiceQuery({ ...serviceInput, pageClass: 'blog' }, options(mock.fetch)),
    /only supports service page analyses/
  );
  assert.equal(mock.calls.length, 0);
});

test('createServiceQuery validates the configured Hebrew google.co.il project and normalizes a waiting query', async () => {
  const mock = createFetch([
    validProject,
    { query: { id: 'query-1', status: 'processing', metrics: { score: 31, ignored: 'x' }, terms: {
      title: [{ term: 'title term' }], meta: ['meta term'], h1: ['h1 term'], h2: ['h2 term'], body: ['body term'],
    }, entities: [{ name: 'entity one' }], questions: {
      suggested: [{ question: 'suggested question' }], paa: ['paa question'], content: ['content question'],
    }, competitors: [{ url: 'https://competitor.test', title: 'Competitor', content_score: 44 }] } },
  ]);

  const result = await createServiceQuery(serviceInput, options(mock.fetch));

  assert.equal(result.status, 'waiting');
  assert.deepEqual(result.metrics, { score: 31 });
  assert.deepEqual(result.titleTerms, ['title term']);
  assert.deepEqual(result.entities, ['entity one']);
  assert.deepEqual(result.competitors, [{ url: 'https://competitor.test', title: 'Competitor', score: 44 }]);
  assert.equal(mock.calls[1].url, 'https://api.neuronwriter.com/neuron-api/0.5/writer/new-query');
  assert.deepEqual(JSON.parse(String(mock.calls[1].init?.body)), {
    project: 'project-1', query: 'service term', search_engine: 'google.co.il', language: 'Hebrew', competitors_mode: 'top-intent',
  });
});

test('existing service clusters reuse their query ID through get-query without another new-query request', async () => {
  const queryIds = new Map<string, string>();
  const mock = createFetch([
    validProject,
    { query: { id: 'query-1', status: 'processing' } },
    { query: { id: 'query-1', status: 'ready', terms: { body: ['ready term'] } } },
  ]);
  const adapterOptions = options(mock.fetch, { queryIds });

  await createServiceQuery(serviceInput, adapterOptions);
  const ready = await createServiceQuery(serviceInput, adapterOptions);

  assert.equal(ready.status, 'ready');
  assert.deepEqual(ready.bodyTerms, ['ready term']);
  assert.deepEqual(mock.calls.map(call => call.url.split('/').pop()), ['projects', 'new-query', 'get-query']);
  assert.deepEqual(JSON.parse(String(mock.calls[2].init?.body)), { query: 'query-1' });
});

test('getServiceQuery rejects malformed provider responses without exposing the API key', async () => {
  const mock = createFetch([{ query: { status: 'ready' } }]);
  await assert.rejects(
    () => getServiceQuery('query-1', serviceInput, options(mock.fetch)),
    error => error instanceof Error && /missing query ID/.test(error.message) && !error.message.includes('test-neuron-key')
  );
});

test('evaluateServiceContent uses evaluation only and never sends import-content or revision fields', async () => {
  const mock = createFetch([{ evaluation: {
    content_score: 82,
    metrics: { coverage: 0.8 },
    terms: [{ term: 'coverage term' }],
    entities: ['entity one'],
    questions: [{ question: 'question one' }],
  } }]);

  const result = await evaluateServiceContent('query-1', {
    html: '<main>content</main>', title: 'Title', description: 'Description',
  }, options(mock.fetch));

  assert.deepEqual(result, {
    score: 82,
    metrics: { coverage: 0.8 },
    terms: ['coverage term'],
    entities: ['entity one'],
    questions: ['question one'],
  });
  assert.equal(mock.calls[0].url, 'https://api.neuronwriter.com/neuron-api/0.5/writer/evaluate-content');
  assert.deepEqual(JSON.parse(String(mock.calls[0].init?.body)), {
    query: 'query-1', html: '<main>content</main>', title: 'Title', description: 'Description',
  });
});
