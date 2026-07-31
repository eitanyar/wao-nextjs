import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { loadLedger } from '@/lib/inner-coach/ledger';
import { loadReflections, ratioOverTime, programBreakdown } from '@/lib/inner-coach/history';
import RatioChart from './ratio-chart';

export const metadata = { robots: { index: false }, title: 'Inner Coach | WAO' };

const PROGRAM_LABEL: Record<string, string> = {
  fear: 'פחד',
  victimhood: 'קורבנות',
  comparison: 'השוואה',
  'bypass-lie': 'תירוץ',
  empowered: 'מעצים',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'פעילה',
  retiring: 'חוזרת למעקב',
  retired: 'פרשה',
};

export default async function InnerCoachPage() {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    redirect('/admin/login?next=%2Finner-coach');
  }

  const ledger = loadLedger();
  const reflections = loadReflections();
  const ratioPoints = ratioOverTime(reflections);
  const breakdown = programBreakdown(reflections);
  const hasBeliefs = !!ledger && ledger.beliefs.length > 0;

  return (
    <main className="min-h-screen px-4 py-10" dir="rtl">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">Inner Coach</p>
        </div>

        {!hasBeliefs ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center space-y-4">
            <p className="text-sm text-[var(--muted)]">
              עוד אין יומן אמונות. שיחת ההיכרות הראשונה תיצור טיוטה שתאשר בעצמך.
            </p>
            <a
              href="/inner-coach/session?mode=intake"
              className="inline-block rounded-lg bg-[var(--accent)] text-white font-semibold py-2.5 px-6 text-sm hover:opacity-90 transition-opacity"
            >
              התחל שיחת היכרות
            </a>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <a
                href="/inner-coach/session"
                className="inline-block rounded-lg bg-[var(--accent)] text-white font-semibold py-2.5 px-6 text-sm hover:opacity-90 transition-opacity"
              >
                התחל שיחת היום
              </a>
              <div className="flex justify-center gap-4 mt-3 text-xs text-[var(--muted)]">
                <a href="/inner-coach/session?mode=critic" className="underline">תרגול פירוק</a>
                <a href="/inner-coach/session?mode=cooldown" className="underline">הודיה</a>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="font-bold text-lg mb-3">מראה השפה לאורך זמן</h2>
              <RatioChart points={ratioPoints} />
              <div className="flex flex-wrap gap-3 mt-4 text-xs text-[var(--muted)]">
                {Object.entries(breakdown).map(([program, count]) => (
                  <span key={program}>
                    {PROGRAM_LABEL[program] ?? program}: {count}
                  </span>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold text-lg">אמונות</h2>
              {ledger!.beliefs.map((b) => {
                const progress = Math.min(100, Math.round((b.evidenceActions.length / b.retireThreshold) * 100));
                return (
                  <div key={b.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                      <span>{PROGRAM_LABEL[b.program]}</span>
                      <span>{STATUS_LABEL[b.status]}</span>
                    </div>
                    <p className="text-sm text-[var(--muted)]">״{b.limiting}״</p>
                    <p className="text-sm font-semibold">״{b.empowering}״</p>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {b.evidenceActions.length} / {b.retireThreshold} פעולות עדות
                    </p>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
