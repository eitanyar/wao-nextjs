/**
 * Site Bot step 2a: the interview session sweep, run by the daily lifecycle cron (lifecycleCron.ts) and safe to run at
 * any cadence:
 *   1. expiry: every open, unpaid session 72 h (SITE_BOT_SPOT_TTL_HOURS) after its start is closed and its spot released
 *      (the same expireDueSessions the routes also run lazily on read);
 *   2. the one 24-hour reminder: an open session 24 h or more after its start, with an owner email, not reminded yet,
 *      gets SITE_BOT_STEP2A_COPY REMINDER_* with a signed resume link valid until the spot expires. The send is claimed
 *      in the store first (reminder_sent_at), so a replayed or concurrent sweep never sends twice; a failed send
 *      releases the claim so the next run retries. No email -> no reminder.
 *
 * Email: text part = the filled body, a blank line, then the resume URL alone on its own line (no Hebrew around it).
 * HTML part = RTL body paragraphs, the CTA as a button linking to the URL, then the URL as an LTR fallback line.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (the strings are the generated waocopy module).
 */
import { defaultMailTransport, escapeHtml, supportFromAddress, type MailTransport, type OutgoingEmail } from './clientMessageEmail';
import { fillCopy } from './lifecycleEmail';
import { dueInterviewReminders, claimInterviewReminder, expireDueSessions, releaseInterviewReminder, type InterviewSession } from './interviewSession';
import { sessionResumePath } from './interviewFlow';
import { launchDbPath, openLaunchStore, type LaunchStore } from './launchStore';
import { siteBaseUrl } from '../siteBaseUrl';
import { SITE_BOT_STEP2A_COPY as COPY } from './step2aCopy.generated';

const RTL = 'dir="rtl" style="direction:rtl;text-align:right"';

export function buildInterviewReminder(session: InterviewSession, env: Record<string, string | undefined> = process.env): OutgoingEmail {
  if (!session.ownerEmail) throw new Error('no owner email');
  const continueUrl = `${siteBaseUrl(env)}${sessionResumePath(session, env)}`;
  const businessName = (session.businessName ?? '').replace(/[\r\n\t\u0000-\u001f\u007f]+/g, ' ').trim();
  const body = fillCopy(COPY.REMINDER_BODY, { businessName });
  const url = escapeHtml(continueUrl);
  const name = `<bdi style="unicode-bidi:isolate">${escapeHtml(businessName)}</bdi>`;
  const paragraphs = COPY.REMINDER_BODY
    .split('\n')
    .map(line => `<p ${RTL}>${line.split('{businessName}').map(escapeHtml).join(name)}</p>`)
    .join('');
  const html = `<div lang="he" ${RTL}>${paragraphs}`
    + `<p ${RTL}><a href="${url}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none">${escapeHtml(COPY.REMINDER_CTA)}</a></p>`
    + `<p dir="ltr" style="direction:ltr;text-align:left;font-size:12px;color:#666"><a href="${url}">${url}</a></p></div>`;
  return {
    to: session.ownerEmail,
    from: supportFromAddress(env),
    subject: COPY.REMINDER_SUBJECT,
    text: `${body}\n\n${continueUrl}`,
    html,
    tag: 'interview_reminder',
    refIds: [session.id],
  };
}

export interface InterviewSweepSummary {
  expired: number;
  reminded: number;
  failed: number;
}

/** One sweep on an open store (tests inject the store and its clock). */
export async function sweepInterviewSessionsOn(store: LaunchStore, transport: MailTransport, env: Record<string, string | undefined> = process.env): Promise<InterviewSweepSummary> {
  const expired = expireDueSessions(store);
  let reminded = 0;
  let failed = 0;
  for (const session of dueInterviewReminders(store)) {
    if (!claimInterviewReminder(store, session.id)) continue;
    try {
      await transport(buildInterviewReminder(session, env));
      reminded += 1;
    } catch {
      releaseInterviewReminder(store, session.id);
      failed += 1;
      console.error(`[site-bot interview] reminder failed session=${session.id}`);
    }
  }
  return { expired, reminded, failed };
}

/** The cron entry: the configured launch store with `now` as its clock. A store failure is a zero summary. */
export async function sweepInterviewSessions(now: Date = new Date(), transport: MailTransport = defaultMailTransport): Promise<InterviewSweepSummary> {
  let store: LaunchStore | null = null;
  try {
    store = openLaunchStore(launchDbPath(), () => now);
    return await sweepInterviewSessionsOn(store, transport);
  } catch {
    console.error('[site-bot interview] sweep failed');
    return { expired: 0, reminded: 0, failed: 0 };
  } finally {
    try { store?.db.close(); } catch { /* already closed */ }
  }
}
