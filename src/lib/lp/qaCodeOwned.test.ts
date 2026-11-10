// Copy v2 slice 6 (+ Yonatan's 2026-11-10 amendment): code-built Q&A items for code-owned facts, the pool wording as q, the
// answer lead, the brand gate, and the budget / restatement exemptions. ASCII stand-in templates (plus checks against the
// real template lists). HEBREW-SAFETY: this file contains ZERO Hebrew bytes; synthetic Hebrew letters are escapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import { GATE_RULES, runCopyGates } from './copyGates';
import type { SiteCopy } from './lpCopyPrompt';
import {
  FACT_PARSE_TOKEN_KEYS,
  FACT_RULE_TOKEN_KEYS,
  OWNER_FACT_TEMPLATES,
  ownerFacts,
  proofText,
  setOwnerFactTemplatesForTests,
  type OwnerFactTemplates,
} from './ownerFactCopy';
import { optionalList, planQa, qaQuestionDisposition, qaTopicsPending, qaTopicTokens, questionTopic, QA_TOPIC_EXCLUDE_KEYS, QA_TOPIC_PRIORITY } from './qaCodeOwned';
import { PREFIX_LETTERS } from './hebrewPrefixLetters';
import { FACT_OPTIONAL_LIST_KEYS, responseTimeText } from './ownerFactCopy';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyDeterministicDrops,
  briefGateContext,
  buildResearchPageGenerationPromptV2,
  codeOwnedQa,
  dropQaBrandAnswers,
  repetitionBudgetInputs,
  withQaAnswerLeads,
  withSystemFields,
} from './researchPageCopy';
import { costFaq } from './researchedPricing';
import { renderResearchedSitePages, type ResearchedSitePage } from './researchedSite';
import { repetitionBudgetDecisions } from './repetitionBudget';
import { VERTICAL_ASSETS } from './verticalAssets';
import { VERTICAL_THEMES } from './verticalThemes';

type Loose = Record<string, unknown>;

/** A synthetic Hebrew city (escapes, not a word): the cost FAQ needs a Hebrew city. */
const CITY = '\u05D0\u05D1\u05D2\u05D3';

const T = {
  trustYears: 'Y:{n}', trustLicense: 'L:{license}', trustLicenseNumber: 'LN:{number}', trustWarranty: 'W:{duration}',
  trustWarrantyVerbatim: '{warranty}', trustResponse: 'R:{time}', trustRating: '{rating}*/{count}', trustRatingNoCount: '{rating}*',
  proofYears: 'I have {n} years.', proofLicense: 'I hold {license}.', proofLicenseNumber: 'My licence is {number}.',
  proofWarranty: 'You get a warranty for {duration}.', proofWarrantyVerbatim: 'Warranty: {warranty}.', proofResponse: 'I arrive within {time}.',
  warrantyBareSixMonths: '6mo', warrantyBareOneYear: '1yr', warrantyBareTwoYears: '2yr', warrantyBareNYears: '{n}yr',
  warrantyLamedSixMonths: 'l6mo', warrantyLamedOneYear: 'l1yr', warrantyLamedTwoYears: 'l2yr', warrantyLamedNYears: 'l{n}yr',
  responseMinutes: '{n}min', responseOneHour: '1h', responseTwoHours: '2h', responseHours: '{n}h',
  trustYearsOne: 'Y:1', trustYearsTwo: 'Y:2', trustResponseSameDay: 'R:sameday', trustRatingOneReview: '{rating}*/1', proofYearsOne: 'I have one year.', proofYearsTwo: 'I have two years.', proofLicenseVerbatim: '{license}.', proofResponseSameDay: 'I arrive the same day.', warrantyBareOneMonth: '1mo', warrantyBareTwoMonths: '2mo', warrantyBareNMonths: '{n}mo', warrantyBareOneAndHalfYears: '18mo', warrantyLamedOneMonth: 'l1mo', warrantyLamedTwoMonths: 'l2mo', warrantyLamedNMonths: 'l{n}mo', warrantyLamedOneAndHalfYears: 'l18mo', responseOneMinute: '1min!', responseHalfHour: 'half-h',
  proofWarrantyScoped: 'You get a warranty for {duration} {scope}.', proofResponseScoped: 'I arrive within {time} {scope}.', proofResponseSameDayScoped: 'I arrive the same day {scope}.', trustCallback: 'C:{time}', trustCallbackSameDay: 'C:sameday', proofCallback: 'I call back within {time}.', proofCallbackSameDay: 'I call back the same day.', qaAnswerLead: 'At {business} in {city}:',
  proofCallbackArrival: 'I call back within {time} and book a visit.', proofCallbackArrivalSameDay: 'I call back the same day and book a visit.', trustContractorRegistered: 'RC', proofContractorRegistered: 'I am in the register.', proofContractorRegisteredDetail: 'I am in the register, {detail}.',
  ...Object.fromEntries([...FACT_PARSE_TOKEN_KEYS, ...FACT_RULE_TOKEN_KEYS].map(key => [key, [`zz${key}`]])),
  costQuestionTokens: ['cost'],
  qaLicenseQuestionTokens: ['licence'],
  qaResponseQuestionTokens: ['callback'],
  qaResponseCallbackShapeTokens: ['callback'],
  qaResponseArrivalShapeTokens: ['arrive'],
  qaWarrantyQuestionTokens: ['warranty'],
  qaYearsQuestionTokens: ['experience'],
} as unknown as OwnerFactTemplates;

