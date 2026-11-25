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
import { firstScreenRule } from '../lp/researchPageCopy';
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
import {
  anchorExclusions, firstScreenCandidates, firstScreenIneligibility, resolveFirstScreen, subheadlineCarriesFact, usableFacts,
  type FirstScreenContext, type UsableFact,
} from './firstScreenFact';
import { frameWorkLocation, interviewGenerationData, workLocationConstraint } from './interviewGeneration';
import { ISRAELI_LOCALITIES } from './israeliLocalities';
import {
  fixtureCopyWriter, generatePreviewHomepage, generateRemainingPages, readPreviewRecord, type PreviewGenerationOutcome,
} from './previewGeneration';
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
async function throughFacts(h: H, options: { placeId?: string; over?: Partial<CollectedData>; review?: (id: string, type: string) => Record<string, unknown> } = {}): Promise<string> {
  const started = await startInterview({ auditId, placeId: options.placeId ?? PLACE, cookieValue: undefined }, h.deps);
  assert.equal(started.kind, 'session');
  const cookie = (started as Extract<typeof started, { kind: 'session' }>).cookie!;
  assert.equal((await interviewStep(cookie, { step: 'contact', collectedData: collected(options.over) }, h.deps)).kind, 'ok');
  assert.equal((await interviewStep(cookie, { step: 'domain', owner: { domainChoice: 'no_domain' } }, h.deps)).kind, 'ok');
  await inFlightInterviewResearch(parseInterviewCookie(cookie)!.id);
  assert.equal((await interviewStep(cookie, { step: 'questions_begin' }, h.deps)).kind, 'ok');
  for (const key of ['recentJob', 'turnedDown', 'callerQuestion'] as const) assert.equal((await interviewStep(cookie, { step: 'answer', key, text: ANSWERS[key] }, h.deps)).kind, 'ok');
  assert.equal((await interviewStep(cookie, { step: 'answer', key: 'priceStyle', chips: ['afterVisit'] }, h.deps)).kind, 'ok');
  assert.equal((await interviewStep(cookie, { step: 'answer', key: 'areaPattern', text: ANSWERS.areaPattern }, h.deps)).kind, 'ok');
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
const CONTEXT: FirstScreenContext = {
  homeServiceIds: ['owner-service:leak detection'], serviceAreas: [LOCALS[0].he_name], localities: ISRAELI_LOCALITIES, trustBarNumbers: ['12'],
};

test('first-screen eligibility: rule (b) types, statuses and priority (job > tool > local > non-money price > number)', () => {
  const fact = (id: string, type: UsableFact['type'], text: string, extra: Partial<UsableFact> = {}): UsableFact => ({ id, type, text, ...extra });
  const all: UsableFact[] = [
    fact('n1', 'number', 'arrive within 40 minutes'),
    fact('n2', 'number', '12 years'),
    fact('p1', 'price_rule', 'price only after a visit'),
    fact('p2', 'price_rule', 'visit costs 150'),
    fact('l1', 'local', `old buildings in ${LOCALS[0].he_name}`),
    fact('l2', 'local', `old buildings in ${LOCALS[1].he_name}`),
    fact('t1', 'tool', 'Grohe mixer'),
    fact('j1', 'job', 'replaced a burst pipe'),
    fact('j2', 'job', 'fixed a drain', { serviceId: 'owner-service:other' }),
    fact('j3', 'job', 'found a leak', { serviceId: 'owner-service:leak detection' }),
    fact('r1', 'refusal', 'refused a rooftop job'),
    fact('c1', 'credential', '12'),
  ];
  assert.deepEqual(firstScreenCandidates(all, CONTEXT).map(item => item.id), ['j1', 'j3', 't1', 'l1', 'p1', 'n1']);
  assert.equal(firstScreenIneligibility(all.find(item => item.id === 'r1')!, CONTEXT), 'refusal_never_used');
  assert.equal(firstScreenIneligibility(all.find(item => item.id === 'c1')!, CONTEXT), 'credential_trust_bar_only');
  assert.equal(firstScreenIneligibility(all.find(item => item.id === 'j2')!, CONTEXT), 'job_other_service');
  assert.equal(firstScreenIneligibility(all.find(item => item.id === 'l2')!, CONTEXT), 'local_outside_area');
  assert.equal(firstScreenIneligibility(all.find(item => item.id === 'p2')!, CONTEXT), 'price_rule_money');
  assert.equal(firstScreenIneligibility(fact('p3', 'price_rule', 'no charge for the visit \u20AA'), CONTEXT), 'price_rule_money');
  assert.equal(firstScreenIneligibility(all.find(item => item.id === 'n2')!, CONTEXT), 'number_on_trust_bar');

  // Statuses: pending and removed never; edited uses his ownerText (and drops the original condition).
  const set = {
    version: 1 as const, answersVersion: 1, extractedAt: '2026-12-01T00:00:00Z', extraction: 'model' as const, facts: [
      { id: 'a1-1', type: 'job' as const, quote: 'q1', status: 'confirmed' as const, condition: 'on weekdays', source: { kind: 'answer' as const, questionKey: 'recentJob' as const, part: 'answer' as const } },
      { id: 'a1-2', type: 'job' as const, quote: 'q2', status: 'edited' as const, ownerText: 'his text', condition: 'c', source: { kind: 'answer' as const, questionKey: 'recentJob' as const, part: 'answer' as const } },
      { id: 'a1-3', type: 'tool' as const, quote: 'q3', status: 'pending' as const, source: { kind: 'answer' as const, questionKey: 'recentJob' as const, part: 'answer' as const } },
      { id: 'a1-4', type: 'tool' as const, quote: 'q4', status: 'removed' as const, source: { kind: 'answer' as const, questionKey: 'recentJob' as const, part: 'answer' as const } },
    ],
  };
  assert.deepEqual(usableFacts(set), [
    { id: 'a1-1', type: 'job', text: 'q1', condition: 'on weekdays' },
    { id: 'a1-2', type: 'job', text: 'his text', edited: true },
  ]);
});

test('carry check: the subheadline must keep the fact words (and its condition); anchor words never count', () => {
  const exclude = anchorExclusions('plumber', 'Holon', 'Step2c Plumbing');
  const job = { text: 'replaced a burst Grohe mixer under the sink' };
  assert.equal(subheadlineCarriesFact('I replaced a burst Grohe mixer in two hours', job, exclude), true);
  assert.equal(subheadlineCarriesFact('A plumber in Holon you can trust', job, exclude), false);
  assert.equal(subheadlineCarriesFact('Plumber Holon', { text: 'plumber in Holon' }, exclude), false, 'anchor-only fact never counts');
  assert.equal(subheadlineCarriesFact('I arrive within 40 minutes', { text: 'arrive within 40 minutes' }, exclude), true);
  assert.equal(subheadlineCarriesFact('I arrive within 30 minutes', { text: 'arrive within 40 minutes' }, exclude), false, 'his exact digits');
  assert.equal(subheadlineCarriesFact('I replaced a burst Grohe mixer', { ...job, condition: 'on weekdays only' }, exclude), false, 'condition dropped');
  assert.equal(subheadlineCarriesFact('I replaced a burst Grohe mixer on weekdays', { ...job, condition: 'on weekdays only' }, exclude), true);
  // Credential fallback: a rendered trust-bar item built from a credential fact.
  const outcome = resolveFirstScreen('Generic line', [{ id: 'a1-1', type: 'job', ...job }], [{ factId: 'cred-years', item: '12 years' }], ['12 years']);
  assert.deepEqual(outcome, { firstScreenFactId: 'cred-years', source: 'trust_bar', candidateIds: ['a1-1'], missing: false });
  assert.equal(resolveFirstScreen('Generic line', [], [{ factId: 'cred-years', item: '12 years' }], []).missing, true, 'not rendered = missing (e)');
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

test('first-screen fact (a): the generation record keeps firstScreenFactId of an eligible confirmed fact; rule (e) logs a miss', async () => {
  const h = harness();
  try {
    const cookie = await throughFacts(h);
    await settle(cookie);
    const record = readPreviewRecord(sessionOf(h, cookie).researchId!, h.researchBaseDir)!;
    const dossier = (await readResearchDossier(record.researchId, h.researchBaseDir))!;
    const fact = dossier.interviewFacts!.facts.find(item => item.id === record.firstScreen.firstScreenFactId)!;
    assert.ok(fact, JSON.stringify(record.firstScreen));
    assert.equal(record.firstScreen.source, 'subheadline');
    assert.ok(['confirmed', 'edited'].includes(fact.status));
    assert.ok(['job', 'tool', 'local', 'price_rule', 'number'].includes(fact.type));
    assert.notEqual(fact.type, 'refusal');
    assert.ok(record.usedFactIds.length > 0 && !record.usedFactIds.some(id => dossier.interviewFacts!.facts.find(item => item.id === id)?.type === 'refusal'));
    assert.ok(record.page.copy.heroSubheadline.length <= 90);
    // The homepage brief named the candidates and the prompt carries the first-screen rule.
    const usable = { id: fact.id, type: fact.type, text: fact.quote };
    const brief = buildPageBriefs(dossier, record.collectedData, { facts: [usable], firstScreen: [usable], workLocation: null })[0];
    assert.ok(brief.constraints.some(item => item.id === 'first-screen-fact' && item.value.includes(`interview-${fact.id}`)));
    assert.match(firstScreenRule(brief) ?? '', /FIRST SCREEN \(binding\)/);
    assert.equal(firstScreenRule(buildPageBriefs(dossier, record.collectedData)[0]), null, 'no interview: prompt unchanged');

    // (d) on the rendered homepage: the meta and og:description start with the plain anchor, <= 155, unique on the site.
    const html = renderResearchedSitePages({ ...researchedRenderInputs(record.collectedData, record.slug), data: record.collectedData, slug: record.slug, pages: [record.page], graphEdges: [] });
    const meta = /<meta name="description" content="([^"]*)"/.exec(html['index.html'])![1];
    const og = /<meta property="og:description" content="([^"]*)"/.exec(html['index.html'])?.[1];
    const anchor = pageNameWithCity(record.page.seo!.name, record.page.seo!.city);
    assert.ok(meta.startsWith(anchor), meta);
    assert.ok(meta.length <= 155);
    if (og !== undefined) assert.equal(og, meta);
    const contact = /<meta name="description" content="([^"]*)"/.exec(html['contact.html'] ?? '')?.[1];
    if (contact !== undefined) assert.notEqual(contact, meta);

    // (e): every fact removed -> the preview still renders and the miss is logged.
    const lines: string[] = [];
    const h2 = harness({});
    try {
      const cookie2 = await throughFacts(h2, { review: (_id, type) => (type === 'credential' ? { decision: 'confirm' } : { decision: 'remove' }) });
      const session = sessionOf(h2, cookie2);
      await settle(cookie2);
      const outcome = await generatePreviewHomepage({
        sessionId: session.id, researchId: session.researchId!, round: 1, answersVersion: session.answersVersion, collectedData: { ...session.collectedData!, yearsInField: undefined },
        workLocation: null, publishedAddress: null,
      }, { now: h2.now, researchBaseDir: h2.researchBaseDir, mode: 'fixture', log: line => lines.push(line) });
      assert.equal(outcome.ok, true);
      assert.ok(lines.some(line => line.startsWith('[site-bot preview] first_screen_fact_missing')), lines.join('\n'));
    } finally {
      h2.close();
    }
  } finally {
    h.close();
  }
});

