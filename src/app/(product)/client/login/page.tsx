import accessCopy from '@/data/client-access-copy.he.json';
import { LoginForm } from './login-form';

export const metadata = { robots: { index: false }, title: 'WAO Client Portal' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; next?: string }>;
}) {
  const { c: clientId, next } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8" dir="rtl" lang="he">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight" dir="ltr">WAO</span>
        </div>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <h1 className="text-xl font-bold mb-2">{accessCopy.login.title}</h1>
          <p className="text-[var(--muted)] text-sm leading-6 mb-6">{accessCopy.login.intro}</p>
          <LoginForm copy={accessCopy.login} clientId={clientId} next={next} />
        </section>
      </div>
    </main>
  );
}
