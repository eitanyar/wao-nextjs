/**
 * Core business logic for the trial-signup and self-serve-cancel flows.
 * Route handlers (`src/app/api/subscriptions/*`) and the account page stay
 * thin wrappers around these functions so the logic is independently
 * testable (see `subscriptions.test.ts`).
 */

import crypto from 'crypto';
import { addMonths } from 'date-fns';
import {
  getDb,
  insertSubscription,
  insertCharge,
  insertSubscriptionEvent,
  buildIdempotencyKey,
  type SubscriptionRow,
} from './db';
import { encryptToken } from './crypto';
import { getPaymentProvider, paymentProviderKind } from './get-provider';
import { generateMagicLinkToken, validateAndConsumeMagicLinkToken } from './magic-link';
import { sendTrialChargeConfirmationEmail, sendMagicLinkCancelEmail } from './email';
import { issueInvoiceForCharge } from './invoicing';
import { getBillingPlan, planChargeAmount, type BillingPlan } from './plans';
import { siteBotSupportBoxShown } from '../site-bot/supportBox';

const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nowIso(): string {
  return new Date().toISOString();
}

function resolveBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/** Builds the URL the account page reads its magic-link token from. */
export function buildCancelUrl(token: string): string {
  return `${resolveBaseUrl()}/account/subscription?token=${encodeURIComponent(token)}`;
}

/**
 * Same-origin path of the account page for a fresh magic-link token (the pay page links to it right after the
 * sign-up charge). Never carries a host, so a client can render it as an internal link.
 */
export function buildAccountPath(token: string): string {
  return `/account/subscription?token=${encodeURIComponent(token)}`;
}

/** Mints a magic-link token for `subscriptionId` and returns the account-page path that manages / cancels it. */
export function issueAccountPath(subscriptionId: string): string {
  return buildAccountPath(generateMagicLinkToken(subscriptionId).token);
}

/**
 * Builds an `/account/subscription` URL with arbitrary query params
 * (`token`, `signup`, `cardUpdate`, ...). Generalizes `buildCancelUrl` so
 * other flows (card-update redirect landing, card-expiry-notice emails) can
 * reuse the same base-URL resolution without duplicating it.
 */
export function buildAccountUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params);
  return `${resolveBaseUrl()}/account/subscription?${qs.toString()}`;
}

/**
 * Builds the `returnUrl` handed to the payment provider's hosted
 * tokenization page for the card-update flow. Carries both the
 * subscriptionId (so the callback knows which row to update — mirrors the
 * signup flow's `returnUrl` convention) and the original magic-link token
 * (`mlt`) so the callback can validate-and-consume it at the point the card
 * is actually swapped in — see `card-update.ts` doc comment for why
 * consumption is deferred to the callback rather than session-creation time.
 */
export function buildCardUpdateReturnUrl(subscriptionId: string, magicLinkToken: string): string {
  const params = new URLSearchParams({ subscriptionId, mlt: magicLinkToken });
  return `${resolveBaseUrl()}/api/subscriptions/card-update/callback?${params.toString()}`;
}

export function getSubscriptionById(subscriptionId: string): SubscriptionRow | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM subscriptions WHERE id = ?`).get(subscriptionId) as
    | SubscriptionRow
    | undefined;
  return row ?? null;
}

/** All non-canceled subscriptions for a given customer identifier (email). */
export function getActiveSubscriptionsByEmail(email: string): SubscriptionRow[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM subscriptions WHERE user_id = ? AND status != 'canceled' ORDER BY created_at DESC`)
    .all(email) as SubscriptionRow[];
}

// ---------------------------------------------------------------------------
// 1. Signup
// ---------------------------------------------------------------------------

export interface CreateSubscriptionParams {
  email: string;
  trialAmount: number;
  recurringAmount: number;
  currency?: string;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  redirectUrl: string;
}

