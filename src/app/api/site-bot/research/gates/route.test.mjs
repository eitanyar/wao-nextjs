import assert from 'node:assert/strict';
import { createHmac, webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { loadDataRoots } from '../../../../../lib/dataRoots.testkit.mjs';

const root = process.cwd();
const routePath = path.join(root, 'src/app/api/site-bot/research/gates/route.ts');
const authPath = path.join(root, 'src/lib/admin-auth.ts');
const secret = 'synthetic-gates-guard-secret';

function loadModule(fileName, imports, extras = {}) {
  const code = ts.transpileModule(fs.readFileSync(fileName, 'utf8'), {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(imports, name), `unexpected module: ${name}`);
      return imports[name];
    },
    ...extras,
  }, { filename: fileName });
  return exports;
}

function authModule(env) {
  return loadModule(authPath, {}, { process: { env }, crypto: webcrypto, TextEncoder, Uint8Array, Date });
}

const auth = authModule({ ADMIN_SECRET: secret });
const OWNER_SESSION = '123e4567-e89b-42d3-a456-426614174000';

function routeHarness({ token, authorization = auth, dossier = null, denyReads = false, gateResult, pathState = {}, dossierPath, paidFlow = true, ownerResult, rateAllowed = true } = {}) {
  const owner = { submits: [], rateKeys: [] };
  const reads = { requestUrl: 0, dossier: 0 };
  const access = { path: 0, stat: [] };
  const writes = { json: 0, derive: 0, answer: 0, persist: 0 };
  const gate = { id: 'known-synthetic-id:business_boundary:hash', evidenceDigest: 'hash' };
  const syntheticRoot = path.join(root, 'synthetic-gates-root');
  const researchPath = id => dossierPath ?? path.join(syntheticRoot, 'data', 'site-research', id, 'dossier.json');
  const route = loadModule(routePath, {
    fs: { lstatSync: current => {
      if (denyReads) throw new Error('unauthorized path stat');
      const relative = path.relative(syntheticRoot, current);
      access.stat.push(relative);
      const component = relative.split(path.sep).at(-1);
      const state = pathState[relative] ?? pathState[component] ?? (relative.endsWith(path.join('unknown-synthetic-id', 'dossier.json')) ? 'missing' : 'ready');
      if (state === 'missing' || state === 'unreadable') throw Object.assign(new Error('synthetic path error'), { code: state === 'missing' ? 'ENOENT' : 'EACCES' });
      return {
        isSymbolicLink: () => state === 'symlink',
        isDirectory: () => state === 'ready' || state === 'directory',
        isFile: () => state === 'ready' || state === 'file',
      };
    } },
    path,
    '@/lib/dataRoots': loadDataRoots({ cwd: () => syntheticRoot }),
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    'next/headers': { cookies: async () => ({ get: name => {
      assert.equal(name, auth.ADMIN_COOKIE_NAME);
      return token === undefined ? undefined : { value: token };
    } }) },
    '@/lib/admin-auth': authorization,
    '@/lib/site-bot/research/gates': {
      applyResearchGateAnswer: (collectedData, selected, answer) => {
        writes.answer++;
        if (!gateResult) throw new Error('unexpected gate answer');
        assert.deepEqual(selected, gate);
        assert.deepEqual(answer, { services: ['synthetic-service'] });
        return { ...collectedData, secondaryServices: 'synthetic-service' };
      },
      deriveOpenResearchGates: (researchId, collectedData, includeApproved) => {
        writes.derive++;
        if (!gateResult) throw new Error('unexpected gate derivation');
        assert.equal(researchId, 'known-synthetic-id');
        assert.deepEqual(collectedData, { primaryService: 'synthetic-primary' });
        assert.equal(includeApproved, true);
        return [gate];
      },
      persistResearchGateApproval: async (researchId, selected, answered, digest, options) => {
        writes.persist++;
        assert.deepEqual(JSON.parse(JSON.stringify(options)), { staffAnswer: { services: ['synthetic-service'] } });
        if (!gateResult) throw new Error('unexpected gate persistence');
        assert.equal(researchId, 'known-synthetic-id');
        assert.deepEqual(selected, gate);
        assert.deepEqual(answered, { primaryService: 'synthetic-primary', secondaryServices: 'synthetic-service' });
        assert.equal(digest, gateResult.digest);
        return gateResult.status === 'not_found'
          ? { status: 'not_found' }
          : { status: gateResult.status, collectedData: answered, dossier: { researchGateApprovals: gateResult.approvals } };
      },
    },
    '@/lib/site-bot/research/ownerGates': { submitOwnerResearchGate: async (...args) => {
      owner.submits.push(args);
      if (!ownerResult) throw new Error('unexpected owner gate submission');
      return ownerResult;
    } },
    '@/lib/site-bot/paidFlowGate': { isPaidFlowCallbackAllowed: () => paidFlow },
    '@/lib/payments/rate-limit': { checkRateLimit: key => { owner.rateKeys.push(key); return { allowed: rateAllowed }; } },
    '@/lib/site-bot/research/researchStore': { getResearchPath: id => {
      access.path++;
      if (denyReads) throw new Error('unauthorized path lookup');
      assert.ok(['known-synthetic-id', 'unknown-synthetic-id'].includes(id));
      return researchPath(id);
    }, readResearchDossier: async (id, customBaseDir, options) => {
      reads.dossier++;
      if (denyReads || id !== 'known-synthetic-id' || customBaseDir !== undefined || options?.bounded !== true || access.stat.at(-1) !== path.relative(syntheticRoot, researchPath(id))) throw new Error('unsafe or unbounded dossier read');
      return dossier;
    } },
  }, { URL, TextDecoder, process: { cwd: () => syntheticRoot } });
  async function get(id) {
    const url = `https://example.invalid/api/site-bot/research/gates${id === undefined ? '' : `?researchId=${encodeURIComponent(id)}`}`;
    const request = { get url() {
      reads.requestUrl++;
      if (denyReads) throw new Error('unauthorized URL read');
      return url;
    } };
    const response = await route.GET(request);
    return { status: response.status, body: await response.json(), cacheControl: response.headers.get('cache-control') };
  }
  async function post(body, requestKind = 'valid') {
    const request = requestKind === 'throwing-body'
      ? { headers: new Headers(), get json() { throw new Error('unauthorized body access'); } }
      : { headers: new Headers(), json: () => {
        writes.json++;
        if (requestKind === 'malformed') return Promise.reject(new SyntaxError('invalid JSON'));
        return Promise.resolve(body);
      } };
    const response = await route.POST(request);
    return { status: response.status, body: await response.json(), cacheControl: response.headers.get('cache-control') };
  }
  async function ownerPost(body, { session = OWNER_SESSION, contentType = 'application/json', raw } = {}) {
    const headers = { 'content-type': contentType, 'x-forwarded-for': '203.0.113.9' };
    if (session !== null) headers['x-site-bot-session'] = session;
    const request = new Request('https://example.invalid/api/site-bot/research/gates', { method: 'POST', headers, body: raw ?? JSON.stringify(body) });
    const response = await route.POST(request);
    return { status: response.status, body: await response.json(), cacheControl: response.headers.get('cache-control') };
  }
  return { get, post, ownerPost, owner, reads, access, writes, gate };
}

