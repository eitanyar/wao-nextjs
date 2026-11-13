import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

// Hermetic: temp billing DB, temp outbox, no real email.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-client-messages-'));
const tmpDbPath = path.join(tmpDir, 'billing.db');
const outboxPath = path.join(tmpDir, 'outbox.jsonl');
process.env.BILLING_DB_PATH = tmpDbPath;
process.env.SITE_BOT_EMAIL_OUTBOX_PATH = outboxPath;
process.env.TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
process.env.NEXT_PUBLIC_BASE_URL = 'https://wao.co.il';
delete process.env.RESEND_API_KEY;
delete process.env.SITE_BOT_SUPPORT_ALERT_EMAIL;
delete process.env.BILLING_ADMIN_ALERT_EMAIL;
delete process.env.SITE_BOT_SUPPORT_FROM_EMAIL;

import { closeDb, getDb, insertSubscription, type SubscriptionRow } from '../payments/db';
import {
  ClientMessageError,
  countMessagesSince,
  createCancelNoticeItem,
  createClientMessage,
  linkSiteBotSession,
  listClientMessages,
  listUnhandledOlderThan,
  normalizeMessageBody,
  resolveClientIdentity,
  triageClientMessage,
  updateClientMessage,
  type ClientMessageRow,
} from './clientMessages';
import {
  CLIENT_MESSAGE_COPY_KEYS,
  SITE_BOT_CLIENT_MESSAGE_COPY,
  SITE_BOT_CLIENT_MESSAGE_COPY_PENDING,
  copyReady,
  isFilledCopy,
} from './clientMessageCopy';
import {
  escapeHtml,
  remindUnhandledClientMessages,
  sendClientMessageConfirmation,
  sendClientMessageStaffAlert,
  type MailTransport,
  type OutgoingEmail,
} from './clientMessageEmail';
import { runChargeCron } from '../payments/cron-charge';
import { SITE_BOT_ACCOUNT_COPY } from './checkout/accountCopy';

test.after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const NOW = new Date('2026-12-06T08:00:00.000Z');

function makeSubscription(overrides: Partial<SubscriptionRow> = {}): string {
  const id = crypto.randomUUID();
  insertSubscription(getDb(), {
    id,
    user_id: `owner-${id.slice(0, 6)}@example.com`,
    status: 'active',
    provider: 'mock',
    provider_token: null,
    card_last4: null,
    card_expiry: null,
    trial_amount: null,
    recurring_amount: 234.82,
    currency: 'ILS',
    next_charge_at: null,
    canceled_at: null,
    cancel_reason: null,
    failed_attempts: 0,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    joined_at: NOW.toISOString(),
    extended_cancellation_flag: null,
    extended_flag_basis: null,
    plan: 'site-bot',
    ...overrides,
  });
  return id;
}

function recordingTransport(outcome: 'sent' | 'stubbed' = 'sent'): MailTransport & { calls: OutgoingEmail[] } {
  const calls: OutgoingEmail[] = [];
  const fn = (async (email: OutgoingEmail) => { calls.push(email); return outcome; }) as MailTransport & { calls: OutgoingEmail[] };
  fn.calls = calls;
  return fn;
}

// ---- 1. normalizeMessageBody --------------------------------------------------------------

test('1: normalizeMessageBody accepts Hebrew, Latin, digits and single newlines; converts CRLF; collapses 3+ newlines', () => {
  const hebrew = SITE_BOT_ACCOUNT_COPY.manageLink; // existing approved Hebrew, reused as a fixture (none typed here)
  assert.match(hebrew, /[\u0590-\u05ff]/);
  assert.equal(normalizeMessageBody(`${hebrew} WAO 123\nline two`), `${hebrew} WAO 123\nline two`);
  assert.equal(normalizeMessageBody('a\r\nb'), 'a\nb');
  assert.equal(normalizeMessageBody('a\n\n\n\nb'), 'a\n\nb');
  assert.equal(normalizeMessageBody('  padded  '), 'padded');
  assert.equal(normalizeMessageBody('x'.repeat(2000)).length, 2000);
});

test('1: normalizeMessageBody rejects empty, whitespace-only, 2001 chars, NUL, other C0 controls and U+202E', () => {
  const code = (fn: () => unknown) => { try { fn(); return 'ok'; } catch (e) { return e instanceof ClientMessageError ? e.code : 'other'; } };
  assert.equal(code(() => normalizeMessageBody('')), 'invalid_input');
  assert.equal(code(() => normalizeMessageBody(' \n \n ')), 'invalid_input');
  assert.equal(code(() => normalizeMessageBody('x'.repeat(2001))), 'too_long');
  assert.equal(code(() => normalizeMessageBody('a\u0000b')), 'invalid_input');
  assert.equal(code(() => normalizeMessageBody('a\u0007b')), 'invalid_input');
  assert.equal(code(() => normalizeMessageBody('a\tb')), 'invalid_input');
  assert.equal(code(() => normalizeMessageBody('a\u0085b')), 'invalid_input');
  assert.equal(code(() => normalizeMessageBody('a\u202eb')), 'invalid_input');
  assert.equal(code(() => normalizeMessageBody('a\u2067b')), 'invalid_input');
  assert.equal(code(() => normalizeMessageBody(42)), 'invalid_input');
});

