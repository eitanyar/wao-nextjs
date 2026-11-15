#!/usr/bin/env node
// Site Bot shared-Worker hosting: idempotent one-time setup on wao.co.il.
// Design: docs/missions/site-bot-shared-worker-hosting-2026-11-12.md. HEBREW-SAFETY: ZERO Hebrew bytes.
//
//   node --env-file=.env.local scripts/site-hosting/provision.mjs            # dry run (default): GETs only, prints the plan
//   node --env-file=.env.local scripts/site-hosting/provision.mjs --apply    # writes; needs CLOUDFLARE_SITES_API_TOKEN
//
// GET-first, never deletes, never modifies an existing object that differs (reported as a conflict for a human).
// Order matters and is enforced: bucket → fallback-origin DNS → CNAME target → fallback origin setting →
// exclusion routes (Worker = None) → catch-all "*/*" → wao-sites (only when every exclusion exists and the Worker
// script is deployed). A converged zone prints "no changes".
import {
  BUCKET, CATCH_ALL_PATTERN, CNAME_TARGET, EXCLUDED_HOSTS, FALLBACK_ORIGIN, FALLBACK_ORIGIN_ADDRESS, WORKER, ZONE_NAME,
  cfClient, errorText, parseArgs,
} from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === true;
const extraExclusions = typeof args.exclude === 'string' ? args.exclude.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
const exclusions = [...new Set([...EXCLUDED_HOSTS, ...extraExclusions])];

const sitesToken = process.env.CLOUDFLARE_SITES_API_TOKEN?.trim();
const fallbackToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (apply && !sitesToken) {
  console.error('--apply needs CLOUDFLARE_SITES_API_TOKEN (the scoped wao-sites-hosting token). Refusing.');
  process.exit(2);
}
const token = sitesToken || fallbackToken;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
if (!token || !accountId || !zoneId) {
  console.error('Needs CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID and a token (CLOUDFLARE_SITES_API_TOKEN, or CLOUDFLARE_API_TOKEN for a dry run).');
  process.exit(2);
}
const cf = cfClient({ token, apply });

/** @type {Array<{ id: string, state: 'ok'|'create'|'blocked'|'conflict', detail: string, run?: () => Promise<string> }>} */
const plan = [];
const add = step => { plan.push(step); return step; };

async function dnsStep(id, name, type, content) {
  const res = await cf.request('GET', `/zones/${zoneId}/dns_records?name.exact=${encodeURIComponent(name)}&per_page=5`);
  if (!res.ok) return add({ id, state: 'blocked', detail: `DNS read failed (${errorText(res)})` });
  const records = res.result ?? [];
  const exact = records.find(r => r.type === type && r.content === content && r.proxied === true);
  if (exact && records.length === 1) return add({ id, state: 'ok', detail: `${name} ${type} ${content} proxied` });
  if (records.length) {
    return add({ id, state: 'conflict', detail: `${name} already has ${records.map(r => `${r.type} ${r.content}${r.proxied ? ' (proxied)' : ''}`).join(', ')}; fix by hand` });
  }
  return add({
    id, state: 'create', detail: `POST DNS ${name} ${type} ${content} proxied`,
    run: async () => {
      const created = await cf.request('POST', `/zones/${zoneId}/dns_records`, { type, name, content, proxied: true, ttl: 1, comment: 'wao-sites hosting (provision.mjs)' });
      if (!created.ok) throw new Error(`DNS create ${name}: ${errorText(created)}`);
      return `created ${created.result?.id}`;
    },
  });
}

