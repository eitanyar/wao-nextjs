'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SCENARIOS, getScenario, type ScenarioKey } from '@/lib/trainer/scenarios';

interface SessionOfDay {
  generatedId: string;
  track: string;
  level: 1 | 2 | 3;
  persona: { name: string; situation: string };
  scenario: { title: string; goal: string };
  qaFlagged: boolean;
}

interface Props {
  initialSession: SessionOfDay | null;
}

const LEVELS: { value: 1 | 2 | 3; labelHe: string }[] = [
  { value: 1, labelHe: 'L1 — קליל' },
  { value: 2, labelHe: 'L2 — מציאותי' },
  { value: 3, labelHe: 'L3 — קשוח' },
];

const SCENARIO_LIST = Object.values(SCENARIOS);

export default function SessionOfDayCard({ initialSession }: Props) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [level, setLevel] = useState<1 | 2 | 3>(initialSession?.level ?? 2);
  const [scenario, setScenario] = useState<ScenarioKey>(getScenario(initialSession?.track).key);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(fresh: boolean, track?: ScenarioKey) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/trainer/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fresh, level, track: track ?? scenario }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError('יצירת השיחה נכשלה, נסה שוב');
        return;
      }
      setSession(data.session);
    } catch {
      setError('יצירת השיחה נכשלה, נסה שוב');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">שיחה של היום</h2>
          <div className="flex gap-1">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLevel(l.value)}
                className={`rounded-md px-2 py-1 text-xs ${
                  level === l.value ? 'bg-[var(--accent,#6ee7b7)] text-black' : 'border border-white/10 text-[var(--muted)]'
                }`}
              >
                {l.labelHe}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          {SCENARIO_LIST.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setScenario(s.key);
                generate(false, s.key);
              }}
              disabled={busy}
              className={`rounded-md px-2 py-1 text-xs ${
                scenario === s.key ? 'bg-[var(--accent,#6ee7b7)] text-black' : 'border border-white/10 text-[var(--muted)]'
              } disabled:opacity-50`}
            >
              {s.labelHe}
            </button>
          ))}
        </div>
      </div>

      {session ? (
        <>
          <p className="text-sm text-[var(--muted)]">
            מסלול: {getScenario(session.track).labelHe} · רמה {session.level}
          </p>
          <p className="text-sm leading-relaxed">{session.persona.situation}</p>
          <p className="text-sm text-[var(--muted)]">מטרה: {session.scenario.goal}</p>
          {session.qaFlagged && (
            <p className="text-xs text-amber-400">שים לב: הניסוח לאעבר את בדיקה האוטומטית — עדיין ניתן לתרגל.</p>
          )}
          <div className="flex items-center gap-3">
            <a
              href={`/trainer/session?generatedId=${encodeURIComponent(session.generatedId)}`}
              className="rounded-lg bg-[var(--accent,#6ee7b7)] px-4 py-2 text-sm font-medium text-black"
            >
              להתחיל שיחה
            </a>
            <button
              type="button"
              onClick={() => generate(true)}
              disabled={busy}
              className="text-sm text-[var(--muted)] underline disabled:opacity-50"
            >
              {busy ? 'יוצר…' : 'שיחה טרייה ברמה שנבחרה'}
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => generate(false)}
            disabled={busy}
            className="rounded-lg bg-[var(--accent,#6ee7b7)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {busy ? 'יוצר שיחה…' : 'צור שיחה של היום'}
          </button>
          <span className="text-xs text-[var(--muted)]">או תרגלו את דני, הפרסונה הקבועה, ב/trainer/session</span>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
