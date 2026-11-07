// Stage 2-4 (spec sections 4-5): competition from Google Maps, prospects, composite score.
// Pure functions; responses come through `get(endpoint, params)`.
import { createHash } from 'node:crypto';
import { round4 } from './stage1.mjs';

export const MAPS_ENDPOINT = '/serp/google/maps/live/advanced';
export const LOCAL_FINDER_ENDPOINT = '/serp/google/local_finder/live/advanced';
export const ORGANIC_ENDPOINT = '/serp/google/organic/live/advanced';

export function mapsParams(term, city, zoom, run, extra = {}) {
  return { keyword: term, location_coordinate: `${city.lat},${city.lng},${zoom}`, language_code: run.free_checks_2026_11_07.serp_language_code, depth: run.stage2.maps_depth, ...extra };
}
export function localFinderParams(term, city, zoom, run) {
  return { keyword: term, location_coordinate: `${city.lat},${city.lng},${zoom}`, language_code: run.free_checks_2026_11_07.serp_language_code, depth: run.stage2.local_finder_depth };
}
export function cellOrganicParams(term, city, run) {
  return { keyword: term, location_coordinate: `${city.lat},${city.lng}`, language_code: run.free_checks_2026_11_07.serp_language_code, depth: run.stage1.organic_depth };
}

export function resolveCells(cellSpecs, { professions, areas }) {
  const cities = areas.regions.flatMap(r => r.cities);
  return cellSpecs.map(spec => {
    const profession = professions.find(p => p.slug === spec.profession);
    const city = cities.find(c => c.slug === spec.city);
    if (!profession || !city) throw new Error(`unknown pilot cell ${spec.id}: ${spec.profession} x ${spec.city}`);
    return { ...spec, profession, city };
  });
}

export function planPilot(config) {
  const { run } = config;
  const cells = resolveCells(run.pilot.cells, config);
  const requests = [];
  for (const cell of cells) {
    const terms = cell.profession.terms.slice(0, run.stage2.terms_per_profession);
    for (const zoom of run.stage2.zooms) {
      for (const term of terms) requests.push({ endpoint: MAPS_ENDPOINT, params: mapsParams(term, cell.city, zoom, run), label: `maps:${cell.id}:${zoom}:${term === terms[0] ? 't1' : 't2'}` });
    }
    if (cell.id === run.pilot.search_places_check_cell) {
      requests.push({ endpoint: MAPS_ENDPOINT, params: mapsParams(terms[0], cell.city, run.stage2.primary_zoom, run, { search_places: false }), label: `maps:${cell.id}:search_places_false` });
    }
    requests.push({ endpoint: LOCAL_FINDER_ENDPOINT, params: localFinderParams(terms[0], cell.city, run.stage2.primary_zoom, run), label: `local_finder:${cell.id}` });
    requests.push({ endpoint: ORGANIC_ENDPOINT, params: cellOrganicParams(terms[0], cell.city, run), label: `organic:${cell.id}` });
  }
  return requests;
}

// ---- spec 4.3 helpers -----------------------------------------------------------------------
export function normalizeDomain(domain) {
  return String(domain ?? '').toLowerCase().replace(/^www\./, '');
}
export function realSite(b, notASite) {
  const d = normalizeDomain(b.domain);
  if (!d) return false;
  return !notASite.some(x => d === x || d.endsWith(`.${x}`));
}
export function stuffed(b, profession, city) {
  const title = String(b.title ?? '');
  return profession.terms.some(t => title.includes(t)) || title.includes(city.he_name);
}
// Stable ASCII id for a (localized) category text: config never needs to spell the text.
export function categoryId(text) {
  return `cat-${createHash('sha256').update(String(text)).digest('hex').slice(0, 8)}`;
}
// Spec 4.2, with the spec-8 fallback: Hebrew Maps items carry no category_ids, so the allowlist
// may also hold category-text ids (categoryId) matched against category + additional_categories.
export function relevant(b, allowlist) {
  if (b.is_directory_item === true) return false;
  if (!allowlist?.length) return true; // no allowlist yet -> everything non-directory counts (flagged in output)
  if ((b.category_ids ?? []).some(id => allowlist.includes(id))) return true;
  return [b.category, ...(b.additional_categories ?? [])].some(text => text && allowlist.includes(categoryId(text)));
}

