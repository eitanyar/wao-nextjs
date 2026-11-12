import type { VerticalTheme } from './verticalThemes';
import type { VerticalAssets } from './verticalAssets';
import type { LPCopy } from './lpCopyPrompt';
import type { CollectedData } from '@/lib/bot/prompts';
import { buildFraudBlockerTrackerHtml } from '../fraud-blocker/tracker';
import { TEMPLATE_STRINGS } from './generationData';
import { SITE_DESIGN_LABELS } from './siteDesignLabels';
import { actionBar, heroHoursLine, heroPhotoSlot, icon, ownerImageUrl, siteCss, siteFontHead, siteHeader, skipLink, SITE_ICON_SPRITE, trustFacts, type SiteNavLink } from './siteDesign';

/**
 * M2b.1c: consent row tap targets. The whole <label> is the checkbox hit area (>= 44px tall), the checkbox itself is
 * 24px, and the privacy link inside the label gets its own >= 44px hit box via vertical padding cancelled by negative
 * margins (the text line box is unchanged). Shared with renderSitePages' leadFormSection.
 */
export const CONSENT_LABEL_STYLE = 'display:flex;gap:10px;align-items:center;min-height:44px;cursor:pointer;';
export const CONSENT_CHECKBOX_STYLE = 'width:24px;height:24px;margin:0;flex-shrink:0;cursor:pointer;';
export const CONSENT_LINK_STYLE = 'display:inline-block;padding:14px 0;margin:-14px 0;';

export interface RenderStaticHtmlParams {
  theme: VerticalTheme;
  assets: VerticalAssets;
  copy: LPCopy;
  data: CollectedData;
  heroImageUrl: string;
  slug: string;
  googleAdsCustomerId?: string;
  gtagSnippet?: string;
  formConversionLabel?: string;
  phoneConversionLabel?: string;
  whatsappConversionLabel?: string;
  /**
   * 'ads-lp' (default) — noindex/nofollow, no canonical, no schema. Safe for paid-ads LPs.
   * 'site'             — index/follow, canonical, Open Graph, FAQPage JSON-LD. For Site Bot brochure pages.
   */
  mode?: 'ads-lp' | 'site';
  /** Required for 'site' mode: the live domain root, e.g. 'https://daniel-locksmith.co.il' */
  siteUrl?: string;
  /** Site mode: the page's canonical / og:url, overriding the `${siteUrl}/${slug}` default (M4 step 0: the homepage passes the root). */
  canonicalUrl?: string;
  /** Override the auto-generated <title>. Use keyword-first formula per Yonatan's sign-off. */
  pageTitle?: string;
  fraudBlockerSid?: string;
  /** Redesign A (item 1): the nav of the one header ('site' mode, from renderSitePages). Unset = no nav (the ads LP). */
  siteNav?: { label: string; links: SiteNavLink[] };
}

/** Five decorative sprite stars (the visible review context text carries the meaning). */
const STARS = Array.from({ length: 5 }, () => icon('star', 'ic')).join('').replace(/class="ic"/g, 'class="ic" style="width:16px;height:16px;fill:currentColor;stroke:none;"');

/** Redesign A defect fix: the form button sends the form; it never repeats the call label (heroCta). */
const SUBMIT_LABEL = TEMPLATE_STRINGS.formSubmitLabel;

