import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { loadDataRoots } from '../../../../lib/dataRoots.testkit.mjs';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/research/route.ts');
const root = '/synthetic-research-root';
const id = 'known-synthetic-id';
const file = `${root}/data/site-research/${id}/dossier.json`;
const secret = 'synthetic-only-secret';
const fixture = {
  researchId: id, status: 'held', humanGates: [{ id: 'gate-1', status: 'pending', requiredFor: 'copy' }],
  businessTruth: { assertions: [{ value: 'synthetic' }] }, keywordEvidence: [],
  serpObservations: [{ source: 'synthetic' }], evidence: [], providerUsage: [{ source: 'synthetic' }],
};

function routeHarness({ authorized = true, secretConfigured = true, dossier = fixture, states = {}, dossierPath = file, startResearch, resumeResearch } = {}) {
  const calls = { url: 0, paths: [], resolved: [], reads: [], providers: 0 };
  const runnerCalls = { start: [], resume: [], generated: 0 };
  const source = fs.readFileSync(routePath, 'utf8');
  const code = ts.transpileModule(source, {
    fileName: routePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const unexpected = () => { calls.providers++; throw new Error('unexpected provider call'); };
  const imports = {
    fs: { lstatSync: current => {
      calls.paths.push(current);
      assert.ok(current === `${root}/data` || current.startsWith(`${root}/data/`), `unexpected filesystem path: ${current}`);
      const state = states[current] ?? (current === file && dossier === null ? 'missing' : current === file ? 'file' : 'directory');
      if (state === 'missing' || state === 'denied') throw Object.assign(new Error('synthetic state'), { code: state === 'missing' ? 'ENOENT' : 'EACCES' });
      assert.ok(['file', 'directory', 'symlink'].includes(state), `unexpected state: ${state}`);
      return { isFile: () => state === 'file', isDirectory: () => state === 'directory', isSymbolicLink: () => state === 'symlink' };
    }, readFileSync: unexpected, readdirSync: unexpected },
    path,
    '@/lib/dataRoots': loadDataRoots({ cwd: () => root }),
    crypto: { randomUUID: () => { runnerCalls.generated++; return id; } },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/site-bot/research/researchStore': {
      getResearchPath: researchId => {
        calls.resolved.push(researchId);
        assert.equal(researchId, id);
        return dossierPath;
      },
      readResearchDossier: async (...args) => {
        assert.equal(args.length, 3);
        assert.equal(args[0], id);
        assert.equal(args[1], undefined);
        assert.deepEqual(Object.entries(args[2]), [['bounded', true]]);
        calls.reads.push([args[0], args[1], Object.fromEntries(Object.entries(args[2]))]);
        return dossier;
      },
    },
    '@/lib/site-bot/research/runResearch': {
      resumeSiteResearch: (researchId, input) => {
        runnerCalls.resume.push([researchId, input]);
        return resumeResearch ? resumeResearch(researchId, input) : unexpected();
      },
      runSiteResearch: (researchId, input) => {
        runnerCalls.start.push([researchId, input]);
        return startResearch ? startResearch(researchId, input) : unexpected();
      },
    },
  };
  vm.runInNewContext(code, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
      return imports[name];
    },
    URL,
    process: { env: secretConfigured ? { CRON_SECRET: secret } : {}, cwd: () => root },
  }, { filename: routePath });
  async function get(researchId = id) {
    const request = {
      headers: { get: name => { assert.equal(name, 'authorization'); return authorized ? `Bearer ${secret}` : null; } },
      get url() {
        calls.url++;
        return `https://example.invalid/api/site-bot/research${researchId === null ? '' : `?researchId=${encodeURIComponent(researchId)}`}`;
      },
    };
    const response = await exports.GET(request);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store', `GET ${response.status}`);
    return { status: response.status, body: await response.json() };
  }
  async function post(body, { malformedJson = false } = {}) {
    const response = await exports.POST({
      headers: { get: name => { assert.equal(name, 'authorization'); return authorized ? `Bearer ${secret}` : null; } },
      json: malformedJson ? async () => { throw new SyntaxError('synthetic malformed JSON'); } : async () => body,
    });
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store', `POST ${response.status}`);
    return { status: response.status, body: await response.json() };
  }
  return { get, post, calls, runnerCalls, route: exports };
}

test('unauthorized or unset secret fails before URL, resolution, filesystem and dossier access', async () => {
  for (const options of [{ authorized: false }, { secretConfigured: false }]) {
    const harness = routeHarness(options);
    for (const value of [null, '../escape', id]) {
      assert.deepEqual(await harness.get(value), { status: 401, body: { error: 'Unauthorized' } });
    }
    assert.deepEqual(harness.calls, { url: 0, paths: [], resolved: [], reads: [], providers: 0 });
  }
});

test('invalid opaque ID and absent ID return original validation shape without dossier access', async () => {
  const harness = routeHarness();
  for (const value of [null, '../escape', 'bad.id', '']) {
    assert.deepEqual(await harness.get(value), { status: 400, body: { error: 'invalid_input' } });
  }
  assert.deepEqual(harness.calls, { url: 4, paths: [], resolved: [], reads: [], providers: 0 });
});

