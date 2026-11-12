/**
 * Site Bot Redesign A (2026-11-13; docs/design/site-bot-redesign-fable52-2026-11-12.md items 1-5, 8, the solid hero of 7 and
 * the thin class-system slice of 9). The shared building blocks of every generated site page: the self-hosted Heebo font,
 * the class CSS driven by theme custom properties, the inline SVG icon sprite (no emoji anywhere), the one 56px header with
 * the nav, the slim mobile action bar, the checked trust-fact list, the solid hero shell and the hero hours line.
 *
 * Kept free of renderSitePages imports (renderStaticHtml and renderSitePages both use it). Labels: siteDesignLabels.ts.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import type { VerticalTheme } from './verticalThemes';
import { SITE_FONT_PATHS } from './siteFonts';
import { SITE_DESIGN_LABELS } from './siteDesignLabels';
import { DAY_LETTERS } from './generationData';
import { parseBusinessHoursSegments } from './businessHours';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** One family for headings and body (item 4). Secular One is gone; Heebo is self-hosted (siteFonts.ts). */
export const SITE_FONT_STACK = '"Heebo", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

/** WhatsApp fill and its text colour (defect fix: white on #25D366 was about 2:1; this dark text is about 8.8:1). */
export const WHATSAPP_FILL = '#25D366';
export const WHATSAPP_TEXT = '#0D1B2A';

/** Height of the mobile action bar: 8px padding + 52px buttons + 8px padding (plus the safe-area inset, added in CSS). */
export const ACTION_BAR_HEIGHT_PX = 68;

/** The breakpoint where the action bar hides and the header turns sticky and shows its call button. */
export const DESKTOP_MIN_WIDTH_PX = 900;

/** Flat primary-button fill: the first stop of the theme's ctaGradient (verticalThemes.test.ts checks ctaText on every stop). */
export function ctaSolid(t: VerticalTheme): string {
  return /#[0-9A-Fa-f]{6}/.exec(t.ctaGradient)?.[0] ?? t.primary;
}

// ─────────────────────────────────────────────────────────────────────────
// Font (item 4)
// ─────────────────────────────────────────────────────────────────────────

/** The <head> font tags: preload the Hebrew subset (the LCP text is Hebrew). No Google Fonts request. */
export function siteFontHead(): string {
  return `<link rel="preload" href="${SITE_FONT_PATHS.hebrew}" as="font" type="font/woff2" crossorigin />`;
}

const HEBREW_RANGE = 'U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F';
const LATIN_RANGE = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

export function siteFontFaceCss(): string {
  const face = (src: string, range: string) => `@font-face{font-family:"Heebo";font-style:normal;font-weight:400 800;font-display:swap;src:url(${src}) format("woff2");unicode-range:${range};}`;
  return face(SITE_FONT_PATHS.hebrew, HEBREW_RANGE) + face(SITE_FONT_PATHS.latin, LATIN_RANGE);
}

// ─────────────────────────────────────────────────────────────────────────
// Icons (item 3)
// ─────────────────────────────────────────────────────────────────────────

export type SiteIconName = 'phone' | 'chat' | 'check' | 'chev' | 'shield' | 'star' | 'tool';

/**
 * The inline sprite, once per page right after <body>. No xmlns: inline SVG in HTML does not need it (and the local preview
 * rejects any absolute URL). The chevron points left, which is "forward" in RTL; mirror it if an LTR site is ever generated.
 */
export const SITE_ICON_SPRITE = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">'
  + '<symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></symbol>'
  + '<symbol id="i-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></symbol>'
  + '<symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>'
  + '<symbol id="i-chev" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></symbol>'
  + '<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>'
  + '<symbol id="i-tool" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></symbol>'
  + '<symbol id="i-star" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></symbol>'
  + '</svg>';

/** One sprite icon. Always aria-hidden: every icon sits beside its own text (Noa fix 4). */
export function icon(name: SiteIconName, cls = 'ic'): string {
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}

