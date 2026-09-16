'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

type RecoveryCopy = {
  title: string;
  backToLogin: string;
  codeLabel: string;
  newPinLabel: string;
  confirmPinLabel: string;
  policyHint: string;
  mismatch: string;
  policyFailure: string;
  genericFailure: string;
  submit: string;
};

async function post(path: string, body: Record<string, string>): Promise<{ status: string }> {
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return response.json() as Promise<{ status: string }>;
}

export function RecoveryForm({ copy }: { copy: RecoveryCopy }) {
  const [whatsappMobile, setWhatsappMobile] = useState('');
  const [requested, setRequested] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage('');
    try { await post('/api/client/recover/request', { whatsappMobile }); setRequested(true); } catch { setMessage(copy.genericFailure); } finally { setPending(false); }
  }
  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage('');
    const values = new FormData(event.currentTarget);
    try {
      const result = await post('/api/client/recover/complete', { whatsappMobile, code: String(values.get('code') ?? ''), newPin: String(values.get('newPin') ?? ''), confirmPin: String(values.get('confirmPin') ?? '') });
      if (result.status === 'complete') window.location.assign('/client/login');
      else if (result.status === 'mismatch') setMessage(copy.mismatch);
      else if (result.status === 'policy-failure') setMessage(copy.policyFailure);
      else setMessage(copy.genericFailure);
    } catch { setMessage(copy.genericFailure); } finally { setPending(false); }
  }
  return requested ? (
    <form key="recovery-code-entry" onSubmit={complete} className="space-y-4">
      <div><label htmlFor="code" className="block text-sm font-medium mb-1.5">{copy.codeLabel}</label><input id="code" name="code" type="password" inputMode="numeric" autoComplete="one-time-code" required className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-3 text-sm tracking-widest outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" /></div>
      <div><label htmlFor="newPin" className="block text-sm font-medium mb-1.5">{copy.newPinLabel}</label><input id="newPin" name="newPin" type="password" inputMode="numeric" autoComplete="new-password" required className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-3 text-sm outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" /></div>
      <div><label htmlFor="confirmPin" className="block text-sm font-medium mb-1.5">{copy.confirmPinLabel}</label><input id="confirmPin" name="confirmPin" type="password" inputMode="numeric" autoComplete="new-password" required className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-3 text-sm outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" /></div>
      <p className="text-xs text-[var(--muted)]">{copy.policyHint}</p><p aria-live="polite" className="min-h-5 text-sm text-red-300">{message}</p>
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{copy.submit}</button>
    </form>
  ) : <form key="recovery-mobile-entry" onSubmit={request} className="space-y-4"><div><label htmlFor="whatsappMobile" className="block text-sm font-medium mb-1.5">WhatsApp</label><input id="whatsappMobile" value={whatsappMobile} onChange={event => setWhatsappMobile(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="050-123-4567" required className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-3 text-sm outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" /></div><p aria-live="polite" className="min-h-5 text-sm text-red-300">{message}</p><button type="submit" disabled={pending} className="min-h-11 w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{copy.title}</button></form>;
}

export function RecoveryBackLink({ copy }: { copy: Pick<RecoveryCopy, 'backToLogin'> }) { return <Link href="/client/login" className="mt-4 flex min-h-11 items-center justify-center text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{copy.backToLogin}</Link>; }
