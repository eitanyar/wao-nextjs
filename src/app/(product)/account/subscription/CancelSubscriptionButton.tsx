'use client';

import { useEffect, useReducer, useRef, type RefObject } from 'react';
import { CANCEL_BUTTON_COPY as COPY, formatAccountDate } from '@/lib/payments/accountCopy';

/**
 * Client component: the cancel control of the account/subscription page, in two steps. The first tap opens an in-page
 * confirm question (no window.confirm); "yes" calls the cancel API, "back" closes the question. The magic-link token
 * goes straight to the server for re-validation — the server never trusts a client "I'm authorized" flag (see
 * `cancelSubscriptionByToken` in `src/lib/payments/subscriptions.ts`).
 *
 * No router.refresh() after a cancel: the token is single-use and consumed by the cancel, so a re-render of the page
 * would only show the "link already used" state. The confirmation (and, for a plan row cancelled at the end of the
 * paid period, the service-until date) is shown here instead.
 *
 * Focus: opening the question moves focus to it; "back" returns focus to the cancel button; a failure returns focus to
 * the cancel button (the error is also a role="alert", linked by aria-describedby); success moves focus to the done
 * message paragraph itself, so the focused node has an accessible name.
 */

export type CancelPhase = 'idle' | 'confirming' | 'loading' | 'done' | 'error';
export type CancelErrorKind = 'invalid_token' | 'generic';
export type CancelFocusTarget = 'question' | 'button' | 'done' | null;

export interface CancelState {
  phase: CancelPhase;
  errorKind: CancelErrorKind | null;
  /** ISO paid-through date returned by the cancel API (end-of-period cancels only). */
  accessUntil: string | null;
  focus: CancelFocusTarget;
}

export type CancelAction =
  | { type: 'open' }
  | { type: 'back' }
  | { type: 'submit' }
  | { type: 'succeeded'; accessUntil: string | null }
  | { type: 'failed'; errorKind: CancelErrorKind };

export const INITIAL_CANCEL_STATE: CancelState = { phase: 'idle', errorKind: null, accessUntil: null, focus: null };

export function cancelFlowReducer(state: CancelState, action: CancelAction): CancelState {
  switch (action.type) {
    case 'open':
      return state.phase === 'idle' || state.phase === 'error'
        ? { ...state, phase: 'confirming', errorKind: null, focus: 'question' }
        : state;
    case 'back':
      return state.phase === 'confirming' ? { ...state, phase: 'idle', focus: 'button' } : state;
    case 'submit':
      return state.phase === 'confirming' ? { ...state, phase: 'loading', focus: null } : state;
    case 'succeeded':
      return state.phase === 'loading' ? { ...state, phase: 'done', accessUntil: action.accessUntil, focus: 'done' } : state;
    case 'failed':
      return state.phase === 'loading' ? { ...state, phase: 'error', errorKind: action.errorKind, focus: 'button' } : state;
    default:
      return state;
  }
}

/** The generic error points at the support box only when that box is on the page. */
export function cancelErrorMessage(kind: CancelErrorKind, showMessageBox: boolean): string {
  if (kind === 'invalid_token') return COPY.errorInvalidToken;
  return showMessageBox ? COPY.errorGeneric : COPY.errorGenericNoBox;
}

function ConfirmQuestion({ confirmDate }: { confirmDate: string | null }) {
  if (!confirmDate) return <>{COPY.confirmQuestionNoDate}</>;
  const [before, after] = COPY.confirmQuestion.split('{date}');
  return (
    <>
      {before}
      <bdi dir="ltr">{confirmDate}</bdi>
      {after}
    </>
  );
}

export interface CancelSubscriptionViewProps {
  state: CancelState;
  /** The paid-through date already formatted (formatAccountDate), or null when a cancel would take effect at once. */
  confirmDate: string | null;
  showMessageBox: boolean;
  onOpen: () => void;
  onBack: () => void;
  onConfirm: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  questionRef?: RefObject<HTMLParagraphElement | null>;
  doneRef?: RefObject<HTMLParagraphElement | null>;
}

