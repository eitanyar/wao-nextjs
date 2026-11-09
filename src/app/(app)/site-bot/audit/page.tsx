'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ACQUISITION_COPY } from '@/lib/site-bot/acquisitionCopy';
import { SCORECARD_COPY } from '@/lib/site-bot/scorecardCopy';
import type { AuditDimension } from '@/lib/gbp/auditScore';
import { AUDIT_JOURNEY_COPY as COPY } from '@/lib/site-bot/auditJourneyCopy';
import { AUDIT_ID, nonempty, validCandidates, readyIdentity, identityQuery, identityCopy } from '@/lib/site-bot/auditJourneyState';
import type { ReadyIdentity, Candidate } from '@/lib/site-bot/auditJourneyState';
import { createHelpSubmission, helpAttemptKey } from '@/lib/site-bot/helpSubmission.mjs';
import PrivacyConsent from '@/components/PrivacyConsent';
import HELP_COPY from '@/content/site-bot-help-form-copy.json';
import { PaidBuyCtaSlot } from './paidBuyCta';

type PageState = 'form' | 'loading' | 'pick' | 'confirm' | 'ready' | 'not_found' | 'recovery';
interface Operation { generation: number; controller: AbortController; urlKey: string }

const DIY_KEYS = ['categories', 'hours', 'photos'] as const;
const helpInputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '12px 16px',
  borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: '1rem',
};

