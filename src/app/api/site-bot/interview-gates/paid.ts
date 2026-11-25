import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { interviewGates } from '@/lib/site-bot/interviewGates';
import { boundedInterviewJson, clientIp, defaultInterviewDeps } from '@/lib/site-bot/interviewDeps';
import { cookieFromHeader } from '@/lib/site-bot/interviewSession';

// Site Bot step 2a: POST /api/site-bot/interview-gates, reachable only through the SITE_BOT_PAID_FLOW gate in ./route.
// The owner research gates, re-keyed from the checkout session to the interview session (ownerGates.ts header): the
// caller must hold the interview session cookie; the research id is the session's own, never taken from the body.
//   { action: 'list' }                                   200 { gates: [{ id, type, evidenceDigest }] } (open gates only)
//   { action: 'answer', gateId, evidenceDigest, answer } 200 { status: 'approved' } (only a gate on the server-side list)
//   401 no_session   404 not_found   409 gate_closed / stale_evidence / research_pending   400 invalid_input
// 2b renders the questions inside the interview; the pay page no longer asks them.

export const INTERVIEW_GATES_RATE_LIMIT = { maxRequests: 30, windowMs: 10 * 60 * 1000 } as const;

function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    if (!checkRateLimit(`sitebot-interview-gates:${clientIp(req)}`, INTERVIEW_GATES_RATE_LIMIT).allowed) return reply({ error: 'rate_limited' }, 429);
    const body = await boundedInterviewJson(req, 32 * 1024);
    if (body === null) return reply({ error: 'invalid_input' }, 400);
    const outcome = await interviewGates(cookieFromHeader(req.headers.get('cookie')), body, defaultInterviewDeps());
    return reply(outcome.body, outcome.status);
  } catch {
    console.error('SITE_BOT_INTERVIEW_GATES_FAILED');
    return reply({ error: 'server_error' }, 500);
  }
}
