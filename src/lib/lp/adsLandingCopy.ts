/**
 * Sell mission 2026-11-12: the Ads Bot landing-page copy step (moved out of api/lp-generate/route.ts so it is testable and the
 * eval script calls the same code).
 *
 * - Tamar and Noa run on Qwen (Eitan wants Qwen's Sabra tone); a failed Qwen call falls back to Gemini for that call.
 * - The selling rules (clientSellingRules.ts) join the system prompt.
 * - With no owner guarantee the schema shows guaranteeBlock as null, and the block is forced to null after the model.
 * - reviewFeatured is forced to the owner's verbatim quote (or null).
 * - The claim gates run (the site generator's truth gates: claim tokens, fear-into-promise, numbers the owner never gave,
 *   address). Hits get ONE repair call; what still fails is dropped where the field allows it (a nullable field becomes null, a
 *   list item goes); a required field that still fails throws AdsLandingCopyGateError (a false claim never ships).
 *
 * HEBREW-SAFETY: the only Hebrew in this module is NOA_LP_QA_PROMPT, moved byte-exact from the route.
 */
import type { CollectedData } from '../bot/prompts';
import { buildLpCopyPrompt, hasRealReviewQuote, type LPCopy } from './lpCopyPrompt';
import { CLIENT_SELLING_RULES } from './clientSellingRules';
import { describeGateViolation, type CopyGateContext, type GateViolation } from './copyGates';
import { ADS_TRUTH_RULES, adsGateContext } from '../bot/adsCopy';
import { runCopyGates } from './copyGates';

export type LpJsonCaller = (system: string, user: string) => Promise<string>;

// buildLpCopyPrompt() is a complete, self-contained instruction set — unlike the Ads Bot's TAMAR_SYSTEM_PROMPT (RSA
// headline/description schema), which must NOT be reused here. See the identical fix in site-bot/generate/route.ts.
export const LP_COPY_SYSTEM_PROMPT_BASE = 'You are a Hebrew copywriter executing the exact instructions and JSON schema given in the user message. Return only the JSON object described there — no prose, no markdown fences.';
/** Sell mission 2026-11-12: the selling block joins the Ads landing-page system prompt. */
export const LP_COPY_SYSTEM_PROMPT = `${LP_COPY_SYSTEM_PROMPT_BASE}\n\n${CLIENT_SELLING_RULES}`;

// Noa's QA prompt — LOW effort, Haiku, checklist only
export const NOA_LP_QA_PROMPT = `You are Noa, Hebrew language QA editor.
Apply ONLY these corrections to the LP copy JSON you receive. Return corrected JSON only.

Checklist (fix silently — no explanations):
1. Double spaces → single space
2. Straight quotes (") → Hebrew gershayim (״) when opening/closing a quote
3. Straight apostrophe (') → Hebrew geresh (׳) in Hebrew words
4. Em-dash without spaces or with double spaces → em-dash with single space each side ( — )
5. Plural male address → singular male (replace "אתם" with "אתה", "תוכלו" with "תוכל", etc.)
6. Translated-Hebrew calques like "עשה לייק", "לחץ כאן" (too digital) → natural Hebrew
7. "heroHeadline" must end in a noun or active verb — remove trailing "..." if present
8. Enforce these max character lengths (Hebrew chars count 1 each). Any field over its
   limit must be shortened to fit — cut filler words and redundant phrasing, never the
   concrete detail/number/name that makes the line specific instead of generic:
   - heroHeadline: max 68 chars
   - heroSubheadline: max 90 chars
   - heroCta: max 15 chars
   - trustBarItems: each array item max 20 chars
   - aboutBlurb: max 320 chars
   - servicesHeadline: max 35 chars
   - serviceItems: each array item max 25 chars
   - faqHeadline: max 30 chars
   - faqItems[].a: max 120 chars each (per FAQ answer)
   - guaranteeBlock: max 100 chars total
   - formHeadline: max 35 chars
   - stickyBarLine: max 25 chars

Rules 2 and 3 apply ONLY inside Hebrew text content (JSON string values). Never
alter the JSON structural characters themselves — every property name and every
string value must remain wrapped in exactly one pair of standard ASCII double
quotes ("). The result must be syntactically valid JSON, parseable by JSON.parse.

Return: corrected JSON object only. No prose.`;

