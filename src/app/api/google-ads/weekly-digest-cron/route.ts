import { NextResponse } from 'next/server';

/**
 * Auth: `Authorization: Bearer <CRON_SECRET>` — unified with the billing
 * cron routes' convention (`src/lib/payments/cron-auth.ts`). Deliberately
 * NOT importing that helper here: it lives under `lib/payments` and this is
 * a google-ads route, so mirroring these ~5 lines locally avoids coupling
 * two otherwise-unrelated subsystems together for a trivial auth check. Both
 * routes do already share the same `CRON_SECRET` env var, so there is no
 * blast-radius change from this rename — only the header shape moved.
 * Fails closed: if `CRON_SECRET` isn't configured, this always returns
 * `false` (same posture as `verifyAdminSecret`, `src/lib/admin-auth.ts`).
 */
function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token === expected;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    status: 'disabled',
    delivery: 'not_sent',
    reason: 'weekly_resend_digest_disabled',
  });
}
