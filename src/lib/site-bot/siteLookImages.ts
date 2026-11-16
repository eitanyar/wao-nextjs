/**
 * Site Bot visual pack (docs/specs/site-bot-visual-upgrades-fable52-2026-11-16.md section 2): the deterministic hero-photo
 * scorer and the image builders, with `sharp`, no model. Used by the staff CLI (scripts/site-bot-look.mjs) and the tests;
 * no route imports it (the deploy route reads the files this module wrote, through siteLookStore.ts).
 *
 * Hero gates (all must pass, else the site keeps its solid hero):
 *   - landscape (width >= 1.2 x height) and at least HERO_MIN_SOURCE_WIDTH px wide;
 *   - sharp: the 90th-percentile tile of the Laplacian energy >= HERO_MIN_SHARPNESS;
 *   - quiet text zone: the mean Laplacian energy where the text sits <= HERO_MAX_TEXT_ZONE_DETAIL;
 *   - contrast: white text over the photo under the overlay (siteLook HERO_OVERLAY_*), measured on the 95th-percentile
 *     luminance of the blurred text zone, >= HERO_MIN_CONTRAST (4.5:1).
 * Builders: AVIF + WebP per HERO_WIDTHS width, EXIF and every other metadata stripped (orientation applied first), quality
 * stepped down until each file fits HERO_BUDGET (a file that cannot fit throws). The owner logo is rasterised (an SVG is
 * never kept), trimmed and sized for the header.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import { createHash } from 'node:crypto';
import sharp from 'sharp';
import {
  HERO_BUDGET,
  HERO_MIN_CONTRAST,
  HERO_MIN_SOURCE_WIDTH,
  HERO_OVERLAY_RGB,
  HERO_OVERLAY_TEXT_ALPHA,
  HERO_WIDTHS,
} from '../lp/siteLook';
import { LOGO_DISPLAY_HEIGHT, LOGO_DISPLAY_MAX_WIDTH } from '../lp/siteLogo';

/** Landscape means at least this width / height ratio. */
export const HERO_MIN_ASPECT = 1.2;
/** Sharpness floor (calibrated on the repo's demo photos: 11-34 sharp, 1.3-2.1 after a 6px Gaussian blur). */
export const HERO_MIN_SHARPNESS = 4;
/** Text-zone detail ceiling (calibrated: quiet demo photos 5.9-8.6, the busy street scene 21.6). */
export const HERO_MAX_TEXT_ZONE_DETAIL = 14;
/** The text zone, as image fractions: the start (right, RTL) 70% of the width, the middle 80% of the height. */
export const HERO_TEXT_ZONE = { x0: 0.3, x1: 1, y0: 0.1, y1: 0.9 } as const;
/** Analysis width (all metrics are measured on a copy scaled to this width, so they do not depend on the source size). */
const ANALYSIS_WIDTH = 800;
const TILE_COLS = 8;
const TILE_ROWS = 6;

