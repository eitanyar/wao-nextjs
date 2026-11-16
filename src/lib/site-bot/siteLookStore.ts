/**
 * Site Bot visual pack: the per-site look record and its files under data/site-proof/{slug}/ (the siteProof data root,
 * WAO_SITE_PROOF_DIR override). Never data/sites/ (those bytes are matched to the approved copy packet) and never
 * data/clients/.
 *
 *   data/site-proof/{slug}/look.json     the record (photos, logo files, scores, staff approvals with who / when, history)
 *   data/site-proof/{slug}/photos/       owner-supplied photos, as received (named by content hash)
 *   data/site-proof/{slug}/logo/         owner-supplied logo files, as received
 *   data/site-proof/{slug}/img/          the built, approved files the site serves under /img/ (content-hashed names)
 *
 * The staff CLI (scripts/site-bot-look.mjs) writes it; the deploy route reads it through loadSiteLook(), which re-checks
 * every built file against the sha256 recorded at approval. Nothing approved (or no record) = no look; a recorded file
 * that is missing or changed throws SiteLookError (the deploy stops instead of shipping a half look).
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { dataRoot } from '../dataRoots';
import type { SiteLook } from '../lp/siteLook';
import { GENERATED_LOGO_VARIANTS, isLogoIconName, isLogoMarkId, LOGO_DISPLAY_HEIGHT, LOGO_DISPLAY_MAX_WIDTH, type GeneratedLogoVariant, type LogoIconName } from '../lp/siteLogo';

export const LOOK_RECORD_VERSION = 1;
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const BUILT_FILE = /^img\/[a-z0-9][a-z0-9-]*\.(?:avif|webp)$/;
const SOURCE_FILE = /^(?:photos|logo)\/[a-f0-9]{12}\.(?:jpg|jpeg|png|webp|avif|heic|heif|tif|tiff|svg|gif)$/;
const MAX_BUILT_BYTES = 1_000_000;
const MAX_RECORD_BYTES = 1_000_000;

export interface LookApproval { by: string; at: string }

export interface LookSourceEntry {
  /** Relative to the slug dir: photos/{sha12}.{ext} or logo/{sha12}.{ext}. */
  file: string;
  sha256: string;
  originalName: string;
  addedAt: string;
  addedBy: string;
  /** Hero photos: the last scorer result (siteLookImages.HeroScore). */
  score?: Record<string, unknown>;
}

export interface LookHeroImageRecord {
  width: number;
  height: number;
  avif: string;
  webp: string;
  avifBytes: number;
  webpBytes: number;
  avifSha256: string;
  webpSha256: string;
  avifQuality?: number;
  webpQuality?: number;
}

export interface LookHeroRecord {
  approved: boolean;
  source: string;
  sourceSha256: string;
  approval: LookApproval;
  score?: Record<string, unknown>;
  images: LookHeroImageRecord[];
}

export type LookLogoRecord =
  | { approved: boolean; kind: 'generated'; variant: GeneratedLogoVariant; icon?: LogoIconName; markId?: string; approval: LookApproval }
  | { approved: boolean; kind: 'file'; source: string; sourceSha256: string; src: string; width: number; height: number; bytes: number; sha256: string; approval: LookApproval };

export interface LookRecord {
  version: typeof LOOK_RECORD_VERSION;
  slug: string;
  photos: LookSourceEntry[];
  logoFiles: LookSourceEntry[];
  hero?: LookHeroRecord;
  logo?: LookLogoRecord;
  history: Array<{ at: string; by: string; action: string; detail?: string }>;
}

export class SiteLookError extends Error {
  constructor(readonly reason: string) {
    super(`site_look_invalid:${reason}`);
    this.name = 'SiteLookError';
  }
}

export function isSafeLookSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SLUG.test(slug);
}

/** The slug's directory (slug validated; never resolved through a dynamic path.resolve). */
export function siteProofDir(slug: string): string {
  if (!isSafeLookSlug(slug)) throw new SiteLookError('slug');
  return path.join(dataRoot('siteProof').dir, slug);
}

export function emptyLookRecord(slug: string): LookRecord {
  return { version: LOOK_RECORD_VERSION, slug, photos: [], logoFiles: [], history: [] };
}

/** Reads a regular, non-symlink file under the slug dir (every segment below the slug dir checked), bounded. */
function readUnder(slugDir: string, relative: string, maxBytes: number): Buffer {
  const parts = relative.split('/');
  if (parts.some(part => part === '' || part === '.' || part === '..')) throw new SiteLookError(`path:${relative}`);
  const dirStat = fs.lstatSync(slugDir);
  if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) throw new SiteLookError('slug_dir');
  let current = slugDir;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    const last = index === parts.length - 1;
    if (stat.isSymbolicLink()) throw new SiteLookError(`symlink:${relative}`);
    if (last ? !stat.isFile() : !stat.isDirectory()) throw new SiteLookError(`not_a_file:${relative}`);
    if (last && stat.size > maxBytes) throw new SiteLookError(`too_large:${relative}`);
  }
  return fs.readFileSync(current);
}

