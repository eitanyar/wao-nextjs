/**
 * Site Bot ads-first launch, build step 1: the staff email for a new waiting-list entry. Same delivery path as the
 * owner-lead and paid-queue alerts (clientMessageEmail.ts defaultMailTransport: Resend, dev outbox without a key), to the
 * staff address (staffAlertAddress: eitan@wao.co.il by default). English, plain text.
 * HEBREW-SAFETY: ZERO Hebrew bytes in this file (business and contact names arrive as data).
 */
import { defaultMailTransport, israelTime, staffAlertAddress, supportFromAddress, type MailTransport, type OutgoingEmail } from './clientMessageEmail';
import type { WaitlistEntry } from './launchStore';

const ONE_LINE = /[\r\n\t\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]+/g;

function oneLine(value: string | null | undefined, max = 120): string {
  if (typeof value !== 'string') return '-';
  const clean = value.replace(ONE_LINE, ' ').trim();
  return clean ? clean.slice(0, max) : '-';
}

const REASON_LINE: Record<WaitlistEntry['reason'], string> = {
  preopen: 'pre-open (eligible; the paid flow is not open yet)',
  full: 'full (eligible; the launch cap is reached)',
  trade: 'trade (category outside launch scope; tell him when his trade opens)',
};

export function buildWaitlistAlert(entry: WaitlistEntry, env: Record<string, string | undefined> = process.env): OutgoingEmail {
  const business = oneLine(entry.businessName);
  return {
    to: staffAlertAddress(env),
    from: supportFromAddress(env),
    subject: `Site Bot waiting list (${entry.reason}) — ${business}`,
    text: [
      'A business joined the Site Bot waiting list from the free check.',
      '',
      `Reason: ${REASON_LINE[entry.reason]}`,
      `Business: ${business}`,
      `Category: ${oneLine(entry.category, 80)}`,
      `Name: ${oneLine(entry.name)}`,
      `Phone: ${oneLine(entry.phone, 32)}`,
      `Email: ${oneLine(entry.email, 254)}`,
      `Joined: ${israelTime(entry.createdAt)} (Israel time)`,
      `Audit: ${entry.auditId}`,
      `Place: ${oneLine(entry.placeId, 256)}`,
    ].join('\n'),
    tag: 'waitlist_joined',
    refIds: [entry.id, entry.auditId],
  };
}

/** Never throws; true only when Resend accepted it. */
export async function sendWaitlistAlert(entry: WaitlistEntry, transport: MailTransport = defaultMailTransport): Promise<boolean> {
  try {
    return (await transport(buildWaitlistAlert(entry))) === 'sent';
  } catch {
    console.error(`[site-bot waitlist] alert failed entry=${entry.id}`);
    return false;
  }
}