export interface HeroScore {
  width: number;
  height: number;
  landscape: boolean;
  sharpness: number;
  textZoneDetail: number;
  contrast: number;
  pass: boolean;
  /** Failed gates, in gate order (empty when pass). */
  reasons: string[];
  /** Ranking key (higher is better); 0 for a failed photo. */
  rank: number;
}

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an sRGB colour (0-255 channels). */
export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** White-text contrast over one pixel under the overlay (source-over in sRGB, as browsers composite). */
export function whiteContrastOver(r: number, g: number, b: number, alpha = HERO_OVERLAY_TEXT_ALPHA): number {
  const [or, og, ob] = HERO_OVERLAY_RGB;
  const mix = (c: number, o: number) => c * (1 - alpha) + o * alpha;
  return 1.05 / (relativeLuminance(mix(r, or), mix(g, og), mix(b, ob)) + 0.05);
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

/** Scores one candidate hero photo. Never throws for a decodable image; an undecodable file rejects. */
export async function scoreHeroPhoto(input: Buffer): Promise<HeroScore> {
  const oriented = sharp(input, { failOn: 'error' }).rotate();
  const { info: full } = await oriented.clone().raw().toBuffer({ resolveWithObject: true });
  const width = full.width;
  const height = full.height;
  const landscape = width >= height * HERO_MIN_ASPECT;

  const scaled = oriented.clone().resize({ width: ANALYSIS_WIDTH }).removeAlpha().toColourspace('srgb');
  const { data: rgb, info } = await scaled.clone().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const grey = new Float32Array(w * h);
  for (let i = 0; i < w * h; i += 1) grey[i] = 0.2126 * rgb[i * ch] + 0.7152 * rgb[i * ch + 1] + 0.0722 * rgb[i * ch + 2];

  // Laplacian energy per pixel, summed per tile and over the text zone.
  const tileSum = new Float64Array(TILE_COLS * TILE_ROWS);
  const tileCount = new Float64Array(TILE_COLS * TILE_ROWS);
  const zx0 = Math.floor(HERO_TEXT_ZONE.x0 * w);
  const zx1 = Math.ceil(HERO_TEXT_ZONE.x1 * w);
  const zy0 = Math.floor(HERO_TEXT_ZONE.y0 * h);
  const zy1 = Math.ceil(HERO_TEXT_ZONE.y1 * h);
  let zoneSum = 0;
  let zoneCount = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const lap = Math.abs(4 * grey[i] - grey[i - 1] - grey[i + 1] - grey[i - w] - grey[i + w]);
      const tile = Math.min(TILE_ROWS - 1, Math.floor((y / h) * TILE_ROWS)) * TILE_COLS + Math.min(TILE_COLS - 1, Math.floor((x / w) * TILE_COLS));
      tileSum[tile] += lap;
      tileCount[tile] += 1;
      if (x >= zx0 && x < zx1 && y >= zy0 && y < zy1) { zoneSum += lap; zoneCount += 1; }
    }
  }
  const tiles = Array.from(tileSum, (sum, index) => (tileCount[index] ? sum / tileCount[index] : 0));
  const sharpness = percentile(tiles, 0.9);
  const textZoneDetail = zoneCount ? zoneSum / zoneCount : 0;

  // Contrast: the text zone blurred to text scale, composited under the overlay; the 95th-percentile luminance decides.
  const { data: soft, info: softInfo } = await scaled.clone().blur(6).raw().toBuffer({ resolveWithObject: true });
  const luminances: number[] = [];
  const [or, og, ob] = HERO_OVERLAY_RGB;
  const a = HERO_OVERLAY_TEXT_ALPHA;
  for (let y = zy0; y < Math.min(zy1, softInfo.height); y += 2) {
    for (let x = zx0; x < Math.min(zx1, softInfo.width); x += 2) {
      const i = (y * softInfo.width + x) * softInfo.channels;
      luminances.push(relativeLuminance(soft[i] * (1 - a) + or * a, soft[i + 1] * (1 - a) + og * a, soft[i + 2] * (1 - a) + ob * a));
    }
  }
  const contrast = 1.05 / (percentile(luminances, 0.95) + 0.05);

  const reasons: string[] = [];
  if (!landscape) reasons.push('not_landscape');
  if (width < HERO_MIN_SOURCE_WIDTH) reasons.push('too_narrow');
  if (sharpness < HERO_MIN_SHARPNESS) reasons.push('blurry');
  if (textZoneDetail > HERO_MAX_TEXT_ZONE_DETAIL) reasons.push('busy_text_zone');
  if (contrast < HERO_MIN_CONTRAST) reasons.push('low_contrast');
  const pass = reasons.length === 0;
  // Rank: contrast headroom first (legibility), then a quiet text zone, then sharpness.
  const rank = pass ? round((contrast - HERO_MIN_CONTRAST) * 10 + (HERO_MAX_TEXT_ZONE_DETAIL - textZoneDetail) + Math.min(sharpness, 30) / 3) : 0;
  return { width, height, landscape, sharpness: round(sharpness), textZoneDetail: round(textZoneDetail), contrast: round(contrast), pass, reasons, rank };
}

/** Candidates ranked best first (passing photos by rank, then failing ones in input order). */
export function rankHeroScores<T extends { score: HeroScore }>(candidates: readonly T[]): T[] {
  return [...candidates].sort((a, b) => Number(b.score.pass) - Number(a.score.pass) || b.score.rank - a.score.rank);
}

export const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

/** The byte budget of one hero variant width. */
export function heroBudgetFor(width: number): number {
  return width <= HERO_BUDGET.smallMaxWidth ? HERO_BUDGET.smallMaxBytes : HERO_BUDGET.maxBytes;
}

export interface BuiltHeroImage {
  width: number;
  height: number;
  /** Deploy-relative paths (no leading slash): img/hero-{hash}-{width}.{avif|webp}. */
  avif: string;
  webp: string;
  avifBytes: number;
  webpBytes: number;
  avifSha256: string;
  webpSha256: string;
  avifQuality: number;
  webpQuality: number;
}

