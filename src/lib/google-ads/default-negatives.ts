/**
 * Ads Bot day-one negative keywords (Dror's round-2 product items, Noa-proofed 2026-11-12).
 *
 * Source of truth for the Hebrew: docs/copy/reviews/noa-round3-final-2026-11-12.md,
 * "Final phrase-match negatives (Noa-proofed)". Free intent is blocked as PHRASES only
 * (download / course / guide / software / app + free, both spellings of second-hand).
 * The bare "free" word is NEVER a negative: it would block "free quote" and
 * "free check / consultation" searches, which are buyers. Every negative is sent as PHRASE
 * match (see keyword-normalize.ts NEGATIVE_MATCH_TYPE).
 *
 * Applies to campaigns created from now on. Live campaigns are not touched.
 */

/** The 16 Noa-proofed free-intent / second-hand phrases, in the review file's order. */
export const FREE_INTENT_PHRASE_NEGATIVES: readonly string[] = ["הורדה בחינם", "להוריד בחינם", "קורס בחינם", "מדריך בחינם", "תוכנה בחינם", "אפליקציה בחינם", "הורדה חינם", "להוריד חינם", "קורס חינם", "מדריך חינם", "תוכנה חינם", "אפליקציה חינם", "להורדה בחינם", "להורדה חינם", "יד שנייה", "יד שניה"];

/** Generic low-intent words kept from the original default list (jobs, study, DIY, salary). */
export const GENERIC_WORD_NEGATIVES: readonly string[] = ["דרושים", "קורס", "לימודים", "איך לעשות", "מדריך", "עבודה", "שכר"];

/** The full default list every new campaign starts with, before trade-specific negatives. */
export const DEFAULT_GENERIC_NEGATIVES: readonly string[] = [...GENERIC_WORD_NEGATIVES, ...FREE_INTENT_PHRASE_NEGATIVES];

/** Bare "free" (and its "in/for free" prefixed form): never sent as a negative, even if the strategy model emits it. */
export const NEVER_BLOCK_NEGATIVES: readonly string[] = ["חינם", "בחינם"];

/** True when a cleaned negative text is one of the never-block words. */
export function isNeverBlockNegative(text: string): boolean {
  const t = text.normalize('NFC').trim().toLowerCase();
  return NEVER_BLOCK_NEGATIVES.includes(t);
}