async function codeOwned<R>(fn: () => R | Promise<R>, templates: OwnerFactTemplates = T): Promise<R> {
  setOwnerFactTemplatesForTests(templates);
  try { return await fn(); } finally { setOwnerFactTemplatesForTests(undefined); }
}

const data: CollectedData = {
  businessName: 'TEST Biz', businessNiche: 'plumber', primaryService: 'leak repair', targetLocation: CITY, specificCities: CITY,
  yearsInField: '12', license: 'No. 48210', guarantee: '1 year', responseTime: '20 minutes', usp: 'I find the leak before I open anything',
  phone: '050-0000000', startingPrices: [{ job: 'leak repair', from: 350 }],
};

const QUESTIONS = ['What does it cost?', 'Do you have a licence?', 'How fast is the callback?', 'Is there a warranty?', 'How much experience?', 'Do you open walls?', 'What happens first?'];

function briefInput(questions: string[] = QUESTIONS, pageClass: 'money_service' | 'homepage' = 'money_service', pageName = 'leak repair'): PageBriefInput {
  const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
  return {
    page: { id: pageClass === 'homepage' ? 'home' : 'svc-leak-repair', targetPath: pageClass === 'homepage' ? '/' : '/services/leak-repair', pageClass },
    persona: approved('persona', 'A local customer who needs leak repair now'),
    waoOffer: approved('offer', 'TEST Biz: I find the leak before I open anything'),
    targetQueries: [approved('query-1', 'leak repair')],
    entityAnchors: [approved('entity-1', 'leak repair')],
    firstPartyProof: ['yearsInField', 'license', 'guarantee', 'responseTime'].map(key => approved(`proof-${key}`, `${key} (owner-stated): ${String(data[key as keyof CollectedData])}`)),
    localFacts: [approved('local-area', `Service area (owner-stated): ${CITY}`)],
    customerDecisions: [], constraints: [], links: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [],
    site: {
      pageName, relevanceTerm: pageName, city: CITY, serviceArea: [CITY], serviceLabels: [pageName],
      businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: pageClass === 'homepage',
    },
    depth: {
      wordTarget: 420,
      terms: [],
      questions: questions.map(question => ({ question, source: 'paa' as const })),
      serviceFacts: [approved('service-walkthrough', 'How a typical job runs (owner\'s own words): he calls, I come, I find the leak, I fix it')],
      filters: { latinAllowed: true },
    },
  };
}
const brief = (questions?: string[], pageClass?: 'money_service' | 'homepage', pageName?: string): PageBrief => compilePageBrief(briefInput(questions, pageClass, pageName));

test('topic detection: one topic per code-owned fact, in priority order; Noa r3 lists every topic (none pending)', async () => {
  await codeOwned(() => {
    assert.deepEqual(QUESTIONS.map(question => questionTopic(question, T)), ['price', 'license', 'callback', 'warranty', 'years', null, null]);
    assert.equal(questionTopic('What does the warranty cost?', T), 'price', 'two topics: the first in QA_TOPIC_PRIORITY wins');
  });
  const R = OWNER_FACT_TEMPLATES;
  assert.deepEqual(qaTopicsPending(R), [], 'Noa r3: qaResponseQuestionTokens exists');
  const tokens = qaTopicTokens(R);
  assert.deepEqual(tokens.price, R.costQuestionTokens);
  assert.deepEqual(tokens.callback, R.qaResponseQuestionTokens);
  assert.deepEqual(tokens.license, R.qaLicenseQuestionTokens);
  assert.deepEqual(tokens.warranty, R.qaWarrantyQuestionTokens);
  assert.deepEqual(tokens.years, R.qaYearsQuestionTokens);
  for (const topic of QA_TOPIC_PRIORITY) assert.ok(tokens[topic].length > 0, topic);
  assert.equal(questionTopic(`${R.costQuestionTokens[0]}?`, R), 'price');
  assert.equal(questionTopic(`${R.parseWarrantyWords[0]}?`, R), 'warranty');
});

