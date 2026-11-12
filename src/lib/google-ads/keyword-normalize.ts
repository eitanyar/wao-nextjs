/**
 * Keyword normalisation for campaign creation (Dror's create-campaign triage, fix 3, 2026-11-12).
 *
 * The strategist model returns keywords in display notation: `[x]` for exact, `"x"` for phrase,
 * bare text otherwise (DROR_SYSTEM_PROMPT rule 10). Google rejects those symbols inside
 * keyword text, so this turns each entry into plain text plus a match type:
 *   - `[x]`  → EXACT
 *   - `"x"`  → PHRASE (straight or curly quotes, and the Hebrew gershayim)
 *   - bare   → PHRASE. Never BROAD from a cold start: broad needs conversion volume + Smart Bidding.
 * `+` (the retired Broad Match Modifier) and stray symbols are stripped, whitespace is
 * collapsed, empties are rejected and duplicates (same text + match type) are dropped.
 *
 * Pure: no network, no Google Ads SDK. HEBREW-SAFETY: this module contains ZERO Hebrew bytes
 * (the Hebrew negative lists live in default-negatives.ts).
 */

import { DEFAULT_GENERIC_NEGATIVES, NEVER_BLOCK_NEGATIVES, isNeverBlockNegative } from './default-negatives';
import { PREFIX_LETTERS } from '../lp/hebrewPrefixLetters';

export type NormalizedMatchType = 'EXACT' | 'PHRASE';

/**
 * Every ad-group negative is sent as PHRASE match: a multi-word negative ("download free")
 * blocks only that phrase in order, never each word on its own. Was BROAD before 2026-11-12.
 */
export const NEGATIVE_MATCH_TYPE = 'PHRASE' as const;

export interface NormalizedKeyword {
  text: string;
  matchType: NormalizedMatchType;
}

/** Quote characters that mark phrase match: ASCII ", curly U+201C/U+201D, Hebrew gershayim U+05F4. */
const QUOTE_CHARS = '"\u201C\u201D\u05F4';
const WRAPPED_EXACT = /^\[([\s\S]*)\]$/;
const WRAPPED_PHRASE = new RegExp(`^[${QUOTE_CHARS}]([\\s\\S]*)[${QUOTE_CHARS}]$`);
/**
 * Anything that is not a letter, a combining mark (niqqud), a digit, whitespace, an
 * apostrophe/geresh, a gershayim or an inner hyphen is a symbol Google would reject or mis-read.
 * The apostrophe/geresh stays because it is part of Hebrew transliterations.
 */
