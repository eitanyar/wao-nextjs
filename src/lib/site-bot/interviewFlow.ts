/**
 * Site Bot step 2a: the request-level logic of the pre-payment interview (the thin routes under
 * /api/site-bot/interview-start, interview-step, interview-gates and interview-resume call these). Pure apart from the
 * injected deps, so the security cases (another session's cookie, a crafted cookie, a forged or expired resume link, a
 * replayed exit) are unit-tested against a real store (interviewFlow.test.ts).
 *
 * Flow on /site-bot/start: confirm card -> 3 questions -> credentials (optional) -> owner contact -> domain ->
 * work-location question (tutor / photographer / solar only) -> holding screen -> (step 2b) the five interview questions
 * (HOLDING_CTA, interviewQuestions.ts) -> the open owner research gates (interview-gates, once the research settled)
 * -> the confirm-facts screen (interview-facts, interviewFactsFlow.ts) -> facts_confirmed (2c generates the preview).
 * Research starts once the contact is in (and the location question passed, when asked), keyed by the session id.
 *
 * Server-only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { CollectedData } from '../bot/prompts';
import type { AuditCandidateSnapshot } from './auditStore';
import type { InterviewClaim } from './offerState';
import type { LaunchStore } from './launchStore';
import {
  beginInterviewQuestions, beginInterviewSession, expireDueSessions, interviewPhase, interviewReadyForResearch, interviewResearchSettled,
  markInterviewGatesDone, readInterviewSession, recordInterviewContact, recordInterviewDomain, recordInterviewLocation, resumePath,
  rotateInterviewCookie, saveInterviewAnswers, saveInterviewProgress, sessionFromCookie, signResumeToken, updateInterviewCollectedData,
  verifyResumeToken,
  type InterviewPhase, type InterviewSession,
} from './interviewSession';
import {
  applyInterviewAnswer, interviewComplete, interviewQuestionsView, parseAnswerSubmission, type InterviewQuestionsView,
} from './interviewQuestions';
import { isGenericOnlyAnswer } from './interviewProbe';
import { ownerIntakeFields, withValidatedOwnerIntake, type DomainChoice } from './ownerIntake';
import {
  isWorkLocationAnswer, workLocationExits, workLocationTradeOfCategory, WORK_LOCATION_TRADE_CATEGORY,
  type WorkLocation, type WorkLocationTrade,
} from './workLocation';
import type { WaitlistEntry } from './launchStore';
import { previewView, type PreviewView } from './interviewPreviewView';
import { frameWorkLocation } from './interviewGeneration';

export interface InterviewDeps {
  /** Runs fn on the launch store (its clock is the injected one); any failure returns fallback. */
  withStore: <T>(fn: (store: LaunchStore) => T, fallback: T) => T;
  /** offerState.claimInterviewStart: eligibility + the launch-cap spot (atomic). */
  claimSpot: (auditId: string, placeId: string) => Promise<InterviewClaim>;
  /** The stored audit candidate of this session's business, or null. */
  findCandidate: (auditId: string, placeId: string) => Promise<AuditCandidateSnapshot | null>;
  /** The launch category of a business (offerState.tradeScope match), or null. */
  categoryOf: (candidate: AuditCandidateSnapshot) => string | null;
  /** The launch category of a typed / confirmed trade name (taxonomy name or synonym), or null. */
  categoryOfNiche: (niche: string) => string | null;
  /** Server-side normalisation of the submitted record (served areas from travelBoundary). */
  normalizeCollected: (data: CollectedData) => CollectedData;
  /** Starts the session's research once (never awaited by the reply). */
  startResearch: (session: InterviewSession) => void;
  /** Staff alert for a new waiting-list entry (never throws, never awaited). */
  alertWaitlist: (entry: WaitlistEntry) => void;
  ttlMs: number;
  now: () => Date;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACE_ID = /^[A-Za-z0-9_-]{8,256}$/;

