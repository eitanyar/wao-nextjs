import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { auditResultPath } from '@/lib/site-bot/offerState';
import { startInterview } from '@/lib/site-bot/interviewFlow';
import { defaultInterviewDeps } from '@/lib/site-bot/interviewDeps';
import { cookieFromHeader, interviewSetCookie } from '@/lib/site-bot/interviewSession';

// Launch step 1 + step 2a: POST /api/site-bot/interview-start { auditId, placeId }, reachable only through the
// SITE_BOT_PAID_FLOW gate in ./route. The server-side start of the Site Bot interview: the audit must exist, the business
// must be eligible, and a launch-cap spot must be free (or already held by this business). The spot is claimed here,
// atomically (launchStore.ts reserveInterviewStart), never on a page GET. Step 2a: the claim also opens (or resumes) the
// interview session (interviewSession.ts), whose httpOnly cookie is set on a fresh session. Anything else answers with
// the audit URL that shows the owner his current offer, never the interview.
//   200 { status: 'started' | 'resumed', session }  started = fresh spot claim (the browser fires
//        site_bot_interview_started once); session = { phase, progress, locationTrade, workLocation, businessName }
//   200 { status: 'closed', session }   this browser's session for THIS check ended (exited / expired / paid): no claim
//   409 { status: 'blocked', offer, redirect }   409 { status: 'elsewhere', redirect }   404 { error: 'not_found', redirect }

export const INTERVIEW_START_RATE_LIMIT = { maxRequests: 10, windowMs: 10 * 60 * 1000 } as const;

function reply(body: object, status: number, setCookie?: string) {
  const headers: Record<string, string> = { 'Cache-Control': 'private, no-store' };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  return NextResponse.json(body, { status, headers });
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`sitebot-interview-start:${ip}`, INTERVIEW_START_RATE_LIMIT).allowed) return reply({ error: 'rate_limited' }, 429);
    let body: unknown;
    try { body = await req.json(); } catch { return reply({ error: 'invalid_input' }, 400); }
    const { auditId, placeId } = (body && typeof body === 'object' ? body : {}) as { auditId?: unknown; placeId?: unknown };
    const deps = defaultInterviewDeps();
    const outcome = await startInterview({ auditId, placeId, cookieValue: cookieFromHeader(req.headers.get('cookie')) }, deps);
    const resultPath = () => auditResultPath(String(auditId), String(placeId));
    switch (outcome.kind) {
      case 'no_audit': return reply({ error: 'not_found', redirect: '/site-bot/audit' }, 404);
      case 'blocked': return reply({ status: 'blocked', offer: outcome.claim.offer, redirect: resultPath() }, 409);
      case 'elsewhere': return reply({ status: 'elsewhere', redirect: resultPath() }, 409);
      case 'unavailable': return reply({ error: 'server_error' }, 500);
      case 'closed': return reply({ status: 'closed', session: outcome.view }, 200);
      case 'session': {
        const cookie = outcome.cookie ? interviewSetCookie(outcome.cookie, Date.parse(outcome.expiresAt) - deps.now().getTime()) : undefined;
        return reply({ status: outcome.status, session: outcome.view }, 200, cookie);
      }
    }
  } catch {
    console.error('SITE_BOT_INTERVIEW_START_FAILED');
    return reply({ error: 'server_error' }, 500);
  }
}
