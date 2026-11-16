/**
 * Per-workload LLM provider switch + production token-plan guard.
 *
 * Founder-seat decision D3 (Fable 5.2, 2026-11-15, docs/missions/fable52-decisions-2026-11-15.md):
 * nothing in production may call the Alibaba Qwen *token plan* (interactive agent use only),
 * not even when a workload's env var explicitly asks for it (D3b, 2026-11-15: the server's .env
 * must not be able to keep us on the plan). Every production LLM workload has its own one-line
 * env switch:
 *
 *   workload        env var                        default
 *   chat            LLM_PROVIDER_CHAT              gemini
 *   panel_rewrite   LLM_PROVIDER_PANEL_REWRITE     gemini
 *   gbp_reply       LLM_PROVIDER_GBP_REPLY         gemini
 *   geo             LLM_PROVIDER_GEO               gemini   (also governs the GEO Qwen fallback: none by default)
 *   site_copy       LLM_PROVIDER_SITE_COPY         gemini   (D3b blind test, 2026-11-15)
 *   support_reply   LLM_PROVIDER_SUPPORT_REPLY     gemini   (Site-Bot staff draft replies; never the token plan in
 *                                                            production, see src/lib/site-bot/supportDraft.ts)
 *
 * Values: gemini | qwen-metered | qwen-token-plan.
 *   - gemini           GEMINI_API_KEY (+ optional GEMINI_MODEL_NAME), see gemini-fast.ts.
 *   - qwen-metered     DashScope pay-as-you-go: QWEN_METERED_API_KEY + QWEN_METERED_BASE_URL.
 *                      OpenAI-compatible; the expected form is the dashscope-intl compatible-mode
 *                      endpoint (https://dashscope-intl.aliyuncs.com/compatible-mode/v1). No default
 *                      is shipped: unset = provider unavailable.
 *   - qwen-token-plan  QWEN_API_KEY + QWEN_BASE_URL (the token-plan endpoint). Local/staff use only.
 *
 * Production guard (NODE_ENV=production), two layers:
 *   1. selectLlmProvider: a workload set to `qwen-token-plan` is served by `gemini` instead, with
 *      one console warning per workload per process. Every caller switches on the selection, so
 *      the request simply goes to Gemini. `qwen-metered` stays allowed.
 *   2. assertTokenPlanAllowed / resolveQwenEndpoint: any Qwen base URL whose host contains
 *      "token-plan" is refused (TokenPlanRefusedError, logged once per workload), whatever the
 *      selection says. This catches a metered switch pointed at the token-plan URL.
 *
 * This file has no imports on purpose; scripts/lib/llm-provider.mjs mirrors it for the .mjs
 * scripts/crons, and src/lib/ai/llmProvider.parity.test.mjs keeps the two in lockstep.
 */

export type LlmWorkload = 'chat' | 'panel_rewrite' | 'gbp_reply' | 'geo' | 'site_copy' | 'support_reply';
export type LlmProviderName = 'gemini' | 'qwen-metered' | 'qwen-token-plan';
export type QwenProviderName = Exclude<LlmProviderName, 'gemini'>;
export type LlmEnv = Record<string, string | undefined>;

export const LLM_PROVIDERS: readonly LlmProviderName[] = ['gemini', 'qwen-metered', 'qwen-token-plan'];

export const LLM_WORKLOADS: readonly LlmWorkload[] = ['chat', 'panel_rewrite', 'gbp_reply', 'geo', 'site_copy', 'support_reply'];

export const LLM_WORKLOAD_ENV: Readonly<Record<LlmWorkload, string>> = {
  chat: 'LLM_PROVIDER_CHAT',
  panel_rewrite: 'LLM_PROVIDER_PANEL_REWRITE',
  gbp_reply: 'LLM_PROVIDER_GBP_REPLY',
  geo: 'LLM_PROVIDER_GEO',
  site_copy: 'LLM_PROVIDER_SITE_COPY',
  support_reply: 'LLM_PROVIDER_SUPPORT_REPLY',
};

