import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { AuditCandidateSnapshot } from './auditStore';
import type { OutgoingEmail } from './clientMessageEmail';
import type { SiteBotOffer } from './eligibility';
import { addWaitlistEntry, listWaitlist, openLaunchStore, type WaitlistEntry } from './launchStore';
import { israeliPhone, normalizeWaitlistSubmission, submitWaitlist, WaitlistError } from './waitlist';
import { buildWaitlistAlert, sendWaitlistAlert } from './waitlistAlert';

const auditId = '123e4567-e89b-42d3-a456-426614174000';
const placeId = 'ChIJ-synthetic-1';
const valid = { auditId, placeId, name: 'Synthetic Owner', phone: '050-123-4567' };
const code = (fn: () => unknown) => {
  try { fn(); } catch (error) { return error instanceof WaitlistError ? error.code : 'other'; }
  return 'none';
};

test('validation: Israeli phone (mobile or landline) to E.164; anything else is rejected', () => {
  assert.equal(israeliPhone('050-123-4567'), '+972501234567');
  assert.equal(israeliPhone('+972 50 123 4567'), '+972501234567');
  assert.equal(israeliPhone('03-1234567'), '+97231234567');
  for (const bad of ['', '123', '+1 212 555 0100', '0501234567890', '050-123-456', '05O1234567', '050\n1234567', null, 5]) {
    assert.equal(israeliPhone(bad), null, String(bad));
  }
});

test('validation: strict fields, bounded lengths, no control or bidi characters, no unknown keys', () => {
  assert.deepEqual(normalizeWaitlistSubmission({ ...valid, email: ' Owner@Example.com ' }),
    { auditId, placeId, name: 'Synthetic Owner', phone: '+972501234567', email: 'owner@example.com' });
  assert.deepEqual(normalizeWaitlistSubmission({ ...valid, email: '' }).email, null);
  for (const body of [null, [], 'x', {}, { ...valid, reason: 'full' }, { ...valid, businessName: 'x' }, { ...valid, auditId: 'nope' },
    { ...valid, placeId: 'short' }, { ...valid, name: '' }, { ...valid, name: '   ' }, { ...valid, name: 'a'.repeat(121) },
    { ...valid, name: 'Evil‮Name' }, { ...valid, name: 'Line\nBreak' }, { ...valid, phone: '12345' }, { ...valid, email: 'not-an-email' },
    { ...valid, email: 'a@b' }, { ...valid, name: 7 }]) {
    assert.equal(code(() => normalizeWaitlistSubmission(body)), 'invalid_input', JSON.stringify(body));
  }
});

function storeDeps(offer: SiteBotOffer, found: AuditCandidateSnapshot | null) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'waitlist-')), 'launch.sqlite');
  const store = openLaunchStore(file, () => new Date('2026-12-06T08:00:00Z'));
  const alerts: WaitlistEntry[] = [];
  return {
    store, alerts,
    deps: {
      findCandidate: async (a: string, p: string) => (a === auditId && p === placeId ? found : null),
      offerFor: async () => offer,
      add: (input: Parameters<typeof addWaitlistEntry>[1]) => addWaitlistEntry(store, input),
      alert: async (entry: WaitlistEntry) => { alerts.push(entry); return true; },
    },
  };
}
const candidate = { placeId, displayName: 'Synthetic Plumbing', formattedAddress: 'Synthetic Address', types: ['plumber'], primaryType: 'plumber',
  hasRegularOpeningHours: true, hasSpecialOpeningHours: false, hasPhone: true, hasWebsite: false, photosFetched: true, photoCount: 1,
  hasRating: true, userRatingCount: 4, hasEditorialSummary: false } satisfies AuditCandidateSnapshot;

test('storage: the server derives business, category and reason; one alert per new entry; repeats are acknowledged silently', async () => {
  for (const [offer, reason] of [['waitlist_preopen', 'preopen'], ['waitlist_full', 'full'], ['not_eligible_trade', 'trade']] as const) {
    const h = storeDeps(offer, candidate);
    try {
      const submission = normalizeWaitlistSubmission(valid);
      assert.deepEqual(await submitWaitlist(submission, h.deps), { ok: true, reason });
      assert.deepEqual(await submitWaitlist(submission, h.deps), { ok: true, reason });
      const rows = listWaitlist(h.store);
      assert.equal(rows.length, 1);
      assert.deepEqual({ ...rows[0], id: '-' }, { id: '-', createdAt: '2026-12-06T08:00:00.000Z', reason, auditId, placeId,
        businessName: 'Synthetic Plumbing', category: 'gcid:plumber', name: 'Synthetic Owner', phone: '+972501234567', email: null });
      assert.equal(h.alerts.length, 1);
      assert.equal(h.alerts[0].id, rows[0].id);
    } finally { h.store.db.close(); }
  }
});

test('storage: no audit -> not_found; an offer without a form (CTA, has-site, profile) -> not_eligible; nothing stored', async () => {
  const missing = storeDeps('waitlist_preopen', null);
  await assert.rejects(submitWaitlist(normalizeWaitlistSubmission(valid), missing.deps), (e: unknown) => e instanceof WaitlistError && e.code === 'not_found');
  for (const offer of ['eligible', 'not_eligible_has_site', 'not_eligible_profile'] as const) {
    const h = storeDeps(offer, candidate);
    await assert.rejects(submitWaitlist(normalizeWaitlistSubmission(valid), h.deps), (e: unknown) => e instanceof WaitlistError && e.code === 'not_eligible');
    assert.equal(listWaitlist(h.store).length, 0);
    assert.equal(h.alerts.length, 0);
    h.store.db.close();
  }
  const broken = storeDeps('waitlist_preopen', candidate);
  broken.deps.add = () => ({ status: 'unavailable' });
  await assert.rejects(submitWaitlist(normalizeWaitlistSubmission(valid), broken.deps), (e: unknown) => e instanceof WaitlistError && e.code === 'unavailable');
  assert.equal(broken.alerts.length, 0);
  broken.store.db.close();
});

test('alert: English staff email to the staff address, one-line fields, tag waitlist_joined; send never throws', async () => {
  const entry: WaitlistEntry = { id: 'w-1', createdAt: '2026-12-06T08:00:00.000Z', reason: 'full', auditId, placeId,
    businessName: 'Biz\nInjected: x', category: 'gcid:plumber', name: 'Owner‮', phone: '+972501234567', email: null };
  const email = buildWaitlistAlert(entry, { SITE_BOT_SUPPORT_ALERT_EMAIL: 'staff@example.com' });
  assert.equal(email.to, 'staff@example.com');
  assert.equal(email.tag, 'waitlist_joined');
  assert.equal(email.subject, 'Site Bot waiting list (full) — Biz Injected: x');
  assert.match(email.text, /Reason: full \(eligible; the launch cap is reached\)/);
  assert.match(email.text, /Phone: \+972501234567/);
  assert.match(email.text, /Email: -/);
  assert.doesNotMatch(email.text, /‮/);
  const sent: OutgoingEmail[] = [];
  assert.equal(await sendWaitlistAlert(entry, async (e) => { sent.push(e); return 'sent'; }), true);
  assert.equal(await sendWaitlistAlert(entry, async () => 'stubbed'), false);
  const original = console.error;
  console.error = () => {};
  try { assert.equal(await sendWaitlistAlert(entry, async () => { throw new Error('resend down'); }), false); }
  finally { console.error = original; }
  assert.equal(sent.length, 1);
});
