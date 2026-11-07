/**
 * Deterministic copy gates for research-bound site copy (paid-journey v2 M2a.1, A1-A5).
 *
 * Gates only DETECT. They never edit Hebrew: a hit becomes a CopyViolation that the
 * repair loop sends back to the model; a page still failing after the repair budget
 * fails. The token data lives in copyGates.config.ts (byte-exact reviewer examples).
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import type { CollectedData } from '../bot/prompts';
import {
  CLAIM_RULES,
  PLURAL_ADDRESS_TOKENS,
  QUOTE_OVERLAP_MIN_CHARS,
  WAO_SERVICE_TERMS_HE,
  WAO_SERVICE_TERMS_LATIN,
  WE_FORM_TOKENS,
  type GateToken,
} from './copyGates.config';

export const GATE_RULES = {
  plural: 'gate_plural_address',
  we: 'gate_we_form',
  asciiQuote: 'gate_ascii_quote',
  unconfirmedService: 'gate_unconfirmed_service',
  claim: 'gate_unsupported_claim',
  waoOffer: 'gate_wao_offer',
  quoteOverlap: 'gate_quote_overlap',
  reviewContext: 'gate_review_context_unsupported',
} as const;
export type GateRule = (typeof GATE_RULES)[keyof typeof GATE_RULES];

export interface GateViolation {
  field: string;
  rule: GateRule;
  /** Config entry id or token index (never copy text): e.g. "plural:4", "claim:warranty". */
  actual?: string;
}

export interface CopyGateContext {
  /** Solo-operator site: first-person plural ("we") forms are rejected. */
  soloOperator: boolean;
  /** Owner-confirmed service names, as displayed. Empty = service gate off. */
  serviceLabels: readonly string[];
  /** All owner-supplied facts, concatenated (authorises claims). */
  ownerFactsText: string;
  /** Owner fields consulted by CLAIM_RULES[].ownerFields. */
  ownerFields: Partial<Record<string, unknown>>;
  /** The owner's verbatim customer quote, if any. */
  reviewQuote: string | null;
  /** Star rating supplied by the owner, if any (authorises a reviewContext). */
  starRating: string | null;
}

const HEBREW_LETTER = '\u05D0-\u05EA';
const HEBREW = new RegExp(`[${HEBREW_LETTER}]`);
// vav, shin, he, bet, kaf, lamed, mem: the attachable prefix letters.
const PREFIX_LETTERS = '\u05D5\u05E9\u05D4\u05D1\u05DB\u05DC\u05DE';

/** Fields the system fills (never model-authored) are exempt from text gates. */
export const GATE_EXEMPT_FIELDS: readonly string[] = ['heroCta', 'serviceItems', 'reviewFeatured', 'faqItems', 'scarcityLine'];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function tokenPattern(entry: GateToken): RegExp {
  const prefix = entry.allowPrefix ? `[${PREFIX_LETTERS}]{0,2}` : '';
  return new RegExp(`(?<![${HEBREW_LETTER}])${prefix}${escapeRegExp(entry.token)}(?![${HEBREW_LETTER}])`, 'u');
}

const PLURAL_PATTERNS = PLURAL_ADDRESS_TOKENS.map(tokenPattern);
const WE_PATTERNS = WE_FORM_TOKENS.map(tokenPattern);
const LATIN_WAO_PATTERNS = WAO_SERVICE_TERMS_LATIN.map(term => new RegExp(`(?<![A-Za-z])${escapeRegExp(term)}(?![A-Za-z])`, 'i'));

/** Every gated (model-authored) string in a copy object, with its field path. */
export function gatedStrings(copy: Record<string, unknown>): Array<{ field: string; value: string }> {
  const out: Array<{ field: string; value: string }> = [];
  for (const [key, value] of Object.entries(copy)) {
    if (GATE_EXEMPT_FIELDS.includes(key)) continue;
    if (typeof value === 'string') out.push({ field: key, value });
    else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string') out.push({ field: `${key}[${index}]`, value: item });
        else if (item && typeof item === 'object') {
          for (const [inner, innerValue] of Object.entries(item as Record<string, unknown>)) {
            if (typeof innerValue === 'string') out.push({ field: `${key}[${index}].${inner}`, value: innerValue });
          }
        }
      });
    }
  }
  return out;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Length of the longest common substring (whitespace-normalised). */
export function longestCommonSubstring(a: string, b: string): number {
  const x = normalizeSpace(a);
  const y = normalizeSpace(b);
  if (!x || !y) return 0;
  let best = 0;
  let previous = new Array<number>(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const current = new Array<number>(y.length + 1).fill(0);
    for (let j = 1; j <= y.length; j++) {
      if (x[i - 1] === y[j - 1]) {
        current[j] = previous[j - 1] + 1;
        if (current[j] > best) best = current[j];
      }
    }
    previous = current;
  }
  return best;
}

