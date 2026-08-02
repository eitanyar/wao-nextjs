import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
