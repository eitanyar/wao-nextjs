/**
 * SEO/Ads Overlap Analysis — "already winning organically" opportunity finder
 *
 * Fork of gsc-pareto.mjs, mining the OPPOSITE position window: instead of
 * striking-distance (positions 4-25, for AIO/content opportunity), this
 * surfaces queries where the client ALREADY ranks position 1-3 organically
 * with meaningful traffic — candidates to ALSO run a paid search ad on,
 * for SERP real-estate defense + incremental clicks (a standard SEO/PPC
 * overlap tactic).
 *
 * READ-ONLY. This script makes ZERO Google Ads API calls and creates/changes
 * nothing. GSC Search Analytics (read) only. Per the standing project rule,
 * read-only monitoring/analysis runs without the write-side approval ladder —
 * this script never crosses into that territory. Downstream ad-copy/bid
 * decisions belong to Dror (strategy) and Tamar (copy), not this script.
 *
 * Usage:
 *   node scripts/ads-overlap.mjs --client=aasada --site=https://aasada.com/ --days=90
 *   node scripts/ads-overlap.mjs --site=sc-domain:aasada.com --days=90 --out=data/clients/aasada/ads-overlap.json
 *
 * Requires in .env.local (same vars as gsc-pareto.mjs — same OAuth app,
 * same refresh token; the refresh token is tied to the authenticated Google
 * account, not to a specific site, so it works for ANY GSC property that
 * account has access to — verified below in the aasada.com test run):
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GSC_REFRESH_TOKEN
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { Agent, setGlobalDispatcher } from 'undici';

// This sandbox/host environment has a broken IPv6 route to Google's APIs,
// which makes Node's default happy-eyeballs dual-stack fetch burn its whole
// timeout budget on IPv6 before falling back to IPv4 (curl -4 works instantly;
// plain node fetch times out). Forcing IPv4 here is an environment workaround,
// not a change to the GSC OAuth logic itself.
dns.setDefaultResultOrder('ipv4first');
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

const SITE          = args.site    || 'https://www.retter.co.il/';
const DAYS          = parseInt(args.days || '90', 10);
const TOP_N         = parseInt(args.top  || '20', 10);
const OUT_FILE      = args.out     || null;
const CLIENT_ID_ARG = args.client  || null;

// ── Position window: already-winning, top-of-SERP ────────────────────────────
// Positions 1-3: the client already owns the organic result. This is the
// mirror image of gsc-pareto.mjs's MIN_POS=4/MAX_POS=25 striking-distance
// window. Here the opportunity isn't "help this rank better" — it's
// "defend/double this SERP real estate with a paid ad."
const MIN_POS = 1;
const MAX_POS = 3;

// Dror's (ppc-strategist) real v1 threshold brief — combined AND filter:
//   position ≤3 AND impressions ≥100 AND clicks ≥5, all over a 90-day window.
// Rationale: a 90-day window smooths out catering's seasonal order-volume
// swings so a single slow/fast week doesn't skew the picture. The combined
// AND (not OR) is intentional — for a small, low-volume business the goal is
// a SHORT, genuinely actionable opportunity list, not a long candidate list
// that dilutes attention. Impressions alone can be "seen but never clicked"
// noise; requiring real clicks too proves actual searcher intent exists.
const MIN_IMPRESSIONS_THRESHOLD = 100;
const MIN_CLICKS_THRESHOLD      = 5;

// CTR soft-signal threshold — NOT a filter, just an output flag. Top-3
// organic positions typically pull 10-30%+ CTR; a qualifying row still below
// 8% at position ≤3 is a signal that organic isn't converting the visibility
// it has, which is itself an argument for a paid ad to capture the gap.
const CTR_FLAG_THRESHOLD = 8; // percent

// ── Date range ────────────────────────────────────────────────────────────────
function dateRange(days) {
  const end   = new Date();
  const start = new Date(Date.now() - days * 86_400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate:   end.toISOString().slice(0, 10),
  };
}

// ── OAuth access token (identical pattern to gsc-pareto.mjs) ─────────────────
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

// ── GSC Search Analytics query (read-only; identical pattern) ────────────────
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

// ── Load client context ───────────────────────────────────────────────────────
function loadClientContext() {
  if (!CLIENT_ID_ARG) return null;
  const file = path.resolve(__dirname, `../data/clients/${CLIENT_ID_ARG}/client.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ── Brand-match heuristic (Dror's v1 brief) ──────────────────────────────────
// Per Lior's flag: cannibalization risk is worst on branded terms — running a
// paid ad on a query that's just the client's own business name usually wastes
// spend (you'd already win that click organically almost 100% of the time).
// BUT Dror's brief is explicit: FLAG, don't exclude. Defensive bidding on your
// own brand (blocking competitor conquesting on your name) is a legitimate
// call a human should make, not something this script should silently drop.
//
// Deterministic v1 heuristic, no manual brand list required:
//   1. Domain root token — strip TLD + "www" from client.json's siteUrl
//      (e.g. "aaasada" from "https://aaasada.com/").
//   2. Homepage <title> tokens — fetch the live homepage HTML and pull the
//      first 2-3 significant words from its <title>, stripping generic
//      Hebrew business-suffix noise (בע"מ) but NOT filtering out category
//      words (e.g. "קייטרינג") — v1 keeps this simple on purpose.
//   3. Any query containing one of these tokens as a case-insensitive
//      substring is flagged brand_match: "heuristic_v1" with the matched
//      token noted.
//
// KNOWN V1 LIMITATION (explicitly anticipated by Dror): this is a plain
// substring check — it does NOT attempt Hebrew↔Latin transliteration
// matching. A Hebrew business name (e.g. "טעם מהודר") and a Latin domain
// (e.g. "aaasada") frequently share ZERO substring-matchable tokens even
// when they refer to the exact same brand. Catching that class of case
// would need a transliteration/phonetic layer, which is deliberately out of
// scope for v1 per Dror's brief (over-engineering risk vs. payoff at this
// client's volume). Treat any brand_match: null result as "not caught by
// this heuristic," not as "confirmed non-branded."
const GENERIC_SUFFIXES = ['בעמ', 'בע"מ', "בע''מ", 'ltd', 'llc', 'inc'];

function extractDomainToken(siteUrl) {
  if (!siteUrl) return null;
  try {
    const host = new URL(siteUrl).hostname.replace(/^www\./, '');
    const root = host.split('.')[0]; // strip TLD
    return root ? root.toLowerCase() : null;
  } catch {
    return null;
  }
}

async function fetchHomepageTitleTokens(siteUrl) {
  try {
    const res = await fetch(siteUrl, { redirect: 'follow' });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (!match) return [];
    const rawTitle = match[1].trim();
    const words = rawTitle
      .split(/[\s|–—-]+/)
      .map(w => w.replace(/["'׳״]/g, '').trim())
      .filter(w => w && !GENERIC_SUFFIXES.includes(w.toLowerCase()));
    return words.slice(0, 3).map(w => w.toLowerCase());
  } catch (err) {
    console.log(`  ⚠ Homepage title fetch failed (non-fatal): ${err.message}`);
    return [];
  }
}

async function loadBrandTokens(clientCtx, siteUrl) {
  const fromArg = args['brand-exclusions']
    ? args['brand-exclusions'].split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    : [];

  const fromClient = (clientCtx?.brandNames || [])
    .map(s => String(s).trim().toLowerCase())
    .filter(Boolean);

  const domainToken   = extractDomainToken(clientCtx?.siteUrl || siteUrl);
  const titleTokens    = await fetchHomepageTitleTokens(clientCtx?.siteUrl || siteUrl);

  return [...new Set([...fromArg, ...fromClient, ...(domainToken ? [domainToken] : []), ...titleTokens])];
}

function brandMatch(query, brandTokens) {
  if (!brandTokens.length) return null;
  const q = query.toLowerCase();
  const matched = brandTokens.find(t => t && q.includes(t));
  return matched ? { flag: 'heuristic_v1', matchedToken: matched } : null;
}

// ── Fast draft-ad generator (deterministic, template-based, NO LLM call) ────
// This replaces the old "adCopySlots" placeholder. The point per Eitan's
// standing scope note: give a rough, instantly-visible draft per opportunity
// right in the dashboard, so nothing waits on a Tamar→Noa round-trip just to
// have SOMETHING to look at. This is explicitly NOT Tamar's polished ad copy
// (which is a separate, already-complete manual deliverable done today as a
// proof-of-concept for each client's top opportunity) — it's a cheap,
// disposable starting point Eitan can refine/replace per-opportunity as he
// reviews the tool's output.
//
// Fields sourced only from client.json (businessNiche / usp) — never invents
// facts. If those fields are still "unknown — to be assessed" placeholders
// (as populated earlier today), templating from them would produce garbage
// ("unknown — to be assessed - השאירו פרטים"), so we bail to
// PENDING_BUSINESS_DETAILS instead, same as the old placeholder behavior.
function isPlaceholderValue(val) {
  return !val || /unknown/i.test(val);
}

// ── Language guard ────────────────────────────────────────────────────────
// client.json fields are internal onboarding notes and sometimes get written
// in English (e.g. earlier-onboarding-day notes) before someone rewrites them
// in Hebrew. Templating an English field verbatim into a Hebrew ad draft
// produces confusing mixed-language output. Simple heuristic: count Hebrew
// Unicode-range chars vs. Latin chars in the string; whichever is the
// majority is the "detected language". Only Hebrew-majority fields are safe
// to template into the Hebrew draft.
function isHebrewMajority(val) {
  const s = String(val || '');
  const hebrewCount = (s.match(/[֐-׿]/g) || []).length;
  const latinCount   = (s.match(/[A-Za-z]/g) || []).length;
  if (hebrewCount === 0 && latinCount === 0) return false;
  return hebrewCount >= latinCount;
}

function truncate(str, maxLen) {
  const s = String(str).trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1).trim() + '…';
}

// Business niche / usp fields are free text (often "X — Y, Z" style); take
// the first clause before an em-dash/comma as a short, ad-sized snippet.
function firstClause(text) {
  return String(text).split(/[—,]/)[0].trim();
}

function buildDraftAd(clientCtx, query) {
  const niche = clientCtx?.businessNiche;
  const usp   = clientCtx?.usp;

  if (
    !clientCtx ||
    isPlaceholderValue(niche) ||
    isPlaceholderValue(usp) ||
    !isHebrewMajority(niche) ||
    !isHebrewMajority(usp)
  ) {
    return {
      draftHeadlines:   [],
      draftDescriptions: [],
      draftStatus: 'PENDING_BUSINESS_DETAILS',
    };
  }

  const category    = firstClause(niche);
  const uspSnippet  = firstClause(usp);

  const draftHeadlines = [
    truncate(query, 30),
    truncate(category, 30),
    truncate(uspSnippet, 30),
  ];

  const draftDescriptions = [
    truncate(`${category} — ${uspSnippet}. השאירו פרטים עוד היום.`, 90),
    truncate(usp, 90),
  ];

  return { draftHeadlines, draftDescriptions, draftStatus: 'AUTO_DRAFT' };
}

// ── Overlap scoring ────────────────────────────────────────────────────────────
// Opportunity score = impressions, filtered to position 1-3 and above the
// meaningful-traffic threshold. Impressions-as-proxy is a reasonable interim
// ranking signal — NOT a final weighting. Dror owns the real value model
// (e.g. weighting by estimated CPC, SERP feature presence, competitor ad
// density) once his brief is ready.
function scoreRow(row) {
  const position    = row.position;
  const impressions = row.impressions;
  const clicks       = row.clicks;
  if (position < MIN_POS || position > MAX_POS) return 0;
  if (impressions < MIN_IMPRESSIONS_THRESHOLD) return 0;
  if (clicks < MIN_CLICKS_THRESHOLD) return 0;
  return impressions; // placeholder scoring — see comment above
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== WAO SEO/Ads Overlap Analysis ===`);
  console.log(`Site:    ${SITE}`);
  console.log(`Period:  last ${DAYS} days`);
  console.log(`Window:  positions ${MIN_POS}–${MAX_POS} (already-winning organic)`);
  console.log(`Min impressions threshold: ${MIN_IMPRESSIONS_THRESHOLD} | Min clicks threshold: ${MIN_CLICKS_THRESHOLD} (Dror's v1 brief)\n`);

  const { startDate, endDate } = dateRange(DAYS);
  const clientCtx    = loadClientContext();
  const brandTokens  = await loadBrandTokens(clientCtx, SITE);

  if (brandTokens.length) {
    console.log(`Brand-match tokens (heuristic v1): ${brandTokens.join(', ')}\n`);
  } else {
    console.log(`⚠  No brand tokens derived — brand_match flagging is a no-op (no siteUrl/domain token available).\n`);
  }

  console.log('Refreshing access token...');
  const token = await getAccessToken();

  console.log(`Fetching keywords from GSC (${startDate} → ${endDate})...`);
  const rows = await fetchKeywords(token, startDate, endDate);
  console.log(`\nTotal rows fetched: ${rows.length}`);

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
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const topOpportunities = scored.slice(0, TOP_N).map((r, i) => {
    const match = brandMatch(r.query, brandTokens);
    const ctrFlag = (r.position <= MAX_POS && r.ctr < CTR_FLAG_THRESHOLD)
      ? 'below_avg_for_position'
      : null;

    return {
      rank:        i + 1,
      query:       r.query,
      page:        r.page,
      position:    r.position,
      impressions: r.impressions,
      clicks:      r.clicks,
      ctr:         r.ctr,
      score:       r.score,
      ...(ctrFlag ? { ctr_flag: ctrFlag } : {}),
      ...(match ? { brand_match: match.flag, brand_match_token: match.matchedToken } : {}),
      // Campaign-structure recommendation fields (Dror's v1 output-format spec).
      // These are values/defaults, not campaign objects — this stays a data/
      // recommendation script, not a campaign builder.
      recommendedMatchType: 'phrase', // phrase, not exact — at this low a volume, exact match risks near-zero impressions; phrase actually spends budget and gathers signal
      recommendedDailyBudgetILS: 25,  // flat ₪20-30/day pilot budget per Dror; 25 = midpoint
      recommendedBiddingStrategy: 'manual_cpc_or_maximize_clicks', // NOT Smart Bidding — no conversion history yet to train it
      // Fast, deterministic, template-based rough draft (NOT Tamar's polished
      // copy — see buildDraftAd comment above). Falls back to
      // PENDING_BUSINESS_DETAILS if client.json fields are still placeholders.
      ...buildDraftAd(clientCtx, r.query),
    };
  });

  const brandedCount = topOpportunities.filter(r => r.brand_match).length;
  const ctrFlaggedCount = topOpportunities.filter(r => r.ctr_flag).length;

  // Distinct landing-page count — per Lior's deferred-sitelinks v1 concession.
  // NOT sitelink generation itself; just counting/flagging so v2 has its input
  // ready once a client has enough distinct, relevant pages. Google's stated
  // minimum for sitelinks to be eligible to show is 4 distinct URLs.
  const distinctLandingPageCount = new Set(topOpportunities.map(r => r.page)).size;
  const SITELINKS_MIN_DISTINCT_PAGES = 4;
  const sitelinksViable = distinctLandingPageCount >= SITELINKS_MIN_DISTINCT_PAGES;
  console.log(`  Distinct landing pages across opportunities: ${distinctLandingPageCount} (sitelinksViable: ${sitelinksViable})`);

  console.log('\n─────────────────────────────────────────────────────────────────────');
  console.log(`Top ${TOP_N} SEO/Ads Overlap Opportunities for ${SITE}`);
  console.log('─────────────────────────────────────────────────────────────────────');
  topOpportunities.forEach(r => {
    const brandTag = r.brand_match ? ` [🏷 BRAND_MATCH: ${r.brand_match_token}]` : '';
    const ctrTag   = r.ctr_flag ? ' [⚠ CTR below avg]' : '';
    console.log(
      `${String(r.rank).padStart(2)}. pos:${String(r.position).padStart(4)} | ` +
      `${String(r.impressions).padStart(5)} imp | ${String(r.clicks).padStart(4)} clicks | ` +
      `ctr:${r.ctr}%${brandTag}${ctrTag} — ${r.query}`
    );
    console.log(`      → ${r.page}`);
  });

  console.log('\nSummary:');
  console.log(`  Total keywords in range (pos ${MIN_POS}-${MAX_POS}, ≥${MIN_IMPRESSIONS_THRESHOLD} imp, ≥${MIN_CLICKS_THRESHOLD} clicks): ${scored.length}`);
  console.log(`  Returned (top ${TOP_N}): ${topOpportunities.length}`);
  if (brandedCount) console.log(`  🏷 Flagged brand_match: ${brandedCount}`);
  if (ctrFlaggedCount) console.log(`  ⚠ Flagged ctr_flag: ${ctrFlaggedCount}`);

  const output = {
    site:                      SITE,
    generatedAt:               new Date().toISOString(),
    period:                    { startDate, endDate, days: DAYS },
    positionWindow:            { minPos: MIN_POS, maxPos: MAX_POS },
    minImpressionsThreshold:   MIN_IMPRESSIONS_THRESHOLD,
    minClicksThreshold:        MIN_CLICKS_THRESHOLD,
    thresholdNote:             "Dror's (ppc-strategist) real v1 brief: position ≤3 AND impressions ≥100 AND clicks ≥5 over trailing 90 days, combined AND filter — see script comment for rationale.",
    brandTokens,
    brandTokensNote:           brandTokens.length
      ? 'Heuristic v1 tokens applied (domain root + homepage title words). Flag-only, not exclusion — see script comment for known transliteration limitation.'
      : 'No brand tokens derived — brand_match flagging is a no-op.',
    totalInRange:              scored.length,
    distinctLandingPageCount,
    sitelinksViable,
    sitelinksViableNote:       `Informational only (v1 concession per Lior's deferred-sitelinks decision) — NOT sitelink generation. Counts distinct 'page' URLs across this run's opportunity list; Google's stated minimum distinct URLs for sitelinks to be eligible to show is ${SITELINKS_MIN_DISTINCT_PAGES}. Not used by this script for any logic; recorded for future v2 input.`,
    opportunities:             topOpportunities,
    disclaimer: 'READ-ONLY GSC analysis. No Google Ads API calls made. draftHeadlines/draftDescriptions are fast, deterministic, template-based rough drafts generated from client.json (businessNiche/usp) — NOT Tamar\'s polished ad copy, and not launch-ready. draftStatus is PENDING_BUSINESS_DETAILS where those client.json fields are still placeholders.',
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
