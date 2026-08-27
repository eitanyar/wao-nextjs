/**
 * Google Places API (New) lookup client — thin wrapper against the documented REST
 * contract, gated on a key. Mirrors the hasGbpCredentials() env-gate posture from
 * src/lib/gbp/client.ts.
 *
 * Required env var:
 *   PLACES_API_KEY — Google Cloud API key. The Cloud Project must have BOTH:
 *     - Places API (New)  — used by searchPlacesByName (places:searchText)
 *     - Places API (Legacy) — used by getPlacePhotos (the legacy Place Details
 *       endpoint is the only public surface exposing photo counts today; Google
 *       has deprecated it — future migration item, see task completion report)
 *
 * TERMS NOTE (verified 2026-08-25): the Google Maps Platform ToS prohibit caching
 * Places content — Master ToS §3.2.3(b) "No Caching" permits caching only as
 * expressly allowed by the Maps Service Specific Terms, whose §14.3 (Places API,
 * Legacy and New) allows caching latitude/longitude ONLY (30 consecutive calendar
 * days); the Places API policies doc additionally states place_id is the sole
 * caching exemption. This module therefore stays one thin API wrapper with no
 * caching of its own (spec 2026-08-25_001 constraint: cache would live on the
 * route, and even there the content-cache design is pending a terms decision).
 */

const SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const LEGACY_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

// Byte-exact field mask from spec 2026-08-25_001 Requirement 1 + places.location (spec 2026-08-27_001).
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.primaryType,places.primaryTypeDisplayName,places.types,places.businessStatus,places.websiteUri,places.regularOpeningHours,places.specialOpeningHours,places.rating,places.userRatingCount,places.editorialSummary,places.googleMapsUri,places.addressComponents,places.location';

export function hasPlacesKey(): boolean {
  return !!process.env.PLACES_API_KEY;
}

// ── Raw response shapes (subset read by the mapper) ─────────────────────────
interface RawAddressComponent {
  types?: string[];
  longText?: string;
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  businessStatus?: string;
  websiteUri?: string;
  regularOpeningHours?: { openNow?: boolean; periods?: unknown[] };
  specialOpeningHours?: unknown[];
  rating?: number;
  userRatingCount?: number;
  editorialSummary?: { text?: string };
  googleMapsUri?: string;
  addressComponents?: RawAddressComponent[];
  location?: { latitude?: number; longitude?: number };
}

/**
 * Canonical shape for one Places search candidate. Tasks 002/005/011 import this
 * from here — keep it the single source of truth.
 */
export interface NormalizedPlace {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  primaryType?: string;
  primaryTypeDisplayName?: string;
  types: string[];
  businessStatus?: string;
  websiteUri?: string;
  regularOpeningHours?: { openNow?: boolean; periods: unknown[] };
  specialOpeningHours?: unknown[];
  rating?: number;
  userRatingCount?: number;
  editorialSummary?: string;
  googleMapsUri?: string;
  city?: string; // locality longText from addressComponents (first entry whose types include 'locality')
  photos?: { fetched: boolean; count: number };
  location?: { lat: number; lng: number };
}

/**
 * Pure phone normalizer: strip everything except digits; a >=11-digit string
 * starting with the 972 country code is rewritten to the local form with a
 * leading 0. Returns '' when the input has no digits.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('972') && digits.length >= 11) {
    return '0' + digits.slice(3);
  }
  return digits;
}

/**
 * Photo-count lookup via the LEGACY Place Details endpoint (the only public
 * surface exposing photos today; deprecated by Google — acceptable for v0,
 * flagged as a future migration item; do not attempt any other endpoint).
 * Never throws: any error / non-200 yields { fetched: false, count: 0 }.
 */
