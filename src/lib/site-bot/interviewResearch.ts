/**
 * Site Bot step 2a: research before payment. Once the interview's contact step is in (and the work-location question
 * passed, when asked), the research runs in the background, keyed by the interview session id (= the research id), while
 * the owner keeps answering. It is long (the NeuronWriter budget alone is 90 s, researchLatency.test.ts), so the reply
 * never waits for it.
 *
 * Once per session: claimInterviewResearch() sets research_id in one conditional UPDATE, so a reload, a double click or
 * two processes start it at most once. providerUsage is recorded by runSiteResearch in the dossier, exactly as after
 * payment. After the run, the owner-answerable research gates are recorded on the dossier (ownerGates.ts), so the
 * interview (2b) can ask them before payment.
 *
 * checkout/callback reuses the research: it awaits the in-flight run of this process (inFlightInterviewResearch) or
 * reads the dossier, and starts nothing (paid.ts falls back to its own run only for a session with no research).
 *
 * Server-only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { CollectedData } from '../bot/prompts';
import { deriveOpenResearchGates } from './research/gates';
import { recordOwnerResearchGates } from './research/ownerGates';
import { buildSiteResearchInput } from './research/researchInput';
import { runSiteResearch } from './research/runResearch';
import { claimInterviewResearch, type InterviewSession } from './interviewSession';
import { withLaunchStore, type LaunchStore } from './launchStore';

const inFlight = new Map<string, Promise<void>>();

export interface InterviewResearchDeps {
  withStore: <T>(fn: (store: LaunchStore) => T, fallback: T) => T;
  run: (researchId: string, collectedData: CollectedData) => Promise<void>;
  log: (line: string) => void;
}

/** The research run of one interview: the same input builder as the paid callback, then the owner gates. */
export async function runInterviewResearch(researchId: string, collectedData: CollectedData): Promise<void> {
  await runSiteResearch(researchId, buildSiteResearchInput(`interview:${researchId}`, collectedData, () => new Date(), researchId));
  const gates = deriveOpenResearchGates(researchId, collectedData);
  const recorded = await recordOwnerResearchGates(researchId, gates);
  if (gates.length && !recorded.length) console.error(`[site-bot interview] owner gates not recorded research=${researchId}`);
}

export const defaultInterviewResearchDeps: InterviewResearchDeps = {
  withStore: (fn, fallback) => withLaunchStore(fn, fallback),
  run: runInterviewResearch,
  log: line => console.error(line),
};

export type ResearchStart = 'started' | 'already' | 'not_ready';

/** Starts the session's research once; never awaits it and never throws. */
export function startInterviewResearch(session: InterviewSession, deps: InterviewResearchDeps = defaultInterviewResearchDeps): ResearchStart {
  if (session.status !== 'open' || !session.collectedData) return 'not_ready';
  if (!deps.withStore(store => claimInterviewResearch(store, session.id), false)) return 'already';
  const researchId = session.id;
  const run = Promise.resolve()
    .then(() => deps.run(researchId, session.collectedData!))
    .catch(() => deps.log(`[site-bot interview] research failed research=${researchId}`))
    .finally(() => inFlight.delete(researchId));
  inFlight.set(researchId, run);
  return 'started';
}

/** The run still in progress in THIS process for a research id, if any (settles, never rejects). */
export function inFlightInterviewResearch(researchId: string): Promise<void> | undefined {
  return inFlight.get(researchId);
}
