import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileFromRequest, episodeSummary, profileSummary } from './adminApi';
import { validatePodcastProfile } from './validation';

test('creates an engine-compatible profile from valid admin settings', () => {
  const profile = createProfileFromRequest({
    id: 'demo-1', name: 'Demo', podcastName: 'Show', targetAudience: 'Owners', podcastDomain: 'Business',
    writingStyle: 'clear', brandPhrases: ['one'], topicScope: ['growth'], benefitTitlePreference: true,
    targetCountry: 'IL', targetLanguage: 'he', titleLimit: 80, descriptionLimit: 160,
  });
  if (!profile) throw new Error('expected profile');
  assert.equal(profile.id, 'demo-1');
  assert.deepEqual(profile.seedKeywords, ['growth']);
  assert.equal(profile.titleMaxLength, 80);
  assert.equal(validatePodcastProfile(profile), true);
});

test('rejects invalid IDs and incomplete profiles', () => {
  assert.equal(createProfileFromRequest({ id: '../bad' }), null);
  assert.equal(createProfileFromRequest({ id: 'valid' }), null);
});

test('enforces engine profile limit boundaries during creation', () => {
  const request = { id: 'limits-1', name: 'Demo', podcastName: 'Show', targetAudience: 'Owners', podcastDomain: 'Business', writingStyle: 'clear', brandPhrases: ['one'], topicScope: ['growth'], benefitTitlePreference: true, targetCountry: 'IL', targetLanguage: 'en' };
  for (const [titleLimit, descriptionLimit] of [[20, 80], [100, 1000]]) {
    const profile = createProfileFromRequest({ ...request, titleLimit, descriptionLimit });
    assert.notEqual(profile, null);
    assert.equal(validatePodcastProfile(profile), true);
  }
  assert.equal(createProfileFromRequest({ ...request, titleLimit: 19, descriptionLimit: 80 }), null);
  assert.equal(createProfileFromRequest({ ...request, titleLimit: 101, descriptionLimit: 80 }), null);
  assert.equal(createProfileFromRequest({ ...request, titleLimit: 20, descriptionLimit: 79 }), null);
  assert.equal(createProfileFromRequest({ ...request, titleLimit: 20, descriptionLimit: 1001 }), null);
});

test('omits transcript and description from summaries', () => {
  const summary = episodeSummary({
    schemaVersion: 1, profileId: 'demo-1', episodeId: 'episode-1', transcriptDigest: 'digest', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    input: { transcript: 'private', currentDescription: 'private' }, theme: { format: 'mixed', theme: 'theme', supportingTopics: [], examples: [], excludedTopics: [], listenerIntent: 'intent', listenerPromise: 'promise', seeds: [], confidence: 80 },
    providerUsage: [], result: { decision: 'CHANGE', reason: 'reason', theme: { format: 'mixed', theme: 'theme', supportingTopics: [], examples: [], excludedTopics: [], listenerIntent: 'intent', listenerPromise: 'promise', seeds: [], confidence: 80 }, keywordEvidence: [], titles: [], description: 'private', currentTitleScore: 10, recommendedTitleScore: 80, fallbackUsed: false, llmCallsUsed: 2 },
  });
  if (!summary) throw new Error('expected completed summary');
  assert.deepEqual(Object.keys(summary).sort(), ['confidence', 'createdAt', 'currentTitle', 'decision', 'episodeId', 'recommendedTitle', 'searchVolume', 'selectedKeyword', 'theme']);
  assert.equal(JSON.stringify(summary).includes('private'), false);
  assert.equal(profileSummary(createProfileFromRequest({ id: 'demo-1', name: 'Demo', podcastName: 'Show', targetAudience: 'Owners', podcastDomain: 'Business', writingStyle: 'clear', brandPhrases: [], topicScope: ['growth'], benefitTitlePreference: false, targetCountry: 'IL', targetLanguage: 'he', titleLimit: 80, descriptionLimit: 160 })!).id, 'demo-1');
});

test('excludes legacy operational records from episode summaries', () => {
  const theme = { format: 'mixed' as const, theme: 'theme', supportingTopics: [], examples: [], excludedTopics: [], listenerIntent: 'intent', listenerPromise: 'promise', seeds: [], confidence: 80 };
  const summary = episodeSummary({
    schemaVersion: 1, profileId: 'demo-1', episodeId: 'episode-failed', transcriptDigest: 'digest', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    input: { transcript: 'private' }, theme, providerUsage: [],
    result: { decision: 'HUMAN_REVIEW', reason: 'legacy failure', theme, keywordEvidence: [], titles: [], description: '', currentTitleScore: 0, recommendedTitleScore: 0, fallbackUsed: false, llmCallsUsed: 0, failure: { stage: 'keywords', code: 'unavailable' } },
  });
  assert.equal(summary, null);
});