export async function createPendingSubscription(
  params: CreateSubscriptionParams
): Promise<CreateSubscriptionResult> {
  const { email, trialAmount, recurringAmount, currency = 'ILS' } = params;
  if (!email || !email.includes('@')) throw new Error('A valid email is required.');
  if (!(trialAmount > 0)) throw new Error('trialAmount must be a positive number.');
  if (!(recurringAmount > 0)) throw new Error('recurringAmount must be a positive number.');

  const db = getDb();
  const subscriptionId = crypto.randomUUID();
  const timestamp = nowIso();

  const row: SubscriptionRow = {
    id: subscriptionId,
    user_id: email,
    status: 'pending',
    provider: 'mock',
    provider_token: null,
    card_last4: null,
    card_expiry: null,
    trial_amount: trialAmount,
    recurring_amount: recurringAmount,
    currency,
    next_charge_at: null,
    canceled_at: null,
    cancel_reason: null,
    failed_attempts: 0,
    created_at: timestamp,
    updated_at: timestamp,
    // joined_at is the refund-window anchor — set once, here, alongside
    // created_at (see docs/specs/subscription-legal-copy-final.md).
    joined_at: timestamp,
    extended_cancellation_flag: null,
    extended_flag_basis: null,
  };
  insertSubscription(db, row);

  insertSubscriptionEvent(db, {
    id: crypto.randomUUID(),
    subscription_id: subscriptionId,
    event_type: 'created',
    metadata: JSON.stringify({ email, trialAmount, recurringAmount, currency }),
    created_at: timestamp,
  });

  const returnUrl = `${resolveBaseUrl()}/api/subscriptions/callback?subscriptionId=${encodeURIComponent(subscriptionId)}`;

  const provider = getPaymentProvider();
  const session = await provider.createTokenizationSession({
    customerId: email,
    returnUrl,
    initialAmount: trialAmount,
    description: 'WAO subscription — trial charge',
  });

  return { subscriptionId, redirectUrl: session.redirectUrl };
}

// ---------------------------------------------------------------------------
// 2. Tokenization callback
// ---------------------------------------------------------------------------

export type CallbackOutcome =
  | { ok: true; subscriptionId: string }
  | { ok: false; reason: 'subscription_not_found' | 'subscription_not_pending' | 'callback_invalid' };

/**
 * Applies a hosted-tokenization callback to a `pending` subscription. Never
 * throws on a bad/forged callback — returns a discriminated result instead,
 * so the route handler can respond generically without leaking whether a
 * trial charge actually succeeded.
 */
