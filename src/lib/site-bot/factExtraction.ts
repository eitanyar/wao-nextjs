/**
 * Site Bot step 2b: the ONE model call that turns the owner's interview answers into fact candidates
 * (interviewFacts.ts validates every candidate; this module never decides what is a fact).
 *
 * Bounded: Gemini via gemini-fast.ts (callGeminiJSON), thinking FACTS_THINKING_LEVEL (LOW, Adam 2026-11-25: the owner waits on the
 * facts screen; LOW 4.7 s / $0.002 vs HIGH 41-73 s / $0.031 kept the same quotes, and the substring rule guards accuracy), maxOutputTokens FACTS_MAX_OUTPUT_TOKENS, a timeout per attempt, ONE retry.
 * Every attempt that returned usage is priced and handed back as a providerUsage row (the caller writes it to the
 * dossier). Failure of both attempts returns { ok: false }: the caller falls back to the code-only facts.
 *
 * Privacy: the model sees the trade, the owner's service names and his five answers only. Never his phone, email or
 * name: his own contact strings, and anything shaped like a phone number or an email address, are replaced in the
 * answers before the call (a quote that spans a redaction then fails the substring check and is dropped).
 *
 * Fixture mode for rehearsals and tests: SITE_BOT_FACTS_MODEL=fixture (ignored in production) answers from a
 * deterministic, zero-network fixture built from the answers themselves, plus one invented quote that the substring
 * rule must drop.
 *
 * Server-only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { callGeminiJSON } from '../ai/gemini-fast';
import type { LlmUsageEntry } from '../ai/llmUsage';
import type { InterviewTextQuestionKey } from './interviewQuestions';
import { MODEL_FACT_TYPES, type QuoteSource } from './interviewFacts';
import type { ProviderUsage } from './research/types';

/**
 * Thinking level (Adam's brief: batch-like workload -> HIGH). Measured 2026-11-25 on one synthetic five-answer plumber set:
 * HIGH 41 s and 73 s on two runs (~$0.03), 6 facts kept; LOW 4.7 s (~$0.002), 5 facts kept, the same quotes in substance.
 * One-line switch if the owner's wait matters more.
 */
export const FACTS_THINKING_LEVEL: 'LOW' | 'HIGH' = 'LOW';
/** Per attempt: above the slowest HIGH run measured (73 s). Two attempts stay inside FACTS_CLAIM_STALE_MS. */
export const FACTS_TIMEOUT_MS = 100_000;
export const FACTS_MAX_OUTPUT_TOKENS = 8192;
export const FACTS_MAX_ATTEMPTS = 2;
export const FACTS_USAGE_WORKLOAD = 'site_bot_interview_facts';

/** What each question asks, for the model (English; the answers are the owner's Hebrew). */
const QUESTION_GLOSS: Readonly<Record<InterviewTextQuestionKey, string>> = {
  recentJob: 'A job from the last two weeks: what the problem was, where it was, and what he did.',
  turnedDown: 'A job he turned down or passed to someone else, and why.',
  callerQuestion: 'The question almost every caller asks him, and what he answers.',
  areaPattern: 'Where he works most, and what keeps coming up there.',
};

export interface ExtractionInput {
  trade: string;
  services: Array<{ id: string; name: string }>;
  sources: readonly QuoteSource[];
  /** The owner's own contact strings, removed from the answers before the call. */
  redact: readonly string[];
}

export type ModelCall = (
  system: string,
  user: string,
  options: { timeoutMs: number; maxOutputTokens: number; onUsage: (counts: UsageCounts, model: string) => void },
) => Promise<string>;

type UsageCounts = Pick<LlmUsageEntry, 'inputTokens' | 'outputTokens' | 'cachedTokens' | 'thinkingTokens'>;

export type ExtractionOutcome =
  | { ok: true; candidates: unknown[]; usage: ProviderUsage[]; attempts: number }
  | { ok: false; usage: ProviderUsage[]; attempts: number };

