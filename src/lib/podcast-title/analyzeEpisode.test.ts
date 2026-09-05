import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePodcastEpisodeOutcome, createStoredEpisodeAnalysis } from './analyzeEpisode';
import { PODCAST_THEME_RESPONSE_JSON_SCHEMA, PODCAST_WRITER_DRAFT_RESPONSE_JSON_SCHEMA, PODCAST_WRITER_RANKING_RESPONSE_JSON_SCHEMA } from './geminiSchemas';
import type { PodcastAnalysisOutcome, PodcastProfile, ThemeAnalysis } from './types';

const profile: PodcastProfile = { id: 'podcast-1', name: 'Test Podcast', audience: 'Test audience', titleMinLength: 20, titleMaxLength: 55, descriptionMinLength: 80, descriptionMaxLength: 160, seedKeywords: ['topic one', 'topic two'] };
const theme: ThemeAnalysis = { format: 'educational', theme: 'Topic', supportingTopics: [], examples: [], excludedTopics: [], listenerIntent: 'Learn', listenerPromise: 'Understand', seeds: ['topic one', 'topic two'], confidence: 90, currentTitleKeyword: 'first phrase' };
const input = () => ({ episodeId: 'episode-1', transcript: 'x'.repeat(500), currentTitle: 'Existing episode title with enough characters' });
const component = (normalizedVolume: number) => ({ themeRelevance: 90, intentMatch: 90, normalizedVolume, titleNaturalness: 90, clickPotential: 90 });
const draft = (phrase: string) => ({ currentTitleComponents: component(0), recommendedTitleComponents: component(100), titles: [{ role: 'balanced' as const, title: `${phrase} practical episode title`, primaryPhrase: phrase }, { role: 'search_focused' as const, title: `${phrase} clear search title`, primaryPhrase: phrase }, { role: 'curiosity' as const, title: `${phrase} surprising episode lesson`, primaryPhrase: phrase }], description: `This description contains ${phrase} exactly once and has enough plain ASCII detail for validation.`, reason: 'Clear supported recommendation.' });
const provider = (items: unknown[], id = 'ideas-1') => new Response(JSON.stringify({ tasks: [{ id, cost: 0.01, status_code: 20000, result: [{ items }] }] }), { status: 200 });
const ideas = () => provider([{ keyword: 'first phrase', keyword_info: { search_volume: 10 } }, { keyword: 'winning phrase', keyword_info: { search_volume: 100 } }, { keyword: 'third phrase', keyword_info: { search_volume: 5 } }, { keyword: 'fourth phrase', keyword_info: { search_volume: 4 } }, { keyword: 'fifth phrase', keyword_info: { search_volume: 3 } }]);

type CompletedOutcome = Extract<PodcastAnalysisOutcome, { status: 'completed' }>;
type FailedOutcome = Extract<PodcastAnalysisOutcome, { status: 'failed' }>;

function expectCompleted(outcome: PodcastAnalysisOutcome): CompletedOutcome {
  if (outcome.status !== 'completed') assert.fail(`expected completed outcome, received ${outcome.status}`);
  return outcome;
}

function expectFailed(outcome: PodcastAnalysisOutcome): FailedOutcome {
  if (outcome.status !== 'failed') assert.fail(`expected failed outcome, received ${outcome.status}`);
  return outcome;
}