export async function applyTokenizationCallback(
  subscriptionId: string,
  payload: unknown
): Promise<CallbackOutcome> {
  const db = getDb();
  const subscription = getSubscriptionById(subscriptionId);

  if (!subscription) {
    console.error(`[subscriptions/callback] No subscription found for id=${subscriptionId}`);
    return { ok: false, reason: 'subscription_not_found' };
  }

  if (subscription.status !== 'pending') {
    // Replayed/duplicate callback against an already-resolved subscription — ignore, don't re-charge or re-notify.
    console.error(
      `[subscriptions/callback] subscription=${subscriptionId} is not pending (status=${subscription.status}); ignoring callback.`
    );
    return { ok: false, reason: 'subscription_not_pending' };
  }

  const provider = getPaymentProvider();
  const result = await provider.verifyTokenizationCallback(payload);

  if (!result.valid || !result.initialChargeSucceeded || !result.token) {
    console.error(
      `[subscriptions/callback] invalid/failed tokenization callback for subscription=${subscriptionId}:`,
      result
    );
    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: subscriptionId,
      event_type: 'charge_failed',
      metadata: JSON.stringify({ stage: 'trial_tokenization_callback', valid: result.valid }),
      created_at: nowIso(),
    });
    return { ok: false, reason: 'callback_invalid' };
  }

  const timestamp = nowIso();
  const nextChargeAt = addMonths(new Date(timestamp), 1).toISOString();
  const encryptedToken = encryptToken(result.token);

  db.prepare(
    `UPDATE subscriptions
     SET provider_token = @provider_token,
         card_last4 = @card_last4,
         card_expiry = @card_expiry,
         status = 'trialing',
         next_charge_at = @next_charge_at,
         updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id: subscriptionId,
    provider_token: encryptedToken,
    card_last4: result.cardLast4 ?? null,
    card_expiry: result.cardExpiry ?? null,
    next_charge_at: nextChargeAt,
    updated_at: timestamp,
  });

  const idempotencyKey = buildIdempotencyKey(subscriptionId, 'trial', 1);
  const chargeRow = {
    id: crypto.randomUUID(),
    subscription_id: subscriptionId,
    idempotency_key: idempotencyKey,
    amount: subscription.trial_amount ?? 0,
    status: 'succeeded' as const,
    attempt_number: 1,
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
    subscription_id: subscriptionId,
    event_type: 'trial_charged',
    metadata: JSON.stringify({ amount: subscription.trial_amount, providerTransactionId: result.providerTransactionId }),
    created_at: timestamp,
  });

  // Invoice issuance is best-effort and must never block/fail the charge
  // itself — see `invoicing.ts` doc comment.
  await issueInvoiceForCharge(chargeRow, subscription);

  // Cancel link must ship with every charge-confirmation email by default.
  const { token: magicLinkToken } = generateMagicLinkToken(subscriptionId);
  const cancelUrl = buildCancelUrl(magicLinkToken);

  try {
    await sendTrialChargeConfirmationEmail({
      to: subscription.user_id,
      trialAmount: subscription.trial_amount ?? 0,
      currency: subscription.currency ?? 'ILS',
      cardLast4: result.cardLast4 ?? '',
      cancelUrl,
    });
  } catch (err) {
    // Email failure must not roll back a successful charge/subscription — log and move on.
    console.error(`[subscriptions/callback] Failed to send trial-charge confirmation email:`, err);
  }

  return { ok: true, subscriptionId };
}

// ---------------------------------------------------------------------------
// 3. Magic-link request
// ---------------------------------------------------------------------------

/**
 * Looks up subscription(s) for `email` and — if any exist — sends a fresh
 * magic-link cancel email for each. Always resolves the same way regardless
 * of whether a match was found, to avoid leaking which emails have a
 * subscription (email enumeration).
 */
export async function requestMagicLinkForEmail(email: string): Promise<void> {
  const subscriptions = getActiveSubscriptionsByEmail(email);

  for (const subscription of subscriptions) {
    const { token } = generateMagicLinkToken(subscription.id);
    const cancelUrl = buildCancelUrl(token);
    try {
      await sendMagicLinkCancelEmail({ to: email, cancelUrl, supportBoxShown: siteBotSupportBoxShown(subscription) });
    } catch (err) {
      console.error(`[subscriptions/magic-link] Failed to send magic-link email for subscription=${subscription.id}:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Cancel
// ---------------------------------------------------------------------------

export type CancelOutcome =
  | {
      ok: true;
      subscriptionId: string;
      /** true = a plan row that stays usable until `effectiveAt` (end of the paid period); false = canceled now. */
      cancelAtPeriodEnd: boolean;
      /** When the cancellation takes (took) effect. */
      effectiveAt: string;
    }
  | { ok: false; reason: 'invalid_token' | 'subscription_not_found' | 'already_canceled' };

/** True when a cancellation is scheduled (plan row, end of paid period) or done. */
export function isCancellationRequested(row: Pick<SubscriptionRow, 'status' | 'cancel_at_period_end'>): boolean {
  return row.status === 'canceled' || row.cancel_at_period_end === 1;
}

/**
 * End of the period the customer has already paid for on a plan row: anchor + periods_paid intervals. Null for legacy
 * rows and for plan rows that were never charged.
 */
export function planPaidThrough(row: Pick<SubscriptionRow, 'plan' | 'billing_anchor_at' | 'periods_paid'>): string | null {
  if (!getBillingPlan(row.plan) || !row.billing_anchor_at || !(row.periods_paid && row.periods_paid > 0)) return null;
  return planChargeDate(row.billing_anchor_at, row.periods_paid);
}

/**
 * Whether the customer is entitled to the service at `now`. Plan rows: active / in dunning, and a scheduled
 * cancellation keeps access until the end of the paid period. Not yet read by any Site-Bot surface (nothing gates on
 * billing status today); exported so the first consumer uses the same rule the engine applies.
 */
export function subscriptionHasAccess(row: SubscriptionRow, now: Date = new Date()): boolean {
  if (row.cancel_at_period_end === 1) {
    return row.status !== 'canceled' && !!row.cancel_effective_at && now.toISOString() < row.cancel_effective_at;
  }
  return row.status === 'active' || row.status === 'trialing' || row.status === 'past_due';
}

/**
 * The paid-through date a cancel made at `now` would keep the service running until, or null when the cancel would be
 * immediate (legacy rows, a plan row whose paid period has ended, a paused row). The single rule behind both
 * cancelSubscriptionByToken and the account page's confirm question, so the question never promises a date the cancel
 * will not honour.
 */
export function cancelEffectiveAtIfCanceledNow(
  subscription: Pick<SubscriptionRow, 'plan' | 'billing_anchor_at' | 'periods_paid' | 'status'>,
  now: Date = new Date()
): string | null {
  const plan = getBillingPlan(subscription.plan);
  const paidThrough = plan && plan.cancellationEffective === 'end_of_period' ? planPaidThrough(subscription) : null;
  return paidThrough !== null && paidThrough > now.toISOString() && subscription.status !== 'paused' ? paidThrough : null;
}

/**
 * Re-validates the magic-link token server-side (never trusts a client
 * "authorized" flag) and, if valid, cancels the subscription. Token
 * validate+consume happens first, before any other side effect — see
 * `magic-link.ts` doc comment for why this (not the page GET) is where
 * single-use consumption is enforced.
 *
 * Plan rows (Site-Bot, SITE_BOT_PLAN.cancellationEffective = 'end_of_period'): the cancellation takes effect at the end
 * of the period already paid for. From the request on there is no further charge (`next_charge_at = NULL`, provider
 * token deleted); the row keeps its status (access continues) with `cancel_at_period_end = 1` and
 * `cancel_effective_at` = the paid-through date; the charge cron sets status 'canceled' once that date has passed
 * (`finalizeScheduledCancellations`). A plan row whose paid period has already ended (in dunning, paused) is canceled
 * at once. Legacy (non-plan) rows keep the original immediate cancel.
 */
export async function cancelSubscriptionByToken(token: string, now: Date = new Date()): Promise<CancelOutcome> {
  const consumeResult = validateAndConsumeMagicLinkToken(token);
  if (!consumeResult.valid) {
    return { ok: false, reason: 'invalid_token' };
  }

  const { subscriptionId } = consumeResult;
  const subscription = getSubscriptionById(subscriptionId);
  if (!subscription) {
    console.error(`[subscriptions/cancel] Token validated but subscription=${subscriptionId} not found.`);
    return { ok: false, reason: 'subscription_not_found' };
  }

  if (isCancellationRequested(subscription)) {
    return { ok: false, reason: 'already_canceled' };
  }

  const db = getDb();
  const timestamp = now.toISOString();
  const paidThrough = cancelEffectiveAtIfCanceledNow(subscription, now);
  const atPeriodEnd = paidThrough !== null;

  if (atPeriodEnd) {
    db.prepare(
      `UPDATE subscriptions
       SET cancel_at_period_end = 1,
           cancel_effective_at = @cancel_effective_at,
           canceled_at = @canceled_at,
           next_charge_at = NULL,
           cancel_reason = @cancel_reason,
           updated_at = @updated_at
       WHERE id = @id`
    ).run({
      id: subscriptionId,
      cancel_effective_at: paidThrough,
      canceled_at: timestamp,
      cancel_reason: 'self_serve_magic_link',
      updated_at: timestamp,
    });
    await deleteProviderTokenBestEffort(subscription);
    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: subscriptionId,
      event_type: 'cancel_scheduled',
      metadata: JSON.stringify({ cancel_reason: 'self_serve_magic_link', plan: subscription.plan, effectiveAt: paidThrough }),
      created_at: timestamp,
    });
    return { ok: true, subscriptionId, cancelAtPeriodEnd: true, effectiveAt: paidThrough };
  }

  db.prepare(
    `UPDATE subscriptions
     SET status = 'canceled',
         canceled_at = @canceled_at,
         next_charge_at = NULL,
         cancel_reason = @cancel_reason,
         updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id: subscriptionId,
    canceled_at: timestamp,
    cancel_reason: 'self_serve_magic_link',
    updated_at: timestamp,
  });

  await deleteProviderTokenBestEffort(subscription);

  insertSubscriptionEvent(db, {
    id: crypto.randomUUID(),
    subscription_id: subscriptionId,
    event_type: 'canceled_by_user',
    metadata: JSON.stringify({ cancel_reason: 'self_serve_magic_link' }),
    created_at: timestamp,
  });

  return { ok: true, subscriptionId, cancelAtPeriodEnd: false, effectiveAt: timestamp };
}

async function deleteProviderTokenBestEffort(subscription: SubscriptionRow): Promise<void> {
  const subscriptionId = subscription.id;
  if (subscription.provider_token) {
    const provider = getPaymentProvider();
    try {
      // provider_token is stored encrypted; the mock provider's deleteToken
      // keys off the raw token value it minted, not the encrypted-at-rest
      // form. Real providers will differ — this call site is exactly where
      // that provider-specific detail should be handled once a real
      // provider lands (decrypt-then-delete, as done here, or a
      // provider-side reference id — TBD with that provider's docs).
      const { decryptToken } = await import('./crypto');
      await provider.deleteToken?.(decryptToken(subscription.provider_token));
    } catch (err) {
      // Token deletion at the provider is best-effort cleanup — a failure here
      // must not block the cancellation itself (next_charge_at = NULL below is
      // what actually guarantees no future charge).
      console.error(`[subscriptions/cancel] provider.deleteToken failed for subscription=${subscriptionId}:`, err);
    }
  }
}

/**
 * Turns every scheduled plan cancellation whose paid period has ended into status 'canceled'. Run by the charge cron
 * before it looks for due charges; idempotent (a row is finalized once). Returns the finalized subscription ids.
 */
export function finalizeScheduledCancellations(now: Date = new Date()): string[] {
  const db = getDb();
  const timestamp = now.toISOString();
  const due = db
    .prepare(
      `SELECT id, cancel_effective_at FROM subscriptions
       WHERE cancel_at_period_end = 1 AND status != 'canceled'
         AND cancel_effective_at IS NOT NULL AND cancel_effective_at <= ?`
    )
    .all(timestamp) as Array<{ id: string; cancel_effective_at: string }>;
  const finalized: string[] = [];
  for (const row of due) {
    const changed = db
      .prepare(
        `UPDATE subscriptions SET status = 'canceled', next_charge_at = NULL, updated_at = @updated_at
         WHERE id = @id AND status != 'canceled'`
      )
      .run({ id: row.id, updated_at: timestamp }).changes;
    if (changed !== 1) continue;
    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: row.id,
      event_type: 'cancellation_effective',
      metadata: JSON.stringify({ effectiveAt: row.cancel_effective_at }),
      created_at: timestamp,
    });
    finalized.push(row.id);
  }
  return finalized;
}

// ---------------------------------------------------------------------------
// 5. Plan subscriptions (no trial): Site-Bot (SITE_BOT_PLAN, plans.ts)
// ---------------------------------------------------------------------------

export interface CreatePendingPlanSubscriptionParams {
  plan: BillingPlan;
  /** Customer identifier stored in `user_id` (the email when known). */
  userId: string;
  /** Where the provider's payment page returns the customer to. */
  returnUrl: string;
  now?: Date;
}

export interface CreatePendingPlanSubscriptionResult {
  subscriptionId: string;
  redirectUrl: string;
  providerSessionId: string;
}

/**
 * Creates a `pending` plan row that snapshots the plan's price terms (net, VAT, interval) and opens the provider's
 * tokenization session for the first charge. Nothing is charged here.
 */
export async function createPendingPlanSubscription(
  params: CreatePendingPlanSubscriptionParams
): Promise<CreatePendingPlanSubscriptionResult> {
  const { plan, userId, returnUrl } = params;
  if (!userId) throw new Error('userId is required.');
  const now = params.now ?? new Date();
  const db = getDb();
  const subscriptionId = crypto.randomUUID();
  const timestamp = now.toISOString();
  const chargeAmount = planChargeAmount(plan);

  insertSubscription(db, {
    id: subscriptionId,
    user_id: userId,
    status: 'pending',
    provider: paymentProviderKind(),
    provider_token: null,
    card_last4: null,
    card_expiry: null,
    trial_amount: null,
    recurring_amount: chargeAmount,
    currency: plan.currency,
    next_charge_at: null,
    canceled_at: null,
    cancel_reason: null,
    failed_attempts: 0,
    created_at: timestamp,
    updated_at: timestamp,
    joined_at: timestamp,
    extended_cancellation_flag: null,
    extended_flag_basis: null,
    plan: plan.id,
    net_amount: plan.netAmount,
    vat_mode: plan.vat.mode,
    vat_rate: plan.vat.rate,
    billing_interval: plan.interval,
    billing_anchor_at: null,
    periods_paid: 0,
    dunning_started_at: null,
    paused_at: null,
  });

  insertSubscriptionEvent(db, {
    id: crypto.randomUUID(),
    subscription_id: subscriptionId,
    event_type: 'created',
    metadata: JSON.stringify({ plan: plan.id, netAmount: plan.netAmount, vatRate: plan.vat.rate, chargeAmount, currency: plan.currency }),
    created_at: timestamp,
  });

  const session = await getPaymentProvider().createTokenizationSession({
    customerId: subscriptionId,
    returnUrl,
    initialAmount: chargeAmount,
    description: plan.chargeDescription,
  });

  return { subscriptionId, redirectUrl: session.redirectUrl, providerSessionId: session.sessionId };
}

export type PlanActivationOutcome =
  | { ok: true; subscriptionId: string; alreadyActive: boolean }
  | {
      ok: false;
      reason: 'subscription_not_found' | 'subscription_not_pending' | 'callback_invalid' | 'charge_failed';
      retryable?: boolean;
    };

/**
 * Turns a `pending` plan row into `active`: verifies the provider callback, takes the first (sign-up) charge, anchors
 * billing at that moment and schedules the next charge one interval later. Re-running it after success is a no-op
 * (`alreadyActive: true`), so a replayed callback never charges twice. A failed first charge leaves the row `pending`
 * (the customer can try again; each try is a distinct attempt with its own idempotency key).
 */
export async function activatePlanSubscription(
  subscriptionId: string,
  callbackPayload: unknown,
  now: Date = new Date()
): Promise<PlanActivationOutcome> {
  const db = getDb();
  const subscription = getSubscriptionById(subscriptionId);
  if (!subscription) return { ok: false, reason: 'subscription_not_found' };
  const plan = getBillingPlan(subscription.plan);
  if (!plan) return { ok: false, reason: 'subscription_not_found' };
  if (subscription.status !== 'pending') {
    if ((subscription.periods_paid ?? 0) >= 1) return { ok: true, subscriptionId, alreadyActive: true };
    return { ok: false, reason: 'subscription_not_pending' };
  }
  const timestamp = now.toISOString();
  const provider = getPaymentProvider();

  // ===========================================================================================================
  // TAKBULL SWAP POINT (the only one). With the mock, the pay page posts { sessionId } and the first charge is an
  // explicit chargeToken() on the minted token. When Takbull's API contract exists, adapt HERE only:
  //   1. callbackPayload = Takbull's signed return / webhook payload (verified inside providers/takbull.ts);
  //   2. if Takbull charges the first amount on its hosted page, use verify.initialChargeSucceeded +
  //      verify.providerTransactionId instead of the chargeToken() call below.
  // providers/takbull.ts stays a stub until then; get-provider.ts selects it with PAYMENT_PROVIDER=takbull.
  // ===========================================================================================================
  const verify = await provider.verifyTokenizationCallback(callbackPayload);
  if (!verify.valid || !verify.token) {
    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: subscriptionId,
      event_type: 'charge_failed',
      metadata: JSON.stringify({ stage: 'plan_tokenization_callback', valid: verify.valid }),
      created_at: timestamp,
    });
    return { ok: false, reason: 'callback_invalid' };
  }
  const priorAttempts = (db
    .prepare(`SELECT COUNT(*) AS n FROM charges WHERE subscription_id = ? AND status = 'failed'`)
    .get(subscriptionId) as { n: number }).n;
  const attemptNumber = priorAttempts + 1;
  const idempotencyKey = buildIdempotencyKey(subscriptionId, 'signup', attemptNumber);
  const amount = subscription.recurring_amount ?? planChargeAmount(plan);
  const charge = await provider.chargeToken({ token: verify.token, amount, description: plan.chargeDescription, idempotencyKey });

  const chargeRow = {
    id: crypto.randomUUID(),
    subscription_id: subscriptionId,
    idempotency_key: idempotencyKey,
    amount,
    status: charge.success ? ('succeeded' as const) : ('failed' as const),
    attempt_number: attemptNumber,
    provider_transaction_id: charge.providerTransactionId ?? null,
    error_code: charge.success ? null : charge.errorCode ?? null,
    error_message: charge.success ? null : charge.errorMessage ?? null,
    invoice_id: null,
    charged_at: charge.success ? timestamp : null,
    created_at: timestamp,
    refunded_at: null,
    refund_amount: null,
    refund_provider_ref: null,
  };
  insertCharge(db, chargeRow);

  if (!charge.success) {
    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: subscriptionId,
      event_type: 'charge_failed',
      metadata: JSON.stringify({ stage: 'plan_signup_charge', errorCode: charge.errorCode, attemptNumber }),
      created_at: timestamp,
    });
    return { ok: false, reason: 'charge_failed', retryable: charge.isRetryable };
  }

  const nextChargeAt = planChargeDate(timestamp, 1);
  db.prepare(
    `UPDATE subscriptions
     SET status = 'active',
         provider_token = @provider_token,
         card_last4 = @card_last4,
         card_expiry = @card_expiry,
         billing_anchor_at = @billing_anchor_at,
         periods_paid = 1,
         failed_attempts = 0,
         dunning_started_at = NULL,
         next_charge_at = @next_charge_at,
         updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id: subscriptionId,
    provider_token: encryptToken(verify.token),
    card_last4: verify.cardLast4 ?? null,
    card_expiry: verify.cardExpiry ?? null,
    billing_anchor_at: timestamp,
    next_charge_at: nextChargeAt,
    updated_at: timestamp,
  });

  insertSubscriptionEvent(db, {
    id: crypto.randomUUID(),
    subscription_id: subscriptionId,
    event_type: 'plan_charged',
    metadata: JSON.stringify({
      plan: plan.id,
      amount,
      netAmount: subscription.net_amount,
      vatRate: subscription.vat_rate,
      providerTransactionId: charge.providerTransactionId,
      nextChargeAt,
    }),
    created_at: timestamp,
  });

  // Best-effort, never blocks the charge (invoicing.ts).
  await issueInvoiceForCharge(chargeRow, subscription);

  // The cancel link ships with the sign-up charge (same rule as the trial confirmation). Reuses the existing
  // manage-subscription email. Only when the customer identifier is an email: a Site-Bot owner who gave no valid
  // email is stored as `site-bot:<sessionId>` and gets no email (open item: email vs WhatsApp at sign-up).
  if (EMAIL_ADDRESS.test(subscription.user_id)) {
    try {
      await sendMagicLinkCancelEmail({
        to: subscription.user_id,
        cancelUrl: buildCancelUrl(generateMagicLinkToken(subscriptionId).token),
        // The row was just set active above; `subscription` is the pre-activation read.
        supportBoxShown: siteBotSupportBoxShown({ plan: subscription.plan, status: 'active' }),
      });
    } catch (err) {
      console.error(`[subscriptions/plan] Failed to send the manage-subscription email for subscription=${subscriptionId}:`, err);
    }
  }

  return { ok: true, subscriptionId, alreadyActive: false };
}

/**
 * The charge date of period `periodIndex` (0 = the sign-up charge) of a monthly plan anchored at `anchorIso`. Always
 * computed from the anchor, so Jan 31 -> Feb 28 -> Mar 31 and a late retry never shifts later charges.
 */
export function planChargeDate(anchorIso: string, periodIndex: number): string {
  return addMonths(new Date(anchorIso), periodIndex).toISOString();
}
