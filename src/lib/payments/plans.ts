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

import adsBotBillingStrings from '../google-ads/billing/adsBotBillingStrings.json';

export type BillingPlanId = 'site-bot' | 'ads-bot';

export interface BillingPlan {
  readonly id: BillingPlanId;
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
  /** Approved term: a self-serve cancel stops further charges at once and takes effect when the paid period ends. */
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

/**
 * Ads Bot (Google Ads management): the monthly management fee before VAT, in ILS, as quoted on /google-ads
 * ("249 + VAT a month"; the ad budget is paid to Google separately). The /google-ads copy and JSON-LD read the price
 * from here (src/lib/google-ads/landingCopy.ts); ADS_BOT_PLAN below is built on it.
 */
export const ADS_BOT_MONTHLY_NET_ILS = 249;

/**
 * Ads Bot plan (mission 2026-11-22, Decision C): same billing shape as Site-Bot. First charge on the sign-up day, then
 * monthly on the same calendar day; month-to-month; cancel effective at the end of the paid month; Site-Bot dunning
 * (3 retries over 7 days, then pause). The 30-day money-back clock starts at the first ad impression, which is NOT a
 * billing date: it is recorded separately (readiness / poll job), never derived from this plan.
 * Checkout is behind ADS_BOT_CHECKOUT_ENABLED (src/lib/google-ads/billing/adsBotCheckoutFlag.ts).
 * chargeDescription comes from the approved copy (adsBotBillingStrings.json checkout.charge_description, waocopy
 * 2026-11-23); adsBotBilling.test.ts keeps it within 100 characters (a safety bound until Takbull's field limit is known).
 */
export const ADS_BOT_PLAN: BillingPlan = Object.freeze({
  id: 'ads-bot',
  netAmount: ADS_BOT_MONTHLY_NET_ILS,
  currency: 'ILS',
  vat: SITE_BOT_PLAN.vat,
  interval: 'month',
  intervalCount: 1,
  billingAnchor: 'signup_date',
  trialDays: 0,
  minimumCommitmentMonths: 0,
  cancellationEffective: 'end_of_period',
  dunning: SITE_BOT_PLAN.dunning,
  chargeDescription: adsBotBillingStrings.checkout.charge_description,
} as const);

const PLANS: Readonly<Record<BillingPlanId, BillingPlan>> = Object.freeze({ 'site-bot': SITE_BOT_PLAN, 'ads-bot': ADS_BOT_PLAN });

export function getBillingPlan(id: string | null | undefined): BillingPlan | null {
  return id && Object.prototype.hasOwnProperty.call(PLANS, id) ? PLANS[id as BillingPlan['id']] : null;
}

/** Money is rounded to agorot (2 decimals), half away from zero. */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * The VAT amount added to one period's net price. THE ONLY place VAT is computed (every total derives from it).
 * ASSUMPTION (still OPEN, Takbull question 8): WAO quotes net, adds VAT itself and charges the gross total; whether
 * Takbull's CreateDocument expects the gross or net + VAT is unconfirmed. If Takbull computes VAT itself, change only
 * this function and the invoice mapping (providers/takbull-fields.ts).
 */
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
