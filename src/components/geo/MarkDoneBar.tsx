'use client';

import { useEffect, useRef, useState } from 'react';

type DoneState = 'idle' | 'loading' | 'done' | 'error';

interface Props {
  actionId:      string;
  initialDone:   boolean;
  nextActionId:  string | null;
}

/** Path B only — sticky bottom CTA to confirm the client pasted the content. */
export default function MarkDoneBar({ actionId, initialDone, nextActionId }: Props) {
  const [state, setState] = useState<DoneState>(initialDone ? 'done' : 'idle');
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === 'done') confirmRef.current?.focus();
  }, [state]);

  async function handleDone() {
    setState('loading');
    try {
      const res = await fetch(`/api/geo/action/${encodeURIComponent(actionId)}/done`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('failed');
      setState('done');
    } catch {
      setState('error');
    }
  }

  async function handleUndo() {
    try {
      await fetch(`/api/geo/action/${encodeURIComponent(actionId)}/undone`, { method: 'POST' });
    } catch {
      // best-effort — UI reverts regardless so the client can retry "done"
    }
    setState('idle');
  }

  if (state === 'done') {
    return (
      <div
        ref={confirmRef}
        role="status"
        tabIndex={-1}
        className="mt-8 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-6 py-4 text-center outline-none"
      >
        <p className="mb-1 font-semibold text-[var(--accent)]">
          קיבלנו. נאמת את השינוי תוך 48 שעות ונעדכן בוואטסאפ.
        </p>
        <div className="mt-2 flex items-center justify-center gap-4">
          {nextActionId && (
            <a
              href={`/geo/action/${encodeURIComponent(nextActionId)}`}
              className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-[var(--bg)] hover:opacity-90"
            >
              הפעולה הבאה ←
            </a>
          )}
          <button onClick={handleUndo} className="text-xs text-[var(--muted)] underline hover:text-[var(--text)]">
            סימנתי בטעות
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 start-0 end-0 mt-8 border-t border-[var(--border)] bg-[var(--bg)]/90 px-4 py-3 backdrop-blur">
      <button
        onClick={handleDone}
        disabled={state === 'loading'}
        aria-busy={state === 'loading'}
        className="min-h-[52px] w-full rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {state === 'loading' ? 'בודקים…' : 'הדבקתי — תבדקו אותי'}
      </button>

      {state === 'error' && (
        <div className="mt-2 text-center">
          <p className="mb-1 text-xs text-red-400">משהו השתבש בבדיקה. נסה שוב עוד רגע.</p>
          <button onClick={handleDone} className="text-xs text-[var(--accent)] underline">
            נסה שוב
          </button>
        </div>
      )}
    </div>
  );
}
