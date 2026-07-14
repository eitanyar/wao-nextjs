import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { buildWeeklyDigest, loadClientGoogleAdsIndex, loadCampaignConfigBySlug, type PerformanceSnapshot } from '@/lib/crm/intelligence';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';

function parseOptionalNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: Request) {
  try {
    const jar = await cookies();
    const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
    if (!sessionClientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const slug = url.searchParams.get('slug')?.trim();
    const clientId = url.searchParams.get('clientId')?.trim();
    if (clientId && clientId !== sessionClientId) {
      return NextResponse.json({ error: 'You can only view the Google Ads digest linked to your session.' }, { status: 403 });
    }
    const windowDays = parseOptionalNumber(url.searchParams.get('days')) ?? 7;

    const index = loadClientGoogleAdsIndex(sessionClientId);
    const resolvedSlug = slug || index?.primarySlug;
    if (!resolvedSlug || !(index?.campaigns.some((campaign) => campaign.slug === resolvedSlug))) {
      return NextResponse.json({ error: 'No bound Google Ads campaign found for this client' }, { status: 404 });
    }

    const campaign = loadCampaignConfigBySlug(resolvedSlug);
    if (!campaign) {
      return NextResponse.json({ error: `Campaign config not found for slug: ${slug}` }, { status: 404 });
    }

    const performance: PerformanceSnapshot = {
      impressions: parseOptionalNumber(url.searchParams.get('impressions')),
      clicks: parseOptionalNumber(url.searchParams.get('clicks')),
      spendMicros: parseOptionalNumber(url.searchParams.get('spendMicros')),
    };

    const hasLivePerformance = performance.impressions !== undefined || performance.clicks !== undefined || performance.spendMicros !== undefined;
    const digest = buildWeeklyDigest({
      campaign,
      windowDays,
      performance: hasLivePerformance ? performance : undefined,
    });

    return NextResponse.json({ success: true, digest });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to build weekly digest';
    console.error('[google-ads/weekly-digest] error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
