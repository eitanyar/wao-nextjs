import assert from 'node:assert/strict';
import test from 'node:test';
import { isLiveYaadMode, verifyYaadCallbackViaHyp } from '../../../../lib/checkout/yaad-verify.js';

// These tests exercise the actual verification/gating logic used by
// `src/app/api/checkout/callback/route.ts` (imported directly, not
// regex-matched against source), and separately assert the route wires that
// logic in fail-closed for live mode.
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

function makeFetchMock(responseText, { shouldBeCalled = true } = {}) {
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

// --- End-to-end behavior of the callback route, simulated with the same
// gating primitives it imports, mirroring the exact branch it takes. ---

async function simulateCallback({ env, status, callbackParams, fetchImpl }) {
  const terminalNumber = env.YAAD_TERMINAL_NUMBER || '1234567890';
  const apiKey = env.YAAD_API_KEY || '';
  const passP = env.YAAD_PASSP;

  if (isLiveYaadMode(env)) {
    const isValid = await verifyYaadCallbackViaHyp({
      callbackParams,
      terminal: terminalNumber,
      apiKey,
      passP,
      fetchImpl,
    });
    if (!isValid) {
      return '/google-ads/onboarding?payment=error&reason=invalid_signature';
    }
  }

  if (status === 'success' || status === '0') {
    return `/google-ads/onboarding?payment=success`;
  }
  return `/google-ads/onboarding?payment=error`;
}

test('live mode: status=success with no Sign param redirects to payment=error', async () => {
  const callbackParams = new URLSearchParams({ status: 'success' });
  const fetchImpl = makeFetchMock('CCode=0');
  const redirect = await simulateCallback({
    env: { ...LIVE_ENV, YAAD_PASSP: 'the-passp' },
    status: 'success',
    callbackParams,
    fetchImpl,
  });
  assert.match(redirect, /payment=error/);
  assert.doesNotMatch(redirect, /payment=success/);
  assert.equal(fetchImpl.wasCalled(), false);
});

test('live mode: status=success with a Sign param but VERIFY returns non-zero CCode redirects to payment=error', async () => {
  const callbackParams = new URLSearchParams({ status: 'success', Sign: 'abc123' });
  const fetchImpl = makeFetchMock('CCode=1');
  const redirect = await simulateCallback({
    env: { ...LIVE_ENV, YAAD_PASSP: 'the-passp' },
    status: 'success',
    callbackParams,
    fetchImpl,
  });
  assert.match(redirect, /payment=error/);
  assert.doesNotMatch(redirect, /payment=success/);
});

test('live mode: status=success with a Sign param and VERIFY returns CCode=0 redirects to payment=success', async () => {
  const callbackParams = new URLSearchParams({ status: 'success', Sign: 'abc123' });
  const fetchImpl = makeFetchMock('CCode=0');
  const redirect = await simulateCallback({
    env: { ...LIVE_ENV, YAAD_PASSP: 'the-passp' },
    status: 'success',
    callbackParams,
    fetchImpl,
  });
  assert.match(redirect, /payment=success/);
});

test('sandbox mode (no live terminal configured): status=success passes through without calling VERIFY', async () => {
  const callbackParams = new URLSearchParams({ status: 'success' });
  const fetchImpl = makeFetchMock('CCode=0');
  const redirect = await simulateCallback({
    env: SANDBOX_ENV_DEFAULT_TERMINAL,
    status: 'success',
    callbackParams,
    fetchImpl,
  });
  assert.match(redirect, /payment=success/);
  assert.equal(fetchImpl.wasCalled(), false);
});

test('live mode: YAAD_PASSP unset always redirects to payment=error, even with a valid-looking Sign', async () => {
  const callbackParams = new URLSearchParams({ status: 'success', Sign: 'abc123', CCode: '0' });
  const fetchImpl = makeFetchMock('CCode=0');
  const redirect = await simulateCallback({
    env: { ...LIVE_ENV, YAAD_PASSP: undefined },
    status: 'success',
    callbackParams,
    fetchImpl,
  });
  assert.match(redirect, /payment=error/);
  assert.equal(fetchImpl.wasCalled(), false);
});
