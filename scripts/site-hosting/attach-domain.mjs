#!/usr/bin/env node
// Staff-run own-domain attach (launch version). HEBREW-SAFETY: ZERO Hebrew bytes.
// Design: docs/missions/site-bot-shared-worker-hosting-2026-11-12.md, section 2.
//
//   Pre-check (read-only, DNS-over-HTTPS; no owner access, no Cloudflare API):
//     node scripts/site-hosting/attach-domain.mjs --slug X --domain example.co.il [--precheck] [--out DIR]
//   Attach (writes; needs CLOUDFLARE_SITES_API_TOKEN + CLOUDFLARE_ZONE_ID):
//     node --env-file=.env.local scripts/site-hosting/attach-domain.mjs --slug X --domain example.co.il --apply \
//       [--apex] [--precheck-file FILE] [--timeout-min 30] [--write-record]
//
// --apply: create (GET-first) the custom hostname www.{domain} (and {domain} with --apex), poll every 60 s
// (one no-change PATCH after 5 pending polls resets the validation backoff), live-probe https://www.{domain}/__wao/health,
// and diff MX/TXT against the pre-check snapshot. "Live" = status active + ssl active + health returns this slug over
// valid TLS + MX/TXT byte-identical. Only then is the data/sites record patch printed (written with --write-record).
// We never write the owner's DNS.
import fs from 'node:fs';
import path from 'node:path';
import { CNAME_TARGET, cfClient, ensureDir, errorText, parseArgs, stamp } from './lib.mjs';
import { createRequire } from 'node:module';

const args = parseArgs(process.argv.slice(2));
const slug = typeof args.slug === 'string' ? args.slug.trim() : '';
const rawDomain = typeof args.domain === 'string' ? args.domain.trim().toLowerCase().replace(/\.$/, '') : '';
const domain = rawDomain.startsWith('www.') ? rawDomain.slice(4) : rawDomain;
const apply = args.apply === true;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/.test(slug) || !domain || domain.split('.').length < 2 ||
  !domain.split('.').every(l => LABEL.test(l)) || (apply && (domain === 'wao.co.il' || domain.endsWith('.wao.co.il')))) {
  // A wao.co.il name is never attached as an owner domain; a read-only pre-check of it is allowed (script self-test).
  console.error('Usage: attach-domain.mjs --slug <tenant-slug> --domain <owner-domain> [--precheck|--apply] [--out DIR]');
  process.exit(2);
}
const www = `www.${domain}`;
const outRoot = path.resolve(typeof args.out === 'string' ? args.out : path.join('artifacts', 'site-hosting', 'attach-runs'));
const runDir = ensureDir(path.join(outRoot, domain));

// Certificate authorities Cloudflare for SaaS DV certificates may be issued by. A CAA set that names none blocks issuance.
const CLOUDFLARE_CAS = ['letsencrypt.org', 'pki.goog', 'ssl.com', 'sectigo.com', 'comodoca.com', 'digicert.com'];
const RESOLVERS = {
  cloudflare: (name, type) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
  google: (name, type) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
};

