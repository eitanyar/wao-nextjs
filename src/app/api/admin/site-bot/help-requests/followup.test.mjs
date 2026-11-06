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
const owned = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'help-followup-'));
fs.chmodSync(owned, 0o700);
test.after(() => fs.rmSync(owned, { recursive: true, force: true }));

let logCalls = 0;
let externalCalls = 0;
test.afterEach(() => { assert.equal(logCalls, 0, 'no logging'); assert.equal(externalCalls, 0, 'no external calls'); });
function load(relative, imports, env = {}, globals = {}) {
  const file = path.join(repo, relative);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) { assert.ok(Object.hasOwn(imports, name), name); return imports[name]; },
    process: { env, getuid: () => process.getuid() }, Buffer, Response, TextDecoder, URL, setTimeout,
    fetch() { externalCalls++; throw Error('unexpected external call'); },
    console: new Proxy({}, { get: () => () => { logCalls++; throw Error('unexpected log'); } }), ...globals,
  }, { filename: file });
  return exports;
}
const service = load('src/lib/site-bot/helpRequest.ts', {});
const disk = load('src/lib/site-bot/helpRequestStore.ts', { 'node:fs': fs, 'node:path': path, 'node:crypto': { randomUUID }, './helpRequest': service });
const followUp = load('src/lib/site-bot/helpFollowUp.ts', { 'node:fs': fs, 'node:path': path, 'node:crypto': { randomUUID }, './helpRequest': service, './helpRequestStore': disk });

const id = '123e4567-e89b-42d3-a456-426614174000';
const id2 = '223e4567-e89b-42d3-a456-426614174000';
const time = '2026-10-22T12:00:00.000Z';
const record = { schemaVersion: 1, requestId: id, auditId: '123e4567-e89b-42d3-a456-426614174001', placeId: 'synthetic', displayName: 'Synthetic', name: 'Example', email: 'person@example.invalid', receivedAt: time, consent: { accepted: true, purpose: 'sitebot-help', receivedAt: time }, status: 'received', assignedTo: null };
const ORIGIN = 'http://127.0.0.1:3211';

