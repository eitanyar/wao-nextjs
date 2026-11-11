import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FraudBlockerApiError,
  createFraudBlockerClient,
  ensureFraudBlockerDomain,
  normalizeFraudBlockerDomain,
} from './client';

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('client sends api_key header and only documented endpoints', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createFraudBlockerClient({
    apiKey: 'test-key',
    baseUrl: 'https://adapter.test/api/',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return response(200, { domains: [{ sid: 'sid_1', domain_name: 'example.com', is_archived: false }] });
    },
  });

  assert.deepEqual(await client.listDomains(), [{ sid: 'sid_1', domain: 'example.com', archived: false }]);
  await client.listIps();
  await client.getClickReport();
  await client.deleteDomain('sid_1');
  await client.createDomain('example.com');

  assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/api/domains', '/api/ips', '/api/bigquery/click-report', '/api/domains/sid_1', '/api/domains']);
  assert.equal((calls[0].init?.headers as Record<string, string>).api_key, 'test-key');
  assert.equal(calls[3].init?.method, 'DELETE');
  assert.equal(calls[4].init?.method, 'POST');
});

test('domain normalization strips URL details and rejects invalid hosts', () => {
  assert.equal(normalizeFraudBlockerDomain(' HTTPS://WWW.Example.COM/a?x=1 '), 'example.com');
  assert.equal(normalizeFraudBlockerDomain('www.sub.example.co.uk'), 'sub.example.co.uk');
  for (const value of ['', 'https://example.com:8443', 'https://exa_mple.com', 'https://127.0.0.1', 'https://example.com@bad.test']) {
    assert.throws(() => normalizeFraudBlockerDomain(value));
  }
});

test('ensure domain returns an existing matching SID without posting', async () => {
  let posted = false;
  const client = createFraudBlockerClient({
    apiKey: 'test-key',
    fetchImpl: async (url, init) => {
      if (init?.method === 'POST') posted = true;
      assert.equal(String(url), 'https://backend.fraudblocker.com/api/domains');
      return response(200, { domains: [{ sid: 'existing_1', domain_name: 'example.com', is_archived: false }] });
    },
  });

  assert.equal(await ensureFraudBlockerDomain(client, 'www.example.com'), 'existing_1');
  assert.equal(posted, false);
});

test('ensure domain provisions a new domain and returns its SID', async () => {
  let listCalls = 0;
  let body = '';
  const client = createFraudBlockerClient({
    apiKey: 'test-key',
    fetchImpl: async (_url, init) => {
      if (init?.method === 'POST') {
        body = String(init.body);
        return response(200, { sid: 'created_1', domain_name: 'example.com', status: 'created' });
      }
      listCalls += 1;
      return response(200, listCalls === 1 ? { domains: [] } : { domains: [{ sid: 'created_1', domain_name: 'example.com', is_archived: false }] });
    },
  });

  assert.equal(await ensureFraudBlockerDomain(client, 'HTTPS://WWW.Example.com/path'), 'created_1');
  assert.equal(body, '{"domain_name":"example.com"}');
});

test('ensure domain posts new domains and resolves a conflict by re-listing', async () => {
  let listCalls = 0;
  const client = createFraudBlockerClient({
    apiKey: 'test-key',
    fetchImpl: async (_url, init) => {
      if (init?.method === 'POST') return response(409, { message: 'already exists' });
      listCalls += 1;
      return response(200, listCalls === 1 ? { domains: [] } : { domains: [{ sid: 'conflict_1', domain_name: 'example.com', is_archived: false }] });
    },
  });

  assert.equal(await ensureFraudBlockerDomain(client, 'example.com'), 'conflict_1');
});

test('ensure domain retries archived domains through provisioning and returns restored SID', async () => {
  let listCalls = 0;
  const client = createFraudBlockerClient({
    apiKey: 'test-key',
    fetchImpl: async (_url, init) => {
      if (init?.method === 'POST') return response(200, { sid: 'restored_1', domain_name: 'example.com', status: 'restored' });
      listCalls += 1;
      return response(200, listCalls === 1
        ? { domains: [{ sid: 'archived_1', domain_name: 'example.com', is_archived: true }] }
        : { domains: [{ sid: 'restored_1', domain_name: 'example.com', is_archived: false }] });
    },
  });

  assert.equal(await ensureFraudBlockerDomain(client, 'example.com'), 'restored_1');
});

// Fixture shaped like the live GET /domains response (2026-11-11) and the
// OpenAPI `DomainCreated` schema at docs.fraudblocker.com.
const LIVE_DOMAIN_LIST = {
  domains: [
    { sid: 'eTWPFP1d2UDBMLFQDRwYy', domain_name: 'wao.co.il', is_archived: false, created_on: '2023-01-09T10:38:42.929Z' },
    { sid: '8uD9jgVgGoJcSA7QRHoHH', domain_name: 'merlo-c.co.il', is_archived: false, created_on: '2023-01-25T08:24:37.644Z' },
    { sid: '-GRcf6hthQQQBS3LQ_dUI', domain_name: 'dan.wao.co.il', is_archived: false, created_on: '2025-12-10T14:09:41.530Z' },
  ],
};

test('listDomains parses the live API shape (domain_name, is_archived, created_on)', async () => {
  const client = createFraudBlockerClient({ apiKey: 'test-key', fetchImpl: async () => response(200, LIVE_DOMAIN_LIST) });
  const domains = await client.listDomains();
  assert.equal(domains.length, 3);
  assert.deepEqual(domains[2], { sid: '-GRcf6hthQQQBS3LQ_dUI', domain: 'dan.wao.co.il', archived: false, createdOn: '2025-12-10T14:09:41.530Z' });
});

test('ensure domain resolves after a real-shape create without invalid_response', async () => {
  const created = { sid: 'V1StGXR8_Z5jdHi6B-myT', domain_name: 'test-plumber-tlv.wao.co.il', status: 'created' };
  for (const relistIncludesNew of [true, false]) {
    let listCalls = 0;
    let body = '';
    const client = createFraudBlockerClient({
      apiKey: 'test-key',
      fetchImpl: async (_url, init) => {
        if (init?.method === 'POST') {
          body = String(init.body);
          return response(200, created);
        }
        listCalls += 1;
        if (listCalls === 1 || !relistIncludesNew) return response(200, LIVE_DOMAIN_LIST);
        return response(200, { domains: [...LIVE_DOMAIN_LIST.domains, { ...created, status: undefined, is_archived: false, created_on: '2026-11-11T10:00:00.000Z' }] });
      },
    });
    assert.equal(await ensureFraudBlockerDomain(client, 'test-plumber-tlv.wao.co.il'), 'V1StGXR8_Z5jdHi6B-myT');
    assert.equal(body, '{"domain_name":"test-plumber-tlv.wao.co.il"}');
  }
});

test('provider limit and rate limit errors are explicit and sanitized', async () => {
  for (const [status, code] of [[401, 'unauthorized'], [402, 'plan_limit'], [429, 'rate_limited']] as const) {
    const client = createFraudBlockerClient({ apiKey: 'private-key', fetchImpl: async () => response(status, { error: 'private-key should not appear' }) });
    await assert.rejects(client.listDomains(), (error: unknown) => {
      assert.ok(error instanceof FraudBlockerApiError);
      assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /private-key/);
      return true;
    });
  }
});
