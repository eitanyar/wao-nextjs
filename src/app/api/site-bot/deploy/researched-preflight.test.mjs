import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import util from 'node:util';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { loadDataRoots } from '../../../../lib/dataRoots.testkit.mjs';

const routePath = path.resolve('src/app/api/site-bot/deploy/route.ts');
const source = fs.readFileSync(routePath, 'utf8');
const code = ts.transpileModule(source, {
  fileName: routePath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
// The real claim pre-check (pure; no IO), from the tsconfig.test.json build that `npm run test` runs first.
const requireCompiled = createRequire(path.join(process.cwd(), 'dist/package.json'));
const { researchedClaimBlockers: realResearchedClaimBlockers } = requireCompiled('./lib/lp/claimVerification.js');
assert.equal(typeof realResearchedClaimBlockers, 'function');
const validatorPath = path.resolve('src/lib/site-bot/researchedSiteGraphValidation.ts');
const validatorCode = ts.transpileModule(fs.readFileSync(validatorPath, 'utf8'), {
  fileName: validatorPath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const validatorExports = {};
vm.runInNewContext(validatorCode, { exports: validatorExports, require: name => {
  throw new Error(`unexpected validator import: ${name}`);
} }, { filename: validatorPath });
assert.equal(typeof validatorExports.assertResearchedSiteGraphSafe, 'function');
const claimRecordPath = path.resolve('src/lib/lp/claimVerificationRecord.ts');
const claimRecordExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(claimRecordPath, 'utf8'), {
  fileName: claimRecordPath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, { exports: claimRecordExports, require: name => {
  throw new Error(`unexpected claim record import: ${name}`);
} }, { filename: claimRecordPath });
const packetPath = path.resolve('src/lib/site-bot/research/copyReviewPacket.ts');
const packetCode = ts.transpileModule(fs.readFileSync(packetPath, 'utf8'), {
  fileName: packetPath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const packetExports = {};
vm.runInNewContext(packetCode, {
  exports: packetExports, Buffer, Uint8Array, TextDecoder,
  require: name => {
    if (name === 'node:crypto') return crypto;
    if (name === 'node:util') return util;
    if (name === '../../deployment/deploy-access') return { isSafeDeploymentSlug: value => value === 'synthetic-preflight' || value === 'synthetic-foreign' };
    if (name === '../researchedSiteGraphValidation') return validatorExports;
    if (name === '../../lp/claimVerificationRecord') return claimRecordExports;
    throw new Error(`unexpected packet import: ${name}`);
  },
}, { filename: packetPath });
assert.equal(typeof packetExports.matchesResearchedCopyReviewPacket, 'function');
assert.equal(typeof packetExports.buildResearchedCopyReviewPacket, 'function');
const slug = 'synthetic-preflight';
const foreignSlug = 'synthetic-foreign';
const maxBytes = 16 * 1024 * 1024;
const sitePath = path.join('/synthetic-root', 'data', 'sites', `${slug}.json`);
const dossierPath = path.join('/synthetic-root', 'data', 'site-research', 'synthetic-research', 'dossier.json');
const syntheticCloudflare = { CLOUDFLARE_API_TOKEN: 'synthetic-token', CLOUDFLARE_ACCOUNT_ID: 'synthetic-account', CLOUDFLARE_ZONE_ID: 'synthetic-zone' };
function syntheticDossier() {
  return {
    researchId: 'synthetic-research', status: 'deploy_ready',
    pageOpportunities: [
      { id: 'home', targetPath: '/', status: 'ready', opportunity: 'Synthetic home', evidenceIds: [] },
      { id: 'hub', targetPath: '/services', status: 'ready', opportunity: 'Synthetic hub', evidenceIds: [] },
      { id: 'service', targetPath: '/services/one', status: 'ready', opportunity: 'Synthetic service', evidenceIds: [] },
    ],
  };
}
const copy = {
  heroHeadline: 'Synthetic home', heroSubheadline: 'Synthetic only', heroCta: 'None',
  aboutBlurb: 'Synthetic only', servicesHeadline: 'Services', faqHeadline: 'FAQ',
  guaranteeBlock: 'Synthetic only', formHeadline: 'No submissions', stickyBarLine: 'Offline',
  aboutPageHeadline: 'Synthetic about', aboutPageBody: 'Synthetic only',
  trustBarItems: [], serviceItems: [], faqItems: [], serviceDetails: [],
};
function researchedRecord() {
  return {
    slug, researchId: 'synthetic-research', approvedPageId: 'home', collectedData: { businessNiche: 'synthetic' }, copy: structuredClone(copy),
    researchedPages: [
      { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: structuredClone(copy) },
      { opportunityId: 'hub', classification: 'service_hub', targetPath: '/services', copy: structuredClone(copy) },
      { opportunityId: 'service', classification: 'money_service', targetPath: '/services/one', copy: structuredClone(copy) },
    ],
    researchedGraphEdges: [{ fromId: 'home', toId: 'hub' }, { fromId: 'hub', toId: 'service' }],
  };
}

function harness({ authorized = true, record, dossier = syntheticDossier(), ready = true, denyBody = false,
  cloudflare = syntheticCloudflare, nodeEnv = 'test', offlineSimulation = false, failWranglerDeploy = false,
  binding = null, approved = false, rawBytes, bodyApproval, siteNodes = {}, dossierNodes = {},
  siteStatSize, siteStatType = 'file', siteReadBytes, siteReadChunk, siteReadError, siteOpenError, siteStatError, dossierReadError,
  legacyRender = false, realClaimCheck = false } = {}) {
  const bytes = rawBytes ?? (record && Buffer.from(JSON.stringify(record)));
  if (approved) {
    assert.ok(dossier && bytes, 'approved fixture requires record and dossier');
    dossier.approvedCopyReviewPacket = packetExports.buildResearchedCopyReviewPacket(bytes, {
      ...dossier, status: 'copy_ready', pipelineChecks: { copy: 'pass', hebrewQa: 'pending' },
    });
  }
  let credentialReads = 0;
  let dossierLookups = 0;
  let receiptChecks = 0;
  const calls = { body: 0, cwd: 0, site: 0, dossier: 0, readiness: 0, validation: 0, vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 };
  const io = { lstat: [], open: [], fstat: 0, reads: [], close: 0, totalRead: 0 };
  const failure = code => Object.assign(new Error(`synthetic ${code}`), { code });
  const nodeKind = file => {
    if (file === '/synthetic-root/data') return siteNodes.data ?? dossierNodes.data ?? 'directory';
    if (file === '/synthetic-root/data/sites') return siteNodes.sites ?? 'directory';
    if (file === sitePath) return siteNodes.file ?? (record ? 'file' : 'missing');
    if (file === '/synthetic-root/data/site-research') return dossierNodes.base ?? 'directory';
    if (file === '/synthetic-root/data/site-research/synthetic-research') return dossierNodes.research ?? 'directory';
    if (file === dossierPath) return dossierNodes.file ?? 'file';
    return forbidden('unexpected lstat path')(file);
  };
  const deployEvents = [];
  const activeDeploy = failWranglerDeploy || binding !== null;
  const hostname = `${slug}.wao.co.il`;
  const dnsTarget = `${slug}.pages.dev`;
  const domainPath = `/accounts/synthetic-account/pages/projects/${slug}/domains`;
  const dnsPath = '/zones/synthetic-zone/dns_records';
  const response = (ok, status, data) => ({ ok, status, json: async () => data });
  const domain = { name: hostname, status: 'pending', zone_tag: 'synthetic-zone',
    validation_data: { method: 'http', status: 'initializing' }, verification_data: { status: 'pending' } };
  const dns = { type: 'CNAME', name: hostname, content: dnsTarget };
  const providerFetch = binding === null ? forbiddenFetch : async (url, options = {}) => {
    assert.equal(typeof options.headers?.Authorization, 'string');
    assert.ok(options.headers.Authorization.startsWith('Bearer ') && options.headers.Authorization.length > 'Bearer '.length);
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.equal(options.redirect, 'error');
    const method = options.method ?? 'GET';
    const origin = 'https://api.cloudflare.com/client/v4';
    assert.ok(url.startsWith(`${origin}/`), 'fixed HTTPS provider origin');
    const pathname = url.slice(origin.length);
    const event = `${method} ${pathname}`;
    deployEvents.push(event);
    if (binding.expectedPaths && !binding.expectedPaths.includes(event)) return forbidden('unrecognized Cloudflare request')(event);
    if (binding.failRequest === event) throw new Error('synthetic provider network failure');
    if (binding.redirectRequest === event) throw new Error('synthetic redirect rejected by fetch');
    if (method === 'GET' && pathname === domainPath) {
      assert.equal(options.body, undefined);
      return binding.domainList ?? response(true, 200, { success: true, result: [], result_info: { page: 1, count: 0, total_pages: 1 } });
    }
    if (method === 'POST' && pathname === domainPath) {
      assert.deepEqual(JSON.parse(options.body), { name: hostname });
      return binding.domainPost ?? response(true, 200, { success: true, result: domain });
    }
    if (method === 'GET' && pathname === `${domainPath}/${hostname}`) {
      assert.equal(options.body, undefined);
      return binding.domainGet ?? response(true, 200, { success: true, result: domain });
    }
    if (method === 'POST' && pathname === dnsPath) {
      assert.deepEqual(JSON.parse(options.body), { type: 'CNAME', name: hostname, content: dnsTarget, proxied: true, ttl: 1 });
      return binding.dnsPost ?? response(true, 200, { success: true, result: dns });
    }
    if (method === 'GET' && pathname === `${dnsPath}?name.exact=${hostname}&per_page=2`) {
      assert.equal(options.body, undefined);
      return binding.dnsGet ?? response(true, 200, { success: true, result: [dns], result_info: { total_pages: 1, count: 1 } });
    }
    return forbidden('unrecognized Cloudflare request')(event);
  };
  function forbiddenFetch(...args) { return forbidden('fetch')(...args); }
  const forbidden = name => (...args) => {
    calls.forbidden++;
    throw new Error(`unexpected ${name}(${args.length})`);
  };
  const modules = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    'node:crypto': { randomInt: activeDeploy ? (min, max) => {
      assert.deepEqual([min, max], [100000, 1_000_000]); deployEvents.push('pin'); return 123456;
    } : forbidden('randomInt') },
    child_process: { execFileSync: activeDeploy ? (file, args) => {
      assert.equal(file, './node_modules/.bin/wrangler');
      deployEvents.push(args[1]);
      if (args[1] === 'deploy' && failWranglerDeploy) throw new Error('synthetic Wrangler failure');
    } : forbidden('wrangler') },
    fs: {
      readFileSync: forbidden('readFileSync'),
      constants: fs.constants,
      lstatSync: file => {
        io.lstat.push(file);
        const kind = nodeKind(file);
        if (kind === 'missing') throw failure('ENOENT');
        if (kind === 'denied') throw failure('EACCES');
        return { isSymbolicLink: () => kind === 'symlink', isFile: () => kind === 'file', isDirectory: () => kind === 'directory' };
      },
      openSync: (file, flags) => {
        calls.site++;
        assert.equal(file, sitePath);
        assert.equal(flags, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
        io.open.push(file);
        if (siteOpenError) throw failure(siteOpenError);
        assert.ok(record, 'site open was not expected');
        return 42;
      },
      fstatSync: fd => {
        assert.equal(fd, 42);
        io.fstat++;
        if (siteStatError) throw failure(siteStatError);
        return { isFile: () => siteStatType === 'file', size: siteStatSize ?? bytes.length };
      },
      readSync: (fd, chunk, offset, length, position) => {
        assert.equal(fd, 42);
        assert.equal(offset, 0);
        assert.equal(position, null);
        assert.ok(length > 0 && length <= 64 * 1024);
        assert.ok(io.totalRead + length <= maxBytes + 1, 'never request beyond cap plus detection byte');
        io.reads.push(length);
        if (siteReadError) throw failure(siteReadError);
        const source = siteReadBytes ?? bytes;
        const count = Math.min(length, siteReadChunk ?? length, source.length - io.totalRead);
        if (count > 0) source.copy(chunk, 0, io.totalRead, io.totalRead + count);
        io.totalRead += count;
        return count;
      },
      closeSync: fd => { assert.equal(fd, 42); io.close++; assert.equal(io.close, 1); },
      mkdirSync: forbidden('mkdirSync'), mkdtempSync: activeDeploy ? () => {
        deployEvents.push('tmpdir');
        return '/synthetic-tmpdir';
      } : forbidden('mkdtempSync'),
      writeFileSync: activeDeploy ? (file, content) => {
        if (legacyRender && file === '/synthetic-tmpdir/core.html') {
          assert.equal(content, 'synthetic core page');
          deployEvents.push('write-core');
        } else if (legacyRender && file === '/synthetic-tmpdir/sitemap.xml') {
          assert.equal(content, 'synthetic sitemap');
          deployEvents.push('write-sitemap');
        } else {
          assert.equal(file, '/synthetic-tmpdir/index.html');
          assert.equal(content, 'synthetic rendered page');
          deployEvents.push('write');
        }
      } : forbidden('writeFileSync'),
      rmSync: activeDeploy ? dir => {
        assert.equal(dir, '/synthetic-tmpdir');
        deployEvents.push('cleanup');
      } : forbidden('rmSync'),
    },
    os: { tmpdir: activeDeploy ? () => '/synthetic-tmp' : forbidden('tmpdir') },
    path,
    '@/lib/dataRoots': loadDataRoots({ cwd: () => { calls.cwd++; return '/synthetic-root'; } }),
    'next/headers': { cookies: async () => ({
      get: name => {
        assert.equal(name, 'synthetic-admin-cookie');
        return authorized ? { value: 'synthetic-admin-token' } : undefined;
      },
      set: binding === null ? forbidden('cookie.set') : (name, token, options) => {
        assert.equal(name, 'synthetic-client-cookie');
        assert.equal(token, 'synthetic-session');
        assert.equal(options.httpOnly, true);
        deployEvents.push('cookie');
      },
    }) },
    '@/lib/lp/renderSitePages': { renderSitePages: binding === null ? forbidden('renderSitePages') : () => {
      deployEvents.push('render'); return { 'index.html': 'synthetic rendered page' };
    }, buildSitemap: legacyRender ? (_siteUrl, urls) => {
      assert.deepEqual(urls, ['/synthetic-core']); deployEvents.push('sitemap'); return 'synthetic sitemap';
    } : forbidden('buildSitemap') },
    // Launch step 2 (B4): the claim pre-check runs after the copy-review match; the synthetic record carries no claim.
    // realClaimCheck wires the real compiled researchedClaimBlockers (the 409 tests below).
    '@/lib/lp/claimVerification': { researchedClaimBlockers: realClaimCheck ? realResearchedClaimBlockers : (pages, data) => {
      assert.ok(Array.isArray(pages) && data && typeof data === 'object');
      return [];
    } },
    '@/lib/lp/researchedSite': { renderResearchedSitePages: activeDeploy ? () => {
      deployEvents.push('render');
      return { 'index.html': 'synthetic rendered page' };
    } : forbidden('renderResearchedSitePages') },
    '@/lib/lp/verticalDetect': { detectVertical: niche => {
      calls.vertical++;
      assert.equal(niche, 'synthetic');
      return 'synthetic-vertical';
    } },
    '@/lib/lp/verticalThemes': { VERTICAL_THEMES: { 'synthetic-vertical': {} } },
    '@/lib/lp/verticalAssets': { VERTICAL_ASSETS: { 'synthetic-vertical': { heroImages: [{ url: 'https://example.invalid/hero' }] } } },
    '@/lib/lp/duplicateCheck': { checkNearDuplicates: legacyRender ? pages => {
      assert.equal(pages.length, 1); assert.equal(pages[0].id, 'synthetic-core');
      deployEvents.push('deduplicate'); return [];
    } : forbidden('duplicateCheck.checkNearDuplicates') },
    '@/lib/lp/renderCoreThirtyPages': {
      renderCoreThirtyPages: legacyRender ? ({ nodes, copies }) => {
        assert.equal(nodes.length, 1); assert.equal(nodes[0].id, 'synthetic-core');
        assert.equal(copies.size, 1); deployEvents.push('render-core');
        return { 'core.html': 'synthetic core page' };
      } : forbidden('renderCoreThirtyPages.renderCoreThirtyPages'),
      buildCoreThirtySitemapUrls: legacyRender ? (nodes, copies) => {
        assert.equal(nodes.length, 1); assert.equal(copies.size, 1);
        return ['/synthetic-core'];
      } : forbidden('renderCoreThirtyPages.buildCoreThirtySitemapUrls'),
    },
    '@/lib/geo/client': { clientRecordExists: binding === null ? forbidden('clientRecordExists') : id => {
      assert.equal(id, slug); deployEvents.push('client-exists'); return binding.existingClient ?? false;
    }, ensureSiteBotClientRecord: binding === null ? forbidden('ensureSiteBotClientRecord') : value => {
      assert.equal(value.clientId, slug); deployEvents.push('client-record');
    } },
    '@/lib/client-auth-store': { provisionClientAuth: binding === null ? forbidden('provisionClientAuth') : async (id, pin) => {
      assert.equal(id, slug); assert.equal(pin, '123456'); deployEvents.push('client-auth'); return { sessionVersion: 1 };
    } },
    '@/lib/client-auth': { createSessionToken: binding === null ? forbidden('createSessionToken') : async (id, options) => {
      assert.equal(id, slug); assert.equal(options.scope, 'change-pin'); deployEvents.push('session'); return 'synthetic-session';
    }, COOKIE_NAME: 'synthetic-client-cookie' },
    '@/lib/admin-auth': {
      ADMIN_COOKIE_NAME: 'synthetic-admin-cookie',
      verifyAdminToken: async token => token === 'synthetic-admin-token',
    },
    '@/lib/site-bot/research/pipelineState': { assertDeployReady: value => {
      calls.readiness++;
      assert.equal(value, dossier);
      return { ready, reasons: ready ? [] : ['deploy_not_ready'] };
    } },
    '@/lib/site-bot/researchedSiteGraphValidation': { assertResearchedSiteGraphSafe: (pages, edges) => {
      calls.validation++;
      return validatorExports.assertResearchedSiteGraphSafe(pages, edges);
    } },
    '@/lib/site-bot/research/researchStore': { getResearchPath: id => {
      dossierLookups++;
      assert.equal(typeof id, 'string');
      return id === 'synthetic-research' ? dossierPath : null;
    }, readResearchDossier: async (id, base, options) => {
      calls.dossier++;
      assert.equal(id, 'synthetic-research');
      assert.equal(base, undefined);
      assert.equal(JSON.stringify(options), '{"bounded":true}');
      if (dossierReadError) throw failure(dossierReadError);
      return dossier;
    } },
    '@/lib/site-bot/research/copyReviewPacket': {
      matchesResearchedCopyReviewPacket: (actualBytes, packet) => {
        receiptChecks++;
        assert.ok(Buffer.isBuffer(actualBytes) && actualBytes.equals(bytes), 'matcher must receive the original raw bytes');
        return packetExports.matchesResearchedCopyReviewPacket(actualBytes, packet);
      },
    },
    '@/lib/fraud-blocker/client': { createFraudBlockerClient: () => {
      calls.client++;
      return new Proxy({}, { get: forbidden('FraudBlocker client access') });
    } },
    '@/lib/fraud-blocker/deployment': {
      provisionFraudBlockerDomain: async () => {
        calls.provision++;
        if (activeDeploy) return 'synthetic-sid';
        throw new Error('synthetic provision failure');
      },
      fraudBlockerFailureState: () => ({ clientId: slug, status: 'provisioning_failed' }),
      recordFraudBlockerTrackerInstallation: activeDeploy ? () => true : forbidden('recordFraudBlockerTrackerInstallation'),
    },
    '@/lib/fraud-blocker/store': {
      readFraudBlockerState: activeDeploy ? () => ({ status: 'active' }) : forbidden('readFraudBlockerState'),
      writeFraudBlockerState: state => {
        calls.state++;
        assert.equal(state.status, 'provisioning_failed');
      },
    },
    '@/lib/deployment/deploy-access': { isSafeDeploymentSlug: value => value === slug },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(modules, name), `unexpected import: ${name}`);
      return modules[name];
    },
    process: { env: new Proxy({ ...cloudflare, NODE_ENV: nodeEnv }, {
      get: (target, key) => {
        if (!authorized) return forbidden('config access')();
        if (typeof key === 'string' && key.startsWith('CLOUDFLARE_')) credentialReads++;
        return target[key];
      },
    }), cwd: () => { calls.cwd++; return '/synthetic-root'; } },
    fetch: providerFetch,
    Buffer, TextDecoder,
    console: { error: failWranglerDeploy ? (_message, error) => {
      assert.equal(error.message, 'synthetic Wrangler failure');
      deployEvents.push('error');
    } : forbidden('console.error'), warn: forbidden('console.warn') },
  }, { filename: routePath });
  async function post() {
    const request = { get json() {
      if (denyBody) throw new Error('unauthorized body access');
      return async () => { calls.body++; return { slug, ...(offlineSimulation ? { testOnlyOfflineSimulationDeploy: true } : {}), ...bodyApproval }; };
    } };
    const response = await exports.POST(request);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    return { status: response.status, body: await response.json() };
  }
  return { post, calls, io, deployEvents, get credentialReads() { return credentialReads; },
    get dossierLookups() { return dossierLookups; }, get receiptChecks() { return receiptChecks; } };
}

function approvedHarness(options) { return harness({ ...options, approved: true }); }

function assertPreflightOnly(setup, response) {
  assert.equal(setup.credentialReads, 0);
  assert.deepEqual(setup.deployEvents, []);
  assert.equal(setup.calls.readiness, 0);
  assert.equal(setup.calls.vertical, 0);
  assert.equal(setup.calls.client, 0);
  assert.equal(setup.calls.provision, 0);
  assert.equal(setup.calls.state, 0);
  assert.equal(setup.calls.forbidden, 0);
  assert.ok([404, 409].includes(response.status));
  assert.equal(Object.keys(response.body).join(','), 'error');
}

function assertOrphanRejected(setup, response) {
  assert.deepEqual(response, { status: 409, body: { error: 'invalid_site_record' } });
  assertPreflightOnly(setup, response);
  assert.deepEqual(setup.calls, { body: 1, cwd: 2, site: 1, dossier: 0, readiness: 0, validation: 0,
    vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
  assert.equal(setup.dossierLookups, 0);
  assert.equal(setup.receiptChecks, 0);
  assert.equal(setup.io.close, 1);
  assert.deepEqual(setup.io.open, [sitePath]);
  assert.deepEqual(setup.io.lstat, ['/synthetic-root/data', '/synthetic-root/data/sites', sitePath]);
}

for (const [identity, mutate] of [
  ['removed', record => { delete record.researchId; }],
  ['empty', record => { record.researchId = ''; }],
  ['null', record => { record.researchId = null; }],
  ['blank', record => { record.researchId = '  '; }],
]) {
  for (const legacyCoreThirty of [false, true]) {
    test(`approved researched bytes with ${identity} researchId and legacy flag ${legacyCoreThirty} reject before dossier`, async () => {
      const record = researchedRecord();
      const dossier = syntheticDossier();
      const approvedBytes = Buffer.from(JSON.stringify(record));
      dossier.approvedCopyReviewPacket = packetExports.buildResearchedCopyReviewPacket(approvedBytes, {
        ...dossier, status: 'copy_ready', pipelineChecks: { copy: 'pass', hebrewQa: 'pending' },
      });
      assert.equal(packetExports.matchesResearchedCopyReviewPacket(approvedBytes, dossier.approvedCopyReviewPacket), true);
      mutate(record);
      if (legacyCoreThirty) record.legacyCoreThirty = true;
      const setup = harness({ record, dossier, binding: {}, bodyApproval: { approvedCopyReviewPacket: dossier.approvedCopyReviewPacket } });
      assertOrphanRejected(setup, await setup.post());
    });
  }
}

for (const [field, value] of [
  ['approvedPageId', null], ['approvedPageId', ''],
  ['researchedPages', null], ['researchedPages', []],
  ['researchedGraphEdges', null], ['researchedGraphEdges', []],
]) {
  test(`present orphan ${field}=${JSON.stringify(value)} rejects even on a minimal record`, async () => {
    const record = { slug, collectedData: { businessNiche: 'synthetic' }, copy: {}, [field]: value };
    const setup = harness({ record, binding: {} });
    assertOrphanRejected(setup, await setup.post());
  });
}

for (const [kind, createRecord] of [
  ['researched', researchedRecord],
  ['explicit legacy', () => ({ ...researchedRecord(), legacyCoreThirty: true })],
  ['non-researched', () => ({ slug, collectedData: { businessNiche: 'synthetic' }, copy: {} })],
]) {
  for (const [label, change] of [
    ['absent', record => { delete record.slug; }],
    ['null', record => { record.slug = null; }],
    ['non-string', record => { record.slug = 123; }],
    ['different safe slug', record => { record.slug = foreignSlug; }],
    ['case-distinct slug', record => { record.slug = slug.toUpperCase(); }],
    ['whitespace-distinct slug', record => { record.slug = `${slug} `; }],
  ]) {
    test(`${kind} ${label} persisted slug rejects before dossier and external access`, async () => {
      const record = createRecord();
      change(record);
      const dossier = syntheticDossier();
      const approved = kind === 'researched' && label === 'different safe slug';
      const setup = harness({ record, dossier, approved, binding: {}, cloudflare: syntheticCloudflare });
      if (approved) {
        assert.equal(record.slug, foreignSlug);
        assert.equal(packetExports.matchesResearchedCopyReviewPacket(Buffer.from(JSON.stringify(record)), dossier.approvedCopyReviewPacket), true);
      }
      const response = await setup.post();
      assert.deepEqual(response, { status: 409, body: { error: 'invalid_site_record' } });
      assertPreflightOnly(setup, response);
      assert.equal(setup.calls.body, 1);
      assert.equal(setup.calls.site, 1);
      assert.equal(setup.calls.dossier, 0);
      assert.equal(setup.dossierLookups, 0);
      assert.equal(setup.receiptChecks, 0);
      assert.equal(setup.calls.validation, 0);
      assert.equal(setup.io.close, 1);
      assert.deepEqual(setup.io.lstat, ['/synthetic-root/data', '/synthetic-root/data/sites', sitePath]);
      assert.deepEqual(setup.io.open, [sitePath]);
    });
  }
}

for (const [part, node] of [
  ['data', 'symlink'], ['sites', 'symlink'], ['file', 'symlink'],
  ['data', 'file'], ['sites', 'file'], ['file', 'directory'],
  ['data', 'missing'], ['sites', 'missing'], ['file', 'missing'],
  ['file', 'denied'],
]) {
  test(`site ${part} ${node} fails before descriptor or external access`, async () => {
    const setup = harness({ record: researchedRecord(), siteNodes: { [part]: node } });
    const response = await setup.post();
    assert.deepEqual(response, node === 'missing'
      ? { status: 404, body: { error: 'site_not_found' } }
      : { status: 409, body: { error: 'invalid_site_record' } });
    assertPreflightOnly(setup, response);
    assert.deepEqual(setup.io.open, []);
    assert.equal(setup.io.close, 0);
    assert.equal(setup.calls.dossier, 0);
  });
}

test('absent site has no content read', async () => {
  const setup = harness();
  assert.deepEqual(await setup.post(), { status: 404, body: { error: 'site_not_found' } });
  assert.equal(setup.io.reads.length, 0);
  assert.equal(setup.calls.site, 0);
});

for (const [label, options] of [
  ['oversized metadata', { siteStatSize: maxBytes + 1 }],
  ['nonregular descriptor', { siteStatType: 'fifo' }],
  ['descriptor stat failure', { siteStatError: 'EIO' }],
  ['descriptor read failure', { siteReadError: 'EIO' }],
  ['symlink race on open', { siteOpenError: 'ELOOP' }],
]) {
  test(`site ${label} closes opened descriptor and fails generically`, async () => {
    const setup = harness({ record: researchedRecord(), ...options });
    const response = await setup.post();
    assert.deepEqual(response, { status: 409, body: { error: 'invalid_site_record' } });
    assertPreflightOnly(setup, response);
    assert.equal(setup.io.close, options.siteOpenError ? 0 : 1);
    assert.equal(setup.io.reads.length, options.siteStatSize || options.siteStatType !== undefined || options.siteStatError ? 0 : options.siteOpenError ? 0 : 1);
  });
}

test('site disappearing after component inspection yields generic absent response', async () => {
  const setup = harness({ record: researchedRecord(), siteOpenError: 'ENOENT' });
  const response = await setup.post();
  assert.deepEqual(response, { status: 404, body: { error: 'site_not_found' } });
  assertPreflightOnly(setup, response);
  assert.equal(setup.io.close, 0);
});

test('post-stat growth reads at most the limit and one detection byte, then closes', async () => {
  const setup = harness({ record: researchedRecord(), siteStatSize: 5,
    siteReadBytes: Buffer.alloc(maxBytes + 4096, 0x20) });
  const response = await setup.post();
  assert.deepEqual(response, { status: 409, body: { error: 'invalid_site_record' } });
  assertPreflightOnly(setup, response);
  assert.equal(setup.io.totalRead, maxBytes + 1);
  assert.equal(setup.io.reads.at(-1), 1);
  assert.equal(setup.io.close, 1);
});

test('short descriptor reads preserve the raw receipt bytes exactly', async () => {
  const setup = approvedHarness({ record: researchedRecord(), siteReadChunk: 7 });
  assert.deepEqual(await setup.post(), { status: 424, body: { error: 'fraud_blocker_provisioning_required' } });
  assert.ok(setup.io.reads.length > 1);
  assert.equal(setup.io.close, 1);
  assert.equal(setup.calls.dossier, 1);
});

for (const [part, node] of [
  ['base', 'symlink'], ['research', 'symlink'], ['file', 'symlink'],
  ['base', 'file'], ['research', 'file'], ['file', 'directory'],
  ['base', 'missing'], ['research', 'missing'], ['file', 'missing'],
  ['file', 'denied'],
]) {
  test(`dossier ${part} ${node} fails without bounded store access`, async () => {
    const setup = harness({ record: researchedRecord(), dossierNodes: { [part]: node } });
    const response = await setup.post();
    assert.deepEqual(response, { status: 409, body: { error: 'research_dossier_required' } });
    assertPreflightOnly(setup, response);
    assert.equal(setup.calls.dossier, 0);
    assert.equal(setup.io.close, 1);
  });
}

for (const [label, options] of [
  ['malformed identity', { record: { ...researchedRecord(), researchId: '../escape' } }],
  ['bounded store rejects oversized/invalid dossier', { dossier: null }],
  ['bounded store errors', { dossierReadError: 'EIO' }],
]) {
  test(`${label} fails with generic dossier response before external access`, async () => {
    const setup = harness({ record: researchedRecord(), ...options });
    const response = await setup.post();
    assert.deepEqual(response, { status: 409, body: { error: 'research_dossier_required' } });
    assertPreflightOnly(setup, response);
    assert.equal(setup.calls.dossier, label === 'malformed identity' ? 0 : 1);
    assert.equal(setup.io.close, 1);
  });
}

test('absent receipt rejects before credential access, provisioning, rendering, or writes even with body approval', async () => {
  const record = researchedRecord();
  const bodyPacket = packetExports.buildResearchedCopyReviewPacket(Buffer.from(JSON.stringify(record)), {
    ...syntheticDossier(), status: 'copy_ready', pipelineChecks: { copy: 'pass', hebrewQa: 'pending' },
  });
  const setup = harness({ record, bodyApproval: { approvedCopyReviewPacket: bodyPacket }, cloudflare: {} });
  assert.deepEqual(await setup.post(), { status: 409, body: { error: 'copy_review_approval_required' } });
  assert.deepEqual(setup.calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 1,
    vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
  assert.equal(setup.credentialReads, 0);
  assert.deepEqual(setup.deployEvents, []);
});

for (const [label, mutate] of [
  ['one-byte stale copy', record => { record.researchedPages[1].copy.heroHeadline = 'Synthetic homf'; }],
  ['wrong research identity', (_record, dossier) => { dossier.approvedCopyReviewPacket.researchId = 'different'; }],
  ['wrong slug', (_record, dossier) => { dossier.approvedCopyReviewPacket.slug = 'different'; }],
  ['malformed packet', (_record, dossier) => { dossier.approvedCopyReviewPacket = { sha256: 'not-a-digest' }; }],
  ['changed page inventory', (_record, dossier) => { dossier.approvedCopyReviewPacket.pages[1].targetPath = '/different'; }],
  ['wrong page count', (_record, dossier) => { dossier.approvedCopyReviewPacket.pageCount += 1; }],
]) {
  test(`${label} receipt rejects generically before all external or write adapters`, async () => {
    const record = researchedRecord();
    const dossier = syntheticDossier();
    const originalBytes = Buffer.from(JSON.stringify(record));
    dossier.approvedCopyReviewPacket = packetExports.buildResearchedCopyReviewPacket(originalBytes, {
      ...dossier, status: 'copy_ready', pipelineChecks: { copy: 'pass', hebrewQa: 'pending' },
    });
    mutate(record, dossier);
    const rawBytes = label === 'one-byte stale copy' ? Buffer.from(JSON.stringify(record)) : originalBytes;
    const setup = harness({ record, dossier, rawBytes, cloudflare: {}, bodyApproval: { approvedCopyReviewPacket: dossier.approvedCopyReviewPacket } });
    assert.deepEqual(await setup.post(), { status: 409, body: { error: 'copy_review_approval_required' } });
    assert.deepEqual(setup.calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 1,
      vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
    assert.equal(setup.credentialReads, 0);
    assert.deepEqual(setup.deployEvents, []);
  });
}

test('byte-distinct, JSON-equivalent formatting invalidates the receipt', async () => {
  const record = researchedRecord();
  const dossier = syntheticDossier();
  dossier.approvedCopyReviewPacket = packetExports.buildResearchedCopyReviewPacket(Buffer.from(JSON.stringify(record)), {
    ...dossier, status: 'copy_ready', pipelineChecks: { copy: 'pass', hebrewQa: 'pending' },
  });
  const setup = harness({ record, dossier, rawBytes: Buffer.from(JSON.stringify(record, null, 2)) });
  assert.deepEqual(await setup.post(), { status: 409, body: { error: 'copy_review_approval_required' } });
  assert.equal(setup.credentialReads, 0);
  assert.deepEqual(setup.deployEvents, []);
});

for (const [label, rawBytes] of [
  ['malformed JSON', Buffer.from('{')],
  ['invalid UTF-8', Buffer.from([0xff, 0xfe])],
]) {
  test(`${label} record uses a generic invalid-record response`, async () => {
    const setup = harness({ record: researchedRecord(), rawBytes });
    assert.deepEqual(await setup.post(), { status: 409, body: { error: 'invalid_site_record' } });
    assert.equal(setup.io.close, 1);
    assert.equal(setup.calls.dossier, 0);
    assert.equal(setup.credentialReads, 0);
    assert.deepEqual(setup.deployEvents, []);
  });
}

for (const pages of [undefined, []]) {
  test(`researched record with ${pages === undefined ? 'missing' : 'empty'} pages rejects before provisioning or writes`, async () => {
    const record = { slug, researchId: 'synthetic-research', collectedData: {}, copy: {}, ...(pages === undefined ? {} : { researchedPages: pages }) };
    const { post, calls } = harness({ record });
    assert.deepEqual(await post(), { status: 409, body: { error: 'researched_site_pages_required' } });
    assert.deepEqual(calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 0, vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
  });
}

const invalidGraphs = [
  ['missing homepage', record => { record.researchedPages.shift(); }],
  ['duplicate homepage', record => { record.researchedPages[1].classification = 'homepage'; record.researchedPages[1].targetPath = '/'; }],
  ['duplicate ID', record => { record.researchedPages[2].opportunityId = 'hub'; }],
  ['duplicate output path', record => { record.researchedPages[2].targetPath = '/services'; }],
  ['unsafe path', record => { record.researchedPages[1].targetPath = '/../outside'; }],
  ['unknown class', record => { record.researchedPages[1].classification = 'unknown'; }],
  ['malformed copy', record => { record.researchedPages[0].copy.heroHeadline = ''; }],
  ['missing edges', record => { delete record.researchedGraphEdges; }],
  ['non-array edges', record => { record.researchedGraphEdges = {}; }],
  ['unknown edge endpoint', record => { record.researchedGraphEdges[0].toId = 'unknown'; }],
  ['orphan page', record => { record.researchedGraphEdges.pop(); }],
  ['duplicate edge', record => { record.researchedGraphEdges.push({ ...record.researchedGraphEdges[0] }); }],
];
for (const [name, corrupt] of invalidGraphs) {
  test(`invalid researched graph (${name}) returns generic 409 without effects`, async () => {
    const record = researchedRecord();
    corrupt(record);
    const { post, calls } = harness({ record });
    assert.deepEqual(await post(), { status: 409, body: { error: 'researched_site_graph_invalid' } });
    assert.deepEqual(calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 1, vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
  });
}

test('valid researched graph invokes the real validator and reaches synthetic provision failure', async () => {
  const { post, calls } = approvedHarness({ record: researchedRecord() });
  assert.deepEqual(await post(), { status: 424, body: { error: 'fraud_blocker_provisioning_required' } });
  assert.deepEqual(calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 1, vertical: 1, client: 1, provision: 1, state: 1, forbidden: 0 });
});

const unbound = [
  ['dossier research identity', (record, dossier) => { dossier.researchId = 'different-research'; }],
  ['absent opportunities', (record, dossier) => { delete dossier.pageOpportunities; }],
  ['malformed opportunities', (record, dossier) => { dossier.pageOpportunities = {}; }],
  ['malformed opportunity entry', (record, dossier) => { dossier.pageOpportunities[1] = null; }],
  ['malformed opportunity status', (record, dossier) => { dossier.pageOpportunities[1].status = 'unreviewed'; }],
  ['malformed opportunity path', (record, dossier) => { delete dossier.pageOpportunities[1].targetPath; }],
  ['duplicate ready ID', (record, dossier) => { dossier.pageOpportunities.push({ ...dossier.pageOpportunities[1], targetPath: '/different' }); }],
  ['conflicting path', (record, dossier) => { dossier.pageOpportunities.push({ ...dossier.pageOpportunities[1], id: 'different' }); }],
  ['held dossier page selected', (record, dossier) => { dossier.pageOpportunities[1].status = 'held'; }],
  ['unknown dossier page selected', (record, dossier) => { dossier.pageOpportunities[1].status = 'unknown'; }],
  ['omitted ready opportunity', (record, dossier) => { dossier.pageOpportunities.push({ id: 'extra-ready', targetPath: '/extra', status: 'ready', opportunity: 'Extra', evidenceIds: [] }); }],
  ['added page beyond ready set', record => {
    record.researchedPages.push({ opportunityId: 'extra', classification: 'supporting', targetPath: '/extra', copy: structuredClone(copy) });
    record.researchedGraphEdges.push({ fromId: 'hub', toId: 'extra' });
  }],
  ['unknown page ID with equal count and valid graph', record => {
    record.researchedPages[2].opportunityId = 'other';
    record.researchedGraphEdges[1].toId = 'other';
  }],
  ['path-changed page', record => { record.researchedPages[2].targetPath = '/services/two'; }],
  ['path-changed dossier', (record, dossier) => { dossier.pageOpportunities[2].targetPath = '/services/two'; }],
  ['missing approved homepage ID', record => { delete record.approvedPageId; }],
  ['mismatched approved homepage ID', record => { record.approvedPageId = 'hub'; }],
  ['mismatched homepage copy', record => { record.copy.heroHeadline = 'Unapproved home'; }],
  ['conflicting held ID', (record, dossier) => { dossier.pageOpportunities.push({ id: 'home', targetPath: '/held', status: 'held', opportunity: 'Held', evidenceIds: [] }); }],
  ['conflicting held path', (record, dossier) => { dossier.pageOpportunities.push({ id: 'held', targetPath: '/services', status: 'held', opportunity: 'Held', evidenceIds: [] }); }],
];
for (const [name, mutate] of unbound) {
  test(`unbound researched record (${name}) returns exact 409 without downstream effects`, async () => {
    const record = researchedRecord();
    const dossier = syntheticDossier();
    mutate(record, dossier);
    const { post, calls } = harness({ record, dossier });
    assert.deepEqual(await post(), { status: 409, body: { error: 'researched_site_dossier_mismatch' } });
    assert.deepEqual(calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 1, vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
  });
}

test('reordered equivalent pages and opportunities bind and reach synthetic provision failure', async () => {
  const record = researchedRecord();
  const dossier = syntheticDossier();
  record.researchedPages.reverse();
  dossier.pageOpportunities.reverse();
  const { post, calls } = approvedHarness({ record, dossier });
  assert.deepEqual(await post(), { status: 424, body: { error: 'fraud_blocker_provisioning_required' } });
  assert.deepEqual(calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 1, vertical: 1, client: 1, provision: 1, state: 1, forbidden: 0 });
});

test('homepage copy with different object key insertion order binds', async () => {
  const record = researchedRecord();
  record.copy = Object.fromEntries(Object.entries(record.copy).reverse());
  const { post, calls } = approvedHarness({ record });
  assert.deepEqual(await post(), { status: 424, body: { error: 'fraud_blocker_provisioning_required' } });
  assert.deepEqual(calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 1, vertical: 1, client: 1, provision: 1, state: 1, forbidden: 0 });
});

test('missing dossier and not-ready dossier preserve their existing responses and ordering', async () => {
  const missing = harness({ record: researchedRecord(), dossier: null });
  assert.deepEqual(await missing.post(), { status: 409, body: { error: 'research_dossier_required' } });
  assert.deepEqual(missing.calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 0, validation: 0, vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
  const held = harness({ record: researchedRecord(), ready: false });
  assert.deepEqual(await held.post(), { status: 409, body: { error: 'deploy_not_ready', reasons: ['deploy_not_ready'] } });
  assert.deepEqual(held.calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 0, vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
});

test('legacy flag added to approved researched bytes rejects before dossier or credentials', async () => {
  const record = researchedRecord();
  const approvedBytes = Buffer.from(JSON.stringify(record));
  const dossier = syntheticDossier();
  dossier.approvedCopyReviewPacket = packetExports.buildResearchedCopyReviewPacket(approvedBytes, {
    ...dossier, status: 'copy_ready', pipelineChecks: { copy: 'pass', hebrewQa: 'pending' },
  });
  assert.equal(packetExports.matchesResearchedCopyReviewPacket(approvedBytes, dossier.approvedCopyReviewPacket), true);
  record.legacyCoreThirty = true;
  const setup = harness({ record, dossier, binding: {}, bodyApproval: { approvedCopyReviewPacket: dossier.approvedCopyReviewPacket } });
  const response = await setup.post();
  assert.deepEqual(response, { status: 409, body: { error: 'invalid_site_record' } });
  assertPreflightOnly(setup, response);
  assert.equal(setup.calls.dossier, 0);
  assert.equal(setup.dossierLookups, 0);
  assert.equal(setup.receiptChecks, 0);
  assert.equal(setup.calls.validation, 0);
  assert.equal(setup.io.close, 1);
  assert.deepEqual(setup.io.open, [sitePath]);
  assert.deepEqual(setup.io.lstat, ['/synthetic-root/data', '/synthetic-root/data/sites', sitePath]);
});

test('researched legacy flag with no pages or receipt rejects before dossier or credentials', async () => {
  const record = researchedRecord();
  record.legacyCoreThirty = true;
  delete record.researchedPages;
  delete record.researchedGraphEdges;
  const setup = harness({ record, binding: {} });
  const response = await setup.post();
  assert.deepEqual(response, { status: 409, body: { error: 'invalid_site_record' } });
  assertPreflightOnly(setup, response);
  assert.equal(setup.calls.dossier, 0);
  assert.equal(setup.dossierLookups, 0);
  assert.equal(setup.receiptChecks, 0);
  assert.equal(setup.calls.validation, 0);
  assert.equal(setup.io.close, 1);
  assert.deepEqual(setup.io.open, [sitePath]);
  assert.deepEqual(setup.io.lstat, ['/synthetic-root/data', '/synthetic-root/data/sites', sitePath]);
});

test('researchId-absent explicit legacy record retains its Core-30 provisioning path', async () => {
  const record = { slug, legacyCoreThirty: true, coreThirtyNodes: [], coreThirtyCopies: {},
    collectedData: { businessNiche: 'synthetic' }, copy: {} };
  const setup = harness({ record });
  assert.deepEqual(await setup.post(), { status: 424, body: { error: 'fraud_blocker_provisioning_required' } });
  assert.deepEqual(setup.calls, { body: 1, cwd: 2, site: 1, dossier: 0, readiness: 0, validation: 0,
    vertical: 1, client: 1, provision: 1, state: 1, forbidden: 0 });
  assert.equal(setup.io.close, 1);
  assert.equal(setup.credentialReads, 3);
  assert.deepEqual(setup.deployEvents, []);
});

test('researchId-absent legacy record renders Core-30 nodes in the synthetic binding path', async () => {
  const record = { slug, legacyCoreThirty: true,
    coreThirtyNodes: [{ id: 'synthetic-core' }],
    coreThirtyCopies: { 'synthetic-core': { narrative: 'Synthetic', faqItems: [], metaDescription: 'Synthetic' } },
    collectedData: { businessNiche: 'synthetic' }, copy: {} };
  const setup = harness({ record, binding: {}, legacyRender: true });
  assert.deepEqual(await setup.post(), { status: 200, body: { success: true,
    url: `https://${slug}.wao.co.il`, projectName: slug } });
  assert.equal(setup.calls.dossier, 0);
  assert.equal(setup.io.close, 1);
  assert.deepEqual(setup.deployEvents, ['render', 'deduplicate', 'render-core', 'sitemap', 'tmpdir',
    'write', 'write-core', 'write-sitemap', 'project', 'deploy',
    `GET /accounts/synthetic-account/pages/projects/${slug}/domains`,
    `POST /accounts/synthetic-account/pages/projects/${slug}/domains`, 'POST /zones/synthetic-zone/dns_records',
    'client-exists', 'client-record', 'pin', 'client-auth', 'session', 'cookie', 'cleanup']);
});

test('unauthorized POST cannot inspect body, site or dossier or cause any side effect', async () => {
  const { post, calls, io } = harness({ authorized: false, denyBody: true, cloudflare: {} });
  assert.deepEqual(await post(), { status: 401, body: { error: 'unauthorized' } });
  assert.deepEqual(calls, { body: 0, cwd: 0, site: 0, dossier: 0, readiness: 0, validation: 0, vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
  assert.deepEqual(io.lstat, []);
  assert.deepEqual(io.open, []);
});

test('invalid request slug returns 400 before site or provider access', async () => {
  const setup = harness({ bodyApproval: { slug: foreignSlug }, cloudflare: {} });
  assert.deepEqual(await setup.post(), { status: 400, body: { error: 'invalid_deployment_slug' } });
  assert.deepEqual(setup.calls, { body: 1, cwd: 0, site: 0, dossier: 0, readiness: 0, validation: 0,
    vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
  assert.equal(setup.credentialReads, 0);
  assert.deepEqual(setup.io.lstat, []);
  assert.deepEqual(setup.deployEvents, []);
});

test('non-researched record reaches Fraud Blocker and retains its 424 failure response', async () => {
  const { post, calls } = harness({ record: { slug, collectedData: { businessNiche: 'synthetic' }, copy: {} } });
  // Allow only the pure pre-provision theme calculation for this control.
  // A provisioning failure must terminate before rendering or deployment.
  assert.deepEqual(await post(), { status: 424, body: { error: 'fraud_blocker_provisioning_required' } });
  assert.deepEqual(calls, { body: 1, cwd: 2, site: 1, dossier: 0, readiness: 0, validation: 0, vertical: 1, client: 1, provision: 1, state: 1, forbidden: 0 });
});

for (const [field, value, label] of [
  ['CLOUDFLARE_API_TOKEN', undefined, 'absent token'],
  ['CLOUDFLARE_API_TOKEN', '', 'empty token'],
  ['CLOUDFLARE_API_TOKEN', ' \t ', 'blank token'],
  ['CLOUDFLARE_ACCOUNT_ID', undefined, 'absent account'],
  ['CLOUDFLARE_ACCOUNT_ID', '', 'empty account'],
  ['CLOUDFLARE_ACCOUNT_ID', ' \t ', 'blank account'],
  ['CLOUDFLARE_ZONE_ID', undefined, 'absent zone'],
  ['CLOUDFLARE_ZONE_ID', '', 'empty zone'],
  ['CLOUDFLARE_ZONE_ID', ' \t ', 'blank zone'],
]) {
  for (const [kind, createRecord, dossierCalls] of [
    ['researched', researchedRecord, 1],
    ['non-researched', () => ({ slug, collectedData: { businessNiche: 'synthetic' }, copy: {} }), 0],
  ]) {
    test(`${kind} ${label} fails closed before provisioning or writes`, async () => {
      const cloudflare = { ...syntheticCloudflare };
      if (value === undefined) delete cloudflare[field];
      else cloudflare[field] = value;
      const options = { record: createRecord(), cloudflare };
      const { post, calls } = kind === 'researched' ? approvedHarness(options) : harness(options);
      assert.deepEqual(await post(), { status: 503, body: { error: 'deployment_provider_unavailable' } });
      assert.deepEqual(calls, { body: 1, cwd: 2, site: 1, dossier: dossierCalls, readiness: dossierCalls,
        validation: dossierCalls, vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
    });
  }
}

test('graph and dossier mismatch 409 take precedence over missing provider credentials', async () => {
  const graph = researchedRecord();
  graph.researchedGraphEdges = [];
  const invalid = harness({ record: graph, cloudflare: {} });
  assert.deepEqual(await invalid.post(), { status: 409, body: { error: 'researched_site_graph_invalid' } });
  assert.deepEqual(invalid.calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 1,
    vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });

  const unbound = researchedRecord();
  unbound.approvedPageId = 'hub';
  const mismatch = harness({ record: unbound, cloudflare: {} });
  assert.deepEqual(await mismatch.post(), { status: 409, body: { error: 'researched_site_dossier_mismatch' } });
  assert.deepEqual(mismatch.calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 1,
    vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
});

test('explicit simulation is rejected in production before provider access and deployment', async () => {
  const simulation = harness({ record: { slug, simulation: true }, offlineSimulation: true,
    nodeEnv: 'production', cloudflare: {} });
  assert.deepEqual(await simulation.post(), { status: 409, body: { error: 'simulation_deploy_rejected' } });
  assert.deepEqual(simulation.calls, { body: 1, cwd: 2, site: 1, dossier: 0, readiness: 0, validation: 0,
    vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
});

test('test-only simulation cannot bypass missing provider credentials', async () => {
  const simulation = harness({ record: { slug, simulation: true }, offlineSimulation: true, cloudflare: {} });
  assert.deepEqual(await simulation.post(), { status: 503, body: { error: 'deployment_provider_unavailable' } });
  assert.deepEqual(simulation.calls, { body: 1, cwd: 2, site: 1, dossier: 0, readiness: 0, validation: 0,
    vertical: 0, client: 0, provision: 0, state: 0, forbidden: 0 });
});

test('explicit offline simulation retains the synthetic legacy render and binding path', async () => {
  const setup = harness({ record: { slug, simulation: true, researchId: '', approvedPageId: null,
    researchedPages: [], researchedGraphEdges: null, collectedData: { businessNiche: 'synthetic' }, copy: {} },
    offlineSimulation: true, binding: {} });
  assert.deepEqual(await setup.post(), { status: 200, body: { success: true, url: `https://${slug}.wao.co.il`, projectName: slug } });
  assert.equal(setup.calls.dossier, 0);
  assert.equal(setup.io.close, 1);
  assert.deepEqual(setup.deployEvents, ['render', 'tmpdir', 'write', 'project', 'deploy',
    `GET /accounts/synthetic-account/pages/projects/${slug}/domains`,
    `POST /accounts/synthetic-account/pages/projects/${slug}/domains`, 'POST /zones/synthetic-zone/dns_records',
    'client-exists', 'client-record', 'pin', 'client-auth', 'session', 'cookie', 'cleanup']);
});

test('test-only simulation with research identity and legacy flag retains the offline path', async () => {
  const setup = harness({ record: { slug, researchId: 'synthetic-research', simulation: true,
    legacyCoreThirty: true, collectedData: { businessNiche: 'synthetic' }, copy: {} },
  offlineSimulation: true, binding: {} });
  assert.deepEqual(await setup.post(), { status: 200, body: { success: true,
    url: `https://${slug}.wao.co.il`, projectName: slug } });
  assert.equal(setup.calls.dossier, 0);
  assert.equal(setup.dossierLookups, 0);
  assert.equal(setup.io.close, 1);
  assert.deepEqual(setup.deployEvents, ['render', 'tmpdir', 'write', 'project', 'deploy',
    `GET /accounts/synthetic-account/pages/projects/${slug}/domains`,
    `POST /accounts/synthetic-account/pages/projects/${slug}/domains`, 'POST /zones/synthetic-zone/dns_records',
    'client-exists', 'client-record', 'pin', 'client-auth', 'session', 'cookie', 'cleanup']);
});

test('synthetic Wrangler deploy failure cannot create client account or return success', async () => {
  const { post, calls, deployEvents } = approvedHarness({ record: researchedRecord(), failWranglerDeploy: true });
  assert.deepEqual(await post(), { status: 500, body: { error: 'Deploy failed' } });
  assert.deepEqual(deployEvents, ['render', 'tmpdir', 'write', 'project', 'deploy', 'cleanup', 'error']);
  assert.deepEqual(calls, { body: 1, cwd: 2, site: 1, dossier: 1, readiness: 1, validation: 1,
    vertical: 1, client: 1, provision: 1, state: 0, forbidden: 0 });
});

const hostname = `${slug}.wao.co.il`;
const target = `${slug}.pages.dev`;
const domainResult = { name: hostname, status: 'pending', zone_tag: 'synthetic-zone',
  validation_data: { method: 'http', status: 'initializing' }, verification_data: { status: 'pending' } };
const dnsResult = { type: 'CNAME', name: hostname, content: target };
const cfResponse = (ok, status, data) => ({ ok, status, json: async () => data });
const accepted = result => cfResponse(true, 200, { success: true, result });
const rejected = (status = 400, errors = []) => cfResponse(false, status, { success: false, errors });
const dnsConflict = rejected(400, [{ code: 81053 }]);
const listedDomains = result => cfResponse(true, 200, { success: true, result,
  result_info: { page: 1, count: result.length, total_pages: 1 } });
const activeDomainResult = { ...domainResult, status: 'active',
  validation_data: { method: 'http', status: 'active' }, verification_data: { status: 'active' } };
const domainPostEvent = `POST /accounts/synthetic-account/pages/projects/${slug}/domains`;
const domainGetEvent = `GET /accounts/synthetic-account/pages/projects/${slug}/domains/${hostname}`;
const domainListEvent = `GET /accounts/synthetic-account/pages/projects/${slug}/domains`;
const dnsPostEvent = 'POST /zones/synthetic-zone/dns_records';
const dnsGetEvent = `GET /zones/synthetic-zone/dns_records?name.exact=${hostname}&per_page=2`;
const beforeProvider = ['render', 'tmpdir', 'write', 'project', 'deploy'];
const successBody = { status: 200, body: { success: true, url: `https://${hostname}`, projectName: slug } };
const failedBody = { status: 502, body: { error: 'deployment_domain_binding_failed' } };

for (const [label, binding, expectedEvents] of [
  ['domain rejected', { domainPost: rejected() }, [domainPostEvent]],
  ['domain HTTP 200 success false', { domainPost: cfResponse(true, 200, { success: false, result: domainResult }) }, [domainPostEvent]],
  ['domain missing result', { domainPost: cfResponse(true, 200, { success: true }) }, [domainPostEvent]],
  ['domain array result', { domainPost: accepted([domainResult]) }, [domainPostEvent]],
  ['domain missing hostname', { domainPost: accepted({ ...domainResult, name: undefined }) }, [domainPostEvent]],
  ['domain mismatched hostname', { domainPost: accepted({ ...domainResult, name: 'other.wao.co.il' }) }, [domainPostEvent]],
  ['domain blocked', { domainPost: accepted({ ...domainResult, status: 'blocked' }) }, [domainPostEvent]],
  ['domain error', { domainPost: accepted({ ...domainResult, status: 'error' }) }, [domainPostEvent]],
  ['domain deactivated', { domainPost: accepted({ ...domainResult, status: 'deactivated' }) }, [domainPostEvent]],
  ['domain missing top-level status', { domainPost: accepted({ ...domainResult, status: undefined }) }, [domainPostEvent]],
  ['domain unknown top-level status', { domainPost: accepted({ ...domainResult, status: 'unknown' }) }, [domainPostEvent]],
  ['domain wrong zone', { domainPost: accepted({ ...domainResult, zone_tag: 'other-zone' }) }, [domainPostEvent]],
  ['domain missing zone', { domainPost: accepted({ ...domainResult, zone_tag: undefined }) }, [domainPostEvent]],
  ['domain contradictory project', { domainPost: accepted({ ...domainResult, project_name: 'other' }) }, [domainPostEvent]],
  ['domain wrong account path', { expectedPaths: [domainListEvent, `POST /accounts/other/pages/projects/${slug}/domains`] }, [domainPostEvent]],
  ['domain wrong project path', { expectedPaths: [domainListEvent, `POST /accounts/synthetic-account/pages/projects/other/domains`] }, [domainPostEvent]],
  ['domain redirect', { redirectRequest: domainPostEvent }, [domainPostEvent]],
  ['domain provider network failure', { failRequest: domainPostEvent }, [domainPostEvent]],
  ['domain malformed JSON', { domainPost: { ok: true, status: 200, json: async () => { throw new Error('synthetic invalid JSON'); } } }, [domainPostEvent]],
  ['DNS rejected', { dnsPost: rejected() }, [domainPostEvent, dnsPostEvent]],
  ['DNS HTTP 200 success false', { dnsPost: cfResponse(true, 200, { success: false, result: dnsResult }) }, [domainPostEvent, dnsPostEvent]],
  ['DNS missing result', { dnsPost: cfResponse(true, 200, { success: true }) }, [domainPostEvent, dnsPostEvent]],
  ['DNS wrong type', { dnsPost: accepted({ ...dnsResult, type: 'A' }) }, [domainPostEvent, dnsPostEvent]],
  ['DNS wrong target', { dnsPost: accepted({ ...dnsResult, content: 'other.pages.dev' }) }, [domainPostEvent, dnsPostEvent]],
  ['DNS wrong name', { dnsPost: accepted({ ...dnsResult, name: 'other.wao.co.il' }) }, [domainPostEvent, dnsPostEvent]],
  ['DNS contradictory zone', { dnsPost: accepted({ ...dnsResult, zone_id: 'other-zone' }) }, [domainPostEvent, dnsPostEvent]],
  ['DNS wrong zone path', { expectedPaths: [domainListEvent, domainPostEvent, 'POST /zones/other/dns_records'] }, [domainPostEvent, dnsPostEvent]],
  ['DNS redirect', { redirectRequest: dnsPostEvent }, [domainPostEvent, dnsPostEvent]],
  ['DNS provider network failure', { failRequest: dnsPostEvent }, [domainPostEvent, dnsPostEvent]],
  ['DNS malformed JSON', { dnsPost: { ok: true, status: 200, json: async () => { throw new Error('synthetic invalid JSON'); } } }, [domainPostEvent, dnsPostEvent]],
  ['81053 wrong-target readback', { dnsPost: dnsConflict, dnsGet: accepted([{ ...dnsResult, content: 'wrong.pages.dev' }]) }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['81053 wrong-type readback', { dnsPost: dnsConflict, dnsGet: cfResponse(true, 200, { success: true, result: [{ ...dnsResult, type: 'A' }], result_info: { total_pages: 1, count: 1 } }) }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['81053 wrong-name readback', { dnsPost: dnsConflict, dnsGet: cfResponse(true, 200, { success: true, result: [{ ...dnsResult, name: 'other.wao.co.il' }], result_info: { total_pages: 1, count: 1 } }) }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['81053 contradictory-zone readback', { dnsPost: dnsConflict, dnsGet: cfResponse(true, 200, { success: true, result: [{ ...dnsResult, zone_id: 'other-zone' }], result_info: { total_pages: 1, count: 1 } }) }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['81053 success-false readback', { dnsPost: dnsConflict, dnsGet: cfResponse(true, 200, { success: false, result: [dnsResult], result_info: { total_pages: 1, count: 1 } }) }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['81053 duplicate readback', { dnsPost: dnsConflict, dnsGet: accepted([dnsResult, dnsResult]) }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['81053 unpaginated readback', { dnsPost: dnsConflict, dnsGet: accepted([dnsResult]) }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['81053 absent readback', { dnsPost: dnsConflict, dnsGet: cfResponse(true, 200, { success: true, result: [], result_info: { total_pages: 1, count: 0 } }) }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['81053 extra pages', { dnsPost: dnsConflict, dnsGet: cfResponse(true, 200, { success: true, result: [dnsResult], result_info: { total_pages: 2, count: 1 } }) }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['81053 wrong zone path', { dnsPost: dnsConflict, expectedPaths: [domainListEvent, domainPostEvent, dnsPostEvent, 'GET /zones/other/dns_records'] }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['81053 redirect', { dnsPost: dnsConflict, redirectRequest: dnsGetEvent }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['domain conflict on another project', { domainPost: rejected(409), domainGet: accepted({ ...domainResult, project_name: 'other' }) }, [domainPostEvent, domainGetEvent]],
  ['domain conflict unprovable', { domainPost: rejected(409), domainGet: rejected(404) }, [domainPostEvent, domainGetEvent]],
  ['domain conflict wrong hostname', { domainPost: rejected(409), domainGet: accepted({ ...domainResult, name: 'other.wao.co.il' }) }, [domainPostEvent, domainGetEvent]],
  ['domain conflict missing result', { domainPost: rejected(409), domainGet: cfResponse(true, 200, { success: true }) }, [domainPostEvent, domainGetEvent]],
  ['domain conflict success-false', { domainPost: rejected(409), domainGet: cfResponse(true, 200, { success: false, result: domainResult }) }, [domainPostEvent, domainGetEvent]],
  ['domain conflict wrong project path', { domainPost: rejected(409), expectedPaths: [domainListEvent, domainPostEvent, `GET /accounts/synthetic-account/pages/projects/other/domains/${hostname}`] }, [domainPostEvent, domainGetEvent]],
  ['domain conflict redirect', { domainPost: rejected(409), redirectRequest: domainGetEvent }, [domainPostEvent, domainGetEvent]],
  ['domain conflict network failure', { domainPost: rejected(409), failRequest: domainGetEvent }, [domainPostEvent, domainGetEvent]],
]) {
  test(`${label} fails closed after Wrangler but before client bridge`, async () => {
    const setup = approvedHarness({ record: researchedRecord(), binding });
    assert.deepEqual(await setup.post(), failedBody);
    assert.deepEqual(setup.deployEvents, [...beforeProvider, domainListEvent, ...expectedEvents, 'cleanup']);
    assert.equal(setup.calls.forbidden, label.includes('wrong') && label.includes('path') ? 1 : 0);
  });
}

const invalidDomainFields = [
  ['missing validation object', domain => { delete domain.validation_data; }],
  ['missing verification object', domain => { delete domain.verification_data; }],
  ['missing validation method', domain => { delete domain.validation_data.method; }],
  ['unknown validation method', domain => { domain.validation_data.method = 'dns'; }],
  ['missing validation status', domain => { delete domain.validation_data.status; }],
  ['unknown validation status', domain => { domain.validation_data.status = 'unknown'; }],
  ...['blocked', 'error', 'deactivated'].map(status => [`${status} validation status`, domain => { domain.validation_data.status = status; }]),
  ['missing verification status', domain => { delete domain.verification_data.status; }],
  ['unknown verification status', domain => { domain.verification_data.status = 'unknown'; }],
  ...['blocked', 'error', 'deactivated'].map(status => [`${status} verification status`, domain => { domain.verification_data.status = status; }]),
];
for (const [stage, bindingFor] of [
  ['POST', domain => ({ domainPost: accepted(domain) })],
  ['GET after 409', domain => ({ domainPost: rejected(409), domainGet: accepted(domain) })],
  ['listed', domain => ({ domainList: listedDomains([domain]) })],
]) {
  for (const [label, mutate] of invalidDomainFields) {
    test(`domain ${stage} ${label} fails before client activation`, async () => {
      const domain = structuredClone(domainResult);
      mutate(domain);
      const setup = approvedHarness({ record: researchedRecord(), binding: bindingFor(domain) });
      assert.deepEqual(await setup.post(), failedBody);
      assert.deepEqual(setup.deployEvents, [...beforeProvider,
        ...(stage === 'listed' ? [domainListEvent] : [domainListEvent, domainPostEvent]),
        ...(stage === 'GET after 409' ? [domainGetEvent] : []), 'cleanup']);
      assert.equal(setup.calls.forbidden, 0);
    });
  }
}

for (const [label, binding, events] of [
  ['documented-shaped new domain and DNS', {}, [domainPostEvent, dnsPostEvent]],
  ['matching existing DNS', { dnsPost: dnsConflict }, [domainPostEvent, dnsPostEvent, dnsGetEvent]],
  ['documented-shaped matching existing Pages domain and DNS', { domainPost: rejected(409), dnsPost: dnsConflict },
    [domainPostEvent, domainGetEvent, dnsPostEvent, dnsGetEvent]],
  ['allowed TXT validation and active nested statuses', { domainPost: accepted({ ...domainResult, status: 'active', validation_data: { method: 'txt', status: 'active' }, verification_data: { status: 'active' } }) }, [domainPostEvent, dnsPostEvent]],
  ['allowed pending nested statuses on existing Pages domain', { domainPost: rejected(409), domainGet: accepted({ ...domainResult, validation_data: { method: 'http', status: 'pending' } }) }, [domainPostEvent, domainGetEvent, dnsPostEvent]],
]) {
  test(`${label} reaches first-time client auth and cookie only after binding`, async () => {
    const setup = approvedHarness({ record: researchedRecord(), binding });
    assert.deepEqual(await setup.post(), successBody);
    assert.deepEqual(setup.deployEvents, [...beforeProvider, domainListEvent, ...events, 'client-exists', 'client-record', 'pin', 'client-auth', 'session', 'cookie', 'cleanup']);
    assert.equal(setup.calls.forbidden, 0);
  });
}

test('non-researched new binding also reaches the original first-time bridge', async () => {
  const setup = harness({ record: { slug, collectedData: { businessNiche: 'synthetic' }, copy: {} }, binding: {} });
  assert.deepEqual(await setup.post(), successBody);
  assert.deepEqual(setup.deployEvents, [...beforeProvider, domainListEvent, domainPostEvent, dnsPostEvent,
    'client-exists', 'client-record', 'pin', 'client-auth', 'session', 'cookie', 'cleanup']);
  assert.equal(setup.calls.forbidden, 0);
});

// Idempotent attach: a redeploy whose hostname is already on the Pages project
// must never re-POST it (Cloudflare rejects that with a non-409 status).
test('already-attached Pages domain skips the POST and still binds DNS', async () => {
  const otherDomain = { ...activeDomainResult, name: 'other.wao.co.il' };
  const setup = approvedHarness({ record: researchedRecord(),
    binding: { domainList: listedDomains([otherDomain, activeDomainResult]), dnsPost: dnsConflict } });
  assert.deepEqual(await setup.post(), successBody);
  assert.ok(!setup.deployEvents.includes(domainPostEvent), 'no domain POST for an attached hostname');
  assert.deepEqual(setup.deployEvents, [...beforeProvider, domainListEvent, dnsPostEvent, dnsGetEvent,
    'client-exists', 'client-record', 'pin', 'client-auth', 'session', 'cookie', 'cleanup']);
  assert.equal(setup.calls.forbidden, 0);
});

test('absent Pages domain is POSTed after the read-only listing', async () => {
  const setup = approvedHarness({ record: researchedRecord(),
    binding: { domainList: listedDomains([{ ...activeDomainResult, name: 'other.wao.co.il' }]) } });
  assert.deepEqual(await setup.post(), successBody);
  assert.deepEqual(setup.deployEvents, [...beforeProvider, domainListEvent, domainPostEvent, dnsPostEvent,
    'client-exists', 'client-record', 'pin', 'client-auth', 'session', 'cookie', 'cleanup']);
  assert.equal(setup.calls.forbidden, 0);
});

test('absent Pages domain whose POST fails with a non-409 still returns 502', async () => {
  const setup = approvedHarness({ record: researchedRecord(),
    binding: { domainPost: rejected(400, [{ code: 8000018 }]) } });
  assert.deepEqual(await setup.post(), failedBody);
  assert.deepEqual(setup.deployEvents, [...beforeProvider, domainListEvent, domainPostEvent, 'cleanup']);
  assert.equal(setup.calls.forbidden, 0);
});

for (const [label, binding, events] of [
  ['listing rejected', { domainList: rejected(403) }, [domainListEvent]],
  ['listing success false', { domainList: cfResponse(true, 200, { success: false, result: [] }) }, [domainListEvent]],
  ['listing non-array result', { domainList: accepted(activeDomainResult) }, [domainListEvent]],
  ['listing network failure', { failRequest: domainListEvent }, [domainListEvent]],
  ['listing redirect', { redirectRequest: domainListEvent }, [domainListEvent]],
  ['listing duplicate hostname', { domainList: listedDomains([activeDomainResult, activeDomainResult]) }, [domainListEvent]],
  ['listed hostname on wrong zone', { domainList: listedDomains([{ ...activeDomainResult, zone_tag: 'other-zone' }]) }, [domainListEvent]],
  ['listed hostname blocked', { domainList: listedDomains([{ ...activeDomainResult, status: 'blocked' }]) }, [domainListEvent]],
]) {
  test(`${label} fails closed without a domain POST`, async () => {
    const setup = approvedHarness({ record: researchedRecord(), binding });
    assert.deepEqual(await setup.post(), failedBody);
    assert.deepEqual(setup.deployEvents, [...beforeProvider, ...events, 'cleanup']);
    assert.equal(setup.calls.forbidden, 0);
  });
}

// Launch step 2 (B4), with the real claim check: an unverified licence in a heading the renderer cannot drop stops the
// deploy with 409 before any credential read or provider call.
test('real claim check: an unverified licence number in the home H1 returns 409 unverified_claim_in_heading before any external call', async () => {
  const record = researchedRecord();
  record.collectedData.license = 'LIC 48211';
  record.researchedPages[0].copy.heroHeadline = 'Licensed plumber LIC 48211 in town';
  record.copy = structuredClone(record.researchedPages[0].copy);
  const setup = harness({ record, approved: true, cloudflare: {}, realClaimCheck: true });
  const response = await setup.post();
  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { error: 'unverified_claim_in_heading', fields: ['home:heroHeadline'] });
  assert.equal(setup.credentialReads, 0);
  assert.deepEqual(setup.deployEvents, []);
});

test('real claim check control: the same record with no licence passes the claim check and reaches the provider-credential step', async () => {
  const record = researchedRecord();
  record.researchedPages[0].copy.heroHeadline = 'Licensed plumber LIC 48211 in town';
  record.copy = structuredClone(record.researchedPages[0].copy);
  const setup = harness({ record, approved: true, cloudflare: {}, realClaimCheck: true });
  const response = await setup.post();
  assert.notEqual(response.body.error, 'unverified_claim_in_heading');
  assert.deepEqual(response, { status: 503, body: { error: 'deployment_provider_unavailable' } });
  assert.ok(setup.credentialReads > 0, 'the claim check passed, so the route went on to read the provider credentials');
  assert.deepEqual(setup.deployEvents, []);
});
