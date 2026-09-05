import crypto from 'crypto';
import { callGeminiJSON } from '../ai/gemini-fast';
import { fetchPodcastKeywordIdeas, fetchPodcastSearchVolume, type PodcastDataForSeoOptions } from './dataForSeo';
import { buildThemeUserMessage, buildWriterDraftUserMessage, buildWriterRankingUserMessage, THEME_SYSTEM_PROMPT, WRITER_DRAFT_SYSTEM_PROMPT, WRITER_RANKING_SYSTEM_PROMPT } from './prompts';
import { calculateKeywordScore, calculateTitleScore, decideTitleChange, normalizeSearchVolume, selectBestAvailableKeyword } from './scoring';
import { PODCAST_THEME_RESPONSE_JSON_SCHEMA, PODCAST_WRITER_DRAFT_RESPONSE_JSON_SCHEMA, PODCAST_WRITER_RANKING_RESPONSE_JSON_SCHEMA } from './geminiSchemas';
import type { CompletedPodcastTitleResult, CurrentTitleKeywordEvidence, EpisodeAnalysisInput, KeywordCandidate, PodcastAnalysisOutcome, PodcastOperationalFailure, PodcastProfile, PodcastTitleResult, ProviderUsageEntry, ScoredKeyword, StoredEpisodeAnalysis, ThemeAnalysis, WriterDraftOutput, WriterRankingOutput } from './types';
import { normalizeThemeProviderOutput, validateEpisodeInput, validatePodcastProfile, validateWriterDraftOutput, validateWriterRankingOutput } from './validation';

export const PODCAST_ANALYSIS_TIMEOUT_MS = 150_000;
export const PODCAST_THEME_TIMEOUT_MS = 45_000;
export const PODCAST_DATAFORSEO_TIMEOUT_MS = 15_000;
export const PODCAST_WRITER_TIMEOUT_MS = 45_000;

type StageLlm = (message: string, signal?: AbortSignal) => Promise<unknown>;
export interface AnalyzeDependencies { themeLlm?: StageLlm; rankingLlm?: StageLlm; draftLlm?: StageLlm; dataForSeo?: PodcastDataForSeoOptions; llmFetch?: typeof globalThis.fetch; signal?: AbortSignal; now?: () => Date; store?: (record: StoredEpisodeAnalysis) => Promise<void> | void; }

const defaultTheme = (message: string, signal: AbortSignal | undefined, fetchImplementation?: typeof globalThis.fetch): Promise<unknown> => callGeminiJSON(THEME_SYSTEM_PROMPT, message, { model: 'gemini-3.8-flash', thinkingLevel: 'LOW', signal, timeoutMs: PODCAST_THEME_TIMEOUT_MS, fetch: fetchImplementation, responseJsonSchema: PODCAST_THEME_RESPONSE_JSON_SCHEMA }).then(JSON.parse);
const defaultRanking = (message: string, signal: AbortSignal | undefined, fetchImplementation?: typeof globalThis.fetch): Promise<unknown> => callGeminiJSON(WRITER_RANKING_SYSTEM_PROMPT, message, { model: 'gemini-3.8-flash', thinkingLevel: 'LOW', signal, timeoutMs: PODCAST_WRITER_TIMEOUT_MS, fetch: fetchImplementation, responseJsonSchema: PODCAST_WRITER_RANKING_RESPONSE_JSON_SCHEMA }).then(JSON.parse);
const defaultDraft = (message: string, signal: AbortSignal | undefined, fetchImplementation?: typeof globalThis.fetch): Promise<unknown> => callGeminiJSON(WRITER_DRAFT_SYSTEM_PROMPT, message, { model: 'gemini-3.8-flash', thinkingLevel: 'LOW', signal, timeoutMs: PODCAST_WRITER_TIMEOUT_MS, fetch: fetchImplementation, responseJsonSchema: PODCAST_WRITER_DRAFT_RESPONSE_JSON_SCHEMA }).then(JSON.parse);
const clean = (candidates: KeywordCandidate[]) => { const seen = new Set<string>(); return candidates.filter(candidate => { const key = candidate.phrase.trim().toLocaleLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; }); };
const normalizedPhrase = (phrase: string) => phrase.trim().toLocaleLowerCase();
const hasRecognizablePositiveVolume = (candidate: KeywordCandidate) => typeof candidate.searchVolume === 'number' && Number.isFinite(candidate.searchVolume) && candidate.searchVolume > 0;
const invalidRanking = (): WriterRankingOutput => ({ keywordScores: [] });
const invalidDraft = (): WriterDraftOutput => ({ titles: [] as unknown as WriterDraftOutput['titles'], description: '', reason: '' });
const isTimeout = (value: unknown) => Boolean(value && typeof value === 'object' && (value as { name?: unknown }).name === 'TimeoutError');
const failureCode = (error: unknown, callerSignal?: AbortSignal): PodcastOperationalFailure['code'] => isTimeout(error) || isTimeout(callerSignal?.reason) ? 'timeout' : callerSignal?.aborted ? 'aborted' : 'unavailable';
const stageSignal = (overallSignal: AbortSignal, timeoutMs: number) => AbortSignal.any([overallSignal, AbortSignal.timeout(timeoutMs)]);
const complete = (result: CompletedPodcastTitleResult, providerUsage: ProviderUsageEntry[]): PodcastAnalysisOutcome => ({ status: 'completed', result, providerUsage });
const failed = (stage: PodcastOperationalFailure['stage'], code: PodcastOperationalFailure['code'], providerUsage: ProviderUsageEntry[], step?: PodcastOperationalFailure['step']): PodcastAnalysisOutcome => ({ status: 'failed', failure: { stage, code, ...(step ? { step } : {}) }, providerUsage });