test('podcast runtime never calls supplemental keyword endpoints', async () => {
  const endpoints: string[] = [];
  const stages: string[] = [];
  const outcome = expectCompleted(await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => { stages.push('theme'); return theme; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: ['first phrase', 'winning phrase', 'third phrase'].map((phrase, index) => ({ phrase, components: component([10, 100, 5][index]) })) }; },
    draftLlm: async () => { stages.push('draft'); return draft('winning phrase'); },
    dataForSeo: {
      token: 'test-token',
      fetch: async url => {
        const endpoint = new URL(String(url)).pathname;
        endpoints.push(endpoint);
        if (endpoint !== '/v3/dataforseo_labs/google/keyword_ideas/live') throw new Error(`Unexpected supplemental endpoint: ${endpoint}`);
        return provider([{ keyword: 'first phrase', keyword_info: { search_volume: 10 } }, { keyword: 'winning phrase', keyword_info: { search_volume: 100 } }, { keyword: 'third phrase', keyword_info: { search_volume: 5 } }]);
      },
    },
  }));
  const { result } = outcome;
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.llmCallsUsed, 3);
  assert.equal(result.selectedKeyword?.phrase, 'winning phrase');
  assert.equal(result.titles.length, 3);
  assert.deepEqual(endpoints, ['/v3/dataforseo_labs/google/keyword_ideas/live']);
  assert.deepEqual(stages, ['theme', 'ranking', 'draft']);
  assert.deepEqual(outcome.providerUsage, [{ operation: 'keyword_ideas', taskIds: ['ideas-1'], costUsd: 0.01 }]);
});

test('low or mismatched ranking returns review without supplemental work or drafting', async () => {
  for (const ranking of [
    { keywordScores: ['first phrase', 'winning phrase', 'third phrase'].map((phrase, index) => ({ phrase, components: { themeRelevance: 60, intentMatch: 60, normalizedVolume: [10, 100, 5][index], titleNaturalness: 60, clickPotential: 60 } })) },
    { keywordScores: ['first phrase', 'winning phrase', 'third phrase'].map((phrase, index) => ({ phrase, components: component([10, 100, 5][index]) })), naturalSearchLanguageMismatch: true },
  ]) {
    const endpoints: string[] = [];
    const stages: string[] = [];
    const { result } = expectCompleted(await analyzePodcastEpisodeOutcome(input(), profile, {
      themeLlm: async () => { stages.push('theme'); return theme; },
      rankingLlm: async () => { stages.push('ranking'); return ranking; },
      draftLlm: async () => { stages.push('draft'); return draft('winning phrase'); },
      dataForSeo: { token: 'test-token', fetch: async url => { const endpoint = new URL(String(url)).pathname; endpoints.push(endpoint); if (endpoint !== '/v3/dataforseo_labs/google/keyword_ideas/live') throw new Error(`Unexpected supplemental endpoint: ${endpoint}`); return provider([{ keyword: 'first phrase', keyword_info: { search_volume: 10 } }, { keyword: 'winning phrase', keyword_info: { search_volume: 100 } }, { keyword: 'third phrase', keyword_info: { search_volume: 5 } }]); } },
    }));
    assert.equal(result.decision, 'HUMAN_REVIEW');
    assert.equal(result.fallbackUsed, false);
    assert.equal(result.llmCallsUsed, 3);
    assert.equal(result.titles.length, 3);
    assert.deepEqual(endpoints, ['/v3/dataforseo_labs/google/keyword_ideas/live']);
    assert.deepEqual(stages, ['theme', 'ranking', 'draft']);
  }
});

test('empty keyword ideas returns review before ranking or drafting', async () => {
  const endpoints: string[] = [];
  const stages: string[] = [];
  const { failure, providerUsage } = expectFailed(await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => { stages.push('theme'); return theme; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [] }; },
    draftLlm: async () => { stages.push('draft'); return draft('winning phrase'); },
    dataForSeo: { token: 'test-token', fetch: async url => { const endpoint = new URL(String(url)).pathname; endpoints.push(endpoint); if (endpoint !== '/v3/dataforseo_labs/google/keyword_ideas/live') throw new Error(`Unexpected supplemental endpoint: ${endpoint}`); return provider([]); } },
  }));
  assert.deepEqual(failure, { stage: 'keywords', code: 'unavailable' });
  assert.deepEqual(endpoints, ['/v3/dataforseo_labs/google/keyword_ideas/live', '/v3/keywords_data/google/search_volume/live']);
  assert.deepEqual(stages, ['theme']);
  assert.deepEqual(providerUsage, [{ operation: 'keyword_ideas', taskIds: ['ideas-1'], costUsd: 0.01 }]);
});

