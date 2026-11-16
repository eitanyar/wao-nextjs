/* eslint-disable @typescript-eslint/no-explicit-any -- fixtures inspect arbitrary request JSON bodies */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createGbpReplyDrafter } from './reviewResponder';
import { resetTokenPlanRefusalLog } from '../ai/llmProvider';

// Provider selection for the GBP reply drafter (LLM_PROVIDER_GBP_REPLY). Injected fetch only — no
// network, no fs writes.

const TOKEN_PLAN = 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
const KEYS = ['NODE_ENV', 'GEMINI_API_KEY', 'QWEN_API_KEY', 'QWEN_BASE_URL', 'QWEN_METERED_API_KEY', 'QWEN_METERED_BASE_URL', 'LLM_PROVIDER_GBP_REPLY'];
const FEWSHOT = [{ review: 'review-1', reply: 'reply-1' }];
const CONTEXT = { businessName: 'Biz', businessNiche: 'plumbing' };

type Call = { url: string; body: any };
function run(values: Record<string, string>, body: (calls: Call[], fetch: typeof globalThis.fetch) => Promise<void>) {
  return async () => {
    const env = process.env as Record<string, string | undefined>;
    const saved = Object.fromEntries(KEYS.map(key => [key, env[key]]));
    for (const key of KEYS) delete env[key];
    Object.assign(env, { GEMINI_API_KEY: 'g-key', QWEN_API_KEY: 'tp-key', QWEN_BASE_URL: TOKEN_PLAN, ...values });
    resetTokenPlanRefusalLog();
    const calls: Call[] = [];
    const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const target = String(url);
      calls.push({ url: target, body: JSON.parse(String(init?.body)) });
      if (target.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '  gemini reply  ' }] } }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: ' qwen reply ' } }] }), { status: 200 });
    }) as typeof globalThis.fetch;
    try { await body(calls, fetch); } finally {
      for (const key of KEYS) { if (saved[key] === undefined) delete env[key]; else env[key] = saved[key]; }
    }
  };
}

test('GBP replies default to Gemini with the same system prompt, few-shot turns and review', run({}, async (calls, fetch) => {
  const reply = await createGbpReplyDrafter({ fetch })('SYSTEM', FEWSHOT, 'the review', CONTEXT);
  assert.equal(reply, 'gemini reply');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /generativelanguage\.googleapis\.com/);
  const body = calls[0].body;
  assert.equal(body.systemInstruction.parts[0].text, 'SYSTEM\n\nbusinessName: Biz\nbusinessNiche: plumbing');
  assert.deepEqual(body.contents.map((c: any) => [c.role, c.parts[0].text]),
    [['user', 'review-1'], ['model', 'reply-1'], ['user', 'the review']]);
  assert.equal(body.generationConfig.responseMimeType, undefined, 'plain-text reply, not JSON');
  assert.equal(body.generationConfig.temperature, 0.7);
}));

test('LLM_PROVIDER_GBP_REPLY=qwen-metered sends the original qwen3.8-max request to the metered endpoint', run({
  LLM_PROVIDER_GBP_REPLY: 'qwen-metered', QWEN_METERED_API_KEY: 'm-key', QWEN_METERED_BASE_URL: 'https://metered.example.test/v1',
}, async (calls, fetch) => {
  const reply = await createGbpReplyDrafter({ fetch })('SYSTEM', FEWSHOT, 'the review', CONTEXT);
  assert.equal(reply, 'qwen reply');
  assert.equal(calls[0].url, 'https://metered.example.test/v1/chat/completions');
  assert.equal(calls[0].body.model, 'qwen3.8-max');
  assert.deepEqual(calls[0].body.messages.map((m: any) => m.role), ['system', 'user', 'assistant', 'user']);
}));

test('production refuses an implicit token-plan GBP call before any request', run({
  NODE_ENV: 'production', LLM_PROVIDER_GBP_REPLY: 'qwen-metered', QWEN_METERED_API_KEY: 'm-key', QWEN_METERED_BASE_URL: TOKEN_PLAN,
}, async (calls, fetch) => {
  await assert.rejects(() => createGbpReplyDrafter({ fetch })('SYSTEM', FEWSHOT, 'r', CONTEXT), { name: 'TokenPlanRefusedError' });
  assert.equal(calls.length, 0);
}));

test('production: an explicit qwen-token-plan switch is served by Gemini, never the token plan', run({ NODE_ENV: 'production', LLM_PROVIDER_GBP_REPLY: 'qwen-token-plan' }, async (calls, fetch) => {
  await createGbpReplyDrafter({ fetch })('SYSTEM', FEWSHOT, 'r', CONTEXT);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /generativelanguage\.googleapis\.com/);
  assert.ok(!calls.some(call => call.url.includes('token-plan')));
}));
