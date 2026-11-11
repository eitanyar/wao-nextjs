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
// Hermetic: never send real email from a test run, even if the shell exports a Resend key (email.ts reads it per call).
delete process.env.RESEND_API_KEY;
process.env.NEXT_PUBLIC_BASE_URL = 'https://wao.co.il';

import { getDb, closeDb, type SubscriptionRow } from './db';
import { encryptToken } from './crypto';
import { MockPaymentProvider } from './providers/mock';
import { _resetPaymentProviderForTests } from './get-provider';
import { SITE_BOT_PLAN, planChargeAmount } from './plans';
import {
  activatePlanSubscription,
  applyTokenizationCallback,
  cancelSubscriptionByToken,
  createPendingPlanSubscription,
  createPendingSubscription,
  finalizeScheduledCancellations,
  getSubscriptionById,
  planChargeDate,
  planPaidThrough,
  subscriptionHasAccess,
} from './subscriptions';
import { runChargeCron } from './cron-charge';
import { generateMagicLinkToken } from './magic-link';
import { createCardUpdateSession } from './card-update';

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

// ---------------------------------------------------------------------------------------------------------------------
// Self-serve cancel (approved terms 2026-11-07): online, effective at the end of the paid month, no further charge.
// ---------------------------------------------------------------------------------------------------------------------

const cancelAt = (id: string, now: Date) => cancelSubscriptionByToken(generateMagicLinkToken(id).token, now);
const cronFor = async (id: string, now: Date) => {
  const summary = await runChargeCron(now);
  return { outcomes: summary.results.filter(r => r.subscriptionId === id).map(r => r.outcome), effective: summary.cancellationsEffective.includes(id) };
};

test('cancel mid-period: no further charge, access until the paid-through date, then canceled by the cron', async () => {
  const signup = at('2026-11-11T09:00:00.000Z');
  const row = await activeSiteBot(signup);
  const requested = at('2026-11-20T15:00:00.000Z');

  const outcome = await cancelAt(row.id, requested);
  assert.deepEqual(outcome, { ok: true, subscriptionId: row.id, cancelAtPeriodEnd: true, effectiveAt: '2026-12-11T09:00:00.000Z' });
  let r = getSubscriptionById(row.id)!;
  assert.equal(r.status, 'active', 'still active: the month is paid for');
  assert.equal(r.cancel_at_period_end, 1);
  assert.equal(r.cancel_effective_at, '2026-12-11T09:00:00.000Z');
  assert.equal(r.next_charge_at, null, 'nothing scheduled to charge');
  assert.equal(r.canceled_at, requested.toISOString());
  assert.equal(r.cancel_reason, 'self_serve_magic_link');
  assert.deepEqual(events(row.id), ['created', 'plan_charged', 'cancel_scheduled']);
  assert.equal(subscriptionHasAccess(r, at('2026-12-11T08:59:59.000Z')), true);
  assert.equal(subscriptionHasAccess(r, at('2026-12-11T09:00:00.000Z')), false);

  // A cron run before the period ends: no charge, still active.
  assert.deepEqual(await cronFor(row.id, at('2026-12-01T03:00:00.000Z')), { outcomes: [], effective: false });
  assert.equal(getSubscriptionById(row.id)!.status, 'active');
  // The cron on (and after) the date the renewal would have been: no charge, the cancellation takes effect.
  assert.deepEqual(await cronFor(row.id, at('2026-12-11T10:00:00.000Z')), { outcomes: [], effective: true });
  r = getSubscriptionById(row.id)!;
  assert.equal(r.status, 'canceled');
  assert.equal(r.next_charge_at, null);
  assert.equal(subscriptionHasAccess(r, at('2026-12-11T10:00:00.000Z')), false);
  assert.deepEqual(events(row.id).slice(-1), ['cancellation_effective']);
  // Later passes: nothing, ever (finalized once).
  for (const later of ['2026-12-12T03:00:00.000Z', '2027-01-11T09:30:00.000Z', '2027-06-11T09:30:00.000Z']) {
    assert.deepEqual(await cronFor(row.id, at(later)), { outcomes: [], effective: false }, later);
  }
  assert.deepEqual(finalizeScheduledCancellations(at('2027-07-01T00:00:00.000Z')).filter(id => id === row.id), []);
  assert.deepEqual(charges(row.id), [{ amount: 234.82, status: 'succeeded', attempt_number: 1 }], 'only the sign-up charge');
  assert.equal(events(row.id).filter(e => e === 'cancellation_effective').length, 1);
});

test('cancel: a second request is already_canceled (scheduled or done); card update is refused once cancelled', async () => {
  const signup = at('2026-11-11T09:00:00.000Z');
  const row = await activeSiteBot(signup);
  assert.equal((await cancelAt(row.id, at('2026-11-12T09:00:00.000Z'))).ok, true);
  assert.deepEqual(await cancelAt(row.id, at('2026-11-13T09:00:00.000Z')), { ok: false, reason: 'already_canceled' });
  assert.deepEqual(await createCardUpdateSession(generateMagicLinkToken(row.id).token), { ok: false, reason: 'subscription_canceled' });
  assert.equal(getSubscriptionById(row.id)!.cancel_effective_at, '2026-12-11T09:00:00.000Z', 'second request changes nothing');
  await runChargeCron(at('2026-12-11T09:00:00.000Z'));
  assert.equal(getSubscriptionById(row.id)!.status, 'canceled');
  assert.deepEqual(await cancelAt(row.id, at('2026-12-20T09:00:00.000Z')), { ok: false, reason: 'already_canceled' });
});

