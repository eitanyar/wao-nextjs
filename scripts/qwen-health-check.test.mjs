import test from 'node:test';
import assert from 'node:assert/strict';

import { planQwenProbes, runHealthCheck } from './qwen-health-check.mjs';

const TOKEN_PLAN = 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
const METERED = 'https://metered.example.test/v1';

function harness(env, fetchImpl = async () => { throw new Error('no network in tests'); }) {
  const log = []; const out = []; const err = []; const fetched = [];
  const run = () => runHealthCheck({
    env,
    fetchImpl: async (url, init) => { fetched.push(String(url)); return fetchImpl(url, init); },
    appendLog: line => log.push(line), out: line => out.push(line), err: line => err.push(line), now: () => 'T',
  });
  return { run, log, out, err, fetched };
}

const okResponse = () => new Response(JSON.stringify({ choices: [{ message: { content: '{"faq":[]}' } }] }), { status: 200, headers: { 'x-request-id': 'rid-1' } });

test('no Qwen workload configured: one SKIPPED line, exit 0, no network', async () => {
  const h = harness({ LLM_PROVIDER_SITE_COPY: 'gemini', QWEN_API_KEY: 'tp', QWEN_BASE_URL: TOKEN_PLAN });
  assert.equal(await h.run(), 0);
  assert.equal(h.fetched.length, 0);
  assert.equal(h.log.length, 1);
  assert.match(h.log[0], /outcome=SKIPPED reason=no-qwen-workload/);
  assert.equal(h.err.length, 0);
});

test('default site_copy in production without an explicit opt-in is a REFUSED alert, never a call', async () => {
  const h = harness({ NODE_ENV: 'production', QWEN_API_KEY: 'tp', QWEN_BASE_URL: TOKEN_PLAN });
  assert.equal(await h.run(), 1);
  assert.equal(h.fetched.length, 0);
  assert.deepEqual(h.err, ['T ALERT outcome=REFUSED workload=site_copy provider=qwen-token-plan']);
});

test('a Qwen workload with no credentials is an UNCONFIGURED alert', async () => {
  const h = harness({ LLM_PROVIDER_SITE_COPY: 'gemini', LLM_PROVIDER_GEO: 'qwen-metered' });
  assert.equal(await h.run(), 1);
  assert.deepEqual(h.err, ['T ALERT outcome=UNCONFIGURED workload=geo provider=qwen-metered']);
});

test('probes each distinct endpoint once and lists the workloads it covers', async () => {
  const env = {
    LLM_PROVIDER_CHAT: 'qwen-metered', LLM_PROVIDER_GEO: 'qwen-metered', LLM_PROVIDER_SITE_COPY: 'qwen-token-plan',
    QWEN_METERED_API_KEY: 'm', QWEN_METERED_BASE_URL: METERED, QWEN_API_KEY: 'tp', QWEN_BASE_URL: TOKEN_PLAN, NODE_ENV: 'production',
  };
  const plan = planQwenProbes(env);
  assert.deepEqual(plan.problems, []);
  assert.deepEqual(plan.probes.map(p => [p.provider, p.workloads]), [['qwen-metered', ['chat', 'geo']], ['qwen-token-plan', ['site_copy']]]);
  const h = harness(env, async () => okResponse());
  assert.equal(await h.run(), 0);
  assert.deepEqual(h.fetched, [`${METERED}/chat/completions`, `${TOKEN_PLAN}/chat/completions`]);
  assert.match(h.out[0], /outcome=OK .*provider=qwen-metered workloads=chat,geo request_id=rid-1/);
});

test('a failing endpoint is an ALERT and exits non-zero', async () => {
  const h = harness({ QWEN_API_KEY: 'tp', QWEN_BASE_URL: TOKEN_PLAN }, async () => new Response('{}', { status: 500 }));
  assert.equal(await h.run(), 1);
  assert.match(h.err[0], /ALERT outcome=FAIL .*workloads=site_copy/);
});
