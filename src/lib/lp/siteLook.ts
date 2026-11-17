/**
 * Site Bot visual pack, pre-launch (docs/specs/site-bot-visual-upgrades-fable52-2026-11-16.md sections 1, 2, 4, 7; Eitan
 * decisions 2026-11-16): the optional `look` of a researched site. Two pieces, both from owner-supplied files run by staff
 * (scripts/site-bot-look.mjs), both rendered only after a recorded staff approval:
 *   - hero: a photo backdrop behind the solid hero (Yonatan's conditions: a real <img> in a <picture>, the first image in
 *     the DOM, AVIF then WebP sources, WebP <img> fallback, sizes="100vw", fetchpriority="high", width/height, no lazy,
 *     no fade, no preload link, alt="", a dark overlay over the solid --primary fill);
 *   - logo: the owner's raster logo or a generated name logo, rendered by siteLogo.ts (Fable's rule-based picker).
 * No `look`, or nothing approved = byte-identical output to the site without this module.
 *
 * Pure: no fs, no sharp. The scorer and the image builder are in src/lib/site-bot/siteLookImages.ts; the deploy-time
 * loader is src/lib/site-bot/siteLookStore.ts.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. Every visible string is the business name from the record.
 */

import { DESKTOP_MIN_WIDTH_PX } from './siteDesign';
import type { GeneratedLogoVariant, LogoDisplayOverrides, LogoIconName } from './siteLogo';

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

/** One width of the hero photo: served paths under /img/ (content-hashed names, cached immutable by the Worker). */
export interface SiteLookHeroImage {
  width: number;
  height: number;
  avif: string;
  webp: string;
}

export interface SiteLookHero {
  /** Staff approval recorded in data/site-proof/{slug}/look.json. Anything but true = no photo. */
  approved: boolean;
  /** The widths, ascending (HERO_WIDTHS that fit the source). */
  images: SiteLookHeroImage[];
}

export type SiteLookLogo =
  /**
   * A generated logo: the chosen variant only (the layout is recomputed from the name at render). icon: the trade icon picked
   * at approval; markId: a per-trade mark-library entry ('<vertical>:<id>', siteLogo LOGO_MARK_LIBRARY), used by the icon
   * variant when the library has it, else the icon.
   */
  | { approved: boolean; kind: 'generated'; variant: GeneratedLogoVariant; icon?: LogoIconName; markId?: string }
  /** The owner's logo file, rasterised to WebP; width / height are the display size in CSS px (siteLogo LOGO_DISPLAY_*). */
  | { approved: boolean; kind: 'file'; src: string; width: number; height: number };

export interface SiteLook {
  hero?: SiteLookHero;
  logo?: SiteLookLogo;
  /** Staff display overrides of the header logo (descriptor on / off, lead words); header display only, never the name. */
  logoDisplay?: LogoDisplayOverrides;
}

// ─────────────────────────────────────────────────────────────────────────
// Hero photo: constants shared with the scorer (siteLookImages.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Variant widths (srcset). A source narrower than a width does not get that width (no upscaling). */
export const HERO_WIDTHS: readonly number[] = [480, 768, 1080, 1440, 1920];
/** Minimum source width for a hero photo (scorer gate). */
export const HERO_MIN_SOURCE_WIDTH = 1200;
/** Weight budget (Yonatan): a variant up to 828px wide <= 70 KB; any wider variant, the widest included, <= 180 KB. */
export const HERO_BUDGET = { smallMaxWidth: 828, smallMaxBytes: 70_000, maxBytes: 180_000 } as const;
/** The overlay colour (the template's dark navy) and its alpha over the text zone / at the desktop end edge. */
export const HERO_OVERLAY_RGB: readonly [number, number, number] = [13, 27, 42];
export const HERO_OVERLAY_TEXT_ALPHA = 0.6;
export const HERO_OVERLAY_EDGE_ALPHA = 0.3;
/** Share of the hero width (from the start, the right edge in RTL) the desktop gradient keeps at the text alpha. */
export const HERO_OVERLAY_TEXT_SPAN = 0.8;
/** Minimum white-text contrast over the overlaid photo (WCAG AA body text). */
export const HERO_MIN_CONTRAST = 4.5;
/** Desktop max width of the hero text over a photo (keeps the text inside the full-alpha span). */
export const HERO_PHOTO_TEXT_MAX_PX = 640;

