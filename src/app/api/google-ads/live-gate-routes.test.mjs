import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import * as accessPolicy from '../../../lib/google-ads/access-policy.js';
import { loadDataRoots } from '../../../lib/dataRoots.testkit.mjs';

// Ads Bot live gate (mission item 1, Decisions D + D2). Runs the REAL route
// handlers of all six Google Ads mutation routes inside a vm with the real
// access policy and the real live-readiness store (reading fixture records
// from a temp WAO_CLIENTS_DIR — never data/clients). Only session/admin
// verification, campaign/lead lookups and the Google Ads mutation functions
// are stubbed; every stubbed mutation records its calls so "blocked" means
// "zero Google Ads calls".

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(apiDir, '..', '..', '..');

const CLIENT = 'pilot-client';
const SLUG = 'pilot-plumber';
const SESSION_COOKIE = 'wao-client-session';
const ADMIN_COOKIE = 'wao-admin';

const COMPLETE_RECORD = {
  accountCreatedWithClientAdmin: true,
  clientAdminInviteAccepted: true,
  billingApproved: true,
  verificationStatus: 'not-required',
  feePaid: true,
  termsConsent: { termsVersion: 'ads-bot-terms-2026-11-22', consentedAt: '2026-11-22T10:00:00.000Z' },
  approvalContactConfirmed: true,
};

const PRE_ACCOUNT_ONLY_RECORD = {
  feePaid: true,
  termsConsent: { termsVersion: 'ads-bot-terms-2026-11-22', consentedAt: '2026-11-22T10:00:00.000Z' },
  approvalContactConfirmed: true,
};

// The pre-D2 model's keys, all true: must NOT satisfy the new gate.
const LEGACY_RECORD = {
  clientAccountOwned: true,
  clientBillingAccepted: true,
  mccInvitationAccepted: true,
  approvalContactConfirmed: true,
  liveConsentRecorded: true,
  auditLogEnabled: true,
};

function transpile(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
}

function runCommonJs(file, requireFn, globals) {
  const exports = {};
  vm.runInNewContext(transpile(file), { exports, require: requireFn, ...globals }, { filename: file });
  return exports;
}

/** Callable, infinitely-chainable stub for modules the gate never reaches (google-ads-api, gemini, ...). */
function inertStub(name, calls) {
  const fn = function () { calls.push(name); return proxy; };
  const proxy = new Proxy(fn, {
    get: (_, prop) => (prop === '__esModule' ? true : prop === 'then' ? undefined : inertStub(`${name}.${String(prop)}`, calls)),
    apply: () => { calls.push(name); return proxy; },
    construct: () => { calls.push(`new ${name}`); return proxy; },
  });
  return proxy;
}

