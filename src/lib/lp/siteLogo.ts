/**
 * Site Bot visual pack: the header logo (docs/specs/site-bot-visual-upgrades-fable52-2026-11-16.md section 4; Fable 5.2 logo
 * rules 2026-11-16, sections 2 and 5). Deterministic, no AI, no authored text: the logo text is always the full business
 * name from the record (emoji removed, whitespace collapsed).
 *
 * Variants (stored: only the chosen one; the layout is recomputed from the name at every render):
 *   'lockup'   C: two weights, the lead (the name part) at 800 in the primary colour, the rest at 500/600 in --accent-text;
 *              inline on one line when it fits the phone budget, else stacked on two lines.
 *   'icon'     A: the trade mark + the name. The mark is one of the approved per-trade marks (logoMarks.ts, Eitan
 *              2026-11-17): offered when the trade is confident (logoTradeOf: exactly one of the 30 trades named) or the
 *              look stores an approved mark id. It sits directly on the header bar with NO tile behind it, inked in the
 *              site's primary / accent (darkened to 3:1 on the surface when needed) with the surface as its paper.
 *              Without a mark, the legacy fallback stays: the sprite's trade icon in a primary tile, only when
 *              matchedVertical(businessNiche) is one of the two trade verticals.
 *   'monogram' B: a letter tile + the name. Offered only for a NAME lead of letters; never the default.
 *   'name'     the plain fallback: the name with the accent bar.
 * Default: C when the lead is NAME, the name has 2+ tokens and the lockup fits; else A when the icon is confident; else plain.
 * Phone layout steps (the name gets ~128px beside the nav at 360px, ~82px beside a tile): one line at 18px, one line at 16px,
 * two lines at 15px, two lines at 13px, then a two-line clamp; never a single-line ellipsis. The tile stays on phones only
 * when the name fits two lines at 15px or better inside 82px (a mark: inside 128px less its own width + 10px). Desktop:
 * one size up, the tile / mark always shown.
 * Widths are estimates (per-character units, to be calibrated once against Heebo 800).
 *
 * Trade descriptor (Eitan 2026-11-17; Yonatan's SEO conditions): a small second line under the name, inside the logo link:
 * the trade label (docs/copy/logo-trade-descriptor-FINAL-2026-11-17.json, copied by script) + an aria-hidden separator + the
 * city (the LocalBusiness schema's areaServed[0], passed in by the renderer). Only for a confident trade (logoTradeOf), only
 * when the name does not already name that trade or carry the label; the city part is dropped when the name has it. Visible
 * header text only: never in the title, meta, og:site_name, JSON-LD or a heading. Phone drop order (the name is never
 * re-laid out for it): the city part first, then the whole descriptor; the mark keeps its own rule (tileOnPhone).
 * Staff display overrides (look.logoDisplay): descriptor on / off, and the number of lead words (splitLead).
 *
 * The logo CSS is emitted only when a logo renders (pages without a look stay byte-identical).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. GENERIC_LEADS is byte-exact copy (\u escapes, written by script).
 */

import type { VerticalKey } from './verticalThemes';
import { matchedVertical, tradeKeywordsIn } from './verticalDetect';
import { approvedMarkId, chooseMarkId, LOGO_MARK_LIBRARY, logoTradeOf, markAspect, markColors, markInk, tradesNamedIn, tradeTermsOf, type LogoMark, type LogoTrade } from './logoMarks';
import descriptorCopy from './logoMarks/trade-descriptors.generated.json';
import { PREFIX_LETTERS } from './hebrewPrefixLetters';
import { DESKTOP_MIN_WIDTH_PX, isolatedName, serviceIcon, SITE_ICON_SPRITE, withoutEmoji } from './siteDesign';
import type { SiteLook } from './siteLook';

export type GeneratedLogoVariant = 'lockup' | 'icon' | 'monogram' | 'name';
export const GENERATED_LOGO_VARIANTS: readonly GeneratedLogoVariant[] = ['lockup', 'icon', 'monogram', 'name'];

/**
 * Generic first words of a business name (the "services of ..." type): a name whose lead is one of these is GENERIC.
 * Source: docs/copy/site-bot-logo-rating-review-strings-FINAL-2026-11-16.json `genericLeads` (Noa FIX applied), written by
 * script from the JSON bytes, never typed. Matching (Noa): a token matches as written, or with a leading he stripped only
 * when the rest is on the list (no other prefix letter is stripped). See isGenericLeadToken.
 */
