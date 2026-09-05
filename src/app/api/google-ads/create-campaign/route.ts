import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleAdsApi, enums, services } from 'google-ads-api';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import { TAMAR_CALLOUT_SYSTEM_PROMPT, TAMAR_STRUCTURED_SNIPPET_SYSTEM_PROMPT } from '@/lib/bot/prompts';
import { detectVertical } from '@/lib/lp/verticalDetect';
import { bindCampaignToClient } from '@/lib/crm/intelligence';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { resolveGoogleAdsMutationAccess } from '@/lib/google-ads/access-policy';
import { buildOnboardingAutonomyPolicy } from '@/lib/google-ads/autonomy-consent';
import { writeAutonomyPolicy } from '@/lib/google-ads/autonomy';
import { appendGoogleAdsDirectActionAudit } from '@/lib/google-ads/direct-action-audit';
import { callGeminiJSON } from '@/lib/ai/gemini-fast';
import { buildImageAssetCrops } from '@/lib/google-ads/imageCrop';
import { getKeywordDemand } from '@/lib/ads/keywordPlanner';
import {
  evaluatePaidSearchReadiness,
  paidSearchReadinessBlockedResponse,
  type PaidSearchDemandEvidenceSummary,
} from '@/lib/google-ads/demand-readiness';
import { deriveCplCeilingIls } from '@/lib/crm/intelligence';

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
  adGroupResourceName?: string;
  createdAt: string;
  demandEvidence?: PaidSearchDemandEvidenceSummary;
}

