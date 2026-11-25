// Launch step 1: POST /api/site-bot/waitlist wiring. The real route runs in a sandbox with its library modules stubbed
// (src/lib/site-bot/waitlist.test.ts and launchStore.test.ts cover validation and storage against a real SQLite file).
// HEBREW-SAFETY: zero Hebrew bytes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/waitlist/route.ts');
const auditId = '123e4567-e89b-42d3-a456-426614174000';

class WaitlistError extends Error { constructor(code) { super(code); this.code = code; } }

function harness({ allowed = true, normalize = body => body, submit = async () => ({ ok: true, reason: 'preopen' }) } = {}) {
  const calls = [];
  const errors = [];
  const imports = {
    '@/lib/payments/rate-limit': { checkRateLimit: (key, options) => {
      calls.push('rate');
      assert.equal(key, 'sitebot-waitlist:192.0.2.1');
      assert.deepEqual({ ...options }, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
      return { allowed };
    } },
    '@/lib/site-bot/launchStore': { addWaitlistEntry: () => calls.push('add'), withLaunchStore: () => calls.push('store') },
    '@/lib/site-bot/offerState': { findAuditCandidate: async () => null, resolveOffer: async () => 'waitlist_preopen' },
    '@/lib/site-bot/waitlist': {
      WaitlistError,
      normalizeWaitlistSubmission: body => { calls.push('normalize'); return normalize(body); },
      submitWaitlist: async (submission, deps) => { calls.push('submit'); assert.equal(typeof deps.alert, 'function'); return submit(submission); },
    },
    '@/lib/site-bot/waitlistAlert': { sendWaitlistAlert: async () => true },
  };
  const code = ts.transpileModule(fs.readFileSync(routePath, 'utf8'), {
    fileName: routePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Response, TextDecoder,
    require: name => { assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`); return imports[name]; },
    fetch: () => { throw new Error('unexpected network access'); },
    console: { error: (...args) => errors.push(args) },
  }, { filename: routePath });
  async function post({ body = { auditId, placeId: 'ChIJ-synthetic-1', name: 'n', phone: '0501234567' }, raw, contentType = 'application/json' } = {}) {
    const response = await exports.POST(new Request('https://example.invalid/api/site-bot/waitlist', {
      method: 'POST', body: raw ?? JSON.stringify(body),
      headers: { 'x-forwarded-for': '192.0.2.1, 198.51.100.2', ...(contentType ? { 'content-type': contentType } : {}) },
    }));
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    return { status: response.status, body: await response.json() };
  }
  return { post, calls, errors };
}

test('accepted entry: rate limit, then bounded JSON, then strict normalize, then submit', async () => {
  const h = harness();
  assert.deepEqual(await h.post(), { status: 200, body: { ok: true, reason: 'preopen' } });
  assert.deepEqual(h.calls, ['rate', 'normalize', 'submit']);
  assert.deepEqual(h.errors, []);
});

test('rate limited: 429 before the body is read', async () => {
  const h = harness({ allowed: false });
  assert.deepEqual(await h.post(), { status: 429, body: { ok: false, error: 'rate_limited' } });
  assert.deepEqual(h.calls, ['rate']);
});

test('wrong content type, oversized body or malformed JSON: 400 before normalize', async () => {
  for (const request of [{ contentType: 'text/plain' }, { contentType: null }, { raw: '{bad' }, { raw: JSON.stringify({ name: 'x'.repeat(5000) }) }]) {
    const h = harness();
    assert.deepEqual(await h.post(request), { status: 400, body: { ok: false, error: 'invalid_input' } }, JSON.stringify(request).slice(0, 60));
    assert.deepEqual(h.calls, ['rate']);
  }
});

test('domain errors map to codes only; an unexpected error is a bounded log line and 503', async () => {
  for (const [code, status] of [['invalid_input', 400], ['not_found', 404], ['not_eligible', 409], ['unavailable', 503]]) {
    const h = harness({ submit: async () => { throw new WaitlistError(code); } });
    assert.deepEqual(await h.post(), { status, body: { ok: false, error: code } });
    assert.deepEqual(h.errors, []);
  }
  const h = harness({ submit: async () => { throw new Error('raw sqlite detail 0501234567'); } });
  assert.deepEqual(await h.post(), { status: 503, body: { ok: false, error: 'unavailable' } });
  assert.deepEqual(h.errors, [['SITE_BOT_WAITLIST_FAILED']]);
});
