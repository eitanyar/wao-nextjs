/**
 * WhatsApp Weekly Digest — read-only proactive report generator
 *
 * Free bundled retention feature (not a paid tier, no entitlement gate).
 * Reads the client's already-shipped tool outputs — anomalies.json,
 * pareto.json, title-suggestions.json, tasks/geo/*.json — normalizes them
 * with the SAME tier-first ranking logic as src/lib/advisor.ts (tier 1
 * anomalies always outrank tier 2 opportunities, then sort by native score
 * descending within a tier), and composes one short Hebrew WhatsApp message:
 * wins summary (if any) + active alerts (if any, non-warming-up only) + the
 * single top-ranked next recommended action.
 *
 * This is a plain re-implementation of the advisor.ts ranking rules, not an
 * import — advisor.ts is a .ts module with no file I/O of its own (adapters
 * take already-parsed JS objects), and importing .ts into a .mjs CLI script
 * needs a loader/transpile step this project doesn't otherwise use. Keep the
 * two logically in sync if the ranking rule ever changes.
 *
 * Message composition is intentionally plain/functional, NOT persuasive
 * marketing copy — Tamar should refine actual phrasing before real client use.
 *
 * Usage:
 *   node scripts/whatsapp-digest.mjs --client=ajudaica
 *   node scripts/whatsapp-digest.mjs --client=retter
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');

// ── CLI args ──────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.slice(2).split('='))
);

const CLIENT_ID = args.client;
if (!CLIENT_ID) {
  console.error('Usage: node scripts/whatsapp-digest.mjs --client=<clientId>');
  process.exit(1);
}

const CLIENT_DIR = path.join(ROOT, 'data', 'clients', CLIENT_ID);

function readJsonSafe(relPath) {
  const filePath = path.join(CLIENT_DIR, relPath);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.warn(`⚠️  Could not parse ${relPath}: ${err.message}`);
    return null;
  }
}

function readGeoTasks() {
  const tasksDir = path.join(CLIENT_DIR, 'tasks', 'geo');
  if (!fs.existsSync(tasksDir)) return [];
  return fs.readdirSync(tasksDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJsonSafe(path.join('tasks', 'geo', f)))
    .filter(Boolean);
}

const clientJson  = readJsonSafe('client.json');
if (!clientJson) {
  console.error(`No client.json found for client "${CLIENT_ID}" — cannot build digest.`);
  process.exit(1);
}

const anomalies    = readJsonSafe('anomalies.json');
const pareto        = readJsonSafe('pareto.json');
const titleBot      = readJsonSafe('title-suggestions.json');
const geoTasks       = readGeoTasks();

// ── Adapters — mirror src/lib/advisor.ts exactly (tier 1 = anomaly, tier 2 = rest) ──

function adaptAnomalies(data) {
  if (!data) return [];
  if (data.status === 'warming_up') return [];
  if (!data.anomalies || data.anomalies.length === 0) return [];

  return data.anomalies.map((a) => {
    const pctDrop = Math.min(a.clicksChangePct, a.impressionsChangePct);
    return {
      tool: 'anomaly',
      tier: 1,
      title: `ירידה של ${Math.abs(pctDrop)}% ב-"${a.key}"`,
      detail: `${a.dimension === 'pages' ? 'עמוד' : 'ביטוי חיפוש'} · ${a.direction}`,
      score: Math.abs(pctDrop),
    };
  });
}

function safeDecodeUrl(url) {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

function adaptParetoOpportunities(data) {
  if (!data || !data.opportunities) return [];
  return data.opportunities.map((o) => ({
    tool: 'pareto',
    tier: 2,
    title: `הזדמנות חיפוש: "${o.query}"`,
    detail: `${safeDecodeUrl(o.rankingUrl.replace(/^https?:\/\/[^/]+/, ''))} · מיקום ${o.position} · ${o.impressions.toLocaleString('he-IL')} חשיפות`,
    score: o.score,
  }));
}

function adaptTitleBotSuggestions(data) {
  if (!data || !data.candidates) return [];
  const skipSet = new Set(
    (data.skippedForCannibalization ?? []).map((s) => `${s.query}|${s.page}`)
  );
  return data.candidates
    .filter((c) => !skipSet.has(`${c.query}|${c.page}`))
    .map((c) => ({
      tool: 'title-bot',
      tier: 2,
      title: `שיפור כותרת: "${c.query}"`,
      detail: `${safeDecodeUrl(c.page.replace(/^https?:\/\/[^/]+/, ''))} · מיקום ${c.position}`,
      score: c.directionalPriorityScore ?? c.estimatedLostClicks ?? 0,
    }));
}

function adaptGeoTasks(tasks) {
  return tasks
    .filter((t) => t.status !== 'done' && t.status !== 'verified')
    .map((t) => ({
      tool: 'geo-task',
      tier: 2,
      title: `משימת תוכן: "${t.query}"`,
      detail: `${safeDecodeUrl(t.rankingUrl.replace(/^https?:\/\/[^/]+/, ''))} · סטטוס: ${t.status}`,
      score: t.score,
    }));
}

function rankAdvisorItems(items) {
  return [...items].sort((a, b) => (a.tier - b.tier) || (b.score - a.score));
}

const allItems = [
  ...adaptAnomalies(anomalies),
  ...adaptParetoOpportunities(pareto),
  ...adaptTitleBotSuggestions(titleBot),
  ...adaptGeoTasks(geoTasks),
];

const ranked      = rankAdvisorItems(allItems);
const activeAlerts = ranked.filter((i) => i.tool === 'anomaly');
const topAction     = ranked.find((i) => i.tool !== 'anomaly') ?? ranked[0] ?? null;

// ── Message composition (plain/functional — Tamar to polish phrasing) ─────

function composeDigestMessage({ clientName, alerts, topAction, opportunityCount }) {
  const lines = [];
  lines.push(`שלום ${clientName},`);
  lines.push('');
  lines.push('הסיכום השבועי שלכם מוכן.');
  lines.push('');

  if (alerts.length > 0) {
    lines.push(`⚠️ שווה תשומת לב — ${alerts.length} התראות פעילות:`);
    alerts.slice(0, 3).forEach((a) => lines.push(`- ${a.title}`));
  } else {
    lines.push('✅ הכל רגוע השבוע. אין התראות פתוחות.');
  }

  if (opportunityCount > 0) {
    lines.push('');
    lines.push(`💡 יש גם ${opportunityCount} הזדמנויות פתוחות שאפשר לקדם.`);
  }

  if (topAction) {
    lines.push('');
    lines.push('מה שהכי כדאי להתחיל ממנו:');
    lines.push(`▪️ ${topAction.title}`);
    lines.push(`   ${topAction.detail}`);
  }

  lines.push('');
  lines.push('כל הפרטים והפעולות מחכים לכם בלוח הבקרה ב-WAO.');

  return lines.join('\n');
}

const message = composeDigestMessage({
  clientName: clientJson.approvalContact || CLIENT_ID,
  alerts: activeAlerts,
  topAction,
  opportunityCount: ranked.filter((i) => i.tool !== 'anomaly').length,
});

// ── wa.me link builder (kept separate from message composition) ───────────

function buildWaLink(phone, msg) {
  const clean = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
}

const phone = clientJson.approvalWhatsapp;
if (!phone) {
  console.warn(`⚠️  No approvalWhatsapp field on client.json for "${CLIENT_ID}" — link cannot be built.`);
}

const waLink = phone ? buildWaLink(phone, message) : null;

// ── Console output ──────────────────────────────────────────────────────
console.log(`\n=== WhatsApp digest — ${CLIENT_ID} ===\n`);
console.log('--- Sources found ---');
console.log(`anomalies.json:        ${anomalies ? (anomalies.status === 'warming_up' ? 'present (warming_up, ignored)' : 'present') : 'missing'}`);
console.log(`pareto.json:           ${pareto ? `present (${pareto.opportunities?.length ?? 0} opportunities)` : 'missing'}`);
console.log(`title-suggestions.json: ${titleBot ? `present (${titleBot.candidates?.length ?? 0} candidates)` : 'missing'}`);
console.log(`tasks/geo/*.json:      ${geoTasks.length} task file(s)`);

console.log('\n--- Composed message ---\n');
console.log(message);

console.log('\n--- wa.me link ---\n');
console.log(waLink ?? '(no phone number available)');
console.log('');
