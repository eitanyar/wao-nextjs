import { masterAdminLoginAction } from './action';

export const metadata = { robots: { index: false }, title: 'כניסת מנהל-על | WAO' };

export default async function MasterAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      dir="rtl"
    >
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">אזור מנהל-על</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-xl font-bold mb-1">כניסת מנהל-על</h1>
          <p className="text-[var(--muted)] text-sm mb-6">
            גישה לכל לוחות הבקרה של הלקוחות
          </p>

          <form action={masterAdminLoginAction} className="space-y-4">
            <input type="hidden" name="next" value={next ?? '/admin/clients'} />

            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5">
                שם משתמש
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="eitan"
                className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                סיסמה
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] transition-colors tracking-widest"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">
                שם משתמש או סיסמה שגויים. נסה שוב.
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--accent)] text-white font-semibold py-2.5 text-sm hover:opacity-90 transition-opacity mt-2"
            >
              כניסה
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
