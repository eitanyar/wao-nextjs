'use client';

import { useState } from 'react';

/**
 * Client component: the only interactive bit of the account/subscription
 * page. Sends the magic-link token straight to the server for re-validation
 * — the server never trusts a client "I'm authorized" flag (see
 * `cancelSubscriptionByToken` in `src/lib/payments/subscriptions.ts`).
 *
 * No router.refresh() after a cancel: the token is single-use and consumed by the cancel, so a re-render of the page
 * would only show "This link has already been used." The confirmation (and, for a plan row cancelled at the end of the
 * paid period, the access-until date) is shown here instead.
 */
export default function CancelSubscriptionButton({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [accessUntil, setAccessUntil] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCancel() {
    setState('loading');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setState('error');
        setErrorMessage(
          data.error === 'invalid_token'
            ? 'This link has expired or was already used. Request a new one to cancel.'
            : 'Something went wrong. Please try again or contact us.'
        );
        return;
      }
      setAccessUntil(data.cancelAtPeriodEnd === true && typeof data.effectiveAt === 'string' ? data.effectiveAt : null);
      setState('done');
    } catch {
      setState('error');
      setErrorMessage('Something went wrong. Please try again or contact us.');
    }
  }

  if (state === 'done') {
    return (
      <div data-cancel-done={accessUntil ? 'end-of-period' : 'now'}>
        <p className="text-green-400 text-sm">Your subscription has been canceled. You will not be charged again.</p>
        {accessUntil && (
          <div className="flex justify-between text-sm mt-2">
            <span className="text-[var(--muted)]">Access until</span>
            <span className="font-semibold">{new Date(accessUntil).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCancel}
        disabled={state === 'loading'}
        className="w-full rounded-lg bg-red-600 text-white font-semibold py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {state === 'loading' ? 'Canceling…' : 'Cancel subscription'}
      </button>
      {state === 'error' && errorMessage && (
        <p className="text-red-400 text-sm mt-2 text-center">{errorMessage}</p>
      )}
    </div>
  );
}
