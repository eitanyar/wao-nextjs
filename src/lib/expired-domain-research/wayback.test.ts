import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWaybackCaptureIndex, parseWaybackResearchUrl, searchWaybackCandidates, summarizeHistoricalEvidence } from './wayback';
import type { WaybackDependencies, WaybackFetchResponse } from './wayback';

class Response implements WaybackFetchResponse {
  constructor(readonly status: number, private readonly body: string, private readonly values: Record<string, string> = {}) {}
  headers = { get: (name: string): string | null => this.values[name.toLowerCase()] ?? null };
  async text(): Promise<string> { return this.body; }
}

const anchor = JSON.stringify([{ name: 'Example', link: 'https://example.test/', snippet: 'historic topic', first_captured: '20100101', last_captured: '20200101', capture: '20200101' }]);
const cdx = JSON.stringify([['timestamp', 'original', 'statuscode', 'mimetype', 'digest', 'redirect'], ['20100101000000', 'https://example.test/', '200', 'text/html', 'aaa', ''], ['20200101000000', 'https://example.test/', '200', 'text/html', 'bbb', '']]);
const html = '<html lang="en"><head><title>Topic archive</title><meta name="description" content="Historic topic"><link rel="canonical" href="https://example.test/"></head><body><h1>Topic archive</h1><p>topic research body</p></body></html>';
function dependencies(responses: WaybackFetchResponse[], delays: number[] = []): WaybackDependencies { let index = 0; return { fetch: async () => responses[index++] ?? new Response(500, ''), now: () => new Date('2026-01-01T00:00:00.000Z'), delay: async milliseconds => { delays.push(milliseconds); } }; }

test('parses keyword, Unicode-escaped, host, and original URL inputs without hostname confusion', () => {
  assert.deepEqual(parseWaybackResearchUrl('https://web.archive.org/web/*/topic%20research').kind, 'keyword');
  assert.equal(parseWaybackResearchUrl('https://web.archive.org/web/*/topic%20research').decodedInput, 'topic research');
  assert.equal(parseWaybackResearchUrl('https://web.archive.org/web/*/\u05d1\u05d3\u05d9\u05e7\u05d4').kind, 'keyword');
  assert.equal(parseWaybackResearchUrl('example.test').hostname, 'example.test');
  assert.equal(parseWaybackResearchUrl('https://example.test/landing').kind, 'original');
  assert.equal(parseWaybackResearchUrl('topic research').hostname, null);
});

test('anchor search is injected, bounded, documented false, and validates rows', async () => {
  const urls: string[] = [];
  const result = await searchWaybackCandidates('topic research', { fetch: async url => { urls.push(url); return new Response(200, anchor); }, now: () => new Date('2026-01-01T00:00:00.000Z') });
  assert.equal(result.status, 'ok');
  assert.equal(result.candidates.length, 1);
  assert.match(urls[0], /__wb\/search\/anchor\?q=topic%20research/);
  assert.equal(result.evidence[0].documented, false);
  assert.equal(result.evidence[0].sourceEndpoint, '/__wb/search/anchor');
  assert.match(result.evidence[0].responseDigest, /^[a-f0-9]{64}$/u);
  assert.ok(result.evidence.some(evidence => evidence.id === result.candidates[0].evidenceId));
});

test('anchor rejects malformed schemas and original host bypasses keyword endpoint', async () => {
  const malformed = await searchWaybackCandidates('topic', dependencies([new Response(200, '[{}]')]));
  assert.equal(malformed.status, 'provider_schema_changed');
  let calls = 0;
  const host = await searchWaybackCandidates('example.test', { fetch: async () => { calls += 1; return new Response(200, anchor); } });
  assert.equal(host.status, 'ok');
  assert.equal(calls, 0);
});

test('CDX request has bounded host, required fields, and twenty-row hard limit', async () => {
  let url = '';
  const result = await fetchWaybackCaptureIndex('example.test', { fetch: async input => { url = input; return new Response(200, cdx); }, now: () => new Date('2026-01-01T00:00:00.000Z') });
  assert.equal(result.status, 'ok');
  assert.equal(result.captures.length, 2);
  assert.match(url, /output=json/);
  assert.match(url, /fl=timestamp%2Coriginal%2Cstatuscode%2Cmimetype%2Cdigest%2Credirect/);
  assert.match(url, /filter=statuscode%3A200/);
  assert.match(url, /collapse=digest/);
  assert.match(url, /limit=20/);
  assert.equal((await fetchWaybackCaptureIndex('*topic*', dependencies([]))).status, 'provider_schema_changed');
});

