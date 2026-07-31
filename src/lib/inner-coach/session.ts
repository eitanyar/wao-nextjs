/**
 * Daily session picker — the coach.ts analog, but deterministic (no LLM call,
 * see the architecture note in prompts.ts): picks a mode + active belief once
 * per day and caches the choice so refreshing mid-day doesn't reroll it.
 */
import fs from 'fs';
import path from 'path';
import type { Belief, Ledger, Program } from './ledger';
import { loadLedger, pickActiveBelief } from './ledger';
import {
  buildCooldownSystemPrompt,
  buildCriticSystemPrompt,
  buildEvidenceSystemPrompt,
  buildIntakeSystemPrompt,
  buildPrimingSystemPrompt,
  COOLDOWN_FIRST_MESSAGE,
  criticFirstMessage,
  EVIDENCE_FIRST_MESSAGE,
  INTAKE_FIRST_MESSAGE,
  PRIMING_FIRST_MESSAGE,
} from './prompts';

const GENERATED_DIR = path.join(process.cwd(), 'data', 'inner-coach', 'generated');

export type Mode = 'intake' | 'priming' | 'evidence' | 'critic' | 'cooldown';

export interface DailySession {
  date: string;
  mode: Mode;
  beliefId?: string;
  createdAt: string;
}

/** Two distinct Gemini voices (D1) — the critic must never sound like the coach. */
const COACH_VOICE = 'Kore';
const CRITIC_VOICE = 'Charon';

export interface SessionConfig {
  mode: Mode;
  personaId: string;
  personaName: string;
  situation: string;
  timeCapMin: number;
  systemPrompt: string;
  firstMessage: string;
  voice: string;
  beliefId?: string;
}

function cacheFilePath(date: string): string {
  return path.join(GENERATED_DIR, `${date}.json`);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** AM → priming, PM → evidence. Critic/cooldown are opt-in overrides, not auto-picked in v1. */
function pickModeForHour(hour: number, hasBelief: boolean): Mode {
  if (!hasBelief) return 'intake';
  return hour < 14 ? 'priming' : 'evidence';
}

function pickDailySession(ledger: Ledger | null): DailySession {
  const belief = ledger ? pickActiveBelief(ledger) : null;
  const mode = pickModeForHour(new Date().getHours(), !!belief);
  return {
    date: todayStr(),
    mode,
    beliefId: belief?.id,
    createdAt: new Date().toISOString(),
  };
}

function saveDailySession(session: DailySession): void {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(cacheFilePath(session.date), `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}

export function peekTodaysDailySession(): DailySession | null {
  try {
    return JSON.parse(fs.readFileSync(cacheFilePath(todayStr()), 'utf8')) as DailySession;
  } catch {
    return null;
  }
}

/** Returns today's cached pick unless `fresh` is set or none exists yet. */
export function getOrPickTodaysSession(opts: { fresh?: boolean; mode?: Mode } = {}): DailySession {
  const ledger = loadLedger();

  if (opts.mode) {
    const belief = ledger ? pickActiveBelief(ledger) : null;
    const session: DailySession = {
      date: todayStr(),
      mode: opts.mode,
      beliefId: opts.mode === 'intake' || opts.mode === 'cooldown' ? undefined : belief?.id,
      createdAt: new Date().toISOString(),
    };
    saveDailySession(session);
    return session;
  }

  if (!opts.fresh) {
    const cached = peekTodaysDailySession();
    if (cached) return cached;
  }
  const session = pickDailySession(ledger);
  saveDailySession(session);
  return session;
}

function findBelief(ledger: Ledger | null, beliefId?: string): Belief | undefined {
  if (!ledger || !beliefId) return undefined;
  return ledger.beliefs.find((b) => b.id === beliefId);
}

const FALLBACK_PROGRAM: Program = 'fear';

/** Builds the mintable Gemini config for a daily session — the coach voice or the critic voice. */
export function buildSessionConfig(daily: DailySession): SessionConfig {
  const ledger = loadLedger();
  const belief = findBelief(ledger, daily.beliefId);

  switch (daily.mode) {
    case 'intake':
      return {
        mode: 'intake',
        personaId: 'inner-coach-intake',
        personaName: 'המאמן',
        situation: 'שיחת היכרות — מכירים אחד את השני, ומנסחים יחד טיוטה של יומן האמונות שלך.',
        timeCapMin: 15,
        systemPrompt: buildIntakeSystemPrompt(),
        firstMessage: INTAKE_FIRST_MESSAGE,
        voice: COACH_VOICE,
      };
    case 'priming': {
      const b = belief ?? placeholderBelief();
      return {
        mode: 'priming',
        personaId: 'inner-coach-priming',
        personaName: 'המאמן',
        situation: 'שיחת בוקר קצרה — משפט מחליף אחד, ופעולה קטנה אחת שמוכיחה אותו היום.',
        timeCapMin: 8,
        systemPrompt: buildPrimingSystemPrompt(b),
        firstMessage: PRIMING_FIRST_MESSAGE,
        voice: COACH_VOICE,
        beliefId: belief?.id,
      };
    }
    case 'evidence': {
      const b = belief ?? placeholderBelief();
      return {
        mode: 'evidence',
        personaId: 'inner-coach-evidence',
        personaName: 'המאמן',
        situation: 'שיחת ערב קצרה — חיפוש עדות אמיתית מהיום שסותרת את האמונה הישנה.',
        timeCapMin: 8,
        systemPrompt: buildEvidenceSystemPrompt(b),
        firstMessage: EVIDENCE_FIRST_MESSAGE,
        voice: COACH_VOICE,
        beliefId: belief?.id,
      };
    }
    case 'critic': {
      const b = belief ?? placeholderBelief();
      return {
        mode: 'critic',
        personaId: 'inner-coach-critic',
        personaName: 'התוכנה הישנה',
        situation: 'תרגול פירוק — אתה מדבר עם ״התוכנה הישנה״ שלך בקול. תרגל לזהות, למסגר מחדש, ולהביא עדות.',
        timeCapMin: 8,
        systemPrompt: buildCriticSystemPrompt(b),
        firstMessage: criticFirstMessage(b.program),
        voice: CRITIC_VOICE,
        beliefId: belief?.id,
      };
    }
    case 'cooldown':
      return {
        mode: 'cooldown',
        personaId: 'inner-coach-cooldown',
        personaName: 'המאמן',
        situation: 'סגירה קצרה — תודה והתמקדות החוצה.',
        timeCapMin: 3,
        systemPrompt: buildCooldownSystemPrompt(),
        firstMessage: COOLDOWN_FIRST_MESSAGE,
        voice: COACH_VOICE,
      };
  }
}

/** Only reached if priming/evidence/critic is picked with no matching belief on the ledger (shouldn't happen post-M1'). */
function placeholderBelief(): Belief {
  return {
    id: 'placeholder',
    limiting: 'אני חייב להוכיח את עצמי כל הזמן, אחרת יגלו שאני לא באמת מספיק טוב.',
    program: FALLBACK_PROGRAM,
    empowering: 'אני כבר מספיק. הפעולות שלי היום מוכיחות את זה, לא מה שמישהו יחשוב.',
    evidenceActions: [],
    status: 'active',
    retireThreshold: 10,
  };
}
