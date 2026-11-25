/**
 * Site Bot step 2a: the owner research gates keyed by the interview session (POST /api/site-bot/interview-gates).
 * Rules kept from ownerGates.ts: the gate list is server-side (recorded on the dossier by the interview research run),
 * only open gates are listed or accepted, and the caller must hold the session: the research id is the session's own
 * research_id, never a value from the request, so another session's cookie can never reach this research.
 * A gate answer is applied to the session's stored collected data on the server (applyResearchGateAnswer).
 * Step 2b: the list waits until the research run settled (the gates are recorded at its end), answering 409
 * research_pending until then; and an answer may come as the owner's plain text (`text`), shaped on the server by the
 * existing gate presentation (buildResearchGateAnswer) with the session's own collected data.
 * Server-only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { applyResearchGateAnswer } from './research/gates';
import { buildResearchGateAnswer } from './research/gatePresentation';
import { interviewResearchSettled } from './interviewSession';
import { listOpenOwnerResearchGates, submitOwnerResearchGate } from './research/ownerGates';
import { openSessionFromCookie, storeGateAnsweredData, type InterviewDeps } from './interviewFlow';

export interface GatesReply {
  status: number;
  body: Record<string, unknown>;
}

export interface InterviewGatesDeps extends Pick<InterviewDeps, 'withStore' | 'now' | 'ttlMs'> {
  /** Test seam: the research store directory. */
  researchBaseDir?: string;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function interviewGates(cookieValue: unknown, body: unknown, deps: InterviewGatesDeps): Promise<GatesReply> {
  if (!plainObject(body) || (body.action !== 'list' && body.action !== 'answer')) return { status: 400, body: { error: 'invalid_input' } };
  // Anything naming a research or session in the body is refused outright: the capability is the cookie alone.
  if ('researchId' in body || 'sessionId' in body) return { status: 400, body: { error: 'invalid_input' } };
  const session = openSessionFromCookie(cookieValue, deps);
  if (!session) return { status: 401, body: { error: 'no_session' } };
  if (!session.researchId || !interviewResearchSettled(session, deps.now())) return { status: 409, body: { error: 'research_pending' } };
  const options = { baseDir: deps.researchBaseDir, now: deps.now, windowMs: deps.ttlMs };
  if (body.action === 'list') {
    return { status: 200, body: { gates: await listOpenOwnerResearchGates(session.researchId, options) } };
  }
  if (typeof body.gateId !== 'string' || body.gateId.length > 300 || typeof body.evidenceDigest !== 'string' || body.evidenceDigest.length > 100) {
    return { status: 400, body: { error: 'invalid_input' } };
  }
  let answer: unknown = body.answer;
  if (typeof body.text === 'string') {
    if (body.text.length > 1000 || !session.collectedData) return { status: 400, body: { error: 'invalid_input' } };
    const gate = (await listOpenOwnerResearchGates(session.researchId, options)).find(item => item.id === body.gateId);
    if (!gate) return { status: 404, body: { error: 'not_found' } };
    answer = buildResearchGateAnswer(gate.type, body.text, session.collectedData);
    if (answer === null) return { status: 400, body: { error: 'invalid_input' } };
  }
  const result = await submitOwnerResearchGate(session.researchId, body.gateId, body.evidenceDigest, answer, options);
  if (result.status !== 'approved') {
    const [error, status] = ({
      forbidden: ['not_found', 404],
      not_found: ['not_found', 404],
      closed: ['gate_closed', 409],
      stale: ['stale_evidence', 409],
      invalid_answer: ['invalid_input', 400],
    } as const)[result.status];
    return { status, body: { error } };
  }
  if (session.collectedData) {
    const applied = applyResearchGateAnswer(session.collectedData, result.gate, result.answer);
    if (!storeGateAnsweredData(session.id, applied, deps)) console.error(`[site-bot interview] gate answer not stored on session=${session.id}`);
  }
  return { status: 200, body: { status: 'approved' } };
}
