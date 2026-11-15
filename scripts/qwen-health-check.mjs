/**
 * Qwen realistic-payload health probe for the Qwen providers production actually uses.
 *
 * Invoked by scripts/cron/qwen-health-check.sh. Since D3 (2026-11-15) Qwen is not a production
 * dependency by default: the probe reads the per-workload switches (scripts/lib/llm-provider.mjs,
 * LLM_PROVIDER_*). Workloads on gemini are not probed. When no workload selects a Qwen provider it
 * logs one `outcome=SKIPPED` line and exits 0. Otherwise it sends ONE structured FAQ-style
 * generation request per distinct Qwen endpoint in use (not a trivial "say OK" ping; those pass
 * while real generation hangs, see the 2026-08-14 incident).
 *
 * A workload that selects Qwen but has no credentials (UNCONFIGURED), or whose endpoint the
 * production token-plan guard refuses (REFUSED), is an ALERT: that workload will fail at runtime.
 *
 * Outcomes per endpoint: OK | SLOW | FAIL. Trouble writes an ALERT log line and exits non-zero.
 * OK / SKIPPED are silent to stderr (no daily-green spam).
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { extractJsonSpan } from './lib/json-repair.mjs';
import { LLM_WORKLOADS, TokenPlanRefusedError, resolveQwenEndpoint, selectLlmProvider } from './lib/llm-provider.mjs';

const QWEN_MODEL = 'qwen3.8-max';

// Tune these in one place — do not scatter timeout / slowness numbers.
const CLIENT_TIMEOUT_MS = 90_000;
const SLOW_THRESHOLD_MS = 30_000;

const DEFAULT_RUNTIME_DIR = '/home/wao/wao-runtime-data';
const DEFAULT_LOG_NAME = 'qwen-health.log';

const SYSTEM_PROMPT = [
  'You are a Hebrew content writer for a local service business.',
  'Reply with a JSON object only. Write every string value in Hebrew.',
  'Do not wrap the JSON in markdown.',
].join(' ');

const USER_PROMPT = [
  'Generate a short 2-question FAQ as JSON with this exact shape:',
  '{"faq":[{"q":"...","a":"..."},{"q":"...","a":"..."}]}',
  'Topic: two common questions a customer asks before booking a local service.',
  'Each answer must be 1-2 short sentences.',
].join(' ');

function resolveLogPath(env) {
  if (env.QWEN_HEALTH_LOG) return env.QWEN_HEALTH_LOG;
  const dir = env.WAO_RUNTIME_DATA_DIR || DEFAULT_RUNTIME_DIR;
  return path.join(dir, DEFAULT_LOG_NAME);
}

function extractRequestId(res, data) {
  const header =
    res?.headers?.get('x-request-id') ||
    res?.headers?.get('x-dashscope-request-id') ||
    res?.headers?.get('request-id');
  const body = data?.request_id;
  // OpenAI-compatible `id` is a last resort — DashScope refund claims
  // want the DashScope request_id, not chatcmpl-*.
  return header || body || data?.id || 'none';
}

/**
 * Which Qwen endpoints the configured workloads use. Never calls the network.
 * Returns { probes: [{ provider, baseUrl, apiKey, workloads }], problems: [{ workload, provider, outcome }] }.
 */
export function planQwenProbes(env = process.env) {
  const probes = new Map();
  const problems = [];
  for (const workload of LLM_WORKLOADS) {
    const { provider } = selectLlmProvider(workload, env);
    if (provider === 'gemini') continue;
    let endpoint;
    try {
      endpoint = resolveQwenEndpoint(workload, env);
    } catch (err) {
      if (err instanceof TokenPlanRefusedError) {
        problems.push({ workload, provider, outcome: 'REFUSED' });
        continue;
      }
      throw err;
    }
    if (!endpoint) {
      problems.push({ workload, provider, outcome: 'UNCONFIGURED' });
      continue;
    }
    const key = `${endpoint.provider} ${endpoint.baseUrl}`;
    if (!probes.has(key)) probes.set(key, { provider: endpoint.provider, baseUrl: endpoint.baseUrl, apiKey: endpoint.apiKey, workloads: [] });
    probes.get(key).workloads.push(workload);
  }
  return { probes: [...probes.values()], problems };
}

async function probeEndpoint(probe, fetchImpl) {
  const payload = {
    model: QWEN_MODEL,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT },
    ],
  };

  const started = Date.now();
  let outcome = 'FAIL';
  let requestId = 'none';
  let latencyMs = 0;

  try {
    const res = await fetchImpl(`${probe.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${probe.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    latencyMs = Date.now() - started;

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    requestId = extractRequestId(res, data);

    let parseable = false;
    if (res.ok && data) {
      try {
        JSON.parse(extractJsonSpan(data?.choices?.[0]?.message?.content ?? ''));
        parseable = true;
      } catch {
        parseable = false;
      }
    }

    if (!res.ok || !parseable) outcome = 'FAIL';
    else if (latencyMs >= SLOW_THRESHOLD_MS) outcome = 'SLOW';
    else outcome = 'OK';
  } catch {
    // Timeout, network error, or abort — no request_id to claim.
    latencyMs = Date.now() - started;
    outcome = 'FAIL';
  }
  return { outcome, latencyMs, requestId };
}

/** Runs the plan; returns the process exit code. All I/O is injectable for tests. */
export async function runHealthCheck({
  env = process.env,
  fetchImpl = globalThis.fetch,
  appendLog = line => {
    const logPath = resolveLogPath(env);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${line}\n`, 'utf8');
  },
  out = line => console.log(line),
  err = line => console.error(line),
  now = () => new Date().toISOString(),
} = {}) {
  const { probes, problems } = planQwenProbes(env);
  let exitCode = 0;

  if (probes.length === 0 && problems.length === 0) {
    const line = `${now()} outcome=SKIPPED reason=no-qwen-workload (all LLM_PROVIDER_* resolve to gemini)`;
    appendLog(line);
    out(line);
    return 0;
  }

  for (const problem of problems) {
    const alert = `${now()} ALERT outcome=${problem.outcome} workload=${problem.workload} provider=${problem.provider}`;
    appendLog(alert);
    err(alert);
    exitCode = 1;
  }

  for (const probe of probes) {
    const { outcome, latencyMs, requestId } = await probeEndpoint(probe, fetchImpl);
    const latencySec = (latencyMs / 1000).toFixed(3);
    const fields = `outcome=${outcome} latency_s=${latencySec} model=${QWEN_MODEL} provider=${probe.provider} workloads=${probe.workloads.join(',')} request_id=${requestId}`;
    const ts = now();
    appendLog(`${ts} ${fields}`);
    out(`${ts} ${fields}`);
    if (outcome !== 'OK') {
      const alert = `${ts} ALERT ${fields}`;
      appendLog(alert);
      err(alert);
      exitCode = 1;
    }
  }
  return exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runHealthCheck().then(code => process.exit(code), error => {
    console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