function setup({ record, liveFlag, campaignMode = 'live', sessionClientId = CLIENT }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-live-gate-'));
  const clientsDir = path.join(tmp, 'clients');
  fs.mkdirSync(path.join(clientsDir, CLIENT), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'data', 'campaigns'), { recursive: true });
  if (record !== undefined) {
    fs.writeFileSync(path.join(clientsDir, CLIENT, 'live-readiness.json'), JSON.stringify(record));
  }
  const env = {
    WAO_CLIENTS_DIR: clientsDir,
    GOOGLE_ADS_SANDBOX_CLIENT_ID: 'google-ads-sandbox',
    ...(liveFlag ? { GOOGLE_ADS_ENABLE_LIVE_MODE: 'true' } : {}),
  };
  const dataRoots = loadDataRoots({ cwd: tmp, env });
  const store = runCommonJs(
    path.join(srcDir, 'lib', 'google-ads', 'live-readiness-store.ts'),
    name => {
      if (name === 'fs') return fs;
      if (name === 'path') return path;
      if (name === '@/lib/dataRoots') return dataRoots;
      throw new Error(`unexpected store import: ${name}`);
    },
    {},
  );

  const googleAdsCalls = [];
  const campaignConfig = {
    clientId: CLIENT,
    mode: campaignMode,
    customerId: '1112223333',
    slug: SLUG,
    adGroupResourceName: 'customers/1112223333/adGroups/9',
  };
  const index = { clientId: CLIENT, primarySlug: SLUG, primaryCampaignId: '555', primaryCustomerId: '1112223333' };
  const recordingMutation = name => async () => { googleAdsCalls.push(name); return { success: true }; };

  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    'next/headers': {
      cookies: async () => ({ get: cookieName => (jar[cookieName] ? { value: jar[cookieName] } : undefined) }),
    },
    '@/lib/client-auth': {
      COOKIE_NAME: 'wao-client',
      verifySessionToken: async token => (token === SESSION_COOKIE ? sessionClientId : null),
    },
    '@/lib/admin-auth': {
      ADMIN_COOKIE_NAME: 'wao-admin',
      verifyAdminToken: async token => token === ADMIN_COOKIE,
    },
    '@/lib/google-ads/access-policy': accessPolicy,
    '@/lib/google-ads/live-readiness-store': store,
    '@/lib/crm/intelligence': {
      loadClientGoogleAdsIndex: () => index,
      loadCampaignConfigBySlug: () => campaignConfig,
      bindCampaignToClient: () => { googleAdsCalls.push('bindCampaignToClient'); return index; },
      deriveCplCeilingIls: () => 100,
    },
    '@/lib/crm/leadsStore': {
      readLeads: async () => [{ id: 7, slug: SLUG }],
      findLeadById: (leads, id) => leads.find(lead => lead.id === id),
    },
    '@/lib/google-ads/mutations': {
      setCampaignDailyBudget: recordingMutation('setCampaignDailyBudget'),
      setCampaignStatus: recordingMutation('setCampaignStatus'),
      addNegativeKeywords: recordingMutation('addNegativeKeywords'),
    },
    '@/lib/google-ads/conversion-upload': {
      uploadLeadConversion: async () => { googleAdsCalls.push('uploadLeadConversion'); return { success: true }; },
    },
    '@/lib/google-ads/direct-action-audit': { appendGoogleAdsDirectActionAudit: () => {} },
    fs,
    path,
  };

  const jar = {};
  const processShim = { env, cwd: () => tmp };
  function load(route) {
    const file = path.join(apiDir, route, 'route.ts');
    return runCommonJs(file, name => mocks[name] ?? inertStub(name, googleAdsCalls), {
      process: processShim,
      console: { error() {}, info() {}, warn() {}, log() {} },
      URL,
    });
  }

  return {
    tmp,
    jar,
    googleAdsCalls,
    load,
    cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }),
  };
}

