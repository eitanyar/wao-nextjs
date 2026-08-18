import fs   from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import SendButton from '@/components/geo/SendButton';
import ApproveControl from '@/components/geo/ApproveControl';
import BatchApproveButton from '@/components/geo/BatchApproveButton';
import EditQAPanel from '@/components/geo/EditQAPanel';
import CriticPanel from '@/components/geo/CriticPanel';
import { buildApprovalLink } from '@/lib/geo/whatsapp';
import { buildAllClientDigests } from '@/lib/google-ads/weekly-digest-batch';
import { buildWeeklyDigestWhatsAppLink } from '@/lib/google-ads/whatsapp-digest';

export const metadata = { robots: { index: false } };

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
  shipDecision?:      'autoship' | 'review';
  cannibalFlag?:      'REVIEW';
  approvedBy?:        string;
  approvedAt?:        string;
  criticResult?: {
    distinctive:   boolean;
    flags:         string[];
    reasons:       string[];
    citationNote:  string;
    checkedAt:     string;
    flagsActedOn?: boolean;
  };
  content: {
    placementInstruction: string;
    noaChanges:           string | null;
    groundingRisk?:       'low' | 'medium' | 'high';
  };
}

// Flag-driven triage (review queue, 2026-08-17): an action is "clean" only
// if every static gate cleared — matches batchApproveClean's own criteria
// in src/lib/geo/actions.ts exactly, so the badge shown here never lies
// about what the batch-approve button will actually approve.
function isClean(action: ActionFile): boolean {
  return action.shipDecision === 'autoship' && !action.cannibalFlag && (action.content.groundingRisk ?? 'low') === 'low';
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
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    redirect('/admin/login?next=/geo/dashboard');
  }

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
                {/* §8.5 — display-only blended roll-up across every enumerated campaign, shown
                    alongside (never instead of) the per-campaign digest above. Never a gating
                    input; labeled explicitly as a roll-up, not a health metric. */}
                {adsResult.digests && adsResult.digests.length > 1 && adsResult.blended && (
                  <p className="text-xs text-[var(--muted)]">
                    סה״כ {adsResult.digests.length} קמפיינים פעילים ·{' '}
                    {adsResult.blended.cpl !== undefined
                      ? `₪${adsResult.blended.cpl.toFixed(2)}/ליד (ראה פילוח לפי קמפיין)`
                      : 'אין המרות בחלון הנוכחי'}
                  </p>
                )}
              </div>
            )}

            {/* Actions list — flagged-first triage, per Lior's review-queue speed requirement */}
            {actions.length > 0 && (
              <div className="space-y-3">
                {(() => {
                  const cleanCount = actions.filter(a => !a.approvedBy && isClean(a)).length;
                  return cleanCount > 0 ? (
                    <BatchApproveButton clientId={clientId} cleanCount={cleanCount} />
                  ) : null;
                })()}
                {[...actions]
                  .sort((a, b) => {
                    // Flagged (not clean, not yet approved) first — that's the whole point of
                    // flag-driven triage: the reviewer's eye goes to what needs a human judgment
                    // call, not what a checkbox will clear for them anyway.
                    const aNeedsEyes = !a.approvedBy && !isClean(a);
                    const bNeedsEyes = !b.approvedBy && !isClean(b);
                    if (aNeedsEyes !== bNeedsEyes) return aNeedsEyes ? -1 : 1;
                    return a.rank - b.rank;
                  })
                  .map((action) => {
                  // Stable rank-based index for the client-facing "X of Y" WhatsApp message —
                  // must NOT track the triage-sorted display order above.
                  const rankIndex = actions.findIndex(a => a.actionId === action.actionId);
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
                    batchIndex:   rankIndex + 1,
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
                            {isClean(action) ? (
                              <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">✓ נקי</span>
                            ) : (
                              <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs text-orange-400">
                                ⚑ {action.cannibalFlag ? 'קניבליזציה' : (action.content.groundingRisk === 'high' ? 'סיכון עובדתי' : 'לבדיקה')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--muted)] space-y-0.5">
                            <div dir="ltr" className="font-mono">{pageSlug}</div>
                            <div>{action.impressions.toLocaleString('he-IL')} חשיפות · ציון {action.score.toLocaleString('he-IL')}</div>
                            <div className="text-[var(--muted)]/70">{action.content.placementInstruction}</div>
                          </div>
                        </div>

                        {/* Right: action — review gate must clear before Send unlocks */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {action.approvedBy ? (
                            <>
                              <SendButton
                                waLink={waLink}
                                label={`שלח ל${client.approvalContact || 'לקוח'}`}
                                disabled={!hasPhone}
                              />
                              <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)]">
                                ✓ אושר ע״י {action.approvedBy}
                              </span>
                            </>
                          ) : (
                            <>
                              <SendButton waLink={waLink} label="ממתין לאישור" disabled />
                              <ApproveControl actionId={action.actionId} />
                            </>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            action.status === 'generated'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-[var(--elevated)] text-[var(--muted)]'
                          }`}>
                            {action.status}
                          </span>
                        </div>
                      </div>
                      <EditQAPanel actionId={action.actionId} actionType={action.actionType} />
                      {!isClean(action) && (
                        <CriticPanel actionId={action.actionId} initialResult={action.criticResult} />
                      )}
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
