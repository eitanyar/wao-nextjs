// Site-Bot cancellation notices + offline-date math + post-cancel account access (readiness step 5, capability 12).
// Hermetic: temp billing DB, recording transport. HEBREW-SAFETY: zero Hebrew bytes (test copy is English).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-cancel-notices-'));
process.env.BILLING_DB_PATH = path.join(tmpDir, 'billing.db');
process.env.SITE_BOT_EMAIL_OUTBOX_PATH = path.join(tmpDir, 'outbox.jsonl');
process.env.NEXT_PUBLIC_BASE_URL = 'https://www.wao.co.il';
process.env.TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
delete process.env.RESEND_API_KEY;
delete process.env.SITE_BOT_SUPPORT_ALERT_EMAIL;
delete process.env.BILLING_ADMIN_ALERT_EMAIL;
delete process.env.SITE_BOT_SUPPORT_FROM_EMAIL;

import { closeDb, getDb, insertSubscription, type SubscriptionRow } from '../payments/db';
import { getManageableSubscriptionsByEmail } from '../payments/subscriptions';
import { linkSiteBotSession } from './clientMessages';
import type { MailTransport, OutgoingEmail } from './clientMessageEmail';
import { siteBotSupportBoxShown } from './supportBox';
import {
  CANCEL_NOTICE_COPY_KEYS,
  SITE_BOT_CANCEL_NOTICE_COPY,
  SITE_BOT_CANCEL_NOTICE_COPY_PENDING,
  cancelNoticeCopyReady,
} from './cancelNoticeCopy';
import { accountPageUrl, cancelNoticeContext, runCancelNotices, sendCancelConfirmation } from './cancelNotices';
import {
  addCalendarDays,
  cancellationEffectiveAt,
  israelDate,
  offlineSoonDate,
  pastOfflineDate,
  siteOfflineDate,
} from './offlineDate';
import { getNotice, recordSiteLive } from './siteLifecycleStore';

test.after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const COPY: Record<string, string> = Object.fromEntries(CANCEL_NOTICE_COPY_KEYS.map((key) => [key, `T:${key}`]));
COPY.cancelEmailBody = 'DOMAIN paid {paidThrough} offline {offlineDate} account {accountLink}';
COPY.cancelEmailBodyNoDomain = 'NODOMAIN paid {paidThrough} offline {offlineDate} account {accountLink}';
COPY.offlineSoonBody = 'SOON-DOMAIN {offlineDate}\n{accountLink}';
COPY.offlineSoonBodyNoDomain = 'SOON-NODOMAIN {offlineDate}\n{accountLink}';
const READY = { copy: COPY, pending: false };

function makeSubscription(overrides: Partial<SubscriptionRow> = {}): string {
  const id = crypto.randomUUID();
  const at = '2026-11-01T08:00:00.000Z';
  insertSubscription(getDb(), {
    id, user_id: `owner-${id.slice(0, 6)}@example.com`, status: 'active', provider: 'mock', provider_token: null, card_last4: null,
    card_expiry: null, trial_amount: null, recurring_amount: 234.82, currency: 'ILS', next_charge_at: null, canceled_at: null,
    cancel_reason: null, failed_attempts: 0, created_at: at, updated_at: at, joined_at: at,
    extended_cancellation_flag: null, extended_flag_basis: null, plan: 'site-bot', net_amount: null, vat_mode: null,
    vat_rate: null, billing_interval: null, billing_anchor_at: null, periods_paid: null, dunning_started_at: null, paused_at: null, ...overrides,
  } as SubscriptionRow);
  // insertSubscription does not write the cancel columns; set them like cancelSubscriptionByToken does.
  const o = overrides as Partial<SubscriptionRow> & { cancel_at_period_end?: number | null; cancel_effective_at?: string | null };
  getDb().prepare('UPDATE subscriptions SET cancel_at_period_end = ?, cancel_effective_at = ? WHERE id = ?')
    .run(o.cancel_at_period_end ?? null, o.cancel_effective_at ?? null, id);
  linkSiteBotSession({ subscriptionId: id, sessionId: crypto.randomUUID(), businessName: 'Acme', ownerMobile: null, now: new Date(at) });
  return id;
}

/** A scheduled (end-of-period) cancel made at `canceledAt`, effective at `effectiveAt`. */
function cancelled(canceledAt: string, effectiveAt: string, extra: Partial<SubscriptionRow> = {}): string {
  return makeSubscription({ canceled_at: canceledAt, cancel_at_period_end: 1, cancel_effective_at: effectiveAt, ...extra } as Partial<SubscriptionRow>);
}

function sub(id: string): SubscriptionRow {
  return getDb().prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as SubscriptionRow;
}

function recorder() {
  const sent: OutgoingEmail[] = [];
  const transport: MailTransport = async (email) => { sent.push(email); return 'sent'; };
  return { sent, transport };
}

