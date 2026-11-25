// Site Bot step 2c: the home-page preview and the handoff to payment, on a REAL launch store (temp SQLite), a REAL
// research store (temp dir, fixture research providers) and the REAL researched generation path with an injected page
// writer: one generation per round and one regeneration after the one fix round, the first-screen fact rule (a)-(e),
// title / H1 identical to a no-facts run, the work-location framing, the preview access control and frame headers,
// checkout init's preview requirement, the post-payment run (homepage reused, the rest generated, no deploy without the
// approved review packet), and the failure path with its staff alert.
// HEBREW-SAFETY: zero Hebrew bytes. Answers are Latin; place names are read at runtime from the locality list.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import { META_DESCRIPTION_MAX_CHARS } from '../lp/coreThirtyCopy';
import {
  homepageMetaDescription, pageNameWithCity, RESEARCHED_META_DESCRIPTION_MAX_CHARS, renderResearchedSitePages, researchedPageH1,
  researchedPageTitle,
} from '../lp/researchedSite';
import { buildNoaQaMessage, firstScreenEditorNote, firstScreenRule, PROMPT_V2_SYSTEM_PROMPTS } from '../lp/researchPageCopy';
import type { AuditCandidateSnapshot, AuditRecord } from './auditStore';
import type { MailTransport, OutgoingEmail } from './clientMessageEmail';
import { claimInterviewStart, type OfferDeps } from './offerState';
import { openLaunchStore, type LaunchStore } from './launchStore';
import { interviewStep, startInterview, type InterviewDeps } from './interviewFlow';
import { inFlightInterviewResearch, startInterviewResearch } from './interviewResearch';
import {
  claimPreviewRound, markInterviewPaid, parseInterviewCookie, parseSpotTtlMs, previewReady, readInterviewSession, PREVIEW_MAX_ROUNDS,
} from './interviewSession';
import { inFlightFactExtraction, interviewFacts as rawInterviewFacts, type InterviewFactsDeps } from './interviewFactsFlow';
import type { ModelCall } from './factExtraction';
import {
  ensurePreview, inFlightPreview, inFlightSiteGeneration, interviewPreview, previewForFrame, startSiteGeneration, staffRetry,
  type PreviewDeps,
} from './interviewPreview';
import { anchorExclusions, subheadlineCarriesFact, usableFacts } from './firstScreenFact';
import { SITE_BOT_OWNER_QUOTE_COPY } from './ownerQuoteCopy.generated';
import { frameWorkLocation, interviewGenerationData, workLocationConstraint } from './interviewGeneration';
import { ISRAELI_LOCALITIES } from './israeliLocalities';
import {
  copyEventLine, fixtureCopyWriter, gateSubheadlinePerson, generatePreviewHomepage, generateRemainingPages, readPreviewRecord, SUBHEADLINE_PERSON_REPAIR_SYSTEM,
  type PreviewGenerationOutcome,
} from './previewGeneration';
import { isTradeOrPlaceName } from './researchToSite';
import { SUBJECT_CARRY_TOKENS } from '../lp/generationData';
import { assertPreviewInert, PREVIEW_FRAME_HEADERS, previewFrameHtml } from './previewFrame';
import { PREVIEW_IFRAME_SANDBOX } from './previewFrameSandbox';
import { fixtureResearchProviders } from './research/fixtureProviders';
import { buildSiteResearchInput } from './research/researchInput';
import { readResearchDossier } from './research/researchStore';
import { runSiteResearch } from './research/runResearch';
import type { PageBrief } from './research/pageBrief';
import { buildPageBriefs } from './researchToSite';
import { researchedRenderInputs } from './researchToSite';
import { SITE_BOT_STEP2C_COPY } from './step2cCopy.generated';
import { payCtaSub } from './step2cCopy';
import { answerTexts } from './interviewQuestions';

const T0 = Date.parse('2026-12-01T08:00:00.000Z');
const auditId = '123e4567-e89b-42d3-a456-426614174000';
const PLACE = 'ChIJ-step2c-0001';
const PLACE2 = 'ChIJ-step2c-0002';

const candidate = (placeId: string): AuditCandidateSnapshot => ({
  placeId, displayName: 'Step2c Plumbing', formattedAddress: '1 Herzl Street, Holon', types: ['plumber'], primaryType: 'plumber',
  businessStatus: 'OPERATIONAL', hasRegularOpeningHours: true, hasSpecialOpeningHours: false, hasPhone: true, hasWebsite: false,
  photosFetched: true, photoCount: 3, hasRating: true, userRatingCount: 9, hasEditorialSummary: false,
});
const CANDIDATES = [candidate(PLACE), candidate(PLACE2)];

function collected(over: Partial<CollectedData> = {}): CollectedData {
  return {
    businessName: 'Step2c Plumbing', businessNiche: 'plumber', primaryService: 'leak detection', secondaryServices: 'drain unblocking',
    priorityServices: ['leak detection', 'drain unblocking'], serviceModel: 'field', targetLocation: 'Holon', specificCities: 'Holon, Bat Yam',
    travelBoundary: '15 km from Holon', usp: 'Camera leak detection, two-year warranty', yearsInField: '12', phone: '050-0000000',
    ownerContact: { mobile: '0521234567', email: 'owner@example.com' }, preferredSlug: 'step2c-plumbing', ...over,
  };
}

const ANSWERS = {
  recentJob: 'Replaced a burst Grohe mixer under the kitchen sink in an old building, two hours start to finish',
  turnedDown: 'Refused a rooftop boiler job without a safety harness and passed it to a friend',
  callerQuestion: 'Everyone asks if I can come today and I usually arrive within 40 minutes',
  areaPattern: 'Old buildings with galvanised pipes that burst every winter',
};

/** Quotes three answers verbatim (job, tool, number) and the refusal. */
const factsModel: ModelCall = async (_system, user, options) => {
  const parsed = JSON.parse(user) as { answers: Array<{ questionKey: string; text: string }> };
  const text = (key: string) => parsed.answers.find(item => item.questionKey === key)!.text;
  options.onUsage({ inputTokens: 100, outputTokens: 10 }, 'fixture');
  return JSON.stringify({ facts: [
    { type: 'job', questionKey: 'recentJob', quote: text('recentJob').split(',')[0] },
    { type: 'refusal', questionKey: 'turnedDown', quote: text('turnedDown') },
    { type: 'tool', questionKey: 'recentJob', quote: 'Grohe mixer' },
    { type: 'number', questionKey: 'callerQuestion', quote: 'I usually arrive within 40 minutes' },
  ] });
};

interface Sent { emails: OutgoingEmail[] }

