'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction } from './action';

type LoginActionState = { status: 'idle' | 'failure' };
const initialLoginActionState: LoginActionState = { status: 'idle' };

type LoginCopy = {
  clientIdLabel: string;
  pinLabel: string;
  submit: string;
  failure: string;
  recoveryLink: string;
};

export function LoginForm({ copy, clientId, next }: { copy: LoginCopy; clientId?: string; next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialLoginActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? '/client/dashboard'} />
      {clientId ? <input type="hidden" name="clientId" value={clientId} /> : (
        <div>
          <label htmlFor="clientId" className="block text-sm font-medium mb-1.5">{copy.clientIdLabel}</label>
          <input id="clientId" name="clientId" type="text" autoComplete="username" required className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-3 text-sm outline-none transition-colors focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" />
        </div>
      )}
      <div>
        <label htmlFor="pin" className="block text-sm font-medium mb-1.5">{copy.pinLabel}</label>
        <input id="pin" name="pin" type="password" autoComplete="current-password" inputMode="numeric" required className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-3 text-sm tracking-widest outline-none transition-colors focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" />
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-red-300">{state.status === 'failure' ? copy.failure : ''}</p>
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]">{copy.submit}</button>
      <Link href="/client/recover" className="block min-h-11 pt-3 text-center text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{copy.recoveryLink}</Link>
    </form>
  );
}
