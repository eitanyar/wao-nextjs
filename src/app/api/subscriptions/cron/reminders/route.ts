import { NextResponse } from 'next/server';
import { runReminderCron } from '@/lib/payments/cron-charge';
import { isCronAuthorized } from '@/lib/payments/cron-auth';

/**
 * Cron-triggered trial-ending reminder run (chargeback-mitigation nudge, 3-5
 * days before a trialing subscription's first full charge). Invoked by
 * `scripts/cron/charge-subscriptions.sh`. Same auth posture as
 * `cron/charge`: `Authorization: Bearer <CRON_SECRET>`, enforced by
 * `isCronAuthorized` (fails closed if `CRON_SECRET` isn't configured).
 */

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runReminderCron();
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error('[subscriptions/cron/reminders] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run reminder cron' },
      { status: 500 }
    );
  }
}
