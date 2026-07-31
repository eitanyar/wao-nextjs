import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/lib/trainer/auth';

export const dynamic = 'force-dynamic';

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'inner-coach', 'sessions');

interface TranscriptTurn {
  role: 'user' | 'agent';
  text: string;
  t?: number;
}

function appendSessionLine(line: Record<string, unknown>): void {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  fs.appendFileSync(path.join(SESSIONS_DIR, `${today}.jsonl`), `${JSON.stringify(line)}\n`, 'utf8');
}

/**
 * POST /api/inner-coach/transcript — appends one session transcript line to
 * data/inner-coach/sessions/YYYY-MM-DD.jsonl. Gemini-only (client streamed the
 * whole session in-browser and posts the collected turns directly), forked from
 * the trainer's gemini path (src/app/api/trainer/transcript/route.ts) — the
 * ElevenLabs pull-based branch doesn't apply here.
 * Staff-gated; Eitan-only per D2 (docs/specs/inner-coach-workplan.md §2).
 */
export async function POST(request: NextRequest) {
  if (!(await isStaff())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // fall through to validation below
  }

  const turns = Array.isArray(body?.turns) ? (body.turns as TranscriptTurn[]) : null;
  if (!turns) {
    return NextResponse.json({ error: 'missing-turns' }, { status: 400 });
  }

  const line = {
    engine: 'gemini' as const,
    personaId: typeof body.personaId === 'string' ? body.personaId : 'inner-coach',
    mode: typeof body.mode === 'string' ? body.mode : undefined,
    beliefId: typeof body.beliefId === 'string' ? body.beliefId : undefined,
    model: typeof body.model === 'string' ? body.model : undefined,
    startedAt: typeof body.startedAt === 'string' ? body.startedAt : undefined,
    endedAt: new Date().toISOString(),
    transcript: turns,
  };

  try {
    appendSessionLine(line);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[inner-coach/transcript]', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'transcript-write-failed', message }, { status: 500 });
  }
}
