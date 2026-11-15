import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { GATE_MODULE, closedRequestCases, gatedProcess, loadGate } from '../../paidFlowGate.testkit.mjs';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/checkout/init/route.ts');

function routeHarness(processEnv, cookie) {
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
  // Closed envs (with or without a valid admin cookie) and rehearsal without a valid admin cookie.
  for (const { env, cookie } of closedRequestCases()) {
    const harness = routeHarness(env, cookie);
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
  // Closed envs (with or without a valid admin cookie) and rehearsal without a valid admin cookie.
  for (const { env, cookie } of closedRequestCases()) {
    const harness = routeHarness(env, cookie);
    await harness.post(harness.trapped({
      get json() { throw new Error('request JSON getter'); },
      get then() { throw new Error('request thenable getter'); },
      body: { get then() { throw new Error('body thenable getter'); } },
    }));
  }
});