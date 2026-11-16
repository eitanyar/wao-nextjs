// Workload-aware JSON caller: routes one system+user JSON request to the provider selected by the
// workload's env switch (src/lib/ai/llmProvider.ts). Qwen providers keep the exact qwen-fast
// request; Gemini gets the same retry-until-parseable contract via callGeminiJSON.

import { callGeminiJSON } from './gemini-fast';
import { callQwenJSON, type CallQwenJSONOptions } from './qwen-fast';
import { selectLlmProvider, type LlmWorkload } from './llmProvider';

const GEMINI_DEFAULT_TIMEOUT_MS = 180_000;
const GEMINI_DEFAULT_MAX_ATTEMPTS = 3;

export type WorkloadJsonOptions = Omit<CallQwenJSONOptions, 'workload'>;

/**
 * Gemini path notes: `model` is a Qwen model name and is ignored (GEMINI_MODEL_NAME or the
 * gemini-fast default applies); `think: false` maps to thinkingLevel LOW, anything else to HIGH
 * (Qwen reasons by default on these batch calls); `thinkingBudget` and `onUsage` are Qwen-only.
 */
export async function callWorkloadJSON(
  workload: LlmWorkload,
  systemPrompt: string,
  userMessage: string,
  opts: WorkloadJsonOptions = {},
): Promise<string> {
  const { provider } = selectLlmProvider(workload);
  if (provider !== 'gemini') return callQwenJSON(systemPrompt, userMessage, { ...opts, workload });

  const maxAttempts = opts.maxAttempts ?? GEMINI_DEFAULT_MAX_ATTEMPTS;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > GEMINI_DEFAULT_MAX_ATTEMPTS) throw new Error('Invalid Gemini attempt count');
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (opts.signal?.aborted) throw opts.signal.reason ?? new Error('Gemini request aborted');
    try {
      const span = await callGeminiJSON(systemPrompt, userMessage, {
        thinkingLevel: opts.think === false ? 'LOW' : 'HIGH',
        timeoutMs: opts.timeoutMs ?? GEMINI_DEFAULT_TIMEOUT_MS,
        ...(opts.signal ? { signal: opts.signal } : {}),
        ...(opts.fetch ? { fetch: opts.fetch } : {}),
        usage: { workload, ...opts.usage },
      });
      JSON.parse(span); // validate — retry if unparseable, same contract as qwen-fast
      return span;
    } catch (err) {
      lastErr = err;
      if (opts.signal?.aborted) throw opts.signal.reason ?? err;
      if (err instanceof Error && err.message === 'Gemini not configured') throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Site Bot site copy (Tamar / Noa / repair / identity calls): LLM_PROVIDER_SITE_COPY. */
export function callSiteCopyJSON(systemPrompt: string, userMessage: string, opts: WorkloadJsonOptions = {}): Promise<string> {
  return callWorkloadJSON('site_copy', systemPrompt, userMessage, opts);
}
