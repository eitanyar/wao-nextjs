import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/grid-scan/route.ts');
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
    WebSocket: function () { deny('WebSocket access'); },
    XMLHttpRequest: function () { deny('XMLHttpRequest access'); },
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
    setTimeout: () => deny('timer access'),
    setInterval: () => deny('timer access'),
  }, { filename: routePath });
  assert.deepEqual(Object.keys(exports), ['POST']);

  async function post(payload) {
    const request = new Proxy({ payload }, {
      get: (_, name) => deny(`request.${String(name)}`),
      ownKeys: () => deny('request keys'),
      getOwnPropertyDescriptor: () => deny('request descriptor'),
    });
    const response = await exports.POST(request);
    assert.ok(response instanceof Response);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'grid_scan_disabled' });
    assert.deepEqual(unexpected, []);
  }
  return { post, unexpected };
}

test('grid-scan POST rejects malformed and valid-looking scan requests without inspection or effects', async () => {
  const h = routeHarness();
  for (const payload of [
    null,
    '',
    { businessName: '', keyword: '', lat: 'invalid', lng: null, gridSize: 99 },
    { businessName: 'Synthetic Shop', keyword: 'test query', lat: 31.5, lng: 35,
      radiusKm: 5, gridSize: 5, placeId: 'synthetic-place' },
  ]) await h.post(payload);
  assert.deepEqual(h.unexpected, []);
});

test('grid-scan POST ignores apparent authorization and enabling flags across repeated calls', async () => {
  const h = routeHarness();
  for (let i = 0; i < 3; i++) {
    await h.post({ businessName: 'Synthetic Shop', keyword: 'test query', lat: 31.5, lng: 35,
      authorization: 'Bearer admin', cookies: { admin: 'true' },
      env: { ENABLE_GRID_SCAN: 'true', NODE_ENV: 'development' } });
  }
  assert.deepEqual(h.unexpected, []);
});
