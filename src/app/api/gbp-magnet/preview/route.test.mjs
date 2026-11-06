import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as places from '../../../../../scripts/lib/places-client.mjs';

const root = process.cwd();
function load(relative, dependencies = {}, exposePreview = false) {
  let source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (exposePreview) source = source.replace('async function handlePreview(', 'export async function handlePreview(');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, process, Buffer, URL, Date, console,
    require: name => {
      assert.ok(Object.hasOwn(dependencies, name), `unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: relative });
  return exports;
}

const rate = load('src/lib/payments/rate-limit.ts');
const ceiling = load('src/lib/gbp-magnet/daily-ceiling.ts');
const token = load('src/lib/gbp-magnet/preview-token.ts', { 'node:crypto': await import('node:crypto') });
const route = load('src/app/api/gbp-magnet/preview/route.ts', {
  'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200,
    headers: new Headers(options.headers) }) } },
  '../../../../../scripts/lib/places-client.mjs': places,
  '@/lib/payments/rate-limit': rate,
  '@/lib/gbp-magnet/daily-ceiling': ceiling,
  '@/lib/gbp-magnet/preview-token': token,
}, true);
const original = { key: process.env.GOOGLE_MAPS_API_KEY, secret: process.env.GBP_MAGNET_TOKEN_SECRET,
  ceiling: process.env.GBP_MAGNET_DAILY_PLACES_CEILING };
const originalConnect = net.Socket.prototype.connect;
let socketAttempts = 0;
net.Socket.prototype.connect = function () {
  socketAttempts += 1;
  throw new Error('offline test forbids network sockets');
};
const valid = { businessName: 'Target', city: 'Town', category: 'Dentist' };

function setup() {
  rate.resetRateLimitState();
  ceiling.resetDailyPlacesCounter();
  process.env.GOOGLE_MAPS_API_KEY = 'offline-placeholder';
  process.env.GBP_MAGNET_TOKEN_SECRET = 'offline-token-secret';
  delete process.env.GBP_MAGNET_DAILY_PLACES_CEILING;
}
function request(body = valid, ip = '192.0.2.1') {
  return { headers: new Headers({ 'x-forwarded-for': ip }), json: async () => body };
}
function fakeFetch(responses) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    assert.ok(url.startsWith('https://places.googleapis.com/v1/'));
    assert.ok(responses.length > 0, 'unexpected outbound call');
    return { ok: true, json: async () => responses.shift() };
  };
  return { fetchImpl, calls };
}
const fullResponses = () => [
  { places: [{ id: 'target' }] },
  { displayName: { text: 'Target Inc' }, rating: 4.5, userRatingCount: 12,
    reviews: [{ publishTime: new Date().toISOString() }], websiteUri: 'private' },
  { places: [{ id: 'target' }, { id: 'competitor' }] },
  { displayName: { text: 'Other Inc' }, rating: 4, userRatingCount: 25 },
];
test.after(() => {
  net.Socket.prototype.connect = originalConnect;
  assert.equal(socketAttempts, 0, 'acceptance process must open zero network connections');
  for (const [name, value] of [
    ['GOOGLE_MAPS_API_KEY', original.key], ['GBP_MAGNET_TOKEN_SECRET', original.secret],
    ['GBP_MAGNET_DAILY_PLACES_CEILING', original.ceiling],
  ]) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
});

test('Next route exports only supported route fields', () => {
  const source = fs.readFileSync(path.join(root, 'src/app/api/gbp-magnet/preview/route.ts'), 'utf8');
  assert.doesNotMatch(source, /export\s+async\s+function\s+handlePreview\b/);
});

test('exact successful preview fields, real shared client, and token binding', async () => {
  setup();
  const { fetchImpl, calls } = fakeFetch(fullResponses());
  const result = await route.handlePreview(request({ businessName: ' Target ', city: ' Town ', category: ' Dentist ' }), fetchImpl);
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body).sort(), [
    'success', 'targetName', 'targetRating', 'targetReviewCount', 'competitorName',
    'competitorRating', 'competitorReviewCount', 'previewToken',
  ].sort());
  for (const forbidden of ['recentPace', 'sampleSize', 'websiteUri', 'reviewResponseRate']) {
    assert.ok(!JSON.stringify(result.body).includes(forbidden));
  }
  assert.equal(result.body.targetRating, 4.5);
  assert.equal(result.body.competitorReviewCount, 25);
  assert.equal(calls.length, 4);
  assert.equal(JSON.parse(calls[0].opts.body).textQuery, 'Target Town');
  assert.equal(JSON.parse(calls[2].opts.body).textQuery, 'Dentist Town');
  assert.equal(JSON.parse(calls[2].opts.body).maxResultCount, 8);
  const [payloadPart, signature] = result.body.previewToken.split('.');
  assert.equal(signature, createHmac('sha256', process.env.GBP_MAGNET_TOKEN_SECRET).update(payloadPart).digest('base64url'));
  const payload = JSON.parse(Buffer.from(payloadPart, 'base64url'));
  assert.deepEqual([payload.businessName, payload.city, payload.category], ['Target', 'Town', 'Dentist']);
  assert.ok(payload.jti && Number.isSafeInteger(payload.issuedAt));
  assert.ok(token.verifyPreviewToken(result.body.previewToken, process.env.GBP_MAGNET_TOKEN_SECRET, payload.issuedAt + 899999));
  assert.equal(token.verifyPreviewToken(result.body.previewToken, process.env.GBP_MAGNET_TOKEN_SECRET, payload.issuedAt + 900000), null);
  assert.equal(token.verifyPreviewToken(`${payloadPart}.bad`, process.env.GBP_MAGNET_TOKEN_SECRET), null);
});

test('no match spends only one call and does not seek competitors', async () => {
  setup();
  const fake = fakeFetch([{ places: [] }]);
  const result = await route.handlePreview(request(), fake.fetchImpl);
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(result.body)), { success: false, reason: 'no_match' });
  assert.equal(fake.calls.length, 1);
});

test('no competitor returns stable null fields with three calls', async () => {
  setup();
  const responses = fullResponses().slice(0, 3);
  responses[2] = { places: [{ id: 'target' }] };
  const fake = fakeFetch(responses);
  const result = await route.handlePreview(request(), fake.fetchImpl);
  assert.equal(result.status, 200);
  assert.equal(result.body.competitorName, null);
  assert.equal(result.body.competitorRating, null);
  assert.equal(result.body.competitorReviewCount, null);
  assert.equal(fake.calls.length, 3);
});

test('sixth same-IP request is 429 with Retry-After and no extra call', async () => {
  setup();
  const fake = fakeFetch(Array.from({ length: 5 }, () => ({ places: [] })));
  for (let i = 0; i < 5; i++) assert.equal((await route.handlePreview(request(), fake.fetchImpl)).status, 200);
  const result = await route.handlePreview(request(), fake.fetchImpl);
  assert.equal(result.status, 429);
  assert.ok(Number(result.headers.get('Retry-After')) > 0);
  assert.equal(fake.calls.length, 5);
});

test('malformed and empty fields fail validation before rate or fetch', async () => {
  setup();
  const fake = fakeFetch([]);
  for (const body of [null, [], {}, ...Object.keys(valid).flatMap(key => [
    { ...valid, [key]: '' }, { ...valid, [key]: ' ' }, { ...valid, [key]: null },
    { ...valid, [key]: 'x'.repeat(key === 'businessName' ? 121 : 61) },
  ])]) {
    const result = await route.handlePreview(request(body), fake.fetchImpl);
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'invalid_input');
  }
  assert.equal(fake.calls.length, 0);
  const invalidJson = await route.handlePreview({ ...request(), json: async () => { throw Error('invalid'); } }, fake.fetchImpl);
  assert.equal(invalidJson.status, 400);
  assert.equal(fake.calls.length, 0);
});

test('daily ceiling counts actual calls; reset restores service', async () => {
  setup();
  process.env.GBP_MAGNET_DAILY_PLACES_CEILING = '2';
  const fake = fakeFetch([{ places: [] }, { places: [] }, { places: [] }]);
  for (let i = 0; i < 2; i++) assert.equal((await route.handlePreview(request(valid, `192.0.2.${i}`), fake.fetchImpl)).status, 200);
  assert.equal((await route.handlePreview(request(valid, '192.0.2.3'), fake.fetchImpl)).status, 503);
  assert.equal(fake.calls.length, 2);
  ceiling.resetDailyPlacesCounter();
  assert.equal((await route.handlePreview(request(valid, '192.0.2.4'), fake.fetchImpl)).status, 200);
});

test('missing keys fail closed without network', async () => {
  for (const key of ['GOOGLE_MAPS_API_KEY', 'GBP_MAGNET_TOKEN_SECRET']) {
    setup();
    delete process.env[key];
    const fake = fakeFetch([]);
    assert.equal((await route.handlePreview(request(), fake.fetchImpl)).status, 503);
    assert.equal(fake.calls.length, 0);
  }
});

test('provider failure and invalid shape return generic 503', async () => {
  setup();
  assert.equal((await route.handlePreview(request(), async () => { throw Error('private provider payload'); })).body.error, 'unavailable');
  setup();
  const fake = fakeFetch([{ places: [{ id: 'target' }] }, { displayName: null }]);
  assert.equal((await route.handlePreview(request(), fake.fetchImpl)).status, 503);
  setup();
  const malformedCount = fakeFetch([{ places: [{ id: 'target' }] },
    { displayName: { text: 'Target Inc' }, userRatingCount: 'invalid' }]);
  assert.equal((await route.handlePreview(request(), malformedCount.fetchImpl)).status, 503);
});

test('only POST is exported; framework handles other methods as 405', () => {
  assert.equal(typeof route.POST, 'function');
  for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) assert.equal(route[method], undefined);
});
