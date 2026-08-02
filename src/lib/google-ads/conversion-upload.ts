import { readLeads, findLeadById } from '@/lib/crm/leadsStore';
import { loadCampaignConfigBySlug } from '@/lib/crm/intelligence';
import {
  parseConversionActionId,
  resolveDataManagerRefreshToken,
  getDataManagerAccessToken,
  sendConversionEvent,
  toEventTimestamp,
} from './data-manager-events.js';

/**
 * Google Ads offline-conversion upload, extracted from
 * `api/google-ads/import-conversion/route.ts` with the `cookies()`/session/
 * `NextResponse` wrapping stripped out — pure, callable in-process by any
 * caller (both `/api/leads`'s Mini-CRM trigger and the client-scoped
 * feedback route). This is the fix for the pre-existing cookie-forwarding
 * bug (Priority 3 §0): the old `uploadConversion()` in `api/leads/route.ts`
 * self-fetched `/api/google-ads/import-conversion` without forwarding the
 * session cookie, so every attempt got a silent 401.
 *
 * Deliberately does NOT re-run the session/ownership check that
 * `import-conversion/route.ts` does (`config.clientId !== sessionClientId`)
 * — that check depends on a browser session cookie this function has no
 * access to by design, and stays exactly where it is, in that route, per
 * Priority 3 spec §1.2/§3.3. Callers of this function (the admin Mini-CRM
 * route, the client-scoped feedback route) are expected to have already
 * established their own authorization before calling it.
 *
 * MIGRATED (Priority 4, docs/specs/priority-4-data-manager-api-migration.md):
 * as of June 15 2026 Google blocked new integrations on the classic Google
 * Ads API's `ConversionUploadService.UploadClickConversions` for offline
 * click-conversion upload — confirmed empirically dead for WAO's developer
 * token on 2026-08-02 (see spec §0). This function now sends conversions via
 * the **Data Manager API** (`POST https://datamanager.googleapis.com/v1/events:ingest`,
 * OAuth scope `datamanager`, no developer token) instead of
 * `customer.conversionUploads.uploadClickConversions(...)`. The
 * `{ leadId, type } → UploadResult` boundary Priority 3 built survives this
 * migration unchanged — no caller needed to change. This file is now the one
 * place in `src/lib/google-ads/` that does NOT use the `google-ads-api` npm
 * package (everything else — mutations, campaign creation, etc. — stays on
 * the classic API, unaffected by June 15's cutoff per spec §0).
 *
 * See docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §1.2/§2.2/§4
 * and docs/specs/priority-4-data-manager-api-migration.md §1/§3.
 */

export type ConversionType = 'verified-lead' | 'closed-deal';

export interface UploadLeadConversionParams {
  leadId: number;
  type: ConversionType;
}

export type UploadResult =
  | { skipped: true; reason: 'no_click_id'; message: string }
  | { success: true; leadId: number; type: ConversionType; conversionValue: number }
  | { success: false; leadId: number; type: ConversionType; partialError: string; status: 207 }
  | { success: false; error: string; status: number };

// Mirrors CampaignConfig['mode'] from api/google-ads/create-campaign/route.ts
// (intelligence.ts's CampaignConfig has the same 'test' | 'live' shape).
type AdsMode = 'test' | 'live';

/**
 * Unchanged from the classic-API implementation (spec §3.3): the Data
 * Manager API's `Destination.loginAccount` plays exactly the role
 * `login_customer_id` played in the classic client, so MCC resolution
 * doesn't move. `production-access-guards.test.mjs` source-text-checks for
 * `GOOGLE_ADS_TEST_MCC_CUSTOMER_ID` in this file — keep this function (or at
 * least that literal) intact.
 */
function resolveAdsAccount(mode: AdsMode) {
  if (mode === 'test') {
    const refreshToken = process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN || process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const mccId = (process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID || process.env.GOOGLE_ADS_MCC_CUSTOMER_ID)?.replace(/-/g, '');
    if (!refreshToken || !mccId) throw new Error('Test mode requires Google Ads test-MCC credentials');
    return { refreshToken, mccId };
  }

  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const mccId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID?.replace(/-/g, '');
  if (!refreshToken || !mccId) throw new Error('Live mode requires Google Ads credentials');
  return { refreshToken, mccId };
}

// `resolveDataManagerRefreshToken`, `parseConversionActionId`,
// `toEventTimestamp`, `getDataManagerAccessToken`, and `sendConversionEvent`
// now live in `./data-manager-events.js` (see import above) — moved there,
// unchanged, so this logic can carry real mocked-`fetch` unit coverage under
// plain `node --test` (this Node build has no TypeScript type-stripping
// support, so a `.ts` file's real behavior can't be exercised directly by
// `node --test` without the separate `tsconfig.test.json` → `dist/`
// pipeline, which is out of scope to extend here per spec §5.2). Re-exported
// below for API stability / discoverability from this file.
export { parseConversionActionId, resolveDataManagerRefreshToken };

// `getDataManagerAccessToken` and `sendConversionEvent` (the OAuth exchange
// and the `events:ingest` call/response-mapping, spec §3.2 steps 2–4) also
// now live in `./data-manager-events.js` — see the file-level comment above
// `export { parseConversionActionId, resolveDataManagerRefreshToken }`.

type ClickId = { gclid: string } | { wbraid: string } | { gbraid: string };

