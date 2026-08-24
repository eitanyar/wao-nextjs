import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import { normalizeGbpReview, pollClientReviews } from './reviewPoll';

/**
 * Uses the repo's designated test client (`data/clients/test-plumber-tlv`) for the
 * fs-round-trip cases — the one client this task's execution scope explicitly permits
 * touching (handoff/pending/2026-08-23_002_*.md banner). Its gbp-reviews.json snapshot is
 * cleaned up before/after so test order/reruns don't leak state between cases.
 */
const SNAPSHOT_PATH = path.join(process.cwd(), 'data', 'clients', 'test-plumber-tlv', 'gbp-reviews.json');

function cleanSnapshot() {
  if (fs.existsSync(SNAPSHOT_PATH)) fs.unlinkSync(SNAPSHOT_PATH);
}

function rawReview(overrides: Record<string, unknown> = {}) {
  return {
    reviewId: 'r1',
    reviewer: { displayName: 'Test Reviewer' },
    starRating: 'FIVE',
    comment: 'Great service.',
    createTime: '2026-08-01T00:00:00Z',
    updateTime: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

test('normalizeGbpReview maps all five star enum values to 1-5', () => {
  const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  for (const [enumVal, expected] of Object.entries(map)) {
    const item = normalizeGbpReview(rawReview({ starRating: enumVal }));
    assert.equal(item.starRating, expected);
  }
});

test('normalizeGbpReview defaults missing comment to empty string and hasReply to false without reviewReply', () => {
  const raw = rawReview();
  delete (raw as Record<string, unknown>).comment;
  const item = normalizeGbpReview(raw);
  assert.equal(item.comment, '');
  assert.equal(item.hasReply, false);
});

test('normalizeGbpReview sets hasReply true when reviewReply is present', () => {
  const item = normalizeGbpReview(rawReview({ reviewReply: { comment: 'Thanks!' } }));
  assert.equal(item.hasReply, true);
});

test('pollClientReviews throws a clear error when gbpAccountId/gbpLocationId are missing', async () => {
  await assert.rejects(
    () => pollClientReviews('aasada', async () => []),
    /gbpAccountId\/gbpLocationId/
  );
});

test('pollClientReviews throws a clear error for an unknown client', async () => {
  await assert.rejects(
    () => pollClientReviews('no-such-client-xyz', async () => []),
    /no client record found/
  );
});

test('pollClientReviews: empty snapshot -> all reviews new; identical refetch -> none new; bumped updateTime -> new again', async () => {
  cleanSnapshot();
  try {
    const reviews = [
      rawReview({ reviewId: 'a', starRating: 'FIVE', updateTime: '2026-08-01T00:00:00Z' }),
      rawReview({ reviewId: 'b', starRating: 'FOUR', updateTime: '2026-08-01T00:00:00Z' }),
    ];

    // First poll: no prior snapshot -> everything is new (proves diff reads the OLD snapshot,
    // not the just-written one — a diff-after-overwrite bug would show 0 new here).
    const first = await pollClientReviews('test-plumber-tlv', async () => reviews);
    assert.equal(first.newReviews.length, 2);
    assert.equal(first.totalReviews, 2);

    // Second poll with the identical fetch: nothing changed -> no new reviews.
    const second = await pollClientReviews('test-plumber-tlv', async () => reviews);
    assert.equal(second.newReviews.length, 0);

    // Third poll: bump review "a"'s updateTime -> it's new again, "b" is not.
    const bumped = [
      rawReview({ reviewId: 'a', starRating: 'FIVE', updateTime: '2026-08-02T00:00:00Z' }),
      rawReview({ reviewId: 'b', starRating: 'FOUR', updateTime: '2026-08-01T00:00:00Z' }),
    ];
    const third = await pollClientReviews('test-plumber-tlv', async () => bumped);
    assert.equal(third.newReviews.length, 1);
    assert.equal(third.newReviews[0].reviewId, 'a');
  } finally {
    cleanSnapshot();
  }
});

test('pollClientReviews: bad-review classification (2-star unreplied = bad; 3-star replied = not bad; 4-star unreplied = not bad)', async () => {
  cleanSnapshot();
  try {
    const reviews = [
      rawReview({ reviewId: 'bad-1', starRating: 'TWO', updateTime: '2026-08-01T00:00:00Z' }),
      rawReview({
        reviewId: 'ok-replied',
        starRating: 'THREE',
        updateTime: '2026-08-01T00:00:00Z',
        reviewReply: { comment: 'Thanks for the feedback.' },
      }),
      rawReview({ reviewId: 'ok-fourstar', starRating: 'FOUR', updateTime: '2026-08-01T00:00:00Z' }),
    ];

    const result = await pollClientReviews('test-plumber-tlv', async () => reviews);
    assert.equal(result.badReviews.length, 1);
    assert.equal(result.badReviews[0].reviewId, 'bad-1');
  } finally {
    cleanSnapshot();
  }
});
