import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { findQueueItemById, getQueue } from '@/lib/gmb/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import CopyAnnouncer from '@/components/geo/CopyAnnouncer';
import StatusBar     from '@/components/geo/StatusBar';
import ActionHeader  from '@/components/geo/ActionHeader';
import ApproveEditBar from '@/components/gmb/ApproveEditBar';

// Tokenized client URL — never indexed. Same as /geo/action/[actionId].
export const metadata: Metadata = {
  robots: { index: false },
};

const TYPE_LABELS: Record<string, string> = {
  review_reply: 'תגובה לביקורת',
  post:         'פוסט לפרופיל Google Business',
};

/**
 * GMB Bot's action page — the second real case against the shared pattern
 * established by /geo/action/[actionId]: same ownership-check + StatusBar +
 * ActionHeader + CopyAnnouncer primitives (reused as-is, zero fork — they were
 * already bot-agnostic). What's NOT reused: GEO's PathCard/AutoPathPanel/
 * PlatformSelect/ContentBlock/CodeBlock/MarkDoneBar stack, because those exist
 * to solve "help the client paste HTML into their own site across WP/Wix/
 * other," which has no GMB analogue — GMB's write path is "WAO posts via the
 * GBP API," so the only client-facing decision is approve/edit/reject one
 * draft (see ApproveEditBar, GMB's own thin adapter for its state machine).
 */
export default async function GmbActionPage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  const { actionId: rawId } = await params;
  const itemId = decodeURIComponent(rawId);
  const item = findQueueItemById(itemId);
  if (!item) notFound();

  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? '';
  const sessionClientId = await verifySessionToken(token);
  if (!sessionClientId || sessionClientId !== item.clientId) notFound();

  const allItems = getQueue(item.clientId);
  const currentIdx = allItems.findIndex(i => i.itemId === itemId);

  const pageStatus =
    item.status === 'pending' ? 'pending' :
    item.status === 'rejected' ? 'error' : 'done';

  return (
    <CopyAnnouncer>
      <main className="mx-auto min-h-screen max-w-2xl px-4 pt-8 pb-32" dir="rtl">
        <StatusBar status={pageStatus} current={currentIdx + 1} total={allItems.length} />

        <ActionHeader title={TYPE_LABELS[item.type] ?? item.type} />

        {item.reviewContext && (
          <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-sm font-medium mb-1">
              ביקורת מ־{item.reviewContext.reviewerName} · {item.reviewContext.rating}⭐
            </div>
            <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">{item.reviewContext.reviewText}</p>
          </div>
        )}

        <div className="mb-6">
          <div className="text-sm font-medium mb-2">הטיוטה שלנו:</div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm whitespace-pre-wrap">
            {item.draftText}
          </div>
        </div>

        <ApproveEditBar itemId={itemId} initialText={item.draftText} initialStatus={item.status} />
      </main>
    </CopyAnnouncer>
  );
}
