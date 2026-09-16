import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import accessCopy from '@/data/client-access-copy.he.json';
import { COOKIE_NAME, verifyClientSession } from '@/lib/client-auth';
import { ChangePinForm } from './change-pin-form';

export const metadata = { robots: { index: false }, title: 'WAO Client Access PIN' };

export default async function ChangeClientPinPage() {
  const jar = await cookies();
  const session = await verifyClientSession(jar.get(COOKIE_NAME)?.value ?? '', { scopes: ['full', 'change-pin'] });
  if (!session) redirect('/client/login');
  const forcedChange = session.scope === 'change-pin';
  const copy = accessCopy.change;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8" dir="rtl" lang="he">
      <section className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <div className="mb-6 text-center"><span className="text-3xl font-black" dir="ltr">WAO</span></div>
        <h1 className="mb-2 text-xl font-bold">{forcedChange ? copy.forcedTitle : copy.ownerTitle}</h1>
        <p className="mb-6 text-sm leading-6 text-[var(--muted)]">{forcedChange ? copy.forcedIntro : copy.ownerIntro}</p>
        <ChangePinForm copy={copy} showCurrentPin={!forcedChange} />
      </section>
    </main>
  );
}
