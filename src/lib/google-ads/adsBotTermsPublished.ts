/**
 * ADS_BOT_TERMS_PUBLISHED: /google-ads/terms is built but UNPUBLISHED until Eitan's go. Default off (unset or anything
 * but exactly 'true') = the route 404s. The page is not in the sitemap either way (same as /site-bot/terms).
 * Zero Hebrew in this module.
 */
export function adsBotTermsPublished(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.ADS_BOT_TERMS_PUBLISHED === 'true';
}
