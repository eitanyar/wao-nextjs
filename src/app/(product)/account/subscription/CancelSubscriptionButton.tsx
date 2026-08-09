'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client component: the only interactive bit of the account/subscription
 * page. Sends the magic-link token straight to the server for re-validation
 * — the server never trusts a client "I'm authorized" flag (see
 * `cancelSubscriptionByToken` in `src/lib/payments/subscriptions.ts`).
 */
export default function CancelSubscriptionButton({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
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
      setState('done');
      router.refresh();
    } catch {
      setState('error');
      setErrorMessage('Something went wrong. Please try again or contact us.');
    }
  }

  if (state === 'done') {
    return <p className="text-green-400 text-sm">Your subscription has been canceled. You will not be charged again.</p>;
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
