import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const base = path.join(process.cwd(), 'src/app/api/subscriptions');

function harness(route, env) {
  const filename = path.join(base, route, 'route.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const calls = [];
  const deny = name => { calls.push(name); throw new Error(`unexpected ${name}`); };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => name === 'next/server'
      ? { NextResponse: { json: (body, options) => Response.json(body, options) } }
      : deny(`import:${name}`),
    process: new Proxy({ env: { NODE_ENV: env } }, { get: (_, key) => deny(`process:${String(key)}`) }),
    fetch: () => deny('network'),
    XMLHttpRequest: function () { deny('network'); },
    WebSocket: function () { deny('network'); },
    console: new Proxy({}, { get: (_, key) => deny(`console:${String(key)}`) }),
    Date: class { constructor() { deny('clock'); } static now() { deny('clock'); } },
  }, { filename });
  const request = new Proxy({
    url: 'https://example.invalid/api/subscriptions/callback?subscriptionId=synthetic&status=success',
    json: async () => ({ email: 'synthetic@example.invalid', trialAmount: 1,
      recurringAmount: 1, subscriptionId: 'synthetic', status: 'success', token: 'synthetic' }),
  }, {
    get: (_, key) => deny(`request:${String(key)}`),
    ownKeys: () => deny('request:keys'),
    getOwnPropertyDescriptor: () => deny('request:descriptor'),
  });
  return { exports, request, calls };
}

for (const route of ['create', 'callback']) {
  test(`${route} actual handler rejects payment input without access or effects in all environments`, async () => {
    for (const env of ['development', 'production', 'test']) {
      const { exports, request, calls } = harness(route, env);
      assert.deepEqual(Object.keys(exports).sort(), route === 'callback' ? ['GET', 'POST'] : ['POST']);
      for (const method of Object.keys(exports)) {
        for (const input of [undefined, null, request]) {
          const response = await exports[method](input);
          assert.ok(response instanceof Response);
          assert.equal(response.status, 503);
          assert.equal(response.headers.get('cache-control'), 'private, no-store');
          assert.deepEqual(await response.json(), { error: 'subscription_unavailable' });
          assert.equal(response.headers.get('location'), null);
          assert.deepEqual(calls, []);
        }
      }
    }
  });
}
