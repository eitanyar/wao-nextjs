import assert from 'node:assert/strict';
import test   from 'node:test';
import {
  scoreAdsFit,
  ADMISSION_PILOT_MIN_SCORE,
  ADMISSION_CONDITIONAL_MIN_SCORE,
  ADMISSION_MAX_SCORE,
} from './ads-fit-scorecard.mjs';

// ── admission thresholds (pilot-client-gating.md) ──────────────────────────
test('constants: thresholds match pilot-client-gating.md (>=12 pilot, 9-11 conditional, max 16)', () => {
  assert.equal(ADMISSION_PILOT_MIN_SCORE, 12);
  assert.equal(ADMISSION_CONDITIONAL_MIN_SCORE, 9);
  assert.equal(ADMISSION_MAX_SCORE, 16);
});

test('scoreAdsFit: totalScore >= 12 with full manual signals and no hard-fail -> pilot', () => {
  const result = scoreAdsFit({
    gbp: { rating: 4.8, reviewCount: 40 }, // reputation = 2
    category: 'אינסטלטור', // tier 1 = 2
    manual: {
      demandScore: 2, unitEconomicsScore: 2, budgetFloorScore: 2,
      auctionSanityScore: 2, serviceRadiusScore: 2, capacityOk: true,
    },
  });
  assert.equal(result.totalScore, 16);
  assert.equal(result.hardFail, false);
  assert.equal(result.admission, 'pilot');
});

test('scoreAdsFit: totalScore in [9,11] with no hard-fail -> conditional', () => {
  const result = scoreAdsFit({
    gbp: { rating: 3.5, reviewCount: 2 }, // reputation = 0
    category: 'רואה חשבון', // tier 2 = 1
    manual: {
      demandScore: 2, unitEconomicsScore: 1, budgetFloorScore: 2,
      auctionSanityScore: 1, serviceRadiusScore: 2, capacityOk: true,
    },
  });
  // reputation 0 + tier 1 + demand 2 + unitEcon 1 + budget 2 + capacity 2 + auction 1 + radius 2 = 11
  assert.equal(result.totalScore, 11);
  assert.equal(result.hardFail, false);
  assert.equal(result.admission, 'conditional');
});

test('scoreAdsFit: totalScore < 9 with no hard-fail -> decline-or-site-only', () => {
  const result = scoreAdsFit({
    gbp: { rating: 3.2, reviewCount: 1 }, // reputation = 0
    category: 'מאמן', // tier 3 = 0
    manual: {
      demandScore: 0, unitEconomicsScore: 1, budgetFloorScore: 0,
      auctionSanityScore: 0, serviceRadiusScore: 0, capacityOk: true,
    },
  });
  // reputation 0 + tier 0 + demand 0 + unitEcon 1 + budget 0 + capacity 2 + auction 0 + radius 0 = 3
  assert.equal(result.totalScore, 3);
  assert.equal(result.hardFail, false);
  assert.equal(result.admission, 'decline-or-site-only');
});

test('scoreAdsFit: a would-be pilot score (>=12) is downgraded to decline by a hard-fail signal', () => {
  const result = scoreAdsFit({
    gbp: { rating: 4.8, reviewCount: 40 }, // reputation = 2
    category: 'אינסטלטור', // tier 1 = 2
    manual: {
      demandScore: 2, unitEconomicsScore: 2, budgetFloorScore: 2,
      auctionSanityScore: 2, serviceRadiusScore: 2,
      capacityOk: true, budgetHardFail: true,
    },
  });
  assert.ok(result.totalScore >= ADMISSION_PILOT_MIN_SCORE);
  assert.equal(result.hardFail, true);
  assert.equal(result.admission, 'decline-or-site-only');
});

