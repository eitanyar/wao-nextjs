/**
 * wao-sites router: pure functions (no Workers runtime APIs), unit-tested in router.test.ts.
 * Design: docs/missions/site-bot-shared-worker-hosting-2026-11-12.md, section 1 "Request flow".
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * R2 layout constants mirror src/lib/site-hosting/tenant.ts (bundled separately; pinned by tenant.test.ts).
 */

export const INFRA_HOSTS: ReadonlySet<string> = new Set(['sites.wao.co.il', 'sites-origin.wao.co.il']);
export const HEALTH_PATH = '/__wao/health';
export const POINTER_TTL_MS = 30_000;
export const MAX_PATH_LENGTH = 1024;

export type HostRole = 'canonical' | 'redirect';
export interface HostEntry { slug: string; role: HostRole }
export interface TenantPointer {
  slug: string;
  version: string;
  canonicalOrigin: string;
  status: 'live' | 'suspended';
}

const SLUG = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/;
const VERSION = /^\d{8}T\d{6}Z-[0-9a-f]{6}$/;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const keys = {
  host: (host: string) => `hosts/${host}.json`,
  tenant: (slug: string) => `tenants/${slug}.json`,
  file: (slug: string, version: string, rel: string) => `sites/${slug}/${version}/${rel}`,
};

/**
 * Lower-case, strip a port and a trailing dot. Returns null for anything that is not a plain DNS
 * hostname (IP literals, IDN, empty labels), which the Worker treats as "not ours" (passthrough).
 */
export function normalizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let host = raw.trim().toLowerCase();
  if (host.startsWith('[')) return null; // IPv6 literal
  const colon = host.indexOf(':');
  if (colon >= 0) {
    if (!/^\d{1,5}$/.test(host.slice(colon + 1))) return null;
    host = host.slice(0, colon);
  }
  host = host.replace(/\.$/, '');
  if (!host || host.length > 253) return null;
  const labels = host.split('.');
  if (labels.length < 2 || !labels.every(label => LABEL.test(label))) return null;
  if (/^[0-9.]+$/.test(host)) return null;
  return host;
}

export function parseHostEntry(value: unknown): HostEntry | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.slug !== 'string' || !SLUG.test(v.slug)) return null;
  if (v.role !== 'canonical' && v.role !== 'redirect') return null;
  return { slug: v.slug, role: v.role };
}

export function parseTenantPointer(value: unknown, slug: string): TenantPointer | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.slug !== slug || typeof v.version !== 'string' || !VERSION.test(v.version)) return null;
  if (v.status !== 'live' && v.status !== 'suspended') return null;
  if (typeof v.canonicalOrigin !== 'string' || !/^https:\/\/[a-z0-9.-]+$/.test(v.canonicalOrigin)) return null;
  return { slug, version: v.version, canonicalOrigin: v.canonicalOrigin, status: v.status };
}

export type PathResolution =
  | { kind: 'key'; rel: string }
  | { kind: 'redirect'; location: string }
  | { kind: 'bad' };

/**
 * Raw (still percent-encoded) URL pathname → file key relative to `sites/{slug}/{version}/`.
 *   /            → index.html            /a/         → a/index.html
 *   /about       → about.html            /about.html → 301 /about
 *   /index.html  → 301 /                 /a/index.html → 301 /a/
 *   /sitemap.xml → sitemap.xml (any extension other than .html is served as-is)
 * Rejects (400): over-long, malformed percent-encoding, NUL/control chars, backslash, `//`, `.`/`..`
 * segments (literal or encoded), encoded `/`, and any character outside [A-Za-z0-9._~-/] after decoding
 * (so no unicode look-alikes). The result can never leave the tenant's version prefix.
 */
