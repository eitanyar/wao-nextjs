/**
 * /site-bot landing copy (approved r2, 2026-11-12). HEBREW-SAFETY: zero Hebrew bytes here; the text lives in the
 * generated module, copied by script from docs/copy/site-bot-r2-final-candidate-2026-11-12.txt. The price comes from
 * SITE_BOT_PLAN (one config source, see plans.test.ts).
 */
import { SITE_BOT_PLAN } from "../payments/plans";
import { fillLandingCopy } from "../landingCopyFill";
import { SITE_BOT_LANDING_COPY_SOURCE } from "./landingCopy.generated";

export const SITE_BOT_LANDING_COPY = fillLandingCopy(SITE_BOT_LANDING_COPY_SOURCE, SITE_BOT_PLAN.netAmount);
