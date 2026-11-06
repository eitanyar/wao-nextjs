import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as places from '../../../../../scripts/lib/places-client.mjs';

const root = process.cwd();
test('Next route does not export its internal test seam', () => {
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/app/api/gbp-magnet/unlock/route.ts'), 'utf8'), /export\s+async\s+function\s+handleUnlock\b/);
});
function load(relative, dependencies = {}, exposeUnlock = false) {
  let source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (exposeUnlock) source = source.replace('async function handleUnlock(', 'export async function handleUnlock(');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, process, Buffer, URL, Date, console, setTimeout,
    require: name => {
      assert.ok(Object.hasOwn(dependencies, name), `unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: relative });
  return exports;
}
const crypto = await import('node:crypto');
const rate = load('src/lib/payments/rate-limit.ts');
const ceiling = load('src/lib/gbp-magnet/daily-ceiling.ts');
const token = load('src/lib/gbp-magnet/preview-token.ts', { 'node:crypto': crypto });
const consumption = load('src/lib/gbp-magnet/token-consumption.ts');
const attribution = load('src/lib/crm/lead-attribution.ts');
const capture = load('src/lib/crm/lead-capture.ts', { './lead-attribution': attribution });
const store = load('src/lib/crm/leadsStore.ts', { 'fs/promises': await import('node:fs/promises'),
  'path': await import('node:path') });
const sent = [];
const route = load('src/app/api/gbp-magnet/unlock/route.ts', {
  'node:crypto': crypto,
  'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200,
    headers: new Headers(options.headers) }) } },
  '../../../../../scripts/lib/places-client.mjs': places,
  '@/lib/payments/rate-limit': rate,
  '@/lib/gbp-magnet/daily-ceiling': ceiling,
  '@/lib/gbp-magnet/preview-token': token,
  '@/lib/gbp-magnet/token-consumption': consumption,
  '@/lib/crm/lead-capture': capture,
  '@/lib/crm/leadsStore': store,
  '@/lib/mail': { sendLeadNotificationEmail: async lead => { sent.push(lead); } },
}, true);
const original = Object.fromEntries(['GOOGLE_MAPS_API_KEY', 'GBP_MAGNET_TOKEN_SECRET',
  'GBP_MAGNET_DAILY_PLACES_CEILING', 'WAO_LEADS_FILE_PATH'].map(key => [key, process.env[key]]));
const originalConnect = net.Socket.prototype.connect;
let socketAttempts = 0;
net.Socket.prototype.connect = function () {
  socketAttempts += 1;
  throw new Error('offline test forbids network sockets');
};
const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'wao-magnet-unlock-'));
const leadsFile = path.join(directory, 'leads.json');
function setup() {
  rate.resetRateLimitState();
  ceiling.resetDailyPlacesCounter();
  consumption.resetTokenConsumptionState();
  sent.length = 0;
  fs.rmSync(leadsFile, { force: true });
  process.env.WAO_LEADS_FILE_PATH = leadsFile;
  process.env.GOOGLE_MAPS_API_KEY = 'offline-placeholder';
  process.env.GBP_MAGNET_TOKEN_SECRET = 'offline-token-secret';
  delete process.env.GBP_MAGNET_DAILY_PLACES_CEILING;
}
function body(overrides = {}) {
  return { previewToken: token.mintPreviewToken({ businessName: 'Target', city: 'Town',
    category: 'Dentist' }, process.env.GBP_MAGNET_TOKEN_SECRET), name: ' Buyer ',
  phone: '050-123 4567', email: 'buyer@example.com', consentGiven: true, ...overrides };
}
function request(input, ip = '192.0.2.1') {
  return { headers: new Headers({ 'x-forwarded-for': ip }), json: async () => input };
}
function fakeFetch(responses) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    assert.ok(url.startsWith('https://places.googleapis.com/v1/'));
    assert.ok(responses.length, 'unexpected outbound call');
    return { ok: true, json: async () => responses.shift() };
  };
  return { fetchImpl, calls };
}
const fullResponses = () => [
  { places: [{ id: 'target' }] },
  { displayName: { text: 'Target Inc' }, rating: 4.5, userRatingCount: 12,
    reviews: [{ publishTime: new Date().toISOString() }], websiteUri: 'private' },
  { places: [{ id: 'target' }, { id: 'one' }, { id: 'two' }, { id: 'three' }, { id: 'four' }] },
  ...['One', 'Two', 'Three'].map((name, i) => ({ displayName: { text: name },
    rating: 4, userRatingCount: i + 1, reviews: [{ publishTime: new Date().toISOString() }],
    websiteUri: 'private' })),
];
const leads = () => fs.existsSync(leadsFile) ? JSON.parse(fs.readFileSync(leadsFile, 'utf8')) : [];
const absent = result => {
  for (const forbidden of ['websiteUri', 'reviewResponseRate', 'review-response-rate', 'fullReportText']) {
    assert.ok(!JSON.stringify(result.body).includes(forbidden));
  }
};
test.after(async () => {
  net.Socket.prototype.connect = originalConnect;
  assert.equal(socketAttempts, 0, 'acceptance process must open zero network connections');
  await fsp.rm(directory, { recursive: true, force: true });
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test('successful unlock returns exact structured fields, writes one lead, sends one notification', async () => {
  setup();
  const fake = fakeFetch(fullResponses());
  const result = await route.handleUnlock(request(body()), fake.fetchImpl);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body).sort(), ['success', 'targetName', 'targetRating',
    'targetReviewCount', 'targetRecentPace', 'targetSampleSize', 'competitors', 'leadId'].sort());
  assert.deepEqual(Object.keys(result.body.targetRecentPace).sort(), ['d30', 'd60', 'd90']);
  assert.equal(result.body.targetSampleSize, 1);
  assert.equal(result.body.competitors.length, 3);
  for (const c of result.body.competitors) assert.deepEqual(Object.keys(c).sort(),
    ['name', 'rating', 'reviewCount', 'recentPace', 'sampleSize'].sort());
  absent(result);
  assert.equal(fake.calls.length, 6);
  assert.equal(JSON.parse(fake.calls[0].opts.body).textQuery, 'Target Town');
  assert.equal(JSON.parse(fake.calls[2].opts.body).textQuery, 'Dentist Town');
  assert.equal(JSON.parse(fake.calls[2].opts.body).maxResultCount, 8);
  assert.equal(fake.calls.every(call => call.url.startsWith('https://places.googleapis.com/v1/')), true);
  assert.equal(leads().length, 1);
  const lead = leads()[0];
  assert.equal(result.body.leadId, lead.id);
  assert.equal(lead.type, 'gbp-magnet-unlock');
  assert.equal(lead.source, 'gbp-magnet');
  assert.equal(lead.name, 'Buyer');
  assert.equal(lead.phone, '0501234567');
  assert.equal(lead.email, 'buyer@example.com');
  assert.equal(lead.businessNiche, 'Dentist');
  assert.match(lead.slug, /^target-town-[0-9a-f]{8}$/);
  assert.ok(!Number.isNaN(Date.parse(lead.contactConsentAt)));
  assert.equal(lead.firstResponseStatus, 'not_eligible');
  assert.equal(lead.status, 'new');
  assert.equal(sent.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(sent[0])), lead);
});

test('missing, expired and tampered tokens reject before Places or writes', async () => {
  for (const variant of ['missing', 'expired', 'tampered']) {
    setup();
    const valid = body();
    const previewToken = variant === 'missing' ? undefined : variant === 'expired' ?
      token.mintPreviewToken({ businessName: 'Target', city: 'Town', category: 'Dentist' },
        process.env.GBP_MAGNET_TOKEN_SECRET, Date.now() - 900_001) : `${valid.previewToken.slice(0, -1)}!`;
    const fake = fakeFetch([]);
    const result = await route.handleUnlock(request({ ...valid, previewToken }), fake.fetchImpl);
    assert.equal(result.status, variant === 'missing' ? 400 : 403);
    assert.equal(result.body.error, variant === 'missing' ? 'invalid_input' : 'invalid_token');
    assert.equal(fake.calls.length, 0);
    assert.equal(leads().length, 0);
  }
});

test('false or absent consent rejects before network, lead or email', async () => {
  setup();
  const fake = fakeFetch([]);
  for (const consentGiven of [false, undefined]) {
    const result = await route.handleUnlock(request(body({ consentGiven })), fake.fetchImpl);
    assert.equal(result.status, 400);
    assert.deepEqual(JSON.parse(JSON.stringify(result.body)), { error: 'invalid_input' });
  }
  assert.equal(fake.calls.length, 0);
  assert.equal(leads().length, 0);
  assert.equal(sent.length, 0);
});

test('paid click identifiers persist unchanged on the CRM lead', async () => {
  setup();
  const fake = fakeFetch(fullResponses());
  const result = await route.handleUnlock(request(body({ gclid: 'CLICK-123', wbraid: 'W-456',
    gbraid: 'G-789' })), fake.fetchImpl);
  assert.equal(result.status, 200);
  assert.deepEqual([leads()[0].gclid, leads()[0].wbraid, leads()[0].gbraid],
    ['CLICK-123', 'W-456', 'G-789']);
});

test('fourth request per IP returns 429 with Retry-After', async () => {
  setup();
  const fake = fakeFetch([{ places: [] }, { places: [] }, { places: [] }]);
  for (let i = 0; i < 3; i++) assert.equal((await route.handleUnlock(request(body()), fake.fetchImpl)).status, 200);
  const result = await route.handleUnlock(request(body()), fake.fetchImpl);
  assert.equal(result.status, 429);
  assert.ok(Number(result.headers.get('Retry-After')) > 0);
  assert.equal(fake.calls.length, 3);
});

test('consumed token cannot be replayed even with unused rate limit', async () => {
  setup();
  const input = body();
  const fake = fakeFetch(fullResponses());
  assert.equal((await route.handleUnlock(request(input), fake.fetchImpl)).status, 200);
  const calls = fake.calls.length;
  const result = await route.handleUnlock(request(input), fake.fetchImpl);
  assert.equal(result.status, 403);
  assert.deepEqual(JSON.parse(JSON.stringify(result.body)), { error: 'invalid_token' });
  assert.equal(fake.calls.length, calls);
  assert.equal(leads().length, 1);
});

test('missing either required env variable fails closed', async () => {
  for (const key of ['GOOGLE_MAPS_API_KEY', 'GBP_MAGNET_TOKEN_SECRET']) {
    setup();
    const input = body();
    delete process.env[key];
    const fake = fakeFetch([]);
    const result = await route.handleUnlock(request(input), fake.fetchImpl);
    assert.equal(result.status, 503);
    assert.deepEqual(JSON.parse(JSON.stringify(result.body)), { error: 'unavailable' });
    assert.equal(fake.calls.length, 0);
    assert.equal(leads().length, 0);
  }
});

test('mid-flow daily ceiling returns 503 without persisting or sending', async () => {
  setup();
  process.env.GBP_MAGNET_DAILY_PLACES_CEILING = '4';
  const fake = fakeFetch(fullResponses());
  const result = await route.handleUnlock(request(body()), fake.fetchImpl);
  assert.equal(result.status, 503);
  assert.equal(fake.calls.length, 4);
  assert.equal(leads().length, 0);
  assert.equal(sent.length, 0);
});

test('zero target results returns no_match without competitor call or lead', async () => {
  setup();
  const fake = fakeFetch([{ places: [] }]);
  const result = await route.handleUnlock(request(body()), fake.fetchImpl);
  assert.deepEqual(JSON.parse(JSON.stringify(result.body)), { success: false, reason: 'no_match' });
  assert.equal(result.status, 200);
  absent(result);
  assert.equal(fake.calls.length, 1);
  assert.equal(leads().length, 0);
  assert.equal(sent.length, 0);
});

test('invalid name, phone, email, identifiers or malformed JSON fail validation before rate limit', async () => {
  setup();
  const fake = fakeFetch([{ places: [] }]);
  for (const overrides of [{ name: '' }, { name: 'x'.repeat(121) }, { phone: '123' },
    { email: 'wrong' }, { email: '' }, { gclid: 'x'.repeat(1025) }]) {
    const result = await route.handleUnlock(request(body(overrides)), fake.fetchImpl);
    assert.equal(result.status, 400);
  }
  assert.equal((await route.handleUnlock({ ...request(body()), json: async () => { throw Error('bad'); } }, fake.fetchImpl)).status, 400);
  assert.equal((await route.handleUnlock(request(body()), fake.fetchImpl)).status, 200);
  assert.equal(fake.calls.length, 1);
  assert.equal(leads().length, 0);
});

test('provider failure including competitor detail failure returns generic 503 and no lead', async () => {
  setup();
  const result = await route.handleUnlock(request(body()), async () => { throw Error('private payload'); });
  assert.equal(result.status, 503);
  assert.deepEqual(JSON.parse(JSON.stringify(result.body)), { error: 'unavailable' });
  assert.equal(leads().length, 0);
  setup();
  const fake = fakeFetch(fullResponses().slice(0, 3));
  const competitorFailure = await route.handleUnlock(request(body()), async (url, opts) => {
    if (fake.calls.length === 3) throw Error('private competitor detail');
    return fake.fetchImpl(url, opts);
  });
  assert.equal(competitorFailure.status, 503);
  assert.equal(leads().length, 0);
  assert.equal(sent.length, 0);
});

test('only POST is exported; framework returns 405 for other methods', () => {
  assert.equal(typeof route.POST, 'function');
  for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) assert.equal(route[method], undefined);
});
