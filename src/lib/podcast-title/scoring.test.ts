import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateKeywordScore,
  decideTitleChange,
  normalizeSearchVolume,
  selectKeyword,
} from './scoring';

test('scoring applies weights and refuses volume rescue for irrelevant keywords', () => {
  const normalized = normalizeSearchVolume([100, 50, 0]);
  assert.deepEqual(normalized, [100, 50, 0]);
  assert.equal(calculateKeywordScore({ themeRelevance: 100, intentMatch: 100, normalizedVolume: 100, titleNaturalness: 100, clickPotential: 100 }), 100);
  const selected = selectKeyword([
    { phrase: 'high volume mismatch', score: 99, themeRelevance: 69 },
    { phrase: 'supported phrase', score: 70, themeRelevance: 70 },
  ]);
  assert.equal(selected?.phrase, 'supported phrase');
});

test('title change decision honors the deterministic ten point threshold', () => {
  assert.equal(decideTitleChange({ currentTitle: 'Existing title', currentScore: 80, recommendedScore: 89, themeConfidence: 90, hasRelevantPositiveVolumeKeyword: true, writerValid: true }), 'KEEP');
  assert.equal(decideTitleChange({ currentTitle: 'Existing title', currentScore: 80, recommendedScore: 90, themeConfidence: 90, hasRelevantPositiveVolumeKeyword: true, writerValid: true }), 'CHANGE');
  assert.equal(decideTitleChange({ currentTitle: '', currentScore: 0, recommendedScore: 0, themeConfidence: 90, hasRelevantPositiveVolumeKeyword: true, writerValid: true }), 'CHANGE');
  assert.equal(decideTitleChange({ currentTitle: 'Existing title', currentScore: 80, recommendedScore: 100, themeConfidence: 69, hasRelevantPositiveVolumeKeyword: true, writerValid: true }), 'HUMAN_REVIEW');
});

test('title decisions require relevant positive provider volume', () => {
  const withoutPositiveVolume = { currentTitle: 'Existing title', currentScore: 80, recommendedScore: 89, themeConfidence: 90, hasRelevantPositiveVolumeKeyword: false, writerValid: true };
  const withPositiveVolume = { ...withoutPositiveVolume, hasRelevantPositiveVolumeKeyword: true };
  assert.equal(decideTitleChange(withoutPositiveVolume), 'HUMAN_REVIEW');
  assert.equal(decideTitleChange(withPositiveVolume), 'KEEP');
});
