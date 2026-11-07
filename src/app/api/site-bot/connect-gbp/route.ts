import { NextResponse } from 'next/server';

// Paid-journey v2 M0 dress rehearsal: the full handler lives in ./paid and is
// reachable ONLY when SITE_BOT_PAID_FLOW=1 on a non-production server. With the
// flag unset (prod default) this returns the audit-only 503 below, unchanged.
export async function POST(req: Request) {
  if (process.env.SITE_BOT_PAID_FLOW === '1' && process.env.NODE_ENV !== 'production') {
    const { POST: paidPOST } = await import('./paid');
    return paidPOST(req);
  }
  return NextResponse.json(
    { error: 'gbp_connect_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
