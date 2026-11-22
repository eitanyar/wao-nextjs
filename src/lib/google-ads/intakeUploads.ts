/**
 * Ads Bot intake uploads (2026-11-22): every upload is tagged by the turn it was uploaded in, at upload time.
 *
 *   awaitingLogo         -> 'logo'    -> collectedData.logoUrl          (header only; never the hero, never a Google ad image)
 *   awaitingProfilePhoto -> 'profile' -> collectedData.profilePhotoUrl  (unchanged behaviour)
 *   awaitingWorkPhotos   -> 'work'    -> collectedData.workPhotoUrls    (+ trustAssetUrls, so existing consumers still see them)
 *   anything else (T21)  -> 'trust'   -> collectedData.trustAssetUrls   (unchanged behaviour; may be a WhatsApp / Google screenshot)
 *
 * Only 'work' uploads are photos of real jobs, so only they may become the hero or a gallery photo. A T21 upload is never
 * trusted to be a photo: T21 asks for review screenshots and work photos in one breath.
 *
 * The new turns and the gallery switch on only when their Hebrew strings exist in intakeUploadStrings.json (filled by
 * waocopy patches). Missing strings = the bot prompt, the onboarding UI and the landing pages are exactly as before.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. The Hebrew-letter check uses a \u range.
 */

import type { CollectedData } from '../bot/prompts';
import rawUploadStrings from './intakeUploadStrings.json';

// ─────────────────────────────────────────────────────────────────────────
// Strings (fed from intakeUploadStrings.json, never typed here)
// ─────────────────────────────────────────────────────────────────────────

export const UPLOAD_STRING_KEYS = [
  'logoTurnAsk',
  'logoUploadTitle',
  'workPhotosTurnAsk',
  'workPhotosUploadTitle',
  'galleryHeading',
  'galleryImageAlt',
] as const;
export type UploadStringKey = (typeof UPLOAD_STRING_KEYS)[number];
export type UploadStrings = Readonly<Record<UploadStringKey, string | null>>;

const HEBREW_LETTER = /[\u05D0-\u05EA]/;
const PLACEHOLDER = /\{([A-Za-z]+)\}/g;
const ALLOWED_PLACEHOLDERS: Readonly<Record<UploadStringKey, readonly string[]>> = {
  logoTurnAsk: [],
  logoUploadTitle: [],
  workPhotosTurnAsk: [],
  workPhotosUploadTitle: [],
  galleryHeading: [],
  galleryImageAlt: ['businessName', 'index'],
};

/**
 * The usable strings: a value counts only when it is a non-empty string with at least one Hebrew letter and no placeholder
 * outside its allowed set. Anything else is null, which keeps its feature off (no English, no raw {key} on a live path).
 */
export function resolveUploadStrings(raw: unknown): UploadStrings {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<UploadStringKey, string | null>;
  for (const key of UPLOAD_STRING_KEYS) {
    const value = typeof source[key] === 'string' ? (source[key] as string).trim() : '';
    const placeholders = [...value.matchAll(PLACEHOLDER)].map(match => match[1]);
    const ok = value.length > 0 && HEBREW_LETTER.test(value) && placeholders.every(name => ALLOWED_PLACEHOLDERS[key].includes(name));
    out[key] = ok ? value : null;
  }
  return out;
}

export const UPLOAD_STRINGS: UploadStrings = resolveUploadStrings(rawUploadStrings);

export interface UploadFeatures {
  /** The optional logo turn (T21L) is in the bot script and the upload UI accepts a logo. */
  logoTurn: boolean;
  /** The work-photo turn (T21w) is in the bot script and the upload UI tags its uploads as work photos. */
  workPhotosTurn: boolean;
  /** The landing-page gallery section may render. */
  gallery: boolean;
}

export function uploadFeatures(strings: UploadStrings = UPLOAD_STRINGS): UploadFeatures {
  return {
    logoTurn: strings.logoTurnAsk !== null,
    workPhotosTurn: strings.workPhotosTurnAsk !== null,
    gallery: strings.galleryHeading !== null && strings.galleryImageAlt !== null,
  };
}

