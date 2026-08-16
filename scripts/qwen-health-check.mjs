/**
 * Qwen 3.8 Max realistic-payload health probe.
 *
 * Invoked by scripts/cron/qwen-health-check.sh. Sends ONE structured
 * FAQ-style generation request that approximates GEO load — not a
 * trivial "say OK" / max_tokens:5 ping (those pass while real
 * generation hangs; see 2026-08-14 incident).
 *
 * Request shape mirrors callQwenOnce in scripts/geo-generate-content.mjs
 * (model, temperature, response_format, messages, fetch + AbortSignal).
 * Timeout here is the health-check budget (90s), not the 180s GEO abort.
 *
 * Outcomes: OK | SLOW | FAIL. Trouble writes an ALERT log line and
 * exits non-zero. OK is silent to stderr (no daily-green spam).
 */

import fs from 'fs';
import path from 'path';
import { extractJsonSpan } from './lib/json-repair.mjs';

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

function resolveLogPath() {
  if (process.env.QWEN_HEALTH_LOG) return process.env.QWEN_HEALTH_LOG;
  const dir = process.env.WAO_RUNTIME_DATA_DIR || DEFAULT_RUNTIME_DIR;
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

function appendLog(line) {
  const logPath = resolveLogPath();
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${line}\n`, 'utf8');
}

function classify({ httpOk, parseable }) {
  if (!httpOk || !parseable) return 'FAIL';
  return 'SLOW_OR_OK';
}

async function main() {
  const apiKey = process.env.QWEN_API_KEY;
  const baseUrl = process.env.QWEN_BASE_URL;
  if (!apiKey || !baseUrl) {
    console.error(
      'ERROR: QWEN_API_KEY and QWEN_BASE_URL must be set. Aborting.',
    );
    process.exit(1);
  }

  const url = `${baseUrl}/chat/completions`;
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
  let httpOk = false;
  let parseable = false;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    latencyMs = Date.now() - started;
    httpOk = res.ok;

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    requestId = extractRequestId(res, data);

    if (httpOk && data) {
      try {
        const raw = data?.choices?.[0]?.message?.content ?? '';
        JSON.parse(extractJsonSpan(raw));
        parseable = true;
      } catch {
        parseable = false;
      }
    }

    if (classify({ httpOk, parseable }) === 'FAIL') {
      outcome = 'FAIL';
    } else if (latencyMs >= SLOW_THRESHOLD_MS) {
      outcome = 'SLOW';
    } else {
      outcome = 'OK';
    }
  } catch {
    // Timeout, network error, or abort — no request_id to claim.
    latencyMs = Date.now() - started;
    outcome = 'FAIL';
  }

  const latencySec = (latencyMs / 1000).toFixed(3);
  const ts = new Date().toISOString();
  const line = `${ts} outcome=${outcome} latency_s=${latencySec} model=${QWEN_MODEL} request_id=${requestId}`;
  appendLog(line);
  console.log(line);

  if (outcome !== 'OK') {
    const alert = `${ts} ALERT outcome=${outcome} latency_s=${latencySec} model=${QWEN_MODEL} request_id=${requestId}`;
    appendLog(alert);
    console.error(alert);
    process.exit(1);
  }
}

main();