async function doh(resolver, name, type) {
  const res = await fetch(RESOLVERS[resolver](name, type), { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${resolver} DoH ${name} ${type}: HTTP ${res.status}`);
  const data = await res.json();
  const typeNum = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28, CAA: 257 }[type];
  // TXT: resolvers differ in quoting ("a" "b" vs ab); compare the unquoted, joined value.
  const norm = value => (type === 'TXT' ? value.replace(/^"|"$/g, '').replace(/"\s*"/g, '') : value);
  const answers = (data.Answer ?? []).filter(a => a.type === typeNum).map(a => norm(String(a.data))).sort();
  const cnames = (data.Answer ?? []).filter(a => a.type === 5).map(a => String(a.data).replace(/\.$/, '').toLowerCase());
  return { status: data.Status, answers, chain: cnames };
}

async function lookupAll(name, type) {
  const [cloudflare, google] = await Promise.all([doh('cloudflare', name, type), doh('google', name, type)]);
  return { cloudflare, google, agree: JSON.stringify(cloudflare.answers) === JSON.stringify(google.answers) };
}

/** CAA "issue"/"issuewild" values (DoH returns `0 issue "letsencrypt.org"` or a hex form for unknown tags). */
function caaIssuers(answers) {
  return answers.map(a => /\b(issue|issuewild)\s+"([^"]*)"/i.exec(a)).filter(Boolean).map(m => ({ tag: m[1].toLowerCase(), value: m[2].split(';')[0].trim().toLowerCase() }));
}

async function snapshot() {
  const parent = domain.split('.').slice(1).join('.');
  const q = {
    apexNS: await lookupAll(domain, 'NS'),
    apexA: await lookupAll(domain, 'A'),
    apexAAAA: await lookupAll(domain, 'AAAA'),
    apexCNAME: await lookupAll(domain, 'CNAME'),
    MX: await lookupAll(domain, 'MX'),
    TXT: await lookupAll(domain, 'TXT'),
    wwwCNAME: await lookupAll(www, 'CNAME'),
    wwwA: await lookupAll(www, 'A'),
    wwwAAAA: await lookupAll(www, 'AAAA'),
    caaWww: await lookupAll(www, 'CAA'),
    caaApex: await lookupAll(domain, 'CAA'),
    ...(parent.includes('.') ? { caaParent: await lookupAll(parent, 'CAA') } : {}),
  };
  return { at: new Date().toISOString(), domain, www, slug, records: q, mailGuard: mailGuard(q) };
}

/** The byte-comparable part of the snapshot: what must never change because of us. */
function mailGuard(q) {
  return { MX: q.MX.cloudflare.answers, TXT: q.TXT.cloudflare.answers, NS: q.apexNS.cloudflare.answers };
}

async function httpProbe(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    const body = (await res.text()).slice(0, 300);
    return { status: res.status, server: res.headers.get('server'), location: res.headers.get('location'), xWaoSite: res.headers.get('x-wao-site'), body };
  } catch (error) {
    return { error: error.cause?.code ?? error.message };
  }
}

function assess(snap, probes) {
  const flags = [];
  const r = snap.records;
  const ns = r.apexNS.cloudflare.answers.map(s => s.toLowerCase());
  if (!ns.length) flags.push({ level: 'BLOCKER', text: `no NS records for ${domain}: domain not delegated / not registered` });
  if (ns.some(n => n.endsWith('.ns.cloudflare.com.') || n.endsWith('.ns.cloudflare.com'))) flags.push({ level: 'INFO', text: 'owner DNS is on Cloudflare (another account): O2O, supported; the www CNAME may be proxied or DNS-only' });
  if (r.apexCNAME.cloudflare.answers.length) flags.push({ level: 'WARN', text: `apex has a literal CNAME (${r.apexCNAME.cloudflare.answers.join(', ')}): this can break MX; never ask for one` });
  const wwwChain = r.wwwA.cloudflare.chain;
  const wwwTarget = r.wwwCNAME.cloudflare.answers.map(a => a.replace(/\.$/, '').toLowerCase());
  if (wwwTarget.includes(CNAME_TARGET) || wwwChain.includes(CNAME_TARGET)) flags.push({ level: 'OK', text: `${www} already CNAMEs to ${CNAME_TARGET}` });
  else if (wwwTarget.length) flags.push({ level: 'ACTION', text: `${www} is a CNAME to ${wwwTarget.join(', ')}: owner replaces it with CNAME ${CNAME_TARGET}` });
  else if (r.wwwA.cloudflare.answers.length || r.wwwAAAA.cloudflare.answers.length) flags.push({ level: 'ACTION', text: `${www} has A/AAAA ${[...r.wwwA.cloudflare.answers, ...r.wwwAAAA.cloudflare.answers].join(', ')}: owner replaces them with CNAME ${CNAME_TARGET}` });
  else flags.push({ level: 'ACTION', text: `${www} does not exist: owner adds CNAME ${CNAME_TARGET}` });
  if (probes.www && !probes.www.error && probes.www.status < 400 && !probes.www.xWaoSite) {
    flags.push({ level: 'WARN', text: `${www} serves a live site today (HTTP ${probes.www.status}, server ${probes.www.server ?? '?'}): switching it is the M4 migration path, confirm with the founder first` });
  }
  const caa = ['caaWww', 'caaApex', 'caaParent'].find(k => r[k]?.cloudflare.answers.length);
  if (caa) {
    const issuers = caaIssuers(r[caa].cloudflare.answers);
    const issue = issuers.filter(i => i.tag === 'issue');
    const allowsCf = issue.length === 0 || issue.some(i => CLOUDFLARE_CAS.includes(i.value));
    flags.push(allowsCf
      ? { level: 'OK', text: `CAA at ${caa} allows a Cloudflare CA (${issue.map(i => i.value).join(', ') || 'no issue tag'})` }
      : { level: 'BLOCKER', text: `CAA at ${caa} allows only ${issue.map(i => i.value).join(', ')}: certificate issuance will fail until the owner adds e.g. 0 issue "pki.goog" and "letsencrypt.org"` });
  } else flags.push({ level: 'OK', text: 'no CAA records (any CA may issue)' });
  for (const [k, v] of Object.entries(r)) if (!v.agree) flags.push({ level: 'INFO', text: `resolvers disagree on ${k} (propagation?)` });
  return flags;
}

function latestPrecheck() {
  if (typeof args['precheck-file'] === 'string') return JSON.parse(fs.readFileSync(path.resolve(args['precheck-file']), 'utf8'));
  const files = fs.readdirSync(runDir).filter(f => f.endsWith('-precheck.json')).sort();
  if (!files.length) return null;
  return JSON.parse(fs.readFileSync(path.join(runDir, files.at(-1)), 'utf8'));
}

async function precheck() {
  const snap = await snapshot();
  const probes = { www: await httpProbe(`https://${www}/`), wwwHealth: await httpProbe(`https://${www}/__wao/health`), apex: await httpProbe(`https://${domain}/`) };
  const flags = assess(snap, probes);
  const result = { ...snap, probes, flags };
  const file = path.join(runDir, `${stamp()}-precheck.json`);
  fs.writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`attach-domain precheck — slug ${slug}, domain ${domain}`);
  console.log(`  NS   ${snap.records.apexNS.cloudflare.answers.join(', ') || '-'}`);
  console.log(`  MX   ${snap.mailGuard.MX.join(' | ') || '-'}`);
  console.log(`  TXT  ${snap.mailGuard.TXT.length} record(s)`);
  console.log(`  www  CNAME ${snap.records.wwwCNAME.cloudflare.answers.join(', ') || '-'}; A ${snap.records.wwwA.cloudflare.answers.join(', ') || '-'}`);
  for (const f of flags) console.log(`  ${f.level.padEnd(7)} ${f.text}`);
  console.log(`  snapshot saved: ${file}`);
  return { result, file };
}

async function ensurePendingHostEntry() {
  const e = process.env;
  if (!e.SITES_R2_ENDPOINT || !e.SITES_R2_ACCESS_KEY_ID || !e.SITES_R2_SECRET_ACCESS_KEY) return { ok: false, error: 'SITES_R2_* not set' };
  let r2;
  try { r2 = createRequire(path.join(process.cwd(), 'dist', 'package.json'))('./lib/site-hosting/r2.js'); }
  catch { return { ok: false, error: 'dist/lib/site-hosting/r2.js missing: run `npx tsc -p tsconfig.site-hosting.test.json` first' }; }
  const store = r2.createS3Store({ endpoint: e.SITES_R2_ENDPOINT, bucket: 'wao-sites', credentials: { accessKeyId: e.SITES_R2_ACCESS_KEY_ID, secretAccessKey: e.SITES_R2_SECRET_ACCESS_KEY } });
  const key = `hosts/${www}.json`;
  const existing = await store.get(key);
  if (existing) {
    let entry = null;
    try { entry = JSON.parse(existing.toString()); } catch { entry = null; }
    if (entry?.slug !== slug) return { ok: false, error: `${key} belongs to ${entry?.slug ?? 'an unreadable entry'}; not touching it` };
    return { ok: true, state: `exists (role ${entry.role})` };
  }
  if (!(await store.get(`tenants/${slug}.json`))) return { ok: false, error: `tenant ${slug} has no pointer in R2; deploy it first` };
  await store.put(key, new TextEncoder().encode(JSON.stringify({ slug, role: 'redirect' })), 'application/json');
  return { ok: true, state: 'created (role redirect until the post-live redeploy)' };
}

async function attach() {
  const token = process.env.CLOUDFLARE_SITES_API_TOKEN?.trim();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  if (!token || !zoneId) {
    console.error('--apply needs CLOUDFLARE_SITES_API_TOKEN and CLOUDFLARE_ZONE_ID.');
    return 2;
  }
  const before = latestPrecheck();
  if (!before) {
    console.error(`No pre-check snapshot in ${runDir}: run --precheck first (the MX/TXT "before" is part of "live").`);
    return 2;
  }
  if (before.flags?.some(f => f.level === 'BLOCKER')) {
    console.error('The pre-check has a BLOCKER; resolve it and re-run --precheck first.');
    return 2;
  }
  const cf = cfClient({ token, apply: true });
  const hostnames = [www, ...(args.apex === true ? [domain] : [])];
  const ids = {};
  for (const hostname of hostnames) {
    const existing = await cf.request('GET', `/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`);
    if (!existing.ok) { console.error(`custom hostname lookup failed: ${errorText(existing)}`); return 1; }
    let record = (existing.result ?? []).find(h => h.hostname === hostname);
    if (!record) {
      const created = await cf.request('POST', `/zones/${zoneId}/custom_hostnames`, { hostname, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } } });
      if (!created.ok) { console.error(`create ${hostname} failed: ${errorText(created)}`); return 1; }
      record = created.result;
      console.log(`  created custom hostname ${hostname} (${record.id})`);
    } else console.log(`  custom hostname ${hostname} exists (${record.id}), status ${record.status}, ssl ${record.ssl?.status}`);
    ids[hostname] = record.id;
  }

  const deadline = Date.now() + Number(args['timeout-min'] ?? 30) * 60_000;
  const pendingPolls = Object.fromEntries(hostnames.map(h => [h, 0]));
  const done = new Set();
  while (done.size < hostnames.length && Date.now() < deadline) {
    for (const hostname of hostnames) {
      if (done.has(hostname)) continue;
      const res = await cf.request('GET', `/zones/${zoneId}/custom_hostnames/${ids[hostname]}`);
      const h = res.result ?? {};
      const errs = [...(h.verification_errors ?? []), ...(h.ssl?.validation_errors ?? []).map(e => e.message ?? JSON.stringify(e))];
      console.log(`  poll ${hostname}: status ${h.status} ssl ${h.ssl?.status}${errs.length ? ` errors: ${errs.join(' | ')}` : ''}`);
      if (h.status === 'active' && h.ssl?.status === 'active') { done.add(hostname); continue; }
      if (++pendingPolls[hostname] === 5) {
        const patch = await cf.request('PATCH', `/zones/${zoneId}/custom_hostnames/${ids[hostname]}`, { ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } } });
        console.log(`  no-change PATCH ${hostname} to reset validation backoff: ${patch.ok ? 'ok' : errorText(patch)}`);
      }
    }
    if (done.size < hostnames.length) await new Promise(r => setTimeout(r, 60_000));
  }
  if (done.size < hostnames.length) { console.error('Timed out before every hostname was active; re-run --apply later (idempotent).'); return 1; }

  // The Worker answers only hosts it has an R2 entry for, and the deploy writes the canonical entry only after "live".
  // Bridge that: a pending `redirect` entry (www -> the tenant's current canonical origin) so the health probe can
  // prove the path end to end; the post-live redeploy replaces it with role canonical. GET-first; never takes over a
  // host that belongs to another tenant.
  const pending = await ensurePendingHostEntry();
  if (!pending.ok) { console.error(`  host entry: ${pending.error}`); return 1; }
  console.log(`  host entry hosts/${www}.json: ${pending.state}`);
  let health = await httpProbe(`https://${www}/__wao/health`);
  let healthSlug = null;
  for (let i = 0; i < 8; i++) { // the Worker caches a missing host for 30 s
    try { healthSlug = JSON.parse(health.body ?? 'null')?.slug ?? null; } catch { healthSlug = null; }
    if (health.status === 200 && healthSlug === slug) break;
    await new Promise(r => setTimeout(r, 10_000));
    health = await httpProbe(`https://${www}/__wao/health`);
  }
  const after = await snapshot();
  const mailSame = JSON.stringify(before.mailGuard) === JSON.stringify(after.mailGuard);
  const live = health.status === 200 && healthSlug === slug && mailSame;
  const report = { at: new Date().toISOString(), slug, domain, ids, health, healthSlug, mailBefore: before.mailGuard, mailAfter: after.mailGuard, mailSame, live };
  const file = path.join(runDir, `${stamp()}-attach.json`);
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`  health: ${health.error ?? `${health.status} slug=${healthSlug}`}; MX/TXT/NS identical: ${mailSame}`);
  console.log(`  run log: ${file}`);
  if (!live) { console.error('NOT LIVE: do not flip the canonical origin.'); return 1; }

  const patch = { ownerDomain: domain, canonicalOrigin: `https://${www}`, customHostnameIds: ids, ...(args.apex === true ? { ownerApexAliased: true } : {}) };
  console.log(`LIVE. data/sites/${slug}.json patch: ${JSON.stringify(patch)}`);
  if (args['write-record'] === true) {
    const recordPath = path.resolve('data', 'sites', `${slug}.json`);
    const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    if (record.slug !== slug) { console.error('record slug mismatch; not written'); return 1; }
    fs.writeFileSync(recordPath, `${JSON.stringify({ ...record, ...patch }, null, 2)}`, 'utf8');
    console.log(`  wrote ${recordPath}`);
  }
  console.log('Next: re-deploy the tenant with SITE_HOSTING_MODE=worker (canonical flips to www, the subdomain becomes a 301 host, the');
  console.log('fraud tracker registers the new host), then archive the old {slug}.wao.co.il fraud-tracker entry once its 301 is live.');
  return 0;
}

(apply ? attach() : precheck().then(() => 0)).then(code => process.exit(code), error => { console.error(error); process.exit(1); });
