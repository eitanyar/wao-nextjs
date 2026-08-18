'use client';

import { useState } from 'react';

const REVIEWERS = ['איתן', 'נועה', 'אחר'];

interface Props {
  actionId: string;
}

// Approve control for the internal WAO review queue (2026-08-17) — the
// human-in-the-loop gate that must fire before SendButton unlocks.
// Deliberately not hard-wired to one reviewer: per Lior's sequencing call,
// the review queue must support multiple reviewers so it scales past a
// single founder.
export default function ApproveControl({ actionId }: Props) {
  const [reviewer, setReviewer] = useState(REVIEWERS[0]);
  const [customName, setCustomName] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    const name = reviewer === 'אחר' ? customName.trim() : reviewer;
    if (!name) {
      setError('נא להזין שם');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/geo/admin-action/${encodeURIComponent(actionId)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName: name, note: note.trim() }),
      });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      setError('האישור נכשל, נסה שוב');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          disabled={busy}
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs"
        >
          {REVIEWERS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {reviewer === 'אחר' && (
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="שם"
            disabled={busy}
            className="w-20 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs"
          />
        )}
        <button
          type="button"
          onClick={() => setShowNote((v) => !v)}
          disabled={busy}
          className="text-xs text-[var(--muted)] underline"
        >
          {showNote ? 'בלי הערה' : '+ הערה לעתיד'}
        </button>
        <button
          onClick={approve}
          disabled={busy}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--bg)] disabled:opacity-50"
        >
          {busy ? '...' : 'אשר לפרסום'}
        </button>
      </div>
      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          placeholder="הערה שתילקח בחשבון בתוכן הבא של הלקוח (למשל: מיקום מילה מסוימת, ניסוח מועדף)"
          rows={2}
          className="w-64 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs"
        />
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
