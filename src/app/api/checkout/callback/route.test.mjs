import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { isLiveYaadMode, verifyYaadCallbackViaHyp } from '../../../../lib/checkout/yaad-verify.js';

// Legacy verification helpers remain independently tested, but neither
// public checkout handler imports them or accepts a payment callback.
//
// Verification scheme (confirmed 2026-07-24, docs/specs/priority-4 §1a):
// Hyp Pay does NOT use a locally-computable HMAC. The callback's own params
// are round-tripped back to Hyp's APISign VERIFY endpoint, and only a
// CCode=0 response is treated as genuine. `fetch` is mocked here — never a
// real network call in tests.

const LIVE_ENV = { YAAD_TERMINAL_NUMBER: '9998887776', YAAD_LIVE_MODE: 'true', YAAD_API_KEY: 'api-key' };
const SANDBOX_ENV_DEFAULT_TERMINAL = { YAAD_TERMINAL_NUMBER: '1234567890', YAAD_LIVE_MODE: 'true' };
const SANDBOX_ENV_NO_LIVE_FLAG = { YAAD_TERMINAL_NUMBER: '9998887776', YAAD_LIVE_MODE: undefined };
const SANDBOX_ENV_EMPTY = {};

function makeFetchMock(responseText) {
  let called = false;
  const fetchImpl = async () => {
    called = true;
    return { ok: true, text: async () => responseText };
  };
  fetchImpl.wasCalled = () => called;
  return fetchImpl;
}

test('isLiveYaadMode is true only with a non-default terminal and YAAD_LIVE_MODE=true', () => {
  assert.equal(isLiveYaadMode(LIVE_ENV), true);
  assert.equal(isLiveYaadMode(SANDBOX_ENV_DEFAULT_TERMINAL), false);
  assert.equal(isLiveYaadMode(SANDBOX_ENV_NO_LIVE_FLAG), false);
  assert.equal(isLiveYaadMode(SANDBOX_ENV_EMPTY), false);
});

test('verifyYaadCallbackViaHyp rejects a callback with no Sign param, and never calls VERIFY', async () => {
  const callbackParams = new URLSearchParams({ status: 'success', Id: 'TX-1', CCode: '0' });
  const fetchImpl = makeFetchMock('CCode=0');

  const isValid = await verifyYaadCallbackViaHyp({
    callbackParams,
    terminal: '9998887776',
    apiKey: 'api-key',
    passP: 'the-passp',
    fetchImpl,
  });

  assert.equal(isValid, false);
  assert.equal(fetchImpl.wasCalled(), false);
});

test('verifyYaadCallbackViaHyp rejects when the mocked VERIFY response is not CCode=0', async () => {
  const callbackParams = new URLSearchParams({ status: 'success', Id: 'TX-1', CCode: '0', Sign: 'abc123' });
  const fetchImpl = makeFetchMock('CCode=1&Error=InvalidSignature');

  const isValid = await verifyYaadCallbackViaHyp({
    callbackParams,
    terminal: '9998887776',
    apiKey: 'api-key',
    passP: 'the-passp',
    fetchImpl,
  });

  assert.equal(isValid, false);
  assert.equal(fetchImpl.wasCalled(), true);
});

test('verifyYaadCallbackViaHyp accepts when the mocked VERIFY response is CCode=0', async () => {
  const callbackParams = new URLSearchParams({ status: 'success', Id: 'TX-1', CCode: '0', Sign: 'abc123' });
  const fetchImpl = makeFetchMock('CCode=0');

  const isValid = await verifyYaadCallbackViaHyp({
    callbackParams,
    terminal: '9998887776',
    apiKey: 'api-key',
    passP: 'the-passp',
    fetchImpl,
  });

  assert.equal(isValid, true);
  assert.equal(fetchImpl.wasCalled(), true);
});

const checkoutRoutes = [
  ['POST', 'src/app/api/checkout/route.ts'],
  ['GET', 'src/app/api/checkout/callback/route.ts'],
];

function loadCheckoutHandler(relativePath, method, nodeEnv, paymentConfigured) {
  const routePath = path.join(process.cwd(), relativePath);
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
    process: new Proxy({ env: { NODE_ENV: nodeEnv, YAAD_LIVE_MODE: paymentConfigured ? 'true' : undefined } },
      { get: (_, name) => deny(`process.${String(name)}`) }),
    fetch: () => deny('fetch'),
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
    Date: class { constructor() { deny('clock'); } static now() { deny('clock'); } },
    setTimeout: () => deny('setTimeout'),
    setInterval: () => deny('setInterval'),
  }, { filename: routePath });
  assert.deepEqual(Object.keys(exports), [method]);
  return { handler: exports[method], unexpected, deny };
}

test('actual exported checkout POST and callback GET are fixed inert responses across environments', async () => {
  for (const [method, relativePath] of checkoutRoutes) {
    for (const nodeEnv of ['development', 'production', 'test']) {
      for (const paymentConfigured of [false, true]) {
        const { handler, unexpected, deny } = loadCheckoutHandler(relativePath, method, nodeEnv, paymentConfigured);
        const trapped = fixture => new Proxy(fixture, {
          get: (_, name) => deny(`request.${String(name)}`),
          ownKeys: () => deny('request keys'),
          getOwnPropertyDescriptor: () => deny('request descriptor'),
        });
        for (const request of [
          undefined,
          null,
          trapped({ url: 'https://example.invalid/api/checkout/callback?status=success&slug=campaign' }),
          trapped({ json: async () => ({ amount: 9.9, status: 'success' }) }),
          trapped({ json: async () => JSON.parse('{'), url: 'malformed-url' }),
          trapped({ get url() { throw new Error('URL getter'); }, get then() { throw new Error('thenable getter'); } }),
        ]) {
          const response = await handler(request);
          assert.ok(response instanceof Response);
          assert.equal(response.status, 503);
          assert.deepEqual(await response.json(), { error: 'checkout_unavailable' });
          assert.equal(response.headers.get('cache-control'), 'private, no-store');
          assert.equal(response.headers.get('location'), null);
          assert.deepEqual(unexpected, []);
        }
      }
    }
  }
});

test('verifyYaadCallbackViaHyp fails closed when passP is unset, regardless of Sign/CCode', async () => {
  const callbackParams = new URLSearchParams({ status: 'success', Id: 'TX-1', CCode: '0', Sign: 'abc123' });
  const fetchImpl = makeFetchMock('CCode=0');

  const isValid = await verifyYaadCallbackViaHyp({
    callbackParams,
    terminal: '9998887776',
    apiKey: 'api-key',
    passP: undefined,
    fetchImpl,
  });

  assert.equal(isValid, false);
  assert.equal(fetchImpl.wasCalled(), false);
});
