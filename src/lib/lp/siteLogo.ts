/**
 * Site Bot visual pack: the header logo (docs/specs/site-bot-visual-upgrades-fable52-2026-11-16.md section 4; Fable 5.2 logo
 * rules 2026-11-16, sections 2 and 5). Deterministic, no AI, no authored text: the logo text is always the full business
 * name from the record (emoji removed, whitespace collapsed).
 *
 * Variants (stored: only the chosen one; the layout is recomputed from the name at every render):
 *   'lockup'   C: two weights, the lead (the name part) at 800 in the primary colour, the rest at 500/600 in --accent-text;
 *              inline on one line when it fits the phone budget, else stacked on two lines.
 *   'icon'     A: a trade mark tile + the name. The mark comes from the per-trade mark library (LOGO_MARK_LIBRARY, keyed
 *              '<vertical>:<id>', empty until the approved, traced marks land) or, until then, the site sprite's trade icon.
 *              Only when the trade is confident: matchedVertical(businessNiche) is one of the two trade verticals.
 *   'monogram' B: a letter tile + the name. Offered only for a NAME lead of letters; never the default.
 *   'name'     the plain fallback: the name with the accent bar.
 * Default: C when the lead is NAME, the name has 2+ tokens and the lockup fits; else A when the icon is confident; else plain.
 * Phone layout steps (the name gets ~128px beside the nav at 360px, ~82px beside a tile): one line at 18px, one line at 16px,
 * two lines at 15px, two lines at 13px, then a two-line clamp; never a single-line ellipsis. The tile stays on phones only
 * when the name fits two lines at 15px or better inside 82px. Desktop: one size up, the tile always shown.
 * Widths are estimates (per-character units, to be calibrated once against Heebo 800).
 *
 * The logo CSS is emitted only when a logo renders (pages without a look stay byte-identical).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. GENERIC_LEADS arrives as byte-exact copy (pending).
 */

import type { VerticalKey } from './verticalThemes';
import { matchedVertical, tradeKeywordsIn } from './verticalDetect';
import { PREFIX_LETTERS } from './hebrewPrefixLetters';
import { DESKTOP_MIN_WIDTH_PX, isolatedName, serviceIcon, SITE_ICON_SPRITE, withoutEmoji } from './siteDesign';
import type { SiteLook } from './siteLook';

export type GeneratedLogoVariant = 'lockup' | 'icon' | 'monogram' | 'name';
export const GENERATED_LOGO_VARIANTS: readonly GeneratedLogoVariant[] = ['lockup', 'icon', 'monogram', 'name'];

/**
 * Generic first words of a business name (the "services of ..." type): a name whose lead is one of these is GENERIC.
 * PENDING COPY: the ~10 Hebrew words arrive from waocopy as a byte-exact patch; until then the list is not applied.
 */
export const GENERIC_LEADS: readonly string[] = ['__HE_TODO_generic_leads__'];
export const GENERIC_LEADS_COPY_PENDING = true;

/** Display height / width cap of an owner logo file in the 56px header row (the .brand line box is 48px). */
export const LOGO_DISPLAY_HEIGHT = 40;
export const LOGO_DISPLAY_MAX_WIDTH = 200;
/** Phone width budgets of the name (Fable's estimate at 360px): alone, and beside a tile. */
export const PHONE_NAME_PX = 128;
export const PHONE_NAME_WITH_TILE_PX = 82;
const TILE_PX = 36;

// ─────────────────────────────────────────────────────────────────────────
// Marks: the per-trade mark library slot, and the sprite icon fallback
// ─────────────────────────────────────────────────────────────────────────

/** Sprite icons that read as a trade (the UI-only ones are excluded). */
const TRADE_ICONS = ['tool', 'drop', 'drain', 'sun', 'snow', 'bolt', 'lock', 'key'] as const;
export type LogoIconName = (typeof TRADE_ICONS)[number];
const TRADE_VERTICALS: readonly VerticalKey[] = ['emergency-trades', 'skilled-trades'];

export interface LogoMark {
  vertical: VerticalKey;
  /** viewBox of `body` (the traced SVG's own). */
  viewBox: string;
  /** Inner SVG, single-colour (currentColor). */
  body: string;
}

