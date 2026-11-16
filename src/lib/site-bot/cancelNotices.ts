/**
 * Site-Bot cancellation notices (launch-readiness capability 12).
 *
 * - Cancel confirmation to the owner, sent from the cancel route right after a self-serve cancel (and caught up by the
 *   daily lifecycle cron within CONFIRMATION_CATCH_UP_DAYS, never later: a late "you cancelled" would confuse).
 * - "Offline soon" to the owner, sent by the daily cron from 7 days before the offline date until the offline date.
 * - Take-down reminder to staff on the offline date (English, not copy-gated), for 30 days at most after it.
 *
 * Dates: offlineDate = the Israel date the cancellation takes effect + 30 days (offlineDate.ts, terms §8).
 * {accountLink} is the plain /account/subscription URL (the owner asks for a fresh sign-in link there); never a token
 * URL, which expires in 30 minutes. Each notice is one-time through site_bot_notices. Owner emails stay unsent while
 * the copy is pending (cancelNoticeCopy.ts). Zero Hebrew in this module.
 */
import { SITE_BOT_PLAN } from '../payments/plans';
import { getDb, type SubscriptionRow } from '../payments/db';
import { formatAccountDate } from '../payments/accountCopy';
import { resolveClientIdentity } from './clientMessages';
import { defaultMailTransport, staffAlertAddress, supportFromAddress, type MailTransport } from './clientMessageEmail';
import { fillCopy, renderLifecycleEmail } from './lifecycleEmail';
import {
  CANCEL_EMAIL_COPY_KEYS,
  cancelNoticeCopyReady,
  OFFLINE_SOON_COPY_KEYS,
  SITE_BOT_CANCEL_NOTICE_COPY,
  SITE_BOT_CANCEL_NOTICE_COPY_PENDING,
} from './cancelNoticeCopy';
import {
  addCalendarDays,
  cancellationEffectiveAt,
  dateOnlyToNoonIso,
  israelDate,
  israelDateReached,
  offlineSoonDate,
  siteOfflineDate,
} from './offlineDate';
import { claimNotice, completeNotice, getSiteBotSite, noticeSent, releaseNotice, type NoticeKind } from './siteLifecycleStore';

export const CONFIRMATION_CATCH_UP_DAYS = 2;
export const TAKEDOWN_REMINDER_WINDOW_DAYS = 30;

type CopyOptions = { copy?: Readonly<Record<string, string>>; pending?: boolean };

/** The plain account page URL (no token). */
export function accountPageUrl(env: Record<string, string | undefined> = process.env): string {
  return `${(env.NEXT_PUBLIC_BASE_URL || 'https://www.wao.co.il').replace(/\/+$/, '')}/account/subscription`;
}

export interface CancelNoticeContext {
  subscriptionId: string;
  email: string | null;
  businessName: string | null;
  effectiveAt: string;
  offlineDate: string;
  offlineSoonDate: string;
  ownDomain: boolean;
  siteUrl: string | null;
  values: { businessName: string; paidThrough: string; offlineDate: string; accountLink: string };
}

/** Null when the row is not a cancelled Site-Bot subscription. */
export function cancelNoticeContext(subscription: SubscriptionRow): CancelNoticeContext | null {
  if (subscription.plan !== SITE_BOT_PLAN.id) return null;
  const effectiveAt = cancellationEffectiveAt(subscription);
  if (!effectiveAt) return null;
  const offline = siteOfflineDate(effectiveAt);
  const identity = resolveClientIdentity(subscription.id);
  const site = getSiteBotSite(subscription.id);
  const businessName = site?.business_name?.trim() || identity.businessName;
  return {
    subscriptionId: subscription.id,
    email: identity.contactEmail,
    businessName,
    effectiveAt,
    offlineDate: offline,
    offlineSoonDate: offlineSoonDate(offline),
    ownDomain: site?.own_domain === 1,
    siteUrl: site?.site_url ?? null,
    values: {
      businessName: businessName ?? '',
      paidThrough: formatAccountDate(effectiveAt),
      offlineDate: formatAccountDate(dateOnlyToNoonIso(offline)),
      accountLink: accountPageUrl(),
    },
  };
}

