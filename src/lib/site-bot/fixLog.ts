/**
 * Site-bot audit fix approval log — thin adapter over the shared generalized approval log
 * (src/lib/shared/approvalLog.ts), pinned to `data/audit-logs/<auditId>/log.jsonl`.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. All strings are ASCII.
 */

import * as shared from '../shared/approvalLog';
import type { ApprovalEntry } from '../shared/approvalLog';

export type { ApprovalEntry };

const AUDIT_LOG_BASE_DIR = 'data/audit-logs';

export function appendEntry(entry: ApprovalEntry): void {
  shared.appendEntry(AUDIT_LOG_BASE_DIR, entry);
}

export function readLog(auditId: string): ApprovalEntry[] {
  return shared.readLog(AUDIT_LOG_BASE_DIR, auditId);
}

export function getPendingVerifications(auditId: string): ApprovalEntry[] {
  return shared.getPendingVerifications(AUDIT_LOG_BASE_DIR, auditId);
}

export function updateVerification(
  auditId: string,
  entryId: string,
  patch: Parameters<typeof shared.updateVerification>[3]
): void {
  return shared.updateVerification(AUDIT_LOG_BASE_DIR, auditId, entryId, patch);
}

export function makeEntryId(auditId: string): string {
  return shared.makeEntryId(auditId);
}