/** What the browser may see of its session (never the cookie, never another session). */
export interface InterviewView {
  phase: InterviewPhase;
  /** The browser's own step snapshot, returned only while it is still in the intake phase. */
  progress: unknown;
  locationTrade: WorkLocationTrade | null;
  workLocation: WorkLocation | null;
  businessName: string | null;
  /** Step 2b: the interview questions (current question, probe, his own drafts), in the questions phase only. */
  questions: InterviewQuestionsView | null;
  /** Step 2b: the research run settled (the gates step lists the gates once this is true). */
  researchReady: boolean;
  /** Step 2c: the home-page preview (status, fix round) in the facts / facts_confirmed phases; null before. */
  preview: PreviewView | null;
}

export function interviewView(session: InterviewSession, now: Date = new Date()): InterviewView {
  const phase = interviewPhase(session);
  return {
    phase,
    progress: phase === 'intake' ? session.progress ?? null : null,
    locationTrade: session.locationTrade,
    workLocation: session.workLocation,
    businessName: session.businessName,
    questions: phase === 'questions' && session.interviewState ? interviewQuestionsView(session.interviewState) : null,
    researchReady: interviewResearchSettled(session, now),
    preview: phase === 'facts' || phase === 'facts_confirmed' ? previewView(session) : null,
  };
}

/** The owner's own service and trade names: a concrete marker for the probe (interviewProbe.ts). */
export function ownProbeTerms(data: CollectedData | null): string[] {
  if (!data) return [];
  const list = [data.businessNiche, data.primaryService, ...(Array.isArray(data.priorityServices) ? data.priorityServices : [])];
  return list.filter((value): value is string => typeof value === 'string' && value.trim().length >= 2).map(value => value.trim());
}

export type StartOutcome =
  | { kind: 'no_audit' }
  | { kind: 'blocked'; claim: Extract<InterviewClaim, { kind: 'blocked' }> }
  | { kind: 'elsewhere' }
  | { kind: 'unavailable' }
  | { kind: 'closed'; view: InterviewView }
  | { kind: 'session'; status: 'started' | 'resumed'; view: InterviewView; cookie: string | null; expiresAt: string };

/**
 * POST /api/site-bot/interview-start. Order matters:
 *   1. lazy expiry (an unswept 72 h session is closed and its spot freed before anything else);
 *   2. the caller's own CLOSED session for this same check (same auditId) answers with its end state (exited / expired /
 *      paid) WITHOUT claiming a spot, so reloading the expired screen never takes a fresh weekly start;
 *   3. the spot claim (eligibility + cap); 4. the session (own open one resumes, else a new one).
 */
export async function startInterview(input: { auditId: unknown; placeId: unknown; cookieValue: unknown }, deps: InterviewDeps): Promise<StartOutcome> {
  const { auditId, placeId } = input;
  if (typeof auditId !== 'string' || !UUID.test(auditId) || typeof placeId !== 'string' || !PLACE_ID.test(placeId)) return { kind: 'no_audit' };
  const audit = auditId.toLowerCase();
  deps.withStore(store => expireDueSessions(store), 0);
  const own = deps.withStore(store => sessionFromCookie(store, input.cookieValue), null);
  if (own && own.status !== 'open' && own.status !== 'superseded' && own.placeId === placeId && own.auditId === audit) {
    return { kind: 'closed', view: interviewView(own, deps.now()) };
  }
  const claim = await deps.claimSpot(audit, placeId);
  if (claim.kind === 'no_audit') return { kind: 'no_audit' };
  if (claim.kind === 'blocked') return { kind: 'blocked', claim };
  const begun = deps.withStore(
    store => beginInterviewSession(store, { placeId, auditId: audit, cookieValue: input.cookieValue, ttlMs: deps.ttlMs }),
    null,
  );
  if (!begun) return { kind: 'unavailable' };
  if (begun.kind === 'elsewhere') return { kind: 'elsewhere' };
  return {
    kind: 'session',
    status: claim.status === 'reserved' ? 'started' : 'resumed',
    view: interviewView(begun.session, deps.now()),
    cookie: begun.kind === 'created' ? begun.cookie : null,
    expiresAt: begun.session.expiresAt,
  };
}

