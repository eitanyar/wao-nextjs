import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveGoogleAdsMutationAccess } from './access-policy.js';

test('allows only the authenticated sandbox client to use test mode', () => {
  const result = resolveGoogleAdsMutationAccess({
    sessionClientId: 'google-ads-sandbox',
    requestedClientId: 'google-ads-sandbox',
    mode: 'test',
    sandboxClientId: 'google-ads-sandbox',
    liveModeEnabled: false,
  });

  assert.deepEqual(result, { allowed: true });
});

test('rejects a client ID that does not match the authenticated session', () => {
  const result = resolveGoogleAdsMutationAccess({
    sessionClientId: 'google-ads-sandbox',
    requestedClientId: 'another-client',
    mode: 'test',
    sandboxClientId: 'google-ads-sandbox',
    liveModeEnabled: false,
  });

  assert.deepEqual(result, {
    allowed: false,
    status: 403,
    error: 'You can only mutate the Google Ads account linked to your session.',
  });
});

test('rejects live mutations until live mode is explicitly enabled', () => {
  const result = resolveGoogleAdsMutationAccess({
    sessionClientId: 'google-ads-sandbox',
    requestedClientId: 'google-ads-sandbox',
    mode: 'live',
    sandboxClientId: 'google-ads-sandbox',
    liveModeEnabled: false,
  });

  assert.deepEqual(result, {
    allowed: false,
    status: 403,
    error: 'Live Google Ads mutations are disabled during sandbox validation.',
  });
});
