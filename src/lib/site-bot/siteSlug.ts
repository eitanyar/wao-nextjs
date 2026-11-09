/**
 * Site Bot paid-journey v2 M1 (B15): one deterministic slug derivation shared by the
 * intake (which stores collectedData.preferredSlug) and /api/site-bot/generate (which
 * honours it). Order: owner/intake preferredSlug -> GBP website domain -> Latin-safe
 * business name -> the original fallback (wao-client-<last 4 phone digits>).
 *
 * The name step is Latin-only on purpose: a Hebrew name is never transliterated here
 * (no transliteration table exists, and choosing one is an SEO/brand decision), so a
 * Hebrew-only name falls through to the fallback exactly as before.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

const SAFE_SLUG = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/;

/** Hosts that are not the business's own domain: their first label says nothing about it. */
const SHARED_HOSTS = [
  'facebook.com', 'fb.com', 'instagram.com', 'wa.me', 'whatsapp.com', 'linktr.ee', 'tiktok.com', 'youtube.com',
  'google.com', 'goo.gl', 'g.page', 'business.site', 'sites.google.com', 'wixsite.com', 'wix.com', 'linkedin.com',
  'yelp.com', 'easy.co.il', 'b144.co.il', 'zap.co.il', 'midrag.co.il', 'x.com', 'twitter.com', 'wao.co.il',
];

/** Second-level registries whose label is not the brand (cohen.co.il -> "cohen", not "co"). */
const PUBLIC_SECOND_LEVEL = new Set(['co', 'org', 'net', 'ac', 'gov', 'muni', 'k12', 'idf', 'com']);

export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '');
}

export function isSafeSiteSlug(value: unknown): value is string {
  return typeof value === 'string' && SAFE_SLUG.test(value);
}

/** "https://www.cohen-plumbing.co.il/about" -> "cohen-plumbing"; shared platforms and IDNs -> null. */
export function slugFromWebsite(uri: string | undefined): string | null {
  if (!uri) return null;
  let host: string;
  try {
    host = new URL(uri).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return null;
  }
  if (!host || /^[\d.]+$/.test(host) || host.split('.').some(label => label.startsWith('xn--'))) return null;
  if (SHARED_HOSTS.some(shared => host === shared || host.endsWith(`.${shared}`))) return null;
  const labels = host.split('.').filter(label => label !== 'www');
  if (labels.length < 2) return null;
  labels.pop(); // TLD
  while (labels.length > 1 && PUBLIC_SECOND_LEVEL.has(labels[labels.length - 1])) labels.pop();
  const brand = labels[labels.length - 1];
  const slug = brand ? normalizeSlug(brand) : '';
  return isSafeSiteSlug(slug) ? slug : null;
}

/** Latin-only slug from a business name; null when fewer than 3 usable characters remain. */
export function slugFromName(name: string | undefined): string | null {
  const slug = normalizeSlug(name ?? '');
  return slug.length >= 3 && isSafeSiteSlug(slug) ? slug : null;
}

/** The pre-M1 generate fallback, unchanged: last 4 phone digits, else a clock suffix. */
export function fallbackSlug(phone: string | undefined, now: () => number = Date.now): string {
  const suffix = (phone || '').replace(/\D/g, '').slice(-4) || now().toString(36).slice(-4);
  return `wao-client-${suffix}`;
}

export interface SlugInput {
  preferredSlug?: string;
  websiteUri?: string;
  businessName?: string;
  businessNiche?: string;
  phone?: string;
}

/** What the intake stores as collectedData.preferredSlug: deterministic only (no clock fallback). */
export function derivePreferredSlug(input: SlugInput): string | undefined {
  return slugFromWebsite(input.websiteUri)
    ?? slugFromName(input.businessName || input.businessNiche)
    ?? ((input.phone || '').replace(/\D/g, '').length >= 4 ? fallbackSlug(input.phone) : undefined);
}

/** What generate uses when the request carries no explicit slug. preferredSlug wins when present. */
export function deriveSiteSlug(input: SlugInput, now: () => number = Date.now): string {
  const preferred = typeof input.preferredSlug === 'string' ? input.preferredSlug.trim() : '';
  if (preferred) return preferred;
  return slugFromWebsite(input.websiteUri)
    ?? slugFromName(input.businessName || input.businessNiche)
    ?? fallbackSlug(input.phone, now);
}