export const GENERIC_LEADS: readonly string[] = ["\u05e9\u05d9\u05e8\u05d5\u05ea", "\u05e9\u05d9\u05e8\u05d5\u05ea\u05d9", "\u05e9\u05d9\u05e8\u05d5\u05ea\u05d9\u05dd", "\u05d7\u05d1\u05e8\u05d4", "\u05d7\u05d1\u05e8\u05ea", "\u05e7\u05d1\u05d5\u05e6\u05d4", "\u05e7\u05d1\u05d5\u05e6\u05ea", "\u05d1\u05d9\u05ea", "\u05de\u05e8\u05db\u05d6", "\u05de\u05d5\u05e7\u05d3", "\u05e1\u05d3\u05e0\u05d4", "\u05e1\u05d3\u05e0\u05ea", "\u05e2\u05d5\u05dc\u05dd", "\u05de\u05d5\u05de\u05d7\u05d4", "\u05de\u05d5\u05de\u05d7\u05d9", "\u05e4\u05ea\u05e8\u05d5\u05e0\u05d5\u05ea", "\u05d0\u05dc\u05d5\u05e3", "\u05d0\u05dc\u05d5\u05e4\u05d9", "\u05de\u05db\u05d5\u05df", "\u05e8\u05e9\u05ea", "\u05d0\u05d7\u05d9\u05dd", "\u05e1\u05d8\u05d5\u05d3\u05d9\u05d5", "\u05de\u05e2\u05d1\u05d3\u05d4", "\u05de\u05e2\u05d1\u05d3\u05ea"];
export const GENERIC_LEADS_COPY_PENDING = false;

const HE = '\u05D4';
/** Noa's rule: the token as written is on the list, or it starts with he and the rest is on the list. */
export function isGenericLeadToken(token: string): boolean {
  if (GENERIC_LEADS.includes(token)) return true;
  return token.startsWith(HE) && token.length > 1 && GENERIC_LEADS.includes(token.slice(HE.length));
}

/** Display height / width cap of an owner logo file in the 56px header row (the .brand line box is 48px). */
export const LOGO_DISPLAY_HEIGHT = 40;
export const LOGO_DISPLAY_MAX_WIDTH = 200;
/** Phone width budgets of the name (Fable's estimate at 360px): alone, and beside a tile. */
export const PHONE_NAME_PX = 128;
export const PHONE_NAME_WITH_TILE_PX = 82;
const TILE_PX = 36;
/** The mark on the header bar: height (px) on desktop / phone, and the width cap of a wide mark (it then shrinks). */
export const MARK_DESKTOP = { height: 40, maxWidth: 56 } as const;
export const MARK_PHONE = { height: 32, maxWidth: 44 } as const;
/** The space a mark takes from the phone name budget beyond its width (the flex gap and its slack, as for the tile). */
const MARK_GAP_ALLOWANCE = 10;

// ─────────────────────────────────────────────────────────────────────────
// Marks: the per-trade mark library slot, and the sprite icon fallback
// ─────────────────────────────────────────────────────────────────────────

/** Sprite icons that read as a trade (the UI-only ones are excluded). */
const TRADE_ICONS = ['tool', 'drop', 'drain', 'sun', 'snow', 'bolt', 'lock', 'key'] as const;
export type LogoIconName = (typeof TRADE_ICONS)[number];
const TRADE_VERTICALS: readonly VerticalKey[] = ['emergency-trades', 'skilled-trades'];

/** The approved per-trade marks, keyed by approved mark id ('plumber-3'); see logoMarks.ts. */
export { LOGO_MARK_LIBRARY };
export type { LogoMark, LogoTrade };

export function isLogoIconName(value: unknown): value is LogoIconName {
  return typeof value === 'string' && (TRADE_ICONS as readonly string[]).includes(value);
}

/** The shape of a stored mark id: an approved id ('plumber-3') or the legacy '<group>:<id>' form. Rendering further requires
 * the id to be approved (approvedMarkId); a well-formed id that is not approved is ignored. */
export function isLogoMarkId(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[a-z-]+:)?[a-z0-9-]{1,40}$/.test(value);
}

/** Inner SVG of a sprite trade icon (the sprite's own symbol body). */
export function logoIconBody(name: LogoIconName): string {
  const match = new RegExp(`<symbol id="i-${name}" viewBox="0 0 24 24">(.*?)</symbol>`).exec(SITE_ICON_SPRITE);
  if (!match) throw new Error(`Unknown logo icon: ${name}`);
  return match[1];
}

/** The confident trade vertical of a niche (matchedVertical, no fallback), or null: no icon. */
export function confidentTradeVertical(businessNiche: string | undefined): VerticalKey | null {
  const vertical = matchedVertical(businessNiche ?? '');
  return vertical && TRADE_VERTICALS.includes(vertical) ? vertical : null;
}

/** The trade icon: the first service page id / path that maps to a specific sprite icon (the cards' rule), else the wrench. */
export function logoIconFor(serviceKeys: readonly string[] = []): LogoIconName {
  for (const key of serviceKeys) {
    const name = serviceIcon(key);
    if (name !== 'svc') return name as LogoIconName;
  }
  return 'tool';
}

