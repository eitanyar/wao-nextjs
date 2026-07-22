import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { loadCampaignConfigBySlug, loadClientGoogleAdsIndex } from '@/lib/crm/intelligence';
import { resolveGoogleAdsMutationAccess } from '@/lib/google-ads/access-policy';
import { addNegativeKeywords } from '@/lib/google-ads/mutations';

interface NegativeKeywordsRequest {
  keywords: string[];
  matchType?: 'BROAD' | 'PHRASE' | 'EXACT';
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

    const body = (await req.json().catch(() => ({}))) as NegativeKeywordsRequest;
    const rawKeywords = Array.isArray(body.keywords) ? body.keywords : [];
    const keywords = rawKeywords.map((k) => (typeof k === 'string' ? k.trim() : '')).filter(Boolean);

    if (keywords.length === 0) {
      return NextResponse.json({ error: 'At least one valid keyword is required' }, { status: 400 });
    }

    if (keywords.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 negative keywords allowed per request' }, { status: 400 });
    }

    const adGroupResourceName = (campaignConfig as any).adGroupResourceName;
    if (!adGroupResourceName) {
      return NextResponse.json(
        {
          error:
            'This campaign was created before ad-group binding was tracked. Re-run create-campaign or backfill adGroupResourceName manually.',
        },
        { status: 409 }
      );
    }

    const campaignId = index.primaryCampaignId;
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID missing from client index' }, { status: 409 });
    }

    const matchType = body.matchType || 'BROAD';
    const result = await addNegativeKeywords({
      campaignConfig,
      adGroupResourceName,
      keywords,
      matchType,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to add negative keywords' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaignId,
      added: keywords,
    });
  } catch (error: any) {
    console.error('[google-ads/negative-keywords] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
