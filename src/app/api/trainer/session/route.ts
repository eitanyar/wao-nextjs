import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/lib/trainer/auth';
import { mintTrainerSession } from '@/lib/trainer/engine';
import { DANNY_PERSONA } from '@/lib/trainer/persona';
import { loadGeneratedSession } from '@/lib/trainer/coach';

export const dynamic = 'force-dynamic';

/**
 * Mints a session config server-side for whichever engine TRAINER_ENGINE
 * selects (default: gemini). API keys never reach the client — for Gemini
 * this returns a one-use ephemeral auth token; for ElevenLabs a signed
 * conversation token. Staff-gated — same wao-admin cookie as
 * /admin/live-readiness.
 *
 * Body: { generatedId?: string } — a Coach-generated persona (M2). Falls back
 * to the hardcoded Danny persona when absent or when the cache entry is gone.
 */
export async function POST(request: NextRequest) {
  if (!(await isStaff())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // no body — fall back to Danny
  }

  const generatedId = typeof body.generatedId === 'string' ? body.generatedId : undefined;
  const generated = generatedId ? loadGeneratedSession(generatedId) : null;
  const persona = generated?.persona ?? DANNY_PERSONA;

  try {
    const session = await mintTrainerSession(persona);
    return NextResponse.json({
      ...session,
      generatedId: generated ? generatedId : undefined,
      level: generated?.level,
    });
  } catch (err) {
    console.error('[trainer/session]', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'session-mint-failed', message }, { status: 502 });
  }
}
