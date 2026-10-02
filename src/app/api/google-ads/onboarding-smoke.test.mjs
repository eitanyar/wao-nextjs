import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Full Ads Bot onboarding smoke test — Day 6 capstone of the 6-Day Build
// Program (Lior, 2026-08-15). Chains: onboarding data collection ->
// create-campaign (Tier-1/2 assets) -> LP-deploy (hero-image wiring) ->
// checkout (dry-run-safe). Same source-text-assertion convention as the
// rest of this directory's tests (create-campaign.conversion-actions.test.mjs,
// production-access-guards.test.mjs, google-ads-execution-loop.test.mjs) —
// no live Google Ads / payment-gateway network calls are made; this proves
// the pipeline is wired end-to-end, not that a live account accepts it.
// Roni runs this as the Day-6 gate; a real click-through/API-mocked drive
// is still Roni's separate runtime pass, not this file's job.

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(apiDir, '..', '..', '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

const promptsLib = read('src/lib/bot/prompts.ts');
const createCampaignRoute = read('src/app/api/google-ads/create-campaign/route.ts');
const checkoutRoute = read('src/app/api/checkout/route.ts');
const cloudflarePagesDeploy = read('src/app/api/cloudflare-pages/deploy/route.ts');
const onboardingPage = read('src/app/(app)/google-ads/onboarding/page.tsx');
const onboardingDemo = read('src/lib/google-ads/onboarding-demo.ts');
const cookieBanner = read('src/components/CookieBanner.tsx');
const globalsCss = read('src/app/globals.css');
const siteBotDeploy = read('src/app/api/site-bot/deploy/route.ts');
const siteBotEdit = read('src/app/api/site-bot/edit/route.ts');
const lpSlugPage = read('src/app/(standalone)/lp/[slug]/page.tsx');
const imageCropLib = read('src/lib/google-ads/imageCrop.ts');

test('onboarding collects the CollectedData fields every downstream stage needs', () => {
  assert.match(promptsLib, /trustAssetUrls\?:\s*string\[\]/);
  assert.match(promptsLib, /profilePhotoUrl\?:\s*string/);
  assert.match(promptsLib, /phone\?:\s*string/);
  assert.match(promptsLib, /whatsappNumber\?:\s*string/);
  assert.match(promptsLib, /businessName\?:\s*string/);
});

test('create-campaign wires all Tier-1/2 assets from onboarding data in one run', () => {
  // Each asset creator dispatched together — a partial-asset campaign is a
  // silent quality regression, not a hard failure, so this checks presence
  // of the full set, not that any single one is individually mandatory.
  assert.match(createCampaignRoute, /createCallAsset/);
  assert.match(createCampaignRoute, /createCalloutAssets/);
  assert.match(createCampaignRoute, /createStructuredSnippetAsset/);
  assert.match(createCampaignRoute, /createSitelinkAssets/);
  assert.match(createCampaignRoute, /createImageAssets/);
  assert.match(createCampaignRoute, /Promise\.all\(\[[\s\S]*createImageAssets\(newCustomer,\s*campaignResourceName,\s*collectedData\)/);
});

test('image asset pipeline crops before upload and never force-crops portrait to landscape', () => {
  assert.match(imageCropLib, /buildImageAssetCrops/);
  assert.match(imageCropLib, /LANDSCAPE_MIN_ASPECT/);
  assert.match(createCampaignRoute, /buildImageAssetCrops\(url\)/);
});

test('create-campaign applies route-specific readiness policy before creating a Google Ads client', () => {
  const preliminaryReadiness = createCampaignRoute.indexOf('const preliminaryReadiness = evaluatePaidSearchReadiness');
  const demandLookup = createCampaignRoute.indexOf("await getKeywordDemand(commercialSeeds, strategy.targetLocation)");
  const readinessCheck = createCampaignRoute.indexOf('shouldBlockCampaignCreationForReadiness(mode, readiness)');
  const clientBuild = createCampaignRoute.indexOf('const client = buildClient();');

  assert.ok(preliminaryReadiness >= 0, 'create-campaign must calculate local readiness before a provider lookup');
  assert.ok(demandLookup >= 0, 'create-campaign must retain a live-only demand lookup');
  assert.ok(readinessCheck >= 0, 'create-campaign must use the route-specific readiness helper');
  assert.ok(clientBuild >= 0, 'create-campaign must create the Google Ads client after readiness evaluation');
  assert.ok(preliminaryReadiness < demandLookup, 'create-campaign must block incomplete local live readiness before a provider lookup');
  assert.ok(readinessCheck < clientBuild, 'create-campaign must evaluate readiness before creating a Google Ads client');
});

test('create-campaign keeps sandbox and live credential resolution explicitly separate', () => {
  const testBranch = createCampaignRoute.match(/if \(mode === 'test'\) \{([\s\S]*?)\n  \}\n\n  const refreshToken/);
  const liveBranch = createCampaignRoute.match(/\n  const refreshToken = process\.env\.GOOGLE_ADS_REFRESH_TOKEN;([\s\S]*?)\n  return \{ refreshToken, mccId, clientId: undefined \};/);

  assert.ok(testBranch, 'create-campaign must retain an explicit test credential branch');
  assert.ok(liveBranch, 'create-campaign must retain an explicit live credential branch');
  assert.match(testBranch[1], /process\.env\.GOOGLE_ADS_TEST_REFRESH_TOKEN/);
  assert.match(testBranch[1], /process\.env\.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID/);
  assert.doesNotMatch(testBranch[1], /process\.env\.GOOGLE_ADS_REFRESH_TOKEN\b/);
  assert.doesNotMatch(testBranch[1], /process\.env\.GOOGLE_ADS_MCC_CUSTOMER_ID\b/);
  assert.match(liveBranch[0], /process\.env\.GOOGLE_ADS_REFRESH_TOKEN/);
  assert.match(liveBranch[0], /process\.env\.GOOGLE_ADS_MCC_CUSTOMER_ID/);
  assert.doesNotMatch(liveBranch[0], /GOOGLE_ADS_TEST_REFRESH_TOKEN|GOOGLE_ADS_TEST_MCC_CUSTOMER_ID/);
});

test('onboarding keeps test mode visibly labeled as Sandbox simulation', () => {
  assert.match(onboardingPage, /mode === "test" \|\| isSimulation/);
  assert.match(onboardingPage, /Sandbox \/ מצב הדגמה/);
  assert.match(onboardingPage, /Live \(locked\)/);
});

test('cookie banner suppresses exact onboarding route while preserving privacy disclosure', () => {
  const suppressionAllowlist = cookieBanner.match(/const SUPPRESS_ON = \[([^\]]+)\];/);

  assert.ok(suppressionAllowlist, 'cookie banner must retain the exact-path suppression allowlist');
  assert.match(suppressionAllowlist[1], /["']\/google-ads\/onboarding["']/);
  assert.doesNotMatch(suppressionAllowlist[1], /["']\/privacy["']/);
});

test('reviewing consent keeps desktop allocation and reserves measured mobile capacity', () => {
  assert.match(globalsCss, /\.onboarding-chat-card\.onboarding-chat-card-reviewing \{ height: clamp\(440px, 68dvh, 620px\) !important; \}/);
  assert.match(globalsCss, /@media \(max-width: 640px\) \{\s*\.onboarding-chat-card\.onboarding-chat-card-reviewing \{ height: clamp\(704px, 88dvh, 744px\) !important; \}\s*\}/);
});

test('LP hero image wiring is identical (real photo > stock fallback) across every render/deploy call site', () => {
  const expected = /collectedData\.trustAssetUrls\?\.\[0\]\s*\|\|\s*collectedData\.profilePhotoUrl\s*\|\|\s*assets\.heroImages\[0\]\.url/;
  for (const [name, code] of [
    ['cloudflare-pages/deploy', cloudflarePagesDeploy],
    ['site-bot/deploy', siteBotDeploy],
    ['site-bot/edit', siteBotEdit],
    ['lp/[slug]/page.tsx', lpSlugPage],
  ]) {
    assert.match(code, expected, `${name} must use the real-photo-first fallback chain`);
  }
});

test('checkout is dry-run-safe by default — only goes live on an explicit non-default terminal + live-mode flag', () => {
  assert.match(checkoutRoute, /YAAD_TERMINAL_NUMBER/);
  assert.match(checkoutRoute, /YAAD_LIVE_MODE/);
  assert.match(checkoutRoute, /isLive\s*=\s*Boolean\(terminalNumber\s*&&\s*terminalNumber\s*!==\s*'1234567890'\s*&&\s*process\.env\.YAAD_LIVE_MODE\s*===\s*'true'\)/);
  assert.match(checkoutRoute, /sandboxRedirectUrl/);
  assert.match(checkoutRoute, /mode:\s*'sandbox'/);
});

test('onboarding resolves only the trusted demo query before evaluating payment callbacks', () => {
  assert.match(onboardingPage, /resolveOnboardingDemoEntry/);
  assert.match(onboardingDemo, /getAll\("demo"\)/);
  assert.match(onboardingDemo, /getAll\("mode"\)/);
  assert.match(onboardingDemo, /getAll\("clientId"\)/);
  assert.doesNotMatch(onboardingDemo, /\b(?:window|document|cookie|localStorage|sessionStorage|fetch)\b|process\.env/);

  const queryInitialization = onboardingPage.indexOf('const entry = resolveOnboardingDemoEntry(window.location.search);');
  const paymentCallback = onboardingPage.indexOf('if (!queryReady || isDemo || typeof window === "undefined") return;');
  assert.ok(queryInitialization >= 0, 'onboarding must initialize the trusted query');
  assert.ok(paymentCallback >= 0, 'payment callbacks must wait for query initialization and reject demos');
  assert.ok(queryInitialization < paymentCallback, 'demo initialization must be declared before payment handling');
});

test('every onboarding request-producing handler rejects demo mode', () => {
  for (const handler of [
    'verifySandboxConnection',
    'triggerCampaignLaunch',
    'handleSendMessage',
    'handleUpload',
    'handleApprove',
  ]) {
    const declaration = onboardingPage.indexOf(`const ${handler} = async`);
    assert.ok(declaration >= 0, `${handler} must exist`);
    const opening = onboardingPage.slice(declaration, declaration + 240);
    assert.match(opening, /if \(!queryReady \|\| isDemo(?: \|\| isSubmitting)?\) return;/, `${handler} must reject unresolved and demo mode before requesting`);
  }
});

test('demo mode disables every onboarding mutation control', () => {
  assert.match(onboardingPage, /disabled=\{!queryReady \|\| isDemo \|\| sandboxVerificationStatus === "checking"\}/);
  assert.match(onboardingPage, /disabled=\{!queryReady \|\| isDemo\}/);
  assert.match(onboardingPage, /disabled=\{!queryReady \|\| isDemo \|\| isSubmitting \|\| isUploading \|\| currentState === "COMPLETED"\}/);
  assert.match(onboardingPage, /disabled=\{!queryReady \|\| isDemo \|\| isSubmitting \|\| currentState === "COMPLETED" \|\| !deliveryModelSelected\}/);
  assert.match(onboardingPage, /disabled=\{!queryReady \|\| isDemo \|\| isSubmitting \|\| !inputValue\.trim\(\) \|\| currentState === "COMPLETED"\}/);
  assert.equal((onboardingPage.match(/disabled=\{!queryReady \|\| isDemo \|\| isSubmitting \|\| !acceptedTerms\}/g) || []).length, 2);
  assert.equal((onboardingPage.match(/disabled=\{!queryReady \|\| isDemo \|\| isSubmitting\}/g) || []).length, 2);
});
