import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/lib/trainer/auth';
import { getConversation, type ConversationRecord } from '@/lib/trainer/elevenlabs';
import { DANNY_PERSONA } from '@/lib/trainer/persona';

export const dynamic = 'force-dynamic';

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'trainer', 'sessions');

interface GeminiTranscriptTurn {
  role: 'user' | 'agent';
  text: string;
  t?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** ElevenLabs finishes processing the transcript a few seconds after the call ends. */
async function fetchTranscriptWithRetry(conversationId: string): Promise<ConversationRecord> {
  let last: ConversationRecord | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const record = await getConversation(conversationId);
    last = record;
    if (record.status === 'done' || record.status === 'failed') return record;
    await sleep(2000);
  }
  return last as ConversationRecord;
}

function appendSessionLine(line: Record<string, unknown>): void {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const filePath = path.join(SESSIONS_DIR, `${today}.jsonl`);
  fs.appendFileSync(filePath, `${JSON.stringify(line)}\n`, 'utf8');
}

/**
 * Appends one session transcript line to data/trainer/sessions/YYYY-MM-DD.jsonl.
 * Two engine paths (per docs/specs/articulation-trainer.md §3, §4):
 *  - gemini: client streamed the whole session in-browser and posts the
 *    collected transcript turns directly (push-based — Gemini Live has no
 *    server-side conversation-history API to pull from).
 *  - elevenlabs: pull-based — client only posts a conversationId, we fetch
 *    the full transcript server-side from the ElevenLabs API.
 * Staff-gated — same wao-admin cookie as /admin/live-readiness.
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

  const engine = body?.engine === 'gemini' ? 'gemini' : 'elevenlabs';

  if (engine === 'gemini') {
    const turns = Array.isArray(body?.turns) ? (body.turns as GeminiTranscriptTurn[]) : null;
    if (!turns) {
      return NextResponse.json({ error: 'missing-turns' }, { status: 400 });
    }

    const line = {
      engine: 'gemini' as const,
      personaId: DANNY_PERSONA.id,
      model: typeof body.model === 'string' ? body.model : undefined,
      startedAt: typeof body.startedAt === 'string' ? body.startedAt : undefined,
      endedAt: new Date().toISOString(),
      transcript: turns,
    };

    try {
      appendSessionLine(line);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('[trainer/transcript][gemini]', err);
      const message = err instanceof Error ? err.message : 'unknown error';
      return NextResponse.json({ error: 'transcript-write-failed', message }, { status: 500 });
    }
  }

  // ElevenLabs path — unchanged from M1, pull-based.
  const conversationId = typeof body.conversationId === 'string' ? body.conversationId : undefined;
  if (!conversationId) {
    return NextResponse.json({ error: 'missing-conversation-id' }, { status: 400 });
  }

  try {
    const record = await fetchTranscriptWithRetry(conversationId);

    appendSessionLine({
      engine: 'elevenlabs' as const,
      personaId: DANNY_PERSONA.id,
      conversationId: record.conversation_id,
      agentId: record.agent_id,
      status: record.status,
      endedAt: new Date().toISOString(),
      transcript: record.transcript,
    });

    return NextResponse.json({ ok: true, transcript: record.transcript, status: record.status });
  } catch (err) {
    console.error('[trainer/transcript][elevenlabs]', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'transcript-fetch-failed', message }, { status: 502 });
  }
}
