/**
 * Site-Bot pay page: the link to the self-serve account page (manage / cancel the monthly plan).
 * HEBREW-SAFETY: the engineer never authors Hebrew. Every Hebrew value here was applied byte-exact by Python
 * str.replace from a Tamar -> Noa patch (manageLink: docs/copy/site-bot-manage-link-2026-11-11.json, Noa-approved
 * 2026-11-11). A new key starts as a `__HE_TODO_<key>__` placeholder (the researchedSiteLabels.ts pattern) and sets
 * SITE_BOT_ACCOUNT_COPY_PENDING back to true; plans.test.ts fails while the flag disagrees with the values.
 * Defense in depth: customer pages render these labels only through customerVisibleLabel(), which hides a placeholder.
 */

import { HE_TODO_PREFIX } from '../../lp/researchedSiteLabels';

export const SITE_BOT_ACCOUNT_COPY: Readonly<{
  /** Link on the pay-success state to the account page: "Manage or cancel your subscription". */
  manageLink: string;
}> = {
  manageLink: 'ניהול או ביטול המנוי',
};

/** True while any key above is still a placeholder. */
export const SITE_BOT_ACCOUNT_COPY_PENDING = false;

/**
 * A label safe to show a customer, or null while it is still a `__HE_TODO_` placeholder (or empty): the caller then
 * renders nothing, so a placeholder can never reach a customer page even if a pending flag is wrong.
 */
export function customerVisibleLabel(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && !trimmed.includes(HE_TODO_PREFIX) ? value : null;
}

/** The account page without a token: it offers to email a fresh magic link. */
export const ACCOUNT_PAGE_PATH = '/account/subscription';

const ACCOUNT_TOKEN_PATH = /^\/account\/subscription\?token=[0-9a-f]{64}$/;

/**
 * Where the pay-success cancel link points: the fresh magic-link path the checkout callback returned, if it is exactly
 * a same-origin account-page path with a token; otherwise the account page itself (request a new link by email).
 */
export function accountLinkHref(manageUrl: unknown): string {
  return typeof manageUrl === 'string' && ACCOUNT_TOKEN_PATH.test(manageUrl) ? manageUrl : ACCOUNT_PAGE_PATH;
}
