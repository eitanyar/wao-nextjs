import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  ensureSiteBotClientRecord,
  getClientRecord,
  setClientGscConnected,
  clientRecordExists,
  checkGeoUpgradeEligibility,
  type GeoClientRecord,
} from './client';

// Test-hygiene note: CLIENTS_DIR in client.ts resolves via
// `path.join(process.cwd(), 'data', 'clients')` with no env/param seam to
// redirect it to a temp directory. Rather than force a seam into existence
// for this task, this suite operates against a throwaway, self-cleaning
// clientId under the REAL data/clients dir. Cleanup is unconditional
// (try/finally, and swept once more up front in case a prior run crashed
// mid-test) so no synthetic data ever lingers as stray client data.
const TEST_CLIENT_ID = '__test-sitebot-bridge__';
const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');
const TEST_CLIENT_DIR = path.join(CLIENTS_DIR, TEST_CLIENT_ID);

function cleanup() {
  fs.rmSync(TEST_CLIENT_DIR, { recursive: true, force: true });
}

test('ensureSiteBotClientRecord: idempotent — redeploy does not clobber first record', () => {
  cleanup(); // sweep any stray leftovers from a prior crashed run
  try {
    assert.equal(clientRecordExists(TEST_CLIENT_ID), false);

    ensureSiteBotClientRecord({
      clientId: TEST_CLIENT_ID,
      siteUrl: `https://${TEST_CLIENT_ID}.wao.co.il`,
      businessNiche: 'אינסטלציה',
      topService: 'תיקון דוד',
      targetLocation: 'תל אביב',
      usp: 'שירות מהיר',
      approvalContact: 'בעל העסק',
      approvalWhatsapp: '0500000000',
    });

    assert.equal(clientRecordExists(TEST_CLIENT_ID), true);
    const first = getClientRecord(TEST_CLIENT_ID);
    assert.ok(first);
    assert.equal(first!.clientId, TEST_CLIENT_ID);
    assert.equal(first!.businessNiche, 'אינסטלציה');
    assert.equal(first!.usp, 'שירות מהיר');
    assert.deepEqual(first!.entitlements, []); // not ['geo'] — that's a later upgrade
    assert.equal(first!.wpConnected, false);
    assert.equal(first!.platform, null);
    assert.equal(first!.gscConnected, false);
    assert.ok(first!.pin && /^\d{4}$/.test(first!.pin));
    assert.ok(first!.siteBotLaunchedAt);
    const firstLaunchedAt = first!.siteBotLaunchedAt;

    // Redeploy: call again with different values — must be a total no-op.
    ensureSiteBotClientRecord({
      clientId: TEST_CLIENT_ID,
      siteUrl: `https://${TEST_CLIENT_ID}.wao.co.il`,
      businessNiche: 'DIFFERENT-NICHE-SHOULD-NOT-APPLY',
      usp: 'DIFFERENT-USP-SHOULD-NOT-APPLY',
    });

    const second = getClientRecord(TEST_CLIENT_ID);
    assert.ok(second);
    assert.equal(second!.businessNiche, 'אינסטלציה'); // unchanged
    assert.equal(second!.usp, 'שירות מהיר'); // unchanged
    assert.equal(second!.siteBotLaunchedAt, firstLaunchedAt); // clock not reset
    assert.equal(second!.pin, first!.pin); // pin not re-issued
  } finally {
    cleanup();
  }
});

test('setClientGscConnected: stamps gscConnectedAt once, never overwrites on repeat/disconnect', () => {
  cleanup();
  try {
    ensureSiteBotClientRecord({
      clientId: TEST_CLIENT_ID,
      siteUrl: `https://${TEST_CLIENT_ID}.wao.co.il`,
      businessNiche: 'אינסטלציה',
    });

    const before = getClientRecord(TEST_CLIENT_ID);
    assert.equal(before!.gscConnectedAt, undefined);

    setClientGscConnected(TEST_CLIENT_ID, true);
    const afterFirstConnect = getClientRecord(TEST_CLIENT_ID);
    assert.equal(afterFirstConnect!.gscConnected, true);
    assert.ok(afterFirstConnect!.gscConnectedAt);
    const stampedAt = afterFirstConnect!.gscConnectedAt;

    // Disconnect — boolean flips, timestamp marker must NOT be cleared.
    setClientGscConnected(TEST_CLIENT_ID, false);
    const afterDisconnect = getClientRecord(TEST_CLIENT_ID);
    assert.equal(afterDisconnect!.gscConnected, false);
    assert.equal(afterDisconnect!.gscConnectedAt, stampedAt);

    // Reconnect — timestamp marker must NOT be re-stamped (stays the true
    // "first connected" clock start).
    setClientGscConnected(TEST_CLIENT_ID, true);
    const afterReconnect = getClientRecord(TEST_CLIENT_ID);
    assert.equal(afterReconnect!.gscConnected, true);
    assert.equal(afterReconnect!.gscConnectedAt, stampedAt);
  } finally {
    cleanup();
  }
});

