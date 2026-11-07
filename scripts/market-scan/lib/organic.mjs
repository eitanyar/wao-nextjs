// R7 organic directory share, as revised by spec 2.2-2.4: classify the organic top 10 for the
// head term and derive the gentle multiplier O = base + slope * L_share. Requires organic cache
// schema >= 2 (real domains).
export const normalizeDomain = domain => String(domain ?? '').toLowerCase().replace(/^www\./, '');
// 2.2.1 list matching by host suffix: host == d or host ends with "." + d.
export const domainIn = (d, list) => (list ?? []).some(x => d === x || d.endsWith(`.${x}`));

export function organicItems(data, depth = 10) {
  return [...(data?.items ?? [])]
    .filter(i => i.type === 'organic')
    .sort((a, b) => (a.rank_group ?? 0) - (b.rank_group ?? 0))
    .slice(0, depth);
}

export const hasAiOverview = data => (data?.item_types ?? []).includes('ai_overview') || (data?.items ?? []).some(i => i.type === 'ai_overview');

// 2.3 national brand: hosts in the organic top 10 of the same profession in >= minRegions distinct
// regions. `serps` = [{ profession, region, data }] - the Stage-1 re-buy (one SERP per
// profession x region) united with every cell SERP of the profession. Returns
// Map profession -> Map host -> Set(region); the per-cell rule (host not in the cell's Maps pool)
// is applied in classifyOrganic, because a pool match always wins (R7 rule 4 before rule 5).
export function organicHostRegions(serps, depth = 10) {
  const seen = new Map();
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
  return seen;
}

export function nationalBrandDomains(serps, minRegions, depth = 10) {
  const out = new Map();
  for (const [profession, byDomain] of organicHostRegions(serps, depth)) out.set(profession, new Set([...byDomain].filter(([, r]) => r.size >= minRegions).map(([d]) => d)));
  return out;
}

const listOf = (s, key) => [...new Set([...(s[key] ?? [])])];

// First match wins (R7 order + 2.2.2): directory, social, media_info, chain_retail,
// local_site_pool (host of a business in this cell's Maps pool), national_brand (chain-flagged
// domain or national per 2.3), local_default (anything else - probably a business, not proven local).
// L_share = (local_pool + w_default * local_default) / counted  (2.2.3; w_default = 0.5)
export function classifyOrganic(data, { poolDomains = new Set(), chainDomains = new Set(), nationalDomains = new Set(), run }) {
  const s = run.stage2;
  const rows = [];
  let unresolved = 0;
  const lists = {
    directory: listOf(s, 'organic_directories'),
    social: listOf(s, 'organic_social'),
    media_info: listOf(s, 'organic_media'),
    chain_retail: listOf(s, 'organic_chain_retail'),
  };
  for (const item of organicItems(data, s.organic_depth_cell ?? 10)) {
    const d = normalizeDomain(item.domain);
    if (!d) { unresolved += 1; rows.push({ rank: item.rank_group, domain: null, class: 'unresolved' }); continue; }
    let cls;
    if (domainIn(d, lists.directory)) cls = 'directory';
    else if (domainIn(d, lists.social)) cls = 'social';
    else if (domainIn(d, lists.media_info)) cls = 'media_info';
    else if (domainIn(d, lists.chain_retail)) cls = 'chain_retail';
    else if (poolDomains.has(d)) cls = 'local_site_pool';
    else if (chainDomains.has(d) || nationalDomains.has(d)) cls = 'national_brand';
    else cls = 'local_default';
    rows.push({ rank: item.rank_group, domain: d, class: cls });
  }
  const counted = rows.length - unresolved;
  const count = cls => rows.filter(r => r.class === cls).length;
  const localPool = count('local_site_pool');
  const localDefault = count('local_default');
  const wDefault = s.organic_local_default_weight ?? 1;
  const L_share = counted ? (localPool + wDefault * localDefault) / counted : null;
  const D_share = counted ? count('directory') / counted : null;
  const f = s.organic_factor ?? { base: 0.8, slope: 0.4 };
  // No resolvable organic result -> neutral 1.0 (never a silent penalty or bonus).
  const O = L_share === null ? 1 : f.base + f.slope * L_share;
  return { rows, counted, unresolved, L_share, D_share, O, local_pool: localPool, local_default: localDefault };
}
