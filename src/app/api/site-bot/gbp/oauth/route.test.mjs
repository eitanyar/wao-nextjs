import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const routes = ['start', 'callback'];
const auditId = '00000000-0000-4000-8000-000000000000';

function routeHarness(route) {
  const routePath = path.join(process.cwd(), `src/app/api/site-bot/gbp/oauth/${route}/route.ts`);
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
    process: new Proxy({}, { get: (_, name) => deny(`process.${String(name)}`) }),
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
  assert.deepEqual(Object.keys(exports), ['GET']);

  async function get(fixture) {
    const request = new Proxy({ fixture }, {
      get: (_, name) => deny(`request.${String(name)}`),
      ownKeys: () => deny('request keys'),
      getOwnPropertyDescriptor: () => deny('request descriptor'),
    });
    const response = await exports.GET(request);
    assert.ok(response instanceof Response);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'gbp_oauth_disabled' });
    assert.deepEqual(unexpected, []);
  }
  return { get };
}

for (const route of routes) {
  test(`GBP OAuth ${route} GET rejects missing and malformed query without request or effects`, async () => {
    const harness = routeHarness(route);
    for (const fixture of [
      null,
      { url: '' },
      { url: `https://example.invalid/api/site-bot/gbp/oauth/${route}?auditId=../../escape&state=bad&code=` },
    ]) await harness.get(fixture);
  });

  test(`GBP OAuth ${route} GET ignores valid-looking, signed-looking, mock and authorized inputs`, async () => {
    const harness = routeHarness(route);
    for (let i = 0; i < 3; i++) {
      for (const fixture of [
        { url: `https://example.invalid/api/site-bot/gbp/oauth/${route}?auditId=${auditId}` },
        { url: `https://example.invalid/api/site-bot/gbp/oauth/${route}?state=${auditId}%3A9999999999999%3A${'a'.repeat(64)}&code=mock_123` },
        { url: `https://example.invalid/api/site-bot/gbp/oauth/${route}?code=real-looking-code&state=${auditId}%3A9999999999999%3A${'b'.repeat(64)}`,
          headers: { authorization: 'Bearer admin', cookie: 'admin=true', 'x-forwarded-host': 'example.invalid' },
          env: { ENABLE_GBP_OAUTH: 'true', NODE_ENV: 'production' } },
      ]) await harness.get(fixture);
    }
  });
}
