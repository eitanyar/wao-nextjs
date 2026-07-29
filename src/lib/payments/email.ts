/**
 * Outbound transactional email for the billing engine (trial-charge
 * confirmation, magic-link cancel requests).
 *
 * ## Gap being stubbed
 * There is no dedicated transactional-email service in this repo yet. The
 * only existing precedent is `src/app/api/exit-survey/route.ts`, which uses
 * `nodemailer` with plain SMTP creds (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`)
 * and silently no-ops if they're unset. This module follows the exact same
 * pattern/env vars for consistency, so real sending "just works" the moment
 * those env vars are set in production — but until then (and in local dev),
 * every email is also unconditionally logged to the console with a clear
 * `[billing-email]` tag AND appended to a local JSONL file
 * (`data/payments/email-outbox.jsonl`) so its content — including the cancel
 * link — is inspectable without needing real SMTP. This is a stub, not a
 * real email pipeline: no retries, no bounce handling, no templating engine,
 * no delivery guarantees. Flagged explicitly in the handoff report.
 */

import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

export interface BillingEmailPayload {
  to: string;
  subject: string;
  text: string;
  /** Present on every email that must carry a cancel link (see brief: "every receipt/charge-confirmation email"). */
  cancelUrl?: string;
}

function logToOutbox(payload: BillingEmailPayload, sent: boolean): void {
  const record = { ...payload, sent, timestamp: new Date().toISOString() };
  console.log(`[billing-email] ${sent ? 'sent via SMTP' : 'STUBBED (no SMTP configured)'} →`, record);

  try {
    const dir = path.join(process.cwd(), 'data', 'payments');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'email-outbox.jsonl'), JSON.stringify(record) + '\n');
  } catch (err) {
    console.warn('[billing-email] Failed to append to local email-outbox log:', err);
  }
}

async function sendBillingEmail(payload: BillingEmailPayload): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    logToOutbox(payload, false);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: `"WAO" <${smtpUser}>`,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });

  logToOutbox(payload, true);
}

/**
 * Trial-charge confirmation email. Per the brief, this MUST always include a
 * freshly generated magic-link cancel URL — never just a receipt with no
 * way out.
 */
export async function sendTrialChargeConfirmationEmail(params: {
  to: string;
  trialAmount: number;
  currency: string;
  cardLast4: string;
  cancelUrl: string;
}): Promise<void> {
  const { to, trialAmount, currency, cardLast4, cancelUrl } = params;
  const subject = 'WAO — Trial charge confirmation';
  const text = [
    `Your WAO subscription trial charge of ${trialAmount} ${currency} on card ending ${cardLast4} was processed successfully.`,
    '',
    `Want to cancel? Use this link any time (valid for 30 minutes from now, generate a new one from the cancel page if it expires):`,
    cancelUrl,
  ].join('\n');

  await sendBillingEmail({ to, subject, text, cancelUrl });
}

/** Magic-link cancel request email (self-serve, on-demand). */
export async function sendMagicLinkCancelEmail(params: {
  to: string;
  cancelUrl: string;
}): Promise<void> {
  const { to, cancelUrl } = params;
  const subject = 'WAO — Manage your subscription';
  const text = [
    'Use this link to view your subscription and cancel it if you want to (valid for 30 minutes):',
    cancelUrl,
  ].join('\n');

  await sendBillingEmail({ to, subject, text, cancelUrl });
}

// ---------------------------------------------------------------------------
// Added for the cron recurring-charge engine (task #9). Same stub posture as
// the rest of this module (console + JSONL outbox, real SMTP if configured).
// ---------------------------------------------------------------------------

/**
 * Successful recurring-renewal charge receipt. Per the "every receipt
 * includes a cancel link" rule, always carries a freshly minted magic-link
 * cancel URL — same as the trial-charge confirmation.
 */
export async function sendRenewalChargeConfirmationEmail(params: {
  to: string;
  amount: number;
  currency: string;
  cardLast4: string;
  cancelUrl: string;
}): Promise<void> {
  const { to, amount, currency, cardLast4, cancelUrl } = params;
  const subject = 'WAO — Your subscription renewal receipt';
  const text = [
    `Your WAO subscription renewal charge of ${amount} ${currency} on card ending ${cardLast4} was processed successfully.`,
    '',
    `Want to cancel? Use this link any time (valid for 30 minutes from now, generate a new one from the cancel page if it expires):`,
    cancelUrl,
  ].join('\n');

  await sendBillingEmail({ to, subject, text, cancelUrl });
}

