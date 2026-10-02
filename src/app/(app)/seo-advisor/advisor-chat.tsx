"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { renderMixed } from '@/lib/bidi';
import { PAGE_COPY } from '@/lib/seo-advisor-page-copy';

type Phase = 'loading' | 'unavailable' | 'rate_limited' | 'intro' | 'consent' | 'waiting' | 'result' | 'terminal';
type SimpleEvent = 'next_intro' | 'hesitation' | 'guarantee_question' | 'approve' | 'decline' | 'close' | 'no_contact';
type Event = { type: SimpleEvent } | { type: 'submit_domain'; domain: string; market: 'IL' | 'US' };
type Reply = { token: string; utterances: string[] };

async function readReply(response: Response): Promise<Reply> {
  if (!response.ok) throw new Error(response.status === 429 ? 'rate_limited' : 'unavailable');
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('token' in body) || !('utterances' in body) ||
    typeof body.token !== 'string' || !body.token || !Array.isArray(body.utterances) ||
    !body.utterances.every((line) => typeof line === 'string')) throw new Error('unavailable');
  return { token: body.token, utterances: body.utterances };
}

async function postEvent(token: string, event: Event): Promise<Reply> {
  return readReply(await fetch('/api/seo-advisor', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, event }),
  }));
}

function validSubmittedDomain(domain: string): boolean {
  return domain.length <= 253 && !/^\d+\.\d+\.\d+\.\d+$/u.test(domain) &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/u.test(domain);
}

export default function AdvisorChat() {
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [domain, setDomain] = useState('');
  const [market, setMarket] = useState<'IL' | 'US'>('IL');
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    fetch('/api/seo-advisor').then(readReply).then((reply) => {
      if (!active) return;
      setToken(reply.token);
      setMessages(reply.utterances);
      setPhase('intro');
    }).catch((error: unknown) => {
      if (!active) return;
      setToken(null);
      setMessages([]);
      setPhase(error instanceof Error && error.message === 'rate_limited' ? 'rate_limited' : 'unavailable');
    });
    return () => { active = false; };
  }, []);

  async function restart() {
    if (busy.current) return;
    busy.current = true;
    setPhase('loading');
    setToken(null);
    setMessages([]);
    setDomain('');
    setMarket('IL');
    try {
      const reply = await readReply(await fetch('/api/seo-advisor'));
      setToken(reply.token);
      setMessages(reply.utterances);
      setPhase('intro');
    } catch (error) {
      setPhase(error instanceof Error && error.message === 'rate_limited' ? 'rate_limited' : 'unavailable');
    } finally {
      busy.current = false;
    }
  }

  async function send(event: Event) {
    if (!token || busy.current || !['intro', 'consent', 'result'].includes(phase)) return;
    busy.current = true;
    const previousPhase = phase;
    if (event.type === 'approve') setPhase('waiting');
    try {
      const reply = await postEvent(token, event);
      setToken(reply.token);
      setMessages((prior) => [...prior, ...reply.utterances]);
      if (event.type === 'approve') {
        // A benign follow-up gives the server the opportunity to derive its own diagnosis.
        const diagnosis = await postEvent(reply.token, { type: 'next_intro' });
        if (diagnosis.utterances.length === 0) throw new Error('unavailable');
        setToken(diagnosis.token);
        setMessages((prior) => [...prior, ...diagnosis.utterances]);
        setPhase('result');
      } else if (event.type === 'submit_domain') {
        setPhase(validSubmittedDomain(event.domain) && reply.utterances.length > 0 ? 'consent' : previousPhase);
      } else if (event.type === 'decline' || event.type === 'close' || event.type === 'no_contact') {
        setPhase('terminal');
      } else {
        setPhase(previousPhase);
      }
    } catch (error) {
      setToken(null);
      setPhase(error instanceof Error && error.message === 'rate_limited' ? 'rate_limited' : 'unavailable');
    } finally {
      busy.current = false;
    }
  }

  const controls: { label: string; event: SimpleEvent }[] = phase === 'intro' ? [
    { label: PAGE_COPY['control.nextIntro'], event: 'next_intro' },
    { label: PAGE_COPY['control.hesitation'], event: 'hesitation' },
    { label: PAGE_COPY['control.guarantee'], event: 'guarantee_question' },
  ] : phase === 'consent' ? [
    { label: PAGE_COPY['control.approve'], event: 'approve' },
    { label: PAGE_COPY['control.decline'], event: 'decline' },
    { label: PAGE_COPY['control.guarantee'], event: 'guarantee_question' },
  ] : phase === 'result' ? [
    { label: PAGE_COPY['control.close'], event: 'close' },
    { label: PAGE_COPY['control.decline'], event: 'decline' },
    { label: PAGE_COPY['control.noContact'], event: 'no_contact' },
  ] : [];

  return (
    <section aria-label={PAGE_COPY['a11y.chatRegionLabel']}>
      <div aria-live="polite" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
        background: 'var(--surface)', padding: '20px', maxHeight: '480px', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {messages.map((message, index) => (
          <div key={index} style={{ alignSelf: 'flex-start', background: 'var(--bg)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 16px',
            maxWidth: '85%', lineHeight: 1.6, fontFamily: 'var(--font-body), sans-serif', whiteSpace: 'pre-wrap' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>
              {renderMixed(PAGE_COPY['a11y.advisorName'])}
            </span>
            {renderMixed(message)}
          </div>
        ))}
        {phase === 'waiting' && <p role="status">{PAGE_COPY['state.thinkingLabel']}</p>}
        {(phase === 'unavailable' || phase === 'rate_limited') && (
          <p role="status" style={{ color: 'var(--text)', lineHeight: 1.8 }}>
            {PAGE_COPY[phase === 'rate_limited' ? 'state.rateLimitedMessage' : 'state.unavailableMessage']}
          </p>
        )}
      </div>
      {phase === 'intro' && (
        <form onSubmit={(event) => { event.preventDefault(); void send({ type: 'submit_domain', domain: domain.trim(), market }); }}
          style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
          <label htmlFor="seo-domain">{PAGE_COPY['form.domainLabel']}</label>
          <input id="seo-domain" type="text" required maxLength={253} value={domain}
            placeholder={PAGE_COPY['form.domainPlaceholder']} onChange={(event) => setDomain(event.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <label htmlFor="seo-market">{PAGE_COPY['form.marketLabel']}</label>
          <select id="seo-market" value={market} onChange={(event) => setMarket(event.target.value as 'IL' | 'US')}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            <option value="IL">{PAGE_COPY['form.marketIl']}</option>
            <option value="US">{PAGE_COPY['form.marketUs']}</option>
          </select>
          <button type="submit" className="btn-primary w-full sm:w-auto justify-center">
            {PAGE_COPY['form.submitCta']}
          </button>
        </form>
      )}
      {controls.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {controls.map(({ label, event }) => (
            <button key={event} type="button" className="btn-outline" onClick={() => void send({ type: event })}>
              {label}
            </button>
          ))}
        </div>
      )}
      {(phase === 'unavailable' || phase === 'rate_limited' || phase === 'terminal') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {phase === 'terminal' && <Link href="/consulting" className="btn-primary">{PAGE_COPY['cta.consultLink']}</Link>}
          <button type="button" className="btn-outline" onClick={() => void restart()}>
            {PAGE_COPY['state.restartCta']}
          </button>
        </div>
      )}
    </section>
  );
}
