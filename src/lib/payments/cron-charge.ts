/**
 * Cron-driven recurring-charge engine (task #9). Two independent entry
 * points, both meant to be called from thin authenticated route handlers
 * under `src/app/api/subscriptions/cron/*`:
 *
 *   - `runChargeCron()`   — charges everything due, handles retry/expiry.
 *   - `runReminderCron()` — sends the pre-charge "trial ending soon" email.
 *
 * Both are safe to call more often than strictly necessary (they're driven
 * entirely by `next_charge_at` / already-sent-reminder checks in the DB, not
 * by wall-clock assumptions about when they "should" run) — see the
 * `scripts/cron/charge-subscriptions.sh` doc comment for why the exact cron
 * hour therefore isn't safety-critical.
 *
 * ## Idempotency-key convention (attempt-number semantics)
 *
 * `buildIdempotencyKey(subscriptionId, billingPeriodStartDate, attemptNumber)`
 * needs `billingPeriodStartDate` + `attemptNumber` to be **stable** if this
 * cron is re-run before the row's state changes (e.g. an overlapping/retried
 * cron tick, prevented in production by `flock` but defended in depth here
 * too). This module uses:
 *
 *   - `attemptNumber = failed_attempts + 1` — i.e. the Nth retry *within the
 *     current billing period*, not a lifetime running total. This is what
 *     makes the key meaningful: attempt 1 is the first try at this period's
 *     charge, attempt 2/3 are retries after a retryable failure, and
 *     `failed_attempts` resets to 0 on the next successful renewal (a fresh
 *     period starts counting from 1 again).
 *   - `billingPeriodStartDate = row.next_charge_at` **as read at the start of
 *     processing this row** — i.e. the due date that made this row eligible
 *     for *this specific attempt*. On a retryable failure, `next_charge_at`
 *     is bumped forward by 3 days for the next retry, so if the cron reruns
 *     before that mutation lands, it recomputes the exact same key (safe);
 *     once the mutation lands, the next attempt naturally gets a new,
 *     distinct key (also correct — it's a different attempt). This is a
 *     deliberate simplification: it does NOT track the *original* renewal
 *     date across the whole retry cascade (that would require an additional
 *     column, which the "additive schema only" constraint allows but seemed
 *     unnecessary) — the key still uniquely and deterministically identifies
 *     "this attempt", which is all the double-charge guard needs.
 */

import { addMonths, addDays } from 'date-fns';
import crypto from 'crypto';
import {
  getDb,
  insertCharge,
  insertSubscriptionEvent,
  buildIdempotencyKey,
  type SubscriptionRow,
} from './db';
import { decryptToken } from './crypto';
import { getPaymentProvider } from './get-provider';
import { generateMagicLinkToken } from './magic-link';
import { buildCancelUrl, finalizeScheduledCancellations, planChargeDate } from './subscriptions';
import { getBillingPlan, type BillingPlan } from './plans';
import { issueInvoiceForCharge } from './invoicing';
import { clientMessagesEnabled } from '../site-bot/clientMessages';
import { remindUnhandledClientMessages } from '../site-bot/clientMessageEmail';
import {
  sendRenewalChargeConfirmationEmail,
  sendCardUpdateNeededEmail,
  sendSubscriptionExpiredEmail,
  sendBillingAdminAlertEmail,
  sendTrialEndingReminderEmail,
} from './email';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_DAYS = 3;
const REMINDER_WINDOW_MIN_DAYS = 3;
const REMINDER_WINDOW_MAX_DAYS = 5;

function nowIso(now: Date): string {
  return now.toISOString();
}

// ---------------------------------------------------------------------------
// Charge cron
// ---------------------------------------------------------------------------

export type ChargeOutcome =
  | 'succeeded'
  | 'skipped_idempotent'
  | 'retry_scheduled'
  | 'expired'
  | 'failed_non_retryable'
  // Plan rows (Site-Bot): the dunning retries ran out; the row is 'paused' and never charged by the cron again.
  | 'paused'
  | 'error';

export interface ChargeCronRowResult {
  subscriptionId: string;
  outcome: ChargeOutcome;
  error?: string;
}

