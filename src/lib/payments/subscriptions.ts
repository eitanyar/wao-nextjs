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
import { getPaymentProvider } from './get-provider';
import { generateMagicLinkToken, validateAndConsumeMagicLinkToken } from './magic-link';
import { sendTrialChargeConfirmationEmail, sendMagicLinkCancelEmail } from './email';
import { issueInvoiceForCharge } from './invoicing';

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
      await sendMagicLinkCancelEmail({ to: email, cancelUrl });
    } catch (err) {
      console.error(`[subscriptions/magic-link] Failed to send magic-link email for subscription=${subscription.id}:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Cancel
// ---------------------------------------------------------------------------

export type CancelOutcome =
  | { ok: true; subscriptionId: string }
  | { ok: false; reason: 'invalid_token' | 'subscription_not_found' | 'already_canceled' };

/**
 * Re-validates the magic-link token server-side (never trusts a client
 * "authorized" flag) and, if valid, cancels the subscription. Token
 * validate+consume happens first, before any other side effect — see
 * `magic-link.ts` doc comment for why this (not the page GET) is where
 * single-use consumption is enforced.
 */
export async function cancelSubscriptionByToken(token: string): Promise<CancelOutcome> {
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

  if (subscription.status === 'canceled') {
    return { ok: false, reason: 'already_canceled' };
  }

  const db = getDb();
  const timestamp = nowIso();

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

  insertSubscriptionEvent(db, {
    id: crypto.randomUUID(),
    subscription_id: subscriptionId,
    event_type: 'canceled_by_user',
    metadata: JSON.stringify({ cancel_reason: 'self_serve_magic_link' }),
    created_at: timestamp,
  });

  return { ok: true, subscriptionId };
}
