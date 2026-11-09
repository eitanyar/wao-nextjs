/**
 * Site identity (paid-journey v2 M2a.1, C1/C3/C5): the plain display name and URL slug of
 * every owner-confirmed service, plus the trade and the owner-stated service-area places.
 * Generated ONCE when the copy_ready plan is made, persisted on the dossier, never regenerated.
 *
 * Slugs (C3): short English keyword slugs (2-4 words).
 * - Latin-script service name: deterministic slug from the name itself (no model).
 * - Any other script: ONE model call that returns only a Latin slug, validated by
 *   SERVICE_SLUG_PATTERN; anything invalid falls back to `svc-<hash>`.
 *   Why the model and not a transliteration table: a table yields a transliteration
 *   (sound-alike Latin) rather than the English keyword a searcher or Search Console reads,
 *   and a Hebrew-letter table is Hebrew data nobody has supplied. The regex makes the model
 *   output safe; persistence makes it stable.
 *
 * Display labels:
 * - Hebrew-script owner wording is used VERBATIM (the model's label is ignored).
 * - Latin-script owner wording (operator/fixture input that arrived translated) gets a
 *   native Hebrew label from the same call, validated as Hebrew-only; invalid -> the
 *   owner's wording unchanged. Places are never widened: one label per owner-stated place.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import { createHash } from 'node:crypto';
import type { CollectedData } from '../bot/prompts';
import { SERVICE_LABEL_PINS } from '../lp/generationData';

/**
 * Pinned display label for an owner service wording (M2a.2, item 4: Noa / Yonatan
 * serviceLabelPins, scripted copy). Pins beat the model and the owner's translated wording;
 * they flow into title, H1, link anchors, serviceItems and schema Service.name.
 */
export function pinnedServiceLabel(source: string): string | null {
  const key = source.trim().toLowerCase().replace(/\s+/g, ' ');
  return Object.prototype.hasOwnProperty.call(SERVICE_LABEL_PINS, key) ? SERVICE_LABEL_PINS[key] : null;
}

/** Re-apply the pins to a (possibly persisted, pre-pin) identity; slugs never change. */
export function withPinnedLabels(identity: SiteIdentity): SiteIdentity {
  return { ...identity, services: identity.services.map(service => ({ ...service, label: pinnedServiceLabel(service.source) ?? service.label })) };
}

export interface SiteIdentityService {
  /** Owner-confirmed service name, as stored in the research dossier. */
  source: string;
  /** Plain display name used for titles, schema Service.name, link anchors and serviceItems. */
  label: string;
  /** URL slug: /services/<slug>.html. */
  slug: string;
}

export interface SiteIdentity {
  version: 1;
  /** Trade label for the homepage title (from businessNiche). */
  trade: string;
  /** Base city label (from targetLocation), or null. */
  baseCity: string | null;
  /** Owner-stated places (base + specificCities), owner order, deduplicated; never widened. */
  serviceArea: string[];
  services: SiteIdentityService[];
  /** 'model' when a model call supplied any label or slug. */
  via: 'model' | 'deterministic';
  generatedAt: string;
}

export const SERVICE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+){0,3}$/;
/** A model slug must have 2-4 words. */
const MODEL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+){1,3}$/;
const MAX_SLUG_CHARS = 48;
export const MAX_LABEL_CHARS = 25;
const RESERVED_SLUGS = new Set(['api', 'assets', 'static', 'index', 'privacy', 'accessibility', 'contact', 'sitemap', 'services', 'about']);
const HEBREW = /[\u05D0-\u05EA]/;
const LATIN = /[A-Za-z]/;
/** Hebrew letters, geresh, gershayim, maqaf, space, hyphen, apostrophe-free. */
const HEBREW_LABEL = /^[\u05D0-\u05EA\u05F3\u05F4\u05BE \-]+$/;

