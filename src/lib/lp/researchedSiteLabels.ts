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
}> = {
  serviceAreasHeading: 'אזורי שירות',
  mainNavLabel: 'תפריט ראשי',
  faqHeading: 'שאלות נפוצות',
  relatedLinksLabel: 'שירותים נוספים',
  storyFallbackHeading: 'איך זה קורה',
};

/** True while any label above is still a placeholder. Flip to false when the copy patches land. */
export const RESEARCHED_SITE_LABELS_PENDING_COPY = false;
