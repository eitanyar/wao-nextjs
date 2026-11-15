/**
 * wao-sites: one Worker serving every Site Bot tenant from the R2 bucket `wao-sites`.
 * Host → hosts/{host}.json → tenants/{slug}.json → sites/{slug}/{version}/{file}.
 * Design: docs/missions/site-bot-shared-worker-hosting-2026-11-12.md.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * Safety net: any host without a hosts/ entry is passed through untouched (`fetch(request)`), so a
 * missing exclusion route never takes over wao.co.il, www or the Google/mail hosts.
 */

import {
  HEALTH_PATH, INFRA_HOSTS, POINTER_TTL_MS, TtlCache, cacheControlFor, contentTypeFor, edgeCacheKey, httpsRedirect,
  keys, normalizeHost, parseHostEntry, parseTenantPointer, redirectRoleLocation, resolvePath,
  type HostEntry, type TenantPointer,
} from './router';

// Minimal structural types for the bindings we use (no dependency on @cloudflare/workers-types).
interface R2ObjectBodyLike {
  body: ReadableStream;
  httpEtag: string;
  size: number;
  text(): Promise<string>;
}
interface R2BucketLike {
  get(key: string): Promise<R2ObjectBodyLike | null>;
}
interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}
export interface Env {
  SITES: R2BucketLike;
}

const hostCache = new TtlCache<HostEntry | null>(POINTER_TTL_MS);
const tenantCache = new TtlCache<TenantPointer | null>(POINTER_TTL_MS);

async function readJson(env: Env, key: string): Promise<unknown | undefined> {
  const object = await env.SITES.get(key);
  if (!object) return undefined;
  try {
    return JSON.parse(await object.text());
  } catch {
    return null; // present but malformed: treated as invalid by the parsers
  }
}

async function lookupHost(env: Env, host: string, now: number): Promise<HostEntry | null> {
  const cached = hostCache.get(host, now);
  if (cached.hit) return cached.value;
  const raw = await readJson(env, keys.host(host));
  const entry = raw === undefined ? null : parseHostEntry(raw);
  hostCache.set(host, entry, now);
  return entry;
}

async function lookupTenant(env: Env, slug: string, now: number): Promise<TenantPointer | null> {
  const cached = tenantCache.get(slug, now);
  if (cached.hit) return cached.value;
  const raw = await readJson(env, keys.tenant(slug));
  const pointer = raw === undefined ? null : parseTenantPointer(raw, slug);
  tenantCache.set(slug, pointer, now);
  return pointer;
}

function baseHeaders(slug: string | null): Headers {
  const headers = new Headers();
  if (slug) headers.set('x-wao-site', slug);
  headers.set('x-content-type-options', 'nosniff');
  return headers;
}

function textResponse(status: number, body: string, slug: string | null, extra: Record<string, string> = {}): Response {
  const headers = baseHeaders(slug);
  headers.set('content-type', 'text/plain; charset=utf-8');
  headers.set('cache-control', 'no-store');
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(body, { status, headers });
}

function redirect(location: string, slug: string | null): Response {
  const headers = baseHeaders(slug);
  headers.set('location', location);
  headers.set('cache-control', 'public, max-age=3600');
  return new Response(null, { status: 301, headers });
}

function edgeCache(): Cache | null {
  const store = (globalThis as unknown as { caches?: { default?: Cache } }).caches;
  return store?.default ?? null;
}

async function serveFile(request: Request, env: Env, ctx: ExecutionContextLike, tenant: TenantPointer, rel: string): Promise<Response> {
  const isHead = request.method === 'HEAD';
  const cache = edgeCache();
  const cacheKey = new Request(edgeCacheKey(tenant.slug, tenant.version, rel), { method: 'GET' });
  let response: Response | undefined = cache ? await cache.match(cacheKey) : undefined;
  let cacheState = 'HIT';

  if (!response) {
    cacheState = 'MISS';
    const object = await env.SITES.get(keys.file(tenant.slug, tenant.version, rel));
    if (object) {
      const headers = baseHeaders(tenant.slug);
      headers.set('content-type', contentTypeFor(rel));
      headers.set('cache-control', cacheControlFor(rel));
      headers.set('etag', object.httpEtag);
      headers.set('x-wao-version', tenant.version);
      response = new Response(object.body, { status: 200, headers });
    } else {
      const notFound = await env.SITES.get(keys.file(tenant.slug, tenant.version, '404.html'));
      const headers = baseHeaders(tenant.slug);
      headers.set('cache-control', 'public, max-age=60');
      headers.set('x-wao-version', tenant.version);
      if (notFound) {
        headers.set('content-type', 'text/html; charset=utf-8');
        response = new Response(notFound.body, { status: 404, headers });
      } else {
        headers.set('content-type', 'text/plain; charset=utf-8');
        response = new Response('Not found\n', { status: 404, headers });
      }
    }
    if (cache) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  const etag = response.headers.get('etag');
  const ifNoneMatch = request.headers.get('if-none-match');
  const headers = new Headers(response.headers);
  headers.set('x-wao-cache', cacheState);
  // A Cache API hit comes back with the zone's Browser Cache TTL (1 year on wao.co.il) in place of ours;
  // re-apply the per-file policy so browsers never keep HTML longer than 60 s.
  headers.set('cache-control', response.status === 200 ? cacheControlFor(rel) : 'public, max-age=60');
  headers.delete('age');
  if (response.status === 200 && etag && ifNoneMatch && ifNoneMatch.split(',').map(v => v.trim()).includes(etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(isHead ? null : response.body, { status: response.status, headers });
}

export async function handle(request: Request, env: Env, ctx: ExecutionContextLike, now: number = Date.now()): Promise<Response> {
  const url = new URL(request.url);
  const host = normalizeHost(url.host);

  if (host && INFRA_HOSTS.has(host)) {
    if (url.pathname === HEALTH_PATH) {
      return new Response(JSON.stringify({ worker: 'wao-sites' }), {
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    return textResponse(404, 'Not found\n', null);
  }

  const entry = host ? await lookupHost(env, host, now) : null;
  if (!entry) return fetch(request); // not a tenant host: passthrough to whatever DNS points at

  const toHttps = httpsRedirect(url);
  if (toHttps) return redirect(toHttps, entry.slug);

  const tenant = await lookupTenant(env, entry.slug, now);
  if (!tenant) return textResponse(503, 'Site unavailable\n', entry.slug, { 'retry-after': '30' });

  if (url.pathname === HEALTH_PATH) {
    return new Response(JSON.stringify({ slug: tenant.slug, version: tenant.version, role: entry.role, status: tenant.status }), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-wao-site': tenant.slug },
    });
  }

  if (entry.role === 'redirect') return redirect(redirectRoleLocation(tenant.canonicalOrigin, url), tenant.slug);

  if (tenant.status === 'suspended') {
    const headers = baseHeaders(tenant.slug);
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('cache-control', 'no-store');
    return new Response('<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>410</title><h1>410</h1></html>\n', { status: 410, headers });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return textResponse(405, 'Method not allowed\n', tenant.slug, { allow: 'GET, HEAD' });
  }

  const resolved = resolvePath(url.pathname, url.search);
  if (resolved.kind === 'bad') return textResponse(400, 'Bad request\n', tenant.slug);
  if (resolved.kind === 'redirect') return redirect(resolved.location, tenant.slug);
  return serveFile(request, env, ctx, tenant, resolved.rel);
}

const worker = {
  fetch(request: Request, env: Env, ctx: ExecutionContextLike): Promise<Response> {
    return handle(request, env, ctx);
  },
};

export default worker;