export const LP_REPAIR_SYSTEM_PROMPT = 'You are Tamar, WAO\'s Sabra conversion copywriter, repairing specific fields of a landing-page copy JSON object that broke a truth rule. Rewrite only the listed fields so they keep selling and pass every rule, using facts only from the business data. Return only a JSON object containing exactly the listed keys, with no prose and no markdown.';

/** Nullable LP fields: a field that still fails after the repair becomes null. */
const NULLABLE_FIELDS: readonly string[] = ['guaranteeBlock', 'reviewContext', 'responseTimeBadge', 'scarcityLine'];
/** List fields: an item that still fails after the repair is dropped. */
const LIST_FIELDS: readonly string[] = ['trustBarItems', 'serviceItems', 'faqItems'];

export class AdsLandingCopyGateError extends Error {
  constructor(readonly hits: GateViolation[]) {
    super(`Ads landing copy failed the truth gates after one repair: ${hits.map(hit => `${hit.field}:${hit.rule}`).join(', ')}`);
    this.name = 'AdsLandingCopyGateError';
  }
}

export interface AdsLandingCopyDependencies {
  /** Qwen JSON call (primary). Unset = Qwen not configured. */
  callQwen?: LpJsonCaller;
  /** Gemini JSON call (fallback when a Qwen call fails, or the only provider when Qwen is not configured). */
  callGemini?: LpJsonCaller;
  onEvent?: (event: { kind: string; [key: string]: unknown }) => void;
}

export interface AdsLandingCopyResult {
  copy: LPCopy;
  /** Provider per call, in order (e.g. ['qwen', 'qwen'] or ['qwen', 'gemini:fallback']). */
  providers: string[];
  firstHits: GateViolation[];
  repairs: number;
  /** Field paths nulled or dropped after the repair. */
  dropped: string[];
}

