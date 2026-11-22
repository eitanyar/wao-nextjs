import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as policy from '../../../lib/uploads/intakeUploadPolicy.js';

// POST /api/upload safety (Ads Bot safety batch, mission item 2). Runs the REAL route in a vm
// with the real policy module and real fs/promises, rooted in a temp cwd — never the repo's
// public/uploads.

const routePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'route.ts');
const VALID_ID = 's-1784903083309-re238fgm7jh';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0]);
const HTML = Buffer.from('<html><script>alert(1)</script></html>');

function harness() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-upload-'));
  const code = ts.transpileModule(fs.readFileSync(routePath, 'utf8'), {
    fileName: routePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === 'fs/promises') return fsp;
      if (name === 'path') return path;
      if (name === '@/lib/uploads/intakeUploadPolicy') return policy;
      throw new Error(`unexpected import ${name}`);
    },
    process: { cwd: () => cwd },
    Buffer,
    console: { error() {} },
  }, { filename: routePath });

  async function post(fields, files = [], headers = {}) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    for (const f of files) fd.append('files', f);
    const req = new Request('https://example.invalid/api/upload', { method: 'POST', body: fd, headers });
    const res = await exports.POST(req);
    return { status: res.status, body: await res.json() };
  }
  const listed = () => {
    const out = [];
    const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else out.push(path.relative(cwd, p)); } };
    walk(cwd);
    return out.sort();
  };
  return { cwd, post, listed, cleanup: () => fs.rmSync(cwd, { recursive: true, force: true }) };
}

const file = (bytes, type, name = 'a') => new File([bytes], name, { type });

test('policy: only the onboarding page id shape is accepted', () => {
  for (const ok of [VALID_ID, 's-1786437271456-cyprd5pkwo', 's-1784905235537-5']) assert.equal(policy.isValidUploadSessionId(ok), true, ok);
  for (const bad of ['', 'default', '..', '../x', 's-1784903083309-../../etc', 's-1784903083309-ABC', 's-123-abc',
    `${VALID_ID}/x`, `${VALID_ID}\u0000`, ' s-1784903083309-abc', null, undefined, 12]) {
    assert.equal(policy.isValidUploadSessionId(bad), false, String(bad));
    assert.equal(policy.resolveUploadDir('/srv/app', bad), null, String(bad));
  }
  assert.equal(policy.resolveUploadDir('/srv/app', VALID_ID), path.join('/srv/app', 'public', 'uploads', VALID_ID));
});

test('policy: bytes must match the claimed image type; size capped', () => {
  assert.equal(policy.acceptedUploadExtension({ type: 'image/png', size: PNG.length }, PNG), 'png');
  assert.equal(policy.acceptedUploadExtension({ type: 'image/jpeg', size: JPG.length }, JPG), 'jpg');
  assert.equal(policy.acceptedUploadExtension({ type: 'image/png', size: HTML.length }, HTML), null);
  assert.equal(policy.acceptedUploadExtension({ type: 'image/jpeg', size: PNG.length }, PNG), null, 'mislabelled');
  assert.equal(policy.acceptedUploadExtension({ type: 'image/svg+xml', size: 20 }, PNG), null);
  assert.equal(policy.acceptedUploadExtension({ type: 'text/html', size: HTML.length }, HTML), null);
  assert.equal(policy.acceptedUploadExtension({ type: 'image/png', size: policy.MAX_UPLOAD_FILE_BYTES + 1 }, PNG), null);
  assert.equal(policy.acceptedUploadExtension({ type: 'image/png', size: 0 }, PNG), null);
});

test('route: path-traversal and malformed sessionIds are rejected with 400 and nothing is written', async () => {
  const h = harness();
  try {
    for (const sessionId of ['../../../etc', '../../src', '..', '/tmp/x', 'default', `${VALID_ID}/../../x`, 's-1784903083309-a/b']) {
      const res = await h.post({ sessionId }, [file(PNG, 'image/png')]);
      assert.equal(res.status, 400, sessionId);
      assert.deepEqual(res.body, { error: 'Invalid sessionId' });
    }
    const missing = await h.post({}, [file(PNG, 'image/png')]);
    assert.equal(missing.status, 400, 'missing sessionId no longer falls back to a shared "default" dir');
    assert.deepEqual(h.listed(), []);
  } finally { h.cleanup(); }
});

test('route: valid upload writes only inside public/uploads/<sessionId> and skips non-images', async () => {
  const h = harness();
  try {
    const res = await h.post({ sessionId: VALID_ID }, [file(PNG, 'image/png'), file(HTML, 'image/png', 'evil'), file(JPG, 'image/jpeg')]);
    assert.equal(res.status, 200);
    assert.equal(res.body.urls.length, 2);
    for (const url of res.body.urls) assert.match(url, /^\/uploads\/s-1784903083309-re238fgm7jh\/[A-Za-z0-9_-]+\.(png|jpg)$/);
    const written = h.listed();
    assert.equal(written.length, 2);
    for (const rel of written) assert.ok(rel.startsWith(path.join('public', 'uploads', VALID_ID) + path.sep), rel);
  } finally { h.cleanup(); }
});

test('route: only non-images = 200 with no urls and no directory created', async () => {
  const h = harness();
  try {
    const res = await h.post({ sessionId: VALID_ID }, [file(HTML, 'text/html')]);
    assert.deepEqual(res, { status: 200, body: { urls: [] } });
    assert.deepEqual(h.listed(), []);
    assert.equal(fs.existsSync(path.join(h.cwd, 'public')), false);
  } finally { h.cleanup(); }
});

test('route: file-count and declared request-size caps', async () => {
  const h = harness();
  try {
    const many = Array.from({ length: policy.MAX_UPLOAD_FILES + 1 }, () => file(PNG, 'image/png'));
    assert.equal((await h.post({ sessionId: VALID_ID }, many)).status, 400);
    const big = await h.post({ sessionId: VALID_ID }, [file(PNG, 'image/png')], { 'content-length': String(policy.MAX_UPLOAD_REQUEST_BYTES + 1) });
    assert.equal(big.status, 413);
    assert.deepEqual(h.listed(), []);
  } finally { h.cleanup(); }
});
