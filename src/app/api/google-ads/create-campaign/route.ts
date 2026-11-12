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
  shouldBlockCampaignCreationForReadiness,
  type PaidSearchDemandEvidenceSummary,
} from '@/lib/google-ads/demand-readiness';
import { deriveCplCeilingIls } from '@/lib/crm/intelligence';
import { clientsDir } from '@/lib/dataRoots';
import {
  applyVerifiedLeadOnlyGoals,
  isPrimaryConversionCategory,
  planVerifiedLeadOnlyGoals,
  readConversionGoalState,
} from '@/lib/google-ads/conversion-goals';
import { recordGoalChange } from '@/lib/google-ads/bidding-phase-state';
import { validateCampaignStrategy, type NormalizedKeyword } from '@/lib/google-ads/keyword-normalize';
import {
  buildGeoTargetTypeSetting,
  buildLocationCriteria,
  resolveGeoTargeting,
  suggestionsFromResponse,
  summarizeGeoTargets,
} from '@/lib/google-ads/geo-targeting';
import { ISRAELI_LOCALITIES } from '@/lib/site-bot/israeliLocalities';
import { cpcCapIlsForNiche, cpcCapTradeForNiche } from '@/lib/google-ads/cpc-cap';
import { evaluateCampaignSetup, readCampaignSetup, type CampaignSetupVerdict } from '@/lib/google-ads/campaign-setup-readback';

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
  /** Fix 1 (2026-11-12): the location targets actually sent (geo IDs + names), always PRESENCE. */
  geoTargeting?: ReturnType<typeof summarizeGeoTargets>;
  /** Fix 2: the AD_CALL "calls from ads" secondary conversion action the call asset reports to. */
  callConversionResourceName?: string | null;
  /** Fix 4: the per-trade Maximize Clicks max-CPC ceiling used (NIS). */
  cpcCapIls?: number;
}