test('missing, malformed, expired and unset-secret cookies return identical 401 before URL or dossier access', async () => {
  const valid = await auth.createAdminToken();
  const expiry = String(Date.now() - 10000);
  const expired = `${expiry}.${createHmac('sha256', secret).update(expiry).digest('hex')}`;
  const noSecretAuth = authModule({});
  assert.equal(await auth.verifyAdminToken(expired), false);
  assert.equal(await noSecretAuth.verifyAdminToken(valid), false);

  for (const { token, authorization } of [
    { token: undefined, authorization: auth },
    { token: 'malformed', authorization: auth },
    { token: expired, authorization: auth },
    { token: valid, authorization: noSecretAuth },
  ]) {
    const harness = routeHarness({ token, authorization, denyReads: true });
    for (const id of [undefined, '../invalid', 'known-synthetic-id', 'unknown-synthetic-id']) {
      assert.deepEqual(await harness.get(id), { status: 401, body: { error: 'unauthorized' }, cacheControl: 'private, no-store' });
    }
    assert.deepEqual(harness.reads, { requestUrl: 0, dossier: 0 });
    assert.deepEqual(harness.access, { path: 0, stat: [] });
  }
});

test('authenticated admin retains 400, 404 and 200 approvals schema', async () => {
  const token = await auth.createAdminToken();
  const missing = routeHarness({ token });
  assert.deepEqual(await missing.get(), { status: 400, body: { error: 'invalid_input' }, cacheControl: 'private, no-store' });
  assert.deepEqual(await missing.get('../invalid'), { status: 400, body: { error: 'invalid_input' }, cacheControl: 'private, no-store' });
  assert.deepEqual(await missing.get('unknown-synthetic-id'), { status: 404, body: { error: 'not_found' }, cacheControl: 'private, no-store' });
  assert.deepEqual(missing.reads, { requestUrl: 3, dossier: 0 });
  assert.equal(missing.access.path, 1);
  assert.deepEqual(missing.access.stat, ['data', path.join('data', 'site-research'), path.join('data', 'site-research', 'unknown-synthetic-id'), path.join('data', 'site-research', 'unknown-synthetic-id', 'dossier.json')]);

  const approvals = { 'known-synthetic-id:business_boundary:hash': { evidenceDigest: 'hash', approvedAt: 'synthetic-date' } };
  const known = routeHarness({ token, dossier: { researchGateApprovals: approvals } });
  assert.deepEqual(await known.get('known-synthetic-id'), {
    status: 200, body: { researchId: 'known-synthetic-id', approvals }, cacheControl: 'private, no-store',
  });
  assert.deepEqual(known.reads, { requestUrl: 1, dossier: 1 });

  const empty = routeHarness({ token, dossier: {} });
  assert.deepEqual(await empty.get('known-synthetic-id'), {
    status: 200, body: { researchId: 'known-synthetic-id', approvals: {} }, cacheControl: 'private, no-store',
  });
  assert.deepEqual(empty.reads, { requestUrl: 1, dossier: 1 });
});

