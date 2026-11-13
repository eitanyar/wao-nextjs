/**
 * WhatsApp nurture scheduler rules (post-launch week 1 spec, task B1). Pure: no I/O; `now` is
 * passed in. Sending itself is task B5 and ships switched off.
 *
 * - Five messages at day offsets 0, 4, 9, 15, 22 from consent.
 * - Send windows: Sunday–Thursday, 07:00–08:00 or 19:30–21:00 Israel time (end exclusive).
 *   Never Friday, Saturday or an Israeli blackout date (`il-calendar`, task A2).
 * - Message 1 (day 0) goes at the first window START after consent, never instantly.
 * - Later messages: due = consent time + offset days; a due time outside a window moves to the
 *   next window; inside a window it stays.
 * - Outside the generated calendar's coverage nothing is scheduled (`null`, fail closed).
 */
import { addDaysIso, isIsraelBlackoutDate, isIsraelCalendarCovered, israelDate, israelWallTimeToInstant, weekdayOfIso } from '../calendar/il-calendar';

export const NURTURE_MESSAGE_COUNT = 5;
export const NURTURE_DAY_OFFSETS: ReadonlyArray<number> = [0, 4, 9, 15, 22];
/** Wall-clock windows in Asia/Jerusalem: [start, end) as [hour, minute]. */
export const NURTURE_WINDOWS: ReadonlyArray<{ start: [number, number]; end: [number, number] }> = [
  { start: [7, 0], end: [8, 0] },
  { start: [19, 30], end: [21, 0] },
];
/** Sunday (0) … Thursday (4). */
export const NURTURE_SEND_WEEKDAYS: ReadonlyArray<number> = [0, 1, 2, 3, 4];
/** How far ahead to look for a window before giving up (covers the longest holiday run). */
export const NURTURE_SEARCH_DAYS = 45;

const DAY_MS = 86_400_000;

export type MessageNumber = 1 | 2 | 3 | 4 | 5;
export type NurtureContactState = 'active' | 'paused' | 'stopped' | 'converted' | 'completed';
export type NurtureSendStatus = 'pending' | 'claimed' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled' | 'skipped';

function isMessageNumber(n: number): n is MessageNumber {
  return Number.isInteger(n) && n >= 1 && n <= NURTURE_MESSAGE_COUNT;
}

/** True when an Israel calendar date may carry nurture sends (and is inside calendar coverage). */
export function isNurtureSendDate(isoDate: string): boolean {
  return isIsraelCalendarCovered(isoDate) && NURTURE_SEND_WEEKDAYS.includes(weekdayOfIso(isoDate)) && !isIsraelBlackoutDate(isoDate);
}

/**
 * The first instant at or after `earliest` that is inside a send window on an allowed date, or
 * `null` when none exists within `NURTURE_SEARCH_DAYS` or the calendar coverage runs out.
 * With `startsOnly`, only window starts strictly after `earliest` qualify.
 */
export function nextWindowAtOrAfter(earliest: Date, options: { startsOnly?: boolean } = {}): Date | null {
  const t = earliest.getTime();
  let date = israelDate(earliest);
  for (let i = 0; i <= NURTURE_SEARCH_DAYS; i++, date = addDaysIso(date, 1)) {
    if (!isIsraelCalendarCovered(date)) return null;
    if (!isNurtureSendDate(date)) continue;
    for (const w of NURTURE_WINDOWS) {
      const start = israelWallTimeToInstant(date, w.start[0], w.start[1]).getTime();
      const end = israelWallTimeToInstant(date, w.end[0], w.end[1]).getTime();
      if (options.startsOnly) {
        if (start > t) return new Date(start);
      } else if (t < end) {
        return new Date(Math.max(start, t));
      }
    }
  }
  return null;
}

/** True when `at` is inside a send window on an allowed date (B5 re-checks this before sending). */
export function isInsideSendWindow(at: Date): boolean {
  const next = nextWindowAtOrAfter(at);
  return next !== null && next.getTime() === at.getTime();
}

/**
 * When message `n` is due. `now` only moves the answer later (a recomputation after a delay never
 * schedules into the past).
 */
export function nextSendAt(consentAt: Date, n: number, now: Date): Date | null {
  if (!isMessageNumber(n)) throw new Error(`nextSendAt: message number must be 1-${NURTURE_MESSAGE_COUNT}`);
  if (Number.isNaN(consentAt.getTime()) || Number.isNaN(now.getTime())) throw new Error('nextSendAt: invalid date');
  let earliest: Date | null;
  if (n === 1) {
    earliest = nextWindowAtOrAfter(consentAt, { startsOnly: true });
    if (!earliest) return null;
  } else {
    earliest = new Date(consentAt.getTime() + NURTURE_DAY_OFFSETS[n - 1] * DAY_MS);
  }
  return nextWindowAtOrAfter(new Date(Math.max(earliest.getTime(), now.getTime())));
}

/** All five due times at consent (`now` = consent time). */
export function scheduleAll(consentAt: Date): Array<{ n: MessageNumber; dueAt: Date | null }> {
  return NURTURE_DAY_OFFSETS.map((_, i) => ({ n: (i + 1) as MessageNumber, dueAt: nextSendAt(consentAt, i + 1, consentAt) }));
}

// ---- stop rules -------------------------------------------------------------------------------

export interface SendDecisionInput {
  contactState: NurtureContactState;
  suppressed: boolean;
  n: number;
  /** This contact's other sends (number + status). */
  sends: ReadonlyArray<{ n: number; status: NurtureSendStatus | string }>;
  /** The contact has replied at least once (any non-opt-out inbound message). */
  replied: boolean;
}

export type SendDecision =
  | { action: 'send' }
  | { action: 'skip'; reason: 'suppressed' | `state_${NurtureContactState}` }
  | { action: 'complete'; reason: 'no_engagement' };

/**
 * Whether message `n` may go out now (state-wise; the window check is separate).
 * - Suppressed, `stopped`, `converted`, `completed` or `paused` → nothing more.
 * - Before message 4: if none of messages 1–3 was read and the contact never replied → mark
 *   `completed` (founder decision 9 recommendation: engagement = read receipt or any reply).
 */
export function decideSend(input: SendDecisionInput): SendDecision {
  if (input.suppressed) return { action: 'skip', reason: 'suppressed' };
  if (input.contactState !== 'active') return { action: 'skip', reason: `state_${input.contactState}` };
  if (input.n >= 4) {
    const engaged = input.replied || input.sends.some((s) => s.n >= 1 && s.n <= 3 && s.status === 'read');
    if (!engaged) return { action: 'complete', reason: 'no_engagement' };
  }
  return { action: 'send' };
}

/**
 * Contact state after an inbound message. An opt-out stops; any other reply pauses (and staff
 * get a notice). Terminal states never change.
 */
export function stateAfterInbound(state: NurtureContactState, isOptOut: boolean): { state: NurtureContactState; notifyStaff: boolean } {
  if (isOptOut) return { state: 'stopped', notifyStaff: false };
  if (state === 'stopped' || state === 'converted' || state === 'completed') return { state, notifyStaff: false };
  return { state: 'paused', notifyStaff: true };
}
