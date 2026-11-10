// Copy v2 slice 2 (docs/missions/site-bot-code-owns-facts-2026-11-10.md): the code-built trust bar and proof wired into
// generation, active only while the fact templates are complete (ASCII stand-ins injected here). While pending, today's
// model-written path is unchanged (scratch/m2b2/pipeline-snapshot.cjs and rerender.cjs check that byte for byte).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes; synthetic Hebrew letters are escapes (not words).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import { GATE_RULES, runCopyGates } from './copyGates';
import type { SiteCopy } from './lpCopyPrompt';
import { FACT_PARSE_TOKEN_KEYS, FACT_RULE_TOKEN_KEYS, setOwnerFactTemplatesForTests, type OwnerFactTemplates } from './ownerFactCopy';
import {
  assertBoundedGeneratedSiteCopy,
  briefGateContext,
  buildNoaQaMessage,
  buildResearchCopyRules,
  buildResearchPageGenerationPrompt,
  CODE_OWNED_FACT_FIELDS,
  codeOwnsFacts,
  generateResearchPageCopy,
  LICENSE_RULE_CODE_OWNED,
  RESEARCH_UNRENDERED_FIELDS,
  researchedRecordShapeOptions,
  shapeOptions,
  ungeneratedFieldsFor,
  withSystemFields,
} from './researchPageCopy';
import { RESEARCHED_RENDERED_FIELDS, researchedUngeneratedFieldsFor } from './researchedSite';

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
const NEW_FIELDS = [...CODE_OWNED_FACT_FIELDS, ...RESEARCH_UNRENDERED_FIELDS];

test('field lists: the never-rendered fields are not rendered; the code-owned trust bar and proof are', () => {
  assert.deepEqual(RESEARCH_UNRENDERED_FIELDS.filter(field => RESEARCHED_RENDERED_FIELDS.includes(field)), []);
  for (const field of ['trustBarItems', 'proofItems', 'proofHeadline']) assert.ok(RESEARCHED_RENDERED_FIELDS.includes(field), field);
});

test('researchedSite.ts holds zero Hebrew bytes (the renderer gains no Hebrew; code-built strings are written into the copy)', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../src/lib/lp/researchedSite.ts'), 'utf8');
  assert.equal(/[\u0590-\u05FF]/.test(source), false);
});

test('pending templates: the model-written path is unchanged', async () => {
  await pending(() => {
    for (const pageClass of ['homepage', 'money_service'] as const) {
      const page = brief(pageClass);
      assert.equal(codeOwnsFacts(page), false);
      assert.deepEqual(ungeneratedFieldsFor(page), researchedUngeneratedFieldsFor(pageClass));
      assert.equal(briefGateContext(page, data).codeOwnedFields, undefined);
      const prompt = buildResearchPageGenerationPrompt(page, data);
      assert.ok(prompt.includes('say only that he is licensed'), 'today\'s LICENSE rule');
      assert.ok(prompt.includes(ENGLISH_LICENSE), 'today the model sees the owner\'s licence');
      const settled = withSystemFields(loose(modelCopy()), page, data);
      assert.deepEqual((settled.trustBarItems as string[]).slice(0, 2), ['Model item one', 'Model item two'], 'model-written trust bar kept');
      assert.equal(settled.stickyBarLine, 'Sticky');
    }
  });
});

test('code-owned facts: the new fields leave generation (prompt, schema, hard limits, Noa) and are system-filled', async () => {
  await codeOwned(() => {
    for (const pageClass of ['homepage', 'money_service'] as const) {
      const page = brief(pageClass);
      assert.equal(codeOwnsFacts(page), true);
      assert.deepEqual(ungeneratedFieldsFor(page), [...researchedUngeneratedFieldsFor(pageClass), ...NEW_FIELDS]);
      const prompt = buildResearchPageGenerationPrompt(page, data);
      const keysLine = prompt.split('\n').filter(line => line.startsWith('- Output exactly these keys')).pop() ?? '';
      for (const field of NEW_FIELDS) {
        assert.equal(keysLine.includes(field), false, `${field} not in the output key list`);
        assert.equal(prompt.includes(`\n  "${field}": `), false, `${field} not in the schema OUTPUT object`);
      }
      assert.ok(/\n {2}"formHeadline": ""(?:,|\n\})/.test(prompt), 'the OUTPUT object stays well-formed');
      // LICENSE: no downgrade instruction; the English licence never reaches the model.
      assert.equal(prompt.includes('say only that he is licensed'), false);
      assert.ok(buildResearchCopyRules(page, data).includes(LICENSE_RULE_CODE_OWNED));
      assert.equal(prompt.includes(ENGLISH_LICENSE), false);
      assert.equal(prompt.includes('proof-license'), false);
      assert.ok(prompt.includes('proof-yearsInField'), 'the parsed facts are still shown');
      // Noa never sees the system-built fields.
      const settled = withSystemFields(loose(modelCopy()), page, data);
      const noa = buildNoaQaMessage(settled as unknown as SiteCopy, page);
      const shown = JSON.parse(noa.slice(0, noa.indexOf('\n\nHARD LIMITS'))) as Record<string, unknown>;
      for (const field of NEW_FIELDS) assert.equal(field in shown, false, `${field} hidden from Noa`);
    }
    // A Hebrew licence is the owner's own wording: it stays visible to the model.
    const hebrewLicense = '\u05D0\u05D1\u05D2\u05D3 \u05D4\u05D5\u05D6\u05D7';
    assert.ok(buildResearchPageGenerationPrompt(brief('money_service'), { ...data, license: hebrewLicense }).includes(hebrewLicense));
  });
});

