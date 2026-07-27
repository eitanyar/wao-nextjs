import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { loadProfile, loadMemos } from '@/lib/trainer/profile';
import { loadHistory, loadUnscoredSessions } from '@/lib/trainer/history';
import { averageMastery, rankBandFor } from '@/lib/trainer/rank';
import { peekTodaysSession } from '@/lib/trainer/coach';
import { DEFAULT_RUBRIC } from '@/lib/trainer/prompts';
import SkillRadar, { SkillRadarTable } from './skill-radar';
import AnalyzeButton from './analyze-button';
import SessionOfDayCard from './session-of-day';

export const metadata = { robots: { index: false }, title: 'לוח התקדמות | מאמן ניסוח ו-EQ | WAO' };

const SKILL_LABEL: Record<string, string> = Object.fromEntries(
  DEFAULT_RUBRIC.map((s) => [s.skill, s.labelHe]),
);

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default async function TrainerDashboardPage() {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    redirect('/admin/login?next=%2Ftrainer');
  }

  const profile = loadProfile();
  const memos = loadMemos();
  const history = loadHistory();
  const unscored = loadUnscoredSessions();
  const todaysSession = peekTodaysSession();

  const avg = averageMastery(profile.mastery);
  const band = rankBandFor(avg);
  const liveMemos = memos.filter((m) => m.status === 'live');

  return (
    <main className="min-h-screen px-4 py-10" dir="rtl">
      <div className="w-full max-w-3xl mx-auto space-y-10">
        <div className="text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">לוח התקדמות — מאמן ניסוח ו-EQ</p>
        </div>

        <section className="text-center space-y-1">
          <p className="text-sm text-[var(--muted)]">
            {profile.sessions} שיחות תורגלו · דירוג נוכחי
          </p>
          <p className="text-2xl font-bold">
            {band.labelHe} <span className="text-[var(--muted)] font-normal text-base">(ממוצע {avg}/100)</span>
          </p>
        </section>

        <section>
          <SessionOfDayCard
            initialSession={
              todaysSession && {
                generatedId: todaysSession.generatedId,
                track: todaysSession.track,
                level: todaysSession.level,
                persona: { name: todaysSession.persona.name, situation: todaysSession.persona.situation },
                scenario: { title: todaysSession.scenario.title, goal: todaysSession.scenario.goal },
                qaFlagged: todaysSession.qaFlagged,
              }
            }
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4 text-center">מפת מיומנויות</h2>
          {profile.sessions === 0 ? (
            <p className="text-center text-sm text-[var(--muted)]">עוד אין נתונים — תרגלו שיחה אחת כדי לראות כאן ניתוח.</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <SkillRadar mastery={profile.mastery} />
              <details className="w-full max-w-sm">
                <summary className="text-xs text-[var(--muted)] cursor-pointer text-center">הצג כטבלת מספרים</summary>
                <div className="mt-2">
                  <SkillRadarTable mastery={profile.mastery} />
                </div>
              </details>
            </div>
          )}
        </section>

        {liveMemos.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">דפוסים חוזרים לשים לב אליהם</h2>
            <ul className="space-y-2">
              {liveMemos.map((m) => (
                <li key={m.id} className="rounded-lg border border-white/10 p-3 text-sm">
                  <span className="text-[var(--muted)]">{SKILL_LABEL[m.skill] ?? m.skill}: </span>
                  {m.text}
                  <div className="text-xs text-[var(--muted)] mt-1">״{m.quoteHe}״</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {unscored.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">שיחות שמחכות לניתוח</h2>
            <ul className="space-y-2">
              {unscored.map((s) => (
                <li
                  key={`${s.sessionRef.date}-${s.sessionRef.index}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 p-3 text-sm"
                >
                  <span>{formatDate(s.startedAt)}</span>
                  <AnalyzeButton sessionRef={s.sessionRef} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">היסטוריית שיחות</h2>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">עדיין אין שיחות מנותחות.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="rounded-lg border border-white/10 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{formatDate(h.scoredAt)}</span>
                    <span className={h.passed ? 'text-emerald-400' : 'text-[var(--muted)]'}>
                      ציון כולל {h.overall}/10 {h.passed ? '· עבר' : ''}
                    </span>
                  </div>
                  {h.feedback && <p className="text-[var(--muted)] mt-1">{h.feedback}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