function post(body) {
  return new Request('https://example.invalid/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const ROUTES = {
  budget: { body: { dailyBudgetIls: 60 }, success: { success: true, campaignId: '555', dailyBudgetIls: 60 }, mutation: 'setCampaignDailyBudget' },
  'campaign-status': { body: { action: 'resume' }, success: { success: true, campaignId: '555', status: 'ENABLED' }, mutation: 'setCampaignStatus' },
  'negative-keywords': { body: { keywords: ['free'] }, success: { success: true, campaignId: '555', added: ['free'] }, mutation: 'addNegativeKeywords' },
  'import-conversion': { body: { leadId: 7, type: 'verified-lead' }, success: { success: true }, mutation: 'uploadLeadConversion' },
  'link-client': { body: { clientId: CLIENT, slug: SLUG, campaignId: '555' }, mutation: 'bindCampaignToClient' },
};

// create-campaign: body without businessNiche. Passing the gate is proven by the route moving on
// to its first post-gate validation (400) — no Google Ads client is ever built in this suite.
const CREATE_BODY = { clientId: CLIENT, mode: 'live', collectedData: {}, strategy: {}, copy: {}, consentTimestamp: '2026-11-22T10:00:00Z' };
const CREATE_PAST_GATE = { status: 400, body: { error: 'collectedData.businessNiche is required' } };

async function call(harness, route, body) {
  const handler = harness.load(route);
  const response = await handler.POST(post(body));
  return { status: response.status, body: await response.json() };
}

for (const [route, spec] of Object.entries(ROUTES)) {
  test(`${route}: live, flag on, readiness record missing -> 403 live_readiness_incomplete, no Google Ads call`, async () => {
    const h = setup({ record: undefined, liveFlag: true });
    h.jar['wao-client'] = SESSION_COOKIE;
    try {
      const result = await call(h, route, spec.body);
      assert.equal(result.status, 403);
      assert.equal(result.body.code, 'live_readiness_incomplete');
      assert.ok(result.body.missing.includes('billingApproved'));
      assert.deepEqual(h.googleAdsCalls, []);
    } finally { h.cleanup(); }
  });

  test(`${route}: live, flag on, incomplete record (pre-account keys only / legacy keys) -> 403`, async () => {
    for (const record of [PRE_ACCOUNT_ONLY_RECORD, LEGACY_RECORD, { ...COMPLETE_RECORD, verificationStatus: 'pending' }]) {
      const h = setup({ record, liveFlag: true });
      h.jar['wao-client'] = SESSION_COOKIE;
      try {
        const result = await call(h, route, spec.body);
        assert.equal(result.status, 403, JSON.stringify(record));
        assert.equal(result.body.code, 'live_readiness_incomplete');
        assert.deepEqual(h.googleAdsCalls, []);
      } finally { h.cleanup(); }
    }
  });

  test(`${route}: live, flag on, complete record, client session only -> success`, async () => {
    const h = setup({ record: COMPLETE_RECORD, liveFlag: true });
    h.jar['wao-client'] = SESSION_COOKIE;
    try {
      const result = await call(h, route, spec.body);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      if (spec.success) assert.deepEqual(result.body, spec.success);
      else assert.equal(result.body.success, true);
      assert.deepEqual(h.googleAdsCalls, [spec.mutation]);
    } finally { h.cleanup(); }
  });

  test(`${route}: flag off is unchanged — complete record still 403 with the original message, no code`, async () => {
    const h = setup({ record: COMPLETE_RECORD, liveFlag: false });
    h.jar['wao-client'] = SESSION_COOKIE;
    try {
      const result = await call(h, route, spec.body);
      assert.equal(result.status, 403);
      assert.deepEqual(result.body, { error: 'Live Google Ads mutations are disabled during sandbox validation.' });
      assert.deepEqual(h.googleAdsCalls, []);
    } finally { h.cleanup(); }
  });
}

test('budget: test mode (sandbox) ignores readiness, as before', async () => {
  const h = setup({ record: undefined, liveFlag: false, campaignMode: 'test', sessionClientId: CLIENT });
  h.jar['wao-client'] = SESSION_COOKIE;
  try {
    const result = await call(h, 'budget', ROUTES.budget.body);
    // Test mode + a non-sandbox client is still the pre-existing sandbox-only 403, unaffected by readiness.
    assert.equal(result.status, 403);
    assert.deepEqual(result.body, { error: 'Test Google Ads mutations are restricted to the internal sandbox client.' });
  } finally { h.cleanup(); }
});

test('create-campaign: live without admin cookie -> 403 live_admin_required even with a complete record', async () => {
  const h = setup({ record: COMPLETE_RECORD, liveFlag: true });
  h.jar['wao-client'] = SESSION_COOKIE;
  try {
    const result = await call(h, 'create-campaign', CREATE_BODY);
    assert.equal(result.status, 403);
    assert.equal(result.body.code, 'live_admin_required');
    assert.deepEqual(h.googleAdsCalls, []);
  } finally { h.cleanup(); }
});

test('create-campaign: live with admin cookie but missing/incomplete readiness -> 403 live_readiness_incomplete', async () => {
  for (const record of [undefined, LEGACY_RECORD, { feePaid: true, approvalContactConfirmed: true }, { ...PRE_ACCOUNT_ONLY_RECORD, termsConsent: { termsVersion: 'v1' } }]) {
    const h = setup({ record, liveFlag: true });
    h.jar['wao-client'] = SESSION_COOKIE;
    h.jar['wao-admin'] = ADMIN_COOKIE;
    try {
      const result = await call(h, 'create-campaign', CREATE_BODY);
      assert.equal(result.status, 403, JSON.stringify(record));
      assert.equal(result.body.code, 'live_readiness_incomplete');
      assert.deepEqual(h.googleAdsCalls, []);
    } finally { h.cleanup(); }
  }
});

test('create-campaign: live with admin cookie and the pre-account keys complete -> passes the gate', async () => {
  for (const record of [PRE_ACCOUNT_ONLY_RECORD, COMPLETE_RECORD]) {
    const h = setup({ record, liveFlag: true });
    h.jar['wao-client'] = SESSION_COOKIE;
    h.jar['wao-admin'] = ADMIN_COOKIE;
    try {
      const result = await call(h, 'create-campaign', CREATE_BODY);
      assert.deepEqual(result, CREATE_PAST_GATE);
      assert.deepEqual(h.googleAdsCalls, []);
    } finally { h.cleanup(); }
  }
});

test('create-campaign: flag off is unchanged — admin + complete record still 403 with the original message', async () => {
  const h = setup({ record: COMPLETE_RECORD, liveFlag: false });
  h.jar['wao-client'] = SESSION_COOKIE;
  h.jar['wao-admin'] = ADMIN_COOKIE;
  try {
    const result = await call(h, 'create-campaign', CREATE_BODY);
    assert.equal(result.status, 403);
    assert.deepEqual(result.body, { error: 'Live Google Ads mutations are disabled during sandbox validation.' });
  } finally { h.cleanup(); }
});

test('create-campaign: test mode needs neither admin nor readiness (sandbox flow unchanged)', async () => {
  const h = setup({ record: undefined, liveFlag: false, sessionClientId: 'google-ads-sandbox' });
  h.jar['wao-client'] = SESSION_COOKIE;
  try {
    const result = await call(h, 'create-campaign', { ...CREATE_BODY, clientId: 'google-ads-sandbox', mode: 'test' });
    assert.deepEqual(result, CREATE_PAST_GATE);
  } finally { h.cleanup(); }
});

test('create-campaign: admin cookie WITHOUT a client session + pre-account keys -> passes the gate (admin on behalf)', async () => {
  const h = setup({ record: PRE_ACCOUNT_ONLY_RECORD, liveFlag: true });
  h.jar['wao-admin'] = ADMIN_COOKIE;
  try {
    const result = await call(h, 'create-campaign', CREATE_BODY);
    assert.deepEqual(result, CREATE_PAST_GATE);
    assert.deepEqual(h.googleAdsCalls, []);
  } finally { h.cleanup(); }
});

test('create-campaign: admin on behalf still needs the pre-account keys', async () => {
  for (const record of [undefined, { feePaid: true }]) {
    const h = setup({ record, liveFlag: true });
    h.jar['wao-admin'] = ADMIN_COOKIE;
    try {
      const result = await call(h, 'create-campaign', CREATE_BODY);
      assert.equal(result.status, 403);
      assert.equal(result.body.code, 'live_readiness_incomplete');
    } finally { h.cleanup(); }
  }
});

test('create-campaign: no admin and no session -> 401', async () => {
  const h = setup({ record: COMPLETE_RECORD, liveFlag: true });
  try {
    const result = await call(h, 'create-campaign', CREATE_BODY);
    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { error: 'Sign in before changing a Google Ads account.' });
  } finally { h.cleanup(); }
});

