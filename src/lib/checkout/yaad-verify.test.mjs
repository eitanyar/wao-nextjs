import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCallbackOutcome } from './yaad-verify.js';

// docs/specs/priority-4-live-payment-integration.md §2 — the 5 required
// behavioral tests. Mocks `fetch` to Hyp's `pay.hyp.co.il` VERIFY endpoint;
// no regex-on-source.

function makeFetchMock(responseBody, { ok = true } = {}) {
  let callCount = 0;
  const calls = [];
  const fn = async (url, init) => {
    callCount += 1;
    calls.push({ url, init });
    return {
      ok,
      text: async () => responseBody,
    };
  };
  fn.callCount = () => callCount;
  fn.calls = () => calls;
  return fn;
}

const LIVE_CREDS = { terminal: '5601242121', apiKey: 'test-api-key', passP: 'test-passp' };

// ── 1: status=success, no Sign → error, VERIFY never called ───────────────
test('live mode: status=success with no Sign param → resolves to error without calling VERIFY', async () => {
  const fetchImpl = makeFetchMock('CCode=0');
  const searchParams = new URLSearchParams({ status: 'success', Id: 'TX-1' });

  const result = await resolveCallbackOutcome({
    searchParams,
    isLive: true,
    ...LIVE_CREDS,
    fetchImpl,
  });

  assert.equal(result.outcome, 'error');
  assert.equal(fetchImpl.callCount(), 0, 'VERIFY must not be called when Sign is missing');
});

// ── 2: status=success, Sign present, VERIFY returns non-zero CCode → error ─
test('live mode: status=success with Sign, but Hyp VERIFY returns non-zero CCode → resolves to error', async () => {
  const fetchImpl = makeFetchMock('CCode=3&Error=declined');
  const searchParams = new URLSearchParams({ status: 'success', Id: 'TX-2', Sign: 'abc123' });

  const result = await resolveCallbackOutcome({
    searchParams,
    isLive: true,
    ...LIVE_CREDS,
    fetchImpl,
  });

  assert.equal(result.outcome, 'error');
  assert.equal(fetchImpl.callCount(), 1);
});

// ── 3: status=success, Sign present, VERIFY returns CCode=0 → success ─────
test('live mode: status=success with Sign, Hyp VERIFY returns CCode=0 → resolves to success', async () => {
  const fetchImpl = makeFetchMock('CCode=0&Id=TX-3');
  const searchParams = new URLSearchParams({ status: 'success', Id: 'TX-3', Sign: 'abc123' });

  const result = await resolveCallbackOutcome({
    searchParams,
    isLive: true,
    ...LIVE_CREDS,
    fetchImpl,
  });

  assert.equal(result.outcome, 'success');
  assert.equal(fetchImpl.callCount(), 1);
  // The VERIFY call must round-trip Sign (and the rest of the callback params).
  const calledUrl = new URL(fetchImpl.calls()[0].url);
  assert.equal(calledUrl.searchParams.get('action'), 'APISign');
  assert.equal(calledUrl.searchParams.get('What'), 'VERIFY');
  assert.equal(calledUrl.searchParams.get('Sign'), 'abc123');
});

// ── 4: sandbox mode (isLive=false) → success off status alone, VERIFY skipped
test('sandbox mode (isLive=false): status=success resolves to success without calling VERIFY at all', async () => {
  const fetchImpl = makeFetchMock('CCode=0');
  const searchParams = new URLSearchParams({ status: 'success', Id: 'TX-4' });

  const result = await resolveCallbackOutcome({
    searchParams,
    isLive: false,
    terminal: '1234567890',
    apiKey: undefined,
    passP: undefined,
    fetchImpl,
  });

  assert.equal(result.outcome, 'success');
  assert.equal(fetchImpl.callCount(), 0, 'sandbox mode must never call the real Hyp VERIFY endpoint');
});

// ── 5: live mode, YAAD_PASSP unset → every callback fails closed ──────────
test('live mode with YAAD_PASSP unset: rejects every callback (fail-closed), even with status=success and a Sign', async () => {
  const fetchImpl = makeFetchMock('CCode=0');
  const searchParams = new URLSearchParams({ status: 'success', Id: 'TX-5', Sign: 'abc123' });

  const result = await resolveCallbackOutcome({
    searchParams,
    isLive: true,
    terminal: LIVE_CREDS.terminal,
    apiKey: LIVE_CREDS.apiKey,
    passP: undefined, // not yet sourced from Hyp — see docs/specs/priority-4-live-payment-integration.md §1a
    fetchImpl,
  });

  assert.equal(result.outcome, 'error');
  assert.equal(fetchImpl.callCount(), 0, 'must not call VERIFY (or treat it as passing) when PassP is missing');
});
