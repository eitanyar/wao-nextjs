"use client";
import { useEffect } from "react";
import { readLeadTracking } from "@/lib/tracking/attribution";

/**
 * Saves the first-touch ref / utm_* (sessionStorage) once on mount, on every page of the layout, so a campaign that
 * lands on a page without a tracked CTA or form still keeps its source for later conversions. Renders nothing.
 * Reads window.location in an effect (no useSearchParams), so it never makes a static route dynamic.
 * HEBREW-SAFETY: zero Hebrew bytes.
 */
export default function AttributionCapture() {
  useEffect(() => {
    readLeadTracking();
  }, []);
  return null;
}
