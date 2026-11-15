/**
 * Site Bot shared-Worker hosting: tenant records, canonical-origin rule, reserved slugs.
 * Design: docs/missions/site-bot-shared-worker-hosting-2026-11-12.md (sections 1 and 2).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * Pure module (no IO). The router Worker (workers/wao-sites) keeps its own copy of the R2 layout
 * constants because it is bundled separately; tenant.test.ts pins the two together.
 */

import { RESERVED_DEPLOYMENT_SLUGS, isSafeDeploymentSlug } from '../deployment/deploy-access';

export { RESERVED_DEPLOYMENT_SLUGS };

/** The zone every subdomain tenant lives under. */
export const SITES_ZONE = 'wao.co.il';
/** CNAME target owners point `www` at; also the target of every `{slug}.wao.co.il` record in worker mode. */
export const SITES_CNAME_TARGET = 'sites.wao.co.il';
/** Cloudflare for SaaS fallback origin (originless `AAAA 100::`, proxied). */
export const SITES_FALLBACK_ORIGIN = 'sites-origin.wao.co.il';
/** R2 bucket and Worker name. */
export const SITES_BUCKET = 'wao-sites';
export const SITES_WORKER = 'wao-sites';

export type HostRole = 'canonical' | 'redirect';
export type TenantStatus = 'live' | 'suspended';

/** R2 `hosts/{hostname}.json`. */
export interface HostEntry {
  slug: string;
  role: HostRole;
}

/** R2 `tenants/{slug}.json`: the pointer. Rewriting it is the atomic deploy / rollback switch. */
export interface TenantPointer {
  slug: string;
  version: string;
  previousVersion?: string;
  canonicalOrigin: string;
  status: TenantStatus;
  /** Number of objects under `sites/{slug}/{version}/` at publish time (read-back proof). */
  fileCount?: number;
  /** ETag of `sites/{slug}/{version}/index.html` at publish time (read-back proof). */
  indexEtag?: string;
  updatedAt?: string;
}

/**
 * Optional hosting fields on `data/sites/{slug}.json`. Shape only: written by the staff attach flow
 * (scripts/site-hosting/attach-domain.mjs --write-record) and read by the deploy route and /api/lead.
 */
export interface SiteHostingFields {
  /** The owner's registrable domain as given at intake, e.g. `example.co.il` (never with `www.`). */
  ownerDomain?: string;
  /**
   * Set only once the owner domain is attached AND live (status + ssl active, health probe, MX/TXT
   * unchanged). Must be `https://www.{ownerDomain}`; anything else is ignored.
   */
  canonicalOrigin?: string;
  /** Cloudflare for SaaS custom hostname ids, by hostname. */
  customHostnameIds?: Record<string, string>;
  /** Last version published to R2 (informational; the R2 pointer is the truth). */
  hostingVersion?: string;
  /** True when the owner's registrar aliases the apex to sites.wao.co.il (apex = redirect host). */
  ownerApexAliased?: boolean;
}

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Lower-cased, trailing-dot-free hostname, or null if it is not a plain DNS hostname. */
export function normalizeHostname(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const host = value.trim().toLowerCase().replace(/\.$/, '');
  if (!host || host.length > 253) return null;
  const labels = host.split('.');
  if (labels.length < 2 || !labels.every(label => HOST_LABEL.test(label))) return null;
  if (/^[0-9.]+$/.test(host)) return null; // IPv4 literal
  return host;
}

/**
 * The owner's domain as a bare registrable name (`www.` stripped), or null. Never a wao.co.il name:
 * an owner domain must not shadow our own zone.
 */
export function normalizeOwnerDomain(value: unknown): string | null {
  const host = normalizeHostname(value);
  if (!host) return null;
  const bare = host.startsWith('www.') ? host.slice(4) : host;
  if (!normalizeHostname(bare)) return null;
  if (bare === SITES_ZONE || bare.endsWith(`.${SITES_ZONE}`)) return null;
  return bare;
}

export function isTenantSlug(value: unknown): value is string {
  return isSafeDeploymentSlug(value);
}

export function subdomainHost(slug: string): string {
  return `${slug}.${SITES_ZONE}`;
}

export function subdomainOrigin(slug: string): string {
  return `https://${subdomainHost(slug)}`;
}

/**
 * Canonical-origin rule (design note, Deploy step 2): `https://www.{ownerDomain}` when the owner domain is
 * attached and live (recorded as `canonicalOrigin` by the attach flow), else `https://{slug}.wao.co.il`.
 * A `canonicalOrigin` that does not equal `https://www.{ownerDomain}` exactly is ignored (fail safe to the
 * subdomain, which we always control).
 */
