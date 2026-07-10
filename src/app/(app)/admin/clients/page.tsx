import fs   from 'fs';
import path from 'path';
import { loginAsClientAction } from './action';

export const metadata = { robots: { index: false }, title: 'בחירת לקוח | WAO' };

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

type ClientEntry = {
  clientId: string;
  label: string;
  siteUrl?: string;
};

function loadClients(): ClientEntry[] {
  if (!fs.existsSync(CLIENTS_DIR)) return [];

  return fs.readdirSync(CLIENTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const file = path.join(CLIENTS_DIR, d.name, 'client.json');
      if (!fs.existsSync(file)) return null;
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const label: string = data.businessNiche || data.siteUrl || d.name;
        const entry: ClientEntry = { clientId: d.name, label, siteUrl: data.siteUrl };
        return entry;
      } catch {
        return null;
      }
    })
    .filter((c): c is ClientEntry => c !== null)
    .sort((a, b) => a.clientId.localeCompare(b.clientId));
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const clients = loadClients();

  return (
    <main className="min-h-screen px-4 py-12" dir="rtl">
      <div className="w-full max-w-xl mx-auto">

        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">
            אזור מנהל-על — כניסה בשם כל לקוח
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">
            לקוח לא נמצא. נסה שוב.
          </p>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          {clients.length === 0 && (
            <p className="text-[var(--muted)] text-sm text-center">
              לא נמצאו לקוחות ב-data/clients
            </p>
          )}

          {clients.map(client => (
            <form
              key={client.clientId}
              action={loginAsClientAction}
              className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
            >
              <input type="hidden" name="clientId" value={client.clientId} />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{client.clientId}</p>
                <p className="text-[var(--muted)] text-xs truncate">{client.label}</p>
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-[var(--accent)] text-white font-semibold py-2 px-4 text-sm hover:opacity-90 transition-opacity"
              >
                כניסה כלקוח
              </button>
            </form>
          ))}
        </div>

      </div>
    </main>
  );
}
