'use client';

import { useActionState, useState } from 'react';
import { completeClientRecoveryContactVerificationAction, requestClientRecoveryContactVerificationAction, revealClientRecoveryContactAction, type RecoveryContactActionState } from './action';

type Props = { clientId: string; status: 'disabled' | 'verified' | 'invalid'; maskedMobile?: string; verifiedAt?: string };
const initialState: RecoveryContactActionState = { status: 'idle' };

export function RecoveryContactControl({ clientId, status, maskedMobile, verifiedAt }: Props) {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [requestState, requestAction, requestPending] = useActionState(requestClientRecoveryContactVerificationAction, initialState);
  const [completeState, completeAction, completePending] = useActionState(completeClientRecoveryContactVerificationAction, initialState);
  const [revealState, revealAction, revealPending] = useActionState(revealClientRecoveryContactAction, initialState);
  const revealed = revealState.status === 'revealed' && !hidden ? revealState.mobile ?? null : null;
  const reveal = (formData: FormData) => { setHidden(false); revealAction(formData); };
  const updateComplete = completeState.status === 'complete';
  return <div className="mt-4 border-t border-white/10 pt-4" dir="rtl">
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span>{status === 'verified' ? 'Recovery: Enabled' : status === 'invalid' ? 'Recovery: Invalid' : 'Recovery: Disabled'}</span>
      {status === 'verified' && <><span>{revealed ?? maskedMobile}</span>{verifiedAt && <span className="text-xs text-[var(--muted)]">Verified at {verifiedAt}</span>}<form action={reveal}><input type="hidden" name="clientId" value={clientId} />{revealed ? <button type="button" onClick={() => setHidden(true)} className="min-h-11 rounded-lg border border-white/20 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">Hide</button> : <button disabled={revealPending} className="min-h-11 rounded-lg border border-white/20 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">Reveal</button>}</form></>}
    </div>
    <details open={open} onToggle={(event) => { setOpen(event.currentTarget.open); if (!event.currentTarget.open) setHidden(true); }} className="mt-3">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">Enroll or update</summary>
      <div aria-live="polite" className="min-h-5 text-sm">{requestState.status === 'sent' ? 'Verification sent' : completeState.status === 'complete' ? 'Recovery contact updated' : requestState.status === 'limited' || completeState.status === 'limited' ? 'Too many attempts' : requestState.status === 'failed' || completeState.status === 'failed' ? 'Unable to complete recovery-contact verification' : ''}</div>
      {!updateComplete && <><form action={requestAction} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="clientId" value={clientId} /><label className="grid gap-1 text-sm">WhatsApp<input name="whatsappMobile" type="tel" inputMode="tel" autoComplete="tel" required className="min-h-11 rounded-lg border border-white/15 bg-white/5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" /></label><button disabled={requestPending} className="min-h-11 rounded-lg border border-[var(--accent)] px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">Send verification code</button></form>{requestState.status === 'sent' && <form action={completeAction} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="clientId" value={clientId} /><label className="grid gap-1 text-sm">WhatsApp<input name="whatsappMobile" type="tel" inputMode="tel" autoComplete="tel" required className="min-h-11 rounded-lg border border-white/15 bg-white/5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" /></label><label className="grid gap-1 text-sm">Verification code<input name="code" inputMode="numeric" autoComplete="one-time-code" required className="min-h-11 rounded-lg border border-white/15 bg-white/5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" /></label><button disabled={completePending} className="min-h-11 rounded-lg border border-[var(--accent)] px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:col-span-2">Confirm verified contact</button></form>}</>}
    </details>
  </div>;
}
