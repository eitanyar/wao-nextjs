// Copy v2 slice 4 (docs/missions/site-bot-code-owns-facts-2026-11-10.md): gate_fact_restatement, the hero allowance and the
// drop-then-one-repair order. Real m2b1i copy comes from testdata/m2b1i-copy-v2.json (moved byte-exact by script from the
// read-only scratch/m2b1i eval records); this file holds ZERO Hebrew bytes (synthetic letters are escapes).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import { ALWAYS_BLOCKING_RULES, GATE_RULES, isWarningHit, runCopyGates } from './copyGates';
import { factRestatementHits, restatementMatches, type FactRestatementSpec } from './factRestatement';
import type { SiteCopy } from './lpCopyPrompt';
import { FACT_PARSE_TOKEN_KEYS, FACT_RULE_TOKEN_KEYS, setOwnerFactTemplatesForTests, type OwnerFactTemplates } from './ownerFactCopy';
import {
  applyDropPlan,
  assertBoundedGeneratedSiteCopy,
  briefGateContext,
  dropRestatements,
  emptyDropPlan,
  generateResearchPageCopy,
  GeneratedCopyValidationError,
  planFieldDrop,
  RESTATEMENT_MAX_REPAIRS,
  shapeOptions,
  templatePhrase,
  ungeneratedFieldsFor,
  withSystemFields,
  type CopyRepairEvent,
} from './researchPageCopy';

const T: OwnerFactTemplates = {
  trustYears: 'Y:{n}', trustLicense: 'L:{license}', trustLicenseNumber: 'LN:{number}', trustWarranty: 'W:{duration}',
  trustWarrantyVerbatim: '{warranty}', trustResponse: 'R:{time}', trustRating: '{rating}*/{count}', trustRatingNoCount: '{rating}*',
  proofYears: 'I have {n} years.', proofLicense: 'I hold {license}.', proofLicenseNumber: 'My licence is {number}.',
  proofWarranty: 'You get a warranty for {duration}.', proofWarrantyVerbatim: 'Warranty: {warranty}.', proofResponse: 'I arrive within {time}.',
  warrantyBareSixMonths: '6mo', warrantyBareOneYear: '1yr', warrantyBareTwoYears: '2yr', warrantyBareNYears: '{n}yr',
  warrantyLamedSixMonths: 'l6mo', warrantyLamedOneYear: 'l1yr', warrantyLamedTwoYears: 'l2yr', warrantyLamedNYears: 'l{n}yr',
  responseMinutes: '{n}min', responseOneHour: '1h', responseTwoHours: '2h', responseHours: '{n}h',
  trustYearsOne: 'Y:1', trustYearsTwo: 'Y:2', trustResponseSameDay: 'R:sameday', trustRatingOneReview: '{rating}*/1', proofYearsOne: 'I have one year.', proofYearsTwo: 'I have two years.', proofLicenseVerbatim: '{license}.', proofResponseSameDay: 'I arrive the same day.', warrantyBareOneMonth: '1mo', warrantyBareTwoMonths: '2mo', warrantyBareNMonths: '{n}mo', warrantyBareOneAndHalfYears: '18mo', warrantyLamedOneMonth: 'l1mo', warrantyLamedTwoMonths: 'l2mo', warrantyLamedNMonths: 'l{n}mo', warrantyLamedOneAndHalfYears: 'l18mo', responseOneMinute: '1min!', responseHalfHour: 'half-h',
  proofWarrantyScoped: 'You get a warranty for {duration} {scope}.', proofResponseScoped: 'I arrive within {time} {scope}.', proofResponseSameDayScoped: 'I arrive the same day {scope}.', trustCallback: 'R:{time}', trustCallbackSameDay: 'R:sameday', proofCallback: 'I call back within {time}.', proofCallbackSameDay: 'I call back the same day.', qaAnswerLead: 'At {business} in {city}:',
  proofCallbackArrival: 'I call back within {time} and book a visit.', proofCallbackArrivalSameDay: 'I call back the same day and book a visit.', trustContractorRegistered: 'RC', proofContractorRegistered: 'I am in the register.', proofContractorRegisteredDetail: 'I am in the register, {detail}.',
  ...Object.fromEntries([...FACT_PARSE_TOKEN_KEYS, ...FACT_RULE_TOKEN_KEYS].map(key => [key, [`zz${key}`]])),
} as OwnerFactTemplates;

