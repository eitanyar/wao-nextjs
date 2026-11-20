"use client";
import { useState } from "react";
import { readLeadTracking } from "./tracking/attribution";

export type { LeadTracking, AttributionFields } from "./tracking/attribution";
import type { LeadTracking } from "./tracking/attribution";

/**
 * The one helper for conversion pushes: the first-touch attribution object (ref / utm_*), empty fields dropped.
 * Re-exported here so every tracking caller imports attribution from a single place.
 */
export { getAttribution } from "./tracking/attribution";

/**
 * Reads ref / utm_source / utm_medium / utm_campaign once, on first client render (plain window.location.search — no
 * useSearchParams(), so callers don't need a Suspense boundary). First touch is kept per field in sessionStorage
 * (src/lib/tracking/attribution.ts), so the campaign source survives the walk from /google-ads to
 * /google-ads/onboarding or /contact. Used to attribute leads to campaigns both in the dataLayer event and in the
 * /api/lead POST body.
 *
 * Deliberately a useState lazy initializer, not a useEffect — every caller (PhoneReveal, ContactForm, LeadFormLight,
 * CallBookingCTA, TrackedLink) only reads `tracking.*` inside event handlers (click/submit payloads), never in
 * rendered JSX, so there is no hydration-mismatch risk in computing the real value on the first client render instead
 * of deferring to a post-mount effect. Also sidesteps the react-hooks/set-state-in-effect lint rule entirely rather
 * than suppressing it.
 */
export function useLeadTracking(): LeadTracking {
  const [tracking] = useState<LeadTracking>(readLeadTracking);
  return tracking;
}
