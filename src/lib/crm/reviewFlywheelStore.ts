/**
 * Review-generation flywheel — fs-based queue store.
 * Mirrors `src/lib/gmb/store.ts`'s per-client file pattern (data/clients/<clientId>/*.json)
 * so the eventual dashboard surface can read this the same way GMB's approval queue is read.
 * One JSON array file per client (`review-flywheel-queue.json`), append-only — no dashboard
 * surface exists yet (that's a separate, not-yet-scoped task per
 * handoff/completed/2026-08-22_007_nextjs-engineer_review-flywheel-trigger-wiring.md).
 */

import fs   from 'fs';
import path from 'path';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

export interface ReviewFlywheelQueueItem {
  leadId:      number;
  clientId:    string;
  waLink:      string;
  generatedAt: string;
}

function queueFile(clientId: string): string {
  return path.join(CLIENTS_DIR, clientId, 'review-flywheel-queue.json');
}

export function getReviewFlywheelQueue(clientId: string): ReviewFlywheelQueueItem[] {
  const fp = queueFile(clientId);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

export function appendReviewFlywheelQueueItem(item: ReviewFlywheelQueueItem): void {
  const fp = queueFile(item.clientId);
  const existing = getReviewFlywheelQueue(item.clientId);
  existing.push(item);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(existing, null, 2), 'utf8');
}