interface CampaignStrategy {
  targetLocation: string;
  suggestedDailyBudget: number;
  keywords: string[];
  /** Optional: the bot's fallback strategy has none (defaults to []). */
  negativeKeywords?: string[];
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
    const refreshToken = process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN;
    const mccId = process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID?.replace(/-/g, '');
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

/**
 * ads-bot-phase2 spec §3 0a — reads the new account's goals, makes only the verified-lead
 * category biddable (customer + this campaign), then reads back and verifies nothing is left to
 * change. Returns true only when the read-back is clean. Never throws.
 */
async function configureVerifiedLeadOnlyGoals(
  newCustomer: ReturnType<GoogleAdsApi['Customer']>,
  campaignResourceName: string,
  verifiedLeadConversionResourceName: string | null,
): Promise<boolean> {
  try {
    const state = await readConversionGoalState(newCustomer, { campaignResourceName });
    const plan = planVerifiedLeadOnlyGoals(state, verifiedLeadConversionResourceName);
    await applyVerifiedLeadOnlyGoals(newCustomer, plan);
    const after = planVerifiedLeadOnlyGoals(await readConversionGoalState(newCustomer, { campaignResourceName }), verifiedLeadConversionResourceName);
    const remaining = after.actions.length + after.customerGoals.length + after.campaignGoals.length;
    if (remaining) {
      console.error('Verified-lead-only goal read-back mismatch (non-fatal):', JSON.stringify(after));
      return false;
    }
    return true;
  } catch (e) {
    logAssetError('Verified-lead-only goal configuration', e);
    return false;
  }
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

/** Minimum call length that counts as a "call from ads" conversion (Dror fix 2: about 60s). */
const CALL_CONVERSION_MIN_SECONDS = 60;

/** English internal name of the AD_CALL action (account-internal label; no owner-facing Hebrew). */
const CALLS_FROM_ADS_ACTION_NAME = 'Calls from ads (60s+)';

async function createCallAsset(
  newCustomer: ReturnType<GoogleAdsApi['Customer']>,
  campaignResourceName: string,
  phone: string,
  callConversionResourceName: string | null,
) {
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
        // Fix 2 (2026-11-12): calls from the ad's call button are counted, against the
        // secondary AD_CALL action only (never the account default, never a primary goal).
        ...(callConversionResourceName
          ? {
              call_conversion_reporting_state: enums.CallConversionReportingState.USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION,
              call_conversion_action: callConversionResourceName,
            }
          : { call_conversion_reporting_state: enums.CallConversionReportingState.DISABLED }),
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

    if (!collectedData?.businessNiche) {
      return NextResponse.json({ error: 'collectedData.businessNiche is required' }, { status: 400 });
    }

    // Fix 3 (2026-11-12): validate before any Google Ads write. Keywords become plain text with
    // EXACT/PHRASE, negatives default to [] (the bot's fallback strategy has none).
    const strategyCheck = validateCampaignStrategy(strategy);
    if (!strategyCheck.ok) {
      return NextResponse.json({ error: strategyCheck.error }, { status: 400 });
    }
    const normalizedKeywords: NormalizedKeyword[] = strategyCheck.keywords;
    const normalizedNegatives: string[] = strategyCheck.negativeKeywords;

    const commercialSeeds = [...normalizedKeywords.map(k => k.text), ...(collectedData.extractedKeywords ?? [])];
    const avgJobValue = collectedData.avgJobValue || 500;
    const closeRateEstimate = 0.20;
    const cplCeilingIls = deriveCplCeilingIls({ avgJobValue, closeRateEstimate } as CampaignConfig);
    const preliminaryReadiness = evaluatePaidSearchReadiness({
      mode,
      commercialSeeds,
      demand: null,
      minMonthlySearches: Number(process.env.GOOGLE_ADS_MIN_MONTHLY_SEARCHES),
      dailyBudgetIls: strategy.suggestedDailyBudget,
      estimatedLeadConversionRate: strategy.estimatedLeadConversionRate,
      cplCeilingIls,
    });
    if (shouldBlockCampaignCreationForReadiness(mode, preliminaryReadiness)) {
      return paidSearchReadinessBlockedResponse(preliminaryReadiness);
    }

    // Do not construct a Google Ads client or start demand retrieval until the
    // request's local readiness prerequisites have already passed.
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
    if (shouldBlockCampaignCreationForReadiness(mode, readiness)) {
      return paidSearchReadinessBlockedResponse(readiness);
    }

    const adsAccount = resolveAdsAccount(mode);
    const effectiveClientId = requestedClientId || adsAccount.clientId;
    const client = buildClient();
    const businessName = collectedData.businessName || collectedData.businessNiche || 'New Business';
    const slug = slugify(businessName, collectedData.businessNiche, collectedData.phone);

    const mccCustomer = client.Customer({ customer_id: adsAccount.mccId, refresh_token: adsAccount.refreshToken });

    // ── Step 0b: Location targets (fix 1) — resolved BEFORE the account exists ──
    // A non-remote business with zero matched places is refused here: no orphan account,
    // and never a silent fall back to all of Israel.
    const geo = await resolveGeoTargeting(
      { ...collectedData, targetLocation: collectedData.targetLocation || strategy.targetLocation },
      async (name) => suggestionsFromResponse(await mccCustomer.geoTargetConstants.suggestGeoTargetConstants(
        new services.SuggestGeoTargetConstantsRequest({ locale: 'he', country_code: 'IL', location_names: { names: [name] } }),
      )),
      ISRAELI_LOCALITIES,
    );
    if (!geo.ok) {
      return NextResponse.json(
        { error: 'location_targeting_unresolved', details: geo.error, unmatchedNames: geo.unmatchedNames },
        { status: 422 },
      );
    }

    // Fix 4: one max-CPC ceiling per trade (src/lib/google-ads/cpc-cap.ts).
    const cpcCapIls = cpcCapIlsForNiche(collectedData.businessNiche);
    const cpcCapMicros = Math.round(cpcCapIls * 1_000_000);

    // ── Step 1: Create sub-account under MCC ─────────────────────────────────

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
    // Bidding goal (ads-bot-phase2 spec §3 0a): only the verified lead is primary_for_goal; the
    // other four are secondary (recorded, never bid on). primary_for_goal defaults to true when
    // omitted, so it is set explicitly on every action.
    // Tiered expected values — a click is not a closed job.
    // Estimated close rate for cold local-service leads ≈ 20%.
    // Calibrated per-account from real CRM closes over time.
    const formExpectedValue = Math.round(avgJobValue * closeRateEstimate * 100) / 100;
    const verifiedLeadExpectedValue = Math.round(avgJobValue * closeRateEstimate * 100) / 100;

    const conversionRes = await newCustomer.conversionActions.create([
      {
        name: 'טופס — ליד',
        category: enums.ConversionActionCategory.SUBMIT_LEAD_FORM,
        primary_for_goal: isPrimaryConversionCategory(enums.ConversionActionCategory.SUBMIT_LEAD_FORM),
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
        primary_for_goal: isPrimaryConversionCategory(enums.ConversionActionCategory.PHONE_CALL_LEAD),
        type: enums.ConversionActionType.WEBPAGE,
        status: enums.ConversionActionStatus.ENABLED,
        counting_type: enums.ConversionActionCountingType.ONE_PER_CLICK,
        click_through_lookback_window_days: 90,
      },
      {
        // ₪0 value — same reasoning as phone click.
        name: 'לחיצה על וואטסאפ',
        category: enums.ConversionActionCategory.CONTACT,
        primary_for_goal: isPrimaryConversionCategory(enums.ConversionActionCategory.CONTACT),
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
        primary_for_goal: isPrimaryConversionCategory(enums.ConversionActionCategory.QUALIFIED_LEAD),
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
        primary_for_goal: isPrimaryConversionCategory(enums.ConversionActionCategory.CONVERTED_LEAD),
        type: enums.ConversionActionType.UPLOAD_CLICKS,
        status: enums.ConversionActionStatus.ENABLED,
        counting_type: enums.ConversionActionCountingType.ONE_PER_CLICK,
        click_through_lookback_window_days: 90,
      },
      {
        // Fix 2 (2026-11-12): calls from the ad's call button (Google forwarding number), 60s+.
        // SECONDARY and ₪0: recorded for the CRM / CPL / digest and search-term protection,
        // never bid on. Keep it LAST so results[3] / results[4] stay the offline actions.
        name: CALLS_FROM_ADS_ACTION_NAME,
        category: enums.ConversionActionCategory.PHONE_CALL_LEAD,
        primary_for_goal: isPrimaryConversionCategory(enums.ConversionActionCategory.PHONE_CALL_LEAD),
        type: enums.ConversionActionType.AD_CALL,
        status: enums.ConversionActionStatus.ENABLED,
        counting_type: enums.ConversionActionCountingType.ONE_PER_CLICK,
        phone_call_duration_seconds: CALL_CONVERSION_MIN_SECONDS,
        value_settings: { default_value: 0, always_use_default_value: true },
      },
    ]);

    // Offline actions have no tag snippets — just resource names for the upload API
    const verifiedLeadConversionResourceName = conversionRes.results[3]?.resource_name ?? null;
    const closedDealConversionResourceName = conversionRes.results[4]?.resource_name ?? null;
    const callConversionResourceName = conversionRes.results[5]?.resource_name ?? null;

    // ── Step 2b: Account call reporting on (fix 2) ───────────────────────────
    // Call reporting must be on for the call asset's forwarding number to record calls. The
    // account-level default action is the same secondary AD_CALL action. Non-fatal: the read-back
    // below reports the real state.
    try {
      await newCustomer.customers.update([{
        resource_name: `customers/${newCustomerId}`,
        call_reporting_setting: {
          call_reporting_enabled: true,
          call_conversion_reporting_enabled: true,
          ...(callConversionResourceName ? { call_conversion_action: callConversionResourceName } : {}),
        },
      }]);
    } catch (e) {
      logAssetError('Call reporting setting', e);
    }

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
      target_spend: { cpc_bid_ceiling_micros: cpcCapMicros },
      contains_eu_political_advertising: enums.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
      network_settings: {
        target_google_search: true,
        target_search_network: false, // fix 3: Search Partners off
        target_content_network: false,
        target_partner_search_network: false,
      },
      // Fix 1: PRESENCE only — people in (or regularly in) the area, not people "interested in" it.
      geo_target_type_setting: buildGeoTargetTypeSetting(),
      // AI Max guard (Dror batch A, 2026-11-12): from 2026-09-01 Google auto-upgrades Search
      // campaigns with automatically created assets / campaign-level broad match to AI Max. Set
      // everything OFF explicitly. campaign.keyword_match_type is left unset on purpose: its only
      // value in v24 is BROAD (setting it is what turns campaign-level broad match on).
      ai_max_setting: { enable_ai_max: false },
      asset_automation_settings: [
        { asset_automation_type: enums.AssetAutomationType.TEXT_ASSET_AUTOMATION, asset_automation_status: enums.AssetAutomationStatus.OPTED_OUT },
        { asset_automation_type: enums.AssetAutomationType.FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION, asset_automation_status: enums.AssetAutomationStatus.OPTED_OUT },
      ],
      ...{
        start_date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      },
    }]);

    const campaignResourceName = campaignRes.results[0].resource_name!;
    const campaignId = campaignResourceName.split('/').pop() || newCustomerId;

    // ── Step 5b: Verified-lead-only conversion goals (ads-bot-phase2 spec §3 0a) ──
    // Customer- and campaign-level goals: only QUALIFIED_LEAD~WEBSITE stays biddable. Done at
    // launch on purpose: on Maximize Clicks a goal change has no bidding effect, later it would
    // restart Learning. Non-fatal (the campaign is PAUSED and on clicks); the outcome is logged
    // and the read-back plan must come back empty.
    const goalsConfigured = await configureVerifiedLeadOnlyGoals(newCustomer, campaignResourceName, verifiedLeadConversionResourceName);

    // ── Step 6: Geo targets (fix 1) — resolved in step 0b, no bid modifiers ──
    await newCustomer.campaignCriteria.create(buildLocationCriteria(campaignResourceName, geo.targets));

    // ── Step 7: Ad group ──────────────────────────────────────────────────────
    const adGroupRes = await newCustomer.adGroups.create([{
      name: `${businessName} — Main`,
      campaign: campaignResourceName,
      status: enums.AdGroupStatus.ENABLED,
      type: enums.AdGroupType.SEARCH_STANDARD,
      cpc_bid_micros: cpcCapMicros, // unused by Maximize Clicks; kept equal to the campaign ceiling
    }]);
    const adGroupResourceName = adGroupRes.results[0].resource_name!;

    // ── Step 8: Keywords ──────────────────────────────────────────────────────
    await newCustomer.adGroupCriteria.create([
      ...normalizedKeywords.map(kw => ({
        ad_group: adGroupResourceName,
        status: enums.AdGroupCriterionStatus.ENABLED,
        keyword: { text: kw.text, match_type: kw.matchType === 'EXACT' ? enums.KeywordMatchType.EXACT : enums.KeywordMatchType.PHRASE },
      })),
      ...normalizedNegatives.map(kw => ({
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
      collectedData.phone ? createCallAsset(newCustomer, campaignResourceName, collectedData.phone, callConversionResourceName) : Promise.resolve(),
      createCalloutAssets(newCustomer, campaignResourceName, collectedData),
      createStructuredSnippetAsset(newCustomer, campaignResourceName, collectedData),
      createSitelinkAssets(newCustomer, campaignResourceName, finalUrl),
      createImageAssets(newCustomer, campaignResourceName, collectedData),
      createWhatsAppMessageAsset(newCustomer, campaignResourceName, collectedData),
    ]);

    // ── Step 9c: Setup read-back (fixes 1-3 + AI Max guard). Non-fatal: the campaign is
    // PAUSED; the verdict is logged and returned so the sandbox run / Roni can check it.
    let setupReadBack: CampaignSetupVerdict | { ok: false; error: string };
    try {
      setupReadBack = evaluateCampaignSetup(
        await readCampaignSetup(newCustomer, campaignResourceName, callConversionResourceName),
        {
          geoTargetConstants: geo.targets.flatMap(t => (t.kind === 'location' ? [t.geoTargetConstant] : [])),
          proximityCount: geo.targets.filter(t => t.kind === 'proximity').length,
          remote: geo.serviceModel === 'remote',
          callConversionResourceName,
          expectCallAsset: Boolean(collectedData.phone),
          cpcCapMicros,
        },
      );
      if (!setupReadBack.ok) console.error('Campaign setup read-back mismatch (non-fatal):', JSON.stringify(setupReadBack.issues));
    } catch (e) {
      logAssetError('Campaign setup read-back', e);
      setupReadBack = { ok: false, error: (e as Error)?.message ?? 'read-back failed' };
    }

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
      geoTargeting: summarizeGeoTargets(geo),
      callConversionResourceName,
      cpcCapIls,
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
      if (goalsConfigured) {
        const recorded = recordGoalChange({ clientId: effectiveClientId, baseDir: clientsDir(), at: new Date().toISOString(), customerId: newCustomerId, source: 'create-campaign' });
        if (!recorded) console.error('bidding-phase.json goal-change record failed (non-fatal) for client', effectiveClientId);
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
      callConversionResourceName,
      cpcCapIls,
      cpcCapTrade: cpcCapTradeForNiche(collectedData.businessNiche),
      geoTargeting: campaignConfig.geoTargeting,
      goalsConfigured,
      setupReadBack,
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
