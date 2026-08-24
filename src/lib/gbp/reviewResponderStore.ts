/**
 * Bad-review first-responder — fs-based per-client queue store.
 * Mirrors `src/lib/gbp/reviewStore.ts`'s `baseDir` pattern (data/clients/<clientId>/*.json).
 * One JSON array file per client (`review-responder-queue.json`), append-only until task 005's
 * approval route patches `status` -> 'posted'. Never auto-posted — see reviewResponder.ts.
 */

import fs   from 'fs';
import path from 'path';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

export interface ReviewResponderQueueItem {
  reviewId:         string;
  clientId:         string;
  reviewerName:     string;
  starRating:       number;
  reviewComment:    string;
  draftReply:       string;
  ownerNotifyWaLink: string | null;
  status:           'drafted' | 'posted';
  generatedAt:      string;
  postedAt?:        string;
}

function queueFile(clientId: string, baseDir: string = CLIENTS_DIR): string {
  return path.join(baseDir, clientId, 'review-responder-queue.json');
}

export function getReviewResponderQueue(clientId: string, baseDir: string = CLIENTS_DIR): ReviewResponderQueueItem[] {
  const fp = queueFile(clientId, baseDir);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

/** Skips silently (no duplicate) if an item with the same reviewId already exists. */
export function appendReviewResponderQueueItem(item: ReviewResponderQueueItem, baseDir: string = CLIENTS_DIR): void {
  const fp = queueFile(item.clientId, baseDir);
  const existing = getReviewResponderQueue(item.clientId, baseDir);
  if (existing.some(i => i.reviewId === item.reviewId)) return;
  existing.push(item);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(existing, null, 2), 'utf8');
}

/** Finds by reviewId, shallow-merges patch, rewrites file; throws if reviewId not found. */
export function updateReviewResponderQueueItem(
  clientId: string,
  reviewId: string,
  patch: Partial<ReviewResponderQueueItem>,
  baseDir: string = CLIENTS_DIR
): ReviewResponderQueueItem {
  const fp = queueFile(clientId, baseDir);
  const existing = getReviewResponderQueue(clientId, baseDir);
  const idx = existing.findIndex(i => i.reviewId === reviewId);
  if (idx === -1) {
    throw new Error(`updateReviewResponderQueueItem: no queue item with reviewId "${reviewId}" for client "${clientId}"`);
  }
  const updated = { ...existing[idx], ...patch };
  existing[idx] = updated;
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(existing, null, 2), 'utf8');
  return updated;
}