test('one code-built item per fact type: q = the pool question verbatim, a = the code-rendered fact, priority order', async () => {
  await codeOwned(() => {
    const page = brief();
    const plan = planQa(page, data, T, { installPage: false });
    const facts = ownerFacts(data, page, T);
    const faq = costFaq(data, { service: 'leak repair', city: CITY, business: 'TEST Biz' });
    assert.ok(faq, 'the cost FAQ answers the price question');
    assert.deepEqual(plan.codeItems.map(item => item.q), QUESTIONS.slice(0, 5));
    assert.deepEqual(plan.codeItems.map(item => item.a), [
      faq.a,
      proofText(facts.license!, T),
      proofText(facts.response!, T),
      proofText(facts.warranty!, T),
      proofText(facts.years!, T),
    ]);
    assert.equal(plan.codeItems[2].a, 'I call back within 20min.', 'the callback set');
    assert.deepEqual(plan.codeItems.slice(1).map(item => item.factIds[0]), ['proof-license', 'proof-responseTime', 'proof-guarantee', 'proof-yearsInField']);
    assert.deepEqual(plan.modelPool.map(item => item.question), QUESTIONS.slice(5), 'only the other questions reach the model');
    assert.deepEqual(plan.droppedQuestionIds, []);
  });
});

test('no owner fact -> no item and no question (never a filler answer); install pages never answer the callback', async () => {
  await codeOwned(() => {
    const page = brief();
    const bare: CollectedData = { ...data, license: undefined, guarantee: undefined, responseTime: undefined, yearsInField: undefined, startingPrices: undefined };
    const plan = planQa(page, bare, T, { installPage: false });
    assert.deepEqual(plan.codeItems, []);
    assert.equal(plan.droppedQuestionIds.length, 5);
    assert.deepEqual(plan.modelPool.map(item => item.question), QUESTIONS.slice(5));
    const install = planQa(page, data, T, { installPage: true });
    assert.ok(!install.codeItems.some(item => item.q === QUESTIONS[2]));
    assert.ok(install.droppedQuestionIds.includes('question-3'));
  });
});

const modelItems = (): Loose[] => [
  { questionId: 'question-6', q: 'model wording', a: 'I find the leak before I open anything, every time.', factIds: ['offer'] },
  { questionId: 'question-4', q: 'Is there a warranty?', a: 'Yes, a warranty for a year.', factIds: ['proof-guarantee'] },
  { questionId: 'question-7', q: 'model wording 2', a: 'TEST Biz comes and walks you through the job first.', factIds: ['service-walkthrough'] },
];

test('withSystemFields: code-built items first, model items on the other questions with the pool wording, topic answers dropped', async () => {
  await codeOwned(() => {
    const page = brief();
    const copy = withSystemFields({ qaHeadline: 'Questions', qaItems: modelItems() }, page, data);
    const items = copy.qaItems as Loose[];
    assert.equal(items.length, 6, 'at most maxItems');
    assert.deepEqual(items.slice(0, 5).map(item => item.questionId), ['question-1', 'question-2', 'question-3', 'question-4', 'question-5']);
    assert.equal(items[5].questionId, 'question-6');
    assert.equal(items[5].q, 'model wording', 'a Latin pool question keeps the model wording; a Hebrew one is used verbatim');
    // Idempotent: settling twice gives the same list (Noa's echo of code items is replaced, never duplicated).
    assert.deepEqual(withSystemFields(copy, page, data).qaItems, items);
    // A Hebrew pool question replaces the model's q verbatim.
    const hebrew = brief([...QUESTIONS.slice(0, 5), `\u05D0\u05D1 \u05D2\u05D3 ${CITY}?`]);
    const settled = withSystemFields({ qaItems: [{ questionId: 'question-6', q: 'model rewrote it', a: 'An answer that adds a new step.', factIds: ['offer'] }] }, hebrew, data);
    assert.equal((settled.qaItems as Loose[])[5].q, `\u05D0\u05D1 \u05D2\u05D3 ${CITY}?`);
  });
});

