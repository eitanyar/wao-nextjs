/**
 * GEO Approval Log — immutable append-only record of every client action.
 * Each entry is one JSON line in data/geo-logs/{clientId}/log.jsonl
 * Never update or delete entries — append only.
 */

import fs   from 'fs';
import path from 'path';

export type ActionType = 'faq_block' | 'definition_box' | 'table' | 'schema' | 'mixed';
export type VerificationResult = 'pass' | 'fail' | 'pending' | 'skipped';
export type Tier = 'radar' | 'managed' | 'pro';

export interface ApprovalEntry {
  // Identity
  entryId:      string;   // uuid-like: {clientId}-{timestamp}
  clientId:     string;
  actionId:     string;   // e.g. "faq-block-2026-07"

  // Action details
  actionType:    ActionType;
  targetUrl:     string;
  contentSnippet: string;  // first ~120 chars of expected text (fingerprint for verify)
  schemaType?:   string;   // e.g. "FAQPage" — checked in JSON-LD if present
  tier:          Tier;

  // Approval
  approvedBy:    string;
  approvedAt:    string;   // ISO timestamp

  // Publish
  publishedAt?:  string;
  publishedBy?:  'system' | 'client' | 'staff';

  // Verification
  verifiedAt?:       string;
  verificationResult: VerificationResult;
  verificationNote?:  string;  // e.g. "HTTP 200, snippet found at char 4821"
  fixAttempts:        number;
}

function logPath(clientId: string): string {
  const dir = path.join(process.cwd(), 'data', 'clients', clientId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'log.jsonl');
}

export function appendEntry(entry: ApprovalEntry): void {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logPath(entry.clientId), line, 'utf8');
}

export function readLog(clientId: string): ApprovalEntry[] {
  const file = logPath(clientId);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l) as ApprovalEntry);
}

export function getPendingVerifications(clientId: string): ApprovalEntry[] {
  return readLog(clientId).filter(e => e.verificationResult === 'pending');
}

export function updateVerification(
  clientId: string,
  entryId: string,
  patch: Partial<Pick<ApprovalEntry, 'verifiedAt' | 'verificationResult' | 'verificationNote' | 'fixAttempts'>>
): void {
  const file = logPath(clientId);
  const entries = readLog(clientId);
  const updated = entries.map(e => e.entryId === entryId ? { ...e, ...patch } : e);
  // Rewrite the file — this is the only non-append operation allowed (in-place update of same record)
  fs.writeFileSync(file, updated.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
}

export function makeEntryId(clientId: string): string {
  return `${clientId}-${Date.now()}`;
}
