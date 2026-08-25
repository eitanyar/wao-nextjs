/**
 * GBP audit checklist v0 — scoring engine (spec 2026-08-25_002).
 *
 * Pure, offline rubric over the NormalizedPlace shape from task 2026-08-25_001
 * (src/lib/places/client.ts). Six dimensions, fixed order, each scored
 * pass / fail / unknown. `unknown` means "not observable from the public API"
 * and is distinct from `fail` — never score what you cannot see.
 *
 * v0 has NO weights: total is the raw count of dimensions (always 6);
 * passed / failed / unknown are raw integer counts of each status, never
 * percentages. Rubric rationale: docs/research/site-bot/
 * 009_ulku-local-ranking-fact-check.md §8.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. User-facing strings
 * live in SCORECARD_COPY (authored in tasks 2026-08-25_003/004/005); this
 * engine emits ASCII copyToken keys only and never concatenates copy tokens —
 * the page derives per-dimension status tokens (e.g. `DIM_CATEGORIES_FAIL`)
 * at render time.
 */

import type { NormalizedPlace } from '../places/client';

export type DimStatus = 'pass' | 'fail' | 'unknown';

export interface AuditDimension {
  key: string;
  status: DimStatus;
  evidence: string;
  copyToken: string;
}

export interface AuditResult {
  total: number;
  passed: number;
  failed: number;
  unknown: number;
  dimensions: AuditDimension[];
}

// Explicit literal mapping per spec Requirement 1 — no string concatenation.
const DIM_COPY_TOKENS: Record<
  | 'categories'
  | 'hours'
  | 'phone_website'
  | 'photos'
  | 'reviews'
  | 'description',
  string
> = {
  categories: 'DIM_CATEGORIES_TITLE',
  hours: 'DIM_HOURS_TITLE',
  phone_website: 'DIM_PHONE_WEBSITE_TITLE',
  photos: 'DIM_PHOTOS_TITLE',
  reviews: 'DIM_REVIEWS_TITLE',
  description: 'DIM_DESCRIPTION_TITLE',
};

/**
 * Score one normalized place against audit checklist v0. Pure: no I/O, no env
 * reads, no clock reads. Dimensions are scored in the fixed order:
 * categories, hours, phone_website, photos, reviews, description.
 */
export function scoreAudit(place: NormalizedPlace): AuditResult {
  const dimensions: AuditDimension[] = [];

  // 1. categories — Ulku Step 0: up to 10 categories; exactly one category is
  // the classic neglected-profile signature; zero means the API returned none
  // (not observable, never scored).
  {
    const n = place.types.length;
    const status: DimStatus = n >= 2 ? 'pass' : n === 1 ? 'fail' : 'unknown';
    dimensions.push({
      key: 'categories',
      status,
      evidence: `categories:${n}`,
      copyToken: DIM_COPY_TOKENS.categories,
    });
  }

  // 2. hours — regular periods present AND special (holiday) hours present is
  // the only pass; Ulku flags the 2-3-holiday window, and specialOpeningHours
  // presence proves at least the next holidays were set.
  {
    const regularPresent =
      !!place.regularOpeningHours?.periods && place.regularOpeningHours.periods.length > 0;
    const specialPresent = !!place.specialOpeningHours && place.specialOpeningHours.length > 0;
    const status: DimStatus = regularPresent && specialPresent ? 'pass' : 'fail';
    dimensions.push({
      key: 'hours',
      status,
      evidence: `hours:regular=${regularPresent ? 'present' : 'absent'},special=${
        specialPresent ? 'present' : 'absent'
      }`,
      copyToken: DIM_COPY_TOKENS.hours,
    });
  }

  // 3. phone_website — both a phone (national OR international) and a website
  // must be present; exactly one or neither is a fail.
  {
    const phonePresent = !!place.nationalPhoneNumber || !!place.internationalPhoneNumber;
    const websitePresent = !!place.websiteUri;
    const status: DimStatus = phonePresent && websitePresent ? 'pass' : 'fail';
    dimensions.push({
      key: 'phone_website',
      status,
      evidence: `phone:${phonePresent ? 'present' : 'absent'},website:${
        websitePresent ? 'present' : 'absent'
      }`,
      copyToken: DIM_COPY_TOKENS.phone_website,
    });
  }

  // 4. photos — only scored when the photo lookup actually ran (fetched).
  {
    const fetched = place.photos?.fetched === true;
    const count = place.photos?.count ?? 0;
    const status: DimStatus = !fetched ? 'unknown' : count > 0 ? 'pass' : 'fail';
    dimensions.push({
      key: 'photos',
      status,
      evidence: `photos:count=${count},fetched=${fetched}`,
      copyToken: DIM_COPY_TOKENS.photos,
    });
  }

  // 5. reviews — userRatingCount is the only threshold in v0 (>= 10 passes);
  // both fields undefined means the API exposed nothing (unknown).
  {
    const count = place.userRatingCount;
    const rating = place.rating;
    const status: DimStatus =
      rating !== undefined && count !== undefined ? (count >= 10 ? 'pass' : 'fail') : 'unknown';
    dimensions.push({
      key: 'reviews',
      status,
      evidence: `reviews:count=${count ?? 'na'},rating=${
        rating !== undefined ? rating.toFixed(1) : 'na'
      }`,
      copyToken: DIM_COPY_TOKENS.reviews,
    });
  }

  // 6. description — editorialSummary present and non-empty after trim.
  {
    const present = !!place.editorialSummary && place.editorialSummary.trim().length > 0;
    const status: DimStatus = present ? 'pass' : 'fail';
    dimensions.push({
      key: 'description',
      status,
      evidence: `description:${present ? 'present' : 'absent'}`,
      copyToken: DIM_COPY_TOKENS.description,
    });
  }

  let passed = 0;
  let failed = 0;
  let unknown = 0;
  for (const d of dimensions) {
    if (d.status === 'pass') passed++;
    else if (d.status === 'fail') failed++;
    else unknown++;
  }

  return { total: dimensions.length, passed, failed, unknown, dimensions };
}

/** Alias for scoreAudit — keeps call-site naming natural; single implementation. */
export function auditPlace(place: NormalizedPlace): AuditResult {
  return scoreAudit(place);
}
