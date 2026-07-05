import type { VerticalTheme } from './verticalThemes';
import type { VerticalAssets } from './verticalAssets';
import type { LPCopy } from './lpCopyPrompt';
import type { CollectedData } from '@/lib/bot/prompts';

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
  /** Override the auto-generated <title>. Use keyword-first formula per Yonatan's sign-off. */
  pageTitle?: string;
}

export function renderStaticHtml(p: RenderStaticHtmlParams): string {
  const { theme: t, assets, copy, data, heroImageUrl, slug, googleAdsCustomerId = '' } = p;

  const isSite = (p.mode ?? 'ads-lp') === 'site';
  const siteRoot = p.siteUrl ? p.siteUrl.replace(/\/$/, '') : '';
  const canonicalUrl = isSite && siteRoot ? `${siteRoot}/${slug === 'home' ? '' : slug}` : '';

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

  const faqHtml = copy.faqItems.map(item => `
    <div style="background:${t.surface};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:16px 18px;">
      <div style="font-weight:700;color:${t.primary};margin-bottom:6px;">❓ ${esc(item.q)}</div>
      <div style="color:${t.textMuted};font-size:0.9rem;line-height:1.5;">${esc(item.a)}</div>
    </div>`).join('');

  const serviceHtml = copy.serviceItems.map(s => `
    <div style="background:${t.surface};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:14px 16px;font-weight:600;font-size:0.9rem;color:${t.textPrimary};text-align:center;border-inline-start:3px solid ${t.accent};">
      ${esc(s)}
    </div>`).join('');

  const trustBarHtml = copy.trustBarItems.map(item => `
    <div style="background:rgba(255,255,255,0.12);color:#fff;padding:6px 14px;border-radius:${t.radiusSm};font-size:0.85rem;font-weight:600;white-space:nowrap;">
      ${esc(item)}
    </div>`).join('');

  const autoTitle = `${esc(businessName)}${data.targetLocation ? ` — ${esc(data.targetLocation)}` : ''}`;
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
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${resolvedTitle}</title>
  <meta name="robots" content="${isSite ? 'index,follow' : 'noindex,nofollow'}" />
  ${canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}" />` : ''}
  ${isSite ? `<meta property="og:type" content="website" />
  <meta property="og:title" content="${resolvedTitle}" />
  <meta property="og:description" content="${esc(copy.heroSubheadline)}" />
  ${canonicalUrl ? `<meta property="og:url" content="${canonicalUrl}" />` : ''}
  <meta property="og:image" content="${heroImageUrl}" />
  <meta property="og:locale" content="he_IL" />` : ''}
  ${faqSchemaJson ? `<script type="application/ld+json">${faqSchemaJson}</script>` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Secular+One&family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet" />
  ${p.gtagSnippet || ''}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: '${t.fontBody.split(',')[0].replace(/['"]/g, '')}', Assistant, sans-serif; background: ${t.bg}; color: ${t.textPrimary}; min-height: 100vh; padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
    a { text-decoration: none; }
    input, button { font-family: inherit; }
    #form-success { display: none; text-align: center; color: ${t.accent}; font-weight: 700; font-size: 1.1rem; padding: 20px; }
    #form-error { display: none; text-align: center; color: #e53e3e; font-size: 0.9rem; padding: 8px; }
    .submit-btn { padding: 15px; background: ${t.ctaGradient}; color: #fff; border: none; border-radius: ${t.radiusSm}; font-weight: 800; font-size: 1.05rem; cursor: pointer; width: 100%; }
    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  </style>
</head>
<body>

  <!-- Header -->
  <header style="position:sticky;top:0;z-index:50;background:${t.surface};border-bottom:1px solid ${t.border};padding:12px 20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:1.1rem;color:${t.primary};">${esc(businessName)}</div>
    ${phone ? `<a href="${phoneHref}" ${phoneClick} style="background:${t.ctaGradient};color:#fff;padding:10px 18px;border-radius:${t.radiusSm};font-weight:700;font-size:0.9rem;white-space:nowrap;">📞 ${esc(phone)}</a>` : ''}
  </header>

  <!-- Hero -->
  <section style="position:relative;min-height:300px;background-image:url(${heroImageUrl});background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;text-align:${t.heroTextAlign};padding:0 20px;">
    <div style="position:absolute;inset:0;background:${t.heroGradient};"></div>
    <div style="position:relative;z-index:1;max-width:600px;padding:48px 0;">
      ${copy.responseTimeBadge ? `<div style="display:inline-block;background:${t.accent};color:#fff;padding:6px 16px;border-radius:${t.radiusSm};font-size:0.85rem;font-weight:700;margin-bottom:16px;">⚡ ${esc(copy.responseTimeBadge)}</div>` : ''}
      <h1 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:clamp(1.6rem,5vw,2.4rem);color:#fff;line-height:1.2;margin-bottom:16px;">${esc(copy.heroHeadline)}</h1>
      <p style="font-size:clamp(1rem,3vw,1.15rem);color:rgba(255,255,255,0.88);margin-bottom:28px;line-height:1.5;">${esc(copy.heroSubheadline)}</p>
      <div style="display:flex;gap:12px;justify-content:${t.heroTextAlign === 'center' ? 'center' : 'flex-start'};flex-wrap:wrap;">
        ${phone ? `<a href="${phoneHref}" ${phoneClick} style="background:${t.ctaGradient};color:#fff;padding:14px 28px;border-radius:${t.radiusSm};font-weight:800;font-size:1.05rem;display:inline-block;">📞 ${esc(copy.heroCta)}</a>` : ''}
        ${whatsapp ? `<a href="${whatsappHref}" target="_blank" rel="noopener noreferrer" ${waClick} style="background:#25D366;color:#fff;padding:14px 28px;border-radius:${t.radiusSm};font-weight:800;font-size:1.05rem;display:inline-block;">💬 וואטסאפ</a>` : ''}
      </div>
      ${copy.scarcityLine ? `<p style="margin-top:16px;color:rgba(255,255,255,0.75);font-size:0.9rem;">⏰ ${esc(copy.scarcityLine)}</p>` : ''}
    </div>
  </section>

  <!-- Trust Bar -->
  <section style="background:${t.primary};padding:16px 20px;">
    <div style="max-width:700px;margin:0 auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
      ${trustBarHtml}
    </div>
  </section>

  <!-- Star Rating -->
  ${copy.reviewContext ? `
  <section style="background:${t.surface};border-bottom:1px solid ${t.border};padding:14px 20px;text-align:center;">
    <span aria-label="דירוג 5 כוכבים" style="color:#F5A623;font-size:1.1rem;">★★★★★</span>
    <span style="font-weight:700;color:${t.textPrimary};margin-inline-start:6px;">${esc(copy.reviewContext)}</span>
  </section>` : ''}

  <!-- Services -->
  <section style="padding:40px 20px;background:${t.surfaceAlt};">
    <div style="max-width:700px;margin:0 auto;">
      <h2 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:1.4rem;color:${t.primary};margin-bottom:20px;text-align:center;">${esc(copy.servicesHeadline)}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
        ${serviceHtml}
      </div>
    </div>
  </section>

  <!-- Guarantee + Review -->
  <section style="padding:40px 20px;background:${t.surface};">
    <div style="max-width:700px;margin:0 auto;">
      <div style="background:${t.trustBadgeBg};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:24px 20px;margin-bottom:24px;border-inline-start:4px solid ${t.accent};">
        <h3 style="font-weight:700;font-size:1rem;color:${t.primary};margin:0 0 8px;">${assets.badgeEmoji} ${esc(copy.guaranteeBlock.split('.')[0])}</h3>
        <p style="color:${t.textMuted};font-size:0.9rem;line-height:1.5;">${esc(copy.guaranteeBlock)}</p>
      </div>
      <div style="background:${t.trustBadgeBg};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:24px 20px;border-inline-start:4px solid ${t.accent};">
        <p style="font-style:italic;font-size:1.05rem;color:${t.textPrimary};line-height:1.6;margin-bottom:12px;">״${esc(copy.reviewFeatured)}״</p>
        ${copy.reviewContext ? `<div style="font-size:0.85rem;color:${t.textMuted};"><span style="color:#F5A623;">★★★★★</span> ${esc(copy.reviewContext)}</div>` : ''}
      </div>
    </div>
  </section>

  <!-- FAQ -->
  ${copy.faqItems.length > 0 ? `
  <section style="padding:40px 20px;background:${t.surfaceAlt};">
    <div style="max-width:700px;margin:0 auto;">
      <h2 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:1.3rem;color:${t.primary};margin-bottom:20px;text-align:center;">${esc(copy.faqHeadline)}</h2>
      <div style="display:flex;flex-direction:column;gap:12px;">${faqHtml}</div>
    </div>
  </section>` : ''}

  <!-- About -->
  <section style="padding:36px 20px;background:${t.surface};">
    <div style="max-width:600px;margin:0 auto;text-align:center;">
      <div style="width:60px;height:60px;border-radius:50%;background:${t.ctaGradient};margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:1.4rem;">
        ${esc((data.ownerName || businessName || '?')[0])}
      </div>
      <p style="color:${t.textMuted};font-size:0.95rem;line-height:1.6;">${esc(copy.aboutBlurb)}</p>
    </div>
  </section>

  <!-- Lead Form -->
  <section style="padding:40px 20px;background:${t.surfaceAlt};">
    <div style="max-width:480px;margin:0 auto;">
      <h2 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:1.35rem;color:${t.primary};margin-bottom:20px;text-align:center;">${esc(copy.formHeadline)}</h2>
      <form id="lead-form" style="display:flex;flex-direction:column;gap:14px;">
        <input type="text" id="f-name" placeholder="שם מלא" aria-label="שם מלא" required style="padding:14px 16px;border-radius:${t.radiusSm};border:1px solid ${t.border};font-size:1rem;color:${t.textPrimary};background:${t.surface};" />
        <input type="tel" id="f-phone" placeholder="050-0000000" aria-label="מספר טלפון" dir="ltr" required style="padding:14px 16px;border-radius:${t.radiusSm};border:1px solid ${t.border};font-size:1rem;color:${t.textPrimary};background:${t.surface};text-align:right;" />
        <label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer;">
          <input type="checkbox" id="f-consent" required style="margin-top:3px;flex-shrink:0;" />
          <span style="font-size:0.8rem;color:${t.textMuted};line-height:1.4;">אני מאשר/ת קבלת הודעות שיווקיות בהתאם לחוק הספאם ומסכים/ה למדיניות הפרטיות.</span>
        </label>
        <div id="form-error">שגיאה בשליחה — נסה שוב או התקשר ישירות.</div>
        <button type="submit" class="submit-btn">${esc(copy.heroCta)}</button>
      </form>
      <div id="form-success">✅ תודה! נחזור אליך בהקדם.</div>
    </div>
  </section>

  <!-- Sticky Bottom Bar -->
  <div style="position:fixed;bottom:0;left:0;right:0;background:${t.surface};border-top:1px solid ${t.border};padding-top:10px;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px));padding-left:16px;padding-right:16px;z-index:50;box-shadow:0 -2px 12px rgba(0,0,0,0.08);">
    <p style="text-align:center;font-size:0.78rem;color:${t.textMuted};margin-bottom:8px;font-weight:600;">${esc(copy.stickyBarLine)}</p>
    <div style="display:flex;gap:10px;">
      ${phone ? `<a href="${phoneHref}" ${phoneClick} style="flex:1;background:${t.ctaGradient};color:#fff;padding:14px;border-radius:${t.radiusSm};font-weight:800;font-size:1rem;text-align:center;display:block;">📞 התקשר</a>` : ''}
      ${whatsapp ? `<a href="${whatsappHref}" target="_blank" rel="noopener noreferrer" ${waClick} style="flex:1;background:#25D366;color:#fff;padding:14px;border-radius:${t.radiusSm};font-weight:800;font-size:1rem;text-align:center;display:block;">💬 וואטסאפ</a>` : ''}
    </div>
  </div>

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
        btn.textContent = '${esc(copy.heroCta)}';
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
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
