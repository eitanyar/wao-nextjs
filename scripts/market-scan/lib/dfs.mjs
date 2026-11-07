// DataForSEO client for the market scanner: on-disk cache keyed by request, hard USD cap
// checked BEFORE every network call, cost accounting from the provider's returned `cost`.
// Pattern follows src/lib/site-bot/research/dataForSeoResearch.ts (Basic auth token,
// task status checks, maxUsdPerRun), adapted for a disk cache and a pre-call cap.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export class BudgetExceededError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'BudgetExceededError';
    this.details = details;
  }
}

export class CacheMissError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CacheMissError';
  }
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function cacheKey(endpoint, params) {
  return createHash('sha256').update(`${endpoint}\n${canonicalJson(params)}`).digest('hex');
}

export function cachePath(cacheDir, endpoint, params) {
  return path.join(cacheDir, endpoint.replace(/^\//, '').replace(/\//g, '_'), `${cacheKey(endpoint, params)}.json`);
}

// Worst-case price of one request (refunds for unreturned depth only make it cheaper).
export function estimateCost(endpoint, params, prices) {
  const price = prices[endpoint];
  if (!price) throw new Error(`no price configured for ${endpoint}`);
  if (price.unit === 'task') return price.per_unit;
  const depth = params.depth ?? price.results_per_unit;
  return price.per_unit * Math.ceil(depth / price.results_per_unit);
}

// Minimal-field projection stored in the cache (spec 5.4: minimal fields only).
const VOLUME_FIELDS = ['keyword', 'search_volume', 'cpc', 'high_top_of_page_bid', 'low_top_of_page_bid', 'competition', 'competition_index', 'monthly_searches'];
const PLACE_FIELDS = ['type', 'rank_group', 'rank_absolute', 'cid', 'place_id', 'title', 'domain', 'url', 'rating', 'rating_distribution',
  'category', 'additional_categories', 'category_ids', 'total_photos', 'work_hours', 'is_claimed', 'phone', 'address_info',
  'latitude', 'longitude', 'is_directory_item', 'local_justifications', 'is_paid'];
const pick = (obj, fields) => Object.fromEntries(fields.filter(f => obj?.[f] !== undefined).map(f => [f, obj[f]]));

export function projectResult(endpoint, result) {
  const first = result?.[0] ?? {};
  if (endpoint.includes('/search_volume/')) return { items: (result ?? []).map(item => pick(item, VOLUME_FIELDS)) };
  if (endpoint.includes('/organic/')) {
    return {
      item_types: first.item_types ?? [],
      items: (first.items ?? []).map(item => ({
        type: item.type,
        rank_group: item.rank_group,
        rank_absolute: item.rank_absolute,
        ...(item.domain ? { domain: item.domain } : {}),
        ...(item.type === 'local_pack' ? pick(item, ['title', 'cid', 'rating', 'domain']) : {}),
      })),
    };
  }
  // maps + local_finder
  return { items_count: first.items_count ?? null, items: (first.items ?? []).map(item => pick(item, PLACE_FIELDS)) };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const NO_RESULTS = 40102;
export function emptyResult(endpoint) {
  return { ...projectResult(endpoint, []), no_results: true };
}

export function createDfsClient({
  token,
  fetchImpl = globalThis.fetch,
  cacheDir,
  capUsd,
  prices,
  rateLimits = {},
  offline = false,
  baseUrl = 'https://api.dataforseo.com/v3',
  log = () => {},
  now = () => new Date(),
}) {
  if (!(capUsd >= 0)) throw new Error('capUsd is required');
  const ledger = { capUsd, spentUsd: 0, reservedUsd: 0, networkCalls: 0, cacheHits: 0, entries: [] };
  const slots = new Map(); // endpoint -> { active, nextAt, queue }

  async function acquire(endpoint) {
    const limit = rateLimits[endpoint] ?? { min_interval_ms: 0, concurrency: 4 };
    const slot = slots.get(endpoint) ?? { active: 0, nextAt: 0, waiters: [] };
    slots.set(endpoint, slot);
    while (slot.active >= (limit.concurrency ?? 1)) await new Promise(resolve => slot.waiters.push(resolve));
    slot.active += 1;
    const wait = slot.nextAt - Date.now();
    slot.nextAt = Math.max(Date.now(), slot.nextAt) + (limit.min_interval_ms ?? 0);
    if (wait > 0) await sleep(wait);
    return () => {
      slot.active -= 1;
      slot.waiters.shift()?.();
    };
  }

  function readCache(endpoint, params) {
    const file = cachePath(cacheDir, endpoint, params);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  return {
    ledger,
    has(endpoint, params) {
      return fs.existsSync(cachePath(cacheDir, endpoint, params));
    },
    // Cached data or undefined, never network (used by the pure scoring passes).
    peek(endpoint, params) {
      return readCache(endpoint, params)?.data;
    },
    async call(endpoint, params) {
      const hit = readCache(endpoint, params);
      if (hit) {
        ledger.cacheHits += 1;
        return hit.data;
      }
      if (offline) throw new CacheMissError(`offline and not cached: ${endpoint} ${canonicalJson(params)}`);
      const estimate = estimateCost(endpoint, params, prices);
      const committed = ledger.spentUsd + ledger.reservedUsd;
      if (committed + estimate > capUsd + 1e-9) {
        throw new BudgetExceededError(
          `USD cap ${capUsd} would be exceeded by ${endpoint} (spent ${ledger.spentUsd.toFixed(4)} + in-flight ${ledger.reservedUsd.toFixed(4)} + next ${estimate.toFixed(4)})`,
          { endpoint, estimate, spentUsd: ledger.spentUsd },
        );
      }
      if (!token) throw new Error('DATAFORSEO_TOKEN is required for a network call');
      ledger.reservedUsd += estimate;
      const release = await acquire(endpoint);
      let task;
      try {
        ledger.networkCalls += 1;
        const res = await fetchImpl(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify([params]),
        });
        if (!res.ok) throw new Error(`DataForSEO HTTP ${res.status} on ${endpoint}`);
        const body = await res.json();
        task = body.tasks?.[0];
        if (!task) throw new Error(`DataForSEO ${endpoint}: no task in response (${body.status_message ?? ''})`);
      } finally {
        ledger.reservedUsd -= estimate;
        release();
      }
      const cost = typeof task.cost === 'number' ? task.cost : 0;
      ledger.spentUsd += cost;
      ledger.entries.push({ endpoint, task_id: task.id ?? null, status_code: task.status_code, cost_usd: cost, key: cacheKey(endpoint, params) });
      // 40102 "No Search Results" is a real (billed) outcome: an empty SERP. Cache it as such.
      if (task.status_code !== 20000 && task.status_code !== NO_RESULTS) {
        throw new Error(`DataForSEO task failed on ${endpoint}: ${task.status_code} ${task.status_message}`);
      }
      const data = task.status_code === NO_RESULTS ? emptyResult(endpoint) : projectResult(endpoint, task.result);
      const file = cachePath(cacheDir, endpoint, params);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ endpoint, params, task_id: task.id ?? null, cost_usd: cost, fetched_at: now().toISOString(), data }));
      log(`fetched ${endpoint} cost=${cost} spent=${ledger.spentUsd.toFixed(4)}/${capUsd}`);
      return data;
    },
  };
}
