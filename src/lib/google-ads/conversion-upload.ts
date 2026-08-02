import { GoogleAdsApi, services } from 'google-ads-api';
import { readLeads, findLeadById } from '@/lib/crm/leadsStore';
import { loadCampaignConfigBySlug } from '@/lib/crm/intelligence';

/**
 * Google Ads offline-conversion upload, extracted from
 * `api/google-ads/import-conversion/route.ts` with the `cookies()`/session/
 * `NextResponse` wrapping stripped out — pure, callable in-process by any
 * caller (both `/api/leads`'s Mini-CRM trigger and the new client-scoped
 * feedback route). This is the fix for the pre-existing cookie-forwarding
 * bug (§0): the old `uploadConversion()` in `api/leads/route.ts` self-fetched
 * `/api/google-ads/import-conversion` without forwarding the session cookie,
 * so every attempt got a silent 401.
 *
 * Deliberately does NOT re-run the session/ownership check that
 * `import-conversion/route.ts` does (`config.clientId !== sessionClientId`)
 * — that check depends on a browser session cookie this function has no
 * access to by design, and stays exactly where it is, in that route, per
 * spec §1.2/§3.3. Callers of this function (the admin Mini-CRM route, the
 * client-scoped feedback route) are expected to have already established
 * their own authorization before calling it.
 *
 * Dated caveat (spec §4, out of scope for this file's own change but noted
 * for whoever touches this next): as of June 15, 2026 Google is migrating
 * offline-conversion import off the classic Google Ads API
 * (`uploadClickConversions`, exactly what this function calls) to the Data
 * Manager API. This function's stable `{ leadId, type } → UploadResult`
 * signature exists specifically so that migration is a contained swap of
 * what's *inside* this one function, not a hunt through multiple call sites.
 *
 * See docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §1.2/§2.2/§4.
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

interface PartialFailureResponse {
  partial_failure_error?: { message?: string };
}

// Mirrors CampaignConfig['mode'] from api/google-ads/create-campaign/route.ts
// (intelligence.ts's CampaignConfig has the same 'test' | 'live' shape).
type AdsMode = 'test' | 'live';

function buildClient() {
  return new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
}

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

function toGoogleDateTime(isoOrDisplay: string): string {
  // Google requires "yyyy-MM-dd HH:mm:ss+HH:mm"
  // Israel = UTC+3 (summer / DST, March–October); UTC+2 (winter)
  const offset = '+03:00';
  const d = new Date(isoOrDisplay.includes('T') ? isoOrDisplay : isoOrDisplay.replace(' ', 'T'));
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ') + offset;
  return d.toISOString().slice(0, 19).replace('T', ' ') + offset;
}

export async function uploadLeadConversion({ leadId, type }: UploadLeadConversionParams): Promise<UploadResult> {
  if (!leadId || (type !== 'verified-lead' && type !== 'closed-deal')) {
    return { success: false, error: 'leadId and type are required', status: 400 };
  }

  const leads = await readLeads();
  const lead = findLeadById(leads, leadId);
  if (!lead) {
    return { success: false, error: `Lead ${leadId} not found`, status: 404 };
  }

  // ── Determine click identifier (exactly one: gclid, wbraid, or gbraid) ───
  const clickId = lead.gclid
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

  const config = loadCampaignConfigBySlug(slug);
  if (!config) {
    return { success: false, error: `Campaign config not found for slug: ${slug}`, status: 404 };
  }

  const mode: AdsMode = config.mode === 'test' ? 'test' : 'live';

  let conversionActionResourceName: string | null;
  let conversionValue: number;
  let conversionDateTime: string;

  if (type === 'verified-lead') {
    conversionActionResourceName = config.verifiedLeadConversionResourceName;
    conversionValue = Math.round(config.avgJobValue * config.closeRateEstimate * 100) / 100;
    conversionDateTime = toGoogleDateTime(lead.date || '');
  } else {
    conversionActionResourceName = config.closedDealConversionResourceName;
    conversionValue = lead.revenue || 0;
    conversionDateTime = toGoogleDateTime(lead.closedAt || lead.date || '');
  }

  if (!conversionActionResourceName) {
    return {
      success: false,
      error: `No conversion action resource name for type "${type}" in campaign config`,
      status: 400,
    };
  }

  const client = buildClient();
  const { mccId, refreshToken } = resolveAdsAccount(mode);

  const customer = client.Customer({
    customer_id: config.customerId,
    login_customer_id: mccId,
    refresh_token: refreshToken,
  });

  const conversion = services.ClickConversion.create({
    ...clickId,
    conversion_action: conversionActionResourceName,
    conversion_date_time: conversionDateTime,
    conversion_value: conversionValue,
    currency_code: 'ILS',
    order_id: lead.orderId || String(lead.id),
  });

  const response = await customer.conversionUploads.uploadClickConversions(
    new services.UploadClickConversionsRequest({
      customer_id: config.customerId,
      conversions: [conversion],
      partial_failure: true,
    })
  );

  // Partial failure means individual errors land in partial_failure_error, not thrown
  const partialError = (response as PartialFailureResponse).partial_failure_error;
  if (partialError) {
    console.error(`[uploadLeadConversion] partial failure for lead ${leadId}:`, partialError);
    return {
      success: false,
      leadId,
      type,
      partialError: partialError?.message || JSON.stringify(partialError),
      status: 207,
    };
  }

  return { success: true, leadId, type, conversionValue };
}
