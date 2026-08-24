/**
 * GBP review-polling sensor — fs-based per-client snapshot store.
 * Mirrors `src/lib/crm/reviewFlywheelStore.ts`'s pattern (data/clients/<clientId>/*.json).
 * One JSON snapshot file per client (`gbp-reviews.json`), overwritten on each poll — the
 * diff itself (new / bad reviews) is computed by `pollClientReviews` in `reviewPoll.ts`
 * BEFORE this store is overwritten, so nothing here needs to know about diffing.
 */

import fs   from 'fs';
import path from 'path';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

export interface GbpReviewSnapshotItem {
  reviewId:     string;
  reviewerName: string;
  starRating:   number;
  comment:      string;
  createTime:   string;
  updateTime:   string;
  hasReply:     boolean;
}

export interface GbpReviewSnapshot {
  fetchedAt: string;
  reviews:   GbpReviewSnapshotItem[];
}

function snapshotFile(clientId: string, baseDir: string = CLIENTS_DIR): string {
  return path.join(baseDir, clientId, 'gbp-reviews.json');
}

export function getReviewSnapshot(clientId: string, baseDir: string = CLIENTS_DIR): GbpReviewSnapshot | null {
  const fp = snapshotFile(clientId, baseDir);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

export function writeReviewSnapshot(clientId: string, snapshot: GbpReviewSnapshot, baseDir: string = CLIENTS_DIR): void {
  const fp = snapshotFile(clientId, baseDir);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(snapshot, null, 2), 'utf8');
}
