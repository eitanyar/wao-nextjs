// Stage 2-4 (spec sections 4-5 as revised by R1-R11): two-step competition check, prospects,
// composite score. Pure functions; responses come through `get(endpoint, params, minSchema)`.
//   step 1 (cheap rule-out): Local Finder + organic per cell -> S3 from LF top 3 -> S3 >= 0.70 stops.
//   step 2 (survivors only): Maps terms 1-2 -> prospect pool, cid join for the LF top 3.
import { createHash } from 'node:crypto';
import { round4, serpLanguage } from './stage1.mjs';
import { ORGANIC_SCHEMA, isGoogleRedirect } from './dfs.mjs';
import { classifyRelevance, titleTerms } from './relevance.mjs';
import { classifyOrganic, nationalBrandDomains, hasAiOverview, normalizeDomain, domainIn } from './organic.mjs';
import { siteVerdict } from './homepage.mjs';

export { normalizeDomain };
export const MAPS_ENDPOINT = '/serp/google/maps/live/advanced';
export const LOCAL_FINDER_ENDPOINT = '/serp/google/local_finder/live/advanced';
export const ORGANIC_ENDPOINT = '/serp/google/organic/live/advanced';

const zoomOf = run => run.stage2.primary_zoom;
export function mapsParams(term, city, zoom, run, extra = {}) {
  return { keyword: term, location_coordinate: `${city.lat},${city.lng},${zoom}`, language_code: serpLanguage(run), depth: run.stage2.maps_depth, ...extra };
}
export function localFinderParams(term, point, zoom, run) {
  return { keyword: term, location_coordinate: `${point.lat},${point.lng},${zoom}`, language_code: serpLanguage(run), depth: run.stage2.local_finder_depth };
}
export function cellOrganicParams(term, city, run) {
  return { keyword: term, location_coordinate: `${city.lat},${city.lng}`, language_code: serpLanguage(run), depth: run.stage2.organic_depth_cell ?? run.stage1.organic_depth };
}

