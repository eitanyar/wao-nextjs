// Canned DataForSEO responses for the fixture config (ASCII only). Numbers are chosen so the
// expected values can be computed by hand (see market-scan.test.mjs).
//   c1 = (32.0, 34.8)  cell A alpha: strong Local Finder top 3 -> killed at step 1, Maps never bought
//   c3 = (31.0, 34.9)  cell B alpha: weak top 3 -> survives; cell C beta: urgency trade, lead-gen phones
const m = (a, b, c) => [{ year: 2026, month: 9, search_volume: a }, { year: 2026, month: 8, search_volume: b }, { year: 2026, month: 7, search_volume: c }];

export const VOLUME = {
  2376: [
    { keyword: 'alpha one', search_volume: 1000, cpc: 2.0, monthly_searches: m(1000, 1000, 1000) },
    { keyword: 'alpha two', search_volume: 1000, cpc: 4.0, monthly_searches: m(900, 1000, 1100) },
    { keyword: 'beta one', search_volume: 500, cpc: null, high_top_of_page_bid: 1.0, monthly_searches: m(500, 500, 500) },
    { keyword: 'beta two', search_volume: 500, cpc: 9.0, monthly_searches: m(500, 500, 500) }, // grouped with beta one
  ],
  101: [
    { keyword: 'alpha one', search_volume: 300, cpc: 2.0, monthly_searches: m(300, 300, 300) },
    { keyword: 'alpha two', search_volume: 100, cpc: 4.0, monthly_searches: m(100, 90, 110) },
    { keyword: 'beta one', search_volume: 40, cpc: 1.0, monthly_searches: m(40, 40, 40) },
    { keyword: 'beta two', search_volume: null, cpc: null, monthly_searches: null },
  ],
  103: [
    { keyword: 'alpha one', search_volume: 50, cpc: 2.0, monthly_searches: m(50, 50, 50) },
    { keyword: 'alpha two', search_volume: 50, cpc: 2.0, monthly_searches: m(50, 50, 50) }, // grouped (50 >= dedupe floor 50)
    { keyword: 'beta one', search_volume: null, cpc: null, monthly_searches: null },
    { keyword: 'beta two', search_volume: null, cpc: null, monthly_searches: null },
  ],
};

// Organic items the way the live provider returns them on Israeli SERPs: every link is a Google
// redirect (domain "google.com"); the real host only survives in `breadcrumb`.
let gotoN = 0;
const redirect = (rank, breadcrumb, title) => ({
  type: 'organic', rank_group: rank, rank_absolute: rank + 3, domain: 'google.com', url: `https://google.com/goto?url=TOKEN${gotoN += 1}`,
  title, ...(breadcrumb ? { breadcrumb, website_name: 'Site' } : {}), description: 'snippet text that must not be cached',
});
const pack = (rank, cid) => ({ type: 'local_pack', rank_group: rank, rank_absolute: rank, title: `Biz ${cid}`, cid: String(cid), domain: 'google.com', url: 'https://google.com/goto?url=PACK' });

// local pack present for: alpha at R1 anchor (32.0) and beta at R2 anchor (31.0) - drives Stage-1 M.
function organic(keyword, coord) {
  const lat = Number(coord.split(',')[0]);
  if (keyword === 'alpha one' && lat === 32) {
    const items = [pack(1, 1), pack(2, 2), pack(3, 3), redirect(1, 'https://www.alpha1.example › services', 'Alpha one'), { type: 'organic', rank_group: 2, rank_absolute: 5, domain: 'www.real-link.example', url: 'https://www.real-link.example/x', title: 'Direct link' }];
    return [{ item_types: [...new Set(items.map(i => i.type))], items }];
  }
  if (keyword === 'alpha one' && lat === 31) {
    const items = [
      { type: 'ai_overview', rank_group: 1, rank_absolute: 1 },
      redirect(1, 'https://www.dir.example › city', 'Directory page'),
      redirect(2, 'https://www.facebook.com › page', 'Social page'),
      redirect(3, 'https://www.b7.example ›', 'Seven Co site'),
      redirect(4, 'https://unknown.example › a › b', 'Some local site'),
      redirect(5, null, 'No breadcrumb'),
      redirect(6, 'news.example › article', 'News article'),
    ];
    return [{ item_types: [...new Set(items.map(i => i.type))], items }];
  }
  if (keyword === 'beta one' && lat === 31) {
    const items = [pack(1, 33), pack(2, 34), redirect(1, 'https://portal.example › beta', 'Portal'), redirect(2, 'https://beta-local.example', 'Beta local')];
    return [{ item_types: [...new Set(items.map(i => i.type))], items }];
  }
  const items = [redirect(1, 'https://example.org › x', 'Generic')];
  return [{ item_types: ['organic'], items }];
}

