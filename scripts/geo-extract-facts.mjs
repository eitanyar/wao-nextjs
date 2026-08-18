/**
 * CLI harness for website fact extraction.
 *
 * Usage:
 *   node scripts/geo-extract-facts.mjs --client=retter
 *   node scripts/geo-extract-facts.mjs --client=retter --urls=a,b,c
 *
 * Merges extracted, verbatim-gated, unconfirmed facts into
 * data/clients/<client>/client.json. Never deletes existing facts and
 * never flips confirmed:true back to false.
 *
 * Hebrew values are written only as runtime copies of fetched page text.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractFactsFromPages, normalize } from './lib/fact-extractor.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => a.slice(2).split('='))
);

const CLIENT_ID = args.client;
if (!CLIENT_ID) {
  console.error('Usage: node scripts/geo-extract-facts.mjs --client=<id> [--urls=a,b,c]');
  process.exit(1);
}

const BASE_DIR = path.resolve(__dirname, `../data/clients/${CLIENT_ID}`);
const CLIENT_FILE = path.join(BASE_DIR, 'client.json');
const PARETO_FILE = path.join(BASE_DIR, 'pareto.json');

function resolveUrls() {
  if (args.urls) {
    return args.urls.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!fs.existsSync(PARETO_FILE)) {
    throw new Error(`Pareto file not found: ${PARETO_FILE}`);
  }
  const pareto = JSON.parse(fs.readFileSync(PARETO_FILE, 'utf8'));
  const seen = new Set();
  const urls = [];
  for (const opp of pareto.opportunities || []) {
    const url = opp.rankingUrl;
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

function mergeFacts(existing, incoming) {
  const next = Array.isArray(existing) ? existing.slice() : [];
  const seen = new Set(
    next
      .map(f => (f && typeof f.value === 'string' ? normalize(f.value) : ''))
      .filter(Boolean)
  );
  let mergedNew = 0;
  for (const fact of incoming) {
    const key = normalize(fact.value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(fact);
    mergedNew += 1;
  }
  return { facts: next, mergedNew };
}

async function main() {
  if (!fs.existsSync(CLIENT_FILE)) {
    throw new Error(`client.json not found: ${CLIENT_FILE}`);
  }

  const urls = resolveUrls();
  const extracted = await extractFactsFromPages(urls);
  const client = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
  const hadFacts = Array.isArray(client.facts);
  const { facts, mergedNew } = mergeFacts(client.facts, extracted.facts);

  if (mergedNew > 0 || hadFacts) {
    client.facts = facts;
    fs.writeFileSync(CLIENT_FILE, JSON.stringify(client, null, 2) + '\n');
  }

  console.log(
    `harvested ${extracted.harvested}, passed-gate ${extracted.passed}, dropped (failed verbatim) ${extracted.dropped}, merged-new ${mergedNew}`
  );
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
