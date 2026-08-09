"use client";
import { useState } from "react";

export type LeadTracking = {
  ref: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

const EMPTY: LeadTracking = { ref: null, utm_source: null, utm_medium: null, utm_campaign: null };

function readFromLocation(): LeadTracking {
  // Guards SSR (window undefined during the server render pass) — the real
  // values are only ever computed client-side, in useState's lazy initializer.
  if (typeof window === "undefined") return EMPTY;
  const params = new URLSearchParams(window.location.search);
  return {
    ref: params.get("ref"),
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
  };
}

/**
 * Reads ref / utm_source / utm_medium / utm_campaign from the page URL once,
 * on first client render (plain window.location.search — no
 * useSearchParams(), so callers don't need a Suspense boundary). Used to
 * attribute leads to campaigns (e.g. the Meta cold-traffic test) both in the
 * dataLayer event and in the /api/lead POST body.
 *
 * Deliberately a useState lazy initializer, not a useEffect — every caller
 * (PhoneReveal, ContactForm, LeadFormLight, CallBookingCTA) only reads
 * `tracking.*` inside event handlers (click/submit payloads), never in
 * rendered JSX, so there is no hydration-mismatch risk in computing the real
 * value on the first client render instead of deferring to a post-mount
 * effect. Also sidesteps the react-hooks/set-state-in-effect lint rule
 * entirely rather than suppressing it.
 */
export function useLeadTracking(): LeadTracking {
  const [tracking] = useState<LeadTracking>(readFromLocation);
  return tracking;
}
