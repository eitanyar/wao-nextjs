import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { addMonths } from 'date-fns';

const tmpDbPath = path.join(os.tmpdir(), `wao-billing-test-subscriptions-${crypto.randomUUID()}.db`);
process.env.BILLING_DB_PATH = tmpDbPath;
process.env.TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; // 32 zero bytes, base64, test-only
process.env.NEXT_PUBLIC_BASE_URL = 'https://wao.co.il';

import { getDb, closeDb } from './db';
import { MockPaymentProvider } from './providers/mock';
import { _resetPaymentProviderForTests } from './get-provider';
import {
  createPendingSubscription,
  applyTokenizationCallback,
  cancelSubscriptionByToken,
  getSubscriptionById,
} from './subscriptions';
import { validateAndConsumeMagicLinkToken } from './magic-link';

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

test('full signup -> tokenization callback -> subscription lands in trialing with next_charge_at exactly one calendar month out', async () => {
  const { subscriptionId } = await createPendingSubscription({
    email: 'trial-happy@example.com',
    trialAmount: 1,
    recurringAmount: 99,
  });

  const before = getSubscriptionById(subscriptionId);
  assert.strictEqual(before?.status, 'pending');

  const outcome = await applyTokenizationCallback(subscriptionId, {
    cardLast4: '4242',
    cardExpiry: '12/30',
  });
  assert.strictEqual(outcome.ok, true);

  const after = getSubscriptionById(subscriptionId);
  assert.strictEqual(after?.status, 'trialing');
  assert.ok(after?.provider_token);
  assert.strictEqual(after?.card_last4, '4242');
  assert.ok(after?.next_charge_at);

  const createdAt = new Date(after!.created_at);
  const nextChargeAt = new Date(after!.next_charge_at!);
  // The implementation uses date-fns addMonths (subscriptions.ts), which clamps
  // day overflow (e.g. Aug 31 + 1 month -> Sep 30). Plain JS setUTCMonth(+1)
  // arithmetic overflows instead (Aug 31 -> Oct 1), so it must not compute the
  // expectation on month-end run dates.
  const expected = addMonths(createdAt, 1);
  // Allow a few ms of test-execution drift, but the calendar date/month must match exactly.
  assert.strictEqual(nextChargeAt.getUTCFullYear(), expected.getUTCFullYear());
  assert.strictEqual(nextChargeAt.getUTCMonth(), expected.getUTCMonth());
  assert.strictEqual(nextChargeAt.getUTCDate(), expected.getUTCDate());

  const charge = getDb()
    .prepare(`SELECT * FROM charges WHERE subscription_id = ?`)
    .get(subscriptionId) as any;
  assert.strictEqual(charge.status, 'succeeded');
  assert.strictEqual(charge.idempotency_key, `${subscriptionId}:trial:1`);

  const events = getDb()
    .prepare(`SELECT event_type FROM subscription_events WHERE subscription_id = ? ORDER BY created_at`)
    .all(subscriptionId) as any[];
  assert.deepStrictEqual(
    events.map((e) => e.event_type),
    ['created', 'trial_charged']
  );
});

test('Jan 31 -> Feb 28 edge case: next_charge_at handles a short month correctly', async (t) => {
  // Fake "now" to Jan 31 so the callback's addMonths(now, 1) call lands on the
  // short-month edge case, instead of relying on whatever date the test
  // happens to run on.
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2027-01-31T10:00:00.000Z') });

  const { subscriptionId } = await createPendingSubscription({
    email: 'jan31@example.com',
    trialAmount: 1,
    recurringAmount: 99,
  });

  const outcome = await applyTokenizationCallback(subscriptionId, {});
  assert.strictEqual(outcome.ok, true);

  const after = getSubscriptionById(subscriptionId);
  const nextChargeAt = new Date(after!.next_charge_at!);
  // 2027 is not a leap year -> Feb has 28 days. date-fns addMonths clamps Jan 31 + 1 month -> Feb 28.
  assert.strictEqual(nextChargeAt.getUTCFullYear(), 2027);
  assert.strictEqual(nextChargeAt.getUTCMonth(), 1); // February (0-indexed)
  assert.strictEqual(nextChargeAt.getUTCDate(), 28);

  t.mock.timers.reset();
});

test('a forged/invalid callback does not create a chargeable subscription', async () => {
  const { subscriptionId } = await createPendingSubscription({
    email: 'forged@example.com',
    trialAmount: 1,
    recurringAmount: 99,
  });

  const outcome = await applyTokenizationCallback(subscriptionId, { simulateFailure: true });
  assert.strictEqual(outcome.ok, false);
  if (!outcome.ok) assert.strictEqual(outcome.reason, 'callback_invalid');

  const after = getSubscriptionById(subscriptionId);
  assert.strictEqual(after?.status, 'pending');
  assert.strictEqual(after?.provider_token, null);
  assert.strictEqual(after?.next_charge_at, null);

  const charges = getDb().prepare(`SELECT * FROM charges WHERE subscription_id = ?`).all(subscriptionId);
  assert.strictEqual(charges.length, 0);
});

