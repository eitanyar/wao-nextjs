import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/lib/trainer/auth';
import { mintGeminiSession } from '@/lib/trainer/gemini';
import { getOrPickTodaysSession, buildSessionConfig, type Mode } from '@/lib/inner-coach/session';

export const dynamic = 'force-dynamic';

const VALID_MODES: Mode[] = ['intake', 'priming', 'evidence', 'critic', 'cooldown'];

/**
 * POST /api/inner-coach/session — mints a Gemini Live ephemeral token for
 * today's picked mode+belief (or an explicit `mode` override). Gemini-only,
 * staff-gated, Eitan-only per D2 (docs/specs/inner-coach-workplan.md §2).
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

  const mode = VALID_MODES.includes(body.mode as Mode) ? (body.mode as Mode) : undefined;

  try {
    const daily = getOrPickTodaysSession({ mode });
    const config = buildSessionConfig(daily);

    const session = await mintGeminiSession({
      id: config.personaId,
      name: config.personaName,
      archetype: 'inner-coach',
      systemPrompt: config.systemPrompt,
      firstMessage: config.firstMessage,
      situation: config.situation,
      hiddenObjective: '',
      timeCapMin: config.timeCapMin,
      voice: config.voice,
    });

    return NextResponse.json({ ok: true, ...session, mode: config.mode, beliefId: config.beliefId });
  } catch (err) {
    console.error('[inner-coach/session]', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'session-mint-failed', message }, { status: 502 });
  }
}
