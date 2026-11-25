'use client';

import React, { useEffect, useRef, useState } from 'react';
import { renderMixed } from '@/lib/bidi';
import { SITE_BOT_ELIGIBILITY_COPY as COPY } from '@/lib/site-bot/eligibilityCopy.generated';
import { isProfileBlockCause, waitlistReason, type SiteBotOffer, type WaitlistReason } from '@/lib/site-bot/eligibility';
import { israeliPhone, isWaitlistEmail } from '@/lib/site-bot/waitlist';
import { browserSiteBotTracking, trackWaitlistJoined } from '@/lib/tracking/siteBotConversions';

// Launch step 1: what the confirmed free-check result shows where the "build my site" CTA sat, for every offer except
// 'eligible' (that one keeps <PaidBuyCtaSlot> on the page). The offer is decided on the server (audit-result ->
// src/lib/site-bot/offerState.ts). The check results above stay on the page before and after the form is sent
// (NOT_ELIGIBLE_HAS_SITE and WAITLIST_THANKS both point back to them). Copy: eligibilityCopy.generated.ts (waocopy,
// byte-exact); Latin runs ("Site Bot") are isolated with renderMixed. Mobile-first: full-width fields, 48px targets.
// A11y (ux audit 2026-11-25): the submit button is never `disabled` (a bad submit names the bad field: aria-invalid +
// aria-describedby error, focus on the first bad field); while sending the fields are readOnly + aria-disabled so focus
// stays put; the thanks / error paragraph takes focus. Input borders use --muted (>=3:1 on --surface, dark and
// .wao-light); error text uses the --error token (>=4.5:1 on both themes, globals.css).
// HEBREW-SAFETY: zero Hebrew bytes in this file.

const blockStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px',
  border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', background: 'var(--surface)',
};
const textStyle: React.CSSProperties = { margin: 0, fontSize: '1rem', lineHeight: 1.6, color: 'var(--text)' };
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', minWidth: 0, minHeight: '48px', padding: '12px 16px',
  borderRadius: 'var(--radius-md)', border: '1px solid var(--muted)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: '1rem',
};
const invalidInputStyle: React.CSSProperties = { ...inputStyle, border: '2px solid var(--error)' };
const labelStyle: React.CSSProperties = { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' };
const fieldErrorStyle: React.CSSProperties = { margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--error)' };

type FormStatus = 'idle' | 'sending' | 'joined' | 'error';
type Field = 'name' | 'phone' | 'email';
const FIELD_ERROR = {
  name: COPY.WAITLIST_INVALID_NAME, phone: COPY.WAITLIST_INVALID_PHONE, email: COPY.WAITLIST_INVALID_EMAIL,
} as const;

/** The fields that would be rejected, in form order. Email only when filled and malformed. */
function invalidWaitlistFields(contact: Record<Field, string>): Field[] {
  const bad: Field[] = [];
  if (!contact.name.trim()) bad.push('name');
  if (israeliPhone(contact.phone) === null) bad.push('phone');
  if (contact.email.trim() && !isWaitlistEmail(contact.email)) bad.push('email');
  return bad;
}

export function WaitlistForm({ auditId, placeId, reason }: { auditId: string; placeId: string; reason: WaitlistReason }) {
  const [contact, setContact] = useState<Record<Field, string>>({ name: '', phone: '', email: '' });
  const [status, setStatus] = useState<FormStatus>('idle');
  // Errors show only after a submit attempt, then follow the input live (a fixed field clears its own error).
  const [attempted, setAttempted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const invalid = attempted ? invalidWaitlistFields(contact) : [];

  // The thanks / error paragraph takes focus once it is on screen (after a send, never on first render).
  useEffect(() => {
    if (status === 'joined' || status === 'error') resultRef.current?.focus();
  }, [status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending' || status === 'joined') return;
    const bad = invalidWaitlistFields(contact);
    if (bad.length > 0) {
      setAttempted(true);
      ({ name: nameRef, phone: phoneRef, email: emailRef })[bad[0]].current?.focus();
      return;
    }
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

  const sending = status === 'sending';
  const fieldProps = (field: Field) => {
    const bad = invalid.includes(field);
    return {
      id: `waitlist-${field}`, name: field, value: contact[field],
      readOnly: sending, 'aria-disabled': sending || undefined,
      'aria-invalid': bad || undefined, 'aria-describedby': bad ? `waitlist-${field}-error` : undefined,
      style: bad ? invalidInputStyle : inputStyle,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setContact(previous => ({ ...previous, [field]: value }));
      },
    };
  };
  const fieldError = (field: Field) => (invalid.includes(field)
    ? <p id={`waitlist-${field}-error`} data-waitlist-field-error={field} style={fieldErrorStyle}>{renderMixed(FIELD_ERROR[field])}</p>
    : null);

  return (
    <div data-waitlist="true" data-waitlist-reason={reason} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {status !== 'joined' && (
        <form data-waitlist-form="true" onSubmit={submit} aria-busy={sending} noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label htmlFor="waitlist-name" style={labelStyle}>{COPY.WAITLIST_NAME_LABEL}</label>
          <input {...fieldProps('name')} ref={nameRef} required maxLength={120} autoComplete="name" enterKeyHint="next" />
          {fieldError('name')}
          <label htmlFor="waitlist-phone" style={labelStyle}>{COPY.WAITLIST_PHONE_LABEL}</label>
          <input {...fieldProps('phone')} ref={phoneRef} type="tel" inputMode="tel" required maxLength={40} autoComplete="tel" dir="ltr"
            enterKeyHint="next" style={{ ...fieldProps('phone').style, textAlign: 'right' }} />
          {fieldError('phone')}
          <label htmlFor="waitlist-email" style={labelStyle}>{COPY.WAITLIST_EMAIL_LABEL}</label>
          <input {...fieldProps('email')} ref={emailRef} type="email" inputMode="email" maxLength={254} autoComplete="email" dir="ltr"
            autoCapitalize="none" spellCheck={false} enterKeyHint="send" style={{ ...fieldProps('email').style, textAlign: 'right' }} />
          {fieldError('email')}
          <button type="submit" className="btn-primary" aria-disabled={sending || undefined} aria-describedby="waitlist-consent"
            style={{ justifyContent: 'center', width: '100%', minHeight: '48px', padding: '14px 24px', fontSize: '1.05rem', fontWeight: 700,
              opacity: sending ? 0.7 : 1, cursor: sending ? 'progress' : 'pointer' }}>
            {COPY.WAITLIST_SUBMIT}
          </button>
          <p id="waitlist-consent" style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--muted)' }}>{COPY.WAITLIST_CONSENT}</p>
        </form>
      )}
      {/* Always mounted so the result is announced; the result paragraph also takes focus (resultRef). */}
      <div aria-live="polite" data-waitlist-live="true">
        {status === 'joined' && (
          <p ref={resultRef} tabIndex={-1} data-waitlist-joined="true" style={{ ...textStyle, fontWeight: 600 }}>{COPY.WAITLIST_THANKS}</p>
        )}
        {status === 'error' && (
          <p ref={resultRef} tabIndex={-1} role="alert" data-waitlist-error="true" style={{ ...textStyle, color: 'var(--error)' }}>{COPY.WAITLIST_ERROR}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Renders nothing for 'eligible' (the page shows the CTA slot) and for anything that is not a known offer. The profile
 * block names the one cause the server detected (`profileCause`); an unknown cause renders nothing.
 */
export function SiteBotOfferBlock({ offer, profileCause, auditId, placeId }: {
  offer: SiteBotOffer | undefined; profileCause?: string; auditId: string; placeId: string;
}) {
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
    if (!isProfileBlockCause(profileCause)) return null;
    const text = profileCause === 'closed' ? COPY.NOT_ELIGIBLE_PROFILE_CLOSED : COPY.NOT_ELIGIBLE_PROFILE_NO_RATINGS;
    return (
      <section data-offer={offer} data-profile-cause={profileCause} style={blockStyle}>
        <p style={{ ...textStyle, fontWeight: 600 }}>{renderMixed(text)}</p>
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
