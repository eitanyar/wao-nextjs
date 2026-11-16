/**
 * .mjs mirror of src/lib/ai/llmUsage.ts for scripts and crons (plain Node cannot import the TS
 * module). Same line shape, same file layout (<dir>/YYYY-MM.jsonl), same never-throw contract.
 * Directory: WAO_LLM_USAGE_DIR, else <cwd>/data/llm-usage (the app's dataRoot('llmUsage') default).
 * On the server, set WAO_LLM_USAGE_DIR=/home/wao/wao-runtime-data/llm-usage in .env.production so
 * crons (run from the checkout) and the app (run from the release) share one ledger.
 * scripts/llm-usage.parity.test.mjs keeps the two in lockstep.
 */
import fs from 'node:fs';
import path from 'node:path';

let warned = false;

function warnOnce(error) {
  if (warned) return;
  warned = true;
  try { console.warn('[llmUsage] could not record usage (further failures are silent):', error instanceof Error ? error.message : String(error)); } catch { /* never throw */ }
}

export function resetLlmUsageWarning() {
  warned = false;
}

export function llmUsageDir(env = process.env) {
  const raw = typeof env.WAO_LLM_USAGE_DIR === 'string' ? env.WAO_LLM_USAGE_DIR.trim() : '';
  return raw ? path.resolve(raw) : path.join(process.cwd(), 'data', 'llm-usage');
}

function enabled(env) {
  if (env.WAO_LLM_USAGE_DISABLED === '1') return false;
  if (env.NODE_TEST_CONTEXT && !String(env.WAO_LLM_USAGE_DIR ?? '').trim()) return false;
  return true;
}

const count = value => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined);
const label = value => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : undefined);

export function usageLine(input, now = new Date()) {
  const entry = {
    ts: label(input.ts) ?? now.toISOString(),
    workload: label(input.workload) ?? 'unspecified',
    provider: label(input.provider) ?? 'unknown',
    model: label(input.model) ?? 'unknown',
    inputTokens: count(input.inputTokens) ?? null,
    outputTokens: count(input.outputTokens) ?? null,
  };
  const cached = count(input.cachedTokens);
  const thinking = count(input.thinkingTokens);
  const clientId = label(input.clientId);
  const slug = label(input.slug);
  if (cached !== undefined) entry.cachedTokens = cached;
  if (thinking !== undefined) entry.thinkingTokens = thinking;
  if (clientId !== undefined) entry.clientId = clientId;
  if (slug !== undefined) entry.slug = slug;
  return entry;
}

export function usageFileFor(ts, dir = llmUsageDir()) {
  const month = /^\d{4}-\d{2}/.exec(ts)?.[0] ?? new Date().toISOString().slice(0, 7);
  return path.join(dir, `${month}.jsonl`);
}

export function recordLlmUsage(input, env = process.env) {
  try {
    if (!enabled(env)) return false;
    const entry = usageLine(input);
    const file = usageFileFor(entry.ts, llmUsageDir(env));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf8');
    return true;
  } catch (error) {
    warnOnce(error);
    return false;
  }
}

export function geminiUsageCounts(data) {
  const meta = data && typeof data === 'object' ? data.usageMetadata : undefined;
  const out = {
    inputTokens: count(meta?.promptTokenCount) ?? null,
    outputTokens: count(meta?.candidatesTokenCount) ?? null,
  };
  const cached = count(meta?.cachedContentTokenCount);
  const thinking = count(meta?.thoughtsTokenCount);
  if (cached !== undefined) out.cachedTokens = cached;
  if (thinking !== undefined) out.thinkingTokens = thinking;
  return out;
}

export function recordGeminiUsage(data, model, tag = {}, env = process.env) {
  try {
    return recordLlmUsage({ workload: tag.workload ?? 'unspecified', provider: 'gemini', model, ...geminiUsageCounts(data), clientId: tag.clientId, slug: tag.slug }, env);
  } catch (error) {
    warnOnce(error);
    return false;
  }
}
