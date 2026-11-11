/**
 * Site-Bot pay page: the link to the self-serve account page (manage / cancel the monthly plan).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. The engineer never authors Hebrew: each key is a
 * `__HE_TODO_<key>__` placeholder (the researchedSiteLabels.ts pattern) until a byte-exact Tamar -> Noa patch replaces
 * it. Set SITE_BOT_ACCOUNT_COPY_PENDING to false when the last placeholder is patched; plans.test.ts fails while the
 * flag disagrees with the values. The pay pages stay behind SITE_BOT_PAID_FLOW (off-production only) meanwhile.
 */

import { HE_TODO_PREFIX } from '../../lp/researchedSiteLabels';

export const SITE_BOT_ACCOUNT_COPY: Readonly<{
  /** Link on the pay-success state to the account page: "Manage or cancel your subscription". */
  manageLink: string;
}> = {
  manageLink: `${HE_TODO_PREFIX}manageLink__`,
};

/** True while any key above is still a placeholder. */
export const SITE_BOT_ACCOUNT_COPY_PENDING = true;

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