export const LLM_WORKLOAD_DEFAULT: Readonly<Record<LlmWorkload, LlmProviderName>> = {
  chat: 'gemini',
  panel_rewrite: 'gemini',
  gbp_reply: 'gemini',
  geo: 'gemini',
  site_copy: 'gemini',
  support_reply: 'gemini',
};

export type LlmProviderSelection = {
  workload: LlmWorkload;
  provider: LlmProviderName;
  /** True only when the workload's env var is set; a default is never an explicit opt-in. */
  explicit: boolean;
  envVar: string;
  /** Set when production replaced a `qwen-token-plan` setting with `gemini`. */
  downgradedFrom?: 'qwen-token-plan';
};

export type QwenEndpoint = {
  workload: LlmWorkload;
  provider: QwenProviderName;
  apiKey: string;
  baseUrl: string;
};

function defaultEnv(): LlmEnv {
  return process.env as LlmEnv;
}

const warnedDowngrades = new Set<LlmWorkload>();

export function selectLlmProvider(
  workload: LlmWorkload,
  env: LlmEnv = defaultEnv(),
  warn: (message: string) => void = message => console.warn(message),
): LlmProviderSelection {
  const envVar = LLM_WORKLOAD_ENV[workload];
  if (!envVar) throw new Error(`[llmProvider] unknown LLM workload: ${String(workload)}`);
  const raw = (env[envVar] ?? '').trim().toLowerCase();
  let selection: LlmProviderSelection;
  if (!raw) selection = { workload, provider: LLM_WORKLOAD_DEFAULT[workload], explicit: false, envVar };
  else if (!(LLM_PROVIDERS as readonly string[]).includes(raw)) {
    throw new Error(`[llmProvider] ${envVar}="${raw}" is not a valid provider (expected ${LLM_PROVIDERS.join(' | ')})`);
  } else selection = { workload, provider: raw as LlmProviderName, explicit: true, envVar };
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

export function isTokenPlanUrl(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname.toLowerCase().includes('token-plan');
  } catch {
    // Unparseable URL: be conservative and treat any mention as the token plan.
    return baseUrl.toLowerCase().includes('token-plan');
  }
}

export class TokenPlanRefusedError extends Error {
  readonly workload: LlmWorkload;
  constructor(message: string, workload: LlmWorkload) {
    super(message);
    this.name = 'TokenPlanRefusedError';
    this.workload = workload;
  }
}

const loggedRefusals = new Set<LlmWorkload>();

/** Test-only: forget which workloads already logged a refusal or a production downgrade. */
export function resetTokenPlanRefusalLog(): void {
  loggedRefusals.clear();
  warnedDowngrades.clear();
}

/**
 * Throws TokenPlanRefusedError when NODE_ENV=production and the base URL is the token plan, for
 * every workload (no opt-in). Logs once per workload per process.
 */
export function assertTokenPlanAllowed(
  workload: LlmWorkload,
  baseUrl: string,
  env: LlmEnv = defaultEnv(),
  log: (message: string) => void = message => console.error(message),
): void {
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

/**
 * Credentials for the workload's Qwen provider, or null when the workload selects Gemini or the
 * selected Qwen provider's key/base URL is unset (provider unavailable). Applies the production
 * token-plan guard before returning, so every Qwen caller in src/ goes through it.
 */
export function resolveQwenEndpoint(
  workload: LlmWorkload,
  env: LlmEnv = defaultEnv(),
  warn: (message: string) => void = message => console.warn(message),
): QwenEndpoint | null {
  const selection = selectLlmProvider(workload, env, warn);
  if (selection.provider === 'gemini') return null;
  const metered = selection.provider === 'qwen-metered';
  const apiKey = metered ? env.QWEN_METERED_API_KEY : env.QWEN_API_KEY;
  const baseUrl = metered ? env.QWEN_METERED_BASE_URL : env.QWEN_BASE_URL;
  if (!apiKey || !baseUrl) return null;
  assertTokenPlanAllowed(workload, baseUrl, env);
  return { workload, provider: selection.provider, apiKey, baseUrl };
}