interface CampaignStrategy {
  targetLocation: string;
  suggestedDailyBudget: number;
  keywords: string[];
  negativeKeywords: string[];
  estimatedLeadConversionRate?: number;
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
  autonomyConsent?: boolean;
  autonomyConsentTimestamp?: string;
  autonomyTermsVersion?: string;
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

// TEMP: verbose, non-swallowed asset-error logging for live sandbox debugging
// (Adam's bug report, 2026-08-01). `JSON.stringify(e, Object.getOwnPropertyNames(e))`
// only allowlists the TOP-level object's own properties — it does NOT recurse
// into nested objects, so the google-ads-api library's `err.errors` array
// (each entry a GoogleAdsError with error_code/message/location) collapses to
// `[{}]`. Surface `err.errors` explicitly instead — proven to serialize fine
// at the top-level route catch. Keep this verbose until asset-verification
// work (see route report) is fully confirmed against real API error text.
function logAssetError(label: string, e: unknown) {
  const err = e as GoogleAdsApiError;
  const detail = err?.errors ?? err?.message ?? err;
  console.error(`${label} (non-fatal):`, JSON.stringify(detail, null, 2));
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

// ── Tier 1 / sitelink / image / message asset helpers ───────────────────────
// All of these are deliberately fail-soft: campaign creation succeeding
// without every asset type is better than failing the whole campaign over
// one optional asset. Each helper logs a warning and returns quietly on error.

// Gemini's JSON-mode output for these two prompts was observed (2026-08-01
// diagnosis, see route report) to occasionally corrupt the JSON even with a
// schema containing only constrained short fields. Two distinct failure
// modes seen on the real sandbox path: (a) valid JSON with trailing junk
// after it — handled durably now by extractJsonSpan() in gemini-fast.ts,
// which callGeminiJSON applies to every caller; (b) genuinely malformed
// JSON mid-object (e.g. "Expected ',' or '}' after property value") that no
// amount of post-processing can repair — a real generation glitch, not a
// parsing bug. For (b), only a fresh model call helps. A single retry left
// residual failures in real testing (2026-08-01), so this now allows up to
// 2 retries (3 attempts total) before giving up — these two asset types are
// fail-soft by design, so a final failure still just logs and skips
// (masking would require this to fail on ALL 3 attempts, which would also
// indicate a real prompt/schema regression worth investigating).
async function callGeminiJSONWithRetry(systemPrompt: string, userMessage: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const raw = await callGeminiJSON(systemPrompt, userMessage);
      JSON.parse(raw);
      return raw;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

interface CalloutPromptResult {
  callouts?: string[];
}

interface StructuredSnippetPromptResult {
  header?: 'Service catalog' | 'Types' | 'Brands';
  values?: string[];
}

// Fixed, mechanical sitelink anchor set — see route report / Adam's mission
// doc for the architecture decision. Labels are static (not LLM-generated):
// the anchor set never varies by business, so a deterministic mapping is
// more reliable than a model call for something that's always the same 4
// destinations. Noa should still spot-check this static Hebrew before it
// goes live with real clients (mechanical copy, not full gate cycle).
const SITELINK_ANCHORS: Array<{ anchor: string; linkText: string; description1: string; description2: string }> = [
  { anchor: 'services', linkText: 'השירותים שלנו', description1: 'כל השירותים במקום אחד', description2: 'פתרון מלא לכל צורך' },
  { anchor: 'reviews', linkText: 'ביקורות', description1: 'מה הלקוחות אומרים עלינו', description2: 'חוות דעת אמיתיות מלקוחות' },
  { anchor: 'faq', linkText: 'שאלות נפוצות', description1: 'התשובות לשאלות הנפוצות ביותר', description2: 'כל מה שרציתם לדעת' },
  { anchor: 'contact', linkText: 'צור קשר', description1: 'השאירו פרטים ונחזור אליכם', description2: 'זמינים גם בטלפון ובווטסאפ' },
];

async function createCallAsset(newCustomer: ReturnType<GoogleAdsApi['Customer']>, campaignResourceName: string, phone: string) {
  try {
    // Real API error (2026-08-01 diagnosis): CALL_PHONE_NUMBER_NOT_SUPPORTED_FOR_COUNTRY
    // when sending the Israeli local-dial form "0501234567" alongside
    // country_code: 'IL'. Google's phone-number validation (libphonenumber)
    // expects the NATIONAL SIGNIFICANT NUMBER — i.e. without the domestic
    // trunk prefix "0" — since the trunk prefix is implied by country_code.
    // Strip a single leading trunk zero after digit extraction.
    const digits = phone.replace(/[^0-9]/g, '').replace(/^0+/, '');
    if (!digits) return;
    const assetRes = await newCustomer.assets.create([{
      type: enums.AssetType.CALL,
      call_asset: {
        country_code: 'IL',
        phone_number: digits,
        call_conversion_reporting_state: enums.CallConversionReportingState.DISABLED,
      },
    }]);
    const assetResourceName = assetRes.results[0]?.resource_name;
    if (!assetResourceName) return;
    await newCustomer.campaignAssets.create([{
      campaign: campaignResourceName,
      asset: assetResourceName,
      field_type: enums.AssetFieldType.CALL,
    }]);
  } catch (e) {
    logAssetError('Call asset creation failed', e);
  }
}

async function createCalloutAssets(newCustomer: ReturnType<GoogleAdsApi['Customer']>, campaignResourceName: string, collectedData: CollectedData) {
  try {
    const brief = `
guarantee: ${collectedData.guarantee ?? ''}
yearsInField: ${collectedData.yearsInField ?? ''}
license: ${collectedData.license ?? ''}
starRating: ${collectedData.starRating ?? ''}
responseTime: ${collectedData.responseTime ?? ''}
pricingNotes: ${collectedData.pricingNotes ?? ''}
`;
    const raw = await callGeminiJSONWithRetry(TAMAR_CALLOUT_SYSTEM_PROMPT, brief);
    const parsed = JSON.parse(raw) as CalloutPromptResult;
    const callouts = (parsed.callouts ?? []).filter(c => c && c.length <= 25).slice(0, 8);
    if (!callouts.length) return;

    const assetRes = await newCustomer.assets.create(
      callouts.map(text => ({
        type: enums.AssetType.CALLOUT,
        callout_asset: { callout_text: text },
      }))
    );
    const links = assetRes.results
      .map(r => r.resource_name)
      .filter((name): name is string => Boolean(name))
      .map(asset => ({
        campaign: campaignResourceName,
        asset,
        field_type: enums.AssetFieldType.CALLOUT,
      }));
    if (links.length) await newCustomer.campaignAssets.create(links);
  } catch (e) {
    logAssetError('Callout asset creation failed', e);
  }
}

async function createStructuredSnippetAsset(newCustomer: ReturnType<GoogleAdsApi['Customer']>, campaignResourceName: string, collectedData: CollectedData) {
  try {
    const brief = `
primaryService: ${collectedData.primaryService ?? ''}
secondaryServices: ${collectedData.secondaryServices ?? ''}
businessNiche: ${collectedData.businessNiche ?? ''}
`;
    const raw = await callGeminiJSONWithRetry(TAMAR_STRUCTURED_SNIPPET_SYSTEM_PROMPT, brief);
    const parsed = JSON.parse(raw) as StructuredSnippetPromptResult;
    const values = (parsed.values ?? []).filter(v => v && v.length <= 25).slice(0, 10);
    // Prompt's own rule: skip silently if fewer than 3 genuine values exist.
    if (values.length < 3) return;
    const header = parsed.header || 'Service catalog';

    const assetRes = await newCustomer.assets.create([{
      type: enums.AssetType.STRUCTURED_SNIPPET,
      structured_snippet_asset: { header, values },
    }]);
    const assetResourceName = assetRes.results[0]?.resource_name;
    if (!assetResourceName) return;
    await newCustomer.campaignAssets.create([{
      campaign: campaignResourceName,
      asset: assetResourceName,
      field_type: enums.AssetFieldType.STRUCTURED_SNIPPET,
    }]);
  } catch (e) {
    logAssetError('Structured snippet asset creation failed', e);
  }
}

async function createSitelinkAssets(newCustomer: ReturnType<GoogleAdsApi['Customer']>, campaignResourceName: string, finalUrl: string) {
  try {
    const assetRes = await newCustomer.assets.create(
      SITELINK_ANCHORS.map(s => ({
        type: enums.AssetType.SITELINK,
        final_urls: [`${finalUrl}#${s.anchor}`],
        sitelink_asset: { link_text: s.linkText, description1: s.description1, description2: s.description2 },
      }))
    );
    const links = assetRes.results
      .map(r => r.resource_name)
      .filter((name): name is string => Boolean(name))
      .map(asset => ({
        campaign: campaignResourceName,
        asset,
        field_type: enums.AssetFieldType.SITELINK,
      }));
    if (links.length) await newCustomer.campaignAssets.create(links);
  } catch (e) {
    logAssetError('Sitelink asset creation failed', e);
  }
}

async function createImageAssets(newCustomer: ReturnType<GoogleAdsApi['Customer']>, campaignResourceName: string, collectedData: CollectedData) {
  try {
    const sourceUrls = [
      ...(collectedData.trustAssetUrls ?? []),
      ...(collectedData.profilePhotoUrl ? [collectedData.profilePhotoUrl] : []),
    ].slice(0, 4); // Google recommends 4+ for full serving eligibility; cap the intake ask covers this
    if (!sourceUrls.length) return;

    const assetOperations: Array<{ type: number; image_asset: { data: Buffer; mime_type: number } }> = [];
    for (const url of sourceUrls) {
      const crops = await buildImageAssetCrops(url);
      if (!crops) continue;
      assetOperations.push({ type: enums.AssetType.IMAGE, image_asset: { data: crops.square, mime_type: enums.MimeType.IMAGE_JPEG } });
      if (crops.landscape) {
        assetOperations.push({ type: enums.AssetType.IMAGE, image_asset: { data: crops.landscape, mime_type: enums.MimeType.IMAGE_JPEG } });
      }
    }
    if (!assetOperations.length) return;

    const assetRes = await newCustomer.assets.create(assetOperations);
    const links = assetRes.results
      .map(r => r.resource_name)
      .filter((name): name is string => Boolean(name))
      .map(asset => ({
        campaign: campaignResourceName,
        asset,
        field_type: enums.AssetFieldType.AD_IMAGE,
      }));
    if (links.length) await newCustomer.campaignAssets.create(links);
  } catch (e) {
    logAssetError('Image asset creation failed', e);
  }
}

// WhatsApp message asset — beta as of July 2026 per Dror's research. Mapping
// is built now but gated behind an explicit env flag so it never fires live
// until Google GAs the asset type for this account.
async function createWhatsAppMessageAsset(newCustomer: ReturnType<GoogleAdsApi['Customer']>, campaignResourceName: string, collectedData: CollectedData) {
  if (!process.env.ENABLE_WHATSAPP_MESSAGE_ASSETS) return;
  try {
    const whatsappNumber = collectedData.whatsappNumber || collectedData.phone;
    if (!whatsappNumber) return;
    // Same national-significant-number rule as createCallAsset — strip the
    // domestic trunk "0" before pairing with country_code: 'IL'.
    const digits = whatsappNumber.replace(/[^0-9]/g, '').replace(/^0+/, '');
    if (!digits) return;

    const assetRes = await newCustomer.assets.create([{
      type: enums.AssetType.BUSINESS_MESSAGE,
      business_message_asset: {
        message_provider: enums.BusinessMessageProvider.WHATSAPP,
        starter_message: `שלום! אשמח לעזור — ${collectedData.businessName || ''}`.trim(),
        whatsapp_info: { country_code: 'IL', phone_number: digits },
      },
    }]);
    const assetResourceName = assetRes.results[0]?.resource_name;
    if (!assetResourceName) return;
    await newCustomer.campaignAssets.create([{
      campaign: campaignResourceName,
      asset: assetResourceName,
      field_type: enums.AssetFieldType.BUSINESS_MESSAGE,
    }]);
  } catch (e) {
    logAssetError('WhatsApp message asset creation failed', e);
  }
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

    const commercialSeeds = [...(strategy?.keywords ?? []), ...(collectedData.extractedKeywords ?? [])];
    const avgJobValue = collectedData.avgJobValue || 500;
    const closeRateEstimate = 0.20;
    const cplCeilingIls = deriveCplCeilingIls({ avgJobValue, closeRateEstimate } as CampaignConfig);
    const demand = mode === 'test' ? null : await getKeywordDemand(commercialSeeds, strategy.targetLocation);
    const readiness = evaluatePaidSearchReadiness({
      mode,
      commercialSeeds,
      demand,
      minMonthlySearches: Number(process.env.GOOGLE_ADS_MIN_MONTHLY_SEARCHES),
      dailyBudgetIls: strategy.suggestedDailyBudget,
      estimatedLeadConversionRate: strategy.estimatedLeadConversionRate,
      cplCeilingIls,
    });
    if (!readiness.ready) return paidSearchReadinessBlockedResponse(readiness);

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
    // Tiered expected values — a click is not a closed job.
    // Estimated close rate for cold local-service leads ≈ 20%.
    // Calibrated per-account from real CRM closes over time.
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

    // ── Step 9b: Ad Strength assets — call, callout, structured snippet,
    // sitelinks, image, WhatsApp message. Every one of these is fail-soft:
    // a failure here must never abort campaign creation (see helpers above).
    // Run independent ones in parallel; they don't depend on each other.
    await Promise.all([
      collectedData.phone ? createCallAsset(newCustomer, campaignResourceName, collectedData.phone) : Promise.resolve(),
      createCalloutAssets(newCustomer, campaignResourceName, collectedData),
      createStructuredSnippetAsset(newCustomer, campaignResourceName, collectedData),
      createSitelinkAssets(newCustomer, campaignResourceName, finalUrl),
      createImageAssets(newCustomer, campaignResourceName, collectedData),
      createWhatsAppMessageAsset(newCustomer, campaignResourceName, collectedData),
    ]);

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
      adGroupResourceName,
      createdAt: new Date().toISOString(),
      demandEvidence: readiness.evidence,
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
      const autonomyPolicy = buildOnboardingAutonomyPolicy({
        clientId: effectiveClientId,
        mode,
        autonomyConsent: body.autonomyConsent,
        autonomyConsentTimestamp: body.autonomyConsentTimestamp,
        autonomyTermsVersion: body.autonomyTermsVersion,
        dailyBudgetIls: strategy.suggestedDailyBudget,
        authorizedBy: sessionClientId ?? effectiveClientId,
        legalTermsVersion: process.env.GOOGLE_ADS_AUTONOMY_LEGAL_VERSION,
      });
      if (autonomyPolicy && !writeAutonomyPolicy(autonomyPolicy)) {
        throw new Error('Unable to persist autonomy policy after campaign binding');
      }
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

    if (effectiveClientId) {
      appendGoogleAdsDirectActionAudit({
        clientId: effectiveClientId,
        actionType: 'campaign_creation',
        actorClientId: sessionClientId ?? effectiveClientId,
        campaignId,
        status: 'success',
        metadata: { customerId: newCustomerId, slug, businessName, dailyBudgetIls: strategy.suggestedDailyBudget },
        createdAt: new Date().toISOString(),
      });
    }

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