async function request(url: string, operation: Operation, options: RequestInit = {}) {
  const timer = setTimeout(() => operation.controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...options, signal: operation.controller.signal });
    const data: unknown = response.ok ? await response.json() : null;
    if (operation.controller.signal.aborted) throw new Error('Request expired');
    return { status: response.status, ok: response.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

function AuditContent() {
  const searchParams = useSearchParams();
  const urlKey = JSON.stringify([searchParams.get('auditId'), searchParams.get('placeId')]);
  const [phase, setState] = useState<PageState>('form');
  const [viewKey, setViewKey] = useState(urlKey);
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [identity, setIdentity] = useState<ReadyIdentity | null>(null);
  const [recoveryIdentity, setRecoveryIdentity] = useState<{auditId: string; placeId: string} | null>(null);
  const [helpContact, setHelpContact] = useState({ name: '', phone: '', email: '' });
  const [helpConsent, setHelpConsent] = useState(false);
  const [helpStatus, setHelpStatus] = useState<'idle' | 'loading' | 'received' | 'unconfirmed' | 'blocked' | 'retry'>('idle');
  const helpTransport = useRef<ReturnType<typeof createHelpSubmission> | null>(null);
  const generation = useRef(0);
  const active = useRef<Operation | null>(null);
  const pending = useRef<ReadyIdentity | null>(null);
  const internalNavigation = useRef<string | null>(null);
  const state = viewKey === urlKey ? phase : 'loading';
  const auditResult = identity?.score;
  const businessName = identity?.businessName;
  const invalidate = useCallback(() => {
    generation.current++;
    active.current?.controller.abort();
    active.current = null;
    pending.current = null;
    helpTransport.current?.dispose();
    helpTransport.current = null;
  }, []);
  const clear = useCallback(() => {
    setIdentity(null);
    setRecoveryIdentity(null);
    setCurrentAuditId(null);
    setCandidates([]);
    setIsSubmitting(false);
    setErrorKey(null);
    setHelpContact({ name: '', phone: '', email: '' });
    setHelpConsent(false);
    setHelpStatus('idle');
  }, []);
  const begin = useCallback(() => {
    invalidate();
    clear();
    const operation = { generation: generation.current, controller: new AbortController(), urlKey: identityQuery(window.location.href) };
    active.current = operation;
    setViewKey(operation.urlKey);
    setState('loading');
    return operation;
  }, [clear, invalidate]);
  const live = useCallback((operation: Operation) => generation.current === operation.generation &&
    identityQuery(window.location.href) === operation.urlKey, []);
  const fail = useCallback((key = 'FORM_ERROR_GENERIC') => {
    clear();
    pending.current = null;
    setErrorKey(key);
    setState('form');
  }, [clear]);
  const updateUrl = useCallback((result: ReadyIdentity | null) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('auditId');
    url.searchParams.delete('placeId');
    if (result) {
      url.searchParams.set('auditId', result.auditId);
      url.searchParams.set('placeId', result.placeId);
    }
    const next = identityQuery(url.toString());
    if (next !== identityQuery(window.location.href)) {
      internalNavigation.current = next;
      window.history.replaceState(null, '', url.toString());
    }
    setViewKey(next);
  }, []);
  const fetchResult = useCallback(async (auditId: string, placeId?: string | null, selected?: Candidate, existing?: Operation) => {
    const operation = existing ?? begin();
    try {
      if (!AUDIT_ID.test(auditId)) throw new Error('Invalid audit');
      const query = new URLSearchParams({ auditId });
      if (placeId) query.set('placeId', placeId);
      const res = await request(`/api/site-bot/audit-result?${query.toString()}`, operation);
      if (!live(operation)) return;
      if (res.status === 429) {
        fail('FORM_ERROR_RATE');
        return;
      }
      if (res.status === 404) {
        let recovery = false;
        if (placeId) {
          try { recovery = /^pending:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(window.sessionStorage.getItem(helpAttemptKey({auditId, placeId})) ?? ''); } catch { /* fail closed */ }
        }
        if (recovery && placeId) { setRecoveryIdentity({auditId, placeId}); setHelpStatus('retry'); setState('recovery'); }
        else setState('not_found');
        return;
      }
      if (!res.ok) {
        fail();
        return;
      }
      const data = res.data as Record<string, unknown> | null;
      if (data?.status === 'ready') {
        const result = readyIdentity(data, auditId, placeId, selected);
        pending.current = result;
        setIdentity(result);
        setCurrentAuditId(auditId);
        if (selected) updateUrl(result);
        setState(selected ? 'ready' : 'confirm');
      } else if (!placeId && data?.status === 'pick' && validCandidates(data.candidates)) {
        setCandidates(data.candidates);
        setCurrentAuditId(auditId);
        setState('pick');
      } else if (data?.status === 'not_found') {
        setState('not_found');
      } else {
        fail();
      }
    } catch {
      if (live(operation)) fail();
    } finally {
      if (live(operation)) setIsSubmitting(false);
    }
  }, [begin, fail, live, updateUrl]);

  useEffect(() => {
    if (internalNavigation.current === urlKey) {
      internalNavigation.current = null;
      return;
    }
    internalNavigation.current = null;
    invalidate();
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      const [auditIdParam, placeIdParam] = JSON.parse(urlKey) as [string | null, string | null];
      if (auditIdParam) void fetchResult(auditIdParam, placeIdParam);
      else { clear(); setViewKey(urlKey); setState('form'); }
    });
    return () => { disposed = true; };
  }, [urlKey, clear, fetchResult, invalidate]);

  useEffect(() => () => { invalidate(); }, [invalidate]);

  useEffect(() => {
    if (!identity) return;
    let disposed = false;
    let status: 'received' | 'blocked' | 'retry' | null = null;
    try {
      const stored = window.sessionStorage.getItem(helpAttemptKey(identity));
      if (stored) status = stored === 'received' ? 'received' : /^pending:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored) ? 'retry' : 'blocked';
    } catch { status = 'blocked'; }
    if (status) queueMicrotask(() => { if (!disposed) setHelpStatus(status); });
    return () => { disposed = true; };
  }, [identity]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = businessNameInput.trim();
    if (!trimmedName) return;

    updateUrl(null);
    const operation = begin();
    setIsSubmitting(true);
    try {
      const body = { businessName: trimmedName };
      const res = await request('/api/site-bot/audit-lookup', operation, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!live(operation)) return;
      if (res.status === 429) {
        fail('FORM_ERROR_RATE');
        return;
      }
      if (!res.ok) {
        fail();
        return;
      }
      const data = res.data as Record<string, unknown> | null;
      if (nonempty(data?.auditId) && AUDIT_ID.test(data.auditId)) {
        await fetchResult(data.auditId, null, undefined, operation);
      } else {
        fail();
      }
    } catch {
      if (live(operation)) fail();
    } finally {
      if (live(operation)) setIsSubmitting(false);
    }
  }

  async function handlePickCandidate(candidate: Candidate) {
    if (!currentAuditId || state !== 'pick' || !candidates.includes(candidate) || identityQuery(window.location.href) !== viewKey) return;
    await fetchResult(currentAuditId, candidate.placeId, candidate);
  }
  function confirmBusiness(accepted: boolean) {
    if (state !== 'confirm' || !identity || pending.current !== identity || identityQuery(window.location.href) !== viewKey) return;
    if (accepted) { updateUrl(identity); setState('ready'); }
    else { invalidate(); clear(); updateUrl(null); setState('form'); }
  }

  async function handleHelpSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = state === 'recovery' ? recoveryIdentity : state === 'ready' ? identity : null;
    if (!target || helpStatus === 'received' || helpStatus === 'loading' || helpStatus === 'blocked') return;
    const confirmed = target;
    let storage: Storage;
    try { storage = window.sessionStorage; }
    catch { setHelpStatus('blocked'); return; }
    if (!helpTransport.current) helpTransport.current = createHelpSubmission({
      fetchFn: fetch, makeId: () => crypto.randomUUID(), onState: setHelpStatus,
      isCurrent: () => identityQuery(window.location.href) === JSON.stringify([confirmed.auditId, confirmed.placeId]),
      storage, recoveryOnly: state === 'recovery',
    });
    await helpTransport.current.submit(confirmed, { ...helpContact, privacyAccepted: helpConsent });
  }

  function renderHelpForm() {
    const locked = helpStatus !== 'idle' && helpStatus !== 'retry';
    return (
      <section id="help-form" data-help-section="true" style={{ scrollMarginTop: '96px' }}>
        {helpStatus !== 'received' && (
          <form data-help-form="true" onSubmit={handleHelpSubmit} aria-busy={helpStatus === 'loading'}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
            <h2 id="help-form-heading" tabIndex={-1} style={{ fontSize: '1.1rem', margin: 0 }}>{HELP_COPY.HELP_FORM_HEADING}</h2>
            <label htmlFor="help-name">שם מלא</label>
            <input id="help-name" name="name" required maxLength={120} autoComplete="name" style={helpInputStyle} value={helpContact.name}
              disabled={locked}
              onChange={e => setHelpContact(previous => ({ ...previous, name: e.target.value }))} />
            <label htmlFor="help-phone">טלפון</label>
            <input id="help-phone" name="phone" type="tel" maxLength={40} autoComplete="tel" dir="ltr" style={helpInputStyle} value={helpContact.phone}
              disabled={locked}
              onChange={e => setHelpContact(previous => ({ ...previous, phone: e.target.value }))} />
            <label htmlFor="help-email">{HELP_COPY.HELP_EMAIL_LABEL}</label>
            <input id="help-email" name="email" type="email" maxLength={254} autoComplete="email" dir="ltr" style={helpInputStyle} value={helpContact.email}
              disabled={locked}
              onChange={e => setHelpContact(previous => ({ ...previous, email: e.target.value }))} />
            <p id="help-contact-hint" style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)' }}>{HELP_COPY.HELP_CONTACT_HINT}</p>
            <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0 }}>
              <PrivacyConsent id="help-privacy" checked={helpConsent} onChange={setHelpConsent} />
            </fieldset>
            <button type="submit" className="btn-primary" aria-describedby="help-contact-hint"
              disabled={helpStatus === 'loading' || helpStatus === 'blocked' || !helpConsent || !helpContact.name.trim() || (!helpContact.phone.trim() && !helpContact.email.trim())}>
              {helpStatus === 'loading' ? 'שולח...' : 'שלח פנייה'}
            </button>
          </form>
        )}
        {/* Always mounted so late success/error messages are announced. */}
        <div aria-live="polite" data-help-live="true">
          {helpStatus === 'received' && <p data-help-received="true">הפנייה התקבלה — תודה!</p>}
          {(helpStatus === 'unconfirmed' || helpStatus === 'retry') && <p role="alert" data-help-error="retry">{HELP_COPY.HELP_ERROR_RETRY}</p>}
          {helpStatus === 'blocked' && <p role="alert" data-help-error="blocked">{HELP_COPY.HELP_ERROR_BLOCKED}</p>}
        </div>
      </section>
    );
  }

  function jumpToHelpForm(e: React.MouseEvent<HTMLAnchorElement>) {
    const heading = document.getElementById('help-form-heading');
    if (!heading) return;
    // Keep the URL (and its hash) untouched; the confirmed identity lives in the query string.
    e.preventDefault();
    document.getElementById('help-form')?.scrollIntoView({ block: 'start' });
    heading.focus({ preventScroll: true });
  }

  function renderDimensionCard(dim: AuditDimension) {
    const titleToken = dim.copyToken;
    const title = SCORECARD_COPY[titleToken] || '';
    const statusLine = dim.status === 'pass' ? COPY.SB_STATUS_CONFIRMED : dim.status === 'fail' ? COPY.SB_STATUS_MISSING : COPY.SB_STATUS_UNKNOWN;

    const isDiyFail = dim.status === 'fail' && (DIY_KEYS as readonly string[]).includes(dim.key);
    const diyStepsText = dim.key === 'categories' ? COPY.SB_FIX_CATEGORIES : dim.key === 'hours' ? COPY.SB_FIX_HOURS : COPY.SB_FIX_PHOTOS;

    let badgeStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 'var(--radius-pill)',
      fontSize: '0.8rem',
      fontWeight: 600,
    };

    if (dim.status === 'pass') {
      badgeStyle = {
        ...badgeStyle,
        color: '#22c55e',
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.25)',
      };
    } else if (dim.status === 'fail') {
      badgeStyle = {
        ...badgeStyle,
        color: '#ef4444',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
      };
    } else {
      badgeStyle = {
        ...badgeStyle,
        color: 'var(--muted)',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--border)',
      };
    }

    return (
      <div
        key={dim.key}
        data-dimension={dim.key}
        data-status={dim.status}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
            {title}
          </span>
        </div>
        <div style={{ ...badgeStyle, whiteSpace: 'pre-line', overflowWrap: 'anywhere', fontSize: '0.92rem', lineHeight: 1.6 }}>
          {statusLine}
        </div>
        {dim.status === 'unknown' && <p style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{COPY.SB_UNKNOWN_VERIFY}</p>}
        {isDiyFail && (
          <div
            style={{
              marginTop: '8px',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.88rem',
                marginBottom: '8px',
                color: 'var(--accent)',
              }}
            >
              <p style={{ whiteSpace: 'pre-line' }}>{COPY.SB_MISSING_ACTION}</p>
              <p style={{ whiteSpace: 'pre-line' }}>{COPY.SB_SELFFIX_ACCESS_NOTE}</p>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.86rem',
                lineHeight: 1.55,
                color: 'var(--text)',
              }}
            >
              {diyStepsText.split('\n').map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="wao-section">
      <div className="wao-container" style={{ maxWidth: '680px' }}>
        {state === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(74, 222, 128, 0.08)',
                  border: '1px solid rgba(74, 222, 128, 0.25)',
                  color: 'var(--accent)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>{ACQUISITION_COPY.ENTRY_TRUST_BADGE}</span>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-rubik), sans-serif',
                  fontWeight: 900,
                  fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
                  lineHeight: 1.25,
                  color: 'var(--text)',
                  margin: 0,
                }}
              >
                {ACQUISITION_COPY.ENTRY_HERO_HEADLINE}
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  color: 'var(--muted)',
                  margin: 0,
                  maxWidth: '560px',
                }}
              >
                {ACQUISITION_COPY.ENTRY_HERO_SUBTITLE}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              {[
                ACQUISITION_COPY.ENTRY_VALUE_PROP_1,
                ACQUISITION_COPY.ENTRY_VALUE_PROP_2,
                ACQUISITION_COPY.ENTRY_VALUE_PROP_3,
              ].map((propText, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(74, 222, 128, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '0.88rem', lineHeight: 1.45, color: 'var(--text)' }}>
                    {propText}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="audit-business-name" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                    {SCORECARD_COPY.FORM_NAME_LABEL}
                  </label>
                  <input
                    id="audit-business-name"
                    type="text"
                    required
                    value={businessNameInput}
                    onChange={(e) => setBusinessNameInput(e.target.value)}
                    placeholder={SCORECARD_COPY.FORM_NAME_PLACEHOLDER}
                    disabled={isSubmitting}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontFamily: 'var(--font-body), sans-serif',
                      fontSize: '1rem',
                    }}
                  />
                </div>

                {errorKey && (
                  <div style={{ color: '#ef4444', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {SCORECARD_COPY[errorKey] || SCORECARD_COPY.FORM_ERROR_GENERIC}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{
                    padding: '14px 24px',
                    justifyContent: 'center',
                    width: '100%',
                    marginTop: '6px',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? SCORECARD_COPY.FORM_LOADING : ACQUISITION_COPY.ENTRY_CTA_BUTTON}
                </button>
              </form>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>
                {SCORECARD_COPY.AUDIT_DISCLOSURE}{' '}
                <Link href="/privacy" style={{ color: 'var(--accent)' }}>
                  {SCORECARD_COPY.AUDIT_PRIVACY_LINK}
                </Link>
              </p>
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              padding: '32px 24px',
              textAlign: 'center',
              color: 'var(--text)',
              fontSize: '1.1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div>{SCORECARD_COPY.FORM_LOADING}</div>
          </div>
        )}

        {state === 'confirm' && identity && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowWrap: 'anywhere' }}>
            <p style={{ whiteSpace: 'pre-line' }}>{identityCopy(COPY.SB_CONFIRM_SOLEMATCH, identity.businessName, identity.formattedAddress)}</p>
            <button type="button" className="btn-primary" onClick={() => confirmBusiness(true)}>{COPY.SB_CONFIRM_YES}</button>
            <button type="button" className="btn-secondary" onClick={() => confirmBusiness(false)}>{COPY.SB_CONFIRM_NO}</button>
          </div>
        )}

        {state === 'pick' && (
          <div
            style={{
              overflowWrap: 'anywhere',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-rubik), sans-serif',
                fontWeight: 900,
                fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                color: 'var(--text)',
                margin: 0,
              }}
            >
              {COPY.SB_PICK_PROMPT}
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {candidates.map((cand) => (
                <button
                  key={cand.placeId}
                  type="button"
                  onClick={() => handlePickCandidate(cand)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'right',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                    {identityCopy(COPY.SB_PICK_OPTION_BUTTON, cand.displayName, cand.formattedAddress)}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {cand.formattedAddress}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {state === 'ready' && auditResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowWrap: 'anywhere' }} data-audit-id={identity?.auditId} data-place-id={identity?.placeId}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {businessName && (
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)' }}>
                  {identityCopy(COPY.SB_SELECTED_ACK, businessName, identity?.formattedAddress || '')}
                  <div>{identity?.formattedAddress}</div>
                </div>
              )}
              <h1
                style={{
                  fontFamily: 'var(--font-rubik), sans-serif',
                  fontWeight: 900,
                  fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                  color: 'var(--text)',
                  margin: 0,
                }}
              >
                {SCORECARD_COPY.PAGE_TITLE}
              </h1>
              <p style={{ fontSize: '1rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                {COPY.SB_CHECKLIST_INTRO}
              </p>
              {helpStatus !== 'received' && (
                <a href="#help-form" data-help-jump="true" onClick={jumpToHelpForm} style={{ color: 'var(--accent)', fontWeight: 600, alignSelf: 'flex-start' }}>
                  {HELP_COPY.HELP_JUMP_LINK}
                </a>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {auditResult.dimensions.map(renderDimensionCard)}
            </div>
            <p style={{ whiteSpace: 'pre-line' }}>{COPY.SB_CHECKLIST_CANDOR}</p>

            {/* M1 (F1): renders nothing unless the audit layout opened the paid-flow gate. */}
            <PaidBuyCtaSlot auditId={identity?.auditId} placeId={identity?.placeId} />

            {renderHelpForm()}
          </div>
        )}

        {state === 'recovery' && recoveryIdentity && renderHelpForm()}

        {state === 'not_found' && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-rubik), sans-serif',
                fontWeight: 900,
                fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                color: 'var(--text)',
                margin: 0,
              }}
            >
              {COPY.SB_NOMATCH_TITLE}
            </h1>
            <p style={{ fontSize: '0.98rem', lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>
              {COPY.SB_NOMATCH_BODY}
            </p>
            <Link href="/site-bot/audit" className="btn-secondary" style={{ justifyContent: 'center' }}>
              {ACQUISITION_COPY.ENTRY_CTA_BUTTON}
            </Link>
            <div style={{ marginTop: '12px' }}>
              <Link
                href="/contact?ref=site-bot-audit#contact-form"
                className="btn-primary"
                style={{
                  justifyContent: 'center',
                  padding: '14px 24px',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                {SCORECARD_COPY.CTA_TRIAL}
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <section className="wao-section">
          <div className="wao-container" style={{ maxWidth: '640px', textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                margin: '0 auto',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        </section>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
