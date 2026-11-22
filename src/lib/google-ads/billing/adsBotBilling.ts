/**
 * Ads Bot billing (mission 2026-11-22 item 3, Decisions C and D2). Built on the shared recurring engine
 * (src/lib/payments/subscriptions.ts) with ADS_BOT_PLAN (plans.ts): first charge on the sign-up day, then monthly on the
 * same day, Site-Bot dunning. MOCK PROVIDER ONLY until Takbull's API is confirmed (providers/takbull.ts stays a stub).
 *
 *   startAdsBotCheckout     signed pay link + consent  -> termsConsent in the readiness record, pending subscription
 *   completeAdsBotCheckout  provider callback          -> sign-up charge, readiness feePaid
 *   recordManualAdsBotCharge admin, Takbull back office -> active row (never charged by the cron), readiness feePaid
 *   notifyAdsBotCancellation cancel route              -> staff alert: pause, landing-page offline date, MCC unlink
 *
 * The readiness record is written ONLY through live-readiness-store.ts (one store). The 30-day money-back clock starts
 * at the first ad impression and is NOT derived from any date here.
 * Zero Hebrew in this module: all customer copy lives in adsBotBillingStrings.json; staff text is English.
 */
import crypto from 'crypto';
import { getDb, insertCharge, insertSubscription, insertSubscriptionEvent, type SubscriptionRow } from '../../payments/db';
import { ADS_BOT_PLAN, planChargeAmount, planSummary, type PlanSummary } from '../../payments/plans';
import {
  activatePlanSubscription,
  createPendingPlanSubscription,
  getSubscriptionById,
  planPaidThrough,
} from '../../payments/subscriptions';
import { paymentProviderKind } from '../../payments/get-provider';
import { updateLiveReadinessRecord } from '../live-readiness-store';
import { addCalendarDays, israelDate, SITE_OFFLINE_AFTER_DAYS } from '../../site-bot/offlineDate';
import { ADS_BOT_TERMS_VERSION } from './adsBotTerms';
import { buildPayLinkUrl, createPayLinkToken, verifyPayLinkToken } from './adsBotPayLink';
import { buildAdsBotPayLinkEmail } from './adsBotCheckoutCopy';

const CLIENT_ID = /^[a-z0-9-]+$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Provider value stored on rows recorded by hand from Takbull's back office. The charge cron never touches them. */
export const MANUAL_TAKBULL_PROVIDER = 'takbull-manual';

/** Landing page stays up this many days after the cancellation takes effect (same rule as Site-Bot, terms §8). */
export const ADS_BOT_LP_OFFLINE_AFTER_DAYS = SITE_OFFLINE_AFTER_DAYS;

// ---------------------------------------------------------------------------------------------------------------------
// Client <-> subscription link (subscription_events 'ads_bot_client_linked')
// ---------------------------------------------------------------------------------------------------------------------

function linkClient(subscriptionId: string, clientId: string, timestamp: string): void {
  insertSubscriptionEvent(getDb(), {
    id: crypto.randomUUID(),
    subscription_id: subscriptionId,
    event_type: 'ads_bot_client_linked',
    metadata: JSON.stringify({ clientId }),
    created_at: timestamp,
  });
}

/** The Ads Bot client a subscription belongs to, or null. */
export function adsBotClientForSubscription(subscriptionId: string): string | null {
  const row = getDb()
    .prepare(`SELECT metadata FROM subscription_events WHERE subscription_id = ? AND event_type = 'ads_bot_client_linked' ORDER BY created_at LIMIT 1`)
    .get(subscriptionId) as { metadata: string | null } | undefined;
  if (!row?.metadata) return null;
  try {
    const clientId = (JSON.parse(row.metadata) as { clientId?: unknown }).clientId;
    return typeof clientId === 'string' && CLIENT_ID.test(clientId) ? clientId : null;
  } catch {
    return null;
  }
}

/** Every Ads Bot subscription linked to `clientId`, newest first. */
export function adsBotSubscriptionsForClient(clientId: string): SubscriptionRow[] {
  const ids = getDb()
    .prepare(
      `SELECT DISTINCT e.subscription_id AS id FROM subscription_events e JOIN subscriptions s ON s.id = e.subscription_id
       WHERE e.event_type = 'ads_bot_client_linked' AND json_extract(e.metadata, '$.clientId') = ? AND s.plan = ?
       ORDER BY s.created_at DESC`
    )
    .all(clientId, ADS_BOT_PLAN.id) as Array<{ id: string }>;
  return ids.map(({ id }) => getSubscriptionById(id)).filter((row): row is SubscriptionRow => row !== null);
}

