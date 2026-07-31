import fs from 'fs';
import path from 'path';

const REFLECTIONS_DIR = path.join(process.cwd(), 'data', 'inner-coach', 'reflections');

export interface ReflectionRecord {
  scoredAt: string;
  mode?: string;
  beliefId?: string;
  tags: { program: string; quoteHe: string; note?: string }[];
  evidenceActions: { action: string; quoteHe: string }[];
  ratio: { empoweredRatio: number | null; counts: Record<string, number> };
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
        // skip a corrupt line rather than fail the dashboard
      }
    }
  }
  return out;
}

/** All persisted reflections, oldest first — the ratio-over-time chart's source. */
export function loadReflections(): ReflectionRecord[] {
  return readJsonlDir(REFLECTIONS_DIR)
    .map((r) => ({
      scoredAt: String(r.scoredAt),
      mode: typeof r.mode === 'string' ? r.mode : undefined,
      beliefId: typeof r.beliefId === 'string' ? r.beliefId : undefined,
      tags: Array.isArray(r.tags) ? (r.tags as ReflectionRecord['tags']) : [],
      evidenceActions: Array.isArray(r.evidenceActions) ? (r.evidenceActions as ReflectionRecord['evidenceActions']) : [],
      ratio: (r.ratio as ReflectionRecord['ratio']) ?? { empoweredRatio: null, counts: {} },
    }))
    .sort((a, b) => a.scoredAt.localeCompare(b.scoredAt));
}

/** Per-day average empoweredRatio (skipping sessions with nothing to compute a ratio from). */
export function ratioOverTime(reflections: ReflectionRecord[]): { date: string; ratio: number }[] {
  const byDay = new Map<string, number[]>();
  for (const r of reflections) {
    if (r.ratio.empoweredRatio === null) continue;
    const day = r.scoredAt.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(r.ratio.empoweredRatio);
    byDay.set(day, list);
  }
  return Array.from(byDay.entries())
    .map(([date, ratios]) => ({ date, ratio: ratios.reduce((a, b) => a + b, 0) / ratios.length }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Aggregate program counts across all reflections — the per-program breakdown. */
export function programBreakdown(reflections: ReflectionRecord[]): Record<string, number> {
  const totals: Record<string, number> = { fear: 0, victimhood: 0, comparison: 0, 'bypass-lie': 0, empowered: 0 };
  for (const r of reflections) {
    for (const [program, count] of Object.entries(r.ratio.counts)) {
      totals[program] = (totals[program] ?? 0) + count;
    }
  }
  return totals;
}
