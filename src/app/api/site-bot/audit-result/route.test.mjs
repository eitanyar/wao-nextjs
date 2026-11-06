import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/audit-result/route.ts');
const auditId = '123e4567-e89b-42d3-a456-426614174000';
const cacheControl = 'private, no-store';
const candidates = [
  { placeId: 'synthetic-place-1', displayName: 'Synthetic One', formattedAddress: 'Synthetic Address 1', privateProviderField: 'must-not-leak' },
  { placeId: 'synthetic-place-2', displayName: 'Synthetic Two', formattedAddress: 'Synthetic Address 2', privateProviderField: 'must-not-leak' },
];

function routeHarness({ record = null, allowed = true, throwAt = null } = {}) {
  const calls = [];
  const errors = [];
  const imports = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/payments/rate-limit': { checkRateLimit: (key, options) => {
      calls.push('rate');
      assert.equal(key, 'audit-result:192.0.2.1');
      assert.equal(options.maxRequests, 20);
      assert.equal(options.windowMs, 10 * 60 * 1000);
      if (throwAt === 'rate') throw new Error('synthetic raw rate error');
      return { allowed };
    } },
    '@/lib/gbp/auditScore': { scoreAudit: candidate => {
      calls.push('score');
      assert.ok(candidates.includes(candidate));
      if (throwAt === 'score') throw new Error('synthetic raw score error');
      return { total: 77 };
    } },
    '@/lib/site-bot/auditStore': {
      UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      readAuditRecord: async id => {
        calls.push('read');
        assert.equal(id, auditId);
        if (throwAt === 'read') throw new Error('synthetic raw read error');
        return record;
      },
    },
  };
  const code = ts.transpileModule(fs.readFileSync(routePath, 'utf8'), {
    fileName: routePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
      return imports[name];
    },
    URL,
    fetch: () => { throw new Error('unexpected network access'); },
    console: { error: (...args) => errors.push(args) },
  }, { filename: routePath });
  async function get({ id = auditId, placeId = null, malformedUrl = false } = {}) {
    const url = malformedUrl ? 'not a URL synthetic raw input' :
      `https://example.invalid/api/site-bot/audit-result${id === null ? '' : `?auditId=${encodeURIComponent(id)}`}${placeId === null ? '' : `${id === null ? '?' : '&'}placeId=${encodeURIComponent(placeId)}`}`;
    const response = await exports.GET({
      get url() { calls.push('url'); return url; },
      headers: { get: name => {
        calls.push('headers');
        assert.equal(name, 'x-forwarded-for');
        return '192.0.2.1, 198.51.100.2';
      } },
    });
    assert.equal(response.headers.get('Cache-Control'), cacheControl, `GET ${response.status}`);
    return { status: response.status, body: await response.json() };
  }
  return { get, calls, errors };
}

const ready = candidate => ({ status: 'ready', businessName: candidate.displayName, formattedAddress: candidate.formattedAddress, score: { total: 77 }, placeId: candidate.placeId });

test('invalid or absent audit ID returns original 400 before rate limit and storage', async () => {
  for (const id of [null, '', 'outside', '../outside', `${auditId}extra`]) {
    const harness = routeHarness();
    assert.deepEqual(await harness.get({ id }), { status: 400, body: { error: 'invalid_input' } });
    assert.deepEqual(harness.calls, ['url']);
    assert.deepEqual(harness.errors, []);
  }
});

test('rate limited valid request returns 429 without storage or scoring', async () => {
  const harness = routeHarness({ allowed: false });
  assert.deepEqual(await harness.get(), { status: 429, body: { error: 'rate_limited' } });
  assert.deepEqual(harness.calls, ['url', 'headers', 'rate']);
});

test('absent audit record returns 404 after the rate limit', async () => {
  const harness = routeHarness();
  assert.deepEqual(await harness.get(), { status: 404, body: { error: 'not_found' } });
  assert.deepEqual(harness.calls, ['url', 'headers', 'rate', 'read']);
});

test('missing selected candidate returns 404 without scoring', async () => {
  const harness = routeHarness({ record: { candidates } });
  assert.deepEqual(await harness.get({ placeId: 'synthetic-missing' }), { status: 404, body: { error: 'not_found' } });
  assert.deepEqual(harness.calls, ['url', 'headers', 'rate', 'read']);
});

test('empty candidate list returns original 200 not_found shape without scoring', async () => {
  const harness = routeHarness({ record: { candidates: [] } });
  assert.deepEqual(await harness.get(), { status: 200, body: { status: 'not_found' } });
  assert.deepEqual(harness.calls, ['url', 'headers', 'rate', 'read']);
});

test('single candidate returns minimized ready result with scoring after storage', async () => {
  const harness = routeHarness({ record: { candidates: [candidates[0]], privateRecordField: 'must-not-leak' } });
  assert.deepEqual(await harness.get(), { status: 200, body: ready(candidates[0]) });
  assert.deepEqual(harness.calls, ['url', 'headers', 'rate', 'read', 'score']);
});

test('selected candidate among multiple returns only selected ready result', async () => {
  const harness = routeHarness({ record: { candidates } });
  assert.deepEqual(await harness.get({ placeId: candidates[1].placeId }), { status: 200, body: ready(candidates[1]) });
  assert.deepEqual(harness.calls, ['url', 'headers', 'rate', 'read', 'score']);
});

test('multiple candidates return minimized pick fields and never score', async () => {
  const harness = routeHarness({ record: { candidates, privateRecordField: 'must-not-leak' } });
  assert.deepEqual(await harness.get(), { status: 200, body: {
    status: 'pick',
    candidates: candidates.map(({ placeId, displayName, formattedAddress }) => ({ placeId, displayName, formattedAddress })),
  } });
  assert.deepEqual(harness.calls, ['url', 'headers', 'rate', 'read']);
});

test('malformed URL and throwing adapters return private 500 with bounded code-only logging', async () => {
  for (const [throwAt, expectedCalls, request] of [
    [null, ['url'], { malformedUrl: true }],
    ['rate', ['url', 'headers', 'rate'], {}],
    ['read', ['url', 'headers', 'rate', 'read'], {}],
    ['score', ['url', 'headers', 'rate', 'read', 'score'], {}],
  ]) {
    const harness = routeHarness({ record: { candidates: [candidates[0]] }, throwAt });
    assert.deepEqual(await harness.get(request), { status: 500, body: { error: 'server_error' } });
    assert.deepEqual(harness.calls, expectedCalls);
    assert.deepEqual(harness.errors, [['AUDIT_RESULT_FAILED']]);
  }
});
