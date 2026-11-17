/**
 * Site Bot per-service AI atmosphere hero photos (Eitan 2026-11-17, Fable 5.2 plan): the pure resolver.
 *
 * A research site's page hero is, in order:
 *   1. the owner's approved real photo (look.hero, siteLook.ts), on every page;
 *   2. else the trade library's image for the page's service (the page's opportunity id, e.g. svc-leak-detection);
 *   3. else the trade library's fallback image (homepage, unknown service ids, non-service pages);
 *   4. else none (the solid hero, byte-identical to a site without this module).
 *
 * Library images are AI-made atmosphere photos (Fable 5.2, "process yes, outcomes never"): HERO BACKGROUND ONLY. They render
 * as the hero backdrop flagged data-ai-generated="atmosphere" and never as a gallery / About image, og:image, schema image,
 * or anything sent to Google Business Profile. Nothing here returns a URL to those fields; the renderer keeps heroImageUrl.
 *
 * Equipment: a service list may hold a thermal-camera variant list (leak-detection "camera"). It is used only when the owner
 * stated a thermal camera: his usp or an owner-confirmed service attribute (the service_attributes research gate) names the
 * thermal tool group of the copy gates (generationData USP_TOOL_GROUPS.thermal, the same matcher that lets copy name it).
 *
 * Variant pick: deterministic per site, and never the same variant for two approved sites in the same city for the same
 * pool (service + equipment) while the pool has an unused one; when a collision is unavoidable the least-used variant wins.
 * Sites are assigned in a stable order (createdAt, then slug), so a site's pick never changes when a later site is added.
 *
 * Pure: no fs, no sharp. The build script is scripts/build-photo-library.mjs; the deploy-time loader and peer scan are in
 * src/lib/site-bot/heroLibraryStore.ts.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (the thermal stems are read from generationData.ts).
 */

import type { CollectedData } from '../bot/prompts';
import { USP_TOOL_GROUPS } from './generationData';
import { stableHash } from './logoMarks';
import type { SiteLookHero, SiteLookHeroImage } from './siteLook';

export const HERO_LIBRARY_VERSION = 1;

/** One approved library photo, built (served paths under /img/, content-hashed names). */
export interface HeroLibraryVariant {
  /** Stable id: the approved source file name without .png (e.g. leak-detection-hand-2). */
  id: string;
  images: SiteLookHeroImage[];
}

/** The service lists of a trade library: `standard` always, `thermalCamera` only for an owner with a thermal camera. */
export interface HeroLibraryService {
  standard: string[];
  thermalCamera?: string[];
}

export interface HeroLibrary {
  trade: string;
  services: Record<string, HeroLibraryService>;
  fallback: string[];
  variants: Record<string, HeroLibraryVariant>;
}

const SERVICE_PREFIX = 'svc-';
const DEDUPE_SUFFIX = /-\d+$/;

/**
 * The library service id of a page: its opportunity id without the svc- prefix when the library has it, else the same
 * without a planner dedupe suffix (svc-leak-detection-2). Anything else (homepage, a hashed id, a service the library
 * does not have) = null: the trade fallback.
 */
export function libraryServiceId(opportunityId: string, library: Pick<HeroLibrary, 'services'>): string | null {
  if (typeof opportunityId !== 'string' || !opportunityId.startsWith(SERVICE_PREFIX)) return null;
  const has = (id: string) => Object.prototype.hasOwnProperty.call(library.services, id);
  const bare = opportunityId.slice(SERVICE_PREFIX.length);
  if (has(bare)) return bare;
  const undeduped = bare.replace(DEDUPE_SUFFIX, '');
  return undeduped !== bare && has(undeduped) ? undeduped : null;
}

const THERMAL = USP_TOOL_GROUPS.thermal;
if (!THERMAL || !THERMAL.uspKeywords.length || !THERMAL.he.length) throw new Error('heroLibrary: the thermal tool group changed; update the equipment rule');

/** True when one owner-stated text names a thermal camera (English keyword, case-insensitive, or a Hebrew stem). */
export function namesThermalCamera(text: unknown): boolean {
  if (typeof text !== 'string' || !text.trim()) return false;
  const lower = text.toLowerCase();
  return THERMAL.uspKeywords.some(keyword => lower.includes(keyword)) || THERMAL.he.some(stem => text.includes(stem));
}

/**
 * The owner confirmed a thermal camera: his usp, or an owner / staff confirmed service attribute (research gate
 * service_attributes, applied into collectedData.serviceAttributes), names one. A generic "camera" (a pipe camera) does
 * not count: the camera photos show a thermal camera.
 */