test('copy gate: the pending flag agrees with the values; pending sends nothing', async () => {
  const placeholders = CANCEL_NOTICE_COPY_KEYS.filter((key) => SITE_BOT_CANCEL_NOTICE_COPY[key] === `__HE_TODO_${key}__`);
  assert.equal(SITE_BOT_CANCEL_NOTICE_COPY_PENDING, placeholders.length > 0);
  assert.equal(cancelNoticeCopyReady(CANCEL_NOTICE_COPY_KEYS), !SITE_BOT_CANCEL_NOTICE_COPY_PENDING);
  const id = cancelled('2026-12-01T08:00:00.000Z', '2027-01-01T08:00:00.000Z');
  const { sent, transport } = recorder();
  assert.equal(await sendCancelConfirmation(id, new Date('2026-12-01T09:00:00.000Z'), transport, { copy: COPY, pending: true }), 'copy_pending');
  if (SITE_BOT_CANCEL_NOTICE_COPY_PENDING) {
    assert.equal(await sendCancelConfirmation(id, new Date('2026-12-01T09:00:00.000Z'), transport), 'copy_pending');
  }
  assert.equal(sent.length, 0);
  assert.equal(getNotice(id, 'cancel_confirmation'), null, 'a pending skip claims nothing');
});

test('offline date: Israel calendar date of the effective instant + 30 days; offline-soon = 7 days before', () => {
  // 23:30 UTC on 31.12 is already 01.01 in Israel (UTC+2).
  assert.equal(israelDate('2026-12-31T23:30:00.000Z'), '2027-01-01');
  assert.equal(siteOfflineDate('2026-12-31T23:30:00.000Z'), '2027-01-31');
  assert.equal(siteOfflineDate('2026-12-31T21:00:00.000Z'), '2027-01-30', '23:00 Israel is still 31.12');
  // Across the spring DST change (27.03.2027): plain +30*24h would land at 01:00 next-day wall clock for a 00:30 start.
  assert.equal(siteOfflineDate('2027-03-14T22:30:00.000Z'), '2027-04-14', '00:30 Israel on 15.03 -> 14.04');
  // Summer time (UTC+3): 21:30 UTC is 00:30 the next Israel day.
  assert.equal(israelDate('2027-07-10T21:30:00.000Z'), '2027-07-11');
  assert.equal(offlineSoonDate('2027-01-31'), '2027-01-24');
  assert.equal(addCalendarDays('2027-02-27', 2), '2027-03-01');
  assert.equal(addCalendarDays('2028-02-28', 1), '2028-02-29', 'leap year');
  assert.equal(cancellationEffectiveAt({ status: 'active', cancel_at_period_end: 1, cancel_effective_at: '2027-01-01T00:00:00.000Z' }), '2027-01-01T00:00:00.000Z');
  assert.equal(cancellationEffectiveAt({ status: 'canceled', canceled_at: '2026-12-05T00:00:00.000Z' }), '2026-12-05T00:00:00.000Z');
  assert.equal(cancellationEffectiveAt({ status: 'active' }), null);
});

test('confirmation: once, NoDomain body for a WAO sub-domain, plain account URL, Israel-formatted dates', async () => {
  const id = cancelled('2026-12-01T08:00:00.000Z', '2027-01-01T08:00:00.000Z');
  const { sent, transport } = recorder();
  const now = new Date('2026-12-01T09:00:00.000Z');
  assert.equal(await sendCancelConfirmation(id, now, transport, READY), 'sent');
  assert.equal(await sendCancelConfirmation(id, now, transport, READY), 'already_sent');
  assert.equal(sent.length, 1);
  const [email] = sent;
  assert.equal(email.tag, 'cancel_confirmation');
  assert.equal(email.to, sub(id).user_id);
  assert.ok(email.text.startsWith('NODOMAIN'), 'no site row -> no own domain');
  assert.equal(accountPageUrl(), 'https://www.wao.co.il/account/subscription');
  assert.ok(email.text.includes('account https://www.wao.co.il/account/subscription'));
  assert.ok(!/token=/.test(email.text) && !/token=/.test(email.html ?? ''), 'never a token URL');
  assert.ok(email.text.includes('01.01.2027'), 'paidThrough');
  assert.ok(email.text.includes('31.01.2027'), 'offlineDate');
  assert.ok(email.html?.includes('href="https://www.wao.co.il/account/subscription"'));
});

test('confirmation uses the own-domain body when the site runs on the owner domain; not sent after the catch-up window', async () => {
  const id = cancelled('2026-12-01T08:00:00.000Z', '2027-01-01T08:00:00.000Z');
  recordSiteLive({ subscriptionId: id, slug: 'acme', siteUrl: 'https://www.acme.co.il', placeId: null, ownDomain: true, businessName: 'Acme', now: new Date('2026-11-02T08:00:00.000Z') });
  const { sent, transport } = recorder();
  assert.equal(await sendCancelConfirmation(id, new Date('2026-12-01T09:00:00.000Z'), transport, READY), 'sent');
  assert.ok(sent[0].text.startsWith('DOMAIN'));
  const late = cancelled('2026-12-01T08:00:00.000Z', '2027-01-01T08:00:00.000Z');
  assert.equal(await sendCancelConfirmation(late, new Date('2026-12-04T09:00:00.000Z'), transport, READY), 'not_due');
  assert.equal(await sendCancelConfirmation(makeSubscription(), new Date(), transport, READY), 'not_cancelled');
  assert.equal(await sendCancelConfirmation(cancelled('2026-12-01T08:00:00.000Z', '2027-01-01T08:00:00.000Z', { plan: null } as Partial<SubscriptionRow>), new Date('2026-12-01T09:00:00.000Z'), transport, READY), 'not_cancelled');
});

