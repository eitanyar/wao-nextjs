// Site Bot step 2b (the /site-bot/start paid-flow client): one in-flight request per screen, whatever the click rate.
//
// A `submitting` React state read inside a click handler is the value of the render that created the handler, so two
// clicks in the same tick both see `false` and both POST. The second one then meets the server already past the step
// (409 out_of_order) and used to overwrite the first one's success with the error screen. Two rules close that:
//   1. runExclusive: a ref flag, set synchronously before the request starts, drops any call made while one is in flight.
//   2. reachedPhase / stepReachedPhase: a 409 out_of_order whose phase is the very phase this action moves to means an
//      earlier request (a double click, a second tab) already did it -> success, not an error.
// Pure (no React import) so the double-fire behaviour is unit tested in interviewSubmitGuard.test.ts.

export interface InFlightFlag {
  current: boolean;
}

/**
 * Runs `task` unless another task guarded by `flag` is still running; returns false when the call was dropped.
 * `flag.current` is set before `task` is even called, so a second call in the same tick is dropped. `setBusy` mirrors the
 * flag into render state (for the disabled look). The flag clears when the task settles, whether it resolved or threw;
 * a rejection is swallowed here, so the task must handle its own errors.
 */
export function runExclusive(flag: InFlightFlag, setBusy: (busy: boolean) => void, task: () => Promise<unknown>): boolean {
  if (flag.current) return false;
  flag.current = true;
  setBusy(true);
  let pending: Promise<unknown>;
  try {
    pending = Promise.resolve(task());
  } catch (error) {
    pending = Promise.reject(error);
  }
  pending
    .catch(() => undefined)
    .finally(() => {
      flag.current = false;
      setBusy(false);
    });
  return true;
}

/** A JSON route reply (interview-facts, interview-gates). */
export interface InterviewJsonReply {
  ok: boolean;
  status: number;
  json: Record<string, unknown>;
}

/** The reply put the session at `target`: a 200 naming it, or a 409 out_of_order whose phase is already `target`. */
export function reachedPhase(reply: InterviewJsonReply, target: string): boolean {
  if (reply.json.phase !== target) return false;
  return reply.ok || (reply.status === 409 && reply.json.error === 'out_of_order');
}

/** An interview-step reply (its 409 out_of_order carries the session view the server kept). */
export interface InterviewStepReply<View extends { phase: string }> {
  ok: boolean;
  error?: string;
  session: View | null;
}

/** The step reply's session view when it is usable: a 200, or an out_of_order whose session is already at `target`. */
export function stepReachedPhase<View extends { phase: string }>(reply: InterviewStepReply<View>, target: string): View | null {
  if (!reply.session) return null;
  if (reply.ok) return reply.session;
  return reply.error === 'out_of_order' && reply.session.phase === target ? reply.session : null;
}

export type InterviewJsonPost = (url: string, body: Record<string, unknown>) => Promise<InterviewJsonReply>;

export const INTERVIEW_FACTS_URL = '/api/site-bot/interview-facts';

/** FACTS_DONE: resolves once the session is at facts_confirmed (by this request or an earlier one), else throws. */
export async function requestFactsDone(post: InterviewJsonPost): Promise<void> {
  const reply = await post(INTERVIEW_FACTS_URL, { action: 'done' });
  if (!reachedPhase(reply, 'facts_confirmed')) throw new Error('done');
}

/** FACTS_EMPTY's return: resolves once the session is back at the questions, else throws. */
export async function requestFactsReturn(post: InterviewJsonPost): Promise<void> {
  const reply = await post(INTERVIEW_FACTS_URL, { action: 'return' });
  if (!reachedPhase(reply, 'questions')) throw new Error('return');
}

/** One fact review (confirm / remove / fix): the facts screen JSON the server answered with, else throws. */
export async function requestFactReview(
  post: InterviewJsonPost,
  factId: string,
  decision: 'confirm' | 'remove' | 'fix',
  text?: string,
): Promise<Record<string, unknown>> {
  const reply = await post(INTERVIEW_FACTS_URL, { action: 'review', factId, decision, ...(text === undefined ? {} : { text }) });
  if (!reply.ok || !Array.isArray(reply.json.facts)) throw new Error('review');
  return reply.json;
}
