import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repository = fileURLToPath(new URL('../../../../../', import.meta.url));
const servicePath = path.join(repository, 'src/lib/site-bot/helpRequest.ts');
const storePath = path.join(repository, 'src/lib/site-bot/helpRequestStore.ts');
const routePath = fileURLToPath(new URL('./route.ts', import.meta.url));
const integrationNote = path.join(repository, 'docs/research/sitebot-help-intake-source-integration-2026-10-24.md');
// Self-contained private scratch: a fresh 0700 directory under the OS temp dir.
const scratchRoot = fs.realpathSync(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(scratchRoot, 'help-request-tests-'));
fs.chmodSync(scratch, 0o700);
const scratchIdentity = fs.lstatSync(scratch);
test.after(() => {
  assert.equal(path.dirname(scratch), scratchRoot);
  assert.ok(path.basename(scratch).startsWith('help-request-tests-'));
  const current = fs.lstatSync(scratch);
  assert.ok(current.isDirectory() && !current.isSymbolicLink());
  assert.equal(current.dev, scratchIdentity.dev);
  assert.equal(current.ino, scratchIdentity.ino);
  fs.rmSync(scratch, { recursive: true, force: true });
});
const requestId = '123e4567-e89b-42d3-a456-426614174000';
const auditId = '123e4567-e89b-42d3-a456-426614174001';
const now = '2026-10-22T12:00:00.000Z';
const input = { requestId, auditId, placeId: 'selected-two', name: ' Synthetic Person ', email: ' person@example.invalid ', privacyAccepted: true };
const audit = { auditId, fetchedAt: '2026-10-21T12:00:00.000Z', expiresAt: '2026-10-23T12:00:00.000Z', query: { businessName: 'private query' }, candidates: [
  { placeId: 'first-one', displayName: 'Not Selected', rawProvider: 'must-not-persist' },
  { placeId: 'selected-two', displayName: 'Synthetic Selected Business', rawProvider: 'must-not-persist' },
] };
const plain = value => JSON.parse(JSON.stringify(value));
const fail = () => { throw new Error('unexpected external call'); };
function load(file, imports, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) { assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`); return imports[name]; },
    Date, Buffer, TextDecoder, Response, setTimeout, fetch: fail,
    console: { error: fail, log: fail, warn: fail }, process: Object.freeze({ env: Object.freeze({}), getuid: () => process.getuid() }),
    ...globals }, { filename: file, timeout: 5000 });
  return exports;
}
const service = load(servicePath, {});
function storage(fsAdapter = fs) {
  return load(storePath, { 'node:fs': fsAdapter, 'node:path': path, 'node:crypto': { randomUUID }, './helpRequest': service });
}
function root() { const dir = fs.mkdtempSync(path.join(scratch, 'store-')); fs.chmodSync(dir, 0o700); return dir; }
const disk = storage();
function dependencies(store, record = audit, clock = () => new Date(now)) {
  return { store, clock, readAuditRecord: async id => { assert.equal(id, auditId); return record; } };
}
function record(overrides = {}) {
  return { schemaVersion: 1, requestId, auditId, placeId: 'selected-two', displayName: 'Synthetic Selected Business', name: 'Synthetic Person', email: 'person@example.invalid', receivedAt: now,
    consent: { accepted: true, purpose: 'sitebot-help', receivedAt: now }, status: 'received', assignedTo: null, ...overrides };
}
const receipt = { ok: true, requestId, status: 'received' };
async function rejectsCode(operation, code) { await assert.rejects(operation, error => error.code === code); }
function faultFs(method, predicate = () => true) {
  let hits = 0;
  return { adapter: new Proxy(fs, { get(target, key) {
    if (key === method) return (...args) => { if (predicate(...args)) { hits++; throw new Error('synthetic PRIVATE contact@example.invalid raw failure'); } return target[key](...args); };
    return target[key];
  } }), hits: () => hits };
}
function routeHarness({ enabled = 'true', directory = root(), auditRecord = audit, allowed = true, throwAt, realStore = true, storeOverride, enforceRate = false, recovery = false } = {}) {
  const calls = [];
  let requestCount = 0;
  const env = Object.freeze({ SITE_BOT_HELP_INTAKE_ENABLED: enabled, SITE_BOT_HELP_REQUEST_DIR: directory });
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return Date.parse(now); } }
  const route = load(recovery ? path.join(path.dirname(routePath), 'recover/route.ts') : routePath, {
    '@/lib/site-bot/helpRequest': service,
    '@/lib/site-bot/helpRequestStore': {
      isValidHelpRequestRoot: value => { calls.push('root'); return disk.isValidHelpRequestRoot(value); },
      createFileHelpRequestStore: value => { calls.push('store'); if (throwAt === 'store') throw new Error('PRIVATE store'); return storeOverride ?? (realStore ? disk.createFileHelpRequestStore(value) : { createIfAbsent: fail, read: fail }); },
    },
    '@/lib/site-bot/auditStore': { readAuditRecord: async (...args) => { calls.push('audit'); assert.equal(args[0], auditId); assert.equal(args[1], undefined); assert.equal(args[3], false); assert.equal(args[2].toISOString(), now); if (throwAt === 'audit') throw new Error('PRIVATE audit'); return auditRecord; } },
    '@/lib/payments/rate-limit': { checkRateLimit: (key, options) => { calls.push('rate'); assert.equal(key, 'sitebot-help:192.0.2.1'); assert.deepEqual(plain(options), { maxRequests: 5, windowMs: 600000 }); if (throwAt === 'rate') throw new Error('PRIVATE rate'); requestCount++; return { allowed: allowed && (!enforceRate || requestCount <= options.maxRequests) }; } },
  }, { Date: FixedDate, process: Object.freeze({ env }) });
  assert.deepEqual(Object.keys(route), ['POST']);
  async function post({ body = input, raw, chunks, noBody = false, contentType = 'application/json', contentLength, streamError = false, cancelError = false } = {}) {
    const bytes = raw ?? new TextEncoder().encode(JSON.stringify(body));
    const parts = chunks ?? [bytes]; let index = 0; const state = { reads: 0, cancelled: false };
    const stream = new ReadableStream({ pull(controller) { state.reads++; if (index < parts.length) controller.enqueue(parts[index++]); else if (streamError) controller.error(new Error('PRIVATE stream')); else controller.close(); }, cancel() { state.cancelled = true; if (cancelError) throw new Error('PRIVATE cancel'); } }, { highWaterMark: 0 });
    const request = new Request('https://example.invalid/api/site-bot/help-request', { method: 'POST', ...(noBody ? {} : { body: stream, duplex: 'half' }), headers: { 'x-forwarded-for': '192.0.2.1, 198.51.100.1', ...(contentType === null ? {} : { 'content-type': contentType }), ...(contentLength === undefined ? {} : { 'content-length': contentLength }) } });
    const original = request.body;
    Object.defineProperty(request, 'body', { get() { calls.push('body'); return original; } });
    const response = await route.POST(request);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    const result = await response.json();
    assert.deepEqual(Object.keys(result).sort(), response.status === 200 ? ['ok', 'requestId', 'status'] : ['error', 'ok']);
    if (response.status !== 200) { assert.equal(result.ok, false); assert.match(result.error, /^[a-z_]{1,32}$/); }
    assert.ok(!JSON.stringify(result).includes('PRIVATE') && !JSON.stringify(result).includes('example.invalid') && !JSON.stringify(result).includes('Business'));
    return { status: response.status, body: result, state };
  }
  return { post, calls, directory };
}

const semanticOptions = { noEmit: true, strict: true, noUnusedLocals: true, noUnusedParameters: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, esModuleInterop: true,
  baseUrl: repository, paths: { '@/*': ['src/*'] }, types: ['node'], typeRoots: [path.join(repository, 'node_modules/@types')], skipLibCheck: false };
function assertNoDiagnostics(program) {
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: f => f, getCurrentDirectory: () => repository, getNewLine: () => '\n' }));
}
test('semantic TypeScript check: strict noEmit and unused checks on all accepted modules', () => {
  const stub = path.join(repository, '__virtual_external.d.ts');
  const declarations = `declare module '@/lib/site-bot/auditStore' { export function readAuditRecord(id:string, root?:string, now?:Date, deleteExpired?:boolean):Promise<unknown>; }
    declare module '@/lib/payments/rate-limit' { export function checkRateLimit(key:string, options:{maxRequests:number;windowMs:number}):{allowed:boolean;remaining:number;retryAfterMs:number}; }`;
  const host = ts.createCompilerHost(semanticOptions);
  const originalRead = host.readFile.bind(host); const originalExists = host.fileExists.bind(host);
  host.readFile = file => file === stub ? declarations : originalRead(file);
  host.fileExists = file => file === stub || originalExists(file);
  host.writeFile = fail;
  const program = ts.createProgram([servicePath, storePath, routePath, stub], semanticOptions, host);
  assertNoDiagnostics(program);
});
test('semantic integration resolves real audit reader and rate limiter without virtual replacements or evaluation', () => {
  const host = ts.createCompilerHost(semanticOptions);
  host.writeFile = fail;
  const program = ts.createProgram([servicePath, storePath, routePath], semanticOptions, host);
  const checker = program.getTypeChecker();
  const routeSource = program.getSourceFile(routePath);
  for (const [specifier, relative, exported] of [
    ['@/lib/site-bot/auditStore', 'src/lib/site-bot/auditStore.ts', 'readAuditRecord'],
    ['@/lib/payments/rate-limit', 'src/lib/payments/rate-limit.ts', 'checkRateLimit'],
  ]) {
    const actualPath = path.join(repository, relative);
    const dependencySource = program.getSourceFile(actualPath);
    assert.ok(dependencySource, `actual source included: ${relative}`);
    assert.equal(dependencySource.text, fs.readFileSync(actualPath, 'utf8'));
    const imported = routeSource.statements.find(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === specifier);
    const symbol = checker.getSymbolAtLocation(imported.moduleSpecifier);
    assert.ok(symbol.declarations.some(node => node === dependencySource), `import resolves actual source: ${specifier}`);
    const member = checker.getExportsOfModule(symbol).find(value => value.name === exported);
    assert.ok(member.declarations.every(node => node.getSourceFile() === dependencySource));
    assert.ok(checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(member, dependencySource), ts.SignatureKind.Call).length > 0);
  }
  assert.ok(program.getSourceFiles().every(source => !source.fileName.endsWith('__virtual_external.d.ts')));
  assertNoDiagnostics(program);
});
test('test scratch is a private directory outside the repository', () => {
  assert.ok(!scratch.startsWith(repository));
  assert.equal(path.dirname(scratch), scratchRoot);
  assert.equal(fs.lstatSync(scratch).uid, process.getuid());
  assert.equal(fs.statSync(scratch).mode & 0o777, 0o700);
});
test('canonical test discovery explicitly registers actual route suite exactly once', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repository, 'package.json'), 'utf8'));
  const relative = 'src/app/api/site-bot/help-request/route.test.mjs';
  const command = `node --test ${relative}`;
  assert.equal(manifest.scripts.test.split(relative).length - 1, 1);
  const commands = manifest.scripts.test.split(' && ');
  assert.equal(commands.filter(value => value === command).length, 1);
  assert.ok(commands.indexOf(command) > 0);
  assert.equal(fileURLToPath(import.meta.url), path.join(repository, relative));
});

test('service stores only minimized selected-business record and returns only receipt', async () => {
  const dir = root(); const store = disk.createFileHelpRequestStore(dir);
  assert.deepEqual(plain(await service.submitHelpRequest(input, dependencies(store))), receipt);
  assert.deepEqual(plain(await store.read(requestId)), record());
  assert.equal(fs.statSync(path.join(dir, `${requestId}.json`)).mode & 0o777, 0o600);
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  assert.deepEqual(fs.readdirSync(dir), [`${requestId}.json`]);
});
test('identical concurrent retries across two instances keep original receipt/time and one record', async () => {
  const dir = root(); const stores = [disk.createFileHelpRequestStore(dir), disk.createFileHelpRequestStore(dir)];
  const results = await Promise.all(Array.from({ length: 40 }, (_, i) => service.submitHelpRequest({ ...input, name: i % 2 ? 'Synthetic Person' : input.name }, dependencies(stores[i % 2], audit, () => new Date(Date.parse(now) + i)))));
  assert.ok(results.every(r => JSON.stringify(plain(r)) === JSON.stringify(receipt)));
  assert.equal((await stores[1].read(requestId)).receivedAt, now);
  assert.deepEqual(fs.readdirSync(dir), [`${requestId}.json`]);
});
test('concurrent conflicting requests choose exactly one durable winner without leaking contacts', async () => {
  const dir = root(); const stores = [disk.createFileHelpRequestStore(dir), disk.createFileHelpRequestStore(dir)];
  const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => service.submitHelpRequest({ ...input, name: i % 2 ? 'Other Person' : input.name }, dependencies(stores[i % 2]))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 10);
  assert.ok(results.filter(r => r.status === 'rejected').every(r => r.reason.code === 'conflict' && r.reason.message === 'conflict'));
  assert.equal((await stores[1].read(requestId)).name, 'Synthetic Person');
  assert.equal(fs.readdirSync(dir).length, 1);
});
test('fresh store instance provides private restart readback and normalized retry preserves bytes', async () => {
  const dir = root(); await service.submitHelpRequest(input, dependencies(disk.createFileHelpRequestStore(dir)));
  const before = fs.readFileSync(path.join(dir, `${requestId}.json`), 'utf8');
  const restarted = storage().createFileHelpRequestStore(dir);
  assert.deepEqual(plain(await restarted.read(requestId)), record());
  await service.submitHelpRequest({ ...input, email: 'person@example.invalid' }, dependencies(restarted, audit, () => new Date('2026-10-22T13:00:00.000Z')));
  assert.equal(fs.readFileSync(path.join(dir, `${requestId}.json`), 'utf8'), before);
});
test('read and identical retry during link/unlink promotion wait for complete unlinked winner', async () => {
  const dir = root(); const other = disk.createFileHelpRequestStore(dir);
  let readDuringPromotion; let retryDuringPromotion;
  const adapter = new Proxy(fs, { get(target, key) {
    if (key !== 'linkSync') return target[key];
    return (...args) => {
      target.linkSync(...args);
      assert.equal(fs.statSync(args[1]).nlink, 2);
      readDuringPromotion = other.read(requestId);
      retryDuringPromotion = service.submitHelpRequest(input, dependencies(other));
    };
  } });
  await service.submitHelpRequest(input, dependencies(storage(adapter).createFileHelpRequestStore(dir)));
  assert.deepEqual(plain(await readDuringPromotion), record());
  assert.deepEqual(plain(await retryDuringPromotion), receipt);
  assert.equal(fs.statSync(path.join(dir, `${requestId}.json`)).nlink, 1);
  assert.deepEqual(fs.readdirSync(dir), [`${requestId}.json`]);
});
test('same requestId conflicts on every normalized customer or selected identity change', async () => {
  const dir = root(); const store = disk.createFileHelpRequestStore(dir);
  await service.submitHelpRequest(input, dependencies(store));
  for (const patch of [{ name: 'Other' }, { phone: '+1 555 0100' }, { email: 'other@example.invalid' }, { placeId: 'first-one' }]) await rejectsCode(service.submitHelpRequest({ ...input, ...patch }, dependencies(store)), 'conflict');
  const changed = plain(audit); changed.candidates[1].displayName = 'Changed Business';
  await rejectsCode(service.submitHelpRequest(input, dependencies(store, changed)), 'conflict');
  await rejectsCode(service.submitHelpRequest({ ...input, auditId: requestId }, { clock: () => new Date(now), readAuditRecord: async () => ({ ...audit, auditId: requestId }), store }), 'conflict');
});
test('consent, shape, unknown fields, nested fields, identifiers, contacts and controls reject before dependencies', async () => {
  const bad = [null, [], 'text', 1, {}, { ...input, privacyAccepted: false }, { ...input, privacyAccepted: undefined }, { ...input, privacyAccepted: 'true' },
    ...['score', 'displayName', 'receivedAt', 'assignedTo', 'followUp', 'message', 'query', 'utm', '__protoField'].map(key => ({ ...input, [key]: { nested: 'no' } })),
    ...['requestId', 'auditId'].flatMap(key => ['../outside', '', 7, `${auditId}x`].map(value => ({ ...input, [key]: value }))),
    ...['placeId', 'name', 'phone', 'email'].flatMap(key => [[], {}, null, 4, 'x\n', 'x\t', 'x\x00', 'x\x7f', 'x\x85'].map(value => ({ ...input, [key]: value }))),
    { ...input, placeId: undefined }, { ...input, placeId: '' }, { ...input, placeId: ' selected-two' }, { ...input, name: '  ' }, { ...input, name: 'a'.repeat(121) }, { ...input, placeId: 'a'.repeat(257) }, { ...input, phone: '1'.repeat(41) }, { ...input, email: 'a'.repeat(255) },
    ...['bad', 'a@b', 'a@@example.invalid', 'a@example.invalid,b@example.invalid', 'Name <a@example.invalid>', 'a..b@example.invalid', 'a@-example.invalid', 'a@example.invalid;'].map(email => ({ ...input, email })),
    { ...input, email: '', phone: '' }];
  for (const value of bad) await rejectsCode(service.submitHelpRequest(value, { clock: fail, readAuditRecord: fail, store: { createIfAbsent: fail, read: fail } }), 'invalid_input');
});
test('normalization accepts bounded fields, phone only, optional blanks and UUID case', async () => {
  const value = service.normalizeHelpRequest({ ...input, requestId: requestId.toUpperCase(), name: ` ${'A'.repeat(120)} `, phone: ' 123 ', email: ' ' });
  assert.equal(value.name.length, 120); assert.equal(value.phone, '123'); assert.equal(value.requestId, requestId); assert.equal(Object.hasOwn(value, 'email'), false);
  assert.equal(service.normalizeHelpRequest({ ...input, placeId: 'x'.repeat(256), phone: '1'.repeat(40) }).placeId.length, 256);
});
test('missing, mismatched, malformed, future, expired audits and absent/ambiguous selection fail before storage', async () => {
  const invalid = [null, [], { ...audit, auditId: requestId }, { ...audit, fetchedAt: 'bad' }, { ...audit, expiresAt: 'bad' }, { ...audit, fetchedAt: '2026-10-23T12:00:00.000Z' }, { ...audit, expiresAt: now }, { ...audit, expiresAt: audit.fetchedAt },
    { ...audit, candidates: [] }, { ...audit, candidates: [audit.candidates[0]] }, { ...audit, candidates: [audit.candidates[1], audit.candidates[1]] }, { ...audit, candidates: [{ placeId: input.placeId, displayName: '' }] }, { ...audit, candidates: [{ placeId: input.placeId, displayName: 'bad\n' }] }];
  for (const value of invalid) await rejectsCode(service.submitHelpRequest(input, dependencies({ createIfAbsent: fail, read: fail, readDurable: async () => null }, value)), 'not_found');
});
test('clock/read/create exceptions and invalid durable results fail closed', async () => {
  for (const deps of [dependencies({ createIfAbsent: fail, read: fail, readDurable: fail }), { ...dependencies({ createIfAbsent: fail, read: fail, readDurable: async () => null }), readAuditRecord: fail }, { ...dependencies({ createIfAbsent: fail, read: fail, readDurable: async () => null }), clock: fail }, dependencies({ createIfAbsent: async () => null, read: fail, readDurable: async () => null }), dependencies({ createIfAbsent: async () => ({ ...record(), raw: 'private' }), read: fail, readDurable: async () => null }), dependencies({ createIfAbsent: fail, read: fail, readDurable: async () => null }, audit, () => new Date('bad'))]) await rejectsCode(service.submitHelpRequest(input, deps), 'unavailable');
});
test('acknowledgement remains pending until durable create completes', async () => {
  let finish; let entered; const started = new Promise(r => { entered = r; });
  const pending = new Promise(r => { finish = r; }); let resolved = false;
  const result = service.submitHelpRequest(input, dependencies({ read: fail, readDurable: async () => null, createIfAbsent: async value => { entered(); await pending; return value; } })).then(value => { resolved = true; return value; });
  await started; assert.equal(resolved, false); finish(); assert.deepEqual(plain(await result), receipt);
});

test('adapter requires existing private absolute directory and rejects symlink ancestors', async () => {
  const dir = root(); const link = path.join(scratch, `link-${randomUUID()}`); fs.symlinkSync(dir, link);
  const file = path.join(scratch, `file-${randomUUID()}`); fs.writeFileSync(file, 'x');
  const insecure = root(); fs.chmodSync(insecure, 0o755);
  for (const value of [undefined, '', '.', 'relative', '/', `${dir}/../store`, `${dir}\0`, path.join(scratch, 'missing'), file, link, path.join(link, 'child'), insecure]) {
    assert.equal(disk.isValidHelpRequestRoot(value), false);
    assert.throws(() => disk.createFileHelpRequestStore(value));
  }
  assert.equal(disk.isValidHelpRequestRoot(dir), true);
});
test('adapter rejects invalid IDs, path escape and root replacement without writing outside root', async () => {
  const dir = root(); const store = disk.createFileHelpRequestStore(dir);
  for (const id of ['../outside', '', `${requestId}.json`, requestId.toUpperCase()]) await assert.rejects(store.read(id));
  const moved = `${dir}-moved`; fs.renameSync(dir, moved); fs.mkdirSync(dir, { mode: 0o700 });
  await assert.rejects(store.createIfAbsent(record())); await assert.rejects(store.read(requestId));
  assert.deepEqual(fs.readdirSync(dir), []); assert.deepEqual(fs.readdirSync(moved), []);
});
test('adapter read returns null only for absent records; malformed schema and mismatched ID throw', async () => {
  const dir = root(); const store = disk.createFileHelpRequestStore(dir); const filename = path.join(dir, `${requestId}.json`);
  assert.equal(await store.read(requestId), null);
  for (const value of ['{bad', '[]', 'null', JSON.stringify({ ...record(), schemaVersion: 2 }), JSON.stringify({ ...record(), requestId: auditId }), JSON.stringify({ ...record(), rawProvider: 'no' }), JSON.stringify({ ...record(), name: ' padded ' }), JSON.stringify({ ...record(), consent: { ...record().consent, extra: true } }), JSON.stringify({ ...record(), receivedAt: 'bad' }), JSON.stringify({ ...record(), phone: '' })]) {
    fs.writeFileSync(filename, value, { mode: 0o600 }); await assert.rejects(store.read(requestId)); await assert.rejects(store.createIfAbsent(record()));
  }
  for (const value of [{ ...record(), score: 99 }, { ...record(), name: '' }]) await assert.rejects(store.createIfAbsent(value));
});
test('adapter refuses symlink records, hardlinks, directories, oversized and permissive files', async () => {
  const dir = root(); const store = disk.createFileHelpRequestStore(dir); const target = path.join(dir, `${requestId}.json`); const other = path.join(dir, 'owned-other');
  fs.writeFileSync(other, JSON.stringify(record()), { mode: 0o600 });
  fs.symlinkSync(other, target); await assert.rejects(store.read(requestId)); await assert.rejects(store.createIfAbsent(record())); fs.unlinkSync(target);
  fs.linkSync(other, target); await assert.rejects(store.read(requestId)); fs.unlinkSync(target);
  fs.mkdirSync(target); await assert.rejects(store.read(requestId)); fs.rmdirSync(target);
  fs.writeFileSync(target, 'x'.repeat(65537), { mode: 0o600 }); await assert.rejects(store.read(requestId));
  fs.writeFileSync(target, JSON.stringify(record())); fs.chmodSync(target, 0o644); await assert.rejects(store.read(requestId));
  assert.equal(fs.readFileSync(other, 'utf8'), JSON.stringify(record()));
});
test('real filesystem write, file flush, close and promotion failures leave no acknowledgement or owned temp', async () => {
  for (const method of ['writeFileSync', 'fsyncSync', 'linkSync', 'closeSync']) {
    const dir = root(); let injected = false;
    const adapter = new Proxy(fs, { get(target, key) { if (key !== method) return target[key]; return (...args) => { if (!injected && (method !== 'closeSync' || fs.fstatSync(args[0]).isFile())) { injected = true; throw new Error('PRIVATE failure'); } return target[key](...args); }; } });
    const store = storage(adapter).createFileHelpRequestStore(dir);
    await rejectsCode(service.submitHelpRequest(input, dependencies(store)), 'unavailable'); assert.equal(injected, true);
    assert.deepEqual(fs.readdirSync(dir), []);
  }
});
test('exclusive temp open failure never removes a pre-existing foreign temp', async () => {
  const dir = root(); const foreign = path.join(dir, `.${requestId}.${auditId}.tmp`); fs.writeFileSync(foreign, 'do not delete', { mode: 0o600 });
  const storeModule = load(storePath, { 'node:fs': fs, 'node:path': path, 'node:crypto': { randomUUID: () => auditId }, './helpRequest': service });
  await assert.rejects(storeModule.createFileHelpRequestStore(dir).createIfAbsent(record()));
  assert.equal(fs.readFileSync(foreign, 'utf8'), 'do not delete'); assert.equal(fs.readdirSync(dir).length, 1);
});
test('directory flush and read errors fail closed even after promotion; healthy retry recovers original bytes', async () => {
  for (const method of ['fsyncSync', 'readFileSync']) {
    const dir = root(); const fault = faultFs(method, (...args) => method !== 'fsyncSync' || fs.fstatSync(args[0]).isDirectory());
    const store = storage(fault.adapter).createFileHelpRequestStore(dir);
    await rejectsCode(service.submitHelpRequest(input, dependencies(store)), 'unavailable'); assert.ok(fault.hits() > 0);
    assert.deepEqual(fs.readdirSync(dir), [`${requestId}.json`]);
    const healthy = disk.createFileHelpRequestStore(dir); const before = fs.readFileSync(path.join(dir, `${requestId}.json`), 'utf8');
    await service.submitHelpRequest(input, dependencies(healthy)); assert.equal(fs.readFileSync(path.join(dir, `${requestId}.json`), 'utf8'), before);
  }
});
test('cleanup failure does not acknowledge or delete unrelated records', async () => {
  const dir = root(); const other = path.join(dir, 'unrelated'); fs.writeFileSync(other, 'preserve', { mode: 0o600 });
  const fault = faultFs('unlinkSync'); const store = storage(fault.adapter).createFileHelpRequestStore(dir);
  await rejectsCode(service.submitHelpRequest(input, dependencies(store)), 'unavailable');
  assert.equal(fs.readFileSync(other, 'utf8'), 'preserve'); assert.ok(fault.hits() > 0);
});

test('route disabled gate does not consume body, read audit or initialize storage', async () => {
  for (const enabled of [undefined, '', 'false', 'TRUE', ' true ']) {
    // undefined must be explicit: avoid JS destructuring defaults in harness.
    const harness = routeHarness({ enabled: enabled === undefined ? null : enabled });
    assert.equal((await harness.post()).status, 503); assert.deepEqual(harness.calls, []);
  }
  for (const directory of [undefined, '', 'relative', path.join(scratch, 'absent')]) {
    const harness = routeHarness({ directory: directory === undefined ? null : directory });
    assert.equal((await harness.post()).status, 503); assert.deepEqual(harness.calls, ['root']);
  }
});
test('route JSON-only malformed, no-body, invalid UTF8 and stream failures are private 400 before adapters', async () => {
  for (const options of [{ contentType: 'text/plain' }, { contentType: null }, { noBody: true }, { raw: new Uint8Array() }, { raw: new Uint8Array([0xff]) }, { raw: new TextEncoder().encode('{bad') }, { streamError: true }, { body: [] }, { body: { ...input, privacyAccepted: false } }]) {
    const harness = routeHarness(); assert.equal((await harness.post(options)).status, 400);
    assert.ok(!harness.calls.includes('rate') && !harness.calls.includes('audit') && !harness.calls.includes('store'));
  }
});
test('route enforces exact 8192 streamed bytes, cancels split overflows despite forged lengths', async () => {
  const valid = JSON.stringify(input); const exact = new TextEncoder().encode(valid + ' '.repeat(8192 - valid.length));
  assert.equal(exact.byteLength, 8192);
  const harness = routeHarness(); assert.equal((await harness.post({ chunks: [exact.subarray(0, 101), exact.subarray(101)], contentType: 'Application/JSON; charset=utf-8' })).status, 200);
  for (const contentLength of [undefined, '1', '8192']) {
    const h = routeHarness(); const result = await h.post({ chunks: [exact, new Uint8Array([32]), new Uint8Array([32])], contentLength });
    assert.equal(result.status, 400); assert.equal(result.state.cancelled, true); assert.equal(result.state.reads, 2);
    assert.ok(!h.calls.includes('rate') && !h.calls.includes('audit') && !h.calls.includes('store'));
  }
  const h = routeHarness(); const result = await h.post({ chunks: [new Uint8Array(8193)], cancelError: true }); assert.equal(result.status, 400); assert.equal(result.state.cancelled, true);
});
test('route 200 new/retry, 409 conflict and exact private minimized replies with real disk storage', async () => {
  const harness = routeHarness();
  assert.deepEqual((await harness.post()).body, receipt);
  assert.deepEqual((await harness.post({ body: { ...input, name: 'Synthetic Person' } })).body, receipt);
  const conflict = await harness.post({ body: { ...input, name: 'Other Person' } });
  assert.equal(conflict.status, 409); assert.deepEqual(conflict.body, { ok: false, error: 'conflict' });
  assert.deepEqual(plain(await disk.createFileHelpRequestStore(harness.directory).read(requestId)), record());
});
test('route 404 missing/expired/wrong candidate and 429 rate denial do not persist', async () => {
  for (const auditRecord of [null, { ...audit, expiresAt: now }, { ...audit, candidates: [audit.candidates[0]] }]) {
    const harness = routeHarness({ auditRecord }); const result = await harness.post(); assert.equal(result.status, 404); assert.deepEqual(result.body, { ok: false, error: 'not_found' }); assert.deepEqual(fs.readdirSync(harness.directory), []);
  }
  const harness = routeHarness({ allowed: false }); assert.equal((await harness.post()).status, 429); assert.ok(!harness.calls.includes('audit') && !harness.calls.includes('store'));
});
test('route rate/read/store/internal failures are private bounded 503 with no logs or contact echo', async () => {
  for (const throwAt of ['rate', 'audit', 'store']) {
    const harness = routeHarness({ throwAt }); const result = await harness.post(); assert.equal(result.status, 503); assert.deepEqual(result.body, { ok: false, error: 'unavailable' });
  }
  const harness = routeHarness({ storeOverride: { read: fail, createIfAbsent: async () => { throw new Error('PRIVATE person@example.invalid'); } } });
  assert.equal((await harness.post()).status, 503);
});
test('route counts every valid retry toward five per ten minutes and denies the sixth before audit/store', async () => {
  const harness = routeHarness({ enforceRate: true });
  for (let i = 0; i < 5; i++) assert.equal((await harness.post()).status, 200);
  const previousAudits = harness.calls.filter(call => call === 'audit').length;
  const previousStores = harness.calls.filter(call => call === 'store').length;
  assert.equal((await harness.post()).status, 429);
  assert.equal(harness.calls.filter(call => call === 'audit').length, previousAudits);
  assert.equal(harness.calls.filter(call => call === 'store').length, previousStores);
});
test('application source safety: ASCII only, no unsafe-any, no ambient VM env or unexpected imports', () => {
  for (const file of [servicePath, storePath, routePath, integrationNote, fileURLToPath(import.meta.url)]) assert.match(fs.readFileSync(file, 'utf8'), /^[\x00-\x7f]*$/);
  for (const file of [servicePath, storePath, routePath]) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) { assert.notEqual(node.kind, ts.SyntaxKind.AnyKeyword, `${file}: unsafe any`); ts.forEachChild(node, visit); } visit(source);
  }
  assert.throws(() => load(routePath, {}), /unexpected import/);
});


test('lookup-only recovery never creates or overwrites, for valid and expired audits', async () => {
  const dir = root(); const store = disk.createFileHelpRequestStore(dir);
  for (const auditValue of [audit, { ...audit, expiresAt: '2026-10-21T13:00:00.000Z' }]) {
    const deps = dependencies(store, auditValue);
    await rejectsCode(service.recoverHelpRequest(input, deps.store), 'not_found');
    assert.deepEqual(fs.readdirSync(dir), []);
  }
  await service.submitHelpRequest(input, dependencies(store));
  const filename = path.join(dir, `${requestId}.json`);
  const original = fs.readFileSync(filename);
  for (const auditValue of [audit, { ...audit, expiresAt: '2026-10-21T13:00:00.000Z' }]) {
    const deps = dependencies(store, auditValue);
    assert.deepEqual(plain(await service.recoverHelpRequest(input, deps.store)), receipt);
    await rejectsCode(service.recoverHelpRequest({ ...input, name: 'Different' }, deps.store), 'not_found');
    assert.deepEqual(fs.readFileSync(filename), original);
  }
});


test('recovery HTTP route equalizes missing and mismatched records and enforces gates', async () => {
  const dir = root(); const h = routeHarness({ directory: dir, recovery: true });
  const absent = await h.post();
  assert.equal(absent.status, 404);
  const store = disk.createFileHelpRequestStore(dir);
  await service.submitHelpRequest(input, dependencies(store));
  const filename = path.join(dir, `${requestId}.json`); const bytes = fs.readFileSync(filename);
  const mismatch = await h.post({ body: { ...input, name: 'Different' } });
  assert.equal(mismatch.status, absent.status); assert.deepEqual(mismatch.body, absent.body);
  assert.deepEqual((await h.post()).body, receipt);
  assert.deepEqual(fs.readFileSync(filename), bytes);
  assert.ok(!h.calls.includes('audit'));
  assert.equal((await routeHarness({ recovery: true, enabled: 'false' }).post()).status, 503);
  assert.equal((await routeHarness({ recovery: true, allowed: false }).post()).status, 429);
});

test('recovery store emits no file creation or mutation events', async () => {
  const dir = root(); const initial = disk.createFileHelpRequestStore(dir);
  await service.submitHelpRequest(input, dependencies(initial));
  const writes = [];
  const monitored = new Proxy(fs, { get(target, key) {
    if (['writeFileSync', 'writeSync', 'linkSync', 'unlinkSync', 'renameSync', 'mkdirSync', 'truncateSync'].includes(key)) return (...args) => { writes.push(key); return target[key](...args); };
    if (key === 'openSync') return (...args) => { if (typeof args[1] === 'number' && (args[1] & (fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_TRUNC))) writes.push('openSync-write'); return target[key](...args); };
    return target[key];
  } });
  const store = storage(monitored).createFileHelpRequestStore(dir);
  const missing = { ...input, requestId: '123e4567-e89b-42d3-a456-426614174099' };
  await rejectsCode(service.recoverHelpRequest(missing, store), 'not_found');
  await service.recoverHelpRequest(input, store);
  await rejectsCode(service.recoverHelpRequest({ ...input, name: 'Different' }, store), 'not_found');
  assert.deepEqual(writes, []);
});
