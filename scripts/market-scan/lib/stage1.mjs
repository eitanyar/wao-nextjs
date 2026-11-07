// Stage 1 - demand & value (spec section 3). Pure functions: requests are planned from the
// config, and scoring reads responses through `get(endpoint, params)` (cache lookup).
export const VOLUME_ENDPOINT = '/keywords_data/google_ads/search_volume/live';
export const ORGANIC_ENDPOINT = '/serp/google/organic/live/advanced';

export const round4 = x => (x === null || x === undefined ? x : Math.round(x * 1e4) / 1e4);

export function allTerms(professions) {
  return [...new Set(professions.flatMap(p => p.terms))];
}

export function allCities(areas) {
  return areas.regions.flatMap(r => r.cities);
}

// R3: language codes are config values - `iw` for Google Ads endpoints, `he` for SERP endpoints.
export const adsLanguage = run => run.languages?.ads_language_code ?? run.free_checks_2026_11_07.ads_language_code;
export const serpLanguage = run => run.languages?.serp_language_code ?? run.free_checks_2026_11_07.serp_language_code;

export function volumeParams(locationCode, professions, run) {
  return { keywords: allTerms(professions), location_code: locationCode, language_code: adsLanguage(run) };
}

export function organicParams(profession, region, run) {
  const anchor = region.cities.find(c => c.ring === 'core');
  return {
    keyword: profession.terms[0],
    location_coordinate: `${anchor.lat},${anchor.lng}`,
    language_code: serpLanguage(run),
    depth: run.stage1.organic_depth,
  };
}

export function planStage1({ professions, areas, run }) {
  const requests = [];
  for (const city of allCities(areas)) {
    if (city.ads_location_code !== null) requests.push({ endpoint: VOLUME_ENDPOINT, params: volumeParams(city.ads_location_code, professions, run), label: `volume:${city.slug}` });
  }
  requests.push({ endpoint: VOLUME_ENDPOINT, params: volumeParams(run.api.country_location_code, professions, run), label: 'volume:country' });
  for (const p of professions) {
    for (const r of areas.regions) requests.push({ endpoint: ORGANIC_ENDPOINT, params: organicParams(p, r, run), label: `organic:${p.slug}:${r.id}` });
  }
  return requests;
}

function itemsByKeyword(data) {
  const map = new Map();
  for (const item of data?.items ?? []) map.set(item.keyword, item);
  return map;
}

function monthlySignature(item) {
  return JSON.stringify((item.monthly_searches ?? []).map(m => [m.year, m.month, m.search_volume]));
}

// Spec 3.2 + 3.3 (+ R5.4): sum of term volumes, counting a grouped (identical volume + identical
// monthly series) term only once - the first in config order wins - but only when the volume is
// >= dedupeMinVolume; below that two terms sharing Google's floor bucket are simply summed. null -> 0.
export function professionVolume(terms, byKeyword, dedupeMinVolume = 1) {
  const seen = new Set();
  const perTerm = [];
  let total = 0;
  let allNull = true;
  for (const term of terms) {
    const item = byKeyword.get(term) ?? byKeyword.get(term.toLowerCase());
    const sv = typeof item?.search_volume === 'number' ? item.search_volume : null;
    if (sv !== null) allNull = false;
    let counted = sv ?? 0;
    let grouped = false;
    if (sv !== null && sv > 0 && sv >= dedupeMinVolume) {
      const sig = `${sv}|${monthlySignature(item)}`;
      if (seen.has(sig)) { counted = 0; grouped = true; } else seen.add(sig);
    }
    total += counted;
    perTerm.push({ term, search_volume: sv, counted, grouped, cpc: item?.cpc ?? null, high_top_of_page_bid: item?.high_top_of_page_bid ?? null });
  }
  return { total, allNull, perTerm };
}

// Spec 3.5: volume-weighted CPC from the country task (cpc -> high_top_of_page_bid fallback).
export function ticketProxy(perTerm) {
  let num = 0;
  let den = 0;
  for (const t of perTerm) {
    const price = typeof t.cpc === 'number' ? t.cpc : (typeof t.high_top_of_page_bid === 'number' ? t.high_top_of_page_bid : null);
    if (price === null) continue;
    const sv = t.counted; // grouped duplicates carry zero weight, consistent with 3.3
    num += price * sv;
    den += sv;
  }
  return den > 0 ? num / den : 0;
}

