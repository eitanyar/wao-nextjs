'use client';
import { useState } from 'react';

interface Props {
  actionId:    string;
  clientId:    string;
  rankingUrl:  string;
  actionType:  string;
  nextActionId?: string | null;
}

export default function MarkDoneButton({ actionId, clientId, rankingUrl, actionType, nextActionId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleDone() {
    setState('loading');
    try {
      const res = await fetch(`/api/geo/action/${encodeURIComponent(actionId)}/done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, rankingUrl, actionType }),
      });
      if (!res.ok) throw new Error('Failed');
      setState('done');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  async function handleUndo() {
    await fetch(`/api/geo/action/${encodeURIComponent(actionId)}/done`, { method: 'DELETE' });
    setState('idle');
  }

  if (state === 'done') {
    return (
      <div
        role="status"
        tabIndex={-1}
        className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-6 py-4 text-center"
      >
        <p className="font-semibold text-[var(--accent)] mb-1">✓ קיבלנו — נבדוק שהתוכן עלה תוך 48 שעות</p>
        <p className="text-sm text-[var(--muted)] mb-3">תקבלי הודעת וואטסאפ אחרי הבדיקה</p>
        <div className="flex items-center justify-center gap-4">
          {nextActionId && (
            <a
              href={`/geo/action/${encodeURIComponent(nextActionId)}`}
              className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-[var(--bg)] hover:opacity-90"
            >
              הפעולה הבאה ←
            </a>
          )}
          <button
            onClick={handleUndo}
            className="text-xs text-[var(--muted)] underline hover:text-[var(--text)]"
          >
            סימנתי בטעות
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 bg-[var(--bg)]/90 backdrop-blur border-t border-[var(--border)] px-4 py-3">
      <button
        onClick={handleDone}
        disabled={state === 'loading'}
        aria-busy={state === 'loading'}
        className="w-full rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-60 min-h-[52px]"
      >
        {state === 'loading' ? '...' : state === 'error' ? 'משהו השתבש — נסי שוב' : 'סיימתי — תבדקו את זה ✓'}
      </button>
    </div>
  );
}
