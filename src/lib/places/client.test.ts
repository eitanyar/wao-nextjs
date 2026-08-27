import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, searchPlacesByName, mapPlace } from './client';

// Pure-helper tests only — no network calls, no PLACES_API_KEY required.
// Fixtures: Latin script only (spec 2026-08-25_001 HEBREW-SAFETY banner).

test('mapPlace maps location coordinates correctly', () => {
  const raw = {
    id: 'places/ChIJ123',
    displayName: { text: 'Test Business' },
    formattedAddress: 'Tel Aviv, Israel',
    location: { latitude: 32.0853, longitude: 34.7818 },
  };
  const mapped = mapPlace(raw);
  assert.deepEqual(mapped.location, { lat: 32.0853, lng: 34.7818 });
});

test('normalizePhone strips separators from a local mobile number', () => {
  assert.equal(normalizePhone('052-1234567'), '0521234567');
});

test('normalizePhone rewrites international 972 form to local 0 form', () => {
  assert.equal(normalizePhone('+972-52-123-4567'), '0521234567');
});

test('normalizePhone keeps landline digits intact', () => {
  assert.equal(normalizePhone('03-1234567'), '031234567');
});

test('normalizePhone returns empty string when input has no digits', () => {
  assert.equal(normalizePhone('abc'), '');
});

test('searchPlacesByName throws synchronously without PLACES_API_KEY', async () => {
  const saved = process.env.PLACES_API_KEY;
  delete process.env.PLACES_API_KEY;
  try {
    await assert.rejects(
      () => searchPlacesByName({ name: 'Fixture Test Business' }),
      /Places API key not configured \(PLACES_API_KEY\)/
    );
  } finally {
    if (saved !== undefined) process.env.PLACES_API_KEY = saved;
  }
});
