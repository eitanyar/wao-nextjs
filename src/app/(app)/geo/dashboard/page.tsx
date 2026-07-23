import fs   from 'fs';
import path from 'path';
import SendButton from '@/components/geo/SendButton';
import { buildApprovalLink } from '@/lib/geo/whatsapp';
import { buildAllClientDigests } from '@/lib/google-ads/weekly-digest-batch';
import { buildWeeklyDigestWhatsAppLink } from '@/lib/google-ads/whatsapp-digest';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClientData {
  clientId:         string;
  siteUrl:          string;
  businessNiche:    string;
  approvalContact:  string;
  approvalWhatsapp: string;
}

interface ActionFile {
  actionId:           string;
  rank:               number;
  query:              string;
  rankingUrl:         string;
  implementationMode: string;
  actionType:         string;
  priority:           'HIGH' | 'MEDIUM' | 'LOW';
  impressions:        number;
  score:              number;
  status:             string;
  generatedAt:        string;
  content: {
    placementInstruction: string;
    noaChanges:           string | null;
  };
}

// ── Data loading ──────────────────────────────────────────────────────────────
function loadClient(clientId: string): ClientData | null {
  const file = path.join(process.cwd(), 'data', 'clients', clientId, 'client.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadActions(clientId: string): ActionFile[] {
  const dir = path.join(process.cwd(), 'data', 'clients', clientId, 'tasks', 'geo');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as ActionFile)
    .sort((a, b) => a.rank - b.rank);
}

function listClients(): string[] {
  const dir = path.join(process.cwd(), 'data', 'clients');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(d =>
    fs.statSync(path.join(dir, d)).isDirectory()
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   'bg-red-500/20 text-red-400',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400',
  LOW:    'bg-green-500/20 text-green-400',
};

const ACTION_LABELS: Record<string, string> = {
  faq_block:      'FAQ',
  definition_box: 'הגדרה',
  table:          'טבלה',
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function GeoDashboard() {
  const clients = listClients();
  const adsDigests = await buildAllClientDigests();

  return (
    <main className="min-h-screen px-4 py-10 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">GEO Dashboard</h1>
      <p className="text-[var(--muted)] mb-8 text-sm">
        פעולות מוכנות לשליחה לאישור לקוח
      </p>

      {clients.length === 0 && (
        <p className="text-[var(--muted)]">אין לקוחות עדיין.</p>
      )}

      {clients.map(clientId => {
        const client  = loadClient(clientId);
        if (!client) return null;
        const actions = loadActions(clientId);
        const adsResult = adsDigests.find((d) => d.clientId === clientId);

        const hasPhone   = !!client.approvalWhatsapp;
        const totalScore = actions.reduce((s, a) => s + a.score, 0);

        return (
          <section key={clientId} className="mb-12">
            {/* Client header */}
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-lg font-semibold">{client.siteUrl}</h2>
                <p className="text-[var(--muted)] text-sm">{client.businessNiche}</p>
              </div>
              <div className="text-left text-sm text-[var(--muted)]">
                <div>{actions.length} פעולות מוכנות</div>
                <div>ציון Pareto כולל: {totalScore.toLocaleString('he-IL')}</div>
              </div>
            </div>

            {!hasPhone && (
              <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                ⚠️ מספר וואטסאפ חסר ל{client.approvalContact || 'איש הקשר'} —
                עדכן ב-<code className="text-xs">data/geo-logs/{clientId}/client.json</code>
              </div>
            )}

            {/* Google Ads Weekly Digest Section */}
            {adsResult?.status === 'ok' && adsResult.campaign && adsResult.digest && (
              <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                  <div>
                    <span className="font-medium">Google Ads — סיכום שבועי</span>
                    <span className="text-xs text-[var(--muted)] mr-2">
                      {adsResult.digest.totals.leads} לידים · {adsResult.digest.alerts.length} התראות · תקציב: {adsResult.digest.pacing.status}
                    </span>
                  </div>
                  <SendButton
                    waLink={buildWeeklyDigestWhatsAppLink({
                      contactPhone: client.approvalWhatsapp,
                      contactName: client.approvalContact || 'שלום',
                      campaignName: adsResult.campaign.businessName || adsResult.campaign.slug,
                      digest: adsResult.digest,
                    })}
                    label={`שלח סיכום ל${client.approvalContact || 'לקוח'}`}
                    disabled={!hasPhone}
                  />
                </div>
              </div>
            )}

            {/* Actions list */}
            {actions.length > 0 && (
              <div className="space-y-3">
                {actions.map((action, i) => {
                  const pageSlug = decodeURIComponent(action.rankingUrl.replace(client.siteUrl.replace(/\/$/, ''), '') || '/');
                  const waLink   = buildApprovalLink({
                    contactName:  client.approvalContact || 'שלום',
                    contactPhone: client.approvalWhatsapp,
                    actionId:     action.actionId,
                    query:        action.query,
                    rankingUrl:   action.rankingUrl,
                    actionType:   action.actionType,
                    priority:     action.priority,
                    impressions:  action.impressions,
                    batchIndex:   i + 1,
                    batchTotal:   actions.length,
                  });

                  return (
                    <div
                      key={action.actionId}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        {/* Left: info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">{action.query}</span>
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[action.priority]}`}>
                              {action.priority}
                            </span>
                            <span className="rounded bg-[var(--elevated)] px-2 py-0.5 text-xs text-[var(--muted)]">
                              {ACTION_LABELS[action.actionType] ?? action.actionType}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--muted)] space-y-0.5">
                            <div dir="ltr" className="font-mono">{pageSlug}</div>
                            <div>{action.impressions.toLocaleString('he-IL')} חשיפות · ציון {action.score.toLocaleString('he-IL')}</div>
                            <div className="text-[var(--muted)]/70">{action.content.placementInstruction}</div>
                          </div>
                        </div>

                        {/* Right: action */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <SendButton
                            waLink={waLink}
                            label={`שלח ל${client.approvalContact || 'לקוח'}`}
                            disabled={!hasPhone}
                          />
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            action.status === 'generated'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-[var(--elevated)] text-[var(--muted)]'
                          }`}>
                            {action.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
