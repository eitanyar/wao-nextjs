/**
 * GSC Pareto Analysis — GEO/AIO Opportunity Engine
 *
 * Fetches top keywords from Google Search Console, scores them for
 * AI Overview opportunity, and outputs the top actions for the monthly report.
 *
 * Usage:
 *   node scripts/gsc-pareto.mjs --site=https://www.retter.co.il/ --days=90
 *   node scripts/gsc-pareto.mjs --site=sc-domain:retter.co.il --days=90 --out=data/clients/retter/pareto.json
 *
 * Requires in .env.local:
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GSC_REFRESH_TOKEN
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent, setGlobalDispatcher } from 'undici';

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

const SITE       = args.site    || 'https://www.retter.co.il/';
const DAYS       = parseInt(args.days || '90', 10);
const TOP_N      = parseInt(args.top  || '20', 10);
const OUT_FILE   = args.out     || null;
const CLIENT_ID_ARG = args.client || null;

// Exclusions loaded from client Turn-6 data (optional file)
const EXCLUSIONS_FILE = args.exclusions || null;

// Intent filter: classify this many candidates (must be > TOP_N to allow filtering)
const INTENT_CANDIDATES = TOP_N * 3;

// ── Position window for AIO adjacency ────────────────────────────────────────
// Positions 4–25: below top-3 (already owned by rich results/ads),
// not so far down they're unreachable. AIO typically cites pages ranking here.
const MIN_POS = 4;
const MAX_POS = 25;
const MIN_IMPRESSIONS = 10; // filter noise

// ── Date range ────────────────────────────────────────────────────────────────
function dateRange(days) {
  const end   = new Date();
  const start = new Date(Date.now() - days * 86_400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate:   end.toISOString().slice(0, 10),
  };
}

// ── OAuth access token ────────────────────────────────────────────────────────
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

// ── GSC Search Analytics query ────────────────────────────────────────────────
async function fetchKeywords(accessToken, startDate, endDate) {
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

    if (rows.length < pageSize) break; // last page
    startRow += pageSize;

    if (allRows.length >= 10_000) {
      console.log('  Reached 10K row cap — stopping pagination.');
      break;
    }
  }

  return allRows;
}

// ── Pareto scoring ────────────────────────────────────────────────────────────
// Score = impressions × (MAX_POS - position + 1)
// High impressions + close to position 4 = highest score = biggest AIO opportunity
function scoreRow(row) {
  const position    = row.keys ? row.position : row.position;
  const impressions = row.impressions;
  if (position < MIN_POS || position > MAX_POS) return 0;
  if (impressions < MIN_IMPRESSIONS) return 0;
  return Math.round(impressions * (MAX_POS - position + 1));
}

function opportunityLabel(position, impressions) {
  if (position <= 6 && impressions >= 100) return 'HIGH';
  if (position <= 10 && impressions >= 50)  return 'MEDIUM';
  return 'LOW';
}

// ── Load exclusions (from Turn-6 data if available) ──────────────────────────
function loadExclusions() {
  if (!EXCLUSIONS_FILE || !fs.existsSync(EXCLUSIONS_FILE)) return [];
  const raw = JSON.parse(fs.readFileSync(EXCLUSIONS_FILE, 'utf8'));
  return (raw.exclusions || '').toLowerCase().split(/[,،\n]/).map(s => s.trim()).filter(Boolean);
}

function isExcluded(query, exclusions) {
  const q = query.toLowerCase();
  return exclusions.some(ex => q.includes(ex));
}

// ── Load client context ───────────────────────────────────────────────────────
function loadClientContext() {
  if (!CLIENT_ID_ARG) return null;
  const file = path.resolve(__dirname, `../data/clients/${CLIENT_ID_ARG}/client.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ── LLM intent classifier ─────────────────────────────────────────────────────
// Scores each query 1–5 for intent match with the client's business.
// 1 = clearly wrong (entertainment/navigational/unrelated brand)
// 3 = ambiguous / mixed intent → flag for WAO review
// 5 = clearly matches business intent
async function classifyIntentBatch(queries, businessNiche) {
  const apiKey    = env.AZURE_OPENAI_KEY;
  const endpoint  = env.AZURE_OPENAI_ENDPOINT;
  const model     = env.AZURE_OPENAI_DEPLOYMENT_FAST; // fast model — scoring only, no depth needed
  const url       = `${endpoint}/chat/completions?api-version=2024-05-01-preview`;

  const queryList = queries.map((q, i) => `${i + 1}. "${q}"`).join('\n');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a search-intent classifier for an Israeli SEO agency.
Given a business description and a list of Hebrew (or Latin-script) search queries,
rate each query 1–5 for whether it matches the business's target audience.

1 = Wrong intent: entertainment, cartoon, app, song, unrelated brand, celebrity gossip
2 = Probably wrong: mostly different context, business would get irrelevant traffic
3 = Mixed: ambiguous term used in multiple contexts — flag for human review
4 = Mostly right: query is relevant to the business's field
5 = Clearly right: exact match to business's services or target audience

Return ONLY a JSON array: [{"query":"...","score":1-5,"reason":"one sentence in English"}]
No extra text, no markdown.`,
        },
        {
          role: 'user',
          content: `Business: ${businessNiche}\n\nQueries to classify:\n${queryList}`,
        },
      ],
      max_completion_tokens: 800,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Intent API error ${res.status}: ${JSON.stringify(data?.error)}`);

  const raw = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  // Model may return {results:[]} or just []
  const arr = Array.isArray(parsed) ? parsed : (parsed.results ?? parsed.classifications ?? []);
  return arr;
}

async function runIntentFilter(candidates, businessNiche) {
  const BATCH = 10;
  const results = new Map(); // query → {score, reason}

  console.log(`\nIntent filter: classifying ${candidates.length} candidates in batches of ${BATCH}...`);

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch   = candidates.slice(i, i + BATCH);
    const queries = batch.map(c => c.query);

    try {
      const classified = await classifyIntentBatch(queries, businessNiche);
      for (const item of classified) {
        results.set(item.query, { score: item.score, reason: item.reason ?? '' });
      }
      process.stdout.write(`  batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(candidates.length / BATCH)} done\n`);
    } catch (err) {
      console.warn(`  batch failed: ${err.message} — skipping intent filter for this batch`);
      // On failure: default all to score 3 (keep, flag for review)
      for (const q of queries) results.set(q, { score: 3, reason: 'classification failed' });
    }
  }

  return candidates.map(c => ({
    ...c,
    intentScore:  results.get(c.query)?.score  ?? 3,
    intentReason: results.get(c.query)?.reason ?? '',
  }));
}

// ── Cannibalization detection ─────────────────────────────────────────────────
// Uses the already-fetched (query, page) rows — no extra API calls.
// Flags two independent signals; either alone is worth review:
//   MULTI_URL              → ≥2 pages on the same domain split impressions for this query
//   HEAD_TERM_ON_LOCATION  → generic 1-2 token query landing on a branch/city page

function buildQueryPagesMap(rows) {
  const map = new Map();
  for (const row of rows) {
    const query = row.keys?.[0] ?? '';
    const page  = row.keys?.[1] ?? '';
    if (!query || !page) continue;
    if (!map.has(query)) map.set(query, []);
    map.get(query).push({ page, impressions: row.impressions, position: row.position });
  }
  return map;
}

function isHeadTerm(query) {
  const tokens = query.trim().split(/\s+/);
  if (tokens.length === 1) return true;
  if (tokens.length === 2) {
    const q = query.toLowerCase();
    // Geo or brand qualifiers make it a modified term — not a head term
    if (/פתח תקווה|תל אביב|ירושלים|חיפה|באר שבע|ראשון לציון|במרכז|בצפון|בדרום/.test(q)) return false;
    if (/קורס|הכשרה|לימוד/.test(q)) return false;
    return true;
  }
  return false;
}

const LOCATION_URL_PATTERNS = [
  /\/(branch|סניף|petah-tikva|tel-aviv|jerusalem|haifa|beer-sheva|rishon|netanya|herzliya|modiin|rehovot|kfar-saba|raanana|ashdod|ashkelon|eilat|holon|bat-yam|givatayim|ramat-gan)\b/i,
];

function isLocationPage(url) {
  return LOCATION_URL_PATTERNS.some(p => p.test(url));
}

function checkCannibalization(query, rankingUrl, queryPagesMap) {
  const allPages = queryPagesMap.get(query) || [];

  // Competing pages = same domain, different URL, impressions ≥ 5% of leader or ≥ 10 raw
  const topImp = Math.max(...allPages.map(p => p.impressions), 0);
  const competing = allPages
    .filter(p => p.page !== rankingUrl && p.impressions >= Math.max(10, topImp * 0.05))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 3);

  const reasons = [];
  if (competing.length >= 1)                    reasons.push('MULTI_URL');
  if (isHeadTerm(query) && isLocationPage(rankingUrl)) reasons.push('HEAD_TERM_ON_LOCATION');

  if (!reasons.length) return null;

  return {
    cannibalFlag:    'REVIEW',
    cannibalReasons: reasons,
    cannibalUrls:    competing.map(p => ({
      url:         p.page,
      impressions: p.impressions,
      position:    Math.round(p.position * 10) / 10,
    })),
  };
}

// ── Implementation mode: enhance existing page vs. create new one ─────────────
// "enhance" = a real content page already ranks → add FAQ block / definition / schema to it
// "create"  = homepage or category/archive ranks → no dedicated content exists, safe to create
function inferImplementationMode(rankingUrl, siteBase) {
  try {
    const url  = new URL(rankingUrl);
    const path = url.pathname;

    // Homepage
    if (path === '/' || path === '') return 'create';

    // Category, tag, archive, search, pagination patterns (WP conventions + Hebrew slugs)
    if (/\/(category|tag|archive|author|search|\?s=|page\/\d)/i.test(path)) return 'create';

    // WP feed or sitemap
    if (/\/(feed|sitemap)/i.test(path)) return 'create';

    // Everything else = real content page exists → enhance it
    return 'enhance';
  } catch {
    return 'enhance'; // malformed URL → assume page exists, safer default
  }
}

// ── Action type inference ─────────────────────────────────────────────────────
// Heuristic: what content type best suits this query for AIO citation?
function inferActionType(query) {
  const q = query.toLowerCase();
  if (/מה ה|מה זה|מהו|מהי|הגדר|הסבר/.test(q)) return 'definition_box';
  if (/כמה עולה|מחיר|עלות|תמחור/.test(q))        return 'faq_block';
  if (/איך|כיצד|שלבים|תהליך|להתחיל/.test(q))    return 'faq_block';
  if (/השוואה|לעומת|vs|הבדל/.test(q))             return 'table';
  if (/בחר|הטוב ביותר|מומלץ|top/.test(q))         return 'faq_block';
  return 'faq_block'; // safe default
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== WAO GEO Pareto Analysis ===`);
  console.log(`Site:    ${SITE}`);
  console.log(`Period:  last ${DAYS} days`);
  console.log(`Target:  top ${TOP_N} opportunities (positions ${MIN_POS}–${MAX_POS})\n`);

  const { startDate, endDate } = dateRange(DAYS);
  const exclusions    = loadExclusions();
  const clientCtx     = loadClientContext();
  const businessNiche = args.niche || clientCtx?.businessNiche || null;

  if (exclusions.length) console.log(`Exclusions loaded: ${exclusions.join(', ')}\n`);
  if (businessNiche)     console.log(`Business context: ${businessNiche}`);
  if (!businessNiche)    console.log(`⚠  No business context — intent filter skipped. Pass --client=ID or --niche="..."\n`);

  console.log('Refreshing access token...');
  const token = await getAccessToken();

  console.log(`Fetching keywords from GSC (${startDate} → ${endDate})...`);
  const rows = await fetchKeywords(token, startDate, endDate);
  console.log(`\nTotal rows fetched: ${rows.length}`);

  // Build query→pages map for cannibalization checks (free — uses rows already in memory)
  const queryPagesMap = buildQueryPagesMap(rows);

  // Score and rank all candidates
  const scored = rows
    .map(row => ({
      query:       row.keys?.[0] ?? '',
      page:        row.keys?.[1] ?? '',
      position:    Math.round(row.position * 10) / 10,
      impressions: row.impressions,
      clicks:      row.clicks,
      ctr:         Math.round(row.ctr * 1000) / 10,
      score:       scoreRow(row),
    }))
    .filter(r => r.score > 0 && !isExcluded(r.query, exclusions))
    .sort((a, b) => b.score - a.score);

  // ── Intent filter ─────────────────────────────────────────────────────────
  // Take top INTENT_CANDIDATES, classify, filter score < 3, slice to TOP_N
  let intentFiltered;
  if (businessNiche) {
    const candidates = scored.slice(0, INTENT_CANDIDATES);
    const withIntent = await runIntentFilter(candidates, businessNiche);
    const filtered   = withIntent.filter(r => r.intentScore >= 3);
    const flagged    = withIntent.filter(r => r.intentScore < 3);

    if (flagged.length) {
      console.log(`\n⛔ Filtered out ${flagged.length} queries (wrong intent):`);
      flagged.forEach(r =>
        console.log(`   score ${r.intentScore}/5 — "${r.query}": ${r.intentReason}`)
      );
    }
    intentFiltered = filtered;
  } else {
    intentFiltered = scored.map(r => ({ ...r, intentScore: null, intentReason: '' }));
  }

  const topOpportunities = intentFiltered.slice(0, TOP_N).map((r, i) => {
    const mode   = inferImplementationMode(r.page, SITE);
    const cannibal = checkCannibalization(r.query, r.page, queryPagesMap);
    return {
      rank:               i + 1,
      query:              r.query,
      rankingUrl:         r.page,
      implementationMode: mode,
      position:           r.position,
      impressions:        r.impressions,
      clicks:             r.clicks,
      ctr:                r.ctr,
      score:              r.score,
      intentScore:        r.intentScore,
      intentFlag:         r.intentScore === 3 ? 'review' : null,
      intentReason:       r.intentReason || null,
      priority:           opportunityLabel(r.position, r.impressions),
      actionType:         inferActionType(r.query),
      ...(cannibal ?? {}),
    };
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const highCount      = topOpportunities.filter(r => r.priority === 'HIGH').length;
  const mediumCount    = topOpportunities.filter(r => r.priority === 'MEDIUM').length;
  const reviewCount    = topOpportunities.filter(r => r.intentFlag === 'review').length;
  const cannibalCount  = topOpportunities.filter(r => r.cannibalFlag === 'REVIEW').length;

  const enhanceCount = topOpportunities.filter(r => r.implementationMode === 'enhance').length;
  const createCount  = topOpportunities.filter(r => r.implementationMode === 'create').length;

  console.log('\n─────────────────────────────────────────────────────────────────────');
  console.log(`Top ${TOP_N} AIO Opportunities for ${SITE}`);
  console.log('─────────────────────────────────────────────────────────────────────');
  topOpportunities.forEach(r => {
    const modeTag      = r.implementationMode === 'enhance' ? 'ENHANCE' : 'CREATE ';
    const intentTag    = r.intentFlag === 'review' ? ' [⚠ INTENT]' : '';
    const cannibalTag  = r.cannibalFlag === 'REVIEW'
      ? ` [🔀 CANNIBAL:${r.cannibalReasons.join('+')}]` : '';
    console.log(
      `${String(r.rank).padStart(2)}. [${r.priority.padEnd(6)}] [${modeTag}] [${r.actionType.padEnd(14)}] ` +
      `pos:${String(r.position).padStart(5)} | ${String(r.impressions).padStart(5)} imp | ` +
      `score:${r.score}${intentTag}${cannibalTag} — ${r.query}`
    );
    if (r.implementationMode === 'enhance') {
      const slug = r.rankingUrl.replace(SITE.replace(/\/$/, ''), '') || '/';
      console.log(`      → enhance: ${slug}`);
    }
    if (r.cannibalUrls?.length) {
      r.cannibalUrls.forEach(u => {
        const compSlug = u.url.replace(SITE.replace(/\/$/, ''), '') || '/';
        console.log(`      ↔ competing: ${compSlug} (${u.impressions} imp, pos ${u.position})`);
      });
    }
  });

  console.log('\nSummary:');
  console.log(`  Total keywords in range: ${scored.length}`);
  console.log(`  ENHANCE (add to existing page): ${enhanceCount}`);
  console.log(`  CREATE  (new page, no content):  ${createCount}`);
  console.log(`  HIGH priority:   ${highCount}`);
  console.log(`  MEDIUM priority: ${mediumCount}`);
  console.log(`  LOW priority:    ${topOpportunities.length - highCount - mediumCount}`);
  if (reviewCount)   console.log(`  ⚠ Needs WAO review (mixed intent):    ${reviewCount}`);
  if (cannibalCount) console.log(`  🔀 Cannibalization flag (needs check): ${cannibalCount}`);

  // ── Output ─────────────────────────────────────────────────────────────────
  const output = {
    site:        SITE,
    generatedAt: new Date().toISOString(),
    period:      { startDate, endDate, days: DAYS },
    totalInRange: scored.length,
    opportunities: topOpportunities,
  };

  if (OUT_FILE) {
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
    console.log(`\n✅ Output saved to ${OUT_FILE}`);
  } else {
    console.log('\n(Pass --out=path/to/file.json to save results)\n');
  }

  return output;
}

main().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