const biz = (cid, rank, extra = {}) => ({
  type: 'maps_search', rank_group: rank, rank_absolute: rank, cid: String(cid), title: `Biz ${cid}`, phone: `+972-3-000${cid}`,
  category: 'Alpha Contractor', latitude: 31.0, longitude: 34.9, is_claimed: true, total_photos: 3,
  rating: { value: 4.0, votes_count: 3 }, additional_categories: null, work_hours: null, address_info: { city: 'City Three' }, ...extra,
});

function maps(keyword, coord) {
  const lat = Number(coord.split(',')[0]);
  if (lat === 32) {
    // Only reachable if the step-1 rule-out failed: the test asserts this is never requested.
    return [{ items_count: 1, items: [biz(1, 1, { latitude: 32.0, longitude: 34.8 })] }];
  }
  if (keyword.startsWith('alpha')) {
    const t1 = keyword === 'alpha one';
    return [{ items_count: 13, items: [
      biz(7, 1, { title: 'Seven Co', domain: 'www.b7.example', total_photos: 40, rating: { value: 4.6, votes_count: 20 }, additional_categories: ['x'] }),
      biz(8, t1 ? 2 : 3, { title: 'Eight', domain: 'b8.example', total_photos: 5, rating: { value: 4.2, votes_count: 9 } }),
      biz(16, t1 ? 3 : 2, { title: 'Sixteen' }), // best raw rank 2 -> ranks well -> not a prospect
      biz(10, 4, { title: 'Ten', domain: null }), // no site -> w 1.25
      biz(11, 5, { title: 'Eleven', category: 'Roof alpha store' }), // contains stem + exclude stem -> not relevant
      biz(12, 6, { title: 'alpha one Works', category: 'Contractor', domain: 'site12.example' }), // generic + title -> relevant, OK site -> 1.00
      biz(13, 7, { title: 'the alf builders', category: 'General Builder', domain: 'site13.example' }), // conditional + title_terms_extra -> weak site 1.10
      biz(14, 8, { title: 'Zeta', category: 'Mystery Category' }), // unmatched -> diagnostics
      biz(15, 9, { title: 'Fifteen', is_directory_item: true }),
      biz(17, 10, { title: 'Seventeen', phone: null }),
      biz(18, 11, { title: 'Eighteen', domain: 'robots.example' }), // robots.txt disallows / -> unchecked 1.00
      biz(19, 12, { title: 'Nineteen', latitude: 33.0, longitude: 35.5, address_info: { city: 'Far' } }),
      biz(20, 13, { title: 'Twenty', rating: null, is_claimed: false }),
    ] }];
  }
  // beta: 30 and 31 share one phone (lead-gen broker) -> never prospects; 32 is a real prospect
  return [{ items_count: 5, items: [
    biz(33, 1, { category: 'Beta Service', title: 'Thirty-three' }),
    biz(34, 2, { category: 'Beta Service', title: 'Thirty-four' }),
    biz(30, 4, { category: 'Beta Service', title: 'Thirty', phone: '+972-3-5550000' }),
    biz(31, 5, { category: 'Beta Service', title: 'Thirty-one', phone: '+972 3 555 0000' }),
    biz(32, 6, { category: 'Beta Service', title: 'Thirty-two', domain: null }),
  ] }];
}

const lfItem = (cid, rank, votes, rating, title, withSite = true) => ({
  type: 'local_pack', rank_group: rank, rank_absolute: rank, cid: String(cid), title,
  ...(withSite ? { domain: 'google.com', url: `https://google.com/goto?url=LF${cid}` } : {}),
  rating: votes ? { rating_type: 'Max5', value: rating, votes_count: votes, rating_max: 5 } : null, phone: `+972-3-000${cid}`, is_paid: false,
});

function localFinder(keyword, coord) {
  const lat = Number(coord.split(',')[0]);
  const strong = cid => lfItem(cid, 0, 500, 4.9, `alpha one Pro ${cid}`);
  let items;
  if (keyword === 'alpha one' && lat === 32) items = [strong(1), strong(2), strong(3)];
  else if (keyword === 'alpha one' && lat > 32) items = [strong(3), strong(1), strong(2)]; // north probe: all 3 survive
  else if (keyword === 'alpha one' && lat < 32 && lat > 31.5) items = [strong(1), strong(40), strong(41)]; // south probe: 1 survives
  else if (keyword === 'alpha one') items = [lfItem(7, 0, 20, 4.6, 'Seven Co'), lfItem(8, 0, 9, 4.2, 'Eight'), lfItem(99, 0, 2, 5.0, 'alpha one Ninety')];
  else items = [lfItem(33, 0, 2, 5.0, 'Thirty-three', false), lfItem(34, 0, 1, 5.0, 'Thirty-four', false)];
  items.forEach((it, i) => { it.rank_group = i + 1; it.rank_absolute = i + 1; });
  return [{ items_count: items.length, items }];
}