function harness(options: { generate?: PreviewDeps['generate']; failFirst?: number } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'step2c-'));
  const researchBaseDir = path.join(dir, 'site-research');
  const sitesRoot = path.join(dir, 'sites');
  let nowMs = T0;
  const now = () => new Date(nowMs);
  const store = openLaunchStore(path.join(dir, 'launch.sqlite'), now);
  const withStore = <T>(fn: (s: LaunchStore) => T, fallback: T): T => { try { return fn(store); } catch { return fallback; } };
  const offerDeps: OfferDeps = {
    gateOpen: async () => true, withStore, limits: () => ({ total: 10, weekly: 10 }),
    readAudit: async (id: string): Promise<AuditRecord | null> => (id === auditId
      ? { auditId: id, query: { businessName: 'x' }, fetchedAt: '2026-12-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', candidates: CANDIDATES }
      : null),
  };
  const findCandidate = async (_a: string, p: string) => CANDIDATES.find(c => c.placeId === p) ?? null;
  const deps: InterviewDeps = {
    withStore, claimSpot: (a, p) => claimInterviewStart(a, p, offerDeps), findCandidate,
    categoryOf: () => 'gcid:plumber', categoryOfNiche: () => 'gcid:plumber', normalizeCollected: data => data,
    startResearch: session => {
      startInterviewResearch(session, {
        withStore,
        run: async (id, data) => {
          await runSiteResearch(id, buildSiteResearchInput(`interview:${id}`, data, now, id), { now, baseDir: researchBaseDir, providers: fixtureResearchProviders() });
        },
        log: () => undefined,
      });
    },
    alertWaitlist: () => undefined, ttlMs: parseSpotTtlMs({}), now,
  };
  const sent: Sent = { emails: [] };
  const mail: MailTransport = async email => { sent.emails.push(email); return 'stubbed'; };
  const generations: Array<{ round: number; answersVersion: number }> = [];
  let failures = options.failFirst ?? 0;
  const generate: PreviewDeps['generate'] = options.generate ?? (async (input, signal) => {
    generations.push({ round: input.round, answersVersion: input.answersVersion });
    if (failures > 0) { failures -= 1; return { ok: false, reason: 'copy_validation_failed', usage: [] }; }
    return generatePreviewHomepage(input, { now, researchBaseDir, mode: 'fixture', signal });
  });
  const previewDeps: PreviewDeps = {
    withStore, now, findCandidate, generate,
    generateSite: (preview, signal) => generateRemainingPages(preview, { now, researchBaseDir, sitesRoot, mode: 'fixture', signal, checkPlaceId: null }),
    researchBaseDir, mail, timeoutMs: 60_000, staleMs: 10 * 60_000,
    env: { NODE_ENV: 'test', CLIENT_PORTAL_SECRET: 'step2c-test-secret', NEXT_PUBLIC_SITE_URL: 'https://www.wao.co.il' }, log: () => undefined,
  };
  const factsDeps: InterviewFactsDeps = {
    withStore, now, researchBaseDir, modelCall: factsModel,
    onConfirmed: session => ensurePreview(session, previewDeps),
  };
  return {
    dir, store, deps, previewDeps, factsDeps, researchBaseDir, sitesRoot, sent, generations, now,
    advance: (ms: number) => { nowMs += ms; },
    close: () => { store.db.close(); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}
type H = ReturnType<typeof harness>;

async function facts(h: H, cookie: string, body: Record<string, unknown>) {
  const first = await rawInterviewFacts(cookie, body, h.factsDeps);
  if (body.action !== 'load' || first.status !== 409) return first;
  await inFlightFactExtraction(parseInterviewCookie(cookie)!.id);
  return rawInterviewFacts(cookie, body, h.factsDeps);
}

/** start -> contact -> domain -> 5 answers -> gates -> facts (reviewed by `review`) -> FACTS_DONE. Returns the cookie. */
async function throughFacts(h: H, options: { placeId?: string; over?: Partial<CollectedData>; review?: (id: string, type: string) => Record<string, unknown>; answers?: typeof ANSWERS } = {}): Promise<string> {
  const answers = options.answers ?? ANSWERS;
  const started = await startInterview({ auditId, placeId: options.placeId ?? PLACE, cookieValue: undefined }, h.deps);
  assert.equal(started.kind, 'session');
  const cookie = (started as Extract<typeof started, { kind: 'session' }>).cookie!;
  assert.equal((await interviewStep(cookie, { step: 'contact', collectedData: collected(options.over) }, h.deps)).kind, 'ok');
  assert.equal((await interviewStep(cookie, { step: 'domain', owner: { domainChoice: 'no_domain' } }, h.deps)).kind, 'ok');
  await inFlightInterviewResearch(parseInterviewCookie(cookie)!.id);
  assert.equal((await interviewStep(cookie, { step: 'questions_begin' }, h.deps)).kind, 'ok');
  for (const key of ['recentJob', 'turnedDown', 'callerQuestion'] as const) assert.equal((await interviewStep(cookie, { step: 'answer', key, text: answers[key] }, h.deps)).kind, 'ok');
  assert.equal((await interviewStep(cookie, { step: 'answer', key: 'priceStyle', chips: ['afterVisit'] }, h.deps)).kind, 'ok');
  assert.equal((await interviewStep(cookie, { step: 'answer', key: 'areaPattern', text: answers.areaPattern }, h.deps)).kind, 'ok');
  assert.equal((await interviewStep(cookie, { step: 'gates_done' }, h.deps)).kind, 'ok');
  const loaded = await facts(h, cookie, { action: 'load' });
  assert.equal(loaded.status, 200, JSON.stringify(loaded.body));
  for (const fact of loaded.body.facts as Array<{ id: string; type: string }>) {
    const decision = options.review?.(fact.id, fact.type) ?? { decision: 'confirm' };
    assert.equal((await facts(h, cookie, { action: 'review', factId: fact.id, ...decision })).status, 200);
  }
  const done = await facts(h, cookie, { action: 'done' });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  return cookie;
}

async function settle(cookie: string) {
  await inFlightPreview(parseInterviewCookie(cookie)!.id);
}

const sessionOf = (h: H, cookie: string) => readInterviewSession(h.store, parseInterviewCookie(cookie)!.id)!;

// ---------------------------------------------------------------------------------------------------------------------
// Pure rules

const LOCALS = ISRAELI_LOCALITIES.filter(item => item.he_name.length >= 3).slice(0, 2);
// Hebrew answers for the quote-line flow: the 2026-11-25 synthetic plumber's facts (step2cFactRules.test.ts), as escapes.
const HE_REFUSAL = '\u05DC\u05E4\u05E0\u05D9 \u05D7\u05D5\u05D3\u05E9 \u05DE\u05D9\u05E9\u05D4\u05D5 \u05E8\u05E6\u05D4 \u05E9\u05D0\u05D7\u05D1\u05E8 \u05DC\u05D5 \u05D0\u05EA \u05D4\u05DE\u05D8\u05D1\u05D7 \u05D4\u05D7\u05D3\u05E9 \u05D1\u05DC\u05D9 \u05D1\u05E8\u05D6 \u05E0\u05D9\u05EA\u05D5\u05E7';
const HE_REFUSAL_CUT = HE_REFUSAL.split(' ').slice(2).join(' ');
const HE_ANSWERS = { ...ANSWERS, turnedDown: HE_REFUSAL };
/** The 2026-11-25 live Gemini preview's first-person subheadline (the verifier's rule (a) FAIL), byte-exact as escapes. */
const LIVE_SUB = '\u05D0\u05E0\u05D9 \u05DE\u05D0\u05EA\u05E8 \u05D0\u05EA \u05DE\u05E7\u05D5\u05E8 \u05D4\u05E8\u05D8\u05D9\u05D1\u05D5\u05EA \u05D1\u05D7\u05D9\u05D1\u05D5\u05E8\u05D9 \u05D4\u05E6\u05E0\u05E8\u05EA \u05D5\u05DE\u05E9\u05D0\u05D9\u05E8 \u05D1\u05D9\u05EA \u05D9\u05D1\u05E9 \u05D5\u05EA\u05E7\u05D9\u05DF';
/** The same sentence without its subject pronoun (person-neutral present tense). */
const LIVE_SUB_NEUTRAL = LIVE_SUB.split(' ').slice(1).join(' ');

test('fact statuses: pending and removed never; edited uses his ownerText (and drops the original condition)', () => {
  const set = {
    version: 1 as const, answersVersion: 1, extractedAt: '2026-12-01T00:00:00Z', extraction: 'model' as const, facts: [
      { id: 'a1-1', type: 'job' as const, quote: 'q1', status: 'confirmed' as const, condition: 'on weekdays', source: { kind: 'answer' as const, questionKey: 'recentJob' as const, part: 'answer' as const } },
      { id: 'a1-2', type: 'job' as const, quote: 'q2', status: 'edited' as const, ownerText: 'his text', condition: 'c', source: { kind: 'answer' as const, questionKey: 'recentJob' as const, part: 'answer' as const } },
      { id: 'a1-3', type: 'tool' as const, quote: 'q3', status: 'pending' as const, source: { kind: 'answer' as const, questionKey: 'recentJob' as const, part: 'answer' as const } },
      { id: 'a1-4', type: 'tool' as const, quote: 'q4', status: 'removed' as const, source: { kind: 'answer' as const, questionKey: 'recentJob' as const, part: 'answer' as const } },
    ],
  };
  assert.deepEqual(usableFacts(set), [
    { id: 'a1-1', type: 'job', text: 'q1', condition: 'on weekdays', questionKey: 'recentJob' },
    { id: 'a1-2', type: 'job', text: 'his text', edited: true, questionKey: 'recentJob' },
  ]);
});

test('rule (a) watch: the carry check finds fact words in a subheadline (and its condition); anchor words never count', () => {
  const exclude = anchorExclusions('plumber', 'Holon', 'Step2c Plumbing');
  const job = { text: 'replaced a burst Grohe mixer under the sink' };
  assert.equal(subheadlineCarriesFact('I replaced a burst Grohe mixer in two hours', job, exclude), true);
  assert.equal(subheadlineCarriesFact('A plumber in Holon you can trust', job, exclude), false);
  assert.equal(subheadlineCarriesFact('Plumber Holon', { text: 'plumber in Holon' }, exclude), false, 'anchor-only fact never counts');
  assert.equal(subheadlineCarriesFact('I arrive within 40 minutes', { text: 'arrive within 40 minutes' }, exclude), true);
  assert.equal(subheadlineCarriesFact('I arrive within 30 minutes', { text: 'arrive within 40 minutes' }, exclude), false, 'his exact digits');
  assert.equal(subheadlineCarriesFact('I replaced a burst Grohe mixer', { ...job, condition: 'on weekdays only' }, exclude), false, 'condition dropped');
  assert.equal(subheadlineCarriesFact('I replaced a burst Grohe mixer on weekdays', { ...job, condition: 'on weekdays only' }, exclude), true);
});

test('meta description (d): anchor + em-dash + subheadline, the subheadline alone when it has both or the join passes 155', () => {
  assert.equal(RESEARCHED_META_DESCRIPTION_MAX_CHARS, META_DESCRIPTION_MAX_CHARS);
  assert.equal(RESEARCHED_META_DESCRIPTION_MAX_CHARS, 155);
  const city = LOCALS[0].he_name;
  assert.equal(homepageMetaDescription('plumber', city, 'I fix leaks fast'), `${pageNameWithCity('plumber', city)} \u2014 I fix leaks fast`);
  assert.equal(homepageMetaDescription('plumber', city, `plumber ${city} who fixes leaks`), `plumber ${city} who fixes leaks`);
  const long = 'x'.repeat(90);
  const name = 'n'.repeat(70);
  assert.equal(homepageMetaDescription(name, null, long), long, 'over the cap: the subheadline alone, never cut');
  assert.ok(homepageMetaDescription('plumber', city, long).length <= 155);
});

test('work-location framing: HOME = on location only, MIX keeps only the published Google address, other trades unchanged', () => {
  const data = collected({ serviceModel: 'location', streetAddress: '1 Herzl Street, Holon' });
  const home = frameWorkLocation(data, 'HOME', '1 Herzl Street, Holon');
  assert.equal(home.serviceModel, 'field');
  assert.equal(home.streetAddress, undefined);
  const mixPublished = frameWorkLocation(data, 'MIX', '1  Herzl Street,Holon');
  assert.equal(mixPublished.serviceModel, 'mixed');
  assert.equal(mixPublished.streetAddress, '1 Herzl Street, Holon');
  const mixTyped = frameWorkLocation({ ...data, streetAddress: '9 Other Road' }, 'MIX', '1 Herzl Street, Holon');
  assert.equal(mixTyped.streetAddress, undefined, 'a typed, unpublished address is dropped');
  assert.deepEqual(frameWorkLocation(data, null, null), data);
  assert.match(workLocationConstraint('HOME', home)!.value, /Never imply a studio/);
  assert.match(workLocationConstraint('MIX', mixTyped)!.value, /never state an address/);
  assert.match(workLocationConstraint('MIX', mixPublished)!.value, /only by the street address/);
  // Yonatan 2026-11-25: both MIX variants state both places; the no-address one adds "by appointment only"; HOME unchanged.
  const both = 'The home page states both: that he comes to the customer, and that he also works at his own place.';
  assert.ok(workLocationConstraint('MIX', mixPublished)!.value.endsWith(both));
  assert.ok(workLocationConstraint('MIX', mixTyped)!.value.endsWith(`${both} Present his own place as by appointment only.`));
  assert.doesNotMatch(workLocationConstraint('MIX', mixPublished)!.value, /appointment/);
  assert.equal(workLocationConstraint('HOME', home)!.value, 'Work location (owner-stated): he works only at the customer\'s place, on location. Never imply a studio, a shop, an office or any place customers come to, and never invite a visit.');
  assert.equal(workLocationConstraint(null, data), null);
  // Removed credential facts leave the generation data; refusals never reach it.
  const generated = interviewGenerationData(data, {
    usable: [{ id: 'a1-1', type: 'job', text: 'job text' }, { id: 'a1-2', type: 'refusal', text: 'refusal text' }],
    removedIds: ['cred-years'], workLocation: 'HOME', publishedAddress: null,
  });
  assert.equal(generated.yearsInField, undefined);
  assert.deepEqual(generated.interviewFacts, ['job text']);
});

// ---------------------------------------------------------------------------------------------------------------------
// The flow on real stores

test('generation runs once per round; the fix round regenerates once; a third round is refused', async () => {
  const h = harness();
  try {
    const cookie = await throughFacts(h);
    await settle(cookie);
    assert.equal(h.generations.length, 1, 'FACTS_DONE started the first round');
    // Reloads / polls never start a second run.
    for (let i = 0; i < 3; i++) {
      const status = await interviewPreview(cookie, { action: 'status' }, h.previewDeps);
      assert.equal(status.status, 200);
      assert.equal((status.body.preview as { status: string }).status, 'ready');
    }
    await settle(cookie);
    assert.equal(h.generations.length, 1);
    const first = readPreviewRecord(sessionOf(h, cookie).researchId!, h.researchBaseDir)!;
    assert.equal(first.round, 1);
    assert.ok(first.generation.model === 'fixture' && first.generation.costUsd === 0);
    assert.ok(previewReady(sessionOf(h, cookie)));

    // A request naming a session or a research is refused; the fix round moves back to the facts screen.
    assert.equal((await interviewPreview(cookie, { action: 'status', sessionId: 'x' }, h.previewDeps)).status, 400);
    const fix = await interviewPreview(cookie, { action: 'fix' }, h.previewDeps);
    assert.deepEqual(fix, { status: 200, body: { phase: 'facts' } });
    assert.equal(previewReady(sessionOf(h, cookie)), false, 'no pay while fixing');
    const loaded = await facts(h, cookie, { action: 'load' });
    assert.equal(loaded.status, 200);
    assert.equal(loaded.body.canReturn, false);
    const job = (loaded.body.facts as Array<{ id: string; type: string }>).find(item => item.type === 'job')!;
    assert.equal((await facts(h, cookie, { action: 'review', factId: job.id, decision: 'fix', text: 'Found a hidden leak behind the kitchen tiles with a thermal camera' })).status, 200);
    assert.equal((await facts(h, cookie, { action: 'done' })).status, 200);
    await settle(cookie);
    assert.deepEqual(h.generations.map(item => item.round), [1, 2]);
    const second = readPreviewRecord(sessionOf(h, cookie).researchId!, h.researchBaseDir)!;
    assert.equal(second.round, 2);
    assert.ok(second.collectedData.interviewFacts?.includes('Found a hidden leak behind the kitchen tiles with a thermal camera'), 'edited = his ownerText');

    const view = (await interviewPreview(cookie, { action: 'status' }, h.previewDeps)).body.preview as Record<string, unknown>;
    assert.deepEqual({ status: view.status, fixAvailable: view.fixAvailable, fixUsed: view.fixUsed }, { status: 'ready', fixAvailable: false, fixUsed: true });
    assert.equal((await interviewPreview(cookie, { action: 'fix' }, h.previewDeps)).status, 409, 'one fix round only');
    assert.equal(claimPreviewRound(h.store, sessionOf(h, cookie).id, PREVIEW_MAX_ROUNDS + 1), false);
    assert.equal(claimPreviewRound(h.store, sessionOf(h, cookie).id, 2), false, 'round 2 already claimed');
    await settle(cookie);
    assert.equal(h.generations.length, 2);

    // Cost lands in providerUsage (the fixture run records zero-cost rows only when a model is called; none here).
    const dossier = await readResearchDossier(second.researchId, h.researchBaseDir);
    assert.equal(dossier?.status, 'copy_ready', 'the plan is persisted once and reused');
  } finally {
    h.close();
  }
});

test('first-screen fact v2: the quote line of an eligible confirmed fact (code-built, in no JSON-LD or meta); rule (e) logs a miss', async () => {
  const h = harness();
  try {
    // Latin answers (every answer fact fails c4/c5) and the price chip removed: the trust-bar credential satisfies rule (e).
    const latin = await throughFacts(h, { review: (_id, type) => (type === 'price_rule' ? { decision: 'remove' } : { decision: 'confirm' }) });
    await settle(latin);
    const plain = readPreviewRecord(sessionOf(h, latin).researchId!, h.researchBaseDir)!;
    assert.equal(plain.firstScreen.source, 'trust_bar', JSON.stringify(plain.firstScreen));
    assert.equal(plain.firstScreen.firstScreenFactId, 'cred-years');
    assert.equal(plain.firstScreen.quoteLine, null);
    assert.equal(plain.page.ownerQuote, undefined);
    assert.ok(plain.firstScreen.candidates.some(item => item.type === 'number' && item.reason === 'latin'), JSON.stringify(plain.firstScreen.candidates));
    assert.ok(plain.firstScreen.candidates.some(item => item.type === 'price_rule' && item.reason === 'status_removed'));
    assert.ok(plain.firstScreen.candidates.some(item => item.id === 'cred-years' && item.reason === 'trust_bar_duplicate'));

    // Hebrew refusal answer: the refusal frame, his words after the opening time phrase is cut.
    const cookie = await throughFacts(h, { placeId: PLACE2, answers: HE_ANSWERS });
    await settle(cookie);
    const record = readPreviewRecord(sessionOf(h, cookie).researchId!, h.researchBaseDir)!;
    const dossier = (await readResearchDossier(record.researchId, h.researchBaseDir))!;
    const fact = dossier.interviewFacts!.facts.find(item => item.id === record.firstScreen.firstScreenFactId)!;
    assert.ok(fact, JSON.stringify(record.firstScreen));
    assert.deepEqual([fact.type, fact.status, record.firstScreen.source], ['refusal', 'confirmed', 'quote_line']);
    const frame = SITE_BOT_OWNER_QUOTE_COPY.QUOTE_FRAME_REFUSAL.replace('{name}', SITE_BOT_OWNER_QUOTE_COPY.QUOTE_NAME_FALLBACK);
    assert.deepEqual(record.page.ownerQuote, { frame, quote: HE_REFUSAL_CUT });
    assert.deepEqual(record.firstScreen.quoteLine, record.page.ownerQuote);
    // usedFactIds: only what is rendered (the quote line's fact and the shown credential); the brief's list is separate.
    // (The fixture writer copies the writer facts into the about body verbatim, so those truly appear too.)
    assert.ok(record.usedFactIds.includes(fact.id) && record.usedFactIds.includes('cred-years'));
    assert.ok(record.briefFactIds.length > 0);
    assert.ok(!record.briefFactIds.includes(fact.id), 'a refusal never reaches the writer');
    assert.deepEqual(record.subheadlineFactIds, []);
    // (a) the fixture subheadline carries no fact; the homepage brief carries the first-screen constraint and rule.
    assert.equal(record.page.copy.heroSubheadline, 'Step2c Plumbing');
    const usable = { id: 'a1-1', type: 'job' as const, text: 'x' };
    const brief = buildPageBriefs(dossier, record.collectedData, { facts: [usable], firstScreen: true, workLocation: null })[0];
    assert.ok(brief.constraints.some(item => item.id === 'first-screen-fact' && !item.value.includes('interview-')));
    // Yonatan C2 + C3 (iii): the writer constraints reach every interview brief, and only interview briefs.
    for (const page of buildPageBriefs(dossier, record.collectedData, { facts: [usable], firstScreen: false, workLocation: null })) {
      assert.ok(page.constraints.some(item => item.id === 'constraint-no-relative-time' && /Never carry a relative time word/.test(item.value)), page.page.id);
      assert.ok(page.constraints.some(item => item.id === 'constraint-fact-claim-link' && /unless the fact itself states it/.test(item.value)), page.page.id);
      assert.ok(!page.constraints.some(item => item.id === 'first-screen-fact'), 'post-pay pages: no first-screen rule');
    }
    assert.ok(!buildPageBriefs(dossier, record.collectedData)[0].constraints.some(item => item.id === 'constraint-no-relative-time'));
    assert.match(firstScreenRule(brief) ?? '', /FIRST SCREEN \(binding/);
    assert.equal(firstScreenRule(buildPageBriefs(dossier, record.collectedData)[0]), null, 'no interview: prompt unchanged');

    // (b, f, g) on the rendered homepage.
    const html = renderResearchedSitePages({ ...researchedRenderInputs(record.collectedData, record.slug), data: record.collectedData, slug: record.slug, pages: [record.page], graphEdges: [] });
    const index = html['index.html'];
    assert.ok(index.includes(`<p class="sub">Step2c Plumbing</p><figure class="owner-quote" data-section="owner-quote" aria-labelledby="owner-quote-frame"><figcaption id="owner-quote-frame">${frame}</figcaption>\u00A0<blockquote><p>\u05F4${HE_REFUSAL_CUT}\u05F4</p></blockquote></figure>`));
    for (const json of index.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) ?? []) assert.ok(!json.includes(HE_REFUSAL_CUT.split(' ')[2]), 'no JSON-LD carries the quote');
    assert.doesNotMatch(index, /itemprop/);
    const meta = /<meta name="description" content="([^"]*)"/.exec(index)![1];
    const og = /<meta property="og:description" content="([^"]*)"/.exec(index)?.[1];
    const anchor = pageNameWithCity(record.page.seo!.name, record.page.seo!.city);
    assert.equal(meta, homepageMetaDescription(record.page.seo!.name, record.page.seo!.city, record.page.copy.heroSubheadline));
    assert.ok(meta.startsWith(anchor), meta);
    assert.ok(!meta.includes(HE_REFUSAL_CUT));
    assert.ok(meta.length <= 155);
    if (og !== undefined) assert.equal(og, meta);
    const contact = /<meta name="description" content="([^"]*)"/.exec(html['contact.html'] ?? '')?.[1];
    if (contact !== undefined) assert.notEqual(contact, meta);
    // Only the homepage renders the line.
    assert.ok(!Object.entries(html).some(([file, page]) => file !== 'index.html' && page.includes('owner-quote')));

    // (e): every fact removed -> no quote line, no placeholder, the preview still renders and the miss is logged.
    const lines: string[] = [];
    const h2 = harness({});
    try {
      const cookie2 = await throughFacts(h2, { answers: HE_ANSWERS, review: (_id, type) => (type === 'credential' ? { decision: 'confirm' } : { decision: 'remove' }) });
      const session = sessionOf(h2, cookie2);
      await settle(cookie2);
      const outcome = await generatePreviewHomepage({
        sessionId: session.id, researchId: session.researchId!, round: 1, answersVersion: session.answersVersion, collectedData: { ...session.collectedData!, yearsInField: undefined },
        workLocation: null, publishedAddress: null, answers: answerTexts(session.interviewState!),
      }, { now: h2.now, researchBaseDir: h2.researchBaseDir, mode: 'fixture', log: line => lines.push(line) });
      assert.ok(outcome.ok);
      assert.equal(outcome.record.page.ownerQuote, undefined);
      assert.equal(outcome.record.firstScreen.missing, true);
      const line = lines.find(item => item.startsWith('[site-bot preview] first_screen_fact_missing'));
      assert.ok(line, lines.join('\n'));
      for (const item of outcome.record.firstScreen.candidates) assert.ok(line!.includes(`${item.id}:${item.reason}`), line);
      assert.match(line!, /status_removed/);
      const frameHtml = renderResearchedSitePages({ ...researchedRenderInputs(outcome.record.collectedData, outcome.record.slug), data: outcome.record.collectedData, slug: outcome.record.slug, pages: [outcome.record.page], graphEdges: [] })['index.html'];
      assert.doesNotMatch(frameHtml, /owner-quote/);
    } finally {
      h2.close();
    }
  } finally {
    h.close();
  }
});

