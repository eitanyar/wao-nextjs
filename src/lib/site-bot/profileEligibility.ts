/**
 * Site Bot ads-first launch, build step 1: the per-business half of the offer decision (eligibility.ts holds the rest).
 * Server-side: the trade-scope match reads the GBP taxonomy (src/data/gbp-categories-il.json), which stays out of the
 * browser bundle (eligibility.ts is imported by the audit page).
 *
 * TRADE SCOPE (fix 2026-11-25, evidence: live Places lookups of Israeli GBPs). Most launch gcids are not Places API
 * types, so Places reports many in-scope owners with a generic or missing primaryType: AC techs, cleaners, pest control,
 * photographers come back as primaryType 'service' (display name "Services"), tutors as 'educational_institution' or
 * no primaryType at all, gardeners and handymen as 'general_contractor'. The rule is therefore:
 *
 *   1. primaryType names a launch category                                        -> in scope
 *   2. primaryType is on PLACES_PRIMARY_TYPE_BLOCK (launchTrades.ts, Yonatan's 2026-11-25 Table A sign-off)
 *                                                                                  -> out of scope, id `places:<type>`
 *                                                                                     (the ONLY trade block)
 *   3. otherwise (missing, generic, unlisted): match the Places primaryTypeDisplayName against the launch categories'
 *      heName / enName / synonyms, then `types` against the launch list            -> in scope on a match
 *   4. still unknown                                                               -> eligible (the interview screens it)
 *
 * A primaryType on neither list passes (step 3), so a new Google type is never blocked until it is listed. Secondary
 * `types` never block; they can only put a business in scope. PLACES_MUST_PASS types (general_contractor, laundry, ...)
 * are never blocked (asserted in launchTrades.test.ts).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (Hebrew punctuation is written as \u escapes; the names come
 * from the taxonomy JSON at runtime).
 */
import { getCategoryById } from '../gbp/categoryTaxonomy';
import { hasRatings, isNotOperational, type EligibilityCandidate, type ProfileEligibility } from './eligibility';
import { GENERIC_PLACES_TYPES, isLaunchTrade, LAUNCH_TRADE_CATEGORIES, PLACES_MUST_PASS, PLACES_PRIMARY_TYPE_BLOCK, toGbpCategoryId } from './launchTrades';

export type TradeScopeVia = 'primary_type' | 'display_name' | 'types';

export type TradeScope =
  | { scope: 'in_scope'; categoryId: string; via: TradeScopeVia }
  | { scope: 'out_of_scope'; categoryId: string; via: 'primary_type' }
  | { scope: 'unknown'; categoryId: null; via: null };

/** Same normalisation as categoryTaxonomy.ts: lower case, no quotes / geresh / gershayim / brackets / dashes / slashes. */
export function normalizeCategoryName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/["'\u05F4\u05F3\u2019\u2018()\-\/\\&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let launchNameIndex: Map<string, string> | null = null;

/** normalized name -> launch gcid, built once from the taxonomy entries of the launch list. */
export function launchCategoryNameIndex(): ReadonlyMap<string, string> {
  if (launchNameIndex) return launchNameIndex;
  const index = new Map<string, string>();
  const add = (name: unknown, categoryId: string) => {
    if (typeof name !== 'string') return;
    const key = normalizeCategoryName(name);
    if (key && !index.has(key)) index.set(key, categoryId);
  };
  for (const categoryId of Object.keys(LAUNCH_TRADE_CATEGORIES)) {
    const category = getCategoryById(categoryId);
    if (!category) continue;
    add(category.heName, categoryId);
    add(category.enName, categoryId);
    // "Gardener & Landscaper", "Photographer / Photo Studio": each part is a name too.
    for (const part of category.enName.split(/[/&]/)) add(part, categoryId);
    for (const synonym of category.synonyms ?? []) add(synonym, categoryId);
  }
  launchNameIndex = index;
  return index;
}

const UNKNOWN: TradeScope = { scope: 'unknown', categoryId: null, via: null };

export function tradeScope(candidate: Pick<EligibilityCandidate, 'primaryType' | 'primaryTypeDisplayName' | 'types'>): TradeScope {
  const rawPrimary = typeof candidate.primaryType === 'string' ? candidate.primaryType.trim().toLowerCase() : '';
  const primary = rawPrimary && !GENERIC_PLACES_TYPES.has(rawPrimary) ? toGbpCategoryId(rawPrimary) : null;
  if (primary && isLaunchTrade(primary)) return { scope: 'in_scope', categoryId: primary, via: 'primary_type' };
  // The block runs before the display-name and `types` branches: a blocked primaryType is never rescued by them.
  if (rawPrimary && PLACES_PRIMARY_TYPE_BLOCK.has(rawPrimary) && !PLACES_MUST_PASS.has(rawPrimary)) {
    return { scope: 'out_of_scope', categoryId: `places:${rawPrimary}`, via: 'primary_type' };
  }
  if (typeof candidate.primaryTypeDisplayName === 'string') {
    const match = launchCategoryNameIndex().get(normalizeCategoryName(candidate.primaryTypeDisplayName));
    if (match) return { scope: 'in_scope', categoryId: match, via: 'display_name' };
  }
  for (const type of candidate.types ?? []) {
    if (typeof type !== 'string' || GENERIC_PLACES_TYPES.has(type)) continue;
    const id = toGbpCategoryId(type);
    if (id && isLaunchTrade(id)) return { scope: 'in_scope', categoryId: id, via: 'types' };
  }
  return UNKNOWN;
}

/** The part of the decision that depends on the business alone (no gate, no cap). */
export function profileEligibility(candidate: EligibilityCandidate): ProfileEligibility {
  if (candidate.hasWebsite === true) return 'has_site';
  if (tradeScope(candidate).scope === 'out_of_scope') return 'trade';
  if (isNotOperational(candidate) || !hasRatings(candidate)) return 'profile';
  return 'eligible';
}
