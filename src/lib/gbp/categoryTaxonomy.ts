/**
 * GBP Category Taxonomy & Resolution Engine (spec 2026-08-26_001).
 *
 * Pure in-memory taxonomy and resolver for Israeli local businesses.
 * Maps Hebrew terms, Places API types, or category IDs to valid Google Category IDs (gcid:*)
 * and recommends optimal secondary categories per Ulku's up-to-10 rule.
 *
 * HEBREW-SAFETY: this module contains ZERO raw Hebrew bytes.
 * All category data resides in src/data/gbp-categories-il.json.
 */

import rawCategories from '../../data/gbp-categories-il.json';

export interface GbpCategory {
  categoryId: string;
  primaryType: string;
  enName: string;
  heName: string;
  synonyms: string[];
  relatedCategoryIds: string[];
}

export type CategoryResolutionConfidence =
  | 'exact_id'
  | 'exact_type'
  | 'exact_name'
  | 'synonym'
  | 'none';

export interface CategoryResolutionResult {
  matched: GbpCategory | null;
  confidence: CategoryResolutionConfidence;
  suggestedSecondaries: GbpCategory[];
}

const CATEGORIES: GbpCategory[] = rawCategories as GbpCategory[];

// In-memory indexing maps for O(1) lookups
const BY_ID = new Map<string, GbpCategory>();
const BY_TYPE = new Map<string, GbpCategory>();
const BY_EN_NAME = new Map<string, GbpCategory>();
const BY_HE_NAME = new Map<string, GbpCategory>();
const BY_SYNONYM = new Map<string, GbpCategory>();

