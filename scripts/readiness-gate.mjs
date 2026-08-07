/**
 * Readiness Gate — Phase 1: Routing Score ("the Readiness Gate")
 *
 * Spec: docs/specs/readiness-gate.md. Pre-sale, at first contact (pairs with
 * the GBP magnet, scripts/gbp-comparison-report.mjs). Scores a prospect for
 * the right bot (Site Bot vs. GEO Bot, per VISION.md's buyer-routing rules)
 * AND for Ads Bot fit (pilot-client-gating.md's 8-signal scorecard,
 * automated where possible per §3.4). Writes a structured JSON result plus
 * a presentable, WhatsApp-ready Hebrew text block (with placeholder markers
 * for the routing-outcome copy — Tamar/Noa's to fill in before client use,
 * see §8, NEVER ship Dror-authored Hebrew in those slots).
 *
 * Neither a wrapper around gbp-comparison-report.mjs (no structured return
 * value to consume there) nor a reimplementation of its Places calls (would
 * duplicate the client this codebase already flagged and rejected) — this
 * script imports the shared scripts/lib/places-client.mjs module instead
 * (§4).
 *
 * `siteUrl` is a human/CLI-supplied input, never auto-discovered via Places
 * API's `websiteUri` field (Enterprise SKU cost, §2.1). `gscDataStatus` is
 * always `'unknown-pre-onboarding'` at Phase 1 — GSC's API requires OAuth
 * from a verified owner, which WAO doesn't have pre-onboarding (§2.3, §2.6).
 *
 * Usage (target resolved by name+city search):
 *   node scripts/readiness-gate.mjs --name="גליל אינסטלציה" --city="חיפה" \
 *     --category="אינסטלטור" --site="https://example.co.il"
 *
 * Usage (target given directly by Place ID):
 *   node scripts/readiness-gate.mjs --place-id=ChIJ... --city="חיפה" \
 *     --category="אינסטלטור" --site="https://example.co.il"
 *
 * Optional:
 *   --out=path/to/report.txt        write the presentable text block to a file
 *   --json-out=path/to/result.json  write the structured ReadinessGateResult
 *
 * No prospect-facing dashboard/route — this script writes
 * data/prospects/{prospectSlug}/readiness-gate.json directly, same
 * "script writes, no new UI for the internal-only step" convention as
 * gbp-comparison-report.mjs (§7).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { textSearch, placeDetails, buildEntrySignals } from './lib/places-client.mjs';
import { crawlSite } from './lib/site-crawl.mjs';
import { classifyVertical } from './lib/vertical-classifier.mjs';
import { routeDecision } from './lib/routing-tree.mjs';
import { scoreAdsFit } from './lib/ads-fit-scorecard.mjs';

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
function parseArgs(argv) {
  return Object.fromEntries(
    argv
      .filter(a => a.startsWith('--'))
      .map(a => {
        const [k, ...rest] = a.slice(2).split('=');
        return [k, rest.join('=')];
      }),
  );
}

/** ASCII-transliteration-or-hash slug, stable and filesystem-safe (§7 — exact scheme is Eitan-Dev's implementation choice). */
export function prospectSlug(businessName, city) {
  const raw = `${businessName || ''}-${city || ''}`;
  const ascii = raw
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '') // strips Hebrew and other non-ASCII (transliteration would need a real table; a stable hash suffix covers uniqueness instead)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const hash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 8);
  return ascii ? `${ascii}-${hash}` : hash;
}

// ── §8 client-facing routing-line copy (Tamar, authored; Noa, QA'd) ────────
// Do not edit this Hebrew freehand — copy changes go back through Tamar/Noa.
const ROUTING_LINE_SITE_BOT =
  '🧭 השורה התחתונה בשבילך: הבסיס הדיגיטלי עדיין לא במקום. או שאין אתר, או שהוא קטן מכדי שגוגל יתייחס אליו ברצינות — וזה כמו לפתוח עסק מעולה בקומה שלישית בלי שלט בכניסה. מי שכבר מכיר אותך מגיע; כל השאר פשוט לא מוצאים אותך. הצעד הראשון הוא בית אמיתי באינטרנט: אתר ממוקד שגוגל יודע להציג ולקוחות יודעים לסמוך עליו. זה בדיוק מה ש-Site Bot בונה לך — ומהר.';
const ROUTING_LINE_SITE_BOT_GMB_UPSELL =
  '🧭 השורה התחתונה בשבילך: יש לך כבר אתר אמיתי, והוא בכיוון הנכון — עוד קצת והוא מגיע למסה שפותחת דלתות חדשות. אבל הזירה שבה נשפטים עסקים כמו שלך היא לא (עדיין) האתר — היא המפה של גוגל, חלון הראווה שקופץ ראשון כשמישהו בסביבה מחפש אותך. שם המשחק הבא הוא הדירוג והביקורות בפרופיל העסקי שלך. זה בדיוק המגרש של GMB Bot.';
