import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { callAllowedOpenSeoTool, closeOpenSeoMcpClient, createOpenSeoMcpClient, estimateOpenSeoPlan, preflightOpenSeo, resolveAdvisorMarket, runOpenSeoResearch } from './openSeoMcp';
import type { OpenSeoClient, OpenSeoToolResult } from './openSeoMcp';

const fixture = (name: string): Record<string, unknown> => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'fixtures', 'expired-domain-research', 'openseo', name), 'utf8')) as Record<string, unknown>;
const tools = fixture('tool-list.json');
const whoami = fixture('whoami.json');
const projects = fixture('projects.json');
const responses = fixture('research-responses.json');
const errors = fixture('error-responses.json');
const ordinary = (structuredContent: Record<string, unknown> = {}): OpenSeoToolResult => ({ content: [], structuredContent });
const jsonText = (value: Record<string, unknown>): OpenSeoToolResult => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const image = (): OpenSeoToolResult => ({ content: [{ type: 'image', data: 'AA==', mimeType: 'image/png' }] });
const taskEnvelope = (): OpenSeoToolResult => ({ toolResult: {} });
const failed = (): OpenSeoToolResult => ({ content: [], isError: true });

class InMemoryTransport implements Transport {
  started = 0;
  closed = 0;
  readonly sent: JSONRPCMessage[] = [];
  onmessage?: <T extends JSONRPCMessage>(message: T) => void;
  async start(): Promise<void> { this.started += 1; }
  async send(message: JSONRPCMessage): Promise<void> {
    this.sent.push(message);
    if ('method' in message && 'id' in message && message.method === 'initialize') this.onmessage?.({ jsonrpc: '2.0', id: message.id, result: { protocolVersion: '2025-11-25', capabilities: {}, serverInfo: { name: 'synthetic', version: '1.0.0' } } });
  }
  async close(): Promise<void> { this.closed += 1; }
}

class FakeClient implements OpenSeoClient {
  readonly calls: string[] = [];
  readonly inputs: Array<{ name: string; arguments: Record<string, unknown> }> = [];
  closed = 0;
  constructor(private readonly available = [...(tools.tools as Array<{ name: string }>), { name: 'get_ranked_keywords' }], private readonly failure = '', private readonly resultFor = (input: { name: string }) => input.name === 'whoami' ? ordinary(whoami) : input.name === 'list_projects' ? ordinary(projects) : ordinary((responses[input.name] ?? {}) as Record<string, unknown>)) {}
  async connect(_transport: Transport): Promise<void> {}
  async listTools(): Promise<{ tools: Array<{ name: string }> }> { return { tools: this.available }; }
  async callTool(input: { name: string; arguments: Record<string, unknown> }): Promise<OpenSeoToolResult> { this.calls.push(input.name); this.inputs.push(input); if (this.failure === input.name) throw new Error('provider failure'); return this.resultFor(input); }
  async close(): Promise<void> { this.closed += 1; }
}

const day = () => new Date('2026-01-01T00:00:00.000Z');

test('fixtures are ASCII-only and all synthetic sources are consumed', () => {
  for (const name of ['tool-list.json', 'whoami.json', 'projects.json', 'research-responses.json', 'error-responses.json']) assert.doesNotMatch(JSON.stringify(fixture(name)), /[^\x00-\x7f]/u);
  assert.equal((tools.tools as unknown[]).length, 7); assert.equal((whoami.scopes as unknown[]).length, 1); assert.equal((projects.projects as unknown[]).length, 1); assert.equal(typeof responses.research_keywords, 'object'); assert.equal(typeof errors.unauthorized, 'object');
});

test('constructs only configured local or hosted SDK seams with bearer auth', async () => {
  const client = new FakeClient(); let origin = ''; let authorization = '';
  const handle = await createOpenSeoMcpClient({ mode: 'hosted', url: 'https://app.openseo.so/mcp', apiKey: 'secret', client, transportFactory: (url, options) => { origin = url.origin; authorization = String((options.requestInit.headers as Record<string, string>).Authorization); return new InMemoryTransport(); } });
  assert.equal(handle.client, client); assert.equal(origin, 'https://app.openseo.so'); assert.equal(authorization, 'Bearer secret');
  await assert.rejects(() => createOpenSeoMcpClient({ mode: 'hosted', url: 'http://app.openseo.so/mcp', apiKey: 'secret', client: new FakeClient(), transport: new InMemoryTransport() }));
  await assert.rejects(() => createOpenSeoMcpClient({ mode: 'hosted', url: 'https://key@app.openseo.so/mcp', apiKey: 'secret', client: new FakeClient(), transport: new InMemoryTransport() }));
});

