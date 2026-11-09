/**
 * The attachable Hebrew prefix letters (vav, shin, he, bet, kaf, lamed, mem), as escapes.
 * M2b.1g: split out of copyGates.ts so client code (the M1 intake's served-area parse, servedAreas.ts) can use it
 * without bundling the whole gate module. copyGates.ts re-exports it unchanged.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
export const PREFIX_LETTERS = '\u05D5\u05E9\u05D4\u05D1\u05DB\u05DC\u05DE';
