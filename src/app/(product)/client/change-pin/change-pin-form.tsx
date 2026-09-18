'use client';

import { useActionState } from 'react';
import { changeClientPinAction } from './action';

type ChangePinActionState = { status: 'idle' | 'mismatch' | 'policy-failure' | 'current-failure' | 'generic-failure' };
const initialChangePinActionState: ChangePinActionState = { status: 'idle' };

type ChangeCopy = {
  currentPinLabel: string;
  newPinLabel: string;
  confirmPinLabel: string;
  policyHint: string;
  mismatch: string;
  policyFailure: string;
  currentFailure: string;
  genericFailure: string;
  submit: string;
};

export function ChangePinForm({ copy, showCurrentPin }: { copy: ChangeCopy; showCurrentPin: boolean }) {
  const [state, formAction, pending] = useActionState(changeClientPinAction, initialChangePinActionState);
  const message = state.status === 'mismatch' ? copy.mismatch
    : state.status === 'policy-failure' ? copy.policyFailure
      : state.status === 'current-failure' ? copy.currentFailure
        : state.status === 'generic-failure' ? copy.genericFailure
          : '';

  return (
    <form action={formAction} className="space-y-4">
      {showCurrentPin && <div><label htmlFor="currentPin" className="mb-1.5 block text-sm font-medium">{copy.currentPinLabel}</label><input id="currentPin" name="currentPin" type="password" inputMode="numeric" autoComplete="current-password" required className="w-full rounded-lg border border-white/15 bg-white/8 px-4 py-3 text-sm tracking-widest outline-none transition-colors focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" /></div>}
      <div><label htmlFor="newPin" className="mb-1.5 block text-sm font-medium">{copy.newPinLabel}</label><input id="newPin" name="newPin" type="password" inputMode="numeric" autoComplete="new-password" required className="w-full rounded-lg border border-white/15 bg-white/8 px-4 py-3 text-sm tracking-widest outline-none transition-colors focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" /></div>
      <div><label htmlFor="confirmPin" className="mb-1.5 block text-sm font-medium">{copy.confirmPinLabel}</label><input id="confirmPin" name="confirmPin" type="password" inputMode="numeric" autoComplete="new-password" required className="w-full rounded-lg border border-white/15 bg-white/8 px-4 py-3 text-sm tracking-widest outline-none transition-colors focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" /></div>
      <p className="text-xs leading-5 text-[var(--muted)]">{copy.policyHint}</p>
      <p aria-live="polite" className="min-h-5 text-sm text-red-300">{message}</p>
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]">{copy.submit}</button>
    </form>
  );
}