// ---- 2. createClientMessage idempotency -----------------------------------------------------

test('2: same id + same content is one row and the same result; same id + different body is a conflict', () => {
  const sub = makeSubscription();
  const id = crypto.randomUUID();
  const first = createClientMessage({ id, subscriptionId: sub, body: 'please update my hours', now: NOW });
  assert.equal(first.created, true);
  const again = createClientMessage({ id: id.toUpperCase(), subscriptionId: sub, body: 'please update my hours', now: new Date(NOW.getTime() + 1000) });
  assert.equal(again.created, false);
  assert.deepEqual(again.row, first.row);
  assert.throws(() => createClientMessage({ id, subscriptionId: sub, body: 'different', now: NOW }), (e: unknown) => e instanceof ClientMessageError && e.code === 'conflict');
  assert.throws(() => createClientMessage({ id, subscriptionId: makeSubscription(), body: 'please update my hours', now: NOW }), (e: unknown) => e instanceof ClientMessageError && e.code === 'conflict');
  assert.equal(listClientMessages().filter((r) => r.id === id).length, 1);
  assert.equal(countMessagesSince(sub, new Date(NOW.getTime() - 60_000).toISOString()), 1);
});

// ---- 3 + 19. identity link ------------------------------------------------------------------

test('3/19: resolveClientIdentity reads the session link; nulls without one; linking twice writes one event', () => {
  const sub = makeSubscription();
  assert.deepEqual(resolveClientIdentity(sub), { sessionId: null, businessName: null, contactMobile: null, contactEmail: `owner-${sub.slice(0, 6)}@example.com` });
  assert.equal(linkSiteBotSession({ subscriptionId: sub, sessionId: 's-1', businessName: 'Acme Plumbing', ownerMobile: '+972501234567', now: NOW }), 'linked');
  assert.equal(linkSiteBotSession({ subscriptionId: sub, sessionId: 's-1', businessName: 'Other', ownerMobile: null, now: NOW }), 'exists');
  const events = getDb().prepare(`SELECT COUNT(*) AS n FROM subscription_events WHERE subscription_id = ? AND event_type = 'site_bot_session_linked'`).get(sub) as { n: number };
  assert.equal(events.n, 1);
  assert.deepEqual(resolveClientIdentity(sub), { sessionId: 's-1', businessName: 'Acme Plumbing', contactMobile: '+972501234567', contactEmail: `owner-${sub.slice(0, 6)}@example.com` });
  const { row } = createClientMessage({ id: crypto.randomUUID(), subscriptionId: sub, body: 'hi', now: NOW });
  assert.equal(row.business_name, 'Acme Plumbing');
  assert.equal(row.contact_mobile, '+972501234567');
  const nonEmail = makeSubscription({ user_id: 'not-an-email' });
  assert.equal(resolveClientIdentity(nonEmail).contactEmail, null);
});

// ---- 4. cancel notice -----------------------------------------------------------------------

test('4: createCancelNoticeItem sets siteOfflineAt = effective + 30 days, once per subscription', () => {
  const sub = makeSubscription();
  const first = createCancelNoticeItem({ subscriptionId: sub, effectiveAt: '2027-01-06T08:00:00.000Z', cancelAtPeriodEnd: true, now: NOW });
  assert.equal(first.created, true);
  assert.equal(first.row.kind, 'cancel_notice_due');
  assert.equal(first.row.staff_category, 'cancel');
  assert.equal(first.row.body, '');
  assert.deepEqual(JSON.parse(first.row.meta_json as string), { effectiveAt: '2027-01-06T08:00:00.000Z', siteOfflineAt: '2027-02-05T08:00:00.000Z', cancelAtPeriodEnd: true });
  const second = createCancelNoticeItem({ subscriptionId: sub, effectiveAt: '2027-03-01T00:00:00.000Z', cancelAtPeriodEnd: false, now: NOW });
  assert.equal(second.created, false);
  assert.equal(listClientMessages().filter((r) => r.subscription_id === sub).length, 1);
  assert.equal(countMessagesSince(sub, '2000-01-01T00:00:00.000Z'), 0, 'system items do not count toward the client cap');
});

