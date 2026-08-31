import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreAudit } from './auditScore';
import { deriveFixPlan, deriveGbpAttributesPayload, FIX_MAPPINGS } from './fixPlan';
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

test('all-fail audit -> exactly 6 items in dimension order', () => {
  const neglectedPlace = makePlace({
    types: ['plumber'],
    nationalPhoneNumber: '03-1234567',
    photos: { fetched: true, count: 0 },
    rating: 4.9,
    userRatingCount: 2,
  });
  const score = scoreAudit(neglectedPlace);
  assert.equal(score.failed, 6);

  const plan = deriveFixPlan(score);
  assert.equal(plan.length, 6);
  assert.deepEqual(
    plan.map((item) => item.id),
    [
      'categories-fix',
      'hours-fix',
      'phone_website-fix',
      'photos-fix',
      'reviews-fix',
      'description-fix',
    ]
  );
});

test('all-pass audit -> empty fix plan', () => {
  const completePlace = makePlace({
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
  const score = scoreAudit(completePlace);
  assert.equal(score.passed, 6);

  const plan = deriveFixPlan(score);
  assert.deepEqual(plan, []);
});

test('all-unknown audit -> empty fix plan', () => {
  // A hypothetical audit result where all dimensions are unknown
  const score = {
    total: 6,
    passed: 0,
    failed: 0,
    unknown: 6,
    dimensions: [
      { key: 'categories', status: 'unknown' as const, evidence: 'categories:0', copyToken: 'DIM_CATEGORIES_TITLE' },
      { key: 'hours', status: 'unknown' as const, evidence: 'hours:unknown', copyToken: 'DIM_HOURS_TITLE' },
      { key: 'phone_website', status: 'unknown' as const, evidence: 'phone:unknown', copyToken: 'DIM_PHONE_WEBSITE_TITLE' },
      { key: 'photos', status: 'unknown' as const, evidence: 'photos:count=0,fetched=false', copyToken: 'DIM_PHOTOS_TITLE' },
      { key: 'reviews', status: 'unknown' as const, evidence: 'reviews:count=na,rating=na', copyToken: 'DIM_REVIEWS_TITLE' },
      { key: 'description', status: 'unknown' as const, evidence: 'description:unknown', copyToken: 'DIM_DESCRIPTION_TITLE' },
    ],
  };

  const plan = deriveFixPlan(score);
  assert.deepEqual(plan, []);
});

test('item types and payload hints match specifications with resolved categories', () => {
  const neglectedPlace = makePlace({
    types: ['plumber'],
    nationalPhoneNumber: '03-1234567',
    photos: { fetched: true, count: 0 },
    rating: 4.9,
    userRatingCount: 2,
  });
  const score = scoreAudit(neglectedPlace);
  const plan = deriveFixPlan(score);

  const byId = new Map(plan.map((item) => [item.id, item]));

  const categories = byId.get('categories-fix');
  assert.equal(categories?.type, 'write_categories');
  assert.equal(
    categories?.payloadHint,
    'set primary (gcid:plumber) + 7 secondary categories'
  );
  assert.equal(categories?.dimension, 'categories');
  assert.equal(categories?.reason, 'categories:1');

  const hours = byId.get('hours-fix');
  assert.equal(hours?.type, 'write_location');
  assert.equal(
    hours?.payloadHint,
    'regularHours + specialHours (owner supplies hours; next 2-3 holidays per Ulku cadence)'
  );
  assert.equal(hours?.dimension, 'hours');
  assert.equal(hours?.reason, 'hours:regular=absent,special=absent');

  const phoneWebsite = byId.get('phone_website-fix');
  assert.equal(phoneWebsite?.type, 'write_location');
  assert.equal(
    phoneWebsite?.payloadHint,
    'phoneNumbers and/or websiteUri from verified owner data'
  );
  assert.equal(phoneWebsite?.dimension, 'phone_website');
  assert.equal(phoneWebsite?.reason, 'phone:present,website:absent');

  const photos = byId.get('photos-fix');
  assert.equal(photos?.type, 'manual_owner_action');
  assert.equal(
    photos?.payloadHint,
    'owner uploads real photos (no public write API in v0)'
  );
  assert.equal(photos?.dimension, 'photos');
  assert.equal(photos?.reason, 'photos:count=0,fetched=true');

  const reviews = byId.get('reviews-fix');
  assert.equal(reviews?.type, 'manual_owner_action');
  assert.equal(
    reviews?.payloadHint,
    'review-ask flow via owner channel (Reputation Loop territory; not a profile write)'
  );
  assert.equal(reviews?.dimension, 'reviews');
  assert.equal(reviews?.reason, 'reviews:count=2,rating=4.9');

  const description = byId.get('description-fix');
  assert.equal(description?.type, 'write_location');
  assert.equal(
    description?.payloadHint,
    'description authored from owner facts (Gate-1: per-item Hebrew authorship, no template)'
  );
  assert.equal(description?.dimension, 'description');
  assert.equal(description?.reason, 'description:absent');
});

test('category fix fallback when place is unresolvable or missing', () => {
  const unresolvableScore = {
    total: 6,
    passed: 5,
    failed: 1,
    unknown: 0,
    dimensions: [
      { key: 'categories', status: 'fail' as const, evidence: 'categories:1', copyToken: 'DIM_CATEGORIES_TITLE' },
    ],
  };

  const plan = deriveFixPlan(unresolvableScore);
  assert.equal(plan.length, 1);
  assert.equal(
    plan[0].payloadHint,
    'set primary + secondary categories (owner confirms list; categoryId mapping is WoZ)'
  );
});

// -- spec 2026-08-27_007: attributes derivation --

test('FIX_MAPPINGS contains write_attributes mapping for attributes', () => {
  assert.equal(FIX_MAPPINGS.attributes.type, 'write_attributes');
  assert.equal(
    FIX_MAPPINGS.attributes.payloadHint,
    'set standard Israeli micro-business attributes (Bit, PayBox, cards, 24/7 emergency if applicable)'
  );
});

test('deriveGbpAttributesPayload produces standard Israeli micro-business defaults', () => {
  const payload = deriveGbpAttributesPayload({});
  assert.equal(payload.has_payment_cash, true);
  assert.equal(payload.has_payment_credit_card, true);
  assert.equal(payload.has_payment_bit, true);
  assert.equal(payload.has_payment_paybox, true);
  assert.equal(payload.has_emergency_service_24_7, false);
  assert.deepEqual(payload.languages_spoken, ['he']);
});

test('deriveGbpAttributesPayload honors emergency flag and extra languages', () => {
  const payload = deriveGbpAttributesPayload({
    isEmergency24_7: true,
    languages: ['en', 'ru'],
  });
  assert.equal(payload.has_emergency_service_24_7, true);
  assert.deepEqual(payload.languages_spoken, ['he', 'en', 'ru']);
});

test('deriveGbpAttributesPayload is deterministic and dedupes/ignores bad input', () => {
  const a = deriveGbpAttributesPayload({ languages: ['he', 'en'], paymentMethods: ['bit'] });
  const b = deriveGbpAttributesPayload({ languages: ['he', 'en'], paymentMethods: ['bit'] });
  assert.deepEqual(a, b);
  assert.deepEqual(a.languages_spoken, ['he', 'en']);
  assert.equal(a.has_payment_bit, true);

  const withNoise = deriveGbpAttributesPayload({
    languages: ['', '  '],
    paymentMethods: ['Google Pay!', '', '  '],
  });
  assert.deepEqual(withNoise.languages_spoken, ['he']);
  assert.equal(withNoise.has_payment_google_pay, true);
});

test('deriveFixPlan emits write_attributes item for a failing attributes dimension', () => {
  const score = {
    total: 7,
    passed: 6,
    failed: 1,
    unknown: 0,
    dimensions: [
      { key: 'attributes', status: 'fail' as const, evidence: 'attributes:absent', copyToken: 'DIM_ATTRIBUTES_TITLE' },
    ],
  };

  const plan = deriveFixPlan(score);
  assert.equal(plan.length, 1);

  const item = plan[0];
  assert.equal(item.id, 'attributes-fix');
  assert.equal(item.dimension, 'attributes');
  assert.equal(item.type, 'write_attributes');
  assert.equal(item.reason, 'attributes:absent');
  assert.equal(
    item.payloadHint,
    'set standard Israeli micro-business attributes (Bit, PayBox, cards, 24/7 emergency if applicable)'
  );
});

test('deriveFixPlan stays backward compatible: scoreAudit suite never emits attributes item', () => {
  const neglectedPlace = makePlace({
    types: ['plumber'],
    nationalPhoneNumber: '03-1234567',
    photos: { fetched: true, count: 0 },
    rating: 4.9,
    userRatingCount: 2,
  });
  const score = scoreAudit(neglectedPlace);
  const plan = deriveFixPlan(score);
  assert.equal(plan.length, 6);
  assert.ok(!plan.some((item) => item.dimension === 'attributes'));
});
