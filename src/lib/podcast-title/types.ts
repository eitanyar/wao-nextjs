export type Decision = 'KEEP' | 'CHANGE' | 'HUMAN_REVIEW';
export type EpisodeFormat = 'intro' | 'single_topic' | 'interview' | 'personal_story' | 'educational' | 'case_study' | 'mixed';
export type TitleRole = 'balanced' | 'search_focused' | 'curiosity';

export interface PodcastProfile {
  id: string;
  name: string;
  audience: string;
  titleMinLength: number;
  titleMaxLength: number;
  descriptionMinLength: number;
  descriptionMaxLength: number;
  seedKeywords: string[];
}
export interface EpisodeAnalysisInput { episodeId?: string; transcript: string; currentTitle?: string; currentDescription?: string; }
export interface ThemeAnalysis { format: EpisodeFormat; theme: string; supportingTopics: string[]; examples: string[]; excludedTopics: string[]; listenerIntent: string; listenerPromise: string; seeds: string[]; confidence: number; }
export interface KeywordCandidate { phrase: string; searchVolume: number | null; monthlySearches: Array<{ year: number; month: number; searchVolume: number }>; source: 'keyword_ideas' | 'autocomplete'; taskIds: string[]; providerCostUsd: number; }
export interface KeywordScoreComponents { themeRelevance: number; intentMatch: number; normalizedVolume: number; titleNaturalness: number; clickPotential: number; }
export interface ScoredKeyword extends KeywordCandidate { components: KeywordScoreComponents; score: number; relevant: boolean; }
export interface TitleCandidate { role: TitleRole; title: string; primaryPhrase: string; }
export interface PodcastTitleResult { decision: Decision; reason: string; theme: ThemeAnalysis; keywordEvidence: ScoredKeyword[]; selectedKeyword?: ScoredKeyword; titles: TitleCandidate[]; description: string; currentTitleScore: number; recommendedTitleScore: number; fallbackUsed: boolean; llmCallsUsed: number; failure?: { stage: 'theme' | 'keywords' | 'writer'; code: 'timeout' | 'aborted' | 'unavailable' | 'invalid_output'; step?: 'ranking' | 'draft' }; }
export interface ProviderUsageEntry { operation: string; taskIds: string[]; costUsd: number; }
export interface StoredEpisodeAnalysis { schemaVersion: 1; profileId: string; episodeId: string; input: EpisodeAnalysisInput; transcriptDigest: string; theme: ThemeAnalysis; result: PodcastTitleResult; providerUsage: ProviderUsageEntry[]; createdAt: string; updatedAt: string; }
export interface WriterRankingOutput { keywordScores: Array<{ phrase: string; components: KeywordScoreComponents }>; naturalSearchLanguageMismatch?: boolean; }
export interface WriterDraftOutput { currentTitleComponents?: KeywordScoreComponents; recommendedTitleComponents?: KeywordScoreComponents; titles: [TitleCandidate, TitleCandidate, TitleCandidate]; description: string; reason: string; }
