import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { auditResultPath, claimInterviewStart } from '@/lib/site-bot/offerState';

// Launch step 1: POST /api/site-bot/interview-start { auditId, placeId }, reachable only through the SITE_BOT_PAID_FLOW
// gate in ./route. The server-side start of the Site Bot interview: the audit must exist, the business must be eligible,
// and a launch-cap spot must be free (or already held by this business). The spot is claimed here, atomically
// (launchStore.ts reserveInterviewStart), never on a page GET. Anything else answers with the audit URL that shows the
// owner his current offer (the full waiting list, the pre-open list or a not-eligible block), never the interview.
//   200 { status: 'started' }  fresh claim (the browser fires site_bot_interview_started once)
//   200 { status: 'resumed' }  this business already held a spot (no second event, no second count)
//   409 { status: 'blocked', offer, redirect }   404 { error: 'not_found', redirect: '/site-bot/audit' }

export const INTERVIEW_START_RATE_LIMIT = { maxRequests: 10, windowMs: 10 * 60 * 1000 } as const;

function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`sitebot-interview-start:${ip}`, INTERVIEW_START_RATE_LIMIT).allowed) return reply({ error: 'rate_limited' }, 429);
    let body: unknown;
    try { body = await req.json(); } catch { return reply({ error: 'invalid_input' }, 400); }
    const { auditId, placeId } = (body && typeof body === 'object' ? body : {}) as { auditId?: unknown; placeId?: unknown };
    const claim = await claimInterviewStart(auditId, placeId);
    if (claim.kind === 'no_audit') return reply({ error: 'not_found', redirect: '/site-bot/audit' }, 404);
    if (claim.kind === 'blocked') {
      return reply({ status: 'blocked', offer: claim.offer, redirect: auditResultPath(String(auditId), String(placeId)) }, 409);
    }
    return reply({ status: claim.status === 'reserved' ? 'started' : 'resumed' }, 200);
  } catch {
    console.error('SITE_BOT_INTERVIEW_START_FAILED');
    return reply({ error: 'server_error' }, 500);
  }
}