test('zero or unknown keyword volume cannot produce a non-review result', async () => {
  const endpoints: string[] = [];
  const stages: string[] = [];
  const outcome = expectFailed(await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => { stages.push('theme'); return theme; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [] }; },
    draftLlm: async () => { stages.push('draft'); return draft('zero phrase'); },
    dataForSeo: { token: 'test-token', fetch: async url => { endpoints.push(new URL(String(url)).pathname); return provider([{ keyword: 'zero phrase', keyword_info: { search_volume: 0 } }, { keyword: 'unknown phrase', keyword_info: {} }, { keyword: 'null phrase', keyword_info: { search_volume: null } }]); } },
  }));
  assert.deepEqual(outcome.failure, { stage: 'writer', code: 'invalid_output', step: 'ranking' });
  assert.deepEqual(endpoints, ['/v3/dataforseo_labs/google/keyword_ideas/live', '/v3/keywords_data/google/search_volume/live']);
  assert.deepEqual(stages, ['theme', 'ranking']);
  assert.deepEqual(outcome.providerUsage, [{ operation: 'keyword_ideas', taskIds: ['ideas-1'], costUsd: 0.01 }, { operation: 'search_volume', taskIds: ['ideas-1'], costUsd: 0.01 }]);
});

test('selection skips zero-volume winner for relevant positive-volume evidence', async () => {
  const stages: string[] = [];
  const { result } = expectCompleted(await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => { stages.push('theme'); return theme; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [
      { phrase: 'zero winner', components: { themeRelevance: 100, intentMatch: 100, normalizedVolume: 0, titleNaturalness: 100, clickPotential: 100 } },
      { phrase: 'provider positive phrase', components: { themeRelevance: 70, intentMatch: 70, normalizedVolume: 100, titleNaturalness: 70, clickPotential: 70 } },
    ] }; },
    draftLlm: async message => { stages.push('draft'); assert.match(message, /"zero winner"/); return draft('zero winner'); },
    dataForSeo: { token: 'test-token', fetch: async () => provider([{ keyword: 'zero winner', keyword_info: { search_volume: 0 } }, { keyword: 'provider positive phrase', keyword_info: { search_volume: 25 } }]) },
  }));
  assert.equal(result.decision, 'HUMAN_REVIEW');
  assert.equal(result.selectedKeyword?.phrase, 'zero winner');
  assert.equal(result.selectedKeyword?.searchVolume, 0);
  assert.deepEqual(stages, ['theme', 'ranking', 'draft']);
});

test('keep result exposes exact positive keyword evidence', async () => {
  const { result } = expectCompleted(await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => theme,
    rankingLlm: async () => ({ keywordScores: [{ phrase: 'exact provider phrase', components: component(100) }] }),
    draftLlm: async () => ({ ...draft('exact provider phrase'), currentTitleComponents: component(100), recommendedTitleComponents: component(100) }),
    dataForSeo: { token: 'test-token', fetch: async () => provider([{ keyword: 'exact provider phrase', keyword_info: { search_volume: 37 } }]) },
  }));
  assert.equal(result.decision, 'KEEP');
  assert.equal(result.selectedKeyword?.relevant, true);
  assert.equal(result.selectedKeyword?.phrase, 'exact provider phrase');
  assert.equal(result.selectedKeyword?.searchVolume, 37);
  assert.equal(result.selectedKeyword?.components.normalizedVolume, 100);
  assert.equal(result.selectedKeyword?.score, 91.5);
  assert.deepEqual(result.keywordEvidence.map(value => [value.phrase, value.searchVolume]), [['exact provider phrase', 37]]);
});