async function main() {
  console.log(`provision.mjs — ${apply ? 'APPLY' : 'DRY RUN (no writes)'} — zone ${ZONE_NAME} (${zoneId}), token: ${sitesToken ? 'CLOUDFLARE_SITES_API_TOKEN' : 'CLOUDFLARE_API_TOKEN (read-only use)'}`);

  // 1. R2 bucket
  const bucket = await cf.request('GET', `/accounts/${accountId}/r2/buckets/${BUCKET}`);
  if (bucket.ok) add({ id: 'r2-bucket', state: 'ok', detail: `bucket ${BUCKET} exists` });
  else if (bucket.errors.some(e => e.code === 10042)) add({ id: 'r2-bucket', state: 'blocked', detail: 'R2 is not enabled on the account (10042): founder checklist A' });
  else if (bucket.status === 404 || bucket.errors.some(e => e.code === 10006)) {
    add({ id: 'r2-bucket', state: 'create', detail: `POST R2 bucket ${BUCKET}`, run: async () => {
      const created = await cf.request('POST', `/accounts/${accountId}/r2/buckets`, { name: BUCKET });
      if (!created.ok) throw new Error(`bucket create: ${errorText(created)}`);
      return 'created';
    } });
  } else add({ id: 'r2-bucket', state: 'blocked', detail: `bucket read failed (${errorText(bucket)})` });

  // 2–3. Fallback-origin record (originless) and the CNAME target owners point www at.
  await dnsStep('dns-fallback-origin', FALLBACK_ORIGIN, 'AAAA', FALLBACK_ORIGIN_ADDRESS);
  await dnsStep('dns-cname-target', CNAME_TARGET, 'CNAME', FALLBACK_ORIGIN);

  // 4. Cloudflare for SaaS fallback origin setting.
  const fallback = await cf.request('GET', `/zones/${zoneId}/custom_hostnames/fallback_origin`);
  if (fallback.ok && fallback.result?.origin === FALLBACK_ORIGIN) {
    add({ id: 'saas-fallback-origin', state: 'ok', detail: `fallback origin ${FALLBACK_ORIGIN} (${fallback.result.status ?? 'status ?'})` });
  } else if (fallback.ok && fallback.result?.origin) {
    add({ id: 'saas-fallback-origin', state: 'conflict', detail: `fallback origin is ${fallback.result.origin}; fix by hand` });
  } else if (fallback.status === 403 || fallback.errors.some(e => e.code === 10000)) {
    add({ id: 'saas-fallback-origin', state: 'blocked', detail: `fallback origin unreadable (${errorText(fallback)}): enable Custom Hostnames (checklist B) and use the hosting token (checklist D)` });
  } else {
    add({ id: 'saas-fallback-origin', state: 'create', detail: `PUT fallback origin ${FALLBACK_ORIGIN}`, run: async () => {
      const put = await cf.request('PUT', `/zones/${zoneId}/custom_hostnames/fallback_origin`, { origin: FALLBACK_ORIGIN });
      if (!put.ok) throw new Error(`fallback origin: ${errorText(put)}`);
      return `set (${put.result?.status ?? '?'})`;
    } });
  }

  // 5. Worker script must exist before the catch-all route points at it (wrangler deploy is a separate, human step).
  const script = await cf.request('GET', `/accounts/${accountId}/workers/scripts/${WORKER}/settings`);
  const workerDeployed = script.ok;
  add({ id: 'worker-script', state: workerDeployed ? 'ok' : 'blocked',
    detail: workerDeployed ? `Worker ${WORKER} deployed` : `Worker ${WORKER} not readable/deployed (${errorText(script)}): run \`wrangler deploy -c workers/wao-sites/wrangler.jsonc\` after the exclusion routes exist` });

  // 6. Routes: exclusions (Worker = None) first, catch-all last.
  const routes = await cf.getAll(`/zones/${zoneId}/workers/routes`);
  if (!routes.ok) {
    add({ id: 'routes', state: 'blocked', detail: `routes unreadable (${errorText(routes)}): hosting token needs Zone · Workers Routes · Edit` });
  } else {
    const byPattern = new Map(routes.result.map(r => [r.pattern, r]));
    let exclusionsReady = true;
    for (const host of exclusions) {
      const pattern = `${host}/*`;
      const existing = byPattern.get(pattern);
      if (existing && !existing.script) add({ id: `route-exclude ${pattern}`, state: 'ok', detail: 'Worker = None' });
      else if (existing) { exclusionsReady = false; add({ id: `route-exclude ${pattern}`, state: 'conflict', detail: `route runs script ${existing.script}; fix by hand` }); }
      else {
        add({ id: `route-exclude ${pattern}`, state: 'create', detail: `POST route ${pattern} (Worker = None)`, run: async () => {
          const created = await cf.request('POST', `/zones/${zoneId}/workers/routes`, { pattern });
          if (!created.ok) throw new Error(`route ${pattern}: ${errorText(created)}`);
          return `created ${created.result?.id}`;
        } });
      }
    }
    for (const r of routes.result) {
      if (r.script === WORKER && r.pattern !== CATCH_ALL_PATTERN) add({ id: `route ${r.pattern}`, state: 'conflict', detail: `unexpected route to ${WORKER}; review by hand` });
    }
    const catchAll = byPattern.get(CATCH_ALL_PATTERN);
    if (catchAll?.script === WORKER) add({ id: `route ${CATCH_ALL_PATTERN}`, state: 'ok', detail: `→ ${WORKER}` });
    else if (catchAll) add({ id: `route ${CATCH_ALL_PATTERN}`, state: 'conflict', detail: `catch-all runs ${catchAll.script ?? 'None'}; fix by hand` });
    else if (!workerDeployed || !exclusionsReady) add({ id: `route ${CATCH_ALL_PATTERN}`, state: 'blocked', detail: `waits for the Worker deploy and every exclusion route` });
    else {
      add({ id: `route ${CATCH_ALL_PATTERN}`, state: 'create', detail: `POST route ${CATCH_ALL_PATTERN} → ${WORKER} (LAST)`, run: async () => {
        const created = await cf.request('POST', `/zones/${zoneId}/workers/routes`, { pattern: CATCH_ALL_PATTERN, script: WORKER });
        if (!created.ok) throw new Error(`catch-all route: ${errorText(created)}`);
        return `created ${created.result?.id}`;
      } });
    }
  }

  const width = Math.max(...plan.map(s => s.id.length));
  console.log('\nPlan:');
  for (const step of plan) console.log(`  ${step.state.toUpperCase().padEnd(8)} ${step.id.padEnd(width)}  ${step.detail}`);
  const changes = plan.filter(s => s.state === 'create');
  const blocked = plan.filter(s => s.state === 'blocked' || s.state === 'conflict');
  console.log(`\nSummary: ${plan.filter(s => s.state === 'ok').length} ok, ${changes.length} to create, ${blocked.length} blocked/conflict.`);
  if (!changes.length && !blocked.length) {
    console.log('no changes');
    return 0;
  }
  if (!apply) {
    console.log(changes.length ? 'Dry run: nothing was written. Re-run with --apply (and CLOUDFLARE_SITES_API_TOKEN) to create the steps above.' : 'Dry run: nothing to create until the blocked steps are resolved.');
    return blocked.length ? 3 : 0;
  }
  for (const step of plan) {
    if (step.state !== 'create') continue;
    if (step.id.startsWith('route */*') && blocked.length) { console.log(`  SKIP     ${step.id} (blocked steps remain)`); continue; }
    try {
      console.log(`  APPLY    ${step.id}: ${await step.run()}`);
    } catch (error) {
      console.error(`  FAILED   ${step.id}: ${error.message}. Stopping; re-run after fixing (idempotent).`);
      return 1;
    }
  }
  console.log('Applied. Re-run without --apply: it must print "no changes". Then run zone-route-audit.mjs --probe.');
  return blocked.length ? 3 : 0;
}

main().then(code => process.exit(code), error => { console.error(error); process.exit(1); });
