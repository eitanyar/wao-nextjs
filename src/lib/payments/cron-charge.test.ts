import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { addDays, addMonths } from 'date-fns';

const tmpDbPath = path.join(os.tmpdir(), `wao-billing-test-cron-charge-${crypto.randomUUID()}.db`);
process.env.BILLING_DB_PATH = tmpDbPath;
process.env.TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; // 32 zero bytes, base64, test-only
process.env.NEXT_PUBLIC_BASE_URL = 'https://wao.co.il';

import { getDb, closeDb, insertSubscription, buildIdempotencyKey, type SubscriptionRow } from './db';
import { encryptToken } from './crypto';
import { MockPaymentProvider } from './providers/mock';
import { getPaymentProvider, _resetPaymentProviderForTests } from './get-provider';
import { runChargeCron, runReminderCron } from './cron-charge';

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

/** Directly inserts a subscription row (bypassing the signup/callback flow),
 * so tests can control the exact token/status/next_charge_at/failed_attempts
 * combination under test. */
function makeSubscription(overrides: Partial<SubscriptionRow> & { token: string }): SubscriptionRow {
  const id = overrides.id ?? crypto.randomUUID();
  const timestamp = isoNow();
  const row: SubscriptionRow = {
    id,
    user_id: overrides.user_id ?? `${id}@example.com`,
    status: overrides.status ?? 'trialing',
    provider: 'mock',
    provider_token: encryptToken(overrides.token),
    card_last4: '4242',
    card_expiry: '12/30',
    trial_amount: 1,
    recurring_amount: overrides.recurring_amount ?? 100,
    currency: 'ILS',
    next_charge_at: overrides.next_charge_at ?? timestamp,
    canceled_at: null,
    cancel_reason: null,
    failed_attempts: overrides.failed_attempts ?? 0,
    created_at: timestamp,
    updated_at: timestamp,
  };
  // `??` would treat an explicit `null` override (the whole point of the
  // next_charge_at=NULL pathological-row test) as "not provided" and fall
  // back to `timestamp` — use an explicit `in` check instead.
  if ('next_charge_at' in overrides) {
    row.next_charge_at = overrides.next_charge_at as string | null;
  }
  insertSubscription(getDb(), row);
  return row;
}

function getRow(id: string): SubscriptionRow {
  return getDb().prepare(`SELECT * FROM subscriptions WHERE id = ?`).get(id) as SubscriptionRow;
}

test('successful charge advances next_charge_at by exactly one calendar month and resets failed_attempts', async () => {
  const dueDate = new Date(Date.now() - 60_000).toISOString(); // 1 minute in the past -> due
  const sub = makeSubscription({ token: 'tok_mock_good_1', status: 'trialing', next_charge_at: dueDate, failed_attempts: 0 });

  const summary = await runChargeCron();
  const result = summary.results.find((r) => r.subscriptionId === sub.id);
  assert.strictEqual(result?.outcome, 'succeeded');

  const after = getRow(sub.id);
  assert.strictEqual(after.status, 'active');
  assert.strictEqual(after.failed_attempts, 0);

  const expected = addMonths(new Date(dueDate), 1).toISOString();
  assert.strictEqual(after.next_charge_at, expected);

  const charge = getDb().prepare(`SELECT * FROM charges WHERE subscription_id = ?`).get(sub.id) as any;
  assert.strictEqual(charge.status, 'succeeded');
  assert.strictEqual(charge.idempotency_key, buildIdempotencyKey(sub.id, dueDate, 1));

  const events = getDb()
    .prepare(`SELECT event_type FROM subscription_events WHERE subscription_id = ?`)
    .all(sub.id) as any[];
  assert.ok(events.some((e) => e.event_type === 'renewed'));
});

test('Jan 31 -> Feb 28 edge case in the recurring-charge cron', async () => {
  const dueDate = '2027-01-31T10:00:00.000Z';
  const sub = makeSubscription({ token: 'tok_mock_good_jan31', status: 'active', next_charge_at: dueDate });

  await runChargeCron(new Date('2027-02-01T00:00:00.000Z'));

  const after = getRow(sub.id);
  const nextChargeAt = new Date(after.next_charge_at!);
  assert.strictEqual(nextChargeAt.getUTCFullYear(), 2027);
  assert.strictEqual(nextChargeAt.getUTCMonth(), 1); // February
  assert.strictEqual(nextChargeAt.getUTCDate(), 28); // 2027 is not a leap year
});

test('retryable failure increments failed_attempts, sets past_due, and schedules a retry in 3 days', async () => {
  const now = new Date();
  const dueDate = new Date(now.getTime() - 60_000).toISOString();
  const sub = makeSubscription({
    token: MockPaymentProvider.INSUFFICIENT_FUNDS_TOKEN,
    status: 'active',
    next_charge_at: dueDate,
    failed_attempts: 0,
  });

  const summary = await runChargeCron(now);
  const result = summary.results.find((r) => r.subscriptionId === sub.id);
  assert.strictEqual(result?.outcome, 'retry_scheduled');

  const after = getRow(sub.id);
  assert.strictEqual(after.status, 'past_due');
  assert.strictEqual(after.failed_attempts, 1);

  const expectedRetry = addDays(now, 3).toISOString();
  assert.strictEqual(after.next_charge_at, expectedRetry);
});

