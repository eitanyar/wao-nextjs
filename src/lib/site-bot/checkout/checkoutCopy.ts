/**
 * Site-Bot pay page: the price / terms copy (SITE_BOT_PLAN: monthly, + VAT; approved terms 2026-11-07).
 * HEBREW-SAFETY: the engineer never authors Hebrew. Every value below is copied by script, byte-exact, from
 * the approved checkout files in docs/copy (CHECKOUT_COPY_SOURCES in plans.test.ts; waocopy -> Noa, 2026-11-11);
 * plans.test.ts fails if a value
 * drifts from that file. To change copy, change the docs/copy source (Tamar -> Noa) and re-apply by script.
 *
 * Tokens: `{net}` = the price before VAT, `{total}` = the VAT-inclusive charge, `{vatPercent}` = the VAT rate in percent.
 * Numbers are filled in by code from SITE_BOT_PLAN (plans.ts), never typed into the copy.
 * `{termsLink}` (termsConsent only) = a link to SITE_BOT_TERMS_PATH whose text is termsLinkLabel; split by siteBotTermsConsentParts.
 * The paid pages stay behind SITE_BOT_PAID_FLOW (off-production only) until go-live.
 */

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
  /** Domain (terms section 6, 2026-11-12): an own domain is used from the start (three business days from access); otherwise a temporary WAO address first. The customer buys and renews the domain; WAO connects it. */
  domainLine: string;
  /** Small print above the pay button: "By paying you agree to the {termsLink}." `{termsLink}` is a link, not text (siteBotTermsConsentParts). */
  termsConsent: string;
  /** The text of the {termsLink} link to /site-bot/terms: "the terms of use". */
  termsLinkLabel: string;
}> = {
  priceSuffix: "+ מע״מ לחודש",
  priceTotalLine: "{total} כולל מע״מ ({vatPercent}%). החיוב בכרטיס מתבצע היום, ואז באותו תאריך בכל חודש.",
  termsNoCommitment: "מתחדש מחודש לחודש, בלי תקופת התחייבות.",
  termsCancelOnline: "אפשר לבטל אונליין בכל עת. הביטול נכנס לתוקף בסוף החודש ששילמת עליו.",
  pageSubheading: "אחרי שהתשלום הראשון מתאשר, האתר שלך נבנה, עובר בדיקה אנושית ורק אז מתפרסם.",
  payButton: "שלם {total} והתחל מסלול חודשי",
  domainLine: "כבר יש לך דומיין? האתר עולה עליו מההתחלה — תוך שלושה ימי עסקים מרגע שנקבל גישה לדומיין. אין לך? הוא עולה קודם בכתובת זמנית של WAO. את הדומיין אתה קונה ומחדש בעצמך, ואנחנו נחבר אותו ונעזור אם תצטרך.",
  termsConsent: "בביצוע התשלום אתה מסכים ל{termsLink}.",
  termsLinkLabel: "תנאי השימוש",
};

/**
 * Ship gate. True while the copy is not yet safe to show: a key is still a placeholder, or a promise in it is not yet
 * true in the product. False since 2026-11-11: termsCancelOnline's promise (self-serve online cancel, effective at the
 * end of the paid month) is implemented by cancelSubscriptionByToken + finalizeScheduledCancellations (subscriptions.ts).
 */
export const SITE_BOT_CHECKOUT_COPY_PENDING = false;

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

/** The published Site-Bot terms of use (src/app/(app)/site-bot/terms, generated from docs/legal/site-bot-terms-of-use.md). */
export const SITE_BOT_TERMS_PATH = '/site-bot/terms';

/** termsConsent split around its single `{termsLink}` token: render `before`, the terms link (termsLinkLabel), then `after`. */
export function siteBotTermsConsentParts(): { before: string; linkLabel: string; after: string } {
  const parts = SITE_BOT_CHECKOUT_COPY.termsConsent.split('{termsLink}');
  if (parts.length !== 2) throw new Error('termsConsent must contain exactly one {termsLink}');
  return { before: parts[0], linkLabel: SITE_BOT_CHECKOUT_COPY.termsLinkLabel, after: parts[1] };
}
