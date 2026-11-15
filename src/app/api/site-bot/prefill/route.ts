import { NextResponse } from 'next/server';
import { isPaidFlowAllowedForRequest } from '@/lib/site-bot/paidFlowGate';

// Paid-journey v2: the full handler lives in ./paid and is reachable ONLY when the runtime
// SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) allows this request: 'open' for
// everyone, 'rehearsal' for a valid admin cookie. Closed (the production default) returns the
// audit-only 503 below, unchanged.
export async function GET(req: Request) {
  if (await isPaidFlowAllowedForRequest()) {
    const { GET: paidGET } = await import('./paid');
    return paidGET(req);
  }
  return NextResponse.json(
    { error: 'prefill_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
