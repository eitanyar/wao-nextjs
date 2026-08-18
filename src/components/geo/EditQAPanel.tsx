'use client';

import { useState } from 'react';

interface QAItem {
  question: string;
  answer:   string;
}

const REVIEWERS = ['איתן', 'נועה', 'אחר'];

interface Props {
  actionId:    string;
  actionType:  string;
}

// Editable Q&A (review queue item 2a, 2026-08-17) — faq_block actions only.
// Saving triggers a full regeneration of hebrewContent + jsonLd.mainEntity
// server-side (src/lib/geo/actions.ts updateActionQA) and clears any
// existing approval, forcing re-review of the edited content.
export default function EditQAPanel({ actionId, actionType }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<QAItem[] | null>(null);
  const [reviewer, setReviewer] = useState(REVIEWERS[0]);
  const [customName, setCustomName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (actionType !== 'faq_block') return null;

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (items) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/geo/admin-action/${encodeURIComponent(actionId)}/qa`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items);
    } catch {
      setError('טעינת השאלות נכשלה');
    } finally {
      setLoading(false);
    }
  }

  function updateItem(i: number, field: 'question' | 'answer', value: string) {
    setItems((prev) => prev ? prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it) : prev);
  }

  async function save() {
    const name = reviewer === 'אחר' ? customName.trim() : reviewer;
    if (!name) {
      setError('נא להזין שם');
      return;
    }
    if (!items?.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/geo/admin-action/${encodeURIComponent(actionId)}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, editorName: name }),
      });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      setError('השמירה נכשלה, נסה שוב');
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 w-full">
      <button
        type="button"
        onClick={toggle}
        className="text-xs text-[var(--accent)] underline"
      >
        {open ? 'סגור עריכה' : '✎ ערוך שאלות ותשובות'}
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
          {loading && <p className="text-xs text-[var(--muted)]">טוען...</p>}
          {items?.map((item, i) => (
            <div key={i} className="space-y-1">
              <input
                value={item.question}
                onChange={(e) => updateItem(i, 'question', e.target.value)}
                disabled={busy}
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm font-medium"
              />
              <textarea
                value={item.answer}
                onChange={(e) => updateItem(i, 'answer', e.target.value)}
                disabled={busy}
                rows={2}
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
              />
            </div>
          ))}
          {items?.length ? (
            <div className="flex items-center gap-2 pt-1">
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
                onClick={save}
                disabled={busy}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--bg)] disabled:opacity-50"
              >
                {busy ? '...' : 'שמור (מבטל אישור קיים)'}
              </button>
            </div>
          ) : null}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