export interface BuiltHero {
  images: BuiltHeroImage[];
  files: Record<string, Buffer>;
}

const AVIF_QUALITIES = [50, 44, 38, 32, 26, 20];
const WEBP_QUALITIES = [72, 64, 56, 48, 40, 32];

async function encodeWithin(pipeline: sharp.Sharp, format: 'avif' | 'webp', budget: number): Promise<{ bytes: Buffer; quality: number }> {
  const qualities = format === 'avif' ? AVIF_QUALITIES : WEBP_QUALITIES;
  for (const quality of qualities) {
    const bytes = format === 'avif'
      ? await pipeline.clone().avif({ quality, effort: 4, chromaSubsampling: '4:2:0' }).toBuffer()
      : await pipeline.clone().webp({ quality, effort: 4, smartSubsample: true }).toBuffer();
    if (bytes.length <= budget) return { bytes, quality };
  }
  throw new Error(`hero_over_budget:${format}`);
}

/**
 * The hero variants of an approved photo: every HERO_WIDTHS width the source covers, AVIF and WebP, content-hashed names
 * (the source hash), no metadata. Deterministic for a given source and sharp build.
 */
export async function buildHeroVariants(input: Buffer): Promise<BuiltHero> {
  const base = sharp(input, { failOn: 'error' }).rotate();
  const { info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
  const widths = HERO_WIDTHS.filter(width => width <= info.width);
  if (!widths.length) throw new Error('hero_too_narrow');
  const tag = sha256(input).slice(0, 12);
  const images: BuiltHeroImage[] = [];
  const files: Record<string, Buffer> = {};
  for (const width of widths) {
    const resized = base.clone().resize({ width }).removeAlpha().toColourspace('srgb');
    const { info: sized } = await resized.clone().raw().toBuffer({ resolveWithObject: true });
    const budget = heroBudgetFor(width);
    const avif = await encodeWithin(resized, 'avif', budget);
    const webp = await encodeWithin(resized, 'webp', budget);
    const image: BuiltHeroImage = {
      width: sized.width, height: sized.height,
      avif: `img/hero-${tag}-${width}.avif`, webp: `img/hero-${tag}-${width}.webp`,
      avifBytes: avif.bytes.length, webpBytes: webp.bytes.length,
      avifSha256: sha256(avif.bytes), webpSha256: sha256(webp.bytes),
      avifQuality: avif.quality, webpQuality: webp.quality,
    };
    files[image.avif] = avif.bytes;
    files[image.webp] = webp.bytes;
    images.push(image);
  }
  return { images, files };
}

export interface BuiltLogo {
  /** Deploy-relative path: img/logo-{hash}.webp (2x the display size). */
  src: string;
  /** Display size in CSS px. */
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  files: Record<string, Buffer>;
  /** The same raster as PNG, for staff previews (not deployed). */
  png: Buffer;
}

/**
 * The owner's logo for the header: SVG / PNG / JPEG / WebP in, rasterised (SVG at a high density, never kept as SVG),
 * transparent edges trimmed, scaled to LOGO_DISPLAY_HEIGHT (capped at LOGO_DISPLAY_MAX_WIDTH) at 2x, no metadata.
 */
export async function buildOwnerLogo(input: Buffer): Promise<BuiltLogo> {
  const raster = await sharp(input, { failOn: 'error', density: 384, limitInputPixels: 64_000_000 }).rotate().ensureAlpha().png().toBuffer();
  const trimmed = await sharp(raster).trim({ threshold: 10 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  if (!meta.width || !meta.height) throw new Error('logo_unreadable');
  let displayHeight = LOGO_DISPLAY_HEIGHT;
  let displayWidth = Math.round((meta.width / meta.height) * displayHeight);
  if (displayWidth > LOGO_DISPLAY_MAX_WIDTH) {
    displayWidth = LOGO_DISPLAY_MAX_WIDTH;
    displayHeight = Math.max(1, Math.round((meta.height / meta.width) * displayWidth));
  }
  const sized = sharp(trimmed).resize({ width: displayWidth * 2, height: displayHeight * 2, fit: 'fill' });
  const webp = await sized.clone().webp({ quality: 90, alphaQuality: 100, effort: 4 }).toBuffer();
  const png = await sized.clone().png({ compressionLevel: 9 }).toBuffer();
  const hash = sha256(webp);
  const src = `img/logo-${hash.slice(0, 12)}.webp`;
  return { src, width: displayWidth, height: displayHeight, bytes: webp.length, sha256: hash, files: { [src]: webp }, png };
}
