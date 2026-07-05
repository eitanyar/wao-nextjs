/**
 * DataForSEO — AI Overview presence check (Israeli geo, Hebrew)
 * Returns whether an AI Overview exists for the given query.
 * Used in Turn 7 of the GEO onboarding bot.
 */

const DATAFORSEO_TOKEN = process.env.DATAFORSEO_TOKEN!;
const ISRAEL_LOCATION  = 2376;
const HEBREW_LANG      = 'he';

export interface AioCheckResult {
  found: boolean;
  query: string;
}

export async function checkAioPresence(
  niche: string,
  location: string
): Promise<AioCheckResult> {
  // Build Hebrew query from niche + location (city only, not full address)
  const city = location.split(/[,،\n]/)[0].trim();
  const query = city ? `${niche} ב${city}` : niche;

  try {
    const result = await fetchSerp(query);
    if (result) return { found: result, query };

    // Fallback: try niche alone (no city) if city query had no AIO
    if (city) {
      const fallback = await fetchSerp(niche);
      return { found: fallback, query: fallback ? niche : query };
    }
  } catch (err) {
    console.error('[DataForSEO] AIO check failed:', err);
  }

  return { found: false, query };
}

async function fetchSerp(keyword: string): Promise<boolean> {
  const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${DATAFORSEO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keyword,
      location_code: ISRAEL_LOCATION,
      language_code: HEBREW_LANG,
      device: 'desktop',
      os: 'windows',
      depth: 10,
    }]),
  });

  if (!res.ok) throw new Error(`DataForSEO HTTP ${res.status}`);
  const data = await res.json();
  const items: { type: string }[] = data?.tasks?.[0]?.result?.[0]?.items ?? [];
  return items.some(i => i.type === 'ai_overview');
}