test('GET rejects unsafe path components and null bounded results without exposing approvals', async () => {
  const token = await auth.createAdminToken();
  const approvals = { privateGate: { evidenceDigest: 'synthetic-private' } };
  for (const [label, options] of [
    ['missing parent', { pathState: { 'site-research': 'missing' } }],
    ['symlinked parent', { pathState: { 'site-research': 'symlink' } }],
    ['nonregular parent', { pathState: { 'site-research': 'file' } }],
    ['unreadable parent', { pathState: { 'site-research': 'unreadable' } }],
    ['missing leaf', { pathState: { 'dossier.json': 'missing' } }],
    ['symlinked leaf', { pathState: { 'dossier.json': 'symlink' } }],
    ['nonregular leaf', { pathState: { 'dossier.json': 'directory' } }],
    ['unreadable leaf', { pathState: { 'dossier.json': 'unreadable' } }],
    ['path outside root', { dossierPath: path.join(root, 'outside-synthetic-gates-root', 'dossier.json') }],
  ]) {
    const harness = routeHarness({ token, dossier: { researchGateApprovals: approvals }, ...options });
    assert.deepEqual(await harness.get('known-synthetic-id'), { status: 404, body: { error: 'not_found' }, cacheControl: 'private, no-store' }, label);
    assert.equal(harness.access.path, 1, label);
    assert.equal(harness.reads.dossier, 0, label);
  }
  for (const label of ['malformed', 'oversized']) {
    // The bounded store returns null for either case; approval data stays private.
    const harness = routeHarness({ token, dossier: null });
    assert.deepEqual(await harness.get('known-synthetic-id'), { status: 404, body: { error: 'not_found' }, cacheControl: 'private, no-store' }, label);
    assert.equal(harness.reads.dossier, 1, label);
  }
});

