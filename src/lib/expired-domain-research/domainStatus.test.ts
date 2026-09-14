import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { assessDomainStatus, loadRdapBootstrap, probeDns, probeHttp, probeRdap, resolveRdapBaseUrl } from './domainStatus';
import type { DnsResolver, DomainStatusDependencies, StatusResponse } from './domainStatus';

class Response implements StatusResponse {
  readonly headers: { get(name: string): string | null };
  constructor(readonly status: number, private readonly body = '', values: Record<string, string> = {}) { this.headers = { get: (name: string) => values[name.toLowerCase()] ?? null }; }
  async text(): Promise<string> { return this.body; }
}
const fixture = (name: string): string => fs.readFileSync(path.join(process.cwd(), 'fixtures', 'expired-domain-research', 'domain-status', name), 'utf8');
const bootstrapBody = fixture('rdap-bootstrap.json');
const registeredBody = fixture('rdap-registered.json');
const missingBody = fixture('rdap-not-found.json');
const dnsCases = JSON.parse(fixture('dns-cases.json')) as Record<string, { code?: string; A?: string[] }>;
const parkingBody = fixture('http-parking.html');
const activeBody = fixture('http-active.html');
const error = (code: string): Error & { code: string } => Object.assign(new Error(code), { code });
function resolver(overrides: Partial<DnsResolver> = {}): DnsResolver {
  const absent = async (): Promise<never> => { throw error(dnsCases.nxdomain.code ?? 'ENOTFOUND'); };
  return { resolve4: absent, resolve6: absent, resolveCname: absent, resolveNs: absent, resolveMx: absent, resolveSoa: absent, lookup: async () => [{ address: '8.8.8.8', family: 4 }], ...overrides };
}
interface ProbeResponses { bootstrap?: StatusResponse; rdap?: StatusResponse[]; http?: StatusResponse[]; }
function deps(responses: ProbeResponses = {}, dns: DnsResolver = resolver(), day = 1): DomainStatusDependencies {
  const rdap = [...(responses.rdap ?? [])]; const http = [...(responses.http ?? [])];
  return { fetch: async (url, init) => {
    if (url === 'https://data.iana.org/rdap/dns.json') return responses.bootstrap ?? new Response(500);
    if (init.headers?.Accept === 'application/rdap+json') return rdap.shift() ?? new Response(500);
    return http.shift() ?? new Response(500);
  }, dns, now: () => new Date(`2026-02-${String(day).padStart(2, '0')}T00:00:00.000Z`), delay: async () => {} };
}

test('fixtures are ASCII-only and consumed through injected doubles', () => {
  for (const name of ['rdap-bootstrap.json', 'rdap-registered.json', 'rdap-not-found.json', 'dns-cases.json', 'http-parking.html', 'http-active.html']) assert.doesNotMatch(fixture(name), /[^\x00-\x7f]/u);
  assert.equal(JSON.parse(bootstrapBody).version, '1');
  assert.equal(JSON.parse(missingBody).errorCode, 404);
});

test('normalizes IDN A-labels and rejects malformed transport inputs', async () => {
  const captured: string[] = [];
  const input = deps({ bootstrap: new Response(200, bootstrapBody), rdap: [new Response(200, registeredBody)] });
  input.fetch = async url => { captured.push(url); return captured.length === 1 ? new Response(200, bootstrapBody) : new Response(200, registeredBody); };
  const result = await probeRdap('b\u00fccher.test', input);
  assert.equal(result.status, 'registered'); assert.match(result.provenance, /xn--bcher-kva/u);
  for (const value of ['localhost', 'one', 'http://x.test', 'user@x.test', 'x.test:443', '127.0.0.1', 'x.test/path']) await assert.rejects(() => probeHttp(value, input));
});

