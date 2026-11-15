// Shared config + helpers for scripts/site-hosting/*. HEBREW-SAFETY: ZERO Hebrew bytes.
// Design: docs/missions/site-bot-shared-worker-hosting-2026-11-12.md
import fs from 'node:fs';
import path from 'node:path';

export const ZONE_NAME = 'wao.co.il';
export const BUCKET = 'wao-sites';
export const WORKER = 'wao-sites';
export const CNAME_TARGET = 'sites.wao.co.il';
export const FALLBACK_ORIGIN = 'sites-origin.wao.co.il';
export const FALLBACK_ORIGIN_ADDRESS = '100::';
export const CATCH_ALL_PATTERN = '*/*';
/** Proxied non-tenant hosts on the zone that the catch-all route must never serve (Worker = None routes). */
export const EXCLUDED_HOSTS = [
  'wao.co.il', 'www.wao.co.il', 'calendar.wao.co.il', 'chat.wao.co.il', 'docs.wao.co.il', 'email.wao.co.il',
  'mail.wao.co.il', 'smtp.wao.co.il', 'karate.wao.co.il',
];
export const CF_BASE = 'https://api.cloudflare.com/client/v4';

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const eq = a.indexOf('=');
    if (eq > 0) { args[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { args[a.slice(2)] = next; i++; } else args[a.slice(2)] = true;
  }
  return args;
}

/**
 * Cloudflare API client. Every non-GET is refused unless `apply` is true, so a dry run can never write.
 */
export function cfClient({ token, apply = false, fetchImpl = fetch }) {
  if (!token) throw new Error('No Cloudflare API token in the environment.');
  async function request(method, apiPath, body) {
    if (method !== 'GET' && !apply) throw new Error(`refusing ${method} ${apiPath}: dry run (pass --apply to write)`);
    const res = await fetchImpl(`${CF_BASE}${apiPath}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    const errors = Array.isArray(data?.errors) ? data.errors : [];
    return { ok: res.ok && data?.success !== false, status: res.status, data, result: data?.result, errors };
  }
  async function getAll(apiPath) {
    const out = [];
    for (let page = 1; page <= 100; page++) {
      const sep = apiPath.includes('?') ? '&' : '?';
      const res = await request('GET', `${apiPath}${sep}page=${page}&per_page=100`);
      if (!res.ok) return { ...res, result: out };
      if (Array.isArray(res.result)) out.push(...res.result);
      const total = Number(res.data?.result_info?.total_pages ?? 1);
      if (!Number.isFinite(total) || page >= total) return { ...res, result: out };
    }
    throw new Error(`too many pages: ${apiPath}`);
  }
  return { request, getAll, apply };
}

export function errorText(res) {
  if (!res.errors?.length) return `HTTP ${res.status}`;
  return res.errors.map(e => `${e.code ?? '?'}: ${e.message ?? ''}`.trim()).join('; ');
}

/** Slugs of every data/lps/*.json ads landing page (read-only). */
export function adsLpSlugs(root = process.cwd()) {
  return jsonSlugs(path.join(root, 'data', 'lps'));
}

/** Slugs of every data/sites/*.json record (read-only). */
export function siteSlugs(root = process.cwd()) {
  return jsonSlugs(process.env.WAO_SITES_DIR?.trim() ? path.resolve(process.env.WAO_SITES_DIR.trim()) : path.join(root, 'data', 'sites'));
}

function jsonSlugs(dir) {
  try {
    return fs.readdirSync(dir).filter(n => n.endsWith('.json')).map(n => n.slice(0, -5)).filter(s => /^[a-z0-9-]+$/.test(s));
  } catch {
    return [];
  }
}

/** Classifies one DNS record for the catch-all route audit. */
export function classifyRecord(record, { tenants, adsLps, excluded = EXCLUDED_HOSTS }) {
  const name = String(record.name ?? '').toLowerCase();
  if (!record.proxied) return { kind: 'dns-only', ok: true, note: 'not proxied: Worker routes do not apply' };
  if (name === CNAME_TARGET) return { kind: 'cname-target', ok: true };
  if (name === FALLBACK_ORIGIN) return { kind: 'fallback-origin', ok: true };
  if (excluded.includes(name)) return { kind: 'excluded', ok: true, needsRoute: `${name}/*` };
  const suffix = `.${ZONE_NAME}`;
  if (name.endsWith(suffix)) {
    const label = name.slice(0, -suffix.length);
    if (!label.includes('.') && tenants.has(label)) {
      const target = String(record.content ?? '');
      const legacy = target === `${label}.pages.dev`;
      if (target === CNAME_TARGET || legacy) {
        return { kind: legacy ? 'tenant (legacy Pages target)' : 'tenant', ok: true };
      }
      return { kind: 'tenant?', ok: false, note: `tenant slug but unexpected target ${target}` };
    }
  }
  const label = name.endsWith(`.${ZONE_NAME}`) ? name.slice(0, -ZONE_NAME.length - 1) : '';
  if (label && adsLps?.has(label) && String(record.content ?? '') === `${label}.pages.dev`) {
    return { kind: 'ads-LP (Pages)', ok: false, note: `ads landing page (data/lps/${label}.json) on Pages: needs an exclusion route ${name}/* until the ads-LP deploy moves to the Worker` };
  }
  return { kind: 'UNCLASSIFIED', ok: false, note: `proxied non-tenant host: needs an exclusion route ${name}/* (or a tenant record)` };
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function stamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
