// R7 organic directory share: classify the organic top 10 for the head term and derive the gentle
// multiplier O = base + slope * L_share. Requires organic cache schema >= 2 (real domains).
export const normalizeDomain = domain => String(domain ?? '').toLowerCase().replace(/^www\./, '');
export const domainIn = (d, list) => (list ?? []).some(x => d === x || d.endsWith(`.${x}`));

export function organicItems(data, depth = 10) {
  return [...(data?.items ?? [])]
    .filter(i => i.type === 'organic')
    .sort((a, b) => (a.rank_group ?? 0) - (b.rank_group ?? 0))
    .slice(0, depth);
}

export const hasAiOverview = data => (data?.item_types ?? []).includes('ai_overview') || (data?.items ?? []).some(i => i.type === 'ai_overview');

// Domains in the organic top 10 of the same profession in >= minRegions regions (R7 rule 5).
// `serps` = [{ profession, region, data }].
export function nationalBrandDomains(serps, minRegions, depth = 10) {
  const seen = new Map(); // profession -> domain -> Set(region)
  for (const s of serps) {
    if (!s.data) continue;
    const byDomain = seen.get(s.profession) ?? new Map();
    seen.set(s.profession, byDomain);
    for (const item of organicItems(s.data, depth)) {
      const d = normalizeDomain(item.domain);
      if (!d) continue;
      byDomain.set(d, (byDomain.get(d) ?? new Set()).add(s.region));
    }
  }
  const out = new Map();
  for (const [profession, byDomain] of seen) out.set(profession, new Set([...byDomain].filter(([, r]) => r.size >= minRegions).map(([d]) => d)));
  return out;
}

// First match wins: directory, social, media_info, local_site (domain of a business in this cell's
// Maps pool), national_brand (chain-flagged or multi-region), local_site (default).
export function classifyOrganic(data, { poolDomains = new Set(), chainDomains = new Set(), nationalDomains = new Set(), run }) {
  const s = run.stage2;
  const rows = [];
  let unresolved = 0;
  for (const item of organicItems(data, s.organic_depth_cell ?? 10)) {
    const d = normalizeDomain(item.domain);
    if (!d) { unresolved += 1; rows.push({ rank: item.rank_group, domain: null, class: 'unresolved' }); continue; }
    let cls;
    if (domainIn(d, s.organic_directories)) cls = 'directory';
    else if (domainIn(d, s.organic_social)) cls = 'social';
    else if (domainIn(d, s.organic_media)) cls = 'media_info';
    else if (poolDomains.has(d)) cls = 'local_site_pool';
    else if (chainDomains.has(d) || nationalDomains.has(d)) cls = 'national_brand';
    else cls = 'local_site';
    rows.push({ rank: item.rank_group, domain: d, class: cls });
  }
  const counted = rows.length - unresolved;
  const local = rows.filter(r => r.class === 'local_site' || r.class === 'local_site_pool').length;
  const dirs = rows.filter(r => r.class === 'directory').length;
  const L_share = counted ? local / counted : null;
  const D_share = counted ? dirs / counted : null;
  const f = s.organic_factor ?? { base: 0.8, slope: 0.4 };
  // No resolvable organic result -> neutral 1.0 (never a silent penalty or bonus).
  const O = L_share === null ? 1 : f.base + f.slope * L_share;
  return { rows, counted, unresolved, L_share, D_share, O, local_pool: rows.filter(r => r.class === 'local_site_pool').length };
}
