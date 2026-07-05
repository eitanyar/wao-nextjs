// Site Bot — renders the 5-page brochure site (index/about/services/contact/sitemap)
// from a SiteCopy + CollectedData pair. Wraps renderStaticHtml() for the home page
// (unmodified — see renderStaticHtml.ts) and builds the 3 standalone pages locally,
// sharing the same theme tokens, header, nav, and footer.

import type { VerticalTheme } from './verticalThemes';
import type { VerticalAssets } from './verticalAssets';
import type { SiteCopy } from './lpCopyPrompt';
import type { CollectedData } from '@/lib/bot/prompts';
import { renderStaticHtml, type RenderStaticHtmlParams } from './renderStaticHtml';

export interface RenderSitePagesParams extends Omit<RenderStaticHtmlParams, 'copy' | 'mode' | 'siteUrl'> {
  copy: SiteCopy;
  mode?: 'site';
  /** Required — the live domain root, e.g. 'https://daniel-locksmith.wao.co.il' */
  siteUrl: string;
}

export function renderSitePages(p: RenderSitePagesParams): Record<string, string> {
  const siteUrl = p.siteUrl.replace(/\/$/, '');

  return {
    'index.html': buildIndexHtml(p, siteUrl),
    'about.html': buildAboutHtml(p, siteUrl),
    'services.html': buildServicesHtml(p, siteUrl),
    'contact.html': buildContactHtml(p, siteUrl),
    'sitemap.xml': buildSitemap(siteUrl),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// index.html — delegate to renderStaticHtml (untouched), then inject the
// shared nav bar + footer around its existing header/sticky-bar structure.
// ─────────────────────────────────────────────────────────────────────────

function buildIndexHtml(p: RenderSitePagesParams, siteUrl: string): string {
  const html = renderStaticHtml({ ...p, mode: 'site', siteUrl });
  const t = p.theme;

  const withNav = html.replace(
    '<body>\n\n  <!-- Header -->',
    `<body>\n${navBar(t)}\n\n  <!-- Header -->`
  );

  const withFooter = withNav.replace(
    '  <!-- Sticky Bottom Bar -->',
    `${footerBadge(t)}\n\n  <!-- Sticky Bottom Bar -->`
  );

  return withFooter;
}

// ─────────────────────────────────────────────────────────────────────────
// Shared building blocks — same CSS variables, header, nav, footer as index.
// ─────────────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function contacts(data: CollectedData) {
  const phone = data.phone || '';
  const whatsapp = data.whatsappNumber || data.phone || '';
  const whatsappHref = `https://wa.me/972${whatsapp.replace(/^0/, '').replace(/[^0-9]/g, '')}`;
  const phoneHref = `tel:${phone}`;
  const businessName = data.businessName || data.businessNiche || '';
  return { phone, whatsapp, whatsappHref, phoneHref, businessName };
}

function styleBlock(t: VerticalTheme): string {
  return `<style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: '${t.fontBody.split(',')[0].replace(/['"]/g, '')}', Assistant, sans-serif; background: ${t.bg}; color: ${t.textPrimary}; min-height: 100vh; padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
    a { text-decoration: none; }
    input, button { font-family: inherit; }
    #form-success { display: none; text-align: center; color: ${t.accent}; font-weight: 700; font-size: 1.1rem; padding: 20px; }
    #form-error { display: none; text-align: center; color: #e53e3e; font-size: 0.9rem; padding: 8px; }
    .submit-btn { padding: 15px; background: ${t.ctaGradient}; color: #fff; border: none; border-radius: ${t.radiusSm}; font-weight: 800; font-size: 1.05rem; cursor: pointer; width: 100%; }
    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  </style>`;
}

function navBar(t: VerticalTheme): string {
  return `  <nav style="background:${t.surface};border-bottom:1px solid ${t.border};padding:10px 20px;display:flex;gap:20px;justify-content:flex-end;font-size:0.9rem;">
    <a href="/">בית</a>
    <a href="/services.html">שירותים</a>
    <a href="/about.html">אודות</a>
    <a href="/contact.html">צור קשר</a>
  </nav>`;
}

function footerBadge(t: VerticalTheme): string {
  return `  <footer style="text-align:center;padding:24px 20px 32px;background:${t.surface};border-top:1px solid ${t.border};font-size:0.8rem;color:${t.textMuted};">
    <a href="https://wao.co.il" style="color:${t.textMuted};text-decoration:none;">נבנה עם <strong>WAO</strong> 🚀</a>
  </footer>`;
}

function stickyHeader(t: VerticalTheme, businessName: string, phone: string, phoneHref: string): string {
  return `  <header style="position:sticky;top:0;z-index:50;background:${t.surface};border-bottom:1px solid ${t.border};padding:12px 20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:1.1rem;color:${t.primary};">${esc(businessName)}</div>
    ${phone ? `<a href="${phoneHref}" style="background:${t.ctaGradient};color:#fff;padding:10px 18px;border-radius:${t.radiusSm};font-weight:700;font-size:0.9rem;white-space:nowrap;">📞 ${esc(phone)}</a>` : ''}
  </header>`;
}

function pageHead(opts: {
  t: VerticalTheme;
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
}): string {
  const { t, title, description, canonicalUrl, ogImage } = opts;
  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:locale" content="he_IL" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Secular+One&family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet" />
  ${styleBlock(t)}
</head>`;
}

// Trust bar (same items as homepage) — reusable section.
function trustBarSection(t: VerticalTheme, items: string[]): string {
  const html = items.map(item => `
    <div style="background:rgba(255,255,255,0.12);color:#fff;padding:6px 14px;border-radius:${t.radiusSm};font-size:0.85rem;font-weight:600;white-space:nowrap;">
      ${esc(item)}
    </div>`).join('');
  return `  <section style="background:${t.primary};padding:16px 20px;">
    <div style="max-width:700px;margin:0 auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
      ${html}
    </div>
  </section>`;
}

// Lead form section (same markup/behavior as renderStaticHtml's Lead Form).
function leadFormSection(t: VerticalTheme, headline: string, ctaLabel: string): string {
  return `  <section style="padding:40px 20px;background:${t.surfaceAlt};">
    <div style="max-width:480px;margin:0 auto;">
      <h2 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:1.35rem;color:${t.primary};margin-bottom:20px;text-align:center;">${esc(headline)}</h2>
      <form id="lead-form" style="display:flex;flex-direction:column;gap:14px;">
        <input type="text" id="f-name" placeholder="שם מלא" aria-label="שם מלא" required style="padding:14px 16px;border-radius:${t.radiusSm};border:1px solid ${t.border};font-size:1rem;color:${t.textPrimary};background:${t.surface};" />
        <input type="tel" id="f-phone" placeholder="050-0000000" aria-label="מספר טלפון" dir="ltr" required style="padding:14px 16px;border-radius:${t.radiusSm};border:1px solid ${t.border};font-size:1rem;color:${t.textPrimary};background:${t.surface};text-align:right;" />
        <label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer;">
          <input type="checkbox" id="f-consent" required style="margin-top:3px;flex-shrink:0;" />
          <span style="font-size:0.8rem;color:${t.textMuted};line-height:1.4;">אני מאשר/ת קבלת הודעות שיווקיות בהתאם לחוק הספאם ומסכים/ה למדיניות הפרטיות.</span>
        </label>
        <div id="form-error">שגיאה בשליחה — נסה שוב או התקשר ישירות.</div>
        <button type="submit" class="submit-btn">${esc(ctaLabel)}</button>
      </form>
      <div id="form-success">✅ תודה! נחזור אליך בהקדם.</div>
    </div>
  </section>`;
}

// Wires the lead-form submit handler + tel/wa click-stub pings.
// Mirrors renderStaticHtml's inline <script> so /api/lead + conversion labels behave identically.
function pageScript(opts: {
  slug: string;
  businessName: string;
  googleAdsCustomerId: string;
  formConversionLabel: string;
  phoneConversionLabel: string;
  whatsappConversionLabel: string;
  ctaLabel: string;
  includeLeadForm: boolean;
}): string {
  const { slug, businessName, googleAdsCustomerId, formConversionLabel, phoneConversionLabel, whatsappConversionLabel, ctaLabel, includeLeadForm } = opts;

  return `  <script>
    var _params = new URLSearchParams(window.location.search);
    var _gclid   = _params.get('gclid')   || null;
    var _wbraid  = _params.get('wbraid')  || null;
    var _gbraid  = _params.get('gbraid')  || null;
    var _clickId = _gclid ? { gclid: _gclid } : _wbraid ? { wbraid: _wbraid } : _gbraid ? { gbraid: _gbraid } : {};

    function _uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function _pingClick(type) {
      var orderId = _uid();
      fetch('https://wao.co.il/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({
          name: null,
          phone: null,
          service: type,
          source: 'site-${slug}',
          orderId: orderId,
          slug: '${slug}',
          customerId: '${googleAdsCustomerId}',
          type: 'click-stub'
        }, _clickId))
      }).catch(function(){});
    }
    ${includeLeadForm ? `
    document.getElementById('lead-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = this.querySelector('button[type="submit"]');
      var errEl = document.getElementById('form-error');
      var successEl = document.getElementById('form-success');
      btn.disabled = true;
      btn.textContent = 'שולח...';
      errEl.style.display = 'none';
      var orderId = _uid();
      try {
        var res = await fetch('https://wao.co.il/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({
            name: document.getElementById('f-name').value,
            phone: document.getElementById('f-phone').value,
            service: 'site-form',
            source: 'site-${slug}',
            message: 'פנייה מהאתר: ${esc(businessName)}',
            orderId: orderId,
            slug: '${slug}',
            customerId: '${googleAdsCustomerId}',
            type: 'form'
          }, _clickId))
        });
        if (!res.ok) throw new Error('server error');
        this.style.display = 'none';
        successEl.style.display = 'block';
        ${formConversionLabel ? `if(window.gtag){gtag('event','conversion',{'send_to':'${formConversionLabel}','transaction_id':orderId});}` : ''}
      } catch(err) {
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '${esc(ctaLabel)}';
      }
    });` : ''}

    document.querySelectorAll('a[href^="tel:"]').forEach(function(el) {
      el.addEventListener('click', function() {
        _pingClick('phone-click');
        ${phoneConversionLabel ? `if(window.gtag){gtag('event','conversion',{'send_to':'${phoneConversionLabel}'});}` : ''}
      });
    });
    document.querySelectorAll('a[href^="https://wa.me"]').forEach(function(el) {
      el.addEventListener('click', function() {
        _pingClick('whatsapp-click');
        ${whatsappConversionLabel ? `if(window.gtag){gtag('event','conversion',{'send_to':'${whatsappConversionLabel}'});}` : ''}
      });
    });
  </script>`;
}

// ─────────────────────────────────────────────────────────────────────────
// about.html
// ─────────────────────────────────────────────────────────────────────────

function buildAboutHtml(p: RenderSitePagesParams, siteUrl: string): string {
  const { theme: t, copy, data, heroImageUrl, slug } = p;
  const { phone, phoneHref, businessName } = contacts(data);
  const canonicalUrl = `${siteUrl}/about.html`;

  const head = pageHead({
    t,
    title: `${esc(copy.aboutPageHeadline)} — ${esc(businessName)}`,
    description: copy.aboutPageBody,
    canonicalUrl,
    ogImage: heroImageUrl,
  });

  const trustBar = trustBarSection(t, copy.trustBarItems);

  const body = `${stickyHeader(t, businessName, phone, phoneHref)}

  <!-- About Hero -->
  <section style="padding:44px 20px 36px;background:${t.surface};text-align:center;">
    <div style="max-width:600px;margin:0 auto;">
      <div style="width:72px;height:72px;border-radius:50%;background:${t.ctaGradient};margin:0 auto 20px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:1.7rem;">
        ${esc((data.ownerName || businessName || '?')[0])}
      </div>
      <h1 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:clamp(1.5rem,4.5vw,2.1rem);color:${t.primary};line-height:1.25;margin-bottom:18px;">${esc(copy.aboutPageHeadline)}</h1>
      <p style="color:${t.textMuted};font-size:1rem;line-height:1.7;">${esc(copy.aboutPageBody)}</p>
    </div>
  </section>

