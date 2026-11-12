/**
 * Lead timestamps (ads-bot-phase2 spec §3 0b / F4).
 *
 * `captureLead()` stores `lead.date` as a zoneless UTC wall-clock string
 * (`2026-11-12 08:30` = `toISOString()` with the `T` swapped for a space and the seconds and
 * zone dropped). Parsing that with `new Date()` treats it as server-local time, which shifts the
 * instant by the server's offset. Every reader that needs the real instant (offline-conversion
 * timestamps, click age for the upload retry window) must go through this parser.
 *
 * Plain `.js` so both plain-node tests and the TypeScript test build can import it.
 */

const ZONE_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Parses a stored lead date as a true instant. Strings without a zone designator are UTC.
 * Accepts `YYYY-MM-DD HH:mm[:ss]`, `YYYY-MM-DDTHH:mm[:ss[.sss]][Z|±HH:MM]` and `YYYY-MM-DD`.
 * Returns `null` (never throws) on empty or unparseable input.
 *
 * @param {string | null | undefined} value
 * @returns {Date | null}
 */
export function parseLeadDateUtc(value) {
  if (typeof value !== 'string') return null;
  let s = value.trim();
  if (!s) return null;
  if (!s.includes('T')) s = s.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00';
  if (!ZONE_SUFFIX.test(s)) s += 'Z';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
