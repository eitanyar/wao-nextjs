import fs   from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { assessLiveReadiness } from '@/lib/google-ads/live-readiness';
import { updateLiveReadinessAction } from './action';
import { READINESS_KEYS, type ReadinessKey, type LiveReadinessRecord } from './shared';

export const metadata = { robots: { index: false }, title: 'מוכנות להפעלה חיה | WAO' };

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

// Hebrew labels for every requirement `assessLiveReadiness()` can report,
// including the read-only `managerCredentialsConfigured` one (env-driven,
// not staff-writable) so the verdict panel below is fully legible.
const REQUIREMENT_LABELS: Record<string, string> = {
  managerCredentialsConfigured: 'פרטי OAuth ו-MCC של מנהל WAO מוגדרים בסביבה (לא ניתן לעריכה כאן)',
  clientAccountOwned: 'אומת חשבון Google Ads בבעלות הלקוח',
  clientBillingAccepted: 'פרופיל חיוב בבעלות הלקוח ואישור תנאי החיוב של Google',
  mccInvitationAccepted: 'אושרה הזמנת מנהל ה-MCC של WAO',
  approvalContactConfirmed: 'אומת איש קשר מאשר מטעם הלקוח',
  liveConsentRecorded: 'תועדה הסכמה מפורשת של הלקוח לפיילוט חי',
  auditLogEnabled: 'מופעל יומן ביקורת/אישורים בלתי ניתן לשינוי',
};

type ClientEntry = {
  clientId: string;
  label: string;
  record: LiveReadinessRecord;
};

function loadClients(): ClientEntry[] {
  if (!fs.existsSync(CLIENTS_DIR)) return [];

  return fs.readdirSync(CLIENTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const clientFile = path.join(CLIENTS_DIR, d.name, 'client.json');
      if (!fs.existsSync(clientFile)) return null;
      try {
        const data = JSON.parse(fs.readFileSync(clientFile, 'utf8'));
        const label: string = data.businessNiche || data.siteUrl || d.name;

        const readinessFile = path.join(CLIENTS_DIR, d.name, 'live-readiness.json');
        let record: LiveReadinessRecord = {};
        try {
          record = JSON.parse(fs.readFileSync(readinessFile, 'utf8'));
        } catch {
          record = {};
        }

        const entry: ClientEntry = { clientId: d.name, label, record };
        return entry;
      } catch {
        return null;
      }
    })
    .filter((c): c is ClientEntry => c !== null)
    .sort((a, b) => a.clientId.localeCompare(b.clientId));
}

// Read-only display inputs for assessLiveReadiness — this page never writes
// GOOGLE_ADS_ENABLE_LIVE_MODE or any live-execution flag (spec §1.2). It
// only reads env vars here to show staff the same verdict the client-facing
// GET /api/google-ads/live-readiness route computes.
function managerCredentialsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN &&
    process.env.GOOGLE_ADS_MCC_CUSTOMER_ID
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-client': 'מזהה לקוח לא תקין.',
  'unknown-client': 'לא נמצאה תיקיית לקוח תואמת תחת data/clients.',
  'missing-consent-evidence':
    'כדי לסמן ״תועדה הסכמה מפורשת לפיילוט חי״ יש לפרט הערת אימות — מי אישר, מתי ובאיזה ערוץ.',
};

export default async function LiveReadinessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; clientId?: string; success?: string }>;
}) {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    redirect('/admin/login?next=%2Fadmin%2Flive-readiness');
  }

  const { error, clientId: errorClientId, success } = await searchParams;
  const clients = loadClients();
  const liveModeEnabled = process.env.GOOGLE_ADS_ENABLE_LIVE_MODE === 'true';

  return (
    <main className="min-h-screen px-4 py-12" dir="rtl">
      <div className="w-full max-w-3xl mx-auto">

        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">
            מוכנות להפעלה חיה — תיעוד אישורים לפיילוט Google Ads חי
          </p>
          <p className="text-[var(--muted)] mt-1 text-xs">
            מסך זה מתעד אישורים בלבד. הוא לא מפעיל מצב חי ולא מבצע פעולות בפועל בחשבונות פרסום.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">
            {ERROR_MESSAGES[error] ?? 'אירעה שגיאה. נסה שוב.'}
            {errorClientId ? ` (לקוח: ${errorClientId})` : ''}
          </p>
        )}

        {success && (
          <p className="text-green-400 text-sm text-center mb-4">
            העדכון נשמר בהצלחה עבור הלקוח {success}.
          </p>
        )}

        {clients.length === 0 && (
          <p className="text-[var(--muted)] text-sm text-center">
            לא נמצאו לקוחות ב-data/clients
          </p>
        )}

        <div className="space-y-6">
          {clients.map(client => {
            const verdict = assessLiveReadiness({
              clientId: client.clientId,
              record: client.record,
              managerCredentialsConfigured: managerCredentialsConfigured(),
              liveModeEnabled,
            });

            return (
              <div
                key={client.clientId}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{client.clientId}</p>
                    <p className="text-[var(--muted)] text-xs truncate">{client.label}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      verdict.eligibleForPilot
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-white/10 text-[var(--muted)]'
                    }`}
                  >
                    {verdict.eligibleForPilot ? 'מוכן לפיילוט' : 'לא מוכן עדיין'}
                  </span>
                </div>

                <p className="text-[var(--muted)] text-xs mb-4">{verdict.nextAction}</p>

                <form action={updateLiveReadinessAction} className="space-y-3">
                  <input type="hidden" name="clientId" value={client.clientId} />

                  {READINESS_KEYS.map((key: ReadinessKey) => (
                    <label
                      key={key}
                      className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name={key}
                        defaultChecked={client.record[key] === true}
                        className="mt-1 shrink-0"
                      />
                      <span className="text-sm">{REQUIREMENT_LABELS[key]}</span>
                    </label>
                  ))}

                  <div>
                    <label
                      htmlFor={`liveConsentEvidence-${client.clientId}`}
                      className="block text-xs font-medium mb-1.5 text-[var(--muted)]"
                    >
                      הערת אימות הסכמה (חובה כדי לסמן ״תועדה הסכמה מפורשת לפיילוט חי״) — מי אישר, מתי ובאיזה ערוץ
                    </label>
                    <textarea
                      id={`liveConsentEvidence-${client.clientId}`}
                      name="liveConsentEvidence"
                      defaultValue={client.record.liveConsentEvidence ?? ''}
                      rows={2}
                      placeholder='לדוגמה: הבעלים דנה אישרה בטופס הסכמה בקליטה, 20/07/2026'
                      className="w-full rounded-lg bg-white/8 border border-white/15 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] transition-colors"
                    />
                  </div>

                  <div className="text-[var(--muted)] text-xs">
                    {verdict.requirements
                      .filter(r => r.key === 'managerCredentialsConfigured')
                      .map(r => (
                        <p key={r.key}>
                          {r.complete ? '✓' : '✗'} {REQUIREMENT_LABELS[r.key]}
                        </p>
                      ))}
                    <p className="mt-1">
                      מצב חי בפועל (GOOGLE_ADS_ENABLE_LIVE_MODE): {liveModeEnabled ? 'מופעל' : 'כבוי'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[var(--accent)] text-white font-semibold py-2.5 text-sm hover:opacity-90 transition-opacity"
                  >
                    שמירת עדכון
                  </button>
                </form>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
