/**
 * Card-update tokenization flow (auth-only, `initialAmount: 0`) — lets a
 * customer replace the card on file for an existing subscription. Mirrors
 * the original signup tokenization flow (`subscriptions.ts` #1/#2), but never
 * charges anything itself; it only replaces `provider_token`/`card_last4`/
 * `card_expiry`, and — if the subscription was `past_due` — immediately
 * re-attempts the charge via the exact same helper the cron uses
 * (`chargeOneSubscription`, exported from `cron-charge.ts`).
 *
 * ## When the magic-link token gets consumed
 *
 * The magic-link token that got the customer here is only PEEKED (not
 * consumed) at session-creation time (`createCardUpdateSession`) — an
 * abandoned/incomplete hosted-tokenization attempt must not burn the
 * customer's single-use link, since the card-update page is easy to bounce
 * off of (e.g. closing the tab mid-flow). It is validated-and-consumed only
 * once, inside `applyCardUpdateCallback`, and only AFTER the payment
 * provider has confirmed the new card was tokenized successfully — i.e.
 * right at the point the card is actually swapped in.
 *
 * This deliberately differs from the cancel flow's "consume as the very
 * first step" rule (`magic-link.ts` / `cancelSubscriptionByToken`): there,
 * presenting the token IS the entire authorization for the one state change
 * (cancel), so eager consumption is exactly the replay guard needed. Here,
 * the token is only an entry ticket into a multi-step hosted flow the
 * customer can abandon or retry, so consuming it at step 1 would strand a
 * customer who got interrupted with no way back in.
 *
 * A forged/invalid callback (bad provider payload, or a token that's
 * expired/already-consumed/mismatched-subscription by the time the callback
 * lands) never mutates subscription state — see `applyCardUpdateCallback`.
 */

import crypto from 'crypto';
import { getDb, insertSubscriptionEvent, type SubscriptionRow } from './db';
import { encryptToken } from './crypto';
import { getPaymentProvider } from './get-provider';
import { peekMagicLinkToken, validateAndConsumeMagicLinkToken, generateMagicLinkToken } from './magic-link';
import { getSubscriptionById, buildCardUpdateReturnUrl } from './subscriptions';
import { chargeOneSubscription, type ChargeOutcome } from './cron-charge';

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// 1. Session creation
// ---------------------------------------------------------------------------

export type CardUpdateSessionOutcome =
  | { ok: true; redirectUrl: string }
  | { ok: false; reason: 'invalid_token' | 'subscription_not_found' | 'subscription_canceled' };

/**
 * Peeks (does NOT consume) the magic-link token to authorize starting the
 * flow, then opens a $0 tokenization session with the provider. See module
 * doc comment for why consumption is deferred to the callback.
 */
export async function createCardUpdateSession(magicLinkToken: string): Promise<CardUpdateSessionOutcome> {
  const peek = peekMagicLinkToken(magicLinkToken);
  if (!peek.valid) {
    return { ok: false, reason: 'invalid_token' };
  }

  const subscription = getSubscriptionById(peek.subscriptionId);
  if (!subscription) {
    console.error(`[card-update] Token valid but subscription=${peek.subscriptionId} not found.`);
    return { ok: false, reason: 'subscription_not_found' };
  }
  if (subscription.status === 'canceled') {
    return { ok: false, reason: 'subscription_canceled' };
  }

  const returnUrl = buildCardUpdateReturnUrl(subscription.id, magicLinkToken);
  const provider = getPaymentProvider();
  const session = await provider.createTokenizationSession({
    customerId: subscription.user_id,
    returnUrl,
    initialAmount: 0,
    description: 'WAO subscription — card update (no charge)',
  });

  return { ok: true, redirectUrl: session.redirectUrl };
}

// ---------------------------------------------------------------------------
// 2. Tokenization callback
// ---------------------------------------------------------------------------

export type CardUpdateCallbackOutcome =
  | { ok: true; subscriptionId: string; recharged: boolean; rechargeOutcome?: ChargeOutcome; freshToken: string }
  | {
      ok: false;
      reason: 'callback_invalid' | 'token_invalid' | 'token_subscription_mismatch' | 'subscription_not_found';
    };

