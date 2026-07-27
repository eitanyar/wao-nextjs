import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/lib/trainer/auth';
import { getOrGenerateTodaysSession } from '@/lib/trainer/coach';

export const dynamic = 'force-dynamic';

/**
 * POST /api/trainer/next — the Coach (spec §7-M2, brief §4).
 * Body: { fresh?: boolean, level?: 1|2|3, track?: string }.
 * No args ⇒ returns today's cached session if one exists (one generation
 * call per day on the happy path); `fresh: true` forces regeneration.
 * Staff-gated — same wao-admin cookie as the other trainer routes.
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
  const level = body.level === 1 || body.level === 2 || body.level === 3 ? body.level : undefined;
  const track = typeof body.track === 'string' ? body.track : undefined;

  try {
    const session = await getOrGenerateTodaysSession({ fresh, level, track });
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error('[trainer/next]', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'generation-failed', message }, { status: 502 });
  }
}
