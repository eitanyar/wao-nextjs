// Site Bot step 2b: interview v1 and facts, end to end on a REAL launch store (temp SQLite) and a REAL research store
// (temp dir) with an injected clock and an injected model call: the probe detector (generic vs concrete, fires once),
// the quote-substring rule (a hallucinated quote is dropped), price chips as facts, confirm / fix / remove, resume
// mid-questions, cross-session refusal, the model-failure fallback and FACTS_EMPTY with its single return.
// HEBREW-SAFETY: zero Hebrew bytes. Hebrew test text is built at runtime from the existing pattern list
// (interviewProbe.GENERIC_CLAIM), the locality list and the generated copy module.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { CollectedData } from '../bot/prompts';
import type { AuditCandidateSnapshot, AuditRecord } from './auditStore';
import { claimInterviewStart, type OfferDeps } from './offerState';
import { openLaunchStore, type LaunchStore } from './launchStore';
import { interviewStep, startInterview, type InterviewDeps } from './interviewFlow';
import { interviewGates } from './interviewGates';
import { inFlightInterviewResearch, startInterviewResearch } from './interviewResearch';
import { parseInterviewCookie, parseSpotTtlMs, readInterviewSession, RESEARCH_SETTLE_MS } from './interviewSession';
import { GENERIC_CLAIM, isGenericOnlyAnswer, PROBE_MAX_WORDS, TIME_WORD } from './interviewProbe';
import {
  applyInterviewAnswer, initialInterviewState, INTERVIEW_QUESTION_KEYS, parseInterviewState, PRICE_CHIP_COPY_KEY,
  type InterviewQuestionsView,
} from './interviewQuestions';
import {
  allFactsReviewed, enforceQuote, factsFromModel, factsFromPriceChips, reviewFact, type InterviewFact, type InterviewFactSet,
} from './interviewFacts';
import { extractFactCandidates, flashCostUsd, redactForModel, type ModelCall } from './factExtraction';
import { inFlightFactExtraction, interviewFacts as rawInterviewFacts, type InterviewFactsDeps } from './interviewFactsFlow';
import { ISRAELI_LOCALITIES } from './israeliLocalities';
import { readResearchDossier, writeResearchDossierAtomic } from './research/researchStore';
import type { SiteResearchDossier } from './research/types';
import { SITE_BOT_STEP2B_COPY } from './step2bCopy.generated';

const HOUR = 60 * 60 * 1000;
const T0 = Date.parse('2026-12-01T08:00:00.000Z');
const auditId = '123e4567-e89b-42d3-a456-426614174000';
const PLUMBER = 'ChIJ-plumber-0001';
const PLUMBER2 = 'ChIJ-plumber-0002';

/** Hebrew generic-claim words, read from the existing pattern list (never typed here). */
const decode = (source: string): string[] => source.split('|').map(word => JSON.parse(`"${word}"`) as string);
const GENERIC_WORDS = decode(GENERIC_CLAIM.source).filter(word => !word.includes(' '));
const GENERIC = `${GENERIC_WORDS[0]} ${GENERIC_WORDS[1]}`;
const LOCALITY = ISRAELI_LOCALITIES.find(item => item.he_name.length >= 3)!.he_name;

const candidate = (placeId: string): AuditCandidateSnapshot => ({
  placeId, displayName: 'Synthetic Business', formattedAddress: 'Synthetic Address', types: ['plumber'], primaryType: 'plumber',
  businessStatus: 'OPERATIONAL', hasRegularOpeningHours: true, hasSpecialOpeningHours: false, hasPhone: true, hasWebsite: false,
  photosFetched: true, photoCount: 3, hasRating: true, userRatingCount: 9, hasEditorialSummary: false,
});
const CANDIDATES = [candidate(PLUMBER), candidate(PLUMBER2)];

function collected(over: Partial<CollectedData> = {}): CollectedData {
  return {
    businessName: 'Synthetic Business', businessNiche: 'plumbing', primaryService: 'plumbing', targetLocation: 'Haifa', specificCities: 'Haifa',
    travelBoundary: 'Haifa', priorityServices: ['service-a'], secondaryServices: 'service-a',
    ownerContact: { mobile: '0521234567', email: 'owner@example.com' }, ...over,
  };
}

function dossierFor(researchId: string): SiteResearchDossier {
  const at = new Date(T0).toISOString();
  return {
    researchId, status: 'architecture_ready', createdAt: at, updatedAt: at,
    businessTruth: {
      businessName: 'Synthetic',
      assertions: [{ id: 'owner-service:service-a', claim: 'service-a', sourceKind: 'manual', providerRecordId: 'owner', retrievedAt: at, confidence: 0.95, assertionStatus: 'verified' }],
      status: 'verified',
    },
    evidence: [], evidenceEdges: [], keywordEvidence: [], serpObservations: [], pageOpportunities: [], internalLinkEdges: [], providerUsage: [],
    humanGates: [],
  } as unknown as SiteResearchDossier;
}

