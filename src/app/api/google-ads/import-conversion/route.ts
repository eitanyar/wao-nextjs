import { NextResponse } from 'next/server';
import { GoogleAdsApi, services } from 'google-ads-api';
import fs from 'fs';
import path from 'path';
import type { CampaignConfig } from '../create-campaign/route';

type ConversionType = 'verified-lead' | 'closed-deal';

interface ImportRequest {
  leadId: number;
  type: ConversionType;
}

function buildClient() {
  return new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
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
    const body: ImportRequest = await req.json();
    const { leadId, type } = body;

    if (!leadId || !type) {
      return NextResponse.json({ error: 'leadId and type are required' }, { status: 400 });
    }

    // ── Load lead ─────────────────────────────────────────────────────────────
    const leadsPath = path.join(process.cwd(), 'src', 'data', 'leads.json');
    const leads: any[] = JSON.parse(fs.readFileSync(leadsPath, 'utf-8'));
    const lead = leads.find((l: any) => l.id === leadId);

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
    const mccId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID!.replace(/-/g, '');

    const customer = client.Customer({
      customer_id: config.customerId,
      login_customer_id: mccId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
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
    const partialError = (response as any).partial_failure_error;
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

  } catch (error: any) {
    console.error('[import-conversion] error:', error);
    return NextResponse.json(
      { error: error.message || 'Conversion upload failed', details: error?.errors ?? null },
      { status: 500 }
    );
  }
}
