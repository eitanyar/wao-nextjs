/**
 * LLM usage ledger: one JSONL line per model call, under the runtime data root
 * (the dataRoots 'llmUsage' root = WAO_LLM_USAGE_DIR or <cwd>/data/llm-usage), file YYYY-MM.jsonl (UTC month).
 * Never under data/clients/. scripts/lib/llm-usage.mjs mirrors this for the .mjs scripts and
 * scripts/llm-usage-report.mjs prices it.
 *
 * Contract: recording NEVER throws into the caller (every failure is swallowed, one console
 * warning per process). Under `node --test` it is off unless WAO_LLM_USAGE_DIR is set, so test
 * runs never write to the real ledger. WAO_LLM_USAGE_DISABLED=1 turns it off anywhere.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import fs from 'fs';
import path from 'path';
import { dataRoot } from '../dataRoots';

export type LlmUsageEntry = {
  ts: string;
  workload: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens?: number;
  thinkingTokens?: number;
  clientId?: string;
  slug?: string;
};

/** What a caller may know about the call beyond the API response. */
export type LlmUsageTag = { workload?: string; clientId?: string; slug?: string };

export type LlmUsageInput = Omit<LlmUsageEntry, 'ts'> & { ts?: string };

let warned = false;

function warnOnce(error: unknown): void {
  if (warned) return;
  warned = true;
  try { console.warn('[llmUsage] could not record usage (further failures are silent):', error instanceof Error ? error.message : String(error)); } catch { /* never throw */ }
}

/** Test-only: allow the one-time warning again. */
export function resetLlmUsageWarning(): void {
  warned = false;
}

function enabled(env: NodeJS.ProcessEnv): boolean {
  if (env.WAO_LLM_USAGE_DISABLED === '1') return false;
  if (env.NODE_TEST_CONTEXT && !(env.WAO_LLM_USAGE_DIR ?? '').trim()) return false;
  return true;
}

const count = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined);
const label = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : undefined);

/** The ledger line for an input (normalised: counts are non-negative integers, optional fields only when known). */
export function usageLine(input: LlmUsageInput, now: Date = new Date()): LlmUsageEntry {
  const entry: LlmUsageEntry = {
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

/** Ledger file of a timestamp: <root>/YYYY-MM.jsonl (UTC month). */
export function usageFileFor(ts: string, dir: string = dataRoot('llmUsage').dir): string {
  const month = /^\d{4}-\d{2}/.exec(ts)?.[0] ?? new Date().toISOString().slice(0, 7);
  return path.join(dir, `${month}.jsonl`);
}

/** Appends one line. Never throws; returns true when a line was written. */
export function recordLlmUsage(input: LlmUsageInput, env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    if (!enabled(env)) return false;
    const entry = usageLine(input);
    const file = usageFileFor(entry.ts);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf8');
    return true;
  } catch (error) {
    warnOnce(error);
    return false;
  }
}

/** Gemini `usageMetadata` -> token counts (candidates exclude thoughts; prompt includes the cached part). */
export function geminiUsageCounts(data: unknown): Pick<LlmUsageEntry, 'inputTokens' | 'outputTokens' | 'cachedTokens' | 'thinkingTokens'> {
  const meta = data && typeof data === 'object' ? (data as { usageMetadata?: Record<string, unknown> }).usageMetadata : undefined;
  const out: Pick<LlmUsageEntry, 'inputTokens' | 'outputTokens' | 'cachedTokens' | 'thinkingTokens'> = {
    inputTokens: count(meta?.promptTokenCount) ?? null,
    outputTokens: count(meta?.candidatesTokenCount) ?? null,
  };
  const cached = count(meta?.cachedContentTokenCount);
  const thinking = count(meta?.thoughtsTokenCount);
  if (cached !== undefined) out.cachedTokens = cached;
  if (thinking !== undefined) out.thinkingTokens = thinking;
  return out;
}

/** OpenAI-compatible `usage` (Qwen / DashScope) -> token counts. */
export function openAiUsageCounts(data: unknown): Pick<LlmUsageEntry, 'inputTokens' | 'outputTokens' | 'cachedTokens' | 'thinkingTokens'> {
  type OpenAiUsage = { prompt_tokens?: unknown; completion_tokens?: unknown; prompt_tokens_details?: { cached_tokens?: unknown }; completion_tokens_details?: { reasoning_tokens?: unknown } };
  const usage = data && typeof data === 'object' ? (data as { usage?: OpenAiUsage }).usage : undefined;
  const out: Pick<LlmUsageEntry, 'inputTokens' | 'outputTokens' | 'cachedTokens' | 'thinkingTokens'> = {
    inputTokens: count(usage?.prompt_tokens) ?? null,
    outputTokens: count(usage?.completion_tokens) ?? null,
  };
  const cached = count(usage?.prompt_tokens_details?.cached_tokens);
  const thinking = count(usage?.completion_tokens_details?.reasoning_tokens);
  if (cached !== undefined) out.cachedTokens = cached;
  if (thinking !== undefined) out.thinkingTokens = thinking;
  return out;
}

/** Records one Gemini response. Never throws. */
export function recordGeminiUsage(data: unknown, model: string, tag: LlmUsageTag = {}, env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    return recordLlmUsage({ workload: tag.workload ?? 'unspecified', provider: 'gemini', model, ...geminiUsageCounts(data), clientId: tag.clientId, slug: tag.slug }, env);
  } catch (error) {
    warnOnce(error);
    return false;
  }
}
