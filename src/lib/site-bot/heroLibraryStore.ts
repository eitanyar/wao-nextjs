/**
 * Site Bot per-service AI atmosphere hero photos (Eitan 2026-11-17): the deploy-time loader and the peer scan.
 *
 *   assets/photo-library/<trade>/library.json   manifest built by scripts/build-photo-library.mjs (never edited by hand)
 *   assets/photo-library/<trade>/img/           the served widths (AVIF + WebP), sha256-checked here before upload
 *
 * Only the built files are traced into the deploy route (next.config.ts outputFileTracingIncludes); the approved PNG
 * sources stay under data/photo-library/ (excluded from every trace; production replaces data/ with the runtime link).
 *
 * The peer scan reads the stored site records (data/sites/, read-only; never data/clients/) to keep two approved sites in
 * the same city from showing the same photo for the same service (heroLibrary.assignHeroVariants). A peer counts when it
 * is a researched, non-simulation record of the same trade whose research dossier carries the approved copy-review packet,
 * and has no approved owner hero photo (an owner photo shows on every page, so it never shows a library one).
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import { sitesDir } from '../dataRoots';
import { assignHeroVariants, HERO_LIBRARY_VERSION, ownerHasThermalCamera, siteLibraryHeroes, type HeroLibrary, type HeroPeerSite } from '../lp/heroLibrary';
import { LOGO_TRADES, logoTradeOf } from '../lp/logoMarks';
import type { SiteLookHero } from '../lp/siteLook';
import { readResearchDossier } from './research/researchStore';
import { readLookRecord } from './siteLookStore';

const TRADE = /^[a-z0-9][a-z0-9-]{0,40}$/;
const BUILT = /^img\/hero-[a-f0-9]{12}-\d{2,4}\.(?:avif|webp)$/;
const MAX_MANIFEST_BYTES = 2_000_000;
const MAX_IMAGE_BYTES = 1_000_000;
const MAX_SITE_RECORD_BYTES = 16 * 1024 * 1024;

export class HeroLibraryError extends Error {
  constructor(readonly reason: string) {
    super(`hero_library_invalid:${reason}`);
    this.name = 'HeroLibraryError';
  }
}

/** The library root (literal join, so build tracing resolves it to assets/photo-library; see next.config.ts). */
export function heroLibraryRoot(): string {
  return path.join(process.cwd(), 'assets', 'photo-library');
}

interface ManifestImage {
  width: number;
  height: number;
  avif: string;
  webp: string;
  avifSha256: string;
  webpSha256: string;
}

interface ManifestVariant {
  aiGenerated: true;
  kind: 'atmosphere';
  people: false;
  faces: false;
  hands: boolean;
  equipment: 'thermal-camera' | null;
  images: ManifestImage[];
}

export interface LoadedHeroLibrary {
  library: HeroLibrary;
  /** img/<name> -> expected sha256, for every served file of every variant. */
  digests: Record<string, string>;
  dir: string;
}

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const isIdList = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string' && TRADE.test(item));

/** Reads a regular, non-symlink file under dir (one relative segment chain), bounded. */
function readUnder(dir: string, relative: string, maxBytes: number): Buffer {
  const parts = relative.split('/');
  if (parts.some(part => part === '' || part === '.' || part === '..')) throw new HeroLibraryError(`path:${relative}`);
  let current = dir;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    const last = index === parts.length - 1;
    if (stat.isSymbolicLink() || (last ? !stat.isFile() : !stat.isDirectory())) throw new HeroLibraryError(`not_a_file:${relative}`);
    if (last && stat.size > maxBytes) throw new HeroLibraryError(`too_large:${relative}`);
  }
  return fs.readFileSync(current);
}

/**
 * The trade's library, or null when the trade has none. Throws HeroLibraryError on a malformed manifest or a variant
 * that is not flagged as an AI atmosphere photo without people / faces (fail closed: the deploy stops).
 */