export async function getPlacePhotos(placeId: string): Promise<{ fetched: boolean; count: number }> {
  if (!hasPlacesKey()) return { fetched: false, count: 0 };
  try {
    const url =
      `${LEGACY_DETAILS_URL}?place_id=${encodeURIComponent(placeId)}` +
      `&fields=photos,place_id&key=${process.env.PLACES_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return { fetched: false, count: 0 };
    const json: { result?: { photos?: unknown[] } } = await res.json();
    const photos = Array.isArray(json?.result?.photos) ? json.result.photos : [];
    return { fetched: true, count: photos.length };
  } catch {
    return { fetched: false, count: 0 };
  }
}

export function mapPlace(p: RawPlace): NormalizedPlace {
  const locality = Array.isArray(p?.addressComponents)
    ? p.addressComponents.find((c) => Array.isArray(c?.types) && c.types.includes('locality'))
    : undefined;

  const out: NormalizedPlace = {
    placeId: p.id ?? '',
    displayName: p.displayName?.text ?? '',
    formattedAddress: p.formattedAddress ?? '',
    types: Array.isArray(p.types) ? p.types : [],
  };

  if (typeof p.nationalPhoneNumber === 'string') out.nationalPhoneNumber = p.nationalPhoneNumber;
  if (typeof p.internationalPhoneNumber === 'string') out.internationalPhoneNumber = p.internationalPhoneNumber;
  if (typeof p.primaryType === 'string') out.primaryType = p.primaryType;
  if (typeof p.primaryTypeDisplayName?.text === 'string') out.primaryTypeDisplayName = p.primaryTypeDisplayName.text;
  if (typeof p.businessStatus === 'string') out.businessStatus = p.businessStatus;
  if (typeof p.websiteUri === 'string') out.websiteUri = p.websiteUri;
  if (p.regularOpeningHours && typeof p.regularOpeningHours === 'object') {
    out.regularOpeningHours = {
      openNow: typeof p.regularOpeningHours.openNow === 'boolean' ? p.regularOpeningHours.openNow : undefined,
      periods: Array.isArray(p.regularOpeningHours.periods) ? p.regularOpeningHours.periods : [],
    };
  }
  if (Array.isArray(p.specialOpeningHours)) out.specialOpeningHours = p.specialOpeningHours;
  if (typeof p.rating === 'number') out.rating = p.rating;
  if (typeof p.userRatingCount === 'number') out.userRatingCount = p.userRatingCount;
  if (typeof p.editorialSummary?.text === 'string') out.editorialSummary = p.editorialSummary.text;
  if (typeof p.googleMapsUri === 'string') out.googleMapsUri = p.googleMapsUri;
  if (typeof locality?.longText === 'string') out.city = locality.longText;
  if (p.location && typeof p.location.latitude === 'number' && typeof p.location.longitude === 'number') {
    out.location = { lat: p.location.latitude, lng: p.location.longitude };
  }

  return out;
}

/**
 * Text Search (New) by business name (+ optional phone). Throws when the key is
 * missing and on any non-2xx response (status + body in the message). A photo
 * lookup failure for one candidate never fails the whole search — that candidate
 * gets photos: { fetched: false, count: 0 }.
 */
export async function searchPlacesByName(opts: { name: string; phone?: string }): Promise<NormalizedPlace[]> {
  if (!hasPlacesKey()) {
    throw new Error('Places API key not configured (PLACES_API_KEY)');
  }
  const textQuery = opts.phone ? `${opts.name} ${opts.phone}` : opts.name;
  const res = await fetch(SEARCH_TEXT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.PLACES_API_KEY!,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, languageCode: 'he', regionCode: 'IL', pageSize: 3 }),
  });
  if (!res.ok) {
    throw new Error(`Places searchText failed: ${res.status} ${await res.text()}`);
  }
  const json: { places?: RawPlace[] } = await res.json();
  const places: RawPlace[] = Array.isArray(json?.places) ? json.places : [];

  const normalized: NormalizedPlace[] = [];
  for (const p of places) {
    const place = mapPlace(p);
    let photos: { fetched: boolean; count: number } = { fetched: false, count: 0 };
    try {
      photos = await getPlacePhotos(place.placeId);
    } catch {
      // getPlacePhotos never throws, but a failure here must not fail the search.
      photos = { fetched: false, count: 0 };
    }
    place.photos = photos;
    normalized.push(place);
  }
  return normalized;
}