test('title, H1 and hero badge are byte-identical to a run without facts (the quote line never touches the anchors)', async () => {
  const h = harness();
  try {
    const cookie = await throughFacts(h, { answers: HE_ANSWERS });
    await settle(cookie);
    const session = sessionOf(h, cookie);
    const seen: PageBrief[] = [];
    const writer = async (brief: PageBrief, data: CollectedData): Promise<SiteCopy> => { seen.push(brief); return fixtureCopyWriter([])(brief, data); };
    const run = (answersVersion: number) => generatePreviewHomepage({
      sessionId: session.id, researchId: session.researchId!, round: 1, answersVersion, collectedData: session.collectedData!, workLocation: null, publishedAddress: null,
      answers: answerTexts(session.interviewState!),
    }, { now: h.now, researchBaseDir: h.researchBaseDir, mode: 'fixture', generateCopy: writer });
    const withFacts = await run(session.answersVersion) as Extract<PreviewGenerationOutcome, { ok: true }>;
    const noFacts = await run(session.answersVersion + 99) as Extract<PreviewGenerationOutcome, { ok: true }>;
    assert.ok(withFacts.ok && noFacts.ok);
    assert.ok(withFacts.record.page.ownerQuote, 'the with-facts run renders the quote line');
    // usedFactIds bug (2026-11-25): the brief handed the writer a1-1, the output never showed it, so it is not listed.
    assert.ok(withFacts.record.briefFactIds.includes('a1-1'), JSON.stringify(withFacts.record.briefFactIds));
    assert.deepEqual(withFacts.record.usedFactIds, [withFacts.record.firstScreen.firstScreenFactId, 'cred-years']);
    assert.deepEqual(noFacts.record.usedFactIds, []);
    assert.equal(noFacts.record.page.ownerQuote, undefined);
    assert.ok(seen[0].firstPartyProof.some(item => item.id.startsWith('interview-')));
    assert.ok(!seen[1].firstPartyProof.some(item => item.id.startsWith('interview-')));
    assert.deepEqual(seen[0].site, seen[1].site, 'page name, city and service area are the same');
    const name = 'Step2c Plumbing';
    assert.equal(researchedPageTitle(withFacts.record.page, name), researchedPageTitle(noFacts.record.page, name));
    assert.equal(researchedPageH1(withFacts.record.page.copy.heroHeadline, withFacts.record.page.seo), researchedPageH1(noFacts.record.page.copy.heroHeadline, noFacts.record.page.seo));
    assert.deepEqual(withFacts.record.page.seo, noFacts.record.page.seo);
    const render = (record: typeof withFacts.record) => renderResearchedSitePages({ ...researchedRenderInputs(record.collectedData, record.slug), data: record.collectedData, slug: record.slug, pages: [record.page], graphEdges: [] })['index.html'];
    const [a, b] = [render(withFacts.record), render(noFacts.record)];
    const pick = (page: string, pattern: RegExp) => pattern.exec(page)?.[0] ?? null;
    for (const pattern of [/<title>[^<]*<\/title>/, /<h1>[^<]*<\/h1>/, /<[^>]*class="hero-badge"[^>]*>[^<]*</]) assert.equal(pick(a, pattern), pick(b, pattern), String(pattern));
    assert.ok(pick(a, /<title>[^<]*<\/title>/) && pick(a, /<h1>[^<]*<\/h1>/));
  } finally {
    h.close();
  }
});

