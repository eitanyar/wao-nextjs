/**
 * Site Bot step 2b: interview v1, the five fixed questions after the holding screen
 * (docs/missions/site-bot-step2-interview-preview-2026-11-25.md, "Engineer runs -> 2b").
 *
 * One question per screen, in this order: a recent job, a job he turned down, the question every caller asks (free text,
 * each with its hint), how he talks about price (multi-select chips, no free text), where he works most (free text).
 * Every question can be skipped. A free-text answer that holds only generic claims gets the vague-answer probe ONCE
 * (interviewProbe.ts); whatever comes after the probe is accepted. On the second pass (one return from an empty facts
 * screen) no probe fires at all: whatever comes is accepted.
 *
 * The state lives on the interview session (interviewSession.ts, interview_json): the server applies every answer, so a
 * reload resumes on the same question and the probe never fires twice. This module is pure (no store, no clock) and
 * browser-safe (the start page imports the keys and the copy-key maps).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { SiteBotStep2bCopyKey } from './step2bCopy.generated';

export const INTERVIEW_QUESTION_KEYS = ['recentJob', 'turnedDown', 'callerQuestion', 'priceStyle', 'areaPattern'] as const;
export type InterviewQuestionKey = (typeof INTERVIEW_QUESTION_KEYS)[number];
export type InterviewTextQuestionKey = Exclude<InterviewQuestionKey, 'priceStyle'>;

export const PRICE_CHIP_IDS = ['phoneEstimate', 'afterVisit', 'fixedList', 'freeVisit', 'paidVisit'] as const;
export type PriceChipId = (typeof PRICE_CHIP_IDS)[number];

/** Longest kept answer (and probe follow-up), in characters. Longer submissions are refused, never cut silently. */
export const MAX_INTERVIEW_ANSWER_CHARS = 1500;

export const QUESTION_COPY_KEY: Readonly<Record<InterviewQuestionKey, SiteBotStep2bCopyKey>> = {
  recentJob: 'Q_RECENT_JOB',
  turnedDown: 'Q_TURNED_DOWN',
  callerQuestion: 'Q_CALLER_QUESTION',
  priceStyle: 'Q_PRICE_STYLE',
  areaPattern: 'Q_AREA_PATTERN',
};

export const QUESTION_HINT_COPY_KEY: Readonly<Record<InterviewQuestionKey, SiteBotStep2bCopyKey>> = {
  recentJob: 'Q_RECENT_JOB_HINT',
  turnedDown: 'Q_TURNED_DOWN_HINT',
  callerQuestion: 'Q_CALLER_QUESTION_HINT',
  priceStyle: 'Q_PRICE_STYLE_HINT',
  areaPattern: 'Q_AREA_PATTERN_HINT',
};

export const PRICE_CHIP_COPY_KEY: Readonly<Record<PriceChipId, SiteBotStep2bCopyKey>> = {
  phoneEstimate: 'PRICE_CHIP_PHONE_ESTIMATE',
  afterVisit: 'PRICE_CHIP_AFTER_VISIT',
  fixedList: 'PRICE_CHIP_FIXED_LIST',
  freeVisit: 'PRICE_CHIP_FREE_VISIT',
  paidVisit: 'PRICE_CHIP_PAID_VISIT',
};

export function isTextQuestion(key: InterviewQuestionKey): key is InterviewTextQuestionKey {
  return key !== 'priceStyle';
}

export function isPriceChipId(value: unknown): value is PriceChipId {
  return typeof value === 'string' && (PRICE_CHIP_IDS as readonly string[]).includes(value);
}

/** One answer: the owner's text (plus his reply to the probe, kept apart so every quote check sees his own words). */
export type InterviewAnswer =
  | { kind: 'text'; text: string; followUp?: string }
  | { kind: 'chips'; chips: PriceChipId[] }
  | { kind: 'skipped'; text?: string };

export interface InterviewState {
  v: 1;
  /** 1 = first pass; 2 = after the one return from an empty facts screen (no probe, whatever comes is accepted). */
  pass: 1 | 2;
  /** The current question (0..4); 5 = all answered (the session then records interview_done_at). */
  index: number;
  answers: Partial<Record<InterviewQuestionKey, InterviewAnswer>>;
  /** Questions the probe already fired on (any pass): never a second time. */
  probed: InterviewTextQuestionKey[];
  /** The question whose probe is showing: its first answer is stored, the follow-up is awaited. */
  probing: InterviewTextQuestionKey | null;
}

