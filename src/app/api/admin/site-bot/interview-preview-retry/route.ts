import { NextResponse } from 'next/server';
import { boundedJsonObject, requireAdmin, sameOrigin } from '@/lib/site-bot/adminRequestGuards';
import { defaultPreviewDeps, staffRetry } from '@/lib/site-bot/interviewPreview';
import { defaultInterviewDeps } from '@/lib/site-bot/interviewDeps';

// Site Bot step 2c: staff re-trigger of a failed generation (the preview-failed staff email names this endpoint).
//   POST { sessionId, stage: 'preview' | 'site' }   admin cookie + same origin
//   preview: a failed home-page preview round gets a fresh attempt (the owner's screen moves on by itself);
//   site:    a failed post-payment run of the remaining pages is claimed and run again (into the review path; no deploy).
//   200 { status: 'started' }   409 { status: 'not_failed' | 'already' }   404 not_found   401 unauthorized   400 invalid_input

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) return reply({ error: 'unauthorized' }, 401);
    if (!sameOrigin(req)) return reply({ error: 'forbidden' }, 403);
    let body: Record<string, unknown>;
    try { body = await boundedJsonObject(req, 1024); } catch { return reply({ error: 'invalid_input' }, 400); }
    const stage = body.stage === 'site' ? 'site' : body.stage === 'preview' || body.stage === undefined ? 'preview' : null;
    if (typeof body.sessionId !== 'string' || !UUID.test(body.sessionId) || !stage) return reply({ error: 'invalid_input' }, 400);
    const outcome = staffRetry(body.sessionId, stage, defaultPreviewDeps(defaultInterviewDeps()));
    if (outcome === 'not_found') return reply({ error: 'not_found' }, 404);
    return reply({ status: outcome }, outcome === 'started' ? 200 : 409);
  } catch {
    console.error('SITE_BOT_PREVIEW_RETRY_FAILED');
    return reply({ error: 'server_error' }, 500);
  }
}