test('title and H1 are byte-identical to a run without facts (the rule never touches the title formula or the H1 gate)', async () => {
  const h = harness();
  try {
    const cookie = await throughFacts(h);
    await settle(cookie);
    const session = sessionOf(h, cookie);
    // The same writer for both runs: a hook built from the brief (as a model's would be), the subheadline from the facts.
    const seen: PageBrief[] = [];
    const writer = async (brief: PageBrief, data: CollectedData): Promise<SiteCopy> => { seen.push(brief); return fixtureCopyWriter([], [])(brief, data); };
    const run = (answersVersion: number) => generatePreviewHomepage({
      sessionId: session.id, researchId: session.researchId!, round: 1, answersVersion, collectedData: session.collectedData!, workLocation: null, publishedAddress: null,
    }, { now: h.now, researchBaseDir: h.researchBaseDir, mode: 'fixture', generateCopy: writer });
    const withFacts = await run(session.answersVersion) as Extract<PreviewGenerationOutcome, { ok: true }>;
    const noFacts = await run(session.answersVersion + 99) as Extract<PreviewGenerationOutcome, { ok: true }>;
    assert.ok(withFacts.ok && noFacts.ok);
    assert.ok(seen[0].firstPartyProof.some(item => item.id.startsWith('interview-')));
    assert.ok(!seen[1].firstPartyProof.some(item => item.id.startsWith('interview-')));
    assert.deepEqual(seen[0].site, seen[1].site, 'page name, city and service area are the same');
    const name = 'Step2c Plumbing';
    assert.equal(researchedPageTitle(withFacts.record.page, name), researchedPageTitle(noFacts.record.page, name));
    assert.equal(researchedPageH1(withFacts.record.page.copy.heroHeadline, withFacts.record.page.seo), researchedPageH1(noFacts.record.page.copy.heroHeadline, noFacts.record.page.seo));
    assert.deepEqual(withFacts.record.page.seo, noFacts.record.page.seo);
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
      generateCopy: async (brief, data) => { briefs.push(brief.page.pageClass); return fixtureCopyWriter([], [])(brief, data); },
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