/** The open session the cookie proves (after lazy expiry), or null. */
export function openSessionFromCookie(cookieValue: unknown, deps: Pick<InterviewDeps, 'withStore'>): InterviewSession | null {
  return deps.withStore(store => {
    expireDueSessions(store);
    const session = sessionFromCookie(store, cookieValue);
    return session && session.status === 'open' ? session : null;
  }, null);
}

export type StepOutcome =
  | { kind: 'ok'; view: InterviewView }
  | { kind: 'exited'; view: InterviewView }
  | { kind: 'no_session' }
  | { kind: 'closed'; view: InterviewView }
  | { kind: 'invalid_input' }
  | { kind: 'out_of_order'; view: InterviewView }
  | { kind: 'unavailable' };

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** The work-location trade of a session: the business's launch category, else the trade name it confirmed. */
export async function locationTradeFor(session: InterviewSession, niche: string | undefined, deps: InterviewDeps): Promise<WorkLocationTrade | null> {
  const candidate = await deps.findCandidate(session.auditId, session.placeId);
  const byProfile = candidate ? workLocationTradeOfCategory(deps.categoryOf(candidate)) : null;
  if (byProfile) return byProfile;
  return typeof niche === 'string' && niche.trim() ? workLocationTradeOfCategory(deps.categoryOfNiche(niche)) : null;
}

/**
 * POST /api/site-bot/interview-step: { step: 'progress' | 'contact' | 'domain' | 'location', ... } (step 2a), and step 2b:
 *   { step: 'status' }                               read-only: the current view (the gates step polls researchReady)
 *   { step: 'questions_begin' }                      HOLDING_CTA: the questions start (idempotent)
 *   { step: 'answer', key, text | chips | skip }     the current question's answer; the probe may show once
 *   { step: 'gates_done' }                           the gates step is over (after the research settled)
 */
