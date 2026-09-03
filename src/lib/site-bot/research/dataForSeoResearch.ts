/**
 * Bounded DataForSEO adapter for site-research demand and SERP evidence.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';
const DEFAULT_LOCATION_CODE = 2376;
const DEFAULT_LANGUAGE_CODE = 'he';
const METRICS_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const SERP_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TASKS_PER_REQUEST = 100;
const MAX_KEYWORDS_PER_VOLUME_REQUEST = 700;
const defaultCache = new Map<string, CachedValue<unknown>>();

type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
type SerpClassification = 'local_business' | 'directory_aggregator' | 'ecommerce' | 'informational' | 'official' | 'mismatched';

export interface ProviderUsageLedger {
  calls: number;
  estimatedCostUsd: number;
  entries: Array<{ operation: string; taskIds: string[]; estimatedCostUsd?: number }>;
}

export interface ResearchBudget {
  calls: number;
  estimatedCostUsd: number;
}

export interface ResearchAdapterOptions {
  token?: string;
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  cache?: Map<string, CachedValue<unknown>>;
  budget?: ResearchBudget;
  maxCallsPerRun?: number;
  maxUsdPerRun?: number;
  locationCode?: number;
  languageCode?: string;
}

interface CachedValue<T> {
  expiresAt: number;
  value: T;
}

interface ProviderTask {
  id?: string;
  cost?: number;
  status_code?: number;
  status_message?: string;
  result?: Array<Record<string, unknown>>;
}

interface ProviderResponse {
  tasks?: ProviderTask[];
}

export interface SeedExpansionResult {
  keywords: string[];
  taskIds: string[];
  usage: ProviderUsageLedger;
}

export interface KeywordMetric {
  keyword: string;
  searchVolume?: number;
  trend: Array<{ year: number; month: number; searchVolume: number }>;
  cpc?: number;
  paidCompetition?: number;
  paidCompetitionLevel?: string;
  providerDifficulty?: number;
  zeroVolumeUncertain: boolean;
}

export interface KeywordMetricsResult {
  metrics: KeywordMetric[];
  taskIds: string[];
  usage: ProviderUsageLedger;
}

export interface SearchIntentResult {
  intents: Array<{ keyword: string; intent: SearchIntent }>;
  taskIds: string[];
  usage: ProviderUsageLedger;
}

export interface SerpResult {
  rank?: number;
  title?: string;
  url?: string;
  domain?: string;
  classification: SerpClassification;
}

export interface SerpExclusion extends SerpResult {
  reason: string;
}

export interface LocalSerpEvidence {
  query: string;
  taskId?: string;
  localPack: SerpResult[];
  organic: SerpResult[];
  exclusions: SerpExclusion[];
}

export interface LocalSerpEvidenceResult {
  evidence: LocalSerpEvidence[];
  taskIds: string[];
  usage: ProviderUsageLedger;
}

export class ResearchBudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResearchBudgetExceededError';
  }
}

function requireToken(options: ResearchAdapterOptions): string {
  const token = options.token ?? process.env.DATAFORSEO_TOKEN;
  if (!token) throw new Error('DATAFORSEO_TOKEN is required');
  return token;
}

function normalizeKeywords(keywords: string[]): string[] {
  return [...new Set(keywords.map(keyword => keyword.trim()).filter(Boolean))];
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

function getCache<T>(options: ResearchAdapterOptions, key: string): T | null {
  const cached = (options.cache ?? defaultCache).get(key) as CachedValue<T> | undefined;
  if (!cached || cached.expiresAt <= (options.now?.() ?? new Date()).getTime()) return null;
  return cached.value;
}

function setCache<T>(options: ResearchAdapterOptions, key: string, ttlMs: number, value: T): void {
  (options.cache ?? defaultCache).set(key, { expiresAt: (options.now?.() ?? new Date()).getTime() + ttlMs, value });
}

function createUsage(): ProviderUsageLedger {
  return { calls: 0, estimatedCostUsd: 0, entries: [] };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

async function post(
  operation: string,
  endpoint: string,
  body: unknown,
  options: ResearchAdapterOptions,
  usage: ProviderUsageLedger
): Promise<ProviderTask[]> {
  const budget = options.budget ?? { calls: 0, estimatedCostUsd: 0 };
  if (options.maxCallsPerRun !== undefined && budget.calls >= options.maxCallsPerRun) {
    throw new ResearchBudgetExceededError(`DataForSEO call ceiling reached for ${operation}`);
  }

  const fetchImpl = options.fetch ?? globalThis.fetch;
  const response = await fetchImpl(`${DATAFORSEO_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${requireToken(options)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`DataForSEO HTTP ${response.status}`);

  const payload = await response.json() as ProviderResponse;
  const tasks = payload.tasks ?? [];
  if (!tasks.length || tasks.some(task => (task.status_code ?? 20000) >= 40000)) {
    const failed = tasks.find(task => (task.status_code ?? 20000) >= 40000);
    throw new Error(`DataForSEO task failed${failed?.status_message ? `: ${failed.status_message}` : ''}`);
  }

  const cost = tasks.reduce((total, task) => total + (asNumber(task.cost) ?? 0), 0);
  if (options.maxUsdPerRun !== undefined && budget.estimatedCostUsd + cost > options.maxUsdPerRun) {
    throw new ResearchBudgetExceededError(`DataForSEO USD ceiling exceeded for ${operation}`);
  }

  budget.calls += 1;
  budget.estimatedCostUsd += cost;
  usage.calls += 1;
  usage.estimatedCostUsd += cost;
  usage.entries.push({
    operation,
    taskIds: tasks.flatMap(task => task.id ? [task.id] : []),
    ...(cost ? { estimatedCostUsd: cost } : {}),
  });
  return tasks;
}

function taskItems(task: ProviderTask): Record<string, unknown>[] {
  return task.result?.flatMap(result => {
    const items = asRecord(result).items;
    return Array.isArray(items) ? items.map(asRecord) : [];
  }) ?? [];
}

function defaultTask(options: ResearchAdapterOptions): Pick<ResearchAdapterOptions, 'locationCode' | 'languageCode'> & { location_code: number; language_code: string } {
  return {
    location_code: options.locationCode ?? DEFAULT_LOCATION_CODE,
    language_code: options.languageCode ?? DEFAULT_LANGUAGE_CODE,
  };
}

export async function expandServiceSeeds(seeds: string[], options: ResearchAdapterOptions = {}): Promise<SeedExpansionResult> {
  const normalizedSeeds = normalizeKeywords(seeds);
  const usage = createUsage();
  const taskIds: string[] = [];
  const keywords = new Set<string>();
  for (const seed of normalizedSeeds) keywords.add(seed);

  for (const seedBatch of chunk(normalizedSeeds, MAX_TASKS_PER_REQUEST)) {
    const tasks = await post('related_keywords', '/dataforseo_labs/google/related_keywords/live', seedBatch.map(keyword => ({
      keyword,
      ...defaultTask(options),
      limit: 100,
    })), options, usage);
    for (const task of tasks) {
      if (task.id) taskIds.push(task.id);
      for (const item of taskItems(task)) {
        const keywordData = asRecord(item.keyword_data);
        const keyword = asString(keywordData.keyword) ?? asString(item.keyword);
        if (keyword) keywords.add(keyword);
      }
    }
  }

  return { keywords: [...keywords], taskIds, usage };
}

function normalizeMetric(item: Record<string, unknown>): KeywordMetric | null {
  const keyword = asString(item.keyword);
  if (!keyword) return null;
  const volume = asNumber(item.search_volume);
  const monthly = Array.isArray(item.monthly_searches) ? item.monthly_searches.map(asRecord).flatMap(entry => {
    const year = asNumber(entry.year);
    const month = asNumber(entry.month);
    const searchVolume = asNumber(entry.search_volume);
    return year !== undefined && month !== undefined && searchVolume !== undefined ? [{ year, month, searchVolume }] : [];
  }) : [];
  const metric: KeywordMetric = { keyword, trend: monthly, zeroVolumeUncertain: volume === 0 };
  if (volume !== undefined) metric.searchVolume = volume;
  const cpc = asNumber(item.cpc);
  const paidCompetition = asNumber(item.competition);
  const paidCompetitionLevel = asString(item.competition_level);
  const providerDifficulty = asNumber(item.keyword_difficulty);
  if (cpc !== undefined) metric.cpc = cpc;
  if (paidCompetition !== undefined) metric.paidCompetition = paidCompetition;
  if (paidCompetitionLevel) metric.paidCompetitionLevel = paidCompetitionLevel;
  if (providerDifficulty !== undefined) metric.providerDifficulty = providerDifficulty;
  return metric;
}

export async function fetchKeywordMetrics(keywords: string[], options: ResearchAdapterOptions = {}): Promise<KeywordMetricsResult> {
  const normalized = normalizeKeywords(keywords);
  const key = `metrics:${JSON.stringify([normalized, defaultTask(options)])}`;
  const cached = getCache<KeywordMetricsResult>(options, key);
  if (cached) return cached;

  const usage = createUsage();
  const taskIds: string[] = [];
  const metrics: KeywordMetric[] = [];
  for (const keywordBatch of chunk(normalized, MAX_KEYWORDS_PER_VOLUME_REQUEST)) {
    const tasks = await post('search_volume', '/keywords_data/google/search_volume/live', [{
      keywords: keywordBatch,
      ...defaultTask(options),
    }], options, usage);
    for (const task of tasks) {
      if (task.id) taskIds.push(task.id);
      for (const item of taskItems(task)) {
        const metric = normalizeMetric(item);
        if (metric) metrics.push(metric);
      }
    }
  }
  const result = { metrics, taskIds, usage };
  setCache(options, key, METRICS_TTL_MS, result);
  return result;
}

function normalizeIntent(value: unknown): SearchIntent | null {
  return value === 'informational' || value === 'commercial' || value === 'transactional' || value === 'navigational' ? value : null;
}

export async function classifySearchIntent(keywords: string[], options: ResearchAdapterOptions = {}): Promise<SearchIntentResult> {
  const normalized = normalizeKeywords(keywords);
  const key = `intent:${JSON.stringify([normalized, defaultTask(options)])}`;
  const cached = getCache<SearchIntentResult>(options, key);
  if (cached) return cached;

  const usage = createUsage();
  const tasks = await post('search_intent', '/dataforseo_labs/google/search_intent/live', normalized.map(keyword => ({
    keyword,
    ...defaultTask(options),
  })), options, usage);
  const taskIds = tasks.flatMap(task => task.id ? [task.id] : []);
  const intents = tasks.flatMap(task => taskItems(task).flatMap(item => {
    const keyword = asString(item.keyword);
    const intent = normalizeIntent(asRecord(item.search_intent_info).main_intent);
    return keyword && intent ? [{ keyword, intent }] : [];
  }));
  const result = { intents, taskIds, usage };
  setCache(options, key, METRICS_TTL_MS, result);
  return result;
}

function classifyOrganic(item: Record<string, unknown>): SerpClassification {
  const domain = (asString(item.domain) ?? '').toLowerCase();
  const url = (asString(item.url) ?? '').toLowerCase();
  const title = (asString(item.title) ?? '').toLowerCase();
  if (!url) return 'mismatched';
  if (item.is_featured_snippet === true || /guide|blog|article|how-to|what-is/.test(`${title} ${url}`)) return 'informational';
  if (/gov\.|\.gov\b|municipal|official/.test(`${domain} ${title}`)) return 'official';
  if (/directory|yellow|yelp|facebook\.com|instagram\.com|linkedin\.com/.test(domain)) return 'directory_aggregator';
  if (/shop|store|amazon|ebay|etsy/.test(`${domain} ${url}`)) return 'ecommerce';
  return 'local_business';
}

function normalizeSerpResult(item: Record<string, unknown>, classification: SerpClassification): SerpResult {
  const result: SerpResult = { classification };
  const rank = asNumber(item.rank_group) ?? asNumber(item.rank_absolute);
  const title = asString(item.title);
  const url = asString(item.url);
  const domain = asString(item.domain);
  if (rank !== undefined) result.rank = rank;
  if (title) result.title = title;
  if (url) result.url = url;
  if (domain) result.domain = domain;
  return result;
}

export async function fetchLocalSerpEvidence(queries: string[], options: ResearchAdapterOptions = {}): Promise<LocalSerpEvidenceResult> {
  const normalized = normalizeKeywords(queries);
  const key = `serp:${JSON.stringify([normalized, defaultTask(options)])}`;
  const cached = getCache<LocalSerpEvidenceResult>(options, key);
  if (cached) return cached;

  const usage = createUsage();
  const tasks = await post('organic_serp', '/serp/google/organic/live/advanced', normalized.map(keyword => ({
    keyword,
    ...defaultTask(options),
    device: 'desktop',
    os: 'windows',
    depth: 20,
  })), options, usage);
  const evidence = tasks.map((task, index) => {
    const localPack: SerpResult[] = [];
    const organic: SerpResult[] = [];
    const exclusions: SerpExclusion[] = [];
    for (const item of taskItems(task)) {
      if (item.type === 'local_pack') {
        const localItems = Array.isArray(item.items) ? item.items.map(asRecord) : [];
        for (const localItem of localItems.slice(0, 3)) localPack.push(normalizeSerpResult(localItem, 'local_business'));
        continue;
      }
      if (item.type !== 'organic') continue;
      const classification = classifyOrganic(item);
      const result = normalizeSerpResult(item, classification);
      if (classification === 'local_business' && organic.length < 5) {
        organic.push(result);
      } else {
        exclusions.push({ ...result, reason: classification === 'local_business' ? 'organic_limit' : classification });
      }
    }
    return { query: normalized[index] ?? '', ...(task.id ? { taskId: task.id } : {}), localPack, organic, exclusions };
  });
  const result = { evidence, taskIds: tasks.flatMap(task => task.id ? [task.id] : []), usage };
  setCache(options, key, SERP_TTL_MS, result);
  return result;
}
