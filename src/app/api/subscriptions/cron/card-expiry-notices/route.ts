import { NextResponse } from 'next/server';
import { runCardExpiryNoticeCron } from '@/lib/payments/cron-card-expiry';
import { isCronAuthorized } from '@/lib/payments/cron-auth';

/**
 * Cron-triggered "your card is expiring soon" notice run. Invoked by
 * `scripts/cron/charge-subscriptions.sh`. Same auth posture as the other two
 * cron routes: `Authorization: Bearer <CRON_SECRET>`, enforced by
 * `isCronAuthorized` (fails closed if `CRON_SECRET` isn't configured).
 */

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runCardExpiryNoticeCron();
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error('[subscriptions/cron/card-expiry-notices] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run card-expiry notice cron' },
      { status: 500 }
    );
  }
}
