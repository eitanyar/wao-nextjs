// Copy v2 slice 3 (docs/missions/site-bot-code-owns-facts-2026-11-10.md): the short v2 prompt, used once code owns the facts.
// While the fact templates are pending every page keeps v1 (scratch/m2b2/pipeline-snapshot.cjs checks it byte for byte).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes (fixture copied from ownerFactWiring.test.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import type { SiteCopy } from './lpCopyPrompt';
import { FACT_PARSE_TOKEN_KEYS, setOwnerFactTemplatesForTests, type OwnerFactTemplates } from './ownerFactCopy';
import {
  buildResearchCopyRulesV2,
  buildResearchPageGenerationPrompt,
  buildResearchPageGenerationPromptV2,
  generateResearchPageCopy,
  P6_STICKY_SENTENCE,
  promptV2RuleCount,
  resolvePromptVersion,
  ungeneratedFieldsFor,
} from './researchPageCopy';

const T: OwnerFactTemplates = {
  trustYears: 'Y:{n}', trustLicense: 'L:{license}', trustLicenseNumber: 'LN:{number}', trustWarranty: 'W:{duration}',
  trustWarrantyVerbatim: '{warranty}', trustResponse: 'R:{time}', trustRating: '{rating}*/{count}', trustRatingNoCount: '{rating}*',
  proofYears: 'I have {n} years.', proofLicense: 'I hold {license}.', proofLicenseNumber: 'My licence is {number}.',
  proofWarranty: 'You get a warranty for {duration}.', proofWarrantyVerbatim: 'Warranty: {warranty}.', proofResponse: 'I arrive within {time}.',
  warrantyBareSixMonths: '6mo', warrantyBareOneYear: '1yr', warrantyBareTwoYears: '2yr', warrantyBareNYears: '{n}yr',
  warrantyLamedSixMonths: 'l6mo', warrantyLamedOneYear: 'l1yr', warrantyLamedTwoYears: 'l2yr', warrantyLamedNYears: 'l{n}yr',
  responseMinutes: '{n}min', responseOneHour: '1h', responseTwoHours: '2h', responseHours: '{n}h',
  ...Object.fromEntries(FACT_PARSE_TOKEN_KEYS.map(key => [key, [`zz${key}`]])),
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

const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);

test('prompt version: v1 while the templates are pending, v2 by default once code owns the facts, v1 on request', async () => {
  await pending(() => {
    assert.equal(resolvePromptVersion(brief('homepage')), 'v1');
    assert.equal(resolvePromptVersion(brief('homepage'), 'v2'), 'v1', 'v2 needs code-owned facts');
    assert.throws(() => buildResearchPageGenerationPromptV2(brief('homepage'), data));
  });
  await codeOwned(() => {
    assert.equal(resolvePromptVersion(brief('homepage')), 'v2');
    assert.equal(resolvePromptVersion(brief('money_service'), 'v1'), 'v1');
  });
});

/** Text of rules the v2 skeleton removes (code owns the facts) or that name never-generated fields. */
const REMOVED = [
  'LICENSE (binding)', 'CREDENTIAL TIER', 'P7 \u2014', 'B2 \u2014', 'C4 \u2014', 'C5 \u2014', 'PROOF HOME', 'Every proof point you put in trustBarItems',
  'Use each owner fact at most twice', 'USP ABOVE THE FOLD', 'SITE TERMS', 'trustBarFillerPhrases', 'stickyActionTokens', 'sticky', 'Sticky',
  'aboutBlurb', 'guaranteeBlock', 'responseTimeBadge', 'PRICE (binding)', 'FREE OF CHARGE', 'say only that he is licensed', 'trust-bar area tile',
  'faqPolicy rule in the research rules',
];