${trustBar}

  <!-- CTA -->
  <section style="padding:36px 20px;background:${t.surfaceAlt};text-align:center;">
    <a href="/contact.html" style="display:inline-block;background:${t.ctaGradient};color:#fff;padding:14px 32px;border-radius:${t.radiusSm};font-weight:800;font-size:1.05rem;">${esc(copy.heroCta)}</a>
  </section>

${pageScript({
    slug,
    businessName,
    googleAdsCustomerId: p.googleAdsCustomerId || '',
    formConversionLabel: '',
    phoneConversionLabel: p.phoneConversionLabel || '',
    whatsappConversionLabel: p.whatsappConversionLabel || '',
    ctaLabel: copy.heroCta,
    includeLeadForm: false,
  })}`;

  return assembleDocument(t, head, body, p.gtagSnippet);
}

// ─────────────────────────────────────────────────────────────────────────
// services.html
// ─────────────────────────────────────────────────────────────────────────

function buildServicesHtml(p: RenderSitePagesParams, siteUrl: string): string {
  const { theme: t, copy, data, heroImageUrl, slug } = p;
  const { phone, phoneHref, businessName } = contacts(data);
  const canonicalUrl = `${siteUrl}/services.html`;

  const head = pageHead({
    t,
    title: `${esc(copy.servicesHeadline)} — ${esc(businessName)}`,
    description: copy.heroSubheadline,
    canonicalUrl,
    ogImage: heroImageUrl,
  });

  const cards = copy.serviceDetails.map(s => `
    <div style="background:${t.surface};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:20px;border-inline-start:3px solid ${t.accent};">
      <h3 style="font-weight:700;font-size:1rem;color:${t.primary};margin-bottom:8px;">${esc(s.name)}</h3>
      <p style="color:${t.textMuted};font-size:0.9rem;line-height:1.5;">${esc(s.description)}</p>
    </div>`).join('');

  const body = `${stickyHeader(t, businessName, phone, phoneHref)}

  <!-- Services -->
  <section style="padding:40px 20px;background:${t.surfaceAlt};">
    <div style="max-width:700px;margin:0 auto;">
      <h1 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:clamp(1.4rem,4vw,1.9rem);color:${t.primary};margin-bottom:24px;text-align:center;">${esc(copy.servicesHeadline)}</h1>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
        ${cards}
      </div>
    </div>
  </section>