export function hasLocalPack(organicData) {
  return (organicData?.item_types ?? []).includes('local_pack') || (organicData?.items ?? []).some(i => i.type === 'local_pack');
}

// Deterministic comparator: value desc, kit desc, slug asc, then a secondary key asc.
function byValue(valueKey, secondaryKey) {
  return (a, b) => (b[valueKey] - a[valueKey]) || (b.kit_level - a.kit_level) || a.slug.localeCompare(b.slug, 'en') || String(a[secondaryKey]).localeCompare(String(b[secondaryKey]), 'en', { numeric: true });
}

export function scoreStage1({ professions, areas, run }, get) {
  const cfg = run.stage1;
  const cities = allCities(areas);
  const missing = [];
  const fetch = (endpoint, params, label) => {
    const data = get(endpoint, params);
    if (data === undefined) missing.push(label);
    return data;
  };

  const country = itemsByKeyword(fetch(VOLUME_ENDPOINT, volumeParams(run.api.country_location_code, professions, run), 'volume:country'));
  const cityData = new Map();
  for (const c of cities) {
    cityData.set(c.slug, c.ads_location_code === null ? null : itemsByKeyword(fetch(VOLUME_ENDPOINT, volumeParams(c.ads_location_code, professions, run), `volume:${c.slug}`)));
  }
  const organic = new Map();
  for (const p of professions) {
    for (const r of areas.regions) organic.set(`${p.slug}|${r.id}`, fetch(ORGANIC_ENDPOINT, organicParams(p, r, run), `organic:${p.slug}:${r.id}`));
  }
  if (missing.length) {
    const err = new Error(`stage 1 inputs not cached: ${missing.length} (${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', ...' : ''})`);
    err.missing = missing;
    throw err;
  }

  // Spec 3.4 failure rule: a city is "null" when every term in its task came back null.
  const allTermsList = allTerms(professions);
  const nullCities = cities.filter(c => {
    const data = cityData.get(c.slug);
    return !data || allTermsList.every(t => typeof data.get(t)?.search_volume !== 'number');
  }).map(c => c.slug);
  const nullFraction = nullCities.length / cities.length;
  const diagnostics = { null_cities: nullCities, null_city_fraction: round4(nullFraction), grouped_terms: [], profession_null_fraction: {}, ticket: {} };
  if (nullFraction > cfg.null_city_fail_fraction) {
    const err = new Error(`stage 1 FAILED: ${(nullFraction * 100).toFixed(1)}% of cities returned null for all terms (> ${cfg.null_city_fail_fraction * 100}%). Spec 3.4: revise to Google Ads district codes.`);
    err.diagnostics = diagnostics;
    throw err;
  }

  const pairs = [];
  const cells = [];
  for (const p of professions) {
    const dedupeMin = cfg.grouped_dedupe_min_volume ?? 1;
    const urgency = (cfg.urgency_lead_gen_professions ?? []).includes(p.slug);
    const countryVol = professionVolume(p.terms, country, dedupeMin);
    const T = ticketProxy(countryVol.perTerm);
    diagnostics.ticket[p.slug] = { T_p_usd: round4(T), country_volume: countryVol.total, terms: countryVol.perTerm.map(t => ({ term: t.term, sv: t.search_volume, cpc: t.cpc, high_bid: t.high_top_of_page_bid, grouped: t.grouped })) };
    let nullCount = 0;
    for (const r of areas.regions) {
      const M = hasLocalPack(organic.get(`${p.slug}|${r.id}`)) ? cfg.map_intent_pack : cfg.map_intent_no_pack;
      const measured = r.cities.map(c => {
        const data = cityData.get(c.slug);
        if (!data) return { city: c, v: null };
        const vol = professionVolume(p.terms, data, dedupeMin);
        for (const t of vol.perTerm) if (t.grouped) diagnostics.grouped_terms.push({ profession: p.slug, city: c.slug, term: t.term, search_volume: t.search_volume });
        if (vol.allNull) nullCount += 1;
        return { city: c, v: vol.total };
      });
      for (const m of measured) if (m.v === null) nullCount += 1;
      const V_region = measured.reduce((n, m) => n + (m.v ?? 0), 0);
      const popRegion = r.cities.reduce((n, c) => n + c.population, 0);
      const valueRegion = V_region * T * M;
      pairs.push({ slug: p.slug, trade_he: p.trade_he, kit_level: p.kit_level, urgency_lead_gen: urgency, region: r.id, region_name: r.name, V_region, T_p_usd: round4(T), M, value_usd: round4(valueRegion), local_pack: M === cfg.map_intent_pack });
      for (const m of measured) {
        const isMeasured = m.v !== null && m.v >= cfg.min_city_volume_measured;
        const V_cell = isMeasured ? m.v : V_region * m.city.population / popRegion;
        cells.push({
          slug: p.slug, trade_he: p.trade_he, kit_level: p.kit_level, urgency_lead_gen: urgency, region: r.id, city: m.city.slug, city_he: m.city.he_name, ring: m.city.ring,
          population: m.city.population, V_region, V_city_measured: m.v, V_cell: round4(V_cell), V_source: isMeasured ? 'measured' : 'imputed',
          T_p_usd: round4(T), M, value_usd: round4(V_cell * T * M), flags: m.city.flags.join(';'),
        });
      }
    }
    diagnostics.profession_null_fraction[p.slug] = round4(nullCount / cities.length);
  }

  // Spec 3.7 pass rule: V_region >= 150 AND value in the top 50% of all pairs; at most 40 advance,
  // and (R5.2) at most max_pairs_per_profession regions per profession, highest value first.
  pairs.sort(byValue('value_usd', 'region'));
  const topN = Math.floor(pairs.length * cfg.value_top_fraction);
  const perProfessionCap = cfg.max_pairs_per_profession ?? Infinity;
  const perProfession = new Map();
  let advancing = 0;
  pairs.forEach((pair, i) => {
    pair.value_rank = i + 1;
    const reasons = [];
    if (pair.V_region < cfg.min_region_volume) reasons.push(`V_region<${cfg.min_region_volume}`);
    if (i >= topN) reasons.push('value_below_top_50pct');
    pair.stage1_pass = reasons.length === 0;
    const taken = perProfession.get(pair.slug) ?? 0;
    const underProfessionCap = taken < perProfessionCap;
    pair.advance = pair.stage1_pass && underProfessionCap && advancing < cfg.max_pairs_advancing;
    if (pair.stage1_pass && !underProfessionCap) reasons.push(`over_profession_cap_${perProfessionCap}`);
    else if (pair.stage1_pass && !pair.advance) reasons.push(`over_cap_${cfg.max_pairs_advancing}`);
    if (pair.advance) {
      advancing += 1;
      perProfession.set(pair.slug, taken + 1);
    }
    pair.fail_reason = reasons.join(';');
  });
  const adv = pairs.filter(p => p.advance);
  diagnostics.advancing = {
    pairs: adv.length,
    passing: pairs.filter(p => p.stage1_pass).length,
    professions: [...new Set(adv.map(p => p.slug))].sort(),
    professions_count: new Set(adv.map(p => p.slug)).size,
    cutoff_value_usd: adv.length ? adv[adv.length - 1].value_usd : null,
    per_profession: Object.fromEntries([...new Set(pairs.map(p => p.slug))].sort().map(slug => [slug, adv.filter(p => p.slug === slug).length])),
  };
  const pairIndex = new Map(pairs.map(p => [`${p.slug}|${p.region}`, p]));
  for (const c of cells) {
    const pair = pairIndex.get(`${c.slug}|${c.region}`);
    c.region_pass = pair.stage1_pass;
    c.region_advance = pair.advance;
  }
  cells.sort(byValue('value_usd', 'city'));
  cells.forEach((c, i) => { c.value_rank = i + 1; });
  diagnostics.grouped_terms.sort((a, b) => `${a.profession}|${a.city}|${a.term}`.localeCompare(`${b.profession}|${b.city}|${b.term}`, 'en'));
  return { pairs, cells, diagnostics };
}
