import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const importConversionRoute = fs.readFileSync(path.join(apiDir, 'import-conversion', 'route.ts'), 'utf8');
const weeklyDigestRoute = fs.readFileSync(path.join(apiDir, 'weekly-digest', 'route.ts'), 'utf8');
// Priority 3 extracted the upload mechanics (incl. GOOGLE_ADS_TEST_MCC_CUSTOMER_ID
// account resolution) out of this route into a pure, in-process-callable
// function — see docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md
// §1.2/§2.2/§3.3. The session/ownership gate below stays in the route, unchanged.
const conversionUploadLib = fs.readFileSync(
  path.join(apiDir, '..', '..', '..', 'lib', 'google-ads', 'conversion-upload.ts'),
  'utf8'
);
const sandboxVerifyRoute = fs.readFileSync(path.join(apiDir, 'sandbox-verify', 'route.ts'), 'utf8');
const dataManagerLib = fs.readFileSync(
  path.join(apiDir, '..', '..', '..', 'lib', 'google-ads', 'data-manager-events.js'), 'utf8'
);

function functionBody(source, name) {
  const declaration = source.indexOf(`function ${name}(`);
  assert.ok(declaration >= 0, `${name} must exist`);
  const end = source.indexOf('\n}', declaration);
  assert.ok(end > declaration, `${name} must close`);
  return source.slice(declaration, end + 2);
}

function evaluateResolver(source, name, env) {
  const code = ts.transpileModule(`${functionBody(source, name)}\n${name};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return vm.runInNewContext(code, { process: { env }, Error });
}

test('private sandbox and upload resolvers reject each missing test field with live values present', () => {
  for (const [source, name] of [
    [sandboxVerifyRoute, 'getTestAccountCredentials'],
    [conversionUploadLib, 'resolveAdsAccount'],
  ]) {
    for (const [testToken, testMcc] of [
      [undefined, undefined], [undefined, '111-222-3333'], ['', '111-222-3333'],
      ['   ', '111-222-3333'], ['synthetic-test-token', undefined],
      ['synthetic-test-token', ''], ['synthetic-test-token', '   '],
    ]) {
      const env = {
        GOOGLE_ADS_REFRESH_TOKEN: 'synthetic-live-token',
        GOOGLE_ADS_MCC_CUSTOMER_ID: '999-888-7777',
        GOOGLE_ADS_TEST_REFRESH_TOKEN: testToken,
        GOOGLE_ADS_TEST_MCC_CUSTOMER_ID: testMcc,
      };
      const resolve = evaluateResolver(source, name, env);
      assert.throws(() => name === 'resolveAdsAccount' ? resolve('test') : resolve(), /Test mode requires/);
    }
    const env = {
      GOOGLE_ADS_REFRESH_TOKEN: 'synthetic-live-token',
      GOOGLE_ADS_MCC_CUSTOMER_ID: '999-888-7777',
      GOOGLE_ADS_TEST_REFRESH_TOKEN: 'synthetic-test-token',
      GOOGLE_ADS_TEST_MCC_CUSTOMER_ID: '111-222-3333',
    };
    const resolve = evaluateResolver(source, name, env);
    const account = name === 'resolveAdsAccount' ? resolve('test') : resolve();
    assert.equal(account.refreshToken, 'synthetic-test-token');
    assert.equal(name === 'resolveAdsAccount' ? account.mccId : account.mccCustomerId, '1112223333');
    if (name === 'resolveAdsAccount') {
      const live = resolve('live');
      assert.equal(live.refreshToken, 'synthetic-live-token');
      assert.equal(live.mccId, '9998887777');
    }
  }
});

test('synthetic conversion upload stops before OAuth and ingest for missing test MCC or Data Manager token', async () => {
  const env = {
    GOOGLE_ADS_REFRESH_TOKEN: 'synthetic-live-token',
    GOOGLE_ADS_MCC_CUSTOMER_ID: '999-888-7777',
    GOOGLE_ADS_TEST_REFRESH_TOKEN: 'synthetic-test-token',
    GOOGLE_DATAMANAGER_REFRESH_TOKEN: 'synthetic-live-dm-token',
  };
  const sandbox = {
    Error,
    process: { env },
    readLeads: async () => [],
    findLeadById: () => ({ id: 1, slug: 'synthetic-only', gclid: 'synthetic-click', date: '2026-01-01' }),
    loadCampaignConfigBySlug: () => ({
      mode: 'test', customerId: '1234567890', verifiedLeadConversionResourceName: 'customers/1234567890/conversionActions/11',
      avgJobValue: 100, closeRateEstimate: 0.5,
    }),
    toEventTimestamp: () => '2026-01-01T00:00:00+03:00',
    parseConversionActionId: () => '11',
    getDataManagerAccessToken: () => assert.fail('unexpected OAuth call'),
    sendConversionEvent: () => assert.fail('unexpected ingest call'),
    fetch: () => assert.fail('unexpected network call'),
    console: { error: () => {} },
  };
  sandbox.resolveAdsAccount = evaluateResolver(conversionUploadLib, 'resolveAdsAccount', env);
  sandbox.resolveDataManagerRefreshToken = evaluateResolver(dataManagerLib, 'resolveDataManagerRefreshToken', env);
  const code = ts.transpileModule(`async ${functionBody(conversionUploadLib, 'uploadLeadConversion')}\nuploadLeadConversion;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const upload = vm.runInNewContext(code, sandbox);
  const deps = {
    readLeadsImpl: sandbox.readLeads,
    findLeadByIdImpl: sandbox.findLeadById,
    loadCampaignConfigBySlugImpl: sandbox.loadCampaignConfigBySlug,
    fetchImpl: sandbox.fetch,
  };
  const missingMcc = await upload({ leadId: 1, type: 'verified-lead' }, deps);
  assert.equal(missingMcc.success, false);
  assert.equal(missingMcc.status, 500);
  assert.match(missingMcc.error, /Test mode requires/);

  env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID = '111-222-3333';
  const missingDmToken = await upload({ leadId: 1, type: 'verified-lead' }, deps);
  assert.equal(missingDmToken.success, false);
  assert.equal(missingDmToken.status, 500);
  assert.equal(missingDmToken.error, 'Data Manager refresh token not configured for this mode');
});

