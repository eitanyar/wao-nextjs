import fs from 'fs';
import path from 'path';
import { GoogleAdsApi, ResourceNames, enums } from 'google-ads-api';
import type { KeywordDemandEvidence, KeywordDemandIdea } from '../google-ads/demand-readiness';

const CACHE_PATH = path.join(process.cwd(), 'data', 'cpc-cache.json');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_ISRAEL_GEO_TARGET_ID = '2376';

interface CacheEntry {
  demand: KeywordDemandEvidence;
  updatedAt: string;
}

type CacheStore = Record<string, CacheEntry>;

interface KeywordIdeaMetrics {
  avg_monthly_searches?: number | string;
  avgMonthlySearches?: number | string;
  competition?: string | number;
  low_top_of_page_bid_micros?: number | string;
  high_top_of_page_bid_micros?: number | string;
  lowTopOfPageBidMicros?: number | string;
  highTopOfPageBidMicros?: number | string;
  lowTopOfPageBid?: number | string;
  highTopOfPageBid?: number | string;
}

interface KeywordIdeaRow {
  text?: string;
  keyword_text?: string;
  keywordText?: string;
  keyword_idea_metrics?: KeywordIdeaMetrics;
  keywordIdeaMetrics?: KeywordIdeaMetrics;
  keyword_idea_metric?: KeywordIdeaMetrics;
}

interface KeywordIdeaResponse {
  results?: KeywordIdeaRow[];
  keyword_idea_results?: KeywordIdeaRow[];
  keywordIdeas?: KeywordIdeaRow[];
}

interface KeywordIdeaRequest {
  customer_id: string;
  language: string;
  geo_target_constants: string[];
  keyword_plan_network: number;
  keyword_and_url_seed: { keywords: string[] };
}

export interface KeywordDemandOptions {
  geoTargetId?: string;
  languageId?: string;
  fetchIdeas?: (request: KeywordIdeaRequest) => Promise<KeywordIdeaResponse>;
  now?: () => Date;
}

function cacheKey(keywords: string[], city: string, geoTargetId: string, languageId: string): string {
  return [city.trim().toLowerCase(), geoTargetId, languageId, keywords.map(k => k.trim().toLowerCase()).filter(Boolean).join('|')].join('::');
}