function normalizeText(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/[\"'״׳’‘\(\)\-\/\\]/g, '')
    .replace(/\s+/g, ' ');
}

// Strip common Hebrew prefixes (e.g. 'ה', 'ב', 'ל', 'ש', 'כ', 'מ', 'ו')
function stripHebrewPrefix(normalized: string): string[] {
  const candidates: string[] = [normalized];
  if (normalized.length > 3) {
    // Single prefix char (\u05D4 = He, \u05D1 = Bet, \u05DC = Lamed, \u05E9 = Shin, \u05DB = Kaf, \u05DE = Mem, \u05D5 = Vav)
    const singlePrefixes = ['\u05D4', '\u05D1', '\u05DC', '\u05E9', '\u05DB', '\u05DE', '\u05D5'];
    for (const p of singlePrefixes) {
      if (normalized.startsWith(p)) {
        candidates.push(normalized.slice(p.length));
      }
    }
  }
  if (normalized.length > 4) {
    // Double prefix chars (e.g. 'וה', 'שה', 'בה', 'לה')
    const doublePrefixes = ['\u05D5\u05D4', '\u05E9\u05D4', '\u05D1\u05D4', '\u05DC\u05D4'];
    for (const dp of doublePrefixes) {
      if (normalized.startsWith(dp)) {
        candidates.push(normalized.slice(dp.length));
      }
    }
  }
  return candidates;
}

// Build index
for (const cat of CATEGORIES) {
  BY_ID.set(cat.categoryId.toLowerCase(), cat);
  BY_TYPE.set(cat.primaryType.toLowerCase(), cat);
  BY_EN_NAME.set(normalizeText(cat.enName), cat);
  BY_HE_NAME.set(normalizeText(cat.heName), cat);
  for (const syn of cat.synonyms) {
    const normSyn = normalizeText(syn);
    if (!BY_SYNONYM.has(normSyn)) {
      BY_SYNONYM.set(normSyn, cat);
    }
  }
}

export function getAllCategories(): GbpCategory[] {
  return CATEGORIES;
}

export function getCategoryById(categoryId: string): GbpCategory | undefined {
  if (!categoryId) return undefined;
  return BY_ID.get(categoryId.trim().toLowerCase());
}

/**
 * Suggest up to `limit` secondary categories from the taxonomy's relatedCategoryIds.
 * Default limit = 9 (Ulku's up-to-10 rule: 1 primary + up to 9 secondaries).
 */
export function suggestSecondaryCategories(
  categoryIdOrCategory: string | GbpCategory,
  limit: number = 9
): GbpCategory[] {
  const category =
    typeof categoryIdOrCategory === 'string'
      ? getCategoryById(categoryIdOrCategory)
      : categoryIdOrCategory;

  if (!category || !Array.isArray(category.relatedCategoryIds)) {
    return [];
  }

  const results: GbpCategory[] = [];
  const seen = new Set<string>([category.categoryId]);

  for (const relId of category.relatedCategoryIds) {
    if (results.length >= limit) break;
    const relCat = getCategoryById(relId);
    if (relCat && !seen.has(relCat.categoryId)) {
      seen.add(relCat.categoryId);
      results.push(relCat);
    }
  }

  return results;
}

/**
 * Deterministically resolve a query string or Places API type to a valid GBP category.
 */
export function resolveGbpCategory(queryOrType: string): CategoryResolutionResult {
  if (!queryOrType || typeof queryOrType !== 'string' || !queryOrType.trim()) {
    return { matched: null, confidence: 'none', suggestedSecondaries: [] };
  }

  const raw = queryOrType.trim();
  const normalized = normalizeText(raw);

  // 1. Exact categoryId match (e.g. 'gcid:plumber')
  const byId = BY_ID.get(raw.toLowerCase()) || BY_ID.get(normalized);
  if (byId) {
    return {
      matched: byId,
      confidence: 'exact_id',
      suggestedSecondaries: suggestSecondaryCategories(byId, 9),
    };
  }

  // 2. Exact primaryType match (e.g. 'plumber')
  const byType = BY_TYPE.get(raw.toLowerCase()) || BY_TYPE.get(normalized);
  if (byType) {
    return {
      matched: byType,
      confidence: 'exact_type',
      suggestedSecondaries: suggestSecondaryCategories(byType, 9),
    };
  }

  // 3. Exact heName or enName match
  const searchVariants = stripHebrewPrefix(normalized);

  for (const variant of searchVariants) {
    const byEnName = BY_EN_NAME.get(variant);
    if (byEnName) {
      return {
        matched: byEnName,
        confidence: 'exact_name',
        suggestedSecondaries: suggestSecondaryCategories(byEnName, 9),
      };
    }

    const byHeName = BY_HE_NAME.get(variant);
    if (byHeName) {
      return {
        matched: byHeName,
        confidence: 'exact_name',
        suggestedSecondaries: suggestSecondaryCategories(byHeName, 9),
      };
    }
  }

  // 4. Synonym match in synonyms list
  for (const variant of searchVariants) {
    const bySyn = BY_SYNONYM.get(variant);
    if (bySyn) {
      return {
        matched: bySyn,
        confidence: 'synonym',
        suggestedSecondaries: suggestSecondaryCategories(bySyn, 9),
      };
    }
  }

  return { matched: null, confidence: 'none', suggestedSecondaries: [] };
}

/**
 * Formats a GBP API-compliant patch object for category updates.
 */
export function formatGbpCategoryPatch(
  primaryCategoryId: string,
  secondaryCategoryIds: string[] = []
): { categories: Array<{ categoryId: string; displayName?: string }> } {
  const categories: Array<{ categoryId: string; displayName?: string }> = [];
  const seen = new Set<string>([primaryCategoryId.trim().toLowerCase()]);

  const primary = getCategoryById(primaryCategoryId);
  categories.push({
    categoryId: primaryCategoryId,
    ...(primary?.enName ? { displayName: primary.enName } : {}),
  });

  for (const secId of secondaryCategoryIds) {
    if (!secId) continue;
    const normalizedSecId = secId.trim().toLowerCase();
    if (seen.has(normalizedSecId)) continue;
    seen.add(normalizedSecId);

    const secCat = getCategoryById(secId);
    categories.push({
      categoryId: secId,
      ...(secCat?.enName ? { displayName: secCat.enName } : {}),
    });
  }

  return { categories };
}
