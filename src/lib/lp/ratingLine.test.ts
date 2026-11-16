// Rating line (reviewContext): a rating is never shown without its review count (Eitan, 2026-11-16).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes; expected strings are built from the FINAL copy file.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RATING_LINE_TEMPLATES, ratingLineReviewCount, ratingWithCountLine } from './ratingLine';
import { parseReviewCount } from './ownerFactCopy';
import { buildLpCopyPrompt } from './lpCopyPrompt';

const ROOT = path.resolve(__dirname, '../../..');
const FINAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'copy', 'site-bot-logo-rating-review-strings-FINAL-2026-11-16.json'), 'utf8')) as Record<string, string>;

test('rating line: the templates are the FINAL copy, byte-exact', () => {
  assert.equal(RATING_LINE_TEMPLATES.withCount, FINAL.ratingWithCount);
  assert.equal(RATING_LINE_TEMPLATES.withCountOne, FINAL.ratingWithCountOne);
});

test('rating line: count 64, count 1, no count or 0 -> null', () => {
  assert.equal(ratingWithCountLine('4.9', 64), FINAL.ratingWithCount.replace('{rating}', '4.9').replace('{count}', '64'));
  assert.equal(ratingWithCountLine('4.9', '64'), FINAL.ratingWithCount.replace('{rating}', '4.9').replace('{count}', '64'), 'digit string');
  assert.equal(ratingWithCountLine('5', 1), FINAL.ratingWithCountOne.replace('{rating}', '5'));
  for (const count of [undefined, null, 0, '0', '', 'many', -3, 2.5]) assert.equal(ratingWithCountLine('4.9', count), null, String(count));
  for (const rating of [undefined, null, '', '   ']) assert.equal(ratingWithCountLine(rating, 64), null, String(rating));
  assert.doesNotMatch(ratingWithCountLine('4.9', 64)!, /\{|\}/, 'no unfilled slot');
});

test('rating line: the count parser matches ownerFactCopy.parseReviewCount', () => {
  for (const value of [undefined, null, 0, 1, 64, '64', ' 7 ', '0', '', 'x', -1, 2.5, 100_000, 100_001, '1e3']) {
    assert.equal(ratingLineReviewCount(value), parseReviewCount(value), String(value));
  }
});

const reviewContextOf = (prompt: string) => /"reviewContext": (null|"[^"\n]*"),/.exec(prompt)?.[1];

test('buildLpCopyPrompt: reviewContext carries the count, the one-review form, or null', () => {
  const base = { reviewQuote: 'Great work', starRating: '4.9' };
  assert.equal(reviewContextOf(buildLpCopyPrompt({ ...base, reviewCount: 64 })), JSON.stringify(ratingWithCountLine('4.9', 64)));
  assert.equal(reviewContextOf(buildLpCopyPrompt({ ...base, reviewCount: 1 })), JSON.stringify(ratingWithCountLine('4.9', 1)));
  assert.equal(reviewContextOf(buildLpCopyPrompt(base)), 'null', 'no count');
  assert.equal(reviewContextOf(buildLpCopyPrompt({ ...base, reviewCount: 0 })), 'null', 'count 0');
  assert.equal(reviewContextOf(buildLpCopyPrompt({ starRating: '4.9', reviewCount: 64 })), 'null', 'no real review quote');
});
