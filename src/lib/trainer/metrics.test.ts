import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { computeMetrics } from './metrics';

// Test build compiles to CommonJS (see tsconfig.test.json) — __dirname is the
// ambient CJS global (dist/lib/trainer at runtime).

test('computeMetrics with empty transcript returns zeros', () => {
  const metrics = computeMetrics([]);
  assert.deepStrictEqual(metrics, {
    talkRatio: 0,
    avgUserTurnChars: 0,
    longestUserTurnChars: 0,
    questionCount: 0,
    questionRatio: 0,
    fillerCount: 0,
    fillerPer100Words: 0,
  });
});

test('computeMetrics with golden seed 2026-07-26-danny.json', () => {
  const seedPath = path.resolve(__dirname, '../../../data/trainer/seed/2026-07-26-danny.json');
  const raw = fs.readFileSync(seedPath, 'utf8');
  const session = JSON.parse(raw);

  const metrics = computeMetrics(session.transcript);

  console.log('Computed metrics for danny.json:', metrics);

  assert.strictEqual(metrics.talkRatio, 0.623);
  assert.strictEqual(metrics.avgUserTurnChars, 365);
  assert.strictEqual(metrics.longestUserTurnChars, 651);
  assert.strictEqual(metrics.questionCount, 5);
  assert.strictEqual(metrics.questionRatio, 0.625);
  assert.strictEqual(metrics.fillerCount, 3);
  assert.strictEqual(metrics.fillerPer100Words, 0.51);
});
