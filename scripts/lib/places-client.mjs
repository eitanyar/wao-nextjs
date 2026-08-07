/**
 * Shared Places API (New) client — extracted from `scripts/gbp-comparison-report.mjs`
 * so the GBP outreach magnet and `scripts/readiness-gate.mjs` (Phase 1 of the
 * Readiness Gate) both read GBP signals through one code path instead of two
 * independent copies of the same API client.
 *
 * See docs/specs/readiness-gate.md §4 for why this extraction exists (neither
 * "wrap gbp-comparison-report.mjs and parse its stdout" nor "reimplement the
 * Places calls a second time" is acceptable — this module is the answer).
 *
 * Field set is deliberately trimmed (Eitan sign-off, 2026-08-03, reconfirmed
 * 2026-08-07 for the Readiness Gate): rating, total review count, and the
 * <=5-review recent-pace proxy. Do NOT add businessStatus/types/primaryType/
 * review-response-rate or any other field without a fresh sign-off.
 *
 * `websiteUri` is intentionally never requested here — it sits behind the
 * Place Details Enterprise SKU (docs/specs/readiness-gate.md §2.1). Site URL
 * stays a human/CLI-supplied input across every caller of this module.
 */

import dns from 'dns';
import { Agent, setGlobalDispatcher } from 'undici';

// This sandbox/host environment has a broken IPv6 route to Google's APIs,
// which makes Node's default happy-eyeballs dual-stack fetch burn its whole
// timeout budget on IPv6 before falling back to IPv4. Forcing IPv4 here is an
// environment workaround (see scripts/ads-overlap.mjs for the same pattern).
// Module-level side effect, same as the original script — runs once per process
// regardless of how many callers import this module (Node ESM module caching).
dns.setDefaultResultOrder('ipv4first');
setGlobalDispatcher(new Agent({ connect: { family: 4 } }));

export const PLACES_BASE = 'https://places.googleapis.com/v1';

/**
 * Text Search — resolves a business name/query to Place candidates.
 * @param {string} apiKey
 * @param {string} query
 * @param {{ maxResults?: number, fetchImpl?: typeof fetch }} [opts]
 */
export async function textSearch(apiKey, query, { maxResults = 5, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'he',
      maxResultCount: maxResults,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Text Search failed (${res.status}) for query "${query}": ${body}`);
  }
  const data = await res.json();
  return data.places || [];
}

/**
 * Place Details — fetches rating/review-count/reviews for a resolved Place ID.
 * Field mask confirmed 2026-08-07 against current Places API (New) docs, no
 * field-set or pricing-tier changes since the 2026-08-03 sign-off.
 * @param {string} apiKey
 * @param {string} placeId
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 */
export async function placeDetails(apiKey, placeId, { fetchImpl = fetch } = {}) {
  const fieldMask = ['id', 'displayName', 'rating', 'userRatingCount', 'reviews', 'formattedAddress'].join(',');
  const res = await fetchImpl(`${PLACES_BASE}/places/${placeId}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Place Details failed (${res.status}) for place ${placeId}: ${body}`);
  }
  return res.json();
}

/**
 * "Recent review pace" proxy — counts how many of the (<=5) reviews Google's
 * Details response surfaces fall within the last 30/60/90 days. This is
 * explicitly a SMALL-SAMPLE ESTIMATE, not true review velocity — Places API
 * only ever returns up to 5 reviews, regardless of how many the business
 * actually has. Callers must label it as such wherever it's rendered.
 * @param {Array<{ publishTime?: string }>} [reviews]
 */
export function recentPace(reviews) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const counts = { d30: 0, d60: 0, d90: 0 };
  for (const r of reviews || []) {
    if (!r.publishTime) continue;
    const ageDays = (now - new Date(r.publishTime).getTime()) / DAY;
    if (ageDays <= 30) counts.d30++;
    if (ageDays <= 60) counts.d60++;
    if (ageDays <= 90) counts.d90++;
  }
  return counts;
}

/**
 * Reduces a raw Place Details response to the `GbpSignals` shape
 * (docs/specs/readiness-gate.md §3) — numeric/structured only, no
 * display-name label and no display formatting. Callers that need a
 * human-readable label (e.g. `gbp-comparison-report.mjs`'s `formatEntry()`)
 * layer that on top of this, not inside it.
 * @param {any} details raw Place Details response
 * @returns {{ rating: number|null, reviewCount: number, recentPace: {d30:number,d60:number,d90:number}, sampleSize: number }}
 */
export function buildEntrySignals(details) {
  return {
    rating: typeof details.rating === 'number' ? details.rating : null,
    reviewCount: details.userRatingCount ?? 0,
    recentPace: recentPace(details.reviews),
    sampleSize: (details.reviews || []).length,
  };
}
