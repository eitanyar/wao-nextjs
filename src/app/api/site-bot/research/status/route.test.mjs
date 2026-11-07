import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { loadDataRoots } from '../../../../../lib/dataRoots.testkit.mjs';

const root = process.cwd();
const routePath = path.join(root, 'src/app/api/site-bot/research/status/route.ts');
const authPath = path.join(root, 'src/lib/admin-auth.ts');
const pipelinePath = path.join(root, 'src/lib/site-bot/research/pipelineState.ts');
const callbackPath = path.join(root, 'src/app/api/site-bot/checkout/callback/route.ts');
const callbackPaidPath = path.join(root, 'src/app/api/site-bot/checkout/callback/paid.ts');
const completionPath = path.join(root, 'src/lib/site-bot/checkout/researchCompletion.ts');
const payPath = path.join(root, 'src/app/(product)/site-bot/pay/[sessionId]/page.tsx');
const secret = 'synthetic-status-guard-secret';

function loadModule(fileName, imports, extras = {}) {
  const source = fs.readFileSync(fileName, 'utf8');
  const code = ts.transpileModule(source, {
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

const auth = loadModule(authPath, {}, { process: { env: { ADMIN_SECRET: secret } }, crypto: webcrypto, TextEncoder, Uint8Array, Date });
const pipeline = loadModule(pipelinePath, {});

function routeHarness({ token, dossier = null, authModule = auth, unpublishedSiteRecord = null, states = {}, dossierPath = undefined } = {}) {
  const reads = { resolved: [], paths: [], dossier: [], sites: 0, requestUrl: 0 };
  const rootPath = '/synthetic-fixture';
  const unexpectedSiteAccess = () => {
    reads.sites++;
    throw new Error(`unexpected site-file access${unpublishedSiteRecord ? `: ${unpublishedSiteRecord.slug}` : ''}`);
  };
  const route = loadModule(routePath, {
    fs: { lstatSync: file => {
      reads.paths.push(file);
      assert.ok(file.startsWith(`${rootPath}/data/site-research`) || file === `${rootPath}/data`, `unexpected path: ${file}`);
      const state = states[file] ?? (file.endsWith('/dossier.json') ? (dossier === null ? 'missing' : 'file') : 'directory');
      if (state === 'missing' || state === 'denied') throw Object.assign(new Error('synthetic file state'), { code: state === 'missing' ? 'ENOENT' : 'EACCES' });
      assert.ok(['file', 'directory', 'symlink'].includes(state), `unexpected state: ${state}`);
      return { isFile: () => state === 'file', isDirectory: () => state === 'directory', isSymbolicLink: () => state === 'symlink' };
    }, readdirSync: unexpectedSiteAccess, readFileSync: unexpectedSiteAccess },
    path,
    '@/lib/dataRoots': loadDataRoots({ cwd: () => rootPath }),
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    'next/headers': { cookies: async () => ({ get: () => token === undefined ? undefined : { value: token } }) },
    '@/lib/admin-auth': authModule,
    '@/lib/site-bot/research/pipelineState': pipeline,
    '@/lib/site-bot/research/researchStore': {
      getResearchPath: id => {
        reads.resolved.push(id);
        assert.match(id, /^[A-Za-z0-9][A-Za-z0-9_-]*$/);
        return dossierPath === undefined ? `${rootPath}/data/site-research/${id}/dossier.json` : dossierPath;
      },
      readResearchDossier: async (...args) => {
        assert.equal(args.length, 3);
        assert.equal(args[0], 'known-synthetic-id');
        assert.equal(args[1], undefined);
        assert.deepEqual(Object.entries(args[2]), [['bounded', true]]);
        reads.dossier.push([args[0], args[1], Object.fromEntries(Object.entries(args[2]))]);
        return dossier;
      },
    },
  }, { URL, process: { cwd: () => rootPath } });
  async function get(id) {
    const url = `https://example.invalid/api/site-bot/research/status${id === undefined ? '' : `?researchId=${encodeURIComponent(id)}`}`;
    const request = { get url() { reads.requestUrl++; return url; } };
    const response = await route.GET(request);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store', `cache policy for ${response.status} response`);
    return { status: response.status, body: await response.json() };
  }
  return { get, reads };
}

test('anonymous and invalid/expired/unset-secret cookies fail before ID, dossier and site access', async () => {
  const valid = await auth.createAdminToken();
  const expired = `${Date.now() - 10000}.invalid-signature`;
  const cases = [undefined, 'malformed', expired];
  for (const token of cases) {
    const harness = routeHarness({ token, dossier: { status: 'needs_input' } });
    for (const id of [undefined, '../invalid', 'known-synthetic-id', 'unknown-synthetic-id']) {
      assert.deepEqual(await harness.get(id), { status: 401, body: { error: 'unauthorized' } });
    }
    assert.deepEqual(harness.reads, { resolved: [], paths: [], dossier: [], sites: 0, requestUrl: 0 });
  }
  assert.ok(valid);
  // Exercise the real verifier's fail-closed unset-secret behavior in an isolated module context.
  const noSecretAuth = loadModule(authPath, {}, { process: { env: {} }, crypto: webcrypto, TextEncoder, Uint8Array, Date });
  const noSecretRoute = routeHarness({ token: valid, authModule: noSecretAuth });
  assert.equal(await noSecretAuth.verifyAdminToken(valid), false);
  assert.deepEqual(await noSecretRoute.get('known-synthetic-id'), { status: 401, body: { error: 'unauthorized' } });
  assert.deepEqual(noSecretRoute.reads, { resolved: [], paths: [], dossier: [], sites: 0, requestUrl: 0 });
});

test('admin sees original validation, missing dossier and held/ready status response schema', async () => {
  const token = await auth.createAdminToken();
  const missing = routeHarness({ token });
  assert.deepEqual(await missing.get('../invalid'), { status: 400, body: { error: 'invalid_input' } });
  assert.deepEqual(missing.reads, { resolved: [], paths: [], dossier: [], sites: 0, requestUrl: 1 });
  assert.deepEqual(await missing.get('missing-synthetic'), { status: 404, body: { error: 'not_found' } });
  assert.deepEqual(missing.reads, {
    resolved: ['missing-synthetic'],
    paths: ['/synthetic-fixture/data', '/synthetic-fixture/data/site-research', '/synthetic-fixture/data/site-research/missing-synthetic', '/synthetic-fixture/data/site-research/missing-synthetic/dossier.json'],
    dossier: [], sites: 0, requestUrl: 2,
  });

  const held = routeHarness({ token, dossier: { status: 'needs_input', humanGates: [{ status: 'pending' }] } });
  assert.deepEqual(await held.get('known-synthetic-id'), {
    status: 200,
    body: { researchId: 'known-synthetic-id', status: 'needs_input', nextAction: 'needs_input', openGateCount: 7, heldReasons: [], resultUrl: null },
  });
  assert.deepEqual(held.reads.dossier, [['known-synthetic-id', undefined, { bounded: true }]]);
  assert.equal(held.reads.paths.length, 4);
  assert.equal(held.reads.sites, 0);

  const blocked = routeHarness({ token, dossier: { status: 'held', humanGates: [{ status: 'pending' }] } });
  assert.deepEqual(await blocked.get('known-synthetic-id'), {
    status: 200,
    body: { researchId: 'known-synthetic-id', status: 'held', nextAction: 'held', openGateCount: 7, heldReasons: ['research_held'], resultUrl: null },
  });
  assert.deepEqual(blocked.reads.dossier, [['known-synthetic-id', undefined, { bounded: true }]]);
  assert.equal(blocked.reads.sites, 0);

  // A matching site record is only an unpublished synthetic possibility, not proof of a live URL.
  const unpublishedSiteRecord = { researchId: 'known-synthetic-id', slug: 'unpublished-synthetic' };
  const ready = routeHarness({ token, unpublishedSiteRecord, dossier: {
    status: 'deploy_ready', humanGates: [], pipelineChecks: { copy: 'pass', hebrewQa: 'pass', neuronEvaluation: 'skip', duplicateCannibalization: 'pass' },
  } });
  assert.deepEqual(await ready.get('known-synthetic-id'), {
    status: 200,
    body: { researchId: 'known-synthetic-id', status: 'deploy_ready', nextAction: 'deploy', openGateCount: 0, heldReasons: [], resultUrl: null },
  });
  assert.deepEqual(ready.reads.dossier, [['known-synthetic-id', undefined, { bounded: true }]]);
  assert.equal(ready.reads.sites, 0);
});

test('component and final-file hazards fail closed before any dossier read', async () => {
  const token = await auth.createAdminToken();
  const base = '/synthetic-fixture/data/site-research/known-synthetic-id';
  for (const [file, state, status, error] of [
    ['/synthetic-fixture/data', 'missing', 404, 'not_found'],
    [`${base}/dossier.json`, 'missing', 404, 'not_found'],
    ['/synthetic-fixture/data/site-research', 'symlink', 409, 'invalid_record'],
    [base, 'symlink', 409, 'invalid_record'],
    [`${base}/dossier.json`, 'symlink', 409, 'invalid_record'],
    [base, 'file', 409, 'invalid_record'],
    [`${base}/dossier.json`, 'directory', 409, 'invalid_record'],
    [base, 'denied', 409, 'invalid_record'],
  ]) {
    const harness = routeHarness({ token, dossier: { status: 'held' }, states: { [file]: state } });
    assert.deepEqual(await harness.get('known-synthetic-id'), { status, body: { error } });
    assert.equal(harness.reads.paths.at(-1), file);
    assert.deepEqual(harness.reads.dossier, []);
    assert.equal(harness.reads.sites, 0);
  }
  for (const dossierPath of [null, '/outside/dossier.json']) {
    const harness = routeHarness({ token, dossierPath });
    assert.deepEqual(await harness.get('known-synthetic-id'), { status: 409, body: { error: 'invalid_record' } });
    assert.deepEqual(harness.reads.paths, []);
    assert.deepEqual(harness.reads.dossier, []);
  }
});

test('regular file with oversized or malformed bounded-read result is invalid, not missing or ready', async () => {
  const token = await auth.createAdminToken();
  const harness = routeHarness({ token, dossier: null, states: { '/synthetic-fixture/data/site-research/known-synthetic-id/dossier.json': 'file' } });
  assert.deepEqual(await harness.get('known-synthetic-id'), { status: 409, body: { error: 'invalid_record' } });
  assert.deepEqual(harness.reads.dossier, [['known-synthetic-id', undefined, { bounded: true }]]);
  assert.equal(harness.reads.sites, 0);
});

test('checkout branches and pay page no longer advertise or consume a status URL', () => {
  for (const fileName of [callbackPath, callbackPaidPath, completionPath, payPath]) {
    assert.equal(fs.readFileSync(fileName, 'utf8').includes('statusUrl'), false, fileName);
  }
});
