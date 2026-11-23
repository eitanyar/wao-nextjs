#!/usr/bin/env node
// Site Bot pilot: staff review pre-flight of one generated researched site (one-page Markdown sheet + PASS/WARN/FAIL).
// Background: docs/reviews/site-bot-mvp-audit-review-fable52-2026-11-24.md sections 2 (P1-4), 3 (P1-A), 5 and 6.
//
//   npx tsc -p tsconfig.test.json        # builds dist/ (the same build `npm run test` uses)
//   node scripts/site-bot/review-preflight.mjs <slug> [--sites-dir <dir>] [--research-dir <dir>]
//     [--peers-dir <dir>]... [--events <events.json>] [--audits-dir <dir>] [--out-dir <dir>] [--date YYYY-MM-DD]
//
// Defaults: sites dir = WAO_SITES_DIR or data/sites (dataRoots.ts); research dir = <sites-dir>/../site-research when
// --sites-dir is given and that exists, else WAO_SITE_RESEARCH_DIR or data/site-research; peers = the sites dir; audits =
// data/audits; out = docs/reviews/site-preflight. Writes ONE file: <out-dir>/<slug>-<date>.md. Exit 1 on any FAIL.
//
// Read-only over all data: every data file is opened O_RDONLY; the out dir may not sit inside data/. No model or paid API
// call is made. HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const MAX_RECORD_BYTES = 16 * 1024 * 1024;
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function usage(message) {
  if (message) console.error(`error: ${message}`);
  console.error('Usage: node scripts/site-bot/review-preflight.mjs <slug> [--sites-dir <dir>] [--research-dir <dir>] [--peers-dir <dir>]... [--events <file>] [--audits-dir <dir>] [--out-dir <dir>] [--date YYYY-MM-DD]');
  process.exit(2);
}

function parseArgs(argv) {
  const options = { slug: '', sitesDir: '', researchDir: '', peersDirs: [], events: '', auditsDir: '', outDir: '', date: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { if (options.slug) usage('one slug only'); options.slug = arg; continue; }
    const value = argv[++i];
    if (!value || value.startsWith('--')) usage(`${arg} needs a value`);
    if (arg === '--sites-dir') options.sitesDir = path.resolve(value);
    else if (arg === '--research-dir') options.researchDir = path.resolve(value);
    else if (arg === '--peers-dir') options.peersDirs.push(path.resolve(value));
    else if (arg === '--events') options.events = path.resolve(value);
    else if (arg === '--audits-dir') options.auditsDir = path.resolve(value);
    else if (arg === '--out-dir') options.outDir = path.resolve(value);
    else if (arg === '--date') options.date = value;
    else usage(`unknown option ${arg}`);
  }
  if (!SAFE_SLUG.test(options.slug)) usage('a lowercase slug is required');
  if (options.date && !/^\d{4}-\d{2}-\d{2}$/.test(options.date)) usage('--date must be YYYY-MM-DD');
  return options;
}

function loadDist(relative) {
  const file = path.join(root, 'dist', relative);
  if (!fs.existsSync(file)) {
    console.error(`error: ${path.relative(root, file)} is missing. Build it first: npx tsc -p tsconfig.test.json`);
    process.exit(2);
  }
  return require(file);
}

/** Read-only regular-file read (no symlinks); null when absent. */
function readFile(file) {
  let fd;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`${file}: cannot open read-only (${error.code}).`);
  }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw new Error(`${file}: not a regular file.`);
    if (stat.size > MAX_RECORD_BYTES) throw new Error(`${file}: too large.`);
    return fs.readFileSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function readJson(file) {
  const bytes = readFile(file);
  if (!bytes) return null;
  try { return { bytes, value: JSON.parse(bytes.toString('utf8')) }; } catch { return { bytes, value: undefined }; }
}

const isResearched = value => value && typeof value === 'object' && typeof value.slug === 'string' && Array.isArray(value.researchedPages) && value.researchedPages.length > 0;

