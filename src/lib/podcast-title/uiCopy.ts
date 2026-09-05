import bundle from '../../../docs/copy/podcast-title-tool-ui.json';

const expectedKeys = [
  'appTitle', 'appSubtitle', 'profileLabel', 'newProfile', 'editProfile', 'profileName', 'podcastName', 'targetAudience', 'podcastDomain', 'writingStyle', 'brandPhrases', 'topicScope', 'benefitTitlePreference', 'saveSettings', 'cancel', 'episodeMode', 'newEpisode', 'existingEpisode', 'episodeId', 'episodeIdHelp', 'currentTitle', 'currentDescription', 'transcript', 'transcriptHelp', 'advancedSettings', 'targetCountry', 'targetLanguage', 'titleLimit', 'descriptionLimit', 'analyzeEpisode', 'analysisInProgress', 'stageTheme', 'stageKeywords', 'stageWriting', 'history', 'noHistory', 'decisionKeep', 'decisionChange', 'decisionCreate', 'decisionHumanReview', 'primaryTheme', 'listenerIntent', 'selectedKeyword', 'searchVolume', 'currentTitleScore', 'recommendedTitle', 'alternativeTitles', 'shortDescription', 'copy', 'copied', 'useTitle', 'warnings', 'lowConfidence', 'requiredField', 'genericError', 'retry', 'apiUsage', 'fallbackUsed',
] as const;

type UiCopyKey = typeof expectedKeys[number];
const record = bundle as Record<string, unknown>;
for (const key of expectedKeys) {
  if (typeof record[key] !== 'string' || !record[key].trim()) throw new Error(`Invalid podcast UI copy: ${key}`);
}
export const uiCopy: Record<UiCopyKey, string> = Object.fromEntries(expectedKeys.map(key => [key, record[key] as string])) as Record<UiCopyKey, string>;
export type { UiCopyKey };
