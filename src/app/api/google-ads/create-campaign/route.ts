import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleAdsApi, enums, services } from 'google-ads-api';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import { detectVertical } from '@/lib/lp/verticalDetect';
import { bindCampaignToClient } from '@/lib/crm/intelligence';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { resolveGoogleAdsMutationAccess } from '@/lib/google-ads/access-policy';

export interface CampaignConfig {
  clientId?: string;
  mode?: CampaignMode;
  customerId: string;
  slug: string;
  businessName: string;
  businessNiche: string;
  targetLocation: string;
  targetDailyBudget: number;
  targetMonthlyBudget: number;
  avgJobValue: number;
  closeRateEstimate: number;
  verifiedLeadConversionResourceName: string | null;
  closedDealConversionResourceName: string | null;
  createdAt: string;
}

interface CampaignStrategy {
  targetLocation: string;
  suggestedDailyBudget: number;
  keywords: string[];
  negativeKeywords: string[];
}

interface CampaignCopy {
  headlines: string[];
  descriptions: string[];
  callToAction: string;
}

type CampaignMode = 'test' | 'live';

interface CreateCampaignRequest {
  collectedData: CollectedData;
  strategy: CampaignStrategy;
  copy: CampaignCopy;
  consentTimestamp: string;
  clientId?: string;
  mode?: CampaignMode;
}

interface ConversionTagSnippet {
  global_site_tag?: string;
  event_snippet?: string;
}

interface ConversionActionRow {
  conversion_action?: {
    name?: string;
    tag_snippets?: ConversionTagSnippet[];
  };
}

interface GoogleAdsApiError extends Error {
  errors?: unknown;
}

