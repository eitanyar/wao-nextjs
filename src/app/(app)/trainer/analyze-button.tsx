'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  sessionRef: { date: string; index: number };
}

export default function AnalyzeButton({ sessionRef }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  async function onClick() {
    setState('loading');
    try {
      const res = await fetch('/api/trainer/debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionRef }),
      });
      if (!res.ok) {
        setState('error');
        return;
      }
      router.refresh();
      setState('idle');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={state === 'loading'}
        className="rounded-lg bg-[var(--accent,#6ee7b7)] px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50"
      >
        {state === 'loading' ? 'מנתח…' : 'נתח את השיחה'}
      </button>
      {state === 'error' && <span className="text-xs text-red-400">הניתוח נכשל, נסה שוב</span>}
    </div>
  );
}