const ROUTING_LINE_GEO_BOT =
  '🧭 השורה התחתונה בשבילך: יש לך אתר עשיר עם תוכן אמיתי — נכס שרוב המתחרים שלך פשוט לא טרחו לבנות. אצל לקוחות כמוך ההחלטה מתחילה בחיפוש מידע הרבה לפני הפגישה, ובדיוק שם גוגל וה-AI כבר מגישים תשובות מוכנות. השאלה היחידה היא אם התשובה שהם מגישים היא שלך — או של המתחרה. זה בדיוק מה ש-GEO Bot עושה: הופך את התוכן שכבר יש לך למקור שממנו גוגל וה-AI שואבים.';
const ROUTING_LINE_GEO_BOT_THIN_CONTENT =
  '🧭 השורה התחתונה בשבילך: אתה בדיוק סוג העסק שמנצח במשחק של תשובות ה-AI — לקוחות כמוך מחפשים מידע לפני שהם בוחרים, וגוגל וה-AI כבר מגישים להם תשובות. הבשורה הכנה: כרגע האתר שלך עדיין רזה מכדי להזין את המנוע הזה במלוא הכוח, אז ההתחלה תהיה טיפה איטית יותר — את הבסיס נבנה תוך כדי תנועה. אבל הכיוון ברור, וזה בדיוק המגרש של GEO Bot.';
const ROUTING_LINE_ADS_NOT_READY =
  '⛔ ומילה כנה על פרסום בגוגל: כרגע לא היינו ממליצים לך לשים שקל על מודעות. פרסום ממומן הוא כמו להזרים דלק למנוע — אם הבסיס עוד לא מוכן, אתה פשוט שורף כסף מהר יותר. קודם מסדרים את היסודות; לפרסום נגיע כשהוא באמת יחזיר לך את ההשקעה. עדיף שנגיד לך את זה עכשיו מאשר בעוד חודשיים.';

/**
 * Selects which client-facing routing-line text fires for a given routing
 * decision. This is trigger LOGIC only — the Hebrew phrasing behind each
 * line is Tamar's to write, Noa's to QA (§8). Do not fill these in with
 * Dror-authored or engineer-authored Hebrew.
 */
export function selectRoutingLineMarker(routing) {
  switch (routing.ruleFired) {
    case 'rule-1-no-site':
    case 'rule-2-thin-site':
      return ROUTING_LINE_SITE_BOT;
    case 'rule-3-micro-smb-near-geo-threshold':
      return ROUTING_LINE_SITE_BOT_GMB_UPSELL;
    case 'rule-4-thin-content-ready-smb':
      return ROUTING_LINE_GEO_BOT_THIN_CONTENT;
    case 'rule-5-geo-direct':
      return ROUTING_LINE_GEO_BOT;
    default:
      // rule 6 / unclassified — VISION never named this case, deferred to
      // human review (routing.flagForHumanReview). The safest client-facing
      // default matches primaryBotRoute (always 'site-bot' for these two
      // rules) but this report should not go out to a prospect without a
      // human look first — that's what flagForHumanReview in the JSON is for.
      return ROUTING_LINE_SITE_BOT;
  }
}

/**
 * Builds the presentable, WhatsApp-ready Hebrew text block: the target's
 * GBP signal block (reusing gbp-comparison-report.mjs's rendering, via the
 * shared places-client module) plus one short "what's next" routing line
 * (placeholder marker only, per §8) and — if Ads-fit hard-failed — the
 * Ads-not-ready marker too.
 */
export function buildPresentableReportText({ businessName, city, gbp, targetName, routing, adsFit }) {
  const today = new Date().toLocaleDateString('he-IL');
  const rating = typeof gbp.rating === 'number' ? gbp.rating.toFixed(1) : 'אין דירוג';

  const lines = [];
  lines.push(`📊 דוח מיפוי לקוח פוטנציאלי — ${targetName || businessName} (${city})`);
  lines.push('');
  lines.push(`🏢 ${targetName || businessName}`);
  lines.push(`⭐ ${rating} מתוך 5  |  💬 ${gbp.reviewCount} ביקורות בסך הכל`);
  lines.push(
    `📈 קצב אחרון (מדגם של ${gbp.sampleSize} ביקורות): ${gbp.recentPace.d30} ב-30 יום | ${gbp.recentPace.d60} ב-60 יום | ${gbp.recentPace.d90} ב-90 יום`,
  );
  lines.push('');
  lines.push(selectRoutingLineMarker(routing));
  if (adsFit.hardFail) {
    lines.push(ROUTING_LINE_ADS_NOT_READY);
  }
  lines.push('');
  lines.push('* "קצב אחרון" הוא הערכה על מדגם קטן (עד 5 הביקורות האחרונות שגוגל חושף לכל עסק) — לא מדד מהירות ביקורות מדויק.');
  lines.push(`נוצר אוטומטית על ידי WAO · ${today}`);

  return lines.join('\n');
}

