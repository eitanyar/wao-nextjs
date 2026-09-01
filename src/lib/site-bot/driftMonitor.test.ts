import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  calculateAuditDrift,
  saveDriftReport,
  readDriftReport,
  type DriftReport,
} from './driftMonitor';

test('calculateAuditDrift calculates score deltas, rating gains, and review velocity', () => {
  const baseline = {
    auditId: '11111111-2222-3333-4444-555555555555',
    scorecard: { passed: 2, total: 6, failed: 4 },
    place: {
      displayName: 'Quick Plumber TLV',
      primaryType: 'plumber',
      types: ['plumber'],
      rating: 4.2,
      userRatingCount: 8,
      regularOpeningHours: { periods: [] },
    },
  };

  const current = {
    auditId: '11111111-2222-3333-4444-555555555555',
    scorecard: { passed: 5, total: 6, failed: 1 },
    place: {
      displayName: 'Quick Plumber TLV',
      primaryType: 'plumber',
      types: ['plumber'],
      rating: 4.8,
      userRatingCount: 15,
      regularOpeningHours: { periods: [] },
    },
  };

  const report: DriftReport = calculateAuditDrift(baseline, current);

  assert.equal(report.auditId, '11111111-2222-3333-4444-555555555555');
  assert.equal(report.baselineScore, 2);
  assert.equal(report.currentScore, 5);
  assert.equal(report.scoreDelta, 3);
  assert.equal(report.newReviewsCount, 7);
  assert.equal(report.ratingDelta, 0.6);
  assert.equal(report.categoryDrift, false);
  assert.equal(report.hoursDrift, false);
  assert.ok(report.generatedAt);
});

test('calculateAuditDrift detects category and hours drift', () => {
  const baseline = {
    auditId: '22222222-3333-4444-5555-666666666666',
    score: 3,
    place: {
      displayName: 'Electrician TLV',
      primaryType: 'electrician',
      types: ['electrician'],
      rating: 4.5,
      userRatingCount: 10,
      regularOpeningHours: { periods: [{ day: 1, open: '08:00', close: '17:00' }] },
      specialOpeningHours: [],
    },
  };

  const current = {
    auditId: '22222222-3333-4444-5555-666666666666',
    score: 4,
    place: {
      displayName: 'Electrician & HVAC TLV',
      primaryType: 'hvac_contractor',
      types: ['electrician', 'hvac_contractor'],
      rating: 4.5,
      userRatingCount: 10,
      regularOpeningHours: { periods: [{ day: 1, open: '07:00', close: '19:00' }] },
      specialOpeningHours: [{ date: '2026-09-15' }],
    },
  };

  const report = calculateAuditDrift(baseline, current);

  assert.equal(report.scoreDelta, 1);
  assert.equal(report.categoryDrift, true);
  assert.equal(report.hoursDrift, true);
  assert.equal(report.newReviewsCount, 0);
  assert.equal(report.ratingDelta, 0);
});

test('calculateAuditDrift handles empty or identical audits cleanly', () => {
  const audit = {
    auditId: '33333333-4444-5555-6666-777777777777',
    scorecard: { passed: 4 },
    place: {
      primaryType: 'locksmith',
      types: ['locksmith'],
      rating: 5.0,
      userRatingCount: 20,
    },
  };

  const report = calculateAuditDrift(audit, audit);

  assert.equal(report.scoreDelta, 0);
  assert.equal(report.newReviewsCount, 0);
  assert.equal(report.ratingDelta, 0);
  assert.equal(report.categoryDrift, false);
  assert.equal(report.hoursDrift, false);
});

test('saveDriftReport and readDriftReport persist and load drift data correctly', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driftMonitor-test-'));
  const auditId = '44444444-5555-6666-7777-888888888888';

  try {
    const report: DriftReport = {
      auditId,
      baselineScore: 2,
      currentScore: 5,
      scoreDelta: 3,
      newReviewsCount: 5,
      ratingDelta: 0.4,
      categoryDrift: false,
      hoursDrift: true,
      generatedAt: new Date().toISOString(),
    };

    const saved = saveDriftReport(auditId, report, tmpDir);
    assert.equal(saved, true);

    const loaded = readDriftReport(auditId, tmpDir);
    assert.ok(loaded);
    assert.equal(loaded.auditId, auditId);
    assert.equal(loaded.scoreDelta, 3);
    assert.equal(loaded.newReviewsCount, 5);
    assert.equal(loaded.hoursDrift, true);
    assert.equal(loaded.categoryDrift, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
