import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, webcrypto } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repo = fileURLToPath(new URL('../../../../../../', import.meta.url));
// Self-contained private scratch: a fresh 0700 directory under the OS temp dir.
const scratch = fs.realpathSync(os.tmpdir());
const owned = fs.mkdtempSync(path.join(scratch, 'help-operator-'));
fs.chmodSync(owned, 0o700);
const identity = fs.lstatSync(owned);
test.after(() => {
  const current = fs.lstatSync(owned);
  assert.equal(current.ino, identity.ino); assert.equal(current.dev, identity.dev);
  assert.equal(path.dirname(owned), scratch);
  fs.rmSync(owned, { recursive: true });
});
let logCalls = 0;
let externalCalls = 0;
test.afterEach(() => { assert.equal(logCalls, 0, 'no logging, including caught failures'); assert.equal(externalCalls, 0, 'no external calls'); });
function load(relative, imports, env = {}, globals = {}) {
  const file = path.join(repo, relative);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) { assert.ok(Object.hasOwn(imports, name), name); return imports[name]; }, process: { env, getuid: () => process.getuid() }, Buffer, Response, TextDecoder, URL, setTimeout,
    fetch() { externalCalls++; throw Error('unexpected external call'); },
    console: new Proxy({}, { get: () => () => { logCalls++; throw Error('unexpected log'); } }), ...globals,
  }, { filename: file });
  return exports;
}
const service = load('src/lib/site-bot/helpRequest.ts', {});
const disk = load('src/lib/site-bot/helpRequestStore.ts', { 'node:fs': fs, 'node:path': path, 'node:crypto': { randomUUID }, './helpRequest': service });
const operator = load('src/lib/site-bot/helpOperatorStore.ts', { 'node:fs': fs, 'node:path': path, 'node:crypto': { randomUUID }, './helpRequest': service, './helpRequestStore': disk });
const id = '123e4567-e89b-42d3-a456-426614174000';
const time = '2026-10-22T12:00:00.000Z';
const record = { schemaVersion: 1, requestId: id, auditId: '123e4567-e89b-42d3-a456-426614174001', placeId: 'synthetic', displayName: 'Synthetic', name: 'Example', email: 'person@example.invalid', receivedAt: time, consent: { accepted: true, purpose: 'sitebot-help', receivedAt: time }, status: 'received', assignedTo: null };
function dirs() {
  const base = fs.mkdtempSync(path.join(owned, 'case-')); fs.chmodSync(base, 0o700);
  const requests = path.join(base, 'requests'); const claims = path.join(base, 'claims');
  fs.mkdirSync(requests, { mode: 0o700 }); fs.mkdirSync(claims, { mode: 0o700 });
  return { requests, claims };
}
function route({ dirs: roots, allowed = true, enabled = 'true', configured = true, fail = false, storeModule = operator, auth, cookie = 'synthetic', cookieError = false }) {
  const env = configured ? { SITE_BOT_HELP_INTAKE_ENABLED: enabled, SITE_BOT_HELP_REQUEST_DIR: roots.requests, SITE_BOT_HELP_ASSIGNMENT_DIR: roots.claims } : {};
  let calls = 0;
  const routes = load('src/app/api/admin/site-bot/help-requests/route.ts', {
    'next/headers': { cookies: async () => { if (cookieError) throw Error('PRIVATE cookies'); return { get: name => { assert.equal(name, auth?.ADMIN_COOKIE_NAME ?? 'admin'); return cookie === null ? undefined : { value: cookie }; } }; } },
    '@/lib/admin-auth': auth ?? { ADMIN_COOKIE_NAME: 'admin', verifyAdminToken: async () => allowed },
    '@/lib/site-bot/helpRequest': service,
    '@/lib/site-bot/helpOperatorStore': { createHelpOperatorStore: (...args) => { calls++; if (fail) throw Error('private'); return storeModule.createHelpOperatorStore(...args); } },
  }, env);
  return { ...routes, calls: () => calls };
}
async function check(response, status) {
  assert.equal(response.status, status); assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(response.headers.get('location'), null);
  const body = await response.json();
  if (status !== 200) assert.deepEqual(body, { ok: false, error: status === 401 ? 'unauthorized' : 'unavailable' });
  return body;
}
function storage(fsAdapter = fs, globals = {}) {
  return load('src/lib/site-bot/helpOperatorStore.ts', { 'node:fs': fsAdapter, 'node:path': path, './helpRequest': service, './helpRequestStore': disk }, {}, globals);
}
function writer(fsAdapter) {
  return load('src/lib/site-bot/helpRequestStore.ts', { 'node:fs': fsAdapter, 'node:path': path, 'node:crypto': { randomUUID }, './helpRequest': service });
}
test('auth precedes access and mutations are not exported', async () => {
  const roots = dirs(); const unauth = route({ dirs: roots, allowed: false });
  await check(await unauth.GET(), 401); assert.equal(unauth.calls(), 0);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal(unauth[method], undefined);
  assert.equal(Object.hasOwn(operator.createHelpOperatorStore(roots.requests), 'claim'), false);
});
test('disabled, missing configuration and storage failure fail closed', async () => {
  const roots = dirs();
  for (const opts of [{ enabled: 'false' }, { configured: false }, { dirs: { ...roots, requests: path.join(owned, 'missing') } }]) {
    await check(await route({ dirs: roots, ...opts }).GET(), 503);
  }
  const failure = await check(await route({ dirs: roots, fail: true }).GET(), 503); assert.equal(failure.error, 'unavailable');
});
test('list and restart preserve original bytes without claim state', async () => {
  const roots = dirs(); await disk.createFileHelpRequestStore(roots.requests).createIfAbsent(record);
  const file = path.join(roots.requests, `${id}.json`); const original = fs.readFileSync(file);
  for (let i = 0; i < 2; i++) {
    const list = await check(await route({ dirs: roots }).GET(), 200);
    assert.deepEqual(list.requests, [record]); assert.equal(Object.hasOwn(list.requests[0], 'followUp'), false);
  }
  assert.deepEqual(fs.readFileSync(file), original); assert.deepEqual(fs.readdirSync(roots.claims), []);
});
test('malformed and symlink records fail closed', async () => {
  const roots = dirs(); const r = route({ dirs: roots });
  fs.writeFileSync(path.join(roots.requests, `${id}.json`), '{}', { mode: 0o600 }); await check(await r.GET(), 503);
  fs.unlinkSync(path.join(roots.requests, `${id}.json`));
  fs.symlinkSync(path.join(roots.claims, 'missing'), path.join(roots.requests, `${id}.json`)); await check(await r.GET(), 503);
});
test('unsafe files and missing root fail closed', async () => {
  const roots = dirs(); const r = route({ dirs: roots }); const target = path.join(roots.requests, `${id}.json`);
  assert.deepEqual((await check(await r.GET(), 200)).requests, []);
  const other = path.join(roots.claims, 'other'); fs.writeFileSync(other, JSON.stringify(record), { mode: 0o600 });
  fs.linkSync(other, target); await check(await r.GET(), 503); fs.unlinkSync(target);
  fs.writeFileSync(target, JSON.stringify(record), { mode: 0o644 }); await check(await r.GET(), 503); fs.unlinkSync(target);
  fs.writeFileSync(target, 'x'.repeat(65537), { mode: 0o600 }); await check(await r.GET(), 503); fs.unlinkSync(target);
  fs.mkdirSync(target); await check(await r.GET(), 503); fs.rmdirSync(target);
  fs.writeFileSync(path.join(roots.requests, 'invalid'), 'x'); await check(await r.GET(), 503);
});
test('oversized directory fails explicitly and does not return partial data', async () => {
  const roots = dirs();
  for (let i = 0; i < 1001; i++) fs.writeFileSync(path.join(roots.requests, `123e4567-e89b-42d3-a456-${i.toString(16).padStart(12, '0')}.json`), '', { mode: 0o600 });
  assert.deepEqual(await check(await route({ dirs: roots }).GET(), 503), { ok: false, error: 'unavailable' });
});
test('disappearing record fails closed', async () => {
  const roots = dirs(); await disk.createFileHelpRequestStore(roots.requests).createIfAbsent(record);
  const adapter = new Proxy(fs, { get(target, key) {
    if (key !== 'openSync') return target[key];
    return (...args) => { if (String(args[0]).endsWith(`${id}.json`)) throw new Error('PRIVATE person@example.invalid'); return target.openSync(...args); };
  } });
  const broken = load('src/lib/site-bot/helpOperatorStore.ts', { 'node:fs': adapter, 'node:path': path, './helpRequest': service, './helpRequestStore': disk });
  await assert.rejects(broken.createHelpOperatorStore(roots.requests).list());
});
test('actual intake writer can be observed during private staging and link promotion', async () => {
  for (const stage of ['openSync', 'writeFileSync', 'linkSync']) {
    const roots = dirs(); const observations = [];
    const adapter = new Proxy(fs, { get(target, key) {
      if (key !== stage) return target[key];
      return (...args) => {
        const value = target[key](...args);
        if (stage !== 'openSync' || String(args[0]).endsWith('.tmp')) {
          observations.push(operator.createHelpOperatorStore(roots.requests).list());
        }
        return value;
      };
    } });
    await writer(adapter).createFileHelpRequestStore(roots.requests).createIfAbsent(record);
    assert.equal(observations.length, 1);
    const during = JSON.parse(JSON.stringify(await observations[0]));
    assert.deepEqual(during, stage === 'linkSync' ? [record] : []);
    assert.deepEqual((await check(await route({ dirs: roots }).GET(), 200)).requests, [record]);
    assert.deepEqual(fs.readdirSync(roots.requests), [`${id}.json`]);
  }
});
test('private staging files are not read or returned, disappearing temps are harmless', async () => {
  const roots = dirs(); await disk.createFileHelpRequestStore(roots.requests).createIfAbsent(record);
  const temp = path.join(roots.requests, `.${id}.${randomUUID()}.tmp`);
  fs.writeFileSync(temp, 'PRIVATE unfinished json', { mode: 0o600 });
  let disappeared = false;
  const adapter = new Proxy(fs, { get(target, key) {
    if (key === 'readSync') return (...args) => { assert.ok(!fs.readlinkSync(`/proc/self/fd/${args[0]}`).endsWith('.tmp')); return target.readSync(...args); };
    if (key === 'openSync') return (...args) => {
      if (String(args[0]).endsWith('.tmp') && !disappeared) { disappeared = true; fs.unlinkSync(temp); }
      return target.openSync(...args);
    };
    return target[key];
  } });
  assert.deepEqual((await check(await route({ dirs: roots }).GET(), 200)).requests, [record]);
  assert.equal(fs.readFileSync(temp, 'utf8'), 'PRIVATE unfinished json');
  assert.deepEqual((await check(await route({ dirs: roots, storeModule: storage(adapter) }).GET(), 200)).requests, [record]);
  assert.equal(disappeared, true);
});
test('unsafe temporary entries and abandoned promotion fail closed without cleanup', async () => {
  for (const kind of ['symlink', 'hardlink', 'directory', 'permissions', 'oversized', 'name']) {
    const roots = dirs(); const temp = path.join(roots.requests, kind === 'name' ? '.invalid.tmp' : `.${id}.${randomUUID()}.tmp`);
    const other = path.join(roots.claims, 'other'); fs.writeFileSync(other, 'PRIVATE', { mode: 0o600 });
    if (kind === 'symlink') fs.symlinkSync(other, temp);
    else if (kind === 'hardlink') fs.linkSync(other, temp);
    else if (kind === 'directory') fs.mkdirSync(temp, { mode: 0o700 });
    else fs.writeFileSync(temp, kind === 'oversized' ? 'x'.repeat(65537) : 'PRIVATE', { mode: kind === 'permissions' ? 0o644 : 0o600 });
    const names = fs.readdirSync(roots.requests);
    await check(await route({ dirs: roots }).GET(), 503);
    assert.deepEqual(fs.readdirSync(roots.requests), names);
    assert.equal(fs.readFileSync(other, 'utf8'), 'PRIVATE');
  }
  const roots = dirs(); const temp = path.join(roots.requests, `.${id}.${randomUUID()}.tmp`);
  fs.writeFileSync(temp, JSON.stringify(record), { mode: 0o600 }); fs.linkSync(temp, path.join(roots.requests, `${id}.json`));
  let pauses = 0;
  const bounded = storage(fs, { setTimeout(resolve) { pauses++; resolve(); } });
  await check(await route({ dirs: roots, storeModule: bounded }).GET(), 503);
  assert.ok(pauses > 0 && pauses <= 50);
  assert.equal(fs.statSync(temp).nlink, 2);
  fs.unlinkSync(temp);
  assert.deepEqual((await check(await route({ dirs: roots }).GET(), 200)).requests, [record]);
});
test('real shared admin gate denies missing, bad, expired and fixture tokens before storage', async () => {
  const roots = dirs();
  const auth = load('src/lib/admin-auth.ts', {}, { ADMIN_SECRET: 'synthetic-test-secret-only' }, { crypto: webcrypto, TextEncoder });
  for (const cookie of [null, '', 'invalid', '1.invalid', auth.ADMIN_CLIENT_FIXTURE_TOKEN]) {
    const r = route({ dirs: roots, auth, cookie }); await check(await r.GET(), 401); assert.equal(r.calls(), 0);
  }
  const token = await auth.createAdminToken();
  const r = route({ dirs: roots, auth, cookie: token }); await check(await r.GET(), 200); assert.equal(r.calls(), 1);
  const missingSecret = load('src/lib/admin-auth.ts', {}, {}, { crypto: webcrypto, TextEncoder });
  const denied = route({ dirs: roots, auth: missingSecret, cookie: token }); await check(await denied.GET(), 401); assert.equal(denied.calls(), 0);
  for (const opts of [{ cookieError: true }, { auth: { ADMIN_COOKIE_NAME: 'admin', verifyAdminToken: async () => { throw Error('PRIVATE auth'); } } }]) {
    const broken = route({ dirs: roots, ...opts }); await check(await broken.GET(), 503); assert.equal(broken.calls(), 0);
  }
});
test('invalid, permissive and symlink roots fail closed', async () => {
  const roots = dirs();
  const link = path.join(owned, `link-${randomUUID()}`); fs.symlinkSync(path.dirname(roots.requests), link);
  const file = path.join(roots.claims, 'file'); fs.writeFileSync(file, 'PRIVATE', { mode: 0o600 });
  const insecure = dirs().requests; fs.chmodSync(insecure, 0o755);
  for (const requests of ['', 'relative', '/', `${roots.requests}/../requests`, `${roots.requests}\0`, file, insecure, path.join(link, 'requests')]) {
    await check(await route({ dirs: { ...roots, requests } }).GET(), 503);
  }
  for (const enabled of ['', 'TRUE', ' true ', null, 'false']) {
    const r = route({ dirs: roots, enabled }); await check(await r.GET(), 503); assert.equal(r.calls(), 0);
  }
});
test('ancestor symlink and root replacement between validation and open cannot redirect reads', async () => {
  for (const replacement of ['symlink', 'directory']) {
    const roots = dirs(); await disk.createFileHelpRequestStore(roots.requests).createIfAbsent(record);
    let changed = false; let reads = 0;
    const adapter = new Proxy(fs, { get(target, key) {
      if (key === 'readSync') return (...args) => { reads++; return target.readSync(...args); };
      if (key !== 'openSync') return target[key];
      return (...args) => {
        if (!changed) {
          changed = true;
          if (replacement === 'symlink') {
            const base = path.dirname(roots.requests); fs.renameSync(base, `${base}-moved`); fs.symlinkSync(`${base}-moved`, base);
          } else { fs.renameSync(roots.requests, `${roots.requests}-moved`); fs.mkdirSync(roots.requests, { mode: 0o700 }); }
        }
        return target.openSync(...args);
      };
    } });
    await check(await route({ dirs: roots, storeModule: storage(adapter) }).GET(), 503);
    assert.equal(changed, true); assert.equal(reads, 0);
  }
});
test('reads remain anchored when the validated root is renamed after open', async () => {
  const roots = dirs(); await disk.createFileHelpRequestStore(roots.requests).createIfAbsent(record);
  const outside = dirs(); await disk.createFileHelpRequestStore(outside.requests).createIfAbsent({ ...record, name: 'Must Not Read' });
  let moved = false;
  const adapter = new Proxy(fs, { get(target, key) {
    if (key !== 'opendirSync') return target[key];
    return (...args) => {
      if (!moved) { moved = true; fs.renameSync(roots.requests, `${roots.requests}-moved`); fs.symlinkSync(outside.requests, roots.requests); }
      return target.opendirSync(...args);
    };
  } });
  assert.deepEqual((await check(await route({ dirs: roots, storeModule: storage(adapter) }).GET(), 200)).requests, [record]);
  assert.equal(moved, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(outside.requests, `${id}.json`), 'utf8')).name, 'Must Not Read');
});
test('invalid UTF8, JSON, schema, record identity and unknown fields never return partial data', async () => {
  const roots = dirs(); await disk.createFileHelpRequestStore(roots.requests).createIfAbsent(record);
  const second = '223e4567-e89b-42d3-a456-426614174000';
  for (const bytes of [Buffer.from([0xff]), '{broken', '[]', 'null', JSON.stringify(record),
    JSON.stringify({ ...record, requestId: second, assignedTo: 'operator' }),
    JSON.stringify({ ...record, requestId: second, followUp: 'contacted' }),
    JSON.stringify({ ...record, requestId: second, consent: { ...record.consent, accepted: false } })]) {
    fs.writeFileSync(path.join(roots.requests, `${second}.json`), bytes, { mode: 0o600 });
    await check(await route({ dirs: roots }).GET(), 503);
  }
});
test('exact byte limit works with short reads; growth, link and permission changes fail closed', async () => {
  const roots = dirs(); const file = path.join(roots.requests, `${id}.json`);
  const bytes = JSON.stringify(record); fs.writeFileSync(file, bytes + ' '.repeat(65536 - Buffer.byteLength(bytes)), { mode: 0o600 });
  let readBytes = 0;
  const shortReads = new Proxy(fs, { get(target, key) {
    if (key !== 'readSync') return target[key];
    return (fd, buffer, offset, length, position) => { const count = target.readSync(fd, buffer, offset, Math.min(length, 37), position); readBytes += count; return count; };
  } });
  assert.deepEqual((await check(await route({ dirs: roots, storeModule: storage(shortReads) }).GET(), 200)).requests, [record]);
  assert.equal(readBytes, 65536);
  for (const change of ['growth', 'mode', 'link', 'unlink']) {
    const isolated = dirs(); const source = path.join(isolated.requests, `${id}.json`);
    fs.writeFileSync(source, bytes, { mode: 0o600 }); let changed = false; let consumed = 0;
    const adapter = new Proxy(fs, { get(target, key) {
      if (key !== 'readSync') return target[key];
      return (...args) => {
        if (!changed) {
          changed = true;
          if (change === 'growth') fs.appendFileSync(source, ' '.repeat(65537));
          else if (change === 'mode') fs.chmodSync(source, 0o644);
          else if (change === 'link') fs.linkSync(source, path.join(isolated.claims, 'linked'));
          else fs.unlinkSync(source);
        }
        const count = target.readSync(...args); consumed += count; return count;
      };
    } });
    await check(await route({ dirs: isolated, storeModule: storage(adapter) }).GET(), 503);
    assert.equal(changed, true); assert.ok(consumed <= 65537);
  }
});
test('all descriptors close on read failures and inbox never calls mutation APIs', async () => {
  for (const failure of [null, 'open', 'stat', 'directory', 'iterate', 'read']) {
    const roots = dirs(); await disk.createFileHelpRequestStore(roots.requests).createIfAbsent(record);
    const original = fs.readFileSync(path.join(roots.requests, `${id}.json`));
    const fds = new Set(); const directories = new Set(); let failures = 0; let mutations = 0;
    function inject(kind) { if (failure === kind) { failures++; throw Error('PRIVATE person@example.invalid'); } }
    const adapter = new Proxy(fs, { get(target, key) {
      if (['writeSync', 'writeFileSync', 'appendFileSync', 'unlinkSync', 'renameSync', 'linkSync', 'symlinkSync', 'mkdirSync', 'rmSync', 'rmdirSync', 'chmodSync', 'chownSync', 'truncateSync', 'ftruncateSync', 'fsyncSync'].includes(key)) return () => { mutations++; throw Error('unexpected mutation'); };
      if (key === 'openSync') return (...args) => {
        assert.equal(args[1] & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND), 0);
        if (String(args[0]).endsWith('.json')) inject('open');
        const fd = target.openSync(...args); fds.add(fd); return fd;
      };
      if (key === 'closeSync') return fd => { target.closeSync(fd); assert.ok(fds.delete(fd)); };
      if (key === 'fstatSync') return (...args) => { inject('stat'); return target.fstatSync(...args); };
      if (key === 'readSync') return (...args) => { inject('read'); return target.readSync(...args); };
      if (key === 'opendirSync') return (...args) => {
        inject('directory'); const dir = target.opendirSync(...args); directories.add(dir);
        return { readSync() { inject('iterate'); return dir.readSync(); }, closeSync() { dir.closeSync(); assert.ok(directories.delete(dir)); } };
      };
      return target[key];
    } });
    await check(await route({ dirs: roots, storeModule: storage(adapter) }).GET(), failure ? 503 : 200);
    assert.equal(failures, failure ? 1 : 0); assert.equal(mutations, 0); assert.equal(fds.size, 0); assert.equal(directories.size, 0);
    assert.deepEqual(fs.readFileSync(path.join(roots.requests, `${id}.json`)), original);
    assert.deepEqual(fs.readdirSync(roots.requests), [`${id}.json`]); assert.deepEqual(fs.readdirSync(roots.claims), []);
  }
});
test('wrong owner, multiple hardlinks and root permission changes fail closed', async () => {
  for (const kind of ['root-owner', 'file-owner', 'root-mode', 'three-links']) {
    const roots = dirs(); await disk.createFileHelpRequestStore(roots.requests).createIfAbsent(record);
    if (kind === 'three-links') {
      fs.linkSync(path.join(roots.requests, `${id}.json`), path.join(roots.claims, 'one'));
      fs.linkSync(path.join(roots.requests, `${id}.json`), path.join(roots.claims, 'two'));
    }
    let hit = false;
    const adapter = new Proxy(fs, { get(target, key) {
      if (key === 'fstatSync') return (...args) => {
        const info = target.fstatSync(...args);
        if ((kind === 'root-owner' && info.isDirectory()) || (kind === 'file-owner' && info.isFile())) { info.uid++; hit = true; }
        return info;
      };
      if (key === 'readSync' && kind === 'root-mode') return (...args) => { fs.chmodSync(roots.requests, 0o755); hit = true; return target.readSync(...args); };
      return target[key];
    } });
    await check(await route({ dirs: roots, storeModule: storage(adapter) }).GET(), 503);
    if (kind !== 'three-links') assert.equal(hit, true);
  }
});
test('directory limit includes private staging files and exact record cap is readable', async () => {
  const roots = dirs(); const expected = [];
  for (let i = 999; i >= 0; i--) {
    const value = { ...record, requestId: `123e4567-e89b-42d3-a456-${i.toString(16).padStart(12, '0')}` };
    expected.push(value); fs.writeFileSync(path.join(roots.requests, `${value.requestId}.json`), JSON.stringify(value), { mode: 0o600 });
  }
  expected.sort((a, b) => a.requestId.localeCompare(b.requestId));
  assert.deepEqual((await check(await route({ dirs: roots }).GET(), 200)).requests, expected);
  fs.writeFileSync(path.join(roots.requests, `.${id}.${randomUUID()}.tmp`), '', { mode: 0o600 });
  await check(await route({ dirs: roots }).GET(), 503);
});
test('inbox source remains ASCII and exports only the read-only API', () => {
  assert.deepEqual(Object.keys(operator), ['createHelpOperatorStore']);
  const r = route({ dirs: dirs() }); assert.deepEqual(Object.keys(r).sort(), ['GET', 'calls', 'runtime']);
  for (const relative of ['src/lib/site-bot/helpOperatorStore.ts', 'src/app/api/admin/site-bot/help-requests/route.ts', 'src/app/api/admin/site-bot/help-requests/route.test.mjs']) {
    assert.match(fs.readFileSync(path.join(repo, relative), 'utf8'), /^[\x00-\x7f]*$/);
  }
});
test('strict noEmit resolves actual inbox modules', () => {
  const options = { noEmit: true, strict: true, noUnusedLocals: true, noUnusedParameters: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, esModuleInterop: true, baseUrl: repo, paths: { '@/*': ['src/*'] }, types: ['node'], typeRoots: [path.join(repo, 'node_modules/@types')], skipLibCheck: true };
  const files = ['src/lib/site-bot/helpOperatorStore.ts', 'src/app/api/admin/site-bot/help-requests/route.ts'].map(file => path.join(repo, file));
  const program = ts.createProgram(files, options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: f => f, getCurrentDirectory: () => repo, getNewLine: () => '\n' }));
});