// ─────────────────────────────────────────────────────────────────────────
// Name parsing and width estimates
// ─────────────────────────────────────────────────────────────────────────

/** The logo text: the business name with emoji removed and whitespace collapsed ('' = no logo). */
export function logoText(businessName: string | undefined): string {
  return withoutEmoji(businessName ?? '').replace(/\s+/g, ' ').trim();
}

/** Width of a text in em (Fable's units: Hebrew letter 0.53, Latin capital 0.66, Latin lowercase / digit 0.55, space 0.25, other 0.35). */
export function textUnits(text: string): number {
  let units = 0;
  for (const ch of text) {
    if (/[\u05D0-\u05EA]/.test(ch)) units += 0.53;
    else if (/[A-Z]/.test(ch)) units += 0.66;
    else if (/[a-z0-9]/.test(ch)) units += 0.55;
    else if (ch === ' ') units += 0.25;
    else units += 0.35;
  }
  return units;
}

/** Greedy word wrap: does the text fit `lines` lines of `maxPx` at `fontPx`? */
export function fitsLines(text: string, fontPx: number, maxPx: number, lines: number): boolean {
  let used = 1;
  let line = 0;
  for (const word of text.split(' ')) {
    const width = textUnits(word) * fontPx;
    if (width > maxPx) return false;
    const next = line === 0 ? width : line + 0.25 * fontPx + width;
    if (next <= maxPx) { line = next; continue; }
    used += 1;
    line = width;
    if (used > lines) return false;
  }
  return true;
}

export type LogoStep = '18-1' | '16-1' | '15-2' | '13-2' | 'clamp';
const STEP_PX: Record<LogoStep, number> = { '18-1': 18, '16-1': 16, '15-2': 15, '13-2': 13, clamp: 13 };

/** The first plain size step whose text fits the width. */
export function plainStep(text: string, maxPx: number): LogoStep {
  if (fitsLines(text, 18, maxPx, 1)) return '18-1';
  if (fitsLines(text, 16, maxPx, 1)) return '16-1';
  if (fitsLines(text, 15, maxPx, 2)) return '15-2';
  if (fitsLines(text, 13, maxPx, 2)) return '13-2';
  return 'clamp';
}

export interface LogoContext {
  ownerName?: string;
  businessNiche?: string;
  primaryService?: string;
  targetLocation?: string;
  serviceKeys?: readonly string[];
  /** The site id (slug): the deterministic mark pick hashes it (else the logo text). */
  siteId?: string;
  /** The mark id stored in the look record (only an approved id counts). */
  markId?: string;
  /** The theme colours the header renders with (the mark's inks are computed from them; muted = the descriptor's ink). */
  colors?: { primary: string; accent: string; surface: string; muted?: string };
  /** The descriptor's city: the LocalBusiness schema's areaServed[0] (schemaAreaServedPlaces), never another field. */
  city?: string;
  /** Staff display overrides (look.logoDisplay): header display only, never the business name. */
  display?: LogoDisplayOverrides;
}

/** Staff display overrides of the generated header logo (stored in the look record, separate from businessName). */
export interface LogoDisplayOverrides {
  /** true: show the descriptor whenever the trade is confident (even when the name names it); false: never; unset: automatic. */
  descriptor?: boolean;
  /** How many leading words form the bold lead (overrides splitLead's default; 1 .. words - 1). */
  leadWords?: number;
}

/** A well-formed override object (unknown keys dropped), or null. */
export function cleanDisplayOverrides(value: unknown): LogoDisplayOverrides | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const out: LogoDisplayOverrides = {};
  if (typeof raw.descriptor === 'boolean') out.descriptor = raw.descriptor;
  if (Number.isInteger(raw.leadWords) && (raw.leadWords as number) >= 1) out.leadWords = raw.leadWords as number;
  return Object.keys(out).length ? out : null;
}

const PREFIX = new RegExp(`^[${PREFIX_LETTERS}]`);
const tokensOf = (text: string | undefined) => (text ?? '').toLowerCase().split(/[\s,./()\-]+/).filter(Boolean);

/** Same token, allowing one Hebrew prefix letter on either side. */
function sameToken(a: string, b: string): boolean {
  if (a === b) return true;
  return (PREFIX.test(a) && a.slice(1) === b) || (PREFIX.test(b) && b.slice(1) === a);
}

function sharesToken(lead: string, other: string | undefined): boolean {
  const theirs = tokensOf(other);
  return tokensOf(lead).some(token => theirs.some(item => sameToken(token, item)));
}

export type LogoLeadClass = 'name' | 'generic';

/** The staff lead override when it leaves a non-empty rest, else null. */
function leadWordsOverride(text: string, leadWords: number | undefined): number | null {
  const count = text.split(' ').filter(Boolean).length;
  return Number.isInteger(leadWords) && leadWords! >= 1 && leadWords! < count ? leadWords! : null;
}

