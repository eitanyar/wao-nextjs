/**
 * First-touch campaign attribution (ref + utm_*) for dataLayer pushes and lead POST bodies.
 * HEBREW-SAFETY: zero Hebrew bytes.
 *
 * Per-field first touch, kept in sessionStorage for the tab's session: the first value seen for each field wins and
 * later URLs only fill fields that are still empty. So a visitor who lands on /google-ads?utm_source=x and then walks
 * to /google-ads/onboarding or /contact?ref=google-ads keeps utm_source=x (and picks up ref=google-ads). Storage
 * access is wrapped in try/catch: Safari private mode, disabled storage or a sandboxed iframe must never break a page.
 */

export type LeadTracking = {
  ref: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

/** The dataLayer-ready shape: only the fields that have a value. */
export type AttributionFields = Partial<Record<keyof LeadTracking, string>>;

export const ATTRIBUTION_FIELDS = ["ref", "utm_source", "utm_medium", "utm_campaign"] as const;
export const ATTRIBUTION_STORAGE_KEY = "wao_first_touch_attribution";

export const EMPTY_TRACKING: LeadTracking = { ref: null, utm_source: null, utm_medium: null, utm_campaign: null };

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 200) : null;
}

export function parseAttribution(search: string): LeadTracking {
  const params = new URLSearchParams(search);
  return {
    ref: clean(params.get("ref")),
    utm_source: clean(params.get("utm_source")),
    utm_medium: clean(params.get("utm_medium")),
    utm_campaign: clean(params.get("utm_campaign")),
  };
}

function readStored(storage: StorageLike | null): LeadTracking {
  if (!storage) return { ...EMPTY_TRACKING };
  try {
    const raw = storage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return { ...EMPTY_TRACKING };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...EMPTY_TRACKING };
    const record = parsed as Record<string, unknown>;
    return {
      ref: clean(record.ref),
      utm_source: clean(record.utm_source),
      utm_medium: clean(record.utm_medium),
      utm_campaign: clean(record.utm_campaign),
    };
  } catch {
    return { ...EMPTY_TRACKING };
  }
}

/** Merges the stored first touch with the current URL (stored wins per field) and persists the result. */
export function resolveFirstTouchAttribution(search: string, storage: StorageLike | null): LeadTracking {
  const current = parseAttribution(search);
  const stored = readStored(storage);
  const merged: LeadTracking = { ...EMPTY_TRACKING };
  for (const field of ATTRIBUTION_FIELDS) merged[field] = stored[field] ?? current[field];
  const changed = ATTRIBUTION_FIELDS.some((field) => merged[field] !== stored[field]);
  if (storage && changed) {
    try {
      storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Quota / disabled storage: attribution still works for this page from the URL.
    }
  }
  return merged;
}

function sessionStorageOrNull(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** Browser-only read of the first-touch attribution. Server render pass gets the empty object. */
export function readLeadTracking(): LeadTracking {
  if (typeof window === "undefined") return { ...EMPTY_TRACKING };
  try {
    return resolveFirstTouchAttribution(window.location.search, sessionStorageOrNull());
  } catch {
    return { ...EMPTY_TRACKING };
  }
}

/** Drops empty fields so a dataLayer spread never carries null/undefined keys. */
export function attributionFields(tracking: LeadTracking): AttributionFields {
  const out: AttributionFields = {};
  for (const field of ATTRIBUTION_FIELDS) {
    const value = tracking[field];
    if (value) out[field] = value;
  }
  return out;
}

/** The attribution object for conversion pushes (ads_bot_*, lead_submit). Browser-only; {} on the server. */
export function getAttribution(): AttributionFields {
  return attributionFields(readLeadTracking());
}
