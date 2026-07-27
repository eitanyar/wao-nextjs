/**
 * Trainer skill profile + memos (M3, spec §3b).
 *
 * Two persisted artifacts, both private (gitignored):
 *   - data/trainer/profile.json  — per-skill mastery 0–100, EWMA-updated.
 *   - data/trainer/memos.jsonl   — recurring-pattern memos with live/resolved status.
 *
 * Design: the numeric logic is PURE and unit-tested (computeMastery,
 * applyProfileUpdate, applyMemoUpdate). The fs read/write wrappers are thin and
 * do no logic, so tests never touch the real data files. Server-only.
 */

import fs from 'fs';
import path from 'path';

const PROFILE_PATH = path.join(process.cwd(), 'data', 'trainer', 'profile.json');
const MEMOS_PATH = path.join(process.cwd(), 'data', 'trainer', 'memos.jsonl');

/* ============================== TYPES ============================== */

export interface ProfileData {
  updatedAt: string;
  sessions: number;                    // count of debriefs applied
  mastery: Record<string, number>;     // skill key -> mastery 0–100
}

/** A recurring-pattern memo emitted by the Judge. */
export interface JudgeMemo {
  text: string;      // English, one-line pattern
  skill: string;     // skill key it maps to
  quoteHe: string;   // Hebrew evidence from the transcript
}

export interface Memo extends JudgeMemo {
  id: string;
  status: 'live' | 'resolved';
  cleanStreak: number;   // consecutive RELEVANT sessions the skill was NOT flagged
  createdAt: string;
  updatedAt: string;
}

/** How many consecutive clean sessions resolve a live memo (spec §3b). */
export const RESOLVE_AFTER = 3;

/* ============================== PURE LOGIC ============================== */

/**
 * EWMA mastery on a 0–100 scale from a 0–10 rubric score (spec §3b):
 *   new = 0.7·old + 0.3·(10·score)
 * A previously-unseen skill seeds at the first observed 10·score.
 */
export function computeMastery(old: number | undefined, score: number): number {
  const scaled = 10 * score;
  const next = old === undefined ? scaled : 0.7 * old + 0.3 * scaled;
  return Number(next.toFixed(1));
}

/** Apply one debrief's scores to a profile (pure — returns a new ProfileData). */
export function applyProfileUpdate(
  profile: ProfileData,
  scores: Record<string, number>,
  now: string = new Date().toISOString(),
): ProfileData {
  const mastery = { ...profile.mastery };
  for (const [skill, score] of Object.entries(scores)) {
    mastery[skill] = computeMastery(mastery[skill], score);
  }
  return { updatedAt: now, sessions: profile.sessions + 1, mastery };
}

export const emptyProfile = (): ProfileData => ({
  updatedAt: new Date(0).toISOString(),
  sessions: 0,
  mastery: {},
});

/**
 * Apply one debrief's memo signal to the memo list (pure).
 *
 * - `newMemos`      — memos the Judge emitted this session.
 * - `flaggedSkills` — skills the Judge flagged as weak this session (from
 *                     weaknesses + memos); a flag resets a live memo's streak.
 * - `scoredSkills`  — skills scored this session (relevance gate): a live memo's
 *                     clean streak only advances on a session where its skill was
 *                     actually scored.
 *
 * A live memo resolves once its skill goes RESOLVE_AFTER relevant sessions
 * without being flagged. A resolved memo stays resolved; if its pattern
 * resurfaces (a new memo for that skill), a fresh live memo is opened.
 */
export function applyMemoUpdate(
  existing: Memo[],
  input: { newMemos: JudgeMemo[]; flaggedSkills: string[]; scoredSkills: string[] },
  now: string = new Date().toISOString(),
): Memo[] {
  const newBySkill = new Map(input.newMemos.map((m) => [m.skill, m]));
  const flagged = new Set(input.flaggedSkills);
  const scored = new Set(input.scoredSkills);

  const result: Memo[] = existing.map((memo) => {
    if (memo.status === 'resolved') return memo;

    const refreshed = newBySkill.get(memo.skill);
    if (refreshed) {
      // Re-emitted this session: refresh evidence, reset streak, stays live.
      return { ...memo, text: refreshed.text, quoteHe: refreshed.quoteHe, cleanStreak: 0, updatedAt: now };
    }
    if (flagged.has(memo.skill)) {
      // Flagged as weak (but no memo emitted): reset streak, stays live.
      return { ...memo, cleanStreak: 0, updatedAt: now };
    }
    if (scored.has(memo.skill)) {
      // Relevant session, skill was clean: advance streak; resolve at threshold.
      const cleanStreak = memo.cleanStreak + 1;
      const status: Memo['status'] = cleanStreak >= RESOLVE_AFTER ? 'resolved' : 'live';
      return { ...memo, cleanStreak, status, updatedAt: now };
    }
    // Skill not scored this session — not a relevant session, leave untouched.
    return memo;
  });

  // Open a fresh live memo for any new-memo skill without a current live memo.
  const liveSkills = new Set(result.filter((m) => m.status === 'live').map((m) => m.skill));
  input.newMemos.forEach((nm, i) => {
    if (liveSkills.has(nm.skill)) return;
    result.push({
      id: `${nm.skill}-${now}-${i}`,
      skill: nm.skill,
      text: nm.text,
      quoteHe: nm.quoteHe,
      status: 'live',
      cleanStreak: 0,
      createdAt: now,
      updatedAt: now,
    });
    liveSkills.add(nm.skill);
  });

  return result;
}

/* ============================== I/O WRAPPERS ============================== */

export function loadProfile(): ProfileData {
  try {
    return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8')) as ProfileData;
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile: ProfileData): void {
  fs.mkdirSync(path.dirname(PROFILE_PATH), { recursive: true });
  fs.writeFileSync(PROFILE_PATH, `${JSON.stringify(profile, null, 2)}\n`, 'utf8');
}

export function loadMemos(): Memo[] {
  try {
    return fs
      .readFileSync(MEMOS_PATH, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as Memo);
  } catch {
    return [];
  }
}

export function saveMemos(memos: Memo[]): void {
  fs.mkdirSync(path.dirname(MEMOS_PATH), { recursive: true });
  fs.writeFileSync(MEMOS_PATH, memos.map((m) => JSON.stringify(m)).join('\n') + (memos.length ? '\n' : ''), 'utf8');
}

/* ============================== ORCHESTRATORS ============================== */

/** Read → EWMA-apply this debrief's scores → persist → return updated profile. */
export function updateProfile(scores: Record<string, number>): ProfileData {
  const updated = applyProfileUpdate(loadProfile(), scores);
  saveProfile(updated);
  return updated;
}

/** Read → apply this debrief's memo signal → persist → return updated memos. */
export function updateMemos(input: {
  newMemos: JudgeMemo[];
  flaggedSkills: string[];
  scoredSkills: string[];
}): Memo[] {
  const updated = applyMemoUpdate(loadMemos(), input);
  saveMemos(updated);
  return updated;
}