test('writer contract exposes engine selection before drafting', async () => {
  const events: string[] = [];
  const { result } = expectCompleted(await analyzePodcastEpisodeOutcome(input(), profile, { themeLlm: async () => theme, rankingLlm: async () => { events.push('ranking'); return { keywordScores: ['first phrase', 'winning phrase', 'third phrase', 'fourth phrase', 'fifth phrase'].map((phrase, index) => ({ phrase, components: component([10, 100, 5, 4, 3][index]) })) }; }, draftLlm: async message => { events.push('draft'); assert.match(message, /"winning phrase"/); return draft('winning phrase'); }, dataForSeo: { token: 'test-token', fetch: async () => ideas() } }));
  assert.deepEqual(events, ['ranking', 'draft']);
  assert.equal(result.selectedKeyword?.phrase, 'winning phrase');
  assert.ok(result.titles.every(title => title.primaryPhrase === 'winning phrase'));
  assert.equal(result.description.split('winning phrase').length - 1, 1);
  assert.equal(result.llmCallsUsed, 3);
});

test('default Gemini transport uses theme ranking draft schemas in order', async () => {
  const previous = process.env.GEMINI_API_KEY; process.env.GEMINI_API_KEY = 'test-key';
  try { const calls: Record<string, unknown>[] = []; const { result } = expectCompleted(await analyzePodcastEpisodeOutcome(input(), profile, { llmFetch: async (_url, init) => { calls.push(JSON.parse(String(init?.body))); const count = calls.length; const body = count === 1 ? theme : count === 2 ? { keywordScores: ['first phrase', 'winning phrase', 'third phrase', 'fourth phrase', 'fifth phrase'].map((phrase, index) => ({ phrase, components: component([10, 100, 5, 4, 3][index]) })) } : draft('winning phrase'); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }), { status: 200 }); }, dataForSeo: { token: 'test-token', fetch: async () => ideas() } })); const schemas = calls.map(call => (call.generationConfig as { responseJsonSchema: unknown }).responseJsonSchema); assert.deepEqual(schemas, [PODCAST_THEME_RESPONSE_JSON_SCHEMA, PODCAST_WRITER_RANKING_RESPONSE_JSON_SCHEMA, PODCAST_WRITER_DRAFT_RESPONSE_JSON_SCHEMA]); assert.equal(result.llmCallsUsed, 3); } finally { if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous; }
});

test('ranking and draft failures fail closed with safe writer step', async () => {
  for (const target of ['ranking', 'draft'] as const) { const outcome = expectFailed(await analyzePodcastEpisodeOutcome(input(), profile, { themeLlm: async () => theme, rankingLlm: async () => target === 'ranking' ? { keywordScores: [] } : { keywordScores: ['first phrase', 'winning phrase', 'third phrase', 'fourth phrase', 'fifth phrase'].map((phrase, index) => ({ phrase, components: component([10, 100, 5, 4, 3][index]) })) }, draftLlm: async () => target === 'draft' ? { titles: [], description: '', reason: '' } : draft('winning phrase'), dataForSeo: { token: 'test-token', fetch: async () => ideas() } })); assert.equal(outcome.failure.stage, 'writer'); assert.equal(outcome.failure.step, target); }
});

test('stored analysis generates an id when episode id is absent', () => { const result = { decision: 'HUMAN_REVIEW' as const, reason: 'Test', theme, keywordEvidence: [], titles: [], description: '', currentTitleScore: 0, recommendedTitleScore: 0, fallbackUsed: false, llmCallsUsed: 0 }; const stored = createStoredEpisodeAnalysis(profile, { transcript: 'x'.repeat(500) }, result, [], new Date('2026-01-01T00:00:00.000Z')); assert.match(stored.episodeId, /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/); });

