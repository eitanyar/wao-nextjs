'use client';

// Site-Bot client message box: an RTL island inside the (English, LTR) account page.
// Every label is approved Hebrew from clientMessageCopy.ts, shown only through customerVisibleLabel(), so a
// placeholder can never render. The page renders this box only when SITE_BOT_CLIENT_MESSAGE_COPY_PENDING is false.
// No phone number, no mailto to a person, no founder name (spec constraint).
import { useEffect, useRef, useState } from 'react';
import { renderMixed } from '@/lib/bidi';
import { customerVisibleLabel } from '@/lib/site-bot/checkout/accountCopy';
import { SITE_BOT_CLIENT_MESSAGE_COPY, type ClientMessageCopyKey } from '@/lib/site-bot/clientMessageCopy';

const MAX_CHARS = 2000;
type Phase = 'idle' | 'sending' | 'sent' | 'error';
type ErrorKey = 'errorRetry' | 'errorTooLong' | 'errorRateLimited' | 'errorLinkExpired';

function label(key: ClientMessageCopyKey | 'turnaroundLine'): React.ReactNode {
  const value = customerVisibleLabel(SITE_BOT_CLIENT_MESSAGE_COPY[key]);
  return value ? renderMixed(value) : null;
}

function errorKeyFor(status: number, code: unknown): ErrorKey {
  if (status === 401) return 'errorLinkExpired';
  if (status === 429) return 'errorRateLimited';
  if (status === 400 && code === 'too_long') return 'errorTooLong';
  return 'errorRetry';
}

/**
 * `cancelAvailable`: true when the page shows its cancel button. The cancel pointer line ("cancel with the button on
 * this page") renders only then, so it never points at a button that is not there.
 */
export default function ClientMessageBox({ token, cancelAvailable }: { token: string; cancelAvailable: boolean }) {
  const [body, setBody] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  // Minted on first input and kept until a 200, so a retry of the same message can never duplicate it.
  const messageId = useRef<string | null>(null);
  const sentHeadingRef = useRef<HTMLParagraphElement>(null);

  // The sent state is announced twice over: the mounted role="status" region gets the heading text, and focus moves
  // to the heading itself (the form that had focus is gone).
  useEffect(() => {
    if (phase === 'sent') sentHeadingRef.current?.focus();
  }, [phase]);

  const onChange = (value: string) => {
    if (!messageId.current) messageId.current = crypto.randomUUID();
    setBody(value);
    if (phase === 'error') { setPhase('idle'); setErrorKey(null); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (phase === 'sending' || !body.trim()) return;
    if (!messageId.current) messageId.current = crypto.randomUUID();
    setPhase('sending');
    setErrorKey(null);
    try {
      const response = await fetch('/api/site-bot/client-message', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ token, messageId: messageId.current, body }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const ok = response.status === 200 && !!payload && typeof payload === 'object' && (payload as { ok?: unknown }).ok === true;
      if (ok) {
        setPhase('sent');
        setBody('');
        messageId.current = null;
        return;
      }
      setErrorKey(errorKeyFor(response.status, payload && typeof payload === 'object' ? (payload as { error?: unknown }).error : null));
      setPhase('error');
    } catch {
      setErrorKey('errorRetry');
      setPhase('error');
    }
  };

  const sendAnother = () => {
    messageId.current = null;
    setBody('');
    setPhase('idle');
  };

  const statusText = phase === 'sending' ? label('sending') : phase === 'sent' ? label('sentHeading') : null;

  return (
    <section dir="rtl" lang="he" aria-labelledby="client-message-heading" className="rounded-2xl border border-white/10 bg-white/5 p-6 text-start">
      <h2 id="client-message-heading" className="text-lg font-bold">{label('boxHeading')}</h2>
      {phase === 'sent' ? (
        <div className="mt-3 space-y-3">
          <p ref={sentHeadingRef} tabIndex={-1} className="font-semibold outline-none">{label('sentHeading')}</p>
          <p className="text-sm text-[var(--muted)]">{label('sentBody')}</p>
          {label('turnaroundLine') && <p className="text-sm text-[var(--muted)]">{label('turnaroundLine')}</p>}
          <button type="button" onClick={sendAnother} className="min-h-11 w-full rounded-lg border border-white/20 px-4 py-2 text-base font-semibold">
            {label('sendAnother')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-3 space-y-3">
          <p className="text-sm text-[var(--muted)]">{label('boxIntro')}</p>
          <label htmlFor="client-message-body" className="block text-sm font-semibold">{label('textareaLabel')}</label>
          <textarea
            id="client-message-body"
            dir="auto"
            rows={8}
            maxLength={MAX_CHARS}
            value={body}
            onChange={(e) => onChange(e.target.value)}
            aria-describedby="client-message-hint client-message-count"
            disabled={phase === 'sending'}
            className="block min-h-48 w-full rounded-lg border border-white/20 bg-transparent p-3 text-base"
          />
          <div className="flex justify-between gap-3 text-xs text-[var(--muted)]">
            <span id="client-message-hint">{label('textareaHint')}</span>
            <span id="client-message-count" dir="ltr">{body.length}/{MAX_CHARS}</span>
          </div>
          <button
            type="submit"
            disabled={phase === 'sending' || !body.trim()}
            className="min-h-11 w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-base font-semibold text-black disabled:opacity-50"
          >
            {phase === 'sending' ? label('sending') : label('submit')}
          </button>
          {phase === 'error' && errorKey && (
            <p role="alert" className="text-sm text-red-400">{label(errorKey)}</p>
          )}
        </form>
      )}
      <p role="status" aria-live="polite" className="sr-only">{statusText}</p>
      {cancelAvailable && <p className="mt-4 text-xs text-[var(--muted)]">{label('cancelPointer')}</p>}
    </section>
  );
}
