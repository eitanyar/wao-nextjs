/**
 * Site Bot step 2b: the request-level logic of POST /api/site-bot/interview-facts (the confirm-facts screen).
 *
 *   { action: 'load' }                                   the session's fact set for its current answer set; extracts it
 *                                                        first when there is none yet (once per answer-set version)
 *   { action: 'review', factId, decision, text? }        confirm | remove | fix (text = his correction)
 *   { action: 'done' }                                   FACTS_DONE: every fact reviewed -> session step facts_confirmed
 *   { action: 'return' }                                 the one return from an empty facts screen to the questions
 *
 * Capability = the interview session cookie alone: the research id is the session's own, the fact set is the one stored
 * in that research's dossier, and a review names a fact id that must exist in that set (an unknown id is 404; no id in
 * the request can reach another session's facts). Nothing in the body names a session or a research.
 *
 * Extraction: claimFactExtraction() admits one run per answer-set version (the one return after FACTS_EMPTY submits a
 * new version, so at most two runs per session). The run = one bounded model call (factExtraction.ts) whose candidates
 * pass the quote rule (interviewFacts.ts), plus the code-built facts: every ticked price chip, every credential. If the
 * model fails, the code-built facts alone are stored ('code_only'). Every model attempt's cost goes to the dossier's
 * providerUsage. The run is started in the background by the 'load' that claimed it (the model takes ~40 s at thinking
 * HIGH, longer than a proxy should hold a request): 'load' answers 409 extracting until the set is stored, and the page
 * polls. A claim that never stored a set (the process stopped mid-run) is taken over with the code-only facts after
 * FACTS_CLAIM_STALE_MS, which is longer than two attempts can take.
 *
 * Server-only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes (labels are read from the copy modules).
 */
import type { CollectedData } from '../bot/prompts';
import { parseContractorLicense } from './contractorRegistration';
import { CREDENTIALS_COPY, licenseQuestionCopy, NO_WARRANTY_VALUE, WARRANTY_PICKER_VALUES } from './credentialsCopy';
import { defaultModelCall, extractFactCandidates, type ModelCall } from './factExtraction';
import { retypeModelFacts } from './factRetype';
import {
  allFactsReviewed, factsFromCredentials, factsFromModel, factsFromPriceChips, isFactId, isInterviewFactSet, parseFactDecision,
  reviewFact, type CredentialField, type InterviewFact, type InterviewFactSet, type QuoteSource,
} from './interviewFacts';
import { openSessionFromCookie, type InterviewDeps } from './interviewFlow';
import { answerTexts, PRICE_CHIP_COPY_KEY, secondPassState, tickedPriceChips } from './interviewQuestions';
import {
  claimFactExtraction, interviewPhase, markInterviewFactsConfirmed, returnInterviewToQuestions, type InterviewSession,
} from './interviewSession';
import { ISRAELI_LOCALITIES } from './israeliLocalities';
import { getResearchPath, readResearchDossier, writeResearchDossierAtomic } from './research/researchStore';
import { listedServedAreas } from './servedAreas';
import type { SiteResearchDossier } from './research/types';
import { SITE_BOT_STEP2B_COPY } from './step2bCopy.generated';

export const FACTS_CLAIM_STALE_MS = 5 * 60 * 1000;

/** The extraction running in THIS process per interview session id (settles, never rejects). */
const inFlight = new Map<string, Promise<void>>();

export function inFlightFactExtraction(sessionId: string): Promise<void> | undefined {
  return inFlight.get(sessionId);
}

export interface InterviewFactsDeps extends Pick<InterviewDeps, 'withStore' | 'now'> {
  /** Test seam: the research store directory. */
  researchBaseDir?: string;
  /** The model call (default: Gemini, or the fixture under SITE_BOT_FACTS_MODEL=fixture outside production). */
  modelCall?: ModelCall;
  /** Test seam: the per-attempt timeout. */
  timeoutMs?: number;
  /** Step 2c: called once FACTS_DONE moved the session to facts_confirmed (starts the home-page preview). Never awaited. */
  onConfirmed?: (session: InterviewSession) => void;
}