test('preview access: only the session cookie reads its own ready preview; the frame is inert and never indexed or cached', async () => {
  const h = harness();
  try {
    const cookie = await throughFacts(h);
    await settle(cookie);
    const own = previewForFrame(cookie, h.previewDeps);
    assert.equal(own.kind, 'ok');
    // Another session (another business) with no preview yet: 404, never this one's.
    const other = await startInterview({ auditId, placeId: PLACE2, cookieValue: undefined }, h.deps);
    const otherCookie = (other as Extract<typeof other, { kind: 'session' }>).cookie!;
    assert.equal(previewForFrame(otherCookie, h.previewDeps).kind, 'not_found');
    assert.equal(previewForFrame(undefined, h.previewDeps).kind, 'no_session');
    const crafted = `${parseInterviewCookie(cookie)!.id}.${'A'.repeat(43)}`;
    assert.equal(previewForFrame(crafted, h.previewDeps).kind, 'no_session', 'a crafted cookie for this session id is no session');
    assert.equal((await interviewPreview(otherCookie, { action: 'status' }, h.previewDeps)).status, 409, 'not at facts_confirmed');

    assert.equal(PREVIEW_FRAME_HEADERS['X-Robots-Tag'], 'noindex, nofollow');
    assert.equal(PREVIEW_FRAME_HEADERS['Cache-Control'], 'private, no-store');
    assert.match(PREVIEW_FRAME_HEADERS['Content-Security-Policy'], /^sandbox; default-src 'none'; img-src data:;/);
    assert.match(PREVIEW_FRAME_HEADERS['Content-Security-Policy'], /form-action 'none'/);
    assert.equal(PREVIEW_IFRAME_SANDBOX, '', 'no sandbox token: no scripts, no same-origin, no forms');

    const html = await previewFrameHtml((own as Extract<typeof own, { kind: 'ok' }>).record, { sitesRoot: h.sitesRoot, researchBaseDir: h.researchBaseDir });
    assertPreviewInert(html);
    assert.doesNotMatch(html, /href="(?:tel:|https?:|\/)/);
    assert.doesNotMatch(html, /<script(?![^>]*ld\+json)/);
    assert.match(html, /data:font\/woff2;base64,/, 'fonts inlined');
    // The plumber trade library hero is inlined (no stock, no placeholder).
    assert.match(html, /class="hero-bg"[^>]*src="data:image\/webp;base64,/);
    assert.doesNotMatch(html, /\/img\/hero-/);
    assert.match(html, /<form\b/);
    assert.doesNotMatch(html, /<form\b[^>]*action=/);
    // Never indexable even when saved: the live site's robots meta is replaced with noindex,nofollow.
    assert.doesNotMatch(html, /index,follow/);
    assert.equal((html.match(/<meta name="robots"[^>]*>/g) ?? []).length, 1);
    assert.match(html, /<meta name="robots" content="noindex,nofollow" \/>/);
    assert.equal(PREVIEW_FRAME_HEADERS['Referrer-Policy'], 'no-referrer');
  } finally {
    h.close();
  }
});

test('ready email: one per round when the round took over 60 s, with the signed resume link alone on the last text line', async () => {
  const h = harness({
    generate: async (input, signal) => {
      h.advance(61_000);
      return generatePreviewHomepage(input, { now: h.now, researchBaseDir: h.researchBaseDir, mode: 'fixture', signal });
    },
  });
  try {
    const cookie = await throughFacts(h);
    await settle(cookie);
    const ready = h.sent.emails.filter(email => email.tag === 'interview_preview_ready');
    assert.equal(ready.length, 1);
    assert.equal(ready[0].to, 'owner@example.com');
    const lines = ready[0].text.split('\n');
    assert.match(lines[lines.length - 1], /^https:\/\/www\.wao\.co\.il\/api\/site-bot\/interview-resume\?t=v1\./);
    assert.ok(ready[0].subject.includes('Step2c Plumbing'));
    assert.ok(!ready[0].subject.includes('{'));
    await interviewPreview(cookie, { action: 'status' }, h.previewDeps);
    await settle(cookie);
    assert.equal(h.sent.emails.filter(email => email.tag === 'interview_preview_ready').length, 1, 'once per round');
    assert.equal(SITE_BOT_STEP2C_COPY.GENERATING_EMAIL_BODY.split('\n').pop(), '{previewUrl}');
  } finally {
    h.close();
  }
});

test('failure: two failed attempts -> PREVIEW_FAILED state, one staff alert, the spot stays held; staff re-trigger recovers', async () => {
  const h = harness({ failFirst: 2 });
  try {
    const cookie = await throughFacts(h);
    await settle(cookie);
    assert.equal(h.generations.length, 2, 'two attempts, no third');
    const session = sessionOf(h, cookie);
    assert.equal(session.previewStatus, 'failed');
    assert.equal(session.status, 'open', 'the spot stays held');
    const alerts = h.sent.emails.filter(email => email.tag === 'interview_preview_failed');
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].text, /interview-preview-retry/);
    assert.match(alerts[0].text, new RegExp(session.id));
    const status = await interviewPreview(cookie, { action: 'status' }, h.previewDeps);
    assert.equal((status.body.preview as { status: string }).status, 'failed');
    await settle(cookie);
    assert.equal(h.generations.length, 2, 'polls never retry a failed round');
    assert.equal(previewReady(session), false);

    assert.equal(staffRetry(session.id, 'preview', h.previewDeps), 'started');
    await settle(cookie);
    assert.equal(sessionOf(h, cookie).previewStatus, 'ready');
    assert.equal(staffRetry(session.id, 'preview', h.previewDeps), 'not_failed');
  } finally {
    h.close();
  }
});