test('gates: code-built items and every q are code-owned (no restatement hit); a model answer that restates still hits', async () => {
  await codeOwned(() => {
    const page = brief();
    const gates = briefGateContext(page, data);
    assert.deepEqual(gates.qaCodeOwnership, { codeItems: 5 });
    const copy = withSystemFields({ qaItems: [{ questionId: 'question-6', q: 'Do you open walls?', a: 'After 12 years in the trade, no.', factIds: ['offer'] }] }, page, data);
    const hits = runCopyGates(copy, gates).filter(hit => hit.field.startsWith('qaItems'));
    assert.ok(hits.every(hit => /^qaItems\[5\]\.a$/.test(hit.field)), JSON.stringify(hits));
    assert.ok(hits.some(hit => hit.rule === GATE_RULES.factRestatement), 'the model answer restates the years');
  });
});

test('brand gate: the business name inside a model answer is a hit and the item is dropped; the lead alone is not', async () => {
  await codeOwned(() => {
    const page = brief(['What does it cost?', 'Do you open walls?', 'What happens first?', 'How long does it take?']);
    const gates = briefGateContext(page, data);
    const qa = codeOwnedQa(page, data)!;
    const lead = qa.lead!;
    assert.equal(lead, `At TEST Biz in ${CITY}:`);
    const copy = withSystemFields({ qaItems: [
      { questionId: 'question-2', q: 'x', a: 'TEST Biz never opens a wall first.', factIds: ['offer'] },
      { questionId: 'question-3', q: 'x', a: `${lead} I call you back and listen.`, factIds: ['service-walkthrough'] },
      { questionId: 'question-4', q: 'x', a: 'I come and find the leak first.', factIds: ['service-walkthrough'] },
    ] }, page, data);
    const hits = runCopyGates(copy, gates).filter(hit => hit.rule === GATE_RULES.qaBrandInAnswer);
    assert.deepEqual(hits.map(hit => hit.field), ['qaItems[1].a']);
    const notes = dropQaBrandAnswers(copy, gates);
    assert.ok(notes.some(note => note.startsWith('qa_brand')), notes.join(','));
    assert.deepEqual((copy.qaItems as Loose[]).map(item => item.questionId), ['question-1', 'question-3', 'question-4']);
  });
});

test('budget: a code-built item (the same fact as the proof item) is never dropped', async () => {
  await codeOwned(() => {
    const page = brief();
    const gates = briefGateContext(page, data);
    const copy = withSystemFields({ heroHeadline: 'leak repair', heroSubheadline: 'I find the leak before I open anything.', qaItems: modelItems() }, page, data);
    const { strings, options } = repetitionBudgetInputs(copy, page, data, gates);
    const codeQa = strings.filter(item => /^qaItems\[[0-4]\]\.a$/.test(item.field));
    assert.equal(codeQa.length, 5);
    assert.ok(codeQa.every(item => item.code), 'code strings');
    const proof = strings.filter(item => item.field.startsWith('proofItems'));
    assert.ok(proof.some(item => codeQa.some(qa => qa.value === item.value)), 'the proof sentence and the Q&A answer are the same code-owned fact');
    const decisions = repetitionBudgetDecisions(copy, strings, options);
    assert.ok(!decisions.some(decision => /^qaItems\[[0-4]\]/.test(decision.field)), JSON.stringify(decisions));
    applyDeterministicDrops(copy, page, data, gates);
    assert.deepEqual((copy.qaItems as Loose[]).slice(0, 5).map(item => item.questionId), ['question-1', 'question-2', 'question-3', 'question-4', 'question-5']);
  });
});

const baseCopy = (): SiteCopy => ({
  heroHeadline: 'leak repair', heroSubheadline: 'Subheadline', heroCta: 'Call', trustBarItems: [], aboutBlurb: '',
  servicesHeadline: 'Services', serviceItems: ['leak repair'], faqHeadline: '', faqItems: [], guaranteeBlock: null,
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: '',
  aboutPageHeadline: '', aboutPageBody: '', serviceDetails: [],
});

