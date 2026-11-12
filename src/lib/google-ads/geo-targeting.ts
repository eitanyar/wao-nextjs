/**
 * Campaign location targeting for Ads Bot campaign creation (Dror's create-campaign triage,
 * fix 1, 2026-11-12). Replaces the old single "all of Israel" criterion.
 *
 * By serviceModel (CollectedData):
 *   - field / mixed (and an unset model, which the bot treats as field): every place the owner
 *     named in specificCities → a geo target constant found with the location-suggestion
 *     service (GeoTargetConstantService.SuggestGeoTargetConstants, locale he, country IL).
 *   - location (storefront): a STOREFRONT_RADIUS_KM radius around streetAddress (+ city). With
 *     no street address it falls back to the named city, never to the whole country.
 *   - event: the named regions / cities, same lookup as field.
 *   - remote: Israel (geoTargetConstants/2376).
 * A non-remote business that matches zero places is BLOCKED (`ok: false`) so the route can
 * refuse before the Google Ads account is created. Never a silent fall back to all of Israel:
 * a country-level suggestion is not accepted for a non-remote business.
 *
 * Every campaign also gets campaign.geo_target_type_setting.positive_geo_target_type = PRESENCE
 * (people physically in / regularly in the area), see buildGeoTargetTypeSetting.
 *
 * The suggestion call is injected (`suggest`) so this module stays unit-testable without network.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { enums } from 'google-ads-api';
import type { CollectedData } from '../bot/prompts';
import { localitiesNamedIn, type Locality } from '../site-bot/servedAreas';

export const ISRAEL_GEO_TARGET_CONSTANT = 'geoTargetConstants/2376';
export const ISRAEL_GEO_TARGET_NAME = 'Israel';
/** Storefront radius (Dror: about 10 km around the address). */
export const STOREFRONT_RADIUS_KM = 10;
/**
 * Upper bound on names sent to the suggestion service in one create. A guard against a pasted
 * paragraph, not a content count: an owner who names more places than this gets the first ones
 * and the rest are reported as unmatched (saved in CampaignConfig), never dropped silently.
 */
export const MAX_GEO_NAMES = 25;

export type GeoServiceModel = NonNullable<CollectedData['serviceModel']>;

/** One suggestion row, flattened from SuggestGeoTargetConstantsResponse.geo_target_constant_suggestions. */
export interface GeoSuggestion {
  resourceName: string;
  name: string;
  canonicalName?: string;
  countryCode?: string;
  targetType?: string;
  /** GeoTargetConstantStatus: 2 / 'ENABLED' is usable. */
  status?: number | string;
  reach?: number;
}

/** Looks up one place name. Production: the location-suggestion service, locale he, country IL. */
export type GeoSuggestFn = (name: string) => Promise<GeoSuggestion[]>;

export type ResolvedGeoTarget =
  | { kind: 'location'; geoTargetConstant: string; name: string; canonicalName?: string; targetType?: string; requestedName: string }
  | { kind: 'proximity'; streetAddress: string; cityName?: string; countryCode: 'IL'; radiusKm: number; name: string };

export type GeoTargetingResult =
  | { ok: true; serviceModel: GeoServiceModel | 'unset'; targets: ResolvedGeoTarget[]; unmatchedNames: string[] }
  | { ok: false; serviceModel: GeoServiceModel | 'unset'; error: string; unmatchedNames: string[] };

export type GeoInput = Pick<CollectedData, 'serviceModel' | 'specificCities' | 'targetLocation' | 'streetAddress' | 'travelBoundary'>;

const SPLIT_PATTERN = /[,;\n\r/|\u00B7\u2022]+/;

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string').join(', ');
  return typeof value === 'string' ? value : '';
}

/**
 * Place names from an owner answer, in his order, deduplicated. Each comma/line-separated piece
 * that names known Israeli localities (servedAreas matching: handles attached prefix letters and
 * pieces joined by a conjunction) contributes their canonical names; any other piece is kept as
 * typed, so the suggestion service still gets a chance at places outside the in-repo list.
 * Pieces with digits (a radius or distance answer) are not place names and are skipped.
 */
export function extractPlaceNames(text: unknown, localities: readonly Locality[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (name: string) => {
    const clean = name.normalize('NFC').replace(/\s+/g, ' ').trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) return;
    seen.add(key);
    out.push(clean);
  };
  for (const piece of asText(text).split(SPLIT_PATTERN)) {
    const trimmed = piece.trim();
    if (!trimmed || /\d/.test(trimmed)) continue;
    const known = localitiesNamedIn(trimmed, localities);
    if (known.length) known.forEach((locality) => add(locality.he_name));
    else add(trimmed);
  }
  return out;
}

function isEnabled(status: GeoSuggestion['status']): boolean {
  return status === undefined || status === null || status === enums.GeoTargetConstantStatus.ENABLED || status === 'ENABLED';
}

/** First usable suggestion: in Israel, enabled, below country level. Google returns them best-first. */
export function pickSuggestion(suggestions: readonly GeoSuggestion[]): GeoSuggestion | null {
  for (const s of suggestions) {
    if (!s?.resourceName) continue;
    if (s.resourceName === ISRAEL_GEO_TARGET_CONSTANT) continue;
    if (s.countryCode && s.countryCode.toUpperCase() !== 'IL') continue;
    if ((s.targetType ?? '').toLowerCase() === 'country') continue;
    if (!isEnabled(s.status)) continue;
    return s;
  }
  return null;
}