function loadCache(): CacheStore {
  try {
    if (!fs.existsSync(CACHE_PATH)) return {};
    const parsed: unknown = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    return parsed && typeof parsed === 'object' ? parsed as CacheStore : {};
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
  return new GoogleAdsApi({ client_id: GOOGLE_ADS_CLIENT_ID, client_secret: GOOGLE_ADS_CLIENT_SECRET, developer_token: GOOGLE_ADS_DEVELOPER_TOKEN });
}

function normalizeSeeds(keywords: string[]): string[] {
  return Array.from(new Set(keywords.map(keyword => keyword.trim()).filter(Boolean))).slice(0, 5);
}

function numeric(value: unknown): number | null {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

function bidIls(value: unknown): number | null {
  const micros = numeric(value);
  return micros !== null && micros > 0 ? micros / 1_000_000 : null;
}

function metricsFor(row: KeywordIdeaRow): KeywordIdeaMetrics {
  return row.keyword_idea_metrics ?? row.keywordIdeaMetrics ?? row.keyword_idea_metric ?? {};
}

function normalizeIdea(row: KeywordIdeaRow): KeywordDemandIdea | null {
  const metrics = metricsFor(row);
  const text = (row.text ?? row.keyword_text ?? row.keywordText ?? '').trim();
  if (!text) return null;
  return {
    text,
    avgMonthlySearches: numeric(metrics.avg_monthly_searches ?? metrics.avgMonthlySearches) ?? 0,
    competition: metrics.competition === undefined || metrics.competition === null ? null : String(metrics.competition),
    lowTopOfPageBidIls: bidIls(metrics.low_top_of_page_bid_micros ?? metrics.lowTopOfPageBidMicros ?? metrics.lowTopOfPageBid),
    highTopOfPageBidIls: bidIls(metrics.high_top_of_page_bid_micros ?? metrics.highTopOfPageBidMicros ?? metrics.highTopOfPageBid),
  };
}

function average(values: Array<number | null>): number | null {
  const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function rowsFor(response: KeywordIdeaResponse): KeywordIdeaRow[] {
  return response.results ?? response.keyword_idea_results ?? response.keywordIdeas ?? [];
}

function fromResponse(response: KeywordIdeaResponse, retrievedAt: string, geoTargetId: string, languageId: string): KeywordDemandEvidence {
  const ideas = rowsFor(response).map(normalizeIdea).filter((idea): idea is KeywordDemandIdea => idea !== null);
  return {
    providerEvidence: true,
    ideas,
    aggregate: {
      monthlySearches: ideas.reduce((sum, idea) => sum + idea.avgMonthlySearches, 0),
      lowTopOfPageBidIls: average(ideas.map(idea => idea.lowTopOfPageBidIls)),
      highTopOfPageBidIls: average(ideas.map(idea => idea.highTopOfPageBidIls)),
    },
    retrievedAt,
    geoTargetId,
    languageId,
  };
}

export async function getKeywordDemand(keywords: string[], city: string, options: KeywordDemandOptions = {}): Promise<KeywordDemandEvidence | null> {
  const seeds = normalizeSeeds(keywords);
  if (!seeds.length) return null;
  const apiKey = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const managerCustomerId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID?.replace(/-/g, '');
  const languageId = options.languageId ?? process.env.GOOGLE_ADS_LANGUAGE_CONSTANT_ID;
  const geoTargetId = options.geoTargetId ?? process.env.GOOGLE_ADS_GEO_TARGET_CONSTANT_ID ?? DEFAULT_ISRAEL_GEO_TARGET_ID;
  if (!languageId) return null;
  if (!options.fetchIdeas && (!apiKey || !managerCustomerId)) return null;

  const key = cacheKey(seeds, city, geoTargetId, languageId);
  if (!options.fetchIdeas) {
    const cached = loadCache()[key];
    if (cached?.demand && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) return cached.demand;
  }

  const request: KeywordIdeaRequest = {
    customer_id: managerCustomerId ?? 'mock-customer',
    language: ResourceNames.languageConstant(languageId),
    geo_target_constants: [ResourceNames.geoTargetConstant(geoTargetId)],
    keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
    keyword_and_url_seed: { keywords: seeds },
  };

  try {
    let response: KeywordIdeaResponse;
    if (options.fetchIdeas) {
      response = await options.fetchIdeas(request);
    } else {
      const client = buildClient();
      if (!client || !apiKey || !managerCustomerId) return null;
      const customer = client.Customer({ customer_id: managerCustomerId, login_customer_id: managerCustomerId, refresh_token: apiKey });
      response = await customer.keywordPlanIdeas.generateKeywordIdeas(
        request as unknown as Parameters<typeof customer.keywordPlanIdeas.generateKeywordIdeas>[0]
      ) as KeywordIdeaResponse;
    }
    const demand = fromResponse(response, (options.now ?? (() => new Date()))().toISOString(), geoTargetId, languageId);
    if (!options.fetchIdeas) {
      const cache = loadCache();
      cache[key] = { demand, updatedAt: demand.retrievedAt };
      saveCache(cache);
    }
    return demand;
  } catch (err) {
    console.warn('[keywordPlanner] keyword demand lookup failed:', err);
    return null;
  }
}

export async function getEstimatedCPC(
  keywords: string[],
  city: string,
  options: KeywordDemandOptions = {}
): Promise<number | null> {
  const demand = await getKeywordDemand(keywords, city, options);
  if (!demand) return null;
  const bids = demand.ideas.map(idea => average([idea.lowTopOfPageBidIls, idea.highTopOfPageBidIls])).filter((value): value is number => value !== null);
  return bids.length ? bids.reduce((sum, value) => sum + value, 0) / bids.length : null;
}