function harness(model: ModelCall) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-v1-'));
  const researchBaseDir = path.join(dir, 'site-research');
  let nowMs = T0;
  const store = openLaunchStore(path.join(dir, 'launch.sqlite'), () => new Date(nowMs));
  const withStore = <T>(fn: (s: LaunchStore) => T, fallback: T): T => { try { return fn(store); } catch { return fallback; } };
  const offerDeps: OfferDeps = {
    gateOpen: async () => true,
    withStore,
    limits: () => ({ total: 10, weekly: 10 }),
    readAudit: async (id: string): Promise<AuditRecord | null> => (id === auditId
      ? { auditId: id, query: { businessName: 'x' }, fetchedAt: '2026-12-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', candidates: CANDIDATES }
      : null),
  };
  const modelCalls: string[] = [];
  const deps: InterviewDeps = {
    withStore,
    claimSpot: (a, p) => claimInterviewStart(a, p, offerDeps),
    findCandidate: async (_a, p) => CANDIDATES.find(c => c.placeId === p) ?? null,
    categoryOf: () => 'gcid:plumber',
    categoryOfNiche: () => 'gcid:plumber',
    normalizeCollected: data => data,
    // The research run writes the dossier (as the real one does), then ends.
    startResearch: session => {
      startInterviewResearch(session, {
        withStore,
        run: async id => { assert.ok(await writeResearchDossierAtomic(id, dossierFor(id), researchBaseDir)); },
        log: () => undefined,
      });
    },
    alertWaitlist: () => undefined,
    ttlMs: parseSpotTtlMs({}),
    now: () => new Date(nowMs),
  };
  const factsDeps: InterviewFactsDeps = {
    withStore, now: deps.now, researchBaseDir,
    modelCall: async (system, user, options) => { modelCalls.push(user); return model(system, user, options); },
  };
  return {
    dir, store, deps, factsDeps, researchBaseDir, modelCalls,
    gatesDeps: { ...deps, researchBaseDir },
    advance: (ms: number) => { nowMs += ms; },
    close: () => { store.db.close(); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}
type H = ReturnType<typeof harness>;

/** start -> contact -> domain (research starts at the contact step and settles); returns the cookie. */
async function startThroughHolding(h: H, placeId = PLUMBER, over: Partial<CollectedData> = {}): Promise<string> {
  const started = await startInterview({ auditId, placeId, cookieValue: undefined }, h.deps);
  assert.equal(started.kind, 'session');
  const cookie = (started as Extract<typeof started, { kind: 'session' }>).cookie!;
  assert.equal((await interviewStep(cookie, { step: 'contact', collectedData: collected(over) }, h.deps)).kind, 'ok');
  assert.equal((await interviewStep(cookie, { step: 'domain', owner: { domainChoice: 'no_domain' } }, h.deps)).kind, 'ok');
  await inFlightInterviewResearch(parseInterviewCookie(cookie)!.id);
  return cookie;
}

async function answer(h: H, cookie: string, body: Record<string, unknown>) {
  const outcome = await interviewStep(cookie, { step: 'answer', ...body }, h.deps);
  assert.equal(outcome.kind, 'ok', JSON.stringify(body));
  return (outcome as { view: { phase: string; questions: InterviewQuestionsView | null } }).view;
}

const STORY = {
  recentJob: `Grohe 40 ${LOCALITY}`,
  turnedDown: 'Tadiran boiler, 2 floors up',
  callerQuestion: 'Do you come today? Within 2 hours',
  areaPattern: `${LOCALITY} old buildings, 1960s pipes`,
};

/** All five questions answered with concrete text and two chips; ends in the gates phase. */
async function answerAll(h: H, cookie: string, chips: string[] = ['afterVisit', 'freeVisit']) {
  assert.equal((await interviewStep(cookie, { step: 'questions_begin' }, h.deps)).kind, 'ok');
  await answer(h, cookie, { key: 'recentJob', text: STORY.recentJob });
  await answer(h, cookie, { key: 'turnedDown', text: STORY.turnedDown });
  await answer(h, cookie, { key: 'callerQuestion', text: STORY.callerQuestion });
  await answer(h, cookie, { key: 'priceStyle', chips });
  return answer(h, cookie, { key: 'areaPattern', text: STORY.areaPattern });
}

/**
 * interview-facts as the page uses it: a 'load' that started (or found) the background extraction answers 409
 * extracting; the page polls. Here: await this process's run, then load again.
 */
async function interviewFacts(cookie: unknown, body: Record<string, unknown>, deps: InterviewFactsDeps) {
  const first = await rawInterviewFacts(cookie, body, deps);
  if (body.action !== 'load' || first.status !== 409 || first.body.error !== 'extracting') return first;
  const id = typeof cookie === 'string' ? parseInterviewCookie(cookie)?.id : undefined;
  const run = id ? inFlightFactExtraction(id) : undefined;
  if (!run) return first;
  await run;
  return rawInterviewFacts(cookie, body, deps);
}

async function throughGates(h: H, cookie: string) {
  const done = await interviewStep(cookie, { step: 'gates_done' }, h.deps);
  assert.equal(done.kind, 'ok');
  assert.equal((done as { view: { phase: string } }).view.phase, 'facts');
}

/** A model that quotes the first answer verbatim, paraphrases another and invents one. */
const quotingModel: ModelCall = async (_system, user, options) => {
  const parsed = JSON.parse(user) as { answers: Array<{ questionKey: string; text: string }> };
  const first = parsed.answers.find(item => item.questionKey === 'recentJob')!;
  options.onUsage({ inputTokens: 1000, outputTokens: 200, thinkingTokens: 800 }, 'gemini-3.8-flash');
  return JSON.stringify({ facts: [
    { type: 'job', questionKey: 'recentJob', quote: `  ${first.text.replace(/ /g, '   ')} `, serviceId: 'owner-service:service-a', condition: 'not his words at all' },
    { type: 'tool', questionKey: 'turnedDown', quote: 'Tadiran boiler' },
    { type: 'job', questionKey: 'recentJob', quote: 'a hallucinated sentence he never wrote' },
    { type: 'credential', questionKey: 'recentJob', quote: first.text },
    { type: 'local', questionKey: 'areaPattern', quote: 'old buildings', serviceId: 'owner-service:invented' },
  ] });
};

const failingModel: ModelCall = async () => { throw new Error('timeout'); };

test('probe detector: generic claims alone probe; any concrete marker, or a long story, does not', () => {
  assert.ok(GENERIC_WORDS.length >= 3);
  assert.equal(isGenericOnlyAnswer(GENERIC), true);
  assert.equal(isGenericOnlyAnswer(`${GENERIC} 24/7`), false, 'digit');
  assert.equal(isGenericOnlyAnswer(`${GENERIC} Grohe`), false, 'brand');
  assert.equal(isGenericOnlyAnswer(`${GENERIC} ${LOCALITY}`), false, 'locality');
  assert.equal(isGenericOnlyAnswer(`${GENERIC} service-a`, { ownTerms: ['service-a'] }), false, 'own service name');
  assert.equal(isGenericOnlyAnswer(`${GENERIC} ${decode(TIME_WORD.source)[0]}`), false, 'time word');
  assert.equal(isGenericOnlyAnswer(Array(PROBE_MAX_WORDS + 1).fill(GENERIC_WORDS[0]).join(' ')), false, 'a long answer is a story');
  assert.equal(isGenericOnlyAnswer('nothing generic here'), false, 'no generic claim at all');
  assert.equal(isGenericOnlyAnswer(''), false);
});

test('probe fires once per question: the follow-up is accepted whatever it says, and never on the second pass', () => {
  const generic = (text: string) => isGenericOnlyAnswer(text);
  const first = applyInterviewAnswer(initialInterviewState(), { key: 'recentJob', text: GENERIC }, generic);
  assert.equal(first.kind, 'probe');
  if (first.kind !== 'probe') return;
  assert.equal(first.state.index, 0);
  assert.equal(first.state.probing, 'recentJob');
  // Still generic: accepted, the interview advances, the follow-up is kept apart from the first answer.
  const second = applyInterviewAnswer(first.state, { key: 'recentJob', text: GENERIC }, generic);
  assert.equal(second.kind, 'advanced');
  if (second.kind !== 'advanced') return;
  assert.deepEqual(second.state.answers.recentJob, { kind: 'text', text: GENERIC, followUp: GENERIC });
  assert.equal(second.state.index, 1);
  // Another question may still probe once; the second pass never does.
  assert.equal(applyInterviewAnswer(second.state, { key: 'turnedDown', text: GENERIC }, generic).kind, 'probe');
  const pass2 = { ...second.state, pass: 2 as const, index: 1 };
  assert.equal(applyInterviewAnswer(pass2, { key: 'turnedDown', text: GENERIC }, generic).kind, 'advanced');
  // An answer for another question than the current one is out of order.
  assert.equal(applyInterviewAnswer(second.state, { key: 'areaPattern', text: 'x' }, generic).kind, 'out_of_order');
  assert.ok(parseInterviewState(JSON.parse(JSON.stringify(second.state))));
});

test('quote rule: only exact (whitespace-normalised) substrings of his answers survive; condition / serviceId / type checked', () => {
  const sources = [{ key: 'recentJob' as const, part: 'answer' as const, text: STORY.recentJob }, { key: 'turnedDown' as const, part: 'answer' as const, text: STORY.turnedDown }];
  assert.equal(enforceQuote(`  ${STORY.recentJob.replace(/ /g, '\n  ')} `, sources)?.quote, STORY.recentJob);
  assert.equal(enforceQuote('Tadiran  boiler', sources, 'recentJob')?.source.key, 'turnedDown');
  assert.equal(enforceQuote('a hallucinated sentence', sources), null);
  assert.equal(enforceQuote('Tadiran boilers', sources), null, 'one letter more is not his words');
  assert.equal(enforceQuote('x', sources), null, 'too short');
  const facts = factsFromModel([
    { type: 'job', questionKey: 'recentJob', quote: STORY.recentJob, condition: 'invented condition', serviceId: 'owner-service:invented' },
    { type: 'job', questionKey: 'recentJob', quote: STORY.recentJob },
    { type: 'tool', questionKey: 'turnedDown', quote: 'Tadiran boiler', condition: '2 floors up', serviceId: 'owner-service:service-a' },
    { type: 'credential', questionKey: 'turnedDown', quote: 'Tadiran boiler' },
    { type: 'nonsense', quote: 'Tadiran boiler' },
    { type: 'job', quote: 'invented quote' },
    null, 'x', 42,
  ], sources, ['owner-service:service-a'], 1);
  assert.deepEqual(facts.map(fact => [fact.id, fact.type, fact.quote, fact.condition ?? null, fact.serviceId ?? null]), [
    ['a1-1', 'job', STORY.recentJob, null, null],
    ['a1-2', 'tool', 'Tadiran boiler', '2 floors up', 'owner-service:service-a'],
  ]);
  assert.ok(facts.every(fact => fact.status === 'pending' && fact.source.kind === 'answer'));
});

test('every ticked price chip is its own price_rule fact, its quote the chip label (built in code)', () => {
  const label = (chip: 'phoneEstimate' | 'afterVisit' | 'fixedList' | 'freeVisit' | 'paidVisit') => SITE_BOT_STEP2B_COPY[PRICE_CHIP_COPY_KEY[chip]];
  const facts = factsFromPriceChips(['afterVisit', 'freeVisit'], label);
  assert.deepEqual(facts.map(fact => [fact.id, fact.type, fact.quote]), [
    ['chip-aftervisit', 'price_rule', SITE_BOT_STEP2B_COPY.PRICE_CHIP_AFTER_VISIT],
    ['chip-freevisit', 'price_rule', SITE_BOT_STEP2B_COPY.PRICE_CHIP_FREE_VISIT],
  ]);
});

test('confirm / fix / remove: each fact reviewed once or again; an edited fact keeps its quote plus his text', () => {
  const at = new Date(T0);
  const fact = (id: string): InterviewFact => ({ id, type: 'job', quote: `quote ${id}`, status: 'pending', source: { kind: 'answer', questionKey: 'recentJob', part: 'answer' } });
  let set: InterviewFactSet = { version: 1, answersVersion: 1, extractedAt: at.toISOString(), extraction: 'model', facts: [fact('a1-1'), fact('a1-2'), fact('a1-3')] };
  assert.equal(allFactsReviewed(set), false);
  set = reviewFact(set, 'a1-1', { decision: 'confirm' }, at)!;
  set = reviewFact(set, 'a1-2', { decision: 'fix', text: 'his own words' }, at)!;
  assert.equal(allFactsReviewed(set), false);
  set = reviewFact(set, 'a1-3', { decision: 'remove' }, at)!;
  assert.deepEqual(set.facts.map(item => item.status), ['confirmed', 'edited', 'removed']);
  assert.equal(set.facts[1].quote, 'quote a1-2');
  assert.equal(set.facts[1].ownerText, 'his own words');
  // Confirming the edited fact keeps it edited (the shown text is already his); a removed one can come back.
  assert.equal(reviewFact(set, 'a1-2', { decision: 'confirm' }, at)!.facts[1].status, 'edited');
  assert.equal(reviewFact(set, 'a1-3', { decision: 'confirm' }, at)!.facts[2].status, 'confirmed');
  assert.equal(allFactsReviewed(set), true);
  assert.equal(reviewFact(set, 'a9-9', { decision: 'confirm' }, at), null, 'an unknown id changes nothing');
});

test('privacy and cost: contact strings and phone / email shapes never reach the model; usage is priced per attempt', async () => {
  assert.equal(redactForModel('call 052-123-4567 or owner@example.com, me Dana', ['Dana']), 'call [redacted] or [redacted], me [redacted]');
  assert.equal(redactForModel('a 40 minute job, 2 floors', []), 'a 40 minute job, 2 floors');
  assert.ok(Math.abs(flashCostUsd({ inputTokens: 1_000_000, outputTokens: 0 }, new Date(T0)) - 0.75) < 1e-9);
  assert.ok(Math.abs(flashCostUsd({ inputTokens: 0, outputTokens: 500_000, thinkingTokens: 500_000 }, new Date('2027-02-01T00:00:00Z')) - 7.5) < 1e-9);
  let calls = 0;
  const outcome = await extractFactCandidates(
    { trade: 't', services: [], sources: [{ key: 'recentJob', part: 'answer', text: 'job' }], redact: [] },
    { call: async (_s, _u, options) => { calls += 1; options.onUsage({ inputTokens: 10, outputTokens: 5 }, 'gemini-3.8-flash'); throw new Error('bad'); }, now: () => new Date(T0), recordId: 'r' },
  );
  assert.equal(outcome.ok, false);
  assert.equal(calls, 2, 'one retry, then the caller falls back');
  assert.equal(outcome.usage.length, 2);
  assert.ok(outcome.usage.every(row => row.provider === 'gemini' && row.operation === 'interview_facts' && (row.estimatedCostUsd ?? 0) > 0));
});

test('resume mid-questions: a reload (interview-start with the cookie) lands on the same question, probe state kept', async () => {
  const h = harness(quotingModel);
  try {
    const cookie = await startThroughHolding(h);
    const holding = await interviewStep(cookie, { step: 'status' }, h.deps);
    assert.equal((holding as { view: { phase: string } }).view.phase, 'holding');
    // An answer before HOLDING_CTA is out of order.
    assert.equal((await interviewStep(cookie, { step: 'answer', key: 'recentJob', text: 'x' }, h.deps)).kind, 'out_of_order');
    assert.equal((await interviewStep(cookie, { step: 'questions_begin' }, h.deps)).kind, 'ok');
    await answer(h, cookie, { key: 'recentJob', text: STORY.recentJob });
    const probed = await answer(h, cookie, { key: 'turnedDown', text: GENERIC });
    assert.equal(probed.questions?.probing, true);
    assert.equal(probed.questions?.key, 'turnedDown');
    const resumed = await startInterview({ auditId, placeId: PLUMBER, cookieValue: cookie }, h.deps);
    assert.equal(resumed.kind, 'session');
    const view = (resumed as Extract<typeof resumed, { kind: 'session' }>).view;
    assert.equal(view.phase, 'questions');
    assert.equal(view.questions?.index, 1);
    assert.equal(view.questions?.probing, true);
    assert.equal(view.questions?.drafts.recentJob, STORY.recentJob);
    // Replaying the first answer is out of order (no double advance); oversized and unknown input refused.
    assert.equal((await interviewStep(cookie, { step: 'answer', key: 'recentJob', text: 'again' }, h.deps)).kind, 'out_of_order');
    assert.equal((await interviewStep(cookie, { step: 'answer', key: 'turnedDown', text: 'x'.repeat(1501) }, h.deps)).kind, 'invalid_input');
    assert.equal((await interviewStep(cookie, { step: 'answer', key: 'priceStyle', chips: ['invented'] }, h.deps)).kind, 'invalid_input');
    // The follow-up is accepted even if generic; the price question then takes chips only.
    const after = await answer(h, cookie, { key: 'turnedDown', text: GENERIC });
    assert.equal(after.questions?.key, 'callerQuestion');
    assert.equal(after.questions?.probing, false);
    await answer(h, cookie, { key: 'callerQuestion', skip: true });
    assert.equal((await interviewStep(cookie, { step: 'answer', key: 'priceStyle', text: 'free text' }, h.deps)).kind, 'invalid_input');
    await answer(h, cookie, { key: 'priceStyle', chips: ['paidVisit'] });
    const last = await answer(h, cookie, { key: 'areaPattern', text: STORY.areaPattern });
    assert.equal(last.phase, 'gates');
    const stored = readInterviewSession(h.store, parseInterviewCookie(cookie)!.id)!;
    assert.equal(stored.answersVersion, 1);
    assert.deepEqual(stored.interviewState?.answers.turnedDown, { kind: 'text', text: GENERIC, followUp: GENERIC });
    assert.deepEqual(stored.interviewState?.answers.callerQuestion, { kind: 'skipped' });
    assert.equal(INTERVIEW_QUESTION_KEYS.length, 5);
  } finally { h.close(); }
});

test('gates step: waits for the research to settle, answers by plain text on the server, then moves to facts', async () => {
  const h = harness(quotingModel);
  try {
    // A research that never records its end (the process stopped): pending until RESEARCH_SETTLE_MS, then settled.
    const started = await startInterview({ auditId, placeId: PLUMBER, cookieValue: undefined }, { ...h.deps, startResearch: session => {
      h.store.db.prepare('UPDATE site_bot_interview_sessions SET research_id = id, research_started_at = ? WHERE id = ?').run(new Date(T0).toISOString(), session.id);
    } });
    const cookie = (started as Extract<typeof started, { kind: 'session' }>).cookie!;
    const stuck = { ...h.deps, startResearch: (session: { id: string }) => {
      h.store.db.prepare('UPDATE site_bot_interview_sessions SET research_id = id, research_started_at = ? WHERE id = ?').run(new Date(T0).toISOString(), session.id);
    } } as InterviewDeps;
    await interviewStep(cookie, { step: 'contact', collectedData: collected() }, stuck);
    await interviewStep(cookie, { step: 'domain', owner: { domainChoice: 'no_domain' } }, stuck);
    await answerAll(h, cookie);
    const id = parseInterviewCookie(cookie)!.id;
    assert.equal((await interviewGates(cookie, { action: 'list' }, h.gatesDeps)).status, 409);
    assert.equal((await interviewStep(cookie, { step: 'gates_done' }, h.deps)).kind, 'out_of_order');
    h.advance(RESEARCH_SETTLE_MS);
    assert.ok(await writeResearchDossierAtomic(id, dossierFor(id), h.researchBaseDir));
    const { recordOwnerResearchGates } = await import('./research/ownerGates');
    const { deriveOpenResearchGates } = await import('./research/gates');
    await recordOwnerResearchGates(id, deriveOpenResearchGates(id, { primaryService: 'x' }), { baseDir: h.researchBaseDir, now: h.deps.now });
    const list = await interviewGates(cookie, { action: 'list' }, h.gatesDeps);
    assert.equal(list.status, 200);
    const gate = (list.body.gates as Array<{ id: string; type: string; evidenceDigest: string }>).find(item => item.type === 'business_boundary')!;
    assert.deepEqual(await interviewGates(cookie, { action: 'answer', gateId: gate.id, evidenceDigest: gate.evidenceDigest, text: 'service-b, service-c' }, h.gatesDeps), { status: 200, body: { status: 'approved' } });
    assert.equal((await interviewGates(cookie, { action: 'answer', gateId: 'nope', evidenceDigest: 'x', text: 'y' }, h.gatesDeps)).status, 404);
    await throughGates(h, cookie);
  } finally { h.close(); }
});

test('facts: one model call per answer set, hallucinated quotes dropped, chips + credentials as code facts, cost in providerUsage', async () => {
  const h = harness(quotingModel);
  try {
    const cookie = await startThroughHolding(h, PLUMBER, { yearsInField: '12', guarantee: 'no warranty' });
    await answerAll(h, cookie);
    // Before the gates step is over, the facts route refuses.
    assert.equal((await interviewFacts(cookie, { action: 'load' }, h.factsDeps)).status, 409);
    await throughGates(h, cookie);
    const loaded = await interviewFacts(cookie, { action: 'load' }, h.factsDeps);
    assert.equal(loaded.status, 200, JSON.stringify(loaded.body));
    const facts = loaded.body.facts as Array<InterviewFact & { serviceName?: string; contextLabel?: string }>;
    assert.deepEqual(facts.map(fact => [fact.id, fact.type]), [
      ['a1-1', 'job'], ['a1-2', 'tool'], ['a1-3', 'local'], ['chip-aftervisit', 'price_rule'], ['chip-freevisit', 'price_rule'], ['cred-years', 'credential'],
    ]);
    assert.equal(facts[0].quote, STORY.recentJob);
    assert.equal(facts[0].condition, undefined, 'a condition that is not his words is dropped');
    assert.equal(facts[0].serviceName, 'service-a');
    assert.equal(facts[2].serviceId, undefined, 'an invented service id is dropped');
    assert.ok(!facts.some(fact => /hallucinated/.test(fact.quote)));
    assert.equal(facts[5].quote, '12');
    assert.ok(facts[5].contextLabel);
    assert.equal(loaded.body.extraction, 'model');
    // The model never saw the owner's phone or email.
    assert.equal(h.modelCalls.length, 1);
    assert.doesNotMatch(h.modelCalls[0], /0521234567|owner@example\.com/);
    // A reload reads the stored set: no second call.
    assert.equal((await interviewFacts(cookie, { action: 'load' }, h.factsDeps)).status, 200);
    assert.equal(h.modelCalls.length, 1);
    const id = parseInterviewCookie(cookie)!.id;
    const dossier = (await readResearchDossier(id, h.researchBaseDir, { bounded: true }))!;
    assert.equal(dossier.interviewFacts?.answersVersion, 1);
    const usage = dossier.providerUsage.filter(row => row.operation === 'interview_facts');
    assert.equal(usage.length, 1);
    assert.ok((usage[0].estimatedCostUsd ?? 0) > 0);

    // Review: FACTS_DONE is refused while any fact is pending.
    assert.equal((await interviewFacts(cookie, { action: 'done' }, h.factsDeps)).status, 409);
    for (const fact of facts) {
      const decision = fact.id === 'a1-2' ? { decision: 'fix', text: 'his correction' } : fact.id === 'a1-3' ? { decision: 'remove' } : { decision: 'confirm' };
      assert.equal((await interviewFacts(cookie, { action: 'review', factId: fact.id, ...decision }, h.factsDeps)).status, 200);
    }
    const reviewed = (await readResearchDossier(id, h.researchBaseDir, { bounded: true }))!.interviewFacts!;
    assert.equal(reviewed.facts.find(fact => fact.id === 'a1-2')!.status, 'edited');
    assert.equal(reviewed.facts.find(fact => fact.id === 'a1-2')!.ownerText, 'his correction');
    assert.equal(reviewed.facts.find(fact => fact.id === 'a1-2')!.quote, 'Tadiran boiler');
    assert.equal(reviewed.facts.find(fact => fact.id === 'a1-3')!.status, 'removed');
    const done = await interviewFacts(cookie, { action: 'done' }, h.factsDeps);
    assert.deepEqual(done, { status: 200, body: { phase: 'facts_confirmed' } });
    assert.equal((await interviewStep(cookie, { step: 'status' }, h.deps)).kind, 'ok');
    assert.ok((await readResearchDossier(id, h.researchBaseDir, { bounded: true }))!.interviewFacts!.confirmedAt);
    // After FACTS_DONE the set is read-only.
    assert.equal((await interviewFacts(cookie, { action: 'review', factId: 'a1-1', decision: 'remove' }, h.factsDeps)).status, 409);
    assert.equal((await interviewFacts(cookie, { action: 'load' }, h.factsDeps)).status, 200);
  } finally { h.close(); }
});

test('cross-session: another session\'s cookie, a crafted cookie or a body naming a research never reach these facts', async () => {
  const h = harness(quotingModel);
  try {
    const a = await startThroughHolding(h, PLUMBER);
    const b = await startThroughHolding(h, PLUMBER2);
    for (const cookie of [a, b]) { await answerAll(h, cookie); await throughGates(h, cookie); }
    const factsA = (await interviewFacts(a, { action: 'load' }, h.factsDeps)).body.facts as InterviewFact[];
    const idA = parseInterviewCookie(a)!.id;
    // B's cookie reviews only B's set: A's fact ids that B's set lacks are 404; same-named ids act on B's own facts.
    const onlyInA = factsA.find(fact => fact.id === 'chip-freevisit')!;
    await interviewFacts(b, { action: 'load' }, h.factsDeps);
    const crafted = `${idA}.${'Z'.repeat(43)}`;
    for (const bad of [crafted, 'garbage', undefined]) {
      assert.equal((await interviewFacts(bad, { action: 'load' }, h.factsDeps)).status, 401);
      assert.equal((await interviewFacts(bad, { action: 'review', factId: onlyInA.id, decision: 'remove' }, h.factsDeps)).status, 401);
    }
    assert.equal((await interviewFacts(b, { action: 'load', researchId: idA }, h.factsDeps)).status, 400);
    assert.equal((await interviewFacts(b, { action: 'review', factId: 'a1-99', decision: 'remove' }, h.factsDeps)).status, 404);
    assert.equal((await interviewFacts(b, { action: 'review', factId: '../x', decision: 'remove' }, h.factsDeps)).status, 400);
    assert.equal((await interviewFacts(b, { action: 'review', factId: 'a1-1', decision: 'remove' }, h.factsDeps)).status, 200);
    const setA = (await readResearchDossier(idA, h.researchBaseDir, { bounded: true }))!.interviewFacts!;
    assert.ok(setA.facts.every(fact => fact.status === 'pending'), 'B never changed A');
  } finally { h.close(); }
});

test('model failure: one retry, then the code-only facts (chips + credentials); with none, FACTS_EMPTY and one return', async () => {
  const h = harness(failingModel);
  try {
    const withChips = await startThroughHolding(h, PLUMBER, { yearsInField: '7' });
    await answerAll(h, withChips, ['phoneEstimate']);
    await throughGates(h, withChips);
    const loaded = await interviewFacts(withChips, { action: 'load' }, h.factsDeps);
    assert.equal(loaded.status, 200);
    assert.equal(loaded.body.extraction, 'code_only');
    assert.deepEqual((loaded.body.facts as InterviewFact[]).map(fact => fact.id), ['chip-phoneestimate', 'cred-years']);
    assert.equal(h.modelCalls.length, 2);

    // No chips, no credentials, the model fails: zero usable facts -> FACTS_EMPTY with the way back, once.
    const empty = await startThroughHolding(h, PLUMBER2);
    await answerAll(h, empty, []);
    await throughGates(h, empty);
    const first = await interviewFacts(empty, { action: 'load' }, h.factsDeps);
    assert.equal(first.body.empty, true);
    assert.equal(first.body.canReturn, true);
    assert.equal(first.body.canFinish, false);
    assert.equal((await interviewFacts(empty, { action: 'done' }, h.factsDeps)).status, 409);
    assert.deepEqual(await interviewFacts(empty, { action: 'return' }, h.factsDeps), { status: 200, body: { phase: 'questions' } });
    // Second pass: question 1 again, his answers pre-filled, no probe, a new answer-set version.
    const status = await interviewStep(empty, { step: 'status' }, h.deps);
    const view = (status as { view: { phase: string; questions: InterviewQuestionsView } }).view;
    assert.equal(view.questions.pass, 2);
    assert.equal(view.questions.index, 0);
    assert.equal(view.questions.drafts.recentJob, STORY.recentJob);
    await answer(h, empty, { key: 'recentJob', text: GENERIC });
    await answer(h, empty, { key: 'turnedDown', skip: true });
    await answer(h, empty, { key: 'callerQuestion', skip: true });
    await answer(h, empty, { key: 'priceStyle', skip: true });
    const last = await answer(h, empty, { key: 'areaPattern', skip: true });
    // The gates step is already done: straight to facts.
    assert.equal(last.phase, 'facts');
    const calls = h.modelCalls.length;
    const second = await interviewFacts(empty, { action: 'load' }, h.factsDeps);
    assert.equal(h.modelCalls.length, calls + 2, 'the one re-run after the return (one retry)');
    assert.equal(second.body.empty, true);
    assert.equal(second.body.canReturn, false, 'no second return');
    assert.equal(second.body.canFinish, true, 'the second pass accepts whatever comes');
    assert.equal((await interviewFacts(empty, { action: 'return' }, h.factsDeps)).status, 409);
    assert.deepEqual(await interviewFacts(empty, { action: 'done' }, h.factsDeps), { status: 200, body: { phase: 'facts_confirmed' } });
    // No third extraction, ever.
    await interviewFacts(empty, { action: 'load' }, h.factsDeps);
    assert.equal(h.modelCalls.length, calls + 2);
  } finally { h.close(); }
});

test('the extraction runs in the background: the claiming load and every load meanwhile answer 409 extracting', async () => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const h = harness(async (system, user, options) => { await gate; return quotingModel(system, user, options); });
  try {
    const cookie = await startThroughHolding(h);
    await answerAll(h, cookie);
    await throughGates(h, cookie);
    assert.deepEqual(await rawInterviewFacts(cookie, { action: 'load' }, h.factsDeps), { status: 409, body: { error: 'extracting' } });
    assert.deepEqual(await rawInterviewFacts(cookie, { action: 'load' }, h.factsDeps), { status: 409, body: { error: 'extracting' } });
    release();
    await inFlightFactExtraction(parseInterviewCookie(cookie)!.id);
    const loaded = await rawInterviewFacts(cookie, { action: 'load' }, h.factsDeps);
    assert.equal(loaded.status, 200);
    assert.equal(h.modelCalls.length, 1);
  } finally { h.close(); }
});

