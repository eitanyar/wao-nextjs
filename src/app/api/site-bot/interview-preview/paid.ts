import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { defaultPreviewDeps, interviewPreview } from '@/lib/site-bot/interviewPreview';
import { boundedInterviewJson, clientIp, defaultInterviewDeps } from '@/lib/site-bot/interviewDeps';
import { cookieFromHeader } from '@/lib/site-bot/interviewSession';

// Site Bot step 2c: POST /api/site-bot/interview-preview, reachable only through the SITE_BOT_PAID_FLOW gate in ./route.
// The home-page preview state of the cookie's interview session (src/lib/site-bot/interviewPreview.ts); the body never
// names a session or a research.
//   { action: 'status' }   200 { phase: 'facts_confirmed', preview: { status, round, fixAvailable, fixUsed, frameUrl } }
//                          (starts the due generation round once; the page polls this while it runs)
//   { action: 'fix' }      200 { phase: 'facts' }   409 fix_unavailable (not ready, or the one fix round is used)
//   401 no_session   409 out_of_order   400 invalid_input   429 rate_limited
// Generation itself is bounded per session (rounds + attempts claimed on the session), whatever the IP limit.

export const INTERVIEW_PREVIEW_RATE_LIMIT = { maxRequests: 300, windowMs: 10 * 60 * 1000 } as const;

function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    if (!checkRateLimit(`sitebot-interview-preview:${clientIp(req)}`, INTERVIEW_PREVIEW_RATE_LIMIT).allowed) return reply({ error: 'rate_limited' }, 429);
    const body = await boundedInterviewJson(req, 2 * 1024);
    if (body === null) return reply({ error: 'invalid_input' }, 400);
    const outcome = await interviewPreview(cookieFromHeader(req.headers.get('cookie')), body, defaultPreviewDeps(defaultInterviewDeps()));
    return reply(outcome.body, outcome.status);
  } catch {
    console.error('SITE_BOT_INTERVIEW_PREVIEW_FAILED');
    return reply({ error: 'server_error' }, 500);
  }
}
