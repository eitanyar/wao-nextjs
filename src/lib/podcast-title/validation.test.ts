import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWriterDraftOutput, validateWriterRankingOutput } from './validation';
import type { PodcastProfile } from './types';

const profile: PodcastProfile = { id: 'podcast-1', name: 'Test Podcast', audience: 'Test audience', titleMinLength: 20, titleMaxLength: 55, descriptionMinLength: 80, descriptionMaxLength: 160, seedKeywords: ['topic one', 'topic two'] };
const components = { themeRelevance: 90, intentMatch: 80, normalizedVolume: 100, titleNaturalness: 80, clickPotential: 80 };
const candidates = [{ phrase: 'topic one', searchVolume: 100, monthlySearches: [], source: 'keyword_ideas' as const, taskIds: [], providerCostUsd: 0, normalizedVolume: 100 }];
const draft = () => ({ titles: [{ role: 'balanced' as const, title: 'Topic one practical episode title', primaryPhrase: 'topic one' }, { role: 'search_focused' as const, title: 'Topic one clear search episode title', primaryPhrase: 'topic one' }, { role: 'curiosity' as const, title: 'Topic one surprising episode lesson', primaryPhrase: 'topic one' }], description: 'This description contains topic one exactly once and has enough plain ASCII detail for validation.', reason: 'Clear supported recommendation.' });

test('ranking requires exact provider phrase coverage and engine normalized volume', () => {
  assert.equal(validateWriterRankingOutput({ keywordScores: [{ phrase: 'topic one', components }] }, candidates), true);
  assert.equal(validateWriterRankingOutput({ keywordScores: [] }, candidates), false);
  assert.equal(validateWriterRankingOutput({ keywordScores: [{ phrase: 'Topic One', components }] }, candidates), false);
  assert.equal(validateWriterRankingOutput({ keywordScores: [{ phrase: 'topic one', components: { ...components, normalizedVolume: 99 } }] }, candidates), false);
  assert.equal(validateWriterRankingOutput({ keywordScores: [{ phrase: 'topic one', components: { ...components, clickPotential: 101 } }] }, candidates), false);
});

test('draft requires ordered roles selected phrase exact once and 20 word reason ceiling', () => {
  assert.equal(validateWriterDraftOutput(draft(), profile, 'topic one'), true);
  assert.equal(validateWriterDraftOutput({ ...draft(), description: draft().description.replace('topic one', 'Topic One') }, profile, 'topic one'), false);
  assert.equal(validateWriterDraftOutput({ ...draft(), description: `${draft().description} topic one` }, profile, 'topic one'), false);
  assert.equal(validateWriterDraftOutput({ ...draft(), reason: Array.from({ length: 21 }, () => 'word').join(' ') }, profile, 'topic one'), false);
  assert.equal(validateWriterDraftOutput({ ...draft(), titles: [draft().titles[1], draft().titles[0], draft().titles[2]] }, profile, 'topic one'), false);
});
