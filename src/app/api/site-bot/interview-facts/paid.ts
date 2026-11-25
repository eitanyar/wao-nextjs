import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { interviewFacts } from '@/lib/site-bot/interviewFactsFlow';
import { boundedInterviewJson, clientIp, defaultInterviewDeps } from '@/lib/site-bot/interviewDeps';
import { cookieFromHeader } from '@/lib/site-bot/interviewSession';

// Site Bot step 2b: POST /api/site-bot/interview-facts, reachable only through the SITE_BOT_PAID_FLOW gate in ./route.
// The confirm-facts screen: the facts taken from the owner's interview answers (interviewFactsFlow.ts), readable and
// writable only with this interview session's cookie; the body never names a session or a research.
//   { action: 'load' }                                200 { facts, empty, canReturn, canFinish, confirmed, extraction }
//                                                     409 extracting (another request is extracting: poll again)
//   { action: 'review', factId, decision, text? }     decision = confirm | remove | fix   404 not_found (not his fact)
//   { action: 'done' }                                200 { phase: 'facts_confirmed' }    409 facts_pending / facts_empty
//   { action: 'return' }                              200 { phase: 'questions' }          409 return_unavailable
//   401 no_session   409 out_of_order   503 research_unavailable   400 invalid_input
// The extraction itself is bounded per answer-set version on the session (claimFactExtraction), whatever the IP limit.

export const INTERVIEW_FACTS_RATE_LIMIT = { maxRequests: 120, windowMs: 10 * 60 * 1000 } as const;

function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    if (!checkRateLimit(`sitebot-interview-facts:${clientIp(req)}`, INTERVIEW_FACTS_RATE_LIMIT).allowed) return reply({ error: 'rate_limited' }, 429);
    const body = await boundedInterviewJson(req, 8 * 1024);
    if (body === null) return reply({ error: 'invalid_input' }, 400);
    const outcome = await interviewFacts(cookieFromHeader(req.headers.get('cookie')), body, defaultInterviewDeps());
    return reply(outcome.body, outcome.status);
  } catch {
    console.error('SITE_BOT_INTERVIEW_FACTS_FAILED');
    return reply({ error: 'server_error' }, 500);
  }
}
