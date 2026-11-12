// Minimal legal disclosure pages (privacy.html / accessibility.html) for
// client-generated LPs/sites. Per docs/specs/client-site-privacy-accessibility-minimal.md:
// one templated paragraph each, not a multi-section document like wao.co.il's
// own /privacy and /accessibility (those cover WAO's own data footprint, not
// a single client's lead form). Shared by both renderSitePages.ts (site mode,
// 5-page brochure) and the ads-lp deploy path (cloudflare-pages/deploy/route.ts).

import type { VerticalTheme } from './verticalThemes';
import type { CollectedData } from '@/lib/bot/prompts';
import { buildFraudBlockerTrackerHtml } from '../fraud-blocker/tracker';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// vatStatus is treated as non-exempt (build the accessibility page) unless the
// client explicitly confirmed osek-patur / under-120k status — never default
// to skipping a legally-required disclosure on missing/unclear data.
export function isAccessibilityExempt(vatStatus?: CollectedData['vatStatus']): boolean {
  return vatStatus === 'osek_patur' || vatStatus === 'under_120k';
}

interface LegalPageOpts {
  theme: VerticalTheme;
  data: CollectedData;
  /**
   * This page's own canonical URL: the extensionless URL Cloudflare Pages serves (M4 step 0), e.g. `${siteUrl}/privacy`
   * for the file privacy.html. null = no canonical (the 404 page).
   */
  canonicalUrl: string | null;
  /** Relative href back to the home page, e.g. '/' */
  homeHref: string;
  fraudBlockerSid?: string;
  /**
   * M2a.2 (researched sites): `<page> | <brand>` title, with an RLM before " | " for a Latin
   * brand (Yonatan's formula / CLAUDE.md bidi rule). Unset = legacy `<page> — <brand>`.
   */
  pipeTitle?: boolean;
  /**
   * M2a.3 (researched sites, Noa section 13): a Hebrew prefix letter takes a hyphen only before a
   * name starting with a Latin letter or a digit; before a Hebrew name it attaches directly.
   * Unset = legacy, always a hyphen (byte-identical). M2b.1e (Noa): the rule now applies on every page (prefixJoiner), so
   * this flag no longer changes the output; kept so existing callers stay valid.
   */
  prefixRule?: boolean;
  /**
   * Launch step 2 (capability 9): the footer's Google-profile row, pre-rendered by renderSitePages footerProfileRow (one
   * markup for every footer; the href comes from googleProfileUrl). Unset = no row (legacy markup unchanged).
   */
  footerProfileRow?: string;
}

/**
 * The joiner between a prefix letter and `name`: a hyphen only before a Latin letter or a digit (Noa section 13). M2b.1e
 * (Noa): legacy pages too, so a Hebrew owner name attaches directly; Latin / digit names keep the hyphen (byte-identical).
 */
export function prefixJoiner(name: string): string {
  return /^[A-Za-z0-9]/.test(name.trim()) ? '-' : '';
}

const RLM = '\u200F';

/**
 * M2b.1d: the legal pages load the same web fonts as every other site page (renderSitePages pageHead) and use the theme's
 * body and heading families, so they no longer fall back to a system font.
 */
const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Secular+One&family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet" />`;

/** The first family of a theme font stack, quoted, then the site's fallbacks (same rule as renderSitePages styleBlock). */
function themeFamily(stack: string): string {
  return `'${stack.split(',')[0].replace(/['"]/g, '')}', Assistant, sans-serif`;
}

function legalTitle(opts: LegalPageOpts, title: string, businessName: string): string {
  if (!opts.pipeTitle) return `${esc(title)} \u2014 ${businessName}`;
  if (!businessName) return esc(title);
  return `${esc(title)}${/[\u05D0-\u05EA]/.test(businessName) ? '' : RLM} | ${businessName}`;
}

function contactLine(data: CollectedData): { ownerName: string; phone: string; email?: string } {
  return {
    ownerName: data.ownerName || data.businessName || data.businessNiche || 'בעל העסק',
    // M2b.1e: whitespace-only counts as missing.
    phone: (data.phone || '').trim(),
    email: data.email?.trim() || undefined,
  };
}

/** The legal pages' link back to the homepage (existing approved copy; the 404 page reuses it). */
export const LEGAL_HOME_LINK_TEXT = 'חזרה לעמוד הבית';

/**
 * The 404 page copy (waocopy request 90f0786d-2cb4-4b7b-a0cf-b690b77ae770, Noa SHIP 2026-11-11;
 * record: docs/copy/site-bot-404-page-2026-11-11.json). Inserted byte-exact from the record, do not retype.
 */
export const NOT_FOUND_COPY = {
  title: 'עמוד לא נמצא',
  h1: 'העמוד לא נמצא',
  line: 'הכתובת שניסית לפתוח לא קיימת — הקישור למטה יחזיר אותך לעמוד הבית.',
} as const;

