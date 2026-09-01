/**
 * GBP Drift & Health Monitor.
 * Compares baseline audit scorecard against fresh Places API data to compute
 * score deltas, new review velocity, and rank / dimension shifts.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. All strings are ASCII.
 */

import fs from 'fs';
import path from 'path';
import { scoreAudit, type AuditResult } from '../gbp/auditScore';
import type { NormalizedPlace } from '../places/client';
import { UUID_REGEX } from './auditStore';

export interface DriftReport {
  auditId: string;
  baselineScore: number;
  currentScore: number;
  scoreDelta: number;
  newReviewsCount: number;
  ratingDelta: number;
  categoryDrift: boolean;
  hoursDrift: boolean;
  generatedAt: string;
}

function extractScore(audit: Record<string, any>): number {
  if (typeof audit.scorecard === 'number') return audit.scorecard;
  if (typeof audit.score === 'number') return audit.score;
  if (typeof audit.scorecard?.passed === 'number') return audit.scorecard.passed;
  if (typeof audit.score?.passed === 'number') return audit.score.passed;
  if (typeof audit.baselineScore === 'number') return audit.baselineScore;
  if (typeof audit.currentScore === 'number') return audit.currentScore;

  const candidate = audit.place || (Array.isArray(audit.candidates) ? audit.candidates[0] : null);
  if (candidate && typeof candidate === 'object') {
    try {
      const scored: AuditResult = scoreAudit(candidate as NormalizedPlace);
      return scored.passed;
    } catch {
      // Fallback
    }
  }

  return 0;
}

function extractPlace(audit: Record<string, any>): Record<string, any> | undefined {
  if (audit.place && typeof audit.place === 'object') return audit.place;
  if (Array.isArray(audit.candidates) && audit.candidates.length > 0 && typeof audit.candidates[0] === 'object') {
    return audit.candidates[0];
  }
  return undefined;
}

export function calculateAuditDrift(
  baselineAudit: Record<string, any>,
  currentAudit: Record<string, any>
): DriftReport {
  const auditId = String(currentAudit.auditId || baselineAudit.auditId || '');
  const baselineScore = extractScore(baselineAudit);
  const currentScore = extractScore(currentAudit);
  const scoreDelta = currentScore - baselineScore;

  const basePlace = extractPlace(baselineAudit) || {};
  const currPlace = extractPlace(currentAudit) || {};

  // Reviews calculation
  const baseReviews =
    basePlace.userRatingCount ?? baselineAudit.userRatingCount ?? baselineAudit.reviewsCount ?? 0;
  const currReviews =
    currPlace.userRatingCount ?? currentAudit.userRatingCount ?? currentAudit.reviewsCount ?? 0;
  const newReviewsCount = Math.max(0, currReviews - baseReviews);

  // Rating calculation
  const baseRating = basePlace.rating ?? baselineAudit.rating ?? 0;
  const currRating = currPlace.rating ?? currentAudit.rating ?? 0;
  const rawRatingDelta = currRating - baseRating;
  const ratingDelta = Number(rawRatingDelta.toFixed(2));

  // Category drift
  const basePrimary =
    basePlace.primaryType ||
    basePlace.primaryTypeDisplayName ||
    baselineAudit.primaryCategory ||
    '';
  const currPrimary =
    currPlace.primaryType ||
    currPlace.primaryTypeDisplayName ||
    currentAudit.primaryCategory ||
    '';

  const baseTypes = Array.isArray(basePlace.types)
    ? [...basePlace.types].sort().join(',')
    : Array.isArray(baselineAudit.types)
      ? [...baselineAudit.types].sort().join(',')
      : '';
  const currTypes = Array.isArray(currPlace.types)
    ? [...currPlace.types].sort().join(',')
    : Array.isArray(currentAudit.types)
      ? [...currentAudit.types].sort().join(',')
      : '';

  const categoryDrift =
    (basePrimary !== '' && currPrimary !== '' && basePrimary !== currPrimary) ||
    (baseTypes.length > 0 && currTypes.length > 0 && baseTypes !== currTypes);

  // Hours drift
  const baseHours = basePlace.regularOpeningHours
    ? JSON.stringify(basePlace.regularOpeningHours)
    : '';
  const currHours = currPlace.regularOpeningHours
    ? JSON.stringify(currPlace.regularOpeningHours)
    : '';
  const baseSpecial = basePlace.specialOpeningHours
    ? JSON.stringify(basePlace.specialOpeningHours)
    : '';
  const currSpecial = currPlace.specialOpeningHours
    ? JSON.stringify(currPlace.specialOpeningHours)
    : '';

  const hoursDrift =
    (baseHours.length > 0 && currHours.length > 0 && baseHours !== currHours) ||
    (baseSpecial.length > 0 && currSpecial.length > 0 && baseSpecial !== currSpecial);

  return {
    auditId,
    baselineScore,
    currentScore,
    scoreDelta,
    newReviewsCount,
    ratingDelta,
    categoryDrift,
    hoursDrift,
    generatedAt: new Date().toISOString(),
  };
}

export function resolveDriftReportPath(auditId: string, customBaseDir?: string): string | null {
  if (!auditId || typeof auditId !== 'string' || !UUID_REGEX.test(auditId)) {
    return null;
  }
  const baseDir = customBaseDir
    ? path.resolve(customBaseDir)
    : path.join(process.cwd(), 'data', 'audits');
  const resolved = path.join(baseDir, auditId, 'drift-report.json');
  if (!resolved.startsWith(baseDir)) {
    return null;
  }
  return resolved;
}

export function saveDriftReport(
  auditId: string,
  report: DriftReport,
  customBaseDir?: string
): boolean {
  const filePath = resolveDriftReportPath(auditId, customBaseDir);
  if (!filePath) return false;

  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpFile = path.join(
      dir,
      `.drift.${auditId}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
    );
    fs.writeFileSync(tmpFile, JSON.stringify(report, null, 2), 'utf8');
    fs.renameSync(tmpFile, filePath);
    return true;
  } catch {
    return false;
  }
}

export function readDriftReport(
  auditId: string,
  customBaseDir?: string
): DriftReport | null {
  const filePath = resolveDriftReportPath(auditId, customBaseDir);
  if (!filePath || !fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as DriftReport;
  } catch {
    return null;
  }
}
