/**
 * GBP fix-plan derivation layer (spec 2026-08-25_008 & 2026-08-26_001).
 *
 * Pure, offline mapping from audit dimension failures to actionable fix items.
 * Pass and unknown dimensions produce nothing. Fixed dimension order preserved.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. All strings are ASCII.
 */

import type { AuditResult } from './auditScore';
import type { NormalizedPlace } from '../places/client';
import { resolveGbpCategory } from './categoryTaxonomy';

export type FixItemType = 'write_location' | 'write_categories' | 'manual_owner_action';

export interface FixItem {
  id: string;
  dimension: string;
  type: FixItemType;
  reason: string;
  payloadHint: string;
}

const FIX_MAPPINGS: Record<
  string,
  { type: FixItemType; payloadHint: string }
> = {
  categories: {
    type: 'write_categories',
    payloadHint: 'set primary + secondary categories (owner confirms list; categoryId mapping is WoZ)',
  },
  hours: {
    type: 'write_location',
    payloadHint: 'regularHours + specialHours (owner supplies hours; next 2-3 holidays per Ulku cadence)',
  },
  phone_website: {
    type: 'write_location',
    payloadHint: 'phoneNumbers and/or websiteUri from verified owner data',
  },
  photos: {
    type: 'manual_owner_action',
    payloadHint: 'owner uploads real photos (no public write API in v0)',
  },
  reviews: {
    type: 'manual_owner_action',
    payloadHint: 'review-ask flow via owner channel (Reputation Loop territory; not a profile write)',
  },
  description: {
    type: 'write_location',
    payloadHint: 'description authored from owner facts (Gate-1: per-item Hebrew authorship, no template)',
  },
};

/**
 * Derive fix plan items from an audit result.
 * Maps 'fail' dimensions only (pass/unknown produce nothing), in the audit's dimension order.
 * Resolves primary category and suggested secondary count when place metadata is available.
 */
export function deriveFixPlan(audit: AuditResult, place?: NormalizedPlace): FixItem[] {
  const items: FixItem[] = [];
  const targetPlace = place ?? audit.place;

  for (const dim of audit.dimensions) {
    if (dim.status !== 'fail') continue;
    const mapping = FIX_MAPPINGS[dim.key];
    if (!mapping) continue;

    let payloadHint = mapping.payloadHint;

    if (dim.key === 'categories' && targetPlace) {
      let resolved = targetPlace.primaryType
        ? resolveGbpCategory(targetPlace.primaryType)
        : null;

      if (!resolved?.matched && Array.isArray(targetPlace.types)) {
        for (const t of targetPlace.types) {
          const res = resolveGbpCategory(t);
          if (res.matched) {
            resolved = res;
            break;
          }
        }
      }

      if (resolved?.matched) {
        payloadHint = `set primary (${resolved.matched.categoryId}) + ${resolved.suggestedSecondaries.length} secondary categories`;
      }
    }

    items.push({
      id: `${dim.key}-fix`,
      dimension: dim.key,
      type: mapping.type,
      reason: dim.evidence,
      payloadHint,
    });
  }

  return items;
}
