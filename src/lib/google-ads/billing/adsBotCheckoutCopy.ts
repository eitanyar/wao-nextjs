/**
 * Ads Bot checkout + pay-link email copy. HEBREW-SAFETY: the engineer never authors Hebrew. Every string is read from
 * ./adsBotBillingStrings.json, copied by script byte-exact from docs/copy/ads-bot-new-strings-2026-11-22.json
 * (waocopy 2026-11-22); adsBotBilling.test.ts fails on drift and when the quoted prices stop matching ADS_BOT_PLAN.
 *
 * Tokens: checkout.consent wraps the terms link in [brackets]; pay_link_email.body has {first_name} and {pay_link}.
 * advertiser_verification_guide (title, intro, steps[]) is the staff-sent "how to verify with Google" email.
 */
import strings from './adsBotBillingStrings.json';

export interface AdsBotCheckoutCopy {
  title: string;
  price_line: string;
  refund_line: string;
  consent: string;
  pay_button: string;
  success: string;
  failure: string;
  /** Shown on /google-ads/pay when the signed link is invalid or expired. */
  invalid_link: string;
  /** Provider / invoice line for the Ads Bot charge (ADS_BOT_PLAN.chargeDescription). */
  charge_description: string;
}

export const ADS_BOT_CHECKOUT_COPY: Readonly<AdsBotCheckoutCopy> = Object.freeze({ ...strings.checkout });
export const ADS_BOT_PAY_LINK_EMAIL_COPY: Readonly<{ subject: string; body: string }> = Object.freeze({ ...strings.pay_link_email });
export const ADS_BOT_VERIFICATION_GUIDE_COPY: Readonly<{ title: string; intro: string; steps: readonly string[] }> = Object.freeze({
  title: strings.advertiser_verification_guide.title,
  intro: strings.advertiser_verification_guide.intro,
  steps: Object.freeze([...strings.advertiser_verification_guide.steps]),
});

/**
 * The published Ads Bot terms of use. NOT BUILT YET (mission item 5): the consent link points here and 404s until the
 * page exists. Keep this the single place the path is written.
 */
export const ADS_BOT_TERMS_PATH = '/google-ads/terms';

/** checkout.consent split around its single [bracketed] link text. */
export function adsBotConsentParts(): { before: string; linkLabel: string; after: string } {
  const match = /^([^[\]]*)\[([^[\]]+)\]([^[\]]*)$/.exec(ADS_BOT_CHECKOUT_COPY.consent);
  if (!match) throw new Error('checkout.consent must contain exactly one [link] segment');
  return { before: match[1], linkLabel: match[2], after: match[3] };
}

/** The pay-link email with its placeholders filled. Throws when a placeholder is missing from the copy. */
export function buildAdsBotPayLinkEmail(params: { firstName: string; payLink: string }): { subject: string; text: string } {
  const body = ADS_BOT_PAY_LINK_EMAIL_COPY.body;
  if (!body.includes('{first_name}') || !body.includes('{pay_link}')) throw new Error('pay_link_email.body placeholders missing');
  const text = body.replace(/\{first_name\}/g, params.firstName.trim()).replace(/\{pay_link\}/g, params.payLink);
  return { subject: ADS_BOT_PAY_LINK_EMAIL_COPY.subject, text };
}

/**
 * The advertiser-verification guide email (plain text, same conventions as the pay-link email): the title as subject,
 * then the intro and the numbered steps, one per paragraph.
 */
export function buildAdsBotVerificationGuideEmail(): { subject: string; text: string } {
  const guide = ADS_BOT_VERIFICATION_GUIDE_COPY;
  if (!guide.steps.length) throw new Error('advertiser_verification_guide.steps is empty');
  return {
    subject: guide.title,
    text: [guide.intro, ...guide.steps.map((step, i) => `${i + 1}. ${step}`)].join('\n\n'),
  };
}