export function renderStaticHtml(p: RenderStaticHtmlParams): string {
  const { theme: t, copy, data, heroImageUrl, slug, googleAdsCustomerId = '' } = p;

  const isSite = (p.mode ?? 'ads-lp') === 'site';
  const siteRoot = p.siteUrl ? p.siteUrl.replace(/\/$/, '') : '';
  const canonicalUrl = isSite && siteRoot ? (p.canonicalUrl ?? `${siteRoot}/${slug === 'home' ? '' : slug}`) : '';

  const phone = data.phone || '';
  const whatsapp = data.whatsappNumber || data.phone || '';
  const whatsappHref = `https://wa.me/972${whatsapp.replace(/^0/, '').replace(/[^0-9]/g, '')}`;
  const phoneHref = `tel:${phone}`;
  const businessName = data.businessName || data.businessNiche || '';

  const phoneClick = p.phoneConversionLabel
    ? `onclick="if(window.gtag){gtag('event','conversion',{'send_to':'${p.phoneConversionLabel}'});}"`
    : '';
  const waClick = p.whatsappConversionLabel
    ? `onclick="if(window.gtag){gtag('event','conversion',{'send_to':'${p.whatsappConversionLabel}'});}"`
    : '';
  const formConvLabel = p.formConversionLabel || '';
  // Redesign A (item 7): no stock photo anywhere (not the hero, not og:image).
  const ogImage = ownerImageUrl(heroImageUrl);

  const faqHtml = copy.faqItems.map(item => `
    <div style="background:${t.surface};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:16px 18px;">
      <div style="font-weight:700;color:${t.primary};margin-bottom:6px;">${esc(item.q)}</div>
      <div style="color:${t.textMuted};font-size:0.9rem;line-height:1.5;">${esc(item.a)}</div>
    </div>`).join('');

  const serviceHtml = copy.serviceItems.map(s => `
        <li class="svc-card"><span class="tile">${icon('tool')}</span><div class="svc-body" style="font-weight:700;color:${t.textPrimary};min-height:40px;display:flex;align-items:center;">${esc(s)}</div></li>`).join('');

  const titleService = esc(data.primaryService || '');
  const autoTitle = data.primaryService
    ? `${titleService}${data.targetLocation ? ` — ${esc(data.targetLocation)}` : ''} | ${esc(businessName)}`
    : `${esc(businessName)}${data.targetLocation ? ` — ${esc(data.targetLocation)}` : ''}`;
  const resolvedTitle = p.pageTitle ? esc(p.pageTitle) : autoTitle;

  const faqSchemaJson = isSite && copy.faqItems.length > 0
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: copy.faqItems.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }).replace(/<\/script>/gi, '<\\/script>')
    : '';

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  ${p.fraudBlockerSid ? buildFraudBlockerTrackerHtml(p.fraudBlockerSid) : ''}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${resolvedTitle}</title>
  <meta name="robots" content="${isSite ? 'index,follow' : 'noindex,nofollow'}" />
  ${canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}" />` : ''}
  ${isSite ? `<meta property="og:type" content="website" />
  <meta property="og:title" content="${resolvedTitle}" />
  <meta property="og:description" content="${esc(copy.heroSubheadline)}" />
  ${canonicalUrl ? `<meta property="og:url" content="${canonicalUrl}" />` : ''}
${ogImage ? `  <meta property="og:image" content="${ogImage}" />\n` : ''}  <meta property="og:locale" content="he_IL" />` : ''}
  ${faqSchemaJson ? `<script type="application/ld+json">${faqSchemaJson}</script>` : ''}
  ${siteFontHead()}
  ${p.gtagSnippet || ''}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${t.bg}; color: ${t.textPrimary}; min-height: 100vh; }
    a { text-decoration: none; }
    input, button { font-family: inherit; }
    #form-success { display: none; text-align: center; color: ${t.accentText}; font-weight: 700; font-size: 1.1rem; padding: 20px; }
    #form-error { display: none; text-align: center; color: #e53e3e; font-size: 0.9rem; padding: 8px; }
    .submit-btn { min-height: 52px; padding: 15px; background: var(--cta); color: ${t.ctaText}; border: none; border-radius: ${t.radiusSm}; font-weight: 800; font-size: 1.05rem; cursor: pointer; width: 100%; }
    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    ${siteCss(t)}
  </style>
</head>
<body>
${SITE_ICON_SPRITE}
${skipLink()}

  <!-- Header -->