function claimAuthorised(ruleIndex: number, ctx: CopyGateContext): boolean {
  const rule = CLAIM_RULES[ruleIndex];
  if (rule.ownerFields.some(field => {
    const value = ctx.ownerFields[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  })) return true;
  const facts = ctx.ownerFactsText.toLowerCase();
  if (rule.ownerKeywords.some(keyword => facts.includes(keyword.toLowerCase()))) return true;
  return rule.tokens.some(token => ctx.ownerFactsText.includes(token));
}

/** Run every gate. Returns violations (field paths + rule + config id), never copy text. */
export function runCopyGates(copy: Record<string, unknown>, ctx: CopyGateContext): GateViolation[] {
  const out: GateViolation[] = [];
  const strings = gatedStrings(copy);
  const authorised = CLAIM_RULES.map((_, index) => claimAuthorised(index, ctx));
  const quote = ctx.reviewQuote ? normalizeSpace(ctx.reviewQuote) : '';

  for (const { field, value } of strings) {
    PLURAL_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(value)) out.push({ field, rule: GATE_RULES.plural, actual: `plural:${index}` });
    });
    if (ctx.soloOperator) {
      WE_PATTERNS.forEach((pattern, index) => {
        if (pattern.test(value)) out.push({ field, rule: GATE_RULES.we, actual: `we:${index}` });
      });
    }
    if (HEBREW.test(value) && /["']/.test(value)) out.push({ field, rule: GATE_RULES.asciiQuote });
    CLAIM_RULES.forEach((rule, index) => {
      if (!authorised[index] && rule.tokens.some(token => value.includes(token))) {
        out.push({ field, rule: GATE_RULES.claim, actual: `claim:${rule.id}` });
      }
    });
    WAO_SERVICE_TERMS_HE.forEach((term, index) => {
      if (value.includes(term)) out.push({ field, rule: GATE_RULES.waoOffer, actual: `wao_he:${index}` });
    });
    LATIN_WAO_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(value)) out.push({ field, rule: GATE_RULES.waoOffer, actual: `wao_latin:${index}` });
    });
    if (quote.length >= QUOTE_OVERLAP_MIN_CHARS && longestCommonSubstring(value, quote) >= QUOTE_OVERLAP_MIN_CHARS) {
      out.push({ field, rule: GATE_RULES.quoteOverlap });
    }
  }

  // Unconfirmed services: every serviceItems / serviceDetails[].name entry must be an owner-confirmed name.
  if (ctx.serviceLabels.length) {
    const allowed = new Set(ctx.serviceLabels.map(normalizeSpace));
    const items = copy.serviceItems;
    if (Array.isArray(items)) items.forEach((item, index) => {
      if (typeof item !== 'string' || !allowed.has(normalizeSpace(item))) out.push({ field: `serviceItems[${index}]`, rule: GATE_RULES.unconfirmedService });
    });
    const details = copy.serviceDetails;
    if (Array.isArray(details)) details.forEach((item, index) => {
      const name = item && typeof item === 'object' ? (item as Record<string, unknown>).name : undefined;
      if (typeof name !== 'string' || !allowed.has(normalizeSpace(name))) out.push({ field: `serviceDetails[${index}].name`, rule: GATE_RULES.unconfirmedService });
    });
  }

  // A review context is only supportable from an owner-supplied star rating.
  if (typeof copy.reviewContext === 'string' && !ctx.starRating) out.push({ field: 'reviewContext', rule: GATE_RULES.reviewContext });
  return out;
}

/** Build the gate context from owner data plus the page's confirmed service names. */
export function copyGateContext(data: CollectedData, serviceLabels: readonly string[], soloOperator = true): CopyGateContext {
  const facts = Object.values(data).flatMap(value => (typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []));
  const quote = typeof data.reviewQuote === 'string' && data.reviewQuote.trim() ? data.reviewQuote.trim() : null;
  const star = typeof data.starRating === 'string' && data.starRating.trim() ? data.starRating.trim() : null;
  return {
    soloOperator,
    serviceLabels,
    ownerFactsText: facts.join('\n'),
    ownerFields: data as Partial<Record<string, unknown>>,
    reviewQuote: quote,
    starRating: star,
  };
}

/** English guidance for one gate hit, used in the repair prompt (token data from config, no copy text). */
export function describeGateViolation(violation: GateViolation, ctx: CopyGateContext): string {
  const index = Number((violation.actual ?? '').split(':')[1]);
  switch (violation.rule) {
    case GATE_RULES.plural:
      return `${violation.field} uses plural / second-person-plural address (form: ${PLURAL_ADDRESS_TOKENS[index]?.token ?? 'plural'}); rewrite in singular masculine address`;
    case GATE_RULES.we:
      return `${violation.field} uses a first-person plural form (${WE_FORM_TOKENS[index]?.token ?? 'we'}); this is a solo operator, write in first-person singular`;
    case GATE_RULES.asciiQuote:
      return `${violation.field} contains an ASCII quote mark (" or ') inside Hebrew; use gershayim (\u05F4) or geresh (\u05F3) instead`;
    case GATE_RULES.unconfirmedService:
      return `${violation.field} is not an owner-confirmed service; use exactly one of: ${ctx.serviceLabels.join(' / ')}`;
    case GATE_RULES.claim: {
      const id = (violation.actual ?? '').split(':')[1];
      return `${violation.field} makes a "${id}" claim that is not in the owner facts; remove that claim entirely`;
    }
    case GATE_RULES.waoOffer:
      return `${violation.field} mentions a marketing / copywriting service that this business does not offer; remove it`;
    case GATE_RULES.quoteOverlap:
      return `${violation.field} repeats the customer quote; the quote may appear only in reviewFeatured, so rewrite this field without it`;
    case GATE_RULES.reviewContext:
      return `${violation.field} has no owner-supplied star rating to rest on; set it to null`;
    default:
      return `${violation.field}: ${violation.rule}`;
  }
}
