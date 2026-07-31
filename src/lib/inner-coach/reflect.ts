/**
 * The Language Mirror (M3' — the judge.ts analog) + post-session structured
 * extraction (intake → draft ledger). No scores, no pass/fail — see
 * docs/specs/inner-coach-workplan.md §0 for why this replaces judge.ts/metrics.ts
 * rather than reusing them.
 */
import { generateJson } from '@/lib/trainer/llm';
import {
  buildExtractLedgerUserPrompt,
  buildReflectorUserPrompt,
  EXTRACT_LEDGER_SYSTEM_PROMPT,
  REFLECTOR_SYSTEM_PROMPT,
  type DraftBelief,
  type ReflectionEvidenceAction,
  type ReflectionTag,
} from './prompts';
import type { Program } from './ledger';

type Turn = { role: string; text: string };

interface RawExtractLedgerOutput {
  draftBeliefs?: unknown;
}

function isValidDraftBeliefShape(x: unknown): x is DraftBelief {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  return (
    typeof b.limiting === 'string' && b.limiting.trim().length > 0 &&
    typeof b.empowering === 'string' && b.empowering.trim().length > 0 &&
    (b.program === 'fear' || b.program === 'victimhood' || b.program === 'comparison')
  );
}

/** Intake transcript → draft beliefs, in Eitan's own words. Never auto-written to the ledger. */
export async function extractDraftLedger(transcript: Turn[]): Promise<DraftBelief[]> {
  const raw = (await generateJson(
    EXTRACT_LEDGER_SYSTEM_PROMPT,
    buildExtractLedgerUserPrompt(transcript),
  )) as RawExtractLedgerOutput;
  const list = Array.isArray(raw.draftBeliefs) ? raw.draftBeliefs : [];
  return list.filter(isValidDraftBeliefShape);
}

export interface Reflection {
  tags: ReflectionTag[];
  evidenceActions: ReflectionEvidenceAction[];
  ratio: ReflectionRatio;
}

export interface ReflectionRatio {
  empoweredRatio: number | null; // null when there's nothing to compute a ratio from
  counts: Record<ReflectionTag['program'], number>;
}

interface RawReflectorOutput {
  tags?: unknown;
  evidenceActions?: unknown;
}

const TAG_PROGRAMS = new Set(['fear', 'victimhood', 'comparison', 'bypass-lie', 'empowered']);

function isValidTag(x: unknown): x is ReflectionTag {
  if (!x || typeof x !== 'object') return false;
  const t = x as Record<string, unknown>;
  return typeof t.quoteHe === 'string' && t.quoteHe.trim().length > 0 && TAG_PROGRAMS.has(t.program as string);
}

function isValidEvidenceAction(x: unknown): x is ReflectionEvidenceAction {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return typeof e.action === 'string' && e.action.trim().length > 0 && typeof e.quoteHe === 'string';
}

/** Layer-1 CODE metric (not the LLM) — the ratio the dashboard charts over weeks. */
export function computeReflectionRatio(tags: ReflectionTag[]): ReflectionRatio {
  const counts: ReflectionRatio['counts'] = { fear: 0, victimhood: 0, comparison: 0, 'bypass-lie': 0, empowered: 0 };
  for (const t of tags) counts[t.program]++;
  const total = counts.fear + counts.victimhood + counts.comparison + counts['bypass-lie'] + counts.empowered;
  return { empoweredRatio: total > 0 ? Number((counts.empowered / total).toFixed(3)) : null, counts };
}

/** Reads a session transcript and returns the tagged mirror + any evidence actions found. */
export async function reflectTranscript(input: {
  transcript: Turn[];
  activeBelief?: { limiting: string; empowering: string; program: Program };
}): Promise<Reflection> {
  const raw = (await generateJson(
    REFLECTOR_SYSTEM_PROMPT,
    buildReflectorUserPrompt(input),
  )) as RawReflectorOutput;
  const tags = (Array.isArray(raw.tags) ? raw.tags : []).filter(isValidTag);
  const evidenceActions = (Array.isArray(raw.evidenceActions) ? raw.evidenceActions : []).filter(isValidEvidenceAction);
  return { tags, evidenceActions, ratio: computeReflectionRatio(tags) };
}