test('after payment: the homepage is reused byte for byte, every other page is generated, the record waits for review', async () => {
  const h = harness();
  try {
    const cookie = await throughFacts(h);
    await settle(cookie);
    const session = sessionOf(h, cookie);
    const preview = readPreviewRecord(session.researchId!, h.researchBaseDir)!;
    // Not paid yet: nothing runs.
    assert.equal(startSiteGeneration(session, h.previewDeps, preview.round), 'not_ready');
    assert.ok(markInterviewPaid(h.store, session.id));
    const paid = sessionOf(h, cookie);
    assert.equal(startSiteGeneration(paid, h.previewDeps, preview.round + 1), 'not_ready', 'only the round he paid on');
    assert.equal(startSiteGeneration(paid, h.previewDeps, preview.round), 'started');
    assert.equal(startSiteGeneration(paid, h.previewDeps, preview.round), 'already', 'once per session');
    await inFlightSiteGeneration(session.id);
    const record = JSON.parse(fs.readFileSync(path.join(h.sitesRoot, `${preview.slug}.json`), 'utf8'));
    const home = record.researchedPages.find((page: { classification: string }) => page.classification === 'homepage');
    assert.deepEqual(home, preview.page, 'homepage reused, never regenerated');
    assert.ok(record.researchedPages.length > 1);
    assert.equal(record.interviewFactUse.firstScreenFactId, preview.firstScreen.firstScreenFactId);
    const dossier = await readResearchDossier(session.researchId!, h.researchBaseDir);
    assert.equal(dossier?.approvedCopyReviewPacket, undefined, 'no approved review packet: deploy refuses it');
    assert.deepEqual(dossier?.pipelineChecks, { copy: 'pass', hebrewQa: 'pending' });

    // Direct: the generator never sends the homepage brief to the writer.
    const briefs: string[] = [];
    const again = await generateRemainingPages(preview, {
      now: h.now, researchBaseDir: h.researchBaseDir, sitesRoot: h.sitesRoot, mode: 'fixture', checkPlaceId: null,
      generateCopy: async (brief, data) => { briefs.push(brief.page.pageClass); return fixtureCopyWriter([])(brief, data); },
    });
    assert.equal(again.ok, true);
    assert.ok(briefs.length > 0 && !briefs.includes('homepage'), briefs.join(','));
  } finally {
    h.close();
  }
});