${leadFormSection(t, copy.formHeadline, copy.heroCta)}

${pageScript({
    slug,
    businessName,
    googleAdsCustomerId: p.googleAdsCustomerId || '',
    formConversionLabel: p.formConversionLabel || '',
    phoneConversionLabel: p.phoneConversionLabel || '',
    whatsappConversionLabel: p.whatsappConversionLabel || '',
    ctaLabel: copy.heroCta,
    includeLeadForm: true,
  })}`;

  return assembleDocument(t, head, body, p.gtagSnippet);
}

// ─────────────────────────────────────────────────────────────────────────
// contact.html
// ─────────────────────────────────────────────────────────────────────────

function buildContactHtml(p: RenderSitePagesParams, siteUrl: string): string {
  const { theme: t, copy, data, heroImageUrl, slug } = p;
  const { phone, phoneHref, whatsapp, whatsappHref, businessName } = contacts(data);
  const canonicalUrl = `${siteUrl}/contact.html`;

  const head = pageHead({
    t,
    title: `${esc(copy.formHeadline)} — ${esc(businessName)}`,
    description: copy.heroSubheadline,
    canonicalUrl,
    ogImage: heroImageUrl,
  });

  const hoursHtml = data.businessHours
    ? `<p style="color:${t.textMuted};font-size:0.9rem;margin-top:8px;">🕒 ${esc(data.businessHours)}</p>`
    : '';

  const body = `${stickyHeader(t, businessName, phone, phoneHref)}

  <!-- Contact Intro -->
  <section style="padding:36px 20px 20px;background:${t.surface};text-align:center;">
    <div style="max-width:500px;margin:0 auto;">
      <h1 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:clamp(1.4rem,4vw,1.9rem);color:${t.primary};margin-bottom:16px;">${esc(copy.formHeadline)}</h1>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:8px;">
        ${phone ? `<a href="${phoneHref}" style="background:${t.ctaGradient};color:#fff;padding:12px 24px;border-radius:${t.radiusSm};font-weight:800;font-size:1rem;">📞 ${esc(phone)}</a>` : ''}
        ${whatsapp ? `<a href="${whatsappHref}" target="_blank" rel="noopener noreferrer" style="background:#25D366;color:#fff;padding:12px 24px;border-radius:${t.radiusSm};font-weight:800;font-size:1rem;">💬 וואטסאפ</a>` : ''}
      </div>
      ${hoursHtml}
    </div>
  </section>

