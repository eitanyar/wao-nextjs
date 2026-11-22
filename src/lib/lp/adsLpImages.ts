/**
 * Deploy-time preparation of the Ads Bot landing-page images (cloudflare-pages/deploy). The intake stores raw phone uploads
 * under public/uploads/<session>/; the deployed page lives on <slug>.wao.co.il, where those paths do not exist. So each
 * rendered image is read from disk, EXIF-rotated, resized, re-encoded to WebP and written into the deploy directory under a
 * content-hashed /img/ name. An image that is missing or does not decode is skipped (never a broken <img>).
 *
 * Logo: 2x raster for a header box of at most LOGO_DISPLAY_MAX_WIDTH x LOGO_DISPLAY_HEIGHT CSS px.
 * Work photos: at most WORK_PHOTO_MAX_PX on the long side.
 */

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { isIntakeUploadUrl } from '../google-ads/intakeUploads';
import type { AdsLpImage } from './adsLpUploads';
import { LOGO_DISPLAY_HEIGHT, LOGO_DISPLAY_MAX_WIDTH } from './siteLogo';

export const WORK_PHOTO_MAX_PX = 960;
const LOGO_DENSITY = 2;

export interface PreparedImage extends AdsLpImage {
  /** The file bytes to write at deployDir + src. */
  bytes: Buffer;
}

/** The absolute file of an intake upload URL under `uploadsRoot` (public/uploads), or null for anything else. */
export function uploadFilePath(uploadsRoot: string, url: string): string | null {
  if (!isIntakeUploadUrl(url)) return null;
  const [, , session, file] = url.split('/');
  // path.join over a resolved root, never a multi-argument resolve with a dynamic part (nftSafePaths.test.mjs: whole-cwd trace).
  const root = path.resolve(uploadsRoot);
  const full = path.join(root, session, file);
  return full.startsWith(root + path.sep) ? full : null;
}

function hashedSrc(prefix: string, bytes: Buffer): string {
  return `/img/${prefix}-${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.webp`;
}

async function readUpload(uploadsRoot: string, url: string): Promise<Buffer | null> {
  const file = uploadFilePath(uploadsRoot, url);
  if (!file) return null;
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

export async function prepareLogo(uploadsRoot: string, url: string | null | undefined): Promise<PreparedImage | null> {
  if (!url) return null;
  const input = await readUpload(uploadsRoot, url);
  if (!input) return null;
  try {
    const { data, info } = await sharp(input)
      .rotate()
      .resize({ width: LOGO_DISPLAY_MAX_WIDTH * LOGO_DENSITY, height: LOGO_DISPLAY_HEIGHT * LOGO_DENSITY, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90, alphaQuality: 100 })
      .toBuffer({ resolveWithObject: true });
    const width = Math.max(1, Math.min(LOGO_DISPLAY_MAX_WIDTH, Math.round(info.width / LOGO_DENSITY)));
    const height = Math.max(1, Math.min(LOGO_DISPLAY_HEIGHT, Math.round(info.height / LOGO_DENSITY)));
    return { src: hashedSrc('logo', data), width, height, bytes: data };
  } catch (error) {
    console.warn(`ads-lp logo skipped (${url}):`, error);
    return null;
  }
}

export async function prepareWorkPhoto(uploadsRoot: string, url: string): Promise<PreparedImage | null> {
  const input = await readUpload(uploadsRoot, url);
  if (!input) return null;
  try {
    const { data, info } = await sharp(input)
      .rotate()
      .resize({ width: WORK_PHOTO_MAX_PX, height: WORK_PHOTO_MAX_PX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer({ resolveWithObject: true });
    return { src: hashedSrc('work', data), width: info.width, height: info.height, bytes: data };
  } catch (error) {
    console.warn(`ads-lp work photo skipped (${url}):`, error);
    return null;
  }
}

/** All gallery photos that prepared, in order (the caller applies the 3-6 rule). */
export async function prepareWorkPhotos(uploadsRoot: string, urls: readonly string[]): Promise<PreparedImage[]> {
  const prepared = await Promise.all(urls.map(url => prepareWorkPhoto(uploadsRoot, url)));
  return prepared.filter((image): image is PreparedImage => image !== null);
}
