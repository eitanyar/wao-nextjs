import fs   from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { updateLtpcAction } from './action';
import {
  UNIVERSAL_ITEM_IDS,
  BOT_TYPES,
  BOT_SPECIFIC_ITEM_IDS,
  type BotType,
  type LtpcItemId,
  type LtpcRecord,
} from './shared';

export const metadata = { robots: { index: false }, title: 'שער מוכנות (Readiness Gate) | WAO' };

const CLIENTS_DIR   = path.join(process.cwd(), 'data', 'clients');
const PROSPECTS_DIR = path.join(process.cwd(), 'data', 'prospects');

// Hebrew labels — universal items (docs/specs/readiness-gate.md §5.2) and
// bot-specific extras (§5.3). Every item's "pass condition"/"method" is
// summarized here for the staff reading this screen; the full definitions
// live in the spec, not duplicated verbatim here.
const ITEM_LABELS: Record<LtpcItemId, string> = {
  'contact-inventory':       'מלאי מנגנוני יצירת קשר מלא — כל מנגנון לחיץ באתר/בדף הנחיתה החי ממופה למטפל מתועד, אפס שורות "לא מתועד"',
  'delivery-reliability':    'אמינות מסירה מאומתת — sendBeacon/keepalive נורה ואומת שמגיע לשרת בלחיצה אמיתית (לא קריאת קוד)',
  'intake-integrity':        'קליטה מייצרת רשומה אחת נכונה לכל פעולה — לחיצה אחת = שורה אחת ב-Mini-CRM, ללא כפילות/אובדן',
  'no-unauth-exposure':      'אין חשיפת נתונים חוצת-לקוחות ללא הרשאה — כל endpoint דורש אימות ומוגבל ללקוח הנכון',
  'grading-path':            'נתיב הדירוג נגיש ופעיל — ניתן לסמן ליד אמיתי GOOD/JUNK/סגור והשינוי נשמר',
  'downstream-integrations': 'אינטגרציות downstream מאומתות כחיות — קריאה אמיתית/סנדבוקס מוצלחת אחת לכל תלות (למשל העלאת המרות אופליין), לא רק נוכחות בקוד',
  'gclid-capture':           '(רק Ads Bot) לכידת gclid/wbraid/gbraid מאומתת — מה שהופך ליד לניתן-לדירוג עבור Smart Bidding',
  'geo-action-log':          '(רק GEO/Content Bot) לולאת האישור של עמוד הפעולה מייצרת רישום log.jsonl בלתי ניתן לשינוי',
};

const BOT_TYPE_LABELS: Record<BotType, string> = {
  'site-bot':    'Site Bot',
  'geo-bot':     'GEO Bot',
  'content-bot': 'Content Bot',
  'ads-bot':     'Ads Bot',
  'gmb-bot':     'GMB Bot',
};

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-client': 'מזהה לקוח לא תקין.',
  'invalid-bot-type': 'סוג בוט לא תקין.',
  'unknown-client': 'לא נמצאה תיקיית לקוח תואמת תחת data/clients.',
  'missing-evidence': 'כדי לסמן פריט כ״עבר״ יש לתעד עדות קצרה — מה נצפה בפועל.',
  'missing-checked-by': 'כדי לסמן פריט כ״עבר״ יש למלא מי ביצע את הבדיקה (״נבדק על ידי״).',
};

type ClientEntry = { clientId: string; label: string; record: LtpcRecord | null };

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

        const readinessFile = path.join(CLIENTS_DIR, d.name, 'readiness-gate.json');
        let record: LtpcRecord | null = null;
        try {
          record = JSON.parse(fs.readFileSync(readinessFile, 'utf8')) as LtpcRecord;
        } catch {
          record = null;
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

type ProspectEntry = {
  slug: string;
  businessName: string;
  city: string;
  primaryBotRoute?: string;
  secondaryUpsell?: string;
  adsAdmission?: string;
  flagForHumanReview?: boolean;
  generatedAt?: string;
};

/**
 * Phase-1 routing view — read-only. `readiness-gate.mjs` (scripts/) writes
 * these directly; there is no write path from this page (§7: "No
 * route/dashboard is required to *create* data/prospects/").
 */
function loadProspects(): ProspectEntry[] {
  if (!fs.existsSync(PROSPECTS_DIR)) return [];

  return fs.readdirSync(PROSPECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const file = path.join(PROSPECTS_DIR, d.name, 'readiness-gate.json');
      if (!fs.existsSync(file)) return null;
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const entry: ProspectEntry = {
          slug: d.name,
          businessName: data.input?.businessName || d.name,
          city: data.input?.city || '',
          primaryBotRoute: data.routing?.primaryBotRoute,
          secondaryUpsell: data.routing?.secondaryUpsell,
          adsAdmission: data.routing?.adsFit?.admission,
          flagForHumanReview: data.routing?.flagForHumanReview,
          generatedAt: data.generatedAt,
        };
        return entry;
      } catch {
        return null;
      }
    })
    .filter((p): p is ProspectEntry => p !== null)
    .sort((a, b) => (b.generatedAt ?? '').localeCompare(a.generatedAt ?? ''));
}

