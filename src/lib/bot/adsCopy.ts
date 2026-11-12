/**
 * Sell mission 2026-11-12 (docs/copy/strategy/client-copy-sell-fable52-2026-11-12.md section 3, Ads Bot): the code side of the
 * Ads Bot copy.
 *
 * - Callouts are built from the code-owned fact templates (ownerFactCopy trustText), never by the model: the model callout
 *   prompt mapped a licence to "licensed and insured", and no owner field holds insurance.
 * - RSA assets are validated, given ONE repair call, then dropped. Never trimmed with an ellipsis (a cut headline can go live).
 *   The checks: Google's limits, no ellipsis, no phone number, no emoji / decorative symbol, no repeated punctuation, no
 *   superlative ranking phrase, and the truth gates of the site generator (claim tokens, fear-into-promise, numbers the owner
 *   never gave, plural / we address).
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (every token comes from the existing data / template modules).
 */
import type { CollectedData } from './prompts';
import {
  ALWAYS_BLOCKING_RULES,
  CLAIM_SCOPE_GATE_RULES,
  GATE_RULES,
  copyGateContext,
  describeGateViolation,
  genericAdjectiveHits,
  runCopyGates,
  type CopyGateContext,
  type GateRule,
  type GateViolation,
} from '../lp/copyGates';
import { GENERIC_ADJECTIVE_PHRASES } from '../lp/generationData';
import { codeOwnedFactTemplates, ownerFacts, trustText, TRUST_BAR_FACT_ORDER, type OwnerFactTemplates } from '../lp/ownerFactCopy';
import { buildFearPromiseSpec } from '../lp/claimScope';
import { fearPromiseSource } from '../lp/researchPageCopy';

/** Google Ads limits (RSA headline / description, callout). */
export const RSA_HEADLINE_MAX = 30;
export const RSA_DESCRIPTION_MAX = 90;
export const RSA_MAX_HEADLINES = 15;
export const RSA_MAX_DESCRIPTIONS = 4;
export const CALLOUT_MAX = 25;
export const CALLOUT_MAX_ITEMS = 8;

/** The truth rules an ad asset and an Ads landing page must pass (the site generator's truth gates plus the address gates). */
export const ADS_TRUTH_RULES: readonly GateRule[] = [...ALWAYS_BLOCKING_RULES, ...CLAIM_SCOPE_GATE_RULES, GATE_RULES.plural, GATE_RULES.we];

/**
 * The superlative ranking phrases of genericAdjectivePhrases (best / most suitable), selected by their shared last word from
 * the data list (no Hebrew here; asserted to be at least three entries). "Only", "cheapest", "first" and "number one" have no
 * token list in the repo yet: Noa supplies them (reported).
 */
export const RANKING_PHRASE_INDICES: readonly number[] = (() => {
  const anchor = GENERIC_ADJECTIVE_PHRASES[9] ?? '';
  const last = anchor.split(' ').at(-1) ?? '';
  const indices = GENERIC_ADJECTIVE_PHRASES.map((phrase, index) => (last && phrase.split(' ').at(-1) === last ? index : -1)).filter(index => index >= 0);
  if (indices.length < 3) throw new Error('genericAdjectivePhrases changed: update RANKING_PHRASE_INDICES');
  return indices;
})();

const EMOJI_OR_SYMBOL = /[\p{Extended_Pictographic}★☆✓✔•●]/u;
const REPEATED_PUNCTUATION = /([!?.,;:])\1|[!?][!?]/u;
const PHONE_NUMBER = /\d[\d\s-]{6,}\d/u;

/** The gate context of one owner's ads (no research site: truth and address gates only). */
export function adsGateContext(data: CollectedData, templates: OwnerFactTemplates | null = codeOwnedFactTemplates()): CopyGateContext {
  const places = [data.targetLocation, ...(typeof data.specificCities === 'string' ? data.specificCities.split(/[,\n]/) : [])]
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(item => item.trim());
  const ctx = copyGateContext(data, [], true, places, { unknownNumberGate: true });
  if (!templates) return ctx;
  const excluded = [data.businessNiche, data.businessName, data.primaryService, ...places].filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  const source = fearPromiseSource(data, templates);
  const fear = buildFearPromiseSpec(source.fear, templates.parseNegationWords, excluded, source.ownerTexts);
  return fear ? { ...ctx, fearPromise: fear } : ctx;
}