function buildClient() {
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

function resolveAdsAccount(mode: CampaignMode) {
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

function trim(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function slugify(name: string, fallbackNiche?: string, phone?: string): string {
  const latin = (name || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 28)
    .replace(/-$/, '');
  if (latin) return latin;
  // Business name is all Hebrew — use vertical + last-4 of phone for uniqueness
  const vertical = detectVertical(fallbackNiche || '').slice(0, 20);
  const suffix = (phone || '').replace(/\D/g, '').slice(-4) || Date.now().toString(36).slice(-4);
  return `${vertical}-${suffix}`;
}

function extractSendTo(eventSnippet: string): string | undefined {
  const m = eventSnippet.match(/send_to['":\s]+([A-Z0-9\-_/]+)/i);
  return m?.[1];
}

export async function POST(req: Request) {
  try {
    const body: CreateCampaignRequest = await req.json();
    const { collectedData, strategy, copy, consentTimestamp } = body;
    const mode: CampaignMode = body.mode === 'test' ? 'test' : 'live';
    const sandboxClientId = process.env.GOOGLE_ADS_SANDBOX_CLIENT_ID || 'google-ads-sandbox';
    const requestedClientId = body.clientId?.trim() || (mode === 'test' ? sandboxClientId : '');
    const jar = await cookies();
    const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
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

    const adsAccount = resolveAdsAccount(mode);
    const effectiveClientId = requestedClientId || adsAccount.clientId;

    if (!collectedData?.businessNiche) {
      return NextResponse.json({ error: 'collectedData.businessNiche is required' }, { status: 400 });
    }

    const client = buildClient();
    const businessName = collectedData.businessName || collectedData.businessNiche || 'New Business';
    const slug = slugify(businessName, collectedData.businessNiche, collectedData.phone);

    // ── Step 1: Create sub-account under MCC ─────────────────────────────────
    const mccCustomer = client.Customer({ customer_id: adsAccount.mccId, refresh_token: adsAccount.refreshToken });

    const createResult = await mccCustomer.customers.createCustomerClient(
      new services.CreateCustomerClientRequest({
        customer_id: adsAccount.mccId,
        customer_client: {
          descriptive_name: businessName,
          currency_code: 'ILS',
          time_zone: 'Asia/Jerusalem',
        },
      })
    );

    const newCustomerId = createResult.resource_name.split('/')[1];
    if (!newCustomerId) throw new Error('Account creation returned no customer ID');

    const newCustomer = client.Customer({
      customer_id: newCustomerId,
      login_customer_id: adsAccount.mccId,
      refresh_token: adsAccount.refreshToken,
    });

    // ── Step 2: Create conversion actions ────────────────────────────────────
    const avgJobValue = collectedData.avgJobValue || 500;
    // Tiered expected values — a click is not a closed job.
    // Estimated close rate for cold local-service leads ≈ 20%.
    // Calibrated per-account from real CRM closes over time.
    const closeRateEstimate = 0.20;
    const formExpectedValue = Math.round(avgJobValue * closeRateEstimate * 100) / 100;
    const verifiedLeadExpectedValue = Math.round(avgJobValue * closeRateEstimate * 100) / 100;

    const conversionRes = await newCustomer.conversionActions.create([
      {
        name: 'טופס — ליד',
        category: enums.ConversionActionCategory.SUBMIT_LEAD_FORM,
        type: enums.ConversionActionType.WEBPAGE,
        status: enums.ConversionActionStatus.ENABLED,
        counting_type: enums.ConversionActionCountingType.ONE_PER_CLICK,
        value_settings: { default_value: formExpectedValue, always_use_default_value: true },
        click_through_lookback_window_days: 90,
      },
      {
        // ₪0 value — clicks are intent signals, not leads. Value comes from offline uploads.
        name: 'לחיצה על טלפון',
        category: enums.ConversionActionCategory.PHONE_CALL_LEAD,
        type: enums.ConversionActionType.WEBPAGE,
        status: enums.ConversionActionStatus.ENABLED,
        counting_type: enums.ConversionActionCountingType.ONE_PER_CLICK,
        click_through_lookback_window_days: 90,
      },
      {
        // ₪0 value — same reasoning as phone click.
        name: 'לחיצה על וואטסאפ',
        category: enums.ConversionActionCategory.CONTACT,
        type: enums.ConversionActionType.WEBPAGE,
        status: enums.ConversionActionStatus.ENABLED,
        counting_type: enums.ConversionActionCountingType.ONE_PER_CLICK,
        click_through_lookback_window_days: 90,
      },
      {
        // Phase A bidding signal — uploaded within 7 days of lead creation (inside Smart Bidding window).
        // Value = expected value (avgJobValue × close-rate). Human marks GOOD in CRM → triggers upload.
        name: 'ליד מאומת',
        category: enums.ConversionActionCategory.QUALIFIED_LEAD,
        type: enums.ConversionActionType.UPLOAD_CLICKS,
        status: enums.ConversionActionStatus.ENABLED,
        counting_type: enums.ConversionActionCountingType.ONE_PER_CLICK,
        value_settings: { default_value: verifiedLeadExpectedValue, always_use_default_value: false },
        click_through_lookback_window_days: 90,
      },
      {
        // Phase B signal — uploaded as a FRESH conversion at deal close (not a restatement).
        // Readable by bidding within 90 days of click regardless of deal duration.
        // Value = real CRM revenue entered by client.
        name: 'עסקה סגורה',
        category: enums.ConversionActionCategory.CONVERTED_LEAD,
        type: enums.ConversionActionType.UPLOAD_CLICKS,
        status: enums.ConversionActionStatus.ENABLED,
        counting_type: enums.ConversionActionCountingType.ONE_PER_CLICK,
        click_through_lookback_window_days: 90,
      },
    ]);

    // Offline actions have no tag snippets — just resource names for the upload API
    const verifiedLeadConversionResourceName = conversionRes.results[3]?.resource_name ?? null;
    const closedDealConversionResourceName = conversionRes.results[4]?.resource_name ?? null;

    // ── Step 3: Query tag_snippets for gtag labels ────────────────────────────
    let gtagSnippet: string | undefined;
    let formConversionLabel: string | undefined;
    let phoneConversionLabel: string | undefined;
    let whatsappConversionLabel: string | undefined;

    try {
      const conversionRows = (await newCustomer.query(
        `SELECT conversion_action.id, conversion_action.name, conversion_action.tag_snippets
         FROM conversion_action WHERE conversion_action.status = 'ENABLED'`
      )) as ConversionActionRow[];

      for (const row of conversionRows) {
        const action = row.conversion_action;
        if (!action) continue;
        const snippets = action.tag_snippets || [];

        // Global site tag is the same for all actions — grab from first available
        if (!gtagSnippet) {
          const globalTag = snippets.find((s) => s.global_site_tag)?.global_site_tag;
          if (globalTag) gtagSnippet = globalTag;
        }

        // Event snippets — find the onclick variant for labels
        const eventSnippet = snippets.find((s) => s.event_snippet)?.event_snippet || '';
        const sendTo = extractSendTo(eventSnippet);

        if (!sendTo) continue;
        if (action.name === 'טופס — ליד') formConversionLabel = sendTo;
        else if (action.name === 'לחיצה על טלפון') phoneConversionLabel = sendTo;
        else if (action.name === 'לחיצה על וואטסאפ') whatsappConversionLabel = sendTo;
      }
    } catch (e) {
      console.warn('tag_snippets query failed (non-fatal):', e);
    }

    // ── Step 4: Campaign budget ───────────────────────────────────────────────
    const campaignName = `WAO | ${businessName} | Search | ${new Date().toISOString().slice(0, 10)}`;

    const budgetRes = await newCustomer.campaignBudgets.create([{
      name: `${campaignName} — Budget`,
      amount_micros: Math.round(strategy.suggestedDailyBudget * 1_000_000),
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
    }]);
    const budgetResourceName = budgetRes.results[0].resource_name!;

    // ── Step 5: Campaign — MAXIMIZE_CLICKS for new account (no conversion history) ──
    const campaignRes = await newCustomer.campaigns.create([{
      name: campaignName,
      advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
      status: enums.CampaignStatus.PAUSED,
      campaign_budget: budgetResourceName,
      target_spend: { cpc_bid_ceiling_micros: 15_000_000 },
      contains_eu_political_advertising: enums.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
      network_settings: {
        target_google_search: true,
        target_search_network: true,
        target_content_network: false,
        target_partner_search_network: false,
      },
      ...{
        start_date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      },
    }]);

    const campaignResourceName = campaignRes.results[0].resource_name!;
    const campaignId = campaignResourceName.split('/').pop() || newCustomerId;

    // ── Step 6: Geo target — Israel (2376) ───────────────────────────────────
    await newCustomer.campaignCriteria.create([{
      campaign: campaignResourceName,
      type: enums.CriterionType.LOCATION,
      location: { geo_target_constant: 'geoTargetConstants/2376' },
    }]);

    // ── Step 7: Ad group ──────────────────────────────────────────────────────
    const adGroupRes = await newCustomer.adGroups.create([{
      name: `${businessName} — Main`,
      campaign: campaignResourceName,
      status: enums.AdGroupStatus.ENABLED,
      type: enums.AdGroupType.SEARCH_STANDARD,
      cpc_bid_micros: 15_000_000,
    }]);
    const adGroupResourceName = adGroupRes.results[0].resource_name!;

    // ── Step 8: Keywords ──────────────────────────────────────────────────────
    await newCustomer.adGroupCriteria.create([
      ...strategy.keywords.map(kw => ({
        ad_group: adGroupResourceName,
        status: enums.AdGroupCriterionStatus.ENABLED,
        keyword: { text: kw, match_type: enums.KeywordMatchType.PHRASE },
      })),
      ...strategy.negativeKeywords.map(kw => ({
        ad_group: adGroupResourceName,
        status: enums.AdGroupCriterionStatus.ENABLED,
        negative: true,
        keyword: { text: kw, match_type: enums.KeywordMatchType.BROAD },
      })),
    ]);

    // ── Step 9: RSA — finalUrl uses CF Pages subdomain ───────────────────────
    const finalUrl = `https://${slug}.wao.co.il`;
    const headlines = copy.headlines.slice(0, 15).map(h => ({ text: trim(h, 30) }));
    const descriptions = copy.descriptions.slice(0, 4).map(d => ({ text: trim(d, 90) }));

    await newCustomer.adGroupAds.create([{
      ad_group: adGroupResourceName,
      status: enums.AdGroupAdStatus.ENABLED,
      ad: {
        final_urls: [finalUrl],
        responsive_search_ad: { headlines, descriptions },
      },
    }]);

    // ── Step 10: Save campaign config for offline conversion uploads ──────────
    const campaignConfig: CampaignConfig = {
      clientId: effectiveClientId,
      mode,
      customerId: newCustomerId,
      slug,
      businessName,
      businessNiche: collectedData.businessNiche,
      targetLocation: strategy.targetLocation,
      targetDailyBudget: strategy.suggestedDailyBudget,
      targetMonthlyBudget: strategy.suggestedDailyBudget * 30.4,
      avgJobValue,
      closeRateEstimate,
      verifiedLeadConversionResourceName,
      closedDealConversionResourceName,
      createdAt: new Date().toISOString(),
    };
    const configDir = path.join(process.cwd(), 'data', 'campaigns');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, `${slug}.json`), JSON.stringify(campaignConfig, null, 2));
    if (effectiveClientId) {
      bindCampaignToClient({
        clientId: effectiveClientId,
        campaign: campaignConfig,
        campaignId,
        finalUrl,
      });
    }

    // ── Step 11: Consent log → CRM ───────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: collectedData.ownerName || businessName,
        phone: collectedData.phone,
        service: 'google-ads-campaign-created',
        message: [
          `עסק: ${businessName}`,
          `ענף: ${collectedData.businessNiche}`,
          `תקציב יומי: ₪${strategy.suggestedDailyBudget}`,
          `חשבון: ${newCustomerId}`,
          `קמפיין: ${campaignId}`,
          `LP: ${finalUrl}`,
          `הסכמה: ${consentTimestamp}`,
        ].join(' | '),
        source: 'google-ads-api-v1',
      }),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      customerId: newCustomerId,
      clientId: effectiveClientId ?? null,
      campaignId,
      slug,
      finalUrl,
      status: 'PAUSED',
      gtagSnippet,
      formConversionLabel,
      phoneConversionLabel,
      whatsappConversionLabel,
      verifiedLeadConversionResourceName,
      closedDealConversionResourceName,
    });

  } catch (error: unknown) {
    const err = error as GoogleAdsApiError;
    console.error('Google Ads campaign creation error:', err);
    return NextResponse.json(
      { error: err.message || 'Campaign creation failed', details: err.errors ?? null },
      { status: 500 }
    );
  }
}
