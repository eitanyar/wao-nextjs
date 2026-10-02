import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Run the source module under Node's direct TS test runner (which does not resolve
// extensionless TS imports), while keeping the canonical CommonJS test build intact.
const requireModule = createRequire(path.join(process.cwd(), 'package.json'));
const ts = requireModule('typescript');
function loadSource(file: string, dependency?: Record<string, unknown>): Record<string, any> {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/ai', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} as Record<string, any> };
  new Function('require', 'module', 'exports', 'process', 'AbortSignal', 'fetch', compiled)(
    () => dependency, module, module.exports, process, AbortSignal, globalThis.fetch);
  return module.exports;
}
const { callQwenJSON, callQwenChatJSON } = loadSource('qwen-fast.ts', loadSource('gemini-fast.ts')) as typeof import('./qwen-fast');

function response() { return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 }); }
function fakeEnvironment() { process.env.QWEN_API_KEY = 'test-key'; process.env.QWEN_BASE_URL = 'https://example.test'; }
class SafetyFailure extends Error { constructor() { super('abort safety timer fired'); this.name = 'SafetyFailure'; } }
type PendingState = { started: number; settled: number; active: number; safetyTimers: number; signals: AbortSignal[] };
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
const pendingState = (): PendingState => ({ started: 0, settled: 0, active: 0, safetyTimers: 0, signals: [] });
async function assertTimeout(operation: () => Promise<unknown>) {
  await assert.rejects(operation, error => {
    assert.equal(error instanceof SafetyFailure, false);
    assert.equal((error as { name?: unknown }).name, 'TimeoutError');
    return true;
  });
}

test('think false sends the explicit thinking flag', async () => {
  fakeEnvironment(); let payload: Record<string, unknown> | undefined;
  await callQwenJSON('system', 'user', { think: false, maxAttempts: 1, fetch: async (_url, init) => { payload = JSON.parse(String(init?.body)); return response(); } });
  assert.equal(payload?.enable_thinking, false);
});

test('timeout attempt receives caller signal and requested ceiling', async () => {
  fakeEnvironment(); const state = pendingState();
  await assertTimeout(() => callQwenJSON('system', 'user', { timeoutMs: 5, maxAttempts: 1, fetch: pendingFetch(state) }));
  assert.equal(state.started, 1); assert.equal(state.settled, 1); assert.equal(state.active, 0); assert.equal(state.safetyTimers, 0);
  assert.equal(state.signals[0].aborted, true); assert.equal(state.signals[0].reason?.name, 'TimeoutError');
});

test('caller abort prevents retry', async () => {
  fakeEnvironment(); const caller = new AbortController(); const state = pendingState(); const expected = new Error('caller stop');
  const operation = callQwenJSON('system', 'user', { signal: caller.signal, maxAttempts: 3, fetch: pendingFetch(state) });
  queueMicrotask(() => caller.abort(expected));
  await assert.rejects(operation, error => { assert.equal(error, expected); return true; });
  assert.equal(state.started, 1); assert.equal(state.settled, 1); assert.equal(state.active, 0); assert.equal(state.safetyTimers, 0); assert.equal(state.signals[0].aborted, true);
});

test('timeouts and omitted options respect transport ceilings', async () => {
  fakeEnvironment(); const limited = pendingState(); let defaulted = 0;
  await assertTimeout(() => callQwenJSON('system', 'user', { timeoutMs: 1, maxAttempts: 2, fetch: pendingFetch(limited) }));
  await assert.rejects(() => callQwenJSON('system', 'user', { fetch: async () => { defaulted++; throw new Error('unavailable'); } }));
  assert.equal(limited.started, 2); assert.equal(limited.settled, 2); assert.equal(limited.active, 0); assert.equal(limited.safetyTimers, 0); assert.ok(limited.signals.every(signal => signal.aborted && signal.reason?.name === 'TimeoutError'));
  assert.equal(defaulted, 3);
});

test('invalid options do not call fetch', async () => {
  fakeEnvironment(); let calls = 0; const fetch = async () => { calls++; return response(); };
  await assert.rejects(() => callQwenJSON('system', 'user', { timeoutMs: 0, fetch }));
  await assert.rejects(() => callQwenJSON('system', 'user', { maxAttempts: 4, fetch }));
  assert.equal(calls, 0);
});

test('chat posts verbatim history, system first, JSON mode and flash without thinking', async () => {
  fakeEnvironment(); delete process.env.QWEN_CHAT_MODEL;
  const history = [{ role: 'user' as const, content: 'first' }, { role: 'assistant' as const, content: 'reply' }, { role: 'user' as const, content: 'second' }];
  let payload: any; let url: unknown;
  const result = await callQwenChatJSON('system', history, { fetch: async (target, init) => {
    url = target; payload = JSON.parse(String(init?.body)); return response();
  } });
  assert.equal(result, '{"ok":true}');
  assert.equal(url, 'https://example.test/chat/completions');
  assert.equal(payload.model, 'qwen3.8-flash');
  assert.deepEqual(payload.messages, [{ role: 'system', content: 'system' }, ...history]);
  assert.deepEqual(payload.response_format, { type: 'json_object' });
  assert.equal(payload.enable_thinking, false);
});

test('chat model env override and explicit options', async () => {
  fakeEnvironment(); process.env.QWEN_CHAT_MODEL = 'test-chat-model';
  const models: unknown[] = []; const flags: unknown[] = [];
  const fetch = async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)); models.push(body.model); flags.push(body.enable_thinking); return response();
  };
  try {
    await callQwenChatJSON('system', [], { fetch });
    await callQwenChatJSON('system', [], { fetch, model: 'explicit-model', think: true });
    assert.deepEqual(models, ['test-chat-model', 'explicit-model']);
    assert.deepEqual(flags, [false, undefined]);
  } finally { delete process.env.QWEN_CHAT_MODEL; }
});

test('chat timeout aborts the request', async () => {
  fakeEnvironment(); const state = pendingState();
  await assertTimeout(() => callQwenChatJSON('system', [], { timeoutMs: 5, maxAttempts: 1, fetch: pendingFetch(state) }));
  assert.equal(state.started, 1); assert.equal(state.settled, 1); assert.equal(state.active, 0);
  assert.equal(state.signals[0].reason?.name, 'TimeoutError');
});

test('chat retries malformed responses then throws on exhausted attempts', async () => {
  fakeEnvironment(); let calls = 0;
  await assert.rejects(() => callQwenChatJSON('system', [], { maxAttempts: 2, fetch: async () => {
    calls++; return new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] }), { status: 200 });
  } }), /No JSON|JSON|balanced/i);
  assert.equal(calls, 2);
});