function dirs() {
  const base = fs.mkdtempSync(path.join(owned, 'case-')); fs.chmodSync(base, 0o700);
  const requests = path.join(base, 'requests'); const followups = path.join(base, 'followups');
  fs.mkdirSync(requests, { mode: 0o700 }); fs.mkdirSync(followups, { mode: 0o700 });
  return { requests, followups };
}
function env(roots, overrides = {}) {
  return { SITE_BOT_HELP_INTAKE_ENABLED: 'true', SITE_BOT_HELP_REQUEST_DIR: roots.requests, SITE_BOT_HELP_FOLLOWUP_DIR: roots.followups, ...overrides };
}
function routes({ roots, envOverrides = {}, allowed = true, auth }) {
  const imports = {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'synthetic-cookie' }) }) },
    '@/lib/admin-auth': auth ?? { ADMIN_COOKIE_NAME: 'admin', verifyAdminToken: async () => allowed },
    '@/lib/site-bot/helpRequest': service,
    '@/lib/site-bot/helpFollowUp': followUp,
  };
  const e = env(roots, envOverrides);
  return {
    inbox: load('src/app/api/admin/site-bot/help-requests/inbox/route.ts', imports, e),
    status: load('src/app/api/admin/site-bot/help-requests/status/route.ts', imports, e),
  };
}
function post(body, { origin = ORIGIN, site = 'same-origin', type = 'application/json', host = '127.0.0.1:3211', forwarded = null } = {}) {
  const headers = {};
  if (host !== null) headers.host = host;
  if (forwarded !== null) headers['x-forwarded-host'] = forwarded;
  if (origin !== null) headers.origin = origin;
  if (site !== null) headers['sec-fetch-site'] = site;
  if (type !== null) headers['content-type'] = type;
  return new Request(`${ORIGIN}/api/admin/site-bot/help-requests/status`, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
async function json(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  return response.json();
}
async function seed(roots, value = record) { await disk.createFileHelpRequestStore(roots.requests).createIfAbsent(value); }

test('status set persists across reload and restart', async () => {
  const roots = dirs(); await seed(roots);
  let r = routes({ roots });
  let list = await json(await r.inbox.GET(), 200);
  assert.equal(list.skipped, 0);
  assert.deepEqual(list.requests, [{ requestId: id, displayName: 'Synthetic', name: 'Example', email: 'person@example.invalid', receivedAt: time, followUp: { status: 'received' } }]);
  const saved = await json(await r.status.POST(post({ requestId: id, status: 'handling' })), 200);
  assert.equal(saved.followUp.status, 'handling'); assert.equal(saved.followUp.updatedBy, 'admin');
  list = await json(await r.inbox.GET(), 200);
  assert.equal(list.requests[0].followUp.status, 'handling');
  r = routes({ roots }); // simulated restart: fresh module instances, same disk
  list = await json(await r.inbox.GET(), 200);
  assert.deepEqual(list.requests[0].followUp, saved.followUp);
  await json(await r.status.POST(post({ requestId: id, status: 'done' })), 200);
  list = await json(await routes({ roots }).inbox.GET(), 200);
  assert.equal(list.requests[0].followUp.status, 'done');
  const file = path.join(roots.followups, `${id}.json`);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.deepEqual(fs.readdirSync(roots.followups), [`${id}.json`], 'no temporary files left behind');
});

test('v1 record bytes and metadata are unchanged after status changes', async () => {
  const roots = dirs(); await seed(roots);
  const file = path.join(roots.requests, `${id}.json`);
  const bytes = fs.readFileSync(file); const before = fs.statSync(file);
  const r = routes({ roots });
  for (const status of ['handling', 'done', 'handling']) await json(await r.status.POST(post({ requestId: id, status })), 200);
  await json(await r.inbox.GET(), 200);
  assert.deepEqual(fs.readFileSync(file), bytes);
  const after = fs.statSync(file);
  assert.equal(after.mtimeMs, before.mtimeMs); assert.equal(after.ino, before.ino); assert.equal(after.mode, before.mode);
  assert.deepEqual(fs.readdirSync(roots.requests), [`${id}.json`]);
});

test('unauthorized read and write are rejected with 401 and write nothing', async () => {
  const roots = dirs(); await seed(roots);
  const r = routes({ roots, allowed: false });
  assert.deepEqual(await json(await r.inbox.GET(), 401), { ok: false, error: 'unauthorized' });
  assert.deepEqual(await json(await r.status.POST(post({ requestId: id, status: 'done' })), 401), { ok: false, error: 'unauthorized' });
  assert.deepEqual(fs.readdirSync(roots.followups), []);
});

test('real admin gate: missing, bad and fixture tokens get 401; valid token passes', async () => {
  const roots = dirs(); await seed(roots);
  const auth = load('src/lib/admin-auth.ts', {}, { ADMIN_SECRET: 'synthetic-test-secret-only' }, { crypto: webcrypto, TextEncoder });
  const token = await auth.createAdminToken();
  for (const cookie of [undefined, '', 'invalid', '1.invalid', auth.ADMIN_CLIENT_FIXTURE_TOKEN, token]) {
    const imports = {
      'next/headers': { cookies: async () => ({ get: name => { assert.equal(name, 'wao-admin'); return cookie === undefined ? undefined : { value: cookie }; } }) },
      '@/lib/admin-auth': auth, '@/lib/site-bot/helpRequest': service, '@/lib/site-bot/helpFollowUp': followUp,
    };
    const inbox = load('src/app/api/admin/site-bot/help-requests/inbox/route.ts', imports, env(roots));
    const status = load('src/app/api/admin/site-bot/help-requests/status/route.ts', imports, env(roots));
    const expected = cookie === token ? 200 : 401;
    await json(await inbox.GET(), expected);
    await json(await status.POST(post({ requestId: id, status: 'handling' })), expected);
  }
});

test('cross-origin, missing origin and cross-site writes are rejected with 403', async () => {
  const roots = dirs(); await seed(roots);
  const r = routes({ roots });
  for (const opts of [{ origin: null }, { origin: 'https://evil.example' }, { origin: 'null' }, { site: 'cross-site' }, { site: 'same-site' },
    { origin: `${ORIGIN}/path` }, { origin: 'ftp://127.0.0.1:3211' }, { host: null }, { host: 'other.example' }, { origin: 'https://evil.example', forwarded: 'evil.example.com' }]) {
    assert.deepEqual(await json(await r.status.POST(post({ requestId: id, status: 'done' }, opts)), 403), { ok: false, error: 'forbidden' });
  }
  assert.deepEqual(fs.readdirSync(roots.followups), []);
  // Behind a reverse proxy: Origin matches the first x-forwarded-host value.
  await json(await r.status.POST(post({ requestId: id, status: 'done' }, { origin: 'https://www.wao.co.il', host: '127.0.0.1:3000', forwarded: 'www.wao.co.il, proxy' })), 200);
});

test('invalid input is rejected and unknown request is 404', async () => {
  const roots = dirs(); await seed(roots);
  const r = routes({ roots });
  for (const body of [{ requestId: id, status: 'received' }, { requestId: id, status: 'DONE' }, { requestId: id }, { requestId: 'nope', status: 'done' },
    { requestId: id.toUpperCase(), status: 'done' }, { requestId: id, status: 'done', extra: 1 }, [], 'null', '{broken', { requestId: id, status: 'done', pad: 'x'.repeat(2000) }]) {
    await json(await r.status.POST(post(body)), 400);
  }
  await json(await r.status.POST(post({ requestId: id, status: 'done' }, { type: 'text/plain' })), 400);
  assert.deepEqual(await json(await r.status.POST(post({ requestId: id2, status: 'done' })), 404), { ok: false, error: 'not_found' });
  assert.deepEqual(fs.readdirSync(roots.followups), []);
});

test('bad files are skipped and counted, valid requests still listed', async () => {
  const roots = dirs(); await seed(roots);
  await json(await routes({ roots }).status.POST(post({ requestId: id, status: 'handling' })), 200);
  const bad = (n) => path.join(roots.requests, `${n}23e4567-e89b-42d3-a456-426614174000.json`);
  fs.writeFileSync(bad(3), '{broken', { mode: 0o600 });
  fs.writeFileSync(bad(4), JSON.stringify({ ...record, requestId: '423e4567-e89b-42d3-a456-426614174000' }), { mode: 0o644 });
  fs.symlinkSync(path.join(roots.requests, `${id}.json`), bad(5));
  fs.writeFileSync(bad(6), JSON.stringify({ ...record, requestId: id2 }), { mode: 0o600 }); // id mismatch
  fs.writeFileSync(path.join(roots.requests, 'unexpected.txt'), 'x', { mode: 0o600 });
  fs.mkdirSync(bad(7), { mode: 0o700 });
  fs.writeFileSync(path.join(roots.requests, `.${id}.${randomUUID()}.tmp`), 'staging', { mode: 0o600 }); // in-flight intake: ignored, not counted
  fs.writeFileSync(path.join(roots.followups, `${id2}.json`), '{"bad":true}', { mode: 0o600 }); // bad follow-up file
  const list = await json(await routes({ roots }).inbox.GET(), 200);
  assert.equal(list.skipped, 7);
  assert.equal(list.requests.length, 1);
  assert.equal(list.requests[0].requestId, id);
  assert.equal(list.requests[0].followUp.status, 'handling');
});

test('disabled or invalid configuration is unavailable for read and write', async () => {
  const roots = dirs(); await seed(roots);
  const insecure = dirs(); fs.chmodSync(insecure.followups, 0o755);
  for (const envOverrides of [{ SITE_BOT_HELP_INTAKE_ENABLED: 'false' }, { SITE_BOT_HELP_INTAKE_ENABLED: undefined }, { SITE_BOT_HELP_INTAKE_ENABLED: 'TRUE' },
    { SITE_BOT_HELP_REQUEST_DIR: undefined }, { SITE_BOT_HELP_FOLLOWUP_DIR: undefined }, { SITE_BOT_HELP_FOLLOWUP_DIR: 'relative' },
    { SITE_BOT_HELP_FOLLOWUP_DIR: path.join(owned, 'missing') }, { SITE_BOT_HELP_FOLLOWUP_DIR: insecure.followups }, { SITE_BOT_HELP_FOLLOWUP_DIR: roots.requests }]) {
    const r = routes({ roots, envOverrides });
    assert.deepEqual(await json(await r.inbox.GET(), 503), { ok: false, error: 'unavailable' });
    assert.deepEqual(await json(await r.status.POST(post({ requestId: id, status: 'done' })), 503), { ok: false, error: 'unavailable' });
  }
  assert.deepEqual(fs.readdirSync(roots.followups), []);
});

test('inbox UI projection and state flow (no DOM)', async () => {
  const ui = await import(path.join(repo, 'src/components/admin/site-bot-help/inbox.mjs'));
  const row = { requestId: id, displayName: 'Synthetic', name: 'Example', email: 'person@example.invalid', receivedAt: time, followUp: { status: 'received' } };
  assert.deepEqual(ui.project(row), row);
  assert.throws(() => ui.project({ ...row, followUp: { status: 'bogus' } }));
  assert.throws(() => ui.project({ ...row, extra: 1 }));
  let current = { status: 'received' }; const states = []; const calls = [];
  const transport = {
    list: async () => Response.json({ ok: true, requests: [{ ...row, followUp: current }], skipped: 2 }),
    setStatus: async (requestId, status) => { calls.push([requestId, status]); current = { status, updatedAt: time, updatedBy: 'admin' }; return Response.json({ ok: true }); },
  };
  const inbox = ui.createInbox({ transport, render: s => states.push(s) });
  await inbox.load();
  assert.equal(states.at(-1).status, 'records'); assert.equal(states.at(-1).skipped, 2);
  await inbox.setStatus(id, 'handling');
  assert.deepEqual(calls, [[id, 'handling']]);
  assert.equal(states.at(-1).records[0].followUp.status, 'handling'); assert.equal(states.at(-1).notice, 'Status saved.');
  const fetches = [];
  const t = ui.createSameOriginTransport(async (url, init) => { fetches.push([url, init]); return new Response('{}'); });
  await t.setStatus(id, 'done');
  assert.equal(fetches[0][0], '/api/admin/site-bot/help-requests/status');
  assert.equal(fetches[0][1].method, 'POST'); assert.equal(fetches[0][1].credentials, 'same-origin');
  assert.equal(fetches[0][1].headers['content-type'], 'application/json');
  assert.ok(!fetches[0][0].includes('@') && !fetches[0][0].includes('?'), 'no contact data in URLs');
});

// Minimal DOM: just what renderInbox uses (textContent-only rendering, no innerHTML).
function fakeDocument() {
  const doc = {
    createElement(tag) {
      const el = { tagName: tag.toUpperCase(), ownerDocument: doc, childNodes: [], attributes: {}, dataset: {}, listeners: {}, disabled: false, id: '', className: '', title: '', type: '',
        get firstChild() { return this.childNodes[0] ?? null; }, get lastChild() { return this.childNodes.at(-1) ?? null; },
        get textContent() { return this.childNodes.map(n => typeof n === 'string' ? n : n.textContent).join(''); },
        set textContent(v) { this.childNodes = [String(v)]; },
        setAttribute(k, v) { this.attributes[k] = String(v); }, getAttribute(k) { return this.attributes[k] ?? null; },
        append(...nodes) { this.childNodes.push(...nodes); }, replaceChildren() { this.childNodes = []; },
        removeChild(n) { this.childNodes.splice(this.childNodes.indexOf(n), 1); return n; },
        addEventListener(type, fn) { this.listeners[type] = fn; }, click() { this.listeners.click?.(); },
        querySelectorAll(tag) { return walk(this).filter(n => n !== this && n.tagName === tag.toUpperCase()); },
      };
      return el;
    },
  };
  return doc;
}
const walk = n => typeof n === 'string' ? [] : [n, ...n.childNodes.flatMap(walk)];

test('inbox renders Israel-local <time> values, keeps one polite status line, and recovers buttons on failure', async () => {
  const ui = await import(path.join(repo, 'src/components/admin/site-bot-help/inbox.mjs'));
  assert.equal(ui.formatIsraelTime(time), new Date(time).toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem' }));
  assert.equal(ui.formatIsraelTime(time), '22/10/2026, 15:00:00');
  const doc = fakeDocument(); const root = doc.createElement('div');
  const updated = '2026-10-23T21:30:00.000Z';
  const row = { requestId: id, displayName: 'Synthetic', name: 'Example', email: 'person@example.invalid', receivedAt: time, followUp: { status: 'done', updatedAt: updated, updatedBy: 'admin' } };
  ui.renderInbox(root, { status: 'loading' });
  const status = root.firstChild;
  assert.equal(status.getAttribute('aria-live'), 'polite'); assert.equal(status.getAttribute('role'), 'status');
  let rejectNext = false; const clicks = [];
  ui.renderInbox(root, { status: 'records', records: [row], skipped: 0 }, { setStatus: async (...args) => { clicks.push(args); if (rejectNext) throw Error('boom'); } });
  assert.equal(root.firstChild, status, 'status line stays mounted across renders');
  const times = walk(root).filter(n => n.tagName === 'TIME');
  assert.deepEqual(times.map(t => [t.getAttribute('datetime'), t.textContent]), [[time, '22/10/2026, 15:00:00'], [updated, '24/10/2026, 00:30:00']]);
  const text = walk(root).map(n => n.childNodes.filter(c => typeof c === 'string').join('')).join('|');
  assert.ok(!text.includes(time) && !text.includes(updated), 'raw UTC ISO strings are not shown as text');
  const [handling, done] = root.querySelectorAll('button');
  assert.equal(done.disabled, true); assert.equal(handling.disabled, false, 'reopen (done -> handling) stays allowed');
  rejectNext = true; handling.click();
  assert.equal(handling.disabled, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(clicks, [[id, 'handling']]);
  assert.equal(handling.disabled, false); assert.equal(done.disabled, true);
  assert.match(status.textContent, /Status update failed/);
  const throwing = doc.createElement('div');
  ui.renderInbox(throwing, { status: 'records', records: [row], skipped: 0 }, { setStatus() { throw Error('sync'); } });
  throwing.querySelectorAll('button')[0].click();
  assert.equal(throwing.querySelectorAll('button')[0].disabled, false); assert.match(throwing.firstChild.textContent, /Status update failed/);

  // A failed refresh after a save keeps the records (and their buttons) with a failure notice.
  const states = []; let listCalls = 0;
  const inbox = ui.createInbox({ render: s => states.push(s), transport: {
    list: async () => (++listCalls === 1 ? Response.json({ ok: true, requests: [row], skipped: 0 }) : new Response('{}', { status: 500 })),
    setStatus: async () => new Response('{}', { status: 500 }) } });
  await inbox.load(); await inbox.setStatus(id, 'handling');
  assert.equal(states.at(-1).status, 'records');
  assert.equal(states.at(-1).notice, 'Status update failed. Unable to refresh requests.');
});

test('new sources are ASCII-only and type-check strictly', () => {
  const files = ['src/lib/site-bot/helpFollowUp.ts', 'src/app/api/admin/site-bot/help-requests/inbox/route.ts', 'src/app/api/admin/site-bot/help-requests/status/route.ts',
    'src/components/admin/site-bot-help/inbox.mjs', 'src/components/admin/site-bot-help/HelpInbox.tsx', 'src/app/api/admin/site-bot/help-requests/followup.test.mjs'];
  for (const relative of files) assert.match(fs.readFileSync(path.join(repo, relative), 'utf8'), /^[\x00-\x7f]*$/, relative);
  const options = { noEmit: true, strict: true, noUnusedLocals: true, noUnusedParameters: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, esModuleInterop: true, baseUrl: repo, paths: { '@/*': ['src/*'] }, types: ['node'], typeRoots: [path.join(repo, 'node_modules/@types')], skipLibCheck: true };
  const program = ts.createProgram(files.slice(0, 3).map(f => path.join(repo, f)), options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: f => f, getCurrentDirectory: () => repo, getNewLine: () => '\n' }));
});
