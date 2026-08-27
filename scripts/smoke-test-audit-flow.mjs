import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { ACQUISITION_COPY } from '../dist/lib/site-bot/acquisitionCopy.js';
import { SCORECARD_COPY } from '../dist/lib/site-bot/scorecardCopy.js';
import { scoreAudit } from '../dist/lib/gbp/auditScore.js';
import { seedFromAudit } from '../dist/lib/site-bot/seedPrefill.js';
import {
  formatWhatsAppShareMessage,
  buildWhatsAppShareUrl,
  formatCommunityPost,
  getOutboundHookForAudit,
} from '../dist/lib/site-bot/shareUtils.js';

console.log('--- Starting End-to-End Audit Lead Magnet Smoke Test ---');

// 1. Verify Entry State & Copy Tokens
console.log('\n[Check 1] Verifying Entry State Acquisition Copy Tokens & Form Bindings...');
const auditPageSource = fs.readFileSync(path.join(process.cwd(), 'src/app/(app)/site-bot/audit/page.tsx'), 'utf8');

// Check all 7 acquisition copy tokens are referenced
const expectedTokens = [
  'ACQUISITION_COPY.ENTRY_TRUST_BADGE',
  'ACQUISITION_COPY.ENTRY_HERO_HEADLINE',
  'ACQUISITION_COPY.ENTRY_HERO_SUBTITLE',
  'ACQUISITION_COPY.ENTRY_VALUE_PROP_1',
  'ACQUISITION_COPY.ENTRY_VALUE_PROP_2',
  'ACQUISITION_COPY.ENTRY_VALUE_PROP_3',
  'ACQUISITION_COPY.ENTRY_CTA_BUTTON',
];

for (const token of expectedTokens) {
  assert(auditPageSource.includes(token), `Expected ${token} in src/app/(app)/site-bot/audit/page.tsx`);
}
console.log('✓ All 7 Acquisition Copy Tokens correctly referenced in entry state.');

// Verify SCORECARD_COPY references
const expectedScorecardTokens = [
  'SCORECARD_COPY.FORM_NAME_LABEL',
  'SCORECARD_COPY.FORM_NAME_PLACEHOLDER',
  'SCORECARD_COPY.FORM_PHONE_LABEL',
  'SCORECARD_COPY.FORM_PHONE_PLACEHOLDER',
  'SCORECARD_COPY.FORM_LOADING',
  'SCORECARD_COPY.PAGE_TITLE',
  'SCORECARD_COPY.PAGE_SUBTITLE',
  'SCORECARD_COPY.SCORELINE',
  'SCORECARD_COPY.SEC_FOUND',
  'SCORECARD_COPY.SEC_MISSING',
  'SCORECARD_COPY.DIY_HOWTO_LABEL',
  'SCORECARD_COPY.CTA_TRIAL',
  'SCORECARD_COPY.CTA_SHARE',
];

for (const token of expectedScorecardTokens) {
  assert(auditPageSource.includes(token), `Expected ${token} in src/app/(app)/site-bot/audit/page.tsx`);
}
console.log('✓ Scorecard copy tokens correctly referenced.');

// 2. Test Scoring Engine & Scorecard Rendering Logic
console.log('\n[Check 2] Testing Audit Scoring & DIY How-To Step Logic...');

const mockPlaceWithFailingDimensions = {
  placeId: 'ChIJtest_lead_magnet_123',
  displayName: 'אינסטלטור משה ובניו',
  formattedAddress: 'הרצל 45, תל אביב-יפו',
  city: 'תל אביב-יפו',
  primaryType: 'plumber',
  primaryTypeDisplayName: 'אינסטלטור',
  types: ['plumber'],
  regularOpeningHours: undefined, // Hours FAIL -> should trigger DIY_HOURS_STEPS
  rating: 4.5,
  userRatingCount: 3, // Rating count < 10 -> Reviews FAIL
  photos: { fetched: true, count: 0 }, // Photos FAIL -> should trigger DIY_PHOTOS_STEPS
  nationalPhoneNumber: '0501234567', // Phone PASS
  websiteUri: 'https://moshe-plumbing.co.il', // Website PASS
  editorialSummary: 'שירותי אינסטלציה 24/7 במרכז', // Description PASS
  location: { lat: 32.0853, lng: 34.7818 },
};

const auditScoreResult = scoreAudit(mockPlaceWithFailingDimensions);
assert.equal(auditScoreResult.total, 6, 'Audit total dimensions must be 6');
console.log(`✓ Audit score computed: ${auditScoreResult.passed}/${auditScoreResult.total} passed`);

// Check DIY guide step generation for failing dimensions
const failingKeys = auditScoreResult.dimensions.filter((d) => d.status === 'fail').map((d) => d.key);
console.log('Failing dimensions:', failingKeys);

assert(failingKeys.includes('hours'), 'Hours should fail');
assert(failingKeys.includes('photos'), 'Photos should fail');
assert(failingKeys.includes('categories'), 'Categories should fail because secondary categories absent');