export function createFakeFetch({ costs = {}, onCall = () => {} } = {}) {
  let n = 0;
  const fake = async (url, init) => {
    const [task] = JSON.parse(init.body);
    const endpoint = url.replace(/^https:\/\/api\.dataforseo\.com\/v3/, '');
    onCall(endpoint, task);
    n += 1;
    let result;
    if (endpoint.includes('search_volume')) result = VOLUME[task.location_code];
    else if (endpoint.includes('organic')) result = organic(task.keyword, task.location_coordinate);
    else if (endpoint.includes('maps')) result = maps(task.keyword, task.location_coordinate);
    else result = localFinder(task.keyword, task.location_coordinate);
    const cost = costs[endpoint] ?? (endpoint.includes('search_volume') ? 0.09 : 0.002);
    return { ok: true, status: 200, json: async () => ({ tasks: [{ id: `fake-${n}`, status_code: 20000, status_message: 'Ok.', cost, result }] }) };
  };
  return fake;
}

export function networkForbidden() {
  return async () => { throw new Error('network call attempted during a cached run'); };
}

// ---- fake open web for the R8 homepage check ---------------------------------------------------
const html = ({ title, h1, viewport = true, links = [], generator, pad = 3000 }) => `<!doctype html><html><head><title>${title}</title>${viewport ? '<meta name="viewport" content="width=device-width, initial-scale=1">' : ''}${generator ? `<meta name="generator" content="${generator}">` : ''}</head><body><h1>${h1}</h1>${links.map(l => `<a href="${l}">x</a>`).join('')}<p>${'x'.repeat(pad)}</p><script>secretInlineScript()</script></body></html>`;

export const SITES = {
  'https://site12.example/robots.txt': { status: 404, body: 'not found', type: 'text/html' },
  'https://site12.example/': { status: 200, type: 'text/html; charset=utf-8', body: html({ title: 'alpha one in City Three', h1: 'Welcome', links: ['/a', '/b/', '/c', '#top', 'tel:+972', '/?q=1', 'https://wa.me/972', 'https://other.example/x'], generator: 'WordPress 6.6' }) },
  'https://site13.example/robots.txt': { throws: 'CERT_HAS_EXPIRED' },
  'https://site13.example/': { throws: 'CERT_HAS_EXPIRED' },
  'http://site13.example/robots.txt': { status: 200, type: 'text/plain', body: 'User-agent: *\nDisallow: /private' },
  'http://site13.example/': { status: 200, type: 'text/html', body: html({ title: 'Home', h1: 'Hello', viewport: false, links: ['/only'] }) },
  'https://robots.example/robots.txt': { status: 200, type: 'text/plain', body: 'User-agent: *\nDisallow: /' },
  'https://robots.example/': { status: 200, type: 'text/html', body: html({ title: 'never fetched', h1: 'x' }) },
  'https://b7.example/robots.txt': { status: 404, body: '', type: 'text/plain' },
  'https://b7.example/': { status: 301, location: 'https://www.b7.example/' },
  'https://www.b7.example/': { status: 200, type: 'text/html', body: html({ title: 'Seven Co | alpha one', h1: 'City Three', links: ['/1', '/2', '/3', '/4'], pad: 10 }).replace('<head>', '<head><link href="https://static.wixstatic.com/a.css">') },
  'https://b8.example/robots.txt': { status: 404, body: '', type: 'text/plain' },
  'https://b8.example/': { status: 500, type: 'text/html', body: '<html>error</html>' },
};

// Site entries: { status, type, body, location, headers } | { throws: code } | { throws: 'timeout' } |
// { sequence: [entry, entry, ...] } (one entry per request, last one repeats) - for retry rules.
export function createFakeWeb({ onCall = () => {}, sites = SITES } = {}) {
  const hits = new Map();
  return async (url, init = {}) => {
    onCall(url, init);
    let site = sites[url];
    if (site?.sequence) {
      const n = hits.get(url) ?? 0;
      hits.set(url, n + 1);
      site = site.sequence[Math.min(n, site.sequence.length - 1)];
    }
    if (!site) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    if (site.throws === 'timeout') throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError', code: 23 });
    if (site.throws) throw Object.assign(new TypeError('fetch failed'), { cause: { code: site.throws } });
    const headers = new Map(Object.entries({ 'content-type': site.type ?? 'text/html', ...(site.location ? { location: site.location } : {}), ...(site.headers ?? {}) }));
    return { status: site.status, headers: { get: k => headers.get(k.toLowerCase()) ?? null }, text: async () => site.body ?? '' };
  };
}
