import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import InnerCoachSessionRoom from '../session-room';
import { getOrPickTodaysSession, buildSessionConfig, type Mode } from '@/lib/inner-coach/session';

export const metadata = { robots: { index: false }, title: 'שיחה | Inner Coach | WAO' };

const VALID_MODES: Mode[] = ['intake', 'priming', 'evidence', 'critic', 'cooldown'];

interface Props {
  searchParams: Promise<{ mode?: string }>;
}

export default async function InnerCoachSessionPage({ searchParams }: Props) {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    redirect('/admin/login?next=%2Finner-coach%2Fsession');
  }

  const { mode: modeParam } = await searchParams;
  const mode = VALID_MODES.includes(modeParam as Mode) ? (modeParam as Mode) : undefined;
  const daily = getOrPickTodaysSession({ mode });
  const config = buildSessionConfig(daily);

  return (
    <main className="min-h-screen px-4 py-10" dir="rtl">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">Inner Coach — חדר שיחה קולי</p>
        </div>

        <InnerCoachSessionRoom
          mode={config.mode}
          personaName={config.personaName}
          situation={config.situation}
          timeCapMin={config.timeCapMin}
          personaId={config.personaId}
          beliefId={config.beliefId}
        />

        <div className="text-center mt-6">
          <a href="/inner-coach" className="text-sm text-[var(--muted)] underline">
            חזרה
          </a>
        </div>
      </div>
    </main>
  );
}