test('code-owned facts: withSystemFields overwrites the trust bar and the proof with code strings', async () => {
  await codeOwned(() => {
    const home = withSystemFields(loose(modelCopy()), brief('homepage'), data);
    assert.deepEqual(home.trustBarItems, ['Y:12', 'W:1yr', 'Holon'], 'B2 order; the English licence is dropped; area tile');
    assert.equal(home.stickyBarLine, '');
    assert.equal(home.aboutBlurb, '');
    assert.equal(home.faqHeadline, '');
    assert.equal(home.guaranteeBlock, null);
    assert.equal(home.responseTimeBadge, null);
    assert.equal('proofItems' in home, false, 'no proof block on the homepage');
    assertBoundedGeneratedSiteCopy(home, shapeOptions(brief('homepage')));
    assertBoundedGeneratedSiteCopy(home, researchedRecordShapeOptions('homepage'));

    const page = brief('money_service');
    assert.equal(page.blocksEnabled?.proof, true, 'the fixture enables the proof block');
    const service = withSystemFields(loose({ ...modelCopy(), proofHeadline: 'Model proof heading', proofItems: [{ text: 'Model proof', factIds: ['proof-yearsInField'] }] }), page, data);
    assert.deepEqual(service.proofItems, [
      { text: 'I have 12 years.', factIds: ['proof-yearsInField'] },
      { text: 'You get a warranty for l1yr.', factIds: ['proof-guarantee'] },
      { text: 'I call back within 30min.', factIds: ['proof-responseTime'] },
    ]);
    assert.equal(service.proofHeadline, null, 'the approved fallback heading renders');
    assertBoundedGeneratedSiteCopy(service, shapeOptions(page));
    assertBoundedGeneratedSiteCopy(service, researchedRecordShapeOptions('money_service'));
  });
});

test('code-owned facts: no gate hit lands on the code-built fields', async () => {
  const fourItems = loose({ ...modelCopy(), trustBarItems: ['a', 'b', 'c', 'd'] });
  const onTrustBar = (ctx: ReturnType<typeof briefGateContext>) => runCopyGates(fourItems, ctx).filter(hit => hit.field.startsWith('trustBarItems'));
  await pending(() => assert.ok(onTrustBar(briefGateContext(brief('homepage'), data)).some(hit => hit.rule === GATE_RULES.trustBarSize), 'today: the size gate fires'));
  await codeOwned(() => {
    const ctx = briefGateContext(brief('homepage'), data);
    assert.deepEqual(ctx.codeOwnedFields, [...CODE_OWNED_FACT_FIELDS]);
    assert.deepEqual(onTrustBar(ctx), []);
    // The proof items are never fact-traced (an unknown fact id would otherwise fail the trace).
    const service = brief('money_service');
    const untraced = loose({ ...modelCopy(), proofItems: [{ text: 'I have 99 years.', factIds: ['proof-unknown'] }] });
    assert.deepEqual(runCopyGates(untraced, briefGateContext(service, data)).filter(hit => hit.field.startsWith('proofItems')), []);
  });
});

test('code-owned facts end to end (mocked model, no network): the final copy carries the code strings', async () => {
  await codeOwned(async () => {
    const page = brief('money_service');
    const calls: Array<{ system: string; user: string }> = [];
    // The model answers without the ungenerated keys, as instructed; Noa echoes what she is shown.
    const answer = Object.fromEntries(Object.entries(modelCopy()).filter(([key]) => !ungeneratedFieldsFor(page).includes(key)));
    const copy = await generateResearchPageCopy(page, data, {
      gates: false,
      callJson: async (system, user) => {
        calls.push({ system, user });
        return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : answer);
      },
    });
    assert.equal(calls.length, 2, 'Tamar and Noa, no repair');
    assert.deepEqual(copy.trustBarItems, ['Y:12', 'W:1yr', 'Holon']);
    assert.equal((copy as unknown as Record<string, unknown>).proofHeadline, null);
    assert.equal(((copy as unknown as Record<string, unknown>).proofItems as unknown[]).length, 3);
    assert.equal(copy.stickyBarLine, '');
    for (const field of NEW_FIELDS) assert.equal(calls[1].user.slice(0, calls[1].user.indexOf('\n\nHARD LIMITS')).includes(`"${field}"`), false, `${field} not sent to Noa`);
  });
});
