/**
 * Shared multi-bot Approval Log — immutable append-only record of every client action,
 * generalized from `src/lib/geo/approvalLog.ts` (GEO Bot's original, untouched — still
 * writes to `data/clients/{clientId}/log.jsonl` and is NOT refactored to call this module,
 * to keep this a zero-risk addition with no blast radius on GEO Bot's live log).
 *
 * Generalization: identical shape + API as GEO's approvalLog.ts, but `baseDir` is a
 * parameter instead of hardcoded, and `actionType` is widened to cover non-GEO item
 * shapes (review-reply / post for GMB Bot). This is the "confirm log.jsonl generalizes"
 * deliverable from docs/specs/gmb-bot-scope.md §5 — same schema, second real bot on top.
 *
 * GMB Bot calls this via `src/lib/gmb/log.ts` with baseDir = data/gmb-logs (per spec §4,
 * a dedicated directory — never overloading GEO's `data/clients/{clientId}/log.jsonl`).
 */

import fs   from 'fs';
import path from 'path';

export type ActionType =
  | 'faq_block' | 'definition_box' | 'table' | 'schema' | 'mixed' // GEO Bot
  | 'review_reply' | 'post';                                       // GMB Bot
export type VerificationResult = 'pass' | 'fail' | 'pending' | 'skipped';
export type Tier = 'radar' | 'managed' | 'pro';

export interface ApprovalEntry {
  // Identity
  entryId:      string;   // uuid-like: {clientId}-{timestamp}
  clientId:     string;
  actionId:     string;   // e.g. "faq-block-2026-07" or a GMB queue item id

  // Action details
  actionType:    ActionType;
  targetUrl:     string;   // GEO: page URL. GMB: GBP location/review/post resource URL.
  contentSnippet: string;  // first ~120 chars of expected text (fingerprint for verify)
  schemaType?:   string;   // e.g. "FAQPage" — checked in JSON-LD if present (GEO only)
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
  verificationNote?:  string;  // e.g. "HTTP 200, snippet found at char 4821" or GBP confirmation id
  fixAttempts:        number;
}

function logPath(baseDir: string, clientId: string): string {
  const cleanBase = baseDir.replace(/^data\/?/, '');
  const dir = path.join(process.cwd(), 'data', cleanBase, clientId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'log.jsonl');
}

export function appendEntry(baseDir: string, entry: ApprovalEntry): void {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logPath(baseDir, entry.clientId), line, 'utf8');
}

export function readLog(baseDir: string, clientId: string): ApprovalEntry[] {
  const file = logPath(baseDir, clientId);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l) as ApprovalEntry);
}

export function getPendingVerifications(baseDir: string, clientId: string): ApprovalEntry[] {
  return readLog(baseDir, clientId).filter(e => e.verificationResult === 'pending');
}

export function updateVerification(
  baseDir: string,
  clientId: string,
  entryId: string,
  patch: Partial<Pick<ApprovalEntry, 'verifiedAt' | 'verificationResult' | 'verificationNote' | 'fixAttempts'>>
): void {
  const file = logPath(baseDir, clientId);
  const entries = readLog(baseDir, clientId);
  const updated = entries.map(e => e.entryId === entryId ? { ...e, ...patch } : e);
  fs.writeFileSync(file, updated.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
}

export function makeEntryId(clientId: string): string {
  return `${clientId}-${Date.now()}`;
}
