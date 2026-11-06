import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/fix-execute/route.ts');
const auditId = '123e4567-e89b-42d3-a456-426614174000';
const itemId = 'write-hours';

function routeHarness() {
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
  assert.deepEqual(Object.keys(exports), ['POST']);

  async function post(fixture) {
    const request = new Proxy({ fixture }, {
      get: (_, name) => deny(`request.${String(name)}`),
      ownKeys: () => deny('request keys'),
      getOwnPropertyDescriptor: () => deny('request descriptor'),
    });
    const response = await exports.POST(request);
    assert.ok(response instanceof Response);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'fix_execution_disabled' });
    assert.deepEqual(unexpected, []);
  }
  return { post };
}

test('fix-execute POST rejects missing and malformed inputs without request or effects', async () => {
  const harness = routeHarness();
  for (const fixture of [
    null,
    { body: '' },
    { headers: { 'content-type': 'application/json' }, body: '{bad' },
    { headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'auditId=../../escape' },
    { headers: { authorization: 'Bearer wrong' }, body: null },
  ]) await harness.post(fixture);
});

test('fix-execute POST ignores valid-looking, mock/test and apparently authorized inputs repeatedly', async () => {
  const harness = routeHarness();
  for (let i = 0; i < 3; i++) {
    for (const fixture of [
      { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ auditId, itemId }) },
      { headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `auditId=${auditId}&itemId=${itemId}` },
      { headers: { 'content-type': 'multipart/form-data; boundary=synthetic' }, form: { auditId, itemId } },
      { headers: { authorization: 'Bearer synthetic-secret', cookie: 'admin=true' },
        body: { auditId, itemId, mock: true }, env: { NODE_ENV: 'test', CRON_SECRET: 'synthetic-secret' } },
      { headers: { authorization: 'Bearer synthetic-secret' },
        body: { auditId, itemId, mock: false }, env: { NODE_ENV: 'production', CRON_SECRET: 'synthetic-secret' } },
    ]) await harness.post(fixture);
  }
});