function dossierFor(researchDir, researchId) {
  if (typeof researchId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(researchId)) return { dossier: null, dossierPath: null };
  const dossierPath = path.join(researchDir, researchId, 'dossier.json');
  const loaded = readJson(dossierPath);
  return loaded?.value ? { dossier: loaded.value, dossierPath } : { dossier: null, dossierPath: null };
}

function auditCandidates(auditsDir, placeId) {
  if (typeof placeId !== 'string' || !placeId || placeId.startsWith('fixture-') || !fs.existsSync(auditsDir)) return [];
  const out = [];
  for (const name of fs.readdirSync(auditsDir).filter(file => file.endsWith('.json')).sort()) {
    const loaded = readJson(path.join(auditsDir, name));
    for (const candidate of loaded?.value?.candidates ?? []) {
      if (candidate?.placeId === placeId) out.push({ placeId, hasWebsite: candidate.hasWebsite === true, auditPath: path.join(auditsDir, name) });
    }
  }
  return out;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const { sitesDir: defaultSitesDir, siteResearchDir } = loadDist('lib/dataRoots.js');
  const { runPreflight } = loadDist('lib/site-bot/reviewPreflight.js');

  const sitesDir = options.sitesDir || defaultSitesDir();
  const sibling = path.join(path.dirname(sitesDir), 'site-research');
  const researchDir = options.researchDir || (options.sitesDir && fs.existsSync(sibling) ? sibling : siteResearchDir());
  const peersDirs = options.peersDirs.length ? options.peersDirs : [sitesDir];
  const auditsDir = options.auditsDir || path.join(root, 'data', 'audits');
  const outDir = options.outDir || path.join(root, 'docs', 'reviews', 'site-preflight');
  const dataDir = path.join(root, 'data');
  if (outDir === dataDir || outDir.startsWith(`${dataDir}${path.sep}`)) usage('--out-dir may not be inside data/');
  const now = new Date();
  const date = options.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const recordPath = path.join(sitesDir, `${options.slug}.json`);
  const loaded = readJson(recordPath);
  if (!loaded) usage(`no site record at ${recordPath}`);
  if (!isResearched(loaded.value)) usage(`${recordPath} is not a researched site record (no researchedPages)`);
  const record = loaded.value;
  const { dossier, dossierPath } = dossierFor(researchDir, record.researchId);

  const peers = [];
  for (const dir of peersDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).filter(file => file.endsWith('.json')).sort()) {
      const peerPath = path.join(dir, name);
      if (peerPath === recordPath) continue;
      const peer = readJson(peerPath);
      if (!isResearched(peer?.value) || peer.value.slug === record.slug) continue;
      const peerDossier = dossierFor(fs.existsSync(path.join(path.dirname(dir), 'site-research')) ? path.join(path.dirname(dir), 'site-research') : researchDir, peer.value.researchId).dossier;
      peers.push({ record: peer.value, dossier: peerDossier, recordPath: peerPath });
    }
  }

  let events = null;
  if (options.events) {
    const loadedEvents = readJson(options.events);
    if (!Array.isArray(loadedEvents?.value)) usage(`${options.events} is not a JSON array of copy events`);
    events = loadedEvents.value;
  }

  const result = runPreflight({
    record,
    recordBytes: loaded.bytes,
    recordPath,
    dossier,
    dossierPath,
    peers,
    events,
    eventsPath: events ? options.events : null,
    auditCandidates: auditCandidates(auditsDir, record.collectedData?.placeId),
    date,
  });

  fs.mkdirSync(outDir, { recursive: true });
  const sheetPath = path.join(outDir, `${record.slug}-${date}.md`);
  fs.writeFileSync(sheetPath, result.sheet, 'utf8');

  for (const check of result.checks) console.log(`${check.status.padEnd(4)}  ${check.title}`);
  const top = result.similarity.top[0];
  console.log(`${result.similarity.status.padEnd(4)}  Cross-client similarity (${result.similarity.peerCount} same-trade peers${top ? `; top ${top.slug} jaccard ${top.jaccard.toFixed(3)}, run ${top.longestRun}` : ''})`);
  console.log(`\nOverall: ${result.status}\nSheet: ${sheetPath}`);
  process.exit(result.status === 'FAIL' ? 1 : 0);
}

main();
