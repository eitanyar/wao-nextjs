import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { GATE_MODULE, closedRequestCases, gatedProcess, loadGate } from '../paidFlowGate.testkit.mjs';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/connect-status/route.ts');
const auditId = '00000000-0000-4000-8000-000000000000';

function routeHarness(processEnv = {}, cookie = undefined) {
  const code = ts.transpileModule(fs.readFileSync(routePath, 'utf8'), {
    fileName: routePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const unexpected = [];
  const deny = name => { unexpected.push(name); throw new Error(`unexpected ${name}`); };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === 'next/server') return { NextResponse: { json: (body, options) => Response.json(body, options) } };
      // The real runtime gate (src/lib/site-bot/paidFlowGate.ts), sandboxed with the same denials.
      if (name === GATE_MODULE) return loadGate(processEnv, deny, { cookie }).gate;
      return deny(`import: ${name}`);
    },
    // Only the SITE_BOT_PAID_FLOW gate keys are readable; every closed-gate env must keep the stub.
    process: gatedProcess(processEnv, deny),
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
    assert.deepEqual(await response.json(), { error: 'gbp_status_disabled' });
    assert.deepEqual(unexpected, []);
  }
  return { get };
}

test('GBP status GET rejects missing and malformed inputs without request or effects', async () => {
  const harness = routeHarness();
  for (const fixture of [
    null,
    { url: '' },
    { url: 'https://example.invalid/api/site-bot/connect-status?auditId=../../escape' },
  ]) await harness.get(fixture);
});

test('GBP status GET ignores valid-looking and apparently authorized inputs repeatedly', async () => {
  const harness = routeHarness();
  for (let i = 0; i < 3; i++) {
    for (const fixture of [
      { url: `https://example.invalid/api/site-bot/connect-status?auditId=${auditId}` },
      { url: `https://example.invalid/api/site-bot/connect-status?auditId=${auditId}&authorized=true`,
        headers: { authorization: 'Bearer admin', cookie: 'admin=true', 'x-forwarded-for': '127.0.0.1' },
        env: { ENABLE_GBP_STATUS: 'true', NODE_ENV: 'production' } },
    ]) await harness.get(fixture);
  }
});

test('GBP status GET stays the audit-only stub for every closed rehearsal-flag env', async () => {
  // Closed envs (with or without a valid admin cookie) and rehearsal without a valid admin cookie.
  for (const { env, cookie } of closedRequestCases()) {
    const harness = routeHarness(env, cookie);
    await harness.get({ url: 'https://example.invalid/api/site-bot/connect-status?auditId=00000000-0000-4000-8000-000000000000' });
  }
});
