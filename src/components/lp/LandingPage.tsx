'use client';

import { useEffect, useRef, useState } from 'react';
import type { VerticalTheme } from '@/lib/lp/verticalThemes';
import type { VerticalAssets } from '@/lib/lp/verticalAssets';
import type { LPCopy } from '@/lib/lp/lpCopyPrompt';

// Deliberately narrow — NOT the full CollectedData record. This component is
// 'use client', so anything on this type ships to the browser in page source
// (Next.js serializes client-component props into flight data). Only the
// fields actually rendered below belong here; internal ops/pricing fields
// (capacityUnit, avgJobValue, closeRate, pricingNotes, exclusions, etc.)
// must never be added to this interface — see docs/missions/lp-site-bot-qa-fixes-2026-07.md (BUG 4).
export interface LandingPagePublicData {
  phone?: string;
  whatsappNumber?: string;
  businessName?: string;
  businessNiche?: string;
  ownerName?: string;
}

interface LandingPageProps {
  theme: VerticalTheme;
  assets: VerticalAssets;
  copy: LPCopy;
  data: LandingPagePublicData;
  heroImageUrl: string;
  /** Used as `source: 'lp-<slug>'` on lead records and passed through to /api/leads. */
  slug?: string;
}

// Click identifier captured from the URL — gclid (desktop/Android) or wbraid/gbraid
// (iOS/Safari). Never send more than one; Google Ads throws GBRAID_WBRAID_BOTH_SET
// if multiple are present. Precedence: gclid > wbraid > gbraid.
type ClickId = { gclid?: string } | { wbraid?: string } | { gbraid?: string } | Record<string, never>;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function LandingPage({ theme, assets, copy, data, heroImageUrl, slug = '' }: LandingPageProps) {
  const phone = data.phone || '';
  const whatsapp = data.whatsappNumber || data.phone || '';
  const whatsappHref = `https://wa.me/972${whatsapp.replace(/^0/, '').replace(/[^0-9]/g, '')}`;
  const phoneHref = `tel:${phone}`;
  const showWhatsApp = !!whatsapp;
  const showPhone = !!phone;
  const businessName = data.businessName || data.businessNiche || '';

  const t = theme; // alias for brevity

  // Captured once on mount and reused for every lead-creation call for the
  // lifetime of this page view (form submit + phone/WhatsApp click pings).
  const clickIdRef = useRef<ClickId>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get('gclid');
    const wbraid = params.get('wbraid');
    const gbraid = params.get('gbraid');
    clickIdRef.current = gclid ? { gclid } : wbraid ? { wbraid } : gbraid ? { gbraid } : {};
  }, []);

  // "Zero silent drops" for phone/WhatsApp click pings — a bare fetch() can
  // be cancelled mid-flight by the tel:/wa.me navigation that follows the
  // click. navigator.sendBeacon() is purpose-built for exactly this: the
  // browser guarantees a queued POST survives the page unload. Fallback to
  // fetch(..., { keepalive: true }) only if sendBeacon is unavailable or its
  // per-page quota is exhausted (it returns false, not an accepted queue).
  // See docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §1.1.
  function pingClick(type: 'phone-click' | 'whatsapp-click') {
    const payload = JSON.stringify({
      source: `lp-${slug}`,
      orderId: uid(),
      slug,
      type,
      businessNiche: data.businessNiche || '',
      ...clickIdRef.current,
    });

    let accepted = false;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      accepted = navigator.sendBeacon('/api/leads', blob);
    }
    if (!accepted) {
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: payload,
      }).catch(() => {});
    }
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const HEADER_HEIGHT = 56;

  // In-page nav — only linking to sections that actually render for this
  // client (faq is conditional on copy.faqItems.length). "Why Us / Reviews"
  // is one combined section (id="reviews") in this component today.
  const navItems: { href: string; label: string }[] = [
    { href: '#services', label: 'שירותים' },
    { href: '#reviews', label: 'למה אנחנו' },
    ...(copy.faqItems.length > 0 ? [{ href: '#faq', label: 'שאלות נפוצות' }] : []),
    { href: '#contact', label: 'יצירת קשר' },
  ];

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Generated once per form-fill attempt (not a fresh uid() per handleSubmit
  // call) so the one automatic retry below — and any accidental double-submit
  // — reuses the same orderId. /api/leads upserts by orderId, so this makes
  // a retry/double-submit idempotent instead of creating a duplicate lead.
  // See priority-3 spec §1.1.
  const formOrderIdRef = useRef<string | null>(null);

  function buildFormPayload(orderId: string) {
    return JSON.stringify({
      name: nameInputRef.current?.value || '',
      phone: phoneInputRef.current?.value || '',
      source: `lp-${slug}`,
      orderId,
      slug,
      type: 'form',
      businessNiche: data.businessNiche || '',
      ...clickIdRef.current,
    });
  }

  function submitLead(orderId: string) {
    return fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true, // survives the tab closing before the response resolves
      body: buildFormPayload(orderId),
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormStatus('submitting');

    if (!formOrderIdRef.current) formOrderIdRef.current = uid();
    const orderId = formOrderIdRef.current;

    let res: Response;
    try {
      res = await submitLead(orderId);
    } catch {
      // Network-level failure (not a server error response) — flaky mobile
      // networks are the dominant real-world failure mode here, so exactly
      // one automatic retry after a short delay, no backoff tier.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        res = await submitLead(orderId);
      } catch {
        setFormStatus('error');
        return;
      }
    }

    if (!res.ok) {
      setFormStatus('error');
      return;
    }
    setFormStatus('success');
  }

  return (
    <div dir="rtl" style={{ backgroundColor: t.bg, minHeight: '100vh', fontFamily: t.fontBody, color: t.textPrimary, paddingTop: `${HEADER_HEIGHT}px` }}>

      {/* ── Header — fixed, minimal, icon-only CTAs (never a big colored
           button competing with the hero/page CTAs below it) ──────── */}
      <header
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          insetInlineEnd: 0,
          top: 0,
          zIndex: 200,
          height: `${HEADER_HEIGHT}px`,
          backgroundColor: t.surface,
          borderBottom: `1px solid ${t.border}`,
          padding: '0 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontFamily: t.fontHeading, fontWeight: t.headingWeight, fontSize: '1rem', color: t.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {businessName}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {showPhone && (
            <a href={phoneHref} onClick={() => pingClick('phone-click')} aria-label={`התקשר — ${phone}`} style={{ color: t.primary, display: 'flex' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
              </svg>
            </a>
          )}
          {showWhatsApp && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="וואטסאפ (נפתח בחלון חדש)" onClick={() => pingClick('whatsapp-click')} style={{ color: t.primary, display: 'flex' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.47 1.29 4.94L2 22l5.29-1.39a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.05h-.01a8.15 8.15 0 0 1-4.15-1.14l-.3-.18-3.14.82.84-3.06-.19-.32a8.13 8.13 0 0 1-1.25-4.35c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.4a8.11 8.11 0 0 1 2.39 5.77c0 4.5-3.67 8.22-8.13 8.22Zm4.47-6.13c-.24-.12-1.44-.71-1.67-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.78.95-.14.16-.28.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42-.14 0-.3-.02-.46-.02-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
              </svg>
            </a>
          )}
          <a href="#contact" aria-label="קפיצה לטופס יצירת קשר" style={{ color: t.primary, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
              <path d="M3 6.5l9 6.5 9-6.5" />
            </svg>
          </a>

          {/* Hamburger — points to in-page sections instead of duplicating the CTA row */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'סגור תפריט' : 'פתח תפריט'}
            aria-expanded={menuOpen}
            aria-controls="lp-nav-menu"
            style={{ cursor: 'pointer', padding: '4px', background: 'none', border: 'none', display: 'flex' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: '20px',
                    height: '2px',
                    background: t.primary,
                    borderRadius: '2px',
                    transition: 'all 0.3s ease',
                    transformOrigin: 'center',
                    transform: menuOpen
                      ? i === 0
                        ? 'rotate(45deg) translate(4px, 4px)'
                        : i === 2
                        ? 'rotate(-45deg) translate(4px, -4px)'
                        : 'scaleX(0)'
                      : 'none',
                    opacity: menuOpen && i === 1 ? 0 : 1,
                  }}
                />
              ))}
            </div>
          </button>
        </div>
      </header>

      {/* ── In-page nav dropdown ────────────────────────────────── */}
      <div
        id="lp-nav-menu"
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          insetInlineEnd: 0,
          top: `${HEADER_HEIGHT}px`,
          zIndex: 199,
          overflow: 'hidden',
          maxHeight: menuOpen ? '400px' : '0',
          transition: 'max-height 0.3s ease',
          backgroundColor: t.surface,
          borderBottom: menuOpen ? `1px solid ${t.border}` : 'none',
          boxShadow: menuOpen ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        <nav aria-label="ניווט בעמוד" style={{ display: 'flex', flexDirection: 'column', padding: '8px 16px 16px' }}>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{ padding: '13px 8px', color: t.textPrimary, fontWeight: 600, fontSize: '0.95rem', borderBottom: `1px solid ${t.border}`, textDecoration: 'none' }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '380px', backgroundImage: `url(${heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: t.heroTextAlign, padding: '0 20px' }}>
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
              <a href={phoneHref} onClick={() => pingClick('phone-click')} style={{ background: t.ctaGradient, color: '#fff', padding: '14px 28px', borderRadius: t.radiusSm, fontWeight: 800, fontSize: '1.05rem', textDecoration: 'none', display: 'inline-block' }}>
                📞 {copy.heroCta}
              </a>
            )}
            {showWhatsApp && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="וואטסאפ (נפתח בחלון חדש)" onClick={() => pingClick('whatsapp-click')} style={{ background: '#25D366', color: '#fff', padding: '14px 28px', borderRadius: t.radiusSm, fontWeight: 800, fontSize: '1.05rem', textDecoration: 'none', display: 'inline-block' }}>
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
      <section id="services" style={{ padding: '40px 20px', backgroundColor: t.surfaceAlt }}>
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
      <section id="reviews" style={{ padding: '40px 20px', backgroundColor: t.surface }}>
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
        <section id="faq" style={{ padding: '40px 20px', backgroundColor: t.surfaceAlt }}>
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
      <section id="contact" style={{ padding: '40px 20px', backgroundColor: t.surfaceAlt }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 id="lead-form-heading" style={{ fontFamily: t.fontHeading, fontWeight: t.headingWeight, fontSize: '1.35rem', color: t.primary, marginBottom: '20px', textAlign: 'center' }}>
            {copy.formHeadline}
          </h2>
          {formStatus === 'success' ? (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '20px', textAlign: 'center', color: t.textPrimary, fontWeight: 700 }}>
              ✅ תודה! נחזור אליך בהקדם.
            </div>
          ) : (
            <form aria-labelledby="lead-form-heading" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} onSubmit={handleSubmit}>
              <input ref={nameInputRef} type="text" placeholder="שם מלא" aria-label="שם מלא" required style={{ padding: '14px 16px', borderRadius: t.radiusSm, border: `1px solid ${t.border}`, fontSize: '1rem', fontFamily: t.fontBody, color: t.textPrimary, background: t.surface }} />
              <input ref={phoneInputRef} type="tel" placeholder="050-0000000" aria-label="מספר טלפון" dir="ltr" required style={{ padding: '14px 16px', borderRadius: t.radiusSm, border: `1px solid ${t.border}`, fontSize: '1rem', fontFamily: t.fontBody, color: t.textPrimary, background: t.surface, textAlign: 'right' }} />
              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" required style={{ marginTop: '3px', accentColor: t.accent, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: t.textMuted, lineHeight: 1.4 }}>
                  אני מסכים/ה ל<strong>מדיניות הפרטיות</strong>.
                </span>
              </label>
              {formStatus === 'error' && (
                <div style={{ color: '#c0392b', fontSize: '0.85rem', textAlign: 'center' }}>
                  שגיאה בשליחה — נסה שוב או התקשר ישירות.
                </div>
              )}
              <button type="submit" disabled={formStatus === 'submitting'} style={{ padding: '15px', background: t.ctaGradient, color: '#fff', border: 'none', borderRadius: t.radiusSm, fontWeight: 800, fontSize: '1.05rem', cursor: formStatus === 'submitting' ? 'default' : 'pointer', fontFamily: t.fontBody, opacity: formStatus === 'submitting' ? 0.7 : 1 }}>
                {formStatus === 'submitting' ? 'שולח...' : 'שלח, לחזרה מהירה'}
              </button>
            </form>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', fontSize: '0.75rem', color: t.textMuted }}>
            <a href="/privacy" style={{ color: t.textMuted, padding: '8px 6px' }}>מדיניות פרטיות</a>
            <a href="/accessibility" style={{ color: t.textMuted, padding: '8px 6px' }}>הצהרת נגישות</a>
          </div>
        </div>
      </section>
    </div>
  );
}