${leadFormSection(t, copy.formHeadline, copy.heroCta)}

${pageScript({
    slug,
    businessName,
    googleAdsCustomerId: p.googleAdsCustomerId || '',
    formConversionLabel: p.formConversionLabel || '',
    phoneConversionLabel: p.phoneConversionLabel || '',
    whatsappConversionLabel: p.whatsappConversionLabel || '',
    ctaLabel: copy.heroCta,
    includeLeadForm: true,
  })}`;

  return assembleDocument(t, head, body, p.gtagSnippet);
}

// Assembles <head> + <body> with nav bar (top) and footer badge (bottom) for
// the 3 standalone pages (index.html has its own injection path above).
function assembleDocument(t: VerticalTheme, head: string, bodyInner: string, gtagSnippet?: string): string {
  const headWithGtag = gtagSnippet ? head.replace('</head>', `  ${gtagSnippet}\n</head>`) : head;
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
${headWithGtag}
<body>
${navBar(t)}

${bodyInner}

${footerBadge(t)}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────
// sitemap.xml
// ─────────────────────────────────────────────────────────────────────────

function buildSitemap(siteUrl: string): string {
  const urls = ['', 'about.html', 'services.html', 'contact.html'];
  const entries = urls.map(u => `  <url>
    <loc>${siteUrl}/${u}</loc>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}
