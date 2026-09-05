import crypto from 'crypto';
import { callGeminiJSON } from '../ai/gemini-fast';
import { fetchPodcastKeywordIdeas, type PodcastDataForSeoOptions } from './dataForSeo';
import { buildThemeUserMessage, buildWriterDraftUserMessage, buildWriterRankingUserMessage, THEME_SYSTEM_PROMPT, WRITER_DRAFT_SYSTEM_PROMPT, WRITER_RANKING_SYSTEM_PROMPT } from './prompts';
import { calculateKeywordScore, calculateTitleScore, decideTitleChange, normalizeSearchVolume, selectKeyword } from './scoring';
import { PODCAST_THEME_RESPONSE_JSON_SCHEMA, PODCAST_WRITER_DRAFT_RESPONSE_JSON_SCHEMA, PODCAST_WRITER_RANKING_RESPONSE_JSON_SCHEMA } from './geminiSchemas';
import type { EpisodeAnalysisInput, KeywordCandidate, PodcastProfile, PodcastTitleResult, ProviderUsageEntry, StoredEpisodeAnalysis, ThemeAnalysis, WriterDraftOutput, WriterRankingOutput } from './types';
import { normalizeThemeProviderOutput, validateEpisodeInput, validatePodcastProfile, validateWriterDraftOutput, validateWriterRankingOutput } from './validation';

export const PODCAST_ANALYSIS_TIMEOUT_MS = 150_000;
export const PODCAST_THEME_TIMEOUT_MS = 45_000;
export const PODCAST_DATAFORSEO_TIMEOUT_MS = 15_000;
export const PODCAST_WRITER_TIMEOUT_MS = 45_000;


type FailureStage = 'theme' | 'keywords' | 'writer';
type FailureCode = NonNullable<PodcastTitleResult['failure']>['code'];
type StageLlm = (message: string, signal?: AbortSignal) => Promise<unknown>;

export interface AnalyzeDependencies { themeLlm?: StageLlm; rankingLlm?: StageLlm; draftLlm?: StageLlm; dataForSeo?: PodcastDataForSeoOptions; llmFetch?: typeof globalThis.fetch; signal?: AbortSignal; now?: () => Date; store?: (record: StoredEpisodeAnalysis) => Promise<void> | void; }
const defaultTheme = (message: string, signal: AbortSignal | undefined, fetchImplementation?: typeof globalThis.fetch): Promise<unknown> => callGeminiJSON(THEME_SYSTEM_PROMPT, message, { model: 'gemini-3.8-flash', thinkingLevel: 'LOW', signal, timeoutMs: PODCAST_THEME_TIMEOUT_MS, fetch: fetchImplementation, responseJsonSchema: PODCAST_THEME_RESPONSE_JSON_SCHEMA }).then(JSON.parse);
const defaultRanking = (message: string, signal: AbortSignal | undefined, fetchImplementation?: typeof globalThis.fetch): Promise<unknown> => callGeminiJSON(WRITER_RANKING_SYSTEM_PROMPT, message, { model: 'gemini-3.8-flash', thinkingLevel: 'LOW', signal, timeoutMs: PODCAST_WRITER_TIMEOUT_MS, fetch: fetchImplementation, responseJsonSchema: PODCAST_WRITER_RANKING_RESPONSE_JSON_SCHEMA }).then(JSON.parse);
const defaultDraft = (message: string, signal: AbortSignal | undefined, fetchImplementation?: typeof globalThis.fetch): Promise<unknown> => callGeminiJSON(WRITER_DRAFT_SYSTEM_PROMPT, message, { model: 'gemini-3.8-flash', thinkingLevel: 'LOW', signal, timeoutMs: PODCAST_WRITER_TIMEOUT_MS, fetch: fetchImplementation, responseJsonSchema: PODCAST_WRITER_DRAFT_RESPONSE_JSON_SCHEMA }).then(JSON.parse);
const clean = (candidates: KeywordCandidate[]) => { const seen = new Set<string>(); return candidates.filter(v => { const key = v.phrase.trim().toLocaleLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; }); };
const hasRecognizablePositiveVolume = (candidate: KeywordCandidate) => typeof candidate.searchVolume === 'number' && Number.isFinite(candidate.searchVolume) && candidate.searchVolume > 0;
const invalidTheme: ThemeAnalysis = { format: 'mixed', theme: '', supportingTopics: [], examples: [], excludedTopics: [], listenerIntent: '', listenerPromise: '', seeds: [], confidence: 0 };
const invalidRanking = (): WriterRankingOutput => ({ keywordScores: [] });
const invalidDraft = (): WriterDraftOutput => ({ titles: [] as unknown as WriterDraftOutput['titles'], description: '', reason: '' });
const isTimeout = (value: unknown) => Boolean(value && typeof value === 'object' && (value as { name?: unknown }).name === 'TimeoutError');
const failureCode = (error: unknown, callerSignal?: AbortSignal): FailureCode => isTimeout(error) || isTimeout(callerSignal?.reason) ? 'timeout' : callerSignal?.aborted ? 'aborted' : 'unavailable';
const stageSignal = (overallSignal: AbortSignal, timeoutMs: number) => AbortSignal.any([overallSignal, AbortSignal.timeout(timeoutMs)]);
function review(theme: ThemeAnalysis, reason: string, llmCallsUsed: number, failure?: PodcastTitleResult['failure']): PodcastTitleResult { return { decision: 'HUMAN_REVIEW', reason, theme, keywordEvidence: [], titles: [], description: '', currentTitleScore: 0, recommendedTitleScore: 0, fallbackUsed: false, llmCallsUsed, ...(failure ? { failure } : {}) }; }

