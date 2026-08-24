import type { Metadata } from 'next';
import SendButton from '@/components/geo/SendButton';
import { listClients, loadClient } from '@/lib/shared/clients';
import { getReviewFlywheelQueue } from '@/lib/crm/reviewFlywheelStore';
import { getReviewResponderQueue } from '@/lib/gbp/reviewResponderStore';
import ReviewResponderPanel from '@/components/gbp/ReviewResponderPanel';

// Tokenized staff-only surface — never indexed. Same posture as /gmb/dashboard
// and /geo/dashboard (open-but-unindexed, no auth at this path tier).
export const metadata: Metadata = {
  robots: { index: false },
};

/**
 * Review-generation flywheel — read-only dashboard surface.
 * Second real case against the shared per-client-loop pattern established by
 * /geo/dashboard and /gmb/dashboard (data/clients/{clientId} loop via
 * listClients()/loadClient(), SendButton reused as-is since it's bot-agnostic
 * waLink/label/disabled). No write actions here — marking a queue item as
 * "sent"/"done" is out of scope (no status field exists on
 * ReviewFlywheelQueueItem today; see handoff/completed/2026-08-22_007_*.md).
 */
export default async function ReviewFlywheelDashboard() {
  const clientIds = listClients().filter(id => !!loadClient(id)?.reviewFlywheelEnabled);

  return (
    <main className="min-h-screen px-4 py-10 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">Review Flywheel — לוח בקשות ביקורת</h1>
      <p className="text-[var(--muted)] mb-8 text-sm">
        קישורי וואטסאפ לבקשת ביקורת שנוצרו אוטומטית מלידים סגורים
      </p>

      {clientIds.length === 0 && (
        <p className="text-[var(--muted)]">אין לקוחות עם Review Flywheel פעיל עדיין.</p>
      )}

      {clientIds.map(clientId => {
        const client = loadClient(clientId);
        if (!client) return null;
        const queue = getReviewFlywheelQueue(clientId);

        return (
          <section key={clientId} className="mb-12">
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-lg font-semibold">{client.brandName || client.siteUrl}</h2>
                <p className="text-[var(--muted)] text-sm">{client.businessNiche}</p>
              </div>
              <div className="text-left text-sm text-[var(--muted)]">
                <div>{queue.length} בקשות ביקורת</div>
              </div>
            </div>

            {queue.length === 0 ? (
              <p className="text-[var(--muted)] text-sm">אין בקשות ביקורת ממתינות.</p>
            ) : (
              <div className="space-y-3">
                {queue.map((item, i) => (
                  <div
                    key={`${item.leadId}-${i}`}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-1">ליד #{item.leadId}</div>
                        <div className="text-xs text-[var(--muted)]">
                          נוצר {new Date(item.generatedAt).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <SendButton waLink={item.waLink} label="שלח בקשת ביקורת" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(() => {
              const responderQueue = getReviewResponderQueue(clientId);
              if (responderQueue.length === 0) return null;
              return (
                <div className="mt-8">
                  <h3 className="text-base font-semibold mb-3">
                    ביקורות שליליות — טיוטות תגובה
                  </h3>
                  <div className="space-y-3">
                    {responderQueue.map((item) => (
                      <ReviewResponderPanel key={item.reviewId} item={item} />
                    ))}
                  </div>
                </div>
              );
            })()}
          </section>
        );
      })}
    </main>
  );
}