export function loadHeroLibrary(trade: string, root: string = heroLibraryRoot()): LoadedHeroLibrary | null {
  if (!TRADE.test(trade)) return null;
  const dir = path.join(root, trade);
  if (!fs.existsSync(path.join(dir, 'library.json'))) return null;
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(readUnder(dir, 'library.json', MAX_MANIFEST_BYTES).toString('utf8'));
  } catch (error) {
    if (error instanceof HeroLibraryError) throw error;
    throw new HeroLibraryError('manifest_json');
  }
  if (!manifest || manifest.version !== HERO_LIBRARY_VERSION || manifest.trade !== trade) throw new HeroLibraryError('manifest_shape');
  const rawVariants = manifest.variants as Record<string, ManifestVariant> | undefined;
  const rawServices = manifest.services as Record<string, { standard?: unknown; thermalCamera?: unknown }> | undefined;
  if (!rawVariants || typeof rawVariants !== 'object' || !rawServices || typeof rawServices !== 'object' || !isIdList(manifest.fallback)) {
    throw new HeroLibraryError('manifest_shape');
  }
  const digests: Record<string, string> = {};
  const variants: HeroLibrary['variants'] = {};
  for (const [id, variant] of Object.entries(rawVariants)) {
    if (!TRADE.test(id)) throw new HeroLibraryError(`variant_id:${id}`);
    // Fable 5.2 (2026-11-17): AI atmosphere only; no people, no faces. Hands are allowed only where the build flagged them.
    if (variant?.aiGenerated !== true || variant.kind !== 'atmosphere' || variant.people !== false || variant.faces !== false || typeof variant.hands !== 'boolean') {
      throw new HeroLibraryError(`variant_flags:${id}`);
    }
    if (!Array.isArray(variant.images) || !variant.images.length) throw new HeroLibraryError(`variant_images:${id}`);
    variants[id] = {
      id,
      images: variant.images.map(image => {
        if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width <= 0 || image.height <= 0
          || !BUILT.test(image.avif) || !image.avif.endsWith('.avif') || !BUILT.test(image.webp) || !image.webp.endsWith('.webp')
          || !/^[a-f0-9]{64}$/.test(image.avifSha256) || !/^[a-f0-9]{64}$/.test(image.webpSha256)) throw new HeroLibraryError(`variant_image:${id}`);
        digests[image.avif] = image.avifSha256;
        digests[image.webp] = image.webpSha256;
        return { width: image.width, height: image.height, avif: `/${image.avif}`, webp: `/${image.webp}` };
      }).sort((a, b) => a.width - b.width),
    };
  }
  const services: HeroLibrary['services'] = {};
  for (const [id, service] of Object.entries(rawServices)) {
    if (!TRADE.test(id) || !isIdList(service?.standard) || (service.thermalCamera !== undefined && !isIdList(service.thermalCamera))) throw new HeroLibraryError(`service:${id}`);
    const thermalCamera = service.thermalCamera as string[] | undefined;
    for (const ref of [...service.standard, ...(thermalCamera ?? [])]) if (!variants[ref]) throw new HeroLibraryError(`service_ref:${id}:${ref}`);
    for (const ref of thermalCamera ?? []) if (rawVariants[ref].equipment !== 'thermal-camera') throw new HeroLibraryError(`equipment:${ref}`);
    for (const ref of service.standard) if (rawVariants[ref].equipment !== null) throw new HeroLibraryError(`equipment:${ref}`);
    services[id] = { standard: [...service.standard], ...(thermalCamera ? { thermalCamera: [...thermalCamera] } : {}) };
  }
  for (const ref of manifest.fallback as string[]) {
    if (!variants[ref] || rawVariants[ref].equipment !== null) throw new HeroLibraryError(`fallback_ref:${ref}`);
  }
  return { library: { trade, services, fallback: [...(manifest.fallback as string[])], variants }, digests, dir };
}

/** The served files of the given variants (img/<name> -> bytes), each re-checked against the manifest sha256. */
export function heroLibraryFiles(loaded: LoadedHeroLibrary, variantIds: Iterable<string>): Record<string, Buffer> {
  const files: Record<string, Buffer> = {};
  for (const id of new Set(variantIds)) {
    const variant = loaded.library.variants[id];
    if (!variant) throw new HeroLibraryError(`unknown_variant:${id}`);
    for (const image of variant.images) {
      for (const served of [image.avif, image.webp]) {
        const relative = served.slice(1);
        let bytes: Buffer;
        try {
          bytes = readUnder(loaded.dir, relative, MAX_IMAGE_BYTES);
        } catch (error) {
          if (error instanceof HeroLibraryError) throw error;
          throw new HeroLibraryError(`missing:${relative}`);
        }
        if (sha256(bytes) !== loaded.digests[relative]) throw new HeroLibraryError(`changed:${relative}`);
        files[relative] = bytes;
      }
    }
  }
  return files;
}

/** The minimal stored-site-record shape the scan reads. */
export interface HeroSiteRecord {
  slug: string;
  createdAt?: string;
  researchId?: string;
  simulation?: boolean;
  collectedData: CollectedData;
  researchedPages?: Array<{ opportunityId: string; seo?: { city?: string | null } }>;
}