export interface ChargeCronSummary {
  ranAt: string;
  candidates: number;
  results: ChargeCronRowResult[];
  /** Plan rows whose scheduled (end-of-period) cancellation took effect on this pass: now status 'canceled'. */
  cancellationsEffective: string[];
}

/** Finds every subscription due for a charge right now. Defensive: an explicit
 * `next_charge_at IS NOT NULL` guard is kept even though every status in the
 * IN-list that's actually chargeable should already imply a non-null value —
 * a canceled/expired row always has `next_charge_at = NULL` (see step 2/8),
 * but this guard means a pathological row can NEVER be charged regardless of
 * what its `status` column says. */
function findDueSubscriptions(now: Date): SubscriptionRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM subscriptions
       WHERE status IN ('trialing', 'active', 'past_due')
         AND next_charge_at IS NOT NULL
         AND next_charge_at <= ?
         AND (cancel_at_period_end IS NULL OR cancel_at_period_end = 0)
       ORDER BY next_charge_at ASC`
    )
    .all(nowIso(now)) as SubscriptionRow[];
}

/**
 * The single shared charge/idempotency/state-transition implementation.
 * Exported so the card-update-flow's "immediately re-charge a past_due
 * subscription once its card is fixed" path (`card-update.ts`) calls this
 * exact function rather than duplicating the charge state machine — see that
 * module's doc comment for how it prepares a row (fresh `next_charge_at`)
 * before calling this.
 */
export async function chargeOneSubscription(row: SubscriptionRow, now: Date): Promise<ChargeOutcome> {
  const db = getDb();

  // Belt-and-suspenders: never charge a row with a null next_charge_at, no
  // matter how it got into the candidate list.
  if (!row.next_charge_at) return 'skipped_idempotent';
  // A cancellation was requested: never charge again, whatever else the row says.
  if (row.cancel_at_period_end === 1) return 'skipped_idempotent';

  const billingPeriodStartDate = row.next_charge_at;
  const attemptNumber = row.failed_attempts + 1;
  const idempotencyKey = buildIdempotencyKey(row.id, billingPeriodStartDate, attemptNumber);

  const existingSucceeded = db
    .prepare(`SELECT id FROM charges WHERE idempotency_key = ? AND status = 'succeeded'`)
    .get(idempotencyKey);
  if (existingSucceeded) {
    // Safety net beyond flock: cron somehow double-fired for this exact
    // attempt and already succeeded — don't charge again.
    return 'skipped_idempotent';
  }

  if (!row.provider_token) {
    console.error(`[cron-charge] subscription=${row.id} has no provider_token; skipping.`);
    return 'error';
  }

  // Plan rows (plans.ts, e.g. Site-Bot) bill on a fixed anchor and follow the plan's dunning; NULL plan = legacy engine.
  const plan = row.plan ? getBillingPlan(row.plan) : null;
  if (row.plan && (!plan || !row.billing_anchor_at)) {
    console.error(`[cron-charge] subscription=${row.id} has plan=${row.plan} but no known plan / billing anchor; skipping.`);
    return 'error';
  }

  const provider = getPaymentProvider();
  const token = decryptToken(row.provider_token);
  const amount = row.recurring_amount ?? 0;
  const timestamp = nowIso(now);

  const result = await provider.chargeToken({
    token,
    amount,
    description: plan ? plan.chargeDescription : 'WAO subscription — recurring charge',
    idempotencyKey,
  });

  if (result.success) {
    const periodsPaid = (row.periods_paid ?? 0) + 1;
    const nextChargeAt = plan
      ? planChargeDate(row.billing_anchor_at as string, periodsPaid)
      : addMonths(new Date(billingPeriodStartDate), 1).toISOString();

    db.prepare(
      `UPDATE subscriptions
       SET status = 'active',
           failed_attempts = 0,
           next_charge_at = @next_charge_at,
           updated_at = @updated_at
       WHERE id = @id`
    ).run({ id: row.id, next_charge_at: nextChargeAt, updated_at: timestamp });
    if (plan) {
      db.prepare(`UPDATE subscriptions SET periods_paid = @periods_paid, dunning_started_at = NULL WHERE id = @id`)
        .run({ id: row.id, periods_paid: periodsPaid });
    }

    const chargeId = crypto.randomUUID();
    const chargeRow = {
      id: chargeId,
      subscription_id: row.id,
      idempotency_key: idempotencyKey,
      amount,
      status: 'succeeded' as const,
      attempt_number: attemptNumber,
      provider_transaction_id: result.providerTransactionId ?? null,
      error_code: null,
      error_message: null,
      invoice_id: null,
      charged_at: timestamp,
      created_at: timestamp,
      refunded_at: null,
      refund_amount: null,
      refund_provider_ref: null,
    };
    insertCharge(db, chargeRow);

    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: row.id,
      event_type: 'renewed',
      metadata: JSON.stringify({ amount, providerTransactionId: result.providerTransactionId, attemptNumber }),
      created_at: timestamp,
    });

    // Invoice issuance is best-effort and must never block/fail the charge
    // itself — see `invoicing.ts` doc comment.
    await issueInvoiceForCharge(chargeRow, row);

    try {
      const { token: magicLinkToken } = generateMagicLinkToken(row.id);
      const cancelUrl = buildCancelUrl(magicLinkToken);
      await sendRenewalChargeConfirmationEmail({
        to: row.user_id,
        amount,
        currency: row.currency ?? 'ILS',
        cardLast4: row.card_last4 ?? '',
        cancelUrl,
      });
    } catch (err) {
      console.error(`[cron-charge] Failed to send renewal confirmation email for subscription=${row.id}:`, err);
    }

    return 'succeeded';
  }

  // Charge failed.
  insertCharge(db, {
    id: crypto.randomUUID(),
    subscription_id: row.id,
    idempotency_key: idempotencyKey,
    amount,
    status: 'failed',
    attempt_number: attemptNumber,
    provider_transaction_id: null,
    error_code: result.errorCode ?? null,
    error_message: result.errorMessage ?? null,
    invoice_id: null,
    charged_at: null,
    created_at: timestamp,
    refunded_at: null,
    refund_amount: null,
    refund_provider_ref: null,
  });

  if (result.isRetryable && plan) {
    return planDunningFailure(row, plan, now, attemptNumber, result.errorCode, result.errorMessage);
  }

  if (result.isRetryable) {
    const newFailedAttempts = row.failed_attempts + 1;

    if (newFailedAttempts >= MAX_RETRY_ATTEMPTS) {
      db.prepare(
        `UPDATE subscriptions
         SET status = 'expired',
             failed_attempts = @failed_attempts,
             next_charge_at = NULL,
             updated_at = @updated_at
         WHERE id = @id`
      ).run({ id: row.id, failed_attempts: newFailedAttempts, updated_at: timestamp });

      insertSubscriptionEvent(db, {
        id: crypto.randomUUID(),
        subscription_id: row.id,
        event_type: 'charge_failed',
        metadata: JSON.stringify({
          terminal: true,
          reason: 'max_retryable_failures_reached',
          errorCode: result.errorCode,
          attemptNumber,
        }),
        created_at: timestamp,
      });

      try {
        await sendSubscriptionExpiredEmail({ to: row.user_id });
      } catch (err) {
        console.error(`[cron-charge] Failed to send expiry email for subscription=${row.id}:`, err);
      }
      try {
        await sendBillingAdminAlertEmail({
          subscriptionId: row.id,
          userEmail: row.user_id,
          reason: result.errorMessage ?? result.errorCode ?? 'unknown_retryable_failure',
        });
      } catch (err) {
        console.error(`[cron-charge] Failed to send internal admin alert for subscription=${row.id}:`, err);
      }

      return 'expired';
    }

    const nextRetryAt = addDays(now, RETRY_DELAY_DAYS).toISOString();
    db.prepare(
      `UPDATE subscriptions
       SET status = 'past_due',
           failed_attempts = @failed_attempts,
           next_charge_at = @next_charge_at,
           updated_at = @updated_at
       WHERE id = @id`
    ).run({ id: row.id, failed_attempts: newFailedAttempts, next_charge_at: nextRetryAt, updated_at: timestamp });

    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: row.id,
      event_type: 'charge_failed',
      metadata: JSON.stringify({
        terminal: false,
        errorCode: result.errorCode,
        attemptNumber,
        nextRetryAt,
      }),
      created_at: timestamp,
    });

    return 'retry_scheduled';
  }

  // Non-retryable failure: past_due, next_charge_at nulled so the cron never
  // silently re-attempts against a card that's known-bad — a future
  // card-update flow is responsible for setting a new next_charge_at once the
  // customer fixes their card. failed_attempts is left as-is (this wasn't a
  // "retry", so it doesn't count toward the 3-strikes retry cap).
  db.prepare(
    `UPDATE subscriptions
     SET status = 'past_due',
         next_charge_at = NULL,
         updated_at = @updated_at
     WHERE id = @id`
  ).run({ id: row.id, updated_at: timestamp });

  insertSubscriptionEvent(db, {
    id: crypto.randomUUID(),
    subscription_id: row.id,
    event_type: 'charge_failed',
    metadata: JSON.stringify({ terminal: false, retryable: false, errorCode: result.errorCode, attemptNumber }),
    created_at: timestamp,
  });

  try {
    const { token: magicLinkToken } = generateMagicLinkToken(row.id);
    const manageUrl = buildCancelUrl(magicLinkToken);
    await sendCardUpdateNeededEmail({ to: row.user_id, manageUrl });
  } catch (err) {
    console.error(`[cron-charge] Failed to send card-update-needed email for subscription=${row.id}:`, err);
  }

  return 'failed_non_retryable';
}

/**
 * Plan dunning (Site-Bot, approved 2026-11-07): a retryable failure is retried at the plan's offsets, measured from the
 * FIRST failed attempt of the period (Site-Bot: +2, +4, +7 days = 3 retries over 7 days). When the last retry fails the
 * subscription pauses: status 'paused', next_charge_at NULL (the cron never charges it again), a 'paused' event and the
 * internal admin alert. No customer email: the pause notice needs approved copy (open item).
 */
async function planDunningFailure(
  row: SubscriptionRow,
  plan: BillingPlan,
  now: Date,
  attemptNumber: number,
  errorCode: string | undefined,
  errorMessage: string | undefined
): Promise<ChargeOutcome> {
  const db = getDb();
  const timestamp = nowIso(now);
  const offsets = plan.dunning.retryOffsetsDays;
  const dunningStartedAt = row.dunning_started_at ?? timestamp;
  const newFailedAttempts = row.failed_attempts + 1;

  if (newFailedAttempts > offsets.length) {
    db.prepare(
      `UPDATE subscriptions
       SET status = 'paused',
           failed_attempts = @failed_attempts,
           next_charge_at = NULL,
           paused_at = @paused_at,
           updated_at = @updated_at
       WHERE id = @id`
    ).run({ id: row.id, failed_attempts: newFailedAttempts, paused_at: timestamp, updated_at: timestamp });
    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: row.id,
      event_type: 'paused',
      metadata: JSON.stringify({ plan: plan.id, reason: 'dunning_exhausted', retries: offsets.length, dunningStartedAt, errorCode, attemptNumber }),
      created_at: timestamp,
    });
    try {
      await sendBillingAdminAlertEmail({
        subscriptionId: row.id,
        userEmail: row.user_id,
        reason: `plan ${plan.id} paused after ${offsets.length} retries: ${errorMessage ?? errorCode ?? 'unknown_retryable_failure'}`,
      });
    } catch (err) {
      console.error(`[cron-charge] Failed to send internal admin alert for paused subscription=${row.id}:`, err);
    }
    return 'paused';
  }

  const nextRetryAt = addDays(new Date(dunningStartedAt), offsets[newFailedAttempts - 1]).toISOString();
  db.prepare(
    `UPDATE subscriptions
     SET status = 'past_due',
         failed_attempts = @failed_attempts,
         dunning_started_at = @dunning_started_at,
         next_charge_at = @next_charge_at,
         updated_at = @updated_at
     WHERE id = @id`
  ).run({ id: row.id, failed_attempts: newFailedAttempts, dunning_started_at: dunningStartedAt, next_charge_at: nextRetryAt, updated_at: timestamp });
  insertSubscriptionEvent(db, {
    id: crypto.randomUUID(),
    subscription_id: row.id,
    event_type: 'charge_failed',
    metadata: JSON.stringify({ terminal: false, plan: plan.id, errorCode, attemptNumber, retry: newFailedAttempts, nextRetryAt }),
    created_at: timestamp,
  });
  return 'retry_scheduled';
}

/** Runs one full pass of the recurring-charge cron. Safe to call more often
 * than needed — it's a no-op for any subscription not actually due. */
export async function runChargeCron(now: Date = new Date()): Promise<ChargeCronSummary> {
  // Scheduled plan cancellations first: their rows never have a due charge (next_charge_at NULL), this only settles
  // the status once the paid period is over.
  const cancellationsEffective = finalizeScheduledCancellations(now);
  // Site-Bot support queue: one daily staff reminder while client messages sit unhandled (flag-gated, log-only).
  if (clientMessagesEnabled(process.env)) {
    try {
      await remindUnhandledClientMessages(now);
    } catch {
      console.error('[cron-charge] site-bot client-message reminder failed');
    }
  }
  const due = findDueSubscriptions(now);
  const results: ChargeCronRowResult[] = [];

  for (const row of due) {
    try {
      const outcome = await chargeOneSubscription(row, now);
      results.push({ subscriptionId: row.id, outcome });
    } catch (err) {
      console.error(`[cron-charge] Unexpected error charging subscription=${row.id}:`, err);
      results.push({
        subscriptionId: row.id,
        outcome: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { ranAt: nowIso(now), candidates: due.length, results, cancellationsEffective };
}

// ---------------------------------------------------------------------------
// Reminder cron
// ---------------------------------------------------------------------------

export interface ReminderCronSummary {
  ranAt: string;
  candidates: number;
  sent: number;
  skippedAlreadySent: number;
}

/** Finds `trialing` subscriptions whose first recurring charge is 3-5 days
 * out, and haven't already had a reminder sent for this trial period. Only
 * `trialing` subscriptions ever get this reminder (per spec: it's a
 * chargeback-mitigation nudge ahead of the *first* full charge after the
 * trial) — once a subscription renews it moves to `active` and never
 * revisits `trialing`, so "has a reminder_sent event ever" is an adequate
 * once-per-subscription check without needing extra period-scoping. */
export async function runReminderCron(now: Date = new Date()): Promise<ReminderCronSummary> {
  const db = getDb();
  const windowStart = addDays(now, REMINDER_WINDOW_MIN_DAYS).toISOString();
  const windowEnd = addDays(now, REMINDER_WINDOW_MAX_DAYS).toISOString();

  const candidates = db
    .prepare(
      `SELECT * FROM subscriptions
       WHERE status = 'trialing'
         AND next_charge_at IS NOT NULL
         AND next_charge_at >= ?
         AND next_charge_at <= ?`
    )
    .all(windowStart, windowEnd) as SubscriptionRow[];

  let sent = 0;
  let skippedAlreadySent = 0;

  for (const row of candidates) {
    const alreadySent = db
      .prepare(`SELECT id FROM subscription_events WHERE subscription_id = ? AND event_type = 'reminder_sent'`)
      .get(row.id);

    if (alreadySent) {
      skippedAlreadySent++;
      continue;
    }

    const timestamp = nowIso(now);
    try {
      await sendTrialEndingReminderEmail({
        to: row.user_id,
        chargeDate: row.next_charge_at!,
        amount: row.recurring_amount ?? 0,
        currency: row.currency ?? 'ILS',
      });
    } catch (err) {
      console.error(`[cron-reminders] Failed to send trial-ending reminder for subscription=${row.id}:`, err);
      // Still record reminder_sent below even on email-send failure? No —
      // if the send genuinely failed we want a future run to retry it, so
      // skip recording the event and move on to the next candidate.
      continue;
    }

    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: row.id,
      event_type: 'reminder_sent',
      metadata: JSON.stringify({ next_charge_at: row.next_charge_at }),
      created_at: timestamp,
    });
    sent++;
  }

  return { ranAt: nowIso(now), candidates: candidates.length, sent, skippedAlreadySent };
}
