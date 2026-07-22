import { GoogleAdsApi, enums } from 'google-ads-api';
import type { CampaignConfig } from '@/lib/crm/intelligence';

export interface MutationResult {
  success: boolean;
  resourceName?: string;
  error?: string;
}

export function buildClient() {
  const { GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN } = process.env;
  if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_DEVELOPER_TOKEN) {
    throw new Error('Google Ads API credentials not configured');
  }
  return new GoogleAdsApi({
    client_id: GOOGLE_ADS_CLIENT_ID,
    client_secret: GOOGLE_ADS_CLIENT_SECRET,
    developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
  });
}

export function resolveAdsAccount(mode: 'test' | 'live') {
  if (mode === 'test') {
    const refreshToken = process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN || process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const mccId = (process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID || process.env.GOOGLE_ADS_MCC_CUSTOMER_ID)?.replace(/-/g, '');
    if (!refreshToken || !mccId) {
      throw new Error('Test mode requires GOOGLE_ADS_TEST_REFRESH_TOKEN and GOOGLE_ADS_TEST_MCC_CUSTOMER_ID');
    }
    return { refreshToken, mccId, clientId: process.env.GOOGLE_ADS_SANDBOX_CLIENT_ID || 'google-ads-sandbox' };
  }

  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const mccId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID?.replace(/-/g, '');
  if (!refreshToken || !mccId) {
    throw new Error('Live mode requires GOOGLE_ADS_REFRESH_TOKEN and GOOGLE_ADS_MCC_CUSTOMER_ID');
  }
  return { refreshToken, mccId, clientId: undefined };
}

export function resolveCustomer(campaignConfig: CampaignConfig, clientInstance?: ReturnType<typeof buildClient>) {
  const mode = campaignConfig.mode || 'test';
  const adsAccount = resolveAdsAccount(mode);
  const client = clientInstance || buildClient();
  return client.Customer({
    customer_id: campaignConfig.customerId,
    login_customer_id: adsAccount.mccId,
    refresh_token: adsAccount.refreshToken,
  });
}

export async function setCampaignStatus(params: {
  campaignConfig: CampaignConfig;
  campaignId: string;
  status: 'ENABLED' | 'PAUSED';
  clientInstance?: ReturnType<typeof buildClient>;
}): Promise<MutationResult> {
  try {
    const customer = resolveCustomer(params.campaignConfig, params.clientInstance);
    const resourceName = `customers/${params.campaignConfig.customerId}/campaigns/${params.campaignId}`;
    const adsStatus = params.status === 'ENABLED' ? enums.CampaignStatus.ENABLED : enums.CampaignStatus.PAUSED;

    const res = await customer.campaigns.update([
      {
        resource_name: resourceName,
        status: adsStatus,
      },
    ]);

    const statusRes = res?.results?.[0]?.resource_name;
    return {
      success: true,
      resourceName: statusRes ? String(statusRes) : resourceName,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to update campaign status',
    };
  }
}

export async function setCampaignDailyBudget(params: {
  campaignConfig: CampaignConfig;
  campaignId: string;
  dailyBudgetIls: number;
  clientInstance?: ReturnType<typeof buildClient>;
}): Promise<MutationResult> {
  try {
    const customer = resolveCustomer(params.campaignConfig, params.clientInstance);
    const rows = await customer.query(
      `SELECT campaign.id, campaign_budget.resource_name FROM campaign WHERE campaign.id = ${params.campaignId}`
    );

    const budgetResourceName = (rows as any[])?.[0]?.campaign_budget?.resource_name;
    if (!budgetResourceName) {
      return { success: false, error: `Could not resolve campaign budget resource name for campaign ID ${params.campaignId}` };
    }

    const amountMicros = Math.round(params.dailyBudgetIls * 1_000_000);
    const res = await customer.campaignBudgets.update([
      {
        resource_name: budgetResourceName,
        amount_micros: amountMicros,
      },
    ]);

    const budgetResName = res?.results?.[0]?.resource_name;
    return {
      success: true,
      resourceName: budgetResName ? String(budgetResName) : budgetResourceName,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to update campaign daily budget',
    };
  }
}

export async function addNegativeKeywords(params: {
  campaignConfig: CampaignConfig;
  adGroupResourceName: string;
  keywords: string[];
  matchType?: 'BROAD' | 'PHRASE' | 'EXACT';
  clientInstance?: ReturnType<typeof buildClient>;
}): Promise<MutationResult> {
  try {
    const customer = resolveCustomer(params.campaignConfig, params.clientInstance);
    const matchTypeEnum =
      params.matchType === 'EXACT'
        ? enums.KeywordMatchType.EXACT
        : params.matchType === 'PHRASE'
        ? enums.KeywordMatchType.PHRASE
        : enums.KeywordMatchType.BROAD;

    const operations = params.keywords.map((kw) => ({
      ad_group: params.adGroupResourceName,
      status: enums.AdGroupCriterionStatus.ENABLED,
      negative: true,
      keyword: {
        text: kw.trim(),
        match_type: matchTypeEnum,
      },
    }));

    const res = await customer.adGroupCriteria.create(operations);

    const resourceName = res?.results?.[0]?.resource_name;
    return {
      success: true,
      resourceName: resourceName ? String(resourceName) : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to add negative keywords',
    };
  }
}