test('existing low-score review preserves best keyword volume and three titles', async () => {
  const endpoints: string[] = [];
  const stages: string[] = [];
  const existingTheme = { ...theme, currentTitleKeyword: 'legacy topic' };
  const outcome = await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => { stages.push('theme'); return existingTheme; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [{ phrase: 'winning phrase', components: { ...component(100), themeRelevance: 60 } }, { phrase: 'legacy topic', components: { ...component(21.4), themeRelevance: 60 } }] }; },
    draftLlm: async () => { stages.push('draft'); return draft('winning phrase'); },
    dataForSeo: { token: 'test-token', fetch: async url => { endpoints.push(new URL(String(url)).pathname); return provider([{ keyword: 'winning phrase', keyword_info: { search_volume: 42 } }, { keyword: 'legacy topic', keyword_info: { search_volume: 9 } }]); } },
  });
  assert.equal(outcome.status, 'completed');
  assert.equal(outcome.result.decision, 'HUMAN_REVIEW');
  assert.equal(outcome.result.selectedKeyword?.phrase, 'winning phrase');
  assert.equal(outcome.result.selectedKeyword?.searchVolume, 42);
  assert.equal(outcome.result.titles.length, 3);
  assert.deepEqual(outcome.result.currentTitleKeywordEvidence, { status: 'available', phrase: 'legacy topic', searchVolume: 9, monthlySearches: [], source: 'keyword_ideas' });
  assert.deepEqual(endpoints, ['/v3/dataforseo_labs/google/keyword_ideas/live']);
  assert.deepEqual(stages, ['theme', 'ranking', 'draft']);
});

test('existing zero-volume review preserves truthful evidence and suggestions', async () => {
  const endpoints: string[] = [];
  const existingTheme = { ...theme, currentTitleKeyword: 'legacy topic' };
  const outcome = await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => existingTheme,
    rankingLlm: async () => ({ keywordScores: [{ phrase: 'zero phrase', components: component(0) }, { phrase: 'legacy topic', components: component(0) }] }),
    draftLlm: async () => draft('zero phrase'),
    dataForSeo: { token: 'test-token', fetch: async url => { const endpoint = new URL(String(url)).pathname; endpoints.push(endpoint); return endpoint.includes('keyword_ideas') ? provider([{ keyword: 'zero phrase', keyword_info: { search_volume: 0 } }]) : provider([{ keyword: 'legacy topic', search_volume: null }], 'volume-1'); } },
  });
  assert.equal(outcome.status, 'completed');
  assert.equal(outcome.result.decision, 'HUMAN_REVIEW');
  assert.equal(outcome.result.selectedKeyword?.searchVolume, 0);
  assert.equal(outcome.result.titles.length, 3);
  assert.deepEqual(outcome.result.currentTitleKeywordEvidence, { status: 'available', phrase: 'legacy topic', searchVolume: null, monthlySearches: [], source: 'search_volume' });
  assert.deepEqual(endpoints, ['/v3/dataforseo_labs/google/keyword_ideas/live', '/v3/keywords_data/google/search_volume/live']);
});

test('old-title keyword comparison reuses exact provider evidence', async () => {
  const endpoints: string[] = [];
  const existingTheme = { ...theme, currentTitleKeyword: 'legacy topic' };
  const outcome = await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => existingTheme,
    rankingLlm: async () => ({ keywordScores: [{ phrase: 'winning phrase', components: component(100) }, { phrase: 'Legacy Topic', components: component(22) }] }),
    draftLlm: async () => draft('winning phrase'),
    dataForSeo: { token: 'test-token', fetch: async url => { endpoints.push(new URL(String(url)).pathname); return provider([{ keyword: 'winning phrase', keyword_info: { search_volume: 50 } }, { keyword: 'Legacy Topic', keyword_info: { search_volume: 11 } }]); } },
  });
  assert.equal(outcome.status, 'completed');
  assert.deepEqual(outcome.result.currentTitleKeywordEvidence, { status: 'available', phrase: 'Legacy Topic', searchVolume: 11, monthlySearches: [], source: 'keyword_ideas' });
  assert.deepEqual(endpoints, ['/v3/dataforseo_labs/google/keyword_ideas/live']);
});

