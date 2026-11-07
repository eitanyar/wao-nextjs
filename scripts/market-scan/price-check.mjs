#!/usr/bin/env node
// Run-day price re-check (spec 2.11): free GET /v3/appendix/user_data, compared with the price
// table in config/market-scanner/run-config.json. Prints balance + per-endpoint comparison and
// exits 2 when any configured price differs from the account table (the run must not proceed on
// stale prices). Never makes a paid call.
//   node --env-file=.env.local scripts/market-scan/price-check.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const FREE_DIR = path.join(ROOT, 'data/market-scan/free');

// Account-table path per configured endpoint (live / advanced / normal priority, per request).
const TABLE_PATH = {
  '/serp/google/organic/live/advanced': ['serp', 'live', 'advanced', 'priority_normal'],
  '/serp/google/maps/live/advanced': ['serp', 'live', 'advanced', 'priority_normal'],
  '/serp/google/local_finder/live/advanced': ['serp', 'live', 'advanced', 'priority_normal'],
  '/keywords_data/google_ads/search_volume/live': ['keywords_data', 'google_ads', 'search_volume', 'live', 'priority_normal'],
};

export function comparePrices(priceTable, configured) {
  return Object.entries(configured).map(([endpoint, cfg]) => {
    const node = (TABLE_PATH[endpoint] ?? []).reduce((o, k) => o?.[k], priceTable);
    const entry = Array.isArray(node) ? node.find(x => x.cost_type === 'per_request') ?? node[0] : null;
    const account = typeof entry?.cost === 'number' ? entry.cost : null;
    return { endpoint, configured_usd: cfg.per_unit, account_usd: account, cost_type: entry?.cost_type ?? null, match: account !== null && Math.abs(account - cfg.per_unit) < 1e-9 };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const token = process.env.DATAFORSEO_TOKEN;
  if (!token) throw new Error('DATAFORSEO_TOKEN is required');
  const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', { headers: { Authorization: `Basic ${token}` } });
  if (!res.ok) throw new Error(`DataForSEO HTTP ${res.status}`);
  const body = await res.json();
  const task = body.tasks?.[0];
  if (!task || task.status_code !== 20000) throw new Error(`user_data: ${task?.status_message}`);
  if (task.cost) throw new Error(`user_data reported cost ${task.cost} - expected free`);
  const result = task.result[0];
  const date = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(FREE_DIR, { recursive: true });
  fs.writeFileSync(path.join(FREE_DIR, `user_data-${date}.json`), JSON.stringify(body, null, 1));
  const run = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/market-scanner/run-config.json'), 'utf8'));
  const rows = comparePrices(result.price, run.prices_usd);
  process.stdout.write(`${JSON.stringify({ checked_at: new Date().toISOString(), balance_usd: result.money?.balance ?? null, prices: rows }, null, 1)}\n`);
  if (!rows.every(r => r.match)) process.exit(2);
}