/**
 * Applies a hosted-tokenization callback for the card-update flow. Never
 * throws on a bad/forged callback — returns a discriminated result instead.
 *
 * Order of operations matters here (see module doc comment):
 *   1. Verify with the provider FIRST. An invalid/failed tokenization never
 *      touches the magic-link token at all, so the customer can retry from
 *      the same original link.
 *   2. Only once the provider confirms success do we validate-and-consume
 *      the magic-link token — the actual "card is being swapped in" point.
 *   3. Only once both of those succeed do we mutate the subscription row.
 */
export async function applyCardUpdateCallback(
  subscriptionId: string,
  magicLinkToken: string,
  payload: unknown
): Promise<CardUpdateCallbackOutcome> {
  const db = getDb();

  const provider = getPaymentProvider();
  const result = await provider.verifyTokenizationCallback(payload);

  if (!result.valid || !result.token) {
    console.error(`[card-update] invalid/failed tokenization callback for subscription=${subscriptionId}:`, result);
    return { ok: false, reason: 'callback_invalid' };
  }

  const consumeResult = validateAndConsumeMagicLinkToken(magicLinkToken);
  if (!consumeResult.valid) {
    console.error(
      `[card-update] magic-link token invalid for subscription=${subscriptionId}: ${consumeResult.reason}`
    );
    return { ok: false, reason: 'token_invalid' };
  }
  if (consumeResult.subscriptionId !== subscriptionId) {
    console.error(
      `[card-update] magic-link token/subscriptionId mismatch: token belongs to ${consumeResult.subscriptionId}, query said ${subscriptionId}. Refusing to apply.`
    );
    return { ok: false, reason: 'token_subscription_mismatch' };
  }

  const subscription = getSubscriptionById(subscriptionId);
  if (!subscription) {
    console.error(`[card-update] subscription=${subscriptionId} not found after consuming token.`);
    return { ok: false, reason: 'subscription_not_found' };
  }

  const timestamp = nowIso();
  const encryptedToken = encryptToken(result.token);

  db.prepare(
    `UPDATE subscriptions
     SET provider_token = @provider_token,
         card_last4 = @card_last4,
         card_expiry = @card_expiry,
         updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id: subscriptionId,
    provider_token: encryptedToken,
    card_last4: result.cardLast4 ?? null,
    card_expiry: result.cardExpiry ?? null,
    updated_at: timestamp,
  });

  insertSubscriptionEvent(db, {
    id: crypto.randomUUID(),
    subscription_id: subscriptionId,
    event_type: 'card_updated',
    metadata: JSON.stringify({ cardLast4: result.cardLast4, cardExpiry: result.cardExpiry }),
    created_at: timestamp,
  });

  let recharged = false;
  let rechargeOutcome: ChargeOutcome | undefined;

  if (subscription.status === 'past_due') {
    // A past_due row has next_charge_at = NULL by design (see
    // cron-charge.ts's non-retryable-failure branch: it's nulled
    // specifically so the cron never silently re-attempts a known-bad
    // card). Give it a fresh next_charge_at = now so chargeOneSubscription's
    // belt-and-suspenders "never charge next_charge_at IS NULL" guard
    // doesn't skip this legitimate, customer-initiated retry.
    const now = new Date();
    db.prepare(
      `UPDATE subscriptions SET next_charge_at = @next_charge_at, updated_at = @updated_at WHERE id = @id`
    ).run({ id: subscriptionId, next_charge_at: now.toISOString(), updated_at: now.toISOString() });

    const freshRow = getSubscriptionById(subscriptionId) as SubscriptionRow;
    // Same shared helper the cron uses — no second copy of the charge state
    // machine. On success this sets status='active' with a fresh
    // next_charge_at; on failure it follows the exact same
    // retry/expire/past_due logic the cron would, including its own
    // customer/admin emails.
    rechargeOutcome = await chargeOneSubscription(freshRow, now);
    recharged = rechargeOutcome === 'succeeded';
  }

  // Mint a fresh magic-link token for the redirect landing page — the one
  // that brought the customer here was just consumed above.
  const { token: freshToken } = generateMagicLinkToken(subscriptionId);

  return { ok: true, subscriptionId, recharged, rechargeOutcome, freshToken };
}