test('missing components return not_found; unsafe, inaccessible and outside-tree paths return invalid_record', async () => {
  const components = [`${root}/data`, `${root}/data/site-research`, `${root}/data/site-research/${id}`, file];
  for (const current of components) {
    const missing = routeHarness({ states: { [current]: 'missing' } });
    assert.deepEqual(await missing.get(), { status: 404, body: { error: 'not_found' } });
    assert.equal(missing.calls.paths.at(-1), current);
    assert.deepEqual(missing.calls.reads, []);
    assert.equal(missing.calls.providers, 0);
  }
  for (const [current, state] of [
    [components[0], 'symlink'], [components[1], 'symlink'], [components[2], 'symlink'], [file, 'symlink'],
    [components[2], 'file'], [file, 'directory'], [components[0], 'denied'], [file, 'denied'],
  ]) {
    const harness = routeHarness({ states: { [current]: state } });
    assert.deepEqual(await harness.get(), { status: 409, body: { error: 'invalid_record' } });
    assert.equal(harness.calls.paths.at(-1), current);
    assert.deepEqual(harness.calls.reads, []);
    assert.equal(harness.calls.providers, 0);
  }
  for (const dossierPath of [null, '/outside/dossier.json', `${root}/other/dossier.json`, `${root}/data/site-research/other/dossier.json`]) {
    const harness = routeHarness({ dossierPath });
    assert.deepEqual(await harness.get(), { status: 409, body: { error: 'invalid_record' } });
    assert.deepEqual(harness.calls.paths, []);
    assert.deepEqual(harness.calls.reads, []);
  }
});

test('regular file with invalid or oversized bounded result returns invalid_record', async () => {
  const harness = routeHarness({ dossier: null, states: { [file]: 'file' } });
  assert.deepEqual(await harness.get(), { status: 409, body: { error: 'invalid_record' } });
  assert.deepEqual(harness.calls.reads, [[id, undefined, { bounded: true }]]);
  assert.equal(harness.calls.paths.length, 4);
  assert.equal(harness.calls.providers, 0);
});

test('regular in-tree dossier returns unchanged summary with explicit private no-store', async () => {
  const harness = routeHarness();
  assert.deepEqual(await harness.get(), {
    status: 200,
    body: {
      researchId: id, status: 'held', gates: [{ id: 'gate-1', status: 'pending', requiredFor: 'copy' }],
      stages: { truth: true, keywords: false, serps: true, evidence: false, usage: true, readiness: true },
    },
  });
  assert.deepEqual(harness.calls.resolved, [id]);
  assert.deepEqual(harness.calls.reads, [[id, undefined, { bounded: true }]]);
  assert.equal(harness.calls.paths.length, 4);
  assert.equal(harness.calls.providers, 0);
});

test('POST unauthorized replies before body access and never starts research', async () => {
  for (const options of [{ authorized: false }, { secretConfigured: false }]) {
    const harness = routeHarness(options);
    const response = await harness.route.POST({
      headers: { get: name => { assert.equal(name, 'authorization'); return options.authorized === false ? null : `Bearer ${secret}`; } },
      json: () => { throw new Error('body accessed'); },
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Unauthorized' });
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.deepEqual(harness.runnerCalls, { start: [], resume: [], generated: 0 });
    assert.deepEqual(harness.calls, { url: 0, paths: [], resolved: [], reads: [], providers: 0 });
  }
});

test('POST malformed and invalid inputs return original 400 without invoking runners', async () => {
  const harness = routeHarness();
  for (const body of [null, {}, { action: 'other' }, { action: 'resume', researchId: '../escape', input: {} },
    { action: 'resume', researchId: id }, { action: 'start', researchId: id, input: null }]) {
    assert.deepEqual(await harness.post(body), { status: 400, body: { error: 'invalid_input' } });
  }
  assert.deepEqual(await harness.post(null, { malformedJson: true }), { status: 400, body: { error: 'invalid_input' } });
  assert.deepEqual(harness.runnerCalls, { start: [], resume: [], generated: 0 });
  assert.deepEqual(harness.calls, { url: 0, paths: [], resolved: [], reads: [], providers: 0 });
});

test('POST runner failure is generic and private with only the chosen synthetic runner called', async () => {
  const input = { source: 'synthetic' };
  for (const action of ['start', 'resume']) {
    const harness = routeHarness({
      startResearch: async () => { throw new Error('synthetic internal failure'); },
      resumeResearch: async () => { throw new Error('synthetic internal failure'); },
    });
    assert.deepEqual(await harness.post({ action, researchId: id, input }), { status: 500, body: { error: 'research_failed' } });
    assert.deepEqual(harness.runnerCalls.start, action === 'start' ? [[id, input]] : []);
    assert.deepEqual(harness.runnerCalls.resume, action === 'resume' ? [[id, input]] : []);
    assert.equal(harness.calls.providers, 0);
    assert.deepEqual(harness.calls.reads, []);
  }
});

test('POST start and resume return the original summary and only dispatch their injected runner', async () => {
  const input = { source: 'synthetic' };
  const expected = {
    status: 200,
    body: {
      researchId: id, status: 'held', gates: [{ id: 'gate-1', status: 'pending', requiredFor: 'copy' }],
      stages: { truth: true, keywords: false, serps: true, evidence: false, usage: true, readiness: true },
    },
  };
  for (const action of ['start', 'resume']) {
    const harness = routeHarness({
      startResearch: async () => ({ dossier: fixture }),
      resumeResearch: async () => ({ dossier: fixture }),
    });
    assert.deepEqual(await harness.post({ action, researchId: id, input }), expected);
    assert.deepEqual(harness.runnerCalls.start, action === 'start' ? [[id, input]] : []);
    assert.deepEqual(harness.runnerCalls.resume, action === 'resume' ? [[id, input]] : []);
    assert.equal(harness.runnerCalls.generated, 0);
    assert.deepEqual(harness.calls, { url: 0, paths: [], resolved: [], reads: [], providers: 0 });
  }
  const generated = routeHarness({ startResearch: async () => ({ dossier: fixture }) });
  assert.deepEqual(await generated.post({ action: 'start', input }), expected);
  assert.deepEqual(generated.runnerCalls, { start: [[id, input]], resume: [], generated: 1 });
});