export function tenantCanonicalOrigin(slug: string, record: SiteHostingFields | null | undefined): string {
  const ownerDomain = normalizeOwnerDomain(record?.ownerDomain);
  if (ownerDomain && record?.canonicalOrigin === `https://www.${ownerDomain}`) return record.canonicalOrigin;
  return subdomainOrigin(slug);
}

/** The bare host of an `https://host` origin. */
export function originHost(origin: string): string {
  return new URL(origin).hostname;
}

/**
 * Every hostname that must route to this tenant, with its role. The canonical host serves; the others
 * 301 to it. Before an owner domain is live, the subdomain is the only (canonical) host.
 */
export function tenantHosts(slug: string, record: SiteHostingFields | null | undefined): Array<{ host: string; role: HostRole }> {
  const canonical = tenantCanonicalOrigin(slug, record);
  const sub = subdomainHost(slug);
  if (canonical === subdomainOrigin(slug)) return [{ host: sub, role: 'canonical' }];
  const ownerDomain = normalizeOwnerDomain(record?.ownerDomain)!;
  const hosts: Array<{ host: string; role: HostRole }> = [
    { host: `www.${ownerDomain}`, role: 'canonical' },
    { host: sub, role: 'redirect' },
  ];
  if (record?.ownerApexAliased === true) hosts.push({ host: ownerDomain, role: 'redirect' });
  return hosts;
}

/** Every owner hostname a record names (www + apex), for the lead-form CORS allowlist. */
export function ownerHostsOf(record: SiteHostingFields | null | undefined): string[] {
  const hosts = new Set<string>();
  const ownerDomain = normalizeOwnerDomain(record?.ownerDomain);
  if (ownerDomain) {
    hosts.add(`www.${ownerDomain}`);
    hosts.add(ownerDomain);
  }
  if (typeof record?.canonicalOrigin === 'string') {
    try {
      const url = new URL(record.canonicalOrigin);
      const host = normalizeHostname(url.hostname);
      if (url.protocol === 'https:' && host && !url.port && normalizeOwnerDomain(host)) hosts.add(host);
    } catch {
      // ignored: not an origin
    }
  }
  return [...hosts];
}

const VERSION = /^\d{8}T\d{6}Z-[0-9a-f]{6}$/;

export function isHostingVersion(value: unknown): value is string {
  return typeof value === 'string' && VERSION.test(value);
}

/** `20261112T183005Z-ab12cd`: sortable by time, unique per deploy. */
export function newHostingVersion(now: Date, randomHex: string): string {
  if (!/^[0-9a-f]{6}$/.test(randomHex)) throw new Error('randomHex must be 6 lowercase hex chars');
  const iso = now.toISOString(); // 2026-11-12T18:30:05.123Z
  const stamp = `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
  return `${stamp}-${randomHex}`;
}

export const r2Keys = {
  host: (hostname: string) => `hosts/${hostname}.json`,
  tenant: (slug: string) => `tenants/${slug}.json`,
  siteRoot: (slug: string) => `sites/${slug}/`,
  versionRoot: (slug: string, version: string) => `sites/${slug}/${version}/`,
  file: (slug: string, version: string, file: string) => `sites/${slug}/${version}/${file}`,
};

/** robots.txt rendered at deploy (the renderers do not emit one). */
export function renderRobotsTxt(canonicalOrigin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${canonicalOrigin.replace(/\/$/, '')}/sitemap.xml\n`;
}

/** A deploy file name is safe to become an R2 key suffix (relative, no traversal, ASCII path chars). */
export function isSafeSiteFileName(file: string): boolean {
  if (!file || file.length > 512 || file.startsWith('/') || file.includes('//')) return false;
  if (!/^[A-Za-z0-9._~\-/]+$/.test(file)) return false;
  return file.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}

export function parseTenantPointer(value: unknown): TenantPointer | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isTenantSlug(v.slug) || !isHostingVersion(v.version)) return null;
  if (v.previousVersion !== undefined && !isHostingVersion(v.previousVersion)) return null;
  if (v.status !== 'live' && v.status !== 'suspended') return null;
  if (typeof v.canonicalOrigin !== 'string' || !/^https:\/\/[a-z0-9.-]+$/.test(v.canonicalOrigin)) return null;
  return v as unknown as TenantPointer;
}

export function parseHostEntry(value: unknown): HostEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isTenantSlug(v.slug) || (v.role !== 'canonical' && v.role !== 'redirect')) return null;
  return { slug: v.slug, role: v.role };
}
