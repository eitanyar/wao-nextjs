import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { loadCampaignConfigBySlug, loadClientGoogleAdsIndex } from '@/lib/crm/intelligence';
import { resolveGoogleAdsMutationAccess } from '@/lib/google-ads/access-policy';
import { setCampaignStatus } from '@/lib/google-ads/mutations';

interface CampaignStatusRequest {
  action: 'pause' | 'resume';
}

export async function POST(req: Request) {
  try {
    const jar = await cookies();
    const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
    if (!sessionClientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const index = loadClientGoogleAdsIndex(sessionClientId);
    if (!index?.primarySlug) {
      return NextResponse.json({ error: 'No bound Google Ads campaign found for this client' }, { status: 409 });
    }

    const campaignConfig = loadCampaignConfigBySlug(index.primarySlug);
    if (!campaignConfig) {
      return NextResponse.json({ error: 'Campaign config could not be loaded' }, { status: 409 });
    }

    const mode = campaignConfig.mode || 'test';
    const sandboxClientId = process.env.GOOGLE_ADS_SANDBOX_CLIENT_ID || 'google-ads-sandbox';
    const requestedClientId = campaignConfig.clientId || (mode === 'test' ? sandboxClientId : '');

    const access = resolveGoogleAdsMutationAccess({
      sessionClientId,
      requestedClientId,
      mode,
      sandboxClientId,
      liveModeEnabled: process.env.GOOGLE_ADS_ENABLE_LIVE_MODE === 'true',
    });

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = (await req.json().catch(() => ({}))) as CampaignStatusRequest;
    if (body.action !== 'pause' && body.action !== 'resume') {
      return NextResponse.json({ error: "Action must be either 'pause' or 'resume'" }, { status: 400 });
    }

    const status = body.action === 'pause' ? 'PAUSED' : 'ENABLED';
    const campaignId = index.primaryCampaignId;
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID missing from client index' }, { status: 409 });
    }

    const result = await setCampaignStatus({
      campaignConfig,
      campaignId,
      status,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update campaign status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaignId,
      status,
    });
  } catch (error: any) {
    console.error('[google-ads/campaign-status] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