/** Run fn with the stand-in templates active (code owns the facts), then restore the real (pending) flag. */
async function codeOwned<R>(fn: () => R | Promise<R>): Promise<R> {
  setOwnerFactTemplatesForTests(T);
  try { return await fn(); } finally { setOwnerFactTemplatesForTests(undefined); }
}
async function pending<R>(fn: () => R | Promise<R>): Promise<R> {
  setOwnerFactTemplatesForTests(null);
  try { return await fn(); } finally { setOwnerFactTemplatesForTests(undefined); }
}

const ENGLISH_LICENSE = 'Master electrician license';
const data: CollectedData = {
  businessName: 'TEST Biz', businessNiche: 'plumber', primaryService: 'leak repair', targetLocation: 'Holon', specificCities: 'Holon',
  yearsInField: '12', guarantee: '1 year warranty', responseTime: 'within 30 minutes', license: ENGLISH_LICENSE,
  usp: 'I find the leak before I open anything', phone: '050-0000000',
};

function briefInput(pageClass: 'homepage' | 'money_service'): PageBriefInput {
  const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
  const home = pageClass === 'homepage';
  return {
    page: { id: home ? 'home' : 'svc-leak-repair', targetPath: home ? '/' : '/services/leak-repair', pageClass },
    persona: approved('persona', 'A local customer in Holon'),
    waoOffer: approved('offer', 'TEST Biz: I find the leak before I open anything'),
    targetQueries: [approved('query-1', 'leak repair Holon')],
    entityAnchors: [approved('entity-1', 'leak repair')],
    firstPartyProof: [
      approved('proof-yearsInField', 'Years in the field (owner-stated): 12'),
      approved('proof-guarantee', 'Guarantee (owner-stated): 1 year warranty'),
      approved('proof-license', `License (owner-stated): ${ENGLISH_LICENSE}`),
      approved('proof-responseTime', 'Response time (owner-stated): within 30 minutes'),
    ],
    localFacts: [approved('local-area', 'Service area (owner-stated): Holon')],
    customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [],
    links: home ? [{ targetPath: '/services/leak-repair', relationship: 'service_child', evidenceIds: ['entity-1'] }] : [],
    site: {
      pageName: 'leak repair', relevanceTerm: 'leak repair', city: 'Holon', serviceArea: ['Holon'], serviceLabels: ['leak repair'],
      businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: home,
    },
    ...(home ? {} : { depth: { wordTarget: 420, terms: [], questions: [], serviceFacts: [], filters: { latinAllowed: true } } }),
  } as PageBriefInput;
}
const brief = (pageClass: 'homepage' | 'money_service'): PageBrief => compilePageBrief(briefInput(pageClass));

/** A model answer as today's model writes it (model-written trust bar, sticky line, badge ...). */
const modelCopy = (): SiteCopy => ({
  heroHeadline: 'leak repair in Holon', heroSubheadline: 'Subheadline', heroCta: 'Call', trustBarItems: ['Model item one', 'Model item two'],
  aboutBlurb: 'About', servicesHeadline: 'Services', serviceItems: ['leak repair'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Model guarantee',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: 'Model badge', scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky',
  aboutPageHeadline: 'About page', aboutPageBody: 'About body.', serviceDetails: [],
});
const loose = (copy: object) => ({ ...copy }) as unknown as Record<string, unknown>;

interface FixturePage { id: string; classification: string; brief: PageBrief; copy: Record<string, unknown> }
const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../src/lib/lp/testdata/m2b1i-copy-v2.json'), 'utf8')) as {
  runs: Record<string, { data: CollectedData; pages: FixturePage[] }>;
};
const real = (run: string, id: string) => {
  const entry = FIXTURE.runs[run];
  const page = entry.pages.find(item => item.id === id);
  if (!page) throw new Error(`fixture page ${run}/${id}`);
  return { data: entry.data, brief: page.brief, copy: structuredClone(page.copy) };
};
const restated = (copy: Record<string, unknown>, ctx: ReturnType<typeof briefGateContext>) =>
  runCopyGates(copy, ctx).filter(hit => hit.rule === GATE_RULES.factRestatement).map(hit => `${hit.field}:${hit.actual}`);