/** Atomic write: temp file + rename, so a crash can't leave a half-written prospect record. */
function atomicWriteJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * The full Phase-1 pipeline: GBP signals + site crawl + vertical
 * classification + routing tree + Ads-fit merge → ReadinessGateResult.
 * Pure-ish (still makes network calls) but takes an injectable `fetchImpl`
 * so it's directly testable without hitting the real Places/site network.
 */
export async function runReadinessGate({ businessName, city, category, siteUrl, placeId }, { apiKey = API_KEY, fetchImpl = fetch } = {}) {
  let targetPlaceId = placeId;
  let targetName = businessName;

  if (!targetPlaceId) {
    const results = await textSearch(apiKey, `${businessName} ${city}`, { maxResults: 1, fetchImpl });
    if (!results.length) {
      throw new Error(`Could not resolve target business "${businessName}" in "${city}" via Text Search. Try --place-id instead.`);
    }
    targetPlaceId = results[0].id;
  }

  const details = await placeDetails(apiKey, targetPlaceId, { fetchImpl });
  targetName = businessName || details.displayName?.text;
  const gbp = buildEntrySignals(details);

  const siteCrawl = await crawlSite(siteUrl, { fetchImpl });
  const vertical = classifyVertical(category);
  const adsFit = scoreAdsFit({ gbp, category });

  const routingCore = routeDecision({ siteCrawl, vertical });
  const routing = {
    ...routingCore,
    adsBotReady: adsFit.admission === 'pilot',
    adsFit,
  };

  const presentableReportText = buildPresentableReportText({
    businessName, city, gbp, targetName, routing, adsFit,
  });

  return {
    input: { businessName, city, category, siteUrl, placeId },
    gbp,
    siteCrawl,
    vertical,
    routing,
    generatedAt: new Date().toISOString(),
    presentableReportText,
  };
}

// Guarded so importing this module (e.g. for its pure/testable exports)
// never triggers CLI parsing, process.exit(), or a live network call.
const isDirectRun = path.resolve(process.argv[1] || '') === path.resolve(__dirname, 'readiness-gate.mjs');
if (isDirectRun) {
  (async () => {
    const args = parseArgs(process.argv.slice(2));
    const businessName = args.name;
    const city = args.city;
    const category = args.category;
    const siteUrl = args.site;
    const placeId = args['place-id'];
    const OUT = args.out;
    const JSON_OUT = args['json-out'];

    if (!API_KEY) {
      console.error(
        '\n[readiness-gate] Missing GOOGLE_MAPS_API_KEY.\n' +
        'Set GOOGLE_MAPS_API_KEY in .env.local (same requirement as gbp-comparison-report.mjs).\n',
      );
      process.exit(1);
    }
    if (!city || !category) {
      console.error(
        '\nUsage:\n' +
        '  node scripts/readiness-gate.mjs --name="<business name>" --city="<city>" --category="<category>" --site="https://..."\n' +
        '  node scripts/readiness-gate.mjs --place-id=<PlaceID> --city="<city>" --category="<category>" --site="https://..."\n',
      );
      process.exit(1);
    }
    if (!businessName && !placeId) {
      console.error('\nMust supply either --name or --place-id for the target business.\n');
      process.exit(1);
    }

    try {
      const result = await runReadinessGate({ businessName, city, category, siteUrl, placeId });

      console.log('\n' + result.presentableReportText + '\n');
      console.error(
        `\n[readiness-gate] routing: ${result.routing.primaryBotRoute}` +
        (result.routing.secondaryUpsell ? ` (+${result.routing.secondaryUpsell})` : '') +
        ` | adsFit: ${result.routing.adsFit.admission} (${result.routing.adsFit.totalScore}/16, ${result.routing.adsFit.signalsSource})` +
        (result.routing.flagForHumanReview ? ' | ⚠ flagForHumanReview' : '') +
        '\n',
      );

      if (OUT) {
        fs.writeFileSync(path.resolve(process.cwd(), OUT), result.presentableReportText, 'utf-8');
        console.error(`Written report to ${OUT}`);
      }
      if (JSON_OUT) {
        fs.writeFileSync(path.resolve(process.cwd(), JSON_OUT), JSON.stringify(result, null, 2) + '\n', 'utf-8');
        console.error(`Written JSON result to ${JSON_OUT}`);
      }

      const slug = prospectSlug(businessName, city);
      const prospectFile = path.join(process.cwd(), 'data', 'prospects', slug, 'readiness-gate.json');
      atomicWriteJson(prospectFile, result);
      console.error(`Written prospect record to data/prospects/${slug}/readiness-gate.json`);
    } catch (err) {
      console.error(`\n[readiness-gate] Failed: ${err.message}\n`);
      process.exit(1);
    }
  })();
}