/** The alt text of gallery photo number `index` (1-based). */
export function galleryImageAlt(template: string, businessName: string, index: number): string {
  return template.replace(/\{businessName\}/g, businessName).replace(/\{index\}/g, String(index)).replace(/\s{2,}/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────────────────
// Tagging at upload time
// ─────────────────────────────────────────────────────────────────────────

export type UploadKind = 'logo' | 'profile' | 'work' | 'trust';

/** What /api/upload returns: /uploads/<sessionId>/<file>.<ext>. Anything else is never rendered or copied. */
export const INTAKE_UPLOAD_URL = /^\/uploads\/[A-Za-z0-9_-]{1,100}\/[A-Za-z0-9_-]{1,100}\.(?:jpg|jpeg|png|webp|gif)$/;

export function isIntakeUploadUrl(url: unknown): url is string {
  return typeof url === 'string' && INTAKE_UPLOAD_URL.test(url);
}

export interface AwaitingUploadFlags {
  awaitingLogo?: boolean;
  awaitingProfilePhoto?: boolean;
  awaitingWorkPhotos?: boolean;
}

/** The kind of the upload made now. One image turn at a time; logo wins a tie (it is the most specific ask). */
export function uploadKindFor(flags: AwaitingUploadFlags): UploadKind {
  if (flags.awaitingLogo) return 'logo';
  if (flags.awaitingProfilePhoto) return 'profile';
  if (flags.awaitingWorkPhotos) return 'work';
  return 'trust';
}

/** True when the upload takes one image only (the file input drops `multiple`). */
export function isSingleImageUpload(kind: UploadKind): boolean {
  return kind === 'logo' || kind === 'profile';
}

/** collectedData after an upload of `urls` of `kind`. 'trust' and 'profile' are byte-for-byte the previous behaviour. */
export function applyUpload(data: CollectedData, kind: UploadKind, urls: readonly string[]): CollectedData {
  if (!urls.length) return data;
  switch (kind) {
    case 'logo':
      return { ...data, logoUrl: urls[0] };
    case 'profile':
      return { ...data, profilePhotoUrl: urls[0] };
    case 'work':
      return {
        ...data,
        workPhotoUrls: [...(data.workPhotoUrls || []), ...urls],
        trustAssetUrls: [...(data.trustAssetUrls || []), ...urls],
        hasTrustAssets: true,
      };
    case 'trust':
    default:
      return {
        ...data,
        trustAssetUrls: [...(data.trustAssetUrls || []), ...urls],
        hasTrustAssets: true,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Picks: hero, gallery, Google ad images
// ─────────────────────────────────────────────────────────────────────────

function unique(urls: readonly string[]): string[] {
  return [...new Set(urls)];
}

/** The owner's work photos that may be shown: well-formed, de-duplicated, never the logo or the profile photo. */
export function workPhotos(data: CollectedData): string[] {
  const excluded = new Set([data.logoUrl, data.profilePhotoUrl].filter(Boolean));
  return unique((data.workPhotoUrls || []).filter(isIntakeUploadUrl)).filter(url => !excluded.has(url));
}

/**
 * The hero image: the first work photo, else the profile photo, else the vertical fallback. Never a T21 upload (it may be a
 * screenshot) and never the logo.
 */
export function pickHeroImageUrl(data: CollectedData, fallbackUrl: string): string {
  const work = workPhotos(data)[0];
  if (work) return work;
  if (data.profilePhotoUrl && data.profilePhotoUrl !== data.logoUrl) return data.profilePhotoUrl;
  return fallbackUrl;
}

export const GALLERY_MIN_PHOTOS = 3;
export const GALLERY_MAX_PHOTOS = 6;

/** The gallery photos: the first 6 work photos, or none when fewer than 3 exist (a 1-2 photo "gallery" looks empty). */
export function galleryPhotoUrls(data: CollectedData): string[] {
  const photos = workPhotos(data).slice(0, GALLERY_MAX_PHOTOS);
  return photos.length >= GALLERY_MIN_PHOTOS ? photos : [];
}

/** The validated logo upload, or null. */
export function logoUpload(data: CollectedData): string | null {
  return isIntakeUploadUrl(data.logoUrl) ? data.logoUrl : null;
}

/**
 * Source images for the Google Ads image assets: tagged work photos first, then the profile photo, first 4.
 * Trust uploads (T21, trustAssetUrls) are NEVER used: they may be review / WhatsApp screenshots, and a screenshot is
 * never an ad image (2026-11-22). A work photo also sits in trustAssetUrls, but it qualifies through workPhotoUrls.
 * The logo is never included. No work photo and no profile photo = no image assets.
 */
export function adImageSourceUrls(data: CollectedData, max = 4): string[] {
  const work = workPhotos(data);
  const profile = isIntakeUploadUrl(data.profilePhotoUrl) ? [data.profilePhotoUrl] : [];
  return unique([...work, ...profile]).filter(url => !data.logoUrl || url !== data.logoUrl).slice(0, max);
}

// ─────────────────────────────────────────────────────────────────────────
// Live-model guard
// ─────────────────────────────────────────────────────────────────────────

const UPLOAD_FIELDS = ['trustAssetUrls', 'hasTrustAssets', 'profilePhotoUrl', 'logoUrl', 'workPhotoUrls'] as const;

/** Keeps upload fields when a live model rewrites collectedData and drops fields it does not echo. */
export function carryUploadFields(before: CollectedData | undefined, after: CollectedData | undefined): CollectedData | undefined {
  if (!after || !before) return after;
  let out: CollectedData | null = null;
  for (const field of UPLOAD_FIELDS) {
    if (before[field] === undefined || after[field] !== undefined) continue;
    out = out ?? { ...after };
    (out as Record<string, unknown>)[field] = before[field];
  }
  return out ?? after;
}

// ─────────────────────────────────────────────────────────────────────────
// Bot script (ADAM_SYSTEM_PROMPT) blocks
// ─────────────────────────────────────────────────────────────────────────

export interface UploadTurnsPrompt {
  /** Inserted right after T21 (before T21c). '' when the work-photo turn is off. */
  workPhotosTurn: string;
  /** Inserted right after T21c (before T22). '' when the logo turn is off. */
  logoTurn: string;
  /** Appended after the awaitingProfilePhoto line of the OUTPUT FORMAT. '' when both turns are off. */
  outputFields: string;
}

export function buildUploadTurnsPrompt(strings: UploadStrings = UPLOAD_STRINGS): UploadTurnsPrompt {
  const workAsk = strings.workPhotosTurnAsk;
  const logoAsk = strings.logoTurnAsk;
  const workPhotosTurn = workAsk
    ? `\n${[
        'T21w [WORK PHOTOS — ask once, right after T21 (or its skip bridge)]:',
        `  "${workAsk}"`,
        '  → this is the ONLY turn that collects photos of the owner\'s real jobs (before/after, finished work, the van or signage on a job). At T21 ask only for reviews / review screenshots and do NOT use T21\'s [field/visual] photo line.',
        '  → accept up to 6 images. If the user skips/says no — move on immediately, do NOT press.',
        '  → set awaitingWorkPhotos: true in JSON output when asking this turn',
        '  → once uploaded or skipped: set awaitingWorkPhotos: false',
      ].join('\n')}\n`
    : '';
  const logoTurn = logoAsk
    ? `\n${[
        'T21L [OPTIONAL LOGO — ask once, after T21c (or where T21c would be)]:',
        `  "${logoAsk}"`,
        '  → accept ONE image only: the business logo. If the user skips / has no logo — move on immediately, do NOT press, never offer to design one.',
        '  → set awaitingLogo: true in JSON output when asking this turn (never together with awaitingProfilePhoto or awaitingWorkPhotos)',
        '  → once uploaded or skipped: set awaitingLogo: false',
      ].join('\n')}\n`
    : '';
  const outputFields = `${workAsk ? ',\n  "awaitingWorkPhotos": true | false' : ''}${logoAsk ? ',\n  "awaitingLogo": true | false' : ''}`;
  return { workPhotosTurn, logoTurn, outputFields };
}
