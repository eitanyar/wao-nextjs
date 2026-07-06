/**
 * Meta Title Optimization Bot -- GEO Bot capability line (prototype / R&D)
 *
 * SUGGEST-ONLY. This script NEVER pushes to a CMS or live page, and NEVER
 * writes actual title copy. It reads an existing GSC Pareto report
 * (produced by scripts/gsc-pareto.mjs) and produces a RANKED OPPORTUNITY
 * QUEUE of queries/pages where the current title is plausibly under-
 * performing for its ranking position. Writing the replacement title is
 * Yonatan (strategy) + Tamar (copy)'s job -- this script only ranks and
 * filters candidates and leaves `suggestedTitle: null` (TODO) on each one.
 *
 * No live SERP scraping, no paid SERP API -- this version uses a free,
 * published industry-benchmark "expected CTR by position" curve as a proxy
 * for "is this page underperforming for its rank." See CTR_CURVE below for
 * the source and the ASSUMPTION flag -- Yonatan must sign off on these
 * numbers before this is treated as anything but a rough prioritization
 * signal.
 *
 * Usage:
 *   node scripts/title-bot.mjs --client=ajudaica
 *   node scripts/title-bot.mjs --in=data/clients/ajudaica/pareto.json --out=data/clients/ajudaica/title-suggestions.json --top=20
 *
 * Input:  a pareto.json file shaped like scripts/gsc-pareto.mjs's output
 *         (opportunities[] with query, rankingUrl, position, impressions,
 *         clicks, ctr [already expressed as a PERCENT, e.g. 0.2 = 0.2%],
 *         cannibalFlag/cannibalReasons if flagged by the pareto script).
 * Output: JSON file of ranked title-optimization candidates + console summary.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// -- CLI args ------------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.slice(2).split('='))
);

const CLIENT_ID = args.client || null;
const IN_FILE   = args.in  || (CLIENT_ID ? `data/clients/${CLIENT_ID}/pareto.json` : null);
const OUT_FILE  = args.out || (CLIENT_ID ? `data/clients/${CLIENT_ID}/title-suggestions.json` : null);
const TOP_N     = parseInt(args.top || '20', 10);

if (!IN_FILE) {
  console.error('Need --client=<id> (uses data/clients/<id>/pareto.json) or --in=path/to/pareto.json');
  process.exit(1);
}

// -- Candidate position window --------------------------------------------------
// Below this, a title fix alone rarely moves the needle (page/content issues
// dominate); above it, the searcher has already scrolled far enough that
// title-only wins are inconsistent. 4-15 is the sweet spot where a title/meta
// description swap is a plausible, low-effort, non-content lever.
const MIN_POS = 4;
const MAX_POS = 15;
const MIN_IMPRESSIONS = 50; // ignore statistical noise

// -- ASSUMPTION -- Expected organic CTR by average position --------------------
// Blended figures from commonly-published organic CTR studies:
//   - Backlinko / Advanced Web Ranking 2023-2024 organic CTR curve studies
//   - These are widely-cited industry benchmarks, NOT WAO's own click-log
//     data, and NOT verified against live SERP features (AI Overviews, ads,
//     shopping units, etc. all suppress real CTR below these figures on
//     many queries).
// FLAG FOR YONATAN: sign off on these numbers (or supply WAO's own
// historical CTR-by-position curve if we have one) before this is treated
// as more than a directional proxy. Values are percentages.
const CTR_CURVE = {
  1: 27.6, 2: 15.8, 3: 11.0, 4: 8.0, 5: 6.3,
  6: 4.9,  7: 3.9,  8: 3.3,  9: 2.9, 10: 2.5,
  11: 1.9, 12: 1.6, 13: 1.4, 14: 1.2, 15: 1.1,
};

function expectedCtr(position) {
  const rounded = Math.max(1, Math.min(15, Math.round(position)));
  return CTR_CURVE[rounded];
}

// -- ASSUMPTION -- AI Overview / Shopping-unit CTR suppression discount --------
// FLAG FROM YONATAN (seo-strategist review, 2026-07): the CTR_CURVE above is a
// reasonable *no-AI-Overview* baseline, but broad/single-two-word commercial
// e-commerce queries (e.g. "tallit", "kippah", "judaica") are exactly the kind
// most likely to trigger AI Overviews or Shopping units in the US market
// today, which independently suppress organic CTR well below the classic
// position-based curve. Per Ahrefs (Dec 2025) and Seer Interactive (Sep 2025)
// AIO-CTR-suppression studies, AI Overviews alone cut position-1 organic CTR
// by roughly 30-58% (informational queries losing 55-61%). Long-tail /
// clearly-qualified queries are far less likely to trigger these SERP
// features and keep the curve as-is.
//
// This is a flat heuristic discount, not a query-specific SERP-feature
// detection (no live SERP scraping in this prototype) -- it exists so we do
// not systematically OVERSTATE expected CTR (and therefore overstate
// "opportunity") for broad commercial queries. Tune BROAD_QUERY_CTR_DISCOUNT
// as real data comes in.
const BROAD_QUERY_CTR_DISCOUNT = 0.45; // 45% haircut, midpoint of the 30-58% suppression range

// Generic category-level e-commerce nouns that read as broad/commercial even
// as a single word. Keep this a simple stoplist -- not an NLP classifier.
const GENERIC_CATEGORY_NOUNS = new Set([
  'tallit', 'kippah', 'kippot', 'judaica', 'tefillin', 'shofar', 'mezuzah',
  'menorah', 'siddur', 'yarmulke', 'talis', 'sukkot', 'kiddush', 'challah',
]);

// Long-tail signal words -- their presence pushes a query toward
// "long-tail/specific" even if it's still fairly short.
const LONG_TAIL_MODIFIERS = new Set([
  'buy', 'best', 'cheap', 'near', 'for', 'how', 'what', 'where', 'guide',
  'review', 'vs', 'gift', 'gifts', 'from', 'meaning',
]);

// -- Query-type heuristic: broad/commercial vs. long-tail/specific -------------
// Simple word-count + stoplist heuristic (per Yonatan: "keep this simple,
// don't over-engineer an NLP classifier").
//   - 1-2 words AND no long-tail modifier present => broad/commercial
//   - 3+ words, or contains a long-tail modifier   => long-tail/specific
function classifyQueryType(query) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) return 'long_tail';
  const hasModifier = words.some(w => LONG_TAIL_MODIFIERS.has(w));
  if (hasModifier) return 'long_tail';
  if (words.length <= 2) return 'broad_commercial';
  return 'long_tail';
}

function expectedCtrForQuery(query, position) {
  const base = expectedCtr(position);
  const queryType = classifyQueryType(query);
  const discounted = queryType === 'broad_commercial'
    ? Math.round(base * (1 - BROAD_QUERY_CTR_DISCOUNT) * 10) / 10
    : base;
  return { expected: discounted, queryType };
}

// -- Load pareto report -----------------------------------------------------------
function loadPareto(file) {
  const resolved = path.isAbsolute(file) ? file : path.resolve(__dirname, '..', file);
  if (!fs.existsSync(resolved)) {
    console.error(`Input file not found: ${resolved}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

// -- Cannibalization screen ------------------------------------------------------
// Reuse the flags already computed by gsc-pareto.mjs. A row flagged
// MULTI_URL or HEAD_TERM_ON_LOCATION means the wrong page might be ranking,
// or a category/branch page is competing for a parent's head term --
// retitling in that state can make cannibalization worse, not better.
// Those need human resolution (merge/redirect/consolidate) before any
// title suggestion is safe.
function isCannibalized(row) {
  if (row.cannibalFlag === 'REVIEW') return true;
  const reasons = row.cannibalReasons || [];
  return reasons.includes('MULTI_URL') || reasons.includes('HEAD_TERM_ON_LOCATION');
}

// -- Candidate filter + scoring ----------------------------------------------------
// directionalPriorityScore = impressions x (expected - actual)/100
// i.e. "how many extra clicks would this page get per period if it merely
// hit the (query-type-adjusted) expected CTR for its own position" -- a
// simple, defensible proxy for RANKING/PRIORITIZATION only.
//
// NOTE (per Yonatan's review): this is NOT a promised or reliably
// "recoverable" click number. It is a ranking signal derived from a blended
// industry benchmark curve (with a broad-query AIO/Shopping discount applied
// above), not from WAO's own first-party historical CTR data. Treat it as
// "which rows are worth a human look first," not as a forecast. Re-label to
// a real forecast only once WAO has first-party CTR-by-position data to
// calibrate against.
function scoreCandidate(row) {
  const { expected, queryType } = expectedCtrForQuery(row.query, row.position);
  const actual   = row.ctr; // already a percent (see header)
  const gap      = expected - actual;
  const directionalPriorityScore = Math.round((row.impressions * gap) / 100);
  return { expected, actual, gap: Math.round(gap * 10) / 10, directionalPriorityScore, queryType };
}

function buildSuggestions(pareto) {
  const rows = pareto.opportunities || [];
  const skippedCannibal = [];
  const skippedOutOfWindow = [];

  const candidates = [];

  for (const row of rows) {
    if (row.position < MIN_POS || row.position > MAX_POS) {
      skippedOutOfWindow.push(row);
      continue;
    }
    if (row.impressions < MIN_IMPRESSIONS) continue;

    if (isCannibalized(row)) {
      skippedCannibal.push(row);
      continue;
    }

    const { expected, actual, gap, directionalPriorityScore, queryType } = scoreCandidate(row);

    // Only worth suggesting if actual CTR is meaningfully below expected --
    // otherwise the title is probably fine and something else (content,
    // SERP feature suppression) explains the low clicks.
    if (gap <= 0.3) continue;

    candidates.push({
      query:              row.query,
      page:               row.rankingUrl,
      position:           row.position,
      impressions:        row.impressions,
      clicks:             row.clicks,
      currentCtr:         actual,
      expectedCtrAtPosition: expected,
      queryType, // 'broad_commercial' | 'long_tail' -- see classifyQueryType()
      ctrGap:             gap,
      // Ranking/prioritization signal only -- NOT a promised recoverable-clicks
      // number. See scoreCandidate() note above.
      directionalPriorityScore,
      suggestedTitle:     null, // TODO -- Yonatan (keyword/anchor strategy) + Tamar (copy) own this
      status:             'NEEDS_TITLE_COPY',
    });
  }

  candidates.sort((a, b) => b.directionalPriorityScore - a.directionalPriorityScore);
  candidates.forEach((c, i) => { c.rank = i + 1; });

  return {
    candidates: candidates.slice(0, TOP_N),
    stats: {
      totalOpportunitiesScanned: rows.length,
      inPositionWindow: rows.length - skippedOutOfWindow.length,
      skippedForCannibalization: skippedCannibal.length,
      candidatesFound: candidates.length,
      returned: Math.min(TOP_N, candidates.length),
    },
    skippedCannibalDetail: skippedCannibal.map(r => ({
      query: r.query, page: r.rankingUrl, reasons: r.cannibalReasons || ['REVIEW'],
    })),
  };
}

// -- Main ---------------------------------------------------------------------------
function main() {
  console.log('\n=== WAO Meta Title Optimization Bot (prototype, suggest-only) ===');
  console.log(`Input:  ${IN_FILE}`);
  console.log('Mode:   SUGGEST-ONLY -- no CMS/API push, no live page edits, no title copy generated.\n');

  const pareto = loadPareto(IN_FILE);
  console.log(`Site: ${pareto.site || '(unknown)'}`);
  console.log(`Position window: ${MIN_POS}-${MAX_POS}, min impressions: ${MIN_IMPRESSIONS}\n`);

  const { candidates, stats, skippedCannibalDetail } = buildSuggestions(pareto);

  console.log('-----------------------------------------------------------------------');
  console.log(`Top ${candidates.length} Title-Optimization Candidates`);
  console.log('-----------------------------------------------------------------------');
  candidates.forEach(c => {
    console.log(
      `${String(c.rank).padStart(2)}. pos:${String(c.position).padStart(5)} | ` +
      `imp:${String(c.impressions).padStart(6)} | ctr:${c.currentCtr}% (exp ${c.expectedCtrAtPosition}%${c.queryType === 'broad_commercial' ? ', AIO-discounted' : ''}, ` +
      `gap ${c.ctrGap}pp) | priority score ${c.directionalPriorityScore} -- "${c.query}"`
    );
    console.log(`      -> ${c.page}`);
  });

  if (skippedCannibalDetail.length) {
    console.log(`\nSkipped ${skippedCannibalDetail.length} candidates (cannibalization -- needs human resolution first):`);
    skippedCannibalDetail.forEach(s => console.log(`   "${s.query}" (${s.reasons.join('+')}) -- ${s.page}`));
  }

  console.log('\nSummary:');
  console.log(`  Scanned:                    ${stats.totalOpportunitiesScanned}`);
  console.log(`  In position window (${MIN_POS}-${MAX_POS}): ${stats.inPositionWindow}`);
  console.log(`  Skipped (cannibalization):  ${stats.skippedForCannibalization}`);
  console.log(`  Candidates found:           ${stats.candidatesFound}`);
  console.log(`  Returned (top ${TOP_N}):          ${stats.returned}`);

  const output = {
    site:            pareto.site || null,
    generatedAt:     new Date().toISOString(),
    sourceFile:      IN_FILE,
    mode:            'SUGGEST_ONLY_NO_PUSH_NO_COPY',
    ctrCurveSource:  'Blended industry-benchmark organic CTR-by-position curve (Backlinko / Advanced Web Ranking style studies), with a flat 45% AI-Overview/Shopping-suppression discount applied to broad/commercial queries (Yonatan seo-strategist review; Ahrefs Dec 2025 + Seer Interactive Sep 2025 AIO-CTR-suppression data). NOT WAO first-party click data. `directionalPriorityScore` is a ranking signal ONLY, not a promised recoverable-clicks forecast, until WAO has first-party historical CTR data to calibrate against.',
    positionWindow:  { min: MIN_POS, max: MAX_POS },
    stats,
    candidates,
    skippedForCannibalization: skippedCannibalDetail,
  };

  if (OUT_FILE) {
    const resolvedOut = path.isAbsolute(OUT_FILE) ? OUT_FILE : path.resolve(__dirname, '..', OUT_FILE);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.writeFileSync(resolvedOut, JSON.stringify(output, null, 2), 'utf8');
    console.log(`\nOutput saved to ${resolvedOut}`);
  } else {
    console.log('\n(Pass --out=path/to/file.json to save results)\n');
  }
}

main();
