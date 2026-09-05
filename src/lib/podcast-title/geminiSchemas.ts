const SCORE_COMPONENTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    themeRelevance: { type: 'number', minimum: 0, maximum: 100 },
    intentMatch: { type: 'number', minimum: 0, maximum: 100 },
    normalizedVolume: { type: 'number', minimum: 0, maximum: 100 },
    titleNaturalness: { type: 'number', minimum: 0, maximum: 100 },
    clickPotential: { type: 'number', minimum: 0, maximum: 100 },
  },
  required: ['themeRelevance', 'intentMatch', 'normalizedVolume', 'titleNaturalness', 'clickPotential'],
} as const;

export const PODCAST_THEME_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    format: { type: 'string', enum: ['intro', 'single_topic', 'interview', 'personal_story', 'educational', 'case_study', 'mixed'] },
    theme: { type: 'string' },
    supportingTopics: { type: 'array', items: { type: 'string' } },
    examples: { type: 'array', items: { type: 'string' } },
    excludedTopics: { type: 'array', items: { type: 'string' } },
    listenerIntent: { type: 'string' },
    listenerPromise: { type: 'string' },
    seeds: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
  },
  required: ['format', 'theme', 'supportingTopics', 'examples', 'excludedTopics', 'listenerIntent', 'listenerPromise', 'seeds', 'confidence'],
} as const;

export const PODCAST_WRITER_RANKING_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    keywordScores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          phrase: { type: 'string' },
          components: SCORE_COMPONENTS_SCHEMA,
        },
        required: ['phrase', 'components'],
      },
    },
    naturalSearchLanguageMismatch: { type: 'boolean' },
  },
  required: ['keywordScores'],
} as const;

export const PODCAST_WRITER_DRAFT_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    currentTitleComponents: SCORE_COMPONENTS_SCHEMA,
    recommendedTitleComponents: SCORE_COMPONENTS_SCHEMA,
    titles: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      prefixItems: [
        {
          type: 'object',
          additionalProperties: false,
          properties: { role: { type: 'string', enum: ['balanced'] }, title: { type: 'string' }, primaryPhrase: { type: 'string' } },
          required: ['role', 'title', 'primaryPhrase'],
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: { role: { type: 'string', enum: ['search_focused'] }, title: { type: 'string' }, primaryPhrase: { type: 'string' } },
          required: ['role', 'title', 'primaryPhrase'],
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: { role: { type: 'string', enum: ['curiosity'] }, title: { type: 'string' }, primaryPhrase: { type: 'string' } },
          required: ['role', 'title', 'primaryPhrase'],
        },
      ],
    },
    description: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['titles', 'description', 'reason'],
} as const;
