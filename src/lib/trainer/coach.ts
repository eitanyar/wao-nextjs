import fs from 'fs';
import path from 'path';
import { generateJson } from './llm';
import { COACH_SYSTEM_PROMPT, QA_GATE_PROMPT, buildCoachUserPrompt, buildQaUserPrompt, buildCoachSystemPrompt, type RubricItem } from './prompts';
import type { TrainerPersona } from './persona';
import { getScenario } from './scenarios';

const CHARTER_PATH = path.join(process.cwd(), 'data', 'trainer', 'charter.json');
const CORPUS_PATH = path.join(process.cwd(), 'scripts', 'onboarding-personas.json');
const GENERATED_DIR = path.join(process.cwd(), 'data', 'trainer', 'generated');

export interface Charter {
  goal: string;
  trackWeights: Record<string, number>;
  sessionLengthMin: number;
  personaRealism: string;
  redLines: string[];
  tonePreferences: string[];
  focusHints: string[];
}

export function loadCharter(): Charter {
  const raw = fs.readFileSync(CHARTER_PATH, 'utf8');
  return JSON.parse(raw) as Charter;
}

interface OnboardingPersonaRecord {
  id: number;
  vertical: string;
  turns: { type: string; value: string }[];
}

/** Samples n distinct real vertical records — ground the persona, don't dump the corpus. */
export function loadCorpusSample(n = 3): { vertical: string; turns: string[] }[] {
  let all: OnboardingPersonaRecord[];
  try {
    all = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8')) as OnboardingPersonaRecord[];
  } catch {
    return [];
  }
  const pool = [...all];
  const sample: OnboardingPersonaRecord[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    sample.push(pool.splice(idx, 1)[0]);
  }
  return sample.map((p) => ({
    vertical: p.vertical,
    turns: p.turns.filter((t) => t.type === 'text').map((t) => t.value),
  }));
}

/** Weighted-random track selection from the charter's trackWeights. */
export function pickTrack(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [track, w] of entries) {
    r -= w;
    if (r <= 0) return track;
  }
  return entries[entries.length - 1][0];
}

const LEVEL_MODIFIER: Record<1 | 2 | 3, string> = {
  1: '\n\nLEVEL 1 (cooperative): stay cooperative, answer openly, only mild objections, generous pacing — do not stack difficulty.',
  2: '\n\nLEVEL 2 (realistic resistance): keep one real hidden objection and need some trust before opening up — moderate difficulty.',
  3: '\n\nLEVEL 3 (hostile/chaotic): interrupt, be skeptical of everything, use emotional bait, and do NOT be convinced by weak arguments — actively test the trainee.',
};

export function appendLevelModifier(systemPrompt: string, level: 1 | 2 | 3): string {
  return systemPrompt + LEVEL_MODIFIER[level];
}

export interface TrainerScenario {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  personaId: string;
  situation: string;
  firstMessage: string;
  goal: string;
  timeCapMin: number;
  rubric: RubricItem[];
}

export interface CoachResult {
  generatedId: string; // cache key: `${date}-${persona.id}` — matches debrief route's GENERATED_DIR/{generatedId}.json
  date: string;
  track: string;
  level: 1 | 2 | 3;
  persona: TrainerPersona;
  scenario: TrainerScenario;
  qaFlagged: boolean;
  createdAt: string;
}

interface RawCoachOutput {
  persona: {
    id: string;
    name: string;
    archetype: string;
    systemPrompt: string;
    firstMessage: string;
    situation: string;
    hiddenObjective: string;
  };
  scenario: {
    id: string;
    title: string;
    level: number;
    personaId: string;
    situation: string;
    firstMessage: string;
    goal: string;
    timeCapMin: number;
    rubric: RubricItem[];
  };
}

function isValidCoachOutput(x: unknown): x is RawCoachOutput {
  if (!x || typeof x !== 'object') return false;
  const r = x as RawCoachOutput;
  return (
    !!r.persona && !!r.scenario &&
    typeof r.persona.id === 'string' &&
    typeof r.persona.systemPrompt === 'string' &&
    typeof r.persona.firstMessage === 'string' &&
    typeof r.persona.hiddenObjective === 'string' &&
    typeof r.scenario.goal === 'string' &&
    Array.isArray(r.scenario.rubric) && r.scenario.rubric.length > 0
  );
}

function requireValidCoachOutput(raw: unknown): RawCoachOutput {
  if (!isValidCoachOutput(raw)) throw new Error('coach-malformed-output');
  return raw;
}

async function runQaGate(persona: RawCoachOutput['persona']): Promise<{ pass: boolean; issues: string[] }> {
  const userPrompt = buildQaUserPrompt({ systemPrompt: persona.systemPrompt, firstMessage: persona.firstMessage });
  const result = (await generateJson(QA_GATE_PROMPT, userPrompt)) as { pass?: boolean; issues?: string[] };
  return { pass: result.pass === true, issues: Array.isArray(result.issues) ? result.issues : [] };
}

