#!/usr/bin/env node
// Market scanner engine CLI. No LLM calls.
//   node --env-file=.env.local scripts/market-scan/run.mjs --stage=1 [--estimate] [--offline] [--cap=USD]
//   node --env-file=.env.local scripts/market-scan/run.mjs --stage=pilot [...]
//   node --env-file=.env.local scripts/market-scan/run.mjs --stage=m4 [--estimate] [--offline] [--cap=USD] [--no-homepage]
// Flags for tests / verifier: --config-dir= --cache-dir= --out-dir= --private-dir= --ledger-dir=
// Cached requests never touch the network. The USD cap (caps_usd: stage1 / stage2-pilot /
// stage2-full) is checked on the worst case before the first call and again before every paid
// call; it can be lowered with --cap but never raised above config/market-scanner/run-config.json.
// Stage 2 = two steps (spec 2.1/2.11): Local Finder at the scored points for every cell -> step-1
// gate (kill at S3_step1 >= 0.75; haredi-flagged cells stop here) -> Maps x 2 + organic for
// survivors only. M4 first re-buys the 170 Stage-1 organic SERPs (2.3). --offline replays the
// cache only: survivors without a cached step 2 are reported `pending_step2`.
// Run-day prices: scripts/market-scan/price-check.mjs (free user_data).
import path from 'node:path';
import { runEngine } from './lib/engine.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : true];
}));

try {
  const summary = await runEngine({
    stage: args.stage ?? '1',
    configDir: path.resolve(ROOT, args['config-dir'] ?? 'config/market-scanner'),
    cacheDir: path.resolve(ROOT, args['cache-dir'] ?? 'data/market-scan/cache'),
    outDir: path.resolve(ROOT, args['out-dir'] ?? 'docs/research/site-bot/market-scan'),
    privateDir: path.resolve(ROOT, args['private-dir'] ?? 'data/market-scan/private'),
    ledgerDir: path.resolve(ROOT, args['ledger-dir'] ?? 'data/market-scan/runs'),
    cap: args.cap !== undefined ? Number(args.cap) : undefined,
    offline: Boolean(args.offline),
    estimateOnly: Boolean(args.estimate),
    token: process.env.DATAFORSEO_TOKEN,
    // R8 free homepage check (own HTTP GET, robots.txt respected); --no-homepage skips it.
    siteFetchImpl: args['no-homepage'] ? null : globalThis.fetch,
    log: msg => process.stderr.write(`${msg}\n`),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 1)}\n`);
} catch (err) {
  process.stderr.write(`${err.name}: ${err.message}\n`);
  if (err.ledger) process.stderr.write(`${JSON.stringify(err.ledger)}\n`);
  process.exit(err.name === 'BudgetExceededError' ? 3 : 1);
}