export async function interviewStep(cookieValue: unknown, body: unknown, deps: InterviewDeps): Promise<StepOutcome> {
  if (!plainObject(body) || typeof body.step !== 'string') return { kind: 'invalid_input' };
  const session = deps.withStore(store => {
    expireDueSessions(store);
    return sessionFromCookie(store, cookieValue);
  }, null);
  if (!session) return { kind: 'no_session' };
  // A replayed exit answers with the exit state again (idempotent), before the closed-session refusal.
  if (session.status !== 'open') return session.status === 'exited' && body.step === 'location' ? { kind: 'exited', view: interviewView(session, deps.now()) } : { kind: 'closed', view: interviewView(session, deps.now()) };

  switch (body.step) {
    case 'progress': {
      if (session.contactAt) return { kind: 'out_of_order', view: interviewView(session, deps.now()) };
      const saved = deps.withStore(store => saveInterviewProgress(store, session.id, body.progress), false);
      return saved ? { kind: 'ok', view: interviewView({ ...session, progress: body.progress }, deps.now()) } : { kind: 'invalid_input' };
    }
    case 'contact': {
      if (session.domainAt) return { kind: 'out_of_order', view: interviewView(session, deps.now()) };
      if (!plainObject(body.collectedData) || typeof body.collectedData.businessNiche !== 'string' || !body.collectedData.businessNiche.trim()) {
        return { kind: 'invalid_input' };
      }
      const submitted = { ...(body.collectedData as CollectedData) };
      // The domain answer belongs to the next step; the place is the session's, never the browser's.
      delete submitted.domainChoice;
      delete submitted.ownerDomain;
      const collectedData = withValidatedOwnerIntake(deps.normalizeCollected({ ...submitted, placeId: session.placeId }));
      if (!collectedData.ownerContact) return { kind: 'invalid_input' };
      const locationTrade = await locationTradeFor(session, collectedData.businessNiche, deps);
      const updated = deps.withStore(store => recordInterviewContact(store, session.id, {
        collectedData,
        ownerEmail: collectedData.ownerContact!.email,
        businessName: typeof collectedData.businessName === 'string' ? collectedData.businessName.slice(0, 200) : null,
        locationTrade,
      }), null);
      if (!updated) return { kind: 'unavailable' };
      if (interviewReadyForResearch(updated)) deps.startResearch(updated);
      return { kind: 'ok', view: interviewView(updated, deps.now()) };
    }
    case 'domain': {
      if (!session.contactAt || session.workLocation) return { kind: 'out_of_order', view: interviewView(session, deps.now()) };
      if (!plainObject(body.owner) || !session.collectedData?.ownerContact) return { kind: 'invalid_input' };
      const contact = session.collectedData.ownerContact;
      const fields = ownerIntakeFields({
        mobile: contact.mobile, email: contact.email,
        domainChoice: body.owner.domainChoice as DomainChoice, domain: typeof body.owner.domain === 'string' ? body.owner.domain : undefined,
      });
      if (!fields.domainChoice) return { kind: 'invalid_input' };
      const merged: CollectedData = { ...session.collectedData };
      delete merged.domainChoice;
      delete merged.ownerDomain;
      Object.assign(merged, fields);
      const updated = deps.withStore(store => recordInterviewDomain(store, session.id, merged), null);
      if (!updated) return { kind: 'unavailable' };
      return { kind: 'ok', view: interviewView(updated, deps.now()) };
    }
    case 'location': {
      const trade = session.locationTrade;
      if (!trade || !session.domainAt || session.workLocation) return { kind: 'out_of_order', view: interviewView(session, deps.now()) };
      if (!isWorkLocationAnswer(trade, body.workLocation)) return { kind: 'invalid_input' };
      const answer = body.workLocation;
      const exits = workLocationExits(answer);
      const contact = session.collectedData?.ownerContact;
      if (exits && !contact) return { kind: 'invalid_input' };
      let result: ReturnType<typeof recordInterviewLocation> | null;
      try {
        result = deps.withStore(store => recordInterviewLocation(store, session.id, answer, exits, {
          category: WORK_LOCATION_TRADE_CATEGORY[trade],
          name: typeof session.collectedData?.ownerName === 'string' ? session.collectedData.ownerName : '',
          phone: contact?.mobile ?? '',
        }), null);
      } catch {
        result = null;
      }
      if (!result || result.kind === 'refused') return { kind: 'unavailable' };
      if (result.kind === 'exited') {
        if (result.waitlist?.status === 'added') deps.alertWaitlist(result.waitlist.entry);
        return { kind: 'exited', view: interviewView(result.session, deps.now()) };
      }
      // Step 2c: HOME / MIX frame the record before the research starts (on-location only: no street address; MIX keeps
      // it only when it is the published Google address). Generation applies the same framing again (interviewGeneration.ts).
      let continued = result.session;
      if (continued.collectedData) {
        const published = (await deps.findCandidate(session.auditId, session.placeId).catch(() => null))?.formattedAddress ?? null;
        const framed = frameWorkLocation(continued.collectedData, answer, published);
        if (JSON.stringify(framed) !== JSON.stringify(continued.collectedData)
          && deps.withStore(store => updateInterviewCollectedData(store, session.id, framed), false)) {
          continued = { ...continued, collectedData: framed };
        }
      }
      if (interviewReadyForResearch(continued)) deps.startResearch(continued);
      return { kind: 'ok', view: interviewView(continued, deps.now()) };
    }
    case 'status':
      // Read-only: the gates step polls this until researchReady (no write, no state change).
      return { kind: 'ok', view: interviewView(session, deps.now()) };
    case 'questions_begin': {
      const phase = interviewPhase(session);
      if (phase === 'questions') return { kind: 'ok', view: interviewView(session, deps.now()) };
      if (phase !== 'holding') return { kind: 'out_of_order', view: interviewView(session, deps.now()) };
      const begun = deps.withStore(store => beginInterviewQuestions(store, session.id), null);
      return begun ? { kind: 'ok', view: interviewView(begun, deps.now()) } : { kind: 'unavailable' };
    }
    case 'answer': {
      const state = session.interviewState;
      if (interviewPhase(session) !== 'questions' || !state) return { kind: 'out_of_order', view: interviewView(session, deps.now()) };
      const submission = parseAnswerSubmission(body);
      if (!submission) return { kind: 'invalid_input' };
      const terms = ownProbeTerms(session.collectedData);
      const result = applyInterviewAnswer(state, submission, text => isGenericOnlyAnswer(text, { ownTerms: terms }));
      if (result.kind === 'out_of_order') return { kind: 'out_of_order', view: interviewView(session, deps.now()) };
      const done = result.kind === 'advanced' && interviewComplete(result.state);
      const saved = deps.withStore(store => saveInterviewAnswers(store, session.id, state, result.state, done), null);
      if (!saved) {
        // Lost a race with another submit (double click, second tab): answer with the state that won.
        const current = deps.withStore(store => readInterviewSession(store, session.id), null);
        return current ? { kind: 'out_of_order', view: interviewView(current, deps.now()) } : { kind: 'unavailable' };
      }
      return { kind: 'ok', view: interviewView(saved, deps.now()) };
    }
    case 'gates_done': {
      const phase = interviewPhase(session);
      if (phase === 'facts') return { kind: 'ok', view: interviewView(session, deps.now()) };
      if (phase !== 'gates' || !interviewResearchSettled(session, deps.now())) return { kind: 'out_of_order', view: interviewView(session, deps.now()) };
      const done = deps.withStore(store => markInterviewGatesDone(store, session.id), null);
      return done ? { kind: 'ok', view: interviewView(done, deps.now()) } : { kind: 'unavailable' };
    }
    default:
      return { kind: 'invalid_input' };
  }
}

