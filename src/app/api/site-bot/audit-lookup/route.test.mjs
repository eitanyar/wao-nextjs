import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/audit-lookup/route.ts');
const auditId = '123e4567-e89b-42d3-a456-426614174000';
const place = {
  placeId: 'synthetic-place', displayName: 'Synthetic Place', formattedAddress: 'Synthetic Address',
  types: ['store'], regularOpeningHours: { periods: [{}] }, specialOpeningHours: [],
  internationalPhoneNumber: 'synthetic-phone', websiteUri: 'https://example.invalid',
  photos: { fetched: true, count: 2 }, rating: 4, userRatingCount: 5,
  editorialSummary: 'Synthetic summary', privateProviderField: 'must-not-store',
};
const snapshot = {
  placeId: 'synthetic-place', displayName: 'Synthetic Place', formattedAddress: 'Synthetic Address',
  types: ['store'], hasRegularOpeningHours: true, hasSpecialOpeningHours: false,
  hasPhone: true, hasWebsite: true, photosFetched: true, photoCount: 2,
  hasRating: true, userRatingCount: 5, hasEditorialSummary: true,
};

function routeHarness({ allowed = true, key = true, stored = true, candidates = [place], throwAt = null,
  budget = 'reserved', ceiling = '8', dbPath = '/synthetic/budget.sqlite' } = {}) {
  const calls = [];
  const errors = [];
  const streamState = { reads: 0, cancelled: false };
  let saved;
  const fail = step => {
    if (throwAt === step) throw new Error(`synthetic raw ${step} error`);
  };
  const imports = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    crypto: { randomUUID: () => { calls.push('uuid'); fail('uuid'); return auditId; } },
    '@/lib/payments/rate-limit': { checkRateLimit: (rateKey, options) => {
      calls.push('rate');
      assert.equal(rateKey, 'audit-lookup:192.0.2.1');
      assert.deepEqual({ ...options }, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
      fail('rate');
      return { allowed };
    } },
    '@/lib/places/client': {
      hasPlacesKey: () => { calls.push('key'); fail('key'); return key; },
      searchPlacesByName: async options => {
        calls.push('search');
        assert.deepEqual({ ...options }, { name: saved });
        fail('search');
        return candidates;
      },
    },
    '@/lib/site-bot/auditLookupBudget': {
      parseSiteBotAuditDailyCeiling: value => {
        calls.push('parse');
        assert.equal(value, ceiling === null ? undefined : ceiling);
        fail('parse');
        return typeof value === 'string' && /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
      },
      openSiteBotAuditLookupBudget: value => {
        calls.push('open');
        assert.equal(value, dbPath);
        fail('open');
        return { fixture: true };
      },
      reserveSiteBotAuditLookup: (store, value) => {
        calls.push('reserve');
        assert.equal(store.fixture, true);
        assert.equal(value, Number(ceiling));
        fail('reserve');
        return { status: budget };
      },
      closeSiteBotAuditLookupBudget: store => {
        calls.push('close');
        assert.equal(store.fixture, true);
        fail('close');
      },
    },
    '@/lib/site-bot/auditStore': {
      purgeExpiredAuditRecords: async () => { calls.push('purge'); fail('purge'); },
      writeAuditRecord: async (id, record) => {
        calls.push('write');
        assert.equal(id, auditId);
        assert.equal(record.query.businessName, saved);
        assert.ok(!Number.isNaN(Date.parse(record.fetchedAt)));
        assert.deepEqual(JSON.parse(JSON.stringify(record.candidates)), candidates.map(() => snapshot));
        fail('write');
        return stored;
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
    Date,
    TextDecoder,
    Uint8Array,
    process: { env: { SITE_BOT_AUDIT_DAILY_CALL_CEILING: ceiling === null ? undefined : ceiling,
      SITE_BOT_AUDIT_BUDGET_DB_PATH: dbPath === null ? undefined : dbPath } },
    fetch: () => { throw new Error('unexpected network access'); },
    console: { error: (...args) => errors.push(args) },
  }, { filename: routePath });
  async function post({ body = { businessName: ' Synthetic Place ' }, raw, chunks, malformed = false,
    contentLength, streamError = false, noBody = false } = {}) {
    saved = typeof body?.businessName === 'string' ? body.businessName.trim() : '';
    const bytes = raw ?? new TextEncoder().encode(malformed ? '{bad' : JSON.stringify(body));
    const parts = chunks ?? [bytes];
    let index = 0;
    const stream = new ReadableStream({
      pull(controller) {
        streamState.reads++;
        if (index < parts.length) controller.enqueue(parts[index++]);
        else if (streamError) controller.error(new Error('synthetic stream error'));
        else controller.close();
      },
      cancel() { streamState.cancelled = true; },
    }, { highWaterMark: 0 });
    const request = new Request('https://example.invalid/api/site-bot/audit-lookup', {
      method: 'POST', ...(noBody ? {} : { body: stream, duplex: 'half' }),
      headers: { 'x-forwarded-for': '192.0.2.1, 198.51.100.2',
        ...(contentLength === undefined ? {} : { 'content-length': contentLength }) },
    });
    const requestBody = request.body;
    const requestHeaders = request.headers;
    Object.defineProperty(request, 'body', { get() { calls.push('body'); return requestBody; } });
    Object.defineProperty(request, 'headers', { get() { calls.push('headers'); return requestHeaders; } });
    const response = await exports.POST(request);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store', `POST ${response.status}`);
    return { status: response.status, body: await response.json() };
  }
  return { post, calls, errors, streamState };
}

test('audit-lookup rejects missing, short, long and non-string names before any adapter', async () => {
  for (const body of [{}, { businessName: ' a ' }, { businessName: 'a'.repeat(81) }, { businessName: 42 }]) {
    const harness = routeHarness();
    assert.deepEqual(await harness.post({ body }), { status: 400, body: { error: 'invalid_input' } });
    assert.deepEqual(harness.calls, ['body']);
    assert.deepEqual(harness.errors, []);
  }
});

test('audit-lookup rejects supplied phone before rate, including empty string', async () => {
  for (const phone of ['', 'synthetic-phone', false]) {
    const harness = routeHarness();
    assert.deepEqual(await harness.post({ body: { businessName: 'Valid', phone } }), { status: 400, body: { error: 'invalid_input' } });
    assert.deepEqual(harness.calls, ['body']);
  }
});

test('audit-lookup rate limit returns 429 before key, purge or search', async () => {
  const harness = routeHarness({ allowed: false });
  assert.deepEqual(await harness.post(), { status: 429, body: { error: 'rate_limited' } });
  assert.deepEqual(harness.calls, ['body', 'headers', 'rate']);
});

test('audit-lookup missing key returns 503 before persistence and provider', async () => {
  const harness = routeHarness({ key: false });
  assert.deepEqual(await harness.post(), { status: 503, body: { error: 'places_not_configured' } });
  assert.deepEqual(harness.calls, ['body', 'headers', 'rate', 'key']);
});

test('audit-lookup failed storage returns 500 after purge, search, UUID and write', async () => {
  const harness = routeHarness({ stored: false });
  assert.deepEqual(await harness.post(), { status: 500, body: { error: 'lookup_failed' } });
  assert.deepEqual(harness.calls, ['body', 'headers', 'rate', 'key', 'parse', 'open', 'reserve', 'close', 'purge', 'search', 'uuid', 'write']);
  assert.deepEqual(harness.errors, [['AUDIT_LOOKUP_STORE_FAILED']]);
});

test('audit-lookup success trims name, minimizes private candidate and returns count only', async () => {
  const harness = routeHarness();
  assert.deepEqual(await harness.post(), { status: 200, body: { auditId, candidateCount: 1 } });
  assert.deepEqual(harness.calls, ['body', 'headers', 'rate', 'key', 'parse', 'open', 'reserve', 'close', 'purge', 'search', 'uuid', 'write']);
  assert.deepEqual(harness.errors, []);
});

test('audit-lookup accepts both 2 and 80 character names and empty candidate result', async () => {
  for (const name of ['ab', 'x'.repeat(80)]) {
    const harness = routeHarness({ candidates: [] });
    assert.deepEqual(await harness.post({ body: { businessName: ` ${name} `, phone: null } }),
      { status: 200, body: { auditId, candidateCount: 0 } });
    assert.deepEqual(harness.calls, ['body', 'headers', 'rate', 'key', 'parse', 'open', 'reserve', 'close', 'purge', 'search', 'uuid', 'write']);
  }
});

test('audit-lookup malformed JSON returns 400 before adapters', async () => {
  const harness = routeHarness();
  assert.deepEqual(await harness.post({ malformed: true }), { status: 400, body: { error: 'invalid_input' } });
  assert.deepEqual(harness.calls, ['body']);
  assert.deepEqual(harness.errors, []);
});

test('audit-lookup throwing adapters return bounded 500 without raw errors', async () => {
  const prefix = ['body', 'headers', 'rate', 'key', 'parse', 'open', 'reserve', 'close', 'purge', 'search', 'uuid', 'write'];
  for (const [throwAt, expected] of [
    ['rate', prefix.slice(0, 3)], ['key', prefix.slice(0, 4)],
    ['parse', prefix.slice(0, 5)], ['purge', prefix.slice(0, 9)], ['search', prefix.slice(0, 10)],
    ['uuid', prefix.slice(0, 11)], ['write', prefix],
  ]) {
    const harness = routeHarness({ throwAt });
    assert.deepEqual(await harness.post(), { status: 500, body: { error: 'lookup_failed' } });
    assert.deepEqual(harness.calls, expected);
    assert.deepEqual(harness.errors, [['AUDIT_LOOKUP_FAILED']]);
  }
});

test('missing or invalid operator budget denies without opening, purging or searching', async () => {
  for (const [ceiling, dbPath] of [
    [null, '/synthetic/budget.sqlite'], ['0', '/synthetic/budget.sqlite'],
    ['9007199254740992', '/synthetic/budget.sqlite'], ['8', null],
  ]) {
    const harness = routeHarness({ ceiling, dbPath });
    assert.deepEqual(await harness.post(), { status: 503, body: { error: 'audit_budget_unavailable' } });
    assert.deepEqual(harness.calls, ['body', 'headers', 'rate', 'key', 'parse']);
    assert.deepEqual(harness.errors, []);
  }
});

test('exhaustion and unavailable storage deny without purge, provider or write access', async () => {
  for (const [budget, status, error] of [
    ['exhausted', 429, 'audit_budget_exhausted'], ['unavailable', 503, 'audit_budget_unavailable'],
  ]) {
    const harness = routeHarness({ budget });
    assert.deepEqual(await harness.post(), { status, body: { error } });
    assert.deepEqual(harness.calls, ['body', 'headers', 'rate', 'key', 'parse', 'open', 'reserve', 'close']);
    assert.deepEqual(harness.errors, []);
  }
  for (const [throwAt, expected] of [
    ['open', ['body', 'headers', 'rate', 'key', 'parse', 'open']],
    ['reserve', ['body', 'headers', 'rate', 'key', 'parse', 'open', 'reserve', 'close']],
    ['close', ['body', 'headers', 'rate', 'key', 'parse', 'open', 'reserve', 'close']],
  ]) {
    const harness = routeHarness({ throwAt });
    assert.deepEqual(await harness.post(), { status: 503, body: { error: 'audit_budget_unavailable' } });
    assert.deepEqual(harness.calls, expected);
    assert.deepEqual(harness.errors, []);
  }
});

test('stream accepts ASCII and multibyte names through the exact byte cap', async () => {
  for (const name of ['Valid', '\u00e9\u00e9']) {
    const harness = routeHarness({ candidates: [] });
    assert.deepEqual(await harness.post({ body: { businessName: name } }),
      { status: 200, body: { auditId, candidateCount: 0 } });
    assert.deepEqual(harness.calls, ['body', 'headers', 'rate', 'key', 'parse', 'open', 'reserve', 'close', 'purge', 'search', 'uuid', 'write']);
  }
  const base = JSON.stringify({ businessName: 'Valid', padding: '' });
  const exact = new TextEncoder().encode(JSON.stringify({ businessName: 'Valid', padding: 'x'.repeat(4096 - base.length) }));
  assert.equal(exact.byteLength, 4096);
  const harness = routeHarness({ candidates: [] });
  assert.deepEqual(await harness.post({ body: { businessName: 'Valid' }, chunks: [exact.subarray(0, 100), exact.subarray(100)] }),
    { status: 200, body: { auditId, candidateCount: 0 } });
  assert.equal(harness.streamState.cancelled, false);
});

test('split cap+1 and forged or absent lengths overflow before every adapter', async () => {
  const oversized = new TextEncoder().encode(JSON.stringify({ businessName: 'Valid', padding: 'x'.repeat(4100) }));
  for (const contentLength of [undefined, '1', '4096']) {
    const harness = routeHarness();
    const chunks = [oversized.subarray(0, 4096), oversized.subarray(4096, 4097), oversized.subarray(4097)];
    assert.deepEqual(await harness.post({ chunks, contentLength }),
      { status: 413, body: { error: 'payload_too_large' } });
    assert.deepEqual(harness.calls, ['body']);
    assert.deepEqual(harness.errors, []);
    assert.equal(harness.streamState.cancelled, true);
    assert.equal(harness.streamState.reads, 2);
  }
  const harness = routeHarness();
  assert.deepEqual(await harness.post({ chunks: [oversized], contentLength: '1' }),
    { status: 413, body: { error: 'payload_too_large' } });
  assert.deepEqual(harness.calls, ['body']);
  assert.equal(harness.streamState.cancelled, true);
});

test('empty, invalid UTF-8, malformed JSON and stream errors reject before adapters', async () => {
  for (const options of [
    { noBody: true },
    { raw: new Uint8Array() },
    { raw: new Uint8Array([0xff]) },
    { malformed: true },
    { chunks: [new TextEncoder().encode('{"businessName":"Valid"}')], streamError: true },
  ]) {
    const harness = routeHarness();
    assert.deepEqual(await harness.post(options), { status: 400, body: { error: 'invalid_input' } });
    assert.deepEqual(harness.calls, ['body']);
    assert.deepEqual(harness.errors, []);
  }
});