test('no deploy without the admin-approved review packet; checkout init needs the ready preview (source checks)', () => {
  const root = path.resolve(__dirname, '../../..');
  const deploy = fs.readFileSync(path.join(root, 'src/app/api/site-bot/deploy/route.ts'), 'utf8');
  assert.match(deploy, /verifyAdminToken\(authCookies\.get\(ADMIN_COOKIE_NAME\)/);
  assert.match(deploy, /if \(!dossier\?\.approvedCopyReviewPacket \|\|\s*!matchesResearchedCopyReviewPacket\(recordBytes, dossier\.approvedCopyReviewPacket\)\) \{\s*return privateJson\(\{ error: 'copy_review_approval_required' \}, 409\);/);
  for (const file of ['src/lib/site-bot/previewGeneration.ts', 'src/lib/site-bot/interviewPreview.ts', 'src/app/api/site-bot/checkout/callback/paid.ts']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, /deployTenantToWorker|site-bot\/deploy|approvedCopyReviewPacket\s*=/, `${file} opens no deploy path`);
  }
  const init = fs.readFileSync(path.join(root, 'src/app/api/site-bot/checkout/init/paid.ts'), 'utf8');
  assert.ok(init.indexOf("errorReply('preview_not_ready', 409)") > init.indexOf("errorReply('no_interview_session', 409)"));
  assert.ok(init.indexOf("errorReply('preview_not_ready', 409)") < init.indexOf('createPendingPlanSubscription('));
  assert.match(init, /preview: \{ round: preview\.round, createdAt: preview\.createdAt \}/);
});

test('PAY_CTA_SUB shows the plan price from plans.ts, byte-identical to the waocopy source', () => {
  const root = path.resolve(__dirname, '../../..');
  const text = fs.readFileSync(path.join(root, 'docs/copy/site-bot-step2c-preview-pay-2026-11-25.waocopy.json'), 'utf8');
  const source = JSON.parse(/^```json\n([\s\S]*?)\n```$/m.exec(text)![1]) as Record<string, string>;
  assert.equal(payCtaSub(), source.PAY_CTA_SUB);
  assert.ok(SITE_BOT_STEP2C_COPY.PAY_CTA_SUB.includes('{net}'));
});

// ---------------------------------------------------------------------------------------------------------------------
// 2026-11-26 fix-up: rule (a) person gate, the empty subheadline, the card-name guard, the editor notes

test('rule (a) person gate: a first-person subheadline gets one repair round, else no subheadline and subheadline_person_fail', async () => {
  const h = harness();
  try {
    const cookie = await throughFacts(h, { answers: HE_ANSWERS });
    await settle(cookie);
    const session = sessionOf(h, cookie);
    const record = readPreviewRecord(session.researchId!, h.researchBaseDir)!;
    const dossier = (await readResearchDossier(record.researchId, h.researchBaseDir))!;
    const home = buildPageBriefs(dossier, record.collectedData, { facts: [], firstScreen: true, workLocation: null }).find(brief => brief.page.pageClass === 'homepage')!;
    const data = record.collectedData;
    const first: SiteCopy = { ...record.page.copy, heroSubheadline: LIVE_SUB };
    const lines: string[] = [];
    const log = (line: string) => lines.push(line);
    const calls: Array<{ system: string; user: string }> = [];
    const answering = (value: unknown) => async (system: string, user: string) => { calls.push({ system, user }); return JSON.stringify({ heroSubheadline: value }); };

    // Clean: untouched, no call.
    const clean = await gateSubheadlinePerson(record.page.copy, home, data, { callJson: answering('x'), log, sessionId: 's', round: 1 });
    assert.deepEqual([clean.outcome, clean.copy, calls.length], ['ok', record.page.copy, 0]);

    // One repair round: the third-person rewrite is kept.
    const repaired = await gateSubheadlinePerson(first, home, data, { callJson: answering(`${LIVE_SUB_NEUTRAL}.`), log, sessionId: 's', round: 1 });
    assert.equal(repaired.outcome, 'repaired');
    assert.equal(repaired.copy.heroSubheadline, LIVE_SUB_NEUTRAL, 'trailing period dropped');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].system, SUBHEADLINE_PERSON_REPAIR_SYSTEM);
    assert.doesNotMatch(calls[0].system, /first-person singular/, 'no owner-voice rule in the repair prompt');
    assert.ok(calls[0].user.includes(JSON.stringify([SUBJECT_CARRY_TOKENS[0]])), 'the found form is named');
    assert.ok(calls[0].user.includes(firstScreenRule(home)!), 'the first-screen rule travels with the repair');
    assert.ok(calls[0].user.includes(JSON.stringify(first.heroHeadline)));
    assert.ok(lines.some(line => line === '[site-bot preview] subheadline_person_repaired session=s round=1 forms=1'), lines.join('\n'));

    // Still first person after the repair, too long, a bad answer, a failed call or no model: no subheadline, logged.
    for (const callJson of [answering(LIVE_SUB), answering('x'.repeat(91)), answering(42), async () => { throw new Error('down'); }, null]) {
      lines.length = 0;
      const dropped = await gateSubheadlinePerson(first, home, data, { callJson, log, sessionId: 's', round: 2 });
      assert.equal(dropped.outcome, 'dropped');
      assert.equal(dropped.copy.heroSubheadline, '');
      assert.deepEqual(lines, ['[site-bot preview] subheadline_person_fail session=s round=2 forms=1 persons=first']);
    }

    // The rendered homepage without a subheadline: no sub line, the meta / og description is the anchor alone, no Service
    // description; the quote line still renders.
    const page = { ...record.page, copy: { ...record.page.copy, heroSubheadline: '' } };
    const index = renderResearchedSitePages({ ...researchedRenderInputs(data, record.slug), data, slug: record.slug, pages: [page], graphEdges: [] })['index.html'];
    assert.doesNotMatch(index, /<p class="sub">/);
    assert.match(index, /<\/h1><figure class="owner-quote"/);
    const anchor = pageNameWithCity(record.page.seo!.name, record.page.seo!.city);
    assert.equal(/<meta name="description" content="([^"]*)"/.exec(index)![1], anchor);
    const og = /<meta property="og:description" content="([^"]*)"/.exec(index)?.[1];
    if (og !== undefined) assert.equal(og, anchor);
    const service = (index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? []).map(block => block.replace(/<[^>]+>/g, '')).join('\n');
    assert.ok(service.includes('"@type":"Service"'));
    assert.doesNotMatch(service, /"@type":"Service"[^}]*"description"/);

    // The same gate inside the preview run: the record, and so every surface, carries the gated value.
    const live = await generatePreviewHomepage({
      sessionId: session.id, researchId: session.researchId!, round: 1, answersVersion: session.answersVersion, collectedData: session.collectedData!, workLocation: null,
      publishedAddress: null, answers: answerTexts(session.interviewState!),
    }, {
      now: h.now, researchBaseDir: h.researchBaseDir, mode: 'fixture', log,
      generateCopy: async (brief, pageData) => ({ ...(await fixtureCopyWriter([])(brief, pageData)), heroSubheadline: LIVE_SUB }),
      callJson: answering(LIVE_SUB),
    }) as Extract<PreviewGenerationOutcome, { ok: true }>;
    assert.ok(live.ok);
    assert.equal(live.record.page.copy.heroSubheadline, '');

    // After payment: the reused homepage with no subheadline passes the shape and graph checks.
    const site = await generateRemainingPages(live.record, { now: h.now, researchBaseDir: h.researchBaseDir, sitesRoot: h.sitesRoot, mode: 'fixture', checkPlaceId: null });
    assert.equal(site.ok, true, JSON.stringify(site));
    const stored = JSON.parse(fs.readFileSync(path.join(h.sitesRoot, `${(site as { slug: string }).slug}.json`), 'utf8'));
    assert.equal(stored.researchedPages.find((item: { classification: string }) => item.classification === 'homepage').copy.heroSubheadline, '');
  } finally {
    h.close();
  }
});

