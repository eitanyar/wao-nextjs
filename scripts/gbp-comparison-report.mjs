/**
 * GBP Review-Comparison Report — the free outreach magnet ("1.3")
 *
 * Spec: docs/specs/grade-a-outreach-playbook.md §2. Generates a Hebrew,
 * RTL-safe, WhatsApp-ready text block comparing a prospect's Google Business
 * Profile (rating, review count, recent-review-pace proxy) against its top 3
 * local competitors. This is the free door-opener for Grade-A outreach
 * (solo plumber/electrician/garage-owner/clinic prospects) — NOT the paid
 * GMB Bot product.
 *
 * Field set is deliberately trimmed (Eitan sign-off, 2026-08-03):
 *   - rating (1-5)
 *   - total review count
 *   - "recent review pace" proxy — count of the <=5 most-visible reviews
 *     (Places API's hard cap on the `reviews` field) falling in the last
 *     30/60/90 days. This is explicitly a SMALL-SAMPLE ESTIMATE, not true
 *     review velocity, and is labeled as such in the output every time.
 *
 * review-RESPONSE-RATE is NOT included and must never be added here — that
 * data only exists in the Google Business Profile (My Business) API, which
 * requires OAuth ownership of the specific listing. WAO cannot pull it for
 * competitor listings it doesn't manage. Do not "fix" this by guessing.
 *
 * Uses Places API (New): https://developers.google.com/maps/documentation/places/web-service/text-search
 * and https://developers.google.com/maps/documentation/places/web-service/place-details
 *
 * Requires in .env.local:
 *   GOOGLE_MAPS_API_KEY   — API key with "Places API (New)" enabled on the
 *                           WAO GCP project. NOT present as of 2026-08-03 —
 *                           this is Eitan's ~15-min console/billing task,
 *                           tracked separately from this script's build.
 *
 * Usage (target resolved by name+city search):
 *   node scripts/gbp-comparison-report.mjs --name="גליל אינסטלציה" --city="חיפה" --category="אינסטלטור"
 *
 * Usage (target given directly by Place ID — skips the resolve search):
 *   node scripts/gbp-comparison-report.mjs --place-id=ChIJ... --city="חיפה" --category="אינסטלטור"
 *
 * Optional:
 *   --out=path/to/file.txt   write the report to a file instead of stdout only
 *
 * No new route/component/dashboard. Eitan runs this per-prospect and pastes
 * the output straight into outreach (WhatsApp / in-person printout / email).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { textSearch, placeDetails, buildEntrySignals } from './lib/places-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── env ──────────────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const API_KEY = env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

// ── CLI args ─────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, ...rest] = a.slice(2).split('=');
      return [k, rest.join('=')];
    })
);

const TARGET_NAME = args.name;
const TARGET_PLACE_ID = args['place-id'];
const CITY = args.city;
const CATEGORY = args.category;
const OUT = args.out;

// Places API (New) calls now go through the shared client
// (scripts/lib/places-client.mjs, docs/specs/readiness-gate.md §4) — no
// second copy of textSearch()/placeDetails()/recentPace() here.

// Exported (not just used internally) so the regression test in
// scripts/lib/places-client.test.mjs can assert this pure formatting layer
// is byte-identical to the pre-refactor formula without importing `main()`
// (which is argv/network/process.exit-coupled and unsafe to import directly).
export function formatEntry(label, details) {
  const name = details.displayName?.text || label;
  const signals = buildEntrySignals(details);
  const rating = typeof signals.rating === 'number' ? signals.rating.toFixed(1) : 'אין דירוג';
  return {
    name,
    rating,
    count: signals.reviewCount,
    pace: signals.recentPace,
    sampleSize: signals.sampleSize,
  };
}

export function renderEntryBlock(entry, isTarget) {
  const header = isTarget ? `🏢 ${entry.name} (העסק שלך)` : `▫️ ${entry.name}`;
  return [
    header,
    `⭐ ${entry.rating} מתוך 5  |  💬 ${entry.count} ביקורות בסך הכל`,
    `📈 קצב אחרון (מדגם של ${entry.sampleSize} ביקורות): ${entry.pace.d30} ב-30 יום | ${entry.pace.d60} ב-60 יום | ${entry.pace.d90} ב-90 יום`,
  ].join('\n');
}

// ── main ─────────────────────────────────────────────────────────────────
async function main() {
  // 1. Resolve target place
  let targetPlaceId = TARGET_PLACE_ID;
  if (!targetPlaceId) {
    const results = await textSearch(API_KEY, `${TARGET_NAME} ${CITY}`, { maxResults: 1 });
    if (!results.length) {
      console.error(`\nCould not resolve target business "${TARGET_NAME}" in "${CITY}" via Text Search. Try --place-id instead.\n`);
      process.exit(1);
    }
    targetPlaceId = results[0].id;
  }

  const targetDetails = await placeDetails(API_KEY, targetPlaceId);
  const targetEntry = formatEntry(TARGET_NAME || targetDetails.displayName?.text, targetDetails);

  // 2. Find competitors
  const competitorQuery = `${CATEGORY} ב${CITY}`;
  const competitorResults = await textSearch(API_KEY, competitorQuery, { maxResults: 8 });
  const competitorCandidates = competitorResults.filter(p => p.id !== targetPlaceId).slice(0, 3);

  if (competitorCandidates.length === 0) {
    console.error(`\nNo competitors found for "${competitorQuery}" (excluding the target). Report will show target only.\n`);
  }

  const competitorEntries = [];
  for (const c of competitorCandidates) {
    const details = await placeDetails(API_KEY, c.id);
    competitorEntries.push(formatEntry(c.displayName?.text, details));
  }

  // 3. Render Hebrew, RTL-safe, WhatsApp-ready text block
  const today = new Date().toLocaleDateString('he-IL');
  const lines = [];
  lines.push(`📊 השוואת ביקורות בגוגל — ${targetEntry.name} מול המתחרים ב${CITY}`);
  lines.push('');
  lines.push(renderEntryBlock(targetEntry, true));
  lines.push('');
  lines.push(`מול המתחרים המובילים בחיפוש "${CATEGORY} ב${CITY}":`);
  lines.push('');
  competitorEntries.forEach((entry, i) => {
    lines.push(renderEntryBlock(entry, false));
    if (i < competitorEntries.length - 1) lines.push('');
  });
  lines.push('');
  lines.push('* "קצב אחרון" הוא הערכה על מדגם קטן (עד 5 הביקורות האחרונות שגוגל חושף לכל עסק) — לא מדד מהירות ביקורות מדויק.');
  lines.push(`נוצר אוטומטית על ידי WAO · ${today}`);

  const report = lines.join('\n');

  console.log('\n' + report + '\n');

  if (OUT) {
    fs.writeFileSync(path.resolve(process.cwd(), OUT), report, 'utf-8');
    console.error(`\nWritten to ${OUT}`);
  }
}

// Guarded so importing this module (e.g. to reuse the pure formatEntry()/
// renderEntryBlock() functions from a test) never triggers CLI validation,
// process.exit(), or a live network call — only running the file directly does.
const isDirectRun = path.resolve(process.argv[1] || '') === path.resolve(__dirname, 'gbp-comparison-report.mjs');
if (isDirectRun) {
  if (!API_KEY) {
    console.error(
      '\n[gbp-comparison-report] Missing GOOGLE_MAPS_API_KEY.\n' +
      'Set GOOGLE_MAPS_API_KEY in .env.local (Places API (New) must also be\n' +
      'enabled on the GCP project — this is a one-time console/billing step,\n' +
      'not a code change). Aborting before making any request.\n'
    );
    process.exit(1);
  }
  if (!CITY || !CATEGORY) {
    console.error('\nUsage:\n' +
      '  node scripts/gbp-comparison-report.mjs --name="<business name>" --city="<city>" --category="<category>"\n' +
      '  node scripts/gbp-comparison-report.mjs --place-id=<PlaceID> --city="<city>" --category="<category>"\n');
    process.exit(1);
  }
  if (!TARGET_NAME && !TARGET_PLACE_ID) {
    console.error('\nMust supply either --name or --place-id for the target business.\n');
    process.exit(1);
  }

  main().catch(err => {
    console.error(`\n[gbp-comparison-report] Failed: ${err.message}\n`);
    process.exit(1);
  });
}