export function isHebrewText(value: string): boolean {
  return HEBREW.test(value);
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function norm(value: string): string {
  return clean(value).toLowerCase();
}

export function hashSlug(value: string): string {
  return `svc-${createHash('sha256').update(value).digest('hex').slice(0, 10)}`;
}

/** Deterministic Latin slug from a Latin service name: first 4 words, a-z0-9 only. '' if none. */
export function latinServiceSlug(value: string): string {
  if (!LATIN.test(value) || HEBREW.test(value)) return '';
  const words = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 4);
  const slug = words.join('-').slice(0, MAX_SLUG_CHARS).replace(/-+$/g, '');
  return slug.length >= 3 && SERVICE_SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug) ? slug : '';
}

/** Validate a model-proposed slug; '' when unusable. */
export function validModelSlug(value: unknown): string {
  const slug = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return slug.length <= MAX_SLUG_CHARS && MODEL_SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug) && !slug.startsWith('svc-') ? slug : '';
}

/** Validate a model-proposed Hebrew label; '' when unusable. */
export function validModelLabel(value: unknown): string {
  const label = clean(value);
  return label.length >= 2 && label.length <= MAX_LABEL_CHARS && HEBREW_LABEL.test(label) && HEBREW.test(label) ? label : '';
}

/** M1: localities the owner named in travelBoundary (listed only, max 3; overflow is never used). */
function namedServedAreas(data: CollectedData): string[] {
  const listed = data.servedAreaNames?.listed;
  return Array.isArray(listed) ? listed.filter((item): item is string => typeof item === 'string').slice(0, 3) : [];
}

/**
 * Owner-stated places: base, specificCities, then the M1 named served areas. Feeds the site
 * identity serviceArea (schema areaServed, the brief's service-area fact, the place gates).
 * City PAGES never come from here: they come from businessTruth.servedAreas (specificCities only).
 */
export function ownerPlaces(data: CollectedData): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [clean(data.targetLocation), ...clean(data.specificCities).split(','), ...namedServedAreas(data)]) {
    const place = clean(value);
    if (!place || seen.has(norm(place))) continue;
    seen.add(norm(place));
    out.push(place);
  }
  return out;
}

export interface SiteIdentityInput {
  businessNiche: string;
  baseCity: string | null;
  places: string[];
  services: string[];
}

export function siteIdentityInput(serviceNames: string[], data: CollectedData): SiteIdentityInput {
  const places = ownerPlaces(data);
  return {
    businessNiche: clean(data.businessNiche),
    baseCity: clean(data.targetLocation) ? clean(data.targetLocation).split(',')[0].trim() : (places[0] ?? null),
    places,
    services: serviceNames.map(clean).filter(Boolean),
  };
}

type ModelAnswer = Record<string, { label?: unknown; slug?: unknown }>;

interface IdentityItem { key: string; text: string; kind: 'service' | 'place' | 'trade'; needsLabel: boolean; needsSlug: boolean }

function items(input: SiteIdentityInput): IdentityItem[] {
  const out: IdentityItem[] = [];
  input.services.forEach((text, index) => out.push({ key: `service-${index}`, text, kind: 'service', needsLabel: !isHebrewText(text) && !pinnedServiceLabel(text), needsSlug: !latinServiceSlug(text) }));
  input.places.forEach((text, index) => out.push({ key: `place-${index}`, text, kind: 'place', needsLabel: !isHebrewText(text), needsSlug: false }));
  if (input.businessNiche) out.push({ key: 'trade', text: input.businessNiche, kind: 'trade', needsLabel: !isHebrewText(input.businessNiche), needsSlug: false });
  return out;
}

export const SITE_IDENTITY_SYSTEM_PROMPT =
  'You name pages for an Israeli local-business website. You return short native Hebrew display labels and short English URL slugs. Return only the requested JSON object, with no prose or markdown.';

