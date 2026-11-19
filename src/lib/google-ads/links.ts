/** Shared Google Ads marketing-page links. HEBREW-SAFETY: zero Hebrew bytes. */

/**
 * The real Ads Bot intake (used by /google-ads and /google-ads/how-it-works). Eitan 2026-11-15: no page links the
 * example-business mode any more (/google-ads/onboarding?demo=1...); that mode stays in code, unlinked.
 */
export const GOOGLE_ADS_INTAKE_HREF = "/google-ads/onboarding";

/** The "question before you start?" secondary CTA on /google-ads (hero + close): the existing contact form. */
export const GOOGLE_ADS_CONTACT_HREF = "/contact?ref=google-ads#contact-form";

/**
 * dataLayer event names of the /google-ads CTAs (one per placement; GTM maps them to Google Ads conversions).
 * Replaced 2026-11-20: the hero tel: link and the close PhoneReveal (phone_reveal, source google-ads-bottom-cta).
 */
export const GOOGLE_ADS_CTA_EVENTS = {
  heroPrimary: "google_ads_hero_onboarding_click",
  heroSecondary: "google_ads_hero_contact_click",
  closePrimary: "google_ads_close_onboarding_click",
  closeSecondary: "google_ads_close_contact_click",
} as const;