// checkGeoUpgradeEligibility is a pure function (record -> result, no I/O),
// so these tests construct GeoClientRecord objects in-memory and never touch
// disk. A distinct throwaway id from the suite above avoids any confusion
// with TEST_CLIENT_ID, even though nothing here is written to data/clients/.
const ELIGIBILITY_TEST_CLIENT_ID = '__test-geo-upgrade-eligibility__';

function daysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

test('checkGeoUpgradeEligibility: null record -> not eligible, no_record', () => {
  const result = checkGeoUpgradeEligibility(null, new Date());
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'no_record');
});

test('checkGeoUpgradeEligibility: gscConnected false -> not eligible, gsc_not_connected', () => {
  const now = new Date();
  const record: GeoClientRecord = {
    clientId: ELIGIBILITY_TEST_CLIENT_ID,
    siteUrl: `https://${ELIGIBILITY_TEST_CLIENT_ID}.wao.co.il`,
    gscConnected: false,
  };
  const result = checkGeoUpgradeEligibility(record, now);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'gsc_not_connected');
});

test('checkGeoUpgradeEligibility: entitlements undefined does not throw, proceeds to days check', () => {
  const now = new Date();
  const record: GeoClientRecord = {
    clientId: ELIGIBILITY_TEST_CLIENT_ID,
    siteUrl: `https://${ELIGIBILITY_TEST_CLIENT_ID}.wao.co.il`,
    gscConnected: true,
    gscConnectedAt: daysAgo(now, 91),
    entitlements: undefined,
  };
  assert.doesNotThrow(() => checkGeoUpgradeEligibility(record, now));
  const result = checkGeoUpgradeEligibility(record, now);
  assert.equal(result.eligible, true);
});

test('checkGeoUpgradeEligibility: 10 days connected -> not eligible, too_recent', () => {
  const now = new Date();
  const record: GeoClientRecord = {
    clientId: ELIGIBILITY_TEST_CLIENT_ID,
    siteUrl: `https://${ELIGIBILITY_TEST_CLIENT_ID}.wao.co.il`,
    gscConnected: true,
    gscConnectedAt: daysAgo(now, 10),
  };
  const result = checkGeoUpgradeEligibility(record, now);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'too_recent');
});

test('checkGeoUpgradeEligibility: exactly 90 days -> eligible (inclusive boundary)', () => {
  const now = new Date();
  const record: GeoClientRecord = {
    clientId: ELIGIBILITY_TEST_CLIENT_ID,
    siteUrl: `https://${ELIGIBILITY_TEST_CLIENT_ID}.wao.co.il`,
    gscConnected: true,
    gscConnectedAt: daysAgo(now, 90),
  };
  const result = checkGeoUpgradeEligibility(record, now);
  assert.equal(result.eligible, true);
  assert.equal(result.reason, undefined);
});

test('checkGeoUpgradeEligibility: 91 days but entitlements includes geo -> not eligible, already_entitled', () => {
  const now = new Date();
  const record: GeoClientRecord = {
    clientId: ELIGIBILITY_TEST_CLIENT_ID,
    siteUrl: `https://${ELIGIBILITY_TEST_CLIENT_ID}.wao.co.il`,
    gscConnected: true,
    gscConnectedAt: daysAgo(now, 91),
    entitlements: ['geo'],
  };
  const result = checkGeoUpgradeEligibility(record, now);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'already_entitled');
});

test('checkGeoUpgradeEligibility: 91 days but entitlements includes geo:internal -> not eligible, already_entitled', () => {
  const now = new Date();
  const record: GeoClientRecord = {
    clientId: ELIGIBILITY_TEST_CLIENT_ID,
    siteUrl: `https://${ELIGIBILITY_TEST_CLIENT_ID}.wao.co.il`,
    gscConnected: true,
    gscConnectedAt: daysAgo(now, 91),
    entitlements: ['geo:internal'],
  };
  const result = checkGeoUpgradeEligibility(record, now);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'already_entitled');
});

test('checkGeoUpgradeEligibility: 91 days, empty entitlements -> eligible', () => {
  const now = new Date();
  const record: GeoClientRecord = {
    clientId: ELIGIBILITY_TEST_CLIENT_ID,
    siteUrl: `https://${ELIGIBILITY_TEST_CLIENT_ID}.wao.co.il`,
    gscConnected: true,
    gscConnectedAt: daysAgo(now, 91),
    entitlements: [],
  };
  const result = checkGeoUpgradeEligibility(record, now);
  assert.equal(result.eligible, true);
  assert.equal(result.reason, undefined);
});
