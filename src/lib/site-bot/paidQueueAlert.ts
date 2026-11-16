/**
 * "Paid, waiting for build" staff alert (launch item 8; rehearsal step S8: within 5 minutes of payment, naming the
 * business and the planned host). Sent once per fresh activation from the Site-Bot checkout callback, before the
 * research runs, so a slow or failed research still alerts staff. English, plain text, to the staff address.
 * HEBREW-SAFETY: ZERO Hebrew bytes in this file (business names arrive as data).
 */
import type { CollectedData } from '@/lib/bot/prompts';
import { defaultMailTransport, israelTime, staffAlertAddress, supportFromAddress, type MailTransport, type OutgoingEmail } from './clientMessageEmail';
import { isSafeSiteSlug } from './siteSlug';
import { siteBaseUrl } from '../siteBaseUrl';

export interface PaidQueueAlertInput {
  sessionId: string;
  subscriptionId: string;
  collectedData: CollectedData | undefined;
  paidAt: Date;
}

const ONE_LINE = /[\r\n\t\u0000-\u001f\u007f‪-‮⁦-⁩]+/g;

function oneLine(value: unknown, max = 120): string {
  if (typeof value !== 'string') return '-';
  const clean = value.replace(ONE_LINE, ' ').trim();
  return clean ? clean.slice(0, max) : '-';
}

/** The WAO sub-domain the intake planned (collectedData.preferredSlug), or a plain line when none is known yet. */
function plannedSubdomain(data: CollectedData | undefined): string {
  const slug = typeof data?.preferredSlug === 'string' ? data.preferredSlug.trim() : '';
  return isSafeSiteSlug(slug)
    ? `${slug}.wao.co.il (WAO sub-domain from the intake; can still be changed at build)`
    : 'a WAO sub-domain (no slug from the intake yet; pick one at build)';
}

/** Where the site will live: the owner's www host (attached by hand, sub-domain first) or a WAO sub-domain. */
export function plannedHost(data: CollectedData | undefined): string {
  const domain = typeof data?.ownerDomain === 'string' ? data.ownerDomain.trim().toLowerCase() : '';
  if (data?.domainChoice === 'has_domain' && /^[a-z0-9.-]+\.[a-z0-9-]+$/.test(domain)) {
    return `www.${domain} (own domain: hand-run attach, up to 3 business days; sub-domain first)`;
  }
  return `${plannedSubdomain(data)}${data?.domainChoice === 'not_sure' ? ' — owner was not sure about a domain: ask' : ''}`;
}

export function buildPaidQueueAlert(input: PaidQueueAlertInput, env: Record<string, string | undefined> = process.env): OutgoingEmail {
  const data = input.collectedData;
  const business = oneLine(data?.businessName);
  const lines = [
    'A Site Bot payment landed. The clock to "live" (under one business day) starts now.',
    '',
    `Business: ${business}`,
    `Planned host: ${plannedHost(data)}`,
    `Owner mobile: ${oneLine(data?.ownerContact?.mobile, 32)}`,
    `Owner email: ${oneLine(data?.ownerContact?.email, 254)}`,
    `Paid: ${israelTime(input.paidAt.toISOString())} (Israel time)`,
    `Session: ${input.sessionId}`,
    `Subscription: ${input.subscriptionId}`,
    '',
    'Next: research runs now; then generate, review the copy and deploy.',
    `Copy review: ${siteBaseUrl()}/admin/site-bot-copy-review`,
  ];
  return {
    to: staffAlertAddress(env),
    from: supportFromAddress(env),
    subject: `Site Bot paid — waiting for build — ${business === '-' ? input.sessionId.slice(0, 8) : business}`,
    text: lines.join('\n'),
    tag: 'paid_queue_alert',
    refIds: [input.sessionId, input.subscriptionId],
  };
}

/** Never throws; returns true only when Resend accepted it. */
export async function sendPaidQueueAlert(input: PaidQueueAlertInput, transport: MailTransport = defaultMailTransport): Promise<boolean> {
  try {
    return (await transport(buildPaidQueueAlert(input))) === 'sent';
  } catch {
    console.error(`[site-bot paid-queue] alert failed session=${input.sessionId}`);
    return false;
  }
}
