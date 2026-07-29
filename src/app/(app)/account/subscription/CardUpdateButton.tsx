'use client';

import { useState } from 'react';

/**
 * Client component: starts the card-update tokenization flow. Sends the
 * magic-link token to the server, which only PEEKS it (doesn't consume) and
 * returns a hosted-tokenization `redirectUrl` — see
 * `src/lib/payments/card-update.ts` doc comment for why consumption is
 * deferred to the callback, not this step.
 */
export default function CardUpdateButton({
  token,
  prominent = false,
}: {
  token: string;
  prominent?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUpdateCard() {
    setState('loading');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/subscriptions/card-update/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setState('error');
        setErrorMessage(
          data.error === 'invalid_token'
            ? 'This link has expired or was already used. Request a new one to update your card.'
            : 'Something went wrong. Please try again or contact us.'
        );
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setState('error');
      setErrorMessage('Something went wrong. Please try again or contact us.');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleUpdateCard}
        disabled={state === 'loading'}
        className={
          prominent
            ? 'w-full rounded-lg bg-amber-500 text-black font-semibold py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50'
            : 'w-full rounded-lg border border-white/20 text-white font-semibold py-2.5 text-sm hover:bg-white/5 transition-colors disabled:opacity-50'
        }
      >
        {state === 'loading' ? 'Redirecting…' : 'Update payment method'}
      </button>
      {state === 'error' && errorMessage && (
        <p className="text-red-400 text-sm mt-2 text-center">{errorMessage}</p>
      )}
    </div>
  );
}
