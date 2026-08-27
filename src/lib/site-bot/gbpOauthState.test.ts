import test from 'node:test';
import assert from 'node:assert/strict';
import { signGbpOAuthState, verifyGbpOAuthState } from './gbpOauthState';

const TEST_AUDIT_ID = '12345678-1234-4234-8234-123456789abc';
const TEST_SECRET = 'test-secret-for-gbp-oauth-state-signing';

test('signGbpOAuthState creates a valid state verifiable by verifyGbpOAuthState', () => {
  const state = signGbpOAuthState(TEST_AUDIT_ID, TEST_SECRET);
  assert.ok(state);
  assert.equal(typeof state, 'string');

  const parts = state.split(':');
  assert.equal(parts.length, 3);
  assert.equal(parts[0], TEST_AUDIT_ID);

  const verification = verifyGbpOAuthState(state, TEST_SECRET);
  assert.equal(verification.valid, true);
  assert.equal(verification.auditId, TEST_AUDIT_ID);
});

test('verifyGbpOAuthState rejects expired state token', () => {
  // Construct an expired state
  const expiredTime = Date.now() - 1000;
  const payload = `${TEST_AUDIT_ID}:${expiredTime}`;
  const crypto = require('crypto');
  const sig = crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');
  const expiredState = `${payload}:${sig}`;

  const verification = verifyGbpOAuthState(expiredState, TEST_SECRET);
  assert.equal(verification.valid, false);
  assert.equal(verification.auditId, undefined);
});

test('verifyGbpOAuthState rejects tampered signature or payload', () => {
  const validState = signGbpOAuthState(TEST_AUDIT_ID, TEST_SECRET);
  const parts = validState.split(':');

  // Tamper with auditId
  const tamperedAuditId = '87654321-4321-4321-8321-cba987654321';
  const tamperedState1 = `${tamperedAuditId}:${parts[1]}:${parts[2]}`;
  assert.equal(verifyGbpOAuthState(tamperedState1, TEST_SECRET).valid, false);

  // Tamper with timestamp
  const tamperedTimestamp = String(Number(parts[1]) + 100);
  const tamperedState2 = `${parts[0]}:${tamperedTimestamp}:${parts[2]}`;
  assert.equal(verifyGbpOAuthState(tamperedState2, TEST_SECRET).valid, false);

  // Tamper with signature
  const tamperedSig = parts[2].slice(0, -2) + '00';
  const tamperedState3 = `${parts[0]}:${parts[1]}:${tamperedSig}`;
  assert.equal(verifyGbpOAuthState(tamperedState3, TEST_SECRET).valid, false);

  // Wrong secret
  assert.equal(verifyGbpOAuthState(validState, 'different-secret').valid, false);
});

test('verifyGbpOAuthState rejects invalid formats and non-UUID auditIds', () => {
  assert.equal(verifyGbpOAuthState('').valid, false);
  assert.equal(verifyGbpOAuthState('malformed').valid, false);
  assert.equal(verifyGbpOAuthState('part1:part2').valid, false);
  assert.equal(verifyGbpOAuthState('part1:part2:part3:part4').valid, false);
  assert.equal(verifyGbpOAuthState('not-a-uuid:123456789:signature', TEST_SECRET).valid, false);
});
