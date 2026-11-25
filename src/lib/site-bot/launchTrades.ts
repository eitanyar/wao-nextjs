/**
 * Site Bot ads-first launch, build step 1: the trades Site Bot builds for at launch, keyed by GBP category id (gcid:*).
 *
 * Scope source: VISION.md "Segment scope, resolved for launch" (Yonatan + Gil, 2026-08-21): field trades (plumber,
 * electrician class: the van / service-radius model), in-home tutors, and photographer. Everything else (storefronts,
 * clinics, restaurants, offices, schools, online-only services) is outside launch scope and gets the trade waiting list.
 *
 * The ids are the ones in src/data/gbp-categories-il.json. A picked GBP is matched on its PRIMARY category only. The audit
 * stores the Places `primaryType` (for local trades the Places type id equals the gcid suffix, e.g. 'plumber' ->
 * gcid:plumber), with PLACES_TYPE_ALIASES for the Places ids that differ from the GBP id.
 *
 * Changing the list is a positioning call (owner: seo-strategist / Adam), not an engineering one: edit only on sign-off,
 * and keep launchTrades.test.ts in step.
 *
 * Pure and browser-safe. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export type LaunchTradeGroup = 'field_trade' | 'in_home_tutor' | 'photographer';

export const LAUNCH_TRADE_CATEGORIES = {
  // Field trades: plumbing, drains, heating
  'gcid:plumber': 'field_trade',
  'gcid:drainage_service': 'field_trade',
  'gcid:sewage_disposal_service': 'field_trade',
  'gcid:heating_contractor': 'field_trade',
  'gcid:water_damage_restoration_service': 'field_trade',
  // Field trades: electrical
  'gcid:electrician': 'field_trade',
  'gcid:electrical_installation_service': 'field_trade',
  'gcid:lighting_contractor': 'field_trade',
  'gcid:generator_repair_service': 'field_trade',
  // Field trades: locks, AC, appliances, security
  'gcid:locksmith': 'field_trade',
  'gcid:hvac_contractor': 'field_trade',
  'gcid:air_conditioning_repair_service': 'field_trade',
  'gcid:air_duct_cleaning_service': 'field_trade',
  'gcid:appliance_repair_service': 'field_trade',
  'gcid:security_system_installer': 'field_trade',
  // Field trades: building finishes and repairs at the customer's home
  'gcid:handyman': 'field_trade',
  'gcid:painter': 'field_trade',
  'gcid:plasterer': 'field_trade',
  'gcid:dry_wall_contractor': 'field_trade',
  'gcid:tile_contractor': 'field_trade',
  'gcid:flooring_contractor': 'field_trade',
  'gcid:carpenter': 'field_trade',
  'gcid:glazier': 'field_trade',
  'gcid:window_installation_service': 'field_trade',
  'gcid:roofer': 'field_trade',
  'gcid:waterproofing_service': 'field_trade',
  'gcid:insulation_contractor': 'field_trade',
  'gcid:soundproofing_contractor': 'field_trade',
  'gcid:fence_contractor': 'field_trade',
  'gcid:bathroom_remodeler': 'field_trade',
  'gcid:general_contractor': 'field_trade',
  // Field trades: home services
  'gcid:pest_control_service': 'field_trade',
  'gcid:moving_company': 'field_trade',
  'gcid:house_cleaning_service': 'field_trade',
  'gcid:carpet_cleaning_service': 'field_trade',
  'gcid:window_cleaning_service': 'field_trade',
  'gcid:gardener': 'field_trade',
  'gcid:tree_service': 'field_trade',
  'gcid:pool_cleaning_service': 'field_trade',
  'gcid:solar_energy_contractor': 'field_trade',
  'gcid:solar_panel_cleaning_service': 'field_trade',
  // In-home tutors (storefront and online-only tutoring are out of this wave)
  'gcid:tutoring_service': 'in_home_tutor',
  // Photographer (studio + on-location hybrid)
  'gcid:photographer': 'photographer',
} as const satisfies Record<string, LaunchTradeGroup>;

export type LaunchTradeCategoryId = keyof typeof LAUNCH_TRADE_CATEGORIES;

/** Places type ids that are not the gcid suffix of the same GBP category. */
export const PLACES_TYPE_ALIASES: Readonly<Record<string, string>> = {
  roofing_contractor: 'gcid:roofer',
};

/** Places types that say nothing about the trade; never treated as a primary category. */
const GENERIC_PLACES_TYPES = new Set(['point_of_interest', 'establishment', 'store', 'service', 'premise', 'food', 'health']);

const TYPE_ID = /^[a-z][a-z0-9_]{1,80}$/;

/** A Places type id or a gcid -> the gcid, or null for anything malformed. */
export function toGbpCategoryId(placesTypeOrGcid: string | null | undefined): string | null {
  if (typeof placesTypeOrGcid !== 'string') return null;
  const value = placesTypeOrGcid.trim().toLowerCase();
  const bare = value.startsWith('gcid:') ? value.slice(5) : value;
  if (!TYPE_ID.test(bare)) return null;
  return PLACES_TYPE_ALIASES[bare] ?? `gcid:${bare}`;
}

/**
 * The primary category of a picked GBP: its Places primaryType, or (audit records written before primaryType was kept)
 * the first non-generic entry of `types`, which Places lists primary-first. Null when neither says anything.
 */
export function primaryCategoryId(candidate: { primaryType?: string; types?: readonly string[] }): string | null {
  const primary = toGbpCategoryId(candidate.primaryType);
  if (primary) return primary;
  for (const type of candidate.types ?? []) {
    if (typeof type !== 'string' || GENERIC_PLACES_TYPES.has(type)) continue;
    const id = toGbpCategoryId(type);
    if (id) return id;
  }
  return null;
}

export function launchTradeGroup(categoryId: string | null | undefined): LaunchTradeGroup | null {
  if (typeof categoryId !== 'string') return null;
  return Object.hasOwn(LAUNCH_TRADE_CATEGORIES, categoryId)
    ? LAUNCH_TRADE_CATEGORIES[categoryId as LaunchTradeCategoryId]
    : null;
}

export function isLaunchTrade(categoryId: string | null | undefined): boolean {
  return launchTradeGroup(categoryId) !== null;
}
