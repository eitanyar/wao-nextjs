/**
 * Ads Bot checkout + pay-link email copy. HEBREW-SAFETY: the engineer never authors Hebrew. Every string is read from
 * ./adsBotBillingStrings.json, copied by script byte-exact from docs/copy/ads-bot-new-strings-2026-11-22.json
 * (waocopy 2026-11-22); adsBotBilling.test.ts fails on drift and when the quoted prices stop matching ADS_BOT_PLAN.
 *
 * Tokens: checkout.consent wraps the terms link in [brackets]; pay_link_email.body has {first_name} and {pay_link}.
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
}

export const ADS_BOT_CHECKOUT_COPY: Readonly<AdsBotCheckoutCopy> = Object.freeze({ ...strings.checkout });
export const ADS_BOT_PAY_LINK_EMAIL_COPY: Readonly<{ subject: string; body: string }> = Object.freeze({ ...strings.pay_link_email });

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
