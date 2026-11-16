/**
 * Daily Site-Bot lifecycle run (scripts/cron/site-bot-lifecycle-notices.sh → POST /api/site-bot/cron/lifecycle-notices):
 * review-kit email retries for live sites, cancel-confirmation catch-up, offline-soon emails, staff take-down reminders.
 * Every step is idempotent (site_bot_notices), so extra or late runs send nothing twice. Zero Hebrew.
 */
import { defaultMailTransport, type MailTransport } from './clientMessageEmail';
import { sweepReviewKits } from './reviewKit';
import { runCancelNotices } from './cancelNotices';

export async function runSiteBotLifecycleCron(now: Date = new Date(), transport: MailTransport = defaultMailTransport): Promise<{
  reviewKits: Record<string, number>;
  cancelNotices: Record<string, number>;
}> {
  const reviewKits = await sweepReviewKits(now, transport);
  const cancelNotices = await runCancelNotices(now, transport);
  return { reviewKits, cancelNotices };
}
