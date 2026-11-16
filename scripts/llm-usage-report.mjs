#!/usr/bin/env node
/**
 * LLM usage report: cost per workload and per client for one month of the usage ledger
 * (src/lib/ai/llmUsage.ts / scripts/lib/llm-usage.mjs, file <dir>/YYYY-MM.jsonl).
 *
 *   node scripts/llm-usage-report.mjs [--month YYYY-MM] [--dir <ledger dir>] [--json]
 *
 * Directory: --dir, else WAO_LLM_USAGE_DIR, else <cwd>/data/llm-usage. Month: --month, else the
 * current UTC month. Read-only. Clients above CLIENT_MONTHLY_FLAG_ILS are flagged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { llmUsageDir } from './lib/llm-usage.mjs';

/**
 * USD per 1M tokens. VERIFY AGAINST GOOGLE'S PAGE (https://ai.google.dev/gemini-api/docs/pricing)
 * before trusting a total; recorded 2026-11-16 from the night-batch brief, not re-checked live.
 * Tiers apply by the entry's UTC timestamp: the intro price until 2026-12-31 inclusive.
 * Thinking tokens bill at the output rate; cached tokens are part of the input count and bill at
 * the cached rate instead of the input rate.
 * 3.6 / 3.7 / 3.8 Flash share one row (Google lists them together; per Adam's 2026-11-16 brief, not re-checked live).
 * .env.local runs gemini-3.7-flash, so without it every local call was unpriced and the report showed $0.
 */
const GEMINI_FLASH_TIERS = Object.freeze([
  Object.freeze({ until: '2027-01-01T00:00:00.000Z', input: 0.75, output: 3.75, cached: 0.075 }),
  Object.freeze({ until: null, input: 1.5, output: 7.5, cached: 0.15 }),
]);
export const GEMINI_PRICES_USD_PER_MTOK = Object.freeze({
  'gemini-3.6-flash': GEMINI_FLASH_TIERS,
  'gemini-3.7-flash': GEMINI_FLASH_TIERS,
  'gemini-3.8-flash': GEMINI_FLASH_TIERS,
});

/** Fixed conversion rate for the ILS columns and the client flag. Update by hand; not a live rate. */
export const USD_TO_ILS = 3.7;
/** A client above this many shekels of LLM spend in one month is flagged. */
export const CLIENT_MONTHLY_FLAG_ILS = 25;

const n = value => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

/** The price row for an entry, or null (unknown provider/model: unpriced). */
export function priceFor(entry, prices = GEMINI_PRICES_USD_PER_MTOK) {
  if (entry?.provider !== 'gemini') return null;
  const tiers = prices[entry.model];
  if (!tiers) return null;
  const ts = typeof entry.ts === 'string' ? entry.ts : '';
  return tiers.find(tier => tier.until === null || ts < tier.until) ?? null;
}

/** USD cost of one ledger entry, or null when it is unpriced. */
export function entryCostUsd(entry, prices = GEMINI_PRICES_USD_PER_MTOK) {
  const price = priceFor(entry, prices);
  if (!price) return null;
  const input = n(entry.inputTokens);
  const cached = Math.min(n(entry.cachedTokens), input);
  const output = n(entry.outputTokens) + n(entry.thinkingTokens);
  return ((input - cached) * price.input + cached * price.cached + output * price.output) / 1_000_000;
}

function bucket() {
  return { calls: 0, unpricedCalls: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, thinkingTokens: 0, costUsd: 0 };
}

function add(target, entry, cost) {
  target.calls += 1;
  target.inputTokens += n(entry.inputTokens);
  target.outputTokens += n(entry.outputTokens);
  target.cachedTokens += n(entry.cachedTokens);
  target.thinkingTokens += n(entry.thinkingTokens);
  if (cost === null) target.unpricedCalls += 1;
  else target.costUsd += cost;
}

/** Parses JSONL text; malformed lines are counted, never fatal. */
export function parseLedger(text) {
  const entries = [];
  let malformed = 0;
  for (const line of String(text).split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry && typeof entry === 'object') entries.push(entry); else malformed += 1;
    } catch { malformed += 1; }
  }
  return { entries, malformed };
}

