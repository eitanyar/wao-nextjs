/**
 * /google-ads/how-it-works copy (Noa-approved round 3, 2026-11-12). HEBREW-SAFETY: zero Hebrew bytes here; the
 * text lives in the generated module, copied by scripts/build-how-it-works-copy.mjs from
 * docs/copy/google-ads-how-it-works-page-r3-2026-11-12.waocopy.json. The management fee comes from
 * ADS_BOT_MONTHLY_NET_ILS (src/lib/payments/plans.ts).
 */
import { ADS_BOT_MONTHLY_NET_ILS } from "../payments/plans";
import { fillLandingCopy } from "../landingCopyFill";
import { HOW_IT_WORKS_COPY_SOURCE } from "./howItWorksCopy.generated";

export const HOW_IT_WORKS_COPY = fillLandingCopy(HOW_IT_WORKS_COPY_SOURCE, ADS_BOT_MONTHLY_NET_ILS);