export function ownerHasThermalCamera(data: Pick<CollectedData, 'usp' | 'serviceAttributes'> | null | undefined): boolean {
  if (!data) return false;
  if (namesThermalCamera(data.usp)) return true;
  const attributes = data.serviceAttributes;
  return !!attributes && typeof attributes === 'object' && Object.values(attributes).some(namesThermalCamera);
}

/** The pool a page draws from: its key (for the city collision count) and the variant ids, or null (no image). */
export interface HeroPool {
  key: string;
  ids: string[];
}

/** The pool for a page: the service's thermal list (thermal owner) or standard list, else the trade fallback. */
export function heroPool(library: HeroLibrary, serviceId: string | null, thermal: boolean): HeroPool | null {
  const usable = (ids: readonly string[] | undefined) => (ids ?? []).filter(id => Object.prototype.hasOwnProperty.call(library.variants, id));
  const service = serviceId ? library.services[serviceId] : undefined;
  if (service) {
    const camera = thermal ? usable(service.thermalCamera) : [];
    if (camera.length) return { key: `${serviceId}:thermal-camera`, ids: camera };
    const standard = usable(service.standard);
    if (standard.length) return { key: `${serviceId}:standard`, ids: standard };
  }
  const fallback = usable(library.fallback);
  return fallback.length ? { key: 'fallback', ids: fallback } : null;
}

/** A site for the assignment: its pages (opportunity id + city) and its equipment. */
export interface HeroPeerSite {
  slug: string;
  /** ISO time; sites are assigned oldest first (then by slug). Missing / invalid sorts last. */
  createdAt?: string;
  thermal: boolean;
  pages: Array<{ id: string; city: string | null | undefined }>;
}

/** City key: NFC, trimmed, whitespace-collapsed, lower-cased ('' = no city; all city-less sites share it). */
export function cityKey(city: string | null | undefined): string {
  return (city ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function siteOrder(a: HeroPeerSite, b: HeroPeerSite): number {
  const time = (site: HeroPeerSite) => {
    const parsed = Date.parse(site.createdAt ?? '');
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  };
  const [ta, tb] = [time(a), time(b)];
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/**
 * Assigns a variant id to every page of every site: slug -> (page id -> variant id). Sites in stable order; per page the
 * variant with the fewest uses (1) by earlier pages of the same city + pool, then (2) on the same site, then (3) the lowest
 * stableHash(slug|page|variant) (deterministic per site). A page without a pool gets no entry.
 */
export function assignHeroVariants(library: HeroLibrary, sites: readonly HeroPeerSite[]): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  const cityUse = new Map<string, Map<string, number>>();
  for (const site of [...sites].sort(siteOrder)) {
    if (out.has(site.slug)) throw new Error(`heroLibrary: duplicate site ${site.slug}`);
    const picks: Record<string, string> = {};
    const siteUse = new Map<string, number>();
    for (const page of site.pages) {
      const pool = heroPool(library, libraryServiceId(page.id, library), site.thermal);
      if (!pool) continue;
      const groupKey = `${cityKey(page.city)}|${pool.key}`;
      const group = cityUse.get(groupKey) ?? new Map<string, number>();
      const rank = (id: string) => [group.get(id) ?? 0, siteUse.get(id) ?? 0, stableHash(`${site.slug}|${page.id}|${id}`)];
      const chosen = [...pool.ids].sort((a, b) => {
        const [ra, rb] = [rank(a), rank(b)];
        return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2] || (a < b ? -1 : 1);
      })[0];
      picks[page.id] = chosen;
      group.set(chosen, (group.get(chosen) ?? 0) + 1);
      cityUse.set(groupKey, group);
      siteUse.set(chosen, (siteUse.get(chosen) ?? 0) + 1);
    }
    out.set(site.slug, picks);
  }
  return out;
}

/**
 * The library heroes of one site, by page opportunity id, ready for the renderer (RenderResearchedSitePagesParams
 * libraryHeroes). An owner's approved real photo wins on every page, so a site with one gets none.
 */
export function siteLibraryHeroes(library: HeroLibrary, picks: Record<string, string> | undefined, ownerPhoto: boolean): Record<string, SiteLookHero> {
  if (ownerPhoto || !picks) return {};
  const out: Record<string, SiteLookHero> = {};
  for (const [pageId, variantId] of Object.entries(picks)) {
    const variant = library.variants[variantId];
    if (variant?.images.length) out[pageId] = { approved: true, images: variant.images };
  }
  return out;
}