export function initialInterviewState(): InterviewState {
  return { v: 1, pass: 1, index: 0, answers: {}, probed: [], probing: null };
}

/** The state of the second pass: back to question 1, previous answers kept (the screen pre-fills them). */
export function secondPassState(previous: InterviewState): InterviewState {
  return { ...previous, pass: 2, index: 0, probing: null };
}

function boundedText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_INTERVIEW_ANSWER_CHARS;
}

function cleanAnswer(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim();
}

function validAnswer(value: unknown): value is InterviewAnswer {
  if (!value || typeof value !== 'object') return false;
  const answer = value as Record<string, unknown>;
  if (answer.kind === 'text') return boundedText(answer.text) && (answer.followUp === undefined || boundedText(answer.followUp));
  if (answer.kind === 'chips') return Array.isArray(answer.chips) && answer.chips.length <= PRICE_CHIP_IDS.length && answer.chips.every(isPriceChipId);
  if (answer.kind === 'skipped') return answer.text === undefined || boundedText(answer.text);
  return false;
}

/** A stored state, checked (anything malformed is null: the caller treats it as "not started"). */
export function parseInterviewState(value: unknown): InterviewState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const state = value as Record<string, unknown>;
  if (state.v !== 1 || (state.pass !== 1 && state.pass !== 2)) return null;
  if (typeof state.index !== 'number' || !Number.isInteger(state.index) || state.index < 0 || state.index > INTERVIEW_QUESTION_KEYS.length) return null;
  if (!state.answers || typeof state.answers !== 'object' || Array.isArray(state.answers)) return null;
  const answers = state.answers as Record<string, unknown>;
  if (!Object.keys(answers).every(key => (INTERVIEW_QUESTION_KEYS as readonly string[]).includes(key) && validAnswer(answers[key]))) return null;
  if (!Array.isArray(state.probed) || !state.probed.every(key => typeof key === 'string' && (INTERVIEW_QUESTION_KEYS as readonly string[]).includes(key) && key !== 'priceStyle')) return null;
  if (state.probing !== null && !(typeof state.probing === 'string' && (state.probed as string[]).includes(state.probing))) return null;
  return value as InterviewState;
}

export function currentQuestion(state: InterviewState): InterviewQuestionKey | null {
  return INTERVIEW_QUESTION_KEYS[state.index] ?? null;
}

export function interviewComplete(state: InterviewState): boolean {
  return state.index >= INTERVIEW_QUESTION_KEYS.length;
}

/** What the browser submits for the current question. */
export type AnswerSubmission =
  | { key: InterviewQuestionKey; skip: true }
  | { key: InterviewTextQuestionKey; text: string }
  | { key: 'priceStyle'; chips: PriceChipId[] };

/** A request body -> a submission, or null (unknown key, wrong shape, oversized text, unknown chip). */
export function parseAnswerSubmission(body: Record<string, unknown>): AnswerSubmission | null {
  const key = body.key;
  if (typeof key !== 'string' || !(INTERVIEW_QUESTION_KEYS as readonly string[]).includes(key)) return null;
  const question = key as InterviewQuestionKey;
  if (body.skip === true) return { key: question, skip: true };
  if (question === 'priceStyle') {
    if (!Array.isArray(body.chips) || body.chips.length > PRICE_CHIP_IDS.length || !body.chips.every(isPriceChipId)) return null;
    const chips = PRICE_CHIP_IDS.filter(id => (body.chips as unknown[]).includes(id));
    return { key: 'priceStyle', chips };
  }
  if (!boundedText(body.text)) return null;
  const text = cleanAnswer(body.text);
  if (!text) return null;
  return { key: question, text };
}

export type AnswerResult =
  | { kind: 'advanced'; state: InterviewState }
  | { kind: 'probe'; state: InterviewState }
  | { kind: 'out_of_order' };

