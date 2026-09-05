import type { PodcastProfile, StoredEpisodeAnalysis } from './types';
import { PODCAST_DESCRIPTION_MAX_LENGTH, PODCAST_DESCRIPTION_MIN_LENGTH, PODCAST_TITLE_MAX_LENGTH, PODCAST_TITLE_MIN_LENGTH, validatePodcastProfile } from './validation';

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
export type AdminPodcastProfile = PodcastProfile & {
  podcastName: string; targetAudience: string; podcastDomain: string; writingStyle: string;
  brandPhrases: string[]; topicScope: string[]; benefitTitlePreference: boolean;
  targetCountry: string; targetLanguage: string; titleLimit: number; descriptionLimit: number;
};
export type EpisodeSummary = { episodeId: string; createdAt: string; currentTitle: string; recommendedTitle: string; decision: string; confidence: number; theme: string; selectedKeyword: string; searchVolume: number | null };
export type ProfileSummary = Pick<AdminPodcastProfile, 'id' | 'name' | 'podcastName' | 'targetAudience' | 'podcastDomain' | 'writingStyle' | 'brandPhrases' | 'topicScope' | 'benefitTitlePreference' | 'targetCountry' | 'targetLanguage' | 'titleLimit' | 'descriptionLimit'>;
const text = (value: unknown, max = 2000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value.trim() : null;
const integer = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;
const strings = (value: unknown) => Array.isArray(value) && value.length <= 50 && value.every(item => typeof item === 'string' && item.trim() && item.length <= 200) ? value.map(item => item.trim()) : null;

export function createProfileFromRequest(value: unknown, existing?: AdminPodcastProfile): AdminPodcastProfile | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = text(raw.id, 80);
  const name = text(raw.name, 200); const podcastName = text(raw.podcastName, 200); const targetAudience = text(raw.targetAudience, 500);
  const podcastDomain = text(raw.podcastDomain, 200); const writingStyle = text(raw.writingStyle, 500);
  const brandPhrases = strings(raw.brandPhrases); const topicScope = strings(raw.topicScope); const targetCountry = text(raw.targetCountry, 20); const targetLanguage = text(raw.targetLanguage, 20);
  const titleLimit = integer(raw.titleLimit, PODCAST_TITLE_MIN_LENGTH, PODCAST_TITLE_MAX_LENGTH); const descriptionLimit = integer(raw.descriptionLimit, PODCAST_DESCRIPTION_MIN_LENGTH, PODCAST_DESCRIPTION_MAX_LENGTH);
  if (!id || !ID.test(id) || (existing && existing.id !== id) || !name || !podcastName || !targetAudience || !podcastDomain || !writingStyle || !brandPhrases || !topicScope || !targetCountry || !targetLanguage || titleLimit === null || descriptionLimit === null || typeof raw.benefitTitlePreference !== 'boolean') return null;
  const seeds = topicScope.filter(Boolean).slice(0, 3);
  if (!seeds.length) return null;
  const profile = { id, name, audience: targetAudience, titleMinLength: PODCAST_TITLE_MIN_LENGTH, titleMaxLength: titleLimit, descriptionMinLength: PODCAST_DESCRIPTION_MIN_LENGTH, descriptionMaxLength: descriptionLimit, seedKeywords: seeds, podcastName, targetAudience, podcastDomain, writingStyle, brandPhrases, topicScope, benefitTitlePreference: raw.benefitTitlePreference, targetCountry, targetLanguage, titleLimit, descriptionLimit };
  return validatePodcastProfile(profile) ? profile : null;
}
export function profileSummary(profile: AdminPodcastProfile): ProfileSummary { const { id, name, podcastName, targetAudience, podcastDomain, writingStyle, brandPhrases, topicScope, benefitTitlePreference, targetCountry, targetLanguage, titleLimit, descriptionLimit } = profile; return { id, name, podcastName, targetAudience, podcastDomain, writingStyle, brandPhrases, topicScope, benefitTitlePreference, targetCountry, targetLanguage, titleLimit, descriptionLimit }; }
export function episodeSummary(record: StoredEpisodeAnalysis): EpisodeSummary { return { episodeId: record.episodeId, createdAt: record.createdAt, currentTitle: record.input.currentTitle ?? '', recommendedTitle: record.result.titles[0]?.title ?? '', decision: record.result.decision, confidence: record.theme.confidence, theme: record.theme.theme, selectedKeyword: record.result.selectedKeyword?.phrase ?? '', searchVolume: record.result.selectedKeyword?.searchVolume ?? null }; }
export function validId(value: string | null): value is string { return Boolean(value && ID.test(value)); }
export function toArray(value: string): string[] { return value.split(/[\n,]/).map(item => item.trim()).filter(Boolean); }
