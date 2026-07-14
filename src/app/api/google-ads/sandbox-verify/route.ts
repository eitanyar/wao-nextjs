import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleAdsApi } from 'google-ads-api';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { loadCampaignConfigBySlug, loadClientGoogleAdsIndex } from '@/lib/crm/intelligence';
import { resolveGoogleAdsMutationAccess } from '@/lib/google-ads/access-policy';

interface CustomerRow {
  customer?: {
    id?: string | number;
    descriptive_name?: string;
  };
}

interface CampaignRow {
  campaign?: {
    id?: string | number;
    name?: string;
    status?: string;
    advertising_channel_type?: string;
  };
}

function buildGoogleAdsClient(): GoogleAdsApi {
  const { GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN } = process.env;
  if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_DEVELOPER_TOKEN) {
    throw new Error('Google Ads API credentials are not configured');
  }

  return new GoogleAdsApi({
    client_id: GOOGLE_ADS_CLIENT_ID,
    client_secret: GOOGLE_ADS_CLIENT_SECRET,
    developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
  });
}

function getTestAccountCredentials(): { refreshToken: string; mccCustomerId: string } {
  const refreshToken = process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN || process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const mccCustomerId = (process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID || process.env.GOOGLE_ADS_MCC_CUSTOMER_ID)?.replace(/-/g, '');

  if (!refreshToken || !mccCustomerId) {
    throw new Error('Test mode requires Google Ads test-MCC credentials');
  }

  return { refreshToken, mccCustomerId };
}

export async function GET() {
  try {
    const sandboxClientId = process.env.GOOGLE_ADS_SANDBOX_CLIENT_ID || 'google-ads-sandbox';
    const jar = await cookies();
    const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
    const access = resolveGoogleAdsMutationAccess({
      sessionClientId,
      requestedClientId: sandboxClientId,
      mode: 'test',
      sandboxClientId,
      liveModeEnabled: false,
    });

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const index = loadClientGoogleAdsIndex(sandboxClientId);
    if (!index) {
      return NextResponse.json({ error: 'Sandbox Google Ads campaign binding was not found.' }, { status: 409 });
    }

    const campaignConfig = loadCampaignConfigBySlug(index.primarySlug);
    if (!campaignConfig || campaignConfig.mode !== 'test') {
      return NextResponse.json({ error: 'Sandbox campaign configuration is missing or is not marked as test mode.' }, { status: 409 });
    }

    if (!/^\d+$/.test(index.primaryCampaignId) || !/^\d+$/.test(index.primaryCustomerId)) {
      return NextResponse.json({ error: 'Sandbox campaign binding has an invalid Google Ads identifier.' }, { status: 409 });
    }

    const { refreshToken, mccCustomerId } = getTestAccountCredentials();
    const client = buildGoogleAdsClient();
    const customer = client.Customer({
      customer_id: index.primaryCustomerId,
      login_customer_id: mccCustomerId,
      refresh_token: refreshToken,
    });

    const customerRows = (await customer.query(
      'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1'
    )) as CustomerRow[];
    const campaignRows = (await customer.query(
      `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type FROM campaign WHERE campaign.id = ${index.primaryCampaignId} LIMIT 1`
    )) as CampaignRow[];
    const campaign = campaignRows[0]?.campaign;

    if (!campaign) {
      return NextResponse.json({ error: 'Sandbox campaign was not found in Google Ads.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      mode: 'test',
      customer: {
        id: String(customerRows[0]?.customer?.id ?? index.primaryCustomerId),
        name: customerRows[0]?.customer?.descriptive_name ?? null,
      },
      campaign: {
        id: String(campaign.id ?? index.primaryCampaignId),
        name: campaign.name ?? null,
        status: campaign.status ?? null,
        channel: campaign.advertising_channel_type ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify the sandbox Google Ads campaign';
    console.error('[google-ads/sandbox-verify] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
