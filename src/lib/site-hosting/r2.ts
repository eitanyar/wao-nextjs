/**
 * R2 over the S3 API (SigV4): per-tenant versioned upload, read-back, pointer flip, rollback.
 * Design: docs/missions/site-bot-shared-worker-hosting-2026-11-12.md (Layout in R2, Deploy for one client).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * Layout (bucket `wao-sites`):
 *   hosts/{hostname}.json            {"slug","role"}
 *   tenants/{slug}.json              TenantPointer (the atomic switch)
 *   sites/{slug}/{version}/{file}    rendered files
 *
 * A publish writes only under `sites/{slug}/`, `tenants/{slug}.json` and the tenant's own `hosts/` entries.
 * It never touches another tenant's objects, and refuses a host entry that belongs to another slug.
 */

import { randomBytes } from 'node:crypto';
import { encodeKeyPath, sha256Hex, signV4, type SigV4Credentials } from './sigv4';
import {
  isSafeSiteFileName, isTenantSlug, newHostingVersion, parseHostEntry, parseTenantPointer, r2Keys, renderRobotsTxt,
  type HostRole, type TenantPointer,
} from './tenant';

export interface S3Config {
  /** `https://{account}.r2.cloudflarestorage.com` (or a local test endpoint). */
  endpoint: string;
  bucket: string;
  credentials: SigV4Credentials;
  region?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface ObjectHead {
  etag: string;
  size: number;
}

export interface ListResult {
  keys: string[];
  prefixes: string[];
}

export class S3Error extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'S3Error';
  }
}

export interface ObjectStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<string>;
  head(key: string): Promise<ObjectHead | null>;
  get(key: string): Promise<Buffer | null>;
  list(prefix: string, delimiter?: string): Promise<ListResult>;
  delete(key: string): Promise<void>;
}

