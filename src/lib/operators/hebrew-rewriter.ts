import type { GoogleAdsOperatorTask } from '../google-ads/operator';
import { callGeminiJSON } from '../ai/gemini-fast';
import { resolveQwenEndpoint, selectLlmProvider } from '../ai/llmProvider';

/**
 * Translates operator task copy (title, whyNeeded, recommendedAction) from
 * technical English to plain Hebrew for non-technical business owners.
 *
 * Provider: LLM_PROVIDER_PANEL_REWRITE (src/lib/ai/llmProvider.ts) — gemini by default since D3
 * (2026-11-15); qwen-metered / qwen-token-plan restore the Qwen path with the model below.
 * Falls back to original English if translation fails.
 */

const TRANSLATION_CACHE = new Map<string, GoogleAdsOperatorTask>();

// Client-facing dashboard stays on qwen3.8-max (founder/client-facing Hebrew, per AGENTS.md's
// human-gated authoring channel). Eitan's internal admin/review surface uses qwen3.7-plus per
// his 2026-08-18 direction — internal-only text, no human-gate requirement.
const DEFAULT_MODEL = 'qwen3.8-max';

async function callTranslator(task: GoogleAdsOperatorTask, model: string): Promise<string> {
  const selection = selectLlmProvider('panel_rewrite');
  let qwenApiKey = '';
  let qwenBaseUrl = '';
  if (selection.provider !== 'gemini') {
    let endpoint: ReturnType<typeof resolveQwenEndpoint> = null;
    try {
      endpoint = resolveQwenEndpoint('panel_rewrite');
    } catch (err) {
      console.warn('[hebrew-rewriter] Qwen provider refused, skipping translation:', err instanceof Error ? err.message : String(err));
      return '';
    }
    if (!endpoint) {
      console.warn(`[hebrew-rewriter] Missing credentials for ${selection.provider} (${selection.envVar}), skipping translation`);
      return '';
    }
    qwenApiKey = endpoint.apiKey;
    qwenBaseUrl = endpoint.baseUrl;
  }

  const systemPrompt = `אתה מתרגם מומחה בתוכן Google Ads לעברית טבעית.
תפקידך: לתרגם בקשות טכניות מסבוכות להוראות פשוטות וברורות לבעלי עסקים.

כללים:
- עברית טבעית ודיבורית, לא מתורגמת
- משפטים קצרים (עד 15 מילים כל משפט)
- הסבר תוצאה עסקית, לא מנגנון טכני
- אסור: מונחים כמו "CPL", "GAQL", "negative keywords" — תרגום פשוט (עלות ליד, קלידים שהורסים כסף)
- תמיד התייחס לבעל העסק בכבוד כמי שמוציא החלטות

תפוקה: JSON עם שדות task המתורגמים:
{
  "title": "כותרת בעברית פשוטה",
  "whyNeeded": "הסבר למה זה חשוב לבעסק (1-2 משפטים)",
  "recommendedAction": "מה לעשות עכשיו (משפט אחד)"
}`;

  const userMessage = JSON.stringify({
    taskKind: task.kind,
    originalTitle: task.title,
    originalWhyNeeded: task.whyNeeded,
    originalRecommendedAction: task.recommendedAction,
    risk: task.risk,
  });

  if (selection.provider === 'gemini') {
    try {
      // The model option names a Qwen model; Gemini uses GEMINI_MODEL_NAME / the gemini-fast default.
      return await callGeminiJSON(systemPrompt, userMessage, { usage: { workload: 'panel_rewrite' } });
    } catch (err) {
      console.warn('[hebrew-rewriter] Gemini translation failed:', err instanceof Error ? err.message : String(err));
      return '';
    }
  }

  try {
    const response = await fetch(`${qwenBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${qwenApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.warn(`[hebrew-rewriter] Qwen API error: ${response.status}`, error);
      return '';
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content;

    if (!translatedText) {
      console.warn('[hebrew-rewriter] Empty response from Qwen');
      return '';
    }

    return translatedText;
  } catch (err) {
    console.warn('[hebrew-rewriter] Translation failed:', err instanceof Error ? err.message : String(err));
    return '';
  }
}

export async function translateTaskToHebrew(
  task: GoogleAdsOperatorTask,
  opts: { model?: string } = {}
): Promise<GoogleAdsOperatorTask> {
  const model = opts.model || DEFAULT_MODEL;
  // Cache key: taskId + model (internal and client-facing surfaces can request different models).
  const cacheKey = `${task.taskId}::${model}`;
  if (TRANSLATION_CACHE.has(cacheKey)) {
    return TRANSLATION_CACHE.get(cacheKey)!;
  }

  try {
    const translatedJson = await callTranslator(task, model);

    if (!translatedJson) {
      // Fallback: return original task
      return task;
    }

    const translated = JSON.parse(translatedJson);

    // Validate and merge
    const result: GoogleAdsOperatorTask = {
      ...task,
      title: translated.title || task.title,
      whyNeeded: translated.whyNeeded || task.whyNeeded,
      recommendedAction: translated.recommendedAction || task.recommendedAction,
    };

    TRANSLATION_CACHE.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn(`[hebrew-rewriter] Failed to translate task ${task.taskId}:`, err instanceof Error ? err.message : String(err));
    return task; // Fail-open: return original
  }
}

export async function translateTasksToHebrew(
  tasks: GoogleAdsOperatorTask[],
  opts: { model?: string } = {}
): Promise<GoogleAdsOperatorTask[]> {
  // Translate in parallel, max 3 concurrent to avoid overwhelming API
  const results: GoogleAdsOperatorTask[] = [];
  const batchSize = 3;

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const translated = await Promise.all(batch.map((t) => translateTaskToHebrew(t, opts)));
    results.push(...translated);
  }

  return results;
}
