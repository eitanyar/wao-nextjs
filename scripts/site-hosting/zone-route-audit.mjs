#!/usr/bin/env node
// Read-only audit: every proxied record on wao.co.il must be a tenant, the CNAME target / fallback origin, or an
// excluded WAO host with a Worker = None route. Fails (exit 1) otherwise. HEBREW-SAFETY: ZERO Hebrew bytes.
// Design: docs/missions/site-bot-shared-worker-hosting-2026-11-12.md (Risk 3).
//
//   node --env-file=.env.local scripts/site-hosting/zone-route-audit.mjs [--probe] [--out DIR] [--json]
//
// --probe  also HEADs https://{host}/ for every proxied host and records status, server and x-wao-site (the
//          before/after non-regression evidence for acceptance 2). Saved to --out when given.
// Uses CLOUDFLARE_SITES_API_TOKEN if set, else CLOUDFLARE_API_TOKEN. GET requests only.
import fs from 'node:fs';
import path from 'node:path';
import {
  CATCH_ALL_PATTERN, EXCLUDED_HOSTS, WORKER, ZONE_NAME, adsLpSlugs, cfClient, classifyRecord, ensureDir, errorText, parseArgs, siteSlugs, stamp,
} from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const token = process.env.CLOUDFLARE_SITES_API_TOKEN?.trim() || process.env.CLOUDFLARE_API_TOKEN?.trim();
const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
if (!token || !zoneId) {
  console.error('Needs CLOUDFLARE_ZONE_ID and CLOUDFLARE_SITES_API_TOKEN or CLOUDFLARE_API_TOKEN.');
  process.exit(2);
}
const cf = cfClient({ token, apply: false });

async function probe(host) {
  try {
    const res = await fetch(`https://${host}/`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    return { status: res.status, server: res.headers.get('server'), location: res.headers.get('location'), xWaoSite: res.headers.get('x-wao-site') };
  } catch (error) {
    return { error: error.cause?.code ?? error.message };
  }
}

async function main() {
  const tenants = new Set(siteSlugs());
  const adsLps = new Set(adsLpSlugs());
  const dns = await cf.getAll(`/zones/${zoneId}/dns_records`);
  if (!dns.ok) {
    console.error(`DNS list failed: ${errorText(dns)}`);
    return 2;
  }
  const routes = await cf.getAll(`/zones/${zoneId}/workers/routes`);
  const routesReadable = routes.ok;
  const routeByPattern = new Map((routes.result ?? []).map(r => [r.pattern, r]));

  const rows = [];
  for (const record of dns.result.sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type))) {
    const c = classifyRecord(record, { tenants, adsLps });
    let ok = c.ok;
    let note = c.note ?? '';
    if (c.needsRoute) {
      const route = routeByPattern.get(c.needsRoute);
      if (!routesReadable) { ok = false; note = `exclusion route ${c.needsRoute} UNVERIFIED (routes unreadable: ${errorText(routes)})`; }
      else if (!route) { ok = false; note = `exclusion route ${c.needsRoute} MISSING`; }
      else if (route.script) { ok = false; note = `exclusion route ${c.needsRoute} runs ${route.script}`; }
      else note = `exclusion route ${c.needsRoute} present (Worker = None)`;
    } else if (!ok && record.proxied) {
      // Hosts excluded at provision time with --exclude (old test / ads-LP Pages hosts) are covered by their own
      // Worker = None route even though they are not in EXCLUDED_HOSTS.
      const pattern = `${String(record.name).toLowerCase()}/*`;
      const route = routeByPattern.get(pattern);
      if (routesReadable && route && !route.script) { ok = true; note = `${c.kind}: extra exclusion route ${pattern} present (Worker = None)`; }
    }
    rows.push({ name: record.name, type: record.type, content: record.content, proxied: Boolean(record.proxied), kind: c.kind, ok, note });
  }

  const findings = [];
  if (routesReadable) {
    for (const r of routes.result) {
      if (r.script === WORKER && r.pattern !== CATCH_ALL_PATTERN) findings.push(`route ${r.pattern} → ${WORKER} is not the catch-all: review`);
      if (r.script && r.script !== WORKER) findings.push(`route ${r.pattern} → ${r.script} (foreign script)`);
    }
    const catchAll = routeByPattern.get(CATCH_ALL_PATTERN);
    findings.push(catchAll ? `catch-all ${CATCH_ALL_PATTERN} → ${catchAll.script ?? 'None'}` : `catch-all ${CATCH_ALL_PATTERN} not created yet (Worker serves nothing; zone unaffected)`);
  } else {
    findings.push(`routes unreadable with this token (${errorText(routes)}): exclusion routes cannot be verified`);
  }

  const proxied = rows.filter(r => r.proxied);
  if (args.probe) {
    for (const row of proxied) row.probe = await probe(row.name);
  }

  const failures = rows.filter(r => !r.ok);
  const report = { at: new Date().toISOString(), zone: ZONE_NAME, tenants: [...tenants], excludedHosts: EXCLUDED_HOSTS, routesReadable,
    routes: routes.result ?? [], records: rows, findings, failures: failures.map(f => f.name), pass: failures.length === 0 };

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`zone-route-audit — ${ZONE_NAME}: ${rows.length} records, ${proxied.length} proxied, tenants known from data/sites: ${[...tenants].join(', ') || 'none'}`);
    for (const r of proxied) {
      const p = r.probe ? ` | probe ${r.probe.error ?? `${r.probe.status} server=${r.probe.server ?? '-'} x-wao-site=${r.probe.xWaoSite ?? '-'}`}` : '';
      console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(34)} ${r.type.padEnd(5)} ${String(r.content).slice(0, 34).padEnd(34)} ${r.kind}${r.note ? ` — ${r.note}` : ''}${p}`);
    }
    console.log(`  (${rows.length - proxied.length} DNS-only records not affected by Worker routes)`);
    for (const f of findings) console.log(`  NOTE  ${f}`);
    console.log(failures.length ? `\nFAIL: ${failures.length} proxied host(s) not covered: ${failures.map(f => f.name).join(', ')}` : '\nPASS');
  }
  if (typeof args.out === 'string') {
    const dir = ensureDir(path.resolve(args.out));
    const file = path.join(dir, `zone-route-audit-${stamp()}.json`);
    fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`saved ${file}`);
  }
  return failures.length ? 1 : 0;
}

main().then(code => process.exit(code), error => { console.error(error); process.exit(1); });