const SPEC: FactRestatementSpec = {
  facts: [
    { kind: 'years', digits: ['18'], phrases: ['zzyears trade'] },
    { kind: 'warranty', digits: [], phrases: ['zzwarranty'] },
    { kind: 'response', digits: ['20'], phrases: [] },
  ],
  usp: 'I arrive within 20 minutes',
};

test('restatement matches: whole digit runs, phrases with up to two prefix letters', () => {
  assert.deepEqual(restatementMatches('18 years, 180 jobs, 2018', SPEC), [{ kind: 'years', text: '18' }]);
  const bet = '\u05D1';
  assert.deepEqual(restatementMatches(`with ${bet}zzwarranty and zzwarrantyx`, SPEC).map(item => item.kind), ['warranty']);
  assert.equal(templatePhrase('{n} zzyears trade'), 'zzyears trade');
  assert.equal(templatePhrase('{n} zzyears'), null, 'one word left is not a phrase');
});

test('hero allowance: one usp restatement in the hero is allowed once; a second, or one outside the usp, is a hit', () => {
  const hero = (headline: string, sub: string) => factRestatementHits([{ field: 'heroHeadline', value: headline }, { field: 'heroSubheadline', value: sub }], SPEC);
  assert.deepEqual(hero('Plumber, within 20 minutes', 'I fix it on the spot'), []);
  assert.deepEqual(hero('Plumber, within 20 minutes', 'with zzwarranty').map(hit => hit.field), ['heroHeadline', 'heroSubheadline'], 'two in the hero: both');
  assert.deepEqual(hero('Plumber with 18 years', 'I fix it').map(hit => hit.kind), ['years'], 'not part of the usp');
  assert.deepEqual(factRestatementHits([{ field: 'storyBody', value: 'within 20 minutes' }], SPEC).map(hit => hit.field), ['storyBody'], 'outside the hero: always a hit');
});

test('gate_fact_restatement is always blocking, and off while the templates are pending', async () => {
  assert.ok(ALWAYS_BLOCKING_RULES.includes(GATE_RULES.factRestatement));
  const { data, brief: page, copy } = real('hebrew-plumber-1', 'home');
  await pending(() => {
    const ctx = briefGateContext(page, data);
    assert.equal(ctx.factRestatement, undefined);
    assert.deepEqual(restated(copy, ctx), []);
  });
  await codeOwned(() => {
    const ctx = briefGateContext(page, data);
    assert.ok(ctx.factRestatement);
    assert.equal(isWarningHit({ field: 'storyBody', rule: GATE_RULES.factRestatement }, ctx), false, 'blocks on the warn-only story too');
  });
});

test('real m2b1i copy: the restatement hits (true hits) and the hero allowance', async () => {
  await codeOwned(() => {
    const plumber = real('hebrew-plumber-1', 'home');
    const ctx = briefGateContext(plumber.brief, plumber.data);
    const settled = withSystemFields(plumber.copy, plumber.brief, plumber.data);
    // heroHeadline states the usp response time ("within 20 minutes"): the allowance. storyBody restates it and the warranty;
    // aboutPageBody restates the warranty.
    assert.deepEqual(restated(settled, ctx), ['storyBody:restatement:response', 'storyBody:restatement:warranty', 'aboutPageBody:restatement:warranty']);
    const solar = real('hebrew-plumber-1', 'svc-solar-heater-installation');
    const solarHits = restated(withSystemFields(solar.copy, solar.brief, solar.data), briefGateContext(solar.brief, solar.data));
    assert.ok(solarHits.includes('heroSubheadline:restatement:warranty'), 'a warranty in the hero is not part of the usp');
    const electrician = real('electrician-2', 'home');
    assert.deepEqual(restated(withSystemFields(electrician.copy, electrician.brief, electrician.data), briefGateContext(electrician.brief, electrician.data)), ['aboutPageBody:restatement:years']);
  });
});

