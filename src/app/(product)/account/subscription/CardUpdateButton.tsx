'use client';

import { useState } from 'react';
import { CARD_UPDATE_BUTTON_COPY as COPY } from '@/lib/payments/accountCopy';

/**
 * Client component: starts the card-update tokenization flow. Sends the
 * magic-link token to the server, which only PEEKS it (doesn't consume) and
 * returns a hosted-tokenization `redirectUrl` — see
 * `src/lib/payments/card-update.ts` doc comment for why consumption is
 * deferred to the callback, not this step.
 *
 * `showMessageBox`: the generic error points at the support box only when that box is on the page.
 */
/** The generic error points at the support box only when that box is on the page. */
export function cardUpdateErrorMessage(kind: 'invalid_token' | 'generic', showMessageBox: boolean): string {
  if (kind === 'invalid_token') return COPY.errorInvalidToken;
  return showMessageBox ? COPY.errorGeneric : COPY.errorGenericNoBox;
}

export default function CardUpdateButton({
  token,
  prominent = false,
  showMessageBox,
}: {
  token: string;
  prominent?: boolean;
  showMessageBox: boolean;
}) {
  const genericError = cardUpdateErrorMessage('generic', showMessageBox);
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
            ? cardUpdateErrorMessage('invalid_token', showMessageBox)
            : genericError
        );
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setState('error');
      setErrorMessage(genericError);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleUpdateCard}
        disabled={state === 'loading'}
        aria-describedby={state === 'error' && errorMessage ? 'card-update-error' : undefined}
        className={
          prominent
            ? 'min-h-11 w-full rounded-lg bg-amber-500 text-black font-semibold py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50'
            : 'min-h-11 w-full rounded-lg border border-white/20 text-white font-semibold py-2.5 text-sm hover:bg-white/5 transition-colors disabled:opacity-50'
        }
      >
        {state === 'loading' ? COPY.loading : COPY.idle}
      </button>
      {state === 'error' && errorMessage && (
        <p id="card-update-error" role="alert" className="text-red-400 text-sm mt-2 text-center">{errorMessage}</p>
      )}
    </div>
  );
}