function mergeCandidates(ideas: KeywordCandidate[], volumes: KeywordCandidate[]): KeywordCandidate[] {
  const merged = clean(ideas).slice();
  const indexes = new Map(merged.map((candidate, index) => [normalizedPhrase(candidate.phrase), index]));
  for (const candidate of clean(volumes)) {
    const index = indexes.get(normalizedPhrase(candidate.phrase));
    if (index === undefined) { indexes.set(normalizedPhrase(candidate.phrase), merged.length); merged.push(candidate); } else merged[index] = candidate;
  }
  return merged;
}

function currentTitleEvidence(keyword: string | undefined, candidates: KeywordCandidate[], comparisonUnavailable: boolean): CurrentTitleKeywordEvidence | undefined {
  if (keyword === undefined) return undefined;
  if (!keyword.trim()) return { status: 'not_extractable' };
  const candidate = candidates.find(value => normalizedPhrase(value.phrase) === normalizedPhrase(keyword));
  if (candidate) return { status: 'available', phrase: candidate.phrase, searchVolume: candidate.searchVolume, monthlySearches: candidate.monthlySearches, source: candidate.source === 'search_volume' ? 'search_volume' : 'keyword_ideas' };
  return comparisonUnavailable ? { status: 'provider_unavailable' } : { status: 'provider_no_data' };
}

