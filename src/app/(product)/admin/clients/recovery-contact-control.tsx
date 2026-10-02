'use client';

import { useActionState, useState } from 'react';
import { completeClientRecoveryContactVerificationAction, requestClientRecoveryContactVerificationAction, revealClientRecoveryContactAction, type RecoveryContactActionState } from './action';

type Props = { clientId: string; status: 'disabled' | 'verified' | 'invalid'; maskedEmail?: string; verifiedAt?: string };
const initialState: RecoveryContactActionState = { status: 'idle' };

export function RecoveryContactControl({ clientId, status, maskedEmail, verifiedAt }: Props) {
  const [open, setOpen] = useState(false);
  const [showFullEmail, setShowFullEmail] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState('');
  const [requestState, requestAction, requestPending] = useActionState(requestClientRecoveryContactVerificationAction, initialState);
  const [completeState, completeAction, completePending] = useActionState(completeClientRecoveryContactVerificationAction, initialState);
  const [revealState, revealAction, revealPending] = useActionState(revealClientRecoveryContactAction, initialState);
  const revealed = showFullEmail && revealState.status === 'revealed' ? revealState.email ?? null : null;
  const close = () => { setOpen(false); setShowFullEmail(false); setCandidateEmail(''); };
  const updateComplete = completeState.status === 'complete';
  const stateLabel = status === 'verified' ? 'Recovery Email: Enabled' : status === 'invalid' ? 'Recovery Email: Invalid' : 'Recovery Email: Disabled';
  return <div className="mt-4 border-t border-white/10 pt-4" dir="rtl">
    <div className="flex flex-wrap items-center gap-3 text-sm"><span>{stateLabel}</span>
      {status === 'verified' && <><span>{revealed ?? maskedEmail}</span><span className="sr-only">Verified email</span>{verifiedAt && <span className="text-xs text-[var(--muted)]">Verified at {verifiedAt}</span>}
        <form action={(formData) => { setShowFullEmail(true); revealAction(formData); }}><input type="hidden" name="clientId" value={clientId} />
          {revealed ? <button type="button" onClick={() => setShowFullEmail(false)} className="min-h-11 rounded-lg border border-white/20 px-4 py-3">Hide</button> : <button disabled={revealPending} className="min-h-11 rounded-lg border border-white/20 px-4 py-3">Reveal</button>}
        </form></>}
    </div>
    <details open={open} onToggle={(event) => { if (!event.currentTarget.open) close(); else setOpen(true); }} className="mt-3">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Enroll or update</summary>
      <div aria-live="polite" className="min-h-5 text-sm">{requestState.status === 'sent' ? 'Verification sent' : completeState.status === 'complete' ? 'Recovery email updated' : requestState.status === 'limited' || completeState.status === 'limited' ? 'Too many attempts' : requestState.status === 'failed' || completeState.status === 'failed' ? 'Unable to complete recovery-email verification' : ''}</div>
      {!updateComplete && <><form action={requestAction} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="clientId" value={clientId} /><label className="grid gap-1 text-sm">Email<input name="email" value={candidateEmail} onChange={(event) => setCandidateEmail(event.target.value)} type="email" inputMode="email" autoComplete="email" required className="min-h-11 rounded-lg border border-white/15 bg-white/5 px-3" /></label><button disabled={requestPending} className="min-h-11 rounded-lg border border-[var(--accent)] px-4 py-3 text-sm font-semibold">Send verification code</button></form>
        {requestState.status === 'sent' && <form action={(formData) => { setCandidateEmail(''); completeAction(formData); }} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="clientId" value={clientId} /><input type="hidden" name="email" value={candidateEmail} /><label className="grid gap-1 text-sm">Verification code<input name="code" inputMode="numeric" autoComplete="one-time-code" required className="min-h-11 rounded-lg border border-white/15 bg-white/5 px-3" /></label><button disabled={completePending} className="min-h-11 rounded-lg border border-[var(--accent)] px-4 py-3 text-sm font-semibold">Confirm verified email</button></form>}</>}
    </details>
  </div>;
}