export async function analyzePodcastEpisode(input: EpisodeAnalysisInput, profile: PodcastProfile, dependencies: AnalyzeDependencies = {}): Promise<PodcastTitleResult> {
 if (!validateEpisodeInput(input) || !validatePodcastProfile(profile)) throw new Error('Invalid podcast analysis input');
 const usage: ProviderUsageEntry[] = [];
 const finish = async (result: PodcastTitleResult) => { if (dependencies.store) await dependencies.store(createStoredEpisodeAnalysis(profile, input, result, usage, dependencies.now?.() ?? new Date())); return result; };
 const overallSignal = dependencies.signal ? AbortSignal.any([dependencies.signal, AbortSignal.timeout(PODCAST_ANALYSIS_TIMEOUT_MS)]) : AbortSignal.timeout(PODCAST_ANALYSIS_TIMEOUT_MS);
 const themeLlm = dependencies.themeLlm ?? ((message: string, signal?: AbortSignal) => defaultTheme(message, signal, dependencies.llmFetch));
 const rankingLlm = dependencies.rankingLlm ?? ((message: string, signal?: AbortSignal) => defaultRanking(message, signal, dependencies.llmFetch));
 const draftLlm = dependencies.draftLlm ?? ((message: string, signal?: AbortSignal) => defaultDraft(message, signal, dependencies.llmFetch));
 const failed = (stage: FailureStage, code: FailureCode, theme: ThemeAnalysis, llmCallsUsed: number, step?: 'ranking' | 'draft') => finish(review(theme, 'Analysis operation requires human review', llmCallsUsed, { stage, code, ...(step ? { step } : {}) }));
 const themeSignal = stageSignal(overallSignal, PODCAST_THEME_TIMEOUT_MS);
 if (themeSignal.aborted) return failed('theme', failureCode(themeSignal.reason, dependencies.signal), invalidTheme, 0);
 let rawTheme: unknown;
 try { rawTheme = await themeLlm(buildThemeUserMessage(profile, input.transcript), themeSignal); } catch (error) { return failed('theme', failureCode(error, dependencies.signal), invalidTheme, 1); }
 const theme = normalizeThemeProviderOutput(rawTheme);
 if (!theme) return failed('theme', 'invalid_output', invalidTheme, 1);
 if (theme.confidence < 70) return finish(review(theme, 'Theme confidence below threshold', 1));
 const options = { ...dependencies.dataForSeo, budget: dependencies.dataForSeo?.budget ?? { calls: 0 } };
 let candidates: KeywordCandidate[];
 const keywordOptions = (signal: AbortSignal) => ({ ...options, signal, timeoutMs: PODCAST_DATAFORSEO_TIMEOUT_MS });
 try {
   const signal = stageSignal(overallSignal, PODCAST_DATAFORSEO_TIMEOUT_MS);
   if (signal.aborted) return failed('keywords', failureCode(signal.reason, dependencies.signal), theme, 1);
   const first = await fetchPodcastKeywordIdeas(theme.seeds, keywordOptions(signal));
   usage.push(first.usage);
   candidates = clean(first.candidates);
 } catch (error) { return failed('keywords', failureCode(error, dependencies.signal), theme, 1); }
 if (!candidates.length || !candidates.some(hasRecognizablePositiveVolume)) return finish(review(theme, 'Analysis operation requires human review', 1));
 const candidatesWithVolumes = () => { const volumes = normalizeSearchVolume(candidates.map(candidate => candidate.searchVolume)); return candidates.map((candidate, index) => ({ ...candidate, normalizedVolume: volumes[index] })); };
 const runRanking = async () => { const signal = stageSignal(overallSignal, PODCAST_WRITER_TIMEOUT_MS); if (signal.aborted) throw signal.reason; const raw = await rankingLlm(buildWriterRankingUserMessage(profile, theme, { title: input.currentTitle, description: input.currentDescription }, candidatesWithVolumes()), signal); return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as WriterRankingOutput : invalidRanking(); };
 const scoreEvidence = (ranking: WriterRankingOutput) => candidatesWithVolumes().map(candidate => { const found = ranking.keywordScores.find(entry => entry.phrase === candidate.phrase); const components = found?.components as import('./types').KeywordScoreComponents; return { ...candidate, components, score: calculateKeywordScore(components), relevant: components.themeRelevance >= 70 }; });
 let llmCallsUsed = 2;
 let ranking: WriterRankingOutput;
 try { ranking = await runRanking(); } catch (error) { return failed('writer', failureCode(error, dependencies.signal), theme, llmCallsUsed, 'ranking'); }
 if (!validateWriterRankingOutput(ranking, candidatesWithVolumes())) return failed('writer', 'invalid_output', theme, llmCallsUsed, 'ranking');
 const evidence = scoreEvidence(ranking);
 const selected = selectKeyword(evidence.filter(hasRecognizablePositiveVolume).map(value => ({ ...value, themeRelevance: value.components.themeRelevance })));
 if (!selected || selected.score < 70 || ranking.naturalSearchLanguageMismatch) return finish(review(theme, 'Analysis operation requires human review', llmCallsUsed));
 const runDraft = async () => { const signal = stageSignal(overallSignal, PODCAST_WRITER_TIMEOUT_MS); if (signal.aborted) throw signal.reason; const raw = await draftLlm(buildWriterDraftUserMessage(profile, theme, { title: input.currentTitle, description: input.currentDescription }, selected), signal); return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as WriterDraftOutput : invalidDraft(); };
 llmCallsUsed += 1;
 let draft: WriterDraftOutput;
 try { draft = await runDraft(); } catch (error) { return failed('writer', failureCode(error, dependencies.signal), theme, llmCallsUsed, 'draft'); }
 if (!validateWriterDraftOutput(draft, profile, selected.phrase)) return failed('writer', 'invalid_output', theme, llmCallsUsed, 'draft');
 const currentScore = draft.currentTitleComponents ? calculateTitleScore(draft.currentTitleComponents) : 0;
 const recommendedScore = draft.recommendedTitleComponents ? calculateTitleScore(draft.recommendedTitleComponents) : selected.score;
 const decision = decideTitleChange({ currentTitle: input.currentTitle, currentScore, recommendedScore, themeConfidence: theme.confidence, hasRelevantPositiveVolumeKeyword: true, writerValid: true });
 return finish({ decision, reason: draft.reason, theme, keywordEvidence: evidence, selectedKeyword: selected, titles: draft.titles, description: draft.description, currentTitleScore: currentScore, recommendedTitleScore: recommendedScore, fallbackUsed: false, llmCallsUsed });
}
export function createStoredEpisodeAnalysis(profile: PodcastProfile, input: EpisodeAnalysisInput, result: PodcastTitleResult, providerUsage: ProviderUsageEntry[], now = new Date()): StoredEpisodeAnalysis { const episodeId = input.episodeId?.trim() || crypto.randomUUID(); return { schemaVersion: 1, profileId: profile.id, episodeId, input: { ...input, episodeId }, transcriptDigest: crypto.createHash('sha256').update(input.transcript).digest('hex'), theme: result.theme, result, providerUsage, createdAt: now.toISOString(), updatedAt: now.toISOString() }; }
