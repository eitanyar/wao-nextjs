import test from 'node:test';
import assert from 'node:assert';

import { isWithinRefundWindow, calculateRefundableAmount } from './refund';

// ---------------------------------------------------------------------------
// isWithinRefundWindow
// ---------------------------------------------------------------------------

test('isWithinRefundWindow: within the 14-day standard window without the extended flag', () => {
  const joinedAt = '2026-07-01T00:00:00.000Z';
  const now = new Date('2026-07-10T00:00:00.000Z'); // 9 days in
  assert.strictEqual(isWithinRefundWindow(joinedAt, now, null), true);
});

test('isWithinRefundWindow: exactly at the 14-day boundary is still eligible', () => {
  const joinedAt = '2026-07-01T00:00:00.000Z';
  const now = new Date('2026-07-15T00:00:00.000Z'); // exactly 14 days
  assert.strictEqual(isWithinRefundWindow(joinedAt, now, null), true);
});

test('isWithinRefundWindow: past 14 days without the extended flag is ineligible', () => {
  const joinedAt = '2026-07-01T00:00:00.000Z';
  const now = new Date('2026-07-20T00:00:00.000Z'); // 19 days
  assert.strictEqual(isWithinRefundWindow(joinedAt, now, false), false);
  assert.strictEqual(isWithinRefundWindow(joinedAt, now, 0), false);
});

test('isWithinRefundWindow: past 14 days but within 4 months IS eligible when the extended flag is set', () => {
  const joinedAt = '2026-01-01T00:00:00.000Z';
  const now = new Date('2026-03-01T00:00:00.000Z'); // ~2 months in
  assert.strictEqual(isWithinRefundWindow(joinedAt, now, true), true);
  assert.strictEqual(isWithinRefundWindow(joinedAt, now, 1), true); // raw SQLite 0/1 form
});

test('isWithinRefundWindow: past 4 months is ineligible even with the extended flag set', () => {
  const joinedAt = '2026-01-01T00:00:00.000Z';
  const now = new Date('2026-08-01T00:00:00.000Z'); // ~7 months in
  assert.strictEqual(isWithinRefundWindow(joinedAt, now, true), false);
});

test('isWithinRefundWindow: invalid joined_at is treated as ineligible, not a throw', () => {
  assert.strictEqual(isWithinRefundWindow('not-a-date', new Date(), true), false);
});

// ---------------------------------------------------------------------------
// calculateRefundableAmount
// ---------------------------------------------------------------------------

test('calculateRefundableAmount: full refund when now is at/before periodStart', () => {
  const periodStart = '2026-07-01T00:00:00.000Z';
  const periodEnd = '2026-08-01T00:00:00.000Z';
  assert.strictEqual(calculateRefundableAmount(100, periodStart, periodEnd, new Date(periodStart)), 100);
});

test('calculateRefundableAmount: zero refund when now is at/after periodEnd (period fully consumed)', () => {
  const periodStart = '2026-07-01T00:00:00.000Z';
  const periodEnd = '2026-08-01T00:00:00.000Z';
  assert.strictEqual(calculateRefundableAmount(100, periodStart, periodEnd, new Date(periodEnd)), 0);
  assert.strictEqual(calculateRefundableAmount(100, periodStart, periodEnd, new Date('2026-09-01T00:00:00.000Z')), 0);
});

test('calculateRefundableAmount: straight-line pro-rata at the midpoint of the period', () => {
  const periodStart = '2026-07-01T00:00:00.000Z';
  const periodEnd = '2026-07-11T00:00:00.000Z'; // 10-day period
  const midpoint = new Date('2026-07-06T00:00:00.000Z'); // 5 days elapsed
  assert.strictEqual(calculateRefundableAmount(100, periodStart, periodEnd, midpoint), 50);
});

test('calculateRefundableAmount: a customer who consumed most of the period gets a refund trending to zero', () => {
  const periodStart = '2026-07-01T00:00:00.000Z';
  const periodEnd = '2026-08-01T00:00:00.000Z'; // ~31-day period
  const almostDone = new Date('2026-07-30T00:00:00.000Z'); // 29 of 31 days used
  const refundable = calculateRefundableAmount(310, periodStart, periodEnd, almostDone);
  assert.ok(refundable > 0 && refundable < 30, `expected a small residual refund, got ${refundable}`);
});

test('calculateRefundableAmount: rejects a periodEnd at or before periodStart', () => {
  assert.throws(() => calculateRefundableAmount(100, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z', new Date()));
  assert.throws(() => calculateRefundableAmount(100, '2026-07-11T00:00:00.000Z', '2026-07-01T00:00:00.000Z', new Date()));
});

test('calculateRefundableAmount: rejects a negative amountPaid', () => {
  assert.throws(() => calculateRefundableAmount(-1, '2026-07-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', new Date()));
});

test('calculateRefundableAmount: same formula applies regardless of which window is invoked (14-day vs 4-month) — the function has no window concept at all', () => {
  const periodStart = '2026-01-01T00:00:00.000Z';
  const periodEnd = '2026-02-01T00:00:00.000Z';
  const now = new Date('2026-01-08T00:00:00.000Z'); // 7 days into a 31-day period
  // Whether this call is being made because we're inside the 14-day window
  // or the extended 4-month window is irrelevant to the calculation itself —
  // there is no `window` parameter, by design.
  const refundable = calculateRefundableAmount(310, periodStart, periodEnd, now);
  assert.ok(refundable > 0 && refundable < 310);
});