/** Generates one fresh persona+scenario (no cache lookup) — the Coach's core pipeline. */
export async function generateSession(opts: { track?: string; level?: 1 | 2 | 3 } = {}): Promise<CoachResult> {
  const charter = loadCharter();
  const track = opts.track ?? pickTrack(charter.trackWeights);
  const scenario = getScenario(track);
  const level = opts.level ?? 2;
  const corpusSample = scenario.useCorpus ? loadCorpusSample() : [];
  const userPrompt = buildCoachUserPrompt({ charter, corpusSample, track, level, scenario });

  let raw: RawCoachOutput = requireValidCoachOutput(await generateJson(buildCoachSystemPrompt(scenario), userPrompt));

  let qa = await runQaGate(raw.persona);
  let qaFlagged = false;

  if (!qa.pass) {
    try {
      const retryPrompt = `${userPrompt}\n\nQA NOTES FROM THE PREVIOUS ATTEMPT (fix these in this regeneration):\n${qa.issues.map((i) => `- ${i}`).join('\n')}`;
      const retryRaw = await generateJson(buildCoachSystemPrompt(scenario), retryPrompt);
      if (isValidCoachOutput(retryRaw)) {
        raw = retryRaw;
        qa = await runQaGate(raw.persona);
      }
    } catch {
      // keep the first-attempt raw; flagged below since qa.pass is still false
    }
    if (!qa.pass) qaFlagged = true;
  }

  const persona: TrainerPersona = {
    id: raw.persona.id,
    name: raw.persona.name,
    archetype: raw.persona.archetype,
    systemPrompt: appendLevelModifier(raw.persona.systemPrompt, level),
    firstMessage: raw.persona.firstMessage,
    situation: raw.persona.situation,
    hiddenObjective: raw.persona.hiddenObjective,
    timeCapMin: raw.scenario.timeCapMin || charter.sessionLengthMin || 8,
  };

  const scenarioResult: TrainerScenario = {
    id: raw.scenario.id,
    title: raw.scenario.title,
    level,
    personaId: persona.id,
    situation: raw.scenario.situation || persona.situation,
    firstMessage: raw.scenario.firstMessage || persona.firstMessage,
    goal: raw.scenario.goal,
    timeCapMin: persona.timeCapMin,
    rubric: raw.scenario.rubric,
  };

  const date = new Date().toISOString().slice(0, 10);
  return {
    generatedId: `${date}-${persona.id}`,
    date,
    track,
    level,
    persona,
    scenario: scenarioResult,
    qaFlagged,
    createdAt: new Date().toISOString(),
  };
}

function cacheFilePath(generatedId: string): string {
  return path.join(GENERATED_DIR, `${generatedId}.json`);
}

function saveCache(session: CoachResult): void {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(cacheFilePath(session.generatedId), `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}

/** Reads today's cached session without generating — for read-only display (e.g. the dashboard). */
export function peekTodaysSession(): CoachResult | null {
  const date = new Date().toISOString().slice(0, 10);
  let files: string[];
  try {
    files = fs.readdirSync(GENERATED_DIR).filter((f) => f.startsWith(`${date}-`) && f.endsWith('.json'));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  const newest = files
    .map((f) => ({ f, mtime: fs.statSync(path.join(GENERATED_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].f;
  try {
    return JSON.parse(fs.readFileSync(path.join(GENERATED_DIR, newest), 'utf8')) as CoachResult;
  } catch {
    return null;
  }
}

/** Loads one cached generated session by its exact id (`${date}-${personaId}`). */
export function loadGeneratedSession(generatedId: string): CoachResult | null {
  try {
    return JSON.parse(fs.readFileSync(cacheFilePath(generatedId), 'utf8')) as CoachResult;
  } catch {
    return null;
  }
}

/**
 * POST /api/trainer/next's core: returns today's cached session unless `fresh`
 * is set or none exists yet — one generation call per day on the happy path.
 * If a cached session exists but its track differs from opts.track, skip the cache and generate fresh.
 */
export async function getOrGenerateTodaysSession(
  opts: { fresh?: boolean; track?: string; level?: 1 | 2 | 3 } = {},
): Promise<CoachResult> {
  if (!opts.fresh) {
    const cached = peekTodaysSession();
    if (cached) {
      // If opts.track is set and cached.track differs, skip cache and generate fresh
      if (opts.track !== undefined && cached.track !== opts.track) {
        const session = await generateSession(opts);
        saveCache(session);
        return session;
      }
      return cached;
    }
  }
  const session = await generateSession(opts);
  saveCache(session);
  return session;
}
