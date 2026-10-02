import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicSeoOpenSeoExecutor } from './seo-advisor-public-executor';
import type { OpenSeoClient, OpenSeoToolResult, OpenSeoTransport } from './expired-domain-research/openSeoMcp';

const projectId = 'project-test';
const transport = () => ({ async start() {}, async send() {}, async close() {} }) as OpenSeoTransport;
const markets = [
  { domain: 'example.test', locationCode: 2376, languageCode: 'he' },
  { domain: 'example.test', locationCode: 2840, languageCode: 'en' },
];

function fixtureClient(response: OpenSeoToolResult = {
  content: [], structuredContent: { data: { organicTraffic: 12, organicKeywords: 9 } },
}) {
  const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
  let closed = 0;
  let connected = 0;
  let failConnect = false;
  const client: OpenSeoClient = {
    async connect() { connected += 1; if (failConnect) throw new Error('connect failure'); },
    async close() { closed += 1; },
    async listTools() { throw new Error('unexpected tool listing'); },
    async callTool(input) {
      assert.equal(input.name, 'get_domain_overview', 'no other tool is callable');
      calls.push(input);
      return response;
    },
  };
  return { client, calls, get closed() { return closed; }, get connected() { return connected; },
    failConnection() { failConnect = true; } };
}

test('one overview per allowed market carries the project and closes offline', async () => {
  for (const market of markets) {
    const fake = fixtureClient();
    const execute = createPublicSeoOpenSeoExecutor({ projectId, client: fake.client, transport: transport() });
    const finding = await execute({ projectId, ...market });
    assert.deepEqual(fake.calls, [{ name: 'get_domain_overview', arguments: { projectId, ...market } }]);
    assert.deepEqual({ organicTraffic: finding.organicTraffic, organicKeywords: finding.organicKeywords },
      { organicTraffic: 12, organicKeywords: 9 });
    assert.match(finding.retrievedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
    assert.equal(fake.connected, 1); assert.equal(fake.closed, 1);
  }
});

test('root, text, and explicit null metrics map without leaking raw fields', async () => {
  for (const response of [
    { content: [], structuredContent: { organicTraffic: null, organicKeywords: 0, secret: 'private' } },
    { content: [{ type: 'text' as const, text: JSON.stringify({ data: { organicTraffic: null, organicKeywords: 0 } }) }] },
  ]) {
    const fake = fixtureClient(response);
    const finding = await createPublicSeoOpenSeoExecutor({ projectId, client: fake.client, transport: transport() })({ projectId, ...markets[0] });
    assert.deepEqual(Object.keys(finding).sort(), ['organicKeywords', 'organicTraffic', 'retrievedAt']);
    assert.equal(finding.organicTraffic, null); assert.equal(finding.organicKeywords, 0);
    assert.equal(fake.closed, 1);
  }
});

test('tool errors and invalid result shapes fail closed and close', async () => {
  const responses: OpenSeoToolResult[] = [
    { content: [], isError: true }, { toolResult: {} }, { content: [] },
    { content: [], structuredContent: { data: { organicKeywords: 1 } } },
    { content: [], structuredContent: { data: { organicKeywords: -1, organicTraffic: 1 } } },
    { content: [], structuredContent: { organicKeywords: NaN, organicTraffic: Infinity } },
    { content: [], structuredContent: { organicKeywords: '2', organicTraffic: 1 } },
  ];
  for (const response of responses) {
    const fake = fixtureClient(response);
    const execute = createPublicSeoOpenSeoExecutor({ projectId, client: fake.client, transport: transport() });
    await assert.rejects(execute({ projectId, ...markets[0] }), { message: 'public_seo_executor_unavailable' });
    assert.equal(fake.closed, 1);
  }
});

test('connection failure attempts close and makes zero tool calls', async () => {
  const fake = fixtureClient(); fake.failConnection();
  const execute = createPublicSeoOpenSeoExecutor({ projectId, client: fake.client, transport: transport() });
  await assert.rejects(execute({ projectId, ...markets[0] }), { message: 'public_seo_executor_unavailable' });
  assert.equal(fake.closed, 1); assert.equal(fake.calls.length, 0);
});

test('mismatched project and unsafe origins cannot connect', async () => {
  const fake = fixtureClient();
  const execute = createPublicSeoOpenSeoExecutor({ projectId, client: fake.client, transport: transport() });
  await assert.rejects(execute({ projectId: 'other', ...markets[0] }));
  assert.equal(fake.connected, 0);
  for (const origin of ['https://127.0.0.1:3001', 'http://example.com',
    'http://127.0.0.1:3001/mcp', 'http://user@localhost:3001', 'bad-url']) {
    assert.throws(() => createPublicSeoOpenSeoExecutor({ projectId, origin, client: fake.client, transport: transport() }));
  }
});

test('custom loopback origin reaches injected transport factory and never uses fetch', async () => {
  const fake = fixtureClient();
  let url = '';
  const execute = createPublicSeoOpenSeoExecutor({ projectId, origin: 'http://[::1]:3001',
    client: fake.client, transportFactory: endpoint => { url = endpoint.toString(); return transport(); },
    fetch: async () => { throw new Error('network forbidden'); },
  });
  await execute({ projectId, ...markets[1] });
  assert.equal(url, 'http://[::1]:3001/mcp');
  assert.equal(fake.closed, 1);
});