${siteHeader({ businessName, phone, phoneHref, nav: p.siteNav, homeHref: p.siteNav ? '/' : null, callAttrs: phoneClick })}

  <main id="main">
  <!-- Hero (Redesign A item 7: solid primary, start-aligned, no stock image) -->
  <section class="hero on-dark" data-section="hero">
    <div class="hero-grid">
      <div class="hero-text">
      ${copy.responseTimeBadge ? `<div class="hero-badge">${esc(copy.responseTimeBadge)}</div>` : ''}
      <h1>${esc(copy.heroHeadline)}</h1>
      <p class="sub">${esc(copy.heroSubheadline)}</p>
      <div class="hero-cta">
        ${phone ? `<a class="btn btn-call" href="${phoneHref}" ${phoneClick}>${icon('phone')}<span>${esc(copy.heroCta)}</span><bdi dir="ltr" class="num">${esc(phone)}</bdi></a>` : ''}
        ${whatsapp ? `<a class="btn btn-wa" href="${whatsappHref}" target="_blank" rel="noopener noreferrer" ${waClick}>${icon('chat')}<span>${esc(SITE_DESIGN_LABELS.heroWhatsapp)}</span></a>` : ''}
      </div>
      ${heroHoursLine(data.businessHours)}
      ${copy.scarcityLine ? `<p class="hero-note">${esc(copy.scarcityLine)}</p>` : ''}
      </div>${heroPhotoSlot()}
    </div>
  </section>

  <!-- Trust Facts (Redesign A item 8) -->
${trustFacts(copy.trustBarItems)}

  <!-- Star Rating -->
  ${copy.reviewContext ? `
  <section style="background:${t.surface};border-bottom:1px solid ${t.border};padding:14px 20px;text-align:center;">
    <span aria-hidden="true" style="display:inline-flex;gap:2px;vertical-align:middle;color:#E8A100;">${STARS}</span>
    <span style="font-weight:700;color:${t.textPrimary};margin-inline-start:6px;">${esc(copy.reviewContext)}</span>
  </section>` : ''}

  <!-- Services -->
  <section id="services" style="padding:40px 20px;background:${t.surfaceAlt};">
    <div style="max-width:700px;margin:0 auto;">
      <h2 style="font-weight:800;font-size:1.4rem;color:${t.primary};margin-bottom:20px;text-align:center;">${esc(copy.servicesHeadline)}</h2>
      <ul class="svc" role="list" style="--cols:${Math.min(Math.max(copy.serviceItems.length, 1), 4)};">
        ${serviceHtml}
      </ul>
    </div>
  </section>

  <!-- Guarantee + Review -->
  <section id="reviews" style="padding:40px 20px;background:${t.surface};">
    <div style="max-width:700px;margin:0 auto;">
      ${copy.guaranteeBlock ? `<div style="background:${t.trustBadgeBg};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:24px 20px;margin-bottom:24px;border-inline-start:4px solid ${t.accent};">
        <h3 style="font-weight:700;font-size:1rem;color:${t.primary};margin:0 0 8px;display:flex;align-items:center;gap:8px;">${icon('shield')}<span>${esc(copy.guaranteeBlock.split('.')[0])}</span></h3>
        <p style="color:${t.textMuted};font-size:0.9rem;line-height:1.5;">${esc(copy.guaranteeBlock)}</p>
      </div>` : ''}
      ${copy.reviewFeatured ? `
      <div style="background:${t.trustBadgeBg};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:24px 20px;border-inline-start:4px solid ${t.accent};">
        <p style="font-size:1.05rem;color:${t.textPrimary};line-height:1.6;margin-bottom:12px;">״${esc(copy.reviewFeatured)}״</p>
        ${copy.reviewContext ? `<div style="font-size:0.85rem;color:${t.textMuted};"><span aria-hidden="true" style="display:inline-flex;gap:2px;vertical-align:middle;color:#E8A100;">${STARS}</span> ${esc(copy.reviewContext)}</div>` : ''}
      </div>` : ''}
    </div>
  </section>

  <!-- FAQ -->
  ${copy.faqItems.length > 0 ? `
  <section id="faq" style="padding:40px 20px;background:${t.surfaceAlt};">
    <div style="max-width:700px;margin:0 auto;">
      <h2 style="font-weight:800;font-size:1.3rem;color:${t.primary};margin-bottom:20px;text-align:center;">${esc(copy.faqHeadline)}</h2>
      <div style="display:flex;flex-direction:column;gap:12px;">${faqHtml}</div>
    </div>
  </section>` : ''}

  <!-- About -->
  <section style="padding:36px 20px;background:${t.surface};">
    <div style="max-width:600px;margin:0 auto;text-align:center;">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--cta);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:${t.ctaText};font-weight:900;font-size:1.4rem;">
        ${esc((data.ownerName || businessName || '?')[0])}
      </div>
      <p style="color:${t.textMuted};font-size:0.95rem;line-height:1.6;">${esc(copy.aboutBlurb)}</p>
    </div>
  </section>

  <!-- Lead Form -->
  <section id="contact" style="padding:40px 20px;background:${t.surfaceAlt};">
    <div style="max-width:480px;margin:0 auto;">
      <h2 style="font-weight:800;font-size:1.35rem;color:${t.primary};margin-bottom:20px;text-align:center;">${esc(copy.formHeadline)}</h2>
      <form id="lead-form" style="display:flex;flex-direction:column;gap:14px;">
        <div><label class="fld-label" for="f-name">שם מלא</label><input type="text" id="f-name" autocomplete="name" required style="width:100%;min-height:52px;padding:14px 16px;border-radius:${t.radiusSm};border:1px solid ${t.border};font-size:1rem;color:${t.textPrimary};background:${t.surface};" /></div>
        <div><label class="fld-label" for="f-phone">מספר טלפון</label><input type="tel" id="f-phone" placeholder="050-0000000" dir="ltr" inputmode="tel" autocomplete="tel" required style="width:100%;min-height:52px;padding:14px 16px;border-radius:${t.radiusSm};border:1px solid ${t.border};font-size:1rem;color:${t.textPrimary};background:${t.surface};text-align:right;" /></div>
        <label style="${CONSENT_LABEL_STYLE}">
          <input type="checkbox" id="f-consent" required style="${CONSENT_CHECKBOX_STYLE}" />
          <span style="font-size:0.8rem;color:${t.textMuted};line-height:1.4;">אני מסכים/ה ל<a href="/privacy" style="${CONSENT_LINK_STYLE}color:${t.textMuted};text-decoration:underline;">מדיניות הפרטיות</a>.</span>
        </label>
        <div id="form-error">שגיאה בשליחה — נסה שוב או התקשר ישירות.</div>
        <button type="submit" class="submit-btn">${esc(SUBMIT_LABEL)}</button>
      </form>
      <div id="form-success">${icon('check')} תודה! נחזור אליך בהקדם.</div>
    </div>
  </section>
  </main>

  <!-- Sticky Bottom Bar -->
