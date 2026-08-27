import test from 'node:test';
import assert from 'node:assert/strict';
import { getRankBadgeStyle, getCardinalDirection, GRID_COPY } from './gridRankDisplay';

test('getRankBadgeStyle maps top 3 ranks correctly', () => {
  const s1 = getRankBadgeStyle(1);
  assert.equal(s1.tier, 'top3');
  assert.equal(s1.label, '#1');
  assert.equal(s1.color, '#22c55e');

  const s2 = getRankBadgeStyle(2);
  assert.equal(s2.tier, 'top3');
  assert.equal(s2.label, '#2');

  const s3 = getRankBadgeStyle(3);
  assert.equal(s3.tier, 'top3');
  assert.equal(s3.label, '#3');
});

test('getRankBadgeStyle maps mid ranks 4-10 correctly', () => {
  const s4 = getRankBadgeStyle(4);
  assert.equal(s4.tier, 'mid');
  assert.equal(s4.label, '#4');
  assert.equal(s4.color, '#f59e0b');

  const s10 = getRankBadgeStyle(10);
  assert.equal(s10.tier, 'mid');
  assert.equal(s10.label, '#10');
});

test('getRankBadgeStyle maps low ranks >10 and null correctly', () => {
  const s11 = getRankBadgeStyle(11);
  assert.equal(s11.tier, 'low');
  assert.equal(s11.label, '#11');
  assert.equal(s11.color, '#ef4444');

  const s20 = getRankBadgeStyle(20);
  assert.equal(s20.tier, 'low');
  assert.equal(s20.label, '#20');

  const sNull = getRankBadgeStyle(null);
  assert.equal(sNull.tier, 'low');
  assert.equal(sNull.label, '20+');
});

test('getCardinalDirection calculates cardinal points correctly', () => {
  assert.equal(getCardinalDirection(0), GRID_COPY.CARDINAL_N);
  assert.equal(getCardinalDirection(360), GRID_COPY.CARDINAL_N);
  assert.equal(getCardinalDirection(45), GRID_COPY.CARDINAL_NE);
  assert.equal(getCardinalDirection(90), GRID_COPY.CARDINAL_E);
  assert.equal(getCardinalDirection(135), GRID_COPY.CARDINAL_SE);
  assert.equal(getCardinalDirection(180), GRID_COPY.CARDINAL_S);
  assert.equal(getCardinalDirection(225), GRID_COPY.CARDINAL_SW);
  assert.equal(getCardinalDirection(270), GRID_COPY.CARDINAL_W);
  assert.equal(getCardinalDirection(315), GRID_COPY.CARDINAL_NW);
});
