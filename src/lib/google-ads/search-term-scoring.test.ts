import assert from 'node:assert/strict';
import test from 'node:test';
import {
  scoreSearchTerms,
  MIN_IMPRESSIONS_ELIGIBLE,
  HIGH_CONFIDENCE_IMPRESSIONS,
  MAX_TERMS_PER_TASK,
  type SearchTermReportRow,
  type AdGroupBaseline,
} from './search-term-scoring';

const AD_GROUP = 'ag1';

function row(overrides: Partial<SearchTermReportRow>): SearchTermReportRow {
  return {
    searchTerm: 'test term',
    adGroupId: AD_GROUP,
    adGroupResourceName: 'customers/123/adGroups/1',
    campaignId: 'c1',
    campaignName: 'Search - Non Brand',
    impressions: 100,
    clicks: 3,
    costMicros: 10_000_000,
    conversions: 0,
    triggeringMatchType: 'BROAD',
    ...overrides,
  };
}

const baselineHighCtr: AdGroupBaseline = { ctr: 0.1, positiveKeywordTokens: ['nlp', 'קורס', 'פרקטישנר'] };

function baselinesMap(b: AdGroupBaseline = baselineHighCtr): Map<string, AdGroupBaseline> {
  return new Map([[AD_GROUP, b]]);
}

// -------------------------------------------------------------------------------------
// Eligibility gate boundary (19 / 20 / 49 / 50 impressions)
// -------------------------------------------------------------------------------------

test('eligibility gate: 19 impressions is excluded entirely, no CUT no WATCH', () => {
  const rows = [row({ impressions: 19, clicks: 5, costMicros: 100_000_000, conversions: 0 })];
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    wastedSpend: { trailingAvgCplIls: 20 },
  });
  assert.equal(scored.length, 0);
});

test('eligibility gate: exactly 20 impressions is eligible (low confidence)', () => {
  const rows = [row({ impressions: 20, clicks: 6, costMicros: 100_000_000, conversions: 0 })];
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    wastedSpend: { trailingAvgCplIls: 20 }, // cut bar = 40; cost=100 clears it
  });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].confidence, 'low');
});

test('confidence banding: 49 impressions is still low-confidence, wasted-spend CUT downgraded to WATCH', () => {
  const rows = [row({ impressions: 49, clicks: 6, costMicros: 100_000_000, conversions: 0 })];
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    wastedSpend: { trailingAvgCplIls: 20 }, // cut bar = 40, cost=100 clears it -> would be CUT if high confidence
  });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].confidence, 'low');
  assert.equal(scored[0].verdict, 'WATCH');
});

test('confidence banding: exactly 50 impressions is high-confidence, wasted-spend CUT stands', () => {
  const rows = [row({ impressions: 50, clicks: 6, costMicros: 100_000_000, conversions: 0 })];
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    wastedSpend: { trailingAvgCplIls: 20 },
  });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].confidence, 'high');
  assert.equal(scored[0].verdict, 'CUT');
});

// -------------------------------------------------------------------------------------
// CTR floor with/without backstop
// -------------------------------------------------------------------------------------

test('CTR_LOW fires when relative AND absolute-backstop both fail the term (soft flag -> WATCH alone)', () => {
  // baseline ctr 10%, term ctr 3/100=3% -> 3% <= 40%*10%=4% AND 3% < 3%? no, 0.03 < 0.03 is false.
  // Use a term with ctr 2% so it's strictly below the 3% backstop too.
  const rows = [row({ impressions: 100, clicks: 2, costMicros: 1, conversions: 0 })];
  const scored = scoreSearchTerms({ rows, baselines: baselinesMap(), wastedSpend: {} });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].verdict, 'WATCH');
  assert.match(scored[0].reasons.join(' '), /CTR/);
});

test('CTR relative floor without absolute backstop breach does NOT flag (ad-group is just high-performing)', () => {
  // baseline ctr 10%, term ctr = 3.5% -> below 40% of baseline (4%) but NOT below 3% absolute backstop.
  const rows = [row({ impressions: 1000, clicks: 35, costMicros: 1, conversions: 0 })];
  const scored = scoreSearchTerms({ rows, baselines: baselinesMap(), wastedSpend: {} });
  assert.equal(scored.length, 0);
});