async function resolveNames(names: string[], suggest: GeoSuggestFn) {
  const targets: ResolvedGeoTarget[] = [];
  const unmatchedNames: string[] = names.slice(MAX_GEO_NAMES);
  const used = new Set<string>();
  for (const name of names.slice(0, MAX_GEO_NAMES)) {
    let picked: GeoSuggestion | null = null;
    try {
      picked = pickSuggestion(await suggest(name));
    } catch {
      picked = null; // a lookup failure counts as unmatched; the zero-match block still applies
    }
    if (!picked) {
      unmatchedNames.push(name);
      continue;
    }
    if (used.has(picked.resourceName)) continue;
    used.add(picked.resourceName);
    targets.push({
      kind: 'location',
      geoTargetConstant: picked.resourceName,
      name: picked.name,
      canonicalName: picked.canonicalName,
      targetType: picked.targetType,
      requestedName: name,
    });
  }
  return { targets, unmatchedNames };
}

/** Resolves the campaign's location targets. Never throws; `ok: false` means "do not create". */
export async function resolveGeoTargeting(
  data: GeoInput,
  suggest: GeoSuggestFn,
  localities: readonly Locality[],
): Promise<GeoTargetingResult> {
  const serviceModel: GeoServiceModel | 'unset' = data.serviceModel ?? 'unset';

  if (serviceModel === 'remote') {
    return {
      ok: true,
      serviceModel,
      targets: [{ kind: 'location', geoTargetConstant: ISRAEL_GEO_TARGET_CONSTANT, name: ISRAEL_GEO_TARGET_NAME, targetType: 'Country', requestedName: ISRAEL_GEO_TARGET_NAME }],
      unmatchedNames: [],
    };
  }

  const namedPlaces = extractPlaceNames(data.specificCities, localities);
  const names = namedPlaces.length ? namedPlaces : extractPlaceNames(data.targetLocation, localities);

  if (serviceModel === 'location') {
    const streetAddress = asText(data.streetAddress).replace(/\s+/g, ' ').trim();
    if (streetAddress) {
      return {
        ok: true,
        serviceModel,
        targets: [{ kind: 'proximity', streetAddress, cityName: names[0], countryCode: 'IL', radiusKm: STOREFRONT_RADIUS_KM, name: [streetAddress, names[0]].filter(Boolean).join(', ') }],
        unmatchedNames: [],
      };
    }
  }

  if (!names.length) {
    return { ok: false, serviceModel, error: 'No service area to target: the owner named no city or region (specificCities / targetLocation are empty).', unmatchedNames: [] };
  }

  const { targets, unmatchedNames } = await resolveNames(names, suggest);
  if (!targets.length) {
    return { ok: false, serviceModel, error: `None of the service areas matched a Google location: ${unmatchedNames.join(', ')}`, unmatchedNames };
  }
  return { ok: true, serviceModel, targets, unmatchedNames };
}

/** Campaign geo setting: PRESENCE only (no "interest in" the area). Spread into campaigns.create. */
export function buildGeoTargetTypeSetting() {
  return { positive_geo_target_type: enums.PositiveGeoTargetType.PRESENCE };
}

/**
 * campaign_criterion create operations for the resolved targets. No bid_modifier is ever set:
 * a positive location adjustment would raise bids above the per-trade max-CPC ceiling.
 */
export function buildLocationCriteria(campaignResourceName: string, targets: readonly ResolvedGeoTarget[]) {
  return targets.map((target) =>
    target.kind === 'location'
      ? { campaign: campaignResourceName, location: { geo_target_constant: target.geoTargetConstant } }
      : {
          campaign: campaignResourceName,
          proximity: {
            address: { street_address: target.streetAddress, ...(target.cityName ? { city_name: target.cityName } : {}), country_code: target.countryCode },
            radius: target.radiusKm,
            radius_units: enums.ProximityRadiusUnits.KILOMETERS,
          },
        },
  );
}

/** What CampaignConfig stores about the targeting that was actually sent. */
export function summarizeGeoTargets(result: Extract<GeoTargetingResult, { ok: true }>) {
  return {
    serviceModel: result.serviceModel,
    positiveGeoTargetType: 'PRESENCE' as const,
    targets: result.targets.map((t) =>
      t.kind === 'location'
        ? { kind: t.kind, geoTargetConstant: t.geoTargetConstant, name: t.name, ...(t.canonicalName ? { canonicalName: t.canonicalName } : {}), requestedName: t.requestedName }
        : { kind: t.kind, streetAddress: t.streetAddress, ...(t.cityName ? { cityName: t.cityName } : {}), radiusKm: t.radiusKm },
    ),
    unmatchedNames: result.unmatchedNames,
  };
}

/** Maps a raw SuggestGeoTargetConstantsResponse to GeoSuggestion rows. */
export function suggestionsFromResponse(response: unknown): GeoSuggestion[] {
  const rows = (response as { geo_target_constant_suggestions?: Array<{ reach?: number | null; geo_target_constant?: { resource_name?: string | null; name?: string | null; canonical_name?: string | null; country_code?: string | null; target_type?: string | null; status?: number | string | null } | null }> })
    ?.geo_target_constant_suggestions ?? [];
  const out: GeoSuggestion[] = [];
  for (const row of rows) {
    const g = row?.geo_target_constant;
    if (!g?.resource_name) continue;
    out.push({
      resourceName: g.resource_name,
      name: g.name ?? '',
      canonicalName: g.canonical_name ?? undefined,
      countryCode: g.country_code ?? undefined,
      targetType: g.target_type ?? undefined,
      status: g.status ?? undefined,
      reach: row.reach ?? undefined,
    });
  }
  return out;
}
