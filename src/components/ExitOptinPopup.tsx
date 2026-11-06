'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import copy from '@/content/exit-optin-copy.json';
import niches from '@/content/exit-optin-niches.json';
import { WEEK_MS, intentReady, optinEligible, topExitTrajectory } from '@/lib/exit-optin-gate';

type Niche = keyof typeof niches;
const GATE_KEY = 'wao_exit_survey_state';
const IMPRESSIONS_KEY = 'wao_exit_optin_impressions';
const SESSION_KEY = 'wao_exit_optin_shown';
const CTA_KEY = 'wao_exit_optin_primary_clicked';

export function canShowOptin(now: number): boolean {
  try {
    const state = JSON.parse(localStorage.getItem(GATE_KEY) || 'null');
    const times = JSON.parse(localStorage.getItem(IMPRESSIONS_KEY) || '[]');
    return optinEligible(now, state, times, !!sessionStorage.getItem(SESSION_KEY), !!sessionStorage.getItem(CTA_KEY));
  } catch { return false; }
}

function recordImpression(now: number) {
  const previous = JSON.parse(localStorage.getItem(IMPRESSIONS_KEY) || '[]');
  const times = Array.isArray(previous) ? previous.filter(t => typeof t === 'number' && t <= now && now - t < WEEK_MS) : [];
  localStorage.setItem(IMPRESSIONS_KEY, JSON.stringify([...times, now]));
  sessionStorage.setItem(SESSION_KEY, 'true');
}