test('create-campaign: flag off, admin without session -> 401 as before (no on-behalf path)', async () => {
  const h = setup({ record: COMPLETE_RECORD, liveFlag: false });
  h.jar['wao-admin'] = ADMIN_COOKIE;
  try {
    const result = await call(h, 'create-campaign', CREATE_BODY);
    assert.equal(result.status, 401);
  } finally { h.cleanup(); }
});

test('create-campaign: admin on behalf is recorded as the wao-admin actor in autonomy + audit records', () => {
  const src = fs.readFileSync(path.join(apiDir, 'create-campaign', 'route.ts'), 'utf8');
  assert.match(src, /const ADMIN_ACTOR = 'wao-admin';/);
  assert.match(src, /const actor = access\.actingAsAdmin \? ADMIN_ACTOR : undefined;/);
  assert.match(src, /authorizedBy: actor \?\? sessionClientId \?\? effectiveClientId,/);
  assert.match(src, /actorClientId: actor \?\? sessionClientId \?\? effectiveClientId,/);
});

for (const route of Object.keys(ROUTES)) {
  test(`${route}: an admin cookie without the client session cannot mutate (unchanged)`, async () => {
    const h = setup({ record: COMPLETE_RECORD, liveFlag: true });
    h.jar['wao-admin'] = ADMIN_COOKIE;
    try {
      const result = await call(h, route, ROUTES[route].body);
      assert.equal(result.status, 401);
      assert.deepEqual(h.googleAdsCalls, []);
    } finally { h.cleanup(); }
  });
}