function topField(field: string): string {
  return field.split(/[.[]/)[0];
}

/** The truth-gate hits of an LP copy object. */
export function adsLandingTruthHits(copy: Record<string, unknown>, ctx: CopyGateContext): GateViolation[] {
  // On the Ads landing page the FAQ is model-written (on research sites it is system-filled, so the gates exempt faqItems):
  // it is gated under a stand-in key and the hits are mapped back to faqItems.
  const { faqItems, ...rest } = copy;
  const gated = runCopyGates({ ...rest, ...(Array.isArray(faqItems) ? { [LP_FAQ_GATE_KEY]: faqItems } : {}) }, ctx);
  return gated.filter(hit => ADS_TRUTH_RULES.includes(hit.rule)).map(hit => (hit.field.startsWith(LP_FAQ_GATE_KEY) ? { ...hit, field: `faqItems${hit.field.slice(LP_FAQ_GATE_KEY.length)}` } : hit));
}
const LP_FAQ_GATE_KEY = 'lpFaqItems';

/** The system-owned values the model never decides: the guarantee block without a guarantee, and the verbatim review quote. */
export function withAdsLandingSystemFields(copy: LPCopy, data: CollectedData): LPCopy {
  const next: LPCopy = { ...copy };
  if (!ownerHasGuarantee(data)) next.guaranteeBlock = null;
  next.reviewFeatured = hasRealReviewQuote(data) ? data.reviewQuote ?? null : null;
  if (next.reviewFeatured === null) next.reviewContext = null;
  next.scarcityLine = null;
  return next;
}

export function ownerHasGuarantee(data: CollectedData): boolean {
  return typeof data.guarantee === 'string' && data.guarantee.trim().length > 0;
}

async function call(deps: AdsLandingCopyDependencies, providers: string[], system: string, user: string): Promise<string> {
  if (deps.callQwen) {
    try {
      const raw = await deps.callQwen(system, user);
      JSON.parse(raw);
      providers.push('qwen');
      return raw;
    } catch (error) {
      deps.onEvent?.({ kind: 'qwen_failed', message: String((error as Error)?.message ?? error).slice(0, 200) });
      if (!deps.callGemini) throw error;
      const raw = await deps.callGemini(system, user);
      providers.push('gemini:fallback');
      return raw;
    }
  }
  if (!deps.callGemini) throw new Error('No LLM provider configured for the Ads landing page');
  const raw = await deps.callGemini(system, user);
  providers.push('gemini');
  return raw;
}

/** Drop what still fails: a nullable field becomes null, a list item goes; anything else is returned as unfixable. */
function dropFailing(copy: LPCopy, hits: GateViolation[]): { copy: LPCopy; dropped: string[]; unfixable: GateViolation[] } {
  const next: Record<string, unknown> = { ...copy };
  const dropped: string[] = [];
  const unfixable: GateViolation[] = [];
  const listDrops = new Map<string, Set<number>>();
  for (const hit of hits) {
    const top = topField(hit.field);
    const index = /^\w+\[(\d+)\]/.exec(hit.field)?.[1];
    if (NULLABLE_FIELDS.includes(top)) { if (next[top] !== null) { next[top] = null; dropped.push(top); } continue; }
    if (LIST_FIELDS.includes(top) && index !== undefined) { listDrops.set(top, (listDrops.get(top) ?? new Set()).add(Number(index))); continue; }
    unfixable.push(hit);
  }
  for (const [field, indices] of listDrops) {
    const list = Array.isArray(next[field]) ? next[field] as unknown[] : [];
    next[field] = list.filter((_, index) => !indices.has(index));
    for (const index of indices) dropped.push(`${field}[${index}]`);
  }
  return { copy: next as unknown as LPCopy, dropped, unfixable };
}

/** Tamar -> Noa -> system fields -> truth gates -> one repair -> drop / throw. */
export async function generateAdsLandingCopy(data: CollectedData, deps: AdsLandingCopyDependencies): Promise<AdsLandingCopyResult> {
  const providers: string[] = [];
  const prompt = buildLpCopyPrompt(data, { nullGuarantee: !ownerHasGuarantee(data) });
  const tamar = JSON.parse(await call(deps, providers, LP_COPY_SYSTEM_PROMPT, prompt)) as LPCopy;
  let copy: LPCopy = tamar;
  // Noa is fail-soft (a polish step never fails the page).
  try {
    copy = JSON.parse(await call(deps, providers, NOA_LP_QA_PROMPT, JSON.stringify(tamar))) as LPCopy;
  } catch (error) {
    deps.onEvent?.({ kind: 'noa_failed', message: String((error as Error)?.message ?? error).slice(0, 200) });
  }
  copy = withAdsLandingSystemFields(copy, data);
  const ctx = adsGateContext(data);
  const firstHits = adsLandingTruthHits(copy as unknown as Record<string, unknown>, ctx);
  let repairs = 0;
  let hits = firstHits;
  if (hits.length) {
    const fields = [...new Set(hits.map(hit => topField(hit.field)))];
    const user = `FIELDS TO REPAIR (rewrite each listed key; keep its job and its limit):\n${hits.map(hit => `- ${describeGateViolation(hit, ctx)}`).join('\n')}\n\nCURRENT VALUES:\n${JSON.stringify(Object.fromEntries(fields.map(field => [field, (copy as unknown as Record<string, unknown>)[field]])))}\n\nBUSINESS DATA (the only facts you may use):\n${JSON.stringify(Object.fromEntries(Object.entries(data).filter(([, value]) => typeof value === 'string' && value.trim())))}\n\nReturn only {${fields.map(field => `"${field}": ...`).join(', ')}}.`;
    try {
      repairs++;
      const patch = JSON.parse(await call(deps, providers, LP_REPAIR_SYSTEM_PROMPT, user)) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...copy };
      for (const field of fields) if (Object.prototype.hasOwnProperty.call(patch, field)) merged[field] = patch[field];
      copy = withAdsLandingSystemFields(merged as unknown as LPCopy, data);
    } catch (error) {
      deps.onEvent?.({ kind: 'repair_failed', message: String((error as Error)?.message ?? error).slice(0, 200) });
    }
    hits = adsLandingTruthHits(copy as unknown as Record<string, unknown>, ctx);
  }
  const settled = dropFailing(copy, hits);
  if (settled.unfixable.length) throw new AdsLandingCopyGateError(settled.unfixable);
  return { copy: settled.copy, providers, firstHits, repairs, dropped: settled.dropped };
}
