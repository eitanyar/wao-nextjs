import { cookies }         from 'next/headers';
import { redirect }        from 'next/navigation';
import Link                from 'next/link';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { getClientActions } from '@/lib/geo/actions';

export const metadata = { robots: { index: false }, title: 'המשימות שלי | WAO' };

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const STATUS_LABEL: Record<string, string> = {
  generated: 'ממתין',
  sent:      'נשלח',
  approved:  'אושר',
  published: 'פורסם',
  verified:  'אומת',
  done:      'בוצע ✓',
};

const STATUS_COLOR: Record<string, string> = {
  generated: 'text-yellow-400 bg-yellow-500/15',
  sent:      'text-blue-400  bg-blue-500/15',
  approved:  'text-purple-400 bg-purple-500/15',
  published: 'text-cyan-400  bg-cyan-500/15',
  verified:  'text-green-400 bg-green-500/15',
  done:      'text-green-400 bg-green-500/15',
};

const PRIORITY_DOT: Record<string, string> = {
  HIGH:   'bg-red-400',
  MEDIUM: 'bg-yellow-400',
  LOW:    'bg-green-400',
};

export default async function DashboardPage() {
  const jar      = await cookies();
  const token    = jar.get(COOKIE_NAME)?.value ?? '';
  const clientId = await verifySessionToken(token);
  if (!clientId) redirect('/client/login');

  const all     = getClientActions(clientId);
  const pending = all
    .filter(a => a.status !== 'done' && a.status !== 'verified')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.rank - b.rank);
  const done = all.filter(a => a.status === 'done' || a.status === 'verified');

  const totalDone = done.length;
  const pct       = all.length ? Math.round((totalDone / all.length) * 100) : 0;

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 pt-8 pb-20" dir="rtl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">המשימות שלי</h1>
          <p className="text-[var(--muted)] text-sm mt-0.5">
            {pending.length} משימות פתוחות · {totalDone} בוצעו
          </p>
        </div>
        <span className="text-3xl font-black tracking-tight text-[var(--accent)]">WAO</span>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      {all.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-[var(--muted)] mb-1.5">
            <span>התקדמות כוללת</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Pending tasks ───────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            ממתין לביצוע
          </h2>
          <ul className="space-y-3">
            {pending.map((action) => (
              <li key={action.actionId}>
                <Link
                  href={`/geo/action/${encodeURIComponent(action.actionId)}`}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-4 hover:border-white/20 hover:bg-white/8 transition-all group"
                >
                  {/* Priority dot */}
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[action.priority]}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{action.query}</p>
                    <p className="text-[var(--muted)] text-xs mt-0.5 truncate">
                      {decodeURIComponent(action.rankingUrl.replace(/https?:\/\/[^/]+/, '') || '/')}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLOR[action.status] ?? ''}`}>
                    {STATUS_LABEL[action.status] ?? action.status}
                  </span>

                  {/* Arrow */}
                  <span className="text-[var(--muted)] group-hover:text-white transition-colors text-lg">←</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Done tasks ──────────────────────────────────────────────────── */}
      {done.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            בוצע
          </h2>
          <ul className="space-y-2">
            {done.map((action) => (
              <li key={action.actionId}>
                <Link
                  href={`/geo/action/${encodeURIComponent(action.actionId)}`}
                  className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/3 px-4 py-3 opacity-60 hover:opacity-80 transition-opacity"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-green-400" />
                  <span className="flex-1 text-sm truncate line-through">{action.query}</span>
                  <span className="text-xs text-green-400">✓</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {all.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <p className="text-4xl mb-4">📋</p>
          <p>אין משימות עדיין. WAO יעדכן אותך בקרוב.</p>
        </div>
      )}

    </main>
  );
}