/**
 * USD per 1M tokens of the Flash rows of scripts/llm-usage-report.mjs (GEMINI_PRICES_USD_PER_MTOK, recorded 2026-11-16,
 * not re-checked live): the intro price until 2027-01-01, then the list price. Thinking bills at the output rate.
 */
const FLASH_TIERS = [
  { until: Date.parse('2027-01-01T00:00:00.000Z'), input: 0.75, output: 3.75, cached: 0.075 },
  { until: Infinity, input: 1.5, output: 7.5, cached: 0.15 },
];

export function flashCostUsd(counts: UsageCounts, at: Date): number {
  const tier = FLASH_TIERS.find(item => at.getTime() < item.until) ?? FLASH_TIERS[FLASH_TIERS.length - 1];
  const n = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);
  const input = n(counts.inputTokens);
  const cached = Math.min(n(counts.cachedTokens), input);
  const output = n(counts.outputTokens) + n(counts.thinkingTokens);
  return ((input - cached) * tier.input + cached * tier.cached + output * tier.output) / 1_000_000;
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Israeli phone shapes: 0 + 8-9 digits, optional separators, optional +972.
const PHONE = /(?:\+?972[-\s]?|0)(?:[-\s]?\d){8,9}/g;

/** The answer text the model may see: contact strings and phone / email shapes replaced. */
export function redactForModel(text: string, redact: readonly string[]): string {
  let out = text;
  for (const value of redact) {
    const needle = typeof value === 'string' ? value.trim() : '';
    if (needle.length >= 4) out = out.split(needle).join('[redacted]');
  }
  return out.replace(EMAIL, '[redacted]').replace(PHONE, '[redacted]');
}

export const FACTS_SYSTEM_PROMPT = [
  'You extract publishable facts about a small Israeli service business from its owner\'s own interview answers (Hebrew).',
  'A fact is one concrete, checkable claim the business website could state about him: a job he did, a job he refused and why,',
  'a price rule (how he prices, never a guess), a local detail (a town, neighbourhood, building type, seasonal pattern), a tool,',
  'brand or piece of equipment he uses, or a number with what it counts (a time, a count, a distance, years).',
  'Rules:',
  '1. "quote" MUST be copied character for character from ONE answer text: a contiguous span of his own words, 3 to 25 words.',
  '   Never paraphrase, never translate, never fix spelling, never join two spans, never add words. If you cannot quote it, skip it.',
  '2. Skip generic self-praise (professional, reliable, quality, best, fair prices) and anything without a concrete detail.',
  '3. "condition": only when he states a scope or condition for the fact, and only as an exact span of the same answer. Else omit.',
  '4. "serviceId": only an id from the given services list, when the fact is clearly about that service. Else omit.',
  '5. "questionKey": the key of the answer the quote comes from.',
  `6. "type": one of ${MODEL_FACT_TYPES.join(', ')}.`,
  '7. At most 12 facts. No fact twice. Return JSON only: {"facts":[{"type","questionKey","quote","condition"?,"serviceId"?}]}.',
].join('\n');

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    facts: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...MODEL_FACT_TYPES] },
          questionKey: { type: 'string', enum: Object.keys(QUESTION_GLOSS) },
          quote: { type: 'string' },
          condition: { type: 'string' },
          serviceId: { type: 'string' },
        },
        required: ['type', 'questionKey', 'quote'],
      },
    },
  },
  required: ['facts'],
};

export function extractionUserMessage(input: ExtractionInput): string {
  return JSON.stringify({
    trade: input.trade.slice(0, 120),
    services: input.services.slice(0, 20).map(service => ({ id: service.id, name: service.name.slice(0, 80) })),
    answers: input.sources.map(source => ({
      questionKey: source.key,
      question: QUESTION_GLOSS[source.key],
      ...(source.part === 'followUp' ? { note: 'his second answer to the same question, after we asked for a concrete example' } : {}),
      text: redactForModel(source.text, input.redact),
    })),
  });
}