export default async function ReadinessGatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; clientId?: string; itemId?: string; success?: string }>;
}) {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    redirect('/admin/login?next=%2Fadmin%2Freadiness-gate');
  }

  const { error, clientId: errorClientId, itemId: errorItemId, success } = await searchParams;
  const clients = loadClients();
  const prospects = loadProspects();

  return (
    <main className="min-h-screen px-4 py-12" dir="rtl">
      <div className="w-full max-w-3xl mx-auto">

        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">
            שער מוכנות (Readiness Gate) — ניתוב פרה-סייל ובדיקת מוכנות מעקב לידים
          </p>
          <p className="text-[var(--muted)] mt-1 text-xs">
            שער זה הוא בדיקה גלויה של הצוות ב-v1, לא חסימה ברמת קוד. הבאנר הירוק
            הוא הפעולה הרשמית — אין להפעיל/לחייב לקוח לפני שהוא ירוק (ראה STATUS.md / readiness-gate.md §5.1).
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">
            {ERROR_MESSAGES[error] ?? 'אירעה שגיאה. נסה שוב.'}
            {errorClientId ? ` (לקוח: ${errorClientId})` : ''}
            {errorItemId ? ` (פריט: ${errorItemId})` : ''}
          </p>
        )}

        {success && (
          <p className="text-green-400 text-sm text-center mb-4">
            העדכון נשמר בהצלחה עבור הלקוח {success}.
          </p>
        )}

        {/* ── Phase 1 — read-only prospect routing view ─────────────── */}
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-3">שלב 1 — ציון ניתוב (Phase 1, פרוספקטים)</h2>
          {prospects.length === 0 ? (
            <p className="text-[var(--muted)] text-sm">
              אין עדיין פרוספקטים תחת data/prospects — הרץ <code>node scripts/readiness-gate.mjs</code>.
            </p>
          ) : (
            <div className="space-y-2">
              {prospects.map(p => (
                <div key={p.slug} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.businessName} {p.city ? `— ${p.city}` : ''}</p>
                    <p className="text-[var(--muted)] text-xs truncate">
                      {p.primaryBotRoute ?? '—'}{p.secondaryUpsell ? ` (+${p.secondaryUpsell})` : ''} · Ads: {p.adsAdmission ?? '—'}
                      {p.flagForHumanReview ? ' · ⚠ דורש בדיקת אדם' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Phase 2 — LTPC per-client staff gate ──────────────────── */}
        <h2 className="text-lg font-bold mb-3">שלב 2 — רשימת מוכנות מעקב לידים (LTPC)</h2>

        {clients.length === 0 && (
          <p className="text-[var(--muted)] text-sm text-center">
            לא נמצאו לקוחות ב-data/clients
          </p>
        )}

        <div className="space-y-6">
          {clients.map(client => {
            const currentBotType: BotType = client.record?.botType ?? 'ads-bot';
            const itemsById = new Map((client.record?.items ?? []).map(i => [i.id, i]));
            const allItemIds: LtpcItemId[] = [
              ...UNIVERSAL_ITEM_IDS,
              ...Object.values(BOT_SPECIFIC_ITEM_IDS).flat(),
            ].filter((id, i, arr) => arr.indexOf(id) === i) as LtpcItemId[];

            const overallPass = client.record?.overallPass === true;

            return (
              <div key={client.clientId} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{client.clientId}</p>
                    <p className="text-[var(--muted)] text-xs truncate">{client.label}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      overallPass ? 'bg-green-500/15 text-green-400' : 'bg-white/10 text-[var(--muted)]'
                    }`}
                  >
                    {overallPass ? 'ירוק — ניתן להפעיל/לחייב' : 'לא מוכן עדיין'}
                  </span>
                </div>

                <form action={updateLtpcAction} className="space-y-3">
                  <input type="hidden" name="clientId" value={client.clientId} />

                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-[var(--muted)]">סוג בוט</label>
                    <select
                      name="botType"
                      defaultValue={currentBotType}
                      className="w-full rounded-lg bg-white/8 border border-white/15 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] transition-colors"
                    >
                      {BOT_TYPES.map(bt => (
                        <option key={bt} value={bt}>{BOT_TYPE_LABELS[bt]}</option>
                      ))}
                    </select>
                    <p className="text-[var(--muted)] text-xs mt-1">
                      פריטים המסומנים כ״רק Ads Bot״/״רק GEO/Content Bot״ נשמרים תמיד אך מחושבים
                      בבאנר רק אם הם רלוונטיים לסוג הבוט שנבחר כאן.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-[var(--muted)]">נבדק על ידי (חובה כדי לסמן ״עבר״)</label>
                    <input
                      type="text"
                      name="checkedBy"
                      defaultValue={client.record?.items?.find(i => i.status === 'pass')?.checkedBy ?? ''}
                      placeholder="לדוגמה: איתן"
                      className="w-full rounded-lg bg-white/8 border border-white/15 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] transition-colors"
                    />
                  </div>

                  {allItemIds.map((id) => {
                    const existing = itemsById.get(id);
                    return (
                      <div key={id} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-sm mb-2">{ITEM_LABELS[id]}</p>
                        <div className="flex gap-4 mb-2 text-xs">
                          {(['pass', 'fail', 'not-checked'] as const).map(status => (
                            <label key={status} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`status-${id}`}
                                value={status}
                                defaultChecked={(existing?.status ?? 'not-checked') === status}
                              />
                              {status === 'pass' ? 'עבר' : status === 'fail' ? 'נכשל' : 'לא נבדק'}
                            </label>
                          ))}
                        </div>
                        <textarea
                          name={`evidence-${id}`}
                          defaultValue={existing?.evidence ?? ''}
                          rows={2}
                          placeholder="עדות — מה נצפה בפועל (חובה אם מסומן ״עבר״)"
                          className="w-full rounded-lg bg-white/8 border border-white/15 px-3 py-2 text-xs outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        {existing?.checkedAt && (
                          <p className="text-[var(--muted)] text-[10px] mt-1">
                            נבדק לאחרונה: {existing.checkedBy} · {new Date(existing.checkedAt).toLocaleString('he-IL')}
                          </p>
                        )}
                      </div>
                    );
                  })}

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