export function CancelSubscriptionView({
  state,
  confirmDate,
  showMessageBox,
  onOpen,
  onBack,
  onConfirm,
  buttonRef,
  questionRef,
  doneRef,
}: CancelSubscriptionViewProps) {
  if (state.phase === 'done') {
    return (
      <div data-cancel-done={state.accessUntil ? 'end-of-period' : 'now'}>
        <p ref={doneRef} tabIndex={-1} className="text-green-400 text-sm outline-none" data-cancel-done-message="">
          {COPY.doneMessage}
        </p>
        {state.accessUntil && (
          <div className="flex justify-between text-sm mt-2">
            <span className="text-[var(--muted)]">{COPY.doneAccessUntil}</span>
            <bdi dir="ltr" className="font-semibold">{formatAccountDate(state.accessUntil)}</bdi>
          </div>
        )}
      </div>
    );
  }

  if (state.phase === 'confirming' || state.phase === 'loading') {
    const loading = state.phase === 'loading';
    return (
      <div role="group" aria-labelledby="cancel-confirm-question" data-cancel-confirm="open" className="rounded-lg border border-red-500/40 p-4 space-y-3">
        <p id="cancel-confirm-question" ref={questionRef} tabIndex={-1} className="text-sm font-semibold outline-none">
          <ConfirmQuestion confirmDate={confirmDate} />
        </p>
        <button
          type="button"
          onClick={loading ? undefined : onConfirm}
          aria-disabled={loading || undefined}
          data-cancel-confirm-yes=""
          className="min-h-11 w-full rounded-lg bg-red-600 text-white font-semibold py-2.5 text-sm hover:opacity-90 transition-opacity aria-disabled:opacity-50"
        >
          {loading ? COPY.loading : COPY.confirmYes}
        </button>
        <button
          type="button"
          onClick={loading ? undefined : onBack}
          aria-disabled={loading || undefined}
          data-cancel-confirm-back=""
          className="min-h-11 w-full rounded-lg border border-white/20 text-white font-semibold py-2.5 text-sm hover:bg-white/5 transition-colors aria-disabled:opacity-50"
        >
          {COPY.confirmBack}
        </button>
      </div>
    );
  }

  const showError = state.phase === 'error' && !!state.errorKind;
  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        data-cancel-open=""
        aria-describedby={showError ? 'cancel-error' : undefined}
        className="min-h-11 w-full rounded-lg bg-red-600 text-white font-semibold py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {COPY.idle}
      </button>
      {showError && state.errorKind && (
        <p id="cancel-error" role="alert" className="text-red-400 text-sm mt-2 text-center">
          {cancelErrorMessage(state.errorKind, showMessageBox)}
        </p>
      )}
    </div>
  );
}

export default function CancelSubscriptionButton({
  token,
  showMessageBox,
  confirmDate,
}: {
  token: string;
  showMessageBox: boolean;
  confirmDate: string | null;
}) {
  const [state, dispatch] = useReducer(cancelFlowReducer, INITIAL_CANCEL_STATE);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.focus === 'question') questionRef.current?.focus();
    else if (state.focus === 'button') buttonRef.current?.focus();
    else if (state.focus === 'done') doneRef.current?.focus();
  }, [state.focus, state.phase]);

  async function handleConfirm() {
    dispatch({ type: 'submit' });
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        dispatch({ type: 'failed', errorKind: data.error === 'invalid_token' ? 'invalid_token' : 'generic' });
        return;
      }
      dispatch({
        type: 'succeeded',
        accessUntil: data.cancelAtPeriodEnd === true && typeof data.effectiveAt === 'string' ? data.effectiveAt : null,
      });
    } catch {
      dispatch({ type: 'failed', errorKind: 'generic' });
    }
  }

  return (
    <CancelSubscriptionView
      state={state}
      confirmDate={confirmDate}
      showMessageBox={showMessageBox}
      onOpen={() => dispatch({ type: 'open' })}
      onBack={() => dispatch({ type: 'back' })}
      onConfirm={handleConfirm}
      buttonRef={buttonRef}
      questionRef={questionRef}
      doneRef={doneRef}
    />
  );
}
