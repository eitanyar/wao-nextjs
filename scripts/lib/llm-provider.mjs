/**
 * .mjs mirror of src/lib/ai/llmProvider.ts for scripts and crons (plain Node cannot import the
 * TS module). Same workloads, env vars, defaults and production token-plan guard; see the TS
 * file header for the full table. src/lib/ai/llmProvider.parity.test.mjs asserts both modules
 * agree, so change them together.
 */

export const LLM_PROVIDERS = Object.freeze(['gemini', 'qwen-metered', 'qwen-token-plan']);

export const LLM_WORKLOADS = Object.freeze(['chat', 'panel_rewrite', 'gbp_reply', 'geo', 'site_copy', 'support_reply']);

export const LLM_WORKLOAD_ENV = Object.freeze({
  chat: 'LLM_PROVIDER_CHAT',
  panel_rewrite: 'LLM_PROVIDER_PANEL_REWRITE',
  gbp_reply: 'LLM_PROVIDER_GBP_REPLY',
  geo: 'LLM_PROVIDER_GEO',
  site_copy: 'LLM_PROVIDER_SITE_COPY',
  support_reply: 'LLM_PROVIDER_SUPPORT_REPLY',
});

export const LLM_WORKLOAD_DEFAULT = Object.freeze({
  chat: 'gemini',
  panel_rewrite: 'gemini',
  gbp_reply: 'gemini',
  geo: 'gemini',
  site_copy: 'gemini',
  support_reply: 'gemini',
});

const warnedDowngrades = new Set();

export function selectLlmProvider(workload, env = process.env, warn = message => console.warn(message)) {
  const envVar = LLM_WORKLOAD_ENV[workload];
  if (!envVar) throw new Error(`[llmProvider] unknown LLM workload: ${String(workload)}`);
  const raw = String(env[envVar] ?? '').trim().toLowerCase();
  let selection;
  if (!raw) selection = { workload, provider: LLM_WORKLOAD_DEFAULT[workload], explicit: false, envVar };
  else if (!LLM_PROVIDERS.includes(raw)) {
    throw new Error(`[llmProvider] ${envVar}="${raw}" is not a valid provider (expected ${LLM_PROVIDERS.join(' | ')})`);
  } else selection = { workload, provider: raw, explicit: true, envVar };
  if (selection.provider === 'qwen-token-plan' && env.NODE_ENV === 'production') {
    if (!warnedDowngrades.has(workload)) {
      warnedDowngrades.add(workload);
      warn(`[llmProvider] workload "${workload}": ${envVar}=qwen-token-plan is refused in production `
        + '(interactive-use-only plan); using gemini. Set it to gemini or qwen-metered.');
    }
    return { ...selection, provider: 'gemini', downgradedFrom: 'qwen-token-plan' };
  }
  return selection;
}

export function isTokenPlanUrl(baseUrl) {
  try {
    return new URL(baseUrl).hostname.toLowerCase().includes('token-plan');
  } catch {
    return String(baseUrl).toLowerCase().includes('token-plan');
  }
}

export class TokenPlanRefusedError extends Error {
  constructor(message, workload) {
    super(message);
    this.name = 'TokenPlanRefusedError';
    this.workload = workload;
  }
}

const loggedRefusals = new Set();

export function resetTokenPlanRefusalLog() {
  loggedRefusals.clear();
  warnedDowngrades.clear();
}

export function assertTokenPlanAllowed(workload, baseUrl, env = process.env, log = message => console.error(message)) {
  if (env.NODE_ENV !== 'production') return;
  if (!isTokenPlanUrl(baseUrl)) return;
  const envVar = LLM_WORKLOAD_ENV[workload];
  const message = `[llmProvider] refused: workload "${workload}" tried to call the Qwen token plan in production `
    + `(interactive-use-only plan, no opt-in). Set ${envVar}=gemini, or ${envVar}=qwen-metered with a metered base URL.`;
  if (!loggedRefusals.has(workload)) {
    loggedRefusals.add(workload);
    log(message);
  }
  throw new TokenPlanRefusedError(message, workload);
}

export function resolveQwenEndpoint(workload, env = process.env, warn = message => console.warn(message)) {
  const selection = selectLlmProvider(workload, env, warn);
  if (selection.provider === 'gemini') return null;
  const metered = selection.provider === 'qwen-metered';
  const apiKey = metered ? env.QWEN_METERED_API_KEY : env.QWEN_API_KEY;
  const baseUrl = metered ? env.QWEN_METERED_BASE_URL : env.QWEN_BASE_URL;
  if (!apiKey || !baseUrl) return null;
  assertTokenPlanAllowed(workload, baseUrl, env);
  return { workload, provider: selection.provider, apiKey, baseUrl };
}

/**
 * Script env view: .env.local file values overlaid by process.env (process wins when the key is
 * present, even if empty) — the same precedence as the scripts' existing envVal() helpers.
 */
export function scriptEnv(fileEnv = {}) {
  return { ...fileEnv, ...process.env };
}

/**
 * Minimal Gemini JSON-mode call for scripts (mirrors callGeminiJSON in src/lib/ai/gemini-fast.ts).
 * Returns the raw response text; the caller parses it with its own JSON helper.
 */
export async function geminiGenerateJsonText({
  apiKey,
  model,
  systemPrompt,
  userMessage,
  thinkingLevel = 'HIGH',
  temperature,
  timeoutMs = 180_000,
  fetchImpl = globalThis.fetch,
}) {
  if (!apiKey) throw new Error('Gemini not configured');
  const generationConfig = { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel } };
  if (typeof temperature === 'number') generationConfig.temperature = temperature;
  const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${JSON.stringify(data)}`);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') throw new Error(`Gemini returned unexpected shape: ${JSON.stringify(data)}`);
  return text;
}
