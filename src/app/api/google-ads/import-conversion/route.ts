import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleAdsApi, services } from 'google-ads-api';
import fs from 'fs';
import path from 'path';
import type { CampaignConfig } from '../create-campaign/route';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { resolveGoogleAdsMutationAccess } from '@/lib/google-ads/access-policy';

type ConversionType = 'verified-lead' | 'closed-deal';

interface ImportRequest {
  leadId: number;
  type: ConversionType;
}

interface Lead {
  id: number;
  slug?: string;
  date: string;
  closedAt?: string;
  revenue?: number;
  orderId?: string;
  gclid?: string;
  wbraid?: string;
  gbraid?: string;
}

interface PartialFailureResponse {
  partial_failure_error?: { message?: string };
}

function buildClient() {
  return new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
}

function resolveAdsAccount(mode: CampaignConfig['mode']) {
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

export async function POST(req: Request) {
  try {
    const jar = await cookies();
    const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
    if (!sessionClientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: ImportRequest = await req.json();
    const { leadId, type } = body;

    if (!leadId || (type !== 'verified-lead' && type !== 'closed-deal')) {
      return NextResponse.json({ error: 'leadId and type are required' }, { status: 400 });
    }

    // ── Load lead ─────────────────────────────────────────────────────────────
    const leadsPath = path.join(process.cwd(), 'src', 'data', 'leads.json');
    const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf-8')) as Lead[];
    const lead = leads.find((item) => item.id === leadId);

    if (!lead) {
      return NextResponse.json({ error: `Lead ${leadId} not found` }, { status: 404 });
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
      // No click ID — lead came from direct/organic traffic. CRM is updated but
      // we can't link to a Google Ads click. Log and return gracefully.
      return NextResponse.json({
        skipped: true,
        reason: 'no_click_id',
        message: 'Lead has no gclid/wbraid/gbraid — not attributable to a Google Ads click',
      });
    }

    // ── Load campaign config ──────────────────────────────────────────────────
    const slug = lead.slug;
    if (!slug) {
      return NextResponse.json({ error: 'Lead has no slug — cannot resolve campaign config' }, { status: 400 });
    }

    const configPath = path.join(process.cwd(), 'data', 'campaigns', `${slug}.json`);
    let config: CampaignConfig;
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      return NextResponse.json({ error: `Campaign config not found for slug: ${slug}` }, { status: 404 });
    }

    if (!config.clientId || config.clientId !== sessionClientId) {
      return NextResponse.json({ error: 'You can only upload conversions for the Google Ads account linked to your session.' }, { status: 403 });
    }

    const mode = config.mode === 'test' ? 'test' : 'live';
    const sandboxClientId = process.env.GOOGLE_ADS_SANDBOX_CLIENT_ID || 'google-ads-sandbox';
    const access = resolveGoogleAdsMutationAccess({
      sessionClientId,
      requestedClientId: config.clientId,
      mode,
      sandboxClientId,
      liveModeEnabled: process.env.GOOGLE_ADS_ENABLE_LIVE_MODE === 'true',
    });
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

    // ── Resolve conversion action and value ───────────────────────────────────
    let conversionActionResourceName: string | null;
    let conversionValue: number;
    let conversionDateTime: string;

    if (type === 'verified-lead') {
      conversionActionResourceName = config.verifiedLeadConversionResourceName;
      conversionValue = Math.round(config.avgJobValue * config.closeRateEstimate * 100) / 100;
      conversionDateTime = toGoogleDateTime(lead.date);
    } else {
      conversionActionResourceName = config.closedDealConversionResourceName;
      conversionValue = lead.revenue || 0;
      conversionDateTime = toGoogleDateTime(lead.closedAt || lead.date);
    }

    if (!conversionActionResourceName) {
      return NextResponse.json({
        error: `No conversion action resource name for type "${type}" in campaign config`,
      }, { status: 400 });
    }

    // ── Upload to Google Ads ──────────────────────────────────────────────────
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
      console.error(`[import-conversion] partial failure for lead ${leadId}:`, partialError);
      return NextResponse.json({
        success: false,
        partialError: partialError?.message || JSON.stringify(partialError),
        leadId,
        type,
      }, { status: 207 });
    }

    return NextResponse.json({ success: true, leadId, type, conversionValue });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Conversion upload failed';
    const details = error instanceof Error && 'errors' in error ? (error as { errors?: unknown }).errors : null;
    console.error('[import-conversion] error:', error);
    return NextResponse.json(
      { error: message, details },
      { status: 500 }
    );
  }
}