const CONTENT_TYPES: Record<string, string> = {
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

export function contentTypeForFile(file: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(file)?.[1]?.toLowerCase() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

function xmlDecode(value: string): string {
  return value
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

function xmlValues(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  for (let m = re.exec(xml); m; m = re.exec(xml)) out.push(xmlDecode(m[1]));
  return out;
}

export function createS3Store(config: S3Config): ObjectStore {
  const endpoint = config.endpoint.replace(/\/+$/, '');
  if (!/^https?:\/\/[^/]+$/.test(endpoint)) throw new Error('S3 endpoint must be an origin (scheme + host).');
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(config.bucket)) throw new Error('Invalid bucket name.');
  const doFetch = config.fetch ?? fetch;
  const region = config.region ?? 'auto';
  const timeoutMs = config.timeoutMs ?? 30_000;

  async function send(method: string, key: string, query: Record<string, string> = {}, body?: Uint8Array, headers: Record<string, string> = {}): Promise<Response> {
    const qs = Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const url = `${endpoint}/${config.bucket}${key ? `/${encodeKeyPath(key)}` : ''}${qs ? `?${qs}` : ''}`;
    const payloadHash = sha256Hex(body ?? new Uint8Array());
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const signed = signV4({ method, url, headers, payloadHash, credentials: config.credentials, region });
      const { host: _host, ...sendHeaders } = signed.headers;
      void _host;
      try {
        const res = await doFetch(url, {
          method,
          headers: sendHeaders,
          body: body as BodyInit | undefined,
          redirect: 'error',
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.status >= 500 && attempt < 2) {
          lastError = new S3Error(`${method} ${key || '/'} -> ${res.status}`, res.status);
          await res.arrayBuffer().catch(() => undefined);
          continue;
        }
        return res;
      } catch (error) {
        lastError = error;
        if (attempt === 2) break;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  async function fail(res: Response, what: string): Promise<never> {
    const text = await res.text().catch(() => '');
    const code = xmlValues(text, 'Code')[0];
    throw new S3Error(`${what} failed: ${res.status}${code ? ` ${code}` : ''}`, res.status, code);
  }

  return {
    async put(key, body, contentType) {
      const res = await send('PUT', key, {}, body, { 'content-type': contentType });
      if (!res.ok) return fail(res, `PUT ${key}`);
      await res.arrayBuffer().catch(() => undefined);
      const etag = res.headers.get('etag');
      if (!etag) throw new S3Error(`PUT ${key}: no ETag`, res.status);
      return etag;
    },
    async head(key) {
      const res = await send('HEAD', key);
      if (res.status === 404) return null;
      if (!res.ok) return fail(res, `HEAD ${key}`);
      return { etag: res.headers.get('etag') ?? '', size: Number(res.headers.get('content-length') ?? '0') };
    },
    async get(key) {
      const res = await send('GET', key);
      if (res.status === 404) {
        await res.arrayBuffer().catch(() => undefined);
        return null;
      }
      if (!res.ok) return fail(res, `GET ${key}`);
      return Buffer.from(await res.arrayBuffer());
    },
    async list(prefix, delimiter) {
      const keys: string[] = [];
      const prefixes: string[] = [];
      let token: string | undefined;
      for (let page = 0; page < 1000; page++) {
        const query: Record<string, string> = { 'list-type': '2', prefix, 'max-keys': '1000' };
        if (delimiter) query.delimiter = delimiter;
        if (token) query['continuation-token'] = token;
        const res = await send('GET', '', query);
        if (!res.ok) return fail(res, `LIST ${prefix}`);
        const xml = await res.text();
        for (const contents of xmlValues(xml, 'Contents')) keys.push(...xmlValues(contents, 'Key'));
        for (const common of xmlValues(xml, 'CommonPrefixes')) prefixes.push(...xmlValues(common, 'Prefix'));
        const truncated = xmlValues(xml, 'IsTruncated')[0] === 'true';
        token = xmlValues(xml, 'NextContinuationToken')[0];
        if (!truncated) return { keys, prefixes };
        if (!token) throw new S3Error(`LIST ${prefix}: truncated without continuation token`, res.status);
      }
      throw new S3Error(`LIST ${prefix}: too many pages`, 0);
    },
    async delete(key) {
      const res = await send('DELETE', key);
      if (!res.ok && res.status !== 404) return fail(res, `DELETE ${key}`);
      await res.arrayBuffer().catch(() => undefined);
    },
  };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function readJson(store: ObjectStore, key: string): Promise<unknown | undefined> {
  const bytes = await store.get(key);
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`Malformed JSON object at ${key}.`);
  }
}

function jsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
}

const JSON_TYPE = 'application/json; charset=utf-8';

export async function readTenantPointer(store: ObjectStore, slug: string): Promise<TenantPointer | null> {
  const raw = await readJson(store, r2Keys.tenant(slug));
  if (raw === undefined) return null;
  const pointer = parseTenantPointer(raw);
  if (!pointer || pointer.slug !== slug) throw new Error(`Tenant pointer for ${slug} is invalid.`);
  return pointer;
}

export interface PublishInput {
  store: ObjectStore;
  slug: string;
  files: Record<string, string | Uint8Array>;
  canonicalOrigin: string;
  hosts: Array<{ host: string; role: HostRole }>;
  now?: Date;
  randomHex?: string;
  concurrency?: number;
}

export interface PublishResult {
  version: string;
  previousVersion?: string;
  fileCount: number;
  indexEtag: string;
  hostsWritten: string[];
  pruned: string[];
  pruneError?: string;
}

export class HostConflictError extends Error {
  constructor(readonly host: string, readonly owner: string) {
    super(`Host ${host} already belongs to tenant ${owner}.`);
    this.name = 'HostConflictError';
  }
}

/**
 * Uploads every file under a fresh `sites/{slug}/{version}/`, proves the upload by read-back (object count
 * and index.html ETag), then flips `tenants/{slug}.json` and writes the tenant's `hosts/` entries.
 * Keeps the new and the previous version; older versions of this tenant are pruned (non-fatal).
 */
export async function publishTenantSite(input: PublishInput): Promise<PublishResult> {
  const { store, slug, canonicalOrigin } = input;
  if (!isTenantSlug(slug)) throw new Error('Invalid tenant slug.');
  if (!/^https:\/\/[a-z0-9.-]+$/.test(canonicalOrigin)) throw new Error('Invalid canonical origin.');

  const files: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(input.files)) {
    if (!isSafeSiteFileName(name)) throw new Error(`Unsafe site file name: ${JSON.stringify(name)}`);
    files[name] = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  }
  if (!files['robots.txt']) files['robots.txt'] = new TextEncoder().encode(renderRobotsTxt(canonicalOrigin));
  for (const required of ['index.html', '404.html', 'sitemap.xml']) {
    if (!files[required]) throw new Error(`Site is missing ${required}.`);
  }

  // Ownership first: a host already mapped to another tenant is never overwritten.
  const hostEntries = new Map<string, { slug: string; role: HostRole } | null>();
  for (const { host } of input.hosts) {
    const raw = await readJson(store, r2Keys.host(host));
    const entry = raw === undefined ? null : parseHostEntry(raw);
    if (raw !== undefined && !entry) throw new Error(`Host entry ${host} is invalid.`);
    if (entry && entry.slug !== slug) throw new HostConflictError(host, entry.slug);
    hostEntries.set(host, entry);
  }

  const current = await readTenantPointer(store, slug);
  let version = newHostingVersion(input.now ?? new Date(), input.randomHex ?? randomBytes(3).toString('hex'));
  if (current && (version === current.version || version === current.previousVersion)) {
    version = newHostingVersion(input.now ?? new Date(), randomBytes(3).toString('hex'));
  }

  const names = Object.keys(files).sort();
  const etags = new Map<string, string>();
  await mapLimit(names, input.concurrency ?? 8, async name => {
    etags.set(name, await store.put(r2Keys.file(slug, version, name), files[name], contentTypeForFile(name)));
  });

  // Read-back: every object is present, and index.html is the bytes we sent.
  const listed = await store.list(r2Keys.versionRoot(slug, version));
  const expected = new Set(names.map(name => r2Keys.file(slug, version, name)));
  const missing = [...expected].filter(key => !listed.keys.includes(key));
  if (listed.keys.length !== expected.size || missing.length) {
    throw new Error(`Read-back mismatch for ${slug}/${version}: listed ${listed.keys.length}, expected ${expected.size}.`);
  }
  const indexHead = await store.head(r2Keys.file(slug, version, 'index.html'));
  if (!indexHead || indexHead.etag !== etags.get('index.html')) {
    throw new Error(`Read-back ETag mismatch for ${slug}/${version}/index.html.`);
  }

  const pointer: TenantPointer = {
    slug,
    version,
    ...(current ? { previousVersion: current.version } : {}),
    canonicalOrigin,
    status: current?.status ?? 'live',
    fileCount: expected.size,
    indexEtag: indexHead.etag,
    updatedAt: (input.now ?? new Date()).toISOString(),
  };
  await store.put(r2Keys.tenant(slug), jsonBytes(pointer), JSON_TYPE);

  const hostsWritten: string[] = [];
  for (const { host, role } of input.hosts) {
    const existing = hostEntries.get(host);
    if (existing && existing.role === role) continue;
    await store.put(r2Keys.host(host), jsonBytes({ slug, role }), JSON_TYPE);
    hostsWritten.push(host);
  }

  const result: PublishResult = {
    version,
    ...(current ? { previousVersion: current.version } : {}),
    fileCount: expected.size,
    indexEtag: indexHead.etag,
    hostsWritten,
    pruned: [],
  };
  try {
    result.pruned = await pruneTenantVersions(store, slug, [version, current?.version].filter((v): v is string => Boolean(v)));
  } catch (error) {
    result.pruneError = error instanceof Error ? error.message : String(error);
  }
  return result;
}

/** Deletes every version of this tenant except `keep`. Never leaves `sites/{slug}/`. */
export async function pruneTenantVersions(store: ObjectStore, slug: string, keep: string[]): Promise<string[]> {
  if (!isTenantSlug(slug)) throw new Error('Invalid tenant slug.');
  const root = r2Keys.siteRoot(slug);
  const { prefixes } = await store.list(root, '/');
  const pruned: string[] = [];
  for (const prefix of prefixes) {
    if (!prefix.startsWith(root)) continue;
    const version = prefix.slice(root.length).replace(/\/$/, '');
    if (!version || keep.includes(version)) continue;
    const { keys } = await store.list(prefix);
    await mapLimit(keys.filter(key => key.startsWith(prefix)), 8, key => store.delete(key));
    pruned.push(version);
  }
  return pruned;
}

/** Rollback = rewrite the pointer to the previous version (which must still exist). */
export async function rollbackTenant(store: ObjectStore, slug: string, now: Date = new Date()): Promise<TenantPointer> {
  const current = await readTenantPointer(store, slug);
  if (!current) throw new Error(`No tenant pointer for ${slug}.`);
  if (!current.previousVersion) throw new Error(`Tenant ${slug} has no previous version to roll back to.`);
  const head = await store.head(r2Keys.file(slug, current.previousVersion, 'index.html'));
  if (!head) throw new Error(`Previous version ${current.previousVersion} of ${slug} is missing.`);
  const pointer: TenantPointer = {
    ...current,
    version: current.previousVersion,
    previousVersion: current.version,
    indexEtag: head.etag,
    updatedAt: now.toISOString(),
  };
  delete pointer.fileCount;
  await store.put(r2Keys.tenant(slug), jsonBytes(pointer), JSON_TYPE);
  return pointer;
}
