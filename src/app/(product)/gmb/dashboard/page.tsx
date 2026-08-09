import type { Metadata } from 'next';
import SendButton from '@/components/geo/SendButton';
import { listGmbClients, loadClient } from '@/lib/shared/clients';
import { getConnection, getQueue } from '@/lib/gmb/store';
import { getNapScan, getCompletenessScore } from '@/lib/gmb/store';
import { buildGmbApprovalLink } from '@/lib/gmb/whatsapp';

// Tokenized staff-only surface — never indexed. Same posture as /geo/dashboard
// (which has no explicit metadata export today; added here for parity going forward).
export const metadata: Metadata = {
  robots: { index: false },
};

const TYPE_LABELS: Record<string, string> = {
  review_reply: 'תגובה לביקורת',
  post:         'פוסט',
};

const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-yellow-500/20 text-yellow-400',
  'approved-edited': 'bg-blue-500/20 text-blue-400',
  'approved-as-is':  'bg-blue-500/20 text-blue-400',
  posted:           'bg-green-500/20 text-green-400',
  rejected:         'bg-red-500/20 text-red-400',
};

/**
 * GMB Bot's WoZ dashboard — the second real case against the shared pattern
 * established by /geo/dashboard (data/clients/{clientId} per-client loop,
 * SendButton reused as-is since it's already bot-agnostic waLink/label/disabled).
 * Kept as a dedicated route (not literally the same React component as GEO's)
 * because the two bots' item shapes genuinely differ enough that a single
 * generic `<BotDashboard botType=.../>` would need per-item-type render
 * branches identical to just... having two thin page components share the
 * primitives. See the design-pass note in the PR/handoff summary for the
 * full reasoning on what generalized vs. what needed a per-bot adapter.
 */
export default async function GmbDashboard() {
  const clientIds = listGmbClients();

  return (
    <main className="min-h-screen px-4 py-10 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">GMB Dashboard</h1>
      <p className="text-[var(--muted)] mb-8 text-sm">
        טיוטות תגובה לביקורות ופוסטים — ממתינות לאישור לקוח
      </p>

      {clientIds.length === 0 && (
        <p className="text-[var(--muted)]">אין לקוחות עם הרשאת GMB עדיין.</p>
      )}

      {clientIds.map(clientId => {
        const client = loadClient(clientId);
        if (!client) return null;
        const conn    = getConnection(clientId);
        const queue   = getQueue(clientId);
        const pending = queue.filter(i => i.status === 'pending');
        const nap     = getNapScan(clientId);
        const score   = getCompletenessScore(clientId);
        const hasPhone = !!client.approvalWhatsapp;

        return (
          <section key={clientId} className="mb-12">
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-lg font-semibold">{client.siteUrl}</h2>
                <p className="text-[var(--muted)] text-sm">{client.businessNiche}</p>
              </div>
              <div className="text-left text-sm text-[var(--muted)]">
                <div>{pending.length} ממתינים לאישור</div>
                <div>{conn?.connected ? `מחובר · ${conn.locationId}` : 'לא מחובר ל-GBP'}</div>
              </div>
            </div>

            {!conn?.connected && (
              <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                ⚠️ הלקוח עדיין לא מחובר ל-Google Business Profile — יש להשלים חיבור לפני משיכת ביקורות.
              </div>
            )}

            {!hasPhone && (
              <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                ⚠️ מספר וואטסאפ חסר ל{client.approvalContact || 'איש הקשר'} —
                עדכן ב-<code className="text-xs">data/clients/{clientId}/client.json</code>
              </div>
            )}

            {/* Read-only diagnostics — automated, no approval needed (spec §1) */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-sm font-medium mb-1">בדיקת עקביות NAP</div>
                {nap ? (
                  <div className="text-xs text-[var(--muted)]">
                    {nap.discrepancies.length === 0
                      ? '✓ עקבי בכל המקורות'
                      : `⚠️ ${nap.discrepancies.length} אי-התאמות`}
                    {' · '}נבדק לאחרונה {new Date(nap.lastScanAt).toLocaleDateString('he-IL')}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--muted)]">טרם נבדק</div>
                )}
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-sm font-medium mb-1">ציון שלמות פרופיל</div>
                {score ? (
                  <div className="text-xs text-[var(--muted)]">
                    {score.score}/100
                    {score.missingFields.length > 0 && ` · חסר: ${score.missingFields.join(', ')}`}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--muted)]">טרם חושב</div>
                )}
              </div>
            </div>

            {/* Pending queue — every item here is a live public GBP write, approved per-item, no bulk-approve (spec §2) */}
            {pending.length > 0 && (
              <div className="space-y-3">
                {pending.map((item, i) => {
                  const waLink = buildGmbApprovalLink({
                    contactName:  client.approvalContact || 'שלום',
                    contactPhone: client.approvalWhatsapp || '',
                    itemId:       item.itemId,
                    type:         item.type,
                    draftPreview: item.draftText.slice(0, 100),
                    reviewerName: item.reviewContext?.reviewerName,
                    rating:       item.reviewContext?.rating,
                    batchIndex:   i + 1,
                    batchTotal:   pending.length,
                  });

                  return (
                    <div key={item.itemId} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">{TYPE_LABELS[item.type] ?? item.type}</span>
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                              {item.status}
                            </span>
                          </div>
                          {item.reviewContext && (
                            <div className="text-xs text-[var(--muted)] mb-1">
                              ביקורת מ־{item.reviewContext.reviewerName} ({item.reviewContext.rating}⭐)
                            </div>
                          )}
                          <div className="text-xs text-[var(--muted)]/70">{item.draftText}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <SendButton
                            waLink={waLink}
                            label={`שלח ל${client.approvalContact || 'לקוח'}`}
                            disabled={!hasPhone}
                          />
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
