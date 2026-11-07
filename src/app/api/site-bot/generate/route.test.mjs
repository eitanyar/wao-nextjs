import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const requireCompiled = createRequire(path.join(process.cwd(), 'dist/package.json'));
const { assertBoundedPageBrief, compilePageBrief } = requireCompiled('./lib/site-bot/research/pageBrief.js');

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/generate/route.ts');
const source = fs.readFileSync(routePath, 'utf8');
const code = ts.transpileModule(source, {
  fileName: routePath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

const dossierPath = '/synthetic-root/data/site-research/synthetic-research.json';

class SyntheticCopyValidationError extends Error {
  constructor() {
    super('Invalid bounded generated site copy.');
    this.stage = 'tamar';
    this.violations = [{ field: 'stickyBarLine', rule: 'max_length', limit: 25, actual: 33 }];
  }
}
const components = ['/synthetic-root/data', '/synthetic-root/data/site-research', dossierPath];

function harness({ authorized = true, simulation = false, target = 'absent', dossierOverride, pathFailure, researchPath = dossierPath, readerFailure, failure } = {}) {
  const calls = { auth: 0, json: 0, path: 0, stat: 0, dossier: 0, gate: 0, brief: 0, preflight: 0, copy: 0, persist: 0, provider: 0, write: 0, simulated: 0, vertical: 0, cwd: 0 };
  const order = [];
  const step = name => { calls[name]++; order.push(name); };
  const expectResearch = name => {
    step(name);
    assert.equal(authorized, true, `${name} before authorization`);
    assert.equal(simulation, false, `${name} during simulation`);
  };
  const dossier = dossierOverride === undefined ? { researchId: 'synthetic-research', status: 'copy_ready', humanGates: [] } : dossierOverride;
  const record = { slug: 'synthetic-site', researchId: 'synthetic-research', researchedPages: [{ opportunityId: 'home' }, { opportunityId: 'service' }] };
  const imports = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    'node:path': path,
    '@/lib/dataRoots': {
      dataRoot: kind => {
        expectResearch('cwd');
        assert.equal(kind, 'siteResearch');
        return { dir: '/synthetic-root/data/site-research', walkBase: '/synthetic-root', overridden: false };
      },
      sitesDir: () => { expectResearch('cwd'); return '/synthetic-root/data/sites'; },
    },
    'node:fs': { lstatSync: file => {
      expectResearch('stat');
      const index = calls.stat - 1;
      assert.equal(file, components[index], 'path components must be checked in order');
      if (pathFailure?.index === index && pathFailure.type === 'missing') throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      if (pathFailure?.index === index && pathFailure.type === 'denied') throw Object.assign(new Error('denied'), { code: 'EACCES' });
      const type = pathFailure?.index === index ? pathFailure.type : (index === components.length - 1 ? 'file' : 'directory');
      return { isSymbolicLink: () => type === 'symlink', isFile: () => type === 'file', isDirectory: () => type === 'directory' };
    } },
    '@/lib/site-bot/research/pageBrief': { assertBoundedPageBrief: value => {
      expectResearch('brief');
      assertBoundedPageBrief(value);
    } },
    'next/headers': { cookies: async () => ({ get: name => {
      assert.equal(name, 'synthetic-admin-cookie');
      return { value: 'synthetic-admin-token' };
    } }) },
    '@/lib/site-bot/research/researchStore': {
      getResearchPath: id => {
        expectResearch('path');
        assert.equal(id, 'synthetic-research');
        return researchPath;
      },
      readResearchDossier: async (id, baseDir, options) => {
        expectResearch('dossier');
        assert.equal(id, 'synthetic-research');
        assert.equal(baseDir, undefined);
        assert.equal(options?.bounded, true);
        assert.deepEqual(Object.keys(options), ['bounded']);
        assert.equal(calls.stat, components.length, 'all path components checked before read');
        return readerFailure ? null : dossier;
      },
      writeResearchDossierAtomic: async () => { step('write'); throw new Error('unexpected direct dossier write'); },
    },
    '@/lib/lp/researchPageCopy': {
      buildSimulationGenerationResult: data => {
        step('simulated');
        assert.equal(simulation, true);
        assert.equal(data.businessNiche, 'synthetic-niche');
        return { heroHeadline: 'synthetic simulation' };
      },
      generateResearchPageCopy: async () => { step('provider'); throw new Error('unexpected copy provider call'); },
      GeneratedCopyValidationError: SyntheticCopyValidationError,
    },
    '@/lib/lp/verticalDetect': { detectVertical: niche => {
      expectResearch('vertical');
      assert.equal(niche, 'synthetic-niche');
      return 'synthetic';
    } },
    '@/lib/lp/verticalThemes': { VERTICAL_THEMES: { synthetic: { name: 'synthetic-theme' } } },
    '@/lib/lp/verticalAssets': { VERTICAL_ASSETS: { synthetic: { heroImages: [{ url: 'https://example.invalid/hero' }] } } },
    '@/lib/admin-auth': {
      ADMIN_COOKIE_NAME: 'synthetic-admin-cookie',
      verifyAdminToken: async token => {
        step('auth');
        assert.equal(token, 'synthetic-admin-token');
        return authorized;
      },
    },
    '@/lib/deployment/deploy-access': { isSafeDeploymentSlug: slug => slug === 'synthetic-site' },
    '@/lib/site-bot/researchedSiteGeneration': {
      assertResearchedGenerationReady: (actual, researchId) => {
        expectResearch('gate');
        assert.equal(actual, dossier);
        assert.equal(researchId, 'synthetic-research');
        if (!actual || actual.status !== 'copy_ready' || actual.researchId !== researchId ||
          !Array.isArray(actual.humanGates) || actual.humanGates.some(gate => (
            !gate || typeof gate !== 'object' || Array.isArray(gate) || gate.status !== 'approved'
          ))) throw new Error('not ready: private gate note');
      },
      preflightResearchedSiteTarget: (slug, researchId, options) => {
        expectResearch('preflight');
        assert.equal(slug, record.slug);
        assert.equal(researchId, record.researchId);
        assert.equal(options.sitesRoot, '/synthetic-root/data/sites');
        if (target === 'foreign' || target === 'invalid') throw new Error('synthetic occupied target');
        assert.ok(target === 'absent' || target === 'same', 'unexpected target policy');
      },
      buildResearchedSiteGeneration: async (input, dependencies) => {
        expectResearch('copy');
        assert.equal(input.slug, record.slug);
        assert.equal(input.researchId, record.researchId);
        assert.equal(input.dossier, dossier);
        assert.equal(input.collectedData.businessNiche, 'synthetic-niche');
        assert.equal(input.pageBriefs.length, 1);
        assert.equal(input.graphEdges.length, 0);
        assert.equal(typeof dependencies.generateCopy, 'function');
        assert.equal(dependencies.renderInputs.siteUrl, 'https://synthetic-site.wao.co.il');
        if (failure === 'copy') throw new Error('synthetic copy failure: private detail');
        if (failure === 'validation') throw new SyntheticCopyValidationError();
        return record;
      },
      persistResearchedSiteRecordAtomic: async (actual, options) => {
        expectResearch('persist');
        assert.equal(actual, record);
        assert.equal(options.dossier, dossier);
        assert.equal(options.sitesRoot, '/synthetic-root/data/sites');
        assert.equal(typeof options.writeDossier, 'function');
        if (failure === 'persist') throw new Error('synthetic persistence failure: private detail');
      },
    },
  };
  const exports = {};
  const logs = [];
  vm.runInNewContext(code, {
    exports,
    console: { error: (...args) => logs.push(args.join(' ')) },
    require: name => {
      assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
      return imports[name];
    },
    process: new Proxy({}, { get: (_, key) => { throw new Error(`unexpected process.${String(key)}`); } }),
  }, { filename: routePath });
  async function post(body) {
    const response = await exports.POST({ json: async () => {
      step('json');
      assert.equal(authorized, true, 'unauthorized request body read');
      return body;
    } });
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    return { status: response.status, body: await response.json() };
  }
  return { post, calls, order, logs };
}

const checkedPath = ['path', 'cwd', 'stat', 'stat', 'stat'];
const checkedDossier = [...checkedPath, 'dossier'];
const counts = (overrides = {}) => ({
  auth: 1, json: 1, path: 1, stat: 3, dossier: 1, gate: 0, brief: 0, preflight: 0,
  copy: 0, persist: 0, provider: 0, write: 0, simulated: 0, vertical: 0, cwd: 1,
  ...overrides,
});

const input = {
  slug: 'synthetic-site',
  researchId: 'synthetic-research',
  collectedData: { businessNiche: 'synthetic-niche' },
  pageBriefs: [compilePageBrief({
    page: { id: 'home', targetPath: '/', pageClass: 'homepage' },
    persona: { id: 'persona', value: 'buyer', status: 'approved' },
    waoOffer: { id: 'offer', value: 'offer', status: 'approved' },
    targetQueries: [], entityAnchors: [], firstPartyProof: [], localFacts: [], customerDecisions: [], constraints: [],
    links: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [],
  })],
  graphEdges: [],
};

test('approved and empty-gate dossiers with absent and same-identity targets generate non-deployable', async () => {
  for (const target of ['absent', 'same']) for (const humanGates of [[], [{ id: 'private-gate', status: 'approved', note: 'private note' }]]) {
    const route = harness({ target, dossierOverride: { researchId: input.researchId, status: 'copy_ready', humanGates } });
    assert.deepEqual(await route.post({ ...input, hebrewQa: 'pass', deployable: true, approved: true }), {
      status: 200, body: { success: true, slug: 'synthetic-site', simulation: false, deployable: false, pageCount: 2 },
    });
    assert.deepEqual(route.order, ['auth', 'json', ...checkedDossier, 'gate', 'brief', 'cwd', 'preflight', 'vertical', 'copy', 'persist'], target);
    assert.deepEqual(route.calls, counts({ gate: 1, brief: 1, preflight: 1, copy: 1, persist: 1, vertical: 1, cwd: 2 }));
  }
});

test('foreign and invalid targets fail before vertical, copy, provider or persistence', async () => {
  for (const target of ['foreign', 'invalid']) {
    const route = harness({ target });
    assert.deepEqual(await route.post(input), {
      status: 502, body: { error: 'research_generation_failed', reason: 'site_target_conflict', deployable: false },
    });
    assert.equal(route.logs.length, 1);
    assert.match(route.logs[0], /^\[site-bot generate\] research_generation_failed \{"reason":"site_target_conflict","slug":"synthetic-site","researchId":"synthetic-research","message":"synthetic occupied target"\}$/);
    assert.deepEqual(route.order, ['auth', 'json', ...checkedDossier, 'gate', 'brief', 'cwd', 'preflight'], target);
    assert.deepEqual(route.calls, counts({ gate: 1, brief: 1, preflight: 1, cwd: 2 }));
  }
  const reasons = { copy: 'copy_generation_failed', validation: 'copy_validation_failed', persist: 'persist_failed' };
  for (const failure of ['copy', 'validation', 'persist']) {
    const route = harness({ failure });
    assert.deepEqual(await route.post(input), {
      status: 502, body: { error: 'research_generation_failed', reason: reasons[failure], deployable: false },
    }, failure);
    assert.equal(route.logs.length, 1, failure);
    assert.match(route.logs[0], new RegExp(`"reason":"${reasons[failure]}"`), failure);
    if (failure === 'validation') {
      assert.match(route.logs[0], /"stage":"tamar","violations":\[\{"field":"stickyBarLine","rule":"max_length","limit":25,"actual":33\}\]/);
    }
    assert.deepEqual(route.order, [
      'auth', 'json', ...checkedDossier, 'gate', 'brief', 'cwd', 'preflight', 'vertical', 'copy',
      ...(failure === 'persist' ? ['persist'] : []),
    ], failure);
    assert.deepEqual(route.calls, counts({
      gate: 1, brief: 1, preflight: 1, copy: 1, persist: failure === 'persist' ? 1 : 0, vertical: 1, cwd: 2,
    }), failure);
  }
});

test('pending, held, rejected, malformed gates and dossier identity fail before target and copy work', async () => {
  const approved = { id: 'private-gate', status: 'approved', note: 'private note' };
  const cases = [
    ['pending', { humanGates: [approved, { ...approved, status: 'pending' }] }],
    ['held', { humanGates: [{ ...approved, status: 'held' }] }],
    ['rejected', { humanGates: [{ ...approved, status: 'rejected' }] }],
    ['unknown', { humanGates: [{ ...approved, status: 'unknown' }] }],
    ['missing gates', { humanGates: undefined }],
    ['null gates', { humanGates: null }],
    ['object gates', { humanGates: {} }],
    ['null entry', { humanGates: [null] }],
    ['array entry', { humanGates: [[]] }],
    ['primitive entry', { humanGates: ['approved'] }],
    ['missing status', { humanGates: [{}] }],
    ['foreign dossier', { researchId: 'other-research', humanGates: [approved] }],
    ['missing dossier ID', { researchId: undefined, humanGates: [approved] }],
    ['non-copy-ready', { status: 'held', humanGates: [approved] }],
  ];
  for (const [name, override] of cases) {
    const route = harness({ target: 'foreign', dossierOverride: { researchId: input.researchId, status: 'copy_ready', ...override } });
    assert.deepEqual(await route.post(input), {
      status: 409, body: { error: 'research_copy_not_ready', deployable: false },
    }, name);
    assert.deepEqual(route.order, ['auth', 'json', ...checkedDossier, 'gate'], name);
    assert.deepEqual(route.calls, counts({ gate: 1 }), name);
  }
});

test('missing and unsafe dossier paths or bounded reader failures reject before generation', async () => {
  const route = harness({ dossierOverride: null });
  assert.deepEqual(await route.post(input), { status: 409, body: { error: 'research_copy_not_ready', deployable: false } });
  assert.deepEqual(route.order, ['auth', 'json', ...checkedDossier]);
  assert.deepEqual(route.calls, counts());
  for (const index of [0, 1, 2]) for (const type of ['symlink', 'missing', 'denied', index === 2 ? 'directory' : 'file']) {
    const route = harness({ pathFailure: { index, type } });
    assert.deepEqual(await route.post(input), { status: 409, body: { error: 'research_copy_not_ready', deployable: false } }, `${index}: ${type}`);
    assert.deepEqual(route.order, ['auth', 'json', 'path', 'cwd', ...Array(index + 1).fill('stat')], `${index}: ${type}`);
    assert.deepEqual(route.calls, counts({ stat: index + 1, dossier: 0 }), `${index}: ${type}`);
  }
  for (const researchPath of [null, '/outside/synthetic-research.json', '/synthetic-root', '/synthetic-root/../outside/record.json']) {
    const route = harness({ researchPath });
    assert.deepEqual(await route.post(input), { status: 409, body: { error: 'research_copy_not_ready', deployable: false } }, String(researchPath));
    assert.deepEqual(route.order, researchPath ? ['auth', 'json', 'path', 'cwd'] : ['auth', 'json', 'path']);
    assert.deepEqual(route.calls, counts({ stat: 0, dossier: 0, cwd: researchPath ? 1 : 0 }));
  }
  for (const readerFailure of ['oversized', 'malformed']) {
    const route = harness({ readerFailure });
    assert.deepEqual(await route.post(input), { status: 409, body: { error: 'research_copy_not_ready', deployable: false } });
    assert.deepEqual(route.order, ['auth', 'json', ...checkedDossier], readerFailure);
    assert.deepEqual(route.calls, counts(), readerFailure);
  }
});

test('malformed nested briefs fail generically before target preflight and paid work', async () => {
  const invalid = [
    ['missing offer ID', brief => { delete brief.waoOffer.id; }],
    ['null evidence', brief => { brief.targetQueries = [null]; }],
    ['oversized fact', brief => { brief.firstPartyProof = [{ id: 'proof', value: 'x'.repeat(241) }]; }],
    ['unsupported FAQ', brief => { brief.faqCandidates = [{ id: 'faq', question: 'Why?', answer: 'Because', source: 'paa', relevance: 0.9, answerEvidenceIds: ['missing'] }]; }],
    ['unsupported link', brief => { brief.links = [{ targetPath: '/', relationship: 'parent', evidenceIds: ['missing'] }]; }],
    ['oversized payload', brief => { brief.extra = 'x'.repeat(100_000); }],
  ];
  for (const [name, mutate] of invalid) {
    const candidate = structuredClone(input);
    mutate(candidate.pageBriefs[0]);
    const route = harness({ target: 'foreign' });
    assert.deepEqual(await route.post(candidate), {
      status: 400, body: { error: 'research_generation_input_invalid', deployable: false },
    }, name);
    assert.deepEqual(route.order, ['auth', 'json', ...checkedDossier, 'gate', 'brief'], name);
    assert.deepEqual(route.calls, counts({ gate: 1, brief: 1 }), name);
  }
});

test('unauthorized and shallow-invalid requests never access a dossier', async () => {
  const route = harness({ authorized: false });
  assert.deepEqual(await route.post(input), { status: 401, body: { error: 'unauthorized', deployable: false } });
  assert.deepEqual(route.calls, counts({ json: 0, path: 0, stat: 0, dossier: 0, cwd: 0 }));
  assert.deepEqual(route.order, ['auth']);
  for (const candidate of [
    { ...input, researchId: '../outside' }, { ...input, researchId: null },
    { ...input, pageBriefs: null }, { ...input, graphEdges: [{ fromId: '../outside', toId: 'home' }] },
  ]) {
    const invalidRoute = harness();
    assert.deepEqual(await invalidRoute.post(candidate), { status: 400, body: { error: 'research_generation_input_invalid', deployable: false } });
    assert.deepEqual(invalidRoute.order, ['auth', 'json']);
    assert.deepEqual(invalidRoute.calls, counts({ path: 0, stat: 0, dossier: 0, cwd: 0 }));
  }
  for (const [candidate, error] of [
    [null, 'invalid_request'],
    [[], 'invalid_request'],
    [{}, 'collectedData.businessNiche is required'],
    [{ ...input, slug: '../outside' }, 'invalid_deployment_slug'],
  ]) {
    const route = harness();
    assert.deepEqual(await route.post(candidate), { status: 400, body: { error, deployable: false } });
    assert.deepEqual(route.order, ['auth', 'json']);
    assert.deepEqual(route.calls, counts({ path: 0, stat: 0, dossier: 0, cwd: 0 }));
  }
});

test('simulation still returns its copy without dossier, generation or persistence', async () => {
  const route = harness({ simulation: true });
  assert.deepEqual(await route.post({ ...input, simulation: true }), {
    status: 200,
    body: { success: true, slug: 'synthetic-site', simulation: true, deployable: false, copy: { heroHeadline: 'synthetic simulation' } },
  });
  assert.deepEqual(route.calls, counts({ path: 0, stat: 0, dossier: 0, simulated: 1, cwd: 0 }));
  assert.deepEqual(route.order, ['auth', 'json', 'simulated']);
});
