/**
 * Outbound transactional email for the billing engine (trial-charge
 * confirmation, magic-link cancel requests).
 *
 * The four client emails (manage link, renewal receipt, card update needed, card expiring) are Hebrew from
 * accountCopy.ts with an RTL HTML part; the legacy trial-engine emails (trial charge, trial ending, expired) stay
 * English, plain text only.
 *
 * Uses Resend (https://resend.com) for email sending. Requires `RESEND_API_KEY`
 * env var; silently logs locally if unset (for dev). Every email is logged to
 * the console with a `[billing-email]` tag AND appended to a local JSONL file
 * (`data/payments/email-outbox.jsonl`) so its content — including any links —
 * is inspectable in dev/test.
 */

import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import { BILLING_EMAIL_COPY as COPY, fillTemplate, formatAccountPrice } from './accountCopy';

export interface BillingEmailPayload {
  to: string;
  subject: string;
  text: string;
  /** Hebrew client emails also carry an RTL HTML part (plain text stays the fallback). */
  html?: string;
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
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    logToOutbox(payload, false);
    return;
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: 'billing@wao.co.il',
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      ...(payload.html ? { html: payload.html } : {}),
    });
    logToOutbox(payload, true);
  } catch (err) {
    console.error('[billing-email] Failed to send via Resend:', err);
    logToOutbox(payload, false);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Hebrew client emails: one line list renders both parts. Text lines are templates ({name} placeholders); in the HTML
// part every interpolated value is escaped and LTR-isolated, and every URL sits on its own line.
// ---------------------------------------------------------------------------

type EmailLine =
  | { text: string; values?: Readonly<Record<string, string>> }
  | { url: string }
  | { blank: true };

export function escapeEmailHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fillHtml(template: string, values: Readonly<Record<string, string>>): string {
  fillTemplate(template, values); // throws on a missing value, same as the text part
  return template
    .split(/(\{[A-Za-z0-9_]+\})/)
    .map((part) => {
      const name = /^\{([A-Za-z0-9_]+)\}$/.exec(part)?.[1];
      return name ? `<span dir="ltr">${escapeEmailHtml(values[name])}</span>` : escapeEmailHtml(part);
    })
    .join('');
}

export function renderClientEmail(lines: readonly EmailLine[]): { text: string; html: string } {
  const text = lines
    .map((line) => ('url' in line ? line.url : 'blank' in line ? '' : fillTemplate(line.text, line.values ?? {})))
    .join('\n');
  const body = lines
    .map((line) =>
      'blank' in line
        ? ''
        : 'url' in line
        ? `<p dir="ltr"><a href="${escapeEmailHtml(line.url)}">${escapeEmailHtml(line.url)}</a></p>`
        : `<p>${fillHtml(line.text, line.values ?? {})}</p>`
    )
    .join('');
  return { text, html: `<div dir="rtl" lang="he">${body}</div>` };
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

/**
 * Magic-link manage-subscription email (sign-up and self-serve, on-demand). `supportBoxShown`: the account page shows
 * the support box for this subscription (siteBotSupportBoxShown); only then does the body mention writing to support.
 */
export async function sendMagicLinkCancelEmail(params: {
  to: string;
  cancelUrl: string;
  supportBoxShown?: boolean;
}): Promise<void> {
  const { to, cancelUrl } = params;
  await sendBillingEmail({ to, ...buildMagicLinkEmail(params), cancelUrl });
}

export interface ClientEmailContent {
  subject: string;
  text: string;
  html: string;
}

export function buildMagicLinkEmail(params: { cancelUrl: string; supportBoxShown?: boolean }): ClientEmailContent {
  const { cancelUrl, supportBoxShown = false } = params;
  return {
    subject: COPY.magicLinkSubject,
    ...renderClientEmail([{ text: supportBoxShown ? COPY.magicLinkBodyWithSupport : COPY.magicLinkBody }, { url: cancelUrl }]),
  };
}

export function buildRenewalChargeEmail(params: { amount: number; currency: string; cardLast4: string; cancelUrl: string }): ClientEmailContent {
  const { amount, currency, cardLast4, cancelUrl } = params;
  // `amount` is the VAT-inclusive charge (recurring_amount); {price} is its he-IL currency format.
  return {
    subject: COPY.renewalSubject,
    ...renderClientEmail([
      { text: COPY.renewalBody, values: { price: formatAccountPrice(amount, currency), cardLast4 } },
      { blank: true },
      { text: COPY.renewalCancelLine },
      { url: cancelUrl },
    ]),
  };
}

export function buildCardUpdateNeededEmail(params: { manageUrl: string }): ClientEmailContent {
  return {
    subject: COPY.cardUpdateNeededSubject,
    ...renderClientEmail([{ text: COPY.cardUpdateNeededBody1 }, { text: COPY.cardUpdateNeededBody2 }, { url: params.manageUrl }]),
  };
}

export function buildCardExpiringSoonEmail(params: { cardLast4: string; cardExpiry: string; updateCardUrl: string }): ClientEmailContent {
  const { cardLast4, cardExpiry, updateCardUrl } = params;
  return {
    subject: COPY.cardExpiringSubject,
    ...renderClientEmail([
      { text: COPY.cardExpiringBody1, values: { cardExpiry, cardLast4 } },
      { text: COPY.cardExpiringBody2 },
      { url: updateCardUrl },
    ]),
  };
}

// ---------------------------------------------------------------------------
// Added for the cron recurring-charge engine (task #9). Same posture as
// the rest of this module (console + JSONL outbox, real Resend if configured).
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
  const { to, cancelUrl } = params;
  await sendBillingEmail({ to, ...buildRenewalChargeEmail(params), cancelUrl });
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
  await sendBillingEmail({ to, ...buildCardUpdateNeededEmail(params), cancelUrl: manageUrl });
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
  const { to, updateCardUrl } = params;
  await sendBillingEmail({ to, ...buildCardExpiringSoonEmail(params), cancelUrl: updateCardUrl });
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
