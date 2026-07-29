import { NextResponse } from 'next/server';
import { runChargeCron } from '@/lib/payments/cron-charge';
import { isCronAuthorized } from '@/lib/payments/cron-auth';

/**
 * Cron-triggered recurring-charge run. Invoked by
 * `scripts/cron/charge-subscriptions.sh` (system crontab on the VPS, flock-
 * wrapped so overlapping ticks can't both fire — see that script's header
 * comment). Auth: `Authorization: Bearer <CRON_SECRET>`, enforced by
 * `isCronAuthorized` (fails closed if `CRON_SECRET` isn't configured).
 */

/**
 * Soft dead-man's-switch ping (e.g. healthchecks.io-style). No-op if
 * `CRON_HEALTHCHECK_URL` isn't set — this is optional ops infra the user
 * hasn't provisioned yet (see handoff report). Fire-and-forget: a failed
 * ping must never fail the cron run itself.
 */
async function pingHealthcheck(): Promise<void> {
  const url = process.env.CRON_HEALTHCHECK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: 'GET' });
  } catch (err) {
    console.warn('[subscriptions/cron/charge] Healthcheck ping failed (non-fatal):', err);
  }
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runChargeCron();
    await pingHealthcheck();
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error('[subscriptions/cron/charge] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run charge cron' },
      { status: 500 }
    );
  }
}