test('POST rejects every invalid admin cookie before JSON access or gate and dossier operations', async () => {
  const valid = await auth.createAdminToken();
  const expiry = String(Date.now() - 10000);
  const expired = `${expiry}.${createHmac('sha256', secret).update(expiry).digest('hex')}`;
  const validBody = { researchId: 'known-synthetic-id', collectedData: { primaryService: 'synthetic-primary' }, gateId: 'known-synthetic-id:business_boundary:hash', evidenceDigest: 'hash' };
  for (const { token, authorization } of [
    { token: undefined, authorization: auth },
    { token: 'malformed', authorization: auth },
    { token: expired, authorization: auth },
    { token: valid, authorization: authModule({}) },
  ]) {
    const harness = routeHarness({ token, authorization, denyReads: true });
    for (const [body, requestKind] of [
      [validBody, 'valid'],
      [null, 'valid'],
      [undefined, 'malformed'],
      [undefined, 'throwing-body'],
    ]) {
      assert.deepEqual(await harness.post(body, requestKind), { status: 401, body: { error: 'unauthorized' }, cacheControl: 'private, no-store' });
    }
    assert.deepEqual(harness.reads, { requestUrl: 0, dossier: 0 });
    assert.deepEqual(harness.writes, { json: 0, derive: 0, answer: 0, persist: 0 });
  }
});

test('authenticated POST preserves malformed, unknown, stale and approval response contracts', async () => {
  const token = await auth.createAdminToken();
  const invalid = routeHarness({ token });
  assert.deepEqual(await invalid.post(undefined, 'malformed'), { status: 400, body: { error: 'invalid_input' }, cacheControl: 'private, no-store' });
  assert.deepEqual(await invalid.post(null), { status: 400, body: { error: 'invalid_input' }, cacheControl: 'private, no-store' });
  assert.deepEqual(await invalid.post({ researchId: '../invalid', collectedData: {}, gateId: 'unknown', evidenceDigest: 'hash' }), { status: 400, body: { error: 'invalid_input' }, cacheControl: 'private, no-store' });
  assert.deepEqual(invalid.writes, { json: 3, derive: 0, answer: 0, persist: 0 });
  assert.deepEqual(invalid.reads, { requestUrl: 0, dossier: 0 });

  const body = { researchId: 'known-synthetic-id', collectedData: { primaryService: 'synthetic-primary' }, gateId: 'unknown', evidenceDigest: 'hash', answer: { services: ['synthetic-service'] } };
  const unknown = routeHarness({ token, gateResult: { digest: 'hash', status: 'approved', approvals: {} } });
  assert.deepEqual(await unknown.post(body), { status: 404, body: { error: 'not_found' }, cacheControl: 'private, no-store' });
  assert.deepEqual(unknown.writes, { json: 1, derive: 1, answer: 0, persist: 0 });
  assert.deepEqual(unknown.reads, { requestUrl: 0, dossier: 0 });

  const missing = routeHarness({ token, gateResult: { digest: 'hash', status: 'not_found' } });
  assert.deepEqual(await missing.post({ ...body, gateId: missing.gate.id }), { status: 404, body: { error: 'not_found' }, cacheControl: 'private, no-store' });
  assert.deepEqual(missing.writes, { json: 1, derive: 1, answer: 1, persist: 1 });
  assert.deepEqual(missing.reads, { requestUrl: 0, dossier: 0 });

  // 2026-11-17: the staff answer is validated and stored with the approval; a malformed one is refused, nothing stored.
  const badAnswer = routeHarness({ token, gateResult: { digest: 'hash', status: 'invalid_answer', approvals: {} } });
  assert.deepEqual(await badAnswer.post({ ...body, gateId: badAnswer.gate.id }), { status: 400, body: { error: 'invalid_input' }, cacheControl: 'private, no-store' });
  assert.deepEqual(badAnswer.writes, { json: 1, derive: 1, answer: 1, persist: 1 });

  const stale = routeHarness({ token, gateResult: { digest: 'old-hash', status: 'stale', approvals: {} } });
  assert.deepEqual(await stale.post({ ...body, gateId: stale.gate.id, evidenceDigest: 'old-hash' }), { status: 409, body: { error: 'stale_evidence' }, cacheControl: 'private, no-store' });
  assert.deepEqual(stale.writes, { json: 1, derive: 1, answer: 1, persist: 1 });
  assert.deepEqual(stale.reads, { requestUrl: 0, dossier: 0 });

  for (const status of ['approved', 'already_approved']) {
    const approvals = { 'known-synthetic-id:business_boundary:hash': { evidenceDigest: 'hash', approvedAt: 'synthetic-date' } };
    const harness = routeHarness({ token, gateResult: { digest: 'hash', status, approvals } });
    assert.deepEqual(await harness.post({ ...body, gateId: harness.gate.id }), {
      status: 200,
      body: { status, collectedData: { primaryService: 'synthetic-primary', secondaryServices: 'synthetic-service' }, approvals },
      cacheControl: 'private, no-store',
    });
    assert.deepEqual(harness.writes, { json: 1, derive: 1, answer: 1, persist: 1 });
    assert.deepEqual(harness.reads, { requestUrl: 0, dossier: 0 });
  }
});