test('v2 prompt: the removed rules are gone, the kept ones are there, the facts are listed as already on the page', async () => {
  await codeOwned(() => {
    for (const pageClass of ['homepage', 'money_service'] as const) {
      const page = brief(pageClass);
      const prompt = buildResearchPageGenerationPromptV2(page, data);
      for (const text of REMOVED) assert.equal(prompt.includes(text), false, `${pageClass}: ${text}`);
      for (const text of ['ALREADY ON THE PAGE', 'REPETITION BUDGET', 'The system drops what adds nothing new', 'ORDER AND LOGISTICS', 'FEAR IS NOT A GUARANTEE', 'HOURS AND AVAILABILITY', 'SERVICE AREA (binding)', 'SAME DAY (binding)', 'NAMES (binding)', 'CUT CONTRACT', 'HARD LIMITS', 'search anchor']) {
        assert.ok(prompt.includes(text), `${pageClass}: ${text}`);
      }
      assert.ok(prompt.includes('"Y:12"') && prompt.includes('"W:1yr"'), 'the code-built trust bar is listed');
      assert.equal(prompt.includes(ENGLISH_LICENSE), false, 'the English licence never reaches the model');
      assert.equal(prompt.includes(P6_STICKY_SENTENCE.trim()), false);
      // Output keys: no code-owned or never-rendered field.
      const keysLine = prompt.split('\n').filter(line => line.startsWith('- Output exactly these keys')).pop() ?? '';
      for (const field of ['trustBarItems', 'proofItems', 'proofHeadline', 'stickyBarLine', 'aboutBlurb', 'faqHeadline']) assert.equal(keysLine.includes(field), false, field);
      const output = prompt.slice(prompt.indexOf('OUTPUT (JSON only'), prompt.indexOf('HARD LIMITS'));
      const skeleton = JSON.parse(output.slice(output.indexOf('{'))) as Record<string, unknown>;
      assert.deepEqual(Object.keys(skeleton).filter(key => ungeneratedFieldsFor(page).includes(key)), []);
    }
    const proofPage = buildResearchPageGenerationPromptV2(brief('money_service'), data);
    assert.ok(proofPage.includes('"I have 12 years."'), 'the code-built proof is listed on a service page');
    assert.ok(proofPage.includes('never output those keys'), 'the depth section says the system builds the proof');
  });
});

test('v2 prompt: rule count (about 30, down from about 90) and a pinned snapshot', async () => {
  await codeOwned(() => {
    const home = brief('homepage');
    const service = brief('money_service');
    const counts = { home: promptV2RuleCount(home, data), service: promptV2RuleCount(service, data) };
    assert.deepEqual(counts, { home: 38, service: 27 });
    for (const section of [...buildResearchCopyRulesV2(home, data), ...buildResearchCopyRulesV2(service, data)]) {
      for (const rule of section.rules) assert.ok(rule.startsWith('- '), `${section.heading}: every rule is one bullet`);
    }
    const v1 = buildResearchPageGenerationPrompt(home, data);
    const v2 = buildResearchPageGenerationPromptV2(home, data);
    assert.ok(v2.length < v1.length * 0.7, `v2 is shorter (${v2.length} vs ${v1.length})`);
    assert.deepEqual({ home: sha(v2), service: sha(buildResearchPageGenerationPromptV2(service, data)) }, PINNED_V2);
  });
});

/** Re-pin deliberately when a v2 rule changes (print the new values with the assert message). */
const PINNED_V2 = { home: '25ee05e2091aa6dd', service: '129b9c2ce0d599f8' };

test('v2 end to end (mocked model): Tamar gets the v2 prompt and the short system prompt; v1 on request', async () => {
  await codeOwned(async () => {
    const page = brief('money_service');
    const answer = Object.fromEntries(Object.entries(modelCopy()).filter(([key]) => !ungeneratedFieldsFor(page).includes(key)));
    const run = async (promptVersion?: 'v1' | 'v2') => {
      const calls: Array<{ system: string; user: string }> = [];
      await generateResearchPageCopy(page, data, {
        gates: false, ...(promptVersion ? { promptVersion } : {}),
        callJson: async (system, user) => {
          calls.push({ system, user });
          return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : answer);
        },
      });
      return calls;
    };
    const v2 = await run();
    assert.equal(v2[0].user, buildResearchPageGenerationPromptV2(page, data));
    assert.equal(v2[0].system.includes('VOICE (binding)'), false, 'the v2 system prompt is the role and the address rule');
    const v1 = await run('v1');
    assert.equal(v1[0].user, buildResearchPageGenerationPrompt(page, data));
    assert.ok(v1[0].system.includes('VOICE (binding)'));
  });
  await pending(async () => {
    const page = brief('money_service');
    const calls: string[] = [];
    await generateResearchPageCopy(page, data, {
      gates: false, promptVersion: 'v2',
      callJson: async (system, user) => { calls.push(user); return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : modelCopy()); },
    });
    assert.equal(calls[0], buildResearchPageGenerationPrompt(page, data), 'pending: v1, byte-identical');
  });
});
