/* eslint-disable @typescript-eslint/no-explicit-any -- fixtures inspect arbitrary request JSON bodies */
import test from 'node:test';
import assert from 'node:assert/strict';

import type { GoogleAdsOperatorTask } from '../google-ads/operator';
import { translateTaskToHebrew } from './hebrew-rewriter';
import { resetTokenPlanRefusalLog } from '../ai/llmProvider';

const TOKEN_PLAN = 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
const KEYS = ['NODE_ENV', 'GEMINI_API_KEY', 'QWEN_API_KEY', 'QWEN_BASE_URL', 'QWEN_METERED_API_KEY', 'QWEN_METERED_BASE_URL', 'LLM_PROVIDER_PANEL_REWRITE'];
let taskCounter = 0;

function task(): GoogleAdsOperatorTask {
  taskCounter += 1;
  return { taskId: `t-${taskCounter}`, title: 'orig title', whyNeeded: 'orig why', recommendedAction: 'orig action', kind: 'general_review', risk: 'low' } as unknown as GoogleAdsOperatorTask;
}

type Call = { url: string; body: any };
function run(values: Record<string, string>, body: (calls: Call[]) => Promise<void>) {
  return async () => {
    const env = process.env as Record<string, string | undefined>;
    const saved = Object.fromEntries(KEYS.map(key => [key, env[key]]));
    const savedFetch = globalThis.fetch;
    for (const key of KEYS) delete env[key];
    Object.assign(env, { GEMINI_API_KEY: 'g-key', QWEN_API_KEY: 'tp-key', QWEN_BASE_URL: TOKEN_PLAN, ...values });
    resetTokenPlanRefusalLog();
    const calls: Call[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const target = String(url);
      calls.push({ url: target, body: JSON.parse(String(init?.body)) });
      const translated = '{"title":"T","whyNeeded":"W","recommendedAction":"A"}';
      if (target.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: translated }] } }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: translated } }] }), { status: 200 });
    }) as typeof globalThis.fetch;
    try { await body(calls); } finally {
      globalThis.fetch = savedFetch;
      for (const key of KEYS) { if (saved[key] === undefined) delete env[key]; else env[key] = saved[key]; }
    }
  };
}

test('panel rewrite defaults to Gemini even when token-plan credentials are present', run({}, async calls => {
  const out = await translateTaskToHebrew(task());
  assert.equal(out.title, 'T');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /generativelanguage\.googleapis\.com/);
}));

test('LLM_PROVIDER_PANEL_REWRITE=qwen-metered keeps the Qwen request and model on the metered endpoint', run({
  LLM_PROVIDER_PANEL_REWRITE: 'qwen-metered', QWEN_METERED_API_KEY: 'm-key', QWEN_METERED_BASE_URL: 'https://metered.example.test/v1',
}, async calls => {
  const out = await translateTaskToHebrew(task(), { model: 'qwen3.7-plus' });
  assert.equal(out.whyNeeded, 'W');
  assert.equal(calls[0].url, 'https://metered.example.test/v1/chat/completions');
  assert.equal(calls[0].body.model, 'qwen3.7-plus');
  assert.deepEqual(calls[0].body.response_format, { type: 'json_object' });
}));

test('production refuses a non-explicit token-plan URL and fails open to the original task', run({
  NODE_ENV: 'production', LLM_PROVIDER_PANEL_REWRITE: 'qwen-metered', QWEN_METERED_API_KEY: 'm-key', QWEN_METERED_BASE_URL: TOKEN_PLAN,
}, async calls => {
  const original = task();
  const out = await translateTaskToHebrew(original);
  assert.equal(out, original);
  assert.equal(calls.length, 0);
}));

test('missing credentials for the selected Qwen provider skips translation without a call', run({ LLM_PROVIDER_PANEL_REWRITE: 'qwen-metered' }, async calls => {
  const original = task();
  assert.equal(await translateTaskToHebrew(original), original);
  assert.equal(calls.length, 0);
}));