test('Noa and the repair stage get the first-screen person note on a first-screen homepage brief only; copy events log ids only', async () => {
  const h = harness();
  try {
    const cookie = await throughFacts(h, { answers: HE_ANSWERS });
    await settle(cookie);
    const record = readPreviewRecord(sessionOf(h, cookie).researchId!, h.researchBaseDir)!;
    const dossier = (await readResearchDossier(record.researchId, h.researchBaseDir))!;
    const [first] = buildPageBriefs(dossier, record.collectedData, { facts: [], firstScreen: true, workLocation: null });
    const [plain] = buildPageBriefs(dossier, record.collectedData);
    const note = firstScreenEditorNote(first)!;
    assert.match(note, /^FIRST SCREEN \(binding\): heroSubheadline is written in the third person about the business/);
    assert.equal(firstScreenEditorNote(plain), null);
    assert.ok(buildNoaQaMessage(record.page.copy, first).endsWith(`\n\n${note}`));
    assert.ok(!buildNoaQaMessage(record.page.copy, plain).includes('FIRST SCREEN'));
    // The shared repair / Noa system prompts still carry the owner-voice rule; the note is what exempts the field.
    assert.match(PROMPT_V2_SYSTEM_PROMPTS.repair, /first-person singular/);
    assert.equal(copyEventLine('home', { stage: 'tamar', kind: 'repair', attempt: 1, fields: ['heroSubheadline'], violations: [{ field: 'heroSubheadline', rule: 'max_length', limit: 90, actual: 95 }] }),
      '[site-bot copy] page=home stage=tamar kind=repair attempt=1 fields=heroSubheadline rules=heroSubheadline:max_length');
  } finally {
    h.close();
  }
});

