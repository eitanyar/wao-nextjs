import assert from 'node:assert/strict';
import test   from 'node:test';
import {
  textSearch,
  placeDetails,
  recentPace,
  buildEntrySignals,
  PLACES_BASE,
} from './places-client.mjs';
import { formatEntry, renderEntryBlock } from '../gbp-comparison-report.mjs';

// ── fixtures ─────────────────────────────────────────────────────────────
const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;
function isoDaysAgo(days) {
  return new Date(now - days * DAY).toISOString();
}

const FIXTURE_DETAILS = {
  id: 'ChIJ-fixture-1',
  displayName: { text: 'גליל אינסטלציה' },
  rating: 4.7,
  userRatingCount: 132,
  reviews: [
    { publishTime: isoDaysAgo(5) },
    { publishTime: isoDaysAgo(20) },
    { publishTime: isoDaysAgo(45) },
    { publishTime: isoDaysAgo(80) },
    { publishTime: isoDaysAgo(200) },
  ],
  formattedAddress: 'רחוב הדוגמה 1, חיפה',
};

const FIXTURE_NO_RATING = {
  id: 'ChIJ-fixture-2',
  displayName: { text: 'מתחרה ללא דירוג' },
  userRatingCount: 0,
  reviews: [],
};

// ── recentPace() ─────────────────────────────────────────────────────────
test('recentPace() buckets reviews correctly by age (30/60/90 days)', () => {
  const pace = recentPace(FIXTURE_DETAILS.reviews);
  assert.deepEqual(pace, { d30: 2, d60: 3, d90: 4 });
});

test('recentPace() with no reviews returns all-zero counts', () => {
  assert.deepEqual(recentPace([]), { d30: 0, d60: 0, d90: 0 });
  assert.deepEqual(recentPace(undefined), { d30: 0, d60: 0, d90: 0 });
});

test('recentPace() skips reviews with no publishTime', () => {
  const pace = recentPace([{ }, { publishTime: isoDaysAgo(1) }]);
  assert.deepEqual(pace, { d30: 1, d60: 1, d90: 1 });
});

// ── buildEntrySignals() — the GbpSignals shape (readiness-gate.md §3) ─────
test('buildEntrySignals() returns the structured GbpSignals shape (numeric rating, no label)', () => {
  const signals = buildEntrySignals(FIXTURE_DETAILS);
  assert.deepEqual(signals, {
    rating: 4.7,
    reviewCount: 132,
    recentPace: { d30: 2, d60: 3, d90: 4 },
    sampleSize: 5,
  });
});

test('buildEntrySignals() surfaces a null rating (not a formatted string) when the place has no rating', () => {
  const signals = buildEntrySignals(FIXTURE_NO_RATING);
  assert.equal(signals.rating, null);
  assert.equal(signals.reviewCount, 0);
  assert.equal(signals.sampleSize, 0);
});

// ── textSearch() / placeDetails() — injected fetchImpl, no live network ──
test('textSearch() posts the expected request shape and returns places[]', async () => {
  let capturedUrl, capturedInit;
  const fetchImpl = async (url, init) => {
    capturedUrl = url;
    capturedInit = init;
    return {
      ok: true,
      json: async () => ({ places: [{ id: 'abc', displayName: { text: 'x' } }] }),
    };
  };

  const results = await textSearch('FAKE_KEY', 'אינסטלטור בחיפה', { maxResults: 3, fetchImpl });

  assert.equal(capturedUrl, `${PLACES_BASE}/places:searchText`);
  assert.equal(capturedInit.method, 'POST');
  assert.equal(capturedInit.headers['X-Goog-Api-Key'], 'FAKE_KEY');
  const body = JSON.parse(capturedInit.body);
  assert.equal(body.textQuery, 'אינסטלטור בחיפה');
  assert.equal(body.maxResultCount, 3);
  assert.deepEqual(results, [{ id: 'abc', displayName: { text: 'x' } }]);
});

test('textSearch() throws with the response body on a non-ok response', async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, text: async () => 'quota exceeded' });
  await assert.rejects(
    () => textSearch('FAKE_KEY', 'q', { fetchImpl }),
    /Text Search failed \(429\).*quota exceeded/,
  );
});

test('placeDetails() requests the approved field mask only', async () => {
  let capturedInit;
  const fetchImpl = async (_url, init) => {
    capturedInit = init;
    return { ok: true, json: async () => FIXTURE_DETAILS };
  };
  const details = await placeDetails('FAKE_KEY', 'ChIJ-fixture-1', { fetchImpl });
  assert.equal(
    capturedInit.headers['X-Goog-FieldMask'],
    'id,displayName,rating,userRatingCount,reviews,formattedAddress',
  );
  assert.deepEqual(details, FIXTURE_DETAILS);
});

// ── Test #1 (readiness-gate.md §10.1, §10.5) ──────────────────────────────
// Regression guard proving the §4 extraction changed nothing about the
// magnet's shipped rendering. formatEntry()/renderEntryBlock() are pure and
// side-effect-free (no network, no argv, no process.exit), so they're
// exercised directly against a fixed fixture rather than spawning main() —
// main() is argv/env/network-coupled and unsafe to invoke in a unit test.
// The expected values below are the pre-refactor formula, computed by hand
// from the same fixture (rating.toFixed(1), count, and the 30/60/90 pace
// bucket), not re-derived through the new code path — so this test would
// fail if the extraction silently changed rounding, field names, or the
// rendered block's text/emoji layout.
test('formatEntry()+renderEntryBlock() output is unchanged after the places-client extraction (byte-for-byte fixture check)', () => {
  const entry = formatEntry('גליל אינסטלציה', FIXTURE_DETAILS);
  assert.deepEqual(entry, {
    name: 'גליל אינסטלציה',
    rating: '4.7',
    count: 132,
    pace: { d30: 2, d60: 3, d90: 4 },
    sampleSize: 5,
  });

  const block = renderEntryBlock(entry, true);
  assert.equal(
    block,
    [
      '🏢 גליל אינסטלציה (העסק שלך)',
      '⭐ 4.7 מתוך 5  |  💬 132 ביקורות בסך הכל',
      '📈 קצב אחרון (מדגם של 5 ביקורות): 2 ב-30 יום | 3 ב-60 יום | 4 ב-90 יום',
    ].join('\n'),
  );
});

test('formatEntry() falls back to "אין דירוג" for an unrated competitor, matching the pre-refactor formula', () => {
  const entry = formatEntry('מתחרה ללא דירוג', FIXTURE_NO_RATING);
  assert.equal(entry.rating, 'אין דירוג');
  assert.equal(entry.count, 0);
  assert.equal(entry.sampleSize, 0);
});
