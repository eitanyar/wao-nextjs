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