function getSubscription(subscriptionId: string): SubscriptionRow | null {
  return (getDb().prepare(`SELECT * FROM subscriptions WHERE id = ?`).get(subscriptionId) as SubscriptionRow | undefined) ?? null;
}

export type NoticeOutcome = 'sent' | 'stubbed' | 'already_sent' | 'copy_pending' | 'not_cancelled' | 'no_email' | 'not_due' | 'failed';

async function sendOwnerNotice(
  ctx: CancelNoticeContext,
  kind: Extract<NoticeKind, 'cancel_confirmation' | 'offline_soon'>,
  now: Date,
  transport: MailTransport,
  options: CopyOptions
): Promise<NoticeOutcome> {
  const copy = options.copy ?? SITE_BOT_CANCEL_NOTICE_COPY;
  const pending = options.pending ?? SITE_BOT_CANCEL_NOTICE_COPY_PENDING;
  const keys = kind === 'cancel_confirmation' ? CANCEL_EMAIL_COPY_KEYS : OFFLINE_SOON_COPY_KEYS;
  if (noticeSent(ctx.subscriptionId, kind)) return 'already_sent';
  if (!cancelNoticeCopyReady(keys, copy, pending)) return 'copy_pending';
  if (!ctx.email) return 'no_email';
  if (!claimNotice(ctx.subscriptionId, kind, now)) return 'already_sent';
  try {
    const confirm = kind === 'cancel_confirmation';
    const subject = confirm ? copy.cancelEmailSubject : copy.offlineSoonSubject;
    const body = confirm
      ? (ctx.ownDomain ? copy.cancelEmailBody : copy.cancelEmailBodyNoDomain)
      : (ctx.ownDomain ? copy.offlineSoonBody : copy.offlineSoonBodyNoDomain);
    const outro = confirm ? copy.cancelEmailOutro : copy.offlineSoonOutro;
    const { text, html } = renderLifecycleEmail([{ template: body }, { template: outro }], ctx.values, {
      linkKeys: ['accountLink'],
      ltrKeys: ['paidThrough', 'offlineDate'],
    });
    const from = supportFromAddress();
    const outcome = await transport({
      to: ctx.email,
      from,
      replyTo: from,
      subject: fillCopy(subject, ctx.values),
      text,
      html,
      tag: kind,
      refIds: [ctx.subscriptionId],
    });
    completeNotice(ctx.subscriptionId, kind, outcome, now);
    return outcome;
  } catch {
    releaseNotice(ctx.subscriptionId, kind);
    console.error(`[site-bot cancel-notice] ${kind} failed subscription=${ctx.subscriptionId}`);
    return 'failed';
  }
}

/** The cancel-day confirmation. Called by the cancel route; never throws. */
export async function sendCancelConfirmation(
  subscriptionId: string,
  now: Date = new Date(),
  transport: MailTransport = defaultMailTransport,
  options: CopyOptions = {}
): Promise<NoticeOutcome> {
  try {
    const subscription = getSubscription(subscriptionId);
    const ctx = subscription ? cancelNoticeContext(subscription) : null;
    if (!subscription || !ctx) return 'not_cancelled';
    const canceledAt = subscription.canceled_at ?? ctx.effectiveAt;
    if (israelDateReached(addCalendarDays(israelDate(canceledAt), CONFIRMATION_CATCH_UP_DAYS + 1), now)) return 'not_due';
    return await sendOwnerNotice(ctx, 'cancel_confirmation', now, transport, options);
  } catch {
    console.error(`[site-bot cancel-notice] confirmation failed subscription=${subscriptionId}`);
    return 'failed';
  }
}

