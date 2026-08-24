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
  callCount: number; // number of fetchSerp calls made (1 or 2)
}

export async function checkAioPresence(
  niche: string,
  location: string
): Promise<AioCheckResult> {
  // Build Hebrew query from niche + location (city only, not full address)
  const city = location.split(/[,،\n]/)[0].trim();
  const query = city ? `${niche} ב${city}` : niche;
  let callCount = 0;

  try {
    const result = await fetchSerp(query);
    callCount += 1;
    if (result) return { found: result, query, callCount };

    // Fallback: try niche alone (no city) if city query had no AIO
    if (city) {
      const fallback = await fetchSerp(niche);
      callCount += 1;
      return { found: fallback, query: fallback ? niche : query, callCount };
    }
  } catch (err) {
    console.error('[DataForSEO] AIO check failed:', err);
  }

  return { found: false, query, callCount };
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

// ---------------------------------------------------------------------------
// AI-Overview citation check (Purple-Cow "Card 9" — AI-Visibility Snapshot)
// ---------------------------------------------------------------------------

interface AioReference {
  source?: string;
  domain?: string;
  url?: string;
  title?: string;
  text?: string;
}

interface AioOverviewItem {
  type: string;
  markdown?: string;
  items?: { title?: string; text?: string; markdown?: string; references?: AioReference[] }[];
  references?: AioReference[];
}

export interface AioCitationResult {
  aioFound: boolean;       // was there an AI Overview at all for this query
  cited: boolean;          // is the business named/linked inside it (false if aioFound is false)
  query: string;
  matchedOn?: 'name' | 'domain'; // which signal produced the match, if cited
}

// Live-tested Hebrew query pattern that reliably triggers an ai_overview item
// (niche-only, no city concatenation — proven 5/5 in recon, unlike the
// niche+city pattern used by checkAioPresence above).
const AIO_CITATION_QUERY_PREFIX = 'כמה עולה קריאת שירות ל';

async function fetchSerpWithAio(keyword: string): Promise<AioOverviewItem[]> {
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
      load_async_ai_overview: true,
    }]),
  });

  if (!res.ok) throw new Error(`DataForSEO HTTP ${res.status}`);
  const data = await res.json();
  return data?.tasks?.[0]?.result?.[0]?.items ?? [];
}

export async function checkAioCitation(
  niche: string,
  businessName: string,
  domain?: string
): Promise<AioCitationResult> {
  const query = `${AIO_CITATION_QUERY_PREFIX}${niche}`;

  const items = await fetchSerpWithAio(query);
  const aioItem = items.find(i => i.type === 'ai_overview');

  if (!aioItem) {
    return { aioFound: false, cited: false, query };
  }

  const nameLower = businessName.toLowerCase();
  const references: AioReference[] = [
    ...(aioItem.references ?? []),
    ...((aioItem.items ?? []).flatMap(el => el.references ?? [])),
  ];

  const inMarkdown = (aioItem.markdown ?? '').toLowerCase().includes(nameLower);
  const inReferenceText = references.some(
    r => (r.title ?? '').toLowerCase().includes(nameLower) ||
         (r.text ?? '').toLowerCase().includes(nameLower)
  );

  if (inMarkdown || inReferenceText) {
    return { aioFound: true, cited: true, query, matchedOn: 'name' };
  }

  if (domain) {
    const strippedDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    const inReferenceDomain = references.some(
      r => (r.domain ?? '').toLowerCase().includes(strippedDomain) ||
           (r.url ?? '').toLowerCase().includes(strippedDomain)
    );
    if (inReferenceDomain) {
      return { aioFound: true, cited: true, query, matchedOn: 'domain' };
    }
  }

  return { aioFound: true, cited: false, query };
}
