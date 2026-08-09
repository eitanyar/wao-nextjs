import assert from 'node:assert/strict';
import test   from 'node:test';
import { READINESS_KEYS, parseLiveReadinessSubmission } from './live-readiness-form.js';

function formData(fields) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

test('rejects liveConsentRecorded=true with an empty evidence note (spec §1.3)', () => {
  const result = parseLiveReadinessSubmission(formData({
    clientId: 'test-plumber-tlv',
    liveConsentRecorded: 'on',
    liveConsentEvidence: '   ',
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error, 'missing-consent-evidence');
});

test('rejects liveConsentRecorded=true when the evidence note is entirely absent', () => {
  const result = parseLiveReadinessSubmission(formData({
    clientId: 'test-plumber-tlv',
    liveConsentRecorded: 'on',
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error, 'missing-consent-evidence');
});

test('accepts liveConsentRecorded=true with a non-empty evidence note', () => {
  const result = parseLiveReadinessSubmission(formData({
    clientId: 'test-plumber-tlv',
    liveConsentRecorded: 'on',
    liveConsentEvidence: 'Owner Dana signed onboarding consent form 2026-07-20',
  }));

  assert.equal(result.ok, true);
  assert.equal(result.clientId, 'test-plumber-tlv');
  assert.equal(result.patch.liveConsentRecorded, true);
  assert.equal(result.evidenceNote, 'Owner Dana signed onboarding consent form 2026-07-20');
});

test('the other five fields are plain toggles that never require an evidence note', () => {
  const result = parseLiveReadinessSubmission(formData({
    clientId: 'test-plumber-tlv',
    clientAccountOwned: 'on',
    clientBillingAccepted: 'on',
    mccInvitationAccepted: 'on',
    approvalContactConfirmed: 'on',
    auditLogEnabled: 'on',
  }));

  assert.equal(result.ok, true);
  assert.equal(result.patch.clientAccountOwned, true);
  assert.equal(result.patch.clientBillingAccepted, true);
  assert.equal(result.patch.mccInvitationAccepted, true);
  assert.equal(result.patch.approvalContactConfirmed, true);
  assert.equal(result.patch.auditLogEnabled, true);
  assert.equal(result.patch.liveConsentRecorded, false);
});

test('rejects an invalid clientId (path-traversal / crafted input hardening, spec §1.4)', () => {
  for (const badId of ['../../etc', 'client id with spaces', '', 'client/../x', 'client;rm -rf']) {
    const result = parseLiveReadinessSubmission(formData({ clientId: badId }));
    assert.equal(result.ok, false, `expected ${JSON.stringify(badId)} to be rejected`);
    assert.equal(result.error, 'invalid-client');
  }
});

test('accepts a well-formed clientId', () => {
  const result = parseLiveReadinessSubmission(formData({ clientId: 'Test-Plumber-TLV-2' }));
  assert.equal(result.ok, true);
});

test('ignores any field outside the six known keys (spec §1.4)', () => {
  const fd = formData({
    clientId: 'test-plumber-tlv',
    clientAccountOwned: 'on',
  });
  fd.set('GOOGLE_ADS_ENABLE_LIVE_MODE', 'true');
  fd.set('isAdmin', 'true');
  fd.set('role', 'admin');

  const result = parseLiveReadinessSubmission(fd);

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.patch).sort(), [...READINESS_KEYS].sort());
});

test('an unchecked box (absent from the form) parses as false, not true', () => {
  const result = parseLiveReadinessSubmission(formData({ clientId: 'test-plumber-tlv' }));

  assert.equal(result.ok, true);
  for (const key of READINESS_KEYS) {
    assert.equal(result.patch[key], false, `expected ${key} to default to false`);
  }
});

test('READINESS_KEYS exposes exactly the six keys assessLiveReadiness() reads', () => {
  assert.deepEqual(READINESS_KEYS, [
    'clientAccountOwned',
    'clientBillingAccepted',
    'mccInvitationAccepted',
    'approvalContactConfirmed',
    'liveConsentRecorded',
    'auditLogEnabled',
  ]);
});
