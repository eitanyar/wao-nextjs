import type { VerticalTheme } from '@/lib/lp/verticalThemes';
import type { VerticalAssets } from '@/lib/lp/verticalAssets';
import type { LPCopy } from '@/lib/lp/lpCopyPrompt';
import type { CollectedData } from '@/lib/bot/prompts';

interface LandingPageProps {
  theme: VerticalTheme;
  assets: VerticalAssets;
  copy: LPCopy;
  data: CollectedData;
  heroImageUrl: string;
}

export default function LandingPage({ theme, assets, copy, data, heroImageUrl }: LandingPageProps) {
  const phone = data.phone || '';
  const whatsapp = data.whatsappNumber || data.phone || '';
  const whatsappHref = `https://wa.me/972${whatsapp.replace(/^0/, '').replace(/[^0-9]/g, '')}`;
  const phoneHref = `tel:${phone}`;
  const showWhatsApp = !!whatsapp;
  const showPhone = !!phone;
  const businessName = data.businessName || data.businessNiche || '';

  const t = theme; // alias for brevity

  return (
    <div dir="rtl" style={{ backgroundColor: t.bg, minHeight: '100vh', fontFamily: t.fontBody, color: t.textPrimary, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: t.surface, borderBottom: `1px solid ${t.border}`, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontFamily: t.fontHeading, fontWeight: t.headingWeight, fontSize: '1.1rem', color: t.primary }}>
          {businessName}
        </div>
        {showPhone && (
          <a href={phoneHref} style={{ background: t.ctaGradient, color: '#fff', padding: '15px 18px', borderRadius: t.radiusSm, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            📞 {phone}
          </a>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      {/* Hero image is purely atmospheric (gradient overlay hides most of it) — decorative, no alt needed */}
      <section style={{ position: 'relative', minHeight: '300px', backgroundImage: `url(${heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: t.heroTextAlign, padding: '0 20px' }}>
        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: t.heroGradient }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', padding: '48px 0' }}>
          {copy.responseTimeBadge && (
            <div style={{ display: 'inline-block', background: t.accent, color: '#fff', padding: '6px 16px', borderRadius: t.radiusSm, fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>
              ⚡ {copy.responseTimeBadge}
            </div>
          )}

          <h1 style={{ fontFamily: t.fontHeading, fontWeight: t.headingWeight, fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', color: '#FFFFFF', lineHeight: 1.2, marginBottom: '16px' }}>
            {copy.heroHeadline}
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 3vw, 1.15rem)', color: 'rgba(255,255,255,0.88)', marginBottom: '28px', lineHeight: 1.5 }}>
            {copy.heroSubheadline}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: t.heroTextAlign === 'center' ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
            {showPhone && (
              <a href={phoneHref} style={{ background: t.ctaGradient, color: '#fff', padding: '14px 28px', borderRadius: t.radiusSm, fontWeight: 800, fontSize: '1.05rem', textDecoration: 'none', display: 'inline-block' }}>
                📞 {copy.heroCta}
              </a>
            )}
            {showWhatsApp && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="וואטסאפ (נפתח בחלון חדש)" style={{ background: '#25D366', color: '#fff', padding: '14px 28px', borderRadius: t.radiusSm, fontWeight: 800, fontSize: '1.05rem', textDecoration: 'none', display: 'inline-block' }}>
                💬 וואטסאפ
              </a>
            )}
          </div>

          {copy.scarcityLine && (
            <p style={{ marginTop: '16px', color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
              ⏰ {copy.scarcityLine}
            </p>
          )}
        </div>
      </section>

      {/* ── Trust Bar ───────────────────────────────────────────── */}
      <section style={{ backgroundColor: t.primary, padding: '16px 20px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
          {copy.trustBarItems.map((item, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '6px 14px', borderRadius: t.radiusSm, fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* ── Star Rating Bar ─────────────────────────────────────── */}
      {copy.reviewContext && (
        <section style={{ backgroundColor: t.surface, borderBottom: `1px solid ${t.border}`, padding: '14px 20px', textAlign: 'center' }}>
          <span aria-label="דירוג 5 כוכבים" style={{ color: '#F5A623', fontSize: '1.1rem' }}>★★★★★</span>
          {' '}
          <span style={{ fontWeight: 700, color: t.textPrimary }}>{copy.reviewContext}</span>
        </section>
      )}

      {/* ── Services ────────────────────────────────────────────── */}
      <section style={{ padding: '40px 20px', backgroundColor: t.surfaceAlt }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: t.fontHeading, fontWeight: t.headingWeight, fontSize: '1.4rem', color: t.primary, marginBottom: '20px', textAlign: 'center' }}>
            {copy.servicesHeadline}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {copy.serviceItems.map((service, i) => (
              <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '14px 16px', fontWeight: 600, fontSize: '0.9rem', color: t.textPrimary, textAlign: 'center', borderInlineStart: `3px solid ${t.accent}` }}>
                {service}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Us / Guarantee ──────────────────────────────────── */}
      <section style={{ padding: '40px 20px', backgroundColor: t.surface }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ background: t.trustBadgeBg, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '24px 20px', marginBottom: '24px', borderInlineStart: `4px solid ${t.accent}` }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: t.primary, marginBottom: '8px', margin: '0 0 8px' }}>
              {assets.badgeEmoji} {copy.guaranteeBlock.split('.')[0]}
            </h3>
            <p style={{ color: t.textMuted, fontSize: '0.9rem', lineHeight: 1.5 }}>
              {copy.guaranteeBlock}
            </p>
          </div>

          <div style={{ background: t.trustBadgeBg, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '24px 20px', borderInlineStart: `4px solid ${t.accent}` }}>
            <p style={{ fontStyle: 'italic', fontSize: '1.05rem', color: t.textPrimary, lineHeight: 1.6, marginBottom: '12px' }}>
              ״{copy.reviewFeatured}״
            </p>
            {copy.reviewContext && (
              <div style={{ fontSize: '0.85rem', color: t.textMuted }}>
                <span aria-label="דירוג 5 כוכבים" style={{ color: '#F5A623' }}>★★★★★</span> {copy.reviewContext}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      {copy.faqItems.length > 0 && (
        <section style={{ padding: '40px 20px', backgroundColor: t.surfaceAlt }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: t.fontHeading, fontWeight: t.headingWeight, fontSize: '1.3rem', color: t.primary, marginBottom: '20px', textAlign: 'center' }}>
              {copy.faqHeadline}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {copy.faqItems.map((item, i) => (
                <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '16px 18px' }}>
                  <div style={{ fontWeight: 700, color: t.primary, marginBottom: '6px' }}>❓ {item.q}</div>
                  <div style={{ color: t.textMuted, fontSize: '0.9rem', lineHeight: 1.5 }}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── About ───────────────────────────────────────────────── */}
      <section style={{ padding: '36px 20px', backgroundColor: t.surface }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: t.ctaGradient, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.4rem' }}>
            {(data.ownerName || businessName || '?')[0]}
          </div>
          <p style={{ color: t.textMuted, fontSize: '0.95rem', lineHeight: 1.6 }}>{copy.aboutBlurb}</p>
        </div>
      </section>

      {/* ── Lead Form ───────────────────────────────────────────── */}
      <section style={{ padding: '40px 20px', backgroundColor: t.surfaceAlt }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 id="lead-form-heading" style={{ fontFamily: t.fontHeading, fontWeight: t.headingWeight, fontSize: '1.35rem', color: t.primary, marginBottom: '20px', textAlign: 'center' }}>
            {copy.formHeadline}
          </h2>
          <form aria-labelledby="lead-form-heading" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} onSubmit={e => e.preventDefault()}>
            <input type="text" placeholder="שם מלא" aria-label="שם מלא" required style={{ padding: '14px 16px', borderRadius: t.radiusSm, border: `1px solid ${t.border}`, fontSize: '1rem', fontFamily: t.fontBody, color: t.textPrimary, background: t.surface }} />
            <input type="tel" placeholder="050-0000000" aria-label="מספר טלפון" dir="ltr" required style={{ padding: '14px 16px', borderRadius: t.radiusSm, border: `1px solid ${t.border}`, fontSize: '1rem', fontFamily: t.fontBody, color: t.textPrimary, background: t.surface, textAlign: 'right' }} />
            <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" required style={{ marginTop: '3px', accentColor: t.accent, flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: t.textMuted, lineHeight: 1.4 }}>
                אני מאשר/ת קבלת הודעות שיווקיות בהתאם לחוק הספאם ומסכים/ה ל<strong>מדיניות הפרטיות</strong>.
              </span>
            </label>
            <button type="submit" style={{ padding: '15px', background: t.ctaGradient, color: '#fff', border: 'none', borderRadius: t.radiusSm, fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer', fontFamily: t.fontBody }}>
              {copy.heroCta}
            </button>
          </form>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', fontSize: '0.75rem', color: t.textMuted }}>
            <a href="/privacy" style={{ color: t.textMuted, padding: '8px 6px' }}>מדיניות פרטיות</a>
            <a href="/accessibility" style={{ color: t.textMuted, padding: '8px 6px' }}>הצהרת נגישות</a>
          </div>
        </div>
      </section>

      {/* ── Sticky Bottom Bar ───────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: t.surface, borderTop: `1px solid ${t.border}`, paddingTop: '10px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', paddingLeft: '16px', paddingRight: '16px', zIndex: 50, boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' }}>
        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: t.textMuted, marginBottom: '8px', fontWeight: 600 }}>{copy.stickyBarLine}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          {showPhone && (
            <a href={phoneHref} style={{ flex: 1, background: t.ctaGradient, color: '#fff', border: 'none', padding: '14px', borderRadius: t.radiusSm, fontWeight: 800, fontSize: '1rem', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
              📞 התקשר
            </a>
          )}
          {showWhatsApp && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="וואטסאפ (נפתח בחלון חדש)" style={{ flex: 1, background: '#25D366', color: '#fff', border: 'none', padding: '14px', borderRadius: t.radiusSm, fontWeight: 800, fontSize: '1rem', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
              💬 וואטסאפ
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