// ── hard-fail signals ───────────────────────────────────────────────────────
test('scoreAdsFit: budgetHardFail=true is a hard fail regardless of totalScore', () => {
  const result = scoreAdsFit({
    gbp: { rating: 4.8, reviewCount: 40 },
    category: 'אינסטלטור',
    manual: {
      demandScore: 2, unitEconomicsScore: 2, budgetFloorScore: 2,
      auctionSanityScore: 2, serviceRadiusScore: 2,
      capacityOk: true, budgetHardFail: true,
    },
  });
  assert.equal(result.hardFail, true);
  assert.equal(result.admission, 'decline-or-site-only');
});

test('scoreAdsFit: capacityOk=false is a hard fail regardless of totalScore', () => {
  const result = scoreAdsFit({
    gbp: { rating: 4.8, reviewCount: 40 },
    category: 'אינסטלטור',
    manual: {
      demandScore: 2, unitEconomicsScore: 2, budgetFloorScore: 2,
      auctionSanityScore: 2, serviceRadiusScore: 2, capacityOk: false,
    },
  });
  assert.equal(result.hardFail, true);
  assert.equal(result.admission, 'decline-or-site-only');
  // capacityOk===false also scores 0 on the capacity signal itself
  assert.equal(result.signals.capacity, 0);
});

test('scoreAdsFit: capacityOk=true scores 2 on the capacity signal (not just non-hard-fail)', () => {
  const result = scoreAdsFit({
    gbp: { rating: 4.8, reviewCount: 40 },
    category: 'אינסטלטור',
    manual: { capacityOk: true },
  });
  assert.equal(result.signals.capacity, 2);
  assert.equal(result.hardFail, false);
});

// ── signal 4 — reputation floor, auto-scored from GbpSignals ───────────────
test('reputationFloorScore (via signal 4): rating>=4.0 and reviewCount>=10 -> 2', () => {
  const result = scoreAdsFit({ gbp: { rating: 4.0, reviewCount: 10 }, category: 'אינסטלטור' });
  assert.equal(result.signals.reputationFloor, 2);
});

test('reputationFloorScore (via signal 4): rating>=4.0 but reviewCount<10 -> 1', () => {
  const result = scoreAdsFit({ gbp: { rating: 4.2, reviewCount: 9 }, category: 'אינסטלטור' });
  assert.equal(result.signals.reputationFloor, 1);
});

test('reputationFloorScore (via signal 4): rating<4.0 -> 0', () => {
  const result = scoreAdsFit({ gbp: { rating: 3.9, reviewCount: 50 }, category: 'אינסטלטור' });
  assert.equal(result.signals.reputationFloor, 0);
});

test('reputationFloorScore (via signal 4): no GBP profile / non-numeric rating -> 0', () => {
  const result1 = scoreAdsFit({ gbp: null, category: 'אינסטלטור' });
  assert.equal(result1.signals.reputationFloor, 0);
  const result2 = scoreAdsFit({ gbp: { rating: null, reviewCount: 0 }, category: 'אינסטלטור' });
  assert.equal(result2.signals.reputationFloor, 0);
});

// ── signal 8 — AI-resistance tier, static lookup ────────────────────────────
test('aiResistanceTierScore (via signal 8): Tier 1 physical trade (plumber) -> 2', () => {
  const result = scoreAdsFit({ gbp: {}, category: 'אינסטלטור' });
  assert.equal(result.signals.aiResistanceTier, 2);
});

test('aiResistanceTierScore (via signal 8): Tier 2 content-ready SMB (accountant) -> 1', () => {
  const result = scoreAdsFit({ gbp: {}, category: 'רואה חשבון' });
  assert.equal(result.signals.aiResistanceTier, 1);
});

test('aiResistanceTierScore (via signal 8): Tier 3 coach/consultant -> 0', () => {
  const result = scoreAdsFit({ gbp: {}, category: 'מאמן עסקי' });
  assert.equal(result.signals.aiResistanceTier, 0);
});

test('aiResistanceTierScore (via signal 8): unclassified category -> null (not silently 0)', () => {
  const result = scoreAdsFit({ gbp: {}, category: 'משהו שלא קיים' });
  assert.equal(result.signals.aiResistanceTier, null);
});

