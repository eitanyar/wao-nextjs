/**
 * Anomaly-Check Bot — GSC click/impression drop detector
 *
 * Reads GSC data (same auth/fetch pattern as gsc-pareto.mjs), appends a dated
 * snapshot to a running history file, then diffs the latest snapshot against
 * a trailing baseline (average of up to 7 prior snapshots) to flag meaningful
 * drops in clicks or impressions, per page and per query.
 *
 * Dashboard-only for now — no push/WhatsApp notification (confirmed scope,
 * see Lior mission-planner sign-off). That is explicit future scope.
 *
 * Usage:
 *   node scripts/anomaly-check.mjs --client=ajudaica
 *   node scripts/anomaly-check.mjs --site=https://www.ajudaica.com/ --client=ajudaica
 *
 * Requires in .env.local (same as gsc-pareto.mjs):
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GSC_REFRESH_TOKEN
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent, setGlobalDispatcher } from 'undici';

// Force IPv4-only connections. In some sandboxed/dual-stack environments,
// Node's default happy-eyeballs (dual-stack) connect hangs indefinitely on
// outbound HTTPS even though IPv4-only connections succeed instantly.
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

const CLIENT_ID_ARG = args.client || null;
if (!CLIENT_ID_ARG) {
  console.error('Usage: node scripts/anomaly-check.mjs --client=<clientId> [--site=<siteUrl>] [--days=1]');
  process.exit(1);
}

const CLIENT_DIR     = path.resolve(__dirname, `../data/clients/${CLIENT_ID_ARG}`);
const CLIENT_FILE    = path.join(CLIENT_DIR, 'client.json');
const HISTORY_FILE   = path.join(CLIENT_DIR, 'gsc-history.jsonl');
const ANOMALIES_FILE = path.join(CLIENT_DIR, 'anomalies.json');

function loadClientContext() {
  if (!fs.existsSync(CLIENT_FILE)) return null;
  return JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
}

const clientCtx = loadClientContext();
const SITE = args.site || clientCtx?.siteUrl;
if (!SITE) {
  console.error(`No siteUrl found for client "${CLIENT_ID_ARG}" — pass --site=... or add siteUrl to client.json`);
  process.exit(1);
}

// Snapshot window: DAYS days of GSC data, taken as a single-point-in-time
// aggregate (per run). Each run = one dated snapshot in the history file.
// GSC's own data typically has a 2–3 day reporting lag before it settles
// (dataState: 'final'), so the window is offset back by GSC_LAG_DAYS rather
// than ending "today" — otherwise a daily cron would mostly capture 0 rows.
const DAYS         = parseInt(args.days || '1', 10);
const GSC_LAG_DAYS = parseInt(args.lag  || '3', 10);

// ── Thresholds (named constants — tune here) ─────────────────────────────────
const MAX_BASELINE_SNAPSHOTS = 7;    // trailing average uses up to this many prior snapshots
const DROP_THRESHOLD_PCT     = 0.30; // flag if clicks or impressions drop by more than this fraction
const MIN_IMPRESSIONS_FLOOR  = 20;   // ignore rows whose baseline impressions are below this (noise on tiny numbers)

// ── Date range ────────────────────────────────────────────────────────────────
function dateRange(days, lagDays) {
  const end   = new Date(Date.now() - lagDays * 86_400_000);
  const start = new Date(end.getTime() - days * 86_400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate:   end.toISOString().slice(0, 10),
  };
}

// ── OAuth access token (same pattern as gsc-pareto.mjs) ──────────────────────
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

// ── GSC Search Analytics query — per page and per query, in one dimension set ─
async function fetchRows(accessToken, startDate, endDate) {
  const siteUrl = encodeURIComponent(SITE);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`;

  let allRows = [];
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
        dimensions: ['query', 'page'],
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
    allRows = allRows.concat(rows);

    console.log(`  Fetched rows ${startRow}–${startRow + rows.length} (total so far: ${allRows.length})`);

    if (rows.length < pageSize) break;
    startRow += pageSize;

    if (allRows.length >= 10_000) {
      console.log('  Reached 10K row cap — stopping pagination.');
      break;
    }
  }

  return allRows;
}

// ── Snapshot construction ─────────────────────────────────────────────────────
// A snapshot is a compact keyed map of {query|page → {clicks, impressions}}
// plus page-level and query-level rollups, so the diff step doesn't need to
// re-fetch raw rows.
function buildSnapshot(rows, startDate, endDate) {
  const byQuery = new Map();
  const byPage  = new Map();

  for (const row of rows) {
    const query = row.keys?.[0] ?? '';
    const page  = row.keys?.[1] ?? '';
    const clicks = row.clicks || 0;
    const impressions = row.impressions || 0;

    if (query) {
      const cur = byQuery.get(query) || { clicks: 0, impressions: 0 };
      cur.clicks += clicks;
      cur.impressions += impressions;
      byQuery.set(query, cur);
    }
    if (page) {
      const cur = byPage.get(page) || { clicks: 0, impressions: 0 };
      cur.clicks += clicks;
      cur.impressions += impressions;
      byPage.set(page, cur);
    }
  }

  return {
    date:      new Date().toISOString(),
    site:      SITE,
    period:    { startDate, endDate, days: DAYS },
    queries:   Object.fromEntries(byQuery),
    pages:     Object.fromEntries(byPage),
  };
}

// ── History I/O (JSON-lines: one snapshot object per line) ───────────────────
function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  return fs.readFileSync(HISTORY_FILE, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => JSON.parse(l));
}

function appendHistory(snapshot) {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(snapshot) + '\n', 'utf8');
}

// ── Diff logic: latest vs. trailing baseline (average of up to N priors) ────
// Exported as a pure function so it can be exercised with synthetic snapshots
// (e.g. in a throwaway test) without hitting the GSC API.
export function computeAnomalies(history, dimension) {
  // history = array of snapshot objects, oldest → newest, INCLUDING the latest.
  if (history.length < 2) return [];

  const latest  = history[history.length - 1];
  const priors  = history.slice(Math.max(0, history.length - 1 - MAX_BASELINE_SNAPSHOTS), history.length - 1);

  const latestMap = latest[dimension] || {};

  // Build baseline = average of priors, per key
  const baselineSums = new Map();
  for (const snap of priors) {
    const map = snap[dimension] || {};
    for (const [key, val] of Object.entries(map)) {
      const cur = baselineSums.get(key) || { clicks: 0, impressions: 0, n: 0 };
      cur.clicks += val.clicks;
      cur.impressions += val.impressions;
      cur.n += 1;
      baselineSums.set(key, cur);
    }
  }

  const anomalies = [];
  for (const [key, sums] of baselineSums) {
    const baselineClicks      = sums.clicks / sums.n;
    const baselineImpressions = sums.impressions / sums.n;
    if (baselineImpressions < MIN_IMPRESSIONS_FLOOR) continue;

    const current = latestMap[key];
    if (!current) continue; // key vanished entirely — could flag separately, out of scope for now

    const clicksChange      = baselineClicks      > 0 ? (current.clicks - baselineClicks) / baselineClicks : 0;
    const impressionsChange = baselineImpressions > 0 ? (current.impressions - baselineImpressions) / baselineImpressions : 0;

    const clicksDropped      = clicksChange      <= -DROP_THRESHOLD_PCT;
    const impressionsDropped = impressionsChange <= -DROP_THRESHOLD_PCT;

    if (clicksDropped || impressionsDropped) {
      anomalies.push({
        dimension,
        key,
        baselineClicks:      Math.round(baselineClicks * 10) / 10,
        currentClicks:       current.clicks,
        clicksChangePct:     Math.round(clicksChange * 1000) / 10,
        baselineImpressions: Math.round(baselineImpressions * 10) / 10,
        currentImpressions:  current.impressions,
        impressionsChangePct: Math.round(impressionsChange * 1000) / 10,
        direction: 'down',
        flaggedOn: (clicksDropped && impressionsDropped) ? 'both' : (clicksDropped ? 'clicks' : 'impressions'),
      });
    }
  }

  // Worst drops first
  anomalies.sort((a, b) => Math.min(a.clicksChangePct, a.impressionsChangePct) - Math.min(b.clicksChangePct, b.impressionsChangePct));
  return anomalies;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== WAO Anomaly-Check Bot ===`);
  console.log(`Client:  ${CLIENT_ID_ARG}`);
  console.log(`Site:    ${SITE}`);
  console.log(`Window:  last ${DAYS} day(s) per snapshot\n`);

  const { startDate, endDate } = dateRange(DAYS, GSC_LAG_DAYS);

  console.log('Refreshing access token...');
  const token = await getAccessToken();

  console.log(`Fetching GSC data (${startDate} → ${endDate})...`);
  const rows = await fetchRows(token, startDate, endDate);
  console.log(`Total rows fetched: ${rows.length}`);

  const snapshot = buildSnapshot(rows, startDate, endDate);
  appendHistory(snapshot);
  console.log(`\nSnapshot appended to ${HISTORY_FILE}`);

  const history = loadHistory();
  console.log(`Snapshots on file: ${history.length}`);

  fs.mkdirSync(CLIENT_DIR, { recursive: true });

  if (history.length < 2) {
    // Warm-up state — expected and must not error. First-ever run for a
    // fresh pilot client will always land here.
    const output = {
      status: 'warming_up',
      snapshotsCollected: history.length,
      snapshotsNeeded: 2,
      anomalies: [],
    };
    fs.writeFileSync(ANOMALIES_FILE, JSON.stringify(output, null, 2), 'utf8');
    console.log(`\n⏳ Warm-up state: ${history.length}/2 snapshots collected. No diff possible yet.`);
    console.log(`✅ Output saved to ${ANOMALIES_FILE}`);
    return output;
  }

  const pageAnomalies  = computeAnomalies(history, 'pages');
  const queryAnomalies = computeAnomalies(history, 'queries');
  const anomalies = [...pageAnomalies, ...queryAnomalies];

  const output = {
    status: 'ok',
    generatedAt: new Date().toISOString(),
    snapshotsCollected: history.length,
    baselineWindow: Math.min(MAX_BASELINE_SNAPSHOTS, history.length - 1),
    thresholds: {
      dropThresholdPct: DROP_THRESHOLD_PCT * 100,
      minImpressionsFloor: MIN_IMPRESSIONS_FLOOR,
    },
    anomalies,
  };

  fs.writeFileSync(ANOMALIES_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\nAnomalies flagged: ${anomalies.length}`);
  anomalies.forEach(a => {
    console.log(`  [${a.dimension}] ${a.key} — clicks ${a.baselineClicks}→${a.currentClicks} (${a.clicksChangePct}%), impressions ${a.baselineImpressions}→${a.currentImpressions} (${a.impressionsChangePct}%)`);
  });
  console.log(`\n✅ Output saved to ${ANOMALIES_FILE}`);

  return output;
}

// Only run main() when executed directly (not when imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('\n❌', err.message);
    process.exit(1);
  });
}
