/**
 * The Belief Ledger — the one manual artifact (docs/specs/inner-coach-vision.md §4).
 * Seeded by a voice intake session (INTAKE mode → extractDraftLedger → hand-approved
 * here), then extended over time by appendEvidence. Never auto-populated with
 * invented beliefs — createEmptyLedger() is the only "no ledger yet" state.
 */
import fs from 'fs';
import path from 'path';

const LEDGER_PATH = path.join(process.cwd(), 'data', 'inner-coach', 'ledger.json');

export type Program = 'fear' | 'victimhood' | 'comparison';
export type BeliefStatus = 'active' | 'retiring' | 'retired';

export interface EvidenceAction {
  date: string;
  action: string;
  loggedInSession?: string;
}

export interface Belief {
  id: string;
  limiting: string;
  program: Program;
  origin?: string;
  empowering: string;
  evidenceActions: EvidenceAction[];
  status: BeliefStatus;
  retireThreshold: number;
}

export interface Ledger {
  owner: string;
  identityNorthStar: string;
  beliefs: Belief[];
  redLines: string[];
}

const DEFAULT_RETIRE_THRESHOLD = 10;

const RED_LINES = [
  'No clinical claims — never diagnoses, never uses medical/psychotherapeutic framing, never promises outcomes.',
  'Distress escalation — acute distress stops the exercise and recommends a human professional; never improvised therapy.',
  'No mysticism in the product voice — plain psychological language only: programs, reframes, evidence, identity.',
  'Private by construction — Eitan-only gate; ledger and transcripts never leave the runtime data dir; no analytics, no sharing surface.',
  'Honest mirror — the reflector is warm but never flattering; an empowered ratio that only ever rises is a broken instrument.',
];

export function createEmptyLedger(): Ledger {
  return {
    owner: 'Eitan',
    identityNorthStar: '',
    beliefs: [],
    redLines: RED_LINES,
  };
}

export function loadLedger(): Ledger | null {
  try {
    const raw = fs.readFileSync(LEDGER_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Ledger;
    if (!Array.isArray(parsed.beliefs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLedger(ledger: Ledger): void {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
}

function isValidProgram(x: unknown): x is Program {
  return x === 'fear' || x === 'victimhood' || x === 'comparison';
}

/** Validates a hand-edited/approved draft before it's allowed to become the ledger. */
export function isValidDraftBelief(x: unknown): x is { limiting: string; program: Program; origin?: string; empowering: string } {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  return (
    typeof b.limiting === 'string' && b.limiting.trim().length > 0 &&
    typeof b.empowering === 'string' && b.empowering.trim().length > 0 &&
    isValidProgram(b.program)
  );
}

/** Merges hand-approved draft beliefs into the ledger (intake, or later additions). Never overwrites existing beliefs' evidence/status. */
export function addBeliefs(
  ledger: Ledger,
  drafts: { limiting: string; program: Program; origin?: string; empowering: string }[],
): Ledger {
  const nextId = (n: number) => `b${n}`;
  let counter = ledger.beliefs.length + 1;
  const added: Belief[] = drafts.map((d) => ({
    id: nextId(counter++),
    limiting: d.limiting,
    program: d.program,
    origin: d.origin,
    empowering: d.empowering,
    evidenceActions: [],
    status: 'active',
    retireThreshold: DEFAULT_RETIRE_THRESHOLD,
  }));
  return { ...ledger, beliefs: [...ledger.beliefs, ...added] };
}

/** Appends one evidence action to a belief and retires it if the threshold is met. */
export function appendEvidence(
  ledger: Ledger,
  beliefId: string,
  action: string,
  sessionId?: string,
): Ledger {
  const beliefs = ledger.beliefs.map((b) => {
    if (b.id !== beliefId) return b;
    const evidenceActions = [
      ...b.evidenceActions,
      { date: new Date().toISOString().slice(0, 10), action, loggedInSession: sessionId },
    ];
    const status: BeliefStatus =
      evidenceActions.length >= b.retireThreshold && b.status === 'active' ? 'retired' : b.status;
    return { ...b, evidenceActions, status };
  });
  return { ...ledger, beliefs };
}

/** Relapse: the reflector re-tags a retired belief's program in a session bound to it — un-retires to 'retiring'. */
export function flagRelapse(ledger: Ledger, beliefId: string): Ledger {
  const beliefs = ledger.beliefs.map((b) =>
    b.id === beliefId && b.status === 'retired' ? { ...b, status: 'retiring' as BeliefStatus } : b,
  );
  return { ...ledger, beliefs };
}

/** Picks an active/retiring belief for today's session — recency-aware (least-recently-touched first). */
export function pickActiveBelief(ledger: Ledger): Belief | null {
  const candidates = ledger.beliefs.filter((b) => b.status === 'active' || b.status === 'retiring');
  if (candidates.length === 0) return null;
  const lastTouched = (b: Belief) =>
    b.evidenceActions.length > 0 ? b.evidenceActions[b.evidenceActions.length - 1].date : '0000-00-00';
  return [...candidates].sort((a, b) => lastTouched(a).localeCompare(lastTouched(b)))[0];
}