// Regression: dentist/physio must score as Tier 2 (1), not Tier 1 (2) —
// per pilot-client-gating.md's CPC band table (Band C lists dental/medical/
// physio under Tier 2) and readiness-gate.md §2.4's content-ready-SMB
// archetype (clinic/physiotherapist/dentist = content-ready-SMB = Tier 2).
// Before the fix these three keywords lived in TIER_1_KEYWORDS, which could
// flip a borderline dental/physio candidate from conditional into pilot.
test('aiResistanceTierScore (via signal 8) — REGRESSION: physiotherapist scores Tier 2 (1), not Tier 1 (2)', () => {
  const result = scoreAdsFit({ gbp: {}, category: 'פיזיותרפיה' });
  assert.equal(result.signals.aiResistanceTier, 1);
});

test('aiResistanceTierScore (via signal 8) — REGRESSION: dentist ("רופא שיניים") scores Tier 2 (1), not Tier 1 (2)', () => {
  const result = scoreAdsFit({ gbp: {}, category: 'רופא שיניים' });
  assert.equal(result.signals.aiResistanceTier, 1);
});

test('aiResistanceTierScore (via signal 8) — REGRESSION: generic "שיניים" (dental) scores Tier 2 (1), not Tier 1 (2)', () => {
  const result = scoreAdsFit({ gbp: {}, category: 'מרפאת שיניים' });
  assert.equal(result.signals.aiResistanceTier, 1);
});

test('aiResistanceTierScore (via signal 8) — a borderline dental candidate no longer flips from conditional into pilot', () => {
  // Same manual inputs as the mid-range "conditional" fixture above, but with
  // the dentist category swapped in for the accountant category. Both are
  // Tier 2 = 1 point, so the outcome must stay identical (conditional, 11),
  // not jump to 12 (pilot) as it would have pre-fix at Tier 1 = 2 points.
  const result = scoreAdsFit({
    gbp: { rating: 3.5, reviewCount: 2 }, // reputation = 0
    category: 'רופא שיניים', // tier 2 = 1 (post-fix)
    manual: {
      demandScore: 2, unitEconomicsScore: 1, budgetFloorScore: 2,
      auctionSanityScore: 1, serviceRadiusScore: 2, capacityOk: true,
    },
  });
  assert.equal(result.signals.aiResistanceTier, 1);
  assert.equal(result.totalScore, 11);
  assert.equal(result.admission, 'conditional');
  assert.ok(result.totalScore < ADMISSION_PILOT_MIN_SCORE);
});

// ── signalsSource / weakestSignal ───────────────────────────────────────────
test('scoreAdsFit: no manual signals supplied -> signalsSource "not-yet-scored", never a real admission verdict', () => {
  const result = scoreAdsFit({ gbp: { rating: 4.8, reviewCount: 40 }, category: 'אינסטלטור' });
  assert.equal(result.signalsSource, 'not-yet-scored');
  assert.equal(result.admission, 'decline-or-site-only');
});

test('scoreAdsFit: at least one manual signal supplied -> signalsSource "partial-manual"', () => {
  const result = scoreAdsFit({
    gbp: { rating: 4.8, reviewCount: 40 },
    category: 'אינסטלטור',
    manual: { demandScore: 2 },
  });
  assert.equal(result.signalsSource, 'partial-manual');
});

test('scoreAdsFit: weakestSignal picks the lowest-scored, non-null signal', () => {
  const result = scoreAdsFit({
    gbp: { rating: 3.9, reviewCount: 50 }, // reputation = 0 (weakest)
    category: 'אינסטלטור', // tier 1 = 2
    manual: { demandScore: 2, capacityOk: true },
  });
  assert.equal(result.signals.reputationFloor, 0);
  assert.equal(result.weakestSignal, 'reputationFloor');
});
