import { NextResponse } from 'next/server';

// Paid-journey v2 M0 dress rehearsal: the full handler lives in ./paid and is
// reachable ONLY when SITE_BOT_PAID_FLOW=1 on a non-production server. With the
// flag unset (prod default) this returns the audit-only 503 below, unchanged.
export async function GET(req: Request) {
  if (process.env.SITE_BOT_PAID_FLOW === '1' && process.env.NODE_ENV !== 'production') {
    const { GET: paidGET } = await import('./paid');
    return paidGET(req);
  }
  return NextResponse.json(
    { error: 'prefill_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
