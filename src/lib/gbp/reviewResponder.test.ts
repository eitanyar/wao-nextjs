import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { draftRepliesForBadReviews, type ReplyDrafter } from './reviewResponder';
import { getReviewResponderQueue, updateReviewResponderQueueItem } from './reviewResponderStore';
import type { SharedClientRecord } from '../shared/clients';
import type { GbpReviewSnapshotItem } from './reviewStore';

/**
 * All fs writes in this file go through a temp `baseDir` — never `data/clients/` — so tests
 * never touch live production data (task 003's EXECUTION SCOPE banner).
 */
function makeTempBaseDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'review-responder-test-'));
}

const CLIENT: SharedClientRecord = {
  clientId: 'test-plumber-tlv',
  siteUrl: 'https://test-plumber-tlv.wao.co.il',
  businessNiche: 'plumbing',
  brandName: 'Test Plumber TLV',
  approvalContact: 'Test Owner',
  approvalWhatsapp: '050-1234567',
};

function badReview(overrides: Partial<GbpReviewSnapshotItem> = {}): GbpReviewSnapshotItem {
  return {
    reviewId: 'r1',
    reviewerName: 'Angry Customer',
    starRating: 2,
    comment: 'Not happy with the service.',
    createTime: '2026-08-01T00:00:00Z',
    updateTime: '2026-08-01T00:00:00Z',
    hasReply: false,
    ...overrides,
  };
}

const fakeDrafter: ReplyDrafter = async (_systemPrompt, _fewshot, reviewComment) =>
  `[FAKE-DRAFT] reply for: ${reviewComment}`;

test('draftRepliesForBadReviews: fake-drafter batch produces one queue item per bad review with status drafted', async () => {
  const baseDir = makeTempBaseDir();
  const reviews = [badReview({ reviewId: 'a' }), badReview({ reviewId: 'b' })];

  const appended = await draftRepliesForBadReviews(CLIENT, reviews, fakeDrafter, baseDir);

  assert.equal(appended.length, 2);
  for (const item of appended) {
    assert.equal(item.status, 'drafted');
    assert.ok(item.draftReply.startsWith('[FAKE-DRAFT]'));
  }

  const queue = getReviewResponderQueue(CLIENT.clientId, baseDir);
  assert.equal(queue.length, 2);
});

test('draftRepliesForBadReviews: duplicate reviewId append is skipped (idempotent)', async () => {
  const baseDir = makeTempBaseDir();
  const review = badReview({ reviewId: 'dup-1' });

  await draftRepliesForBadReviews(CLIENT, [review], fakeDrafter, baseDir);
  await draftRepliesForBadReviews(CLIENT, [review], fakeDrafter, baseDir);

  const queue = getReviewResponderQueue(CLIENT.clientId, baseDir);
  assert.equal(queue.length, 1);
});

test('draftRepliesForBadReviews: one drafter rejection skips only that item', async () => {
  const baseDir = makeTempBaseDir();
  const reviews = [badReview({ reviewId: 'ok-1' }), badReview({ reviewId: 'fails-1' }), badReview({ reviewId: 'ok-2' })];

  const flakyDrafter: ReplyDrafter = async (_sp, _fs, reviewComment, _ctx) => {
    if (reviewComment.includes('fail-me')) throw new Error('drafter exploded');
    return `[FAKE-DRAFT] reply for: ${reviewComment}`;
  };

  const reviewsWithFailure = [
    badReview({ reviewId: 'ok-1' }),
    badReview({ reviewId: 'fails-1', comment: 'fail-me please' }),
    badReview({ reviewId: 'ok-2' }),
  ];

  const appended = await draftRepliesForBadReviews(CLIENT, reviewsWithFailure, flakyDrafter, baseDir);

  assert.equal(appended.length, 2);
  assert.ok(appended.every(i => i.reviewId !== 'fails-1'));

  const queue = getReviewResponderQueue(CLIENT.clientId, baseDir);
  assert.equal(queue.length, 2);
});

test('draftRepliesForBadReviews: missing approvalWhatsapp yields ownerNotifyWaLink null without throwing', async () => {
  const baseDir = makeTempBaseDir();
  const clientNoWhatsapp: SharedClientRecord = { ...CLIENT, approvalWhatsapp: undefined };
  const review = badReview({ reviewId: 'no-wa-1' });

  const appended = await draftRepliesForBadReviews(clientNoWhatsapp, [review], fakeDrafter, baseDir);

  assert.equal(appended.length, 1);
  assert.equal(appended[0].ownerNotifyWaLink, null);
});

test('updateReviewResponderQueueItem: patches status', async () => {
  const baseDir = makeTempBaseDir();
  const review = badReview({ reviewId: 'to-post-1' });

  await draftRepliesForBadReviews(CLIENT, [review], fakeDrafter, baseDir);

  const updated = updateReviewResponderQueueItem(CLIENT.clientId, 'to-post-1', { status: 'posted', postedAt: '2026-08-23T00:00:00Z' }, baseDir);
  assert.equal(updated.status, 'posted');

  const queue = getReviewResponderQueue(CLIENT.clientId, baseDir);
  assert.equal(queue.find(i => i.reviewId === 'to-post-1')?.status, 'posted');
});

test('updateReviewResponderQueueItem: throws if reviewId not found', async () => {
  const baseDir = makeTempBaseDir();
  assert.throws(() => updateReviewResponderQueueItem(CLIENT.clientId, 'no-such-id', { status: 'posted' }, baseDir));
});