/**
 * The per-trade mark library (AI-drawn once per trade, approved, traced to SVG, stored in the repo): '<vertical>:<id>' ->
 * mark. Empty until the library lands; an icon-variant logo whose markId is not here uses its sprite icon.
 */
export const LOGO_MARK_LIBRARY: Readonly<Record<string, LogoMark>> = {};

export function isLogoIconName(value: unknown): value is LogoIconName {
  return typeof value === 'string' && (TRADE_ICONS as readonly string[]).includes(value);
}

export function isLogoMarkId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z-]+:[a-z0-9-]{1,40}$/.test(value);
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

/** Splits the name into lead and rest: the first token, or tokens 1-3 when the second is '&' / '+'. */
export function splitLead(text: string): { lead: string; rest: string } {
  const tokens = text.split(' ').filter(Boolean);
  const take = tokens.length >= 3 && (tokens[1] === '&' || tokens[1] === '+') ? 3 : 1;
  return { lead: tokens.slice(0, take).join(' '), rest: tokens.slice(take).join(' ') };
}

/** Fable's lead rule: GENERIC for a digit lead, a trade word, a niche / service / city token or a generic-lead word. */
export function leadClass(lead: string, context: LogoContext = {}): LogoLeadClass {
  if (/^\d/.test(lead)) return 'generic';
  if (tradeKeywordsIn(lead).length) return 'generic';
  if (sharesToken(lead, context.businessNiche) || sharesToken(lead, context.primaryService)) return 'generic';
  if (sharesToken(lead, context.targetLocation)) return 'generic';
  if (!GENERIC_LEADS_COPY_PENDING && tokensOf(lead).some(token => GENERIC_LEADS.some(word => sameToken(token, word.toLowerCase())))) return 'generic';
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
  /** The confident trade vertical (null = no icon variant) and its icon. */
  vertical: VerticalKey | null;
  icon: LogoIconName | null;
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

function tileLayout(text: string): TileLayout {
  const beside = plainStep(text, PHONE_NAME_WITH_TILE_PX);
  return beside === '18-1' || beside === '16-1' || beside === '15-2'
    ? { step: beside, tileOnPhone: true }
    : { step: plainStep(text, PHONE_NAME_PX), tileOnPhone: false };
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
  const { lead, rest } = splitLead(text);
  const cls = leadClass(lead, context);
  const vertical = confidentTradeVertical(context.businessNiche);
  const icon = vertical ? logoIconFor(context.serviceKeys) : null;
  const lockup = cls === 'name' ? lockupLayout(text, lead, rest) : null;
  const monogram = cls === 'name' && /^\p{L}+$/u.test(lead) && monogramOf(lead) !== null;
  const layouts: LogoPick['layouts'] = { name: { step: plainStep(text, PHONE_NAME_PX) } };
  if (lockup) layouts.lockup = lockup;
  if (icon) layouts.icon = tileLayout(text);
  if (monogram) layouts.monogram = tileLayout(text);
  const defaultVariant: GeneratedLogoVariant = lockup ? 'lockup' : icon ? 'icon' : 'name';
  const options = [defaultVariant, ...(['lockup', 'icon', 'monogram'] as const).filter(v => v !== defaultVariant && layouts[v]), ...(defaultVariant === 'name' ? [] : ['name' as const])];
  return { text, lead, rest, leadClass: cls, defaultVariant, options, vertical, icon, layouts };
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

function tileHtml(inner: string): string {
  return `<span class="logo-tile" aria-hidden="true">${inner}</span>`;
}

function markSvg(icon: LogoIconName, markId: string | undefined): string {
  const mark = markId ? LOGO_MARK_LIBRARY[markId] : undefined;
  return mark
    ? `<svg viewBox="${esc(mark.viewBox)}" focusable="false">${mark.body}</svg>`
    : `<svg viewBox="0 0 24 24" focusable="false">${logoIconBody(icon)}</svg>`;
}

/**
 * A generated logo for the name, or null when the variant is not eligible for it (a name changed after approval: the header
 * falls back to today's text name).
 */
export function generatedLogo(variant: GeneratedLogoVariant, businessName: string, context: LogoContext = {}, stored: { icon?: LogoIconName; markId?: string } = {}): BrandLogo | null {
  const pick = pickLogo(businessName, context);
  if (!pick || !pick.options.includes(variant)) return null;
  const name = (inner: string, extra = '') => `<span class="logo-name${extra}">${inner}</span>`;
  if (variant === 'name') {
    return {
      html: `<span data-logo="name" style="display:block;min-width:0;border-inline-start:4px solid var(--cta);padding-inline-start:10px;">${name(isolatedName(pick.text))}</span>`,
      css: BASE_CSS + stepCss(pick.layouts.name.step),
    };
  }
  if (variant === 'lockup') {
    const layout = pick.layouts.lockup!;
    const lead = `<span class="logo-lead">${esc(pick.lead)}</span>`;
    const rest = `<span class="logo-rest">${esc(pick.rest)}</span>`;
    const tone = '.logo-lead{font-weight:800;color:var(--primary);}.logo-rest{font-weight:500;color:var(--accent-text);}';
    if (layout.kind === 'inline') {
      return {
        html: `<span data-logo="lockup">${name(`<bdi>${lead} ${rest}</bdi>`)}</span>`,
        css: `${BASE_CSS}.logo-name{display:block;min-width:0;font-size:18px;white-space:nowrap;}${tone}${DESKTOP('.logo-name{font-size:20px;}')}`,
      };
    }
    return {
      html: `<span data-logo="lockup">${name(`<bdi class="logo-lead">${esc(pick.lead)}</bdi> <bdi class="logo-rest">${esc(pick.rest)}</bdi>`, ' stacked')}</span>`,
      css: `${BASE_CSS}.logo-name{display:block;min-width:0;}${tone}`
        + `.logo-name.stacked .logo-lead{display:block;font-size:${layout.leadPx}px;white-space:nowrap;}.logo-name.stacked .logo-rest{display:block;font-size:13px;font-weight:600;white-space:nowrap;}`
        + DESKTOP('.logo-name.stacked .logo-lead,.logo-name.stacked .logo-rest{display:inline;font-size:20px;}.logo-name.stacked .logo-rest{font-weight:500;}'),
    };
  }
  const layout = pick.layouts[variant]!;
  const tileCss = TILE_CSS + (layout.tileOnPhone ? '' : PHONE('.logo-tile{display:none;}'));
  let inner: string;
  if (variant === 'monogram') {
    inner = esc(monogramOf(pick.lead)!);
  } else {
    const icon = stored.icon && isLogoIconName(stored.icon) ? stored.icon : pick.icon!;
    inner = markSvg(icon, stored.markId);
  }
  return {
    html: `<span data-logo="${variant}" style="display:contents;">${tileHtml(inner)}${name(isolatedName(pick.text))}</span>`,
    css: BASE_CSS + tileCss + stepCss(layout.step),
  };
}

/** The owner's logo file: an inline <svg role="img"> wrapping the WebP (the hero photo stays the first <img>; never the uploaded SVG). */
export function fileLogo(src: string, width: number, height: number, businessName: string): BrandLogo {
  return {
    html: `<svg data-logo="file" role="img" aria-label="${esc(logoText(businessName))}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;flex:none;max-width:100%;height:auto;"><image href="${esc(src)}" width="${width}" height="${height}"/></svg>`,
    css: BASE_CSS,
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
  if (logo.kind === 'file') {
    const ok = LOGO_SRC.test(logo.src) && Number.isInteger(logo.width) && Number.isInteger(logo.height)
      && logo.width > 0 && logo.height > 0 && logo.width <= LOGO_DISPLAY_MAX_WIDTH && logo.height <= LOGO_DISPLAY_HEIGHT;
    return ok ? fileLogo(logo.src, logo.width, logo.height, businessName) : undefined;
  }
  if (logo.kind === 'generated' && GENERATED_LOGO_VARIANTS.includes(logo.variant)) {
    return generatedLogo(logo.variant, businessName, context, { icon: logo.icon, markId: logo.markId }) ?? undefined;
  }
  return undefined;
}