/**
 * "Your trial is about to convert to a full charge" chargeback-mitigation
 * reminder, sent 3-5 days before the first recurring charge. Sender identity
 * must read as WAO, not the payment processor — see brief.
 */
export async function sendTrialEndingReminderEmail(params: {
  to: string;
  chargeDate: string;
  amount: number;
  currency: string;
}): Promise<void> {
  const { to, chargeDate, amount, currency } = params;
  const subject = 'WAO — Your subscription trial is ending soon';
  const text = [
    `This is a heads-up from WAO: your subscription trial is ending, and your card will be charged ${amount} ${currency} on ${chargeDate}.`,
    '',
    'No action is needed if you want to continue. You can manage or cancel your subscription any time from your account page.',
  ].join('\n');

  await sendBillingEmail({ to, subject, text });
}

/**
 * Sent when a card was declined in a way that isn't auto-retryable (e.g. a
 * hard decline). Points the customer at the account page via a fresh
 * magic-link — there is no dedicated card-update route yet (later task), but
 * this at least lets them see the past_due status and cancel if they want.
 */
export async function sendCardUpdateNeededEmail(params: {
  to: string;
  manageUrl: string;
}): Promise<void> {
  const { to, manageUrl } = params;
  const subject = 'WAO — We could not process your subscription charge';
  const text = [
    'We tried to charge your card for your WAO subscription and it was declined.',
    'This charge will not be retried automatically. Please update your card or manage your subscription here:',
    manageUrl,
  ].join('\n');

  await sendBillingEmail({ to, subject, text, cancelUrl: manageUrl });
}

/**
 * Sent to the customer when a subscription is terminally expired after 3
 * consecutive retryable failures.
 */
export async function sendSubscriptionExpiredEmail(params: { to: string }): Promise<void> {
  const { to } = params;
  const subject = 'WAO — Your subscription has been canceled';
  const text = [
    'We were unable to charge your card for your WAO subscription after several attempts, so it has been canceled.',
    'If you would like to resubscribe, please contact us or sign up again.',
  ].join('\n');

  await sendBillingEmail({ to, subject, text });
}

/**
 * Proactive "your card is expiring soon" notice (card-update-flow task) —
 * distinct from `sendCardUpdateNeededEmail` (that one is reactive, sent only
 * after an actual decline). Sent at most once per calendar month per
 * subscription (see `cron-card-expiry.ts` gating). Always carries a
 * card-update magic link so the customer can act immediately.
 */
export async function sendCardExpiringSoonEmail(params: {
  to: string;
  cardLast4: string;
  cardExpiry: string;
  updateCardUrl: string;
}): Promise<void> {
  const { to, cardLast4, cardExpiry, updateCardUrl } = params;
  const subject = 'WAO — Your card on file is expiring soon';
  const text = [
    `Heads up: the card on file for your WAO subscription (ending ${cardLast4}) expires ${cardExpiry}.`,
    'To avoid an interruption to your subscription, please update your card here:',
    updateCardUrl,
  ].join('\n');

  await sendBillingEmail({ to, subject, text, cancelUrl: updateCardUrl });
}

/**
 * Internal ops alert (not customer-facing) for a terminally expired
 * subscription, so billing/support can follow up manually if needed.
 * Recipient comes from `BILLING_ADMIN_ALERT_EMAIL` — no existing
 * admin-alert-email convention was found elsewhere in the repo to reuse, so
 * this is a new, dedicated env var (documented in the handoff report). No-ops
 * (logs + returns) if unset, since alerting infra is optional.
 */
export async function sendBillingAdminAlertEmail(params: {
  subscriptionId: string;
  userEmail: string;
  reason: string;
}): Promise<void> {
  const to = process.env.BILLING_ADMIN_ALERT_EMAIL;
  if (!to) {
    console.warn(
      '[billing-email] BILLING_ADMIN_ALERT_EMAIL not configured — skipping internal expiry alert for subscription',
      params.subscriptionId
    );
    return;
  }

  const { subscriptionId, userEmail, reason } = params;
  const subject = `WAO billing alert — subscription ${subscriptionId} expired`;
  const text = [
    `Subscription ${subscriptionId} (customer: ${userEmail}) was automatically expired after 3 consecutive failed charge attempts.`,
    `Reason: ${reason}`,
  ].join('\n');

  await sendBillingEmail({ to, subject, text });
}
