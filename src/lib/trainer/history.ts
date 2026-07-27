import fs from 'fs';
import path from 'path';

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'trainer', 'sessions');
const RESULTS_DIR = path.join(process.cwd(), 'data', 'trainer', 'results');

export interface DebriefSummary {
  id: string;
  scenarioId: string;
  personaId: string;
  level: number;
  startedAt: string;
  scoredAt: string;
  overall: number;
  passed: boolean;
  scores: Record<string, number>;
  feedback: string;
}

export interface UnscoredSession {
  sessionRef: { date: string; index: number };
  personaId: string;
  startedAt: string;
}

function readJsonlDir(dir: string): Record<string, unknown>[] {
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
  } catch {
    return [];
  }
  const out: Record<string, unknown>[] = [];
  for (const file of files) {
    const lines = fs
      .readFileSync(path.join(dir, file), 'utf8')
      .split('\n')
      .filter((l) => l.trim());
    for (const line of lines) {
      try {
        out.push(JSON.parse(line) as Record<string, unknown>);
      } catch {
        // skip a corrupt line rather than fail the whole dashboard
      }
    }
  }
  return out;
}

/** All scored debriefs, newest first — the dashboard's history list. */
export function loadHistory(): DebriefSummary[] {
  return readJsonlDir(RESULTS_DIR)
    .map((r) => ({
      id: String(r.id),
      scenarioId: String(r.scenarioId),
      personaId: String(r.personaId),
      level: Number(r.level) || 0,
      startedAt: String(r.startedAt),
      scoredAt: String(r.scoredAt),
      overall: Number(r.overall) || 0,
      passed: Boolean(r.passed),
      scores: (r.scores as Record<string, number>) ?? {},
      feedback: typeof r.feedback === 'string' ? r.feedback : '',
    }))
    .sort((a, b) => b.scoredAt.localeCompare(a.scoredAt));
}

/**
 * Recorded sessions (data/trainer/sessions/*.jsonl) that have no matching
 * debrief yet, matched by exact startedAt — good enough for a staff-only,
 * single-trainee tool. Newest first.
 */
export function loadUnscoredSessions(): UnscoredSession[] {
  let files: string[];
  try {
    files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.jsonl'));
  } catch {
    return [];
  }
  const scoredStartedAt = new Set(loadHistory().map((r) => r.startedAt));

  const out: UnscoredSession[] = [];
  for (const file of files) {
    const date = file.replace(/\.jsonl$/, '');
    const lines = fs
      .readFileSync(path.join(SESSIONS_DIR, file), 'utf8')
      .split('\n')
      .filter((l) => l.trim());
    lines.forEach((line, index) => {
      try {
        const rec = JSON.parse(line) as Record<string, unknown>;
        const startedAt = typeof rec.startedAt === 'string' ? rec.startedAt : String(rec.endedAt ?? '');
        if (!startedAt || scoredStartedAt.has(startedAt)) return;
        out.push({
          sessionRef: { date, index },
          personaId: typeof rec.personaId === 'string' ? rec.personaId : 'unknown',
          startedAt,
        });
      } catch {
        // skip a corrupt line
      }
    });
  }
  return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