test('retries 429 and 5xx at most twice and honors Retry-After deterministically', async () => {
  const delays: number[] = [];
  const limited = await searchWaybackCandidates('topic', dependencies([new Response(429, '', { 'retry-after': '2' }), new Response(503, ''), new Response(200, anchor)], delays));
  assert.equal(limited.status, 'ok');
  assert.deepEqual(delays, [2000, 1000]);
  const exhausted = await searchWaybackCandidates('topic', dependencies([new Response(503, ''), new Response(503, ''), new Response(503, '')]));
  assert.equal(exhausted.status, 'partial');
  const unavailable = await searchWaybackCandidates('topic', { fetch: async () => { throw new Error('timeout'); }, delay: async () => {}, timeoutMs: 1 });
  assert.equal(unavailable.status, 'unavailable');
});

test('spaces consecutive provider requests by one second through shared dependencies', async () => {
  const delays: number[] = [];
  const deps = dependencies([new Response(200, anchor), new Response(200, cdx)], delays);
  await searchWaybackCandidates('topic', deps);
  await fetchWaybackCaptureIndex('example.test', deps);
  assert.deepEqual(delays, [1000]);
});

test('replay extraction creates provenance claims, risk signals, and no raw HTML claim', async () => {
  const captures = (await fetchWaybackCaptureIndex('example.test', dependencies([new Response(200, cdx)]))).captures;
  const result = await summarizeHistoricalEvidence(captures, 'topic', dependencies([new Response(200, html, { 'content-type': 'text/html' }), new Response(200, html.replace('Topic archive', 'Casino parking'), { 'content-type': 'text/html' })]));
  assert.equal(result.status, 'ok');
  assert.ok(result.claims.some(claim => claim.kind === 'title'));
  assert.ok(result.claims.some(claim => claim.kind === 'canonical_target'));
  assert.ok(result.claims.some(claim => claim.kind === 'visible_text_keyword'));
  assert.ok(result.riskSignals.some(signal => signal.code === 'topic_pivot'));
  assert.ok(result.evidence.every(item => /^[a-f0-9]{64}$/u.test(item.responseDigest)));
  assert.equal(JSON.stringify(result).includes('<html'), false);
});

test('replay rejects private redirects, loops, oversized bodies, and non-HTML without fetching resources', async () => {
  const captures = (await fetchWaybackCaptureIndex('example.test', dependencies([new Response(200, cdx)]))).captures;
  const privateRedirect = await summarizeHistoricalEvidence([captures[0]], 'topic', dependencies([new Response(200, '', { 'content-type': 'text/html', location: 'http://127.0.0.1/' })]));
  assert.equal(privateRedirect.status, 'partial');
  assert.ok(privateRedirect.riskSignals.some(signal => signal.code === 'redirect_rejected'));
  const loop = await summarizeHistoricalEvidence([captures[0]], 'topic', dependencies([new Response(200, '', { 'content-type': 'text/html', location: `https://web.archive.org/web/${captures[0].timestamp}id_/${captures[0].original}` })]));
  assert.ok(loop.riskSignals.some(signal => signal.code === 'redirect_rejected'));
  const redirect = await summarizeHistoricalEvidence([captures[0]], 'topic', dependencies([new Response(302, '', { location: 'https://example.test/next' })]));
  assert.ok(redirect.riskSignals.some(signal => signal.code === 'redirect_chain'));
  assert.ok(redirect.claims.some(claim => claim.kind === 'redirect_target'));
  const oversized = await summarizeHistoricalEvidence([captures[0]], 'topic', dependencies([new Response(200, 'x'.repeat(256 * 1024 + 1), { 'content-type': 'text/html' })]));
  assert.equal(oversized.evidence[0].status, 'rejected');
  const nonHtml = await summarizeHistoricalEvidence([captures[0]], 'topic', dependencies([new Response(200, '{}', { 'content-type': 'application/json' })]));
  assert.equal(nonHtml.evidence[0].status, 'rejected');
});