test('a callback against a non-existent subscription is rejected', async () => {
  const outcome = await applyTokenizationCallback('does-not-exist', {});
  assert.strictEqual(outcome.ok, false);
  if (!outcome.ok) assert.strictEqual(outcome.reason, 'subscription_not_found');
});

test('a replayed callback against an already-resolved (non-pending) subscription is rejected', async () => {
  const { subscriptionId } = await createPendingSubscription({
    email: 'replay@example.com',
    trialAmount: 1,
    recurringAmount: 99,
  });
  await applyTokenizationCallback(subscriptionId, {});

  const replay = await applyTokenizationCallback(subscriptionId, {});
  assert.strictEqual(replay.ok, false);
  if (!replay.ok) assert.strictEqual(replay.reason, 'subscription_not_pending');
});

test('cancelSubscriptionByToken: valid token cancels successfully and clears next_charge_at', async () => {
  const { subscriptionId } = await createPendingSubscription({
    email: 'cancel-me@example.com',
    trialAmount: 1,
    recurringAmount: 99,
  });
  await applyTokenizationCallback(subscriptionId, {});

  // A fresh token was auto-generated by the callback for the confirmation email; mint another explicit one for clarity.
  const { generateMagicLinkToken } = await import('./magic-link');
  const { token } = generateMagicLinkToken(subscriptionId);

  const outcome = await cancelSubscriptionByToken(token);
  assert.strictEqual(outcome.ok, true);

  const after = getSubscriptionById(subscriptionId);
  assert.strictEqual(after?.status, 'canceled');
  assert.strictEqual(after?.next_charge_at, null);
  assert.ok(after?.canceled_at);

  const events = getDb()
    .prepare(`SELECT event_type FROM subscription_events WHERE subscription_id = ? ORDER BY created_at`)
    .all(subscriptionId) as any[];
  assert.ok(events.some((e) => e.event_type === 'canceled_by_user'));
});

test('cancelSubscriptionByToken: expired token is rejected and does not cancel', async () => {
  const { subscriptionId } = await createPendingSubscription({
    email: 'expired-cancel@example.com',
    trialAmount: 1,
    recurringAmount: 99,
  });
  await applyTokenizationCallback(subscriptionId, {});

  const { generateMagicLinkToken } = await import('./magic-link');
  const { token } = generateMagicLinkToken(subscriptionId);

  // Force-expire.
  const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  getDb()
    .prepare(`UPDATE magic_link_tokens SET expires_at = ? WHERE token_hash = ?`)
    .run(new Date(Date.now() - 1000).toISOString(), tokenHash);

  const outcome = await cancelSubscriptionByToken(token);
  assert.strictEqual(outcome.ok, false);
  if (!outcome.ok) assert.strictEqual(outcome.reason, 'invalid_token');

  const after = getSubscriptionById(subscriptionId);
  assert.strictEqual(after?.status, 'trialing');
});

test('cancelSubscriptionByToken: an already-consumed token is rejected on second use', async () => {
  const { subscriptionId } = await createPendingSubscription({
    email: 'double-use@example.com',
    trialAmount: 1,
    recurringAmount: 99,
  });
  await applyTokenizationCallback(subscriptionId, {});

  const { generateMagicLinkToken } = await import('./magic-link');
  const { token } = generateMagicLinkToken(subscriptionId);

  const first = await cancelSubscriptionByToken(token);
  assert.strictEqual(first.ok, true);

  const second = await cancelSubscriptionByToken(token);
  assert.strictEqual(second.ok, false);
  if (!second.ok) assert.strictEqual(second.reason, 'invalid_token');
});

test('cancelSubscriptionByToken: a token for subscription A cannot cancel subscription B', async () => {
  const subA = await createPendingSubscription({ email: 'a@example.com', trialAmount: 1, recurringAmount: 99 });
  const subB = await createPendingSubscription({ email: 'b@example.com', trialAmount: 1, recurringAmount: 99 });
  await applyTokenizationCallback(subA.subscriptionId, {});
  await applyTokenizationCallback(subB.subscriptionId, {});

  const { generateMagicLinkToken } = await import('./magic-link');
  const { token: tokenForA } = generateMagicLinkToken(subA.subscriptionId);

  const outcome = await cancelSubscriptionByToken(tokenForA);
  assert.strictEqual(outcome.ok, true);
  if (outcome.ok) assert.strictEqual(outcome.subscriptionId, subA.subscriptionId);

  const subBAfter = getSubscriptionById(subB.subscriptionId);
  assert.strictEqual(subBAfter?.status, 'trialing');
});

test('a canceled subscription is never charged again downstream: next_charge_at stays null even if re-queried', async () => {
  const { subscriptionId } = await createPendingSubscription({
    email: 'guard@example.com',
    trialAmount: 1,
    recurringAmount: 99,
  });
  await applyTokenizationCallback(subscriptionId, {});

  const { generateMagicLinkToken } = await import('./magic-link');
  const { token } = generateMagicLinkToken(subscriptionId);
  await cancelSubscriptionByToken(token);

  const chargeable = getDb()
    .prepare(`SELECT * FROM subscriptions WHERE id = ? AND next_charge_at IS NOT NULL`)
    .get(subscriptionId);
  assert.strictEqual(chargeable, undefined);
});
