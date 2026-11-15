/**
 * Site Bot: email the business owner when a verified lead lands on his site (Fable 5.2 decision D2, 2026-11-15).
 * HEBREW-SAFETY: ZERO Hebrew bytes in this file; the copy lives in ownerLeadEmailCopy.ts (waocopy, byte-exact).
 *
 * - Only for Site Bot tenants: the client id is the site slug and the site record holds the owner's private intake
 *   email (collectedData.ownerContact.email). That address is used here only, never rendered anywhere public.
 * - Called after the lead is stored; never throws. No owner email, or a failed send, alerts staff instead.
 * - Visitor data (name, phone) is HTML-escaped; the subject carries the name with control/bidi characters removed.
 */
import { readSiteRecord } from './siteLeadTenantLookup';
import { OWNER_LEAD_EMAIL_COPY as C } from './ownerLeadEmailCopy';
import { defaultMailTransport, escapeHtml, staffAlertAddress, supportFromAddress, type MailTransport, type OutgoingEmail } from '../site-bot/clientMessageEmail';

export interface OwnerLeadInput {
  clientId: string;
  leadId: number | string;
  name: string | null | undefined;
  phone: string | null | undefined;
}

export interface OwnerContact {
  email: string;
  businessName: string;
}

type SiteRecordReader = (slug: string) => unknown;

const STRIP = /[\r\n\t\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]+/g;
const EMAIL = /^[^\s@<>"]{1,64}@[a-z0-9.-]+\.[a-z0-9-]{2,63}$/i;

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(STRIP, ' ').trim().slice(0, max) : '';
}

/** Owner email + business name from the Site Bot record, or null (not a Site Bot tenant, or no usable email). */
export function ownerContactFor(clientId: string, read: SiteRecordReader = readSiteRecord): OwnerContact | null {
  const record = read(clientId) as { slug?: unknown; collectedData?: { businessName?: unknown; ownerContact?: { email?: unknown } } } | null;
  if (!record || record.slug !== clientId) return null;
  const email = clean(record.collectedData?.ownerContact?.email, 254);
  if (!EMAIL.test(email)) return null;
  return { email, businessName: clean(record.collectedData?.businessName, 80) || clientId };
}

/** The tel: target: digits and a leading +, or null when nothing dialable is left. */
export function telHref(phone: string | null | undefined): string | null {
  const raw = clean(phone, 40);
  const digits = raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return /\d{7,}/.test(digits) ? `tel:${digits}` : null;
}

function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(name|business)\}/g, (_, key: string) => vars[key] ?? '');
}

function base(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.wao.co.il').replace(/\/+$/, '');
}

export function leadsFromAddress(env: Record<string, string | undefined> = process.env): string {
  return env.SITE_BOT_LEADS_FROM_EMAIL?.trim() || 'WAO <leads@wao.co.il>';
}

export function buildOwnerLeadEmail(input: OwnerLeadInput, owner: OwnerContact, env: Record<string, string | undefined> = process.env): OutgoingEmail {
  const name = clean(input.name, 80) || '-';
  const phone = clean(input.phone, 40) || '-';
  const tel = telHref(input.phone);
  const dashboard = `${base()}/client/leads`;
  const vars = { name, business: owner.businessName };
  const text = [
    fill(C.heading, vars),
    fill(C.intro, vars),
    '',
    `${C.nameLabel}: ${name}`,
    `${C.phoneLabel}: ${phone}`,
    '',
    `${C.dashboardLink}: ${dashboard}`,
    '',
    fill(C.footer, vars),
  ].join('\n');
  const h = (s: string) => escapeHtml(s);
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;padding:24px 16px;background:#f5f7f6;font-family:Arial,Helvetica,sans-serif;color:#18201d;direction:rtl;text-align:right;">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;">
<h1 style="font-size:22px;margin:0 0 12px;">${h(fill(C.heading, vars))}</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 16px;">${h(fill(C.intro, vars))}</p>
<p style="font-size:17px;margin:0 0 6px;"><strong>${h(C.nameLabel)}:</strong> ${h(name)}</p>
<p style="font-size:17px;margin:0 0 20px;"><strong>${h(C.phoneLabel)}:</strong> <span dir="ltr">${h(phone)}</span></p>
${tel ? `<p style="margin:0 0 20px;"><a href="${h(tel)}" style="display:block;text-align:center;background:#0e6b5a;color:#ffffff;text-decoration:none;font-size:18px;font-weight:bold;padding:16px;border-radius:10px;">${h(C.callButton)}</a></p>` : ''}
<p style="margin:0 0 20px;"><a href="${h(dashboard)}" style="color:#0e6b5a;font-size:15px;">${h(C.dashboardLink)}</a></p>
<p style="font-size:13px;color:#5a6661;margin:0;">${h(fill(C.footer, vars))}</p>
</div></body></html>`;
  return {
    to: owner.email,
    from: leadsFromAddress(env),
    replyTo: supportFromAddress(env),
    subject: fill(C.subject, vars),
    text,
    html,
    tag: 'owner_lead',
    refIds: [input.clientId, String(input.leadId)],
  };
}

function staffNote(input: OwnerLeadInput, reason: 'no_owner_email' | 'send_failed', env: Record<string, string | undefined>): OutgoingEmail {
  return {
    to: staffAlertAddress(env),
    from: supportFromAddress(env),
    subject: `Site Bot lead — owner NOT notified (${reason}) — ${input.clientId}`,
    text: [
      `A lead for ${input.clientId} is saved in the CRM, but the owner email ${reason === 'no_owner_email' ? 'has no address on the site record' : 'failed to send'}.`,
      'Tell the owner by hand.',
      `Lead id: ${input.leadId}`,
      `Leads: ${base()}/admin/clients`,
    ].join('\n'),
    tag: 'staff_alert',
    refIds: [input.clientId, String(input.leadId)],
  };
}

export type OwnerLeadOutcome = 'owner_sent' | 'owner_stubbed' | 'not_site_bot' | 'staff_alerted' | 'failed';

/** Never throws. Ads-LP tenants (no Site Bot record) are skipped; staff already get every lead by the SMTP path. */
export async function notifyOwnerOfLead(
  input: OwnerLeadInput,
  deps: { transport?: MailTransport; read?: SiteRecordReader; env?: Record<string, string | undefined> } = {},
): Promise<OwnerLeadOutcome> {
  const transport = deps.transport ?? defaultMailTransport;
  const env = deps.env ?? process.env;
  try {
    const read = deps.read ?? readSiteRecord;
    if (!read(input.clientId)) return 'not_site_bot';
    const owner = ownerContactFor(input.clientId, read);
    if (owner) {
      try {
        return (await transport(buildOwnerLeadEmail(input, owner, env))) === 'sent' ? 'owner_sent' : 'owner_stubbed';
      } catch {
        console.error(`[owner-lead] send failed client=${input.clientId} lead=${input.leadId}`);
        await transport(staffNote(input, 'send_failed', env));
        return 'staff_alerted';
      }
    }
    await transport(staffNote(input, 'no_owner_email', env));
    return 'staff_alerted';
  } catch {
    console.error(`[owner-lead] notification failed client=${input.clientId} lead=${input.leadId}`);
    return 'failed';
  }
}
