import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Worker } from 'node:worker_threads';

import {
  addWaitlistEntry, capSnapshot, closeLaunchStore, DEFAULT_CAP_LIMITS, hasInterviewSpot, interviewSpotAvailable,
  israelWeekKey, launchDbPath, listWaitlist, openLaunchStore, parseLaunchCapLimits, purgeExpiredWaitlist, recordPaidSignup,
  reserveInterviewStart, WAITLIST_RETENTION_MS, withLaunchStore, type WaitlistEntryInput,
  DEFAULT_WAITLIST_RETENTION_DAYS, parseWaitlistRetentionMs,
} from './launchStore';

function tempDb(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'launch-store-')), 'launch.sqlite');
}
function clock(iso: string) {
  let now = new Date(iso);
  return { now: () => now, set: (next: string) => { now = new Date(next); } };
}
const limits = { total: 10, weekly: 3 };
const audit = '123e4567-e89b-42d3-a456-426614174000';

test('limits: defaults 10 / 3, env overrides, malformed values fail closed (null)', () => {
  assert.deepEqual(parseLaunchCapLimits({}), DEFAULT_CAP_LIMITS);
  assert.deepEqual(DEFAULT_CAP_LIMITS, { total: 10, weekly: 3 });
  assert.deepEqual(parseLaunchCapLimits({ SITE_BOT_CAP_TOTAL: '12', SITE_BOT_CAP_WEEKLY: '4' }), { total: 12, weekly: 4 });
  for (const bad of ['0', '-1', 'ten', '1.5', ' 3', '9999999']) {
    assert.equal(parseLaunchCapLimits({ SITE_BOT_CAP_WEEKLY: bad }), null, bad);
    assert.equal(parseLaunchCapLimits({ SITE_BOT_CAP_TOTAL: bad }), null, bad);
  }
});

test('path: SITE_BOT_LAUNCH_DB_PATH, else <cwd>/data/site-bot-launch (the runtime-data symlink in prod); never relative or client data', () => {
  assert.equal(launchDbPath({ SITE_BOT_LAUNCH_DB_PATH: '/srv/x/launch.sqlite' }), '/srv/x/launch.sqlite');
  assert.equal(launchDbPath({}), path.join(process.cwd(), 'data', 'site-bot-launch', 'launch.sqlite'));
  for (const bad of ['relative/launch.sqlite', '/srv/data/clients/acme/launch.sqlite', '/srv/x/../y/launch.sqlite', '/srv/x/launch.db']) {
    assert.throws(() => openLaunchStore(bad), /Invalid launch store path/, bad);
  }
  // withLaunchStore fails closed on an unusable path.
  assert.equal(withLaunchStore(() => 'opened', 'fallback', { SITE_BOT_LAUNCH_DB_PATH: 'relative.sqlite' }), 'fallback');
});

test('week key: Israeli Sunday-based week in Asia/Jerusalem time', () => {
  // 2026-11-29 is a Sunday.
  assert.equal(israelWeekKey(new Date('2026-11-29T00:30:00+02:00')), '2026-11-29');
  assert.equal(israelWeekKey(new Date('2026-12-05T23:59:00+02:00')), '2026-11-29'); // Saturday night, same week
  assert.equal(israelWeekKey(new Date('2026-12-06T00:00:00+02:00')), '2026-12-06'); // next Sunday
  // Saturday 22:30 UTC is already Sunday 00:30 in Israel.
  assert.equal(israelWeekKey(new Date('2026-12-05T22:30:00Z')), '2026-12-06');
  assert.equal(israelWeekKey(new Date('2026-12-02T12:00:00Z')), '2026-11-29');
  assert.throws(() => israelWeekKey(new Date('nope')));
});

