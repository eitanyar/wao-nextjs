import type { Decision, KeywordScoreComponents } from './types';
const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
const round = (value: number) => Math.round(value * 10) / 10;
export function normalizeSearchVolume(volumes: Array<number | null | undefined>): number[] { const max = Math.max(0, ...volumes.map(v => typeof v === 'number' && v > 0 ? v : 0)); return volumes.map(v => max ? round(((typeof v === 'number' && v > 0 ? v : 0) / max) * 100) : 0); }
export function calculateKeywordScore(components: KeywordScoreComponents): number { return round(clamp(components.themeRelevance) * .45 + clamp(components.intentMatch) * .25 + clamp(components.normalizedVolume) * .15 + clamp(components.titleNaturalness) * .10 + clamp(components.clickPotential) * .05); }
export function selectKeyword<T extends { score: number; themeRelevance: number }>(candidates: T[]): T | undefined { return candidates.filter(v => v.themeRelevance >= 70).sort((a, b) => b.score - a.score)[0]; }
export function selectBestAvailableKeyword<T extends { score: number; searchVolume: number | null; components: { themeRelevance: number } }>(candidates: T[]): T | undefined {
  const eligible = candidates.map((candidate, index) => ({ candidate, index })).filter(({ candidate }) => candidate.components.themeRelevance >= 70);
  const ranked = (eligible.length ? eligible : candidates.map((candidate, index) => ({ candidate, index }))).slice();
  ranked.sort((a, b) => b.candidate.score - a.candidate.score || b.candidate.components.themeRelevance - a.candidate.components.themeRelevance || Number(typeof b.candidate.searchVolume === 'number') - Number(typeof a.candidate.searchVolume === 'number') || a.index - b.index);
  return ranked[0]?.candidate;
}
export function calculateTitleScore(components: KeywordScoreComponents): number { return calculateKeywordScore(components); }
export function decideTitleChange(input: { currentTitle?: string; currentScore: number; recommendedScore: number; themeConfidence: number; hasRelevantPositiveVolumeKeyword: boolean; writerValid: boolean; defects?: string[] }): Decision { if (input.themeConfidence < 70 || !input.hasRelevantPositiveVolumeKeyword || !input.writerValid) return 'HUMAN_REVIEW'; if (!input.currentTitle?.trim()) return 'CHANGE'; if (input.recommendedScore < 70) return 'HUMAN_REVIEW'; if ((input.defects ?? []).some(v => ['misleading','unclear','extreme_length','content_mismatch'].includes(v))) return 'CHANGE'; return input.recommendedScore - input.currentScore >= 10 ? 'CHANGE' : 'KEEP'; }