/**
 * Splits the name into lead and rest: the first token, or tokens 1-3 when the second is '&' / '+'. A staff override
 * (leadWords, 1 .. words - 1) takes that many words instead.
 */
export function splitLead(text: string, leadWords?: number): { lead: string; rest: string } {
  const tokens = text.split(' ').filter(Boolean);
  const take = leadWordsOverride(text, leadWords) ?? (tokens.length >= 3 && (tokens[1] === '&' || tokens[1] === '+') ? 3 : 1);
  return { lead: tokens.slice(0, take).join(' '), rest: tokens.slice(take).join(' ') };
}

/** Fable's lead rule: GENERIC for a digit lead, a trade word, a niche / service / city token or a generic-lead word. */
export function leadClass(lead: string, context: LogoContext = {}): LogoLeadClass {
  if (/^\d/.test(lead)) return 'generic';
  if (tradeKeywordsIn(lead).length) return 'generic';
  if (sharesToken(lead, context.businessNiche) || sharesToken(lead, context.primaryService)) return 'generic';
  if (sharesToken(lead, context.targetLocation)) return 'generic';
  if (!GENERIC_LEADS_COPY_PENDING && tokensOf(lead).some(isGenericLeadToken)) return 'generic';
  return 'name';
}

export type LockupLayout = { kind: 'inline' } | { kind: 'stacked'; leadPx: 16 | 18 };
export interface TileLayout { step: LogoStep; tileOnPhone: boolean }

export interface LogoPick {
  text: string;
  lead: string;
  rest: string;
  leadClass: LogoLeadClass;
  /** The default variant (never 'monogram'). */
  defaultVariant: GeneratedLogoVariant;
  /** Eligible variants, the default first, the plain 'name' last. */
  options: GeneratedLogoVariant[];
  /** The confident trade vertical and its sprite icon (the legacy icon fallback when there is no mark). */
  vertical: VerticalKey | null;
  icon: LogoIconName | null;
  /** The confident trade (logoTradeOf) and the site's mark (stored approved id, else the deterministic pick). */
  trade: LogoTrade | null;
  markId: string | null;
  /** The trade descriptor line (null = none), and the staff-review flags of the name. */
  descriptor: LogoDescriptor | null;
  flags: LogoNameFlag[];
  layouts: {
    lockup?: LockupLayout;
    icon?: TileLayout;
    monogram?: TileLayout;
    name: { step: LogoStep };
  };
}

function lockupLayout(text: string, lead: string, rest: string): LockupLayout | null {
  if (!rest) return null;
  if (fitsLines(text, 18, PHONE_NAME_PX, 1)) return { kind: 'inline' };
  if (!fitsLines(rest, 13, PHONE_NAME_PX, 1)) return null;
  if (fitsLines(lead, 18, PHONE_NAME_PX, 1)) return { kind: 'stacked', leadPx: 18 };
  if (fitsLines(lead, 16, PHONE_NAME_PX, 1)) return { kind: 'stacked', leadPx: 16 };
  return null;
}

function tileLayout(text: string, besidePx: number = PHONE_NAME_WITH_TILE_PX): TileLayout {
  const beside = plainStep(text, besidePx);
  return beside === '18-1' || beside === '16-1' || beside === '15-2'
    ? { step: beside, tileOnPhone: true }
    : { step: plainStep(text, PHONE_NAME_PX), tileOnPhone: false };
}

/** A mark's box (px, 1 decimal) at a height, shrunk to the width cap when it is wider. */
export function markBox(mark: Pick<LogoMark, 'viewBox'>, size: { height: number; maxWidth: number }): { width: number; height: number } {
  const aspect = markAspect(mark);
  const width = Math.min(size.height * aspect, size.maxWidth);
  const round = (value: number) => Math.round(value * 10) / 10;
  return { width: round(width), height: round(width / aspect) };
}

/** The phone layout beside a mark: the name budget is 128px less the mark's phone width and the gap allowance. */
function markLayout(text: string, mark: LogoMark): TileLayout {
  return tileLayout(text, PHONE_NAME_PX - markBox(mark, MARK_PHONE).width - MARK_GAP_ALLOWANCE);
}

/** The monogram letter: the lead's first letter (Latin upper-cased), or null. */
export function monogramOf(lead: string): string | null {
  const letter = /\p{L}/u.exec(lead)?.[0];
  return letter ? letter.toLocaleUpperCase('en') : null;
}

