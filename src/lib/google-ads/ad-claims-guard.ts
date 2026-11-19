// Deterministic guard on Ads Bot ad copy (headlines + descriptions) before the owner sees it.
// Standing rule: no invented facts or results in anything WAO shows a customer. A line that states a
// response time, 24/7, a percentage, a free offer, a licence, years of experience, a guarantee or a
// price is dropped unless the owner supplied that fact (structured field, or his own words matching
// the same pattern). Short sets are topped up from the deterministic template ad, itself guarded.
//
// HEBREW-SAFETY: the TOKENS values were byte-copied by script from existing template strings in
// src/app/api/bot/route.ts (generateMockCampaign / generateFallbackStrategyAndCopy). Never retype them.
import type { CollectedData } from "@/lib/bot/prompts";

const TOKENS = {
  minutes: "דקות",
  hours: "שעות",
  yearsOf: "שנות",
  free: "חינם",
  licensed: "מוסמך",
  guarantee: "אחריות",
  price: "מחיר",
} as const;

/** Exported for tests, so test files can build claim lines without containing Hebrew. */
export const CLAIM_TOKENS = TOKENS;

type FactField = keyof CollectedData;

interface ClaimRule {
  id: string;
  pattern: RegExp;
  /** Structured owner facts that back the claim when non-empty. */
  facts: FactField[];
}

export const CLAIM_RULES: readonly ClaimRule[] = [
  { id: "duration", pattern: new RegExp(`\\d+\\s*(?:${TOKENS.minutes}|${TOKENS.hours})`), facts: ["responseTime", "businessHours"] },
  { id: "around_the_clock", pattern: /24\s*\/\s*7/, facts: ["businessHours"] },
  { id: "years", pattern: new RegExp(`\\d+\\s*${TOKENS.yearsOf}`), facts: ["yearsInField"] },
  { id: "percent", pattern: /%/, facts: [] },
  { id: "free", pattern: new RegExp(TOKENS.free), facts: ["pricingPromises"] },
  { id: "licensed", pattern: new RegExp(TOKENS.licensed), facts: ["license"] },
  { id: "guarantee", pattern: new RegExp(TOKENS.guarantee), facts: ["guarantee"] },
  { id: "price", pattern: new RegExp(`${TOKENS.price}|₪`), facts: ["pricingNotes", "startingPrices", "calloutFee"] },
];

/** The owner's own free-text answers: a claim he wrote himself is backed by definition. */
const OWNER_TEXT_FIELDS: FactField[] = [
  "usp", "guarantee", "yearsInField", "license", "responseTime", "pricingNotes", "businessHours", "surchargePolicy",
];

function present(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function ownerText(data: CollectedData): string {
  return OWNER_TEXT_FIELDS.map((field) => data[field]).filter((v): v is string => typeof v === "string").join("\n");
}

/** Ids of the rules a line breaks without an owner fact behind it (empty = the line is safe). */
export function unbackedClaims(line: string, data: CollectedData): string[] {
  const own = ownerText(data);
  return CLAIM_RULES
    .filter((rule) => rule.pattern.test(line))
    .filter((rule) => !rule.facts.some((field) => present(data[field])) && !rule.pattern.test(own))
    .map((rule) => rule.id);
}

export const MIN_HEADLINES = 3;
export const MIN_DESCRIPTIONS = 2;
const MAX_HEADLINE_CHARS = 30;

export interface AdCopyLike {
  headlines?: unknown;
  descriptions?: unknown;
  [key: string]: unknown;
}

export interface TemplateAd {
  copy: { headlines: string[]; descriptions: string[] };
  /** Positive keywords; used as last-resort headline fillers (they are the service + area, nothing claimed). */
  keywords?: string[];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];
}

function topUp(kept: string[], candidates: string[], min: number, data: CollectedData, maxChars?: number): string[] {
  const out = [...kept];
  for (const line of candidates) {
    if (out.length >= min) break;
    if (out.includes(line)) continue;
    if (maxChars && line.length > maxChars) continue;
    if (unbackedClaims(line, data).length) continue;
    out.push(line);
  }
  return out;
}

/**
 * Drops unbacked-claim lines from specialist (or template) copy, then tops up to the RSA minimums
 * from the guarded template ad. Returns a new copy object; other fields are kept as they were.
 */
export function guardAdCopy<T extends AdCopyLike>(copy: T, data: CollectedData, template?: TemplateAd): T & { headlines: string[]; descriptions: string[] } {
  const safe = (lines: string[]) => lines.filter((line) => unbackedClaims(line, data).length === 0);
  let headlines = safe(strings(copy.headlines));
  let descriptions = safe(strings(copy.descriptions));
  if (template) {
    headlines = topUp(headlines, template.copy.headlines, MIN_HEADLINES, data, MAX_HEADLINE_CHARS);
    headlines = topUp(headlines, template.keywords ?? [], MIN_HEADLINES, data, MAX_HEADLINE_CHARS);
    descriptions = topUp(descriptions, template.copy.descriptions, MIN_DESCRIPTIONS, data);
  }
  return { ...copy, headlines, descriptions };
}