/**
 * The trade of a record, or null: a niche that is a trade key itself ('plumber', 'air conditioning'), else the logo trade
 * (logoMarks.logoTradeOf: the niche's trade words, then the primary service's).
 */
export function recordTrade(data: Pick<CollectedData, 'businessNiche' | 'primaryService'> | null | undefined): string | null {
  if (!data) return null;
  const key = typeof data.businessNiche === 'string' ? data.businessNiche.trim().toLowerCase().replace(/[\s_]+/g, '-') : '';
  if ((LOGO_TRADES as readonly string[]).includes(key)) return key;
  return logoTradeOf({ businessNiche: data.businessNiche, primaryService: data.primaryService });
}

/** A record as a peer for the assignment (pages in record order; a page's city = its seo city, else the target location). */
export function peerOf(record: HeroSiteRecord): HeroPeerSite {
  return {
    slug: record.slug,
    createdAt: record.createdAt,
    thermal: ownerHasThermalCamera(record.collectedData),
    pages: (record.researchedPages ?? []).map(page => ({ id: page.opportunityId, city: page.seo?.city ?? record.collectedData.targetLocation ?? null })),
  };
}

function ownerHeroApproved(slug: string): boolean {
  try {
    return readLookRecord(slug)?.hero?.approved === true;
  } catch {
    return false;
  }
}

export interface PeerScanOptions {
  /** Default: the sites data root. */
  sitesRoot?: string;
  /** Default: the research data root. */
  researchBaseDir?: string;
  /** Default: the look record of the slug has an approved hero. */
  ownerHero?: (slug: string) => boolean;
}

/**
 * The approved peer sites of a trade (the deploying site excluded; the caller adds it). A record that cannot be read is
 * skipped (it cannot be live from this store), never fatal.
 */
export async function approvedPeerSites(trade: string, excludeSlug: string, options: PeerScanOptions = {}): Promise<HeroPeerSite[]> {
  const root = options.sitesRoot ?? sitesDir();
  const ownerHero = options.ownerHero ?? ownerHeroApproved;
  let names: string[];
  try {
    names = fs.readdirSync(root).filter(name => name.endsWith('.json')).sort();
  } catch {
    return [];
  }
  const peers: HeroPeerSite[] = [];
  for (const name of names) {
    try {
      const file = path.join(root, name);
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.size > MAX_SITE_RECORD_BYTES) continue;
      const record = JSON.parse(fs.readFileSync(file, 'utf8')) as HeroSiteRecord;
      if (!record || typeof record.slug !== 'string' || record.slug === excludeSlug || `${record.slug}.json` !== name) continue;
      if (!record.researchId || record.simulation || !Array.isArray(record.researchedPages) || !record.collectedData) continue;
      if (recordTrade(record.collectedData) !== trade) continue;
      const dossier = await readResearchDossier(record.researchId, options.researchBaseDir, { bounded: true });
      if (!dossier?.approvedCopyReviewPacket) continue;
      if (ownerHero(record.slug)) continue;
      peers.push(peerOf(record));
    } catch {
      continue;
    }
  }
  return peers;
}

export interface SiteHeroResolution {
  /** Page opportunity id -> hero, for renderResearchedSitePages({ libraryHeroes }). */
  libraryHeroes: Record<string, SiteLookHero>;
  /** Page opportunity id -> variant id (for logs / staff review). */
  picks: Record<string, string>;
  /** img/<name> -> bytes, for the deploy upload set. */
  files: Record<string, Buffer>;
  trade: string | null;
}

const NONE = (trade: string | null): SiteHeroResolution => ({ libraryHeroes: {}, picks: {}, files: {}, trade });

/**
 * The library heroes of the deploying site. Owner photo approved = none (the owner photo wins on every page); no trade or
 * no library for it = none.
 */
export async function resolveSiteLibraryHeroes(record: HeroSiteRecord, ownerPhoto: boolean, options: PeerScanOptions & { libraryRoot?: string } = {}): Promise<SiteHeroResolution> {
  const trade = recordTrade(record.collectedData);
  if (ownerPhoto || !trade) return NONE(trade);
  const loaded = loadHeroLibrary(trade, options.libraryRoot);
  if (!loaded) return NONE(trade);
  const peers = await approvedPeerSites(trade, record.slug, options);
  const picks = assignHeroVariants(loaded.library, [...peers, peerOf(record)]).get(record.slug) ?? {};
  return {
    libraryHeroes: siteLibraryHeroes(loaded.library, picks, false),
    picks,
    files: heroLibraryFiles(loaded, Object.values(picks)),
    trade,
  };
}
