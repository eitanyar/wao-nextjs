/**
 * GMB Bot immutable log — thin adapter over the shared generalized approval log
 * (src/lib/shared/approvalLog.ts), pinned to its own directory per spec §4:
 * `data/gmb-logs/{clientId}/log.jsonl` — never overloads GEO's `data/clients/{clientId}/log.jsonl`.
 */

import * as shared from '@/lib/shared/approvalLog';
import type { ApprovalEntry } from '@/lib/shared/approvalLog';

export type { ApprovalEntry };

const GMB_LOG_BASE_DIR = 'data/gmb-logs';

export function appendEntry(entry: ApprovalEntry): void {
  shared.appendEntry(GMB_LOG_BASE_DIR, entry);
}

export function readLog(clientId: string): ApprovalEntry[] {
  return shared.readLog(GMB_LOG_BASE_DIR, clientId);
}

export function getPendingVerifications(clientId: string) {
  return shared.getPendingVerifications(GMB_LOG_BASE_DIR, clientId);
}

export function updateVerification(
  clientId: string,
  entryId: string,
  patch: Parameters<typeof shared.updateVerification>[3]
) {
  return shared.updateVerification(GMB_LOG_BASE_DIR, clientId, entryId, patch);
}

export function makeEntryId(clientId: string): string {
  return shared.makeEntryId(clientId);
}