/** Replaces the session's collected data after an owner gate answer (the server applies it, never the browser). */
export function storeGateAnsweredData(sessionId: string, collectedData: CollectedData, deps: Pick<InterviewDeps, 'withStore'>): boolean {
  return deps.withStore(store => updateInterviewCollectedData(store, sessionId, collectedData), false);
}

export type ResumeOutcome =
  | { kind: 'resumed'; cookie: string; maxAgeMs: number; startPath: string }
  | { kind: 'refused' };

/**
 * GET /api/site-bot/interview-resume?t=...: an authentic, unexpired link for a still-open session rotates the cookie
 * secret (this browser now holds the session) and sends the owner back to /site-bot/start for his check. Anything else
 * (forged, malformed, expired link, a closed session) is refused: no cookie, no state.
 */
export function redeemResumeLink(token: unknown, deps: Pick<InterviewDeps, 'withStore' | 'now'>, env: Record<string, string | undefined> = process.env): ResumeOutcome {
  const sessionId = verifyResumeToken(token, deps.now(), env);
  if (!sessionId) return { kind: 'refused' };
  return deps.withStore((store): ResumeOutcome => {
    expireDueSessions(store);
    const session = readInterviewSession(store, sessionId);
    if (!session || session.status !== 'open') return { kind: 'refused' };
    const cookie = rotateInterviewCookie(store, sessionId);
    if (!cookie) return { kind: 'refused' };
    return {
      kind: 'resumed',
      cookie,
      maxAgeMs: Math.max(0, Date.parse(session.expiresAt) - deps.now().getTime()),
      startPath: `/site-bot/start?${new URLSearchParams({ auditId: session.auditId, placeId: session.placeId }).toString()}`,
    };
  }, { kind: 'refused' });
}

/** The signed resume path of a session: valid until its spot expires. */
export function sessionResumePath(session: InterviewSession, env: Record<string, string | undefined> = process.env): string {
  return resumePath(signResumeToken(session.id, Date.parse(session.expiresAt), env));
}
