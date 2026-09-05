// Shared single-turn JSON-mode Qwen caller — used by content-generation
// routes that need one system+user prompt in, one JSON string out.
// Conversational bots stay on Gemini (see gemini-fast.ts / /api/bot).
//
// DashScope qwen3.8-max reasons by default; pair enable_thinking:false or a
// thinking_budget with AbortSignal.timeout so a hung non-streaming JSON call
// can fail over to the next retry instead of sitting past Node's header timeout.

import { extractJsonSpan } from './gemini-fast';

export type CallQwenJSONOptions = {
  think?: boolean;
  thinkingBudget?: number;
  /** Defaults to 'qwen3.8-max' (the established Hebrew-authoring model). Pass
   * an explicit override for a different role — e.g. 'qwen3.7-plus' for the
   * GEO distinctiveness critic (src/lib/geo/critic.ts), which deliberately
   * wants a different vendor/family from the Gemini generator it critiques,
   * not the authoring model used elsewhere in this file's call sites. */
  model?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxAttempts?: number;
  fetch?: typeof globalThis.fetch;
};

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_ATTEMPTS = 3;

function validateOptions(opts: CallQwenJSONOptions) {
  if (opts.timeoutMs !== undefined && (!Number.isFinite(opts.timeoutMs) || opts.timeoutMs <= 0)) throw new Error('Invalid Qwen timeout');
  if (opts.maxAttempts !== undefined && (!Number.isInteger(opts.maxAttempts) || opts.maxAttempts < 1 || opts.maxAttempts > DEFAULT_MAX_ATTEMPTS)) throw new Error('Invalid Qwen attempt count');
}

export async function callQwenJSON(
  systemPrompt: string,
  userMessage: string,
  opts: CallQwenJSONOptions = {},
): Promise<string> {
  validateOptions(opts);
  const apiKey = process.env.QWEN_API_KEY;
  const baseUrl = process.env.QWEN_BASE_URL;
  if (!apiKey || !baseUrl) throw new Error('Qwen not configured');

  const payload: Record<string, unknown> = {
    model: opts.model || 'qwen3.8-max',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  };
  if (opts.think === false) payload.enable_thinking = false;
  if (typeof opts.thinkingBudget === 'number') payload.thinking_budget = opts.thinkingBudget;

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const fetchImplementation = opts.fetch ?? globalThis.fetch;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (opts.signal?.aborted) throw opts.signal.reason ?? new Error('Qwen request aborted');
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = opts.signal ? AbortSignal.any([opts.signal, timeoutSignal]) : timeoutSignal;
    try {
      const res = await fetchImplementation(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Qwen API error (${res.status})`);
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== 'string') {
        throw new Error('Qwen API returned unexpected shape');
      }
      const span = extractJsonSpan(text);
      JSON.parse(span); // validate — retry if still unparseable
      return span;
    } catch (err) {
      lastErr = err;
      if (opts.signal?.aborted) throw opts.signal.reason ?? err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