/**
 * Applies one submission to the state. The submission must answer the CURRENT question (a replayed or skipped-ahead
 * answer is out of order). `isGeneric` is the probe detector, asked only on the first pass for a question the probe has
 * not fired on yet; when it says generic, the answer is stored and the probe shows (the index stays). The next
 * submission for that question is the follow-up: stored next to the first answer, then the interview advances.
 */
export function applyInterviewAnswer(
  state: InterviewState,
  submission: AnswerSubmission,
  isGeneric: (text: string) => boolean,
): AnswerResult {
  const key = currentQuestion(state);
  if (!key || submission.key !== key) return { kind: 'out_of_order' };
  const answers = { ...state.answers };
  const advance = (): AnswerResult => ({ kind: 'advanced', state: { ...state, answers, index: state.index + 1, probing: null } });

  if (state.probing === key && isTextQuestion(key)) {
    const first = answers[key];
    const firstText = first && first.kind === 'text' ? first.text : '';
    if ('skip' in submission) answers[key] = { kind: 'text', text: firstText };
    else if ('text' in submission) answers[key] = { kind: 'text', text: firstText, followUp: submission.text };
    else return { kind: 'out_of_order' };
    return advance();
  }

  if ('skip' in submission) {
    // A skip keeps the earlier pass's text out of the answer set but remembers it for the pre-fill.
    const previous = answers[key];
    const previousText = previous && previous.kind === 'text' ? previous.text : previous && previous.kind === 'skipped' ? previous.text : undefined;
    answers[key] = previousText ? { kind: 'skipped', text: previousText } : { kind: 'skipped' };
    return advance();
  }
  if ('chips' in submission) {
    answers[key] = { kind: 'chips', chips: submission.chips };
    return advance();
  }
  if (!isTextQuestion(key)) return { kind: 'out_of_order' };
  answers[key] = { kind: 'text', text: submission.text };
  if (state.pass === 1 && !state.probed.includes(key) && isGeneric(submission.text)) {
    return { kind: 'probe', state: { ...state, answers, probed: [...state.probed, key], probing: key } };
  }
  return advance();
}

/** The owner's own words per text question (first answer and probe follow-up apart), for extraction and quote checks. */
export function answerTexts(state: InterviewState): Array<{ key: InterviewTextQuestionKey; part: 'answer' | 'followUp'; text: string }> {
  const out: Array<{ key: InterviewTextQuestionKey; part: 'answer' | 'followUp'; text: string }> = [];
  for (const key of INTERVIEW_QUESTION_KEYS) {
    if (!isTextQuestion(key)) continue;
    const answer = state.answers[key];
    if (!answer || answer.kind !== 'text') continue;
    if (answer.text.trim()) out.push({ key, part: 'answer', text: answer.text });
    if (answer.followUp?.trim()) out.push({ key, part: 'followUp', text: answer.followUp });
  }
  return out;
}

/** The ticked price chips (in chip order), [] when the question was skipped or not reached. */
export function tickedPriceChips(state: InterviewState): PriceChipId[] {
  const answer = state.answers.priceStyle;
  return answer && answer.kind === 'chips' ? PRICE_CHIP_IDS.filter(id => answer.chips.includes(id)) : [];
}

/** What the browser sees of the interview (its own answers only: they are the owner's, behind his session cookie). */
export interface InterviewQuestionsView {
  pass: 1 | 2;
  index: number;
  key: InterviewQuestionKey | null;
  probing: boolean;
  /** Pre-fill per question: the stored text (first answer) or the ticked chips. */
  drafts: Partial<Record<InterviewTextQuestionKey, string>>;
  chips: PriceChipId[];
}

export function interviewQuestionsView(state: InterviewState): InterviewQuestionsView {
  const drafts: Partial<Record<InterviewTextQuestionKey, string>> = {};
  for (const key of INTERVIEW_QUESTION_KEYS) {
    if (!isTextQuestion(key)) continue;
    const answer = state.answers[key];
    const text = answer?.kind === 'text' ? answer.text : answer?.kind === 'skipped' ? answer.text : undefined;
    if (text) drafts[key] = text;
  }
  return { pass: state.pass, index: state.index, key: currentQuestion(state), probing: state.probing !== null, drafts, chips: tickedPriceChips(state) };
}
