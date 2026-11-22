/**
 * ADS_BOT_CHECKOUT_ENABLED: the one switch for Ads Bot billing (checkout init / callback routes, the
 * /google-ads/pay page, the admin "send pay link" action). Default OFF: unset or anything but 'true' keeps every
 * Ads Bot billing surface returning today's 503 / 404. The admin "record a manual Takbull charge" action is NOT behind
 * it (the pilot is charged by hand in Takbull's back office while checkout stays off).
 * Zero Hebrew in this module.
 */
export function adsBotCheckoutEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.ADS_BOT_CHECKOUT_ENABLED === 'true';
}
