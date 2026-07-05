import { loginAction } from './action';

export const metadata = { robots: { index: false }, title: 'כניסה | WAO לקוחות' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; next?: string; error?: string }>;
}) {
  const { c: clientId, next, error } = await searchParams;

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      dir="rtl"
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">פורטל לקוחות</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-xl font-bold mb-1">כניסה לאזור האישי</h1>
          <p className="text-[var(--muted)] text-sm mb-6">
            הזן את קוד הגישה שקיבלת מ-WAO
          </p>

          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={next ?? '/client/dashboard'} />

            {/* clientId — prefilled from URL param, hidden if present */}
            {clientId ? (
              <input type="hidden" name="clientId" value={clientId} />
            ) : (
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium mb-1.5">
                  מזהה לקוח
                </label>
                <input
                  id="clientId"
                  name="clientId"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="retter"
                  className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            )}

            <div>
              <label htmlFor="pin" className="block text-sm font-medium mb-1.5">
                קוד גישה
              </label>
              <input
                id="pin"
                name="pin"
                type="password"
                autoComplete="current-password"
                inputMode="numeric"
                required
                placeholder="••••"
                className="w-full rounded-lg bg-white/8 border border-white/15 px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] transition-colors tracking-widest"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">
                קוד גישה שגוי. נסה שוב או פנה ל-WAO.
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

        <p className="text-center text-[var(--muted)] text-xs mt-6">
          בעיות גישה?{' '}
          <a href="https://wa.me/972524095060" className="underline hover:text-white transition-colors">
            כתוב לנו בוואטסאפ
          </a>
        </p>

      </div>
    </main>
  );
}