test('preflight lists required tools and only invokes zero-credit calls with sanitized evidence', async () => {
  const client = new FakeClient(); const result = await preflightOpenSeo({ projectId: 'project-1', client, transport: new InMemoryTransport(), now: day });
  assert.equal(result.status, 'ok'); assert.deepEqual(client.calls, ['whoami', 'list_projects']); assert.equal(result.meteredCalls, 0); assert.equal(result.networkCalls, 0); assert.equal(JSON.stringify(result).includes('account@example.test'), false);
});

test('preflight fails closed for tool or project mismatches', async () => {
  const missingTools = await preflightOpenSeo({ projectId: 'project-1', client: new FakeClient([{ name: 'whoami' }]), transport: new InMemoryTransport(), now: day });
  const missingProject = await preflightOpenSeo({ projectId: 'wrong', client: new FakeClient(), transport: new InMemoryTransport(), now: day });
  assert.equal(missingTools.status, 'capability_missing'); assert.equal(missingProject.status, 'project_missing');
});

test('hard allowlist validates schemas and rejects unknown or mutating tools', async () => {
  const client = new FakeClient(); await callAllowedOpenSeoTool(client, 'research_keywords', { projectId: 'project-1', seed: 'topic', clickstream: false });
  await assert.rejects(() => callAllowedOpenSeoTool(client, 'research_keywords', { seed: 'topic', clickstream: true })); await assert.rejects(() => callAllowedOpenSeoTool(client, 'create_project' as never, {})); await assert.rejects(() => callAllowedOpenSeoTool(client, 'get_domain_overview', { domain: '127.0.0.1' }));
});

test('calculates worst-case plan with ranked keywords and bounded prefixes', () => {
  const full = estimateOpenSeoPlan({ projectId: 'project-1', approvedCap: 2000 }); const prefix = estimateOpenSeoPlan({ projectId: 'project-1', approvedCap: 700 }); const low = estimateOpenSeoPlan({ projectId: 'project-1', approvedCap: 99 }); const over = estimateOpenSeoPlan({ projectId: 'project-1', approvedCap: 1840, explicitPlanCredits: 2001 });
  assert.equal(full.totalCredits, 2740); assert.equal(full.calls.length + full.omitted.length, 15); assert.deepEqual(prefix.calls.map(call => call.cost), [100, 300, 300]); assert.equal(low.status, 'insufficient_budget'); assert.equal(over.status, 'budget_confirmation_required');
  assert.equal(full.calls.every(call => call.arguments.projectId === 'project-1'), true);
  assert.equal(full.calls.filter(call => call.tool === 'get_ranked_keywords').length, 3);
  assert.deepEqual(estimateOpenSeoPlan({ projectId: 'project-1', candidates: ['one.test'], approvedCap: 700 }).calls.map(call => call.tool), ['get_domain_overview', 'get_ranked_keywords']);
});

test('advisor market allowlist accepts US and IL languages and fails closed otherwise', () => {
  for (const [locationCode, languageCode] of [[2840, 'en'], [2840, 'es'], [2376, 'he'], [2376, 'ar']] as const) {
    assert.deepEqual(resolveAdvisorMarket({ locationCode, languageCode }), { status: 'ok', locationCode, languageCode });
  }
  for (const [locationCode, languageCode] of [[2840, 'he'], [2376, 'en']] as const) {
    assert.equal(resolveAdvisorMarket({ locationCode, languageCode }).status, 'unsupported');
  }
  assert.match(resolveAdvisorMarket({ locationCode: 9999 }).reason ?? '', /9999/u);
  assert.deepEqual(resolveAdvisorMarket({ languageCode: 'en' }), { status: 'unsupported', reason: 'language requires location for the advisor allowlist' });
  assert.deepEqual(resolveAdvisorMarket({}), { status: 'ok' });
  assert.deepEqual(resolveAdvisorMarket({ locationCode: 2840 }), { status: 'ok', locationCode: 2840 });
});