${actionBar({ phone, phoneHref, whatsapp, whatsappHref, callAttrs: phoneClick, waAttrs: waClick })}

  <script>
    // Extract click identifier from URL — gclid (desktop/Android) or wbraid/gbraid (iOS/Safari).
    // Never send more than one; Google throws GBRAID_WBRAID_BOTH_SET if multiple are present.
    var _params = new URLSearchParams(window.location.search);
    var _gclid   = _params.get('gclid')   || null;
    var _wbraid  = _params.get('wbraid')  || null;
    var _gbraid  = _params.get('gbraid')  || null;
    // Precedence: gclid > wbraid > gbraid (one only)
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
          source: 'lp-${slug}',
          orderId: orderId,
          slug: '${slug}',
          customerId: '${googleAdsCustomerId}',
          type: 'click-stub'
        }, _clickId))
      }).catch(function(){});
    }

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
            service: 'lp-form',
            source: 'lp-${slug}',
            message: 'פנייה מדף נחיתה: ${esc(businessName)}',
            orderId: orderId,
            slug: '${slug}',
            customerId: '${googleAdsCustomerId}',
            type: 'form'
          }, _clickId))
        });
        if (!res.ok) throw new Error('server error');
        this.style.display = 'none';
        successEl.style.display = 'block';
        ${formConvLabel ? `if(window.gtag){gtag('event','conversion',{'send_to':'${formConvLabel}','transaction_id':orderId});}` : ''}
      } catch(err) {
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '${esc(SUBMIT_LABEL)}';
      }
    });

    // Wire click-stub pings to all phone/WA links
    document.querySelectorAll('a[href^="tel:"]').forEach(function(el) {
      el.addEventListener('click', function() { _pingClick('phone-click'); });
    });
    document.querySelectorAll('a[href^="https://wa.me"]').forEach(function(el) {
      el.addEventListener('click', function() { _pingClick('whatsapp-click'); });
    });
  </script>
</body>
</html>`;
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
