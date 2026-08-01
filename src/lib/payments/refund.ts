/**
 * Pure refund-calculation logic for the attorney-approved refund model — see
 * docs/specs/subscription-legal-copy-final.md ("דרישות מימוש — נובעות
 * מאישור עו"ד"). No DB access here on purpose: these are pure functions so
 * they're trivially unit-testable and reusable from whatever route/cron
 * eventually wires `PaymentProvider.refund()` in (not in scope for this task
 * — see that doc's engineering note).
 *
 * ## The two windows, one formula
 *
 * There are exactly two refund windows, both anchored to the single
 * `subscriptions.joined_at` timestamp (never a per-charge field — see the
 * spec's "מודל נתונים" section for why):
 *
 *   - the standard window: always available, 14 days from `joined_at`.
 *   - the extended window: available only if `extended_cancellation_flag`
 *     is set (admin-verified eligibility), up to 4 months from `joined_at`.
 *
 * The spec is explicit that the ONLY difference between the two windows is
 * the deadline for invoking them — the refund amount is computed by the
 * exact same pro-rata formula regardless of which window applies:
 *
 *   refundable = amount_paid − pro_rata_value_of_period_used
 *
 * i.e. a customer who has consumed most of the billing period they paid for
 * gets a refund that trends toward zero, even if they're still inside the
 * eligibility window.
 */

const STANDARD_WINDOW_DAYS = 14;
const EXTENDED_WINDOW_MONTHS = 4;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Calendar-month-accurate would need date-fns' addMonths, but for a window
// *deadline* check (not a billing-period boundary, which is where the
// engine's addMonths-based next_charge_at logic lives — see cron-charge.ts)
// a fixed-days approximation is adequate and keeps this module dependency-free.
const APPROX_DAYS_PER_MONTH = 30;

/**
 * Whether `now` still falls inside the applicable refund window, anchored at
 * `joinedAt`. Always true for the first `STANDARD_WINDOW_DAYS` days; true up
 * to `EXTENDED_WINDOW_MONTHS` months if `extendedCancellationFlag` is
 * truthy (accepts the raw SQLite `0`/`1`/`null` as stored in
 * `subscriptions.extended_cancellation_flag`, not just a boolean).
 */
export function isWithinRefundWindow(
  joinedAt: string,
  now: Date,
  extendedCancellationFlag: boolean | number | null | undefined
): boolean {
  const joined = new Date(joinedAt);
  if (Number.isNaN(joined.getTime())) return false;

  const elapsedMs = now.getTime() - joined.getTime();
  if (elapsedMs < 0) return false; // joined_at in the future — defensive, shouldn't happen.

  const standardWindowMs = STANDARD_WINDOW_DAYS * MS_PER_DAY;
  if (elapsedMs <= standardWindowMs) return true;

  const extendedEligible = !!extendedCancellationFlag;
  if (!extendedEligible) return false;

  const extendedWindowMs = EXTENDED_WINDOW_MONTHS * APPROX_DAYS_PER_MONTH * MS_PER_DAY;
  return elapsedMs <= extendedWindowMs;
}

/**
 * Straightforward pro-rata refund calculation, shared by both windows (see
 * module doc comment): `refundable = amount_paid − pro_rata_value_of_period_used`,
 * where the value used is `amountPaid * (elapsed / totalPeriod)`.
 *
 * `periodStart`/`periodEnd` are the billing period the `amountPaid` charge
 * actually covers — for the engine's existing period semantics that's
 * `charged_at` (or the trial's `created_at`) through the following
 * `next_charge_at` (see subscriptions.ts / cron-charge.ts, which advance
 * `next_charge_at` by exactly one calendar month per successful charge via
 * `addMonths`). This function doesn't care how the boundaries were derived —
 * it just needs a start and an end.
 *
 * Clamped so the result is always within `[0, amountPaid]`: `now` before
 * `periodStart` yields a full refund; `now` at/after `periodEnd` yields 0
 * (the "customer who used the whole period" case the spec calls out —
 * `refundable` trending to zero).
 */
export function calculateRefundableAmount(
  amountPaid: number,
  periodStart: string,
  periodEnd: string,
  now: Date
): number {
  if (!(amountPaid >= 0)) {
    throw new Error('calculateRefundableAmount: amountPaid must be a non-negative number.');
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('calculateRefundableAmount: periodStart/periodEnd must be valid ISO timestamps.');
  }

  const totalMs = end.getTime() - start.getTime();
  if (!(totalMs > 0)) {
    throw new Error('calculateRefundableAmount: periodEnd must be after periodStart.');
  }

  const elapsedMs = now.getTime() - start.getTime();
  const clampedElapsedMs = Math.min(Math.max(elapsedMs, 0), totalMs);

  const proRataValueUsed = amountPaid * (clampedElapsedMs / totalMs);
  const refundable = amountPaid - proRataValueUsed;

  // Guard against float drift landing a hair outside [0, amountPaid].
  return Math.min(Math.max(refundable, 0), amountPaid);
}
