import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Loaded lazily so the first test can prove that importing the module creates nothing.
type StoreModule = typeof import('./store');
const load = (): Promise<StoreModule> => import('./store');

const NOW = new Date('2027-01-07T20:00:00Z'); // Thursday 22:00 Israel
const PHONE = '+972501234567';
const CONSENT = { phone: PHONE, consentVersion: 'v-test-1', consentText: 'consent text shown (test fixture)', sourcePath: '/google-ads/onboarding' };

async function withStore(run: (m: StoreModule, store: ReturnType<StoreModule['openNurtureStore']>, dir: string) => Promise<void> | void) {
  const m = await load();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-nurture-'));
  const store = m.openNurtureStore(path.join(dir, 'nurture.sqlite'), () => NOW);
  try { await run(m, store, dir); } finally { store.db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

test('B1 store: importing the module creates no file, even with NURTURE_DB_PATH set', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-nurture-import-'));
  const dbPath = path.join(dir, 'nurture.sqlite');
  const previous = process.env.NURTURE_DB_PATH;
  process.env.NURTURE_DB_PATH = dbPath;
  try {
    const m = await load();
    assert.equal(fs.existsSync(dbPath), false);
    assert.equal(m.nurtureDbPathFromEnv(), dbPath);
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally {
    if (previous === undefined) delete process.env.NURTURE_DB_PATH; else process.env.NURTURE_DB_PATH = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('B1 store: refuses a path inside the repo, inside data/clients, relative paths and :memory:', async () => {
  const m = await load();
  assert.throws(() => m.openNurtureStore(path.join(process.cwd(), 'nurture-test.sqlite')), /external_db_required/);
  assert.equal(fs.existsSync(path.join(process.cwd(), 'nurture-test.sqlite')), false);
  assert.throws(() => m.openNurtureStore(path.join(process.cwd(), 'src', 'nurture-test.sqlite')), /external_db_required/);
  assert.throws(() => m.openNurtureStore('nurture.sqlite'), /explicit_external_db_required/);
  assert.throws(() => m.openNurtureStore(':memory:'), /explicit_external_db_required/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-nurture-clients-'));
  try {
    fs.mkdirSync(path.join(dir, 'data', 'clients'), { recursive: true });
    assert.throws(() => m.openNurtureStore(path.join(dir, 'data', 'clients', 'n.sqlite')), /external_db_required/);
    // A symlink from outside into the repo is followed and refused too.
    fs.symlinkSync(process.cwd(), path.join(dir, 'repo-link'));
    assert.throws(() => m.openNurtureStore(path.join(dir, 'repo-link', 'n.sqlite')), /external_db_required/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('B1 store: consent stores the proof row and schedules five sends from the first window', async () => {
  await withStore((m, store) => {
    const r = m.recordConsent(store, CONSENT);
    assert.deepEqual(r, { ok: true, contactId: 1, created: true });
    const c = m.getContactByPhone(store, PHONE)!;
    assert.equal(c.consentAt, NOW.toISOString());
    assert.equal(c.consentVersion, 'v-test-1');
    assert.equal(c.consentTextSha256, m.consentTextSha256(CONSENT.consentText));
    assert.match(c.consentTextSha256, /^[0-9a-f]{64}$/);
    assert.equal(c.sourcePath, '/google-ads/onboarding');
    assert.equal(c.state, 'active');
    const sends = m.listSends(store, 1);
    assert.deepEqual(sends.map((s) => [s.n, s.status, s.holdCount]), [[1, 'pending', 0], [2, 'pending', 0], [3, 'pending', 0], [4, 'pending', 0], [5, 'pending', 0]]);
    assert.equal(sends[0].dueAt, '2027-01-10T05:00:00.000Z', 'Thursday 22:00 consent → Sunday 07:00');
    // A repeat consent changes nothing.
    assert.deepEqual(m.recordConsent(store, { ...CONSENT, consentVersion: 'v2' }), { ok: true, contactId: 1, created: false });
    assert.equal(m.getContactByPhone(store, PHONE)!.consentVersion, 'v-test-1');
    assert.deepEqual(m.recordConsent(store, { ...CONSENT, phone: '0501234567' }), { ok: false, reason: 'invalid_input' }, 'E.164 only');
  });
});

test('B1 store: suppression stops the contact, cancels pending sends, refuses re-consent and outlives the contact row', async () => {
  await withStore((m, store) => {
    m.recordConsent(store, CONSENT);
    assert.equal(m.isSuppressed(store, { phone: PHONE }), false);
    assert.deepEqual(m.suppress(store, { phone: PHONE, reason: 'keyword' }), { contactsStopped: 1, sendsCancelled: 5 });
    assert.equal(m.getContactByPhone(store, PHONE)!.state, 'stopped');
    assert.ok(m.listSends(store, 1).every((s) => s.status === 'cancelled'));
    assert.equal(m.isSuppressed(store, { phone: PHONE }), true);
    assert.equal(m.setContactState(store, 1, 'active'), false, 'stopped is terminal');
    store.db.prepare('DELETE FROM contacts WHERE id = 1').run();
    assert.equal(m.listSends(store, 1).length, 0, 'sends go with the contact');
    assert.equal(m.isSuppressed(store, { phone: PHONE }), true, 'suppressions are kept');
    assert.deepEqual(m.recordConsent(store, CONSENT), { ok: false, reason: 'suppressed' });
    assert.equal(m.getContactByPhone(store, PHONE), null);
  });
});

test('B1 store: bsuid and message-id matching, replies pause, statuses never downgrade, events de-duplicate', async () => {
  await withStore((m, store) => {
    m.recordConsent(store, CONSENT);
    store.db.prepare(`UPDATE sends SET status = 'sent', meta_message_id = 'wamid.ONE' WHERE contact_id = 1 AND message_number = 1`).run();
    assert.equal(m.getContactByMessageId(store, 'wamid.ONE')!.phone, PHONE);
    assert.equal(m.setBsuid(store, 1, 'IL.123456'), true);
    assert.equal(m.getContactByBsuid(store, 'IL.123456')!.id, 1);
    assert.equal(m.recordSendStatus(store, 'wamid.ONE', 'read'), true);
    assert.equal(m.recordSendStatus(store, 'wamid.ONE', 'delivered'), false, 'read is not downgraded');
    assert.equal(m.listSends(store, 1)[0].status, 'read');
    assert.deepEqual(m.recordReply(store, 1), { state: 'paused', notifyStaff: true });
    assert.equal(m.getContactByPhone(store, PHONE)!.lastReplyAt, NOW.toISOString());
    assert.equal(m.recordInboundEvent(store, 'evt-1'), true);
    assert.equal(m.recordInboundEvent(store, 'evt-1'), false);
    // Suppress by bsuid only (a username user with no phone, W-5).
    assert.deepEqual(m.suppress(store, { bsuid: 'IL.123456', reason: 'button' }), { contactsStopped: 1, sendsCancelled: 4 });
    assert.equal(m.isSuppressed(store, { bsuid: 'IL.123456' }), true);
  });
});