/** Fable's picker: the default variant, the eligible ones and their layouts; null for an empty / emoji-only name. */
export function pickLogo(businessName: string | undefined, context: LogoContext = {}): LogoPick | null {
  const text = logoText(businessName);
  if (!text) return null;
  const override = leadWordsOverride(text, context.display?.leadWords);
  const { lead, rest } = splitLead(text, override ?? undefined);
  // A staff-chosen lead is the name part by decision (display only).
  const cls = override ? 'name' : leadClass(lead, context);
  const vertical = confidentTradeVertical(context.businessNiche);
  const trade = logoTradeOf(context);
  const markId = chooseMarkId(trade, context.siteId || text, context.markId);
  const mark = markId ? LOGO_MARK_LIBRARY[markId] : undefined;
  const icon = mark || vertical ? logoIconFor(context.serviceKeys) : null;
  const lockup = cls === 'name' ? lockupLayout(text, lead, rest) : null;
  const monogram = cls === 'name' && /^\p{L}+$/u.test(lead) && monogramOf(lead) !== null;
  const layouts: LogoPick['layouts'] = { name: { step: plainStep(text, PHONE_NAME_PX) } };
  if (lockup) layouts.lockup = lockup;
  if (mark) layouts.icon = markLayout(text, mark);
  else if (icon) layouts.icon = tileLayout(text);
  if (monogram) layouts.monogram = tileLayout(text);
  const defaultVariant: GeneratedLogoVariant = lockup ? 'lockup' : icon ? 'icon' : 'name';
  const options = [defaultVariant, ...(['lockup', 'icon', 'monogram'] as const).filter(v => v !== defaultVariant && layouts[v]), ...(defaultVariant === 'name' ? [] : ['name' as const])];
  const descriptor = logoDescriptor(text, trade, context.city, context.display);
  return { text, lead, rest, leadClass: cls, defaultVariant, options, vertical, icon, trade, markId, descriptor, flags: logoNameFlags(text, context), layouts };
}

// ─────────────────────────────────────────────────────────────────────────
// Trade descriptor and the weak-name flags
// ─────────────────────────────────────────────────────────────────────────

/** Trade -> descriptor label: docs/copy/logo-trade-descriptor-FINAL-2026-11-17.json, copied byte-exact by script. */
export const TRADE_DESCRIPTORS: Readonly<Record<LogoTrade, string>> = descriptorCopy.descriptors as Record<LogoTrade, string>;

export interface LogoDescriptor {
  label: string;
  /** null when there is no city or the name already has it. */
  city: string | null;
}

/** True when the words of `phrase` appear in order in `text` (one Hebrew prefix letter allowed on each word). */
export function containsPhrase(text: string, phrase: string): boolean {
  const hay = tokensOf(text);
  const needle = tokensOf(phrase);
  if (!needle.length) return false;
  for (let start = 0; start + needle.length <= hay.length; start++) {
    if (needle.every((token, k) => sameToken(hay[start + k], token))) return true;
  }
  return false;
}

/**
 * Does the name already say the trade? The trade-term detection (tradesNamedIn: whole terms of that trade), or a trade
 * keyword stem of the existing detector (tradeKeywordsIn, the stems leadClass uses) that is part of one of that trade's
 * terms or its label (so a craft noun such as the electricity stem counts for the electrician). No new word lists.
 */
export function nameNamesTrade(text: string, trade: LogoTrade): boolean {
  if (tradesNamedIn(text).includes(trade)) return true;
  const forms = [TRADE_DESCRIPTORS[trade], ...tradeTermsOf(trade)].map(form => form.toLowerCase());
  return tradeKeywordsIn(text).some(stem => forms.some(form => form.includes(stem.toLowerCase())));
}

/** Does the name say any trade at all (whole trade terms or a trade keyword stem)? */
function namesAnyTrade(text: string): boolean {
  return tradesNamedIn(text).length > 0 || tradeKeywordsIn(text).length > 0;
}

/**
 * The descriptor of a name: the confident trade's label and the city, or null. Skipped when the name already names the
 * trade (nameNamesTrade) or carries the label; the city part is dropped when the name has it.
 * Overrides: descriptor false = never; true = also when the name names the trade (the city rule still applies).
 */
export function logoDescriptor(text: string, trade: LogoTrade | null, city: string | undefined, display: LogoDisplayOverrides = {}): LogoDescriptor | null {
  if (display.descriptor === false || !trade) return null;
  const label = TRADE_DESCRIPTORS[trade];
  if (!label) return null;
  const named = nameNamesTrade(text, trade) || containsPhrase(text, label);
  if (named && display.descriptor !== true) return null;
  const place = (city ?? '').replace(/\s+/g, ' ').trim();
  return { label, city: place && !containsPhrase(text, place) ? place : null };
}

/**
 * Staff-review flags of a name (pilot): deterministic, from the name (and the trade context) only.
 *   single-short-token  one word of at most SHORT_TOKEN_MAX_LETTERS letters that names no trade (a first name, a coined word)
 *   english-only        no Hebrew letter
 *   vague               the lead is a generic word (GENERIC_LEADS) and the name names no trade
 *   very-long           the name does not fit two lines at 15px in the 128px phone budget (it drops to 13px / the clamp)
 *   no-trade-shown      the name names no trade and no descriptor can say it (no confident trade)
 */
