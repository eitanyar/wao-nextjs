/**
 * Site-Bot pay page: the price / terms copy (SITE_BOT_PLAN: monthly, + VAT; approved terms 2026-11-07).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. The engineer never authors Hebrew: every key starts as a
 * `__HE_TODO_<key>__` placeholder (the researchedSiteLabels.ts pattern) and is replaced by a byte-exact
 * Tamar -> Noa patch. Set SITE_BOT_CHECKOUT_COPY_PENDING to false when the last placeholder is patched; a guard test
 * fails while the flag disagrees with the values.
 *
 * Tokens: `{net}` = the price before VAT, `{total}` = the VAT-inclusive charge, `{vatPercent}` = the VAT rate in percent.
 * Numbers are filled in by code from SITE_BOT_PLAN (plans.ts), never typed into the copy.
 * The paid pages stay behind SITE_BOT_PAID_FLOW (off-production only) while this is pending.
 */

import { HE_TODO_PREFIX } from '../../lp/researchedSiteLabels';
import { formatShekels, planSummary, type BillingPlan } from '../../payments/plans';

export const SITE_BOT_CHECKOUT_COPY: Readonly<{
  /** Next to the big "{net}": "+ VAT, per month". */
  priceSuffix: string;
  /** "{total} including VAT ({vatPercent}%). Charged today, then on the same date every month." */
  priceTotalLine: string;
  /** "Month-to-month. No minimum commitment." */
  termsNoCommitment: string;
  /** "Cancel online any time; the cancellation takes effect at the end of the month you already paid for." */
  termsCancelOnline: string;
  /** Replaces the old one-time-charge line: "As soon as the first payment goes through, the bot builds and publishes your site." */
  pageSubheading: string;
  /** Pay button: "Pay {total} and start the monthly plan". */
  payButton: string;
}> = {
  priceSuffix: `${HE_TODO_PREFIX}priceSuffix__`,
  priceTotalLine: `${HE_TODO_PREFIX}priceTotalLine__ {total} ({vatPercent}%)`,
  termsNoCommitment: `${HE_TODO_PREFIX}termsNoCommitment__`,
  termsCancelOnline: `${HE_TODO_PREFIX}termsCancelOnline__`,
  pageSubheading: `${HE_TODO_PREFIX}pageSubheading__`,
  payButton: `${HE_TODO_PREFIX}payButton__ {total}`,
};

/** True while any key above is still a placeholder. */
export const SITE_BOT_CHECKOUT_COPY_PENDING = true;

export type SiteBotCheckoutCopyKey = keyof typeof SITE_BOT_CHECKOUT_COPY;

/** The copy for `key` with the plan's numbers filled in. */
export function siteBotCheckoutText(key: SiteBotCheckoutCopyKey, plan: BillingPlan): string {
  const summary = planSummary(plan);
  const values: Record<string, string> = {
    net: formatShekels(summary.netAmount),
    total: formatShekels(summary.chargeAmount),
    vatPercent: String(Math.round(summary.vatRate * 100)),
  };
  return SITE_BOT_CHECKOUT_COPY[key].replace(/\{(net|total|vatPercent)\}/g, (_, name: string) => values[name]);
}