test('third consecutive retryable failure flips to expired with next_charge_at = NULL, and the row is never charged again', async () => {
  const now = new Date();
  const dueDate = new Date(now.getTime() - 60_000).toISOString();
  const sub = makeSubscription({
    token: MockPaymentProvider.INSUFFICIENT_FUNDS_TOKEN,
    status: 'past_due',
    next_charge_at: dueDate,
    failed_attempts: 2, // this run is the 3rd attempt
  });

  const summary = await runChargeCron(now);
  const result = summary.results.find((r) => r.subscriptionId === sub.id);
  assert.strictEqual(result?.outcome, 'expired');

  const after = getRow(sub.id);
  assert.strictEqual(after.status, 'expired');
  assert.strictEqual(after.next_charge_at, null);
  assert.strictEqual(after.failed_attempts, 3);

  // Re-running the charge query must exclude this row from now on.
  const secondSummary = await runChargeCron(new Date(now.getTime() + 1000));
  assert.ok(!secondSummary.results.some((r) => r.subscriptionId === sub.id));
});

test('non-retryable failure sets past_due without scheduling an automatic retry', async () => {
  const dueDate = new Date(Date.now() - 60_000).toISOString();
  const sub = makeSubscription({
    token: MockPaymentProvider.DECLINE_TOKEN,
    status: 'active',
    next_charge_at: dueDate,
  });

  const summary = await runChargeCron();
  const result = summary.results.find((r) => r.subscriptionId === sub.id);
  assert.strictEqual(result?.outcome, 'failed_non_retryable');

  const after = getRow(sub.id);
  assert.strictEqual(after.status, 'past_due');
  assert.strictEqual(after.next_charge_at, null);
});

test('a subscription with next_charge_at = NULL is never charged regardless of status', async () => {
  const sub = makeSubscription({
    token: 'tok_mock_good_null_next_charge',
    status: 'active',
    next_charge_at: null,
  });

  const summary = await runChargeCron();
  assert.ok(!summary.results.some((r) => r.subscriptionId === sub.id));

  const after = getRow(sub.id);
  assert.strictEqual(after.status, 'active');
  assert.strictEqual(after.next_charge_at, null);
});

test('idempotency: a pre-existing succeeded charge row for the computed key prevents a duplicate provider call', async () => {
  const dueDate = new Date(Date.now() - 60_000).toISOString();
  const sub = makeSubscription({
    token: 'tok_mock_good_idempotent',
    status: 'trialing',
    next_charge_at: dueDate,
    failed_attempts: 0,
  });

  const idempotencyKey = buildIdempotencyKey(sub.id, dueDate, 1);
  getDb()
    .prepare(
      `INSERT INTO charges (id, subscription_id, idempotency_key, amount, status, attempt_number, provider_transaction_id, error_code, error_message, invoice_id, charged_at, created_at)
       VALUES (@id, @subscription_id, @idempotency_key, @amount, 'succeeded', 1, 'mock_txn_preexisting', NULL, NULL, NULL, @charged_at, @created_at)`
    )
    .run({
      id: crypto.randomUUID(),
      subscription_id: sub.id,
      idempotency_key: idempotencyKey,
      amount: 100,
      charged_at: isoNow(),
      created_at: isoNow(),
    });

  // Spy on the provider instance to assert chargeToken is never invoked.
  const provider = getPaymentProvider() as MockPaymentProvider;
  let chargeTokenCalls = 0;
  const originalChargeToken = provider.chargeToken.bind(provider);
  (provider as any).chargeToken = async (...args: Parameters<typeof originalChargeToken>) => {
    chargeTokenCalls++;
    return originalChargeToken(...args);
  };

  const summary = await runChargeCron();
  const result = summary.results.find((r) => r.subscriptionId === sub.id);
  assert.strictEqual(result?.outcome, 'skipped_idempotent');
  assert.strictEqual(chargeTokenCalls, 0);
});

test('reminder cron sends exactly one reminder per subscription across two consecutive runs', async () => {
  const now = new Date();
  const chargeDate = addDays(now, 4).toISOString(); // inside the 3-5 day window
  const sub = makeSubscription({ token: 'tok_mock_good_reminder', status: 'trialing', next_charge_at: chargeDate });

  const first = await runReminderCron(now);
  assert.strictEqual(first.sent, 1);
  assert.strictEqual(first.skippedAlreadySent, 0);

  const second = await runReminderCron(now);
  assert.strictEqual(second.sent, 0);
  assert.strictEqual(second.skippedAlreadySent, 1);

  const events = getDb()
    .prepare(`SELECT event_type FROM subscription_events WHERE subscription_id = ? AND event_type = 'reminder_sent'`)
    .all(sub.id) as any[];
  assert.strictEqual(events.length, 1);
});

test('reminder cron ignores subscriptions outside the 3-5 day window', async () => {
  const now = new Date();
  const tooSoon = addDays(now, 1).toISOString();
  const tooFar = addDays(now, 10).toISOString();
  const subTooSoon = makeSubscription({ token: 'tok_mock_good_too_soon', status: 'trialing', next_charge_at: tooSoon });
  const subTooFar = makeSubscription({ token: 'tok_mock_good_too_far', status: 'trialing', next_charge_at: tooFar });

  await runReminderCron(now);

  const events = getDb()
    .prepare(
      `SELECT subscription_id FROM subscription_events
       WHERE event_type = 'reminder_sent' AND subscription_id IN (?, ?)`
    )
    .all(subTooSoon.id, subTooFar.id);
  assert.strictEqual(events.length, 0);
});
