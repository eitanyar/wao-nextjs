'use client';

import { useState } from 'react';

const STORAGE_KEY = 'wao-geo-platform';

const PLATFORMS: { value: string; label: string }[] = [
  { value: 'wordpress', label: 'וורדפרס' },
  { value: 'elementor', label: 'Elementor' },
  { value: 'wix',       label: 'Wix' },
  { value: 'nextjs',    label: 'Next.js' },
  { value: 'code',      label: 'קוד' },
  { value: 'other',     label: 'אחר' },
  { value: 'unsure',    label: 'לא בטוח' },
];

interface Props {
  clientId:        string;
  initialPlatform: string | null;
}

export default function PlatformSelect({ clientId, initialPlatform }: Props) {
  const [value, setValue] = useState(initialPlatform ?? '');

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setValue(next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode etc.) — non-fatal
    }

    try {
      await fetch('/api/geo/client/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, platform: next }),
      });
    } catch {
      // best-effort — the select still reflects the client's choice locally
    }
  }

  return (
    <div className="mb-6">
      <label htmlFor="geo-platform-select" className="mb-2 block text-sm font-medium">
        באיזו מערכת האתר שלך בנוי?
      </label>
      <select
        id="geo-platform-select"
        value={value}
        onChange={handleChange}
        className="min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-[var(--elevated)] px-3 py-2.5 text-sm text-[var(--text)]"
      >
        <option value="" disabled>
          בחר פלטפורמה
        </option>
        {PLATFORMS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
