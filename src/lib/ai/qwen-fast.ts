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
};

export async function callQwenJSON(
  systemPrompt: string,
  userMessage: string,
  opts: CallQwenJSONOptions = {},
): Promise<string> {
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

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180_000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Qwen API error (${res.status}): ${JSON.stringify(data)}`);
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== 'string') {
        throw new Error(`Qwen API returned unexpected shape: ${JSON.stringify(data)}`);
      }
      const span = extractJsonSpan(text);
      JSON.parse(span); // validate — retry if still unparseable
      return span;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
