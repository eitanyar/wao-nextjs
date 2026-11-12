/**
 * M2b.1: static labels of the research-site renderer that have no existing approved Hebrew string.
 *
 * The engineer never authors Hebrew: every label here starts as a `__HE_TODO_<key>__` placeholder and is
 * replaced by a byte-exact waocopy -> Noa patch. When the last placeholder is patched, set
 * RESEARCHED_SITE_LABELS_PENDING_COPY to false: that un-skips the "no __HE_TODO_ in rendered HTML" test
 * in researchedSite.test.ts (and a guard test fails while the flag is true but no placeholder remains).
 *
 * Placeholders must never ship: the paid routes that render research sites stay disabled in production
 * (audit-only release guard) until this flag is false.
 */

export const HE_TODO_PREFIX = '__HE_TODO_';

export const RESEARCHED_SITE_LABELS: Readonly<{
  /** H2 above the homepage list of the owner-named service areas (collectedData.servedAreaNames.listed). */
  serviceAreasHeading: string;
  /** M2b.1b (Maya C1): accessible name (aria-label) of the research-site main navigation bar. */
  mainNavLabel: string;
  /** M2b.1b (Maya C3): visible H2 above the FAQ list (aria-labelledby target of the FAQ section). */
  faqHeading: string;
  /** M2b.1b (Maya C2): small visible heading of the related-links block, also its accessible name. */
  relatedLinksLabel: string;
  /** M2b.1h (Maya; Tamar -> Noa 2026-11-10): visually hidden H2 of the homepage story section when the copy has no storyHeadline. */
  storyFallbackHeading: string;
  /** Content depth (Noa-approved 2026-11-10): H2 of the B1 process steps when the copy has no processHeadline. */
  processHeadingFallback: string;
  /** Content depth (Noa-approved 2026-11-10): H2 of the B4 Q&A when the copy has no qaHeadline. */
  qaHeadingFallback: string;
  /** Content depth (Noa-approved 2026-11-10): H2 of the B6 proof when the copy has no proofHeadline and a review renders in it. */
  proofHeadingReviews: string;
  /** Content depth (Noa-approved 2026-11-10): H2 of the B6 proof when the copy has no proofHeadline and no review renders. */
  proofHeadingFactsOnly: string;
  /** Breadcrumb (Tamar -> Noa 2026-11-11): accessible name (aria-label) of the breadcrumb nav on service pages. Screen-reader only. */
  breadcrumbLabel: string;
}> = {
  serviceAreasHeading: 'אזורי שירות',
  mainNavLabel: 'תפריט ראשי',
  faqHeading: 'שאלות נפוצות',
  relatedLinksLabel: 'שירותים נוספים',
  storyFallbackHeading: 'איך זה קורה',
  processHeadingFallback: 'שלבי העבודה',
  qaHeadingFallback: 'מה שואלים אותי',
  proofHeadingReviews: 'לקוחות מספרים',
  proofHeadingFactsOnly: 'עובדות על העסק',
  breadcrumbLabel: 'מיקומך באתר',
};

/** True while any label above is still a placeholder. Flip to false when the copy patches land. */
export const RESEARCHED_SITE_LABELS_PENDING_COPY = false;

/**
 * Site Bot launch step 2 (capability 9): the visible link to the business's Google profile, on the homepage and in the
 * footer of every research-site page (href: renderSitePages.googleProfileUrl, the same URL as the schema sameAs). New Hebrew,
 * so it starts as a `__HE_TODO_<key>__` placeholder for Tamar -> Noa, with its own pending flag (separate from
 * RESEARCHED_SITE_LABELS_PENDING_COPY so the live labels above stay live). While pending the renderer draws NO profile link
 * (a placeholder can never ship); researchedSite.test.ts fails if the flag disagrees with the value, or if a pending label
 * reaches the HTML. Flip the flag to false when the byte-exact patch lands.
 */
export const RESEARCHED_PROFILE_LINK_LABELS: Readonly<{
  /** Link text, homepage and footer: the business on Google (opens its Google profile / Maps listing). Latin "Google" is isolated in <bdi> by the renderer. */
  googleProfileLink: string;
}> = {
  googleProfileLink: '__HE_TODO_googleProfileLink__ Link text: see this business on Google (opens its Google profile / Maps listing, where its reviews are)',
};

/** True while the profile-link label is a placeholder: no profile link renders. */
export const RESEARCHED_PROFILE_LINK_LABELS_PENDING_COPY = true;
