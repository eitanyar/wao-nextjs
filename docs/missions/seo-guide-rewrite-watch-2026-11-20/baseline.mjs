// One-off, read-only GSC baseline for /seo/guide. Writes only into its own dir.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent, setGlobalDispatcher } from '/home/eitanya/wao/node_modules/undici/index.js';
setGlobalDispatcher(new Agent({ connect: { family: 4 } }));
const OUT = path.dirname(fileURLToPath(import.meta.url));
const env = {};
fs.readFileSync('/home/eitanya/wao/.env.local', 'utf-8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});
async function token() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.GSC_REFRESH_TOKEN, client_id: env.GOOGLE_ADS_CLIENT_ID, client_secret: env.GOOGLE_ADS_CLIENT_SECRET }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(d));
  return d.access_token;
}
const t = await token();
const H = { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
const sites = await (await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', { headers: H })).json();
fs.writeFileSync(path.join(OUT, 'sites.json'), JSON.stringify(sites, null, 2));
const list = (sites.siteEntry || []).map(s => s.siteUrl);
const SITE = list.find(s => s === 'sc-domain:wao.co.il') || list.find(s => s === 'https://www.wao.co.il/');
if (!SITE) throw new Error('No wao property: ' + JSON.stringify(list));
console.log('property', SITE, 'all:', list.filter(s => s.includes('wao')));
async function q(body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
  let rows = [], startRow = 0;
  for (;;) {
    const res = await fetch(url, { method: 'POST', headers: H, body: JSON.stringify({ type: 'web', dataState: 'final', rowLimit: 25000, startRow, ...body }) });
    const d = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(d));
    rows = rows.concat(d.rows || []);
    if (!d.rows || d.rows.length < 25000 || body.rowLimit) break;
    startRow += 25000;
  }
  return rows;
}
const PAGE = 'https://www.wao.co.il/seo/guide';
const pageF = { dimension: 'page', operator: 'equals', expression: PAGE };
const ctry = { dimension: 'country', operator: 'equals', expression: 'isr' };
const fg = (...f) => [{ groupType: 'and', filters: [pageF, ctry, ...f] }];
const ranges = { d28: ['2026-10-21', '2026-11-17'], d90: ['2026-08-20', '2026-11-17'] };
const queries = { head: 'מדריך לקידום אתרים', alt1: 'מדריך קידום אתרים', alt2: 'מדריך seo' };
const out = { property: SITE, page: PAGE, country: 'ISR', searchType: 'web', dataState: 'final', fetchedAt: new Date().toISOString(), ranges: {} };
for (const [rk, [startDate, endDate]] of Object.entries(ranges)) {
  const r = out.ranges[rk] = { startDate, endDate, queries: {} };
  for (const [k, expr] of Object.entries(queries)) {
    const f = { dimension: 'query', operator: 'equals', expression: expr };
    r.queries[k] = {
      query: expr,
      daily: await q({ startDate, endDate, dimensions: ['date'], dimensionFilterGroups: fg(f) }),
      dailyByDevice: await q({ startDate, endDate, dimensions: ['date', 'device'], dimensionFilterGroups: fg(f) }),
      totalByDevice: await q({ startDate, endDate, dimensions: ['device'], dimensionFilterGroups: fg(f) }),
      total: await q({ startDate, endDate, dimensionFilterGroups: fg(f) }),
    };
  }
  const fc = { dimension: 'query', operator: 'contains', expression: 'מדריך' };
  r.queries.containsMadrich = {
    query: 'contains: מדריך',
    daily: await q({ startDate, endDate, dimensions: ['date'], dimensionFilterGroups: fg(fc) }),
    dailyByDevice: await q({ startDate, endDate, dimensions: ['date', 'device'], dimensionFilterGroups: fg(fc) }),
    totalByDevice: await q({ startDate, endDate, dimensions: ['device'], dimensionFilterGroups: fg(fc) }),
    total: await q({ startDate, endDate, dimensionFilterGroups: fg(fc) }),
    queries: await q({ startDate, endDate, dimensions: ['query'], dimensionFilterGroups: fg(fc) }),
  };
  r.pageTotals = {
    total: await q({ startDate, endDate, dimensionFilterGroups: fg() }),
    daily: await q({ startDate, endDate, dimensions: ['date'], dimensionFilterGroups: fg() }),
    byDevice: await q({ startDate, endDate, dimensions: ['device'], dimensionFilterGroups: fg() }),
  };
  r.topQueries = await q({ startDate, endDate, dimensions: ['query'], dimensionFilterGroups: fg(), rowLimit: 100 });
}
fs.writeFileSync(path.join(OUT, 'baseline.json'), JSON.stringify(out, null, 2));
// summary
const head = out.ranges.d28.queries.head.daily;
const agg = rows => {
  const imp = rows.reduce((a, r) => a + r.impressions, 0), clk = rows.reduce((a, r) => a + r.clicks, 0);
  const pos = imp ? rows.reduce((a, r) => a + r.position * r.impressions, 0) / imp : null;
  return { days: rows.length, clicks: clk, impressions: imp, ctr: imp ? clk / imp : null, avgPosImpWeighted: pos, avgPosDaily: rows.length ? rows.reduce((a, r) => a + r.position, 0) / rows.length : null };
};
const last7 = head.filter(r => r.keys[0] >= '2026-11-11');
const s = { head28: agg(head), head7: agg(last7), head90: agg(out.ranges.d90.queries.head.daily),
  head28ByDevice: out.ranges.d28.queries.head.totalByDevice, page28: out.ranges.d28.pageTotals.total, page90: out.ranges.d90.pageTotals.total,
  alt1_28: out.ranges.d28.queries.alt1.total, alt2_28: out.ranges.d28.queries.alt2.total, contains28: out.ranges.d28.queries.containsMadrich.total };
fs.writeFileSync(path.join(OUT, 'summary-data.json'), JSON.stringify(s, null, 2));
console.log(JSON.stringify(s, null, 2));