/** heading: the <h1> text when it differs from the <title> text (the 404 page); defaults to title. */
function legalDocument(opts: LegalPageOpts, title: string, bodyHtml: string, heading: string = title): string {
  const { theme: t, data, canonicalUrl, homeHref } = opts;
  const businessName = esc(data.businessName || data.businessNiche || '');

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  ${opts.fraudBlockerSid ? buildFraudBlockerTrackerHtml(opts.fraudBlockerSid) : ''}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${legalTitle(opts, title, businessName)}</title>
  <meta name="robots" content="noindex,follow" />${canonicalUrl === null ? '' : `
  <link rel="canonical" href="${canonicalUrl}" />`}
  ${FONT_LINKS}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${themeFamily(t.fontBody)}; background: ${t.bg}; color: ${t.textPrimary}; }
    h1 { font-family: ${themeFamily(t.fontHeading)}; font-weight: ${t.headingWeight}; }
    html { background: ${t.surface}; }
    a { color: ${t.accentText}; }
    p { line-height: 1.8; font-size: 0.98rem; color: ${t.textPrimary}; margin-bottom: 14px; }
  </style>
</head>
<body>
  <header style="padding:6px 20px;background:${t.surface};border-bottom:1px solid ${t.border};">
    <a href="${homeHref}" style="display:inline-flex;align-items:center;min-height:44px;font-weight:700;text-decoration:none;color:${t.primary};">${businessName}</a>
  </header>
  <main style="max-width:640px;margin:0 auto;padding:44px 20px;">
    <h1 style="font-size:1.4rem;margin-bottom:20px;color:${t.primary};">${esc(heading)}</h1>
    ${bodyHtml}
    <p style="margin-top:32px;"><a href="${homeHref}" style="display:inline-flex;align-items:center;min-height:44px;">${LEGAL_HOME_LINK_TEXT}</a></p>
  </main>
  <footer style="text-align:center;padding:14px 20px 22px;background:${t.surface};border-top:1px solid ${t.border};font-size:0.8rem;color:${t.textMuted};">${opts.footerProfileRow ?? ''}
    <a href="https://wao.co.il" style="display:inline-flex;align-items:center;gap:0.3em;min-height:44px;padding:0 8px;color:${t.textMuted};text-decoration:none;">נבנה עם <strong>WAO</strong> 🚀</a>
  </footer>
</body>
</html>`;
}

// Lawyer-approved wording (approved 2026-08-01) — see docs/legal/ for the
// broader lawyer-approved package this joins. Do NOT reword without re-approval;
// only the bracketed placeholders (business/owner name, phone, email) are
// dynamic — same pattern as docs/legal/subscription-legal-copy-final.md.
export function buildPrivacyHtml(opts: LegalPageOpts): string {
  const { ownerName, phone, email } = contactLine(opts.data);
  const businessName = esc(opts.data.businessName || opts.data.businessNiche || '');
  // M2b.1d: with no phone the phone clause is omitted and the email (if any) leads, without the joining word.
  const phonePart = phone ? ` בטלפון ${esc(phone)}` : '';
  const emailPart = email ? `${phone ? ' או' : ''} במייל: ${esc(email)}` : '';

  const body = `
    <p>הפרטים שתשאיר/י בטופס באתר זה (שם וטלפון) נאספים על ידי <strong>${businessName}</strong> כבעל השליטה במידע, ומשמשים אך ורק ליצירת קשר חוזר בנוגע לפנייתך.</p>
    <p>המידע לא יועבר לצד שלישי, למעט אם נדרש על פי דין.</p>
    <p>מסירת הפרטים היא לפי בחירתך בלבד. ללא מסירתם לא נוכל לחזור אליך.</p>
    <p>ניתן בכל עת לבקש לעיין במידע שנמסר, לבקש את תיקונו או את מחיקתו, בפנייה ל${prefixJoiner(ownerName)}${esc(ownerName)}${phonePart}${emailPart}.</p>
  `;

  return legalDocument(opts, 'מדיניות פרטיות', body);
}

// Lawyer-approved wording (approved 2026-08-01) — same re-approval rule as buildPrivacyHtml above.
export function buildAccessibilityHtml(opts: LegalPageOpts): string {
  const { ownerName, phone, email } = contactLine(opts.data);
  // M2b.1d: with no phone the phone clause is omitted and the email (if any) leads, without the joining word.
  const phonePart = phone ? ` בטלפון ${esc(phone)}` : '';
  const emailPart = email ? `${phone ? ' או' : ''} במייל: ${esc(email)}` : '';

  const body = `
    <p>אתר זה נבנה תוך התייחסות לדרישות תקן ישראלי 5568 (התאמות נגישות בהתאם ל-WCAG 2.0 ברמה AA), ככל הניתן.</p>
    <p>אם נתקלת בבעיה או שיש לך הערה בנושא נגישות האתר, ניתן לפנות ל${prefixJoiner(ownerName)}${esc(ownerName)}${phonePart}${emailPart}.</p>
  `;

  return legalDocument(opts, 'הצהרת נגישות', body);
}

/**
 * M4 step 0: the site's real top-level 404.html. Cloudflare Pages serves it (status 404) for any unknown path; without it
 * Pages treats the site as a single-page app and answers every unknown URL with the homepage and 200 (a soft 404).
 * noindex,follow and no canonical. The legal-page shell: business name linking home, the h1, the approved home link, the
 * WAO footer. Copy: NOT_FOUND_COPY (approved). The line's <p> sits directly above the home link, nothing in between.
 */
export function buildNotFoundHtml(opts: Omit<LegalPageOpts, 'canonicalUrl'>): string {
  return legalDocument({ ...opts, canonicalUrl: null }, NOT_FOUND_COPY.title, `<p>${esc(NOT_FOUND_COPY.line)}</p>`, NOT_FOUND_COPY.h1);
}
