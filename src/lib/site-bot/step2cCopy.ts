/**
 * Site Bot step 2c: the price-bearing string of the preview screen, filled from the one price source
 * (src/lib/payments/plans.ts SITE_BOT_PLAN; plans.test.ts "one config source"). The generated module carries `{net}` in
 * its place (scripts/build-site-bot-step2c-copy.mjs). Browser-safe. HEBREW-SAFETY: ZERO Hebrew bytes.
 */
import { SITE_BOT_PLAN } from '../payments/plans';
import { SITE_BOT_STEP2C_COPY } from './step2cCopy.generated';

export function payCtaSub(): string {
  return SITE_BOT_STEP2C_COPY.PAY_CTA_SUB.split('{net}').join(String(SITE_BOT_PLAN.netAmount));
}