const STRAY_SYMBOLS = /[^\p{L}\p{M}\p{N}\s'\u05F3\u05F4\-]/gu;

/** Normalises one keyword entry, or returns null when nothing usable is left. */
export function normalizeKeyword(raw: unknown): NormalizedKeyword | null {
  if (typeof raw !== 'string') return null;
  let text = raw.normalize('NFC').trim();
  let matchType: NormalizedMatchType = 'PHRASE';

  const exact = text.match(WRAPPED_EXACT);
  const phrase = exact ? null : text.match(WRAPPED_PHRASE);
  if (exact) {
    matchType = 'EXACT';
    text = exact[1];
  } else if (phrase) {
    text = phrase[1];
  }

  text = text
    // An inner quote between two letters is a Hebrew abbreviation mark (gershayim), not phrase
    // notation: keep it as U+05F4 so abbreviations survive instead of splitting into two words.
    .replace(/(?<=\p{L})["\u201C\u201D\u05F4](?=\p{L})/gu, '\u05F4')
    .replace(STRAY_SYMBOLS, ' ')
    .replace(/(^|\s)-+|-+(?=\s|$)/g, ' ') // a hyphen only survives between two word characters
    .replace(/\s+/g, ' ')
    .trim();

  if (!text || !/[\p{L}\p{N}]/u.test(text)) return null;
  return { text, matchType };
}

/** Normalises a list: drops empties and duplicates (case-insensitive text + match type), keeps first-seen order. */
export function normalizeKeywords(raw: unknown): NormalizedKeyword[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: NormalizedKeyword[] = [];
  for (const entry of raw) {
    const normalized = normalizeKeyword(entry);
    if (!normalized) continue;
    const key = `${normalized.matchType}|${normalized.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

/**
 * Negative keywords: same cleaning, but the display notation decides nothing here, the
 * caller sends them as ad-group negatives with NEGATIVE_MATCH_TYPE. Returns plain, deduped
 * texts, and drops the never-block words (bare "free", see default-negatives.ts) even when the
 * strategy model emits them.
 */
export function normalizeNegativeKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const normalized = normalizeKeyword(entry);
    if (!normalized) continue;
    if (isNeverBlockNegative(normalized.text)) continue;
    const key = normalized.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized.text);
  }
  return out;
}

export interface CampaignStrategyInput {
  keywords?: unknown;
  negativeKeywords?: unknown;
  suggestedDailyBudget?: unknown;
}

export type StrategyValidation =
  | { ok: true; keywords: NormalizedKeyword[]; negativeKeywords: string[]; dailyBudgetIls: number }
  | { ok: false; error: string };

/**
 * Validates the strategy before any Google Ads write (fix 3): at least one usable keyword and a
 * positive, finite daily budget. Negatives default to [] (the bot's fallback strategy has none).
 */
export function validateCampaignStrategy(strategy: CampaignStrategyInput | null | undefined): StrategyValidation {
  if (!strategy || typeof strategy !== 'object') return { ok: false, error: 'strategy is required' };
  const keywords = normalizeKeywords(strategy.keywords);
  if (!keywords.length) return { ok: false, error: 'strategy.keywords has no usable keyword' };
  const dailyBudgetIls = Number(strategy.suggestedDailyBudget);
  if (!Number.isFinite(dailyBudgetIls) || dailyBudgetIls <= 0) {
    return { ok: false, error: 'strategy.suggestedDailyBudget must be a positive number' };
  }
  return { ok: true, keywords, negativeKeywords: normalizeNegativeKeywords(strategy.negativeKeywords ?? []), dailyBudgetIls };
}

// ── Day-one defaults + conflict guard (Adam's fallback decision + Dror's guard, 2026-11-12) ──

/** Final-form letters (kaf, mem, nun, pe, tsadi) -> their regular form, so inflections compare. */
const FINAL_FORMS: Record<string, string> = {
  '\u05DA': '\u05DB',
  '\u05DD': '\u05DE',
  '\u05DF': '\u05E0',
  '\u05E3': '\u05E4',
  '\u05E5': '\u05E6',
};

/** Inflection endings, in regular form: plural masc / plural fem / he / tav / yod. */
const INFLECTION_SUFFIXES = ['\u05D9\u05DE', '\u05D5\u05EA', '\u05D4', '\u05EA', '\u05D9'];

const MIN_STEM = 3;

function wordForm(word: string): string {
  return word
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[\u05DA\u05DD\u05DF\u05E3\u05E5]/g, (c) => FINAL_FORMS[c] ?? c);
}

/** The word plus its forms with one or two attached prefix letters removed (stem kept >= 3 letters). */
function wordVariants(word: string): string[] {
  const w = wordForm(word);
  const out = [w];
  let cur = w;
  for (let i = 0; i < 2; i++) {
    if (cur.length - 1 < MIN_STEM || !PREFIX_LETTERS.includes(cur[0])) break;
    cur = cur.slice(1);
    out.push(cur);
  }
  return out;
}

function sameWordForm(a: string, b: string): boolean {
  const va = wordVariants(a);
  const vb = wordVariants(b);
  for (const x of va) {
    for (const y of vb) {
      if (x === y) return true;
      const [short, long] = x.length <= y.length ? [x, y] : [y, x];
      if (short.length >= MIN_STEM && long.startsWith(short) && INFLECTION_SUFFIXES.includes(long.slice(short.length))) return true;
    }
  }
  return false;
}

function words(text: string): string[] {
  return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/**
 * True when a default negative would block the campaign's own trade: one of its content words
 * (the never-block free words excluded, they are the "free-intent" half of a phrase) has the
 * same word form as a word in a positive keyword, the niche or the primary service. Word-level,
 * not substring: a negative word inside an unrelated longer word is not a collision.
 */
export function negativeCollidesWithPositives(negative: string, positives: readonly string[]): boolean {
  const freeWords = NEVER_BLOCK_NEGATIVES.map(wordForm);
  const negWords = words(negative).filter((w) => !freeWords.includes(wordForm(w)));
  const posWords = positives.flatMap((p) => (typeof p === 'string' ? words(p) : []));
  return negWords.some((n) => posWords.some((p) => sameWordForm(n, p)));
}

export interface CampaignNegativesResult {
  /** What is sent as ad-group negatives (PHRASE): strategy negatives first, then the kept defaults. */
  negatives: string[];
  /** Defaults dropped because they collide with the campaign's own keywords / niche / service. */
  droppedDefaults: string[];
}

/**
 * Every new campaign starts with DEFAULT_GENERIC_NEGATIVES merged into its strategy negatives,
 * even when the AI strategy call failed and the fallback strategy has none. Deduped and
 * normalized (bare "free" still dropped). Defaults that collide with the campaign's own
 * positives (e.g. a driving instructor's niche word) are dropped and reported, never sent.
 */
export function buildCampaignNegatives(params: {
  strategyNegatives: readonly string[];
  positiveKeywords: readonly string[];
  niche?: string | null;
  primaryService?: string | null;
}): CampaignNegativesResult {
  const positives = [...params.positiveKeywords, params.niche ?? '', params.primaryService ?? ''].filter(Boolean);
  const droppedDefaults: string[] = [];
  const keptDefaults: string[] = [];
  for (const neg of DEFAULT_GENERIC_NEGATIVES) {
    if (negativeCollidesWithPositives(neg, positives)) droppedDefaults.push(neg);
    else keptDefaults.push(neg);
  }
  return { negatives: normalizeNegativeKeywords([...params.strategyNegatives, ...keptDefaults]), droppedDefaults };
}
