import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import accessCopy from '@/data/client-access-copy.he.json';
import { ADMIN_COOKIE_NAME, verifyAdminClientFixtureAccess } from '@/lib/admin-auth';
import { resolveConfiguredClientAuthRoot } from '@/lib/client-auth-store';
import { getClientRecoveryContactStatus } from '@/lib/client-recovery-contact';
import { loginAsClientAction, resetClientPinAction } from './action';
import { RecoveryContactControl } from './recovery-contact-control';

export const metadata = { robots: { index: false }, title: 'WAO Client Administration' };

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');
type ClientEntry = { clientId: string; label: string; siteUrl?: string };

function loadClients(root: string): ClientEntry[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const file = path.join(root, d.name, 'client.json');
      if (!fs.existsSync(file)) return null;
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        return { clientId: d.name, label: data.businessNiche || data.siteUrl || d.name, siteUrl: data.siteUrl } as ClientEntry;
      } catch { return null; }
    })
    .filter((client): client is ClientEntry => client !== null)
    .sort((a, b) => a.clientId.localeCompare(b.clientId));
}

export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const jar = await cookies();
  const fixtureRoot = resolveConfiguredClientAuthRoot();
  const authorized = await verifyAdminClientFixtureAccess(jar.get(ADMIN_COOKIE_NAME)?.value ?? '', '/admin/clients', fixtureRoot ?? undefined);
  if (!authorized) redirect('/admin/login?next=%2Fadmin%2Fclients');
  const { error, success } = await searchParams;
  const root = authorized === 'synthetic' ? fixtureRoot! : fixtureRoot ?? CLIENTS_DIR;
  const clients = loadClients(root);
  const copy = accessCopy.admin;
  const message = success === '1' ? copy.success : error === 'reset-failed' ? copy.failure : '';

  return <main className="min-h-screen px-4 py-12" dir="rtl" lang="he"><div className="mx-auto w-full max-w-2xl">
    <div className="mb-8 text-center"><span className="text-3xl font-black" dir="ltr">WAO</span></div>
    <p aria-live="polite" className={`mb-4 min-h-5 text-center text-sm ${success === '1' ? 'text-green-300' : 'text-red-300'}`}>{message}</p>
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">{clients.map(client => {
      const recovery = getClientRecoveryContactStatus(client.clientId, root);
      return <section key={client.clientId} className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold" dir="ltr">{client.clientId}</p><p className="truncate text-xs text-[var(--muted)]">{client.label}</p></div><form action={loginAsClientAction}><input type="hidden" name="clientId" value={client.clientId} /><button type="submit" className="min-h-11 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">WAO</button></form></div>
        <RecoveryContactControl clientId={client.clientId} status={recovery.status} maskedMobile={recovery.status === 'verified' ? recovery.maskedMobile : undefined} verifiedAt={recovery.status === 'verified' ? recovery.verifiedAt : undefined} />
        <details className="border-t border-white/10 pt-4"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{copy.resetOpen}</summary><form action={resetClientPinAction} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="clientId" value={client.clientId} /><div><label htmlFor={`pin-${client.clientId}`} className="mb-1.5 block text-sm font-medium">{copy.pinLabel}</label><input id={`pin-${client.clientId}`} name="pin" type="password" inputMode="numeric" autoComplete="new-password" required className="w-full rounded-lg border border-white/15 bg-white/8 px-4 py-3 text-sm outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" /></div><div><label htmlFor={`confirmation-${client.clientId}`} className="mb-1.5 block text-sm font-medium">{copy.confirmPinLabel}</label><input id={`confirmation-${client.clientId}`} name="confirmation" type="password" inputMode="numeric" autoComplete="new-password" required className="w-full rounded-lg border border-white/15 bg-white/8 px-4 py-3 text-sm outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50" /></div><p className="text-xs leading-5 text-[var(--muted)] sm:col-span-2">{accessCopy.change.policyHint}</p><button type="submit" className="min-h-11 rounded-lg border border-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:col-span-2">{copy.submit}</button></form></details>
      </section>;
    })}</div>
  </div></main>;
}
