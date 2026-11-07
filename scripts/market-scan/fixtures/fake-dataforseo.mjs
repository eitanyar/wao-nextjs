// Canned DataForSEO responses for the fixture config (ASCII only). Numbers are chosen so the
// expected Stage-1 values can be computed by hand (see market-scan.test.mjs).
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
    { keyword: 'alpha two', search_volume: 50, cpc: 2.0, monthly_searches: m(50, 50, 50) }, // grouped
    { keyword: 'beta one', search_volume: null, cpc: null, monthly_searches: null },
    { keyword: 'beta two', search_volume: null, cpc: null, monthly_searches: null },
  ],
};

// local pack present for: alpha at R1 anchor (32.0) and beta at R2 anchor (31.0)
function organic(keyword, coord) {
  const lat = Number(coord.split(',')[0]);
  const pack = (keyword === 'alpha one' && lat === 32) || (keyword === 'beta one' && lat === 31);
  const items = [{ type: 'organic', rank_group: 1, rank_absolute: 1, domain: 'example.org' }];
  if (pack) items.unshift({ type: 'local_pack', rank_group: 1, rank_absolute: 1, title: 'Pack Biz', cid: '900', domain: 'packbiz.example' });
  return [{ item_types: items.map(i => i.type), items }];
}

const biz = (cid, rank, extra = {}) => ({
  type: 'maps_search', rank_group: rank, rank_absolute: rank, cid: String(cid), title: `Biz ${cid}`, phone: `+972-3-000${cid}`,
  category_ids: ['alpha_contractor'], latitude: 32.0, longitude: 34.8, is_claimed: true, total_photos: 3,
  rating: { value: 4.0, votes_count: 3 }, additional_categories: null, work_hours: null, address_info: { city: 'City One' }, ...extra,
});

function maps(keyword, coord) {
  const lat = Number(coord.split(',')[0]);
  if (lat === 32) {
    return [{ items_count: 5, items: [
      biz(1, 1, { title: 'alpha one Pro', domain: 'www.alpha1.example', rating: { value: 5.0, votes_count: 150 }, total_photos: 50, additional_categories: ['x'], work_hours: { timetable: { monday: [{}] } } }),
      biz(2, 2, { domain: 'facebook.com', rating: { value: 4.25, votes_count: 9 }, total_photos: 25 }),
      biz(3, 3, { category_ids: ['unrelated'] }),
      biz(4, keyword === 'alpha one' ? 4 : 1, { is_directory_item: true }),
      biz(5, 5, { phone: null }),
    ] }];
  }
  return [{ items_count: 2, items: [
    biz(7, 1, { latitude: 31.0, longitude: 34.9, address_info: { city: 'City Three' } }),
    biz(8, 2, { latitude: 31.0, longitude: 34.9, address_info: { city: 'City Three' }, domain: 'b8.example' }),
  ] }];
}

function localFinder(keyword, coord) {
  const lat = Number(coord.split(',')[0]);
  return [{ items_count: 2, items: lat === 32
    ? [{ type: 'local_pack', rank_group: 1, cid: '1', title: 'Biz 1' }, { type: 'local_pack', rank_group: 2, cid: '2', title: 'Biz 2' }]
    : [{ type: 'local_pack', rank_group: 1, cid: '7', title: 'Biz 7' }] }];
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
