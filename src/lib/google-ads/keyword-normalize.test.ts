import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeKeyword, normalizeKeywords, normalizeNegativeKeywords, validateCampaignStrategy } from './keyword-normalize';

test('[x] -> EXACT, "x" -> PHRASE, bare -> PHRASE (never BROAD)', () => {
  assert.deepEqual(normalizeKeyword('[plumber haifa]'), { text: 'plumber haifa', matchType: 'EXACT' });
  assert.deepEqual(normalizeKeyword('"plumber near me"'), { text: 'plumber near me', matchType: 'PHRASE' });
  assert.deepEqual(normalizeKeyword('\u201Cplumber\u201D'), { text: 'plumber', matchType: 'PHRASE' });
  assert.deepEqual(normalizeKeyword('plumber'), { text: 'plumber', matchType: 'PHRASE' });
});

test('strips + (retired BMM) and stray symbols, trims and collapses spaces', () => {
  assert.deepEqual(normalizeKeyword('  +plumber   +haifa!! '), { text: 'plumber haifa', matchType: 'PHRASE' });
  assert.deepEqual(normalizeKeyword('[ac-repair (24/7) ]'), { text: 'ac-repair 24 7', matchType: 'EXACT' });
  assert.deepEqual(normalizeKeyword('- leading dash -'), { text: 'leading dash', matchType: 'PHRASE' });
});

test('an inner quote between letters is kept as a gershayim, not phrase notation', () => {
  // Synthetic letters (Latin) stand in for a Hebrew abbreviation.
  assert.deepEqual(normalizeKeyword('ab"c lawyer'), { text: 'ab\u05F4c lawyer', matchType: 'PHRASE' });
});

test('rejects empties and symbol-only entries; non-strings are ignored', () => {
  assert.equal(normalizeKeyword(''), null);
  assert.equal(normalizeKeyword('[]'), null);
  assert.equal(normalizeKeyword('"+ ! ?"'), null);
  assert.equal(normalizeKeyword(42), null);
});

test('dedupes by text + match type, keeps first-seen order', () => {
  assert.deepEqual(normalizeKeywords(['plumber', '"Plumber"', '[plumber]', 'plumber ', '', null]), [
    { text: 'plumber', matchType: 'PHRASE' },
    { text: 'plumber', matchType: 'EXACT' },
  ]);
  assert.deepEqual(normalizeNegativeKeywords(['free', '"free"', '[jobs]', '']), ['free', 'jobs']);
});

test('validateCampaignStrategy: needs >= 1 keyword and a positive budget; negatives default to []', () => {
  assert.equal(validateCampaignStrategy(undefined).ok, false);
  assert.equal(validateCampaignStrategy({ keywords: ['[]', ''], suggestedDailyBudget: 50 }).ok, false);
  assert.equal(validateCampaignStrategy({ keywords: ['plumber'], suggestedDailyBudget: 0 }).ok, false);
  assert.equal(validateCampaignStrategy({ keywords: ['plumber'], suggestedDailyBudget: 'abc' }).ok, false);
  const ok = validateCampaignStrategy({ keywords: ['plumber'], suggestedDailyBudget: 50 });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.negativeKeywords, []);
});

test('the bot fallback strategy shape (no negativeKeywords) passes validation', () => {
  // Mirrors generateFallbackStrategyAndCopy in src/app/api/bot/route.ts (niche-based keywords,
  // budget / 30 daily, no negativeKeywords field), with a Latin niche.
  const niche = 'plumber';
  const fallback = {
    targetLocation: 'somewhere',
    suggestedDailyBudget: Math.round(1000 / 30),
    biddingStrategy: 'Maximize Clicks',
    keywords: [`${niche}`, `${niche} pro`, `service ${niche}`],
  };
  const r = validateCampaignStrategy(fallback);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.keywords.length, 3);
    assert.ok(r.keywords.every((k) => k.matchType === 'PHRASE'));
    assert.deepEqual(r.negativeKeywords, []);
  }
});
