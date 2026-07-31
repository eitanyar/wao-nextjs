import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/lib/trainer/auth';
import { extractDraftLedger, reflectTranscript } from '@/lib/inner-coach/reflect';
import { appendEvidence, flagRelapse, loadLedger, saveLedger } from '@/lib/inner-coach/ledger';

export const dynamic = 'force-dynamic';

const REFLECTIONS_DIR = path.join(process.cwd(), 'data', 'inner-coach', 'reflections');

type Turn = { role: string; text: string };

function isValidTranscript(t: unknown): t is Turn[] {
  return Array.isArray(t) && t.length > 0 && t.every(
    (x) => x && typeof (x as Turn).role === 'string' && typeof (x as Turn).text === 'string',
  );
}

function persistReflection(record: Record<string, unknown>): void {
  fs.mkdirSync(REFLECTIONS_DIR, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  fs.appendFileSync(path.join(REFLECTIONS_DIR, `${day}.jsonl`), `${JSON.stringify(record)}\n`, 'utf8');
}

/**
 * POST /api/inner-coach/reflect — the debrief analog (docs/specs/inner-coach-workplan.md
 * §3.5, M3'). Body: { transcript, mode, beliefId? }.
 * - mode 'intake' → runs the ledger-draft extractor, returns draftBeliefs for
 *   hand-approve via POST /api/inner-coach/ledger — NEVER auto-writes the ledger.
 * - other modes → runs the Language Mirror, appends any evidence actions to the
 *   bound belief (retiring it if the threshold is met), checks for relapse on a
 *   retired belief, and persists the reflection for the dashboard's ratio chart.
 * Staff-gated, Eitan-only.
 */
export async function POST(request: NextRequest) {
  if (!(await isStaff())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  if (!isValidTranscript(body.transcript)) {
    return NextResponse.json({ error: 'missing-transcript' }, { status: 400 });
  }
  const transcript = body.transcript;
  const mode = typeof body.mode === 'string' ? body.mode : undefined;
  const beliefId = typeof body.beliefId === 'string' ? body.beliefId : undefined;

  if (mode === 'intake') {
    try {
      const draftBeliefs = await extractDraftLedger(transcript);
      return NextResponse.json({ ok: true, mode: 'intake', draftBeliefs });
    } catch (err) {
      console.error('[inner-coach/reflect][intake]', err);
      const message = err instanceof Error ? err.message : 'unknown error';
      return NextResponse.json({ error: 'extract-failed', message }, { status: 502 });
    }
  }

  let ledger = loadLedger();
  const belief = beliefId ? ledger?.beliefs.find((b) => b.id === beliefId) : undefined;

  let reflection;
  try {
    reflection = await reflectTranscript({
      transcript,
      activeBelief: belief ? { limiting: belief.limiting, empowering: belief.empowering, program: belief.program } : undefined,
    });
  } catch (err) {
    console.error('[inner-coach/reflect]', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'reflect-failed', message }, { status: 502 });
  }

  let ledgerUpdated = false;
  let beliefStatus: string | undefined;

  if (ledger && belief) {
    let updated = ledger;
    for (const ev of reflection.evidenceActions) {
      updated = appendEvidence(updated, belief.id, ev.action, body.sessionId as string | undefined);
    }
    // Relapse: a retired belief's program got re-tagged in a session bound to it.
    const stillTaggedOldProgram = reflection.tags.some((t) => t.program === belief.program);
    if (belief.status === 'retired' && stillTaggedOldProgram) {
      updated = flagRelapse(updated, belief.id);
    }
    if (updated !== ledger) {
      saveLedger(updated);
      ledger = updated;
      ledgerUpdated = true;
    }
    beliefStatus = ledger.beliefs.find((b) => b.id === belief.id)?.status;
  }

  const record = {
    scoredAt: new Date().toISOString(),
    mode,
    beliefId,
    tags: reflection.tags,
    evidenceActions: reflection.evidenceActions,
    ratio: reflection.ratio,
  };
  try {
    persistReflection(record);
  } catch (err) {
    console.error('[inner-coach/reflect] persist failed', err);
  }

  return NextResponse.json({ ok: true, mode, reflection, ledgerUpdated, beliefStatus });
}