test('lead: in front of every model answer, in the same rendered paragraph; code-built items untouched; JSON-LD never splits it', async () => {
  await codeOwned(() => {
    const page = brief();
    const copy = withSystemFields({ qaHeadline: 'Questions', qaItems: modelItems() }, page, data);
    const before = (copy.qaItems as Loose[]).map(item => item.a);
    const notes = withQaAnswerLeads(copy, page, data);
    assert.deepEqual(notes, []);
    const lead = codeOwnedQa(page, data)!.lead!;
    const items = copy.qaItems as Loose[];
    assert.deepEqual(items.slice(0, 5).map(item => item.a), before.slice(0, 5), 'code-built answers carry no lead');
    assert.equal(items[5].a, `${lead} ${before[5]}`);
    // Idempotent on a re-run (a record settled again).
    withQaAnswerLeads(copy, page, data);
    assert.equal((copy.qaItems as Loose[])[5].a, `${lead} ${before[5]}`);
    const files = renderResearchedSitePages({
      theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data,
      heroImageUrl: 'https://example.test/hero.jpg', slug: 'qa-test', siteUrl: 'https://qa.wao.co.il',
      pages: [
        { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: baseCopy() },
        { opportunityId: 'svc-leak-repair', classification: 'money_service', targetPath: '/services/leak-repair', copy: { ...baseCopy(), ...copy } as SiteCopy } as ResearchedSitePage,
      ],
      graphEdges: [{ fromId: 'home', toId: 'svc-leak-repair' }],
    });
    const html = files[Object.keys(files).find(name => name.startsWith('services/') && name.endsWith('.html')) ?? ''] ?? '';
    const answer = String(before[5]);
    const paragraph = new RegExp(`<p[^>]*>${lead.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</p>`);
    assert.ok(paragraph.test(html), 'lead and answer in one <p>');
    const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
    for (const at of [...jsonLd.matchAll(new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))]) {
      assert.ok(jsonLd.slice(0, at.index).endsWith(`${lead} `), 'an answer in the FAQPage JSON-LD carries its lead');
    }
  });
});

test('lead: an answer that no longer fits with its lead is dropped (never cut); under the minimum the block goes', async () => {
  await codeOwned(() => {
    const page = brief(['Do you open walls?', 'What happens first?', 'How long does it take?']);
    const long = Array.from({ length: 58 }, () => 'word').join(' ');
    const copy = withSystemFields({ qaHeadline: 'Q', qaItems: [
      { questionId: 'question-1', q: 'x', a: long, factIds: ['offer'] },
      { questionId: 'question-2', q: 'x', a: 'I come and find the leak first.', factIds: ['offer'] },
      { questionId: 'question-3', q: 'x', a: 'About an hour for a simple leak.', factIds: ['offer'] },
    ] }, page, data);
    const notes = withQaAnswerLeads(copy, page, data);
    assert.ok(notes.includes('qa_lead_drop_item:qaItems[0]'));
    assert.ok(notes.some(note => note.startsWith('qa_lead_drop_depth_block')));
    assert.equal(copy.qaItems, null);
    assert.equal(copy.qaHeadline, null);
  });
});

test('prompt: the model sees only the non-fact questions, the two answer rules, and no business name in answers', async () => {
  await codeOwned(() => {
    const page = brief();
    const prompt = buildResearchPageGenerationPromptV2(page, data);
    const pool = JSON.parse(prompt.slice(prompt.indexOf('{'), prompt.indexOf('\n\nCOPY RULES'))).questionPool as Array<{ question: string }>;
    assert.deepEqual(pool.map(item => item.question), QUESTIONS.slice(5));
    assert.ok(prompt.includes('Answer the question directly in the first sentence: yes or no, or the fact itself.'));
    assert.ok(prompt.includes('Write each answer self-contained'));
    assert.ok(prompt.includes('Never name the business in an answer'));
    assert.ok(prompt.includes('the system adds 5 more itself'));
    assert.equal(prompt.includes('names the business ('), false, 'the v1 "names the business" rule is gone');
    const home = buildResearchPageGenerationPromptV2(brief(QUESTIONS, 'homepage'), data);
    assert.ok(home.includes("The usp's mechanism \u2014 the specific how, not just its outcome \u2014 appears in heroHeadline or heroSubheadline, unless the code-built trust bar already shows it."));
    assert.equal(prompt.includes("The usp's mechanism"), false, 'homepage FIELD JOBS only');
  });
});

test('pending templates: no plan, the v1 path is unchanged', async () => {
  await codeOwned(() => {
    const page = brief();
    assert.equal(codeOwnedQa(page, data), null);
    const raw = { qaItems: modelItems() };
    assert.deepEqual(withSystemFields(structuredClone(raw), page, data).qaItems, raw.qaItems, 'the model block stands as written (v1)');
  }, null as unknown as OwnerFactTemplates);
});

// ---------------------------------------------------------------------------
// Noa r3 (docs/copy/site-bot-fact-templates-2026-11-10.json `_rules`): one test per rule, against the real lists.
// ---------------------------------------------------------------------------

