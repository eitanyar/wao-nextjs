import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';
import {
  bindCampaignToClient,
  loadCampaignConfigBySlug,
  type CampaignConfig,
  type GoogleAdsClientIndex,
} from '@/lib/crm/intelligence';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { resolveGoogleAdsMutationAccess } from '@/lib/google-ads/access-policy';

interface LinkClientRequest {
  clientId: string;
  slug: string;
  campaignId?: string;
  customerId?: string;
  finalUrl?: string;
}

export async function POST(req: Request) {
  try {
    const body: LinkClientRequest = await req.json();
    const clientId = body.clientId?.trim();
    const slug = body.slug?.trim();

    if (!clientId || !slug) {
      return NextResponse.json({ error: 'clientId and slug are required' }, { status: 400 });
    }

    const campaign = loadCampaignConfigBySlug(slug);
    if (!campaign) {
      return NextResponse.json({ error: `Campaign config not found for slug: ${slug}` }, { status: 404 });
    }

    const jar = await cookies();
    const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
    const access = resolveGoogleAdsMutationAccess({
      sessionClientId,
      requestedClientId: clientId,
      mode: campaign.mode === 'test' ? 'test' : 'live',
      sandboxClientId: process.env.GOOGLE_ADS_SANDBOX_CLIENT_ID || 'google-ads-sandbox',
      liveModeEnabled: process.env.GOOGLE_ADS_ENABLE_LIVE_MODE === 'true',
    });

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (body.customerId && body.customerId !== campaign.customerId) {
      return NextResponse.json({ error: 'customerId does not match campaign config' }, { status: 400 });
    }

    if (!body.campaignId || !body.campaignId.trim()) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const nextCampaign: CampaignConfig = {
      ...campaign,
      clientId,
    };

    const configPath = path.join(process.cwd(), 'data', 'campaigns', `${slug}.json`);
    fs.writeFileSync(configPath, JSON.stringify(nextCampaign, null, 2));

    const index: GoogleAdsClientIndex = bindCampaignToClient({
      clientId,
      campaign: nextCampaign,
      campaignId: body.campaignId,
      finalUrl: body.finalUrl,
    });

    return NextResponse.json({ success: true, index, campaign: nextCampaign });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to link client to campaign';
    console.error('[google-ads/link-client] error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
