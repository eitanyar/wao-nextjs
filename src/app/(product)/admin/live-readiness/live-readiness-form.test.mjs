import assert from 'node:assert/strict';
import test   from 'node:test';
import { BOOLEAN_READINESS_KEYS, READINESS_KEYS, parseLiveReadinessSubmission } from './live-readiness-form.js';

function formData(fields) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

test('boolean keys are checkboxes; absent parses as false', () => {
  const result = parseLiveReadinessSubmission(formData({ clientId: 'test-plumber-tlv', feePaid: 'on' }));
  assert.equal(result.ok, true);
  assert.equal(result.patch.feePaid, true);
  for (const key of BOOLEAN_READINESS_KEYS.filter(k => k !== 'feePaid')) {
    assert.equal(result.patch[key], false, key);
  }
});

test('verificationStatus defaults to unknown and rejects unknown values', () => {
  assert.equal(parseLiveReadinessSubmission(formData({ clientId: 'c' })).patch.verificationStatus, 'unknown');
  assert.equal(parseLiveReadinessSubmission(formData({ clientId: 'c', verificationStatus: 'verified' })).patch.verificationStatus, 'verified');
  const bad = parseLiveReadinessSubmission(formData({ clientId: 'c', verificationStatus: 'approved' }));
  assert.deepEqual(bad, { ok: false, error: 'invalid-verification-status', clientId: 'c' });
});

test('terms consent: both fields -> normalized ISO record; neither -> null; one or bad date -> rejected', () => {
  const ok = parseLiveReadinessSubmission(formData({ clientId: 'c', termsConsentVersion: ' v1 ', termsConsentAt: '2026-11-22T12:00:00+02:00' }));
  assert.deepEqual(ok.patch.termsConsent, { termsVersion: 'v1', consentedAt: '2026-11-22T10:00:00.000Z' });
  assert.equal(parseLiveReadinessSubmission(formData({ clientId: 'c' })).patch.termsConsent, null);
  for (const fields of [{ termsConsentVersion: 'v1' }, { termsConsentAt: '2026-11-22T10:00:00Z' }, { termsConsentVersion: 'v1', termsConsentAt: 'soon' }]) {
    const result = parseLiveReadinessSubmission(formData({ clientId: 'c', ...fields }));
    assert.deepEqual(result, { ok: false, error: 'invalid-terms-consent', clientId: 'c' }, JSON.stringify(fields));
  }
});

test('rejects an invalid clientId (path-traversal / crafted input hardening)', () => {
  for (const badId of ['../../etc', 'client id with spaces', '', 'client/../x', 'client;rm -rf']) {
    const result = parseLiveReadinessSubmission(formData({ clientId: badId }));
    assert.equal(result.ok, false, `expected ${JSON.stringify(badId)} to be rejected`);
    assert.equal(result.error, 'invalid-client');
  }
});

test('ignores any field outside the readiness keys', () => {
  const fd = formData({ clientId: 'test-plumber-tlv', feePaid: 'on' });
  fd.set('GOOGLE_ADS_ENABLE_LIVE_MODE', 'true');
  fd.set('isAdmin', 'true');
  fd.set('clientAccountOwned', 'on');

  const result = parseLiveReadinessSubmission(fd);

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.patch).sort(), [...READINESS_KEYS].sort());
});

// ── mission item 4: polled keys survive an admin save ─────────────────────────────────────────────────────────
import { ADMIN_SAVE_KEYS, mergeReadinessPatch, parseAdminSaveSubmission } from './live-readiness-form.js';

test('the normal admin save carries only approvalContactConfirmed, whatever else is on the form', () => {
  assert.deepEqual(ADMIN_SAVE_KEYS, ['approvalContactConfirmed']);
  const fd = formData({ clientId: 'pilot', approvalContactConfirmed: 'on', billingApproved: 'on', feePaid: 'on', verificationStatus: 'verified' });
  assert.deepEqual(parseAdminSaveSubmission(fd), { ok: true, clientId: 'pilot', patch: { approvalContactConfirmed: true } });
  assert.deepEqual(parseAdminSaveSubmission(formData({ clientId: '../x' })), { ok: false, error: 'invalid-client' });
});

test('polled, billing and legacy keys survive an admin save byte for byte', () => {
  const existing = {
    accountCreatedWithClientAdmin: true,
    clientAdminInviteAccepted: true,
    billingApproved: true,
    verificationStatus: 'not-required',
    feePaid: true,
    termsConsent: { termsVersion: 'v1', consentedAt: '2026-11-22T10:00:00.000Z' },
    approvalContactConfirmed: false,
    clientAccountOwned: true,
  };
  const parsed = parseAdminSaveSubmission(formData({ clientId: 'pilot' }));
  const { next, changes } = mergeReadinessPatch(existing, { ...parsed.patch, approvalContactConfirmed: true }, ADMIN_SAVE_KEYS);
  assert.deepEqual(next, { ...existing, approvalContactConfirmed: true });
  assert.deepEqual(changes, [{ key: 'approvalContactConfirmed', from: false, to: true }]);
  // An unticked box on a plain save clears only the admin key.
  const cleared = mergeReadinessPatch(existing, parseAdminSaveSubmission(formData({ clientId: 'pilot' })).patch, ADMIN_SAVE_KEYS);
  assert.deepEqual(cleared.next, existing);
  assert.deepEqual(cleared.changes, []);
});
