import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/lib/trainer/auth';
import { DANNY_PERSONA } from '@/lib/trainer/persona';
import { computeMetrics, type ObjectiveMetrics } from '@/lib/trainer/metrics';
import { runJudge, type JudgeResult, type JudgeScoreItem, type JudgeMemoItem } from '@/lib/trainer/judge';
import { updateProfile, updateMemos } from '@/lib/trainer/profile';
import type { RubricItem } from '@/lib/trainer/prompts';

export const dynamic = 'force-dynamic';

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'trainer', 'sessions');
const RESULTS_DIR = path.join(process.cwd(), 'data', 'trainer', 'results');
const GENERATED_DIR = path.join(process.cwd(), 'data', 'trainer', 'generated');

type Turn = { role: string; text: string };

/** Persisted debrief — spec §5 SessionResult + the Layer-1 metrics and the
 *  Judge's structured feedback the dashboard renders. */
interface DebriefRecord {
  id: string;
  scenarioId: string;   // personaId for M1 hardcoded/seed sessions; scenario id once M2 exists
  personaId: string;
  level: number;
  startedAt: string;
  scoredAt: string;
  transcript: Turn[];
  metrics: ObjectiveMetrics;
  scores: Record<string, number>;
  overall: number;
  passed: boolean;
  feedback: string;                 // §5 flat summary (first weakness, else first strength)
  strengths: JudgeScoreItem[];
  weaknesses: JudgeScoreItem[];
  drills: string[];
  memos: JudgeMemoItem[];
}

/** Resolve the scoring key (hiddenObjective) + optional scenario rubric + track.
 *  M1/seed → Danny (no track ⇒sales). M2 generated persona → the cached scenario. */
function resolvePersonaContext(
  personaId: string,
  generatedId?: string,
): { hiddenObjective: string; rubric?: RubricItem[]; track?: string } | null {
  if (personaId === DANNY_PERSONA.id) {
    return { hiddenObjective: DANNY_PERSONA.hiddenObjective };
  }
  if (generatedId) {
    try {
      const raw = fs.readFileSync(path.join(GENERATED_DIR, `${generatedId}.json`), 'utf8');
      const gen = JSON.parse(raw) as {
        persona?: { id?: string; hiddenObjective?: string };
        scenario?: { rubric?: RubricItem[] };
        track?: string;
      };
      if (gen.persona?.id === personaId && typeof gen.persona.hiddenObjective === 'string') {
        return { hiddenObjective: gen.persona.hiddenObjective, rubric: gen.scenario?.rubric, track: gen.track };
      }
    } catch {
      return null;
    }
  }
  return null;
}

/** Read a saved session line by { date, index } from sessions/YYYY-MM-DD.jsonl. */
function loadSessionRef(ref: { date?: unknown; index?: unknown }): {
  transcript: Turn[]; personaId: string; level: number; startedAt: string; generatedId?: string;
} | null {
  if (typeof ref.date !== 'string' || typeof ref.index !== 'number') return null;
  try {
    const lines = fs
      .readFileSync(path.join(SESSIONS_DIR, `${ref.date}.jsonl`), 'utf8')
      .split('\n')
      .filter((l) => l.trim());
    const line = lines[ref.index];
    if (!line) return null;
    const rec = JSON.parse(line) as Record<string, unknown>;
    const transcript = Array.isArray(rec.transcript) ? (rec.transcript as Turn[]) : null;
    if (!transcript) return null;
    return {
      transcript,
      personaId: typeof rec.personaId === 'string' ? rec.personaId : DANNY_PERSONA.id,
      level: typeof rec.level === 'number' ? rec.level : 2,
      startedAt: typeof rec.startedAt === 'string' ? rec.startedAt : String(rec.endedAt ?? new Date().toISOString()),
      generatedId: typeof rec.generatedId === 'string' ? rec.generatedId : undefined,
    };
  } catch {
    return null;
  }
}

function isValidTranscript(t: unknown): t is Turn[] {
  return Array.isArray(t) && t.length > 0 && t.every(
    (x) => x && typeof (x as Turn).role === 'string' && typeof (x as Turn).text === 'string',
  );
}