test('plan threads an explicit market through every domain tool and preserves default-market costs', () => {
  const options = { projectId: 'project-1', candidates: ['one.test'], approvedCap: 1000 };
  const selected = estimateOpenSeoPlan({ ...options, locationCode: 2840, languageCode: 'en' });
  const fallback = estimateOpenSeoPlan(options);
  for (const tool of ['get_domain_overview', 'get_domain_keyword_suggestions', 'get_ranked_keywords']) {
    const explicit = selected.calls.find(call => call.tool === tool);
    assert.equal(explicit?.arguments.locationCode, 2840);
    assert.equal(explicit?.arguments.languageCode, 'en');
    const omitted = fallback.calls.find(call => call.tool === tool);
    assert.equal(Object.hasOwn(omitted?.arguments ?? {}, 'locationCode'), false);
    assert.equal(Object.hasOwn(omitted?.arguments ?? {}, 'languageCode'), false);
  }
  assert.equal(selected.totalCredits, fallback.totalCredits);
  assert.equal(estimateOpenSeoPlan({ projectId: 'project-1', approvedCap: 2000 }).totalCredits, 2740);
  for (const invalid of [{ locationCode: 0 }, { locationCode: Number.MAX_SAFE_INTEGER + 1 }, { languageCode: 'english' }]) {
    assert.throws(() => estimateOpenSeoPlan({ ...options, ...invalid }));
  }
  for (const unsupported of [{ locationCode: 9999 }, { locationCode: 2840, languageCode: 'he' }, { languageCode: 'en' }]) {
    assert.throws(() => estimateOpenSeoPlan({ ...options, ...unsupported }));
  }
});

test('research carries the market from options to the fake transport', async () => {
  const client = new FakeClient();
  const result = await runOpenSeoResearch({ client, projectId: 'project-1', candidates: ['one.test'], approvedCap: 900, locationCode: 2840, languageCode: 'en', now: day });
  for (const tool of ['get_domain_overview', 'get_domain_keyword_suggestions', 'get_ranked_keywords']) {
    const input = client.inputs.find(item => item.name === tool);
    assert.equal(input?.arguments.locationCode, 2840);
    assert.equal(input?.arguments.languageCode, 'en');
  }
  assert.equal(result.plan.totalCredits, 980);
});

test('research stops before insufficient remaining credits, normalizes evidence, and closes in finally', async () => {
  const client = new FakeClient(); const result = await runOpenSeoResearch({ client, projectId: 'project-1', approvedCap: 2000, remainingCredits: 400, now: day });
  assert.equal(result.status, 'partial'); assert.equal(result.observedCredits, 400); assert.equal(result.evidence.length, 2); assert.equal(client.closed, 1); assert.equal(JSON.stringify(result).includes('pageAuthority'), false); assert.equal(JSON.stringify(result).includes('account@example.test'), false);
  assert.equal(client.inputs.every(input => input.arguments.projectId === 'project-1'), true);
});

test('research reports provider failures and closes resources', async () => {
  const client = new FakeClient(undefined, 'get_domain_overview'); const result = await runOpenSeoResearch({ client, projectId: 'project-1', approvedCap: 2000, now: day });
  assert.equal(result.status, 'partial'); assert.equal(result.skipped.some(item => item.reason === 'provider_failure'), true); assert.equal(client.closed, 1);
});

test('close helper closes both injected resources', async () => {
  const client = new FakeClient(); const transport = new InMemoryTransport(); await closeOpenSeoMcpClient({ client, transport, mode: 'local', origin: 'http://127.0.0.1:3001' }); assert.equal(client.closed, 1); assert.equal(transport.closed, 1);
});

test('SDK boundary: real SDK Client initializes over an injected in-memory transport', async () => {
  const transport = new InMemoryTransport(); const handle = await createOpenSeoMcpClient({ transport }); assert.equal(handle.transport, transport); assert.equal(transport.started >= 1, true); assert.equal(transport.sent.some(message => 'method' in message && message.method === 'initialize'), true); await closeOpenSeoMcpClient(handle); assert.equal(transport.closed >= 1, true);
});

test('SDK boundary: direct supplied client and factory paths preserve identity', async () => {
  const direct = new FakeClient(); const fromFactory = new FakeClient(); const directHandle = await createOpenSeoMcpClient({ client: direct, transport: new InMemoryTransport() }); const factoryHandle = await createOpenSeoMcpClient({ clientFactory: () => fromFactory, transport: new InMemoryTransport() }); assert.equal(directHandle.client, direct); assert.equal(factoryHandle.client, fromFactory);
});

