/**
 * Adam (2026-11-10, f): the /site-bot/start chat bubbles. An answer with no Hebrew letter ("20 km", "Plumber") takes
 * dir="auto", so the browser orders it from its first strong character ("20 km", never "km 20" inside the RTL page). A
 * bubble with any Hebrew letter stays dir="rtl": dir="auto" would flip a Hebrew sentence that opens with a Latin word
 * (a brand, "GBP") to LTR, which is the Hebrew-bubble regression this guards against.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (the letter range is an escape). Pure and browser-safe.
 */
const HEBREW_LETTER = /[א-ת]/u;

export function chatBubbleDir(text: string): 'rtl' | 'auto' {
  return HEBREW_LETTER.test(text) ? 'rtl' : 'auto';
}
