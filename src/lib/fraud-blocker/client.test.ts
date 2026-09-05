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
      return response(200, { domains: [{ sid: 'sid_1', domain: 'example.com' }] });
    },
  });

  assert.deepEqual(await client.listDomains(), [{ sid: 'sid_1', domain: 'example.com' }]);
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
      return response(200, { domains: [{ sid: 'existing_1', domain: 'example.com' }] });
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
        return response(201, { sid: 'created_1', domain: 'example.com' });
      }
      listCalls += 1;
      return response(200, listCalls === 1 ? { domains: [] } : { domains: [{ sid: 'created_1', domain: 'example.com' }] });
    },
  });

  assert.equal(await ensureFraudBlockerDomain(client, 'HTTPS://WWW.Example.com/path'), 'created_1');
  assert.equal(body, '{"domain":"example.com"}');
});

test('ensure domain posts new domains and resolves a conflict by re-listing', async () => {
  let listCalls = 0;
  const client = createFraudBlockerClient({
    apiKey: 'test-key',
    fetchImpl: async (_url, init) => {
      if (init?.method === 'POST') return response(409, { message: 'already exists' });
      listCalls += 1;
      return response(200, listCalls === 1 ? { domains: [] } : { domains: [{ sid: 'conflict_1', domain: 'example.com' }] });
    },
  });

  assert.equal(await ensureFraudBlockerDomain(client, 'example.com'), 'conflict_1');
});

test('ensure domain retries archived domains through provisioning and returns restored SID', async () => {
  let listCalls = 0;
  const client = createFraudBlockerClient({
    apiKey: 'test-key',
    fetchImpl: async (_url, init) => {
      if (init?.method === 'POST') return response(200, { sid: 'restored_1', domain: 'example.com' });
      listCalls += 1;
      return response(200, listCalls === 1
        ? { domains: [{ sid: 'archived_1', domain: 'example.com', status: 'archived' }] }
        : { domains: [{ sid: 'restored_1', domain: 'example.com', status: 'active' }] });
    },
  });

  assert.equal(await ensureFraudBlockerDomain(client, 'example.com'), 'restored_1');
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
