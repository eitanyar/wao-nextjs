/**
 * The Ads Bot terms version recorded with every checkout consent (readiness termsConsent.termsVersion) and expected by
 * create-campaign's autonomy policy (set GOOGLE_ADS_AUTONOMY_LEGAL_VERSION to the same value in production).
 * Pinned to the exact bytes of docs/legal/ads-bot-terms-of-use.md: adsBotBilling.test.ts fails when the terms change
 * without a version bump (update both constants together). The version is always set by the server, never by the client.
 * Zero Hebrew in this module.
 */
export const ADS_BOT_TERMS_SHA256 = '6ba5e1c47f28cdc0b999c952b07ba1316ae1c169335b56611fccbdcd73f0c29f';
export const ADS_BOT_TERMS_VERSION = 'ads-bot-terms-2026-11-23-6ba5e1c4';
