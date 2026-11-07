#!/usr/bin/env node
// Freezes config/market-scanner/{professions,areas}.json from:
//   - the scoring spec (all Hebrew strings, sliced byte-exact; see lib/spec.mjs)
//   - data/batch/<pack>/keywords.json (cross-check only: pack-sourced terms must exist there)
//   - free lookups cached by free-checks.mjs (Ads location codes, residents, geocodes)
// No network. No Hebrew literals in this file.
import fs from 'node:fs';
import path from 'node:path';
import { SPEC_PATH, parseProfessions, parseRegions, specSha256, nameKey, isSettlementHit } from './lib/spec.mjs';
import { CITY_TABLE, englishName } from './lib/cities.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const FREE_DIR = path.join(ROOT, 'data/market-scan/free');
const OUT_DIR = path.join(ROOT, 'config/market-scanner');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

const specText = fs.readFileSync(path.join(ROOT, SPEC_PATH), 'utf8');
const sha = specSha256(specText);

// ---- professions -------------------------------------------------------------------------
const PACK_SLUG = { tiling: 'tiler' }; // spec row 10: only the tiler pack's contractor term is reused
const professions = parseProfessions(specText).map(p => {
  const packSlug = p.source.startsWith('pack') ? (PACK_SLUG[p.slug] ?? p.slug) : null;
  if (packSlug) {
    const packFile = path.join(ROOT, 'data/batch', packSlug, 'keywords.json');
    if (fs.existsSync(packFile)) {
      const packTerms = new Set(readJson(packFile).primaryKeywords.map(k => k.kw));
      for (const t of p.terms) {
        if (!t.proposed && !packTerms.has(t.term)) throw new Error(`${p.slug}: pack term not byte-equal to data/batch/${packSlug}: ${JSON.stringify(t.term)}`);
      }
    }
  }
  return {
    slug: p.slug,
    trade_he: p.trade_he,
    kit_level: p.kit_level,
    source: p.source,
    pack_slug: packSlug,
    terms: p.terms.map(t => t.term),
    proposed_terms: p.terms.filter(t => t.proposed).map(t => t.term),
  };
});

// ---- areas ---------------------------------------------------------------------------------
const locations = readJson(path.join(FREE_DIR, 'ads_locations_il.json')).tasks[0].result;
const residentsDoc = readJson(path.join(FREE_DIR, 'residents_64edd0ee.json')).result;
// Column names are Hebrew; address them by declared position, never by literal.
// Layout (checked 2026-11-07): _id, locality code, locality name, ..., total (index 9), age bands.
const fieldIds = residentsDoc.fields.map(f => f.id);
if (fieldIds.length !== 16 || fieldIds[0] !== '_id') throw new Error('residents dataset layout changed');
const [FIELD_CODE, FIELD_NAME, FIELD_TOTAL] = [fieldIds[1], fieldIds[2], fieldIds[9]];
const geocodes = readJson(path.join(FREE_DIR, 'geocode_nominatim.json'));
const residentsByKey = new Map();
for (const r of residentsDoc.records) {
  const key = nameKey(r[FIELD_NAME]);
  residentsByKey.set(key, [...(residentsByKey.get(key) ?? []), r]);
}

function adsLocation(name) {
  if (!name) return null;
  const hits = locations.filter(l => l.location_type === 'City' && l.location_name.startsWith(`${name},`));
  if (hits.length !== 1) throw new Error(`Ads location "${name}": expected 1 City match, got ${hits.length}`);
  return hits[0];
}

function pickGeocode(heName, entry) {
  const candidates = [
    ['nominatim:he', geocodes[heName] ?? []],
    ['nominatim:en', geocodes[`en:${englishName(entry)}`] ?? []],
    ['nominatim:en-any', geocodes[`en-any:${englishName(entry)}`] ?? []],
  ];
  for (const [source, hits] of candidates) {
    const placeHit = hits.find(h => h.category === 'place' && isSettlementHit(h));
    const hit = placeHit ?? hits.find(isSettlementHit);
    if (hit) return { lat: Number(Number(hit.lat).toFixed(5)), lng: Number(Number(hit.lon).toFixed(5)), geocode_source: `${source}:${hit.category}/${hit.type}:osm${hit.osm_id}` };
  }
  throw new Error(`no settlement-level geocode for ${englishName(entry)}`);
}

const regions = parseRegions(specText).map(region => {
  const cities = [];
  for (const ring of ['core', 'ring2']) {
    const table = CITY_TABLE[region.id][ring];
    if (table.length !== region[ring].length) throw new Error(`${region.id} ${ring}: spec has ${region[ring].length} cities, CITY_TABLE has ${table.length}`);
    region[ring].forEach((city, i) => {
      const entry = table[i];
      const [slug, adsName] = entry;
      const loc = adsLocation(adsName);
      const matches = residentsByKey.get(nameKey(city.he_name)) ?? [];
      if (matches.length !== 1) throw new Error(`residents match for ${slug}: expected 1, got ${matches.length}`);
      const flags = city.daggered ? ['haredi_majority'] : [];
      cities.push({
        slug,
        region: region.id,
        ring,
        he_name: city.he_name,
        en_name: englishName(entry),
        ads_location_code: loc?.location_code ?? null,
        ads_location_name: loc?.location_name ?? null,
        ...pickGeocode(city.he_name, entry),
        population: Number(matches[0][FIELD_TOTAL]),
        cbs_locality_code: Number(matches[0][FIELD_CODE]),
        flags,
      });
    });
  }
  return { id: region.id, name: region.name, cities };
});

const slugs = regions.flatMap(r => r.cities.map(c => c.slug));
if (new Set(slugs).size !== slugs.length) throw new Error('duplicate city slug');

fs.mkdirSync(OUT_DIR, { recursive: true });
const header = { spec: SPEC_PATH, spec_sha256: sha, generated_by: 'scripts/market-scan/build-config.mjs' };
fs.writeFileSync(path.join(OUT_DIR, 'professions.json'), `${JSON.stringify({ ...header, professions }, null, 2)}\n`);
fs.writeFileSync(path.join(OUT_DIR, 'areas.json'), `${JSON.stringify({
  ...header,
  sources: {
    ads_location_codes: 'DataForSEO GET /v3/keywords_data/google_ads/locations/il (free), fetched 2026-11-07',
    population: 'Population and Immigration Authority, "residents in Israel by communities and age groups", data.gov.il resource 64edd0ee-3d5d-43ce-8562-c336c24dbc1f, snapshot 2026-11-01 (registered residents, column total). CBS bycode xlsx was unreachable from this host; locality codes are CBS codes.',
    coordinates: 'OpenStreetMap Nominatim (free), fetched 2026-11-07; settlement-level hit only, English-name fallback where the Hebrew query returned a street/station',
  },
  missing_ads_location_code: regions.flatMap(r => r.cities.filter(c => c.ads_location_code === null).map(c => c.slug)),
  regions,
}, null, 2)}\n`);
console.log(JSON.stringify({ professions: professions.length, regions: regions.length, cities: slugs.length, spec_sha256: sha.slice(0, 12) }));
