/**
 * The one door for every Google Business Profile location update (Eitan 2026-11-17): WAO never edits a client's business
 * name on Google. Every PATCH of a location (Business Information API v1, or the legacy v4 shape) is built here, and the
 * builder throws when the body or the updateMask carries a name field:
 *   - v1 Business Information: `title` (the business name);
 *   - older shapes: `name`, `locationName`.
 * Only top-level body keys and the first segment of each updateMask path are names of Location fields (nested keys such as
 * categories.primaryCategory.name are category ids, not the business name). A wildcard mask ('*') is refused too, since
 * it would update every field the body carries.
 * Reading the name (GET with readMask=title) stays allowed; this module only builds updates.
 * The static test (locationUpdateGuard.test.ts) fails when any file in src/ or scripts/ sends a location PATCH without
 * this module.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

/** Location fields that hold (or in older API shapes held) the business name. */
export const GBP_NAME_FIELDS: readonly string[] = ['title', 'name', 'locationName'];

export class GbpNameEditBlockedError extends Error {
  constructor(public readonly field: string, public readonly where: 'body' | 'updateMask') {
    super(`gbp_name_edit_blocked: "${field}" in the ${where} (WAO never edits a client's business name on Google)`);
    this.name = 'GbpNameEditBlockedError';
  }
}

/** Throws GbpNameEditBlockedError when the update would touch the business name. */
export function assertNoGbpNameEdit(body: unknown, updateMask: string): void {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const key of Object.keys(body)) {
      if (GBP_NAME_FIELDS.includes(key)) throw new GbpNameEditBlockedError(key, 'body');
    }
  }
  const mask = decodeURIComponent(String(updateMask ?? ''));
  for (const raw of mask.split(',')) {
    const path = raw.trim();
    if (!path) continue;
    const head = path.split('.')[0];
    if (head === '*' || GBP_NAME_FIELDS.includes(head)) throw new GbpNameEditBlockedError(head, 'updateMask');
  }
}

/**
 * The fetch request of a location update: `${base}/${locationPath}?updateMask=...` with method PATCH and the JSON body,
 * after assertNoGbpNameEdit. The only place in the codebase that builds a GBP location PATCH.
 */
export function gbpLocationPatchRequest(params: {
  base: string;
  locationPath: string;
  updateMask: string;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}): { url: string; init: RequestInit } {
  assertNoGbpNameEdit(params.body, params.updateMask);
  const url = `${params.base}/${params.locationPath}?updateMask=${encodeURIComponent(params.updateMask)}`;
  return {
    url,
    init: {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(params.headers ?? {}) },
      body: JSON.stringify(params.body),
    },
  };
}