test('CTR_LOW never fires below high-confidence floor (20-49 impressions), even if both thresholds are breached', () => {
  const rows = [row({ impressions: 30, clicks: 0, costMicros: 1, conversions: 0 })];
  const scored = scoreSearchTerms({ rows, baselines: baselinesMap(), wastedSpend: {} });
  assert.equal(scored.length, 0); // ctrLow requires confidence === 'high'; no other flags fire either
});

// -------------------------------------------------------------------------------------
// Intent-mismatch: token overlap + negative-intent dictionary
// -------------------------------------------------------------------------------------

test('intent-mismatch: no dictionary configured for client -> never flags (AAAsada-style gap)', () => {
  const rows = [row({ searchTerm: 'קורס בחינם', impressions: 100, clicks: 2, costMicros: 1, conversions: 0, triggeringMatchType: 'BROAD' })];
  const scored = scoreSearchTerms({ rows, baselines: baselinesMap(), wastedSpend: {} });
  // CTR would flag (2% ctr), but no intent dictionary means only 1 soft flag -> WATCH, not CUT
  assert.equal(scored.length, 1);
  assert.equal(scored[0].verdict, 'WATCH');
});

test('intent-mismatch: token overlap with positive keywords suppresses the flag', () => {
  const rows = [row({ searchTerm: 'קורס nlp בחינם', impressions: 100, clicks: 30, costMicros: 1, conversions: 0, triggeringMatchType: 'BROAD' })];
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    intentDictionary: { negativeIntentTokens: ['בחינם'] },
    wastedSpend: {},
  });
  assert.equal(scored.length, 0); // overlaps "קורס"/"nlp" with positive keywords -> no mismatch, CTR fine at 30%
});

test('intent-mismatch: BROAD-triggered mismatch with a 2nd soft flag (CTR_LOW) combines to CUT at high confidence', () => {
  const rows = [row({ searchTerm: 'עבודה מהבית', impressions: 100, clicks: 1, costMicros: 1, conversions: 0, triggeringMatchType: 'BROAD' })];
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    intentDictionary: { negativeIntentTokens: ['עבודה'] },
    wastedSpend: {},
  });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].verdict, 'CUT');
});

test('intent-mismatch: EXACT-triggered mismatch never drives a CUT, even combined with CTR_LOW', () => {
  const rows = [row({ searchTerm: 'עבודה מהבית', impressions: 100, clicks: 1, costMicros: 1, conversions: 0, triggeringMatchType: 'EXACT' })];
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    intentDictionary: { negativeIntentTokens: ['עבודה'] },
    wastedSpend: {},
  });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].verdict, 'WATCH');
  assert.match(scored[0].reasons.join(' '), /manual keyword-taxonomy review/);
});

// -------------------------------------------------------------------------------------
// Wasted-spend independent trigger
// -------------------------------------------------------------------------------------

test('wasted-spend CUT fires independently, even when the term is otherwise on-theme and EXACT-triggered', () => {
  const rows = [
    row({
      searchTerm: 'nlp קורס פרקטישנר',
      impressions: 100,
      clicks: 5,
      costMicros: 300_000_000, // ₪300
      conversions: 0,
      triggeringMatchType: 'EXACT',
    }),
  ];
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    wastedSpend: { trailingAvgCplIls: 100 }, // cut bar = 200; cost 300 clears it
  });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].verdict, 'CUT');
  assert.match(scored[0].reasons.join(' '), /Wasted spend/);
});

test('wasted-spend requires clicks >= 5 for CUT band; 4 clicks at same cost only WATCHes if it clears the watch bar', () => {
  const rows = [row({ impressions: 100, clicks: 4, costMicros: 300_000_000, conversions: 0 })];
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    wastedSpend: { trailingAvgCplIls: 100 }, // cut bar 200, watch bar 100; cost 300 clears watch, not cut-click-floor
  });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].verdict, 'WATCH');
});