export type LogoNameFlag = 'single-short-token' | 'english-only' | 'vague' | 'very-long' | 'no-trade-shown';
export const SHORT_TOKEN_MAX_LETTERS = 8;
/** very-long: the name does not fit two lines at this size in PHONE_NAME_PX. */
export const VERY_LONG_FONT_PX = 15;

export function logoNameFlags(businessName: string | undefined, context: LogoContext = {}): LogoNameFlag[] {
  const text = logoText(businessName);
  if (!text) return [];
  const tokens = text.split(' ');
  const named = namesAnyTrade(text);
  const flags: LogoNameFlag[] = [];
  if (tokens.length === 1 && [...tokens[0]].length <= SHORT_TOKEN_MAX_LETTERS && !named) flags.push('single-short-token');
  if (!/[\u05D0-\u05EA]/.test(text)) flags.push('english-only');
  if (!named && tokensOf(splitLead(text).lead).some(isGenericLeadToken)) flags.push('vague');
  if (!fitsLines(text, VERY_LONG_FONT_PX, PHONE_NAME_PX, 2)) flags.push('very-long');
  if (!named && !logoTradeOf(context)) flags.push('no-trade-shown');
  return flags;
}

/** The descriptor's font size (px) on phone / desktop, and its minimum contrast on the header surface (WCAG AA text). */
export const DESCRIPTOR_PX = { phone: 12, desktop: 14 } as const;
export const DESCRIPTOR_MIN_CONTRAST = 4.5;
/** Width the 'name' variant's accent bar takes from the phone budget (4px border + 10px padding). */
const NAME_BAR_PX = 14;

export type DescriptorPhoneFit = 'full' | 'label' | 'none';

/**
 * What of the descriptor shows on a phone. The name's own layout is fixed first and never changes for the descriptor:
 * when the name already needs the 13px two-line step or the clamp, the descriptor is dropped (the header row has no third
 * line to give); else the whole line when it fits one line at 12px in the name's width, else the label alone, else nothing.
 */
export function descriptorPhoneFit(descriptor: LogoDescriptor, nameStep: LogoStep, budgetPx: number): DescriptorPhoneFit {
  if (nameStep === '13-2' || nameStep === 'clamp') return 'none';
  const full = descriptor.city ? `${descriptor.label} \u00B7 ${descriptor.city}` : descriptor.label;
  if (fitsLines(full, DESCRIPTOR_PX.phone, budgetPx, 1)) return 'full';
  if (descriptor.city && fitsLines(descriptor.label, DESCRIPTOR_PX.phone, budgetPx, 1)) return 'label';
  return 'none';
}

/** The descriptor's ink: the theme's muted text colour, darkened (same hue) to 4.5:1 on the surface when short of it. */
export function descriptorInk(colors: LogoContext['colors']): string {
  return colors?.muted ? markInk(colors.muted, colors.surface, DESCRIPTOR_MIN_CONTRAST).color : 'var(--text)';
}

// ─────────────────────────────────────────────────────────────────────────
// Markup + CSS
// ─────────────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface BrandLogo {
  /** Inner markup of .brand (siteHeader brandHtml). */
  html: string;
  /** The logo's own CSS (assembleDocument adds it to <head>). */
  css: string;
}

const BASE_CSS = '.brand.has-logo{display:flex;align-items:center;gap:8px;min-width:0;line-height:1.15;white-space:normal;overflow:visible;text-overflow:clip;}';
const TILE_CSS = `.logo-tile{display:inline-flex;align-items:center;justify-content:center;flex:none;width:${TILE_PX}px;height:${TILE_PX}px;border-radius:8px;background:var(--primary);color:#fff;font-weight:800;font-size:1.25rem;line-height:1;}.logo-tile svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}`;
const DESKTOP = (rules: string) => `@media (min-width:${DESKTOP_MIN_WIDTH_PX}px){${rules}}`;
const PHONE = (rules: string) => `@media (max-width:${DESKTOP_MIN_WIDTH_PX - 1}px){${rules}}`;

function stepCss(step: LogoStep): string {
  const px = STEP_PX[step];
  const lines = step === '18-1' || step === '16-1' ? 'white-space:nowrap;' : 'text-wrap:balance;';
  const clamp = step === 'clamp' ? 'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;' : '';
  return `.logo-name{display:block;min-width:0;font-weight:800;color:var(--primary);font-size:${px}px;${lines}${clamp}}`
    + DESKTOP(`.logo-name{font-size:${STEP_PX['18-1'] + 2}px;white-space:normal;display:block;-webkit-line-clamp:unset;line-clamp:none;overflow:visible;}`);
}