/** Aggregates entries into per-workload and per-client totals (USD and ILS) plus flagged clients. */
export function buildReport(entries, { prices = GEMINI_PRICES_USD_PER_MTOK, usdToIls = USD_TO_ILS, flagIls = CLIENT_MONTHLY_FLAG_ILS } = {}) {
  const total = bucket();
  const byWorkload = {};
  const byClient = {};
  for (const entry of entries) {
    const cost = entryCostUsd(entry, prices);
    const workload = typeof entry.workload === 'string' && entry.workload ? entry.workload : 'unspecified';
    const client = typeof entry.clientId === 'string' && entry.clientId ? entry.clientId : '(no client)';
    add(total, entry, cost);
    add(byWorkload[workload] ??= bucket(), entry, cost);
    add(byClient[client] ??= bucket(), entry, cost);
  }
  const withIls = b => ({ ...b, costIls: b.costUsd * usdToIls });
  const sortByCost = obj => Object.fromEntries(Object.entries(obj).sort(([a, x], [b, y]) => y.costUsd - x.costUsd || a.localeCompare(b)).map(([k, v]) => [k, withIls(v)]));
  const clients = sortByCost(byClient);
  const flaggedClients = Object.entries(clients)
    .filter(([client, b]) => client !== '(no client)' && b.costIls > flagIls)
    .map(([client, b]) => ({ clientId: client, costIls: b.costIls }));
  return { total: withIls(total), byWorkload: sortByCost(byWorkload), byClient: clients, flaggedClients, usdToIls, flagIls };
}

function parseArgs(argv) {
  const out = { month: new Date().toISOString().slice(0, 7), dir: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : argv[i + 1];
    if (arg.startsWith('--month')) { out.month = value; if (!arg.includes('=')) i += 1; }
    else if (arg.startsWith('--dir')) { out.dir = value; if (!arg.includes('=')) i += 1; }
    else if (arg === '--json') out.json = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(out.month ?? '')) throw new Error(`--month must be YYYY-MM (got ${out.month})`);
  return out;
}

/**
 * The WARNING line for calls the totals leave out (no price row), naming their provider:model, or null when every call
 * is priced. Printed so an unpriced model can never pass silently as a $0 month.
 */
export function unpricedWarning(entries, prices = GEMINI_PRICES_USD_PER_MTOK) {
  const counts = new Map();
  for (const entry of entries) {
    if (entryCostUsd(entry, prices) !== null) continue;
    const key = `${entry?.provider ?? '?'}:${entry?.model ?? '?'}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const detail = [...counts.entries()].map(([key, count]) => `${key} x${count}`).join(', ');
  return `WARNING: ${total} unpriced call(s) are NOT in the totals (${detail}). Add a price row to GEMINI_PRICES_USD_PER_MTOK.`;
}

const usd = v => `$${v.toFixed(4)}`;
const ils = v => `ILS ${v.toFixed(2)}`;

function table(title, rows) {
  const lines = [`\n${title}`];
  for (const [name, b] of Object.entries(rows)) {
    const unpriced = b.unpricedCalls ? ` (${b.unpricedCalls} unpriced)` : '';
    lines.push(`  ${name.padEnd(24)} calls=${String(b.calls).padStart(5)}  in=${b.inputTokens}  out=${b.outputTokens}  cached=${b.cachedTokens}  thinking=${b.thinkingTokens}  ${usd(b.costUsd)}  ${ils(b.costIls)}${unpriced}`);
  }
  return lines.join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const dir = args.dir ? path.resolve(args.dir) : llmUsageDir();
  const file = path.join(dir, `${args.month}.jsonl`);
  const { entries, malformed } = fs.existsSync(file) ? parseLedger(fs.readFileSync(file, 'utf8')) : { entries: [], malformed: 0 };
  const report = buildReport(entries);
  if (args.json) {
    console.log(JSON.stringify({ month: args.month, file, malformed, ...report }, null, 2));
    return 0;
  }
  console.log(`LLM usage ${args.month}  (${file}${fs.existsSync(file) ? '' : ', not found'})`);
  console.log(`Prices: GEMINI_PRICES_USD_PER_MTOK (verify against Google's page). Rate: 1 USD = ${USD_TO_ILS} ILS (fixed).`);
  console.log(`Total: calls=${report.total.calls}  ${usd(report.total.costUsd)}  ${ils(report.total.costIls)}${report.total.unpricedCalls ? `  (${report.total.unpricedCalls} unpriced calls)` : ''}${malformed ? `  (${malformed} malformed lines skipped)` : ''}`);
  const warning = unpricedWarning(entries);
  if (warning) console.log(warning);
  console.log(table('By workload', report.byWorkload));
  console.log(table('By client', report.byClient));
  if (report.flaggedClients.length) {
    console.log(`\nFLAGGED (over ILS ${CLIENT_MONTHLY_FLAG_ILS} this month):`);
    for (const flag of report.flaggedClients) console.log(`  ${flag.clientId}  ${ils(flag.costIls)}`);
  } else {
    console.log(`\nNo client over ILS ${CLIENT_MONTHLY_FLAG_ILS} this month.`);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 2; }
}
