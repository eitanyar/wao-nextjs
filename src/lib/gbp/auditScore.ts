/**
 * GBP audit checklist v0 — pure offline six-dimension scoring.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import type { NormalizedPlace } from '../places/client';
import type { AuditCandidateSnapshot } from '../site-bot/auditStore';

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
  place?: NormalizedPlace;
}

type AuditScorablePlace = NormalizedPlace | AuditCandidateSnapshot;

type DimensionKey = 'categories' | 'hours' | 'phone_website' | 'photos' | 'reviews' | 'description';

const DIM_COPY_TOKENS: Record<DimensionKey, string> = {
  categories: 'DIM_CATEGORIES_TITLE',
  hours: 'DIM_HOURS_TITLE',
  phone_website: 'DIM_PHONE_WEBSITE_TITLE',
  photos: 'DIM_PHOTOS_TITLE',
  reviews: 'DIM_REVIEWS_TITLE',
  description: 'DIM_DESCRIPTION_TITLE',
};

function isSnapshot(place: AuditScorablePlace): place is AuditCandidateSnapshot {
  return 'hasRegularOpeningHours' in place;
}

/** Scores either a transient provider object or the minimized persisted snapshot. */
export function scoreAudit(place: AuditScorablePlace): AuditResult {
  const snapshot = isSnapshot(place) ? place : null;
  const providerPlace: NormalizedPlace | null = snapshot ? null : (place as NormalizedPlace);
  const dimensions: AuditDimension[] = [];

  const categoryCount = place.types.length;
  dimensions.push({
    key: 'categories',
    status: categoryCount >= 2 ? 'pass' : categoryCount === 1 ? 'fail' : 'unknown',
    evidence: `categories:${categoryCount}`,
    copyToken: DIM_COPY_TOKENS.categories,
  });

  const regularPresent = snapshot
    ? snapshot.hasRegularOpeningHours
    : Boolean(providerPlace?.regularOpeningHours?.periods && providerPlace.regularOpeningHours.periods.length > 0);
  const specialPresent = snapshot
    ? snapshot.hasSpecialOpeningHours
    : Boolean(providerPlace?.specialOpeningHours && providerPlace.specialOpeningHours.length > 0);
  dimensions.push({
    key: 'hours',
    status: regularPresent && specialPresent ? 'pass' : 'fail',
    evidence: `hours:regular=${regularPresent ? 'present' : 'absent'},special=${specialPresent ? 'present' : 'absent'}`,
    copyToken: DIM_COPY_TOKENS.hours,
  });

  const phonePresent = snapshot ? snapshot.hasPhone : Boolean(providerPlace?.nationalPhoneNumber || providerPlace?.internationalPhoneNumber);
  const websitePresent = snapshot ? snapshot.hasWebsite : Boolean(providerPlace?.websiteUri);
  dimensions.push({
    key: 'phone_website',
    status: phonePresent && websitePresent ? 'pass' : 'fail',
    evidence: `phone:${phonePresent ? 'present' : 'absent'},website:${websitePresent ? 'present' : 'absent'}`,
    copyToken: DIM_COPY_TOKENS.phone_website,
  });

  const photosFetched = snapshot ? snapshot.photosFetched : providerPlace?.photos?.fetched === true;
  const photoCount = snapshot ? snapshot.photoCount : providerPlace?.photos?.count ?? 0;
  dimensions.push({
    key: 'photos',
    status: !photosFetched ? 'unknown' : photoCount > 0 ? 'pass' : 'fail',
    evidence: `photos:count=${photoCount},fetched=${photosFetched}`,
    copyToken: DIM_COPY_TOKENS.photos,
  });

  const ratingPresent = snapshot ? snapshot.hasRating : providerPlace?.rating !== undefined;
  const ratingCount = snapshot ? snapshot.userRatingCount : providerPlace?.userRatingCount;
  const ratingEvidence = snapshot
    ? (ratingPresent ? 'present' : 'na')
    : (providerPlace?.rating !== undefined ? providerPlace.rating.toFixed(1) : 'na');
  dimensions.push({
    key: 'reviews',
    status: ratingPresent && ratingCount !== undefined ? (ratingCount >= 10 ? 'pass' : 'fail') : 'unknown',
    evidence: `reviews:count=${ratingCount ?? 'na'},rating=${ratingEvidence}`,
    copyToken: DIM_COPY_TOKENS.reviews,
  });

  const descriptionPresent = snapshot
    ? snapshot.hasEditorialSummary
    : Boolean(providerPlace?.editorialSummary && providerPlace.editorialSummary.trim().length > 0);
  dimensions.push({
    key: 'description',
    status: descriptionPresent ? 'pass' : 'fail',
    evidence: `description:${descriptionPresent ? 'present' : 'absent'}`,
    copyToken: DIM_COPY_TOKENS.description,
  });

  const passed = dimensions.filter((dimension) => dimension.status === 'pass').length;
  const failed = dimensions.filter((dimension) => dimension.status === 'fail').length;
  const unknown = dimensions.filter((dimension) => dimension.status === 'unknown').length;
  return { total: dimensions.length, passed, failed, unknown, dimensions, ...(providerPlace ? { place: providerPlace } : {}) };
}

export function auditPlace(place: AuditScorablePlace): AuditResult {
  return scoreAudit(place);
}
