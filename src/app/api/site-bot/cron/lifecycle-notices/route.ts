import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/payments/cron-auth';
import { runSiteBotLifecycleCron } from '@/lib/site-bot/lifecycleCron';

/**
 * Daily Site-Bot lifecycle notices (review kit retries, cancel confirmation catch-up, offline-soon emails, staff
 * take-down reminders). Invoked by scripts/cron/site-bot-lifecycle-notices.sh. Auth: `Authorization: Bearer
 * <CRON_SECRET>` (isCronAuthorized, fails closed). The summary carries counts only, never content.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runSiteBotLifecycleCron(new Date());
    return NextResponse.json({ success: true, ...summary });
  } catch {
    console.error('[site-bot/cron/lifecycle-notices] run failed');
    return NextResponse.json({ success: false, error: 'lifecycle_cron_failed' }, { status: 500 });
  }
}
