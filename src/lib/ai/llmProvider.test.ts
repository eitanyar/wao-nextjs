import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LLM_WORKLOADS,
  LLM_WORKLOAD_DEFAULT,
  LLM_WORKLOAD_ENV,
  TokenPlanRefusedError,
  assertTokenPlanAllowed,
  isTokenPlanUrl,
  resetTokenPlanRefusalLog,
  resolveQwenEndpoint,
  selectLlmProvider,
  type LlmEnv,
} from './llmProvider';

const TOKEN_PLAN = 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
const METERED = 'https://metered.example.test/compatible-mode/v1';
const creds: LlmEnv = {
  QWEN_API_KEY: 'tp-key',
  QWEN_BASE_URL: TOKEN_PLAN,
  QWEN_METERED_API_KEY: 'm-key',
  QWEN_METERED_BASE_URL: METERED,
};

test('env table: one switch per workload with the D3 defaults', () => {
  assert.deepEqual(LLM_WORKLOAD_ENV, {
    chat: 'LLM_PROVIDER_CHAT',
    panel_rewrite: 'LLM_PROVIDER_PANEL_REWRITE',
    gbp_reply: 'LLM_PROVIDER_GBP_REPLY',
    geo: 'LLM_PROVIDER_GEO',
    site_copy: 'LLM_PROVIDER_SITE_COPY',
  });
  assert.deepEqual(LLM_WORKLOAD_DEFAULT, {
    chat: 'gemini', panel_rewrite: 'gemini', gbp_reply: 'gemini', geo: 'gemini', site_copy: 'qwen-token-plan',
  });
  for (const workload of LLM_WORKLOADS) {
    const selection = selectLlmProvider(workload, {});
    assert.equal(selection.provider, LLM_WORKLOAD_DEFAULT[workload]);
    assert.equal(selection.explicit, false);
  }
});

test('explicit values are trimmed, case-insensitive and marked explicit', () => {
  assert.deepEqual(selectLlmProvider('chat', { LLM_PROVIDER_CHAT: ' Qwen-Metered ' }),
    { workload: 'chat', provider: 'qwen-metered', explicit: true, envVar: 'LLM_PROVIDER_CHAT' });
  assert.equal(selectLlmProvider('site_copy', { LLM_PROVIDER_SITE_COPY: 'gemini' }).provider, 'gemini');
  assert.equal(selectLlmProvider('site_copy', { LLM_PROVIDER_SITE_COPY: '' }).explicit, false);
});

test('an invalid value is a clear error naming the variable', () => {
  assert.throws(() => selectLlmProvider('geo', { LLM_PROVIDER_GEO: 'openai' }), /LLM_PROVIDER_GEO="openai" is not a valid provider/);
});

test('isTokenPlanUrl checks the host', () => {
  assert.equal(isTokenPlanUrl(TOKEN_PLAN), true);
  assert.equal(isTokenPlanUrl(METERED), false);
  assert.equal(isTokenPlanUrl('https://dashscope-intl.aliyuncs.com/compatible-mode/v1'), false);
  assert.equal(isTokenPlanUrl('not a url token-plan'), true);
});

test('resolveQwenEndpoint picks the credentials of the selected provider', () => {
  assert.equal(resolveQwenEndpoint('chat', creds), null, 'chat defaults to gemini');
  assert.deepEqual(resolveQwenEndpoint('chat', { ...creds, LLM_PROVIDER_CHAT: 'qwen-metered' }),
    { workload: 'chat', provider: 'qwen-metered', apiKey: 'm-key', baseUrl: METERED });
  assert.deepEqual(resolveQwenEndpoint('site_copy', creds),
    { workload: 'site_copy', provider: 'qwen-token-plan', apiKey: 'tp-key', baseUrl: TOKEN_PLAN });
  assert.equal(resolveQwenEndpoint('site_copy', { LLM_PROVIDER_SITE_COPY: 'qwen-metered', QWEN_API_KEY: 'x', QWEN_BASE_URL: TOKEN_PLAN }), null,
    'metered never borrows the token-plan credentials');
  assert.equal(resolveQwenEndpoint('gbp_reply', { LLM_PROVIDER_GBP_REPLY: 'qwen-token-plan', QWEN_API_KEY: 'x' }), null);
});

test('production guard refuses an implicit token-plan call and logs once per workload', () => {
  resetTokenPlanRefusalLog();
  const logged: string[] = [];
  const env = { ...creds, NODE_ENV: 'production' };
  for (let i = 0; i < 2; i++) {
    assert.throws(() => assertTokenPlanAllowed('site_copy', TOKEN_PLAN, env, m => logged.push(m)), (error: unknown) => {
      assert.ok(error instanceof TokenPlanRefusedError);
      assert.equal(error.workload, 'site_copy');
      assert.match(error.message, /LLM_PROVIDER_SITE_COPY=qwen-token-plan to opt in explicitly/);
      return true;
    });
  }
  assert.equal(logged.length, 1);
  assert.throws(() => resolveQwenEndpoint('site_copy', env), TokenPlanRefusedError);
});

test('production guard allows an explicit qwen-token-plan switch', () => {
  resetTokenPlanRefusalLog();
  const env = { ...creds, NODE_ENV: 'production', LLM_PROVIDER_SITE_COPY: 'qwen-token-plan' };
  assert.doesNotThrow(() => assertTokenPlanAllowed('site_copy', TOKEN_PLAN, env, () => assert.fail('must not log')));
  assert.equal(resolveQwenEndpoint('site_copy', env)?.baseUrl, TOKEN_PLAN);
});

test('production guard refuses a metered switch whose base URL is really the token plan', () => {
  resetTokenPlanRefusalLog();
  const env = { NODE_ENV: 'production', LLM_PROVIDER_CHAT: 'qwen-metered', QWEN_METERED_API_KEY: 'k', QWEN_METERED_BASE_URL: TOKEN_PLAN };
  assert.throws(() => resolveQwenEndpoint('chat', env), TokenPlanRefusedError);
});

test('guard is inert outside production and for non-token-plan hosts', () => {
  resetTokenPlanRefusalLog();
  const fail = () => assert.fail('must not log');
  assert.doesNotThrow(() => assertTokenPlanAllowed('site_copy', TOKEN_PLAN, { NODE_ENV: 'development' }, fail));
  assert.doesNotThrow(() => assertTokenPlanAllowed('site_copy', TOKEN_PLAN, {}, fail));
  assert.doesNotThrow(() => assertTokenPlanAllowed('chat', METERED, { NODE_ENV: 'production' }, fail));
});
