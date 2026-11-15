import { NextResponse } from 'next/server';
import { isPaidFlowCallbackAllowed } from '@/lib/site-bot/paidFlowGate';

// Paid-journey v2: the full handler lives in ./paid and is reachable ONLY when the runtime
// SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) is 'rehearsal' or 'open'. Unlike the
// other paid routes this one does NOT require the admin cookie in rehearsal: the payment provider's
// server callback carries none, so ./paid authenticates it by its own provider check (an invalid
// callback is rejected as payment_verification_failed) and acts only on a pending session that
// the admin-gated checkout/init created. Closed (the production default) returns the audit-only
// 503 below, unchanged.
export async function POST(req: Request) {
  if (isPaidFlowCallbackAllowed()) {
    const { POST: paidPOST } = await import('./paid');
    return paidPOST(req);
  }
  return NextResponse.json(
    { error: 'checkout_unavailable' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
