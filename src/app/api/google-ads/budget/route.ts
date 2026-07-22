import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { loadCampaignConfigBySlug, loadClientGoogleAdsIndex } from '@/lib/crm/intelligence';
import { resolveGoogleAdsMutationAccess } from '@/lib/google-ads/access-policy';
import { setCampaignDailyBudget } from '@/lib/google-ads/mutations';

interface BudgetRequest {
  dailyBudgetIls: number;
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

    const body = (await req.json().catch(() => ({}))) as BudgetRequest;
    const dailyBudgetIls = Number(body.dailyBudgetIls);
    if (!Number.isFinite(dailyBudgetIls) || dailyBudgetIls <= 0) {
      return NextResponse.json({ error: 'Invalid daily budget value' }, { status: 400 });
    }

    if (dailyBudgetIls < 5) {
      return NextResponse.json({ error: 'Daily budget must be at least ₪5.' }, { status: 400 });
    }

    const campaignId = index.primaryCampaignId;
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID missing from client index' }, { status: 409 });
    }

    const result = await setCampaignDailyBudget({
      campaignConfig,
      campaignId,
      dailyBudgetIls,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update daily budget' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaignId,
      dailyBudgetIls,
    });
  } catch (error: any) {
    console.error('[google-ads/budget] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
