import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFixtureSnapshot,
  mapPlaceDetailsToSnapshot,
  periodsToBusinessHours,
  PREFILL_DETAILS_FIELD_MASK,
  type PrefillPeriod,
} from './placePrefill';
import { parseBusinessHours } from '../lp/businessHours';

const day = (d: number, open: [number, number], close: [number, number], closeDay = d): PrefillPeriod => ({
  open: { day: d, hour: open[0], minute: open[1] },
  close: { day: closeDay, hour: close[0], minute: close[1] },
});

describe('placePrefill: field mask', () => {
  it('requests exactly the M1 snapshot fields, unprefixed, at the Enterprise SKU with no rating or review content', () => {
    assert.deepEqual(PREFILL_DETAILS_FIELD_MASK.split(','), ['id', 'displayName', 'formattedAddress', 'addressComponents',
      'nationalPhoneNumber', 'internationalPhoneNumber', 'primaryType', 'primaryTypeDisplayName', 'types', 'regularOpeningHours', 'websiteUri']);
    for (const forbidden of ['places.', 'review', 'rating', 'RatingCount', 'photos', 'editorialSummary']) {
      assert.equal(PREFILL_DETAILS_FIELD_MASK.includes(forbidden), false, forbidden);
    }
  });
});

describe('placePrefill: mapPlaceDetailsToSnapshot', () => {
  const raw = {
    id: 'ChIJ-synthetic-1',
    displayName: { text: 'Synthetic Plumbing' },
    formattedAddress: '1 Synthetic St, Synthetic City',
    addressComponents: [{ types: ['route'], longText: 'Synthetic St' }, { types: ['locality', 'political'], longText: 'Synthetic City' }],
    nationalPhoneNumber: '03-555-0100',
    internationalPhoneNumber: '+972 3-555-0100',
    primaryType: 'plumber',
    primaryTypeDisplayName: { text: 'Plumber' },
    types: ['plumber', 'establishment', 7],
    regularOpeningHours: { periods: [{ open: { day: 0, hour: 8, minute: 0 }, close: { day: 0, hour: 17, minute: 30 } }, { open: { day: 9 } }] },
    websiteUri: 'https://www.synthetic-plumbing.example/home',
    rating: 4.7,
    userRatingCount: 12,
    reviews: Array.from({ length: 7 }, (_, i) => ({ rating: 5, text: { text: `translated ${i}` }, originalText: { text: `original ${i}` } })),
    editorialSummary: { text: 'never mapped' },
  };

  it('maps the snapshot fields and never carries rating or review content', () => {
    const snapshot = mapPlaceDetailsToSnapshot(raw, 'ChIJ-synthetic-1');
    assert.equal(snapshot.placeId, 'ChIJ-synthetic-1');
    assert.equal(snapshot.displayName, 'Synthetic Plumbing');
    assert.equal(snapshot.city, 'Synthetic City');
    assert.equal(snapshot.nationalPhoneNumber, '03-555-0100');
    assert.equal(snapshot.primaryTypeDisplayName, 'Plumber');
    assert.deepEqual(snapshot.types, ['plumber', 'establishment']);
    assert.deepEqual(snapshot.regularOpeningHours, { periods: [{ open: { day: 0, hour: 8, minute: 0 }, close: { day: 0, hour: 17, minute: 30 } }] });
    assert.equal(snapshot.websiteUri, 'https://www.synthetic-plumbing.example/home');
    for (const key of ['rating', 'userRatingCount', 'reviews', 'editorialSummary']) assert.equal(key in snapshot, false, key);
  });

  it('rejects a response for another place id', () => {
    assert.throws(() => mapPlaceDetailsToSnapshot(raw, 'ChIJ-other'), /mismatch/);
    assert.throws(() => mapPlaceDetailsToSnapshot(null, 'ChIJ-synthetic-1'), /mismatch/);
  });

  it('drops non-http websites', () => {
    assert.equal(mapPlaceDetailsToSnapshot({ ...raw, websiteUri: 'javascript:alert(1)' }, 'ChIJ-synthetic-1').websiteUri, undefined);
  });
});

describe('placePrefill: periodsToBusinessHours', () => {
  it('groups contiguous days into the owner-hours format the renderer parses', () => {
    const periods = [0, 1, 2, 3, 4].map(d => day(d, [8, 0], [18, 0])).concat([day(5, [8, 0], [13, 0])]);
    const hours = periodsToBusinessHours(periods);
    assert.equal(hours, 'Sun-Thu 08:00-18:00, Fri 08:00-13:00');
    assert.ok(parseBusinessHours(hours));
  });

  it('keeps split shifts and single days', () => {
    const hours = periodsToBusinessHours([day(0, [8, 0], [12, 0]), day(0, [16, 0], [20, 0]), day(1, [8, 0], [12, 0]), day(1, [16, 0], [20, 0]), day(3, [9, 30], [14, 0])]);
    assert.equal(hours, 'Sun-Mon 08:00-12:00, Sun-Mon 16:00-20:00, Wed 09:30-14:00');
    assert.ok(parseBusinessHours(hours));
  });

  it('handles open 24/7 and a close at midnight', () => {
    assert.equal(periodsToBusinessHours([{ open: { day: 0, hour: 0, minute: 0 } }]), 'Sun-Sat 00:00-24:00');
    assert.equal(periodsToBusinessHours([day(5, [18, 0], [0, 0], 6)]), 'Fri 18:00-24:00');
  });

  it('returns undefined (no hours rather than wrong hours) for overnight, open-ended or empty periods', () => {
    assert.equal(periodsToBusinessHours([day(5, [20, 0], [2, 0], 6)]), undefined);
    assert.equal(periodsToBusinessHours([{ open: { day: 2, hour: 9, minute: 0 } }]), undefined);
    assert.equal(periodsToBusinessHours([]), undefined);
    assert.equal(periodsToBusinessHours(undefined), undefined);
  });
});

describe('placePrefill: buildFixtureSnapshot', () => {
  it('is deterministic, ASCII-only and keeps the candidate identity', () => {
    const candidate = { placeId: 'fixture-place-1', displayName: 'Synthetic Business', formattedAddress: 'Synthetic Address' };
    const snapshot = buildFixtureSnapshot(candidate);
    assert.deepEqual(snapshot, buildFixtureSnapshot(candidate));
    assert.equal(snapshot.placeId, 'fixture-place-1');
    assert.equal(snapshot.displayName, 'Synthetic Business');
    assert.ok([...JSON.stringify(snapshot)].every(ch => ch.charCodeAt(0) < 128));
    assert.equal(periodsToBusinessHours(snapshot.regularOpeningHours?.periods), 'Sun-Thu 08:00-18:00, Fri 08:00-13:00');
  });
  it('simulates a Places failure for fixture-fail ids', () => {
    assert.throws(() => buildFixtureSnapshot({ placeId: 'fixture-fail-1', displayName: 'x', formattedAddress: 'y' }));
  });
});