test('wasted-spend degrades gracefully when neither trailingAvgCplIls nor avgJobValueIls is known', () => {
  const rows = [row({ impressions: 100, clicks: 10, costMicros: 500_000_000, conversions: 0 })];
  const scored = scoreSearchTerms({ rows, baselines: baselinesMap(), wastedSpend: {} });
  assert.equal(scored.length, 0); // no economics data -> skip wasted-spend check entirely, no other flags fire
});

test('wasted-spend uses avgJobValueIls backstop when trailingAvgCplIls is unknown', () => {
  const rows = [row({ impressions: 100, clicks: 5, costMicros: 100_000_000, conversions: 0 })]; // ₪100
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    wastedSpend: { avgJobValueIls: 500 }, // 0.15 * 500 = 75; cost 100 clears it
  });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].verdict, 'CUT');
});

// -------------------------------------------------------------------------------------
// Combination logic: 2 soft flags = CUT, 1 = WATCH
// -------------------------------------------------------------------------------------

test('exactly 1 soft flag (CTR_LOW alone) -> WATCH, never CUT', () => {
  const rows = [row({ impressions: 200, clicks: 2, costMicros: 1, conversions: 0 })]; // ctr 1%, low
  const scored = scoreSearchTerms({ rows, baselines: baselinesMap(), wastedSpend: {} });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].verdict, 'WATCH');
});

test('2 soft flags (CTR_LOW + INTENT_MISMATCH) co-occurring -> CUT', () => {
  const rows = [row({ searchTerm: 'עבודה מהבית', impressions: 200, clicks: 2, costMicros: 1, conversions: 0, triggeringMatchType: 'PHRASE' })];
  const scored = scoreSearchTerms({
    rows,
    baselines: baselinesMap(),
    intentDictionary: { negativeIntentTokens: ['עבודה'] },
    wastedSpend: {},
  });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].verdict, 'CUT');
});

// -------------------------------------------------------------------------------------
// 15-term cap
// -------------------------------------------------------------------------------------

test('caps output at MAX_TERMS_PER_TASK even when more terms clear the CUT bar', () => {
  const rows = Array.from({ length: 25 }, (_, i) =>
    row({
      searchTerm: `wasted term ${i}`,
      impressions: 100,
      clicks: 10,
      costMicros: (200 + i) * 1_000_000,
      conversions: 0,
    })
  );
  const scored = scoreSearchTerms({ rows, baselines: baselinesMap(), wastedSpend: { trailingAvgCplIls: 50 } });
  assert.equal(scored.length, MAX_TERMS_PER_TASK);
  assert.equal(scored.length <= 15, true);
  // highest-cost-first within the CUT band
  for (let i = 1; i < scored.length; i++) {
    assert.ok(scored[i - 1].metrics.costIls >= scored[i].metrics.costIls);
  }
});

// -------------------------------------------------------------------------------------
// Match-type forcing: never BROAD
// -------------------------------------------------------------------------------------

test('single-word search term gets EXACT negative match type', () => {
  const rows = [row({ searchTerm: 'nlp', impressions: 100, clicks: 5, costMicros: 300_000_000, conversions: 0 })];
  const scored = scoreSearchTerms({ rows, baselines: baselinesMap(), wastedSpend: { trailingAvgCplIls: 100 } });
  assert.equal(scored[0].suggestedMatchType, 'EXACT');
});

test('multi-word search term gets PHRASE negative match type, never BROAD', () => {
  const rows = [row({ searchTerm: 'nlp קורס בחינם', impressions: 100, clicks: 5, costMicros: 300_000_000, conversions: 0 })];
  const scored = scoreSearchTerms({ rows, baselines: baselinesMap(), wastedSpend: { trailingAvgCplIls: 100 } });
  assert.equal(scored[0].suggestedMatchType, 'PHRASE');
  assert.notEqual(scored[0].suggestedMatchType as string, 'BROAD');
});

test('MIN_IMPRESSIONS_ELIGIBLE and HIGH_CONFIDENCE_IMPRESSIONS constants match the spec', () => {
  assert.equal(MIN_IMPRESSIONS_ELIGIBLE, 20);
  assert.equal(HIGH_CONFIDENCE_IMPRESSIONS, 50);
});
