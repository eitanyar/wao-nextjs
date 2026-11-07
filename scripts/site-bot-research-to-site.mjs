#!/usr/bin/env node
// Site Bot operator action (paid-journey v2 M2a, B3): one business's owner answers ->
// research -> copy_ready -> page briefs -> generated site record, via the internal
// runResearchToSite(). Admin/operator only; the customer trigger is M2b.
//
//   npx tsc -p tsconfig.test.json   # builds dist/ (same build `npm run test` uses)
//   env -u QWEN_BASE_URL -u QWEN_API_KEY -u QWEN_CHAT_MODEL \
//     SITE_BOT_RESEARCH_PROVIDERS=fixture \
//     WAO_SITES_DIR=$PWD/scratch/m2a/data/sites WAO_SITE_RESEARCH_DIR=$PWD/scratch/m2a/data/site-research \
//     node --env-file=.env.local scripts/site-bot-research-to-site.mjs \
//       --data <collectedData.json> --slug <slug> --research-id <id> --out <dir> [--ledger <file.jsonl>] [--cap-usd 3]
//
// Safety rails (hard failures, not warnings):
// - research runs on fixture providers only (SITE_BOT_RESEARCH_PROVIDERS=fixture);
// - WAO_SITES_DIR and WAO_SITE_RESEARCH_DIR must be set and must not be inside data/;
// - every outbound fetch except the Qwen token-plan host is blocked;
// - QWEN_BASE_URL must be the token-plan endpoint (a stale shell dashscope-intl export is refused);
// - cumulative LLM spend across the ledger is capped (default US$3); a call that would
//   start past the cap is refused before it is sent.
// Writes: <out>/outcome.json, usage.json, events.json, and when generated site-record.json
// (verbatim generated copy) plus copy.txt (the same strings, one field per line, unedited).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PRICE_IN_PER_TOKEN = 2 / 1e6; // qwen3.8-max token plan list price, US$ per input token
const PRICE_OUT_PER_TOKEN = 6 / 1e6; // US$ per output token (reasoning tokens bill as output)

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : fallback;
}
function die(message, code = 2) {
  console.error(`[research-to-site] ${message}`);
  process.exit(code);
}

const dataFile = arg('data');
const slug = arg('slug');
const researchId = arg('research-id');
const outDir = arg('out');
const ledger = arg('ledger');
const capUsd = Number(arg('cap-usd', '3'));
if (!dataFile || !slug || !researchId || !outDir) die('usage: --data <json> --slug <slug> --research-id <id> --out <dir> [--ledger <jsonl>] [--cap-usd 3]');

if (process.env.SITE_BOT_RESEARCH_PROVIDERS !== 'fixture') die('SITE_BOT_RESEARCH_PROVIDERS=fixture is required (no live DataForSEO/NeuronWriter from this script).');
const dataDir = path.join(root, 'data');
for (const key of ['WAO_SITES_DIR', 'WAO_SITE_RESEARCH_DIR']) {
  const value = process.env[key];
  if (!value) die(`${key} must be set (outside data/).`);
  const resolved = path.resolve(value);
  if (resolved === dataDir || resolved.startsWith(`${dataDir}${path.sep}`)) die(`${key} must not be inside data/ (got ${resolved}).`);
}
const qwenBase = process.env.QWEN_BASE_URL ?? '';
if (!/^https:\/\/token-plan\.[a-z0-9-]+\.maas\.aliyuncs\.com\//.test(qwenBase)) die('QWEN_BASE_URL is not the token-plan endpoint (stale shell export? run with env -u QWEN_BASE_URL -u QWEN_API_KEY).');
const qwenHost = new URL(qwenBase).hostname;

const blocked = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url;
  let host = '';
  try { host = new URL(url).hostname; } catch { /* unparsable URL is blocked */ }
  if (host !== qwenHost) {
    blocked.push({ host, method: init?.method ?? 'GET' });
    return Promise.reject(new Error(`outbound blocked: ${host}`));
  }
  return realFetch(input, init);
};

const entry = path.join(root, 'dist/lib/site-bot/researchToSite.js');
if (!fs.existsSync(entry)) die('dist/ build missing: run `npx tsc -p tsconfig.test.json` first.');
fs.writeFileSync(path.join(root, 'dist/package.json'), JSON.stringify({ type: 'commonjs' }));
const { runResearchToSite } = require(entry);
const { callQwenJSON } = require(path.join(root, 'dist/lib/ai/qwen-fast.js'));
const { assertBoundedGeneratedSiteCopy, generateResearchPageCopy } = require(path.join(root, 'dist/lib/lp/researchPageCopy.js'));

