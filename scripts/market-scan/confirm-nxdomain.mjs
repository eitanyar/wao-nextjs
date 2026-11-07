#!/usr/bin/env node
// Spec 3.5: re-confirms every cached homepage record that failed on DNS NXDOMAIN with a second
// resolver over DNS-over-HTTPS (dns.google, then cloudflare-dns.com). Free network calls only -
// never DataForSEO. Confirmed -> `nxdomain_confirmed: true` (scored as site_dead). A name that
// resolves elsewhere is re-fetched once with the R8 homepage check (robots.txt first, same UA).
// Idempotent: a record that already carries `doh_status` is skipped.
//   node scripts/market-scan/confirm-nxdomain.mjs [--cache-dir=] [--private-dir=] [--config-dir=]
import path from 'node:path';
import { loadConfig } from './lib/engine.mjs';
import { homepageCache, homepageTextStore, confirmNxdomains } from './lib/homepage.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : true];
}));
const { run } = loadConfig(path.resolve(ROOT, args['config-dir'] ?? 'config/market-scanner'));
const hc = run.homepage_check;
const cache = homepageCache(path.resolve(ROOT, args['cache-dir'] ?? 'data/market-scan/cache'), hc);
const textStore = homepageTextStore(path.resolve(ROOT, args['private-dir'] ?? 'data/market-scan/private'), hc);
const out = await confirmNxdomains({ cache, textStore, fetchImpl: globalThis.fetch, cfg: hc, log: m => process.stderr.write(`${m}\n`) });
process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