const isApproval = (value: unknown): value is LookApproval =>
  !!value && typeof value === 'object' && typeof (value as LookApproval).by === 'string' && (value as LookApproval).by.trim() !== ''
  && typeof (value as LookApproval).at === 'string' && !Number.isNaN(Date.parse((value as LookApproval).at));

/** Parses look.json; null when absent. Throws SiteLookError on a malformed record. */
export function readLookRecord(slug: string): LookRecord | null {
  const dir = siteProofDir(slug);
  if (!fs.existsSync(path.join(dir, 'look.json'))) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readUnder(dir, 'look.json', MAX_RECORD_BYTES).toString('utf8'));
  } catch (error) {
    if (error instanceof SiteLookError) throw error;
    throw new SiteLookError('record_json');
  }
  const record = parsed as LookRecord;
  if (!record || typeof record !== 'object' || record.version !== LOOK_RECORD_VERSION || record.slug !== slug
    || !Array.isArray(record.photos) || !Array.isArray(record.logoFiles) || !Array.isArray(record.history)) {
    throw new SiteLookError('record_shape');
  }
  return record;
}

export function writeLookRecord(record: LookRecord): void {
  const dir = siteProofDir(record.slug);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, 'look.json');
  const temp = path.join(dir, `.look.json.${process.pid}.tmp`);
  fs.writeFileSync(temp, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, target);
}

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function builtFile(dir: string, relative: string, expected: string): Buffer {
  if (!BUILT_FILE.test(relative)) throw new SiteLookError(`path:${relative}`);
  let bytes: Buffer;
  try {
    bytes = readUnder(dir, relative, MAX_BUILT_BYTES);
  } catch (error) {
    if (error instanceof SiteLookError) throw error;
    throw new SiteLookError(`missing:${relative}`);
  }
  if (sha256(bytes) !== expected) throw new SiteLookError(`changed:${relative}`);
  return bytes;
}

export interface LoadedSiteLook {
  look: SiteLook;
  /** Deploy-relative paths (img/...) to bytes, for the upload set. */
  files: Record<string, Buffer>;
}

/**
 * The approved look of a site for the deploy: null when there is no record or nothing approved. Only approved pieces are
 * returned (an unapproved hero / logo contributes neither markup nor files).
 */
export function loadSiteLook(slug: string): LoadedSiteLook | null {
  const record = readLookRecord(slug);
  if (!record) return null;
  const dir = siteProofDir(slug);
  const look: SiteLook = {};
  const files: Record<string, Buffer> = {};

  const hero = record.hero;
  if (hero && hero.approved === true) {
    if (!isApproval(hero.approval) || !SOURCE_FILE.test(hero.source) || !Array.isArray(hero.images) || !hero.images.length) throw new SiteLookError('hero_record');
    look.hero = {
      approved: true,
      images: hero.images.map(image => {
        if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width <= 0 || image.height <= 0) throw new SiteLookError('hero_size');
        files[image.avif] = builtFile(dir, image.avif, image.avifSha256);
        files[image.webp] = builtFile(dir, image.webp, image.webpSha256);
        return { width: image.width, height: image.height, avif: `/${image.avif}`, webp: `/${image.webp}` };
      }),
    };
  }

  const logo = record.logo;
  if (logo && logo.approved === true) {
    if (!isApproval(logo.approval)) throw new SiteLookError('logo_record');
    if (logo.kind === 'generated') {
      if (!GENERATED_LOGO_VARIANTS.includes(logo.variant)) throw new SiteLookError('logo_variant');
      if (logo.icon !== undefined && !isLogoIconName(logo.icon)) throw new SiteLookError('logo_icon');
      if (logo.markId !== undefined && !isLogoMarkId(logo.markId)) throw new SiteLookError('logo_mark');
      look.logo = { approved: true, kind: 'generated', variant: logo.variant, ...(logo.icon ? { icon: logo.icon } : {}), ...(logo.markId ? { markId: logo.markId } : {}) };
    } else if (logo.kind === 'file') {
      if (!logo.src.endsWith('.webp') || !Number.isInteger(logo.width) || !Number.isInteger(logo.height)
        || logo.width <= 0 || logo.height <= 0 || logo.width > LOGO_DISPLAY_MAX_WIDTH || logo.height > LOGO_DISPLAY_HEIGHT) throw new SiteLookError('logo_size');
      files[logo.src] = builtFile(dir, logo.src, logo.sha256);
      look.logo = { approved: true, kind: 'file', src: `/${logo.src}`, width: logo.width, height: logo.height };
    } else {
      throw new SiteLookError('logo_kind');
    }
  }

  return look.hero || look.logo ? { look, files } : null;
}
