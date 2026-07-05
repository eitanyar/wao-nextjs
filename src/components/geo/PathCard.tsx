'use client';

import { useState } from 'react';

type PublishMode = 'auto' | 'manual';

interface Props {
  actionId:    string;
  wpConnected: boolean;
  mode:        PublishMode;
  /** True once auto-publish has actually executed — both radios lock. */
  locked:      boolean;
}

export default function PathCard({ actionId, wpConnected, mode, locked }: Props) {
  const [current, setCurrent] = useState<PublishMode>(mode);
  const [switchedFromAuto, setSwitchedFromAuto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: PublishMode) {
    if (locked || saving || next === current) return;
    const wasAuto = current === 'auto';
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/geo/action/${encodeURIComponent(actionId)}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'switch failed');
      }
      setCurrent(next);
      if (wasAuto && next === 'manual') setSwitchedFromAuto(true);
    } catch {
      setError('לא הצלחנו לשמור את הבחירה. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset
      id="publish-mode"
      disabled={locked || saving}
      className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <legend className="px-1 text-sm font-medium">איך לפרסם את השינוי</legend>

      {locked && (
        <p className="mt-2 mb-3 text-sm text-[var(--muted)]">
          כבר פרסמנו את השינוי. אי אפשר לעבור לביצוע ידני.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name={`publish-mode-${actionId}`}
            value="auto"
            checked={current === 'auto'}
            disabled={locked || saving || !wpConnected}
            onChange={() => handleChange('auto')}
            className="mt-1 h-4 w-4 accent-[var(--accent)]"
          />
          <span>
            <span className="block text-sm font-medium">פרסום אוטומטי</span>
            <span className="block text-xs text-[var(--muted)]">אנחנו מפרסמים במקומך — האתר מחובר.</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name={`publish-mode-${actionId}`}
            value="manual"
            checked={current === 'manual'}
            disabled={locked || saving}
            onChange={() => handleChange('manual')}
            className="mt-1 h-4 w-4 accent-[var(--accent)]"
          />
          <span>
            <span className="block text-sm font-medium">אני מפרסם בעצמי</span>
            <span className="block text-xs text-[var(--muted)]">אנחנו נותנים לך את התוכן, אתה מדביק באתר.</span>
          </span>
        </label>
      </div>

      {switchedFromAuto && current === 'manual' && (
        <p className="mt-3 text-xs text-yellow-400">
          מעבר לביצוע ידני יבטל את הפרסום האוטומטי שמחכה.
        </p>
      )}

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {!wpConnected && (
        <a
          href="/geo/dashboard"
          className="mt-3 inline-block text-xs text-[var(--accent)] underline underline-offset-2"
        >
          לחיבור וורדפרס לפרסום אוטומטי
        </a>
      )}
    </fieldset>
  );
}
