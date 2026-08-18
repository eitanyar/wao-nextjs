'use client';

import { useState } from 'react';

interface CriticResult {
  distinctive:   boolean;
  flags:         string[];
  reasons:       string[];
  citationNote:  string;
  checkedAt:     string;
  flagsActedOn?: boolean;
}

interface Props {
  actionId: string;
  initialResult?: CriticResult;
}

// On-demand distinctiveness critic (2026-08-17) — a reviewer choice, not an
// automatic pipeline step. Only rendered for already-flagged (non-clean)
// actions in the dashboard; clean/autoship items don't need it. See
// src/lib/geo/critic.ts for the full design rationale and validation gate.
export default function CriticPanel({ actionId, initialResult }: Props) {
  const [result, setResult] = useState<CriticResult | undefined>(initialResult);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runCritic() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/geo/admin-action/${encodeURIComponent(actionId)}/critic`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data.result);
    } catch {
      setError('בדיקת הייחודיות נכשלה — בדוק את חיבור Qwen');
    } finally {
      setBusy(false);
    }
  }

  async function recordActedOn(actedOn: boolean) {
    try {
      await fetch(`/api/geo/admin-action/${encodeURIComponent(actionId)}/critic`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actedOn }),
      });
      setResult((prev) => (prev ? { ...prev, flagsActedOn: actedOn } : prev));
    } catch {
      // best-effort — doesn't block the reviewer's flow
    }
  }

  if (!result) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={runCritic}
          disabled={busy}
          className="text-xs text-[var(--accent)] underline disabled:opacity-50"
        >
          {busy ? 'בודק ייחודיות... (עד 2 דקות)' : '🔍 בדיקת ייחודיות (Qwen)'}
        </button>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className={result.distinctive ? 'text-green-400 font-medium' : 'text-orange-400 font-medium'}>
          {result.distinctive ? '✓ ייחודי מספיק' : '⚑ דורש חיזוק'}
        </span>
        <button type="button" onClick={runCritic} disabled={busy} className="text-[var(--muted)] underline">
          {busy ? '...' : 'בדוק שוב'}
        </button>
      </div>
      {result.citationNote && <p className="text-[var(--muted)]">{result.citationNote}</p>}
      {result.flags.length > 0 && (
        <ul className="space-y-1">
          {result.flags.map((flag, i) => (
            <li key={i} className="text-[var(--text)]">
              <span className="text-orange-400">⚑</span> {flag}
              {result.reasons[i] && <span className="text-[var(--muted)]"> — {result.reasons[i]}</span>}
            </li>
          ))}
        </ul>
      )}
      {result.flags.length > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
          <span className="text-[var(--muted)]">הדגלים האלה שינו את ההחלטה שלך?</span>
          <button
            type="button"
            onClick={() => recordActedOn(true)}
            className={`rounded px-2 py-0.5 ${result.flagsActedOn === true ? 'bg-green-500/30 text-green-300' : 'bg-[var(--elevated)] text-[var(--muted)]'}`}
          >
            כן
          </button>
          <button
            type="button"
            onClick={() => recordActedOn(false)}
            className={`rounded px-2 py-0.5 ${result.flagsActedOn === false ? 'bg-red-500/30 text-red-300' : 'bg-[var(--elevated)] text-[var(--muted)]'}`}
          >
            לא (רעש)
          </button>
        </div>
      )}
    </div>
  );
}
