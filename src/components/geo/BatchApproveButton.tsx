'use client';

import { useState } from 'react';

const REVIEWERS = ['איתן', 'נועה', 'אחר'];

interface Props {
  clientId: string;
  cleanCount: number;
}

// Batch-approve the clean queue — the throughput lever for the
// 250-client/180-day plan (Lior, 2026-08-17): approve everything that
// already cleared every static gate in one click, so review time goes to
// the flagged minority only.
export default function BatchApproveButton({ clientId, cleanCount }: Props) {
  const [reviewer, setReviewer] = useState(REVIEWERS[0]);
  const [customName, setCustomName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cleanCount === 0) return null;

  async function approveAll() {
    const name = reviewer === 'אחר' ? customName.trim() : reviewer;
    if (!name) {
      setError('נא להזין שם');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/geo/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, reviewerName: name }),
      });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      setError('האישור נכשל, נסה שוב');
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-dim)] px-3 py-2">
      <span className="text-xs text-[var(--text)]">
        {cleanCount} פעולות עברו את כל הבדיקות האוטומטיות ונקיות לאישור מהיר
      </span>
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
        onClick={approveAll}
        disabled={busy}
        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--bg)] disabled:opacity-50"
      >
        {busy ? '...' : `אשר הכל (${cleanCount})`}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