test('sandbox verification resolves only the dedicated test pair before constructing an Ads client or querying', () => {
  const resolver = functionBody(sandboxVerifyRoute, 'getTestAccountCredentials');
  assert.match(resolver, /process\.env\.GOOGLE_ADS_TEST_REFRESH_TOKEN/);
  assert.match(resolver, /process\.env\.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID/);
  assert.match(resolver, /if \(!refreshToken\?\.trim\(\) \|\| !mccCustomerId\?\.trim\(\)\) \{\s*throw new Error/);
  assert.doesNotMatch(resolver, /process\.env\.GOOGLE_ADS_REFRESH_TOKEN\b|process\.env\.GOOGLE_ADS_MCC_CUSTOMER_ID\b/);
  const credentialCall = sandboxVerifyRoute.indexOf('getTestAccountCredentials();', sandboxVerifyRoute.indexOf('export async function GET'));
  const clientCall = sandboxVerifyRoute.indexOf('buildGoogleAdsClient();', credentialCall);
  const customerCall = sandboxVerifyRoute.indexOf('client.Customer(', clientCall);
  const queryCall = sandboxVerifyRoute.indexOf('customer.query(', customerCall);
  assert.ok(credentialCall >= 0 && credentialCall < clientCall && clientCall < customerCall && customerCall < queryCall);
});

test('conversion upload resolves only the dedicated Ads test pair before OAuth or ingest', () => {
  const resolver = functionBody(conversionUploadLib, 'resolveAdsAccount');
  const testBranch = resolver.slice(resolver.indexOf("if (mode === 'test')"), resolver.indexOf('\n  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;'));
  assert.match(testBranch, /process\.env\.GOOGLE_ADS_TEST_REFRESH_TOKEN/);
  assert.match(testBranch, /process\.env\.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID/);
  assert.match(testBranch, /if \(!refreshToken\?\.trim\(\) \|\| !mccId\?\.trim\(\)\) throw new Error/);
  assert.doesNotMatch(testBranch, /process\.env\.GOOGLE_ADS_REFRESH_TOKEN\b|process\.env\.GOOGLE_ADS_MCC_CUSTOMER_ID\b/);
  assert.match(resolver, /process\.env\.GOOGLE_ADS_REFRESH_TOKEN/);
  assert.match(resolver, /process\.env\.GOOGLE_ADS_MCC_CUSTOMER_ID/);
  const adsResolution = conversionUploadLib.indexOf('resolveAdsAccount(mode);', conversionUploadLib.indexOf('export async function uploadLeadConversion'));
  const dmResolution = conversionUploadLib.indexOf('resolveDataManagerRefreshToken(mode);', adsResolution);
  const missingTokenGuard = conversionUploadLib.indexOf('if (!refreshToken?.trim())', dmResolution);
  const oauthCall = conversionUploadLib.indexOf('getDataManagerAccessToken(refreshToken, fetchImpl)', missingTokenGuard);
  const ingestCall = conversionUploadLib.indexOf('sendConversionEvent({', oauthCall);
  assert.ok(adsResolution >= 0 && adsResolution < dmResolution && dmResolution < missingTokenGuard
    && missingTokenGuard < oauthCall && oauthCall < ingestCall);
});

test('guards conversion imports with the authenticated campaign client and execution mode', () => {
  assert.match(importConversionRoute, /verifySessionToken/);
  assert.match(importConversionRoute, /resolveGoogleAdsMutationAccess/);
  assert.match(importConversionRoute, /config\.clientId !== sessionClientId/);
  assert.match(importConversionRoute, /uploadLeadConversion/);
  assert.match(conversionUploadLib, /GOOGLE_ADS_TEST_MCC_CUSTOMER_ID/);
});

test('scopes weekly digests to the authenticated client binding', () => {
  assert.match(weeklyDigestRoute, /verifySessionToken/);
  assert.match(weeklyDigestRoute, /clientId && clientId !== sessionClientId/);
  assert.match(weeklyDigestRoute, /loadClientGoogleAdsIndex\(sessionClientId\)/);
});
