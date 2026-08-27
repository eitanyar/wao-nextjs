/**
 * Shared GBP connection and audit status promotion helper.
 *
 * HEBREW-SAFETY: ZERO Hebrew bytes. All strings and comments are ASCII.
 */

import { appendEntry, readLog, makeEntryId, type ApprovalEntry } from './fixLog';
import { bindAuditLocation, type AuditLocationBinding } from './auditStore';

export function promoteApprovedPendingEntries(auditId: string): number {
  const logEntries = readLog(auditId);
  const itemLatestStatus = new Map<string, { status: string; approvedAt?: string }>();

  for (const entry of logEntries) {
    const itemId = (entry as unknown as { itemId?: string }).itemId || entry.actionId;
    if (!itemId) continue;
    const status = (entry as unknown as { status?: string }).status || entry.verificationNote || '';
    itemLatestStatus.set(itemId, {
      status,
      approvedAt: entry.approvedAt,
    });
  }

  let count = 0;
  const now = new Date().toISOString();

  for (const [itemId, info] of itemLatestStatus.entries()) {
    if (info.status === 'approved_pending_connection') {
      const updateEntry: ApprovalEntry & { status: string; itemId: string; action: string } = {
        entryId: makeEntryId(auditId),
        clientId: auditId,
        actionId: itemId,
        actionType: 'mixed',
        targetUrl: `site-bot/fix/${auditId}`,
        contentSnippet: itemId,
        tier: 'managed',
        approvedBy: 'owner-self-serve',
        approvedAt: info.approvedAt || now,
        verificationResult: 'pending',
        verificationNote: 'gbp_connected',
        fixAttempts: 0,
        status: 'ready_to_execute',
        itemId,
        action: 'connection_status_update',
      };
      appendEntry(updateEntry as unknown as ApprovalEntry);
      count++;
    }
  }

  return count;
}

export async function connectAuditGbpLocation(
  auditId: string,
  binding: AuditLocationBinding,
  customBaseDir?: string
): Promise<{ success: boolean; queuedItemsCount: number }> {
  const bound = await bindAuditLocation(auditId, binding, customBaseDir);
  if (!bound) {
    return { success: false, queuedItemsCount: 0 };
  }

  const queuedItemsCount = promoteApprovedPendingEntries(auditId);
  return { success: true, queuedItemsCount };
}