/** The truth-gate hits of one text (field-named for the repair text), never copy text. */
export function adsTruthHits(text: string, ctx: CopyGateContext, field = 'heroHeadline'): GateViolation[] {
  return runCopyGates({ [field]: text }, ctx).filter(hit => ADS_TRUTH_RULES.includes(hit.rule));
}

/** Every problem of one RSA asset (empty = valid). Ids only: `too_long`, `ellipsis`, `phone`, `symbol`, `punctuation`, `ranking`, `gate:<rule>`. */
export function rsaAssetProblems(text: unknown, max: number, ctx: CopyGateContext): string[] {
  if (typeof text !== 'string' || !text.trim()) return ['empty'];
  const value = text.trim();
  const out: string[] = [];
  if ([...value].length > max) out.push('too_long');
  if (value.includes('…') || value.includes('...')) out.push('ellipsis');
  if (PHONE_NUMBER.test(value)) out.push('phone');
  if (EMOJI_OR_SYMBOL.test(value)) out.push('symbol');
  if (REPEATED_PUNCTUATION.test(value)) out.push('punctuation');
  if (genericAdjectiveHits(value, ctx).some(hit => hit.kind === 'phrase' && RANKING_PHRASE_INDICES.includes(hit.index))) out.push('ranking');
  for (const hit of adsTruthHits(value, ctx)) out.push(`gate:${hit.rule}${hit.actual ? `:${hit.actual}` : ''}`);
  return [...new Set(out)];
}

export interface RsaCopy {
  headlines: string[];
  descriptions: string[];
}

export interface SettledRsaAssets {
  headlines: string[];
  descriptions: string[];
  /** Assets fixed by the one repair call. */
  repaired: Array<{ kind: 'headline' | 'description'; index: number; problems: string[] }>;
  /** Assets dropped (still invalid after the repair, or no repair available). */
  dropped: Array<{ kind: 'headline' | 'description'; index: number; problems: string[] }>;
  repairCalls: number;
}

export type AdsJsonCaller = (system: string, user: string) => Promise<string>;

export const RSA_REPAIR_SYSTEM_PROMPT = 'You are Tamar, WAO\'s Sabra conversion copywriter, repairing specific Google Ads RSA assets that broke a hard rule. Rewrite each listed asset so it keeps its selling angle and passes every rule. A line that does not fit its limit is rewritten shorter in complete natural Hebrew, never cut. Use facts only from the business data. Return only a JSON object {"headlines": {"<index>": "<text>"}, "descriptions": {"<index>": "<text>"}} with exactly the listed indices, no prose and no markdown.';

function problemText(problem: string, max: number, ctx: CopyGateContext, field: string): string {
  switch (problem) {
    case 'too_long': return `longer than ${max} characters: rewrite it shorter in complete words`;
    case 'ellipsis': return 'ends in or contains an ellipsis: write a complete line';
    case 'phone': return 'contains a phone number: Google forbids it in ad text';
    case 'symbol': return 'contains an emoji or decorative symbol: remove it';
    case 'punctuation': return 'repeats punctuation: use one mark';
    case 'ranking': return 'ranks the business against others (best / most suitable): the owner never stated it';
    case 'empty': return 'is empty';
    default: {
      const [, rule, ...rest] = problem.split(':');
      return describeGateViolation({ field, rule: rule as GateRule, ...(rest.length ? { actual: rest.join(':') } : {}) }, ctx);
    }
  }
}

/**
 * Validate every asset, send the invalid ones in ONE repair call, re-validate, and drop what is still invalid. Never trims.
 * Without a caller (or when the call fails) the invalid assets are dropped.
 */
