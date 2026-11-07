import assert from 'node:assert/strict';
import { createHash, timingSafeEqual, webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';
import { loadDataRoots } from '../../../../../lib/dataRoots.testkit.mjs';

const root = process.cwd();
const source = name => path.join(root, name);
const secret = 'synthetic-copy-review-secret';
const cwd = '/synthetic-fixture';
const site = `${cwd}/data/sites/example-site.json`;
const dossierFile = `${cwd}/data/site-research/research-alpha/dossier.json`;
const maxRecordBytes = 16 * 1024 * 1024;

function load(fileName, imports, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(source(fileName), 'utf8'), {
    fileName, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require(name) {
      assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
      return imports[name];
    }, Buffer, Uint8Array, TextDecoder, URL, process: { cwd: () => cwd }, ...globals,
  }, { filename: fileName });
  return exports;
}

const authFile = 'src/lib/admin-auth.ts';
const auth = load(authFile, {}, { process: { env: { ADMIN_SECRET: secret } }, crypto: webcrypto, TextEncoder, Uint8Array, Date });
const deploy = load('src/lib/deployment/deploy-access.ts', {});
const graph = load('src/lib/site-bot/researchedSiteGraphValidation.ts', {});
const packetModule = load('src/lib/site-bot/research/copyReviewPacket.ts', {
  'node:crypto': { createHash, timingSafeEqual },
  'node:util': { isDeepStrictEqual },
  '../../deployment/deploy-access': deploy,
  '../researchedSiteGraphValidation': graph,
});


function copy(headline) {
  return {
    heroHeadline: headline, heroSubheadline: 'Summary', heroCta: 'Contact', trustBarItems: [],
    aboutBlurb: 'About', servicesHeadline: 'Services', serviceItems: [], faqHeadline: 'FAQ',
    faqItems: [], guaranteeBlock: 'Guarantee', reviewFeatured: null, reviewContext: null,
    responseTimeBadge: null, scarcityLine: null, formHeadline: 'Contact', stickyBarLine: 'Call',
    aboutPageHeadline: 'About', aboutPageBody: 'About text', serviceDetails: [],
  };
}
function record() {
  const home = copy('Home');
  return {
    slug: 'example-site', researchId: 'research-alpha', approvedPageId: 'home', copy: home,
    collectedData: { privateContact: 'DO_NOT_RETURN' }, pageBrief: { private: 'DO_NOT_RETURN' },
    researchedPages: [
      { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: home, brief: { private: 'DO_NOT_RETURN' } },
      { opportunityId: 'service', classification: 'money_service', targetPath: '/service', copy: copy('Service'), brief: { private: 'DO_NOT_RETURN' } },
      { opportunityId: 'proof', classification: 'proof', targetPath: '/proof', copy: copy('Proof'), brief: { private: 'DO_NOT_RETURN' } },
    ],
    researchedGraphEdges: [{ fromId: 'home', toId: 'service' }, { fromId: 'service', toId: 'proof' }],
  };
}
function dossier() {
  return {
    researchId: 'research-alpha', status: 'copy_ready', createdAt: '2026-09-20', updatedAt: '2026-09-20',
    businessTruth: { businessName: 'DO_NOT_RETURN', assertions: [], status: 'verified' }, evidence: [], evidenceEdges: [],
    keywordEvidence: [], serpObservations: [], pageOpportunities: [
      { id: 'home', targetPath: '/', opportunity: 'DO_NOT_RETURN', status: 'ready', evidenceIds: [] },
      { id: 'service', targetPath: '/service', opportunity: 'DO_NOT_RETURN', status: 'ready', evidenceIds: [] },
      { id: 'proof', targetPath: '/proof', opportunity: 'DO_NOT_RETURN', status: 'ready', evidenceIds: [] },
    ],
    internalLinkEdges: [], providerUsage: [], humanGates: [],
    pipelineChecks: { copy: 'pass', hebrewQa: 'pending', neuronEvaluation: 'skip', duplicateCannibalization: 'pass' },
  };
}
const bytes = value => Buffer.from(JSON.stringify(value, null, 2));

