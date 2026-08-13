import type { GoogleAdsOperatorTask } from '../google-ads/operator';

/**
 * Translates operator task copy (title, whyNeeded, recommendedAction) from
 * technical English to plain Hebrew for non-technical business owners.
 *
 * Uses Qwen 3.8 Max for Hebrew quality. Falls back to original English if translation fails.
 */

const TRANSLATION_CACHE = new Map<string, GoogleAdsOperatorTask>();

async function callOllamaTranslator(task: GoogleAdsOperatorTask): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';

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

  try {
    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:8b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn(`[hebrew-rewriter] Ollama error: ${response.status}`, error);
      return '';
    }

    const data = await response.json();
    const translatedText = data.message?.content;

    if (!translatedText) {
      console.warn('[hebrew-rewriter] Empty response from Ollama');
      return '';
    }

    return translatedText;
  } catch (err) {
    console.warn('[hebrew-rewriter] Translation failed:', err instanceof Error ? err.message : String(err));
    return '';
  }
}

export async function translateTaskToHebrew(task: GoogleAdsOperatorTask): Promise<GoogleAdsOperatorTask> {
  // Cache key: taskId
  const cacheKey = task.taskId;
  if (TRANSLATION_CACHE.has(cacheKey)) {
    return TRANSLATION_CACHE.get(cacheKey)!;
  }

  try {
    const translatedJson = await callOllamaTranslator(task);

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

export async function translateTasksToHebrew(tasks: GoogleAdsOperatorTask[]): Promise<GoogleAdsOperatorTask[]> {
  // Translate in parallel, max 3 concurrent to avoid overwhelming API
  const results: GoogleAdsOperatorTask[] = [];
  const batchSize = 3;

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const translated = await Promise.all(batch.map(translateTaskToHebrew));
    results.push(...translated);
  }

  return results;
}
