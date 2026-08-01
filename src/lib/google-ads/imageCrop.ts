// Server-side crop step for Google Ads Search `ImageAsset` uploads.
//
// Google Ads Search image assets require a 1:1 crop (mandatory) and accept an
// optional 1.91:1 landscape crop. Per Dror's explicit warning
// (docs/specs/ads-bot-asset-completeness.md): NEVER force-crop a portrait
// photo to landscape — it produces unusable crops (subject cut off or
// shrunk to a sliver). So:
//   - 1:1 (square)     — always produced, center-crop, safe for any source shape.
//   - 1.91:1 (landscape) — produced ONLY when the source is already
//     landscape-shaped (aspect ratio >= 1.3). Portrait/near-square sources
//     never get a forced landscape crop.
//
// Uses `sharp` (already a transitive dependency of Next.js's image optimizer;
// pinned here as a direct dependency at the same version — see package.json).

import sharp from 'sharp';

export interface CroppedImageAsset {
  square: Buffer;      // 1:1 — always present
  landscape?: Buffer;  // 1.91:1 — present only if source was landscape-shaped
}

const LANDSCAPE_MIN_ASPECT = 1.3; // per Dror's spec — below this, never force a landscape crop
const SQUARE_SIZE = 1200;         // well above Google's 300×300 minimum
const LANDSCAPE_WIDTH = 1200;
const LANDSCAPE_HEIGHT = Math.round(LANDSCAPE_WIDTH / 1.91); // ≈ 628px, above 600×314 minimum

/**
 * Fetches an image URL and produces the crop(s) needed for a Google Ads
 * Search ImageAsset upload. Returns null on any failure (fetch, decode,
 * unsupported format) — callers must treat this as fail-soft, not fatal.
 */
export async function buildImageAssetCrops(imageUrl: string): Promise<CroppedImageAsset | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const input = Buffer.from(arrayBuffer);

    const image = sharp(input);
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (!width || !height) return null;

    const square = await sharp(input)
      .resize(SQUARE_SIZE, SQUARE_SIZE, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 90 })
      .toBuffer();

    const result: CroppedImageAsset = { square };

    const aspectRatio = width / height;
    if (aspectRatio >= LANDSCAPE_MIN_ASPECT) {
      result.landscape = await sharp(input)
        .resize(LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    return result;
  } catch (err) {
    console.warn(`buildImageAssetCrops failed for ${imageUrl} (non-fatal):`, err);
    return null;
  }
}
