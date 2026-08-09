/**
 * GSC-sourced URLs (rankingUrl, placement target URLs) are percent-encoded
 * for Hebrew slugs — decode for display so clients see a readable URL
 * instead of %D7%A7%D7%95... . Guarded against malformed sequences
 * (decodeURIComponent throws URIError on invalid escapes).
 * Shared by ActionHeader and PlacementBlock — same bug class, same fix.
 */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
