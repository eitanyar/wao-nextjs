/* eslint-disable @typescript-eslint/no-explicit-any -- fixtures inspect arbitrary request JSON bodies */
import test from 'node:test';
import assert from 'node:assert/strict';

import { callSiteCopyJSON, callWorkloadJSON } from './workloadJson';
import { resetTokenPlanRefusalLog } from './llmProvider';

const TOKEN_PLAN = 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
const KEYS = ['NODE_ENV', 'GEMINI_API_KEY', 'GEMINI_MODEL_NAME', 'QWEN_API_KEY', 'QWEN_BASE_URL', 'QWEN_METERED_API_KEY',
  'QWEN_METERED_BASE_URL', 'LLM_PROVIDER_GEO', 'LLM_PROVIDER_SITE_COPY'];

function withEnv(values: Record<string, string>, run: () => Promise<void>): () => Promise<void> {
  return async () => {
    const env = process.env as Record<string, string | undefined>;
    const saved = Object.fromEntries(KEYS.map(key => [key, env[key]]));
    for (const key of KEYS) delete env[key];
    Object.assign(env, { GEMINI_API_KEY: 'g-key', QWEN_API_KEY: 'tp-key', QWEN_BASE_URL: TOKEN_PLAN, ...values });
    resetTokenPlanRefusalLog();
    try { await run(); } finally {
      for (const key of KEYS) { if (saved[key] === undefined) delete env[key]; else env[key] = saved[key]; }
    }
  };
}

type Call = { url: string; body: any };
function recorder(calls: Call[]) {
  return async (url: string | URL | Request, init?: RequestInit) => {
    const target = String(url);
    calls.push({ url: target, body: JSON.parse(String(init?.body)) });
    if (target.includes('generativelanguage.googleapis.com')) {
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"via":"gemini"}' }] } }] }), { status: 200 });
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"via":"qwen"}' } }] }), { status: 200 });
  };
}

test('geo defaults to Gemini; the Qwen model name is not sent to Gemini', withEnv({}, async () => {
  const calls: Call[] = [];
  const out = await callWorkloadJSON('geo', 'sys', 'user', { model: 'qwen3.7-plus', fetch: recorder(calls) });
  assert.equal(out, '{"via":"gemini"}');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.8-flash:generateContent$/);
  assert.equal(calls[0].body.generationConfig.thinkingConfig.thinkingLevel, 'HIGH');
}));

test('think:false maps to Gemini LOW thinking', withEnv({}, async () => {
  const calls: Call[] = [];
  await callWorkloadJSON('geo', 'sys', 'user', { think: false, fetch: recorder(calls) });
  assert.equal(calls[0].body.generationConfig.thinkingConfig.thinkingLevel, 'LOW');
}));

test('LLM_PROVIDER_GEO=qwen-metered sends the unchanged Qwen request to the metered endpoint', withEnv({
  LLM_PROVIDER_GEO: 'qwen-metered', QWEN_METERED_API_KEY: 'm-key', QWEN_METERED_BASE_URL: 'https://metered.example.test/v1',
}, async () => {
  const calls: Call[] = [];
  const out = await callWorkloadJSON('geo', 'sys', 'user', { model: 'qwen3.7-plus', maxAttempts: 1, fetch: recorder(calls) });
  assert.equal(out, '{"via":"qwen"}');
  assert.equal(calls[0].url, 'https://metered.example.test/v1/chat/completions');
  assert.equal(calls[0].body.model, 'qwen3.7-plus');
}));

test('site copy keeps today\'s token-plan Qwen behaviour by default (non-production)', withEnv({}, async () => {
  const calls: Call[] = [];
  const out = await callSiteCopyJSON('sys', 'user', { thinkingBudget: 1500, maxAttempts: 1, fetch: recorder(calls) });
  assert.equal(out, '{"via":"qwen"}');
  assert.equal(calls[0].url, `${TOKEN_PLAN}/chat/completions`);
  assert.equal(calls[0].body.model, 'qwen3.8-max');
  assert.equal(calls[0].body.thinking_budget, 1500);
}));

test('site copy moves to Gemini with one env line', withEnv({ LLM_PROVIDER_SITE_COPY: 'gemini' }, async () => {
  const calls: Call[] = [];
  assert.equal(await callSiteCopyJSON('sys', 'user', { fetch: recorder(calls) }), '{"via":"gemini"}');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /generativelanguage\.googleapis\.com/);
}));

test('production refuses the default (implicit) site-copy token plan without calling fetch', withEnv({ NODE_ENV: 'production' }, async () => {
  const calls: Call[] = [];
  await assert.rejects(() => callSiteCopyJSON('sys', 'user', { fetch: recorder(calls) }), { name: 'TokenPlanRefusedError' });
  assert.equal(calls.length, 0);
}));

test('production allows the token plan once LLM_PROVIDER_SITE_COPY=qwen-token-plan', withEnv({ NODE_ENV: 'production', LLM_PROVIDER_SITE_COPY: 'qwen-token-plan' }, async () => {
  const calls: Call[] = [];
  assert.equal(await callSiteCopyJSON('sys', 'user', { maxAttempts: 1, fetch: recorder(calls) }), '{"via":"qwen"}');
  assert.equal(calls[0].url, `${TOKEN_PLAN}/chat/completions`);
}));

test('Gemini path retries unparseable output up to maxAttempts', withEnv({}, async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"broken":' }] } }] }), { status: 200 });
  };
  await assert.rejects(() => callWorkloadJSON('geo', 'sys', 'user', { maxAttempts: 2, fetch }));
  assert.equal(calls, 2);
}));

test('Gemini path fails fast when GEMINI_API_KEY is missing', withEnv({ GEMINI_API_KEY: '' }, async () => {
  let calls = 0;
  await assert.rejects(() => callWorkloadJSON('geo', 'sys', 'user', { fetch: async () => { calls++; return new Response('{}'); } }), /Gemini not configured/);
  assert.equal(calls, 0);
}));