/** The descriptor line: plain visible text; only the separator is aria-hidden. A leading space keeps it a separate word. */
function descriptorHtml(descriptor: LogoDescriptor): string {
  const city = descriptor.city ? `<span class="logo-desc-city"><span aria-hidden="true"> \u00B7 </span>${isolatedName(descriptor.city)}</span>` : '';
  return ` <span class="logo-desc">${isolatedName(descriptor.label)}${city}</span>`;
}

function descriptorCss(fit: DescriptorPhoneFit, colors: LogoContext['colors']): string {
  return `.logo-words{display:block;min-width:0;}.logo-desc{display:block;margin-top:2px;font-size:${DESCRIPTOR_PX.phone}px;font-weight:500;line-height:1.2;color:${descriptorInk(colors)};white-space:nowrap;overflow:hidden;}`
    + (fit === 'none' ? PHONE('.logo-desc{display:none;}') : fit === 'label' ? PHONE('.logo-desc-city{display:none;}') : '')
    + DESKTOP(`.logo-desc{display:block;font-size:${DESCRIPTOR_PX.desktop}px;white-space:normal;overflow:visible;}.logo-desc-city{display:inline;}`);
}

function tileHtml(inner: string): string {
  return `<span class="logo-tile" aria-hidden="true">${inner}</span>`;
}

function spriteSvg(icon: LogoIconName): string {
  return `<svg viewBox="0 0 24 24" focusable="false">${logoIconBody(icon)}</svg>`;
}

/**
 * The mark's CSS: its box on phone / desktop, hidden on phones when the name does not fit beside it, and its inks. No
 * background, border, radius or padding: the mark sits on the header bar itself. The paper is the bar's own surface.
 */
function markCss(mark: LogoMark, onPhone: boolean, colors: LogoContext['colors']): string {
  const phone = markBox(mark, MARK_PHONE);
  const desktop = markBox(mark, MARK_DESKTOP);
  const inks = colors ? markColors(colors) : null;
  const primary = inks ? inks.primary.color : 'var(--primary)';
  const accent = inks ? inks.accent.color : 'var(--accent-text)';
  return `.logo-mark{display:block;flex:none;width:${phone.width}px;height:${phone.height}px;--mark-primary:${primary};--mark-accent:${accent};--mark-paper:var(--surface);}`
    + (onPhone ? '' : PHONE('.logo-mark{display:none;}'))
    + DESKTOP(`.logo-mark{display:block;width:${desktop.width}px;height:${desktop.height}px;}`);
}

function markHtml(markId: string, mark: LogoMark): string {
  return `<svg class="logo-mark" data-mark="${esc(markId)}" viewBox="${esc(mark.viewBox)}" aria-hidden="true" focusable="false">${mark.body}</svg>`;
}

/**
 * A generated logo for the name, or null when the variant is not eligible for it (a name changed after approval: the header
 * falls back to today's text name).
 */
