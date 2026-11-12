/**
 * Site Bot Redesign A (2026-11-13): UI labels of the redesigned site template.
 * Source: docs/copy/site-bot-redesign-ui-labels-FINAL-2026-11-12.json, gated by docs/copy/reviews/noa-redesign-labels-2026-11-13.md
 * ("Redesign A keys that ship"). Written by script from the JSON bytes (and the two moved sticky-bar strings from the
 * renderStaticHtml source), never typed. nav.label reuses RESEARCHED_SITE_LABELS.mainNavLabel; hours.days equals
 * DAY_LETTERS (generationData.ts, asserted in siteDesign.test.ts). hero.cta.call is not wired: the templates already
 * carry their call label (heroCta). Not here (HOLD / later items): hero.cta.navigate, reviews.*, gallery.*, photo.*, og.*,
 * form.submit, footer.*, about.heading, hero.rating*.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (\u escapes only).
 */
export const SITE_DESIGN_LABELS: Readonly<{
  /** skip.link */
  skipLink: string;
  /** hero.cta.whatsapp */
  heroWhatsapp: string;
  /** bar.call (moved from renderStaticHtml.ts:231, emoji removed) */
  barCall: string;
  /** bar.whatsapp (moved from renderStaticHtml.ts:232, emoji removed) */
  barWhatsapp: string;
  /** hero.hours.label */
  hoursLabel: string;
  /** hours.closedDay */
  closedDay: string;
  /** trust.label */
  trustLabel: string;
}> = {
  skipLink: "\u05d3\u05dc\u05d2 \u05dc\u05ea\u05d5\u05db\u05df \u05d4\u05e8\u05d0\u05e9\u05d9",
  heroWhatsapp: "\u05e9\u05dc\u05d7 \u05d4\u05d5\u05d3\u05e2\u05d4 \u05d1\u05d5\u05d5\u05d0\u05d8\u05e1\u05d0\u05e4",
  barCall: "\u05d4\u05ea\u05e7\u05e9\u05e8",
  barWhatsapp: "\u05d5\u05d5\u05d0\u05d8\u05e1\u05d0\u05e4",
  hoursLabel: "\u05e9\u05e2\u05d5\u05ea \u05e4\u05e2\u05d9\u05dc\u05d5\u05ea",
  closedDay: "\u05e1\u05d2\u05d5\u05e8",
  trustLabel: "\u05dc\u05de\u05d4 \u05dc\u05e1\u05de\u05d5\u05da \u05e2\u05dc\u05d9\u05d9",
};