const IMG_PATH = /^\/img\/[a-z0-9][a-z0-9-]*\.(?:avif|webp)$/;

function validImage(image: SiteLookHeroImage): boolean {
  return Number.isInteger(image.width) && Number.isInteger(image.height) && image.width > 0 && image.height > 0
    && IMG_PATH.test(image.avif) && image.avif.endsWith('.avif') && IMG_PATH.test(image.webp) && image.webp.endsWith('.webp');
}

/** The approved, well-formed hero of a look, or null (then the solid hero renders, unchanged). */
export function renderableHero(look: SiteLook | undefined | null): SiteLookHero | null {
  const hero = look?.hero;
  if (!hero || hero.approved !== true || !Array.isArray(hero.images) || !hero.images.length) return null;
  if (!hero.images.every(validImage)) return null;
  const images = [...hero.images].sort((a, b) => a.width - b.width);
  return { approved: true, images };
}

/**
 * The hero backdrop: the first child of section.hero. AVIF source, then WebP source, then the WebP <img> (the widest WebP up
 * to 1080px as src). width/height = the widest variant; fetchpriority="high"; no loading / decoding attributes; alt="".
 */
export function heroBackdropHtml(hero: SiteLookHero): string {
  const set = (format: 'avif' | 'webp') => hero.images.map(image => `${image[format]} ${image.width}w`).join(', ');
  const widest = hero.images[hero.images.length - 1];
  const fallback = [...hero.images].reverse().find(image => image.width <= 1080) ?? hero.images[0];
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="100vw" /><source type="image/webp" srcset="${set('webp')}" sizes="100vw" /><img class="hero-bg" src="${fallback.webp}" srcset="${set('webp')}" sizes="100vw" width="${widest.width}" height="${widest.height}" alt="" fetchpriority="high" /></picture>`;
}

/**
 * The backdrop CSS (added to the page's own CSS only when a photo renders). The section keeps its solid --primary fill
 * underneath; the photo and the overlay sit in the section's own stacking context; the height still comes from the text.
 */
export function heroBackdropCss(): string {
  const [r, g, b] = HERO_OVERLAY_RGB;
  const rgba = (alpha: number) => `rgba(${r},${g},${b},${alpha})`;
  const start = Math.round(HERO_OVERLAY_TEXT_SPAN * 100);
  return [
    '.hero.has-photo{position:relative;isolation:isolate;overflow:hidden;}',
    '.hero.has-photo .hero-bg{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;}',
    `.hero.has-photo::before{content:"";position:absolute;inset:0;z-index:-1;background:${rgba(HERO_OVERLAY_TEXT_ALPHA)};}`,
    '.hero.has-photo h1,.hero.has-photo .sub,.hero.has-photo .hero-note,.hero.has-photo .wao-breadcrumb{text-shadow:0 1px 3px rgba(0,0,0,0.35);}',
    `@media (min-width:${DESKTOP_MIN_WIDTH_PX}px){.hero.has-photo::before{background:linear-gradient(to left, ${rgba(HERO_OVERLAY_TEXT_ALPHA)} 0%, ${rgba(HERO_OVERLAY_TEXT_ALPHA)} ${start}%, ${rgba(HERO_OVERLAY_EDGE_ALPHA)} 100%);}.hero.has-photo .hero-text{max-width:${HERO_PHOTO_TEXT_MAX_PX}px;}}`,
  ].join('');
}