for (const key of ['categories', 'hours', 'photos']) {
  if (failingKeys.includes(key)) {
    const diyKey = `DIY_${key.toUpperCase()}_STEPS`;
    assert(SCORECARD_COPY[diyKey], `SCORECARD_COPY should have ${diyKey}`);
    assert(SCORECARD_COPY[diyKey].length > 10, `${diyKey} should have step-by-step text`);
    console.log(`✓ DIY Steps available for failing dimension: ${key}`);
  }
}

// 3. Test Share Affordances (WhatsApp, Community, Outbound)
console.log('\n[Check 3] Testing Scorecard Share Affordances & Deep Links...');
const testAuditId = '11111111-2222-3333-4444-555555555555';

const waPeerMsg = formatWhatsAppShareMessage({ mode: 'peer', auditId: testAuditId });
assert(waPeerMsg.includes(testAuditId), 'WhatsApp peer message must include auditId link');
console.log('✓ WhatsApp peer message formatted with deep link');

const waMarketerMsg = formatWhatsAppShareMessage({ mode: 'marketer', auditId: testAuditId });
assert(waMarketerMsg.includes(testAuditId), 'WhatsApp marketer message must include auditId link');
console.log('✓ WhatsApp marketer message formatted with deep link');

const waShareUrl = buildWhatsAppShareUrl({ auditId: testAuditId, mode: 'peer' });
assert(waShareUrl.startsWith('https://api.whatsapp.com/send?text='), 'WhatsApp share URL valid');
console.log('✓ WhatsApp share URL generated');

const communityPost = formatCommunityPost({ auditId: testAuditId });
assert(communityPost.fullPost.includes(testAuditId), 'Community post must include audit deep link');
console.log('✓ Community post formatted with deep link');

const outboundHook = getOutboundHookForAudit({ auditResult: auditScoreResult, auditId: testAuditId });
assert(outboundHook.fullMessage.includes(testAuditId), 'Outbound hook must include deep link');
assert.equal(outboundHook.failingDimension, 'categories', 'First failing hook should be categories');
console.log('✓ Outbound hook detected failing dimension and formatted hook');

// 4. Test Transition into Onboarding Prefill (/site-bot/start?auditId=...)
console.log('\n[Check 4] Testing Audit -> Site-Bot Onboarding Prefill Seeding...');
const seededData = seedFromAudit(mockPlaceWithFailingDimensions);
assert.equal(seededData.businessName, 'אינסטלטור משה ובניו', 'Seeded businessName must match');
assert.equal(seededData.phone, '0501234567', 'Seeded phone must match');
assert.equal(seededData.targetLocation, 'תל אביב-יפו', 'Seeded targetLocation must match');
assert.equal(seededData.serviceModel, 'field', 'Plumber serviceModel must be field');
console.log('✓ Seeded collectedData from audit payload:', JSON.stringify(seededData));

// Check onboarding page has prefill support
const startPageSource = fs.readFileSync(path.join(process.cwd(), 'src/app/(app)/site-bot/start/page.tsx'), 'utf8');
assert(startPageSource.includes('searchParams.get("auditId")'), 'start page must read auditId query param');
assert(startPageSource.includes('/api/site-bot/audit-result?auditId='), 'start page must fetch audit-result with auditId');
assert(startPageSource.includes('seedFromAudit'), 'start page must seed prefill using seedFromAudit');
assert(startPageSource.includes('SCORECARD_COPY.PREFILL_HINT'), 'start page must include prefill hint in prompt');
console.log('✓ Site-bot start onboarding prefill flow verified');

// 5. Test Audit Store and Result API Mock Fixture
console.log('\n[Check 5] Testing Audit Store & Audit Lookup / Result Route Contracts...');
const auditsDir = path.join(process.cwd(), 'data', 'audits');
fs.mkdirSync(auditsDir, { recursive: true });

const fixtureAuditId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
const fixturePayload = {
  auditId: fixtureAuditId,
  query: { businessName: 'אינסטלטור משה ובניו', phone: '0501234567' },
  fetchedAt: new Date().toISOString(),
  candidates: [mockPlaceWithFailingDimensions],
};

const fixtureFile = path.join(auditsDir, `${fixtureAuditId}.json`);
fs.writeFileSync(fixtureFile, JSON.stringify(fixturePayload, null, 2), 'utf8');