test('SDK boundary: structured and JSON text results remain usable', async () => {
  const structured = await preflightOpenSeo({ projectId: 'project-1', client: new FakeClient(), transport: new InMemoryTransport(), now: day });
  const textClient = new FakeClient(undefined, '', input => input.name === 'whoami' ? jsonText(whoami) : input.name === 'list_projects' ? jsonText(projects) : ordinary());
  const text = await preflightOpenSeo({ projectId: 'project-1', client: textClient, transport: new InMemoryTransport(), now: day }); assert.equal(structured.status, 'ok'); assert.equal(text.status, 'ok');
});

test('SDK boundary: non-text content is safe and unsupported task envelopes fail closed', async () => {
  const nonText = await preflightOpenSeo({ projectId: 'project-1', client: new FakeClient(undefined, '', () => image()), transport: new InMemoryTransport(), now: day });
  await assert.rejects(() => callAllowedOpenSeoTool(new FakeClient(undefined, '', () => taskEnvelope()), 'whoami', {}), /OpenSEO tool result is unsupported/); assert.equal(nonText.status, 'project_missing');
});

test('SDK boundary: isError fails closed and IP literals reject before calls while valid hostnames call', async () => {
  const failedClient = new FakeClient(undefined, '', () => failed()); await assert.rejects(() => callAllowedOpenSeoTool(failedClient, 'whoami', {}), /OpenSEO tool failed/);
  const client = new FakeClient(); await assert.rejects(() => callAllowedOpenSeoTool(client, 'get_domain_overview', { projectId: 'project-1', domain: '2001:db8::1' })); assert.equal(client.calls.length, 0); await callAllowedOpenSeoTool(client, 'get_domain_overview', { projectId: 'project-1', domain: 'one.test' }); assert.deepEqual(client.calls, ['get_domain_overview']);
});

test('all metered tools require projectId and ranked input rejects malformed fields before transport', async () => {
  const client = new FakeClient();
  const valid = [
    ['research_keywords', { seed: 'topic', clickstream: false }], ['get_domain_overview', { domain: 'one.test' }],
    ['get_domain_keyword_suggestions', { domain: 'one.test' }], ['get_backlinks_overview', { target: 'one.test' }],
    ['get_backlinks_profile', { target: 'one.test', page: 1 }], ['get_ranked_keywords', { target: 'one.test', limit: 50, maxRank: 20, languageCode: 'he', locationCode: 2376 }],
  ] as const;
  for (const [tool, input] of valid) {
    await assert.rejects(() => callAllowedOpenSeoTool(client, tool, input));
    await callAllowedOpenSeoTool(client, tool, { projectId: 'project-1', ...input });
  }
  assert.equal(client.calls.length, 6);
  for (const input of [{ target: '127.0.0.1' }, { target: 'one.test', limit: 201 }, { target: 'one.test', maxRank: 101 }, { target: 'one.test', locationCode: 0 }, { target: 'one.test', languageCode: 'eng' }, { target: 'one.test', unexpected: true }]) {
    await assert.rejects(() => callAllowedOpenSeoTool(client, 'get_ranked_keywords', { projectId: 'project-1', ...input }));
  }
  assert.equal(client.calls.length, 6);
});

test('ranked normalization retains only six fields per row and caps at 50', async () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({ keyword: `term-${i}`, url: 'https://one.test/page', position: i + 1, searchVolume: 100, cpc: 1, intent: 'commercial', accountEmail: 'account@example.test' }));
  const client = new FakeClient(undefined, '', input => input.name === 'get_ranked_keywords' ? ordinary({ data: { items: rows, secret: 'hidden' } }) : ordinary());
  const result = await runOpenSeoResearch({ client, projectId: 'project-1', candidates: ['one.test'], approvedCap: 600, now: day });
  const ranked = result.evidence.find(item => item.tool === 'get_ranked_keywords');
  assert.equal(ranked?.rowCount, 50); assert.equal((ranked?.rankedKeywordRows as unknown[]).length, 50); assert.equal(ranked?.topKeyword, 'term-0'); assert.equal(ranked?.bestPosition, 1);
  assert.equal(JSON.stringify(result.evidence).includes('account@example.test'), false); assert.equal(JSON.stringify(result.evidence).includes('hidden'), false);
});