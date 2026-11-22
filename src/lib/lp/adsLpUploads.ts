/**
 * Ads Bot landing page (renderStaticHtml 'ads-lp' mode): the owner's logo in the header and a work-photo gallery section.
 * Both are optional; with neither, renderStaticHtml output is byte-identical to the page before this module (asserted in
 * adsLpUploads.test.ts against hashes captured before the change).
 *
 * Pure: no fs, no sharp. The deploy-time image preparation (resize, WebP, content-hashed /img/ names) is
 * src/lib/lp/adsLpImages.ts; which uploads qualify is src/lib/google-ads/intakeUploads.ts.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. The heading and alt texts arrive from intakeUploadStrings.json.
 */

import type { VerticalTheme } from './verticalThemes';
import { fileLogo, LOGO_DISPLAY_HEIGHT, LOGO_DISPLAY_MAX_WIDTH } from './siteLogo';
import { galleryImageAlt, UPLOAD_STRINGS, uploadFeatures, type UploadStrings } from '../google-ads/intakeUploads';

/** A prepared image on the deployed page: a served path plus its display size in CSS px. */
export interface AdsLpImage {
  src: string;
  width: number;
  height: number;
}

export interface AdsLpGalleryPhoto extends AdsLpImage {
  alt: string;
}

export interface AdsLpGallery {
  heading: string;
  photos: readonly AdsLpGalleryPhoto[];
}

/** Served paths the static page may reference: the content-hashed files adsLpImages.ts writes. */
const PREPARED_IMG = /^\/img\/[a-z0-9][a-z0-9-]*\.webp$/;

function validSize(image: AdsLpImage): boolean {
  return Number.isInteger(image.width) && Number.isInteger(image.height) && image.width > 0 && image.height > 0;
}

/** The header brand markup for the logo, or undefined (then the header keeps the text name, unchanged). */
export function adsLpBrandLogo(logo: AdsLpImage | undefined, businessName: string): { html: string; css: string } | undefined {
  if (!logo || !PREPARED_IMG.test(logo.src) || !validSize(logo)) return undefined;
  if (logo.width > LOGO_DISPLAY_MAX_WIDTH || logo.height > LOGO_DISPLAY_HEIGHT) return undefined;
  // No trade context: the plain file logo (no descriptor line), aria-label = the business name.
  return fileLogo(logo.src, logo.width, logo.height, businessName);
}

export const ADS_LP_GALLERY_MIN = 3;
export const ADS_LP_GALLERY_MAX = 6;

/** The gallery that may render: well-formed photos, capped at 6, none below 3, and a heading. */
export function renderableGallery(gallery: AdsLpGallery | undefined): AdsLpGallery | null {
  if (!gallery || !gallery.heading.trim()) return null;
  const photos = gallery.photos.filter(photo => PREPARED_IMG.test(photo.src) && validSize(photo) && photo.alt.trim()).slice(0, ADS_LP_GALLERY_MAX);
  return photos.length >= ADS_LP_GALLERY_MIN ? { heading: gallery.heading, photos } : null;
}

/**
 * The gallery from prepared photos and the strings file; undefined while the gallery strings are missing (feature off) or
 * fewer than 3 photos prepared.
 */
export function adsLpGalleryFromPhotos(photos: readonly AdsLpImage[], businessName: string, strings: UploadStrings = UPLOAD_STRINGS): AdsLpGallery | undefined {
  if (!uploadFeatures(strings).gallery || photos.length < ADS_LP_GALLERY_MIN) return undefined;
  const altTemplate = strings.galleryImageAlt as string;
  return {
    heading: strings.galleryHeading as string,
    photos: photos.slice(0, ADS_LP_GALLERY_MAX).map((photo, index) => ({
      src: photo.src, width: photo.width, height: photo.height, alt: galleryImageAlt(altTemplate, businessName, index + 1),
    })),
  };
}

/** The gallery CSS (added to the page CSS only when the gallery renders). Square-ish tiles, 2 across on phones, 3 from 600px. */
export const ADS_LP_GALLERY_CSS = [
  '.gal{list-style:none;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}',
  '.gal img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:var(--r-sm);background:var(--surface-alt);}',
  '@media (min-width:600px){.gal{grid-template-columns:repeat(3,1fr);gap:12px;}}',
].join('');

type GalleryTheme = Pick<VerticalTheme, 'surface' | 'border' | 'primary'>;

/** The gallery section (between Services and the guarantee / review section). Lazy images: it is below the fold. */
export function adsLpGalleryHtml(t: GalleryTheme, gallery: AdsLpGallery): string {
  const items = gallery.photos.map(photo => `<li><img src="${esc(photo.src)}" width="${photo.width}" height="${photo.height}" alt="${esc(photo.alt)}" loading="lazy" decoding="async" /></li>`).join('');
  return `

  <!-- Work photos -->
  <section id="gallery" data-section="gallery" aria-labelledby="gallery-heading" style="padding:40px 20px;background:${t.surface};border-bottom:1px solid ${t.border};">
    <div style="max-width:700px;margin:0 auto;">
      <h2 id="gallery-heading" style="font-weight:800;font-size:1.4rem;color:${t.primary};margin-bottom:20px;text-align:center;">${esc(gallery.heading)}</h2>
      <ul class="gal" role="list">${items}</ul>
    </div>
  </section>`;
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
