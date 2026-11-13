/**
 * Site-Bot client message box: the staff alert, the client confirmation and the daily staff reminder.
 *
 * Delivery: Resend (`RESEND_API_KEY`), as in src/lib/payments/email.ts. Without a key the email is not sent: it is
 * appended to the dev outbox (`SITE_BOT_EMAIL_OUTBOX_PATH`, default data/payments/email-outbox.jsonl, the billing
 * outbox) and the sender returns false. Tests pass their own transport.
 *
 * Privacy: message content is never written to server logs; console lines carry ids and codes only. The client's text
 * is quoted back HTML-escaped and is never put into a subject line.
 *
 * Addresses (founder decisions 1 and 3, not decided yet):
 * - Staff alerts and reminders go to SITE_BOT_SUPPORT_ALERT_EMAIL, falling back to BILLING_ADMIN_ALERT_EMAIL.
 * - The client confirmation is sent from, and replies go to, SITE_BOT_SUPPORT_FROM_EMAIL.
 *   TODO(founder decision 1): set the real, monitored support mailbox. Until it is set, no confirmation is sent.
 */
import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import { copyReady, EMAIL_COPY_KEYS, isFilledCopy, SITE_BOT_CLIENT_MESSAGE_COPY } from './clientMessageCopy';
import {
  listUnhandledOlderThan,
  markReminded,
  type ClientMessageRow,
} from './clientMessages';

export interface OutgoingEmail {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  /** For logs and the outbox only: which sender produced it. */
  tag: 'staff_alert' | 'client_confirmation' | 'staff_reminder';
  /** For logs only. */
  refIds: string[];
}

/** Returns 'sent' when delivered, 'stubbed' when only written to the dev outbox. Throws on a delivery error. */
export type MailTransport = (email: OutgoingEmail) => Promise<'sent' | 'stubbed'>;

/** Sender for staff mail when no support address is configured (the billing engine's verified sender). */
const DEFAULT_STAFF_FROM = 'billing@wao.co.il';
const REMINDER_AFTER_MS = 24 * 60 * 60 * 1000;
const BODY_EXCERPT_CHARS = 500;

function outboxPath(): string {
  const configured = process.env.SITE_BOT_EMAIL_OUTBOX_PATH;
  return configured && path.isAbsolute(configured) ? configured : path.join(process.cwd(), 'data', 'payments', 'email-outbox.jsonl');
}

function appendOutbox(email: OutgoingEmail, sent: boolean): void {
  try {
    const file = outboxPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify({ ...email, sent, timestamp: new Date().toISOString() }) + '\n');
  } catch {
    console.warn(`[site-bot-message-email] outbox append failed tag=${email.tag} ids=${email.refIds.join(',')}`);
  }
}

export const defaultMailTransport: MailTransport = async (email) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    appendOutbox(email, false);
    console.log(`[site-bot-message-email] STUBBED (no RESEND_API_KEY) tag=${email.tag} ids=${email.refIds.join(',')}`);
    return 'stubbed';
  }
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: email.from,
    to: email.to,
    ...(email.replyTo ? { replyTo: email.replyTo } : {}),
    subject: email.subject,
    text: email.text,
    ...(email.html ? { html: email.html } : {}),
  });
  if (result && typeof result === 'object' && 'error' in result && result.error) throw new Error('resend_error');
  appendOutbox(email, true);
  console.log(`[site-bot-message-email] sent tag=${email.tag} ids=${email.refIds.join(',')}`);
  return 'sent';
};

export function staffAlertAddress(env: Record<string, string | undefined> = process.env): string | null {
  return env.SITE_BOT_SUPPORT_ALERT_EMAIL?.trim() || env.BILLING_ADMIN_ALERT_EMAIL?.trim() || null;
}

export function supportFromAddress(env: Record<string, string | undefined> = process.env): string | null {
  return env.SITE_BOT_SUPPORT_FROM_EMAIL?.trim() || null;
}

/** Same rendering as the staff inbox (`formatIsraelTime` in components/admin/site-bot-help/inbox.mjs). */
export function israelTime(iso: string | null | undefined): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '-';
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem' });
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function who(row: ClientMessageRow): string {
  return row.business_name || row.contact_email || `subscription ${row.subscription_id.slice(0, 8)}`;
}

function cancelMeta(row: ClientMessageRow): { effectiveAt: string | null; siteOfflineAt: string | null } {
  try {
    const meta = row.meta_json ? JSON.parse(row.meta_json) : {};
    return { effectiveAt: typeof meta.effectiveAt === 'string' ? meta.effectiveAt : null, siteOfflineAt: typeof meta.siteOfflineAt === 'string' ? meta.siteOfflineAt : null };
  } catch {
    return { effectiveAt: null, siteOfflineAt: null };
  }
}

function queueUrl(): string {
  return `${(process.env.NEXT_PUBLIC_BASE_URL || 'https://www.wao.co.il').replace(/\/+$/, '')}/admin/site-bot-help`;
}

