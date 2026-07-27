import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import TrainerSessionRoom from './session-room';
import { DANNY_PERSONA } from '@/lib/trainer/persona';
import { getTrainerEngine } from '@/lib/trainer/engine';

export const metadata = { robots: { index: false }, title: 'מאמן ניסוח ו-EQ | WAO' };

export default async function TrainerPage() {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    redirect('/admin/login?next=%2Ftrainer');
  }

  const engine = getTrainerEngine();

  return (
    <main className="min-h-screen px-4 py-10" dir="rtl">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">מאמן ניסוח ו-EQ — חדר תרגול קולי</p>
        </div>

        <TrainerSessionRoom
          engine={engine}
          personaName={DANNY_PERSONA.name}
          situation={DANNY_PERSONA.situation}
          timeCapMin={DANNY_PERSONA.timeCapMin}
        />
      </div>
    </main>
  );
}