test('campaign-status: pause is always allowed (missing or incomplete readiness) with session + flag on', async () => {
  for (const record of [undefined, LEGACY_RECORD, PRE_ACCOUNT_ONLY_RECORD]) {
    const h = setup({ record, liveFlag: true });
    h.jar['wao-client'] = SESSION_COOKIE;
    try {
      const result = await call(h, 'campaign-status', { action: 'pause' });
      assert.equal(result.status, 200, JSON.stringify(record));
      assert.deepEqual(result.body, { success: true, campaignId: '555', status: 'PAUSED' });
      assert.deepEqual(h.googleAdsCalls, ['setCampaignStatus']);
    } finally { h.cleanup(); }
  }
});

test('campaign-status: pause still needs the session and the global flag', async () => {
  const off = setup({ record: undefined, liveFlag: false });
  off.jar['wao-client'] = SESSION_COOKIE;
  try {
    const result = await call(off, 'campaign-status', { action: 'pause' });
    assert.equal(result.status, 403);
    assert.deepEqual(result.body, { error: 'Live Google Ads mutations are disabled during sandbox validation.' });
  } finally { off.cleanup(); }
  const anon = setup({ record: COMPLETE_RECORD, liveFlag: true });
  try {
    assert.equal((await call(anon, 'campaign-status', { action: 'pause' })).status, 401);
    assert.deepEqual(anon.googleAdsCalls, []);
  } finally { anon.cleanup(); }
});

test('campaign-status: resume with incomplete readiness -> 403, with complete -> 200', async () => {
  const bad = setup({ record: PRE_ACCOUNT_ONLY_RECORD, liveFlag: true });
  bad.jar['wao-client'] = SESSION_COOKIE;
  try {
    const result = await call(bad, 'campaign-status', { action: 'resume' });
    assert.equal(result.status, 403);
    assert.equal(result.body.code, 'live_readiness_incomplete');
    assert.deepEqual(bad.googleAdsCalls, []);
  } finally { bad.cleanup(); }
  const good = setup({ record: COMPLETE_RECORD, liveFlag: true });
  good.jar['wao-client'] = SESSION_COOKIE;
  try {
    const result = await call(good, 'campaign-status', { action: 'resume' });
    assert.deepEqual(result.body, { success: true, campaignId: '555', status: 'ENABLED' });
  } finally { good.cleanup(); }
});

test('the readiness gate never reads or writes the real data/clients during this suite', () => {
  // Every harness points WAO_CLIENTS_DIR at a temp dir; the store resolves only through clientsDir().
  const storeSrc = fs.readFileSync(path.join(srcDir, 'lib', 'google-ads', 'live-readiness-store.ts'), 'utf8');
  assert.match(storeSrc, /path\.join\(clientsDir\(\), clientId, 'live-readiness\.json'\)/);
  assert.doesNotMatch(storeSrc, /writeFileSync|appendFileSync|renameSync/);
});
