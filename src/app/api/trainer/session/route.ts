import { NextResponse } from 'next/server';
import { isStaff } from '@/lib/trainer/auth';
import { mintTrainerSession } from '@/lib/trainer/engine';

export const dynamic = 'force-dynamic';

/**
 * Mints a session config server-side for whichever engine TRAINER_ENGINE
 * selects (default: gemini). API keys never reach the client — for Gemini
 * this returns a one-use ephemeral auth token; for ElevenLabs a signed
 * conversation token. Staff-gated — same wao-admin cookie as
 * /admin/live-readiness.
 */
export async function POST() {
  if (!(await isStaff())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const session = await mintTrainerSession();
    return NextResponse.json(session);
  } catch (err) {
    console.error('[trainer/session]', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'session-mint-failed', message }, { status: 502 });
  }
}