export function buildSiteIdentityPrompt(input: SiteIdentityInput): string | null {
  const wanted = items(input).filter(item => item.needsLabel || item.needsSlug);
  if (!wanted.length) return null;
  return `For each item return the requested fields.

RULES:
- label (only where needsLabel is true): the plain, natural Hebrew term an Israeli customer types for exactly this item. Same meaning, no added words, no marketing adjectives, no region or "and surroundings". For a place, the standard Hebrew spelling of that one place. For a trade, the Hebrew trade noun (singular). Hebrew letters and spaces only, at most ${MAX_LABEL_CHARS} characters.
- slug (only where needsSlug is true): 2 to 4 lowercase English keywords joined by hyphens, a-z and 0-9 only, naming the service the way an English searcher would (for example "leak-detection" or "water-heater-installation"). No city, no brand.
- Return a JSON object keyed by item key: {"<key>": {"label": "...", "slug": "..."}}, including only the requested fields.

ITEMS:
${JSON.stringify(wanted.map(item => ({ key: item.key, kind: item.kind, text: item.text, needsLabel: item.needsLabel, needsSlug: item.needsSlug })))}`;
}

export type SiteIdentityModelCall = (system: string, user: string) => Promise<string>;

/** Pure assembly from the input plus an (optional, already parsed) model answer. */
export function assembleSiteIdentity(input: SiteIdentityInput, answer: ModelAnswer | null, now: () => Date = () => new Date()): SiteIdentity {
  let usedModel = false;
  const label = (key: string, text: string): string => {
    if (isHebrewText(text)) return text;
    const proposed = validModelLabel(answer?.[key]?.label);
    if (proposed) usedModel = true;
    return proposed || text;
  };
  const services = input.services.map((text, index) => {
    let slug = latinServiceSlug(text);
    if (!slug) {
      slug = validModelSlug(answer?.[`service-${index}`]?.slug);
      if (slug) usedModel = true;
    }
    return { source: text, label: pinnedServiceLabel(text) ?? label(`service-${index}`, text), slug: slug || hashSlug(`service:${norm(text)}`) };
  });
  const serviceArea = input.places.map((text, index) => label(`place-${index}`, text));
  const baseIndex = input.baseCity ? input.places.findIndex(place => norm(place) === norm(input.baseCity!)) : -1;
  return {
    version: 1,
    trade: input.businessNiche ? label('trade', input.businessNiche) : '',
    baseCity: baseIndex >= 0 ? serviceArea[baseIndex] : input.baseCity,
    serviceArea,
    services,
    via: usedModel ? 'model' : 'deterministic',
    generatedAt: now().toISOString(),
  };
}

function parseAnswer(raw: unknown): ModelAnswer | null {
  if (typeof raw !== 'string') return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as ModelAnswer : null;
  } catch {
    return null;
  }
}

/** One model call at most; any failure degrades to deterministic labels/slugs, never throws. */
export async function resolveSiteIdentity(
  input: SiteIdentityInput,
  call: SiteIdentityModelCall | null,
  now: () => Date = () => new Date(),
): Promise<SiteIdentity> {
  const prompt = buildSiteIdentityPrompt(input);
  let answer: ModelAnswer | null = null;
  if (prompt && call) {
    try {
      answer = parseAnswer(await call(SITE_IDENTITY_SYSTEM_PROMPT, prompt));
    } catch {
      answer = null;
    }
  }
  return assembleSiteIdentity(input, answer, now);
}

export function isSiteIdentity(value: unknown): value is SiteIdentity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return v.version === 1 && typeof v.trade === 'string' && Array.isArray(v.serviceArea) && Array.isArray(v.services) &&
    (v.services as unknown[]).every(item => {
      const s = item as Record<string, unknown>;
      return s && typeof s.source === 'string' && typeof s.label === 'string' && typeof s.slug === 'string' &&
        (SERVICE_SLUG_PATTERN.test(s.slug) || /^svc-[0-9a-f]{10}$/.test(s.slug));
    });
}
