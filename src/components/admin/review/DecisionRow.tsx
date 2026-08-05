'use client';

import { useState } from 'react';

export interface DecisionResult {
  status: string;
  message?: string;
}

interface Props {
  taskId: string;
  onResolved: (result: DecisionResult) => void;
}

/**
 * Approve vs. Reject/Adjust, per docs/specs/adam-recommendation-audit-visual-design.md §4.
 * Visually and structurally the only two decision-bearing actions on the card — "Why?"
 * (WhyDisclosure) lives in a separate zone above this and is never a third button here.
 */
export default function DecisionRow({ taskId, onResolved }: Props) {
  const [showReject, setShowReject] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'approve' | 'reject') {
    if (busy) return;
    const correctionNote = decision === 'reject' ? note.trim() : undefined;
    if (decision === 'reject' && !correctionNote) return;

    setBusy(decision);
    setError(null);
    try {
      const res = await fetch('/api/google-ads/operator-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, decision, correctionNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'הפעולה נכשלה');
      onResolved({ status: data.task?.status ?? decision, message: data.message });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה');
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 border-t border-[var(--border)] pt-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => decide('approve')}
          disabled={busy !== null}
          className="min-h-[44px] flex-1 rounded-xl bg-[var(--accent)] px-6 py-3 text-base font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy === 'approve' ? 'מאשר…' : 'אשר'}
        </button>
        <button
          type="button"
          onClick={() => setShowReject((v) => !v)}
          disabled={busy !== null}
          aria-expanded={showReject}
          className="min-h-[44px] rounded-xl border border-red-400/40 px-6 py-3 text-sm font-medium text-red-400 hover:bg-red-400/10 disabled:opacity-60"
        >
          דחה / תקן
        </button>
      </div>

      {showReject && (
        <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/5 p-4">
          <label htmlFor={`reject-note-${taskId}`} className="mb-1 block text-xs font-medium text-red-300">
            מה לא מתאים כאן?
          </label>
          <textarea
            id={`reject-note-${taskId}`}
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-2 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => decide('reject')}
              disabled={busy !== null || !note.trim()}
              aria-disabled={!note.trim()}
              className="rounded-lg bg-red-400 px-4 py-2 text-sm font-semibold text-[var(--bg)] disabled:opacity-60"
            >
              {busy === 'reject' ? 'שולח…' : 'אשר דחייה'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReject(false);
                setNote('');
              }}
              className="text-sm text-[var(--muted)] underline"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}