test('a claimed extraction that never stored a set is taken over with the code-only facts after the stale window', async () => {
  const h = harness(quotingModel);
  try {
    const cookie = await startThroughHolding(h);
    await answerAll(h, cookie, ['fixedList']);
    await throughGates(h, cookie);
    const id = parseInterviewCookie(cookie)!.id;
    h.store.db.prepare('UPDATE site_bot_interview_sessions SET facts_extracted_version = answers_version, facts_claimed_at = ? WHERE id = ?').run(new Date(T0).toISOString(), id);
    assert.deepEqual(await interviewFacts(cookie, { action: 'load' }, h.factsDeps), { status: 409, body: { error: 'extracting' } });
    h.advance(5 * 60 * 1000 - 1);
    assert.equal((await interviewFacts(cookie, { action: 'load' }, h.factsDeps)).status, 409);
    h.advance(1);
    const taken = await interviewFacts(cookie, { action: 'load' }, h.factsDeps);
    assert.equal(taken.status, 200);
    assert.equal(taken.body.extraction, 'code_only');
    assert.deepEqual((taken.body.facts as InterviewFact[]).map(fact => fact.id), ['chip-fixedlist']);
    assert.equal(h.modelCalls.length, 0);
  } finally { h.close(); }
});

test('the launch store migration adds the step-2b columns to a step-2a sessions table', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'launch-migrate-2b-'));
  const file = path.join(dir, 'launch.sqlite');
  try {
    const first = openLaunchStore(file);
    first.db.exec('DROP TABLE site_bot_interview_sessions');
    first.db.exec(`CREATE TABLE site_bot_interview_sessions (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, place_id TEXT NOT NULL,
      audit_id TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, closed_at TEXT, progress_json TEXT,
      collected_json TEXT, business_name TEXT, owner_email TEXT, contact_at TEXT, domain_at TEXT, location_trade TEXT, work_location TEXT,
      research_id TEXT, research_started_at TEXT, reminder_sent_at TEXT, checkout_session_id TEXT)`);
    first.db.close();
    const second = openLaunchStore(file);
    const columns = (second.db.prepare('PRAGMA table_info(site_bot_interview_sessions)').all() as Array<{ name: string }>).map(column => column.name);
    for (const name of ['research_done_at', 'interview_json', 'interview_done_at', 'answers_version', 'gates_done_at', 'facts_extracted_version', 'facts_claimed_at', 'facts_returns', 'facts_confirmed_at']) {
      assert.ok(columns.includes(name), name);
    }
    second.db.close();
    void HOUR;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
