import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const tmpDbPath = path.join(os.tmpdir(), `wao-billing-test-card-update-${crypto.randomUUID()}.db`);
process.env.BILLING_DB_PATH = tmpDbPath;
process.env.TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; // 32 zero bytes, base64, test-only
process.env.NEXT_PUBLIC_BASE_URL = 'https://wao.co.il';

import { getDb, closeDb, insertSubscription, type SubscriptionRow } from './db';
import { encryptToken, decryptToken } from './crypto';
import { _resetPaymentProviderForTests } from './get-provider';
import { generateMagicLinkToken, peekMagicLinkToken } from './magic-link';
import { createCardUpdateSession, applyCardUpdateCallback } from './card-update';
import { chargeOneSubscription } from './cron-charge';

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
  if ('next_charge_at' in overrides) {
    row.next_charge_at = overrides.next_charge_at as string | null;
  }
  insertSubscription(getDb(), row);
  return row;
}

function getRow(id: string): SubscriptionRow {
  return getDb().prepare(`SELECT * FROM subscriptions WHERE id = ?`).get(id) as SubscriptionRow;
}

test('session creation + callback replaces provider_token/card_last4/card_expiry and records a card_updated event', async () => {
  const sub = makeSubscription({ token: 'tok_mock_old_card', status: 'active' });
  const { token: mlt } = generateMagicLinkToken(sub.id);

  const session = await createCardUpdateSession(mlt);
  assert.strictEqual(session.ok, true);
  if (session.ok) assert.ok(session.redirectUrl.length > 0);

  const outcome = await applyCardUpdateCallback(sub.id, mlt, {
    token: 'tok_mock_new_card',
    cardLast4: '9999',
    cardExpiry: '11/31',
  });
  assert.strictEqual(outcome.ok, true);
  if (outcome.ok) {
    assert.strictEqual(outcome.recharged, false); // subscription was 'active', not past_due
    assert.ok(outcome.freshToken);
  }

  const after = getRow(sub.id);
  assert.strictEqual(after.card_last4, '9999');
  assert.strictEqual(after.card_expiry, '11/31');
  assert.strictEqual(decryptToken(after.provider_token!), 'tok_mock_new_card');

  const events = getDb()
    .prepare(`SELECT event_type FROM subscription_events WHERE subscription_id = ?`)
    .all(sub.id) as any[];
  assert.ok(events.some((e) => e.event_type === 'card_updated'));

  // The original magic-link token must be consumed (single-use) after a successful swap.
  const peekAfter = peekMagicLinkToken(mlt);
  assert.strictEqual(peekAfter.valid, false);
});

test('createCardUpdateSession only peeks the token — an abandoned session does not consume it', async () => {
  const sub = makeSubscription({ token: 'tok_mock_abandon', status: 'active' });
  const { token: mlt } = generateMagicLinkToken(sub.id);

  await createCardUpdateSession(mlt);

  const peek = peekMagicLinkToken(mlt);
  assert.strictEqual(peek.valid, true);
});

test('a past_due subscription that successfully updates its card is immediately recharged via the shared chargeOneSubscription helper and returns to active with a fresh next_charge_at', async () => {
  const sub = makeSubscription({
    token: 'tok_mock_decline_original',
    status: 'past_due',
    next_charge_at: null,
    failed_attempts: 0,
  });
  const { token: mlt } = generateMagicLinkToken(sub.id);

  await createCardUpdateSession(mlt);
  const outcome = await applyCardUpdateCallback(sub.id, mlt, {
    token: 'tok_mock_good_after_card_update',
    cardLast4: '1111',
    cardExpiry: '10/29',
  });

  assert.strictEqual(outcome.ok, true);
  if (outcome.ok) {
    assert.strictEqual(outcome.recharged, true);
    assert.strictEqual(outcome.rechargeOutcome, 'succeeded');
  }

  const after = getRow(sub.id);
  assert.strictEqual(after.status, 'active');
  assert.ok(after.next_charge_at, 'a fresh next_charge_at must be set after the immediate recharge');
  assert.strictEqual(after.card_last4, '1111');

  const charge = getDb().prepare(`SELECT * FROM charges WHERE subscription_id = ? AND status = 'succeeded'`).get(sub.id) as any;
  assert.ok(charge, 'the recharge must go through the same insertCharge path chargeOneSubscription uses');

  const renewedEvent = getDb()
    .prepare(`SELECT * FROM subscription_events WHERE subscription_id = ? AND event_type = 'renewed'`)
    .get(sub.id);
  assert.ok(renewedEvent, 'chargeOneSubscription must have recorded its usual "renewed" event — proof this is the same code path as the cron');
});