/**
 * Emoji (pictographs, dingbats, variation selectors, ZWJ, keycaps) removed from a string, with the space they leave trimmed.
 * Used where an existing approved string carries a leading emoji (the form thanks line): the text ships, the emoji never does.
 */
export const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{2300}-\u{23FF}]/gu;
export function withoutEmoji(value: string): string {
  return value.replace(EMOJI_PATTERN, '').replace(/\s{2,}/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────────────────
// Stock images (item 7: no stock image anywhere)
// ─────────────────────────────────────────────────────────────────────────

const STOCK_IMAGE_HOSTS = /^(?:https?:)?\/\/(?:images|plus|source)\.unsplash\.com\//i;

/** True for a stock-library image URL (the vertical fallback photos). */
export function isStockImageUrl(url: string | undefined | null): boolean {
  return STOCK_IMAGE_HOSTS.test((url ?? '').trim());
}

/**
 * The page's own image (og:image, schema image) or '' when the only image is a stock photo. Until the generated theme card of
 * Yonatan's condition 9 exists, a site without an owner photo carries no og:image and no schema image (never the stock one).
 */
export function ownerImageUrl(url: string | undefined | null): string {
  const value = (url ?? '').trim();
  return value && !isStockImageUrl(value) ? value : '';
}

// ─────────────────────────────────────────────────────────────────────────
// CSS class system (thin slice of item 9)
// ─────────────────────────────────────────────────────────────────────────

/** The redesign's class CSS, driven by custom properties from the theme. Pages append their own CSS after it. */
export function siteCss(t: VerticalTheme): string {
  const bar = `calc(${ACTION_BAR_HEIGHT_PX + 1}px + env(safe-area-inset-bottom, 0px))`; // +1: the bar's top border
  return [
    siteFontFaceCss(),
    `:root{--primary:${t.primary};--cta:${ctaSolid(t)};--cta-text:${t.ctaText};--wa:${WHATSAPP_FILL};--wa-text:${WHATSAPP_TEXT};--surface:${t.surface};--surface-alt:${t.surfaceAlt};--text:${t.textPrimary};--muted:${t.textMuted};--border:${t.border};--accent-text:${t.accentText};--r-sm:8px;--r-md:12px;--bar-h:${bar};}`,
    'html{scroll-padding-bottom:calc(var(--bar-h) + 24px);}',
    '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}',
    `body{font-family:${SITE_FONT_STACK};line-height:1.6;}`,
    'h1,h2,h3,button,input{font-family:inherit;}',
    // Never italicise Hebrew (item 4): no element of a generated site renders in italics.
    'em,i,blockquote,blockquote p{font-style:normal;}',
    '.on-dark :focus-visible{outline-color:#fff;}',
    '.ic{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    // Skip link
    '.skip{position:absolute;inset-inline-start:8px;top:-80px;z-index:100;background:#fff;color:var(--primary);padding:12px 16px;border-radius:var(--r-sm);font-weight:700;}',
    '.skip:focus{top:8px;}',
    // Header (item 1): one 56px row; the call button only from the desktop breakpoint (the bar owns it on mobile).
    '.site-hdr{background:var(--surface);border-bottom:1px solid var(--border);}',
    '.site-hdr .wrap{display:flex;align-items:center;gap:8px;min-height:56px;max-width:1120px;margin-inline:auto;padding-inline:16px;}',
    '.brand{display:block;flex:1;min-width:0;line-height:48px;font-weight:800;font-size:1.125rem;color:var(--primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none;}',
    '.site-nav{display:flex;align-items:center;}',
    '.site-nav a{display:inline-flex;align-items:center;min-height:48px;padding-inline:8px;font-size:0.9375rem;font-weight:500;color:var(--primary);text-decoration:none;white-space:nowrap;}',
    '.site-nav a:hover{text-decoration:underline;}',
    '.site-nav .nav-home{display:none;}',
    '.site-hdr .hdr-call{display:none;}',
    // Buttons (no gradients, no ghost variants)
    '.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:8px 24px;border-radius:var(--r-sm);font-weight:800;font-size:1.0625rem;line-height:1.2;text-decoration:none;border:0;cursor:pointer;}',
    '.btn-call{background:var(--cta);color:var(--cta-text);}',
    '.btn-call:hover{filter:brightness(0.92);}',
    '.btn-wa{background:var(--wa);color:var(--wa-text);}',
    '.btn .num{font-weight:500;font-size:0.9375rem;}',
    // Solid hero (item 7): primary colour, start-aligned, no image. .hero-photo is the GBP photo slot (renders nothing yet).
    '.hero{background:var(--primary);color:#fff;padding:32px 16px 40px;}',
    '.hero-grid{display:grid;gap:24px;max-width:1120px;margin-inline:auto;text-align:start;}',
    '.hero h1{color:#fff;font-size:clamp(1.75rem, 1.2rem + 2.6vw, 3rem);font-weight:800;line-height:1.15;}',
    '.hero .sub{color:rgba(255,255,255,0.9);font-size:1.125rem;line-height:1.6;margin-top:12px;max-width:46ch;}',
    '.hero-badge{display:inline-block;background:rgba(255,255,255,0.14);color:#fff;padding:6px 14px;border-radius:999px;font-size:0.9375rem;font-weight:700;margin-bottom:12px;}',
    '.hero-cta{display:grid;gap:12px;margin-top:24px;}',
    // A visible ring keeps the call button distinct where the theme's CTA colour equals its primary colour.
    '.hero .btn-call{box-shadow:0 0 0 2px #fff;}',
    '.hero .btn-call:focus-visible{outline-offset:4px;}',
    '.hero-note{color:rgba(255,255,255,0.9);font-size:0.9375rem;margin-top:12px;}',
    '.hero-note strong{font-weight:700;color:#fff;}',
    // Trust facts (item 8): a checked list on white, one column on mobile, four across on desktop.
    '.trust{background:var(--surface);border-bottom:1px solid var(--border);padding:24px 16px;}',
    '.trust ul{list-style:none;display:grid;gap:12px;max-width:1120px;margin-inline:auto;}',
    '.trust li{display:flex;gap:10px;align-items:flex-start;font-weight:500;font-size:0.9375rem;line-height:1.4;color:var(--text);}',
    '.trust .ic{color:var(--accent-text);margin-top:1px;}',
    // Service cards (item 5): whole-card links through the H3 link's ::after; unlinked cards stay plain.
    '.svc{list-style:none;display:grid;gap:12px;}',
    '.svc-card{position:relative;display:flex;align-items:flex-start;gap:12px;min-height:56px;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);box-shadow:0 1px 2px rgba(13,27,42,0.06);}',
    '.svc-card .tile{width:40px;height:40px;flex:none;border-radius:var(--r-sm);background:var(--surface-alt);color:var(--primary);display:flex;align-items:center;justify-content:center;}',
    '.svc-body{flex:1;min-width:0;}',
    '.svc-card h3{font-size:1.125rem;font-weight:700;line-height:1.3;color:var(--primary);min-height:40px;display:flex;align-items:center;}',
    '.svc-card h3 a{color:inherit;text-decoration:none;}',
    '.svc-card h3 a::after{content:"";position:absolute;inset:0;border-radius:inherit;}',
    '.svc-card:has(a):hover{border-color:var(--primary);}',
    '.svc-card h3 a:focus-visible{outline:none;}',
    '.svc-card:focus-within{outline:3px solid var(--text);outline-offset:2px;}',
    '.svc-card p{color:var(--muted);font-size:0.9375rem;line-height:1.5;margin-top:4px;}',
    '.svc-card .chev{color:var(--muted);align-self:center;}',
    // Form labels (defect fix: visible labels, not placeholder-only fields)
    '.fld-label{display:block;font-size:0.9375rem;font-weight:700;color:var(--text);margin-bottom:6px;}',
    // Action bar (item 2): one row, two 52px buttons, no caption; hidden on desktop. The spacer keeps the footer clear of it.
    `.bar{position:fixed;inset-inline:0;bottom:0;z-index:50;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 12px calc(8px + env(safe-area-inset-bottom, 0px));background:var(--surface);border-top:1px solid var(--border);box-shadow:0 -8px 24px rgba(13,27,42,0.10);}`,
    '.bar.one{grid-template-columns:1fr;}',
    '.bar .btn{padding-inline:8px;}',
    '.bar-spacer{height:var(--bar-h);background:var(--surface);}',
    '@media (min-width:480px){.site-nav .nav-home{display:inline-flex;}}',
    '@media (min-width:600px){.svc{grid-template-columns:1fr 1fr;}.hero-cta{display:flex;flex-wrap:wrap;}}',
    `@media (min-width:${DESKTOP_MIN_WIDTH_PX}px){html{scroll-padding-bottom:0;scroll-padding-top:80px;}.site-hdr{position:sticky;top:0;z-index:50;}.site-hdr .wrap{min-height:68px;gap:24px;padding-inline:32px;}.brand{flex:none;font-size:1.25rem;max-width:40%;}.site-nav{flex:1;gap:8px;}.site-nav a{padding-inline:12px;font-size:1rem;}.site-hdr .hdr-call{display:inline-flex;min-height:48px;padding:6px 18px;font-size:1rem;}.hero{padding:64px 32px 72px;}.trust{padding-inline:32px;}.trust ul{grid-template-columns:repeat(4, 1fr);gap:24px;}.bar,.bar-spacer{display:none;}}`,
    '@media (min-width:960px){.svc{grid-template-columns:repeat(var(--cols, 4), 1fr);}}',
  ].join('\n    ');
}

// ─────────────────────────────────────────────────────────────────────────
// Header + nav (item 1), skip link
// ─────────────────────────────────────────────────────────────────────────

export interface SiteNavLink {
  href: string;
  text: string;
  /** The home link: hidden under 480px, where the business name is the home link. */
  home?: boolean;
}

export interface SiteHeaderOptions {
  businessName: string;
  phone: string;
  phoneHref: string;
  /** The nav (aria-label = RESEARCHED_SITE_LABELS.mainNavLabel). Unset = no nav (the single-page ads LP). */
  nav?: { label: string; links: SiteNavLink[] };
  /** The business name links here; null = plain text (the single-page ads LP). */
  homeHref?: string | null;
  /** Extra attributes on the call link (the ads LP's conversion onclick). */
  callAttrs?: string;
}

const HEBREW_LETTER = /[א-ת]/;

/** A name that is not plain Hebrew is isolated so a Latin / digit run never reorders the RTL line around it. */
function isolatedName(name: string): string {
  return HEBREW_LETTER.test(name) && !/[A-Za-z0-9]/.test(name) ? esc(name) : `<bdi>${esc(name)}</bdi>`;
}

export function skipLink(): string {
  return `<a class="skip" href="#main">${esc(SITE_DESIGN_LABELS.skipLink)}</a>`;
}

/** The one header: business name, nav, and the call button (shown from the desktop breakpoint). */
export function siteHeader(o: SiteHeaderOptions): string {
  const name = isolatedName(o.businessName);
  const brand = o.homeHref ? `<a class="brand" href="${esc(o.homeHref)}">${name}</a>` : `<div class="brand">${name}</div>`;
  const nav = o.nav && o.nav.links.length
    ? `<nav class="site-nav" aria-label="${esc(o.nav.label)}">${o.nav.links.map(link => `<a${link.home ? ' class="nav-home"' : ''} href="${esc(link.href)}">${esc(link.text)}</a>`).join('')}</nav>`
    : '';
  const call = o.phone ? `<a class="btn btn-call hdr-call" href="${o.phoneHref}"${o.callAttrs ? ` ${o.callAttrs}` : ''}>${icon('phone')}<span class="sr-only">${esc(SITE_DESIGN_LABELS.barCall)} </span><bdi dir="ltr">${esc(o.phone)}</bdi></a>` : '';
  return `  <header class="site-hdr"><div class="wrap">${brand}${nav}${call}</div></header>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Action bar (item 2)
// ─────────────────────────────────────────────────────────────────────────

export interface ActionBarOptions {
  phone: string;
  phoneHref: string;
  whatsapp: string;
  whatsappHref: string;
  callAttrs?: string;
  waAttrs?: string;
}

/** The mobile action bar plus its spacer; '' without a phone or WhatsApp number. Labels: bar.call / bar.whatsapp. */
export function actionBar(o: ActionBarOptions): string {
  const buttons = [
    o.phone ? `<a class="btn btn-call" href="${o.phoneHref}"${o.callAttrs ? ` ${o.callAttrs}` : ''}>${icon('phone')}<span>${esc(SITE_DESIGN_LABELS.barCall)}</span></a>` : '',
    o.whatsapp ? `<a class="btn btn-wa" href="${o.whatsappHref}" target="_blank" rel="noopener noreferrer"${o.waAttrs ? ` ${o.waAttrs}` : ''}>${icon('chat')}<span>${esc(SITE_DESIGN_LABELS.barWhatsapp)}</span></a>` : '',
  ].filter(Boolean);
  if (!buttons.length) return '';
  return `  <div class="bar-spacer" aria-hidden="true"></div>
  <div class="bar${buttons.length === 1 ? ' one' : ''}" data-action-bar>${buttons.join('')}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Trust facts (item 8)
// ─────────────────────────────────────────────────────────────────────────

/** The checked fact list; '' without items. The section is named by trust.label. Items keep the copy's order. */
export function trustFacts(items: readonly string[]): string {
  const list = items.map(item => (item ?? '').trim()).filter(Boolean);
  if (!list.length) return '';
  return `  <section class="trust" data-section="trust" aria-label="${esc(SITE_DESIGN_LABELS.trustLabel)}"><ul role="list">${list.map(item => `<li>${icon('check')}<span>${esc(item)}</span></li>`).join('')}</ul></section>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Hero (item 7, solid half) and the hours line
// ─────────────────────────────────────────────────────────────────────────

/**
 * The GBP photo slot beside the hero text (desktop) or below the CTAs (mobile). Item 7's photo half waits for the
 * owner-authorised GBP connection (Yonatan conditions 4 / 9), so it renders nothing and the hero text runs full width.
 */
export function heroPhotoSlot(): string {
  return '';
}

/**
 * The owner's hours for display (hero.hours): day groups from Noa's day letters, en-dash ranges with no spaces, 24h times,
 * a day the owner did not list shown with hours.closedDay, one ", " between day groups, in week order. Null when the hours
 * do not parse or a segment is not a contiguous day run (then the row is hidden; hero.hours.missing never ships).
 */
export function formatSiteHours(text: string | undefined): string | null {
  const segments = parseBusinessHoursSegments(text);
  if (!segments) return null;
  const contiguous = (days: number[]) => days.every((day, index) => index === 0 || day === days[index - 1] + 1);
  if (!segments.every(segment => contiguous(segment.days))) return null;
  const span = (from: number, to: number) => (from === to ? DAY_LETTERS[from] : `${DAY_LETTERS[from]}–${DAY_LETTERS[to]}`);
  const groups: Array<{ start: number; text: string }> = segments.map(segment => ({
    start: segment.days[0],
    text: `${span(segment.days[0], segment.days[segment.days.length - 1])} ${segment.opens}–${segment.closes}`,
  }));
  const open = new Set(segments.flatMap(segment => segment.days));
  for (let day = 0; day < 7; day += 1) {
    if (open.has(day)) continue;
    let end = day;
    while (end + 1 < 7 && !open.has(end + 1)) end += 1;
    groups.push({ start: day, text: `${span(day, end)} ${SITE_DESIGN_LABELS.closedDay}` });
    day = end;
  }
  return groups.sort((a, b) => a.start - b.start).map(group => group.text).join(', ');
}

/** The hero hours line: hero.hours.label then the hours; '' when the hours do not format. */
export function heroHoursLine(text: string | undefined): string {
  const hours = formatSiteHours(text);
  return hours ? `<p class="hero-note" data-hero-hours><strong>${esc(SITE_DESIGN_LABELS.hoursLabel)}</strong> <span>${esc(hours)}</span></p>` : '';
}
