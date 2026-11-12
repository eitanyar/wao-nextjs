// Yonatan C4: the id-only place_id re-check. Never calls the real Places API: every test injects fetch.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CollectedData } from '../bot/prompts';
import { createPlaceIdChecker, placeIdRecheckDue, refreshPlaceId, PLACE_ID_RECHECK_MAX_AGE_MS, type PlaceIdCheck } from './placeIdRefresh';
import { googleProfileUrl } from '../lp/renderSitePages';

const PLACE = 'ChIJAbCdEfGhIjKlMnOpQrStUvW';
const NOW = new Date('2026-11-12T10:00:00.000Z');
const data = (extra: Partial<CollectedData> = {}): CollectedData => ({ businessName: 'TEST Biz', businessNiche: 'plumber', phone: '050-0000000', placeId: PLACE, ...extra });

function fakeFetch(status: number, body: unknown, calls: Array<{ url: string; init: RequestInit }> = []): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

describe('createPlaceIdChecker (id-only Place Details, injectable fetch)', () => {
  it('asks only for the id field, by place id, with the key header', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const result = await createPlaceIdChecker({ apiKey: 'k', fetchImpl: fakeFetch(200, { id: PLACE }, calls) })(PLACE);
    assert.deepEqual(result, { status: 'ok', placeId: PLACE });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `https://places.googleapis.com/v1/places/${PLACE}`);
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers['X-Goog-FieldMask'], 'id');
    assert.equal(headers['X-Goog-Api-Key'], 'k');
  });

  it('404 / NOT_FOUND -> not_found; other errors, no key or a network failure -> unknown (never throws)', async () => {
    assert.deepEqual(await createPlaceIdChecker({ apiKey: 'k', fetchImpl: fakeFetch(404, { error: { code: 404, status: 'NOT_FOUND' } }) })(PLACE), { status: 'not_found' });
    assert.deepEqual(await createPlaceIdChecker({ apiKey: 'k', fetchImpl: fakeFetch(400, { error: { status: 'NOT_FOUND' } }) })(PLACE), { status: 'not_found' });
    assert.equal((await createPlaceIdChecker({ apiKey: 'k', fetchImpl: fakeFetch(500, {}) })(PLACE)).status, 'unknown');
    assert.equal((await createPlaceIdChecker({ apiKey: 'k', fetchImpl: fakeFetch(429, { error: { status: 'RESOURCE_EXHAUSTED' } }) })(PLACE)).status, 'unknown');
    assert.equal((await createPlaceIdChecker({ apiKey: 'k', fetchImpl: (async () => { throw new Error('down'); }) as unknown as typeof fetch })(PLACE)).status, 'unknown');
    let called = false;
    const noKey = createPlaceIdChecker({ apiKey: '', fetchImpl: (async () => { called = true; throw new Error('x'); }) as unknown as typeof fetch });
    const saved = process.env.PLACES_API_KEY;
    delete process.env.PLACES_API_KEY;
    try { assert.deepEqual(await noKey(PLACE), { status: 'unknown', reason: 'no_api_key' }); } finally { if (saved !== undefined) process.env.PLACES_API_KEY = saved; }
    assert.equal(called, false);
  });
});

describe('refreshPlaceId (C4)', () => {
  const check = (result: PlaceIdCheck, calls: string[] = []) => async (id: string) => { calls.push(id); return result; };

  it('NOT_FOUND drops the place_id (so the link and sameAs drop) and flags the record for re-matching', async () => {
    const input = data();
    const { data: out } = await refreshPlaceId(input, check({ status: 'not_found' }), { force: true, now: NOW });
    assert.equal('placeId' in out, false);
    assert.equal(out.placeIdNeedsRematch, true);
    assert.equal(out.placeIdCheckedAt, NOW.toISOString());
    assert.equal(googleProfileUrl(out), '');
    assert.equal(input.placeId, PLACE, 'input not mutated');
  });

  it('ok keeps (or refreshes) the id and clears the flag; unknown changes nothing', async () => {
    const refreshed = 'ChIJZyXwVuTsRqPoNmLkJiHgFeD';
    const { data: out } = await refreshPlaceId(data({ placeIdNeedsRematch: true }), check({ status: 'ok', placeId: refreshed }), { force: true, now: NOW });
    assert.equal(out.placeId, refreshed);
    assert.equal('placeIdNeedsRematch' in out, false);
    const input = data();
    assert.equal((await refreshPlaceId(input, check({ status: 'unknown', reason: 'network' }), { force: true, now: NOW })).data, input);
  });

  it('a fixture or invalid id never reaches the API; without force, only when the last check is 12+ months old', async () => {
    const calls: string[] = [];
    for (const placeId of ['fixture-place-1', 'bad id', undefined]) await refreshPlaceId(data({ placeId }), check({ status: 'not_found' }, calls), { force: true, now: NOW });
    assert.deepEqual(calls, []);
    const recent = new Date(NOW.getTime() - PLACE_ID_RECHECK_MAX_AGE_MS + 1000).toISOString();
    const old = new Date(NOW.getTime() - PLACE_ID_RECHECK_MAX_AGE_MS).toISOString();
    assert.equal(placeIdRecheckDue(data({ placeIdCheckedAt: recent }), NOW), false);
    assert.equal(placeIdRecheckDue(data({ placeIdCheckedAt: old }), NOW), true);
    assert.equal(placeIdRecheckDue(data(), NOW), true);
    await refreshPlaceId(data({ placeIdCheckedAt: recent }), check({ status: 'not_found' }, calls), { now: NOW });
    assert.deepEqual(calls, []);
    await refreshPlaceId(data({ placeIdCheckedAt: old }), check({ status: 'not_found' }, calls), { now: NOW });
    assert.deepEqual(calls, [PLACE]);
  });
});

