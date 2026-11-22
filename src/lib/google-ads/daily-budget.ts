/**
 * Monthly -> daily budget, the one rule (Dror 2026-11-23): daily = monthly / 30.4 (Google's average month: it lets a
 * day spend up to 2x the daily budget but caps the month at 30.4x). Never divide by "active days".
 *
 * Rounding: to whole agorot (2 decimals, half away from zero). The Google Ads API takes budgets in micros; an ILS
 * amount must be a multiple of the currency's minimum unit (0.01 ILS = 10,000 micros), so micros are computed from the
 * agorot-rounded value: 1,500 / 30.4 = 49.342... -> 49.34 -> 49,340,000 micros.
 * Zero Hebrew in this module.
 */
export const DAYS_PER_MONTH = 30.4;

const toAgorot = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function dailyBudgetFromMonthly(monthlyIls: number): number {
  if (!Number.isFinite(monthlyIls) || monthlyIls <= 0) throw new Error('monthly budget must be a positive number');
  return toAgorot(monthlyIls / DAYS_PER_MONTH);
}

/** Daily budget (ILS) -> API micros, on whole agorot. */
export function dailyBudgetMicros(dailyIls: number): number {
  return Math.round(toAgorot(dailyIls) * 100) * 10_000;
}

/** The month a daily budget adds up to (display / records). */
export function monthlyFromDaily(dailyIls: number): number {
  return toAgorot(dailyIls * DAYS_PER_MONTH);
}

const positive = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * The campaign's daily budget: the owner's monthly budget / 30.4 when intake has one, else `fallbackDailyIls` (the
 * strategy's daily figure) on whole agorot.
 */
export function campaignDailyBudgetIls(monthlyIls: unknown, fallbackDailyIls: number): number {
  const monthly = positive(monthlyIls);
  return monthly !== null ? dailyBudgetFromMonthly(monthly) : toAgorot(fallbackDailyIls);
}

/** The campaign's monthly budget record: the owner's monthly figure when known, else daily x 30.4. */
export function campaignMonthlyBudgetIls(monthlyIls: unknown, dailyIls: number): number {
  return positive(monthlyIls) ?? monthlyFromDaily(dailyIls);
}
