import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { redeemResumeLink } from '@/lib/site-bot/interviewFlow';
import { clientIp, defaultInterviewDeps } from '@/lib/site-bot/interviewDeps';
import { interviewSetCookie } from '@/lib/site-bot/interviewSession';

// Site Bot step 2a: GET /api/site-bot/interview-resume?t=<signed token>, reachable only through the SITE_BOT_PAID_FLOW
// gate in ./route. The {continueUrl} of the 24-hour reminder email. An authentic, unexpired link for a still-open
// interview session restores the session cookie (a new secret: the session moves to this browser) and 303s to
// /site-bot/start for that check, where the flow resumes. A forged, malformed or expired link, or a closed session, is
// refused: no cookie, 303 to the free check (/site-bot/audit).

export const INTERVIEW_RESUME_RATE_LIMIT = { maxRequests: 20, windowMs: 10 * 60 * 1000 } as const;

// A same-origin path (relative Location), so the proxy's internal host never leaks into the redirect.
function redirect(_req: Request, location: string, setCookie?: string) {
  const headers: Record<string, string> = { 'Cache-Control': 'private, no-store', Location: location };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  return new NextResponse(null, { status: 303, headers });
}

export async function GET(req: Request) {
  try {
    if (!checkRateLimit(`sitebot-interview-resume:${clientIp(req)}`, INTERVIEW_RESUME_RATE_LIMIT).allowed) return redirect(req, '/site-bot/audit');
    const token = new URL(req.url).searchParams.get('t');
    const outcome = redeemResumeLink(token, defaultInterviewDeps());
    if (outcome.kind !== 'resumed') return redirect(req, '/site-bot/audit');
    return redirect(req, outcome.startPath, interviewSetCookie(outcome.cookie, outcome.maxAgeMs));
  } catch {
    console.error('SITE_BOT_INTERVIEW_RESUME_FAILED');
    return redirect(req, '/site-bot/audit');
  }
}