test('weekly cap: 3 interview starts in a week fill it; the same business never counts twice; it keeps its spot', () => {
  const t = clock('2026-12-01T10:00:00Z');
  const store = openLaunchStore(tempDb(), t.now);
  try {
    assert.deepEqual(reserveInterviewStart(store, 'place-aaaa-1', audit, limits), { status: 'reserved' });
    assert.deepEqual(reserveInterviewStart(store, 'place-aaaa-1', audit, limits), { status: 'already' });
    assert.deepEqual(reserveInterviewStart(store, 'place-aaaa-2', audit, limits), { status: 'reserved' });
    assert.equal(capSnapshot(store, limits).full, false);
    assert.equal(interviewSpotAvailable(store, 'place-aaaa-9', limits), true);
    assert.deepEqual(reserveInterviewStart(store, 'place-aaaa-3', audit, limits), { status: 'reserved' });
    assert.deepEqual(capSnapshot(store, limits), { week: '2026-11-29', paidTotal: 0, weekStarts: 3, full: true });
    assert.deepEqual(reserveInterviewStart(store, 'place-aaaa-4', audit, limits), { status: 'full' });
    assert.equal(interviewSpotAvailable(store, 'place-aaaa-4', limits), false);
    // A business that already holds a spot keeps it after the cap filled.
    assert.equal(hasInterviewSpot(store, 'place-aaaa-2'), true);
    assert.equal(interviewSpotAvailable(store, 'place-aaaa-2', limits), true);
    assert.deepEqual(reserveInterviewStart(store, 'place-aaaa-2', audit, limits), { status: 'already' });
  } finally { closeLaunchStore(store); }
});

test('week rollover: next Sunday (Israel time) opens 3 new spots; earlier starts stay counted for their week', () => {
  const t = clock('2026-12-05T21:00:00Z'); // Saturday 23:00 Israel
  const store = openLaunchStore(tempDb(), t.now);
  try {
    for (const n of [1, 2, 3]) assert.equal(reserveInterviewStart(store, `place-week-${n}`, audit, limits).status, 'reserved');
    assert.equal(reserveInterviewStart(store, 'place-week-4', audit, limits).status, 'full');
    t.set('2026-12-05T22:00:00Z'); // Sunday 00:00 Israel
    assert.deepEqual(capSnapshot(store, limits), { week: '2026-12-06', paidTotal: 0, weekStarts: 0, full: false });
    assert.equal(reserveInterviewStart(store, 'place-week-4', audit, limits).status, 'reserved');
  } finally { closeLaunchStore(store); }
});

test('total cap: 10 paid sign-ups fill it for good; a replayed callback never counts twice', () => {
  const t = clock('2026-12-01T10:00:00Z');
  const store = openLaunchStore(tempDb(), t.now);
  try {
    for (let n = 0; n < 9; n++) assert.deepEqual(recordPaidSignup(store, `session-${n}`), { status: 'recorded' });
    assert.deepEqual(recordPaidSignup(store, 'session-0'), { status: 'already' });
    assert.equal(capSnapshot(store, limits).paidTotal, 9);
    assert.equal(capSnapshot(store, limits).full, false);
    assert.deepEqual(recordPaidSignup(store, 'session-9'), { status: 'recorded' });
    assert.equal(capSnapshot(store, limits).full, true);
    assert.equal(reserveInterviewStart(store, 'place-total-1', audit, limits).status, 'full');
    t.set('2027-03-01T10:00:00Z'); // weeks later: the total cap does not roll over
    assert.equal(capSnapshot(store, limits).full, true);
    assert.deepEqual(recordPaidSignup(store, ''), { status: 'unavailable' });
  } finally { closeLaunchStore(store); }
});

test('the counter survives reopening the file (a deploy restarts the process; the file lives in runtime data)', () => {
  const file = tempDb();
  const t = clock('2026-12-01T10:00:00Z');
  let store = openLaunchStore(file, t.now);
  reserveInterviewStart(store, 'place-persist-1', audit, limits);
  recordPaidSignup(store, 'session-persist');
  closeLaunchStore(store);
  store = openLaunchStore(file, t.now);
  try {
    assert.deepEqual(capSnapshot(store, limits), { week: '2026-11-29', paidTotal: 1, weekStarts: 1, full: false });
  } finally { closeLaunchStore(store); }
});

test('concurrent increments: 8 workers on separate connections race for 3 weekly spots; exactly 3 win', async () => {
  const file = tempDb();
  openLaunchStore(file).db.close(); // create the schema first
  const barrier = new Int32Array(new SharedArrayBuffer(4));
  const modulePath = path.join(__dirname, 'launchStore.js');
  const code = `
    const { workerData, parentPort } = require('node:worker_threads');
    const store = require(workerData.modulePath).openLaunchStore(workerData.file, () => new Date('2026-12-01T10:00:00Z'));
    Atomics.add(workerData.barrier, 0, 1);
    while (Atomics.load(workerData.barrier, 0) < workerData.count) { /* spin until every worker has its connection */ }
    const result = require(workerData.modulePath).reserveInterviewStart(store, workerData.placeId, workerData.auditId, { total: 10, weekly: 3 });
    store.db.close();
    parentPort.postMessage(result.status);`;
  const count = 8;
  const results = await Promise.all(Array.from({ length: count }, (_, n) => new Promise<string>((resolve, reject) => {
    const worker = new Worker(code, { eval: true, workerData: { modulePath, file, barrier, count, placeId: `place-race-${n}`, auditId: audit } });
    worker.once('message', resolve);
    worker.once('error', reject);
  })));
  assert.equal(results.filter(status => status === 'reserved').length, 3, results.join(','));
  assert.equal(results.filter(status => status === 'full').length, 5, results.join(','));
  const store = openLaunchStore(file, () => new Date('2026-12-01T10:00:00Z'));
  try { assert.equal(capSnapshot(store, limits).weekStarts, 3); } finally { closeLaunchStore(store); }
});

