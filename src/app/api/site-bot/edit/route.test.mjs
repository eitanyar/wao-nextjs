import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/edit/route.ts');
const source = fs.readFileSync(routePath, 'utf8');
const code = ts.transpileModule(source, {
  fileName: routePath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function routeHarness() {
  const unexpected = [];
  const deny = name => { unexpected.push(name); throw new Error(`unexpected ${name}`); };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => name === 'next/server'
      ? { NextResponse: { json: (body, options) => Response.json(body, options) } }
      : deny(`import: ${name}`),
    process: new Proxy({}, { get: (_, name) => deny(`process.${String(name)}`) }),
    fetch: () => deny('network access'),
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
    setTimeout: () => deny('timer access'),
  }, { filename: routePath });
  assert.deepEqual(Object.keys(exports), ['POST']);

  async function post(payload) {
    const request = new Proxy({
      payload,
      json: () => deny('request.json'),
      headers: { get: () => deny('request.headers.get') },
      cookies: { get: () => deny('request.cookies.get') },
    }, { get: (_, name) => deny(`request.${String(name)}`) });
    const response = await exports.POST(request);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'site_edit_disabled' });
    assert.deepEqual(unexpected, []);
  }
  return { post, unexpected };
}

test('site edit POST rejects arbitrary slug and instruction without reading request or IO', async () => {
  const h = routeHarness();
  for (const payload of [
    { slug: 'synthetic-site', instruction: 'change headline' },
    { slug: '../../escape', instruction: 'publish immediately' },
    { slug: '', instruction: '' },
    null,
  ]) await h.post(payload);
  assert.deepEqual(h.unexpected, []);
});

test('site edit POST ignores misleading authorization and environment flags on repeated calls', async () => {
  const h = routeHarness();
  for (let i = 0; i < 3; i++) {
    await h.post({ slug: 'synthetic-site', instruction: 'publish', authorization: 'Bearer admin',
      cookies: { admin: 'true' }, env: { ENABLE_SITE_EDIT: 'true', NODE_ENV: 'development' } });
  }
  assert.deepEqual(h.unexpected, []);
});
