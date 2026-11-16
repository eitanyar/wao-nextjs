/**
 * Google "Write a review" links. Moved here from src/lib/crm/reviewFlywheelCopy.ts (which re-exports the builder) so
 * the Site-Bot review kit does not import that placeholder copy file. Zero Hebrew.
 */

/** Same rule as isUsablePlaceId in src/lib/lp/renderSitePages.ts (parity-tested in reviewKit.test.ts). */
const PLACE_ID_FORMAT = /^[A-Za-z0-9_-]{10,}$/;

export function isReviewablePlaceId(placeId: unknown): placeId is string {
  return typeof placeId === 'string' && PLACE_ID_FORMAT.test(placeId) && !/^fixture/i.test(placeId);
}

/**
 * Resolve a Google "Write a review" deep link.
 * Pre-formatted shortlinks / URLs (http://, https://, g.page/) pass through untouched;
 * a raw Google Place ID (e.g. ChIJ...) becomes the canonical writereview URL.
 */
export function buildGoogleWriteReviewUrl(placeIdOrShortLink: string): string {
  const value = placeIdOrShortLink.trim();
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('g.page/')) {
    return value;
  }
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(value)}`;
}

/** The review link for a stored Place ID, or null when there is no usable one (never a broken link). */
export function placeReviewUrl(placeId: unknown): string | null {
  return isReviewablePlaceId(placeId) ? buildGoogleWriteReviewUrl(placeId) : null;
}
