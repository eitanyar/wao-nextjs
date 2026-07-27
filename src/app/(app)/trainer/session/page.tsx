import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import TrainerSessionRoom from '../session-room';
import { DANNY_PERSONA } from '@/lib/trainer/persona';
import { getTrainerEngine } from '@/lib/trainer/engine';
import { loadGeneratedSession } from '@/lib/trainer/coach';

export const metadata = { robots: { index: false }, title: 'תרגול חי | מאמן ניסוח ו-EQ | WAO' };

interface Props {
  searchParams: Promise<{ generatedId?: string }>;
}

export default async function TrainerSessionPage({ searchParams }: Props) {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    redirect('/admin/login?next=%2Ftrainer%2Fsession');
  }

  const engine = getTrainerEngine();
  const { generatedId } = await searchParams;
  const generated = generatedId ? loadGeneratedSession(generatedId) : null;
  const persona = generated?.persona ?? DANNY_PERSONA;
  const level = generated?.level ?? 2;

  return (
    <main className="min-h-screen px-4 py-10" dir="rtl">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">מאמן ניסוח ו-EQ — חדר תרגול קולי</p>
        </div>

        <TrainerSessionRoom
          engine={engine}
          personaName={persona.name}
          situation={persona.situation}
          timeCapMin={persona.timeCapMin}
          personaId={persona.id}
          generatedId={generated ? generatedId : undefined}
          level={level}
        />

        <div className="text-center mt-6">
          <a href="/trainer" className="text-sm text-[var(--muted)] underline">
            חזרה ללוח ההתקדמות
          </a>
        </div>
      </div>
    </main>
  );
}
