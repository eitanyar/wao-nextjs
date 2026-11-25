'use client';

import React, { useState } from 'react';
import { renderMixed } from '@/lib/bidi';
import { SITE_BOT_ELIGIBILITY_COPY as COPY } from '@/lib/site-bot/eligibilityCopy.generated';
import { waitlistReason, type SiteBotOffer, type WaitlistReason } from '@/lib/site-bot/eligibility';
import { israeliPhone } from '@/lib/site-bot/waitlist';
import { browserSiteBotTracking, trackWaitlistJoined } from '@/lib/tracking/siteBotConversions';

// Launch step 1: what the confirmed free-check result shows where the "build my site" CTA sat, for every offer except
// 'eligible' (that one keeps <PaidBuyCtaSlot> on the page). The offer is decided on the server (audit-result ->
// src/lib/site-bot/offerState.ts). The check results above stay on the page before and after the form is sent
// (NOT_ELIGIBLE_HAS_SITE and WAITLIST_THANKS both point back to them). Copy: eligibilityCopy.generated.ts (waocopy,
// byte-exact); Latin runs ("Site Bot") are isolated with renderMixed. Mobile-first: full-width fields, 48px targets.
// HEBREW-SAFETY: zero Hebrew bytes in this file.

const blockStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px',
  border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', background: 'var(--surface)',
};
const textStyle: React.CSSProperties = { margin: 0, fontSize: '1rem', lineHeight: 1.6, color: 'var(--text)' };
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', minWidth: 0, minHeight: '48px', padding: '12px 16px',
  borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: '1rem',
};
const labelStyle: React.CSSProperties = { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' };

type FormStatus = 'idle' | 'sending' | 'joined' | 'error';

export function WaitlistForm({ auditId, placeId, reason }: { auditId: string; placeId: string; reason: WaitlistReason }) {
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [status, setStatus] = useState<FormStatus>('idle');
  const ready = contact.name.trim().length > 0 && israeliPhone(contact.phone) !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || status === 'sending' || status === 'joined') return;
    setStatus('sending');
    try {
      const body: Record<string, string> = { auditId, placeId, name: contact.name.trim(), phone: contact.phone.trim() };
      if (contact.email.trim()) body.email = contact.email.trim();
      const res = await fetch('/api/site-bot/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json: unknown = res.ok ? await res.json() : null;
      const accepted = json && typeof json === 'object' && (json as { ok?: unknown }).ok === true;
      if (!accepted) throw new Error('waitlist_rejected');
      // The reason the SERVER stored (it re-derives it); fall back to the rendered one.
      const stored = (json as { reason?: unknown }).reason;
      const tracking = browserSiteBotTracking();
      if (tracking) trackWaitlistJoined(tracking, { auditId, placeId, reason: typeof stored === 'string' ? stored : reason });
      setStatus('joined');
    } catch {
      setStatus('error');
    }
  }

  const locked = status === 'sending' || status === 'joined';
  return (
    <div data-waitlist="true" data-waitlist-reason={reason} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {status !== 'joined' && (
        <form data-waitlist-form="true" onSubmit={submit} aria-busy={status === 'sending'} noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label htmlFor="waitlist-name" style={labelStyle}>{COPY.WAITLIST_NAME_LABEL}</label>
          <input id="waitlist-name" name="name" required maxLength={120} autoComplete="name" style={inputStyle}
            value={contact.name} disabled={locked}
            onChange={e => setContact(previous => ({ ...previous, name: e.target.value }))} />
          <label htmlFor="waitlist-phone" style={labelStyle}>{COPY.WAITLIST_PHONE_LABEL}</label>
          <input id="waitlist-phone" name="phone" type="tel" inputMode="tel" required maxLength={40} autoComplete="tel" dir="ltr"
            style={{ ...inputStyle, textAlign: 'right' }} value={contact.phone} disabled={locked}
            onChange={e => setContact(previous => ({ ...previous, phone: e.target.value }))} />
          <label htmlFor="waitlist-email" style={labelStyle}>{COPY.WAITLIST_EMAIL_LABEL}</label>
          <input id="waitlist-email" name="email" type="email" inputMode="email" maxLength={254} autoComplete="email" dir="ltr"
            style={{ ...inputStyle, textAlign: 'right' }} value={contact.email} disabled={locked}
            onChange={e => setContact(previous => ({ ...previous, email: e.target.value }))} />
          <button type="submit" className="btn-primary" disabled={!ready || locked} aria-describedby="waitlist-consent"
            style={{ justifyContent: 'center', width: '100%', minHeight: '48px', padding: '14px 24px', fontSize: '1.05rem', fontWeight: 700,
              opacity: !ready || locked ? 0.7 : 1, cursor: !ready || locked ? 'not-allowed' : 'pointer' }}>
            {COPY.WAITLIST_SUBMIT}
          </button>
          <p id="waitlist-consent" style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--muted)' }}>{COPY.WAITLIST_CONSENT}</p>
        </form>
      )}
      {/* Always mounted so the result is announced. */}
      <div aria-live="polite" data-waitlist-live="true">
        {status === 'joined' && <p data-waitlist-joined="true" style={{ ...textStyle, fontWeight: 600 }}>{COPY.WAITLIST_THANKS}</p>}
        {status === 'error' && <p role="alert" data-waitlist-error="true" style={{ ...textStyle, color: '#ef4444' }}>{COPY.WAITLIST_ERROR}</p>}
      </div>
    </div>
  );
}

/** Renders nothing for 'eligible' (the page shows the CTA slot) and for anything that is not a known offer. */
export function SiteBotOfferBlock({ offer, auditId, placeId }: { offer: SiteBotOffer | undefined; auditId: string; placeId: string }) {
  if (!offer || offer === 'eligible') return null;
  const reason = waitlistReason(offer);
  // Keyed by the business: a different confirmed result never inherits the previous form's state.
  const form = reason ? <WaitlistForm key={`${auditId}:${placeId}:${reason}`} auditId={auditId} placeId={placeId} reason={reason} /> : null;
  if (offer === 'not_eligible_has_site') {
    return (
      <section data-offer={offer} aria-labelledby="offer-body" style={blockStyle}>
        <p id="offer-body" style={textStyle}>{renderMixed(COPY.NOT_ELIGIBLE_HAS_SITE)}</p>
      </section>
    );
  }
  if (offer === 'not_eligible_profile') {
    return (
      <section data-offer={offer} style={blockStyle}>
        {COPY.NOT_ELIGIBLE_PROFILE.split('\n').map((line, index) => (
          <p key={index} style={{ ...textStyle, fontWeight: index === 0 ? 700 : 400 }}>{renderMixed(line)}</p>
        ))}
      </section>
    );
  }
  if (offer === 'not_eligible_trade') {
    return (
      <section data-offer={offer} style={blockStyle}>
        <p style={{ ...textStyle, fontWeight: 600 }}>{renderMixed(COPY.NOT_ELIGIBLE_TRADE)}</p>
        {form}
      </section>
    );
  }
  const head = offer === 'waitlist_full' ? COPY.WAITLIST_FULL_HEAD : COPY.WAITLIST_PREOPEN_HEAD;
  const body = offer === 'waitlist_full' ? COPY.WAITLIST_FULL_BODY : COPY.WAITLIST_PREOPEN_BODY;
  return (
    <section data-offer={offer} aria-labelledby="offer-heading" style={blockStyle}>
      <h2 id="offer-heading" style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1.4, color: 'var(--text)' }}>{renderMixed(head)}</h2>
      <p style={textStyle}>{renderMixed(body)}</p>
      {form}
    </section>
  );
}
