'use client';

import { useState } from 'react';
import { REQUEST_LINK_COPY as COPY } from '@/lib/payments/accountCopy';

/**
 * Client component: asks POST /api/subscriptions/magic-link/request to email a fresh manage / cancel link. Shown on the
 * account page when there is no token, or the token expired / was used. The reply is the same whether or not a
 * subscription exists for the email (no enumeration), so this shows the server's own message.
 * Gap: an owner who gave no valid email at sign-up cannot get a link this way.
 */
export default function RequestLinkForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('loading');
    setMessage(null);
    try {
      const res = await fetch('/api/subscriptions/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setState('error');
        setMessage(typeof data.error === 'string' ? data.error : COPY.errorGeneric);
        return;
      }
      setState('done');
      setMessage(typeof data.message === 'string' ? data.message : null);
    } catch {
      setState('error');
      setMessage(COPY.errorGeneric);
    }
  }

  if (state === 'done') {
    return <p role="status" className="mt-6 text-sm text-green-400" data-request-link="sent">{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-start" data-request-link="form">
      <label className="block text-sm text-[var(--muted)]" htmlFor="request-link-email">{COPY.emailLabel}</label>
      <input
        id="request-link-email"
        type="email"
        dir="ltr"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={state === 'loading' || !email.trim()}
        className="w-full rounded-lg bg-white/10 font-semibold py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {COPY.submit}
      </button>
      {state === 'error' && message && <p role="alert" className="text-red-400 text-sm text-center">{message}</p>}
    </form>
  );
}