// ---- 5. staff update ------------------------------------------------------------------------

test('5: updateClientMessage validates status, category and note; null for an unknown id; sorting puts open first', () => {
  const sub = makeSubscription();
  const { row } = createClientMessage({ id: crypto.randomUUID(), subscriptionId: sub, body: 'change request', now: NOW });
  const bad = (patch: Record<string, unknown>) => assert.throws(() => updateClientMessage(row.id, patch, NOW), (e: unknown) => e instanceof ClientMessageError && e.code === 'invalid_input');
  bad({ status: 'closed' });
  bad({ staffCategory: 'urgent' });
  bad({ staffNote: 'x'.repeat(1001) });
  bad({});
  assert.equal(updateClientMessage(crypto.randomUUID(), { status: 'done' }, NOW), null);
  const later = new Date(NOW.getTime() + 60_000);
  const saved = updateClientMessage(row.id, { status: 'handling', staffCategory: 'change', staffNote: 'phone fix' }, later) as ClientMessageRow;
  assert.deepEqual([saved.status, saved.staff_category, saved.staff_note, saved.updated_at], ['handling', 'change', 'phone fix', later.toISOString()]);
  assert.equal((updateClientMessage(row.id, { staffCategory: null, staffNote: '' }, later) as ClientMessageRow).staff_category, null);
  updateClientMessage(row.id, { status: 'done' }, later);
  const list = listClientMessages();
  const firstDone = list.findIndex((r) => r.status === 'done');
  assert.ok(firstDone > 0 && list.slice(firstDone).every((r) => r.status === 'done'), 'open items before done ones');
});

// ---- Hebrew gate + email builders -----------------------------------------------------------

test('copy gate: SITE_BOT_CLIENT_MESSAGE_COPY_PENDING agrees with the values; turnaroundLine stays optional', () => {
  const pending = !copyReady(CLIENT_MESSAGE_COPY_KEYS);
  assert.equal(SITE_BOT_CLIENT_MESSAGE_COPY_PENDING, pending);
  for (const key of CLIENT_MESSAGE_COPY_KEYS) {
    const value = SITE_BOT_CLIENT_MESSAGE_COPY[key];
    assert.ok(value === `__HE_TODO_${key}__` || isFilledCopy(value), `${key}: placeholder or approved copy`);
  }
  assert.equal(isFilledCopy(SITE_BOT_CLIENT_MESSAGE_COPY.turnaroundLine), false, 'founder decision 2: no reply-time line');
  for (const file of ['clientMessages.ts', 'clientMessageEmail.ts', 'clientMessageCopy.ts']) {
    assert.doesNotMatch(fs.readFileSync(path.join(process.cwd(), 'src/lib/site-bot', file), 'utf8'), /[\u0590-\u05ff]/, `${file} has zero Hebrew`);
  }
});

test('14: with copy placeholders in place the confirmation is not sent', async () => {
  const sub = makeSubscription();
  const { row } = createClientMessage({ id: crypto.randomUUID(), subscriptionId: sub, body: 'hello', now: NOW });
  const transport = recordingTransport();
  process.env.SITE_BOT_SUPPORT_FROM_EMAIL = 'support@example.com';
  try {
    assert.equal(await sendClientMessageConfirmation(row, transport), false);
    assert.equal(transport.calls.length, 0);
  } finally {
    delete process.env.SITE_BOT_SUPPORT_FROM_EMAIL;
  }
  assert.equal(await sendClientMessageConfirmation(row, transport), false, 'no support address -> not sent');
});