function harness({ token, data = dossier(), boundedRejected = false, raw = bytes(record()), missing, symlink, authModule = auth,
  statSize = raw.length, regular = true, growAfterStat = false, maxReadChunk = 64 * 1024 } = {}) {
  const calls = { url: 0, body: 0, dossier: 0, lstat: [], open: 0, read: 0, close: 0, writes: 0 };
  const readRequests = [];
  let cursor = 0;
  const fsAdapter = new Proxy({
    constants: fs.constants,
    lstatSync(file) {
      calls.lstat.push(file);
      if (file === missing) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return { isSymbolicLink: () => file === symlink, isDirectory: () => file !== site && file !== dossierFile,
        isFile: () => file === site || file === dossierFile };
    },
    openSync(file, flags) {
      assert.equal(file, site);
      assert.equal(flags, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      calls.open++;
      return 99;
    },
    fstatSync(fd) { assert.equal(fd, 99); return { isFile: () => regular, size: statSize }; },
    readSync(fd, buffer, offset, length, position) {
      assert.equal(fd, 99);
      assert.equal(position, null);
      assert.ok(length > 0 && length <= 64 * 1024);
      assert.ok(cursor + length <= maxRecordBytes + 1, 'read exceeds the detection byte');
      const count = growAfterStat ? length : Math.min(length, maxReadChunk, raw.length - cursor);
      if (growAfterStat) buffer.fill(0x41, offset, offset + count);
      else raw.copy(buffer, offset, cursor, cursor + count);
      cursor += count;
      readRequests.push({ length, count });
      calls.read++;
      return count;
    },
    closeSync(fd) { assert.equal(fd, 99); calls.close++; },
  }, { get(target, key) {
    if (key === '__esModule') return false;
    if (key in target) return target[key];
    return () => { calls.writes++; throw new Error(`unexpected filesystem call: ${String(key)}`); };
  } });
  const route = load('src/app/api/site-bot/research/copy-review/route.ts', {
    fs: fsAdapter, path,
    '@/lib/dataRoots': loadDataRoots({ cwd: () => cwd }),
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    'next/headers': { cookies: async () => ({ get: name => {
      assert.equal(name, auth.ADMIN_COOKIE_NAME);
      return token === undefined ? undefined : { value: token };
    } }) },
    '@/lib/admin-auth': authModule,
    '@/lib/deployment/deploy-access': deploy,
    '@/lib/site-bot/research/copyReviewPacket': packetModule,
    '@/lib/site-bot/research/researchStore': {
      getResearchPath: id => id === 'research-alpha' ? dossierFile : null,
      readResearchDossier: async (id, baseDir, options) => {
        calls.dossier++;
        assert.equal(id, 'research-alpha');
        assert.equal(baseDir, undefined);
        assert.deepEqual(Object.keys(options), ['bounded']);
        assert.equal(options.bounded, true);
        assert.equal(calls.lstat.at(-1), dossierFile);
        assert.equal(calls.open, 0);
        return boundedRejected ? null : data;
      },
    },
  });
  async function get(query = '?researchId=research-alpha&slug=example-site') {
    const request = { get url() { calls.url++; return `https://example.invalid/api/site-bot/research/copy-review${query}`; },
      get body() { calls.body++; throw new Error('body access'); } };
    const response = await route.GET(request);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    return { status: response.status, body: await response.json() };
  }
  return { get, calls, readRequests, raw, data };
}

const error = (status, code) => ({ status, body: { error: code } });

test('real admin verifier denies absent, malformed, expired and unset-secret cookies before request URL/body or data', async () => {
  const valid = await auth.createAdminToken();
  const unset = load(authFile, {}, { process: { env: {} }, crypto: webcrypto, TextEncoder, Uint8Array, Date });
  for (const [token, authModule] of [[undefined, auth], ['malformed', auth], [`${Date.now() - 10000}.invalid`, auth], [valid, unset]]) {
    const h = harness({ token, authModule });
    assert.deepEqual(await h.get('?researchId=../bad&slug=bad'), error(401, 'unauthorized'));
    assert.deepEqual(h.calls, { url: 0, body: 0, dossier: 0, lstat: [], open: 0, read: 0, close: 0, writes: 0 });
  }
});

test('authorized query parser denies missing, duplicate, extra, traversal and unsafe identifiers before any data access', async () => {
  const token = await auth.createAdminToken();
  for (const query of ['', '?researchId=research-alpha', '?slug=example-site', '?researchId=research-alpha&researchId=other&slug=example-site',
    '?researchId=research-alpha&slug=example-site&slug=other-site', '?researchId=research-alpha&slug=example-site&extra=1',
    '?researchId=..%2Fsecret&slug=example-site', '?researchId=research-alpha&slug=..%2Fsecret',
    '?researchId=research-alpha&slug=example--site', '?researchId=research-alpha&slug=Example-site',
    '?researchId=%00&slug=example-site', '?researchId=research-alpha&slug=%252e%252e']) {
    const h = harness({ token });
    assert.deepEqual(await h.get(query), error(400, 'invalid_input'), query);
    assert.equal(h.calls.dossier, 0);
    assert.deepEqual(h.calls.lstat, []);
    assert.equal(h.calls.open, 0);
  }
});

test('missing files yield 404; malformed dossier, symlinks, stale and held pairs yield only generic 409', async () => {
  const token = await auth.createAdminToken();
  for (const missing of [dossierFile, site]) {
    const h = harness({ token, missing });
    assert.deepEqual(await h.get(), error(404, 'not_found'), JSON.stringify(h.calls));
    assert.equal(h.calls.open, 0);
  }
  for (const symlink of [`${cwd}/data`, `${cwd}/data/site-research`, `${cwd}/data/site-research/research-alpha`, dossierFile,
    `${cwd}/data/sites`, site]) {
    const h = harness({ token, symlink });
    assert.deepEqual(await h.get(), error(409, 'invalid_record'));
    assert.equal(h.calls.open, 0);
  }
  for (const data of [null, { ...dossier(), status: 'held' }, { ...dossier(), pipelineChecks: { copy: 'pass', hebrewQa: 'pass' } },
    { ...dossier(), pageOpportunities: dossier().pageOpportunities.slice(0, 2) }]) {
    const h = harness({ token, data });
    assert.deepEqual(await h.get(), error(409, 'invalid_record'));
  }
});

test('bounded dossier rejection is generic and precedes site descriptor access', async () => {
  const token = await auth.createAdminToken();
  const h = harness({ token, boundedRejected: true });
  const response = await h.get();
  assert.deepEqual(response, error(409, 'invalid_record'));
  assert.equal(JSON.stringify(response).includes('DO_NOT_RETURN'), false);
  assert.equal(h.calls.dossier, 1);
  assert.equal(h.calls.open, 0);
  assert.equal(h.calls.read, 0);
  assert.equal(h.calls.close, 0);
  assert.equal(h.calls.writes, 0);
  assert.deepEqual(h.calls.lstat, [
    `${cwd}/data`, `${cwd}/data/site-research`, `${cwd}/data/site-research/research-alpha`, dossierFile,
  ]);
});

test('malformed, simulation, non-researched, regenerated and mismatched inventories fail without copy leak', async () => {
  const token = await auth.createAdminToken();
  const original = record();
  const variants = [Buffer.from('not json'), Buffer.from([0xff]), bytes({ ...original, simulation: true }),
    bytes({ ...original, researchedPages: undefined }), bytes({ ...original, researchId: 'different' }),
    bytes({ ...original, slug: 'different-site' }), bytes({ ...original, copy: copy('Different homepage') }),
    bytes({ ...original, researchedPages: original.researchedPages.slice(0, 2) }),
    bytes({ ...original, researchedPages: original.researchedPages.map((page, i) => i === 2 ? { ...page, targetPath: '/wrong' } : page) })];
  for (const raw of variants) {
    const h = harness({ token, raw });
    assert.deepEqual(await h.get(), error(409, 'invalid_record'));
    assert.equal(h.calls.read, 2);
    assert.equal(h.calls.close, 1);
  }
});

test('exact raw digest, complete ordered copy, no hidden fields or mutations; regenerated copy invalidates old packet', async () => {
  const token = await auth.createAdminToken();
  const sourceRecord = record();
  const sourceDossier = dossier();
  const raw = bytes(sourceRecord);
  const beforeRaw = Buffer.from(raw);
  const beforeDossier = structuredClone(sourceDossier);
  const h = harness({ token, raw, data: sourceDossier });
  const first = await h.get();
  assert.equal(first.status, 200);
  assert.deepEqual(Object.keys(first.body).sort(), ['deployable', 'packet', 'pages', 'reviewStatus']);
  assert.equal(first.body.reviewStatus, 'pending_human_review');
  assert.equal(first.body.deployable, false);
  assert.equal(first.body.packet.sha256, createHash('sha256').update(raw).digest('hex'));
  assert.deepEqual(first.body.packet.pages, sourceRecord.researchedPages.map(({ opportunityId, classification, targetPath }) =>
    ({ opportunityId, classification, targetPath })));
  assert.deepEqual(first.body.pages, sourceRecord.researchedPages.map(({ opportunityId, classification, targetPath, copy: pageCopy }) =>
    ({ opportunityId, classification, targetPath, copy: pageCopy })));
  for (const page of first.body.pages) assert.deepEqual(Object.keys(page).sort(), ['classification', 'copy', 'opportunityId', 'targetPath']);
  assert.equal(JSON.stringify(first.body).includes('DO_NOT_RETURN'), false);
  assert.deepEqual(raw, beforeRaw);
  assert.deepEqual(sourceDossier, beforeDossier);
  assert.deepEqual(h.calls, { url: 1, body: 0, dossier: 1, lstat: [
    `${cwd}/data`, `${cwd}/data/site-research`, `${cwd}/data/site-research/research-alpha`, dossierFile,
    `${cwd}/data`, `${cwd}/data/sites`, site,
  ], open: 1, read: 2, close: 1, writes: 0 });
  assert.deepEqual(h.readRequests.map(({ count }) => count), [raw.length, 0]);
  sourceRecord.researchedPages[2].copy.heroHeadline = 'Revised proof';
  const regenerated = bytes(sourceRecord);
  assert.equal(packetModule.matchesResearchedCopyReviewPacket(regenerated, first.body.packet), false);
  const second = await harness({ token, raw: regenerated, data: sourceDossier }).get();
  assert.equal(second.status, 200);
  assert.notEqual(second.body.packet.sha256, first.body.packet.sha256);
  assert.equal(second.body.packet.sha256, createHash('sha256').update(regenerated).digest('hex'));
  assert.equal(second.body.pages[2].copy.heroHeadline, 'Revised proof');
  assert.equal(second.body.reviewStatus, 'pending_human_review');
  assert.equal(second.body.deployable, false);
  assert.deepEqual(sourceDossier, beforeDossier);
});

test('oversized and nonregular descriptor metadata reject before content read, close, and reveal no copy', async () => {
  const token = await auth.createAdminToken();
  for (const options of [{ statSize: maxRecordBytes + 1 }, { regular: false }]) {
    const h = harness({ token, ...options });
    const response = await h.get();
    assert.deepEqual(response, error(409, 'invalid_record'));
    assert.equal(JSON.stringify(response).includes('DO_NOT_RETURN'), false);
    assert.equal(h.calls.open, 1);
    assert.equal(h.calls.read, 0);
    assert.deepEqual(h.readRequests, []);
    assert.equal(h.calls.close, 1);
    assert.equal(h.calls.writes, 0);
  }
});

test('post-stat growth is detected within one extra byte, closes descriptor, and cannot expose private fields', async () => {
  const token = await auth.createAdminToken();
  const h = harness({ token, growAfterStat: true });
  const response = await h.get();
  assert.deepEqual(response, error(409, 'invalid_record'));
  assert.equal(JSON.stringify(response).includes('DO_NOT_RETURN'), false);
  assert.equal(h.calls.open, 1);
  assert.equal(h.calls.close, 1);
  assert.equal(h.calls.writes, 0);
  assert.ok(h.readRequests.length > 1);
  assert.equal(h.readRequests.reduce((sum, { count }) => sum + count, 0), maxRecordBytes + 1);
  assert.equal(h.readRequests.reduce((sum, { length }) => sum + length, 0), maxRecordBytes + 1);
  assert.equal(h.readRequests.at(-1).length, 1);
});

test('short descriptor reads preserve the exact raw digest and ordered copy response', async () => {
  const token = await auth.createAdminToken();
  const raw = bytes(record());
  const h = harness({ token, raw, maxReadChunk: 37 });
  const response = await h.get();
  assert.equal(response.status, 200);
  assert.equal(response.body.packet.sha256, createHash('sha256').update(raw).digest('hex'));
  assert.deepEqual(response.body.pages.map(page => page.opportunityId), ['home', 'service', 'proof']);
  assert.ok(h.readRequests.length > 2);
  assert.equal(h.readRequests.reduce((sum, { count }) => sum + count, 0), raw.length);
  assert.equal(h.calls.close, 1);
});
