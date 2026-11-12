/**
 * /google-ads landing copy (approved r2, 2026-11-12). HEBREW-SAFETY: zero Hebrew bytes here; the text lives in the
 * generated module, copied by script from docs/copy/google-ads-r2-final-candidate-2026-11-12.txt. The management fee
 * comes from ADS_BOT_MONTHLY_NET_ILS (src/lib/payments/plans.ts).
 */
import { ADS_BOT_MONTHLY_NET_ILS } from "../payments/plans";
import { fillLandingCopy } from "../landingCopyFill";
import { GOOGLE_ADS_LANDING_COPY_SOURCE } from "./landingCopy.generated";

export const GOOGLE_ADS_LANDING_COPY = fillLandingCopy(GOOGLE_ADS_LANDING_COPY_SOURCE, ADS_BOT_MONTHLY_NET_ILS);