export default function ExitOptinPopup({ pathname }: { pathname: string }) {
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState(false);
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState('');
  const [niche, setNiche] = useState<Niche | ''>('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [narrow, setNarrow] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const measure = () => setNarrow(window.innerWidth <= 360);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    let mounted = true;
    let observer: MutationObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const mockMode = process.env.NODE_ENV === 'development' ? new URLSearchParams(location.search).get('exit_optin_mock') : null;
    if (new URLSearchParams(location.search).get('no_exit_popup') === '1') return;
    fetch('/api/exit-optin/status', { cache: 'no-store' }).then(r => r.json()).then(status => {
      if (!mounted) return;
      if ((mockMode === '1' || mockMode === 'trigger') && !status.enabled) {
        setPreview(true);
        if (mockMode === '1') {
          const showWhenClear = () => {
            if (document.querySelector('.wao-cookie-banner')) return;
            observer?.disconnect();
            if (mounted) setOpen(true);
          };
          observer = new MutationObserver(showWhenClear);
          observer.observe(document.body, { childList: true, subtree: true });
          timer = setTimeout(showWhenClear, 250);
        } else setActive(true);
        return;
      }
      if (status.enabled && !status.optedIn) setActive(true);
    }).catch(() => {});
    return () => { mounted = false; observer?.disconnect(); if (timer) clearTimeout(timer); };
  }, [pathname]);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.origin !== location.origin || !['/google-ads/onboarding', '/site-bot'].includes(anchor.pathname)) return;
      sessionStorage.setItem(CTA_KEY, 'true');
      setOpen(false);
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    let maxScroll = window.scrollY;
    let lastY = window.scrollY;
    let upward = 0;
    let samples: { y: number; t: number }[] = [];
    const mobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
    const clear = () => canShowOptin(Date.now()) &&
      intentReady(Date.now(), started, maxScroll, window.innerHeight, !!document.querySelector('.wao-cookie-banner'));
    const show = () => {
      if (!clear()) return;
      try { recordImpression(Date.now()); } catch { return; }
      returnFocus.current = document.activeElement as HTMLElement;
      setOpen(true);
    };
    const scroll = () => {
      const current = window.scrollY;
      maxScroll = Math.max(maxScroll, current);
      upward = current < lastY ? upward + lastY - current : 0;
      if (mobile && upward >= 40) show();
      lastY = current;
    };
    const move = (event: MouseEvent) => {
      const now = Date.now();
      samples.push({ y: event.clientY, t: now });
      samples = samples.filter(sample => now - sample.t <= 300);
    };
    const leave = (event: MouseEvent) => {
      if (mobile || event.clientY > 0 || (event.relatedTarget as HTMLElement | null)?.tagName === 'IFRAME' || samples.length < 2) return;
      if (topExitTrajectory(samples)) show();
    };
    window.addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', leave);
    return () => { window.removeEventListener('scroll', scroll); document.removeEventListener('mousemove', move); document.removeEventListener('mouseleave', leave); };
  }, [active]);

  const close = (dismiss = true) => {
    if (dismiss && !preview && !success) localStorage.setItem(GATE_KEY, JSON.stringify({ status: 'dismissed', ts: Date.now() }));
    setOpen(false);
    returnFocus.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close(); return; }
      if (event.key !== 'Tab' || !dialog.current) return;
      const elements = [...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)')];
      if (!elements.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) { last.focus(); event.preventDefault(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.current.contains(document.activeElement))) { first.focus(); event.preventDefault(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preview, success]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (preview || sending) return;
    if (!consent) { setError(copy['optin.popup.errorConsent']); return; }
    if (!email.includes('@') || !niche) { setError(copy['optin.popup.errorEmail']); return; }
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/exit-optin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, niche, consent, source: pathname }) });
      if (!response.ok || !(await response.json()).ok) throw new Error('delivery_unconfirmed');
      localStorage.setItem(GATE_KEY, JSON.stringify({ status: 'submitted', ts: Date.now() }));
      setSuccess(true);
    } catch { setError(copy['optin.popup.errorEmail']); }
    finally { setSending(false); }
  };

  if (!open) return null;
  const secondary = copy['optin.popup.secondary'].split(' ');
  const privacy = copy['optin.popup.privacyNote'];
  const privacyBreak = privacy.indexOf('. ');
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:items-center" style={{ pointerEvents: 'none', paddingTop: narrow ? 168 : 16 }} role="dialog" aria-modal="true" aria-labelledby="exit-optin-title" data-exit-optin-preview={preview}>
      {/* Backdrop leaves a 48px clear gutter around the fixed bottom-left launcher. */}
      <div className="absolute top-0 bg-black/80" style={{ left: narrow ? 104 : 0, right: 0, bottom: narrow ? 0 : 104, pointerEvents: 'auto' }} onClick={() => close()} />
      <div className="absolute bottom-0 bg-black/80" style={{ left: narrow ? 0 : 104, right: narrow ? 'auto' : 0, top: narrow ? 160 : 'auto', width: narrow ? 104 : 'auto', height: narrow ? 'auto' : 104, pointerEvents: 'auto' }} onClick={() => close()} />
      <div ref={dialog} dir="rtl" className="relative w-full max-w-[520px] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-[var(--shadow-card)] sm:p-7" style={{ maxHeight: narrow ? 'calc(100dvh - 184px)' : 'calc(100dvh - 144px)', pointerEvents: 'auto', marginBottom: narrow ? 16 : 128 }}>
        <div className="flex items-start justify-between gap-3">
          {preview ? <p dir="ltr" className="min-w-0 flex-1 text-xs">Local mock preview — sending disabled</p> : <span className="flex-1" aria-hidden="true" />}
          <button ref={closeButton} type="button" onClick={() => close()} className="rounded-full border border-[var(--border)] px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]" aria-label="Close">×</button>
        </div>
        {success ? <><h2 id="exit-optin-title" className="text-xl font-bold">{copy['optin.popup.successTitle']}</h2><p>{copy['optin.popup.successBody']}</p></> : <>
          <h2 id="exit-optin-title" className="mt-2 text-xl font-bold">{copy['optin.popup.title']}</h2>
          <p className="my-2 text-sm text-[var(--muted)]">{copy['optin.popup.body']}</p>
          <form onSubmit={submit} className="space-y-2">
            <label className="block text-sm" htmlFor="exit-optin-email">{copy['optin.popup.emailLabel']}</label>
            <input id="exit-optin-email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="w-full min-w-0 rounded border border-[var(--border)] bg-[var(--elevated)] p-2" dir="ltr" />
            <div className="grid grid-cols-2 gap-2">{(Object.keys(niches) as Niche[]).map(item => <button key={item} type="button" aria-pressed={niche === item} onClick={() => setNiche(item)} className={`rounded border p-2 text-right text-xs ${niche === item ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>{niches[item]}</button>)}</div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />{copy['optin.popup.consentLabel']}</label>
            <p className="text-xs">{privacy.slice(0, privacyBreak + 1)} <Link href="/privacy" className="underline">{privacy.slice(privacyBreak + 2).trim()}</Link></p>
            <button className="btn-primary w-full rounded p-2 disabled:opacity-50" type="submit" disabled={!consent || !niche || !email || preview || sending}>{copy['optin.popup.submit']}</button>
            {error && <p role="alert" className="text-red-300">{error}</p>}
          </form>
          <p className="mt-4 text-xs">{secondary.slice(0, 5).join(' ')} <Link href="/google-ads/onboarding" className="underline">{secondary.slice(5, 8).join(' ')}</Link> {secondary[8]} <Link href="/site-bot" className="underline">{secondary.slice(9).join(' ').replace(/\.$/, '')}</Link>.</p>
        </>}
      </div>
    </div>
  );
}
