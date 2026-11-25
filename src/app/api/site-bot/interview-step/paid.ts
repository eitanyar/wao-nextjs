import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { interviewStep } from '@/lib/site-bot/interviewFlow';
import { boundedInterviewJson, clientIp, defaultInterviewDeps } from '@/lib/site-bot/interviewDeps';
import { cookieFromHeader } from '@/lib/site-bot/interviewSession';

// Site Bot step 2a: POST /api/site-bot/interview-step, reachable only through the SITE_BOT_PAID_FLOW gate in ./route.
// The caller must hold the interview session cookie (interviewSession.ts); the session is never named in the body.
//   { step: 'progress', progress }            the browser's step snapshot, so a reload resumes (intake phase only)
//   { step: 'contact', collectedData }        owner contact + the record; research starts here unless location is asked
//   { step: 'domain', owner: { domainChoice, domain? } }
//   { step: 'location', workLocation }        tutor / photographer / solar only; OWN_PLACE / ONLINE exit to the
//                                             waiting list (reason 'location'), a replayed exit answers 'exited' again
//   200 { status: 'ok' | 'exited', session }   401 no_session   409 session_closed / out_of_order   400 invalid_input

export const INTERVIEW_STEP_RATE_LIMIT = { maxRequests: 60, windowMs: 10 * 60 * 1000 } as const;

function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    if (!checkRateLimit(`sitebot-interview-step:${clientIp(req)}`, INTERVIEW_STEP_RATE_LIMIT).allowed) return reply({ error: 'rate_limited' }, 429);
    const body = await boundedInterviewJson(req);
    if (body === null) return reply({ error: 'invalid_input' }, 400);
    const outcome = await interviewStep(cookieFromHeader(req.headers.get('cookie')), body, defaultInterviewDeps());
    switch (outcome.kind) {
      case 'ok': return reply({ status: 'ok', session: outcome.view }, 200);
      case 'exited': return reply({ status: 'exited', session: outcome.view }, 200);
      case 'no_session': return reply({ error: 'no_session' }, 401);
      case 'closed': return reply({ error: 'session_closed', session: outcome.view }, 409);
      case 'out_of_order': return reply({ error: 'out_of_order', session: outcome.view }, 409);
      case 'invalid_input': return reply({ error: 'invalid_input' }, 400);
      case 'unavailable': return reply({ error: 'server_error' }, 500);
    }
  } catch {
    console.error('SITE_BOT_INTERVIEW_STEP_FAILED');
    return reply({ error: 'server_error' }, 500);
  }
}
