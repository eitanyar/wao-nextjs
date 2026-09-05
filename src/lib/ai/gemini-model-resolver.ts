/**
 * Runtime Gemini Flash Model Resolver
 *
 * Queries Google's /v1beta/models/list endpoint to discover the actual latest
 * Gemini Flash version available, eliminating hardcoded version strings.
 *
 * Caches result in memory for app lifetime to avoid repeated API calls.
 */

interface GeminiModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface GeminiModelsResponse {
  object: string;
  data: GeminiModel[];
}

let cachedModel: string | null = null;
let cacheTime: number = 0;
const CACHE_TTL_MS = 3600000; // 1 hour

function parseVersion(modelId: string): { major: number; minor: number } | null {
  // Extract version from models like "gemini-2.0-flash", "gemini-1.5-flash"
  const match = modelId.match(/gemini-(\d+)\.(\d+)-flash/);
  if (!match) return null;
  return { major: parseInt(match[1], 10), minor: parseInt(match[2], 10) };
}

function compareVersions(v1: { major: number; minor: number }, v2: { major: number; minor: number }): number {
  if (v1.major !== v2.major) return v1.major - v2.major;
  return v1.minor - v2.minor;
}

async function queryGeminiModels(): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[gemini-model-resolver] Missing GEMINI_API_KEY, falling back to default');
    return 'gemini-3.8-flash';
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/list?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data: GeminiModelsResponse = await response.json();

    // Filter for gemini-*-flash models
    const flashModels = data.data
      .filter((m) => m.id.includes('gemini-') && m.id.includes('-flash') && !m.id.includes('-realtime'))
      .map((m) => ({ id: m.id, version: parseVersion(m.id) }))
      .filter((m) => m.version !== null) as Array<{ id: string; version: { major: number; minor: number } }>;

    if (flashModels.length === 0) {
      console.warn('[gemini-model-resolver] No Flash models found, falling back to default');
      return 'gemini-3.8-flash';
    }

    // Sort by version (descending) and pick the latest
    const latest = flashModels.sort((a, b) => {
      const cmp = compareVersions(b.version, a.version);
      if (cmp !== 0) return cmp;
      // Tiebreaker: prefer models without date suffixes (e.g., prefer gemini-2.0-flash over gemini-2.0-flash-2025-07-28)
      return a.id.split('-').length - b.id.split('-').length;
    })[0];

    console.log(`[gemini-model-resolver] Detected latest Gemini Flash: ${latest.id}`);
    return latest.id;
  } catch (err) {
    console.warn(
      '[gemini-model-resolver] Failed to query models:',
      err instanceof Error ? err.message : String(err),
      '— falling back to default'
    );
    return 'gemini-3.8-flash';
  }
}

/**
 * Get the latest available Gemini Flash model.
 * Caches result for 1 hour to minimize API calls.
 */
export async function getLatestGeminiFlashModel(): Promise<string> {
  const now = Date.now();

  // Return cached model if still valid
  if (cachedModel && now - cacheTime < CACHE_TTL_MS) {
    return cachedModel;
  }

  // Query and cache
  const model = await queryGeminiModels();
  cachedModel = model;
  cacheTime = now;

  return model;
}

/**
 * Clear the cache (for testing or manual refresh).
 */
export function clearGeminiModelCache(): void {
  cachedModel = null;
  cacheTime = 0;
}
