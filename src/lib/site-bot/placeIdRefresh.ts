/**
 * Yonatan C4: re-check the stored Places place_id before a site is (re)generated, and at least every 12 months, with an
 * id-only Place Details (New) call (field mask `id`: the "IDs only" SKU, no charge). NOT_FOUND drops the id (so the
 * Google-profile link and the schema sameAs drop with it) and flags the record for staff re-matching. A refreshed id
 * (Google returns a different id for the same place) replaces the stored one. Any other failure (no key, network,
 * quota, 5xx) keeps the record unchanged: a transient error never removes a working link.
 *
 * The id is the only Places field kept (Places policies); this module reads nothing else from the response.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { CollectedData } from '../bot/prompts';
import { isUsablePlaceId } from '../lp/renderSitePages';

const DETAILS_URL = 'https://places.googleapis.com/v1/places/';
/** C4: the latest a stored place_id may go unchecked. Regeneration always re-checks. */
export const PLACE_ID_RECHECK_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export type PlaceIdCheck =
  | { status: 'ok'; placeId: string }
  | { status: 'not_found' }
  | { status: 'unknown'; reason: string };

export type PlaceIdChecker = (placeId: string) => Promise<PlaceIdCheck>;

export interface PlaceIdCheckerOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** The id-only Place Details call behind an injectable fetch. Never throws. */
export function createPlaceIdChecker(options: PlaceIdCheckerOptions = {}): PlaceIdChecker {
  return async placeId => {
    const apiKey = options.apiKey ?? process.env.PLACES_API_KEY;
    if (!apiKey) return { status: 'unknown', reason: 'no_api_key' };
    const fetchImpl = options.fetchImpl ?? fetch;
    try {
      const res = await fetchImpl(`${DETAILS_URL}${encodeURIComponent(placeId)}`, {
        method: 'GET',
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'id' },
        signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
      });
      const body = await res.json().catch(() => null) as { id?: unknown; error?: { status?: unknown } } | null;
      if (res.status === 404 || body?.error?.status === 'NOT_FOUND') return { status: 'not_found' };
      if (!res.ok) return { status: 'unknown', reason: `http_${res.status}` };
      return typeof body?.id === 'string' && isUsablePlaceId(body.id) ? { status: 'ok', placeId: body.id } : { status: 'unknown', reason: 'no_id' };
    } catch {
      return { status: 'unknown', reason: 'network' };
    }
  };
}

/** True when the record's place_id is due a re-check (never checked, or older than PLACE_ID_RECHECK_MAX_AGE_MS). */
export function placeIdRecheckDue(data: Pick<CollectedData, 'placeId' | 'placeIdCheckedAt'>, now: Date): boolean {
  if (!isUsablePlaceId(data.placeId)) return false;
  const checked = data.placeIdCheckedAt ? Date.parse(data.placeIdCheckedAt) : NaN;
  return !Number.isFinite(checked) || now.getTime() - checked >= PLACE_ID_RECHECK_MAX_AGE_MS;
}

export interface PlaceIdRefreshOptions {
  now?: Date;
  /** true (regeneration) = always check; false = only when placeIdRecheckDue. */
  force?: boolean;
}

/**
 * The record after the C4 re-check (a new object; the input is never mutated). No usable id = unchanged, no call (a
 * `fixture-` or malformed id never reaches the Places API, and never renders either: renderSitePages C3).
 */
export async function refreshPlaceId(data: CollectedData, check: PlaceIdChecker, options: PlaceIdRefreshOptions = {}): Promise<{ data: CollectedData; result: PlaceIdCheck | null }> {
  const now = options.now ?? new Date();
  if (!isUsablePlaceId(data.placeId)) return { data, result: null };
  if (!options.force && !placeIdRecheckDue(data, now)) return { data, result: null };
  const result = await check(data.placeId);
  if (result.status === 'unknown') return { data, result };
  if (result.status === 'not_found') {
    const { placeId: _dropped, ...rest } = data;
    void _dropped;
    return { data: { ...rest, placeIdNeedsRematch: true, placeIdCheckedAt: now.toISOString() }, result };
  }
  const { placeIdNeedsRematch: _flag, ...rest } = data;
  void _flag;
  return { data: { ...rest, placeId: result.placeId, placeIdCheckedAt: now.toISOString() }, result };
}