test('validates IANA bootstrap, caches for 24 hours, and chooses longest suffix', async () => {
  const bootstrap = JSON.stringify({ version: '1', publication: '2026-01-01T00:00:00Z', services: [[['test'], ['https://rdap.example.test/']], [['com'], ['https://short.test/']], [['example.com'], ['https://long.test/']] ] });
  let calls = 0; let current = new Date('2027-01-01T00:00:00.000Z');
  const input = { ...deps({}, resolver()), now: () => current, fetch: async () => { calls += 1; return new Response(200, bootstrap); } };
  const first = await loadRdapBootstrap(input); const second = await loadRdapBootstrap(input);
  assert.equal(first.status, 'available'); assert.equal(second.status, 'available'); assert.equal(calls <= 1, true);
  assert.equal(resolveRdapBaseUrl('a.example.com', JSON.parse(bootstrap)), 'https://long.test/');
  const unavailable = await loadRdapBootstrap({ ...input, now: () => new Date(current.getTime() + 25 * 60 * 60 * 1000), fetch: async () => new Response(500) });
  assert.equal(unavailable.status, 'unavailable'); current = new Date(current.getTime() + 1);
});

test('keeps unsupported TLD evidence unknown', async () => {
  const result = await assessDomainStatus('example.co.il', deps({ bootstrap: new Response(200, bootstrapBody) }, resolver(), 3));
  assert.equal(result.rdap.status, 'unsupported'); assert.equal(result.availability, 'unknown');
});

test('classifies only the required active parked inactive and unregistered conjunctions', async () => {
  const cases: Array<{ name: string; responses: ProbeResponses; dns: DnsResolver; expected: string }> = [
    { name: 'active', responses: { bootstrap: new Response(200, bootstrapBody), rdap: [new Response(200, registeredBody)], http: [new Response(405), new Response(200, activeBody)] }, dns: resolver({ resolve4: async () => ['8.8.8.8'] }), expected: 'registered_active' },
    { name: 'parked', responses: { bootstrap: new Response(200, bootstrapBody), rdap: [new Response(200, registeredBody)], http: [new Response(405), new Response(200, parkingBody)] }, dns: resolver({ resolve4: async () => ['8.8.8.8'] }), expected: 'registered_parked' },
    { name: 'inactive', responses: { bootstrap: new Response(200, bootstrapBody), rdap: [new Response(200, registeredBody)], http: [new Response(500)] }, dns: resolver({ resolve4: async () => ['8.8.8.8'] }), expected: 'registered_inactive' },
    { name: 'unregistered', responses: { bootstrap: new Response(200, bootstrapBody), rdap: [new Response(404, missingBody)], http: [new Response(500)] }, dns: resolver(), expected: 'unregistered_signal' },
  ];
  for (const item of cases) { const result = await assessDomainStatus(`${item.name}.test`, deps(item.responses, item.dns, 4)); assert.equal(result.availability, item.expected, item.name); }
});

test('preserves DNS record, NXDOMAIN, timeout, SERVFAIL, and no-data evidence', async () => {
  const records = await probeDns('records.test', deps({}, resolver({ resolve4: async () => dnsCases.records.A ?? [] }), 5));
  assert.equal(records.status, 'records_present'); assert.equal(records.records.A, 1);
  const timeout = await probeDns('timeout.test', deps({}, resolver({ resolve4: async () => { throw error(dnsCases.timeout.code ?? 'ETIMEOUT'); } }), 5));
  assert.equal(timeout.status, 'timeout');
  const servfail = await probeDns('servfail.test', deps({}, resolver({ resolve4: async () => { throw error(dnsCases.servfail.code ?? 'ESERVFAIL'); } }), 5));
  assert.equal(servfail.status, 'servfail');
});

test('retries RDAP only for 429 or server errors and honors Retry-After', async () => {
  const waits: number[] = [];
  const input = deps({ bootstrap: new Response(200, bootstrapBody), rdap: [new Response(429, '', { 'retry-after': '2' }), new Response(503), new Response(200, registeredBody)] }, resolver(), 6);
  input.delay = async value => { waits.push(value); };
  const result = await probeRdap('retry.test', input);
  assert.equal(result.status, 'registered'); assert.deepEqual(waits, [2000, 1000]);
});

test('fails closed on RDAP cross-origin redirect and has no retained provider body or PII', async () => {
  const result = await probeRdap('redirect.test', deps({ bootstrap: new Response(200, bootstrapBody), rdap: [new Response(302, '', { location: 'https://escape.test/' })] }, resolver(), 7));
  assert.equal(result.status, 'unavailable'); assert.equal(JSON.stringify(result).includes('private@example.test'), false); assert.equal(JSON.stringify(result).includes('vcardArray'), false);
});

