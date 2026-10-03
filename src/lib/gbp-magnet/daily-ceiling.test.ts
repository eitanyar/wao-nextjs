import assert from 'node:assert/strict';
import test from 'node:test';
import { reserveDailyPlacesCalls, resetDailyPlacesCounter } from './daily-ceiling';

const prior = process.env.GBP_MAGNET_DAILY_PLACES_CEILING;
test.after(() => {
  if (prior === undefined) delete process.env.GBP_MAGNET_DAILY_PLACES_CEILING;
  else process.env.GBP_MAGNET_DAILY_PLACES_CEILING = prior;
  resetDailyPlacesCounter();
});

test('daily counter reserves every call atomically and resets', () => {
  resetDailyPlacesCounter();
  process.env.GBP_MAGNET_DAILY_PLACES_CEILING = '2';
  assert.equal(reserveDailyPlacesCalls(2), true);
  assert.equal(reserveDailyPlacesCalls(1), false);
  assert.equal(reserveDailyPlacesCalls(0), false);
  resetDailyPlacesCounter();
  assert.equal(reserveDailyPlacesCalls(1), true);
});

test('invalid ceiling falls back to default 200 and reads env at call time', () => {
  for (const raw of ['0', '-1', '1.5', 'abc', '9007199254740992']) {
    resetDailyPlacesCounter();
    process.env.GBP_MAGNET_DAILY_PLACES_CEILING = raw;
    assert.equal(reserveDailyPlacesCalls(200), true);
    assert.equal(reserveDailyPlacesCalls(1), false);
  }
  resetDailyPlacesCounter();
  process.env.GBP_MAGNET_DAILY_PLACES_CEILING = '3';
  assert.equal(reserveDailyPlacesCalls(2), true);
  process.env.GBP_MAGNET_DAILY_PLACES_CEILING = '2';
  assert.equal(reserveDailyPlacesCalls(1), false);
});
