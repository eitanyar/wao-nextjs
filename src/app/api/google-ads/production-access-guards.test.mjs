import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const importConversionRoute = fs.readFileSync(path.join(apiDir, 'import-conversion', 'route.ts'), 'utf8');
const weeklyDigestRoute = fs.readFileSync(path.join(apiDir, 'weekly-digest', 'route.ts'), 'utf8');

test('guards conversion imports with the authenticated campaign client and execution mode', () => {
  assert.match(importConversionRoute, /verifySessionToken/);
  assert.match(importConversionRoute, /resolveGoogleAdsMutationAccess/);
  assert.match(importConversionRoute, /config\.clientId !== sessionClientId/);
  assert.match(importConversionRoute, /GOOGLE_ADS_TEST_MCC_CUSTOMER_ID/);
});

test('scopes weekly digests to the authenticated client binding', () => {
  assert.match(weeklyDigestRoute, /verifySessionToken/);
  assert.match(weeklyDigestRoute, /clientId && clientId !== sessionClientId/);
  assert.match(weeklyDigestRoute, /loadClientGoogleAdsIndex\(sessionClientId\)/);
});