test('old-title keyword comparison reports unavailable without fabricated volume', async () => {
  const endpoints: string[] = [];
  const existingTheme = { ...theme, currentTitleKeyword: 'legacy topic' };
  const outcome = await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => existingTheme,
    rankingLlm: async () => ({ keywordScores: [{ phrase: 'winning phrase', components: component(100) }] }),
    draftLlm: async () => draft('winning phrase'),
    dataForSeo: { token: 'test-token', fetch: async url => { const endpoint = new URL(String(url)).pathname; endpoints.push(endpoint); if (endpoint.includes('search_volume')) throw new Error('synthetic volume failure'); return provider([{ keyword: 'winning phrase', keyword_info: { search_volume: 50 } }]); } },
  });
  assert.equal(outcome.status, 'completed');
  assert.equal(outcome.result.selectedKeyword?.searchVolume, 50);
  assert.deepEqual(outcome.result.currentTitleKeywordEvidence, { status: 'provider_unavailable' });
  assert.equal(outcome.providerUsage.length, 1);
  assert.deepEqual(endpoints, ['/v3/dataforseo_labs/google/keyword_ideas/live', '/v3/keywords_data/google/search_volume/live']);
});

test('keyword ideas failure falls back to direct seed volume', async () => {
  const endpoints: string[] = [];
  const stages: string[] = [];
  const existingTheme = { ...theme, currentTitleKeyword: 'legacy topic' };
  const outcome = await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => { stages.push('theme'); return existingTheme; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [{ phrase: 'topic one', components: component(100) }, { phrase: 'legacy topic', components: component(28) }] }; },
    draftLlm: async () => { stages.push('draft'); return draft('topic one'); },
    dataForSeo: { token: 'test-token', fetch: async url => { const endpoint = new URL(String(url)).pathname; endpoints.push(endpoint); if (endpoint.includes('keyword_ideas')) throw new Error('synthetic ideas failure'); return provider([{ keyword: 'topic one', search_volume: 25 }, { keyword: 'legacy topic', search_volume: 7 }], 'volume-1'); } },
  });
  assert.equal(outcome.status, 'completed');
  assert.equal(outcome.result.selectedKeyword?.phrase, 'topic one');
  assert.equal(outcome.result.selectedKeyword?.source, 'search_volume');
  assert.deepEqual(stages, ['theme', 'ranking', 'draft']);
  assert.deepEqual(endpoints, ['/v3/dataforseo_labs/google/keyword_ideas/live', '/v3/keywords_data/google/search_volume/live']);
});

test('provider exhaustion is operational failure not human review', async () => {
  const endpoints: string[] = [];
  const stages: string[] = [];
  const stored: unknown[] = [];
  const existingTheme = { ...theme, currentTitleKeyword: 'legacy topic' };
  const outcome = await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => { stages.push('theme'); return existingTheme; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [] }; },
    draftLlm: async () => { stages.push('draft'); return draft('topic one'); },
    dataForSeo: { token: 'test-token', fetch: async url => { endpoints.push(new URL(String(url)).pathname); throw new Error('synthetic provider failure'); } },
    store: record => { stored.push(record); },
  });
  assert.equal(outcome.status, 'failed');
  assert.deepEqual(outcome.failure, { stage: 'keywords', code: 'unavailable' });
  assert.deepEqual(outcome.providerUsage, []);
  assert.deepEqual(stages, ['theme']);
  assert.deepEqual(stored, []);
  assert.deepEqual(endpoints, ['/v3/dataforseo_labs/google/keyword_ideas/live', '/v3/keywords_data/google/search_volume/live']);
});

