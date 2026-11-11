/**
 * Billing plans: the ONE config source for what a plan costs and how it bills.
 *
 * Site-Bot (Eitan, 2026-11-11; terms approved 2026-11-07): one plan, one price.
 *   - ₪199 + VAT per month (the price is shown before VAT; the card is charged the VAT-inclusive total).
 *   - No trial: the first charge is on the sign-up date, then monthly on the same calendar day (anchored to the
 *     sign-up date, so a retry never moves the billing day).
 *   - Month-to-month, no minimum commitment, cancel online effective at the end of the paid month.
 *   - A failed charge gets 3 retries over 7 days, then the subscription pauses.
 *
 * Nothing else in the codebase may hard-code a Site-Bot amount: plans.test.ts scans the Site-Bot surfaces and fails on
 * any price literal outside this file.
 */

export interface BillingPlan {
  readonly id: 'site-bot';
  /** Price before VAT, in `currency` major units. This is the number the customer is quoted ("199 + VAT"). */
  readonly netAmount: number;
  readonly currency: 'ILS';
  /**
   * VAT handling. `mode: 'added'` = the quoted price excludes VAT and the charge adds it.
   * OPEN (before go-live): confirm the rate with the accountant / Takbull, and whether Takbull computes VAT itself.
   */
  readonly vat: { readonly mode: 'added'; readonly rate: number };
  readonly interval: 'month';
  readonly intervalCount: 1;
  /** The first charge happens at sign-up; every later charge is on the sign-up day of the month. */
  readonly billingAnchor: 'signup_date';
  readonly trialDays: 0;
  readonly minimumCommitmentMonths: 0;
  /** Approved term. The engine's self-serve cancel is still immediate: see the open item in the Site-Bot checkout. */
  readonly cancellationEffective: 'end_of_period';
  /** Retry offsets in days, measured from the first failed attempt of the period; when they run out the plan pauses. */
  readonly dunning: { readonly retryOffsetsDays: readonly number[]; readonly whenExhausted: 'pause' };
  /** Provider / invoice line description. */
  readonly chargeDescription: string;
}

export const SITE_BOT_PLAN: BillingPlan = Object.freeze({
  id: 'site-bot',
  netAmount: 199,
  currency: 'ILS',
  vat: Object.freeze({ mode: 'added', rate: 0.18 }),
  interval: 'month',
  intervalCount: 1,
  billingAnchor: 'signup_date',
  trialDays: 0,
  minimumCommitmentMonths: 0,
  cancellationEffective: 'end_of_period',
  dunning: Object.freeze({ retryOffsetsDays: Object.freeze([2, 4, 7]), whenExhausted: 'pause' }),
  chargeDescription: 'WAO Site Bot — בניית אתר',
} as const);

const PLANS: Readonly<Record<BillingPlan['id'], BillingPlan>> = Object.freeze({ 'site-bot': SITE_BOT_PLAN });

export function getBillingPlan(id: string | null | undefined): BillingPlan | null {
  return id && Object.prototype.hasOwnProperty.call(PLANS, id) ? PLANS[id as BillingPlan['id']] : null;
}

/** Money is rounded to agorot (2 decimals), half away from zero. */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** The VAT amount added to one period's net price. */
export function planVatAmount(plan: BillingPlan): number {
  return roundMoney(plan.netAmount * plan.vat.rate);
}

/** What the card is charged per period: net + VAT. */
export function planChargeAmount(plan: BillingPlan): number {
  return roundMoney(plan.netAmount + planVatAmount(plan));
}

/** The plan as the checkout shows / returns it (no customer data). */
export interface PlanSummary {
  plan: BillingPlan['id'];
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  chargeAmount: number;
  currency: BillingPlan['currency'];
  vatMode: BillingPlan['vat']['mode'];
  interval: BillingPlan['interval'];
  intervalCount: BillingPlan['intervalCount'];
  billingAnchor: BillingPlan['billingAnchor'];
  trialDays: number;
  minimumCommitmentMonths: number;
  cancellationEffective: BillingPlan['cancellationEffective'];
}

export function planSummary(plan: BillingPlan): PlanSummary {
  return {
    plan: plan.id,
    netAmount: plan.netAmount,
    vatRate: plan.vat.rate,
    vatAmount: planVatAmount(plan),
    chargeAmount: planChargeAmount(plan),
    currency: plan.currency,
    vatMode: plan.vat.mode,
    interval: plan.interval,
    intervalCount: plan.intervalCount,
    billingAnchor: plan.billingAnchor,
    trialDays: plan.trialDays,
    minimumCommitmentMonths: plan.minimumCommitmentMonths,
    cancellationEffective: plan.cancellationEffective,
  };
}

/** "₪199" / "₪234.82": the shekel sign before the number, agorot only when non-zero. Not localized copy. */
export function formatShekels(amount: number): string {
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `₪${fixed}`;
}
