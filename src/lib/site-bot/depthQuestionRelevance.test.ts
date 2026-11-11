// 2026-11-11 (Yonatan, follow-up to d54bdf8): depth-question filter tightening.
//   (a) siteVertical = matchedVertical(niche) ?? matchedVertical(primaryService) ?? 'skilled-trades';
//   (b) a pool question passes only if it shares an anchor with THIS page (subject, page label, page queries / keyword,
//       NeuronWriter basic terms); the owner's places and the business name never count;
//   (c) offeredVerticals comes from this page's own names, not from every service on the site.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew letters are escapes: trade tokens of the vertical map and
// synthetic letter sequences (test data, not copy).
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CollectedData } from '../bot/prompts';
import { matchedVertical } from '../lp/verticalDetect';
import { buildQuestionPool } from './research/pageBrief';
import { buildDepthFilters, relevanceMatcher, sharesStem, siteVerticalFor } from './research/depthFilters';
import { depthFilterInputFor } from './researchToSite';

const BET = '\u05D1';
const PLUMBER = '\u05D0\u05D9\u05E0\u05E1\u05D8\u05DC\u05D8\u05D5\u05E8';
const PLUMBING = '\u05D0\u05D9\u05E0\u05E1\u05D8\u05DC\u05E6\u05D9\u05D4';
const LEAKS = '\u05E0\u05D6\u05D9\u05DC\u05D5\u05EA';
const LEAK_REPAIR = `\u05EA\u05D9\u05E7\u05D5\u05DF ${LEAKS}`;
const LEAK_DETECTION = `\u05D0\u05D9\u05EA\u05D5\u05E8 ${LEAKS}`;
const LOCKSMITH = '\u05DE\u05E0\u05E2\u05D5\u05DC\u05DF';
const RENOVATION = '\u05E9\u05D9\u05E4\u05D5\u05E5';
// Synthetic Hebrew-script sequences: a city (owner-stated) and filler words that name nothing.
const CITY = '\u05D7\u05D8\u05D9';
const SYN_A = '\u05D0\u05D1\u05D2\u05D3';
const SYN_B = '\u05D4\u05D5\u05D6\u05D7';

const data: CollectedData = {
  businessName: 'TEST Relevance Plumbing', businessNiche: 'plumber', primaryService: PLUMBER,
  targetLocation: CITY, specificCities: CITY, phone: '050-0000000',
};
// The leak-repair page of a plumber whose site also sells a skilled-trades service (renovation).
const page = { subject: LEAK_REPAIR, pageLabel: LEAK_REPAIR, pageQueries: [`${LEAK_REPAIR} ${BET}${CITY}`], serviceLabels: [LEAK_REPAIR, LEAK_DETECTION, RENOVATION], places: [CITY] };

test('preconditions: the locksmith token and the plumber page share one vertical (the vertical check cannot tell them apart)', () => {
  assert.equal(matchedVertical(LOCKSMITH), 'emergency-trades');
  assert.equal(matchedVertical(LEAK_REPAIR), 'emergency-trades');
  assert.equal(matchedVertical(RENOVATION), 'skilled-trades');
});

test('(a) site vertical: niche, else primary service, else the skilled-trades fallback', () => {
  assert.equal(siteVerticalFor('plumber', PLUMBER), 'emergency-trades', 'a Latin niche falls through to the primary service');
  assert.equal(siteVerticalFor(LOCKSMITH, RENOVATION), 'emergency-trades', 'the niche wins when it names a vertical');
  assert.equal(siteVerticalFor('plumber', 'leak repair'), 'skilled-trades');
  assert.equal(siteVerticalFor(undefined, undefined), 'skilled-trades');
  assert.equal(depthFilterInputFor(data, data.businessName!, page, null).siteVertical, 'emergency-trades');
});

test('(b) relevance: a shared anchor word or trade keyword passes; a city, the business name or a short word alone does not', () => {
  const relevant = relevanceMatcher([LEAK_REPAIR, `${PLUMBER} ${BET}${CITY}`], [CITY, 'TEST Relevance Plumbing']);
  assert.equal(relevant(`${SYN_A} ${BET}${LEAKS}?`), true, 'prefixed form of an anchor word');
  assert.equal(relevant(`${SYN_A} ${PLUMBING}?`), true, 'same trade keyword, another word form');
  assert.equal(relevant(`${SYN_A} ${BET}${CITY}?`), false, 'the city alone is not relevance');
  assert.equal(relevant(`${SYN_A} plumbing?`), false, 'the business name alone is not relevance');
  assert.equal(relevanceMatcher(['ab cd'], [])('ab cd'), false, 'words under 3 letters are never anchors');
  // Final inflection: a 5+ letter word may change its last letter (singular vs plural); shorter words only gain a suffix.
  assert.equal(sharesStem('blockage', 'blockages'), true);
  assert.equal(sharesStem('leaks', 'leaky'), true);
  assert.equal(sharesStem('boil', 'boilers'), true);
  assert.equal(sharesStem('cost', 'cosy'), false, 'a 4-letter word never changes its last letter');
  assert.equal(sharesStem('lo', 'lock'), false);
  assert.equal(relevant(`${SYN_A} ${LOCKSMITH} ${BET}${CITY}?`), false);
});

test('(b) on a plumber leak-repair page: a same-vertical locksmith question is rejected, a leak-detection question passes', () => {
  const input = depthFilterInputFor(data, data.businessName!, page, { competitorTitles: [], basicTerms: [SYN_B], keyword: `${LEAK_REPAIR} ${BET}${CITY}` });
  const filters = buildDepthFilters({ ...input, priceLexicon: null });
  const locksmith = `${SYN_A} ${LOCKSMITH} ${BET}${CITY}?`;
  const leakDetection = `${SYN_A} ${LEAK_DETECTION} ${BET}${CITY}?`;
  // Only the relevance check tells the locksmith question apart: no brand, place, unoffered-service or price hit.
  for (const check of [filters.competitorBrand, filters.otherPlace, filters.unofferedService]) assert.equal(check?.(locksmith), false);
  const pool = buildQuestionPool([{ question: locksmith, source: 'paa' }, { question: leakDetection, source: 'topic' }, { question: `${SYN_B}?`, source: 'content' }], filters);
  assert.deepEqual(pool.map(item => item.question), [leakDetection, `${SYN_B}?`], 'a basic term is an anchor too');
  // Without relevanceTerms (legacy callers) the pool is unchanged.
  const { relevanceTerms: _terms, ...legacy } = input;
  void _terms;
  assert.equal(buildQuestionPool([{ question: locksmith, source: 'paa' }], buildDepthFilters({ ...legacy, priceLexicon: null })).length, 1);
});

test('(c) offered verticals are this page\'s own names only, not every service of the site', () => {
  const input = depthFilterInputFor(data, data.businessName!, page, null);
  assert.deepEqual(input.offeredVerticals, ['emergency-trades']);
  // A renovation question on the leak-repair page is an unoffered service here, though the site sells renovation elsewhere.
  const filters = buildDepthFilters({ ...input, priceLexicon: null });
  assert.equal(filters.unofferedService?.(`${SYN_A} ${RENOVATION}?`), true);
  const renovationPage = { ...page, subject: RENOVATION, pageLabel: RENOVATION, pageQueries: [RENOVATION] };
  assert.equal(buildDepthFilters({ ...depthFilterInputFor(data, data.businessName!, renovationPage, null), priceLexicon: null }).unofferedService?.(`${SYN_A} ${RENOVATION}?`), false);
});
