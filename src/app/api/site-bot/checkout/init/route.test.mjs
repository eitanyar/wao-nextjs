import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/checkout/init/route.ts');

function routeHarness(nodeEnv) {
  const code = ts.transpileModule(fs.readFileSync(routePath, 'utf8'), {
    fileName: routePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const unexpected = [];
  const deny = name => { unexpected.push(name); throw new Error(`unexpected ${name}`); };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => name === 'next/server'
      ? { NextResponse: { json: (body, options) => Response.json(body, options) } }
      : deny(`import: ${name}`),
    process: new Proxy({ env: { NODE_ENV: nodeEnv } }, { get: (_, name) => deny(`process.${String(name)}`) }),
    fetch: () => deny('fetch'),
    WebSocket: function () { deny('WebSocket'); },
    XMLHttpRequest: function () { deny('XMLHttpRequest'); },
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
    Date: class { constructor() { deny('clock'); } static now() { deny('clock'); } },
    setTimeout: () => deny('setTimeout'),
    setInterval: () => deny('setInterval'),
    setImmediate: () => deny('setImmediate'),
    queueMicrotask: () => deny('queueMicrotask'),
  }, { filename: routePath });
  assert.deepEqual(Object.keys(exports), ['POST']);

  async function post(request) {
    const response = await exports.POST(request);
    assert.ok(response instanceof Response);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'checkout_unavailable' });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(unexpected, []);
  }
  const trapped = fixture => new Proxy(fixture, {
    get: (_, name) => deny(`request.${String(name)}`),
    ownKeys: () => deny('request keys'),
    getOwnPropertyDescriptor: () => deny('request descriptor'),
  });
  return { post, trapped };
}

test('checkout init actual POST rejects valid and malformed inputs in every environment without effects', async () => {
  for (const env of ['development', 'production', 'test']) {
    const harness = routeHarness(env);
    for (const request of [
      undefined,
      null,
      harness.trapped({ url: 'https://example.invalid/api/site-bot/checkout/init',
        json: async () => ({ collectedData: { businessNiche: 'synthetic-niche' } }) }),
      harness.trapped({ json: async () => JSON.parse('{') }),
      harness.trapped({ headers: { authorization: 'Bearer synthetic' },
        json: async () => ({ collectedData: { businessNiche: 'synthetic-niche' }, authorized: true }),
        env: { ENABLE_CHECKOUT: 'true' } }),
    ]) await harness.post(request);
  }
});

test('checkout init actual POST never reads getter or thenable traps', async () => {
  for (const env of ['development', 'production', 'test']) {
    const harness = routeHarness(env);
    await harness.post(harness.trapped({
      get json() { throw new Error('request JSON getter'); },
      get then() { throw new Error('request thenable getter'); },
      body: { get then() { throw new Error('body thenable getter'); } },
    }));
  }
});