// ---- spec 4.4 ---------------------------------------------------------------------------------
export function businessStrength(b, ctx) {
  const s = ctx.run.stage2;
  const w = s.weights;
  const votes = b.rating?.votes_count ?? 0;
  const rating = b.rating?.value ?? null;
  const reviews = Math.min(1, Math.log10(1 + votes) / Math.log10(1 + s.review_saturation_votes));
  const ratingTerm = votes < s.rating_min_votes || rating === null ? 0 : Math.min(1, Math.max(0, (rating - 3.5) / 1.5));
  const site = realSite(b, s.not_a_site) ? 1 : 0;
  const photos = Math.min(1, (b.total_photos ?? 0) / s.photo_saturation);
  const stuff = stuffed(b, ctx.profession, ctx.city) ? 1 : 0;
  return w.reviews * reviews + w.rating * ratingTerm + w.real_site * site + w.photos * photos + w.stuffed * stuff;
}

export function topStrength(ranked, ctx) {
  const top = ranked.slice(0, 3);
  const scores = top.map(b => businessStrength(b, ctx));
  while (scores.length < 3) scores.push(0);
  return { S3: (scores[0] + scores[1] + scores[2]) / 3, top3: scores };
}

export function s3Band(S3, run) {
  if (S3 >= run.stage2.saturated_s3) return 'saturated';
  if (S3 <= run.stage2.open_s3) return 'open';
  return 'middle';
}

// ---- spec 4.5 ---------------------------------------------------------------------------------
export function gaps(b, run) {
  const g = [];
  if (!realSite(b, run.stage2.not_a_site)) g.push('no_website');
  if (!b.additional_categories?.length) g.push('single_category');
  if ((b.total_photos ?? 0) < 10) g.push('few_photos');
  const timetable = b.work_hours?.timetable;
  if (!b.work_hours || !timetable || Object.values(timetable).every(v => !v || (Array.isArray(v) && !v.length))) g.push('missing_hours');
  if (b.is_claimed === false) g.push('unclaimed');
  if ((b.rating?.votes_count ?? 0) < 10) g.push('few_reviews');
  return g;
}

export function weakness(ranked, run) {
  const top = ranked.slice(0, run.stage2.score_ranks);
  if (!top.length) return 0;
  return top.reduce((n, b) => n + Math.min(gaps(b, run).length, run.stage2.gap_cap) / run.stage2.gap_cap, 0) / top.length;
}

