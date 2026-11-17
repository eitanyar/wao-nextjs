/**
 * Site Bot logo marks (Eitan approved the per-trade picks 2026-11-17): the approved, traced trade marks, the trade detector
 * that decides whether a site gets one, the deterministic per-site pick, and the colour rule that keeps the mark legible on
 * the header bar.
 *
 *   - Library: src/lib/lp/logoMarks/marks.generated.json, built from logoMarks/svg/ by scripts/build-logo-marks.mjs (only
 *     the ids in approved-picks-2026-11-17.json; the build fails on a missing one). Server-side only: a site's HTML inlines
 *     the one chosen mark, the library never ships to a browser.
 *   - Trade detection, confident-or-nothing: every trade term (logoMarks/trade-terms.generated.json, copied by script from
 *     the GBP taxonomy, the market-scanner professions and the licensed-trades copy) is matched as a whole word (one
 *     attached prefix letter allowed; terms of 4+ letters may carry up to 3 inflection letters). A match inside a longer
 *     match of another trade is dropped; a match overlapping an exclusion span (e.g. car-electrician, AC gas refill) is
 *     dropped unless it covers that span whole. Exactly one trade left = that trade; none or several = no mark. The niche
 *     decides; the primary service is read only when the niche names no trade at all.
 *   - Pick: a stored, approved mark id wins; else FNV-1a(site id) over the trade's approved list, in the approved order.
 *   - Colours (WCAG 1.4.11): the mark's primary and accent ink must reach 3:1 against the header surface; short of that the
 *     ink is darkened in HSL lightness (same hue and saturation) until it does; the last resort is near-black ink. The
 *     paper (the mark's negative space) is the surface itself. The background is never changed.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (the terms live in the generated JSON, copied by script).
 */

import approvedPicks from './logoMarks/approved-picks-2026-11-17.json';
import generatedMarks from './logoMarks/marks.generated.json';
import tradeTerms from './logoMarks/trade-terms.generated.json';
import { PREFIX_LETTERS } from './hebrewPrefixLetters';

// ─────────────────────────────────────────────────────────────────────────
// Library
// ─────────────────────────────────────────────────────────────────────────

export type LogoTrade = keyof typeof approvedPicks.trades;
export const LOGO_TRADES = Object.keys(approvedPicks.trades) as LogoTrade[];

/** Trade -> approved mark ids, in the approved order (the pick order). */
export const APPROVED_MARK_IDS: Readonly<Record<LogoTrade, readonly string[]>> = approvedPicks.trades;

export interface LogoMark {
  trade: LogoTrade;
  /** viewBox of `body` (the traced SVG's own). */
  viewBox: string;
  /** Inner SVG; paints with var(--mark-primary) / var(--mark-accent) / var(--mark-paper). */
  body: string;
}

const MARK_OWNER = new Map<string, LogoTrade>(LOGO_TRADES.flatMap(trade => APPROVED_MARK_IDS[trade].map(id => [id, trade] as const)));
const MARK_DATA = generatedMarks.marks as Record<string, { viewBox: string; body: string }>;

/** The approved marks, keyed by approved mark id ('plumber-3'). Only approved ids are ever keys. */
export const LOGO_MARK_LIBRARY: Readonly<Record<string, LogoMark>> = Object.freeze(Object.fromEntries(
  [...MARK_OWNER].map(([id, trade]) => {
    const data = MARK_DATA[id];
    if (!data) throw new Error(`logo mark ${id} is approved but not built (run node scripts/build-logo-marks.mjs)`);
    return [id, { trade, viewBox: data.viewBox, body: data.body }];
  }),
));

/** A stored mark id as an approved id: bare ('plumber-3') or the legacy '<group>:<id>' form; anything else = null. */
export function approvedMarkId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.includes(':') ? value.slice(value.lastIndexOf(':') + 1) : value;
  return MARK_OWNER.has(id) ? id : null;
}

export function markAspect(mark: Pick<LogoMark, 'viewBox'>): number {
  const [, , width, height] = mark.viewBox.split(' ').map(Number);
  return width / height;
}

// ─────────────────────────────────────────────────────────────────────────
// Trade detection
// ─────────────────────────────────────────────────────────────────────────

interface TermEntry { term: string; source: string }
const TERMS = tradeTerms.trades as Record<LogoTrade, TermEntry[]>;
const EXCLUDES = (tradeTerms.excludes as TermEntry[]).map(entry => entry.term);

const LETTER = '\u05D0-\u05EAA-Za-z';
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

function termPattern(term: string): RegExp {
  const letters = [...term].filter(ch => /[\u05D0-\u05EA]/.test(ch)).length;
  const suffix = letters >= 4 ? '[\u05D0-\u05EA]{0,3}' : '';
  return new RegExp(`(?<![${LETTER}])[${PREFIX_LETTERS}]?(${escapeRegExp(normalise(term))})${suffix}(?![${LETTER}])`, 'gu');
}

const TRADE_PATTERNS: Array<{ trade: LogoTrade; pattern: RegExp }> = LOGO_TRADES.flatMap(trade =>
  TERMS[trade].map(entry => ({ trade, pattern: termPattern(entry.term) })));

interface Span { trade: LogoTrade; start: number; end: number }

