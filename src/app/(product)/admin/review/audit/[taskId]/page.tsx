import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { getClientRecord } from '@/lib/geo/client';
import { hasOperatorAccess } from '@/lib/operator/flags';
import { findGoogleAdsApprovalAcrossClients, type GoogleAdsOperatorApproval } from '@/lib/google-ads/operator';
import { renderMixed } from '@/lib/bidi';

export const metadata: Metadata = {
  robots: { index: false },
};

const STATUS_LABEL: Record<string, string> = {
  proposed: 'הוצע',
  approved: 'אושר',
  rejected: 'נדחה',
  'auto-approved': 'אושר אוטומטית',
  queued: 'בתור',
  executed: 'בוצע',
  failed: 'נכשל',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('he-IL');
}

/**
 * Read-only audit trail (interaction-model spec §1.1, visual-design spec §6) — a table, not
 * cards, because it is explicitly never a decision surface. Every row is plain text/label,
 * consistent with the "no color-coded outcome language" rule the interaction-model spec
 * applies to the trust clock too. Rows are not clickable into a new decision; the target row
 * (from a TrustClockLine reset-trace link) is highlighted via #anchor + :target.
 */
export default async function GoogleAdsReviewAuditPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId: rawId } = await params;
  const taskId = decodeURIComponent(rawId);

  const found = findGoogleAdsApprovalAcrossClients(taskId);
  if (!found) notFound();

  const jar = await cookies();
  const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
  if (!sessionClientId || sessionClientId !== found.clientId) notFound();

  const clientRecord = getClientRecord(found.clientId);
  if (!clientRecord || !hasOperatorAccess(found.clientId, clientRecord.entitlements)) notFound();

  const clientName = clientRecord.businessNiche || found.clientId;

  return (
    <main dir="rtl" lang="he" className="mx-auto min-h-screen max-w-3xl px-4 pt-8 pb-32">
      <h1 className="mb-1 text-xl font-bold">היסטוריית החלטות — {renderMixed(clientName)}</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        רשימה לקריאה בלבד. לא ניתן לקבל החלטה חדשה מהמסך הזה.
      </p>

      <ul className="space-y-2">
        {found.approvals.map((approval: GoogleAdsOperatorApproval) => {
          const isTarget = approval.taskId === taskId;
          return (
            <li
              key={`${approval.taskId}-${approval.approvedAt}`}
              id={approval.taskId}
              className={`rounded-lg border p-4 text-sm ${
                isTarget ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-[var(--text)]">{renderMixed(approval.title)}</span>
                <span className="text-xs text-[var(--muted)]">{STATUS_LABEL[approval.status] ?? approval.status}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {formatDate(approval.approvedAt)} · {approval.stageGate ?? 'proxy-signal'}
              </p>
              {approval.status === 'rejected' && approval.correctionNote && (
                <p className="mt-2 text-xs text-[var(--text)]">{renderMixed(approval.correctionNote)}</p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