/** A subscription that is still paying / paid up (not pending, not canceled or scheduled to cancel). */
function isLive(row: SubscriptionRow): boolean {
  return ['active', 'past_due', 'trialing'].includes(row.status) && row.cancel_at_period_end !== 1;
}

// ---------------------------------------------------------------------------------------------------------------------
// Checkout (behind ADS_BOT_CHECKOUT_ENABLED in the routes)
// ---------------------------------------------------------------------------------------------------------------------

export type StartCheckoutResult =
  | { ok: true; subscriptionId: string; providerSessionId: string; redirectUrl: string; mockProvider: boolean; summary: PlanSummary }
  | { ok: false; error: 'invalid_link' | 'consent_required' | 'already_subscribed' | 'consent_not_recorded' };

/**
 * Pay-page submit: verifies the signed link, requires the consent checkbox, records termsConsent (server-side terms
 * version + timestamp) in the client's readiness record, then opens a pending ADS_BOT_PLAN subscription. Nothing is
 * charged here.
 */
export async function startAdsBotCheckout(params: {
  token: unknown;
  consent: unknown;
  origin: string;
  now?: Date;
}): Promise<StartCheckoutResult> {
  const now = params.now ?? new Date();
  const claims = verifyPayLinkToken(params.token, { now });
  if (!claims) return { ok: false, error: 'invalid_link' };
  if (params.consent !== true) return { ok: false, error: 'consent_required' };
  if (adsBotSubscriptionsForClient(claims.clientId).some(isLive)) return { ok: false, error: 'already_subscribed' };

  const consentedAt = now.toISOString();
  const recorded = updateLiveReadinessRecord(
    claims.clientId,
    { termsConsent: { termsVersion: ADS_BOT_TERMS_VERSION, consentedAt } },
    { source: 'ads-bot-checkout', now },
  );
  if (!recorded) return { ok: false, error: 'consent_not_recorded' };

  const returnUrl = buildPayLinkUrl(params.origin, String(params.token));
  const { subscriptionId, redirectUrl, providerSessionId } = await createPendingPlanSubscription({
    plan: ADS_BOT_PLAN,
    userId: claims.email,
    returnUrl,
    now,
  });
  linkClient(subscriptionId, claims.clientId, consentedAt);
  return {
    ok: true,
    subscriptionId,
    providerSessionId,
    redirectUrl,
    mockProvider: paymentProviderKind() === 'mock',
    summary: planSummary(ADS_BOT_PLAN),
  };
}

export type CompleteCheckoutResult =
  | { ok: true; subscriptionId: string; alreadyActive: boolean }
  | { ok: false; error: 'not_ads_bot' | 'subscription_not_found' | 'subscription_not_pending' | 'callback_invalid' | 'charge_failed'; retryable?: boolean };

/** Provider callback: takes the sign-up charge (shared engine) and, once paid, sets readiness feePaid. Replay-safe. */
export async function completeAdsBotCheckout(params: { subscriptionId: unknown; payload: unknown; now?: Date }): Promise<CompleteCheckoutResult> {
  const now = params.now ?? new Date();
  if (typeof params.subscriptionId !== 'string' || !params.subscriptionId) return { ok: false, error: 'subscription_not_found' };
  const subscription = getSubscriptionById(params.subscriptionId);
  if (!subscription) return { ok: false, error: 'subscription_not_found' };
  const clientId = adsBotClientForSubscription(subscription.id);
  if (subscription.plan !== ADS_BOT_PLAN.id || !clientId) return { ok: false, error: 'not_ads_bot' };

  const outcome = await activatePlanSubscription(subscription.id, params.payload, now);
  if (!outcome.ok) return { ok: false, error: outcome.reason, ...(outcome.retryable !== undefined ? { retryable: outcome.retryable } : {}) };
  updateLiveReadinessRecord(clientId, { feePaid: true }, { source: 'ads-bot-checkout', now });
  return { ok: true, subscriptionId: subscription.id, alreadyActive: outcome.alreadyActive };
}

// ---------------------------------------------------------------------------------------------------------------------
// Manual charge recorded by an admin (pilot: charged by hand in Takbull's back office)
// ---------------------------------------------------------------------------------------------------------------------

