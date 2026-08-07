'use client';

import { useState } from 'react';
import type { QueueItemStatus } from '@/lib/gmb/types';

type Mode = 'idle' | 'editing' | 'loading' | 'done' | 'rejected' | 'error';

interface Props {
  itemId:        string;
  initialText:   string;
  initialStatus: QueueItemStatus;
}

/**
 * GMB Bot's per-item approval control — the action-page adapter for GMB's item
 * shape (draft text to approve/edit/reject), analogous in role to GEO's
 * MarkDoneBar but a different state machine: GEO's "done" means the client
 * self-confirmed a paste; GMB's approval here is a real go/no-go on a live
 * public GBP write, so it's explicitly approve-as-is / approve-edited / reject
 * — never a silent single "done" toggle (spec §2, no bulk/implicit approval).
 */
export default function ApproveEditBar({ itemId, initialText, initialStatus }: Props) {
  const [mode, setMode]   = useState<Mode>(
    initialStatus === 'pending' ? 'idle' : initialStatus === 'rejected' ? 'rejected' : 'done'
  );
  const [text, setText]   = useState(initialText);
  const [editText, setEditText] = useState(initialText);

  async function submit(decision: 'approve-as-is' | 'approve-edited' | 'reject') {
    setMode('loading');
    try {
      const res = await fetch(`/api/gmb/action/${encodeURIComponent(itemId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          editedText: decision === 'approve-edited' ? editText : undefined,
        }),
      });
      if (!res.ok) throw new Error('failed');
      if (decision === 'approve-edited') setText(editText);
      setMode(decision === 'reject' ? 'rejected' : 'done');
    } catch {
      setMode('error');
    }
  }

  if (mode === 'done') {
    return (
      <div className="mt-8 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-6 py-4 text-center">
        <p className="mb-1 font-semibold text-[var(--accent)]">
          אושר. אנחנו מפרסמים בפרופיל ה-Google Business שלך, ומעדכנים אותך בוואטסאפ ברגע שזה עולה לאוויר.
        </p>
        <p className="text-sm text-[var(--muted)] mt-2 whitespace-pre-wrap">{text}</p>
      </div>
    );
  }

  if (mode === 'rejected') {
    return (
      <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-center">
        <p className="font-semibold text-red-400">סימנת שהטיוטה לא מתאימה, אז לא נפרסם אותה.</p>
      </div>
    );
  }

  if (mode === 'editing') {
    return (
      <div className="sticky bottom-0 start-0 end-0 mt-8 border-t border-[var(--border)] bg-[var(--bg)]/95 px-4 py-4 backdrop-blur">
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm mb-3"
          dir="rtl"
        />
        <div className="flex gap-2">
          <button
            onClick={() => submit('approve-edited')}
            className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--bg)] hover:opacity-90"
          >
            שמור ואשר
          </button>
          <button
            onClick={() => setMode('idle')}
            className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]"
          >
            ביטול
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 start-0 end-0 mt-8 border-t border-[var(--border)] bg-[var(--bg)]/90 px-4 py-3 backdrop-blur">
      <div className="flex gap-2">
        <button
          onClick={() => submit('approve-as-is')}
          disabled={mode === 'loading'}
          aria-busy={mode === 'loading'}
          className="flex-1 min-h-[52px] rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-[var(--bg)] hover:opacity-90 disabled:opacity-60"
        >
          ✅ אישור
        </button>
        <button
          onClick={() => setMode('editing')}
          disabled={mode === 'loading'}
          className="min-h-[52px] rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--text)]"
        >
          ✏️ עריכה
        </button>
        <button
          onClick={() => submit('reject')}
          disabled={mode === 'loading'}
          className="min-h-[52px] rounded-xl border border-red-500/30 px-4 py-3 text-sm text-red-400"
        >
          ❌ דחייה
        </button>
      </div>
      {mode === 'error' && (
        <p className="mt-2 text-center text-xs text-red-400">משהו השתבש. נסה שוב עוד רגע.</p>
      )}
    </div>
  );
}