/** English, plain text, to the staff address. Returns true only when actually delivered. */
export async function sendClientMessageStaffAlert(row: ClientMessageRow, transport: MailTransport = defaultMailTransport): Promise<boolean> {
  const to = staffAlertAddress();
  if (!to) {
    console.warn(`[site-bot-message-email] no SITE_BOT_SUPPORT_ALERT_EMAIL / BILLING_ADMIN_ALERT_EMAIL; staff alert skipped id=${row.id}`);
    return false;
  }
  const isCancel = row.kind === 'cancel_notice_due';
  const lines = [
    `Kind: ${isCancel ? 'cancel notice due' : 'client message'}`,
    `Business: ${row.business_name ?? '-'}`,
    `Email: ${row.contact_email ?? '-'}`,
    `Mobile: ${row.contact_mobile ?? '-'}`,
    `Received: ${israelTime(row.received_at)} (Israel time)`,
    `Message id: ${row.id}`,
  ];
  if (isCancel) {
    const meta = cancelMeta(row);
    lines.push(
      `Effective: ${israelTime(meta.effectiveAt)}`,
      `Site offline on: ${israelTime(meta.siteOfflineAt)}`,
      '',
      'To do by hand:',
      '- Send the cancel-day notice.',
      '- Send the notice 7 days before the site goes offline.',
      "- Remove WAO's manager access to the Google profile."
    );
  } else {
    const excerpt = row.body.length > BODY_EXCERPT_CHARS ? `${row.body.slice(0, BODY_EXCERPT_CHARS)}...` : row.body;
    lines.push('', 'Message (first 500 characters):', excerpt);
  }
  lines.push('', `Queue: ${queueUrl()}`);
  const outcome = await transport({
    to,
    from: supportFromAddress() ?? DEFAULT_STAFF_FROM,
    subject: isCancel ? `Site Bot cancel — notices due — ${who(row)}` : `Site Bot client message — ${who(row)}`,
    text: lines.join('\n'),
    tag: 'staff_alert',
    refIds: [row.id],
  });
  return outcome === 'sent';
}

/**
 * Hebrew confirmation to the client, from/reply-to the support address. Not sent (returns false) when the row has no
 * email, the support address is not set, or any email copy key is still a placeholder.
 */
export async function sendClientMessageConfirmation(row: ClientMessageRow, transport: MailTransport = defaultMailTransport): Promise<boolean> {
  if (row.kind !== 'client_message' || !row.contact_email) return false;
  const from = supportFromAddress();
  if (!from) {
    console.warn(`[site-bot-message-email] SITE_BOT_SUPPORT_FROM_EMAIL not set; confirmation skipped id=${row.id}`);
    return false;
  }
  const copy = SITE_BOT_CLIENT_MESSAGE_COPY;
  if (!copyReady(EMAIL_COPY_KEYS, copy)) return false;
  const turnaround = isFilledCopy(copy.turnaroundLine) ? copy.turnaroundLine : null;
  const paragraphs = [copy.emailBodyIntro, ...(turnaround ? [turnaround] : [])];
  const quoteHtml = escapeHtml(row.body).replace(/\n/g, '<br>');
  const html = [
    '<div dir="rtl" lang="he">',
    ...paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
    `<p>${escapeHtml(copy.emailQuotedLabel)}</p>`,
    `<blockquote dir="auto" style="border-inline-start:3px solid #ccc;margin:0;padding-inline-start:12px;white-space:pre-wrap">${quoteHtml}</blockquote>`,
    `<p>${escapeHtml(copy.emailBodyOutro)}</p>`,
    '</div>',
  ].join('\n');
  const text = [...paragraphs, '', copy.emailQuotedLabel, row.body, '', copy.emailBodyOutro].join('\n');
  const outcome = await transport({
    to: row.contact_email,
    from,
    replyTo: from,
    subject: copy.emailSubject,
    text,
    html,
    tag: 'client_confirmation',
    refIds: [row.id],
  });
  return outcome === 'sent';
}

/** One English email listing open items older than the cutoff. Returns the transport outcome, or null if skipped. */
export async function sendUnhandledReminder(rows: readonly ClientMessageRow[], transport: MailTransport = defaultMailTransport): Promise<'sent' | 'stubbed' | null> {
  const to = staffAlertAddress();
  if (!to || rows.length === 0) return null;
  const lines = [
    `${rows.length} Site Bot client message item${rows.length === 1 ? '' : 's'} still open after 24 hours:`,
    '',
    ...rows.map((r) => `- [${r.id.slice(0, 8)}] ${r.kind === 'cancel_notice_due' ? 'cancel notice due' : 'client message'} — ${who(r)} — received ${israelTime(r.received_at)} — ${r.status}`),
    '',
    `Queue: ${queueUrl()}`,
  ];
  return transport({
    to,
    from: supportFromAddress() ?? DEFAULT_STAFF_FROM,
    subject: `Site Bot client messages — ${rows.length} open over 24h`,
    text: lines.join('\n'),
    tag: 'staff_reminder',
    refIds: rows.map((r) => r.id),
  });
}

/**
 * Daily reminder (called from the charge cron when the feature flag is on): open items received more than 24 hours
 * ago and not reminded in the last 24 hours get one staff email, then `reminded_at` is set. Marked when the email
 * was handed to the transport (sent, or stubbed to the dev outbox), so a missing Resend key cannot cause a reminder
 * on every cron run.
 */
export async function remindUnhandledClientMessages(now: Date, transport: MailTransport = defaultMailTransport): Promise<{ reminded: number }> {
  const rows = listUnhandledOlderThan(new Date(now.getTime() - REMINDER_AFTER_MS).toISOString());
  if (!rows.length) return { reminded: 0 };
  const outcome = await sendUnhandledReminder(rows, transport);
  if (!outcome) return { reminded: 0 };
  markReminded(rows.map((r) => r.id), now);
  return { reminded: rows.length };
}