export interface ManualChargeInput {
  clientId: string;
  email: string;
  /** The day Takbull charged the card: YYYY-MM-DD (taken as 09:00 Israel time) or a full ISO timestamp. */
  chargeDate: string;
  /** VAT-inclusive amount actually charged, ILS. */
  amount: number;
  takbullReference: string;
}

export type ManualChargeResult =
  | { ok: true; subscriptionId: string; created: boolean; periodsPaid: number; paidThrough: string | null; amountMatchesPlan: boolean }
  | { ok: false; error: 'invalid_client' | 'invalid_email' | 'invalid_date' | 'invalid_amount' | 'invalid_reference' | 'duplicate_reference' | 'readiness_write_failed' };

function parseChargeDate(value: string): string | null {
  const trimmed = value.trim();
  // A bare date is the Israel calendar day; 07:00 UTC is 09:00/10:00 Israel time, safely inside that day.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T07:00:00.000Z` : trimmed;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/**
 * Records one charge taken by hand in Takbull. The first one creates an `active` ADS_BOT_PLAN row anchored at the charge
 * date (provider 'takbull-manual', next_charge_at NULL so the charge cron never charges it); each later one adds a
 * paid period. Every call sets readiness feePaid. A Takbull reference can be recorded once.
 */
export function recordManualAdsBotCharge(input: ManualChargeInput, now: Date = new Date()): ManualChargeResult {
  const clientId = input.clientId?.trim() ?? '';
  if (!CLIENT_ID.test(clientId)) return { ok: false, error: 'invalid_client' };
  const email = input.email?.trim() ?? '';
  if (!EMAIL.test(email)) return { ok: false, error: 'invalid_email' };
  const chargedAt = parseChargeDate(input.chargeDate ?? '');
  if (!chargedAt || chargedAt > new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()) return { ok: false, error: 'invalid_date' };
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return { ok: false, error: 'invalid_amount' };
  const reference = input.takbullReference?.trim() ?? '';
  if (!reference || reference.length > 100) return { ok: false, error: 'invalid_reference' };

  const db = getDb();
  const duplicate = db.prepare(`SELECT id FROM charges WHERE provider_transaction_id = ?`).get(reference);
  if (duplicate) return { ok: false, error: 'duplicate_reference' };

  const timestamp = now.toISOString();
  const existing = adsBotSubscriptionsForClient(clientId).find(row => isLive(row) && row.provider === MANUAL_TAKBULL_PROVIDER);
  let subscriptionId: string;
  let periodsPaid: number;
  let created = false;

  const run = db.transaction(() => {
    if (existing) {
      subscriptionId = existing.id;
      periodsPaid = (existing.periods_paid ?? 0) + 1;
      db.prepare(`UPDATE subscriptions SET periods_paid = ?, updated_at = ? WHERE id = ?`).run(periodsPaid, timestamp, subscriptionId);
    } else {
      created = true;
      subscriptionId = crypto.randomUUID();
      periodsPaid = 1;
      insertSubscription(db, {
        id: subscriptionId,
        user_id: email,
        status: 'active',
        provider: MANUAL_TAKBULL_PROVIDER,
        provider_token: null,
        card_last4: null,
        card_expiry: null,
        trial_amount: null,
        recurring_amount: planChargeAmount(ADS_BOT_PLAN),
        currency: ADS_BOT_PLAN.currency,
        next_charge_at: null,
        canceled_at: null,
        cancel_reason: null,
        failed_attempts: 0,
        created_at: timestamp,
        updated_at: timestamp,
        joined_at: chargedAt,
        extended_cancellation_flag: null,
        extended_flag_basis: null,
        plan: ADS_BOT_PLAN.id,
        net_amount: ADS_BOT_PLAN.netAmount,
        vat_mode: ADS_BOT_PLAN.vat.mode,
        vat_rate: ADS_BOT_PLAN.vat.rate,
        billing_interval: ADS_BOT_PLAN.interval,
        billing_anchor_at: chargedAt,
        periods_paid: 1,
        dunning_started_at: null,
        paused_at: null,
      });
      insertSubscriptionEvent(db, {
        id: crypto.randomUUID(),
        subscription_id: subscriptionId,
        event_type: 'created',
        metadata: JSON.stringify({ plan: ADS_BOT_PLAN.id, source: 'manual-takbull', netAmount: ADS_BOT_PLAN.netAmount, vatRate: ADS_BOT_PLAN.vat.rate }),
        created_at: timestamp,
      });
      linkClient(subscriptionId, clientId, timestamp);
    }
    insertCharge(db, {
      id: crypto.randomUUID(),
      subscription_id: subscriptionId,
      idempotency_key: `manual-takbull:${reference}`,
      amount,
      status: 'succeeded',
      attempt_number: 1,
      provider_transaction_id: reference,
      error_code: null,
      error_message: null,
      invoice_id: null,
      charged_at: chargedAt,
      created_at: timestamp,
      refunded_at: null,
      refund_amount: null,
      refund_provider_ref: null,
    });
    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: subscriptionId,
      event_type: 'manual_charge_recorded',
      metadata: JSON.stringify({ takbullReference: reference, amount, chargedAt, periodsPaid }),
      created_at: timestamp,
    });
  });
  run();

  const ok = updateLiveReadinessRecord(clientId, { feePaid: true }, { source: 'admin-manual-takbull-charge', now });
  if (!ok) return { ok: false, error: 'readiness_write_failed' };
  const row = getSubscriptionById(subscriptionId!);
  return {
    ok: true,
    subscriptionId: subscriptionId!,
    created,
    periodsPaid: periodsPaid!,
    paidThrough: row ? planPaidThrough(row) : null,
    amountMatchesPlan: amount === planChargeAmount(ADS_BOT_PLAN),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Pay link email (admin-sent after approval)
// ---------------------------------------------------------------------------------------------------------------------

/** The pay link and its email, ready to send. Throws when the pay-link secret is missing or the input is invalid. */
export function buildAdsBotPayLinkMessage(params: { clientId: string; email: string; firstName: string; origin: string; now?: Date }): {
  payLink: string;
  subject: string;
  text: string;
} {
  const token = createPayLinkToken({ clientId: params.clientId, email: params.email }, { now: params.now });
  const payLink = buildPayLinkUrl(params.origin, token);
  return { payLink, ...buildAdsBotPayLinkEmail({ firstName: params.firstName, payLink }) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Cancel hook
// ---------------------------------------------------------------------------------------------------------------------

/** Staff alert for an Ads Bot cancellation, or null when the subscription is not Ads Bot. English, plain text. */
export function buildAdsBotCancelStaffAlert(subscription: SubscriptionRow, effectiveAt: string, clientId: string | null): { subject: string; text: string } | null {
  if (subscription.plan !== ADS_BOT_PLAN.id) return null;
  const effectiveDay = israelDate(effectiveAt);
  const lpOfflineDay = addCalendarDays(effectiveDay, ADS_BOT_LP_OFFLINE_AFTER_DAYS);
  const who = clientId ?? 'UNKNOWN (no client link)';
  return {
    subject: `WAO Ads Bot cancellation - client ${who}, effective ${effectiveDay}`,
    text: [
      `An Ads Bot subscription was cancelled.`,
      `Client: ${who}`,
      `Customer: ${subscription.user_id}`,
      `Subscription: ${subscription.id} (provider: ${subscription.provider})`,
      `Cancellation takes effect: ${effectiveDay} (end of the paid month, Israel date).`,
      ``,
      `TODO 1 - Pause every campaign in the client's Google Ads account by ${effectiveDay}.`,
      `TODO 2 - Take the landing page offline on ${lpOfflineDay} (${ADS_BOT_LP_OFFLINE_AFTER_DAYS} days after the cancellation takes effect).`,
      `TODO 3 - Remove the WAO manager (MCC) link from the client's Google Ads account. The client stays ADMIN of his own account.`,
      ...(subscription.provider === MANUAL_TAKBULL_PROVIDER
        ? [`TODO 4 - This client is charged by hand: stop the standing charge in Takbull's back office today.`]
        : []),
    ].join('\n'),
  };
}

/**
 * Cancel route hook: for an Ads Bot subscription, sends the staff alert through the billing staff-alert channel.
 * Never throws; returns whether an alert was sent. `send` is injectable for tests.
 */
export async function notifyAdsBotCancellation(
  subscriptionId: string,
  effectiveAt: string,
  send?: (alert: { subject: string; text: string }) => Promise<boolean>,
): Promise<boolean> {
  try {
    const subscription = getSubscriptionById(subscriptionId);
    if (!subscription) return false;
    const alert = buildAdsBotCancelStaffAlert(subscription, effectiveAt, adsBotClientForSubscription(subscriptionId));
    if (!alert) return false;
    const sender = send ?? (await import('../../payments/email')).sendBillingStaffAlertEmail;
    return await sender(alert);
  } catch {
    console.error(`[ads-bot-billing] cancel staff alert failed subscription=${subscriptionId}`);
    return false;
  }
}
