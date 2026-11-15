/**
 * CORS allowlist for /api/lead (Site Bot shared-Worker hosting, Risk 1).
 * Allowed: `https://wao.co.il`, `https://{label…}.wao.co.il`, and every owner host named by a
 * `data/sites/*.json` record (`ownerDomain` www + apex, `canonicalOrigin` host). Only `https:`, no port,
 * no path, exact host match. Everything else is rejected (incl. `http://`, `https://evilwao.co.il`,
 * `https://www.owner.co.il.evil.com`).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { sitesDir } from '../dataRoots';
import { normalizeHostname, ownerHostsOf, type SiteHostingFields } from './tenant';

const WAO_ORIGIN = /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*wao\.co\.il$/;
const MAX_RECORD_BYTES = 16 * 1024 * 1024;
const CACHE_MS = 60_000;

/** The host of a bare `https://host` origin, or null for anything else. */
export function httpsOriginHost(origin: string): string | null {
  // No port, path, userinfo, upper case, IDN or trailing dot: browsers send the exact serialised origin.
  if (!/^https:\/\/[a-z0-9.-]+$/.test(origin) || origin.endsWith('.')) return null;
  return normalizeHostname(origin.slice('https://'.length));
}

export function isWaoOrigin(origin: string): boolean {
  return WAO_ORIGIN.test(origin) && httpsOriginHost(origin) !== null;
}

export function isAllowedLeadOrigin(origin: string, ownerHosts: ReadonlySet<string>): boolean {
  if (isWaoOrigin(origin)) return true;
  const host = httpsOriginHost(origin);
  return host !== null && ownerHosts.has(host);
}

/** Every owner hostname named by the site records in `dir`. Unreadable or oversized records are skipped. */
export function readOwnerHosts(dir: string): Set<string> {
  const hosts = new Set<string>();
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return hosts;
  }
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(/* turbopackIgnore: true */ dir, name);
    try {
      const stat = statSync(file);
      if (!stat.isFile() || stat.size > MAX_RECORD_BYTES) continue;
      const record = JSON.parse(readFileSync(file, 'utf8')) as SiteHostingFields;
      for (const host of ownerHostsOf(record)) hosts.add(host);
    } catch {
      // skipped: not a readable site record
    }
  }
  return hosts;
}

let cache: { at: number; dir: string; hosts: Set<string> } | null = null;

/** Owner hosts from data/sites, cached for 60 s. Read only when an origin is not a wao.co.il origin. */
export function cachedOwnerHosts(now: number = Date.now()): Set<string> {
  const dir = sitesDir();
  if (cache && cache.dir === dir && now - cache.at < CACHE_MS) return cache.hosts;
  cache = { at: now, dir, hosts: readOwnerHosts(dir) };
  return cache.hosts;
}

/** The request origin when allowed, else null. Never touches the filesystem for wao.co.il origins. */
export function allowedLeadOrigin(origin: string, ownerHosts: () => ReadonlySet<string> = cachedOwnerHosts): string | null {
  if (!origin) return null;
  if (isWaoOrigin(origin)) return origin;
  if (httpsOriginHost(origin) === null) return null;
  return isAllowedLeadOrigin(origin, ownerHosts()) ? origin : null;
}

export function resetOwnerHostCacheForTests(): void {
  cache = null;
}
