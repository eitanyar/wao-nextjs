import test from 'node:test';
import assert from 'node:assert/strict';
import { callGeminiJSON } from './gemini-fast';

const originalGeminiApiKey = process.env.GEMINI_API_KEY;
const originalGeminiModelName = process.env.GEMINI_MODEL_NAME;
test.after(() => {
  if (originalGeminiApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiApiKey;
  if (originalGeminiModelName === undefined) delete process.env.GEMINI_MODEL_NAME;
  else process.env.GEMINI_MODEL_NAME = originalGeminiModelName;
});

function response() {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
}

function fakeEnvironment() {
  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.GEMINI_MODEL_NAME;
}

class SafetyFailure extends Error {
  constructor() { super('abort safety timer fired'); this.name = 'SafetyFailure'; }
}

type PendingState = { started: number; settled: number; active: number; safetyTimers: number; signals: AbortSignal[] };
const pendingState = (): PendingState => ({ started: 0, settled: 0, active: 0, safetyTimers: 0, signals: [] });

function pendingFetch(state: PendingState) {
  return async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const signal = init?.signal;
    assert.ok(signal);
    state.started += 1;
    state.active += 1;
    state.signals.push(signal);
    return new Promise<Response>((_resolve, reject) => {
      let settled = false;
      const safety = setTimeout(() => settle(new SafetyFailure()), 250);
      state.safetyTimers += 1;
      const onAbort = () => settle(signal.reason);
      const settle = (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(safety);
        state.safetyTimers -= 1;
        signal.removeEventListener('abort', onAbort);
        state.active -= 1;
        state.settled += 1;
        reject(error);
      };
      if (signal.aborted) onAbort(); else signal.addEventListener('abort', onAbort, { once: true });
    });
  };
}

function assertSettled(state: PendingState) {
  assert.equal(state.started, state.settled);
  assert.equal(state.active, 0);
  assert.equal(state.safetyTimers, 0);
}

test('explicit model selects native Gemini JSON endpoint and LOW thinking payload', async () => {
  fakeEnvironment();
  let url = '';
  let payload: Record<string, unknown> | undefined;
  await callGeminiJSON('system', 'user', {
    model: 'gemini-3.8-flash',
    fetch: async (input, init) => { url = String(input); payload = JSON.parse(String(init?.body)); return response(); },
  });
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  assert.deepEqual(payload?.generationConfig, { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'LOW' } });
});

test('supplied response schema is serialized with JSON MIME type and LOW thinking', async () => {
  fakeEnvironment();
  const schema = { type: 'object', additionalProperties: false, properties: { value: { type: 'string' } }, required: ['value'] };
  let calls = 0;
  let payload: Record<string, unknown> | undefined;
  await callGeminiJSON('system', 'user', { responseJsonSchema: schema, fetch: async (_input, init) => { calls += 1; payload = JSON.parse(String(init?.body)); return response(); } });
  assert.equal(calls, 1);
  assert.deepEqual(payload?.generationConfig, { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'LOW' }, responseJsonSchema: schema });
});

test('omitted options preserve default model and one fetch', async () => {
  fakeEnvironment();
  let calls = 0;
  let url = '';
  let payload: Record<string, unknown> | undefined;
  await callGeminiJSON('system', 'user', { fetch: async (input, init) => { calls += 1; url = String(input); payload = JSON.parse(String(init?.body)); return response(); } });
  assert.equal(calls, 1);
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  assert.deepEqual(payload?.generationConfig, { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'LOW' } });
  assert.equal(Object.prototype.hasOwnProperty.call(payload?.generationConfig ?? {}, 'responseJsonSchema'), false);
});

test('pre-aborted caller performs zero fetches', async () => {
  fakeEnvironment();
  const caller = new AbortController();
  const expected = new Error('caller stop');
  caller.abort(expected);
  let calls = 0;
  await assert.rejects(() => callGeminiJSON('system', 'user', { signal: caller.signal, fetch: async () => { calls += 1; return response(); } }), error => {
    assert.equal(error, expected);
    return true;
  });
  assert.equal(calls, 0);
});

test('in-flight caller abort settles one Gemini fetch without retry', async () => {
  fakeEnvironment();
  const caller = new AbortController();
  const expected = new Error('caller stop');
  const state = pendingState();
  const operation = callGeminiJSON('system', 'user', { signal: caller.signal, fetch: pendingFetch(state) });
  queueMicrotask(() => caller.abort(expected));
  await assert.rejects(operation, error => { assert.equal(error, expected); return true; });
  assert.equal(state.started, 1);
  assert.equal(state.signals[0].reason, expected);
  assertSettled(state);
});

test('explicit timeout reaches and settles abort-aware Gemini fetch', async () => {
  fakeEnvironment();
  const state = pendingState();
  await assert.rejects(() => callGeminiJSON('system', 'user', { timeoutMs: 5, fetch: pendingFetch(state) }), error => {
    assert.equal(error instanceof SafetyFailure, false);
    assert.equal((error as { name?: unknown }).name, 'TimeoutError');
    return true;
  });
  assert.equal(state.started, 1);
  assert.equal(state.signals[0].reason?.name, 'TimeoutError');
  assertSettled(state);
});

test('invalid timeout values reject before Gemini fetch', async () => {
  fakeEnvironment();
  for (const timeoutMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    let calls = 0;
    await assert.rejects(() => callGeminiJSON('system', 'user', { timeoutMs, fetch: async () => { calls += 1; return response(); } }), /Invalid Gemini timeout/);
    assert.equal(calls, 0);
  }
});