export function resolvePath(rawPath: string, search = ''): PathResolution {
  if (typeof rawPath !== 'string' || !rawPath.startsWith('/') || rawPath.length > MAX_PATH_LENGTH) return { kind: 'bad' };
  if (/%2f|%5c|%00/i.test(rawPath)) return { kind: 'bad' };
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return { kind: 'bad' };
  }
  if (decoded.length > MAX_PATH_LENGTH) return { kind: 'bad' };
  if (!/^[A-Za-z0-9._~\-/]+$/.test(decoded)) return { kind: 'bad' };
  if (decoded.includes('//')) return { kind: 'bad' };
  const segments = decoded.slice(1).split('/');
  const trailingSlash = decoded.endsWith('/');
  const parts = trailingSlash ? segments.slice(0, -1) : segments;
  if (parts.some(part => part === '' || part === '.' || part === '..')) {
    if (!(decoded === '/' && parts.length === 1 && parts[0] === '')) return { kind: 'bad' };
  }
  const query = search && search !== '?' ? (search.startsWith('?') ? search : `?${search}`) : '';

  if (decoded === '/') return { kind: 'key', rel: 'index.html' };
  const rel = decoded.slice(1);
  if (trailingSlash) return { kind: 'key', rel: `${rel}index.html` };
  if (rel === 'index.html') return { kind: 'redirect', location: `/${query}` };
  if (rel.endsWith('/index.html')) return { kind: 'redirect', location: `/${rel.slice(0, -'index.html'.length)}${query}` };
  if (rel.endsWith('.html')) return { kind: 'redirect', location: `/${rel.slice(0, -'.html'.length)}${query}` };
  const last = parts[parts.length - 1];
  if (/\.[A-Za-z0-9]+$/.test(last)) return { kind: 'key', rel };
  return { kind: 'key', rel: `${rel}.html` };
}

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  ico: 'image/x-icon',
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  pdf: 'application/pdf',
  webmanifest: 'application/manifest+json',
};

function extensionOf(rel: string): string {
  return /\.([A-Za-z0-9]+)$/.exec(rel)?.[1]?.toLowerCase() ?? '';
}

export function contentTypeFor(rel: string): string {
  return TYPES[extensionOf(rel)] ?? 'application/octet-stream';
}

/** HTML 60 s (the deploy-to-live budget); sitemap/robots 5 min; fonts, images, CSS, JS one week. */
export function cacheControlFor(rel: string): string {
  const ext = extensionOf(rel);
  if (ext === 'html') return 'public, max-age=60';
  if (ext === 'xml' || ext === 'txt' || ext === 'json' || ext === 'webmanifest') return 'public, max-age=300';
  return 'public, max-age=604800';
}

/** Cache API key: one entry per tenant/version/file, so a deploy (new version) needs no purge. */
export function edgeCacheKey(slug: string, version: string, rel: string): string {
  return `https://wao-sites.cache/${slug}/${version}/${rel}`;
}

/** http → https, same host/path/query. Null when already https. */
export function httpsRedirect(url: URL): string | null {
  if (url.protocol === 'https:') return null;
  return `https://${url.host}${url.pathname}${url.search}`;
}

/** `redirect` role host → canonical origin + path + query. */
export function redirectRoleLocation(canonicalOrigin: string, url: URL): string {
  return `${canonicalOrigin.replace(/\/$/, '')}${url.pathname}${url.search}`;
}

/** In-isolate TTL cache (pointer + host lookups, including negative results). */
export class TtlCache<V> {
  private readonly map = new Map<string, { value: V; expires: number }>();
  constructor(private readonly ttlMs: number, private readonly maxEntries = 5000) {}
  get(key: string, now: number): { hit: true; value: V } | { hit: false } {
    const entry = this.map.get(key);
    if (!entry) return { hit: false };
    if (entry.expires <= now) {
      this.map.delete(key);
      return { hit: false };
    }
    return { hit: true, value: entry.value };
  }
  set(key: string, value: V, now: number): void {
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: now + this.ttlMs });
  }
  clear(): void {
    this.map.clear();
  }
}