test('daily run: offline-soon in its window only, once; take-down reminder to staff on the offline date, once', async () => {
  const id = cancelled('2026-12-20T08:00:00.000Z', '2027-01-01T08:00:00.000Z'); // offline 31.01.2027, soon 24.01.2027
  const ctx = cancelNoticeContext(sub(id))!;
  assert.equal(ctx.offlineDate, '2027-01-31');
  assert.equal(ctx.offlineSoonDate, '2027-01-24');
  const { sent, transport } = recorder();
  const mine = () => sent.filter((e) => e.refIds[0] === id);
  await runCancelNotices(new Date('2027-01-23T20:00:00.000Z'), transport, READY); // 22:00 Israel on 23.01: not yet
  assert.deepEqual(mine().map((e) => e.tag), []);
  await runCancelNotices(new Date('2027-01-23T22:30:00.000Z'), transport, READY); // 00:30 Israel on 24.01: due
  await runCancelNotices(new Date('2027-01-25T08:00:00.000Z'), transport, READY);
  assert.deepEqual(mine().map((e) => e.tag), ['offline_soon']);
  assert.ok(mine()[0].text.startsWith('SOON-NODOMAIN 31.01.2027'));
  assert.ok(mine()[0].text.includes('https://www.wao.co.il/account/subscription'));
  await runCancelNotices(new Date('2027-01-30T08:00:00.000Z'), transport, READY);
  assert.equal(mine().length, 1, 'no take-down before the offline date');
  await runCancelNotices(new Date('2027-01-31T06:00:00.000Z'), transport, READY);
  await runCancelNotices(new Date('2027-02-01T06:00:00.000Z'), transport, READY);
  assert.deepEqual(mine().map((e) => e.tag), ['offline_soon', 'takedown_reminder']);
  const takedown = mine()[1];
  assert.equal(takedown.to, 'eitan@wao.co.il');
  assert.match(takedown.subject, /take-down due today/);
});

test('a missed offline-soon window is never sent late; very old cancels raise no take-down reminder', async () => {
  const id = cancelled('2026-12-20T08:00:00.000Z', '2027-01-01T08:00:00.000Z');
  const { sent, transport } = recorder();
  await runCancelNotices(new Date('2027-01-31T08:00:00.000Z'), transport, READY);
  assert.deepEqual(sent.filter((e) => e.refIds[0] === id).map((e) => e.tag), ['takedown_reminder']);
  const old = cancelled('2025-01-01T08:00:00.000Z', '2025-02-01T08:00:00.000Z');
  await runCancelNotices(new Date('2027-01-31T08:00:00.000Z'), transport, READY);
  assert.equal(sent.filter((e) => e.refIds[0] === old).length, 0);
});

test('post-cancel access: a cancelled Site-Bot client can request a sign-in link and keeps the box until the offline date', () => {
  const prev = process.env.SITE_BOT_CLIENT_MESSAGES_ENABLED;
  process.env.SITE_BOT_CLIENT_MESSAGES_ENABLED = 'true';
  try {
    const id = makeSubscription({ status: 'canceled', canceled_at: '2027-01-01T08:00:00.000Z', cancel_at_period_end: 1, cancel_effective_at: '2027-01-01T08:00:00.000Z' } as Partial<SubscriptionRow>);
    const email = sub(id).user_id;
    const before = new Date('2027-01-30T20:00:00.000Z'); // 22:00 Israel on 30.01
    const onDate = new Date('2027-01-30T22:30:00.000Z'); // 00:30 Israel on 31.01 = offline date
    assert.deepEqual(getManageableSubscriptionsByEmail(email, before).map((r) => r.id), [id]);
    assert.deepEqual(getManageableSubscriptionsByEmail(email, onDate).map((r) => r.id), []);
    assert.equal(siteBotSupportBoxShown(sub(id), process.env, before), true);
    assert.equal(siteBotSupportBoxShown(sub(id), process.env, onDate), false);
    assert.equal(pastOfflineDate(sub(id), onDate), true);
    const legacy = makeSubscription({ plan: null, status: 'canceled', canceled_at: '2027-01-01T08:00:00.000Z' } as Partial<SubscriptionRow>);
    assert.deepEqual(getManageableSubscriptionsByEmail(sub(legacy).user_id, before), [], 'legacy cancelled rows unchanged');
    const active = makeSubscription();
    assert.deepEqual(getManageableSubscriptionsByEmail(sub(active).user_id, before).map((r) => r.id), [active]);
  } finally {
    if (prev === undefined) delete process.env.SITE_BOT_CLIENT_MESSAGES_ENABLED; else process.env.SITE_BOT_CLIENT_MESSAGES_ENABLED = prev;
  }
});