test('drop first: about sentence (minimum kept), Q&A items; the story at its minimum is left for the repair', async () => {
  await codeOwned(() => {
    const electrician = real('electrician-2', 'home');
    const ctx = briefGateContext(electrician.brief, electrician.data);
    const copy = withSystemFields(electrician.copy, electrician.brief, electrician.data);
    assert.deepEqual(dropRestatements(copy, ctx), ['restatement_drop_sentence:aboutPageBody:5->4']);
    assert.deepEqual(restated(copy, ctx), []);
    const panel = real('electrician-2', 'svc-electrical-panel-upgrade');
    const panelCopy = withSystemFields(panel.copy, panel.brief, panel.data);
    assert.deepEqual(dropRestatements(panelCopy, briefGateContext(panel.brief, panel.data)), ['restatement_drop_depth_block:qaItems:3->0'], 'below the Q&A minimum: null');
    assert.equal(panelCopy.qaItems, null);
    const plumber = real('hebrew-plumber-1', 'home');
    const plumberCtx = briefGateContext(plumber.brief, plumber.data);
    const plumberCopy = withSystemFields(plumber.copy, plumber.brief, plumber.data);
    assert.deepEqual(dropRestatements(plumberCopy, plumberCtx), [], 'story and about at 3 sentences: never below the minimum');
    assert.equal(restated(plumberCopy, plumberCtx).length, 3, 'still blocking: the repair takes it');
  });
});

test('drop plan: a card loses its description (the name stays); the validator accepts it only with code-owned facts', async () => {
  const copy = { serviceDetails: [{ name: 'a', description: 'one sentence of the card that is long enough.' }, { name: 'b', description: 'another card sentence, long enough as well.' }] } as Record<string, unknown>;
  const plan = emptyDropPlan();
  assert.equal(planFieldDrop(plan, 'serviceDetails[1].description'), true);
  assert.equal(planFieldDrop(plan, 'heroSubheadline'), false, 'the hero is never dropped');
  assert.deepEqual(applyDropPlan(copy, plan, 'restatement'), ['restatement_drop_item:serviceDetails[1].description']);
  assert.deepEqual(copy.serviceDetails, [{ name: 'a', description: 'one sentence of the card that is long enough.' }, { name: 'b', description: '' }]);
  const home = brief('homepage');
  const page = { ...withSystemFields(loose(modelCopy()), home, data), serviceDetails: [{ name: 'leak repair', description: '' }] };
  await pending(() => assert.throws(() => assertBoundedGeneratedSiteCopy(page, shapeOptions(home))));
  await codeOwned(() => {
    const settled = { ...withSystemFields(loose(modelCopy()), home, data), serviceDetails: [{ name: 'leak repair', description: '' }] };
    assertBoundedGeneratedSiteCopy(settled, shapeOptions(home));
    assert.deepEqual(runCopyGates(settled as unknown as Record<string, unknown>, briefGateContext(home, data)).filter(hit => hit.rule === GATE_RULES.shortDescription), []);
  });
});

test('repair order (mocked model): an undroppable restatement gets one repair, then the page fails on it', async () => {
  await codeOwned(async () => {
    const page = brief('money_service');
    const answer = Object.fromEntries(Object.entries({ ...modelCopy(), heroSubheadline: 'I give 12 years to every leak' }).filter(([key]) => !ungeneratedFieldsFor(page).includes(key)));
    const events: CopyRepairEvent[] = [];
    let repairs = 0;
    const run = (fixInRepair: boolean) => generateResearchPageCopy(page, data, {
      onEvent: event => events.push(event),
      callJson: async (system, user) => {
        if (/^You are Noa/.test(system)) return JSON.stringify(JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))));
        if (/repairing specific fields/.test(system)) { repairs++; return JSON.stringify({ heroSubheadline: fixInRepair ? 'I find the leak first' : 'Still 12 years here' }); }
        return JSON.stringify(answer);
      },
    });
    await assert.rejects(run(false), (error: unknown) => {
      assert.ok(error instanceof GeneratedCopyValidationError);
      assert.ok(error.violations.some(violation => violation.rule === GATE_RULES.factRestatement && violation.field === 'heroSubheadline'));
      return true;
    });
    const restatementRepairs = events.filter(event => event.kind === 'repair' && (event.violations ?? []).some(violation => violation.rule === GATE_RULES.factRestatement)).length;
    assert.equal(restatementRepairs, RESTATEMENT_MAX_REPAIRS, 'exactly one repair carried the restatement');
    repairs = 0;
    events.length = 0;
    const copy = await run(true);
    assert.equal(copy.heroSubheadline, 'I find the leak first');
    assert.equal(repairs, 1);
  });
});