// Merge term lists: relevant items only, ranks renumbered per list, best rank across lists.
export function mergeRanked(lists, allowlist) {
  const best = new Map();
  lists.forEach((items, listIndex) => {
    let rank = 0;
    for (const item of [...(items ?? [])].sort((a, b) => (a.rank_group ?? 0) - (b.rank_group ?? 0))) {
      if (!relevant(item, allowlist)) continue;
      rank += 1;
      const id = String(item.cid ?? item.place_id ?? item.title);
      const prev = best.get(id);
      if (!prev || rank < prev.rank || (rank === prev.rank && listIndex < prev.listIndex)) best.set(id, { rank, listIndex, item });
    }
  });
  return [...best.entries()]
    .sort(([idA, a], [idB, b]) => (a.rank - b.rank) || (a.listIndex - b.listIndex) || idA.localeCompare(idB, 'en'))
    .map(([id, v]) => ({ ...v.item, _id: id, _rank: v.rank }));
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// Spec 4.4 chain rule: a domain in relevant top-20 of >= 3 cells in >= 2 regions.
export function chainDomains(cellResults, run) {
  const seen = new Map();
  for (const cr of cellResults) {
    for (const b of cr.ranked.slice(0, run.stage2.score_ranks)) {
      const d = normalizeDomain(b.domain);
      if (!d || !realSite(b, run.stage2.not_a_site)) continue;
      const entry = seen.get(d) ?? { cells: new Set(), regions: new Set() };
      entry.cells.add(cr.cellKey);
      entry.regions.add(cr.city.region);
      seen.set(d, entry);
    }
  }
  return new Set([...seen.entries()].filter(([, e]) => e.cells.size >= run.stage2.chain_min_cells && e.regions.size >= run.stage2.chain_min_regions).map(([d]) => d));
}

// Spec 5.1 prospects; each id assigned to the nearest centroid among the cells it qualifies for.
export function assignProspects(cellResults, chains, run) {
  const s = run.stage2;
  const candidates = new Map(); // id -> [{cellKey, dist}]
  for (const cr of cellResults) {
    for (const b of cr.ranked.slice(0, 100)) {
      const g = gaps(b, run);
      const votes = b.rating?.votes_count ?? 0;
      const alive = votes >= 1 || b.is_claimed === true;
      const isChain = chains.has(normalizeDomain(b.domain));
      const hasCoords = typeof b.latitude === 'number' && typeof b.longitude === 'number';
      const dist = hasCoords ? haversineKm(b.latitude, b.longitude, cr.city.lat, cr.city.lng) : Infinity;
      const inCell = b.address_info?.city === cr.city.he_name || dist <= s.prospect_radius_km;
      if (!b.phone || isChain || b.is_directory_item === true || g.length < s.prospect_min_gaps || !alive || !inCell) continue;
      candidates.set(b._id, [...(candidates.get(b._id) ?? []), { cellKey: cr.cellKey, dist, b, g }]);
    }
  }
  const byCell = new Map(cellResults.map(cr => [cr.cellKey, []]));
  for (const [id, list] of [...candidates.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const best = [...list].sort((a, b) => (a.dist - b.dist) || a.cellKey.localeCompare(b.cellKey, 'en'))[0];
    byCell.get(best.cellKey).push({ id, ...best });
  }
  return byCell;
}

export function compositeScore({ value, S3, P, flags, stage1Pass }, run) {
  const s = run.stage2;
  const raw = value * (1 - S3) ** 2 * Math.min(1, P / s.prospect_pass);
  const reasons = [];
  if (S3 >= s.saturated_s3) reasons.push('saturated');
  if (P < s.prospect_kill_below) reasons.push(`P<${s.prospect_kill_below}`);
  if (flags.includes('haredi_majority')) reasons.push('haredi_majority');
  if (stage1Pass === false) reasons.push('stage1_fail');
  return { score_unkilled: raw, score: reasons.length ? 0 : raw, kill_reason: reasons.join(';') };
}

// Spec 5.3: score desc; adjacent rows within 5% fall back to kit desc, P desc, S3 asc, slug, city.
export function orderRows(rows, run) {
  const tie = (a, b) => (b.kit_level - a.kit_level) || (b.P - a.P) || (a.S3 - b.S3) || a.slug.localeCompare(b.slug, 'en') || a.city.localeCompare(b.city, 'en');
  const out = [...rows].sort((a, b) => (b.score - a.score) || tie(a, b));
  const within = (a, b) => {
    const hi = Math.max(a.score, b.score);
    return hi === 0 ? true : Math.abs(a.score - b.score) / hi <= run.stage2.tie_within_fraction;
  };
  for (let pass = 0; pass < out.length; pass += 1) {
    let swapped = false;
    for (let i = 0; i + 1 < out.length; i += 1) {
      if (within(out[i], out[i + 1]) && tie(out[i], out[i + 1]) > 0) {
        [out[i], out[i + 1]] = [out[i + 1], out[i]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return out;
}

function overlap(a, b) {
  const ids = new Set(a.map(x => String(x.cid ?? x.place_id ?? x.title)));
  return b.filter(x => ids.has(String(x.cid ?? x.place_id ?? x.title))).length;
}

export function scorePilot(config, get, stage1Cells) {
  const { run } = config;
  const cells = resolveCells(run.pilot.cells, config);
  const missing = [];
  const need = (endpoint, params, label) => {
    const d = get(endpoint, params);
    if (d === undefined) missing.push(label);
    return d;
  };
  const perZoom = {};
  const extras = {};
  for (const zoom of run.stage2.zooms) {
    perZoom[zoom] = cells.map(cell => {
      const allow = run.stage2.category_allowlist[cell.profession.slug] ?? [];
      const terms = cell.profession.terms.slice(0, run.stage2.terms_per_profession);
      const lists = terms.map((t, i) => need(MAPS_ENDPOINT, mapsParams(t, cell.city, zoom, run), `maps:${cell.id}:${zoom}:t${i + 1}`)?.items ?? []);
      return { cell, cellKey: `${cell.profession.slug}|${cell.city.slug}`, city: cell.city, lists, allow, ranked: mergeRanked(lists, allow) };
    });
  }
  for (const cell of cells) {
    const term = cell.profession.terms[0];
    extras[cell.id] = {
      local_finder: need(LOCAL_FINDER_ENDPOINT, localFinderParams(term, cell.city, run.stage2.primary_zoom, run), `local_finder:${cell.id}`)?.items ?? [],
      organic: need(ORGANIC_ENDPOINT, cellOrganicParams(term, cell.city, run), `organic:${cell.id}`),
      search_places_false: cell.id === run.pilot.search_places_check_cell
        ? need(MAPS_ENDPOINT, mapsParams(term, cell.city, run.stage2.primary_zoom, run, { search_places: false }), `maps:${cell.id}:search_places_false`)?.items ?? []
        : null,
    };
  }
  if (missing.length) {
    const err = new Error(`pilot inputs not cached: ${missing.join(', ')}`);
    err.missing = missing;
    throw err;
  }

  const rows = [];
  const privateRows = [];
  for (const zoom of run.stage2.zooms) {
    const results = perZoom[zoom];
    const chains = chainDomains(results, run);
    const prospects = assignProspects(results, chains, run);
    for (const cr of results) {
      const ctx = { run, profession: cr.cell.profession, city: cr.city };
      const { S3, top3 } = topStrength(cr.ranked, ctx);
      const W = weakness(cr.ranked, run);
      const P = prospects.get(cr.cellKey).length;
      const s1 = stage1Cells?.find(c => c.slug === cr.cell.profession.slug && c.city === cr.city.slug);
      const value = s1?.value_usd ?? 0;
      const comp = compositeScore({ value, S3, P, flags: cr.city.flags, stage1Pass: s1 ? s1.region_pass : undefined }, run);
      const lf = extras[cr.cell.id].local_finder;
      const rawT1 = [...cr.lists[0]].sort((a, b) => a.rank_group - b.rank_group).slice(0, 3);
      const spf = extras[cr.cell.id].search_places_false;
      rows.push({
        zoom, cell_id: cr.cell.id, expect: cr.cell.expect, slug: cr.cell.profession.slug, trade_he: cr.cell.profession.trade_he,
        region: cr.city.region, city: cr.city.slug, city_he: cr.city.he_name, ring: cr.city.ring,
        V_region: s1?.V_region ?? null, V_cell: s1?.V_cell ?? null, V_source: s1?.V_source ?? null, T_p_usd: s1?.T_p_usd ?? null, M: s1?.M ?? null,
        value_usd: round4(value), S3: round4(S3), S3_band: s3Band(S3, run), top3_s: top3.map(round4).join('/'), W: round4(W), P, pooled: false,
        kit_level: cr.cell.profession.kit_level, score: round4(comp.score), score_unkilled: round4(comp.score_unkilled), kill_reason: comp.kill_reason,
        flags: [...cr.city.flags, ...(cr.allow.length ? [] : ['no_category_allowlist'])].join(';'),
        maps_items_t1: cr.lists[0].length, maps_items_t2: cr.lists[1]?.length ?? 0, relevant_ranked: cr.ranked.length,
        lf_overlap_top3: overlap(rawT1, lf.slice(0, 3)),
        organic_local_pack: extras[cr.cell.id].organic ? (extras[cr.cell.id].organic.item_types ?? []).includes('local_pack') : null,
        search_places_false_top20_overlap: spf && zoom === run.stage2.primary_zoom ? overlap([...cr.lists[0]].sort((a, b) => a.rank_group - b.rank_group).slice(0, 20), [...spf].sort((a, b) => a.rank_group - b.rank_group).slice(0, 20)) : null,
      });
      for (const [i, b] of cr.ranked.slice(0, 20).entries()) {
        privateRows.push({ zoom, cell_id: cr.cell.id, rank: i + 1, cid: b.cid ?? null, title: b.title ?? null, phone: b.phone ?? null, domain: b.domain ?? null, votes: b.rating?.votes_count ?? 0, rating: b.rating?.value ?? null, category_ids: (b.category_ids ?? []).join('|'), gaps: gaps(b, run).join('|'), s_b: i < 3 ? round4(top3[i]) : null, prospect: prospects.get(cr.cellKey).some(p => p.id === b._id) });
      }
    }
  }
  const primary = orderRows(rows.filter(r => r.zoom === run.stage2.primary_zoom), run);
  const secondary = orderRows(rows.filter(r => r.zoom !== run.stage2.primary_zoom), run);
  [primary, secondary].forEach(list => list.forEach((r, i) => { r.rank = i + 1; }));
  return { rows: [...primary, ...secondary], privateRows };
}