test('new low-theme review preserves keyword and title suggestions', async () => {
  const stages: string[] = [];
  const outcome = expectCompleted(await analyzePodcastEpisodeOutcome({ episodeId: 'new-low-theme', transcript: 'x'.repeat(500) }, profile, {
    themeLlm: async () => { stages.push('theme'); return { ...theme, confidence: 60, currentTitleKeyword: '' }; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [{ phrase: 'winning phrase', components: component(100) }] }; },
    draftLlm: async () => { stages.push('draft'); return draft('winning phrase'); },
    dataForSeo: { token: 'test-token', fetch: async () => provider([{ keyword: 'winning phrase', keyword_info: { search_volume: 42 } }]) },
  }));
  assert.equal(outcome.result.decision, 'HUMAN_REVIEW');
  assert.equal(outcome.result.selectedKeyword?.phrase, 'winning phrase');
  assert.equal(outcome.result.selectedKeyword?.searchVolume, 42);
  assert.equal(outcome.result.keywordEvidence.length, 1);
  assert.equal(outcome.result.titles.length, 3);
  assert.ok(outcome.result.titles.every(title => title.primaryPhrase === 'winning phrase'));
  assert.ok(outcome.result.description.length > 0);
  assert.deepEqual(stages, ['theme', 'ranking', 'draft']);
  assert.deepEqual(outcome.providerUsage, [{ operation: 'keyword_ideas', taskIds: ['ideas-1'], costUsd: 0.01 }]);
});

test('new low-ranking review preserves keyword and title suggestions', async () => {
  const stages: string[] = [];
  const outcome = expectCompleted(await analyzePodcastEpisodeOutcome({ episodeId: 'new-low-ranking', transcript: 'x'.repeat(500) }, profile, {
    themeLlm: async () => { stages.push('theme'); return { ...theme, currentTitleKeyword: '' }; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [{ phrase: 'winning phrase', components: { ...component(100), intentMatch: 0, titleNaturalness: 0, clickPotential: 0 } }] }; },
    draftLlm: async () => { stages.push('draft'); return draft('winning phrase'); },
    dataForSeo: { token: 'test-token', fetch: async () => provider([{ keyword: 'winning phrase', keyword_info: { search_volume: 42 } }]) },
  }));
  assert.equal(outcome.result.decision, 'HUMAN_REVIEW');
  assert.equal(outcome.result.selectedKeyword?.phrase, 'winning phrase');
  assert.equal(outcome.result.selectedKeyword?.searchVolume, 42);
  assert.equal(outcome.result.keywordEvidence.length, 1);
  assert.equal(outcome.result.titles.length, 3);
  assert.ok(outcome.result.description.length > 0);
  assert.deepEqual(stages, ['theme', 'ranking', 'draft']);
});

test('new relevance mismatch review preserves keyword and title suggestions', async () => {
  const stages: string[] = [];
  const outcome = expectCompleted(await analyzePodcastEpisodeOutcome({ episodeId: 'new-mismatch', transcript: 'x'.repeat(500) }, profile, {
    themeLlm: async () => { stages.push('theme'); return { ...theme, currentTitleKeyword: '' }; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [{ phrase: 'winning phrase', components: component(100) }], naturalSearchLanguageMismatch: true }; },
    draftLlm: async () => { stages.push('draft'); return draft('winning phrase'); },
    dataForSeo: { token: 'test-token', fetch: async () => provider([{ keyword: 'winning phrase', keyword_info: { search_volume: 42 } }]) },
  }));
  assert.equal(outcome.result.decision, 'HUMAN_REVIEW');
  assert.equal(outcome.result.selectedKeyword?.phrase, 'winning phrase');
  assert.equal(outcome.result.selectedKeyword?.searchVolume, 42);
  assert.equal(outcome.result.keywordEvidence.length, 1);
  assert.equal(outcome.result.titles.length, 3);
  assert.ok(outcome.result.description.length > 0);
  assert.deepEqual(stages, ['theme', 'ranking', 'draft']);
});