/** The "offline soon" email, due from offlineDate - 7 days until the day before offlineDate. */
export async function sendOfflineSoon(ctx: CancelNoticeContext, now: Date, transport: MailTransport = defaultMailTransport, options: CopyOptions = {}): Promise<NoticeOutcome> {
  if (!israelDateReached(ctx.offlineSoonDate, now) || israelDateReached(ctx.offlineDate, now)) return 'not_due';
  return sendOwnerNotice(ctx, 'offline_soon', now, transport, options);
}

/** Staff take-down reminder, due on the offline date (and for 30 days after, in case a run was missed). */
export async function sendTakedownReminder(ctx: CancelNoticeContext, now: Date, transport: MailTransport = defaultMailTransport): Promise<NoticeOutcome> {
  if (!israelDateReached(ctx.offlineDate, now)) return 'not_due';
  if (israelDateReached(addCalendarDays(ctx.offlineDate, TAKEDOWN_REMINDER_WINDOW_DAYS + 1), now)) return 'not_due';
  if (!claimNotice(ctx.subscriptionId, 'takedown_staff', now)) return 'already_sent';
  try {
    const who = ctx.businessName || ctx.email || ctx.subscriptionId.slice(0, 8);
    const lines = [
      'A cancelled Site Bot site reaches its offline date today (terms section 8: 30 days after the cancellation took effect).',
      '',
      `Business: ${ctx.businessName ?? '-'}`,
      `Owner email: ${ctx.email ?? '-'}`,
      `Site: ${ctx.siteUrl ?? '-'} (${ctx.ownDomain ? "owner's own domain" : 'WAO sub-domain'})`,
      `Cancellation effective: ${ctx.values.paidThrough}`,
      `Offline date: ${ctx.values.offlineDate}`,
      `Subscription: ${ctx.subscriptionId}`,
      '',
      'To do by hand:',
      '- Take the site down (suspend the tenant / remove the host).',
      "- Remove WAO's manager access to the Google profile.",
      '- Handle any copy-of-the-site request on record (terms section 8).',
    ];
    const outcome = await transport({
      to: staffAlertAddress(),
      from: supportFromAddress(),
      subject: `Site Bot take-down due today — ${who}`,
      text: lines.join('\n'),
      tag: 'takedown_reminder',
      refIds: [ctx.subscriptionId],
    });
    completeNotice(ctx.subscriptionId, 'takedown_staff', outcome, now);
    return outcome;
  } catch {
    releaseNotice(ctx.subscriptionId, 'takedown_staff');
    console.error(`[site-bot cancel-notice] take-down reminder failed subscription=${ctx.subscriptionId}`);
    return 'failed';
  }
}

/** Every Site-Bot row with a self-serve or scheduled cancellation. */
export function listCancelledSiteBotSubscriptions(): SubscriptionRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM subscriptions
       WHERE plan = ? AND canceled_at IS NOT NULL AND (cancel_at_period_end = 1 OR status = 'canceled')
       ORDER BY canceled_at ASC`
    )
    .all(SITE_BOT_PLAN.id) as SubscriptionRow[];
}

/** Daily: confirmation catch-up, offline-soon emails and staff take-down reminders. Idempotent. */
export async function runCancelNotices(now: Date, transport: MailTransport = defaultMailTransport, options: CopyOptions = {}): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const bump = (key: string) => { counts[key] = (counts[key] ?? 0) + 1; };
  for (const subscription of listCancelledSiteBotSubscriptions()) {
    try {
      const ctx = cancelNoticeContext(subscription);
      if (!ctx) continue;
      bump(`confirmation_${await sendCancelConfirmation(subscription.id, now, transport, options)}`);
      bump(`offline_soon_${await sendOfflineSoon(ctx, now, transport, options)}`);
      bump(`takedown_${await sendTakedownReminder(ctx, now, transport)}`);
    } catch {
      console.error(`[site-bot cancel-notice] run failed subscription=${subscription.id}`);
      bump('error');
    }
  }
  return counts;
}