function excludedSpans(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  for (const term of EXCLUDES) {
    const needle = normalise(term);
    for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) spans.push({ start: at, end: at + needle.length });
  }
  return spans;
}

/** The trade's detection terms (copied by script from the repo sources; read-only). */
export function tradeTermsOf(trade: LogoTrade): string[] {
  return (TERMS[trade] ?? []).map(entry => entry.term);
}

/** Every trade a text names after subsumption and exclusions (sorted, unique). */
export function tradesNamedIn(text: string | undefined): LogoTrade[] {
  const clean = normalise(text ?? '');
  if (!clean) return [];
  const spans: Span[] = [];
  for (const { trade, pattern } of TRADE_PATTERNS) {
    pattern.lastIndex = 0;
    for (let match = pattern.exec(clean); match; match = pattern.exec(clean)) {
      const start = match.index + match[0].indexOf(match[1]);
      spans.push({ trade, start, end: match.index + match[0].length });
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
  }
  const excluded = excludedSpans(clean);
  const kept = spans.filter(span =>
    !spans.some(other => other.trade !== span.trade && other.start <= span.start && other.end >= span.end && other.end - other.start > span.end - span.start)
    && !excluded.some(ex => span.start < ex.end && ex.start < span.end && !(span.start <= ex.start && span.end >= ex.end)));
  return [...new Set(kept.map(span => span.trade))].sort();
}

/** The one trade a text names, or null (none or several: confident-or-nothing). */
export function detectLogoTrade(text: string | undefined): LogoTrade | null {
  const trades = tradesNamedIn(text);
  return trades.length === 1 ? trades[0] : null;
}

/** The site's trade: from the niche; from the primary service only when the niche names no trade at all. */
export function logoTradeOf(context: { businessNiche?: string; primaryService?: string }): LogoTrade | null {
  const fromNiche = tradesNamedIn(context.businessNiche);
  if (fromNiche.length) return fromNiche.length === 1 ? fromNiche[0] : null;
  return detectLogoTrade(context.primaryService);
}

// ─────────────────────────────────────────────────────────────────────────
// Pick
// ─────────────────────────────────────────────────────────────────────────

/** FNV-1a 32-bit over the UTF-16 code units (stable across runtimes). */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let k = 0; k < value.length; k++) {
    hash ^= value.charCodeAt(k);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** The site's mark: the stored approved id, else the deterministic pick for the trade, else null. */
export function chooseMarkId(trade: LogoTrade | null, siteId: string, stored?: unknown): string | null {
  const kept = approvedMarkId(stored);
  if (kept) return kept;
  if (!trade) return null;
  const ids = APPROVED_MARK_IDS[trade];
  return ids.length ? ids[stableHash(siteId) % ids.length] : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Colour
// ─────────────────────────────────────────────────────────────────────────

/** WCAG 1.4.11 non-text contrast. */
export const MARK_MIN_CONTRAST = 3;
/** The last-resort ink on a light surface. */
export const MARK_INK = '#111111';

type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const full = m[1].length === 3 ? [...m[1]].map(ch => ch + ch).join('') : m[1];
  return [0, 2, 4].map(k => parseInt(full.slice(k, k + 2), 16)) as Rgb;
}

const toHex = (rgb: Rgb) => `#${rgb.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const ra = parseHex(a); const rb = parseHex(b);
  if (!ra || !rb) return 1;
  const [hi, lo] = [luminance(ra), luminance(rb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn); const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255];
}

export interface MarkInk {
  /** The ink used (upper-case #RRGGBB). */
  color: string;
  /** The theme colour it came from. */
  from: string;
  /** Contrast against the surface, rounded down to 2 decimals. */
  contrast: number;
  /** How the ink was reached. */
  method: 'as-is' | 'darkened' | 'ink';
}

/**
 * The ink of one theme colour on the header surface: as-is when it reaches MARK_MIN_CONTRAST; else the same hue darkened
 * (HSL lightness, 0.5% steps) to the first step that does; else near-black ink. Deterministic.
 */
export function markInk(color: string, surface: string, min = MARK_MIN_CONTRAST): MarkInk {
  const rgb = parseHex(color);
  const floor = (value: number) => Math.floor(value * 100) / 100;
  if (rgb && contrastRatio(color, surface) >= min) return { color: toHex(rgb), from: color, contrast: floor(contrastRatio(color, surface)), method: 'as-is' };
  if (rgb) {
    const [h, s, l] = rgbToHsl(rgb);
    for (let step = Math.floor(l * 200) - 1; step >= 0; step--) {
      const candidate = toHex(hslToRgb([h, s, step / 200]));
      const ratio = contrastRatio(candidate, surface);
      if (ratio >= min) return { color: candidate, from: color, contrast: floor(ratio), method: 'darkened' };
    }
  }
  return { color: MARK_INK, from: color, contrast: floor(contrastRatio(MARK_INK, surface)), method: 'ink' };
}

export interface MarkColors { primary: MarkInk; accent: MarkInk }

/** The two inks of a mark on the header surface (the paper is the surface itself: var(--surface)). */
export function markColors(theme: { primary: string; accent: string; surface: string }): MarkColors {
  return { primary: markInk(theme.primary, theme.surface), accent: markInk(theme.accent, theme.surface) };
}
