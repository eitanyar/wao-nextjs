import fs from 'fs';
import path from 'path';
import { GoogleAdsApi, ResourceNames, enums } from 'google-ads-api';

const CACHE_PATH = path.join(process.cwd(), 'data', 'cpc-cache.json');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_ISRAEL_GEO_TARGET_ID = '2376';

interface CacheEntry {
  cpc: number;
  updatedAt: string;
}

type CacheStore = Record<string, CacheEntry>;

function cacheKey(keywords: string[], city: string): string {
  return `${city.trim().toLowerCase()}::${keywords.map(k => k.trim().toLowerCase()).filter(Boolean).join('|')}`;
}

function loadCache(): CacheStore {
  try {
    if (!fs.existsSync(CACHE_PATH)) return {};
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as CacheStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCache(cache: CacheStore): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.warn('[keywordPlanner] failed to write cache:', err);
  }
}

function buildClient(): GoogleAdsApi | null {
  const { GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN } = process.env;
  if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_DEVELOPER_TOKEN) return null;

  return new GoogleAdsApi({
    client_id: GOOGLE_ADS_CLIENT_ID,
    client_secret: GOOGLE_ADS_CLIENT_SECRET,
    developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
  });
}

function normalizeSeeds(keywords: string[]): string[] {
  return Array.from(new Set(keywords.map(k => k.trim()).filter(Boolean))).slice(0, 5);
}

interface KeywordIdeaMetrics {
  low_top_of_page_bid_micros?: number | string;
  high_top_of_page_bid_micros?: number | string;
  lowTopOfPageBidMicros?: number | string;
  highTopOfPageBidMicros?: number | string;
  lowTopOfPageBid?: number | string;
  highTopOfPageBid?: number | string;
}

interface KeywordIdeaRow {
  keyword_idea_metrics?: KeywordIdeaMetrics;
  keywordIdeaMetrics?: KeywordIdeaMetrics;
  keyword_idea_metric?: KeywordIdeaMetrics;
}

function extractBidMicros(row: KeywordIdeaRow): number | null {
  const metrics = row.keyword_idea_metrics ?? row.keywordIdeaMetrics ?? row.keyword_idea_metric ?? {};
  const lowMicros = metrics.low_top_of_page_bid_micros ?? metrics.lowTopOfPageBidMicros ?? metrics.lowTopOfPageBid ?? 0;
  const highMicros = metrics.high_top_of_page_bid_micros ?? metrics.highTopOfPageBidMicros ?? metrics.highTopOfPageBid ?? 0;

  const low = Number(lowMicros) || 0;
  const high = Number(highMicros) || 0;
  const chosen = high > 0 && low > 0 ? (low + high) / 2 : (high || low);
  return chosen > 0 ? chosen : null;
}

export async function getEstimatedCPC(keywords: string[], city: string): Promise<number | null> {
  const seeds = normalizeSeeds(keywords);
  if (!seeds.length) return null;

  const apiKey = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const managerCustomerId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID?.replace(/-/g, '');
  const languageId = process.env.GOOGLE_ADS_LANGUAGE_CONSTANT_ID;
  const geoTargetId = process.env.GOOGLE_ADS_GEO_TARGET_CONSTANT_ID || DEFAULT_ISRAEL_GEO_TARGET_ID;

  if (!apiKey || !managerCustomerId || !languageId) return null;

  const key = cacheKey(seeds, city);
  const cache = loadCache();
  const cached = cache[key];
  if (cached && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return cached.cpc;
  }

  const client = buildClient();
  if (!client) return null;

  try {
    const customer = client.Customer({
      customer_id: managerCustomerId,
      login_customer_id: managerCustomerId,
      refresh_token: apiKey,
    });

    const request = {
      customer_id: managerCustomerId,
      language: ResourceNames.languageConstant(languageId),
      geo_target_constants: [ResourceNames.geoTargetConstant(geoTargetId)],
      keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
      keyword_and_url_seed: {
        keywords: seeds,
      },
    };

    const response = await customer.keywordPlanIdeas.generateKeywordIdeas(
      request as unknown as Parameters<typeof customer.keywordPlanIdeas.generateKeywordIdeas>[0]
    );
    const responseData = response as {
      results?: KeywordIdeaRow[];
      keyword_idea_results?: KeywordIdeaRow[];
      keywordIdeas?: KeywordIdeaRow[];
    };
    const rows: KeywordIdeaRow[] = responseData.results ?? responseData.keyword_idea_results ?? responseData.keywordIdeas ?? [];

    const bids = rows
      .map(extractBidMicros)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
      .slice(0, 10)
      .map(micros => micros / 1_000_000);

    if (!bids.length) return null;

    const cpc = bids.reduce((sum, value) => sum + value, 0) / bids.length;
    cache[key] = { cpc, updatedAt: new Date().toISOString() };
    saveCache(cache);
    return cpc;
  } catch (err) {
    console.warn('[keywordPlanner] live lookup failed, falling back to cluster budgets:', err);
    return null;
  }
}
