/**
 * The rating line next to a review (reviewContext). Eitan (2026-11-16): a rating is never shown without its review count.
 * Source: docs/copy/site-bot-logo-rating-review-strings-FINAL-2026-11-16.json `ratingWithCount` / `ratingWithCountOne`
 * (Noa FIX applied), written by script from the JSON bytes, never typed.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (\u escapes only). No imports, so lpCopyPrompt can use it without
 * a cycle (ownerFactCopy -> copyGates -> lpCopyPrompt).
 */
export const RATING_LINE_TEMPLATES: Readonly<{ withCount: string; withCountOne: string }> = {
  /** ratingWithCount: {rating}, {count} */
  withCount: "{rating} \u05db\u05d5\u05db\u05d1\u05d9\u05dd \u05d1\u05d2\u05d5\u05d2\u05dc \u00b7 {count} \u05d1\u05d9\u05e7\u05d5\u05e8\u05d5\u05ea",
  /** ratingWithCountOne: {rating} */
  withCountOne: "{rating} \u05db\u05d5\u05db\u05d1\u05d9\u05dd \u05d1\u05d2\u05d5\u05d2\u05dc \u00b7 \u05d1\u05d9\u05e7\u05d5\u05e8\u05ea \u05d0\u05d7\u05ea",
};

/** Review count: a positive integer (number or digit string), else null. Same rule as ownerFactCopy.parseReviewCount. */
export function ratingLineReviewCount(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\s*\d+\s*$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(number) && number > 0 && number <= 100_000 ? number : null;
}

/** The rating line, or null when the rating or the count is missing (or the count is 0). */
export function ratingWithCountLine(starRating: unknown, reviewCount: unknown): string | null {
  const rating = typeof starRating === 'number' ? String(starRating) : typeof starRating === 'string' ? starRating.trim() : '';
  const count = ratingLineReviewCount(reviewCount);
  if (!rating || count === null) return null;
  const template = count === 1 ? RATING_LINE_TEMPLATES.withCountOne : RATING_LINE_TEMPLATES.withCount;
  return template.replace('{rating}', rating).replace('{count}', String(count));
}