test('cancel after a renewal: effective at the end of the period just paid (anchor + periods_paid, Jan 31 clamp)', async () => {
  const signup = at('2027-01-31T10:00:00.000Z');
  const row = await activeSiteBot(signup);
  assert.deepEqual((await cronFor(row.id, at('2027-02-28T12:00:00.000Z'))).outcomes, ['succeeded']);
  const outcome = await cancelAt(row.id, at('2027-03-05T08:00:00.000Z'));
  assert.deepEqual(outcome, { ok: true, subscriptionId: row.id, cancelAtPeriodEnd: true, effectiveAt: '2027-03-31T10:00:00.000Z' });
  assert.equal(planPaidThrough(getSubscriptionById(row.id)!), '2027-03-31T10:00:00.000Z');
  assert.deepEqual(await cronFor(row.id, at('2027-03-31T09:59:00.000Z')), { outcomes: [], effective: false });
  assert.deepEqual(await cronFor(row.id, at('2027-03-31T10:00:00.000Z')), { outcomes: [], effective: true });
  assert.deepEqual(charges(row.id).map(c => c.status), ['succeeded', 'succeeded']);
});

test('cancel when the paid period is already over (dunning / paused): canceled at once, never charged again', async () => {
  const signup = at('2026-11-11T09:00:00.000Z');
  const dunning = await activeSiteBot(signup, MockPaymentProvider.INSUFFICIENT_FUNDS_TOKEN);
  const first = at('2026-12-11T10:00:00.000Z');
  assert.deepEqual((await cronFor(dunning.id, first)).outcomes, ['retry_scheduled']);
  const now = plus(first, 1);
  assert.deepEqual(await cancelAt(dunning.id, now), { ok: true, subscriptionId: dunning.id, cancelAtPeriodEnd: false, effectiveAt: now.toISOString() });
  let r = getSubscriptionById(dunning.id)!;
  assert.equal(r.status, 'canceled');
  assert.equal(r.next_charge_at, null);
  assert.equal(r.cancel_at_period_end, null);
  assert.deepEqual((await cronFor(dunning.id, plus(first, 2))).outcomes, [], 'the +2 day retry never runs');

  const paused = await activeSiteBot(signup, MockPaymentProvider.INSUFFICIENT_FUNDS_TOKEN);
  for (const day of [0, 2, 4, 7]) await runChargeCron(new Date(plus(first, day).getTime() + 60_000));
  assert.equal(getSubscriptionById(paused.id)!.status, 'paused');
  assert.equal((await cancelAt(paused.id, plus(first, 10))).ok, true);
  r = getSubscriptionById(paused.id)!;
  assert.equal(r.status, 'canceled');
  assert.equal(r.cancel_at_period_end, null);
});

test('cancel: an unpaid (pending) plan row and a legacy (non-plan) row keep the immediate cancel', async () => {
  const now = at('2026-11-11T09:00:00.000Z');
  const { subscriptionId: pendingId } = await createPendingPlanSubscription({ plan: SITE_BOT_PLAN, userId: 'p@example.com', returnUrl: 'https://wao.co.il/r', now });
  assert.deepEqual(await cancelAt(pendingId, now), { ok: true, subscriptionId: pendingId, cancelAtPeriodEnd: false, effectiveAt: now.toISOString() });
  assert.equal(getSubscriptionById(pendingId)!.status, 'canceled');

  const { subscriptionId: legacyId } = await createPendingSubscription({ email: 'legacy@example.com', trialAmount: 5, recurringAmount: 50 });
  assert.equal((await applyTokenizationCallback(legacyId, { sessionId: 'x' })).ok, true);
  const legacy = await cancelAt(legacyId, now);
  assert.equal(legacy.ok && legacy.cancelAtPeriodEnd, false);
  const r = getSubscriptionById(legacyId)!;
  assert.equal(r.status, 'canceled');
  assert.equal(r.next_charge_at, null);
  assert.equal(r.cancel_at_period_end, null);
  assert.deepEqual(events(legacyId).slice(-1), ['canceled_by_user']);
});

test('the charge cron never charges a row with a cancellation requested, even if next_charge_at was set by hand', async () => {
  const signup = at('2026-11-11T09:00:00.000Z');
  const row = await activeSiteBot(signup);
  await cancelAt(row.id, at('2026-11-12T09:00:00.000Z'));
  getDb().prepare(`UPDATE subscriptions SET next_charge_at = ? WHERE id = ?`).run('2026-11-30T00:00:00.000Z', row.id);
  assert.deepEqual((await cronFor(row.id, at('2026-12-01T00:00:00.000Z'))).outcomes, []);
  assert.equal(charges(row.id).length, 1);
});