// Also create a multi-candidate fixture
const multiAuditId = 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e';
const multiPayload = {
  auditId: multiAuditId,
  query: { businessName: 'מוסך דוד' },
  fetchedAt: new Date().toISOString(),
  candidates: [
    {
      placeId: 'cand-1',
      displayName: 'מוסך דוד תל אביב',
      formattedAddress: 'יגאל אלון 100, תל אביב',
      primaryType: 'car_repair',
      types: ['car_repair'],
      location: { lat: 32.07, lng: 34.79 },
    },
    {
      placeId: 'cand-2',
      displayName: 'מוסך דוד חיפה',
      formattedAddress: 'דרך העצמאות 50, חיפה',
      primaryType: 'car_repair',
      types: ['car_repair'],
      location: { lat: 32.81, lng: 34.99 },
    },
  ],
};
const multiFile = path.join(auditsDir, `${multiAuditId}.json`);
fs.writeFileSync(multiFile, JSON.stringify(multiPayload, null, 2), 'utf8');

console.log('✓ Audit store test fixtures created.');

// 6. Live HTTP Route Smoke Verification
console.log('\n[Check 6] Running Live HTTP Route Verification against Next.js server...');

async function runLiveServerSmokeTests() {
  const PORT = 3008;
  const BASE_URL = `http://localhost:${PORT}`;

  console.log(`Starting Next.js production server on port ${PORT}...`);
  const serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverStarted = false;

  const killServer = () => {
    try {
      serverProcess.kill('SIGTERM');
    } catch {}
  };

  // Wait for server ready
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`${BASE_URL}/site-bot/audit`);
      if (res.status === 200) {
        serverStarted = true;
        break;
      }
    } catch {
      // still starting
    }
  }

  if (!serverStarted) {
    killServer();
    throw new Error('Next.js server failed to start on port ' + PORT);
  }
  console.log('✓ Next.js server is live on port ' + PORT);

  try {
    // 6.1 Smoke test GET /site-bot/audit
    console.log('Testing GET /site-bot/audit...');
    const auditRes = await fetch(`${BASE_URL}/site-bot/audit`);
    assert.equal(auditRes.status, 200, 'GET /site-bot/audit should return 200');
    console.log('✓ Landing page route /site-bot/audit returned HTTP 200.');

    // 6.2 Test GET /api/site-bot/audit-result (single candidate -> ready)
    console.log('Testing GET /api/site-bot/audit-result for single candidate...');
    const resultRes = await fetch(`${BASE_URL}/api/site-bot/audit-result?auditId=${fixtureAuditId}`);
    assert.equal(resultRes.status, 200, 'audit-result endpoint should return 200');
    const resultJson = await resultRes.json();
    assert.equal(resultJson.status, 'ready');
    assert.equal(resultJson.businessName, 'אינסטלטור משה ובניו');
    assert.equal(resultJson.score.passed, 2);
    assert.equal(resultJson.score.total, 6);
    console.log('✓ API returns ready status and 6-dimension score.');

    // 6.3 Test GET /api/site-bot/audit-result with withPlace=1 for onboarding prefill
    console.log('Testing GET /api/site-bot/audit-result with withPlace=1...');
    const prefillRes = await fetch(`${BASE_URL}/api/site-bot/audit-result?auditId=${fixtureAuditId}&withPlace=1`);
    assert.equal(prefillRes.status, 200);
    const prefillJson = await prefillRes.json();
    assert(prefillJson.place, 'withPlace=1 should return normalized place');
    assert.equal(prefillJson.place.displayName, 'אינסטלטור משה ובניו');
    console.log('✓ API returns place data for onboarding prefill.');

    // 6.4 Test GET /api/site-bot/audit-result (multi-candidate -> pick)
    console.log('Testing GET /api/site-bot/audit-result for multiple candidates...');
    const multiRes = await fetch(`${BASE_URL}/api/site-bot/audit-result?auditId=${multiAuditId}`);
    assert.equal(multiRes.status, 200);
    const multiJson = await multiRes.json();
    assert.equal(multiJson.status, 'pick');
    assert.equal(multiJson.candidates.length, 2);
    assert.equal(multiJson.candidates[0].placeId, 'cand-1');
    console.log('✓ API returns pick status for multiple candidates.');

    // 6.5 Test candidate selection via placeId param
    console.log('Testing GET /api/site-bot/audit-result with selected placeId...');
    const pickedRes = await fetch(`${BASE_URL}/api/site-bot/audit-result?auditId=${multiAuditId}&placeId=cand-1`);
    assert.equal(pickedRes.status, 200);
    const pickedJson = await pickedRes.json();
    assert.equal(pickedJson.status, 'ready');
    assert.equal(pickedJson.businessName, 'מוסך דוד תל אביב');
    console.log('✓ API returns ready status when candidate is picked.');

    // 6.6 Test GET /site-bot/start?auditId=...
    console.log('Testing GET /site-bot/start?auditId=...');
    const startRes = await fetch(`${BASE_URL}/site-bot/start?auditId=${fixtureAuditId}`);
    assert.equal(startRes.status, 200, 'GET /site-bot/start should return 200');
    console.log('✓ /site-bot/start route is reachable with auditId.');

  } finally {
    killServer();
    console.log('✓ Test server shut down cleanly.');
  }
}

await runLiveServerSmokeTests();

console.log('\n--- All Smoke Test Checks Passed Successfully! ---');
