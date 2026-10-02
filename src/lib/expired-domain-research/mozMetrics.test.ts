import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildMozSiteMetricsRequest, fetchMozAuthorityBatch, fetchMozAuthorityMetrics } from './mozMetrics';
import type { MozFetch, MozResponse } from './mozMetrics';

const fixture = (name: string): string => fs.readFileSync(path.join(process.cwd(), 'fixtures', 'expired-domain-research', 'moz', name), 'utf8');
const fixtures = Object.fromEntries(['site-metrics.json', 'canonicalized-site-metrics.json', 'missing-metrics.json', 'error-responses.json'].map(name => [name, fixture(name)]));
class Response implements MozResponse {
  readonly headers: { get(name: string): string | null };
  constructor(readonly status: number, private readonly body: string, values: Record<string, string> = {}) { this.headers = { get: name => values[name.toLowerCase()] ?? null }; }
  async text(): Promise<string> { return this.body; }
}
const base = (fetch: MozFetch, overrides: Partial<Parameters<typeof fetchMozAuthorityMetrics>[1]> = {}) => ({ fetch, now: () => new Date('2026-03-01T00:00:00.000Z'), requestId: () => 'req-1', delay: async () => {}, digest: (value: string) => crypto.createHash('sha256').update(value).digest('hex'), token: 'secret-token', ...overrides });

test('all named ASCII fixtures are consumed', () => {
  for (const [name, body] of Object.entries(fixtures)) { assert.doesNotMatch(body, /[^\x00-\x7f]/u, name); assert.ok(body.length > 0); }
});

test('builds exact request and rejects invalid hosts before transport', () => {
  assert.deepEqual(buildMozSiteMetricsRequest('EXAMPLE.test', 'request-1'), { jsonrpc: '2.0', id: 'request-1', method: 'data.site.metrics.fetch', params: { data: { site_query: { query: 'https://example.test/', scope: 'domain' } } } });
  assert.throws(() => buildMozSiteMetricsRequest('localhost', 'request-1'));
  assert.throws(() => buildMozSiteMetricsRequest('example.test', ''));
});

test('maps complete metrics, canonical provenance, exact digest, and spam sentinel', async () => {
  const complete = await fetchMozAuthorityMetrics('example.test', base(async () => new Response(200, fixtures['site-metrics.json'])));
  assert.equal(complete.status, 'ok'); assert.equal(complete.evidence?.pageAuthority, 42.5); assert.equal(complete.evidence?.domainAuthority, 55); assert.equal(complete.evidence?.spamScore, 3);
  assert.equal(complete.evidence?.rawResponseDigest, crypto.createHash('sha256').update(fixtures['site-metrics.json']).digest('hex'));
  assert.equal(complete.provenance?.rootDomain, 'example.test');
  const canonical = await fetchMozAuthorityMetrics('MIXED.example.test', base(async () => new Response(200, fixtures['canonicalized-site-metrics.json']), { requestId: () => 'req-canonical' }));
  assert.equal(canonical.evidence?.spamScore, null); assert.ok(canonical.reasons.includes('moz_spam_score_absent'));
});

test('fails closed for invalid metrics, JSON-RPC failures, malformed data, and ID mismatch', async () => {
  const missing = await fetchMozAuthorityMetrics('missing.example.test', base(async () => new Response(200, fixtures['missing-metrics.json']), { requestId: () => 'req-missing' }));
  assert.deepEqual([missing.evidence?.pageAuthority, missing.evidence?.domainAuthority, missing.evidence?.spamScore], [null, null, null]);
  assert.deepEqual(missing.reasons, ['moz_domain_authority_out_of_range', 'moz_page_authority_invalid', 'moz_spam_score_invalid']);
  const errors = JSON.parse(fixtures['error-responses.json']) as { rpcError: object; idMismatch: object; malformed: string };
  for (const [body, expected] of [[errors.rpcError, 'moz_jsonrpc_error'], [errors.idMismatch, 'moz_response_id_mismatch'], [errors.malformed, 'moz_response_malformed']] as const) {
    const result = await fetchMozAuthorityMetrics('example.test', base(async () => new Response(200, typeof body === 'string' ? body : JSON.stringify(body)), { requestId: () => 'req-error' })); assert.equal(result.reason, expected);
  }
});