/** Guard the LLM output so a malformed Judge response 502s instead of persisting garbage. */
function isValidJudgeResult(j: unknown): j is JudgeResult {
  if (!j || typeof j !== 'object') return false;
  const r = j as JudgeResult;
  return (
    r.scores != null && typeof r.scores === 'object' && Object.keys(r.scores).length > 0 &&
    typeof r.overall === 'number' && typeof r.passed === 'boolean' &&
    Array.isArray(r.strengths) && Array.isArray(r.weaknesses) &&
    Array.isArray(r.drills) && Array.isArray(r.memos)
  );
}

function appendResult(record: DebriefRecord): void {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const day = record.scoredAt.slice(0, 10);
  fs.appendFileSync(path.join(RESULTS_DIR, `${day}.jsonl`), `${JSON.stringify(record)}\n`, 'utf8');
}

/**
 * POST /api/trainer/debrief — score a session (spec §7-M3, brief §4).
 * Body: { sessionRef: { date, index } }  OR  inline { transcript, personaId, level, generatedId? }.
 * Flow: resolve transcript → computeMetrics → runJudge → persist SessionResult
 *       + update profile + memos → return the full debrief. Judge failure ⇒ 502,
 *       nothing persisted (never a half-scored result).
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

  // Resolve the transcript + metadata from either a saved session ref or inline.
  let transcript: Turn[];
  let personaId: string;
  let level: number;
  let startedAt: string;
  let generatedId: string | undefined;

  if (body.sessionRef && typeof body.sessionRef === 'object') {
    const loaded = loadSessionRef(body.sessionRef as Record<string, unknown>);
    if (!loaded) return NextResponse.json({ error: 'session-not-found' }, { status: 404 });
    ({ transcript, personaId, level, startedAt, generatedId } = loaded);
  } else {
    if (!isValidTranscript(body.transcript)) {
      return NextResponse.json({ error: 'missing-transcript' }, { status: 400 });
    }
    transcript = body.transcript;
    personaId = typeof body.personaId === 'string' ? body.personaId : DANNY_PERSONA.id;
    level = typeof body.level === 'number' ? body.level : 2;
    startedAt = typeof body.startedAt === 'string' ? body.startedAt : new Date().toISOString();
    generatedId = typeof body.generatedId === 'string' ? body.generatedId : undefined;
  }

  const ctx = resolvePersonaContext(personaId, generatedId);
  if (!ctx) return NextResponse.json({ error: 'unknown-persona', personaId }, { status: 400 });

  // Layer 1 — objective metrics (code, never the LLM).
  const metrics = computeMetrics(transcript);

  // Layer 2 — the Judge. Any failure here ⇒ 502 and NOTHING is persisted.
  let judge: JudgeResult;
  try {
    judge = await runJudge({ transcript, rubric: ctx.rubric, metrics, hiddenObjective: ctx.hiddenObjective, track: ctx.track });
  } catch (err) {
    console.error('[trainer/debrief] judge failed', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'judge-failed', message }, { status: 502 });
  }
  if (!isValidJudgeResult(judge)) {
    console.error('[trainer/debrief] malformed judge result', judge);
    return NextResponse.json({ error: 'judge-malformed' }, { status: 502 });
  }

  const scoredAt = new Date().toISOString();
  const record: DebriefRecord = {
    id: `${personaId}-${scoredAt}`,
    scenarioId: personaId,
    personaId,
    level,
    startedAt,
    scoredAt,
    transcript,
    metrics,
    scores: judge.scores,
    overall: judge.overall,
    passed: judge.passed,
    feedback: judge.weaknesses[0]?.point ?? judge.strengths[0]?.point ?? '',
    strengths: judge.strengths,
    weaknesses: judge.weaknesses,
    drills: judge.drills,
    memos: judge.memos,
  };

  // Persist only after a valid Judge result: profile (EWMA), memos, then the record.
  const flaggedSkills = Array.from(
    new Set([
      ...judge.weaknesses.map((w) => w.skill).filter((s): s is string => !!s),
      ...judge.memos.map((m) => m.skill),
    ]),
  );
  const scoredSkills = Object.keys(judge.scores);

  try {
    const profile = updateProfile(judge.scores);
    const memos = updateMemos({ newMemos: judge.memos, flaggedSkills, scoredSkills });
    appendResult(record);
    return NextResponse.json({ ok: true, debrief: record, profile, memos });
  } catch (err) {
    console.error('[trainer/debrief] persist failed', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'persist-failed', message }, { status: 500 });
  }
}