test('staff alert: English plain text, body only in the text and never in the subject; no address -> skipped', async () => {
  const sub = makeSubscription();
  linkSiteBotSession({ subscriptionId: sub, sessionId: 's', businessName: 'Acme', ownerMobile: null, now: NOW });
  const body = '<img src=x onerror=alert(1)> please change the phone';
  const { row } = createClientMessage({ id: crypto.randomUUID(), subscriptionId: sub, body, now: NOW });
  const transport = recordingTransport();
  assert.equal(await sendClientMessageStaffAlert(row, transport), false, 'no alert address configured');
  assert.equal(transport.calls.length, 0);
  process.env.BILLING_ADMIN_ALERT_EMAIL = 'billing-alerts@example.com';
  try {
    assert.equal(await sendClientMessageStaffAlert(row, transport), true);
    const [email] = transport.calls;
    assert.equal(email.to, 'billing-alerts@example.com', 'falls back to BILLING_ADMIN_ALERT_EMAIL');
    assert.equal(email.subject, 'Site Bot client message — Acme');
    assert.ok(!email.subject.includes('please'), 'body never in the subject');
    assert.ok(email.text.includes(body) && email.text.includes('https://wao.co.il/admin/site-bot-help'));
    assert.equal(email.html, undefined, 'staff alert is plain text only');
    assert.equal(await sendClientMessageStaffAlert(row, recordingTransport('stubbed')), false, 'stubbed is not "sent"');
  } finally {
    delete process.env.BILLING_ADMIN_ALERT_EMAIL;
  }
  assert.equal(escapeHtml('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
});

test('cancel alert lists both dates and the hand checklist', async () => {
  const sub = makeSubscription();
  const { row } = createCancelNoticeItem({ subscriptionId: sub, effectiveAt: '2027-01-06T08:00:00.000Z', cancelAtPeriodEnd: true, now: NOW });
  const transport = recordingTransport();
  process.env.SITE_BOT_SUPPORT_ALERT_EMAIL = 'support-alerts@example.com';
  try {
    assert.equal(await sendClientMessageStaffAlert(row, transport), true);
  } finally {
    delete process.env.SITE_BOT_SUPPORT_ALERT_EMAIL;
  }
  const [email] = transport.calls;
  assert.match(email.subject, /^Site Bot cancel — notices due — owner-/);
  assert.match(email.text, /Effective: 06\/01\/2027/);
  assert.match(email.text, /Site offline on: 05\/02\/2027/);
  assert.match(email.text, /cancel-day notice[\s\S]*7 days before[\s\S]*manager access/);
});

test('AI seam is a stub', async () => {
  const sub = makeSubscription();
  const { row } = createClientMessage({ id: crypto.randomUUID(), subscriptionId: sub, body: 'x', now: NOW });
  assert.equal(await triageClientMessage(row), null);
});

// ---- 21. reminder ---------------------------------------------------------------------------

test('21: an item open for 25 hours triggers one reminder and sets reminded_at; a second run inside 24 hours sends none', async () => {
  getDb().prepare(`UPDATE site_bot_client_messages SET status = 'done'`).run();
  const sub = makeSubscription();
  const receivedAt = new Date(NOW.getTime() - 25 * 3_600_000);
  const { row } = createClientMessage({ id: crypto.randomUUID(), subscriptionId: sub, body: 'old', now: receivedAt });
  createClientMessage({ id: crypto.randomUUID(), subscriptionId: sub, body: 'fresh', now: new Date(NOW.getTime() - 3_600_000) });
  process.env.SITE_BOT_SUPPORT_ALERT_EMAIL = 'support-alerts@example.com';
  try {
    const transport = recordingTransport('stubbed');
    assert.deepEqual(await remindUnhandledClientMessages(NOW, transport), { reminded: 1 });
    assert.equal(transport.calls.length, 1);
    assert.deepEqual(transport.calls[0].refIds, [row.id]);
    assert.ok(!transport.calls[0].text.includes('old'), 'reminder lists ids, not message text');
    assert.deepEqual(await remindUnhandledClientMessages(new Date(NOW.getTime() + 3_600_000), transport), { reminded: 0 });
    assert.equal(transport.calls.length, 1);
    assert.equal(listUnhandledOlderThan(new Date(NOW.getTime() + 25 * 3_600_000).toISOString()).length, 2, 'due again a day later');
  } finally {
    delete process.env.SITE_BOT_SUPPORT_ALERT_EMAIL;
  }
});

test('21: the charge cron sends the reminder only with the flag on (dev outbox, no real email)', async () => {
  getDb().prepare(`UPDATE site_bot_client_messages SET status = 'done'`).run();
  const sub = makeSubscription();
  createClientMessage({ id: crypto.randomUUID(), subscriptionId: sub, body: 'waiting', now: new Date(NOW.getTime() - 26 * 3_600_000) });
  const reminders = () => (fs.existsSync(outboxPath) ? fs.readFileSync(outboxPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.tag === 'staff_reminder') : []);
  process.env.SITE_BOT_SUPPORT_ALERT_EMAIL = 'support-alerts@example.com';
  try {
    delete process.env.SITE_BOT_CLIENT_MESSAGES_ENABLED;
    await runChargeCron(NOW);
    assert.equal(reminders().length, 0, 'flag off: no reminder');
    process.env.SITE_BOT_CLIENT_MESSAGES_ENABLED = 'true';
    await runChargeCron(NOW);
    assert.equal(reminders().length, 1);
    assert.equal(reminders()[0].sent, false, 'stubbed to the dev outbox');
    await runChargeCron(new Date(NOW.getTime() + 3_600_000));
    assert.equal(reminders().length, 1, 'second run inside 24 hours sends none');
  } finally {
    delete process.env.SITE_BOT_SUPPORT_ALERT_EMAIL;
    delete process.env.SITE_BOT_CLIENT_MESSAGES_ENABLED;
  }
});