test('a past_due subscription whose new card also fails to charge stays non-active, following the same retry/expire logic the cron would', async () => {
  const sub = makeSubscription({
    token: 'tok_mock_decline_original_2',
    status: 'past_due',
    next_charge_at: null,
    failed_attempts: 0,
  });
  const { token: mlt } = generateMagicLinkToken(sub.id);

  await createCardUpdateSession(mlt);
  const outcome = await applyCardUpdateCallback(sub.id, mlt, {
    token: 'tok_mock_insufficient_funds', // MockPaymentProvider.INSUFFICIENT_FUNDS_TOKEN — retryable failure
    cardLast4: '2222',
    cardExpiry: '09/29',
  });

  assert.strictEqual(outcome.ok, true);
  if (outcome.ok) {
    assert.strictEqual(outcome.recharged, false);
    assert.strictEqual(outcome.rechargeOutcome, 'retry_scheduled');
  }

  const after = getRow(sub.id);
  // The card itself WAS swapped (card_updated always applies regardless of recharge outcome).
  assert.strictEqual(after.card_last4, '2222');
  assert.strictEqual(after.status, 'past_due');
  assert.ok(after.next_charge_at, 'retry_scheduled sets a new next_charge_at 3 days out');
});

test('a forged/invalid card-update callback does not mutate subscription state', async () => {
  const sub = makeSubscription({ token: 'tok_mock_untouched', status: 'active' });
  const { token: mlt } = generateMagicLinkToken(sub.id);

  await createCardUpdateSession(mlt);
  const outcome = await applyCardUpdateCallback(sub.id, mlt, { simulateFailure: true });

  assert.strictEqual(outcome.ok, false);
  if (!outcome.ok) assert.strictEqual(outcome.reason, 'callback_invalid');

  const after = getRow(sub.id);
  assert.strictEqual(after.card_last4, '4242');
  assert.strictEqual(after.card_expiry, '12/30');
  assert.strictEqual(decryptToken(after.provider_token!), 'tok_mock_untouched');

  const events = getDb()
    .prepare(`SELECT event_type FROM subscription_events WHERE subscription_id = ?`)
    .all(sub.id) as any[];
  assert.ok(!events.some((e) => e.event_type === 'card_updated'));

  // A failed callback must not burn the magic-link token — the customer can retry.
  const peek = peekMagicLinkToken(mlt);
  assert.strictEqual(peek.valid, true);
});

test('a card-update callback with an already-consumed/invalid magic-link token is rejected and does not mutate state', async () => {
  const sub = makeSubscription({ token: 'tok_mock_replay_guard', status: 'active' });
  const { token: mlt } = generateMagicLinkToken(sub.id);

  // First (legitimate) use consumes it.
  await createCardUpdateSession(mlt);
  const first = await applyCardUpdateCallback(sub.id, mlt, { token: 'tok_mock_first_swap', cardLast4: '5555', cardExpiry: '08/28' });
  assert.strictEqual(first.ok, true);

  // A second callback replaying the SAME token must be rejected without mutating anything further.
  const replay = await applyCardUpdateCallback(sub.id, mlt, { token: 'tok_mock_replayed_swap', cardLast4: '6666', cardExpiry: '07/27' });
  assert.strictEqual(replay.ok, false);
  if (!replay.ok) assert.strictEqual(replay.reason, 'token_invalid');

  const after = getRow(sub.id);
  assert.strictEqual(after.card_last4, '5555'); // unchanged by the replay
});

test('sanity: chargeOneSubscription is a single shared implementation importable from cron-charge.ts', () => {
  assert.strictEqual(typeof chargeOneSubscription, 'function');
});

test('the recharge idempotency key follows the exact same buildIdempotencyKey convention the cron uses', async () => {
  const sub = makeSubscription({
    token: 'tok_mock_decline_original_3',
    status: 'past_due',
    next_charge_at: null,
    failed_attempts: 1, // simulate a subscription that already had one prior retryable failure before going non-retryable/past_due
  });
  const { token: mlt } = generateMagicLinkToken(sub.id);

  await createCardUpdateSession(mlt);
  await applyCardUpdateCallback(sub.id, mlt, { token: 'tok_mock_good_key_check', cardLast4: '3333', cardExpiry: '06/26' });

  const after = getRow(sub.id);
  const charge = getDb().prepare(`SELECT * FROM charges WHERE subscription_id = ? AND status = 'succeeded'`).get(sub.id) as any;
  // attemptNumber = failed_attempts (1, left untouched by the original non-retryable failure) + 1 = 2.
  // billingPeriodStartDate = the next_charge_at this module set to "now" right before calling chargeOneSubscription,
  // which chargeOneSubscription then advances by one month on success.
  const expectedPrefix = `${sub.id}:`;
  assert.ok(charge.idempotency_key.startsWith(expectedPrefix));
  assert.ok(charge.idempotency_key.endsWith(':2'));
});
