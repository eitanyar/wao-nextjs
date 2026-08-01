import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const tmpDbPath = path.join(os.tmpdir(), `wao-billing-test-cron-card-expiry-${crypto.randomUUID()}.db`);
process.env.BILLING_DB_PATH = tmpDbPath;
process.env.TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; // 32 zero bytes, base64, test-only
process.env.NEXT_PUBLIC_BASE_URL = 'https://wao.co.il';

import { getDb, closeDb, insertSubscription, type SubscriptionRow } from './db';
import { encryptToken } from './crypto';
import { _resetPaymentProviderForTests } from './get-provider';
import { runCardExpiryNoticeCron } from './cron-card-expiry';

test.beforeEach(() => {
  _resetPaymentProviderForTests();
});

test.after(() => {
  closeDb();
  try {
    fs.unlinkSync(tmpDbPath);
    fs.unlinkSync(`${tmpDbPath}-wal`);
    fs.unlinkSync(`${tmpDbPath}-shm`);
  } catch {
    // best-effort cleanup
  }
});

function isoNow(): string {
  return new Date().toISOString();
}

function makeSubscription(overrides: Partial<SubscriptionRow> & { token: string }): SubscriptionRow {
  const id = overrides.id ?? crypto.randomUUID();
  const timestamp = isoNow();
  const row: SubscriptionRow = {
    id,
    user_id: overrides.user_id ?? `${id}@example.com`,
    status: overrides.status ?? 'active',
    provider: 'mock',
    provider_token: encryptToken(overrides.token),
    card_last4: '4242',
    card_expiry: overrides.card_expiry ?? '12/30',
    trial_amount: 1,
    recurring_amount: overrides.recurring_amount ?? 100,
    currency: 'ILS',
    next_charge_at: overrides.next_charge_at ?? timestamp,
    canceled_at: null,
    cancel_reason: null,
    failed_attempts: overrides.failed_attempts ?? 0,
    created_at: timestamp,
    updated_at: timestamp,
    joined_at: overrides.joined_at ?? timestamp,
    extended_cancellation_flag: overrides.extended_cancellation_flag ?? null,
    extended_flag_basis: overrides.extended_flag_basis ?? null,
  };
  insertSubscription(getDb(), row);
  return row;
}

function mmYY(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear() % 100).padStart(2, '0');
  return `${month}/${year}`;
}

test('a subscription whose card expires THIS calendar month gets exactly one notice, and a second run in the same month does not re-send it', async () => {
  const now = new Date('2027-03-15T12:00:00.000Z');
  const sub = makeSubscription({ token: 'tok_mock_expiring_this_month', status: 'active', card_expiry: mmYY(now) });

  const first = await runCardExpiryNoticeCron(now);
  assert.strictEqual(first.sent, 1);
  assert.strictEqual(first.skippedAlreadySent, 0);

  const second = await runCardExpiryNoticeCron(new Date(now.getTime() + 1000));
  assert.strictEqual(second.sent, 0);
  assert.strictEqual(second.skippedAlreadySent, 1);

  const events = getDb()
    .prepare(`SELECT * FROM subscription_events WHERE subscription_id = ? AND event_type = 'card_expiry_notice_sent'`)
    .all(sub.id) as any[];
  assert.strictEqual(events.length, 1);
});

test('a subscription whose card expires NEXT calendar month is also a candidate', async () => {
  const now = new Date('2027-03-15T12:00:00.000Z');
  const nextMonth = new Date(Date.UTC(2027, 3, 1)); // April 2027
  const sub = makeSubscription({ token: 'tok_mock_expiring_next_month', status: 'trialing', card_expiry: mmYY(nextMonth) });

  const summary = await runCardExpiryNoticeCron(now);
  assert.strictEqual(summary.sent, 1);

  const events = getDb()
    .prepare(`SELECT * FROM subscription_events WHERE subscription_id = ? AND event_type = 'card_expiry_notice_sent'`)
    .all(sub.id) as any[];
  assert.strictEqual(events.length, 1);
});

test('a subscription whose card expires further out (not this/next month) is not notified', async () => {
  const now = new Date('2027-03-15T12:00:00.000Z');
  const farOut = new Date(Date.UTC(2027, 8, 1)); // September 2027
  const sub = makeSubscription({ token: 'tok_mock_expiring_far', status: 'active', card_expiry: mmYY(farOut) });

  const summary = await runCardExpiryNoticeCron(now);

  const events = getDb()
    .prepare(`SELECT * FROM subscription_events WHERE subscription_id = ? AND event_type = 'card_expiry_notice_sent'`)
    .all(sub.id) as any[];
  assert.strictEqual(events.length, 0);
  assert.ok(!summary || summary.candidates >= 0); // sanity — summary always returns
});

test('a canceled/expired/pending subscription is never a candidate regardless of card_expiry', async () => {
  const now = new Date('2027-03-15T12:00:00.000Z');
  const canceled = makeSubscription({ token: 'tok_mock_canceled', status: 'canceled', card_expiry: mmYY(now) });
  const expired = makeSubscription({ token: 'tok_mock_expired', status: 'expired', card_expiry: mmYY(now) });
  const pending = makeSubscription({ token: 'tok_mock_pending', status: 'pending', card_expiry: null as any });

  await runCardExpiryNoticeCron(now);

  const events = getDb()
    .prepare(
      `SELECT subscription_id FROM subscription_events
       WHERE event_type = 'card_expiry_notice_sent' AND subscription_id IN (?, ?, ?)`
    )
    .all(canceled.id, expired.id, pending.id);
  assert.strictEqual(events.length, 0);
});

test('rolling into a new calendar month allows a fresh notice for a card expiring the following month', async () => {
  const march = new Date('2027-03-30T12:00:00.000Z');
  const may = new Date(Date.UTC(2027, 4, 1)); // May 2027
  const sub = makeSubscription({ token: 'tok_mock_rolling', status: 'active', card_expiry: mmYY(may) });

  function noticeEventsFor(subId: string): any[] {
    return getDb()
      .prepare(`SELECT * FROM subscription_events WHERE subscription_id = ? AND event_type = 'card_expiry_notice_sent'`)
      .all(subId) as any[];
  }

  // Not yet a candidate in March (May is 2 months out).
  await runCardExpiryNoticeCron(march);
  assert.strictEqual(noticeEventsFor(sub.id).length, 0);

  // In April, May is "next month" -> candidate, sent once.
  const april = new Date('2027-04-05T12:00:00.000Z');
  await runCardExpiryNoticeCron(april);
  assert.strictEqual(noticeEventsFor(sub.id).length, 1);

  // A second run still in April does not re-send.
  await runCardExpiryNoticeCron(new Date('2027-04-20T12:00:00.000Z'));
  assert.strictEqual(noticeEventsFor(sub.id).length, 1);
});