test('maps HTTP, retry, timeout, abort, redaction, and missing credential behavior', async () => {
  for (const [status, reason] of [[400, 'moz_http_unavailable'], [401, 'moz_auth_unavailable'], [402, 'moz_quota_unavailable'], [403, 'moz_auth_unavailable']] as const) assert.equal((await fetchMozAuthorityMetrics('example.test', base(async () => new Response(status, 'secret-token')))).reason, reason);
  let calls = 0; const waits: number[] = [];
  const retried = await fetchMozAuthorityMetrics('example.test', base(async () => { calls += 1; return calls < 3 ? new Response(429, '', { 'retry-after': calls === 1 ? '2' : '-1' }) : new Response(200, fixtures['site-metrics.json']); }, { delay: async ms => { waits.push(ms); } }));
  assert.equal(retried.status, 'ok'); assert.equal(retried.httpAttempts, 3); assert.deepEqual(waits, [2000, 1000]);
  const secretResult = await fetchMozAuthorityMetrics('example.test', base(async () => { throw new Error('secret-token'); })); assert.equal(JSON.stringify(secretResult).includes('secret-token'), false);
  let missingCalls = 0; const unavailable = await fetchMozAuthorityMetrics('example.test', base(async () => { missingCalls += 1; return new Response(200, ''); }, { token: '  ' })); assert.equal(unavailable.reason, 'moz_credentials_missing'); assert.equal(missingCalls, 0);
  const controller = new AbortController(); controller.abort(); const aborted = await fetchMozAuthorityMetrics('example.test', base(async () => new Response(200, ''), { signal: controller.signal })); assert.equal(aborted.reason, 'moz_aborted');
});

test('uses the fixed attempt timeout and caps retryable HTTP attempts at three', async () => {
  const originalSetTimeout = global.setTimeout;
  try {
    global.setTimeout = ((callback: () => void) => { queueMicrotask(callback); return {} as ReturnType<typeof setTimeout>; }) as typeof setTimeout;
    const timedOut = await fetchMozAuthorityMetrics('example.test', base(async (_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('transport detail')), { once: true }))));
    assert.equal(timedOut.reason, 'moz_timeout'); assert.equal(timedOut.httpAttempts, 1);
  } finally { global.setTimeout = originalSetTimeout; }
  let calls = 0;
  const exhausted = await fetchMozAuthorityMetrics('example.test', base(async () => { calls += 1; return new Response(503, 'provider prose'); }));
  assert.equal(exhausted.reason, 'moz_provider_unavailable'); assert.equal(exhausted.httpAttempts, 3); assert.equal(calls, 3);
});

test('posts only the sanitized request contract and rejects invalid batch input before transport', async () => {
  let calls = 0;
  const result = await fetchMozAuthorityMetrics('EXAMPLE.test', base(async (url, init) => {
    calls += 1; assert.equal(url, 'https://api.moz.com/jsonrpc'); assert.deepEqual(init.headers, { 'content-type': 'application/json', 'x-moz-token': 'secret-token' }); assert.equal(init.method, 'POST'); assert.equal(JSON.parse(init.body).params.data.site_query.query, 'https://example.test/');
    return new Response(200, fixtures['site-metrics.json']);
  }));
  assert.equal(result.status, 'ok'); assert.equal(calls, 1);
  for (const input of [[], ['one.test', 'invalid'], Array.from({ length: 11 }, (_, index) => `host-${index}.test`)]) {
    const invalid = await fetchMozAuthorityBatch(input, { ...base(async () => { throw new Error('must not fetch'); }), approvedMozCalls: 1 });
    assert.equal(invalid.status, 'invalid_input'); assert.equal(invalid.operations, 0); assert.equal(invalid.httpAttempts, 0);
  }
  for (const approval of [undefined, -1, 1.5, 11] as const) {
    const invalid = await fetchMozAuthorityBatch(['one.test'], { ...base(async () => { throw new Error('must not fetch'); }), approvedMozCalls: approval as number });
    assert.equal(invalid.status, 'approval_required');
  }
});

test('batch validates approval/input and preserves order, cap, auth stop, and accounting', async () => {
  const noApproval = await fetchMozAuthorityBatch(['one.test'], { ...base(async () => new Response(200, fixtures['site-metrics.json'])), approvedMozCalls: 0 }); assert.equal(noApproval.status, 'approval_required'); assert.equal(noApproval.operations, 0);
  const invalid = await fetchMozAuthorityBatch(['one.test', 'one.test'], { ...base(async () => new Response(200, fixtures['site-metrics.json'])), approvedMozCalls: 2 }); assert.equal(invalid.status, 'invalid_input');
  let active = 0; let maxActive = 0; const names: string[] = [];
  const partial = await fetchMozAuthorityBatch(['one.test', 'two.test', 'three.test'], { ...base(async (_url, init) => { active += 1; maxActive = Math.max(maxActive, active); names.push(JSON.parse(String(init.body)).params.data.site_query.query); active -= 1; return new Response(200, fixtures['site-metrics.json']); }), approvedMozCalls: 2 });
  assert.equal(partial.status, 'partial'); assert.equal(partial.operations, 2); assert.equal(partial.httpAttempts, 2); assert.equal(maxActive, 1); assert.deepEqual(names, ['https://one.test/', 'https://two.test/']); assert.equal(partial.skipped[0]?.reason, 'approval_cap_reached');
  const stopped = await fetchMozAuthorityBatch(['one.test', 'two.test'], { ...base(async () => new Response(401, '')), approvedMozCalls: 2 }); assert.equal(stopped.results.length, 1); assert.equal(stopped.skipped[0]?.reason, 'moz_auth_unavailable');
});
