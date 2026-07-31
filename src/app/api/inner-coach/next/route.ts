import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/lib/trainer/auth';
import { getOrPickTodaysSession, buildSessionConfig, type Mode } from '@/lib/inner-coach/session';

export const dynamic = 'force-dynamic';

const VALID_MODES: Mode[] = ['intake', 'priming', 'evidence', 'critic', 'cooldown'];

/**
 * POST /api/inner-coach/next — today's mode+belief pick, no token minted (no
 * secrets in the response). The `session` route mints against whatever this
 * returns. Body: { fresh?: boolean, mode?: Mode }. Staff-gated, Eitan-only.
 */
export async function POST(request: NextRequest) {
  if (!(await isStaff())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // empty/absent body is fine — defaults apply
  }

  const fresh = body.fresh === true;
  const mode = VALID_MODES.includes(body.mode as Mode) ? (body.mode as Mode) : undefined;

  try {
    const daily = getOrPickTodaysSession({ fresh, mode });
    const config = buildSessionConfig(daily);
    return NextResponse.json({ ok: true, daily, config });
  } catch (err) {
    console.error('[inner-coach/next]', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'pick-failed', message }, { status: 500 });
  }
}
