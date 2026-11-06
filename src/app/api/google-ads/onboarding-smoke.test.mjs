import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Ads Bot onboarding source smoke test. Checks the preserved review/demo
// surface and the disabled legacy payment/launch funnel. Same convention as the
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
const callbackRoute = read('src/app/api/checkout/callback/route.ts');
const sandboxPage = read('src/app/(product)/checkout/yaad-sandbox/page.tsx');
const cloudflarePagesDeploy = read('src/app/api/cloudflare-pages/deploy/route.ts');
const onboardingPage = read('src/app/(app)/google-ads/onboarding/page.tsx');
const paymentUnavailableDraft = read('docs/copy/google-ads-onboarding-payment-unavailable-2026-10-05.md');
const onboardingDemo = read('src/lib/google-ads/onboarding-demo.ts');
const cookieBanner = read('src/components/CookieBanner.tsx');
const globalsCss = read('src/app/globals.css');
const siteBotDeploy = read('src/app/api/site-bot/deploy/route.ts');
const siteBotEdit = read('src/app/api/site-bot/edit/route.ts');
const lpSlugPage = read('src/app/(standalone)/lp/[slug]/page.tsx');
const imageCropLib = read('src/lib/google-ads/imageCrop.ts');

test('initial onboarding renders messages before delivery choices in the same conversation scroller', () => {
  const conversation = onboardingPage.slice(onboardingPage.indexOf('ref={messagesContainerRef}'), onboardingPage.indexOf('{/* Chat Input Form */}'));
  const messages = conversation.indexOf('{messages.map((msg, i) => (');
  const choices = conversation.indexOf('{!deliveryModelSelected && (');
  assert.ok(messages >= 0 && choices > messages, 'opening message and subsequent chronology must precede choices inside the scroller');
  assert.match(conversation, /data-chat-role=\{msg.role\}/);
  assert.match(conversation, /deliveryModelOptions.map/);
  assert.match(conversation, /onClick=\{\(\) => selectDeliveryModel\(option.value as CollectedData\["serviceModel"\]\)\}/);
});