test('blocks loopback private reserved documentation and mixed DNS addresses before HTTP fetch', async () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '203.0.113.1', '2001:db8::1']) {
    let calls = 0; const result = await probeHttp('unsafe.test', { ...deps({}, resolver({ lookup: async () => [{ address, family: 4 }] }), 8), fetch: async () => { calls += 1; return new Response(200); } });
    assert.equal(result.status, 'blocked_private_address'); assert.equal(calls, 0);
  }
  const mixed = await probeHttp('mixed.test', deps({}, resolver({ lookup: async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }] }), 8));
  assert.equal(mixed.status, 'blocked_private_address');
});

test('uses HEAD then capped GET, validates redirect destinations, and retains no HTTP body', async () => {
  const methods: string[] = [];
  const result = await probeHttp('parking.test', { ...deps({}, resolver(), 9), fetch: async (_url, init) => { methods.push(init.method ?? 'GET'); return methods.length === 1 ? new Response(405) : new Response(200, parkingBody.repeat(3000)); } });
  assert.equal(result.status, 'reachable'); assert.equal(result.parkingSignature, true); assert.equal(methods.join(','), 'HEAD,GET'); assert.equal(JSON.stringify(result).includes('domain for sale'), false);
  const unsafe = await probeHttp('redirect.test', deps({ http: [new Response(302, '', { location: 'http://private.test:8080/' })] }, resolver(), 9));
  assert.equal(unsafe.status, 'unsafe_redirect');
});

test('returns unknown for contradictory evidence and keeps deterministic reason and provenance ordering', async () => {
  const input = deps({ bootstrap: new Response(200, bootstrapBody), rdap: [new Response(404, missingBody)], http: [new Response(404)] }, resolver({ resolve4: async () => ['8.8.8.8'] }), 10);
  const result = await assessDomainStatus('contradiction.test', input);
  assert.equal(result.availability, 'unknown'); assert.deepEqual(result.reasons, [...result.reasons].sort()); assert.deepEqual(result.evidenceIds, [...result.evidenceIds].sort()); assert.equal(result.purchaseCertainty, 'not_determined'); assert.equal(result.riskGates[0].id, 'registrar_check_required'); assert.equal(result.evidenceIds.length, 3);
});

test('fails malformed bootstrap documents closed without treating them as an empty success', async () => {
  const result = await loadRdapBootstrap({ ...deps({}, resolver()), now: () => new Date('2030-01-01T00:00:00.000Z'), fetch: async () => new Response(200, '{"version":"1","publication":"2026-01-01T00:00:00Z","services":[[[],[]]]}') });
  assert.equal(result.status, 'unavailable'); assert.equal(result.bootstrap, null);
});

test('follows only same-origin RDAP redirects and stops exhausted retry responses', async () => {
  let rdapCalls = 0;
  const redirected = await probeRdap('redirected.test', { ...deps({}, resolver()), now: () => new Date('2031-01-01T00:00:00.000Z'), fetch: async (_url, init) => {
    if (init.headers?.Accept === 'application/json') return new Response(200, bootstrapBody);
    rdapCalls += 1; return rdapCalls === 1 ? new Response(302, '', { location: '/rdap/domain/redirected.test' }) : new Response(200, registeredBody);
  } });
  assert.equal(redirected.status, 'registered');
  const exhausted = await probeRdap('exhausted.test', { ...deps({ bootstrap: new Response(200, bootstrapBody), rdap: [new Response(503), new Response(503), new Response(503)] }, resolver()), now: () => new Date('2032-01-01T00:00:00.000Z') });
  assert.equal(exhausted.status, 'unavailable');
});

test('enforces HTTP redirect ceiling and rejects additional reserved address ranges', async () => {
  const limit = await probeHttp('limit.test', { ...deps({}, resolver(), 11), fetch: async () => new Response(302, '', { location: 'https://limit.test/next' }) });
  assert.equal(limit.status, 'unsafe_redirect');
  for (const address of ['192.88.99.1', '::ffff:127.0.0.1', 'fe90::1']) {
    const result = await probeHttp('reserved.test', { ...deps({}, resolver({ lookup: async () => [{ address, family: 6 }] }), 12), fetch: async () => new Response(200) });
    assert.equal(result.status, 'blocked_private_address');
  }
});
