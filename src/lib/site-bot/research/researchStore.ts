/**
 * Atomic filesystem store for canonical site research dossiers.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import fs from 'fs';
import path from 'path';
import type { SiteResearchDossier } from './types';

export const SITE_RESEARCH_BASE_DIR = path.join('data', 'site-research');
const RESEARCH_ID_REGEX = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function getBaseDir(customBaseDir?: string): string {
  return customBaseDir ? path.resolve(customBaseDir) : path.resolve(process.cwd(), SITE_RESEARCH_BASE_DIR);
}

export function getResearchPath(researchId: string, customBaseDir?: string): string | null {
  if (typeof researchId !== 'string' || !RESEARCH_ID_REGEX.test(researchId)) {
    return null;
  }

  const baseDir = getBaseDir(customBaseDir);
  const resolved = path.resolve(baseDir, researchId, 'dossier.json');
  const expectedPrefix = `${baseDir}${path.sep}`;
  return resolved.startsWith(expectedPrefix) ? resolved : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function hasValidExternalProvenance(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;
  const hasSourceReference = isNonEmptyString(item.sourceUrl) || isNonEmptyString(item.providerRecordId);
  const hasValidConfidence = typeof item.confidence === 'number'
    && Number.isFinite(item.confidence)
    && item.confidence >= 0
    && item.confidence <= 1;
  const hasExpiryForTimeSensitiveItem = item.timeSensitive !== true || isNonEmptyString(item.expiresAt);

  return isNonEmptyString(item.sourceKind)
    && hasSourceReference
    && isNonEmptyString(item.retrievedAt)
    && hasValidConfidence
    && isNonEmptyString(item.assertionStatus)
    && hasExpiryForTimeSensitiveItem;
}

function isResearchDossier(value: unknown, researchId: string): value is SiteResearchDossier {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const dossier = value as Record<string, unknown>;
  const externalCollections = [
    dossier.evidence,
    dossier.keywordEvidence,
    dossier.serpObservations,
    dossier.providerUsage,
  ];
  const businessTruth = dossier.businessTruth as Record<string, unknown> | null;

  return dossier.researchId === researchId
    && isNonEmptyString(dossier.status)
    && isNonEmptyString(dossier.createdAt)
    && isNonEmptyString(dossier.updatedAt)
    && Boolean(businessTruth)
    && Array.isArray(businessTruth?.assertions)
    && businessTruth.assertions.every(hasValidExternalProvenance)
    && Array.isArray(dossier.evidenceEdges)
    && Array.isArray(dossier.pageOpportunities)
    && Array.isArray(dossier.internalLinkEdges)
    && Array.isArray(dossier.humanGates)
    && externalCollections.every(collection => Array.isArray(collection) && collection.every(hasValidExternalProvenance));
}

export async function readResearchDossier(
  researchId: string,
  customBaseDir?: string
): Promise<SiteResearchDossier | null> {
  const filePath = getResearchPath(researchId, customBaseDir);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    const dossier: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return isResearchDossier(dossier, researchId) ? dossier : null;
  } catch {
    return null;
  }
}

export async function writeResearchDossierAtomic(
  researchId: string,
  dossier: SiteResearchDossier,
  customBaseDir?: string
): Promise<boolean> {
  const filePath = getResearchPath(researchId, customBaseDir);
  if (!filePath || !isResearchDossier(dossier, researchId)) {
    return false;
  }

  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${researchId}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );

  try {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(temporaryPath, JSON.stringify(dossier, null, 2), 'utf8');
    fs.renameSync(temporaryPath, filePath);
    return true;
  } catch {
    fs.rmSync(temporaryPath, { force: true });
    return false;
  }
}
