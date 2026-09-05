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
  /** This page's own canonical URL, e.g. `${siteUrl}/privacy.html` */
  canonicalUrl: string;
  /** Relative href back to the home page, e.g. '/' or '/index.html' */
  homeHref: string;
  fraudBlockerSid?: string;
}

function contactLine(data: CollectedData): { ownerName: string; phone: string; email?: string } {
  return {
    ownerName: data.ownerName || data.businessName || data.businessNiche || 'בעל העסק',
    phone: data.phone || '',
    email: data.email,
  };
}

function legalDocument(opts: LegalPageOpts, title: string, bodyHtml: string): string {
  const { theme: t, data, canonicalUrl, homeHref } = opts;
  const businessName = esc(data.businessName || data.businessNiche || '');

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  ${opts.fraudBlockerSid ? buildFraudBlockerTrackerHtml(opts.fraudBlockerSid) : ''}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — ${businessName}</title>
  <meta name="robots" content="noindex,follow" />
  <link rel="canonical" href="${canonicalUrl}" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Assistant, sans-serif; background: ${t.bg}; color: ${t.textPrimary}; min-height: 100vh; }
    a { color: ${t.accent}; }
    p { line-height: 1.8; font-size: 0.98rem; color: ${t.textPrimary}; margin-bottom: 14px; }
  </style>
</head>
<body>
  <header style="padding:16px 20px;background:${t.surface};border-bottom:1px solid ${t.border};">
    <a href="${homeHref}" style="font-weight:700;text-decoration:none;color:${t.primary};">${businessName}</a>
  </header>
  <main style="max-width:640px;margin:0 auto;padding:44px 20px;">
    <h1 style="font-size:1.4rem;margin-bottom:20px;color:${t.primary};">${esc(title)}</h1>
    ${bodyHtml}
    <p style="margin-top:32px;"><a href="${homeHref}">חזרה לעמוד הבית</a></p>
  </main>
  <footer style="text-align:center;padding:24px 20px 32px;background:${t.surface};border-top:1px solid ${t.border};font-size:0.8rem;color:${t.textMuted};">
    <a href="https://wao.co.il" style="color:${t.textMuted};text-decoration:none;">נבנה עם <strong>WAO</strong> 🚀</a>
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
  const emailPart = email ? ` או במייל: ${esc(email)}` : '';

  const body = `
    <p>הפרטים שתשאיר/י בטופס באתר זה (שם וטלפון) נאספים על ידי <strong>${businessName}</strong> כבעל השליטה במידע, ומשמשים אך ורק ליצירת קשר חוזר בנוגע לפנייתך.</p>
    <p>המידע לא יועבר לצד שלישי, למעט אם נדרש על פי דין.</p>
    <p>מסירת הפרטים היא לפי בחירתך בלבד. ללא מסירתם לא נוכל לחזור אליך.</p>
    <p>ניתן בכל עת לבקש לעיין במידע שנמסר, לבקש את תיקונו או את מחיקתו, בפנייה ל-${esc(ownerName)} בטלפון ${esc(phone)}${emailPart}.</p>
  `;

  return legalDocument(opts, 'מדיניות פרטיות', body);
}

// Lawyer-approved wording (approved 2026-08-01) — same re-approval rule as buildPrivacyHtml above.
export function buildAccessibilityHtml(opts: LegalPageOpts): string {
  const { ownerName, phone, email } = contactLine(opts.data);
  const emailPart = email ? ` או במייל: ${esc(email)}` : '';

  const body = `
    <p>אתר זה נבנה תוך התייחסות לדרישות תקן ישראלי 5568 (התאמות נגישות בהתאם ל-WCAG 2.0 ברמה AA), ככל הניתן.</p>
    <p>אם נתקלת בבעיה או שיש לך הערה בנושא נגישות האתר, ניתן לפנות ל-${esc(ownerName)} בטלפון ${esc(phone)}${emailPart}.</p>
  `;

  return legalDocument(opts, 'הצהרת נגישות', body);
}
