import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveGoogleAdsMutationAccess } from './access-policy.js';

const COMPLETE = {
  accountCreatedWithClientAdmin: true,
  clientAdminInviteAccepted: true,
  billingApproved: true,
  verificationStatus: 'not-required',
  feePaid: true,
  termsConsent: { termsVersion: 'v1', consentedAt: '2026-11-22T10:00:00.000Z' },
  approvalContactConfirmed: true,
};
const PRE_ACCOUNT = {
  feePaid: true,
  termsConsent: { termsVersion: 'v1', consentedAt: '2026-11-22T10:00:00.000Z' },
  approvalContactConfirmed: true,
};

const live = (overrides = {}) => resolveGoogleAdsMutationAccess({
  sessionClientId: 'pilot-client',
  requestedClientId: 'pilot-client',
  mode: 'live',
  sandboxClientId: 'google-ads-sandbox',
  liveModeEnabled: true,
  ...overrides,
});

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

test('flag off: live mutations are rejected exactly as before, whatever the readiness or admin state', () => {
  for (const extra of [{}, { liveReadinessRecord: COMPLETE }, { liveReadinessRecord: COMPLETE, requireAdminForLive: true, isAdmin: true }]) {
    assert.deepEqual(live({ liveModeEnabled: false, ...extra }), {
      allowed: false,
      status: 403,
      error: 'Live Google Ads mutations are disabled during sandbox validation.',
    });
  }
});

test('no session is still 401 before anything else', () => {
  assert.equal(live({ sessionClientId: null, liveReadinessRecord: COMPLETE }).status, 401);
});

test('flag on: a missing readiness record fails closed', () => {
  for (const liveReadinessRecord of [undefined, null, {}]) {
    const result = live({ liveReadinessRecord });
    assert.equal(result.allowed, false);
    assert.equal(result.status, 403);
    assert.equal(result.code, 'live_readiness_incomplete');
    assert.equal(result.missing.length, 7);
  }
});

test('flag on: full stage needs every key; pre-account keys alone are not enough', () => {
  const result = live({ liveReadinessRecord: PRE_ACCOUNT });
  assert.equal(result.code, 'live_readiness_incomplete');
  assert.deepEqual(result.missing, ['accountCreatedWithClientAdmin', 'clientAdminInviteAccepted', 'billingApproved', 'verificationStatus']);
  assert.deepEqual(live({ liveReadinessRecord: COMPLETE }), { allowed: true });
});

test('flag on: pre-account stage (live create-campaign) needs only fee, consent and approval contact', () => {
  assert.deepEqual(live({ liveReadinessRecord: PRE_ACCOUNT, liveReadinessStage: 'pre-account', requireAdminForLive: true, isAdmin: true }), { allowed: true });
  const noFee = live({ liveReadinessRecord: { ...PRE_ACCOUNT, feePaid: false }, liveReadinessStage: 'pre-account', requireAdminForLive: true, isAdmin: true });
  assert.deepEqual(noFee.missing, ['feePaid']);
});

test('flag on: requireAdminForLive rejects a non-admin before readiness is considered', () => {
  for (const isAdmin of [false, undefined, 'true']) {
    const result = live({ liveReadinessRecord: COMPLETE, liveReadinessStage: 'pre-account', requireAdminForLive: true, isAdmin });
    assert.equal(result.status, 403);
    assert.equal(result.code, 'live_admin_required');
  }
});

test('test mode never consults readiness or admin', () => {
  const result = resolveGoogleAdsMutationAccess({
    sessionClientId: 'google-ads-sandbox',
    requestedClientId: 'google-ads-sandbox',
    mode: 'test',
    sandboxClientId: 'google-ads-sandbox',
    liveModeEnabled: true,
    liveReadinessRecord: undefined,
    requireAdminForLive: true,
    isAdmin: false,
  });
  assert.deepEqual(result, { allowed: true });
});

test('admin on behalf: live + flag on + requireAdminForLive + admin may act without a session', () => {
  for (const sessionClientId of [null, 'someone-else']) {
    assert.deepEqual(
      live({ sessionClientId, liveReadinessRecord: PRE_ACCOUNT, liveReadinessStage: 'pre-account', requireAdminForLive: true, isAdmin: true }),
      { allowed: true, actingAsAdmin: true },
    );
  }
  // Matching session + admin is an ordinary session call, not "on behalf".
  assert.deepEqual(live({ liveReadinessRecord: PRE_ACCOUNT, liveReadinessStage: 'pre-account', requireAdminForLive: true, isAdmin: true }), { allowed: true });
});

test('admin on behalf never applies off the create-campaign path, with the flag off, or without admin', () => {
  assert.equal(live({ sessionClientId: null, liveReadinessRecord: COMPLETE, isAdmin: true }).status, 401);
  assert.equal(live({ sessionClientId: null, liveReadinessRecord: COMPLETE, requireAdminForLive: true, isAdmin: false }).status, 401);
  assert.equal(live({ sessionClientId: null, liveModeEnabled: false, requireAdminForLive: true, isAdmin: true }).status, 401);
  assert.equal(live({ sessionClientId: null, requestedClientId: '', requireAdminForLive: true, isAdmin: true }).status, 401);
  assert.equal(live({ sessionClientId: null, mode: 'test', requireAdminForLive: true, isAdmin: true }).status, 401);
});

test("stage 'none' skips readiness (pause) but keeps the kill switch", () => {
  assert.deepEqual(live({ liveReadinessRecord: undefined, liveReadinessStage: 'none' }), { allowed: true });
  assert.equal(live({ liveModeEnabled: false, liveReadinessStage: 'none' }).status, 403);
});
