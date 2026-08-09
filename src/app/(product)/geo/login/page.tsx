import { adminLoginAction } from './action';

export const metadata = { robots: { index: false }, title: 'כניסת מנהל | WAO' };

export default async function AdminLoginPage({
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
          <p className="text-[var(--muted)] mt-1 text-sm">אזור מנהל</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-xl font-bold mb-1">כניסת מנהל</h1>
          <p className="text-[var(--muted)] text-sm mb-6">
            הזן את הסוד לגישה ללוח הבקרה הכולל
          </p>

          <form action={adminLoginAction} className="space-y-4">
            <input type="hidden" name="next" value={next ?? '/geo/dashboard'} />

            <div>
              <label htmlFor="secret" className="block text-sm font-medium mb-1.5">
                סוד גישה
              </label>
              <input
                id="secret"
                name="secret"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] transition-colors tracking-widest"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">
                סוד גישה שגוי. נסה שוב.
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