test('waiting-list retention: SITE_BOT_WAITLIST_RETENTION_DAYS, default 90 days; malformed falls back to the default', () => {
  const day = 24 * 60 * 60 * 1000;
  assert.equal(DEFAULT_WAITLIST_RETENTION_DAYS, 90);
  assert.equal(WAITLIST_RETENTION_MS, 90 * day);
  assert.equal(parseWaitlistRetentionMs({}), 90 * day);
  assert.equal(parseWaitlistRetentionMs({ SITE_BOT_WAITLIST_RETENTION_DAYS: '' }), 90 * day);
  assert.equal(parseWaitlistRetentionMs({ SITE_BOT_WAITLIST_RETENTION_DAYS: '30' }), 30 * day);
  assert.equal(parseWaitlistRetentionMs({ SITE_BOT_WAITLIST_RETENTION_DAYS: ' 120 ' }), 120 * day);
  for (const bad of ['0', '-5', '1.5', 'abc', '90d', '3651', '00030']) {
    assert.equal(parseWaitlistRetentionMs({ SITE_BOT_WAITLIST_RETENTION_DAYS: bad }), 90 * day, bad);
  }
});

test('waiting-list retention: a 60-day-old entry survives the default purge; cap rows are never purged', () => {
  const t = clock('2026-12-06T08:00:00Z');
  const store = openLaunchStore(tempDb(), t.now);
  try {
    assert.equal(addWaitlistEntry(store, entry()).status, 'added');
    assert.equal(reserveInterviewStart(store, 'place-cap-1', audit, { total: 10, weekly: 3 }).status, 'reserved');
    t.set('2027-02-04T08:00:00Z'); // 60 days later
    assert.equal(purgeExpiredWaitlist(store), 0);
    t.set('2027-03-07T08:00:01Z'); // 91 days later
    assert.equal(purgeExpiredWaitlist(store), 1);
    assert.equal(hasInterviewSpot(store, 'place-cap-1'), true);
  } finally { closeLaunchStore(store); }
});

const entry = (over: Partial<WaitlistEntryInput> = {}): WaitlistEntryInput => ({
  reason: 'preopen', auditId: audit, placeId: 'place-wait-1', businessName: 'Synthetic Plumbing', category: 'gcid:plumber',
  name: 'Synthetic Owner', phone: '+972501234567', email: null, ...over,
});

test('waiting list: stored with the derived context, same phone + business is a duplicate, expired entries are purged', () => {
  const t = clock('2026-12-06T08:00:00Z');
  const store = openLaunchStore(tempDb(), t.now);
  try {
    const added = addWaitlistEntry(store, entry());
    assert.equal(added.status, 'added');
    assert.equal(addWaitlistEntry(store, entry({ name: 'Other Spelling' })).status, 'duplicate');
    assert.equal(addWaitlistEntry(store, entry({ phone: '+972521111111', reason: 'full', email: 'o@example.com' })).status, 'added');
    const rows = listWaitlist(store);
    assert.equal(rows.length, 2);
    assert.deepEqual({ ...rows[0], id: 'x' }, { ...entry(), id: 'x', createdAt: '2026-12-06T08:00:00.000Z' });
    assert.equal(rows[1].reason, 'full');
    assert.equal(rows[1].email, 'o@example.com');
    t.set(new Date(Date.parse('2026-12-06T08:00:00Z') + WAITLIST_RETENTION_MS + 1).toISOString());
    assert.equal(purgeExpiredWaitlist(store), 2);
    assert.equal(listWaitlist(store).length, 0);
    // A bad reason violates the schema CHECK: unavailable, nothing stored.
    assert.equal(addWaitlistEntry(store, entry({ reason: 'vip' as WaitlistEntryInput['reason'] })).status, 'unavailable');
    assert.equal(listWaitlist(store).length, 0);
  } finally { closeLaunchStore(store); }
});