const RT = OWNER_FACT_TEMPLATES;
const fixtureOwner = (key: string): Record<string, string> => (JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../docs/copy/site-bot-eval-fixture-owner-answers-2026-11-10.json'), 'utf8')) as Record<string, Record<string, string>>)[key];
const plan = (questions: string[], owner: CollectedData = data, installPage = false) => codeOwned(() => planQa(brief(questions), owner, RT, { installPage }), RT);
const answerOf = async (question: string, owner: CollectedData = data, installPage = false) => (await plan([question], owner, installPage)).codeItems[0]?.a ?? null;
const droppedOf = async (question: string, owner: CollectedData = data) => (await plan([question], owner)).droppedQuestionIds.length === 1;
const disposition = (question: string) => qaQuestionDisposition(question, RT);
const pick = (list: readonly string[] | undefined, avoid: (token: string) => boolean = () => false): string => {
  const found = (list ?? []).find(token => !avoid(token));
  assert.ok(found, 'a usable list entry');
  return found;
};
/** A token that names no topic by itself (so the test reads one rule at a time). */
const noTopic = (token: string) => questionTopic(token, RT) !== null || qaQuestionDisposition(token, RT).kind !== 'model';

test('Noa r3 _matching: every r3 list is in the template file and copied; whole word, one prefix letter, symbols as substrings', () => {
  for (const key of FACT_OPTIONAL_LIST_KEYS) assert.ok(optionalList(RT, key).length > 0, key);
  const token = RT.qaWarrantyQuestionTokens![0];
  assert.equal(questionTopic(`${PREFIX_LETTERS[0]}${token}?`, RT), 'warranty', 'one attached prefix letter');
  assert.equal(questionTopic(`${PREFIX_LETTERS[0]}${PREFIX_LETTERS[1]}${token}?`, RT), null, 'never two');
  assert.equal(questionTopic(`${token}\u05D0?`, RT), null, 'whole word');
  const symbol = RT.qaAvailabilityQuestionTokens!.find(item => !/\p{L}/u.test(item));
  assert.ok(symbol, 'a token with no letter (24/7)');
  assert.deepEqual(disposition(`x${symbol}x?`), { kind: 'drop', reason: 'availability', topic: null }, 'a symbol token matches as a substring');
});

test('Noa r3 qaAvailabilityQuestionTokens: always dropped, before topic detection (never code, never the model)', async () => {
  const availability = RT.qaAvailabilityQuestionTokens![0];
  const cost = RT.costQuestionTokens[0];
  assert.deepEqual(disposition(`${availability}?`), { kind: 'drop', reason: 'availability', topic: null });
  assert.equal(disposition(`${cost} ${availability}?`).kind, 'drop', 'even with a topic token');
  const result = await plan([`${availability}?`, 'Do you open walls?']);
  assert.deepEqual(result.droppedQuestionIds, ['question-1']);
  assert.deepEqual(result.modelPool.map(item => item.question), ['Do you open walls?']);
});

test('Noa r3 exclude lists: consulted only for the detected topic and they never create a topic', () => {
  for (const [topic, key] of Object.entries(QA_TOPIC_EXCLUDE_KEYS)) {
    const exclude = pick(optionalList(RT, key), noTopic);
    assert.equal(questionTopic(`${exclude}?`, RT), null, `${key}: no topic of its own`);
    assert.deepEqual(disposition(`${exclude}?`), { kind: 'model' }, `${key}: never creates ${topic}`);
  }
  // A price exclude word on a warranty question does not drop it.
  const priceOnly = pick(RT.qaPriceQuestionExcludeTokens, token => noTopic(token) || RT.qaWarrantyQuestionExcludeTokens!.includes(token));
  const warranty = RT.qaWarrantyQuestionTokens![0];
  assert.equal(disposition(`${warranty} ${priceOnly}?`).kind, 'topic');
});

test('Noa r3 qaResponseQuestionTokens: detects the callback / response topic (callback- and arrival-phrased)', () => {
  for (const token of RT.qaResponseQuestionTokens!.filter(item => questionTopic(item, RT) === 'callback').slice(0, 5)) {
    const shape = disposition(`${token}?`);
    assert.ok(shape.kind === 'topic' || shape.kind === 'drop', token);
  }
  const token = pick(RT.qaResponseQuestionTokens, item => questionTopic(item, RT) !== 'callback' || disposition(item).kind !== 'topic');
  assert.equal(questionTopic(`${token}?`, RT), 'callback');
});

test('Noa r3 qaResponseQuestionExcludeTokens: a response question about duration / results / advice -> dropped', async () => {
  const token = pick(RT.qaResponseQuestionTokens, item => disposition(item).kind !== 'topic');
  const exclude = pick(RT.qaResponseQuestionExcludeTokens, noTopic);
  assert.deepEqual(disposition(`${token} ${exclude}?`), { kind: 'drop', reason: 'exclude', topic: 'callback' });
  assert.equal(await droppedOf(`${token} ${exclude}?`), true);
});

test('Noa r3 qaPriceQuestionExcludeTokens: only how-much questions get the cost FAQ; extras / hidden / fixed / payment -> dropped', async () => {
  const cost = RT.costQuestionTokens[0];
  const exclude = pick(RT.qaPriceQuestionExcludeTokens, noTopic);
  assert.deepEqual(disposition(`${cost} ${exclude}?`), { kind: 'drop', reason: 'exclude', topic: 'price' });
  assert.equal(await droppedOf(`${cost} ${exclude}?`), true);
  const faq = costFaq(data, { service: 'leak repair', city: CITY, business: 'TEST Biz' });
  assert.equal(await answerOf(`${cost}?`), faq?.a);
});

test('Noa r3 qaPriceCalloutQuestionTokens: a visit-fee question only with a callout fee (in the answer), else dropped', async () => {
  const cost = RT.costQuestionTokens[0];
  const callout = pick(RT.qaPriceCalloutQuestionTokens, token => noTopic(token) || RT.qaPriceQuestionExcludeTokens!.some(item => token.includes(item)));
  const question = `${cost} ${callout}?`;
  const shape = disposition(question);
  assert.ok(shape.kind === 'topic' && shape.topic === 'price' && shape.callout && !shape.surcharge);
  assert.equal(await droppedOf(question), true, 'no callout fee');
  const withFee: CollectedData = { ...data, calloutFee: 150 };
  const faq = costFaq(withFee, { service: 'leak repair', city: CITY, business: 'TEST Biz' });
  assert.equal(await answerOf(question, withFee), faq?.a);
});

test('Noa r3 qaPriceSurchargeQuestionTokens: price detection too (Adam), answered only with a surcharge policy', async () => {
  const surcharge = pick(RT.qaPriceSurchargeQuestionTokens, token => questionTopic(token, RT) !== 'price' || QA_TOPIC_PRIORITY.some(topic => qaTopicTokens(RT)[topic].some(item => item === token)) || disposition(token).kind !== 'topic');
  // No cost token: still a price question ("is there a night surcharge?").
  assert.ok(!RT.costQuestionTokens.includes(surcharge));
  const shape = disposition(`${surcharge}?`);
  assert.ok(shape.kind === 'topic' && shape.topic === 'price' && shape.surcharge);
  assert.equal(await droppedOf(`${surcharge}?`), true, 'no surcharge policy');
  const withPolicy: CollectedData = { ...data, surchargePolicy: '+50%' };
  const faq = costFaq(withPolicy, { service: 'leak repair', city: CITY, business: 'TEST Biz' });
  assert.ok(faq?.a.includes('+50%'));
  assert.equal(await answerOf(`${surcharge}?`, withPolicy), faq?.a);
  // The surcharge list detects price only as the last topic: a question that names another topic keeps it.
  assert.equal(questionTopic(`${RT.qaWarrantyQuestionTokens![0]} ${surcharge}?`, RT), 'warranty');
});

test('Noa r3 qaLicenseQuestionTokens / qaLicenseQuestionExcludeTokens: owner licence -> proof; customer permit / staff -> dropped', async () => {
  const licence = pick(RT.qaLicenseQuestionTokens, item => questionTopic(item, RT) !== 'license' || disposition(item).kind !== 'topic');
  const exclude = pick(RT.qaLicenseQuestionExcludeTokens, noTopic);
  const owner: CollectedData = { ...data, license: fixtureOwner('electrician').license };
  const facts = ownerFacts(owner, brief(), RT);
  assert.ok(facts.license);
  assert.equal(await answerOf(`${licence}?`, owner), proofText(facts.license, RT));
  assert.deepEqual(disposition(`${licence} ${exclude}?`), { kind: 'drop', reason: 'exclude', topic: 'license' });
  assert.equal(await droppedOf(`${licence} ${exclude}?`, owner), true);
});

test('Noa r3 qaYearsQuestionTokens / qaYearsQuestionExcludeTokens: years in the trade -> proof; advice / staff / business age -> dropped', async () => {
  const years = pick(RT.qaYearsQuestionTokens, item => questionTopic(item, RT) !== 'years' || disposition(item).kind !== 'topic');
  const exclude = pick(RT.qaYearsQuestionExcludeTokens, noTopic);
  const facts = ownerFacts(data, brief(), RT);
  assert.equal(await answerOf(`${years}?`), proofText(facts.years!, RT));
  assert.deepEqual(disposition(`${years} ${exclude}?`), { kind: 'drop', reason: 'exclude', topic: 'years' });
  assert.equal(await droppedOf(`${years} ${exclude}?`), true);
});

test('Noa r3 qaWarrantyQuestionTokens / qaWarrantyQuestionExcludeTokens: is there a warranty -> proof; device / written / expired -> dropped', async () => {
  const warranty = RT.qaWarrantyQuestionTokens![0];
  const exclude = pick(RT.qaWarrantyQuestionExcludeTokens, noTopic);
  const facts = ownerFacts(data, brief(), RT);
  assert.equal(await answerOf(`${warranty}?`), proofText(facts.warranty!, RT));
  assert.deepEqual(disposition(`${warranty} ${exclude}?`), { kind: 'drop', reason: 'exclude', topic: 'warranty' });
  assert.equal(await droppedOf(`${warranty} ${exclude}?`), true);
  // A repeat-fault phrasing (no warranty noun) is a warranty question too.
  const repeat = RT.qaWarrantyQuestionTokens!.find(item => !item.includes(warranty));
  assert.ok(repeat);
  assert.equal(questionTopic(`${repeat}?`, RT), 'warranty');
});

test('Noa r3 qaWarrantyScopeQuestionTokens: "what does it cover?" only from the scoped / verbatim proof; unscoped -> dropped', async () => {
  const warranty = RT.qaWarrantyQuestionTokens![0];
  const scopeWord = pick(RT.qaWarrantyScopeQuestionTokens, token => noTopic(token) || RT.qaWarrantyQuestionExcludeTokens!.some(item => token.includes(item)));
  const question = `${scopeWord} ${warranty}?`;
  const shape = disposition(question);
  assert.ok(shape.kind === 'topic' && shape.warrantyScope);
  assert.equal(await droppedOf(question), true, 'unscoped picker warranty: the owner never said what it covers');
  const scoped: CollectedData = { ...data, guarantee: fixtureOwner('ac-repair').guarantee };
  const fact = ownerFacts(scoped, brief(), RT).warranty!;
  assert.ok(fact.slots.scope, 'the ac-repair warranty is scoped');
  assert.equal(await answerOf(question, scoped), proofText(fact, RT));
});

test('Noa r3 proofCallbackArrival / SameDay: callback-shaped -> proofCallback; arrival-shaped or neutral -> the arrival answer', async () => {
  const token = pick(RT.qaResponseQuestionTokens, item => disposition(item).kind !== 'topic'
    || RT.qaResponseCallbackShapeTokens!.some(word => questionTopic(word, RT) === null && item.includes(word))
    || RT.qaResponseArrivalShapeTokens!.some(word => item.includes(word)));
  const callbackWord = pick(RT.qaResponseCallbackShapeTokens, word => disposition(`${token} ${word}?`).kind !== 'topic');
  const arrivalWord = pick(RT.qaResponseArrivalShapeTokens, word => disposition(`${token} ${word}?`).kind !== 'topic');
  const time = responseTimeText(20, RT);
  const callback = RT.proofCallback.replace('{time}', time);
  const arrival = RT.proofCallbackArrival.replace('{time}', time);
  assert.equal(await answerOf(`${token} ${callbackWord}?`), callback, 'callback-shaped');
  assert.equal(await answerOf(`${token} ${arrivalWord}?`), arrival, 'arrival-shaped');
  assert.equal(await answerOf(`${token} ${callbackWord} ${arrivalWord}?`), arrival, 'both: the arrival marker wins');
  assert.equal(await answerOf(`${token}?`), arrival, 'neutral: defaults to the arrival answer');
  const sameDay: CollectedData = { ...data, responseTime: RT.parseSameDayWords[0] };
  assert.equal(await answerOf(`${token}?`, sameDay), RT.proofCallbackArrivalSameDay);
  assert.equal(await answerOf(`${token} ${callbackWord}?`, sameDay), RT.proofCallbackSameDay);
  // The arrival answer never states an arrival time (no trustResponse / proofResponse wording).
  assert.notEqual(arrival, RT.proofResponse.replace('{time}', time));
});