export function generatedLogo(variant: GeneratedLogoVariant, businessName: string, context: LogoContext = {}, stored: { icon?: LogoIconName; markId?: string } = {}): BrandLogo | null {
  const storedMark = approvedMarkId(stored.markId) ?? undefined;
  const pick = pickLogo(businessName, storedMark ? { ...context, markId: storedMark } : context);
  if (!pick || !pick.options.includes(variant)) return null;
  const name = (inner: string, extra = '') => `<span class="logo-name${extra}">${inner}</span>`;
  const desc = pick.descriptor;
  const descHtml = desc ? descriptorHtml(desc) : '';
  const descCss = (step: LogoStep, budgetPx: number) => (desc ? descriptorCss(descriptorPhoneFit(desc, step, budgetPx), context.colors) : '');
  /** The name and the descriptor stacked in one block (a flex item beside the mark / tile); the name alone otherwise. */
  const words = (nameHtml: string) => (desc ? `<span class="logo-words">${nameHtml}${descHtml}</span>` : nameHtml);
  if (variant === 'name') {
    return {
      html: `<span data-logo="name" style="display:block;min-width:0;border-inline-start:4px solid var(--cta);padding-inline-start:10px;">${name(isolatedName(pick.text))}${descHtml}</span>`,
      css: BASE_CSS + stepCss(pick.layouts.name.step) + descCss(pick.layouts.name.step, PHONE_NAME_PX - NAME_BAR_PX),
    };
  }
  if (variant === 'lockup') {
    const layout = pick.layouts.lockup!;
    const lead = `<span class="logo-lead">${esc(pick.lead)}</span>`;
    const rest = `<span class="logo-rest">${esc(pick.rest)}</span>`;
    const tone = '.logo-lead{font-weight:800;color:var(--primary);}.logo-rest{font-weight:500;color:var(--accent-text);}';
    if (layout.kind === 'inline') {
      return {
        html: `<span data-logo="lockup">${name(`<bdi>${lead} ${rest}</bdi>`)}${descHtml}</span>`,
        css: `${BASE_CSS}.logo-name{display:block;min-width:0;font-size:18px;white-space:nowrap;}${tone}${DESKTOP('.logo-name{font-size:20px;}')}${descCss('18-1', PHONE_NAME_PX)}`,
      };
    }
    // The stacked lockup is two lines (18 or 16 + 13px): the 15px two-line step's height, for the descriptor rule.
    return {
      html: `<span data-logo="lockup">${name(`<bdi class="logo-lead">${esc(pick.lead)}</bdi> <bdi class="logo-rest">${esc(pick.rest)}</bdi>`, ' stacked')}${descHtml}</span>`,
      css: `${BASE_CSS}.logo-name{display:block;min-width:0;}${tone}`
        + `.logo-name.stacked .logo-lead{display:block;font-size:${layout.leadPx}px;white-space:nowrap;}.logo-name.stacked .logo-rest{display:block;font-size:13px;font-weight:600;white-space:nowrap;}`
        + DESKTOP('.logo-name.stacked .logo-lead,.logo-name.stacked .logo-rest{display:inline;font-size:20px;}.logo-name.stacked .logo-rest{font-weight:500;}')
        + descCss('15-2', PHONE_NAME_PX),
    };
  }
  const layout = pick.layouts[variant]!;
  const mark = variant === 'icon' && pick.markId ? LOGO_MARK_LIBRARY[pick.markId] : undefined;
  if (mark) {
    const budget = layout.tileOnPhone ? PHONE_NAME_PX - markBox(mark, MARK_PHONE).width - MARK_GAP_ALLOWANCE : PHONE_NAME_PX;
    return {
      html: `<span data-logo="icon" style="display:contents;">${markHtml(pick.markId!, mark)}${words(name(isolatedName(pick.text)))}</span>`,
      css: BASE_CSS + markCss(mark, layout.tileOnPhone, context.colors) + stepCss(layout.step) + descCss(layout.step, budget),
    };
  }
  const tileCss = TILE_CSS + (layout.tileOnPhone ? '' : PHONE('.logo-tile{display:none;}'));
  let inner: string;
  if (variant === 'monogram') {
    inner = esc(monogramOf(pick.lead)!);
  } else {
    const icon = stored.icon && isLogoIconName(stored.icon) ? stored.icon : pick.icon!;
    inner = spriteSvg(icon);
  }
  return {
    html: `<span data-logo="${variant}" style="display:contents;">${tileHtml(inner)}${words(name(isolatedName(pick.text)))}</span>`,
    css: BASE_CSS + tileCss + stepCss(layout.step) + descCss(layout.step, layout.tileOnPhone ? PHONE_NAME_WITH_TILE_PX : PHONE_NAME_PX),
  };
}

/**
 * The owner's logo file: an inline <svg role="img"> wrapping the WebP (the hero photo stays the first <img>; never the uploaded
 * SVG). Its aria-label stays the business name; the descriptor (when any) follows as real text under it.
 */
export function fileLogo(src: string, width: number, height: number, businessName: string, context: LogoContext = {}): BrandLogo {
  const svg = `<svg data-logo="file" role="img" aria-label="${esc(logoText(businessName))}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;flex:none;max-width:100%;height:auto;"><image href="${esc(src)}" width="${width}" height="${height}"/></svg>`;
  const desc = logoDescriptor(logoText(businessName), logoTradeOf(context), context.city, context.display);
  if (!desc) return { html: svg, css: BASE_CSS };
  return {
    html: `<span class="logo-words">${svg}${descriptorHtml(desc)}</span>`,
    css: BASE_CSS + descriptorCss(descriptorPhoneFit(desc, '18-1', PHONE_NAME_PX), context.colors),
  };
}

const LOGO_SRC = /^\/img\/[a-z0-9][a-z0-9-]*\.webp$/;

/**
 * The header logo of a look: the approved owner file, else the approved generated variant (when still eligible), else
 * undefined (today's text name).
 */
export function brandLogo(look: SiteLook | undefined | null, businessName: string, context: LogoContext = {}): BrandLogo | undefined {
  const logo = look?.logo;
  if (!logo || logo.approved !== true || !logoText(businessName)) return undefined;
  const display = cleanDisplayOverrides(look?.logoDisplay);
  if (display) context = { ...context, display };
  if (logo.kind === 'file') {
    const ok = LOGO_SRC.test(logo.src) && Number.isInteger(logo.width) && Number.isInteger(logo.height)
      && logo.width > 0 && logo.height > 0 && logo.width <= LOGO_DISPLAY_MAX_WIDTH && logo.height <= LOGO_DISPLAY_HEIGHT;
    return ok ? fileLogo(logo.src, logo.width, logo.height, businessName, context) : undefined;
  }
  if (logo.kind === 'generated' && GENERATED_LOGO_VARIANTS.includes(logo.variant)) {
    return generatedLogo(logo.variant, businessName, context, { icon: logo.icon, markId: logo.markId }) ?? undefined;
  }
  return undefined;
}