export async function analyzePodcastEpisodeOutcome(input: EpisodeAnalysisInput, profile: PodcastProfile, dependencies: AnalyzeDependencies = {}): Promise<PodcastAnalysisOutcome> {
  if (!validateEpisodeInput(input) || !validatePodcastProfile(profile)) throw new Error('Invalid podcast analysis input');
  const usage: ProviderUsageEntry[] = [];
  const overallSignal = dependencies.signal ? AbortSignal.any([dependencies.signal, AbortSignal.timeout(PODCAST_ANALYSIS_TIMEOUT_MS)]) : AbortSignal.timeout(PODCAST_ANALYSIS_TIMEOUT_MS);
  const themeLlm = dependencies.themeLlm ?? ((message: string, signal?: AbortSignal) => defaultTheme(message, signal, dependencies.llmFetch));
  const rankingLlm = dependencies.rankingLlm ?? ((message: string, signal?: AbortSignal) => defaultRanking(message, signal, dependencies.llmFetch));
  const draftLlm = dependencies.draftLlm ?? ((message: string, signal?: AbortSignal) => defaultDraft(message, signal, dependencies.llmFetch));
  const existingTitle = Boolean(input.currentTitle?.trim());
  const themeSignal = stageSignal(overallSignal, PODCAST_THEME_TIMEOUT_MS);
  if (themeSignal.aborted) return failed('theme', failureCode(themeSignal.reason, dependencies.signal), usage);
  let rawTheme: unknown;
  try { rawTheme = await themeLlm(buildThemeUserMessage(profile, input.transcript, { title: input.currentTitle, description: input.currentDescription }), themeSignal); } catch (error) { return failed('theme', failureCode(error, dependencies.signal), usage); }
  const theme = normalizeThemeProviderOutput(rawTheme, input);
  if (!theme) return failed('theme', 'invalid_output', usage);
  const forcedThemeReview = theme.confidence < 70;


  const options = { ...dependencies.dataForSeo, budget: dependencies.dataForSeo?.budget ?? { calls: 0 } };
  const keywordOptions = (signal: AbortSignal) => ({ ...options, signal, timeoutMs: PODCAST_DATAFORSEO_TIMEOUT_MS });
  let ideaCandidates: KeywordCandidate[] = [];
  let ideasFailed = false;
  try {
    const signal = stageSignal(overallSignal, PODCAST_DATAFORSEO_TIMEOUT_MS);
    if (signal.aborted) return failed('keywords', failureCode(signal.reason, dependencies.signal), usage);
    const result = await fetchPodcastKeywordIdeas(theme.seeds, keywordOptions(signal));
    usage.push(result.usage);
    ideaCandidates = clean(result.candidates);
  } catch { ideasFailed = true; }

  const titleKeyword = existingTitle ? theme.currentTitleKeyword ?? '' : undefined;
  const titleExactInIdeas = titleKeyword?.trim() ? ideaCandidates.some(candidate => normalizedPhrase(candidate.phrase) === normalizedPhrase(titleKeyword)) : false;
  const needsVolumes = ideasFailed || !ideaCandidates.length || Boolean(titleKeyword?.trim() && !titleExactInIdeas);
  let volumeCandidates: KeywordCandidate[] = [];
  let volumeFailed = false;
  if (needsVolumes) {
    try {
      const signal = stageSignal(overallSignal, PODCAST_DATAFORSEO_TIMEOUT_MS);
      if (signal.aborted) return failed('keywords', failureCode(signal.reason, dependencies.signal), usage);
      const phrases = [...new Map([...theme.seeds, ...(titleKeyword?.trim() ? [titleKeyword] : [])].map(phrase => [normalizedPhrase(phrase), phrase])).values()];
      const result = await fetchPodcastSearchVolume(phrases, keywordOptions(signal));
      usage.push(result.usage);
      volumeCandidates = clean(result.candidates).filter(candidate => phrases.some(phrase => normalizedPhrase(phrase) === normalizedPhrase(candidate.phrase)));
    } catch { volumeFailed = true; }
  }
  const candidates = mergeCandidates(ideaCandidates, volumeCandidates);
  if (!candidates.length) return failed('keywords', 'unavailable', usage);
  const titleEvidence = currentTitleEvidence(titleKeyword, candidates, volumeFailed);

  const withVolumes = () => { const volumes = normalizeSearchVolume(candidates.map(candidate => candidate.searchVolume)); return candidates.map((candidate, index) => ({ ...candidate, normalizedVolume: volumes[index] })); };
  const rankingSignal = stageSignal(overallSignal, PODCAST_WRITER_TIMEOUT_MS);
  let ranking: WriterRankingOutput;
  try {
    if (rankingSignal.aborted) throw rankingSignal.reason;
    const raw = await rankingLlm(buildWriterRankingUserMessage(profile, theme, { title: input.currentTitle, description: input.currentDescription }, withVolumes()), rankingSignal);
    ranking = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as WriterRankingOutput : invalidRanking();
  } catch (error) { return failed('writer', failureCode(error, dependencies.signal), usage, 'ranking'); }
  if (!validateWriterRankingOutput(ranking, withVolumes())) return failed('writer', 'invalid_output', usage, 'ranking');
  const evidence: ScoredKeyword[] = withVolumes().map(candidate => {
    const components = ranking.keywordScores.find(entry => entry.phrase === candidate.phrase)!.components;
    return { ...candidate, components, score: calculateKeywordScore(components), relevant: components.themeRelevance >= 70 };
  });
  const selected = selectBestAvailableKeyword(evidence);
  if (!selected) return failed('keywords', 'unavailable', usage);
  const forcedReview = forcedThemeReview || selected.components.themeRelevance < 70 || selected.score < 70 || Boolean(ranking.naturalSearchLanguageMismatch) || !hasRecognizablePositiveVolume(selected);


  const draftSignal = stageSignal(overallSignal, PODCAST_WRITER_TIMEOUT_MS);
  let draft: WriterDraftOutput;
  try {
    if (draftSignal.aborted) throw draftSignal.reason;
    const raw = await draftLlm(buildWriterDraftUserMessage(profile, theme, { title: input.currentTitle, description: input.currentDescription }, selected), draftSignal);
    draft = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as WriterDraftOutput : invalidDraft();
  } catch (error) { return failed('writer', failureCode(error, dependencies.signal), usage, 'draft'); }
  if (!validateWriterDraftOutput(draft, profile, selected.phrase)) return failed('writer', 'invalid_output', usage, 'draft');
  const currentScore = draft.currentTitleComponents ? calculateTitleScore(draft.currentTitleComponents) : 0;
  const recommendedScore = draft.recommendedTitleComponents ? calculateTitleScore(draft.recommendedTitleComponents) : selected.score;
  const decision = forcedReview ? 'HUMAN_REVIEW' : decideTitleChange({ currentTitle: input.currentTitle, currentScore, recommendedScore, themeConfidence: theme.confidence, hasRelevantPositiveVolumeKeyword: hasRecognizablePositiveVolume(selected), writerValid: true });
  return complete({ decision, reason: draft.reason, theme, keywordEvidence: evidence, selectedKeyword: selected, titles: draft.titles, description: draft.description, currentTitleScore: currentScore, recommendedTitleScore: recommendedScore, fallbackUsed: false, llmCallsUsed: 3, ...(titleEvidence ? { currentTitleKeywordEvidence: titleEvidence } : {}) }, usage);
}

export function createStoredEpisodeAnalysis(profile: PodcastProfile, input: EpisodeAnalysisInput, result: PodcastTitleResult, providerUsage: ProviderUsageEntry[], now = new Date()): StoredEpisodeAnalysis { const episodeId = input.episodeId?.trim() || crypto.randomUUID(); return { schemaVersion: 1, profileId: profile.id, episodeId, input: { ...input, episodeId }, transcriptDigest: crypto.createHash('sha256').update(input.transcript).digest('hex'), theme: result.theme, result, providerUsage, createdAt: now.toISOString(), updatedAt: now.toISOString() }; }
