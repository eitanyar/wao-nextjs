import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, searchPlacesByName, mapPlace, getPlaceDetailsRaw } from './client';

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

test('getPlaceDetailsRaw: one GET to Place Details (New) with the given mask; status-only errors', async () => {
  const savedKey = process.env.PLACES_API_KEY;
  const savedFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  try {
    delete process.env.PLACES_API_KEY;
    await assert.rejects(() => getPlaceDetailsRaw('ChIJ-x', 'id'), /PLACES_API_KEY/);
    process.env.PLACES_API_KEY = 'synthetic-key';
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return url.includes('fail') ? new Response('secret echo', { status: 403 }) : Response.json({ id: 'ChIJ-x' });
    }) as typeof fetch;
    assert.deepEqual(await getPlaceDetailsRaw('ChIJ-x', 'id,displayName'), { id: 'ChIJ-x' });
    assert.equal(calls[0].url, 'https://places.googleapis.com/v1/places/ChIJ-x?languageCode=he&regionCode=IL');
    assert.equal(calls[0].init?.method, 'GET');
    assert.deepEqual(calls[0].init?.headers, { 'X-Goog-Api-Key': 'synthetic-key', 'X-Goog-FieldMask': 'id,displayName' });
    await assert.rejects(() => getPlaceDetailsRaw('fail/../x', 'id'), (error: Error) => error.message === 'Places details failed: 403');
    assert.equal(calls[1].url.startsWith('https://places.googleapis.com/v1/places/fail%2F..%2Fx?'), true);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) delete process.env.PLACES_API_KEY; else process.env.PLACES_API_KEY = savedKey;
  }
});