function priorSpend() {
  if (!ledger || !fs.existsSync(ledger)) return 0;
  return fs.readFileSync(ledger, 'utf8').split('\n').filter(Boolean)
    .reduce((sum, line) => sum + (JSON.parse(line).costUsd ?? 0), 0);
}

const collectedData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const usage = [];
const events = [];
let spent = priorSpend();
if (spent >= capUsd) die(`spend cap reached: US$${spent.toFixed(4)} >= US$${capUsd}`, 3);

let currentPage = null;
function roleOf(system) {
  if (/repairing specific fields/.test(system)) return 'repair';
  if (/^You are Noa/.test(system)) return 'noa';
  if (/^You are Tamar/.test(system)) return 'tamar';
  return 'other';
}
async function callJson(system, user, options = {}) {
  if (spent >= capUsd) throw new Error(`spend cap reached before call (US$${spent.toFixed(4)})`);
  const role = roleOf(system);
  const started = Date.now();
  return callQwenJSON(system, user, {
    ...options,
    onUsage: u => {
      const costUsd = u.promptTokens * PRICE_IN_PER_TOKEN + u.completionTokens * PRICE_OUT_PER_TOKEN;
      spent += costUsd;
      const row = { at: new Date().toISOString(), slug, researchId, page: currentPage, role, ok: u.ok, model: u.model,
        promptTokens: u.promptTokens, completionTokens: u.completionTokens, reasoningTokens: u.reasoningTokens, costUsd, ms: Date.now() - started };
      usage.push(row);
      if (ledger) fs.appendFileSync(ledger, `${JSON.stringify(row)}\n`);
    },
  });
}

fs.mkdirSync(outDir, { recursive: true });
const startedAt = Date.now();
const outcome = await runResearchToSite({ slug, researchId, collectedData }, {
  // Same generator the orchestration uses by default, wrapped to tag usage rows with the page.
  generateCopy: (brief, data) => {
    currentPage = brief.page.id;
    return generateResearchPageCopy(brief, data, { callJson, onEvent: event => events.push({ page: brief.page.id, ...event }) });
  },
}).catch(error => ({ status: 'failed', step: 'uncaught', reason: String(error?.message ?? error).slice(0, 300) }));

const summary = {
  outcome,
  elapsedMs: Date.now() - startedAt,
  calls: usage.length,
  promptTokens: usage.reduce((s, u) => s + u.promptTokens, 0),
  completionTokens: usage.reduce((s, u) => s + u.completionTokens, 0),
  reasoningTokens: usage.reduce((s, u) => s + u.reasoningTokens, 0),
  costUsd: usage.reduce((s, u) => s + u.costUsd, 0),
  repairs: events.filter(e => e.kind === 'repair' || e.kind === 'stage_retry').length,
  deterministicFixes: events.filter(e => e.kind === 'deterministic_fix').flatMap(e => e.fixes ?? []),
  blockedOutbound: blocked,
};

if (outcome.status === 'generated') {
  const recordPath = path.join(path.resolve(process.env.WAO_SITES_DIR), `${slug}.json`);
  const recordText = fs.readFileSync(recordPath, 'utf8');
  fs.writeFileSync(path.join(outDir, 'site-record.json'), recordText);
  const record = JSON.parse(recordText);
  const lines = [];
  const pageResults = [];
  for (const page of record.researchedPages) {
    let valid = true;
    try { assertBoundedGeneratedSiteCopy(page.copy); } catch { valid = false; }
    pageResults.push({ page: page.opportunityId, valid });
    lines.push(`=== ${page.opportunityId} ${page.targetPath} (${page.classification}) validator=${valid ? 'PASS' : 'FAIL'}`);
    for (const [key, value] of Object.entries(page.copy)) {
      if (Array.isArray(value)) value.forEach((item, i) => lines.push(`${key}[${i}]: ${typeof item === 'string' ? item : JSON.stringify(item)}`));
      else lines.push(`${key}: ${value === null ? 'null' : value}`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(outDir, 'copy.txt'), lines.join('\n'));
  summary.validatorPass = pageResults.every(item => item.valid);
  summary.pages = pageResults;
} else {
  summary.validatorPass = false;
}

fs.writeFileSync(path.join(outDir, 'outcome.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, 'usage.json'), JSON.stringify(usage, null, 2));
fs.writeFileSync(path.join(outDir, 'events.json'), JSON.stringify(events, null, 2));
console.log(JSON.stringify({ slug, status: outcome.status, validatorPass: summary.validatorPass, calls: summary.calls, repairs: summary.repairs,
  fixes: summary.deterministicFixes, costUsd: Number(summary.costUsd.toFixed(4)), totalSpentUsd: Number(spent.toFixed(4)),
  ...(outcome.status !== 'generated' ? { outcome } : {}) }));
process.exit(outcome.status === 'generated' && summary.validatorPass ? 0 : 1);