// R11 proximity probe: points ~km north and south of the centroid (1 deg latitude = 111.32 km).
export function proximityPoints(city, km) {
  const d = km / 111.32;
  const r5 = x => Number(x.toFixed(5));
  return [{ dir: 'north', lat: r5(city.lat + d), lng: city.lng }, { dir: 'south', lat: r5(city.lat - d), lng: city.lng }];
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

const mapsTerms = (cell, run) => cell.profession.terms.slice(0, run.stage2.maps_terms ?? run.stage2.terms_per_profession);

export function planStep1(config) {
  const { run } = config;
  const requests = [];
  for (const cell of resolveCells(run.pilot.cells, config)) {
    const term = cell.profession.terms[0];
    requests.push({ endpoint: LOCAL_FINDER_ENDPOINT, params: localFinderParams(term, cell.city, zoomOf(run), run), label: `local_finder:${cell.id}` });
    requests.push({ endpoint: ORGANIC_ENDPOINT, params: cellOrganicParams(term, cell.city, run), minSchema: ORGANIC_SCHEMA, label: `organic:${cell.id}` });
    if (cell.proximity_probe) {
      for (const p of proximityPoints(cell.city, run.pilot.proximity_probe_offset_km)) {
        requests.push({ endpoint: LOCAL_FINDER_ENDPOINT, params: localFinderParams(term, p, zoomOf(run), run), label: `local_finder:${cell.id}:${p.dir}` });
      }
    }
  }
  return requests;
}

export function planStep2(config, cellIds) {
  const { run } = config;
  const ids = new Set(cellIds);
  const requests = [];
  for (const cell of resolveCells(run.pilot.cells, config).filter(c => ids.has(c.id))) {
    mapsTerms(cell, run).forEach((term, i) => requests.push({ endpoint: MAPS_ENDPOINT, params: mapsParams(term, cell.city, zoomOf(run), run), label: `maps:${cell.id}:t${i + 1}` }));
  }
  return requests;
}
// Legacy name: the full worst-case plan (every cell survives step 1).
export function planPilot(config) {
  return [...planStep1(config), ...planStep2(config, config.run.pilot.cells.map(c => c.id))];
}

// ---- helpers ------------------------------------------------------------------------------------
export const notASite = run => [...new Set([...(run.stage2.not_a_site ?? []), ...(run.stage2.not_a_site_append ?? [])])];
export function realSite(b, list) {
  const d = normalizeDomain(b.domain);
  if (!d) return false;
  return !domainIn(d, list);
}
export function stuffed(b, profession, city) {
  const title = String(b.title ?? '');
  return profession.terms.some(t => title.includes(t)) || title.includes(city.he_name);
}
// Stable ASCII id for a (localized) category text.
export function categoryId(text) {
  return `cat-${createHash('sha256').update(String(text)).digest('hex').slice(0, 8)}`;
}
const idOf = b => String(b.cid ?? b.place_id ?? b.title);
const byRank = (a, b) => (a.rank_group ?? 0) - (b.rank_group ?? 0);
const phoneKey = p => String(p ?? '').replace(/\D/g, '').replace(/^972/, '0');

// ---- S3 (spec 4.4 weights, R1 source + missing-field policy) ------------------------------------
// Each component is a number in [0,1] or null when the field is missing. Missing != weak: a null
// component is dropped and the remaining weights renormalised (R1.2).
//   real_site is missing only when the listing's website is hidden behind a Google redirect
//   (Local Finder items); no website at all is a real 0. photos is missing when total_photos is.
export function strengthComponents(b, ctx) {
  const s = ctx.run.stage2;
  const votes = b.rating?.votes_count ?? 0;
  const rating = b.rating?.value ?? null;
  const siteUnknown = isGoogleRedirect(b) && !b._joined;
  return {
    reviews: Math.min(1, Math.log10(1 + votes) / Math.log10(1 + s.review_saturation_votes)),
    rating: votes < s.rating_min_votes || rating === null ? 0 : Math.min(1, Math.max(0, (rating - 3.5) / 1.5)),
    real_site: siteUnknown ? null : (realSite(b, notASite(ctx.run)) ? 1 : 0),
    photos: typeof b.total_photos === 'number' ? Math.min(1, b.total_photos / s.photo_saturation) : null,
    stuffed: stuffed(b, ctx.profession, ctx.city) ? 1 : 0,
  };
}

export function businessStrength(b, ctx) {
  const w = ctx.run.stage2.weights;
  const c = strengthComponents(b, ctx);
  let num = 0;
  let den = 0;
  for (const [k, v] of Object.entries(c)) {
    if (v === null) continue;
    num += w[k] * v;
    den += w[k];
  }
  return den > 0 ? num / den : 0;
}

// LF top 3 as-is (R1.1); an empty slot counts 0.
export function topStrength(top3, ctx) {
  const scores = top3.slice(0, 3).map(b => businessStrength(b, ctx));
  while (scores.length < 3) scores.push(0);
  return { S3: (scores[0] + scores[1] + scores[2]) / 3, top3: scores };
}

export function s3Band(S3, run) {
  if (S3 === null || S3 === undefined) return null;
  if (S3 >= run.stage2.saturated_s3) return 'saturated';
  if (S3 <= run.stage2.open_s3) return 'open';
  return 'middle';
}

const JOIN_FIELDS = ['domain', 'url', 'total_photos', 'additional_categories', 'category', 'category_ids', 'is_claimed', 'work_hours', 'latitude', 'longitude', 'address_info', 'is_directory_item'];
// R1.2: LF item joined to the Maps pool by cid; absent -> the LF item's own fields.
export function joinLf(lfItem, poolByCid) {
  const m = poolByCid?.get(String(lfItem.cid));
  if (!m) return { ...lfItem, _joined: false };
  const out = { ...lfItem, _joined: true };
  for (const f of JOIN_FIELDS) if (m[f] !== undefined) out[f] = m[f];
  // The Maps item is the truth about the website: no domain there = no website (not the LF redirect).
  out.domain = m.domain ?? null;
  out.url = m.url ?? null;
  if (!out.phone && m.phone) out.phone = m.phone;
  return out;
}

export const lfTop3 = items => [...(items ?? [])].sort(byRank).slice(0, 3);

// ---- spec 4.5 gaps / weakness (pitch material; no longer a prospect gate) -----------------------
export function gaps(b, run) {
  const g = [];
  if (!realSite(b, notASite(run))) g.push('no_website');
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

// Raw Maps pool: every item across the term lists, best raw rank (what a searcher sees).
export function mapsPool(lists) {
  const best = new Map();
  lists.forEach((items, listIndex) => {
    for (const item of [...(items ?? [])].sort(byRank)) {
      const id = idOf(item);
      const prev = best.get(id);
      const rank = item.rank_group ?? Infinity;
      if (!prev || rank < prev._raw_rank || (rank === prev._raw_rank && listIndex < prev._list)) best.set(id, { ...item, _id: id, _raw_rank: rank, _list: listIndex });
    }
  });
  return [...best.values()].sort((a, b) => (a._raw_rank - b._raw_rank) || (a._list - b._list) || a._id.localeCompare(b._id, 'en'));
}

// Relevant items only, ranks renumbered per list, best rank across lists (W, chains, prospects).
export function mergeRanked(lists, isRel) {
  const best = new Map();
  lists.forEach((items, listIndex) => {
    let rank = 0;
    for (const item of [...(items ?? [])].sort(byRank)) {
      if (!isRel(item)) continue;
      rank += 1;
      const id = idOf(item);
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
      if (!d || !realSite(b, notASite(run))) continue;
      const entry = seen.get(d) ?? { cells: new Set(), regions: new Set() };
      entry.cells.add(cr.cellKey);
      entry.regions.add(cr.city.region);
      seen.set(d, entry);
    }
  }
  return new Set([...seen.entries()].filter(([, e]) => e.cells.size >= run.stage2.chain_min_cells && e.regions.size >= run.stage2.chain_min_regions).map(([d]) => d));
}

// R5.3(b) lead-gen phone rule (urgency trades only): a phone on >= 2 listings in a cell, or seen
// in >= 3 cells -> lead_gen (never a prospect; still counts fully toward S3).
export function leadGenPhones(cellResults, run) {
  const s = run.stage2;
  const cellsByPhone = new Map();
  const perCell = new Map();
  for (const cr of cellResults) {
    const listings = new Map();
    for (const b of cr.pool) {
      const p = phoneKey(b.phone);
      if (!p) continue;
      listings.set(p, (listings.get(p) ?? new Set()).add(b._id));
      cellsByPhone.set(p, (cellsByPhone.get(p) ?? new Set()).add(cr.cellKey));
    }
    perCell.set(cr.cellKey, listings);
  }
  const out = new Map();
  for (const cr of cellResults) {
    const flagged = new Set();
    if (cr.urgency) {
      for (const [p, ids] of perCell.get(cr.cellKey)) {
        if (ids.size >= s.lead_gen_phone_min_listings_in_cell || cellsByPhone.get(p).size >= s.lead_gen_phone_min_cells) flagged.add(p);
      }
    }
    out.set(cr.cellKey, flagged);
  }
  return out;
}
export const isLeadGen = (b, flagged) => flagged.has(phoneKey(b.phone));

// R6 prospects. Each id is assigned to the nearest centroid among the qualifying cells of the
// same profession (a business may be a prospect for several professions - R4).
export function assignProspects(cellResults, chains, leadGen, run) {
  const s = run.stage2;
  const candidates = new Map(); // profession|id -> [{cellKey, dist, b}]
  for (const cr of cellResults) {
    const lfIds = new Set(cr.lfTop3.map(b => String(b.cid)));
    const flagged = leadGen.get(cr.cellKey) ?? new Set();
    for (const b of cr.ranked) {
      const votes = b.rating?.votes_count ?? 0;
      const alive = votes >= 1 || b.is_claimed === true;
      const isChain = chains.has(normalizeDomain(b.domain));
      const hasCoords = typeof b.latitude === 'number' && typeof b.longitude === 'number';
      const dist = hasCoords ? haversineKm(b.latitude, b.longitude, cr.city.lat, cr.city.lng) : Infinity;
      const inCell = b.address_info?.city === cr.city.he_name || dist <= s.prospect_radius_km;
      const weakRanking = !lfIds.has(String(b.cid)) && (cr.rawRank.get(b._id) ?? Infinity) >= s.weak_rank_min;
      if (!b.phone || isChain || isLeadGen(b, flagged) || b.is_directory_item === true || !alive || !inCell || !weakRanking) continue;
      const key = `${cr.cell.profession.slug}|${b._id}`;
      candidates.set(key, [...(candidates.get(key) ?? []), { cellKey: cr.cellKey, dist, b }]);
    }
  }
  const byCell = new Map(cellResults.map(cr => [cr.cellKey, []]));
  for (const [key, list] of [...candidates.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const best = [...list].sort((a, b) => (a.dist - b.dist) || a.cellKey.localeCompare(b.cellKey, 'en'))[0];
    byCell.get(best.cellKey).push({ id: key.split('|')[1], ...best });
  }
  return byCell;
}

// R6 weight of one prospect: 1.25 no real site, 1.10 weak site, 1.00 site OK / not checked.
export function prospectWeight(b, check, ctx) {
  const w = ctx.run.stage2.prospect_weights;
  if (!realSite(b, notASite(ctx.run))) return { w_b: w.no_site, site: 'none', verdict: null };
  const verdict = siteVerdict(check, ctx.siteCtx, ctx.run.homepage_check);
  if (!verdict) return { w_b: w.unchecked, site: check ? check.site_check : 'unchecked', verdict: null };
  return { w_b: verdict.weak_site ? w.weak_site : w.ok_site, site: verdict.weak_site ? 'weak' : 'ok', verdict };
}

// R10: Score = Value * (1 - S3)^2 * min(1, P_w / 15) * O. P_w null (step-1 kill) -> unscored.
export function compositeScore({ value, S3, P_w, O = 1, flags, stage1Pass }, run) {
  const s = run.stage2;
  const raw = P_w === null || P_w === undefined ? null : value * (1 - S3) ** 2 * Math.min(1, P_w / s.prospect_pass_weighted) * O;
  const reasons = [];
  if (S3 >= s.saturated_s3) reasons.push('saturated');
  if (P_w !== null && P_w !== undefined && P_w < s.prospect_kill_below_weighted) reasons.push(`P_w<${s.prospect_kill_below_weighted}`);
  if (flags.includes('haredi_majority')) reasons.push('haredi_majority');
  if (stage1Pass === false) reasons.push('stage1_fail');
  return { score_unkilled: raw, score: reasons.length || raw === null ? 0 : raw, kill_reason: reasons.join(';') };
}

// Spec 5.3: score desc; adjacent rows within 5% fall back to kit desc, P_w desc, S3 asc, slug, city.
export function orderRows(rows, run) {
  const pw = r => r.P_w ?? r.P ?? -1;
  const tie = (a, b) => (b.kit_level - a.kit_level) || (pw(b) - pw(a)) || (a.S3 - b.S3) || a.slug.localeCompare(b.slug, 'en') || a.city.localeCompare(b.city, 'en');
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

// ---- step 1: the cheap rule-out ----------------------------------------------------------------
// S3 from LF top 3 using only the LF items' own fields. Deliberately independent of whether a
// Maps pool happens to be cached, so the gate decision never depends on cache state.
export function step1Gate(config, get) {
  const { run } = config;
  const missing = [];
  const out = [];
  for (const cell of resolveCells(run.pilot.cells, config)) {
    const term = cell.profession.terms[0];
    const lf = get(LOCAL_FINDER_ENDPOINT, localFinderParams(term, cell.city, zoomOf(run), run));
    const organic = get(ORGANIC_ENDPOINT, cellOrganicParams(term, cell.city, run), ORGANIC_SCHEMA);
    if (lf === undefined) missing.push(`local_finder:${cell.id}`);
    if (organic === undefined) missing.push(`organic:${cell.id}`);
    if (lf === undefined) continue;
    const ctx = { run, profession: cell.profession, city: cell.city };
    const top = lfTop3(lf.items);
    const { S3, top3 } = topStrength(top, ctx);
    out.push({ cell, lf: lf.items ?? [], organic, S3_step1: S3, top3_step1: top3, survives: S3 < run.stage2.saturated_s3 });
  }
  return { cells: out, missing, survivors: out.filter(c => c.survives).map(c => c.cell.id) };
}

function overlapCount(aIds, bIds) {
  const set = new Set(aIds.map(String));
  return bIds.filter(x => set.has(String(x))).length;
}

// ---- full scoring -------------------------------------------------------------------------------
// siteChecks: Map host -> derived homepage record (or undefined). Returns hostsNeeded so the
// engine can run the free homepage checks between two pure passes.
export function scorePilot(config, get, stage1Cells, siteChecks = new Map()) {
  const { run } = config;
  const gate = step1Gate(config, get);
  const missing = [...gate.missing];
  const results = [];
  for (const g of gate.cells) {
    const { cell } = g;
    const cellKey = `${cell.profession.slug}|${cell.city.slug}`;
    const base = { ...g, cellKey, city: cell.city, urgency: (run.stage1.urgency_lead_gen_professions ?? []).includes(cell.profession.slug) };
    if (!g.survives) { results.push({ ...base, maps: false }); continue; }
    const lists = mapsTerms(cell, run).map((t, i) => {
      const d = get(MAPS_ENDPOINT, mapsParams(t, cell.city, zoomOf(run), run));
      if (d === undefined) missing.push(`maps:${cell.id}:t${i + 1}`);
      return d?.items ?? [];
    });
    const pool = mapsPool(lists);
    const rel = new Map(pool.map(b => [b._id, classifyRelevance(b, cell.profession, run)]));
    const ranked = mergeRanked(lists, b => rel.get(idOf(b))?.relevant);
    results.push({ ...base, maps: true, lists, pool, rel, ranked, poolByCid: new Map(pool.map(b => [String(b.cid), b])), rawRank: new Map(pool.map(b => [b._id, b._raw_rank])) });
  }
  if (missing.length) {
    const err = new Error(`pilot inputs not cached: ${missing.join(', ')}`);
    err.missing = missing;
    throw err;
  }

  for (const r of results) r.lfTop3 = lfTop3(r.lf).map(b => joinLf(b, r.poolByCid));
  const survivors = results.filter(r => r.maps);
  const chains = chainDomains(survivors, run);
  const leadGen = leadGenPhones(survivors, run);
  const prospects = assignProspects(survivors, chains, leadGen, run);
  const national = nationalBrandDomains(results.map(r => ({ profession: r.cell.profession.slug, region: r.city.region, data: r.organic })), run.stage2.national_brand_min_regions, run.stage2.organic_depth_cell);

  const hostsNeeded = new Set();
  const rows = [];
  const privateRows = [];
  const organicRows = [];
  const categoryDiagnostics = [];
  const proximity = [];
  for (const r of results) {
    const { cell } = r;
    const ctx = { run, profession: cell.profession, city: cell.city, siteCtx: { cityNames: [cell.city.he_name, ...(cell.city.aliases ?? [])], titleTerms: titleTerms(cell.profession, run) } };
    // S3: survivors use the cid-joined LF top 3; step-1 kills keep the gate value.
    const final = r.maps ? topStrength(r.lfTop3, ctx) : { S3: r.S3_step1, top3: r.top3_step1 };
    const W = r.maps ? weakness(r.ranked, run) : null;
    const list = r.maps ? prospects.get(r.cellKey) : [];
    let P_w = r.maps ? 0 : null;
    let checked = 0;
    let checkErrors = 0;
    const prospectRows = list.map(p => {
      const host = realSite(p.b, notASite(run)) ? normalizeDomain(p.b.domain) : null;
      if (host) hostsNeeded.add(host);
      const check = host ? siteChecks.get(host) : undefined;
      if (check) { checked += 1; if (check.site_check === 'error') checkErrors += 1; }
      const wt = prospectWeight(p.b, check, ctx);
      P_w += wt.w_b;
      return { p, host, check, wt };
    });
    for (const b of r.lfTop3) if (r.maps && b._joined && realSite(b, notASite(run))) hostsNeeded.add(normalizeDomain(b.domain));
    const poolDomains = new Set(r.maps ? r.pool.filter(b => realSite(b, notASite(run))).map(b => normalizeDomain(b.domain)) : []);
    const org = r.organic ? classifyOrganic(r.organic, { poolDomains, chainDomains: chains, nationalDomains: national.get(cell.profession.slug) ?? new Set(), run }) : null;
    const O = org ? org.O : 1;
    const s1 = stage1Cells?.find(c => c.slug === cell.profession.slug && c.city === cell.city.slug);
    const value = s1?.value_usd ?? 0;
    const comp = compositeScore({ value, S3: final.S3, P_w, O, flags: cell.city.flags, stage1Pass: s1 ? s1.region_pass : undefined }, run);
    const packCids = (r.organic?.items ?? []).filter(i => i.type === 'local_pack' && i.cid).map(i => i.cid);
    const flaggedPhones = leadGen.get(r.cellKey) ?? new Set();
    rows.push({
      cell_id: cell.id, expect: cell.expect, slug: cell.profession.slug, trade_he: cell.profession.trade_he,
      region: cell.city.region, city: cell.city.slug, city_he: cell.city.he_name, ring: cell.city.ring, urgency_lead_gen: r.urgency,
      V_region: s1?.V_region ?? null, V_cell: s1?.V_cell ?? null, V_source: s1?.V_source ?? null, T_p_usd: s1?.T_p_usd ?? null, M: s1?.M ?? null,
      value_usd: round4(value), region_pass: s1?.region_pass ?? null, region_advance: s1?.region_advance ?? null,
      stopped_at: r.maps ? 'step2' : 'step1', maps_bought: r.maps,
      S3_step1: round4(r.S3_step1), S3: round4(final.S3), S3_band: s3Band(final.S3, run), top3_s: final.top3.map(round4).join('/'),
      lf_top3_joined: r.lfTop3.filter(b => b._joined).length, lf_top3_paid: r.lfTop3.filter(b => b.is_paid === true).length,
      W: round4(W), P: r.maps ? list.length : null, P_w: P_w === null ? null : round4(P_w), pooled: false,
      L_share: org ? round4(org.L_share) : null, D_share: org ? round4(org.D_share) : null, O: round4(O),
      organic_counted: org?.counted ?? null, organic_unresolved: org?.unresolved ?? null, has_ai_overview: r.organic ? hasAiOverview(r.organic) : null,
      kit_level: cell.profession.kit_level, score: round4(comp.score), score_unkilled: round4(comp.score_unkilled), kill_reason: comp.kill_reason,
      flags: cell.city.flags.join(';'),
      lf_pack_overlap: r.organic ? overlapCount(packCids, r.lfTop3.map(b => b.cid)) : null,
      lead_gen_listings: r.maps ? r.pool.filter(b => isLeadGen(b, flaggedPhones)).length : null,
      homepage_checked: r.maps ? checked : null, homepage_errors: r.maps ? checkErrors : null,
      maps_items_t1: r.maps ? r.lists[0].length : null, maps_items_t2: r.maps ? (r.lists[1]?.length ?? 0) : null, relevant_ranked: r.maps ? r.ranked.length : null,
    });

    // private, business-level rows (gitignored dir only)
    r.lfTop3.forEach((b, i) => {
      const host = b._joined && realSite(b, notASite(run)) ? normalizeDomain(b.domain) : null;
      const check = host ? siteChecks.get(host) : undefined;
      const verdict = check ? siteVerdict(check, ctx.siteCtx, run.homepage_check) : null;
      privateRows.push({ cell_id: cell.id, role: 'lf_top3', rank: i + 1, cid: b.cid ?? null, title: b.title ?? null, phone: b.phone ?? null, domain: b._joined ? (b.domain ?? null) : null, joined: b._joined, votes: b.rating?.votes_count ?? 0, rating: b.rating?.value ?? null, category: b.category ?? null, s_b: round4(final.top3[i]), site_check: check?.site_check ?? null, platform: check?.platform ?? null, weak_site: verdict?.weak_site ?? null });
    });
    for (const { p, host, check, wt } of prospectRows) {
      const b = p.b;
      privateRows.push({ cell_id: cell.id, role: 'prospect', rank: r.rawRank.get(b._id), cid: b.cid ?? null, title: b.title ?? null, phone: b.phone ?? null, domain: b.domain ?? null, votes: b.rating?.votes_count ?? 0, rating: b.rating?.value ?? null, category: b.category ?? null, relevant_via: r.rel.get(b._id)?.via ?? null, gaps: gaps(b, run).join('|'), dist_km: round4(p.dist), w_b: wt.w_b, site: wt.site, site_check: check?.site_check ?? (host ? 'unchecked' : null), platform: check?.platform ?? null, city_hit: wt.verdict?.city_hit ?? null, service_hit: wt.verdict?.service_hit ?? null, multi_page: check?.multi_page ?? null, fetch_ms: check?.fetch_ms ?? null });
    }
    if (org) organicRows.push({ cell_id: cell.id, rows: org.rows });

    // R4 diagnostics: every top-20 category text (raw Maps rank, both terms) that matched no rule
    if (r.maps) {
      const counts = new Map();
      for (const b of r.pool.slice(0, run.stage2.score_ranks)) {
        for (const text of r.rel.get(b._id).unmatched) {
          const e = counts.get(text) ?? { category: text, items: 0, items_relevant_anyway: 0 };
          e.items += 1;
          if (r.rel.get(b._id).relevant) e.items_relevant_anyway += 1;
          counts.set(text, e);
        }
      }
      const via = {};
      for (const b of r.pool.slice(0, run.stage2.score_ranks)) {
        const v = r.rel.get(b._id).via ?? 'not_relevant';
        via[v] = (via[v] ?? 0) + 1;
      }
      categoryDiagnostics.push({ cell_id: cell.id, profession: cell.profession.slug, city: cell.city.slug, top20_relevance: via, unmatched: [...counts.values()].sort((a, b) => (b.items - a.items) || a.category.localeCompare(b.category)) });
    } else {
      categoryDiagnostics.push({ cell_id: cell.id, profession: cell.profession.slug, city: cell.city.slug, skipped: 'killed at step 1 (no Maps call; Local Finder items carry no category)' });
    }

    if (cell.proximity_probe) {
      const centroid = lfTop3(r.lf).map(b => b.cid);
      const probes = proximityPoints(cell.city, run.pilot.proximity_probe_offset_km).map(p => {
        const d = get(LOCAL_FINDER_ENDPOINT, localFinderParams(cell.profession.terms[0], p, zoomOf(run), run));
        if (d === undefined) return { dir: p.dir, lat: p.lat, lng: p.lng, survivors: null };
        return { dir: p.dir, lat: p.lat, lng: p.lng, survivors: overlapCount(centroid, lfTop3(d.items).map(b => b.cid)) };
      });
      const known = probes.filter(p => p.survivors !== null);
      proximity.push({ cell_id: cell.id, profession: cell.profession.slug, city: cell.city.slug, offset_km: run.pilot.proximity_probe_offset_km, probes, mean_survivors_of_3: known.length ? round4(known.reduce((n, p) => n + p.survivors, 0) / known.length) : null });
    }
  }
  const ordered = orderRows(rows, run);
  ordered.forEach((r, i) => { r.rank = i + 1; });
  const meanProx = proximity.filter(p => p.mean_survivors_of_3 !== null);
  return {
    rows: ordered,
    privateRows,
    organicRows,
    categoryDiagnostics,
    proximity: { cells: proximity, mean_survivors_of_3: meanProx.length ? round4(meanProx.reduce((n, p) => n + p.mean_survivors_of_3, 0) / meanProx.length) : null, rule: 'if < 2 of 3 on average, M4 big cities use a 3-point mean S3' },
    hostsNeeded: [...hostsNeeded].sort(),
    gate: gate.cells.map(c => ({ cell_id: c.cell.id, S3_step1: round4(c.S3_step1), survives: c.survives })),
  };
}
