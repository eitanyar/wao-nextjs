/**
 * Course Thumbnail Design Tokens — "Build AND SEO in the Age of AI"
 *
 * Visual system for all lesson thumbnails (L2-1, L2-2, L2-3, …).
 * Designed for a 1280×720 Puppeteer screenshot; every value below is in
 * canvas pixels at that fixed size (no responsive units needed — the
 * artboard never changes).
 *
 * Owner: Dana (brand). Implementation: Eitan-Dev.
 */

export const COURSE_THUMBNAIL_CANVAS = {
  width: 1280, // YouTube-standard HD thumbnail
  height: 720,
} as const;

export const COURSE_THUMBNAIL_COLORS = {
  // Near-black base — reads "premium/serious", lets mint carry the brand.
  // #0D1117 (GitHub-dark family) chosen over pure #000: softer, less harsh
  // next to YouTube's white UI.
  bg: '#0D1117',

  // WAO mint — the ONLY saturated hue on the canvas. One-accent discipline
  // is what separates "agency course" from "DIY slide".
  accent: '#4AE3B5',
  accentGlow: 'rgba(74, 227, 181, 0.45)', // text-shadow behind accent words
  accentDim: 'rgba(74, 227, 181, 0.55)',  // badge border
  accentWash: 'rgba(74, 227, 181, 0.08)', // badge / bubble fills

  // Headline: near-white, NOT pure white — pure #FFF on near-black vibrates
  // at 92px bold. Contrast vs bg ≈ 17:1, far past 4.5:1.
  headline: '#F2F5F9',

  // Secondary text (course name): cool grey. Contrast vs bg ≈ 7.4:1.
  secondary: '#9AA7B5',

  // Brand wordmark stays pure white — small size, needs max punch.
  brand: '#FFFFFF',

  // Atmosphere glows (background radial gradients). Blue is deliberately
  // desaturated/low-alpha so it reads as depth, never as a second accent.
  glowMint: 'rgba(74, 227, 181, 0.14)',
  glowBlue: 'rgba(56, 97, 251, 0.10)',

  // Blueprint grid lines — barely-there texture, faded toward the bottom.
  gridLine: 'rgba(255, 255, 255, 0.035)',
} as const;

export const COURSE_THUMBNAIL_TYPE = {
  // Hebrew-capable system stack — thumbnails must render with zero network
  // requests (Puppeteer, offline CI). Noto Sans Hebrew covers Linux.
  fontStack:
    '"Heebo", "Assistant", "Noto Sans Hebrew", "Segoe UI", "Arial Hebrew", "Alef", Arial, sans-serif',

  headline: {
    size: 92,          // px — legible at YouTube grid size (~320px wide)
    weight: 800,
    lineHeight: 1.14,
    letterSpacing: '-0.01em',
    maxWidth: 980,     // forces a strong 2-line lockup, keeps clear of motif
  },
  badge: {
    size: 26,
    weight: 700,
  },
  courseName: {
    size: 32,
    weight: 500,
    letterSpacing: '0.01em',
  },
  brand: {
    size: 34,
    weight: 800,
    letterSpacing: '0.14em', // tracked-out caps = wordmark, not a word
  },
} as const;

export const COURSE_THUMBNAIL_SPACING = {
  // Safe padding — keeps content clear of YouTube's duration pill (bottom
  // corner) and hover-progress bar.
  padding: { top: 72, bottom: 64, inline: 80 },

  stackGap: 28,        // vertical rhythm between badge / headline / keyline / course name
  badgePadding: { y: 12, x: 26 },
  badgeRadius: 999,    // full pill

  keyline: { width: 148, height: 6, radius: 3 }, // mint anchor under headline

  brandOffset: { right: 64, bottom: 48 }, // physical corner pin (brief: bottom-right)

  gridSize: 64,        // blueprint grid cell, px
} as const;

/**
 * Per-lesson variables — the ONLY things that change between thumbnails.
 * Everything else above is frozen; that consistency IS the course brand.
 */
export interface CourseThumbnailContent {
  badgeText: string;    // e.g. 'מודול 2 · שיעור 1'
  headline: string;     // lesson title; wrap Latin terms like AI in the accent span
  courseName: string;   // 'בניה + קידום אתרים בעידן ה־AI'
}

export const LESSON_L2_1: CourseThumbnailContent = {
  badgeText: 'מודול 2 · שיעור 1',
  headline: 'איך מתארים את העסק שלך ל־AI',
  courseName: 'בניה + קידום אתרים בעידן ה־AI',
} as const;

/**
 * RTL rules baked into the template (do not regress):
 * - <html dir="rtl">; content column right-aligned via logical flex-start.
 * - Background gradients use position/ellipse, never `to right` sweeps.
 * - Latin tokens ("AI") joined with maqaf-style ־ (U+05BE) so the hyphen
 *   never bidi-flips away from the Hebrew prefix.
 * - Decorative motif pinned to the PHYSICAL left — opposite the text block —
 *   and the WAO brand to the physical bottom-right per the brief.
 */