/**
 * Test-only injection points. Deliberately optional with defaults so the
 * public `uploadLeadConversion({ leadId, type })` signature every caller
 * (`/api/leads`, `/api/client/leads`, `import-conversion/route.ts`) uses is
 * untouched — no existing call site passes a second argument, so this is
 * invisible to them. Mirrors the `fetchImpl` DI convention already used in
 * `src/lib/checkout/yaad-verify.js`.
 */
interface UploadLeadConversionDeps {
  readLeadsImpl?: typeof readLeads;
  findLeadByIdImpl?: typeof findLeadById;
  loadCampaignConfigBySlugImpl?: typeof loadCampaignConfigBySlug;
  fetchImpl?: typeof fetch;
}

export async function uploadLeadConversion(
  { leadId, type }: UploadLeadConversionParams,
  deps: UploadLeadConversionDeps = {}
): Promise<UploadResult> {
  const {
    readLeadsImpl = readLeads,
    findLeadByIdImpl = findLeadById,
    loadCampaignConfigBySlugImpl = loadCampaignConfigBySlug,
    fetchImpl = fetch,
  } = deps;

  if (!leadId || (type !== 'verified-lead' && type !== 'closed-deal')) {
    return { success: false, error: 'leadId and type are required', status: 400 };
  }

  const leads = await readLeadsImpl();
  const lead = findLeadByIdImpl(leads, leadId);
  if (!lead) {
    return { success: false, error: `Lead ${leadId} not found`, status: 404 };
  }

  // ── Determine click identifier (exactly one: gclid, wbraid, or gbraid) ───
  const clickId: ClickId | null = lead.gclid
    ? { gclid: lead.gclid }
    : lead.wbraid
    ? { wbraid: lead.wbraid }
    : lead.gbraid
    ? { gbraid: lead.gbraid }
    : null;

  if (!clickId) {
    return {
      skipped: true,
      reason: 'no_click_id',
      message: 'Lead has no gclid/wbraid/gbraid — not attributable to a Google Ads click',
    };
  }

  const slug = lead.slug;
  if (!slug) {
    return { success: false, error: 'Lead has no slug — cannot resolve campaign config', status: 400 };
  }

  const config = loadCampaignConfigBySlugImpl(slug);
  if (!config) {
    return { success: false, error: `Campaign config not found for slug: ${slug}`, status: 404 };
  }

  const mode: AdsMode = config.mode === 'test' ? 'test' : 'live';

  let conversionActionResourceName: string | null;
  let conversionValue: number;
  let eventTimestamp: string;

  if (type === 'verified-lead') {
    conversionActionResourceName = config.verifiedLeadConversionResourceName;
    conversionValue = Math.round(config.avgJobValue * config.closeRateEstimate * 100) / 100;
    eventTimestamp = toEventTimestamp(lead.date || '');
  } else {
    conversionActionResourceName = config.closedDealConversionResourceName;
    conversionValue = lead.revenue || 0;
    eventTimestamp = toEventTimestamp(lead.closedAt || lead.date || '');
  }

  if (!conversionActionResourceName) {
    return {
      success: false,
      error: `No conversion action resource name for type "${type}" in campaign config`,
      status: 400,
    };
  }

  const productDestinationId = parseConversionActionId(conversionActionResourceName);
  if (!productDestinationId) {
    return {
      success: false,
      error: `Malformed conversion action resource name for type "${type}": ${conversionActionResourceName}`,
      status: 400,
    };
  }

  // Non-throwing contract (spec §3.5): every failure mode from here on —
  // missing MCC credentials, missing scope-token env var, OAuth exchange
  // failure, malformed request, non-2xx from events:ingest, network error —
  // is caught and mapped to an `UploadResult`, never thrown.
  try {
    const { mccId } = resolveAdsAccount(mode);

    const refreshToken = resolveDataManagerRefreshToken(mode);
    if (!refreshToken) {
      return { success: false, error: 'Data Manager refresh token not configured for this mode', status: 500 };
    }

    const tokenResult = await getDataManagerAccessToken(refreshToken, fetchImpl);
    if ('error' in tokenResult) {
      console.error(`[uploadLeadConversion] Data Manager OAuth token exchange failed for lead ${leadId}:`, tokenResult.error);
      return { success: false, error: tokenResult.error, status: tokenResult.status };
    }

    const eventResult = await sendConversionEvent({
      accessToken: tokenResult.accessToken,
      mccId,
      customerId: config.customerId,
      productDestinationId,
      clickId,
      transactionId: lead.orderId || String(lead.id),
      eventTimestamp,
      conversionValue,
      fetchImpl,
    });

    if (eventResult.ok) {
      return { success: true, leadId, type, conversionValue };
    }

    if (eventResult.fieldWarnings) {
      console.error(`[uploadLeadConversion] field warnings for lead ${leadId}:`, eventResult.body);
      return {
        success: false,
        leadId,
        type,
        partialError: JSON.stringify((eventResult.body as { fieldWarnings?: unknown })?.fieldWarnings ?? eventResult.body),
        status: 207,
      };
    }

    console.error(`[uploadLeadConversion] events:ingest failed for lead ${leadId}:`, eventResult.error);
    return { success: false, error: eventResult.error, status: eventResult.status };
  } catch (err) {
    console.error(`[uploadLeadConversion] unexpected error for lead ${leadId}:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error uploading conversion',
      status: 500,
    };
  }
}