export async function settleRsaAssets(copy: RsaCopy, data: CollectedData, options: { callJson?: AdsJsonCaller; ctx?: CopyGateContext } = {}): Promise<SettledRsaAssets> {
  const ctx = options.ctx ?? adsGateContext(data);
  const headlines = (Array.isArray(copy.headlines) ? copy.headlines : []).slice(0, RSA_MAX_HEADLINES).map(item => (typeof item === 'string' ? item.trim() : ''));
  const descriptions = (Array.isArray(copy.descriptions) ? copy.descriptions : []).slice(0, RSA_MAX_DESCRIPTIONS).map(item => (typeof item === 'string' ? item.trim() : ''));
  const check = (kind: 'headline' | 'description', list: string[]) => list.map((text, index) => ({ kind, index, problems: rsaAssetProblems(text, kind === 'headline' ? RSA_HEADLINE_MAX : RSA_DESCRIPTION_MAX, ctx) })).filter(item => item.problems.length);
  const first = [...check('headline', headlines), ...check('description', descriptions)];
  const repaired: SettledRsaAssets['repaired'] = [];
  let repairCalls = 0;
  if (first.length && options.callJson) {
    const lines = first.map(item => {
      const max = item.kind === 'headline' ? RSA_HEADLINE_MAX : RSA_DESCRIPTION_MAX;
      const text = item.kind === 'headline' ? headlines[item.index] : descriptions[item.index];
      return `- ${item.kind}s[${item.index}] (max ${max} characters): ${JSON.stringify(text)}: ${item.problems.map(problem => problemText(problem, max, ctx, `${item.kind}s[${item.index}]`)).join('; ')}`;
    });
    const others = { headlines: headlines.filter((_, index) => !first.some(item => item.kind === 'headline' && item.index === index)), descriptions: descriptions.filter((_, index) => !first.some(item => item.kind === 'description' && item.index === index)) };
    const user = `ASSETS TO REPAIR:\n${lines.join('\n')}\n\nTHE OTHER ASSETS (keep every repaired asset a different claim from these):\n${JSON.stringify(others)}\n\nBUSINESS DATA (the only facts you may use):\n${JSON.stringify(Object.fromEntries(Object.entries(data).filter(([, value]) => typeof value === 'string' && value.trim())))}`;
    try {
      repairCalls++;
      const parsed = JSON.parse(await options.callJson(RSA_REPAIR_SYSTEM_PROMPT, user)) as { headlines?: Record<string, unknown>; descriptions?: Record<string, unknown> };
      for (const item of first) {
        const bag = item.kind === 'headline' ? parsed.headlines : parsed.descriptions;
        const next = bag && typeof bag === 'object' ? bag[String(item.index)] : undefined;
        if (typeof next !== 'string') continue;
        const list = item.kind === 'headline' ? headlines : descriptions;
        if (!rsaAssetProblems(next, item.kind === 'headline' ? RSA_HEADLINE_MAX : RSA_DESCRIPTION_MAX, ctx).length) {
          list[item.index] = next.trim();
          repaired.push(item);
        }
      }
    } catch {
      // A failed repair call drops the invalid assets (never ships them, never trims them).
    }
  }
  const dropped = first.filter(item => !repaired.includes(item));
  const keep = (kind: 'headline' | 'description', list: string[]) => list.filter((text, index) => text && !dropped.some(item => item.kind === kind && item.index === index));
  const dedupe = (list: string[]) => list.filter((text, index) => list.indexOf(text) === index);
  return { headlines: dedupe(keep('headline', headlines)), descriptions: dedupe(keep('description', descriptions)), repaired, dropped, repairCalls };
}

/**
 * Callouts from the code-owned fact templates: the trust-bar text of each owner fact (years, licence, warranty, rating,
 * response), at most CALLOUT_MAX characters, no decorative symbol, no duplicates. Empty while the templates are pending.
 */
export function adsCalloutsFromFacts(data: CollectedData, templates: OwnerFactTemplates | null = codeOwnedFactTemplates()): string[] {
  if (!templates) return [];
  const facts = ownerFacts(data, { site: undefined, firstPartyProof: [] }, templates);
  const out: string[] = [];
  for (const kind of TRUST_BAR_FACT_ORDER) {
    const fact = facts[kind];
    if (!fact || kind === 'area') continue;
    const text = trustText(fact, templates)?.trim();
    if (!text || [...text].length > CALLOUT_MAX || EMOJI_OR_SYMBOL.test(text) || out.includes(text)) continue;
    out.push(text);
  }
  return out.slice(0, CALLOUT_MAX_ITEMS);
}