// F2 (rehearsal 2026-11-16): the paying owner answers his own gates from the pay page, without the admin cookie.
const ownerGate = { id: `${OWNER_SESSION}:business_boundary:hash`, type: 'business_boundary', evidenceDigest: 'hash' };
const ownerBody = { researchId: OWNER_SESSION, collectedData: { primaryService: 'synthetic-primary' }, gateId: ownerGate.id, evidenceDigest: 'hash', answer: { services: ['synthetic-service'] } };
const reply = (status, body) => ({ status, body, cacheControl: 'private, no-store' });

// Step 2a (2026-11-25): the owner path is re-keyed to the interview session (POST /api/site-bot/interview-gates, cookie
// bound; interviewFlow.test.ts). The pay page's X-Site-Bot-Session header no longer opens anything here.
test('step 2a: the checkout-session owner header is gone; without the admin cookie every POST is 401 and touches nothing', async () => {
  for (const [label, options, harnessOptions] of [
    ['valid owner header', {}, { ownerResult: { status: 'approved', gate: ownerGate, dossier: {} } }],
    ['no session header', { session: null }, {}],
    ['not a UUID', { session: 'known-synthetic-id' }, {}],
    ['paid flow closed', {}, { paidFlow: false }],
  ]) {
    const harness = routeHarness(harnessOptions);
    assert.deepEqual(await harness.ownerPost(ownerBody, options), reply(401, { error: 'unauthorized' }), label);
    assert.deepEqual(harness.owner, { submits: [], rateKeys: [] }, label);
    assert.deepEqual(harness.writes, { json: 0, derive: 0, answer: 0, persist: 0 }, label);
  }
});

test('admin cookie still wins: a valid admin request carrying an owner header takes the admin path', async () => {
  const token = await auth.createAdminToken();
  const approvals = { 'known-synthetic-id:business_boundary:hash': { evidenceDigest: 'hash', approvedAt: 'synthetic-date' } };
  const harness = routeHarness({ token, gateResult: { digest: 'hash', status: 'approved', approvals } });
  const body = { researchId: 'known-synthetic-id', collectedData: { primaryService: 'synthetic-primary' }, gateId: harness.gate.id, evidenceDigest: 'hash', answer: { services: ['synthetic-service'] } };
  assert.equal((await harness.post(body)).status, 200);
  assert.deepEqual(harness.owner.submits, []);
});