test('new zero-volume review preserves truthful evidence and suggestions', async () => {
  const stages: string[] = [];
  const outcome = expectCompleted(await analyzePodcastEpisodeOutcome({ episodeId: 'new-zero-volume', transcript: 'x'.repeat(500) }, profile, {
    themeLlm: async () => { stages.push('theme'); return { ...theme, currentTitleKeyword: '' }; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [{ phrase: 'zero phrase', components: component(0) }] }; },
    draftLlm: async () => { stages.push('draft'); return draft('zero phrase'); },
    dataForSeo: { token: 'test-token', fetch: async () => provider([{ keyword: 'zero phrase', keyword_info: { search_volume: 0 } }]) },
  }));
  assert.equal(outcome.result.decision, 'HUMAN_REVIEW');
  assert.equal(outcome.result.selectedKeyword?.phrase, 'zero phrase');
  assert.equal(outcome.result.selectedKeyword?.searchVolume, 0);
  assert.equal(outcome.result.keywordEvidence.length, 1);
  assert.equal(outcome.result.titles.length, 3);
  assert.ok(outcome.result.description.length > 0);
  assert.deepEqual(stages, ['theme', 'ranking', 'draft']);
});

test('existing-title review preserves keyword comparison and title suggestions', async () => {
  const stages: string[] = [];
  const outcome = expectCompleted(await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => { stages.push('theme'); return { ...theme, confidence: 60, currentTitleKeyword: 'legacy phrase' }; },
    rankingLlm: async () => { stages.push('ranking'); return { keywordScores: [{ phrase: 'winning phrase', components: component(100) }, { phrase: 'legacy phrase', components: component(16.7) }] }; },
    draftLlm: async () => { stages.push('draft'); return draft('winning phrase'); },
    dataForSeo: { token: 'test-token', fetch: async () => provider([{ keyword: 'winning phrase', keyword_info: { search_volume: 42 } }, { keyword: 'legacy phrase', keyword_info: { search_volume: 7 } }]) },
  }));
  assert.equal(outcome.result.decision, 'HUMAN_REVIEW');
  assert.equal(outcome.result.selectedKeyword?.phrase, 'winning phrase');
  assert.equal(outcome.result.selectedKeyword?.searchVolume, 42);
  assert.equal(outcome.result.keywordEvidence.length, 2);
  assert.equal(outcome.result.titles.length, 3);
  assert.ok(outcome.result.description.length > 0);
  assert.deepEqual(outcome.result.currentTitleKeywordEvidence, { status: 'available', phrase: 'legacy phrase', searchVolume: 7, monthlySearches: [], source: 'keyword_ideas' });
  assert.deepEqual(stages, ['theme', 'ranking', 'draft']);
});

test('operational failures never become human review', async () => {
  const terminalProvider = expectFailed(await analyzePodcastEpisodeOutcome(input(), profile, {
    themeLlm: async () => theme,
    dataForSeo: { token: 'test-token', fetch: async () => { throw new Error('synthetic provider failure'); } },
  }));
  assert.deepEqual(terminalProvider.failure, { stage: 'keywords', code: 'unavailable' });
  for (const failureCase of ['theme', 'ranking', 'draft'] as const) {
    const outcome = expectFailed(await analyzePodcastEpisodeOutcome(input(), profile, {
      themeLlm: async () => failureCase === 'theme' ? Promise.reject(new Error('synthetic theme failure')) : theme,
      rankingLlm: async () => failureCase === 'ranking' ? Promise.reject(new Error('synthetic ranking failure')) : { keywordScores: [{ phrase: 'winning phrase', components: component(100) }] },
      draftLlm: async () => failureCase === 'draft' ? Promise.reject(new Error('synthetic draft failure')) : draft('winning phrase'),
      dataForSeo: { token: 'test-token', fetch: async () => provider([{ keyword: 'winning phrase', keyword_info: { search_volume: 42 } }]) },
    }));
    assert.equal(outcome.failure.code, 'unavailable');
    assert.equal(outcome.failure.stage, failureCase === 'theme' ? 'theme' : 'writer');
    assert.equal(outcome.failure.step, failureCase === 'ranking' ? 'ranking' : failureCase === 'draft' ? 'draft' : undefined);
  }
});