/** The production model call (Gemini, gemini-fast.ts). */
export const geminiModelCall: ModelCall = (system, user, options) => callGeminiJSON(system, user, {
  usage: { workload: FACTS_USAGE_WORKLOAD },
  thinkingLevel: FACTS_THINKING_LEVEL,
  timeoutMs: options.timeoutMs,
  maxOutputTokens: options.maxOutputTokens,
  responseJsonSchema: RESPONSE_SCHEMA,
  onUsage: options.onUsage,
});

/**
 * The zero-network fixture model: for every answer, its first clause (up to the first comma / full stop, at most 12
 * words) as a fact of the question's natural type, plus one invented quote (the substring rule must drop it).
 */
export const fixtureModelCall: ModelCall = async (_system, user, options) => {
  const parsed = JSON.parse(user) as { answers: Array<{ questionKey: InterviewTextQuestionKey; text: string }> };
  const typeOf: Record<InterviewTextQuestionKey, string> = { recentJob: 'job', turnedDown: 'refusal', callerQuestion: 'job', areaPattern: 'local' };
  const facts = parsed.answers.map(answer => ({
    type: typeOf[answer.questionKey],
    questionKey: answer.questionKey,
    quote: answer.text.split(/[,.\n]/)[0].trim().split(/\s+/).slice(0, 12).join(' '),
  })).filter(fact => fact.quote);
  facts.push({ type: 'job', questionKey: 'recentJob', quote: 'fixture invented quote that the owner never wrote' });
  options.onUsage({ inputTokens: 0, outputTokens: 0 }, 'fixture');
  return JSON.stringify({ facts });
};

/** SITE_BOT_FACTS_MODEL=fixture selects the fixture outside production; anything else is the real model. */
export function defaultModelCall(env: Record<string, string | undefined> = process.env): ModelCall {
  if (env.SITE_BOT_FACTS_MODEL === 'fixture') {
    if (env.NODE_ENV === 'production') {
      console.error('[site-bot facts] SITE_BOT_FACTS_MODEL=fixture IGNORED in production; using the live model');
      return geminiModelCall;
    }
    console.warn('[site-bot facts] FIXTURE model active (SITE_BOT_FACTS_MODEL=fixture): zero network');
    return fixtureModelCall;
  }
  return geminiModelCall;
}

/** One bounded extraction: at most FACTS_MAX_ATTEMPTS calls; the usage of every attempt that reported it, priced. */
export async function extractFactCandidates(
  input: ExtractionInput,
  options: { call: ModelCall; now: () => Date; recordId: string; timeoutMs?: number },
): Promise<ExtractionOutcome> {
  const usage: ProviderUsage[] = [];
  if (input.sources.length === 0) return { ok: true, candidates: [], usage, attempts: 0 };
  const user = extractionUserMessage(input);
  for (let attempt = 1; attempt <= FACTS_MAX_ATTEMPTS; attempt += 1) {
    try {
      const text = await options.call(FACTS_SYSTEM_PROMPT, user, {
        timeoutMs: options.timeoutMs ?? FACTS_TIMEOUT_MS,
        maxOutputTokens: FACTS_MAX_OUTPUT_TOKENS,
        onUsage: (counts, model) => {
          const at = options.now();
          usage.push({
            provider: model === 'fixture' ? 'fixture' : 'gemini',
            operation: 'interview_facts',
            units: 1,
            estimatedCostUsd: model === 'fixture' ? 0 : Number(flashCostUsd(counts, at).toFixed(6)),
            sourceKind: 'provider',
            providerRecordId: `${model === 'fixture' ? 'fixture-' : ''}${model}:${options.recordId}:attempt-${attempt}`,
            retrievedAt: at.toISOString(),
            confidence: 1,
            assertionStatus: 'verified',
          });
        },
      });
      const parsed = JSON.parse(text) as { facts?: unknown };
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.facts)) throw new Error('bad shape');
      return { ok: true, candidates: parsed.facts, usage, attempts: attempt };
    } catch {
      // Logged without the answers or the model text (they are the owner's words).
      console.error(`[site-bot facts] extraction attempt ${attempt} failed record=${options.recordId}`);
    }
  }
  return { ok: false, usage, attempts: FACTS_MAX_ATTEMPTS };
}
