// Site-Bot plan through the recurring engine: no trial, sign-up charge, anchored monthly billing, 3 retries over 7 days
// then pause. Every date is driven by an explicit fake clock (the engine's `now` argument). HEBREW-SAFETY: zero Hebrew.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const tmpDbPath = path.join(os.tmpdir(), `wao-billing-test-plan-${crypto.randomUUID()}.db`);
process.env.BILLING_DB_PATH = tmpDbPath;
process.env.TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; // 32 zero bytes, base64, test-only
process.env.NEXT_PUBLIC_BASE_URL = 'https://wao.co.il';

import { getDb, closeDb, type SubscriptionRow } from './db';
import { encryptToken } from './crypto';
import { MockPaymentProvider } from './providers/mock';
import { _resetPaymentProviderForTests } from './get-provider';
import { SITE_BOT_PLAN, planChargeAmount } from './plans';
import { activatePlanSubscription, createPendingPlanSubscription, getSubscriptionById, planChargeDate } from './subscriptions';
import { runChargeCron } from './cron-charge';

test.beforeEach(() => _resetPaymentProviderForTests());
test.after(() => {
  closeDb();
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${tmpDbPath}${suffix}`, { force: true });
});

const DAY = 24 * 60 * 60 * 1000;
const at = (iso: string) => new Date(iso);
const plus = (date: Date, days: number) => new Date(date.getTime() + days * DAY);

async function activeSiteBot(signup: Date, token?: string): Promise<SubscriptionRow> {
  const { subscriptionId } = await createPendingPlanSubscription({
    plan: SITE_BOT_PLAN, userId: `${crypto.randomUUID()}@example.com`, returnUrl: 'https://wao.co.il/site-bot/pay/x', now: signup,
  });
  const outcome = await activatePlanSubscription(subscriptionId, { sessionId: 'x' }, signup);
  assert.deepEqual(outcome, { ok: true, subscriptionId, alreadyActive: false });
  if (token) getDb().prepare(`UPDATE subscriptions SET provider_token = ? WHERE id = ?`).run(encryptToken(token), subscriptionId);
  return getSubscriptionById(subscriptionId)!;
}

function charges(id: string) {
  return getDb().prepare(`SELECT amount, status, attempt_number FROM charges WHERE subscription_id = ? ORDER BY created_at, attempt_number`).all(id) as Array<{ amount: number; status: string; attempt_number: number }>;
}
function events(id: string): string[] {
  return (getDb().prepare(`SELECT event_type FROM subscription_events WHERE subscription_id = ? ORDER BY rowid`).all(id) as Array<{ event_type: string }>).map(e => e.event_type);
}

test('pending row snapshots the plan; nothing is charged at init', async () => {
  const now = at('2026-11-11T09:00:00.000Z');
  const { subscriptionId } = await createPendingPlanSubscription({ plan: SITE_BOT_PLAN, userId: 'a@example.com', returnUrl: 'https://wao.co.il/r', now });
  const row = getSubscriptionById(subscriptionId)!;
  assert.equal(row.status, 'pending');
  assert.equal(row.plan, 'site-bot');
  assert.equal(row.net_amount, 199);
  assert.equal(row.vat_mode, 'added');
  assert.equal(row.vat_rate, 0.18);
  assert.equal(row.recurring_amount, planChargeAmount(SITE_BOT_PLAN));
  assert.equal(row.trial_amount, null, 'no trial');
  assert.equal(row.billing_interval, 'month');
  assert.equal(row.next_charge_at, null);
  assert.equal(row.periods_paid, 0);
  assert.equal(row.joined_at, now.toISOString());
  assert.deepEqual(charges(subscriptionId), []);
});

test('activation: the sign-up charge is the full VAT-inclusive price today; next charge one month later; replay is a no-op', async () => {
  const signup = at('2026-11-11T09:00:00.000Z');
  const row = await activeSiteBot(signup);
  assert.equal(row.status, 'active');
  assert.equal(row.billing_anchor_at, signup.toISOString());
  assert.equal(row.next_charge_at, '2026-12-11T09:00:00.000Z');
  assert.equal(row.periods_paid, 1);
  assert.ok(row.provider_token && row.card_last4 === '4242');
  assert.deepEqual(charges(row.id), [{ amount: 234.82, status: 'succeeded', attempt_number: 1 }]);
  assert.deepEqual(events(row.id), ['created', 'plan_charged']);
  // A replayed callback never charges twice.
  assert.deepEqual(await activatePlanSubscription(row.id, { sessionId: 'x' }, plus(signup, 1)), { ok: true, subscriptionId: row.id, alreadyActive: true });
  assert.equal(charges(row.id).length, 1);
});

test('activation: an invalid callback or a failed sign-up charge leaves the row pending and uncharged-forward', async () => {
  const now = at('2026-11-11T09:00:00.000Z');
  const { subscriptionId } = await createPendingPlanSubscription({ plan: SITE_BOT_PLAN, userId: 'b@example.com', returnUrl: 'https://wao.co.il/r', now });
  assert.deepEqual(await activatePlanSubscription(subscriptionId, { simulateFailure: true }, now), { ok: false, reason: 'callback_invalid' });
  assert.deepEqual(await activatePlanSubscription(subscriptionId, { token: MockPaymentProvider.DECLINE_TOKEN }, now), { ok: false, reason: 'charge_failed', retryable: false });
  let row = getSubscriptionById(subscriptionId)!;
  assert.equal(row.status, 'pending');
  assert.equal(row.next_charge_at, null);
  // The customer tries again with a good card: a new attempt (own idempotency key) succeeds.
  assert.equal((await activatePlanSubscription(subscriptionId, { sessionId: 'x' }, now)).ok, true);
  row = getSubscriptionById(subscriptionId)!;
  assert.equal(row.status, 'active');
  assert.deepEqual(charges(subscriptionId).map(c => [c.status, c.attempt_number]), [['failed', 1], ['succeeded', 2]]);
  assert.deepEqual(await activatePlanSubscription(crypto.randomUUID(), {}, now), { ok: false, reason: 'subscription_not_found' });
});

test('monthly renewals stay on the sign-up day (Jan 31 -> Feb 28 -> Mar 31), not drifting with the clamp', async () => {
  const signup = at('2027-01-31T10:00:00.000Z');
  const row = await activeSiteBot(signup);
  assert.equal(row.next_charge_at, '2027-02-28T10:00:00.000Z');
  const feb = await runChargeCron(at('2027-02-28T12:00:00.000Z'));
  assert.deepEqual(feb.results.filter(r => r.subscriptionId === row.id).map(r => r.outcome), ['succeeded']);
  assert.equal(getSubscriptionById(row.id)!.next_charge_at, '2027-03-31T10:00:00.000Z');
  assert.equal(getSubscriptionById(row.id)!.periods_paid, 2);
  assert.equal(planChargeDate(signup.toISOString(), 3), '2027-04-30T10:00:00.000Z');
});

test('dunning: 3 retries at +2/+4/+7 days from the first failure, then paused and never charged again', async () => {
  const signup = at('2026-11-11T09:00:00.000Z');
  const row = await activeSiteBot(signup, MockPaymentProvider.INSUFFICIENT_FUNDS_TOKEN);
  const due = at(row.next_charge_at!); // 2026-12-11T09:00Z
  const outcome = async (now: Date) => (await runChargeCron(now)).results.filter(r => r.subscriptionId === row.id).map(r => r.outcome);

  // The cron runs late on every pass (an hour after due): offsets are still measured from the first failure.
  const first = new Date(due.getTime() + 60 * 60 * 1000);
  assert.deepEqual(await outcome(first), ['retry_scheduled']);
  let r = getSubscriptionById(row.id)!;
  assert.equal(r.status, 'past_due');
  assert.equal(r.dunning_started_at, first.toISOString());
  assert.equal(r.next_charge_at, plus(first, 2).toISOString());

  assert.deepEqual(await outcome(plus(first, 1)), [], 'not due before the retry date');
  assert.deepEqual(await outcome(new Date(plus(first, 2).getTime() + 3600_000)), ['retry_scheduled']);
  assert.equal(getSubscriptionById(row.id)!.next_charge_at, plus(first, 4).toISOString());
  assert.deepEqual(await outcome(new Date(plus(first, 4).getTime() + 3600_000)), ['retry_scheduled']);
  assert.equal(getSubscriptionById(row.id)!.next_charge_at, plus(first, 7).toISOString(), 'third retry on day 7');
  assert.deepEqual(await outcome(new Date(plus(first, 7).getTime() + 3600_000)), ['paused']);

  r = getSubscriptionById(row.id)!;
  assert.equal(r.status, 'paused');
  assert.equal(r.next_charge_at, null);
  assert.ok(r.paused_at);
  assert.equal(r.failed_attempts, 4, 'the original attempt + 3 retries');
  assert.deepEqual(charges(row.id).map(c => c.status), ['succeeded', 'failed', 'failed', 'failed', 'failed']);
  assert.deepEqual(events(row.id).slice(-1), ['paused']);
  assert.deepEqual(await outcome(plus(first, 40)), [], 'a paused row is never picked up by the cron');
});

test('dunning: a retry that succeeds resumes on the sign-up anchor (the billing day does not move)', async () => {
  const signup = at('2026-11-11T09:00:00.000Z');
  const row = await activeSiteBot(signup, MockPaymentProvider.NETWORK_ERROR_TOKEN);
  const first = at('2026-12-11T09:30:00.000Z');
  assert.deepEqual((await runChargeCron(first)).results.filter(x => x.subscriptionId === row.id).map(x => x.outcome), ['retry_scheduled']);
  getDb().prepare(`UPDATE subscriptions SET provider_token = ? WHERE id = ?`).run(encryptToken('tok_mock_good'), row.id);
  const retry = plus(first, 2);
  assert.deepEqual((await runChargeCron(retry)).results.filter(x => x.subscriptionId === row.id).map(x => x.outcome), ['succeeded']);
  const r = getSubscriptionById(row.id)!;
  assert.equal(r.status, 'active');
  assert.equal(r.failed_attempts, 0);
  assert.equal(r.dunning_started_at, null);
  assert.equal(r.periods_paid, 2);
  assert.equal(r.next_charge_at, '2027-01-11T09:00:00.000Z', 'next charge on the sign-up day, not retry date + 1 month');
});
