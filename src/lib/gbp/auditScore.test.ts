import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreAudit } from './auditScore';
import type { NormalizedPlace } from '../places/client';

// All fixtures are Latin-script only (HEBREW-SAFETY banner).
function makePlace(overrides: Partial<NormalizedPlace> = {}): NormalizedPlace {
  return {
    placeId: 'fixture-place-id',
    displayName: 'Fixture Test Business',
    formattedAddress: '1 Test Street, Test City',
    types: [],
    ...overrides,
  };
}

// Group 1: fully complete place -> 6 passes.
test('fully complete place -> passed 6, failed 0, unknown 0', () => {
  const place = makePlace({
    types: ['plumber', 'home_improvement_store'],
    regularOpeningHours: { openNow: true, periods: [{ open: { day: 0, hour: 8 } }] },
    specialOpeningHours: [{ open: { day: 1, hour: 9 } }],
    nationalPhoneNumber: '03-1234567',
    websiteUri: 'https://example.com',
    photos: { fetched: true, count: 5 },
    rating: 4.6,
    userRatingCount: 20,
    editorialSummary: 'Family-run plumbing service since 1998.',
  });
  const result = scoreAudit(place);
  assert.equal(result.passed, 6);
  assert.equal(result.failed, 0);
  assert.equal(result.unknown, 0);
  assert.equal(result.total, 6);
});

// Group 2: neglected place -> 6 fails.
test('neglected place -> passed 0, failed 6, unknown 0', () => {
  const place = makePlace({
    types: ['plumber'],
    nationalPhoneNumber: '03-1234567',
    photos: { fetched: true, count: 0 },
    rating: 4.9,
    userRatingCount: 2,
  });
  const result = scoreAudit(place);
  for (const d of result.dimensions) {
    assert.equal(d.status, 'fail', `dimension ${d.key} should fail`);
  }
  assert.equal(result.passed, 0);
  assert.equal(result.failed, 6);
  assert.equal(result.unknown, 0);
});

// Group 3: unobservable fields yield unknowns exactly where the API shows nothing.
test('unobservable place -> exactly 3 unknowns (categories, photos, reviews); hours/phone_website/description fail', () => {
  const place = makePlace({
    types: [],
    photos: { fetched: false, count: 0 },
    nationalPhoneNumber: '03-1234567',
  });
  const result = scoreAudit(place);
  const byKey = new Map(result.dimensions.map((d) => [d.key, d]));
  assert.equal(byKey.get('categories')?.status, 'unknown');
  assert.equal(byKey.get('photos')?.status, 'unknown');
  assert.equal(byKey.get('reviews')?.status, 'unknown');
  assert.equal(byKey.get('hours')?.status, 'fail');
  assert.equal(byKey.get('phone_website')?.status, 'fail');
  assert.equal(byKey.get('description')?.status, 'fail');
  assert.equal(result.unknown, 3);
  assert.equal(result.failed, 3);
  assert.equal(result.passed, 0);
});

// Group 4: review threshold edges — count is the only threshold in v0.
test('review count 9 (rating 5.0) -> reviews fail', () => {
  const result = scoreAudit(makePlace({ rating: 5.0, userRatingCount: 9 }));
  const reviews = result.dimensions.find((d) => d.key === 'reviews');
  assert.equal(reviews?.status, 'fail');
});

test('review count 10 (rating 3.9) -> reviews pass', () => {
  const result = scoreAudit(makePlace({ rating: 3.9, userRatingCount: 10 }));
  const reviews = result.dimensions.find((d) => d.key === 'reviews');
  assert.equal(reviews?.status, 'pass');
});

// Group 5: contract checks — order, tokens, counts, evidence shape.
test('dimension order is fixed', () => {
  const result = scoreAudit(makePlace());
  assert.deepEqual(
    result.dimensions.map((d) => d.key),
    ['categories', 'hours', 'phone_website', 'photos', 'reviews', 'description']
  );
});

test('copy tokens are the six explicit TITLE keys and never status-concatenated', () => {
  const result = scoreAudit(makePlace());
  assert.deepEqual(
    result.dimensions.map((d) => d.copyToken),
    [
      'DIM_CATEGORIES_TITLE',
      'DIM_HOURS_TITLE',
      'DIM_PHONE_WEBSITE_TITLE',
      'DIM_PHOTOS_TITLE',
      'DIM_REVIEWS_TITLE',
      'DIM_DESCRIPTION_TITLE',
    ]
  );
});

test('status labels are render-time only: no PASS/FAIL/UNKNOWN suffix in any engine token', () => {
  const result = scoreAudit(makePlace());
  for (const d of result.dimensions) {
    assert.ok(!d.copyToken.includes('_PASS'), `unexpected _PASS in ${d.copyToken}`);
    assert.ok(!d.copyToken.includes('_FAIL'), `unexpected _FAIL in ${d.copyToken}`);
    assert.ok(!d.copyToken.includes('_UNKNOWN'), `unexpected _UNKNOWN in ${d.copyToken}`);
  }
});

test('total is always 6 and counts partition: passed + failed + unknown = total', () => {
  for (const place of [makePlace(), makePlace({ types: ['plumber'] })]) {
    const result = scoreAudit(place);
    assert.equal(result.total, 6);
    assert.equal(result.passed + result.failed + result.unknown, result.total);
  }
});

test('evidence strings match the documented ASCII shapes', () => {
  const place = makePlace({
    types: ['plumber'],
    nationalPhoneNumber: '03-1234567',
    photos: { fetched: true, count: 0 },
    rating: 4.9,
    userRatingCount: 2,
  });
  const result = scoreAudit(place);
  const byKey = new Map(result.dimensions.map((d) => [d.key, d.evidence]));
  assert.equal(byKey.get('categories'), 'categories:1');
  assert.equal(byKey.get('hours'), 'hours:regular=absent,special=absent');
  assert.equal(byKey.get('phone_website'), 'phone:present,website:absent');
  assert.equal(byKey.get('photos'), 'photos:count=0,fetched=true');
  assert.equal(byKey.get('reviews'), 'reviews:count=2,rating=4.9');
  assert.equal(byKey.get('description'), 'description:absent');
});