export interface FactsReply {
  status: number;
  body: Record<string, unknown>;
}

/** One fact as the screen shows it: the stored fact plus the service name and, for a credential, its question. */
export interface FactView extends InterviewFact {
  serviceName?: string;
  contextLabel?: string;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** The owner-service evidence of the dossier (runResearch ownerEvidence): the only serviceIds a fact may carry. */
export function dossierServices(dossier: SiteResearchDossier | null): Array<{ id: string; name: string }> {
  return (dossier?.businessTruth.assertions ?? [])
    .filter(assertion => assertion.id.startsWith('owner-service:') && assertion.claim.trim())
    .map(assertion => ({ id: assertion.id, name: assertion.claim.trim() }));
}

const WARRANTY_LABEL_BY_VALUE: Record<string, string> = {
  [WARRANTY_PICKER_VALUES.sixMonths]: CREDENTIALS_COPY.warrantySixMonths,
  [WARRANTY_PICKER_VALUES.oneYear]: CREDENTIALS_COPY.warrantyOneYear,
  [WARRANTY_PICKER_VALUES.twoYears]: CREDENTIALS_COPY.warrantyTwoYears,
};

/** The credentials-step answers in his words: typed text as typed, a picked chip as its label; "no warranty" is no fact. */
export function credentialQuotes(data: CollectedData | null): Partial<Record<CredentialField, string>> {
  const out: Partial<Record<CredentialField, string>> = {};
  if (!data) return out;
  if (typeof data.yearsInField === 'string' && /^\d{1,2}$/.test(data.yearsInField.trim())) out.yearsInField = data.yearsInField.trim();
  if (typeof data.license === 'string' && data.license.trim()) {
    const contractor = parseContractorLicense(data.license);
    out.license = contractor ? (contractor.detail ?? licenseQuestionCopy(data.businessNiche).yes) : data.license.trim();
  }
  if (typeof data.guarantee === 'string' && data.guarantee.trim() && data.guarantee.trim() !== NO_WARRANTY_VALUE) {
    out.guarantee = WARRANTY_LABEL_BY_VALUE[data.guarantee.trim()] ?? data.guarantee.trim();
  }
  return out;
}

function credentialContext(field: CredentialField, data: CollectedData | null): string {
  if (field === 'yearsInField') return CREDENTIALS_COPY.yearsQuestion;
  if (field === 'guarantee') return CREDENTIALS_COPY.warrantyQuestion;
  return licenseQuestionCopy(data?.businessNiche).question;
}

/** The code-built facts: ticked price chips, then the credentials. */
export function codeFacts(session: InterviewSession): InterviewFact[] {
  const state = session.interviewState;
  const chips = state ? tickedPriceChips(state) : [];
  return [
    ...factsFromPriceChips(chips, chip => SITE_BOT_STEP2B_COPY[PRICE_CHIP_COPY_KEY[chip]]),
    ...factsFromCredentials(credentialQuotes(session.collectedData)),
  ];
}

function quoteSources(session: InterviewSession): QuoteSource[] {
  return session.interviewState ? answerTexts(session.interviewState) : [];
}

function factsView(set: InterviewFactSet, session: InterviewSession, dossier: SiteResearchDossier | null): Record<string, unknown> {
  const names = new Map(dossierServices(dossier).map(service => [service.id, service.name]));
  const facts: FactView[] = set.facts.map(fact => ({
    ...fact,
    ...(fact.serviceId && names.has(fact.serviceId) ? { serviceName: names.get(fact.serviceId) } : {}),
    ...(fact.source.kind === 'credential' ? { contextLabel: credentialContext(fact.source.field, session.collectedData) } : {}),
  }));
  const usable = set.facts.length > 0;
  return {
    facts,
    extraction: set.extraction,
    empty: !usable,
    // FACTS_EMPTY offers the way back once; on the second pass whatever comes is accepted. Step 2c: never in the preview's
    // fix round (it reviews the same facts; FACTS_EMPTY_FINAL shows instead).
    canReturn: !usable && session.factsReturns === 0 && !session.previewFixAt,
    canFinish: allFactsReviewed(set) && (usable || session.factsReturns > 0),
    confirmed: Boolean(set.confirmedAt),
  };
}

async function readDossier(session: InterviewSession, baseDir?: string): Promise<SiteResearchDossier | null> {
  if (!session.researchId || !getResearchPath(session.researchId, baseDir)) return null;
  return readResearchDossier(session.researchId, baseDir, { bounded: true });
}

function currentSet(dossier: SiteResearchDossier | null, session: InterviewSession): InterviewFactSet | null {
  const set = dossier?.interviewFacts;
  return isInterviewFactSet(set) && set.answersVersion === session.answersVersion ? set : null;
}

/** Stores a set (and usage rows) on a FRESH read of the dossier, so a concurrent gate answer is never lost. */
async function storeSet(session: InterviewSession, set: InterviewFactSet, usage: SiteResearchDossier['providerUsage'], deps: InterviewFactsDeps): Promise<SiteResearchDossier | null> {
  const dossier = await readDossier(session, deps.researchBaseDir);
  if (!dossier) return null;
  dossier.interviewFacts = set;
  dossier.providerUsage = [...dossier.providerUsage, ...usage];
  dossier.updatedAt = deps.now().toISOString();
  return await writeResearchDossierAtomic(session.researchId!, dossier, deps.researchBaseDir) ? dossier : null;
}

async function extractSet(session: InterviewSession, dossier: SiteResearchDossier, deps: InterviewFactsDeps, useModel: boolean): Promise<{ set: InterviewFactSet; usage: SiteResearchDossier['providerUsage'] }> {
  const built = codeFacts(session);
  const sources = quoteSources(session);
  let modelFacts: InterviewFact[] = [];
  let usage: SiteResearchDossier['providerUsage'] = [];
  let extraction: InterviewFactSet['extraction'] = 'code_only';
  if (useModel && sources.length > 0) {
    const services = dossierServices(dossier);
    const contact = session.collectedData?.ownerContact;
    const outcome = await extractFactCandidates({
      trade: typeof session.collectedData?.businessNiche === 'string' ? session.collectedData.businessNiche : '',
      services,
      sources,
      redact: [contact?.mobile ?? '', contact?.email ?? '', session.ownerEmail ?? '',
        typeof session.collectedData?.ownerName === 'string' ? session.collectedData.ownerName : ''],
    }, { call: deps.modelCall ?? defaultModelCall(), now: deps.now, recordId: `${session.id}:v${session.answersVersion}`, timeoutMs: deps.timeoutMs });
    usage = outcome.usage;
    if (outcome.ok) {
      // Yonatan C3: a job needs the work in it, and a caller's question is never a job (factRetype.ts).
      const data = session.collectedData ?? {};
      const serviceAreaTexts = [data.targetLocation, data.specificCities, ...listedServedAreas(data)]
        .filter((item): item is string => typeof item === 'string' && item.trim() !== '');
      modelFacts = retypeModelFacts(factsFromModel(outcome.candidates, sources, services.map(service => service.id), session.answersVersion),
        { localities: ISRAELI_LOCALITIES, serviceAreaTexts });
      extraction = 'model';
    }
  }
  return {
    set: { version: 1, answersVersion: session.answersVersion, extractedAt: deps.now().toISOString(), extraction, facts: [...modelFacts, ...built] },
    usage,
  };
}

export async function interviewFacts(cookieValue: unknown, body: unknown, deps: InterviewFactsDeps): Promise<FactsReply> {
  if (!plainObject(body) || typeof body.action !== 'string' || !['load', 'review', 'done', 'return'].includes(body.action)) {
    return { status: 400, body: { error: 'invalid_input' } };
  }
  // The capability is the cookie alone: anything naming a session or a research is refused outright.
  if ('researchId' in body || 'sessionId' in body) return { status: 400, body: { error: 'invalid_input' } };
  const session = openSessionFromCookie(cookieValue, deps);
  if (!session) return { status: 401, body: { error: 'no_session' } };
  const phase = interviewPhase(session);
  if (phase !== 'facts' && !(phase === 'facts_confirmed' && body.action === 'load')) return { status: 409, body: { error: 'out_of_order', phase } };

  let dossier = await readDossier(session, deps.researchBaseDir);
  if (!dossier) return { status: 503, body: { error: 'research_unavailable' } };
  let set = currentSet(dossier, session);

  if (body.action === 'load') {
    if (!set) {
      if (inFlight.has(session.id)) return { status: 409, body: { error: 'extracting' } };
      const claimed = deps.withStore(store => claimFactExtraction(store, session.id), false);
      if (claimed) {
        const startDossier = dossier;
        const run = Promise.resolve()
          .then(async () => {
            const extracted = await extractSet(session, startDossier, deps, true);
            if (!await storeSet(session, extracted.set, extracted.usage, deps)) throw new Error('store');
          })
          .catch(() => console.error(`[site-bot facts] extraction not stored session=${session.id}`))
          .finally(() => inFlight.delete(session.id));
        inFlight.set(session.id, run);
        return { status: 409, body: { error: 'extracting' } };
      }
      const stale = session.factsExtractedVersion === session.answersVersion && session.factsClaimedAt
        && deps.now().getTime() - Date.parse(session.factsClaimedAt) >= FACTS_CLAIM_STALE_MS;
      if (!stale) return { status: 409, body: { error: 'extracting' } };
      const extracted = await extractSet(session, dossier, deps, false);
      const stored = await storeSet(session, extracted.set, extracted.usage, deps);
      if (!stored) return { status: 500, body: { error: 'server_error' } };
      dossier = stored;
      set = extracted.set;
    }
    return { status: 200, body: factsView(set, session, dossier) };
  }

  if (!set) return { status: 409, body: { error: 'out_of_order', phase } };

  if (body.action === 'review') {
    if (!isFactId(body.factId)) return { status: 400, body: { error: 'invalid_input' } };
    const decision = parseFactDecision(body);
    if (!decision) return { status: 400, body: { error: 'invalid_input' } };
    const next = reviewFact(set, body.factId, decision, deps.now());
    // Only an id of THIS session's current set: anything else is not found.
    if (!next) return { status: 404, body: { error: 'not_found' } };
    const stored = await storeSet(session, next, [], deps);
    if (!stored) return { status: 500, body: { error: 'server_error' } };
    return { status: 200, body: factsView(next, session, stored) };
  }

  if (body.action === 'return') {
    if (set.facts.length > 0 || session.factsReturns > 0 || session.previewFixAt || !session.interviewState) return { status: 409, body: { error: 'return_unavailable' } };
    const returned = deps.withStore(store => returnInterviewToQuestions(store, session.id, secondPassState(session.interviewState!)), null);
    if (!returned) return { status: 409, body: { error: 'return_unavailable' } };
    return { status: 200, body: { phase: interviewPhase(returned) } };
  }

  // done
  const view = factsView(set, session, dossier);
  if (!view.canFinish) return { status: 409, body: { error: view.empty ? 'facts_empty' : 'facts_pending' } };
  if (!set.confirmedAt) {
    const stored = await storeSet(session, { ...set, confirmedAt: deps.now().toISOString() }, [], deps);
    if (!stored) return { status: 500, body: { error: 'server_error' } };
  }
  const confirmed = deps.withStore(store => markInterviewFactsConfirmed(store, session.id), null);
  if (!confirmed) return { status: 500, body: { error: 'server_error' } };
  try { deps.onConfirmed?.(confirmed); } catch { /* the page's status poll starts it anyway */ }
  return { status: 200, body: { phase: interviewPhase(confirmed) } };
}