test('onboarding conversation has bounded shrinkable flow and responsive wrapping choices', () => {
  const conversation = onboardingPage.slice(onboardingPage.indexOf('ref={messagesContainerRef}'), onboardingPage.indexOf('{/* Chat Input Form */}'));
  assert.match(conversation, /minHeight: 0/);
  assert.match(conversation, /overflowY: "auto"/);
  assert.match(conversation, /justifyContent: "flex-start"/);
  assert.match(conversation, /repeat\(auto-fit, minmax\(min\(100%, 180px\), 1fr\)\)/);
  assert.match(conversation, /minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere"/);
  assert.match(onboardingPage, /repeat\(auto-fit, minmax\(min\(100%, 320px\), 1fr\)\)/);
  assert.match(onboardingPage, /flex: 1, minWidth: 0, display: "flex"/);
  const chatCard = onboardingPage.slice(onboardingPage.indexOf('{/* Right Column: Chat Assistant (Adam) */}'), onboardingPage.indexOf('{/* Left Column: Live Campaign Preview & Strategy */}'));
  assert.equal((chatCard.match(/flexShrink: 0,/g) || []).length, 3, 'header, composer and upload control must not collapse');
  assert.doesNotMatch(conversation, /lineClamp|textOverflow|overflowX|position: "absolute"/);
});

test('assistant scrolling uses coordinates relative to the actual conversation viewport', () => {
  const scrolling = onboardingPage.slice(onboardingPage.indexOf('useLayoutEffect(() => {'), onboardingPage.indexOf('const handleSendMessage'));
  assert.match(scrolling, /el.scrollTop \+ latestAssistant.getBoundingClientRect\(\).top - el.getBoundingClientRect\(\).top - el.clientTop - 16/);
  assert.doesNotMatch(scrolling, /offsetTop/);
  assert.match(scrolling, /el.scrollTop = el.scrollHeight/);
});

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

test('onboarding displays the approved payment-unavailable notice instead of the old price offer', () => {
  const keyedLines = paymentUnavailableDraft.split('\n').filter((line) => line.startsWith('googleAdsOnboarding.paymentUnavailableNotice: '));
  assert.equal(keyedLines.length, 1, 'approved draft must have one keyed notice');
  const notice = keyedLines[0].split(': ', 2)[1];
  assert.ok(notice);
  const comparisonBlock = onboardingPage.match(/lineHeight: 1\.6,\n            }}>\n([\s\S]*?)            <\/div>/);
  assert.ok(comparisonBlock, 'comparison block must remain in the onboarding render');
  assert.equal(comparisonBlock[1], `              ${notice}\n`);
  assert.equal(onboardingPage.split(notice).length - 1, 1, 'notice must occur exactly once');
  assert.doesNotMatch(comparisonBlock[1], /<strong|\b(?:9\.90|249|1,500)\b/);
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

test('LP hero image wiring is identical (real photo > stock fallback) across active render/deploy call sites', () => {
  const expected = /collectedData\.trustAssetUrls\?\.\[0\]\s*\|\|\s*collectedData\.profilePhotoUrl\s*\|\|\s*assets\.heroImages\[0\]\.url/;
  for (const [name, code] of [
    ['cloudflare-pages/deploy', cloudflarePagesDeploy],
    ['site-bot/deploy', siteBotDeploy],
    ['lp/[slug]/page.tsx', lpSlugPage],
  ]) {
    assert.match(code, expected, `${name} must use the real-photo-first fallback chain`);
  }
});

test('legacy site-bot edit route has no edit/publish imports and is fixed disabled', () => {
  assert.deepEqual(siteBotEdit.match(/^import .*$/gm), ["import { NextResponse } from 'next/server';"]);
  assert.doesNotMatch(siteBotEdit, /\b(?:require|import\s*\(|readFileSync|writeFileSync|execSync|renderSitePages|callGeminiJSON|fetch|process)\b/);
  assert.match(siteBotEdit, /export async function POST\(\)\s*\{\s*return NextResponse\.json\(\s*\{ error: 'site_edit_disabled' \},\s*\{ status: 503, headers: \{ 'Cache-Control': 'private, no-store' \} \}\s*\);\s*\}/);
});

test('both legacy checkout handlers expose only fixed private unavailable responses', () => {
  for (const [source, method] of [[checkoutRoute, 'POST'], [callbackRoute, 'GET']]) {
    assert.deepEqual(source.match(/^import .*$/gm), ["import { NextResponse } from 'next/server';"]);
    assert.match(source, new RegExp(`export async function ${method}\\(\\)\\s*\\{\\s*return NextResponse\\.json\\(\\s*\\{ error: 'checkout_unavailable' \\},\\s*\\{ status: 503, headers: \\{ 'Cache-Control': 'private, no-store' \\} \\}\\s*\\);\\s*\\}`));
    assert.doesNotMatch(source, /\b(?:process|fetch|console|Date|require|readFileSync|writeFileSync)\b|YAAD_|redirect/);
  }
});

test('legacy sandbox page is a server-side notFound with no card or simulation surface', () => {
  assert.deepEqual(sandboxPage.match(/^import .*$/gm), ["import { notFound } from 'next/navigation';"]);
  assert.match(sandboxPage, /export default function YaadSandbox\(\)\s*\{\s*notFound\(\);\s*\}/);
  assert.doesNotMatch(sandboxPage, /use client|useSearchParams|<form|<input|CVV|payment=success|setTimeout|router\.push/);
});

test('onboarding resolves only the trusted demo query without payment callback actions', () => {
  assert.match(onboardingPage, /resolveOnboardingDemoEntry/);
  assert.match(onboardingDemo, /getAll\("demo"\)/);
  assert.match(onboardingDemo, /getAll\("mode"\)/);
  assert.match(onboardingDemo, /getAll\("clientId"\)/);
  assert.doesNotMatch(onboardingDemo, /\b(?:window|document|cookie|localStorage|sessionStorage|fetch)\b|process\.env/);

  const queryInitialization = onboardingPage.indexOf('const entry = resolveOnboardingDemoEntry(window.location.search);');
  assert.ok(queryInitialization >= 0, 'onboarding must initialize the trusted query');
  assert.doesNotMatch(onboardingPage, /triggerCampaignLaunch|handleApprove|payment=success|NEXT_PUBLIC_PAYMENT_BYPASS|\/api\/checkout|\/api\/google-ads\/create-campaign|\/api\/cloudflare-pages\/deploy|AutonomyConsent|acceptedTerms/);
  assert.match(onboardingPage, /currentState === "REVIEWING"/);
  assert.match(onboardingPage, /const handleSendMessage = async/);
  assert.match(onboardingPage, /\/api\/lp-generate/);
});

test('every onboarding request-producing handler rejects demo mode', () => {
  for (const handler of [
    'verifySandboxConnection',
    'handleSendMessage',
    'handleUpload',
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
  assert.doesNotMatch(onboardingPage, /onClick=\{(?:handleApprove|triggerCampaignLaunch)\}|!acceptedTerms/);
});
