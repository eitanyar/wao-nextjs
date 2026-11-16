/**
 * Site-Bot cancellation calendar (terms §8): the site stays available 30 days after the cancellation takes effect
 * (the end of the last paid month, or the cancel moment when it was immediate), then goes offline. All dates here are
 * Israel calendar dates (Asia/Jerusalem, DST-aware) as `YYYY-MM-DD` strings, so a 30-day window never drifts by the
 * DST hour and the "7 days before" notice lands on the right Israeli day.
 * Pure: no imports, no Hebrew.
 */
export const SITE_OFFLINE_AFTER_DAYS = 30;
export const OFFLINE_SOON_DAYS_BEFORE = 7;
export const ISRAEL_TIME_ZONE = 'Asia/Jerusalem';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The Israel calendar date of an instant, `YYYY-MM-DD`. Throws on an invalid instant. */
export function israelDate(at: Date | string): string {
  const date = typeof at === 'string' ? new Date(at) : at;
  if (!Number.isFinite(date.getTime())) throw new Error('israelDate: invalid instant');
  // en-CA formats as YYYY-MM-DD.
  return date.toLocaleDateString('en-CA', { timeZone: ISRAEL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** Calendar arithmetic on a `YYYY-MM-DD` date (no time zone involved). */
export function addCalendarDays(dateOnly: string, days: number): string {
  const match = DATE_ONLY.exec(dateOnly);
  if (!match || !Number.isInteger(days)) throw new Error('addCalendarDays: invalid input');
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return utc.toISOString().slice(0, 10);
}

/** The Israel date the site goes offline: the Israel date the cancellation takes effect + 30 days. */
export function siteOfflineDate(effectiveAtIso: string): string {
  return addCalendarDays(israelDate(effectiveAtIso), SITE_OFFLINE_AFTER_DAYS);
}

/** The Israel date of the "offline soon" notice: 7 days before the offline date. */
export function offlineSoonDate(offlineDate: string): string {
  return addCalendarDays(offlineDate, -OFFLINE_SOON_DAYS_BEFORE);
}

/** True once `now` is on or after the given Israel date. */
export function israelDateReached(dateOnly: string, now: Date): boolean {
  if (!DATE_ONLY.test(dateOnly)) throw new Error('israelDateReached: invalid date');
  return israelDate(now) >= dateOnly;
}

/** Noon UTC of an Israel date: an instant that is that same date in Israel all year, for date formatters. */
export function dateOnlyToNoonIso(dateOnly: string): string {
  if (!DATE_ONLY.test(dateOnly)) throw new Error('dateOnlyToNoonIso: invalid date');
  return `${dateOnly}T12:00:00.000Z`;
}

/**
 * When the cancellation of a row takes (took) effect, or null when the row is not cancelled: the scheduled
 * paid-through date, else the cancel moment for an immediate cancel.
 */
export function cancellationEffectiveAt(row: {
  status: string;
  cancel_at_period_end?: number | null;
  cancel_effective_at?: string | null;
  canceled_at?: string | null;
}): string | null {
  const valid = (v: string | null | undefined): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
  if (row.cancel_at_period_end === 1 && valid(row.cancel_effective_at)) return row.cancel_effective_at;
  if (row.status === 'canceled') return valid(row.cancel_effective_at) ? row.cancel_effective_at : valid(row.canceled_at) ? row.canceled_at : null;
  return null;
}

/** True when a cancelled row's site has reached its offline date (the client's account access ends then too). */
export function pastOfflineDate(
  row: Parameters<typeof cancellationEffectiveAt>[0],
  now: Date
): boolean {
  const effectiveAt = cancellationEffectiveAt(row);
  return effectiveAt !== null && israelDateReached(siteOfflineDate(effectiveAt), now);
}
