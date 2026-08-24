/**
 * GBP review-polling sensor — pure diff/normalize logic. The API-fetcher is always injected
 * so this module never touches the network directly (see `hasGbpCredentials()` gate in
 * `src/lib/gbp/client.ts` and `scripts/review-poll.mjs`'s BLOCKED-without-fixture guard).
 *
 * Reputation Loop back-half, stage 1 of 4 — this is the sensor. The first-responder (task
 * _003) drafts replies for `badReviews`; write actions (`reviews.reply`) are out of scope here.
 */

import { loadClient } from '../shared/clients';
import {
  getReviewSnapshot,
  writeReviewSnapshot,
  type GbpReviewSnapshotItem,
} from './reviewStore';

const STAR_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

/**
 * Maps the legacy My Business v4 review shape to the flat snapshot item this module stores.
 */
export function normalizeGbpReview(raw: unknown): GbpReviewSnapshotItem {
  const r = raw as {
    reviewId: string;
    reviewer?: { displayName?: string };
    starRating: string;
    comment?: string;
    createTime: string;
    updateTime: string;
    reviewReply?: { comment?: string };
  };

  return {
    reviewId: r.reviewId,
    reviewerName: r.reviewer?.displayName ?? '',
    starRating: STAR_MAP[r.starRating] ?? 0,
    comment: r.comment ?? '',
    createTime: r.createTime,
    updateTime: r.updateTime,
    hasReply: !!r.reviewReply,
  };
}

export interface ReviewPollResult {
  clientId: string;
  newReviews: GbpReviewSnapshotItem[];
  badReviews: GbpReviewSnapshotItem[];
  totalReviews: number;
}

/**
 * Loads the client, fetches raw reviews via the injected fetcher, normalizes them, diffs
 * against the stored snapshot (BEFORE overwriting it), and writes the fresh snapshot.
 *
 * A review is "new" if its `reviewId` is absent from the stored snapshot, or present with an
 * older `updateTime`. `badReviews` = new reviews with `starRating <= 3 && !hasReply`.
 */
export async function pollClientReviews(
  clientId: string,
  fetchRawReviews: (accountId: string, locationId: string) => Promise<unknown[]>
): Promise<ReviewPollResult> {
  const client = loadClient(clientId);
  if (!client) {
    throw new Error(`pollClientReviews: no client record found for "${clientId}"`);
  }
  if (!client.gbpAccountId || !client.gbpLocationId) {
    throw new Error(
      `pollClientReviews: client "${clientId}" is missing gbpAccountId/gbpLocationId (client.json)`
    );
  }

  const raw = await fetchRawReviews(client.gbpAccountId, client.gbpLocationId);
  const normalized = raw.map(normalizeGbpReview);

  // Diff BEFORE overwrite — read the existing snapshot first.
  const existing = getReviewSnapshot(clientId);
  const existingById = new Map((existing?.reviews ?? []).map(item => [item.reviewId, item]));

  const newReviews = normalized.filter(item => {
    const prior = existingById.get(item.reviewId);
    if (!prior) return true;
    return new Date(item.updateTime).getTime() > new Date(prior.updateTime).getTime();
  });

  const badReviews = newReviews.filter(item => item.starRating <= 3 && !item.hasReply);

  writeReviewSnapshot(clientId, {
    fetchedAt: new Date().toISOString(),
    reviews: normalized,
  });

  return {
    clientId,
    newReviews,
    badReviews,
    totalReviews: normalized.length,
  };
}
