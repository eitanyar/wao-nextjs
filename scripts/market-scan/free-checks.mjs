#!/usr/bin/env node
// M2 step 0: free lookups only (no paid DataForSEO call). Each result is cached under
// data/market-scan/free/ and is never re-fetched unless --refresh is passed.
//   node --env-file=.env.local scripts/market-scan/free-checks.mjs [--refresh]
import fs from 'node:fs';
import path from 'node:path';
import { SPEC_PATH, parseRegions, isSettlementHit } from './lib/spec.mjs';
import { CITY_TABLE, englishName } from './lib/cities.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const FREE_DIR = path.join(ROOT, 'data/market-scan/free');
const refresh = process.argv.includes('--refresh');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function cached(name, fetcher) {
  const file = path.join(FREE_DIR, name);
  if (!refresh && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const value = await fetcher();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 1));
  return value;
}

async function dfsGet(endpoint) {
  const token = process.env.DATAFORSEO_TOKEN;
  if (!token) throw new Error('DATAFORSEO_TOKEN is required');
  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, { headers: { Authorization: `Basic ${token}` } });
  if (!res.ok) throw new Error(`DataForSEO HTTP ${res.status} on ${endpoint}`);
  const body = await res.json();
  const task = body.tasks?.[0];
  if (!task || task.status_code !== 20000) throw new Error(`DataForSEO ${endpoint}: ${task?.status_message}`);
  if (task.cost) throw new Error(`free endpoint ${endpoint} reported cost ${task.cost}`);
  return body;
}

const userData = await dfsGet('appendix/user_data'); // balance is always fetched fresh
fs.writeFileSync(path.join(FREE_DIR, 'user_data.json'), JSON.stringify(userData, null, 1));
await cached('ads_locations_il.json', () => dfsGet('keywords_data/google_ads/locations/il'));
await cached('ads_languages.json', () => dfsGet('keywords_data/google_ads/languages'));
await cached('serp_languages.json', () => dfsGet('serp/google/languages'));
await cached('residents_64edd0ee.json', async () => {
  const res = await fetch('https://data.gov.il/api/3/action/datastore_search?resource_id=64edd0ee-3d5d-43ce-8562-c336c24dbc1f&limit=5000');
  if (!res.ok) throw new Error(`data.gov.il HTTP ${res.status}`);
  return res.json();
});

// One-time geocode of every city via OpenStreetMap Nominatim (free; 1 request/second policy).
const regions = parseRegions(fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8'));
const geocodes = fs.existsSync(path.join(FREE_DIR, 'geocode_nominatim.json')) && !refresh
  ? JSON.parse(fs.readFileSync(path.join(FREE_DIR, 'geocode_nominatim.json'), 'utf8'))
  : {};
async function nominatim(query, countryFilter = true) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2${countryFilter ? '&countrycodes=il' : ''}&limit=3&addressdetails=0&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'wao-market-scan/1.0 (eitan@wao.co.il)' } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const hits = await res.json();
  await sleep(1100);
  return hits.map(h => ({ lat: h.lat, lon: h.lon, category: h.category, type: h.type, addresstype: h.addresstype, osm_id: h.osm_id, place_rank: h.place_rank }));
}
for (const region of regions) {
  for (const ring of ['core', 'ring2']) {
    for (const [i, city] of region[ring].entries()) {
      const entry = CITY_TABLE[region.id][ring][i];
      if (!geocodes[city.he_name]) geocodes[city.he_name] = await nominatim(city.he_name);
      // Fallback: the Hebrew query found no settlement-level hit -> query the English name.
      const fallbackKey = `en:${englishName(entry)}`;
      if (!geocodes[city.he_name].some(isSettlementHit) && !geocodes[fallbackKey]) {
        geocodes[fallbackKey] = await nominatim(`${englishName(entry)}, Israel`);
      }
      // Second fallback: OSM files some Israeli municipalities outside countrycode il.
      const unfilteredKey = `en-any:${englishName(entry)}`;
      if (!geocodes[city.he_name].some(isSettlementHit) && !(geocodes[fallbackKey] ?? []).some(isSettlementHit) && !geocodes[unfilteredKey]) {
        geocodes[unfilteredKey] = await nominatim(englishName(entry).replace(/'/g, ''), false);
      }
      fs.writeFileSync(path.join(FREE_DIR, 'geocode_nominatim.json'), JSON.stringify(geocodes, null, 1));
    }
  }
}

const money = userData.tasks[0].result[0].money;
console.log(JSON.stringify({ balance_usd: money.balance, geocoded: Object.keys(geocodes).length }));
