/**
 * Crawl-Check Bot — sitemap vs. GSC-visibility coverage detector (Next.js variant)
 *
 * DETECTION ONLY. No auto-fix, no writes to CMS/redirects/sitemap. Suggest-only
 * tier (confirmed scope, Lior mission-planner ruling, 2026-07-06).
 *
 * Pilot target: WAO's own site (wao.co.il) — this is NOT a client tool, it does
 * not read/write anything under data/clients/*. Half-day spike to prove the
 * mechanism, per Lior's framing.
 *
 * What it does:
 *   1. Fetches the site's OWN live sitemap.xml (served by src/app/sitemap.ts)
 *      and extracts every declared URL.
 *   2. Pulls GSC Search Analytics data (page dimension) over a trailing window,
 *      using the exact same OAuth/token/fetch pattern as gsc-pareto.mjs and
 *      anomaly-check.mjs (no new auth code, no new endpoint).
 *   3. Flags sitemap URLs with ZERO impressions in that window as
 *      "low/no visibility" candidates — NOT a confirmed "not indexed" verdict.
 *      Could also mean: too new, genuinely no search demand, or GSC lag.
 *   4. Optionally HEAD-checks a sample of sitemap URLs for 404s (throttled).
 *
 * GSC-data-source decision (documented per task spec):
 *   Chose the Search-Analytics-visibility-proxy over the URL Inspection API.
 *   Reasoning: URL Inspection API is a per-URL call (no bulk endpoint), has
 *   tighter quota (default ~2,000/day, ~600/min per project — fine here, but
 *   it's a NEW endpoint/auth surface never exercised in this codebase), and
 *   returns a stricter "indexed/not indexed" verdict that this half-day spike
 *   doesn't need. Search Analytics is already proven working (gsc-pareto.mjs,
 *   anomaly-check.mjs), gives a reasonable cheap proxy ("has this URL gotten
 *   any impressions"), and needs zero new code paths. Trade-off: it's a proxy,
 *   not a ground-truth index-coverage verdict — flagged explicitly in output.
 *
 * Placement decision (documented per task spec):
 *   No dashboard UI. This is WAO's own site health, not a client deliverable,
 *   and the client-facing /client/dashboard is explicitly for per-client bot
 *   output (per its existing conventions). No existing internal/ops view
 *   exists in the codebase to attach to. Script output (JSON + console
 *   summary) is suffient for this half-day spike — a dashboard surface can be
 *   added later if this tool graduates, per the same review-cycle gate every
 *   other bot here follows.
 *
 * Usage:
 *   node scripts/crawl-check.mjs
 *   node scripts/crawl-check.mjs --site=https://www.wao.co.il/ --sitemap=https://www.wao.co.il/sitemap.xml --days=90
 *   node scripts/crawl-check.mjs --check404=false   (skip HEAD requests)
 *   node scripts/crawl-check.mjs --sample404=40     (cap HEAD requests to N URLs)
 *
 * Requires in .env.local (same as gsc-pareto.mjs / anomaly-check.mjs):
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GSC_REFRESH_TOKEN
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent, setGlobalDispatcher } from 'undici';

// Force IPv4-only connections — same reason as the other GSC scripts (some
// sandboxed/dual-stack environments hang on default happy-eyeballs connect).
setGlobalDispatcher(new Agent({ connect: { family: 4 } }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = {};
fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});

const CLIENT_ID     = env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = env.GSC_REFRESH_TOKEN;

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.slice(2).split('='))
);

const SITE          = args.site    || 'https://www.wao.co.il/';
const SITEMAP_URL    = args.sitemap || 'https://www.wao.co.il/sitemap.xml';
const DAYS           = parseInt(args.days || '90', 10);
const GSC_LAG_DAYS   = parseInt(args.lag  || '3', 10);
const CHECK_404       = args.check404 !== 'false';
const SAMPLE_404_CAP  = parseInt(args.sample404 || '60', 10); // throttle HEAD volume
const HEAD_CONCURRENCY = 5;

const OUT_DIR  = path.resolve(__dirname, '../data/site');
const OUT_FILE = path.join(OUT_DIR, 'crawl-issues.json');

// ── Date range (offset back by GSC_LAG_DAYS, same reasoning as anomaly-check) ─
function dateRange(days, lagDays) {
  const end   = new Date(Date.now() - lagDays * 86_400_000);
  const start = new Date(end.getTime() - days * 86_400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate:   end.toISOString().slice(0, 10),
  };
}

// ── OAuth access token (identical pattern to gsc-pareto.mjs / anomaly-check.mjs) ─
async function getAccessToken() {
  if (!REFRESH_TOKEN) throw new Error('GSC_REFRESH_TOKEN not set in .env.local. Run: node scripts/gsc-get-token.mjs');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: REFRESH_TOKEN,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── Fetch + parse the live sitemap.xml ───────────────────────────────────────
async function fetchSitemapUrls(sitemapUrl) {
  const res = await fetch(sitemapUrl);
  if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status} ${sitemapUrl}`);
  const xml = await res.text();
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map(m => m[1].trim());
}

// ── GSC Search Analytics query — page dimension only (visibility proxy) ─────
async function fetchPageImpressions(accessToken, startDate, endDate) {
  const siteUrl = encodeURIComponent(SITE);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`;

  const byPage = new Map();
  let startRow = 0;
  const pageSize = 1000;

  while (true) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: pageSize,
        startRow,
        dataState: 'final',
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`GSC API error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    const rows = data.rows || [];
    for (const row of rows) {
      const page = row.keys?.[0] ?? '';
      if (!page) continue;
      byPage.set(page, {
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
      });
    }

    console.log(`  Fetched page rows ${startRow}-${startRow + rows.length} (total so far: ${byPage.size})`);

    if (rows.length < pageSize) break;
    startRow += pageSize;

    if (byPage.size >= 10_000) {
      console.log('  Reached 10K row cap — stopping pagination.');
      break;
    }
  }

  return byPage;
}

// ── Throttled HEAD check for 404s ────────────────────────────────────────────
async function checkStatus(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return res.status;
  } catch (err) {
    return `error: ${err.message}`;
  }
}

async function check404s(urls) {
  const sample = urls.length > SAMPLE_404_CAP
    ? urls.filter((_, i) => i % Math.ceil(urls.length / SAMPLE_404_CAP) === 0)
    : urls;

  console.log(`Checking ${sample.length} of ${urls.length} sitemap URLs for HTTP status (sampled, throttled)...`);

  const results = [];
  for (let i = 0; i < sample.length; i += HEAD_CONCURRENCY) {
    const batch = sample.slice(i, i + HEAD_CONCURRENCY);
    const batchResults = await Promise.all(batch.map(async url => ({ url, status: await checkStatus(url) })));
    results.push(...batchResults);
  }

  return {
    sampled: sample.length,
    totalUrls: urls.length,
    fullyChecked: sample.length === urls.length,
    notOk: results.filter(r => typeof r.status === 'number' ? r.status >= 400 : true),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== WAO Crawl-Check Bot (detection only, no fixes) ===`);
  console.log(`Site:    ${SITE}`);
  console.log(`Sitemap: ${SITEMAP_URL}`);
  console.log(`Window:  last ${DAYS} day(s), lagged ${GSC_LAG_DAYS} day(s)\n`);

  console.log('Fetching live sitemap...');
  const sitemapUrls = await fetchSitemapUrls(SITEMAP_URL);
  console.log(`Sitemap declares ${sitemapUrls.length} URLs.`);

  const { startDate, endDate } = dateRange(DAYS, GSC_LAG_DAYS);

  console.log('\nRefreshing GSC access token...');
  const token = await getAccessToken();

  console.log(`Fetching GSC page-level impressions (${startDate} -> ${endDate})...`);
  const pageImpressions = await fetchPageImpressions(token, startDate, endDate);
  console.log(`GSC has data for ${pageImpressions.size} distinct pages.`);

  const zeroVisibility = sitemapUrls
    .filter(url => !pageImpressions.has(url))
    .map(url => ({ url, impressions: 0, clicks: 0 }));

  let statusCheck = null;
  if (CHECK_404) {
    statusCheck = await check404s(sitemapUrls);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    site: SITE,
    sitemapUrl: SITEMAP_URL,
    dataSource: 'search-analytics-visibility-proxy', // see header comment for why, not URL Inspection API
    period: { startDate, endDate, days: DAYS },
    sitemapUrlCount: sitemapUrls.length,
    pagesWithGscData: pageImpressions.size,
    zeroVisibility: {
      count: zeroVisibility.length,
      note: 'Sitemap URLs with zero GSC impressions in this window. This is a PROXY, not a confirmed "not indexed" verdict — could mean too new, genuinely no search demand, or GSC reporting lag. Manual review recommended before acting.',
      urls: zeroVisibility,
    },
    statusCheck,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\nZero-visibility candidates: ${zeroVisibility.length} / ${sitemapUrls.length}`);
  if (statusCheck) {
    console.log(`Status-check: sampled ${statusCheck.sampled}/${statusCheck.totalUrls} URLs, ${statusCheck.notOk.length} flagged non-OK.`);
    statusCheck.notOk.forEach(r => console.log(`  [${r.status}] ${r.url}`));
  }
  console.log(`\n✅ Output saved to ${OUT_FILE}`);

  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('\n❌', err.message);
    process.exit(1);
  });
}
