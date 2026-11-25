/**
 * Daily Site-Bot lifecycle run (scripts/cron/site-bot-lifecycle-notices.sh → POST /api/site-bot/cron/lifecycle-notices):
 * review-kit email retries for live sites, cancel-confirmation catch-up, offline-soon emails, staff take-down reminders,
 * and (step 2a) the interview sweep: 72 h spot expiry + the one 24 h reminder (interviewReminder.ts).
 * Every step is idempotent (site_bot_notices / the interview session row), so extra or late runs send nothing twice.
 * NOTE: at the daily 09:30 cadence the 24 h reminder lands 24-48 h after the start and an expiry up to a day late (the
 * routes also expire lazily on read, so a late sweep never lets an expired session continue). Zero Hebrew.
 */
import { defaultMailTransport, type MailTransport } from './clientMessageEmail';
import { sweepReviewKits } from './reviewKit';
import { runCancelNotices } from './cancelNotices';
import { sweepInterviewSessions, type InterviewSweepSummary } from './interviewReminder';

export async function runSiteBotLifecycleCron(now: Date = new Date(), transport: MailTransport = defaultMailTransport): Promise<{
  reviewKits: Record<string, number>;
  cancelNotices: Record<string, number>;
  interviews: InterviewSweepSummary;
}> {
  const reviewKits = await sweepReviewKits(now, transport);
  const cancelNotices = await runCancelNotices(now, transport);
  const interviews = await sweepInterviewSessions(now, transport);
  return { reviewKits, cancelNotices, interviews };
}