test('card-name guard: the trade or a service-area place is never a homepage card heading (brief labels and the renderer)', async () => {
  const HOLON = ISRAELI_LOCALITIES.find(item => item.slug === 'holon')!.he_name;
  const BAT_YAM = ISRAELI_LOCALITIES.find(item => item.slug === 'bat-yam')!.he_name;
  assert.equal(isTradeOrPlaceName(` ${HOLON} `, ['plumber'], [HOLON]), true);
  assert.equal(isTradeOrPlaceName('Plumber', ['plumber'], []), true);
  assert.equal(isTradeOrPlaceName('leak detection', ['plumber'], [HOLON]), false);
  const h = harness();
  try {
    // The 2026-11-25 harness typed the place names into the services question: the services list holds the trade and places.
    const cookie = await throughFacts(h, { answers: HE_ANSWERS, over: { targetLocation: HOLON, specificCities: `${HOLON}, ${BAT_YAM}`, priorityServices: ['leak detection', 'plumber', HOLON, BAT_YAM], secondaryServices: `leak detection, plumber, ${HOLON}, ${BAT_YAM}` } });
    await settle(cookie);
    const record = readPreviewRecord(sessionOf(h, cookie).researchId!, h.researchBaseDir)!;
    const dossier = (await readResearchDossier(record.researchId, h.researchBaseDir))!;
    const briefs = buildPageBriefs(dossier, record.collectedData);
    const home = briefs.find(brief => brief.page.pageClass === 'homepage')!;
    const places = [home.site!.city, ...home.site!.serviceArea];
    assert.ok(places.includes(HOLON) && places.includes(BAT_YAM), JSON.stringify(places));
    assert.ok(home.site!.serviceLabels.length >= 1, JSON.stringify(home.site!.serviceLabels));
    for (const label of home.site!.serviceLabels) assert.equal(isTradeOrPlaceName(label, [home.site!.pageName], places), false, label);
    assert.ok(briefs.filter(brief => brief.page.pageClass !== 'homepage').length > home.site!.serviceLabels.length, 'the place pages still exist; only the home cards drop them');

    // The renderer drops a card named like the trade or a place even when the copy carries one.
    const seo = record.page.seo!;
    const description = 'A full card description of the service, long enough.';
    const page = { ...record.page, copy: { ...record.page.copy, serviceDetails: [{ name: seo.name, description }, { name: HOLON, description }, { name: BAT_YAM, description }, { name: 'leak detection', description }] } };
    const index = renderResearchedSitePages({ ...researchedRenderInputs(record.collectedData, record.slug), data: record.collectedData, slug: record.slug, pages: [page], graphEdges: [] })['index.html'];
    const headings = [...index.matchAll(/<li class="svc-card"[^>]*>[\s\S]*?<h3>([\s\S]*?)<\/h3>/g)].map(match => match[1].replace(/<[^>]+>/g, ''));
    assert.deepEqual(headings, ['leak detection']);
    const none = { ...page, copy: { ...page.copy, serviceDetails: [{ name: HOLON, description }] } };
    const bare = renderResearchedSitePages({ ...researchedRenderInputs(record.collectedData, record.slug), data: record.collectedData, slug: record.slug, pages: [none], graphEdges: [] })['index.html'];
    assert.doesNotMatch(bare, /data-section="service-details"/, 'no cards left: no services section');
  } finally {
    h.close();
  }
});
