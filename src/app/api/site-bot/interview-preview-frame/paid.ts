import { checkRateLimit } from '@/lib/payments/rate-limit';
import { previewForFrame } from '@/lib/site-bot/interviewPreview';
import { clientIp, defaultInterviewDeps } from '@/lib/site-bot/interviewDeps';
import { cookieFromHeader } from '@/lib/site-bot/interviewSession';
import { PREVIEW_FRAME_HEADERS, previewFrameHtml } from '@/lib/site-bot/previewFrame';

// Site Bot step 2c: GET /api/site-bot/interview-preview-frame, reachable only through the SITE_BOT_PAID_FLOW gate in
// ./route. The owner's own home-page preview as an inert HTML document for the <iframe sandbox> on /site-bot/start
// (isolation design: src/lib/site-bot/previewFrame.ts). The capability is the interview session cookie alone; the URL
// names no session and no research. 401 = no session cookie; 404 = no ready preview for this session.
// Every reply: X-Robots-Tag noindex, nofollow; Cache-Control private, no-store; the restrictive sandbox CSP.

export const INTERVIEW_PREVIEW_FRAME_RATE_LIMIT = { maxRequests: 60, windowMs: 10 * 60 * 1000 } as const;

function plain(status: number): Response {
  return new Response(null, { status, headers: { ...PREVIEW_FRAME_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' } });
}

export async function GET(req: Request) {
  try {
    if (!checkRateLimit(`sitebot-interview-preview-frame:${clientIp(req)}`, INTERVIEW_PREVIEW_FRAME_RATE_LIMIT).allowed) return plain(429);
    const found = previewForFrame(cookieFromHeader(req.headers.get('cookie')), defaultInterviewDeps());
    if (found.kind === 'no_session') return plain(401);
    if (found.kind === 'not_found') return plain(404);
    return new Response(await previewFrameHtml(found.record), { status: 200, headers: PREVIEW_FRAME_HEADERS });
  } catch {
    console.error('SITE_BOT_INTERVIEW_PREVIEW_FRAME_FAILED');
    return plain(500);
  }
}
