// Copy v2 slice 5 (docs/missions/site-bot-code-owns-facts-2026-11-10.md): the repetition budget (drop, never repair), the
// novelty test, the story headline / body and story / about echoes, and the site-wide homepage keys. Real m2b1i copy comes
// from testdata/m2b1i-copy-v2.json (moved byte-exact by script); this file holds ZERO Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import type { PageBrief } from '../site-bot/research/pageBrief';
import { siteGenerationContext } from '../site-bot/researchedSiteGeneration';
import type { SiteCopy } from './lpCopyPrompt';
import { FACT_PARSE_TOKEN_KEYS, FACT_RULE_TOKEN_KEYS, setOwnerFactTemplatesForTests, type OwnerFactTemplates } from './ownerFactCopy';
import {
  addsNothing,
  budgetStrings,
  maxStatementRepeat,
  PRIOR_KEY_MAX_STRINGS,
  repetitionBudgetDecisions,
  statementKeys,
  type BudgetString,
} from './repetitionBudget';
import {
  applyDeterministicDrops,
  applyRepetitionBudget,
  assertBoundedGeneratedSiteCopy,
  briefGateContext,
  repetitionBudgetInputs,
  shapeOptions,
  withSystemFields,
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


interface FixturePage { id: string; classification: string; brief: PageBrief; copy: Record<string, unknown> }
const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../src/lib/lp/testdata/m2b1i-copy-v2.json'), 'utf8')) as {
  runs: Record<string, { data: CollectedData; pages: FixturePage[] }>;
};
const real = (run: string, id: string) => {
  const entry = FIXTURE.runs[run];
  const page = entry.pages.find(item => item.id === id);
  if (!page) throw new Error(`fixture page ${run}/${id}`);
  return { data: entry.data, brief: page.brief, copy: structuredClone(page.copy), classification: page.classification };
};

const NO_FREE = new Set<string>();
const MIN = { storyBody: 3, aboutPageBody: 3 };
const s = (field: string, value: string, code = false): BudgetString => ({ field, value, code });

test('budget strings: render order, code-built strings included, the Q&A question left out', () => {
  const copy = {
    heroHeadline: 'H', heroSubheadline: 'S', trustBarItems: ['T1'], storyHeadline: 'SH', storyBody: 'SB.', qaItems: [{ questionId: 'q1', q: 'Q?', a: 'A.', factIds: ['f'] }],
    proofItems: [{ text: 'P.', factIds: ['f'] }], serviceDetails: [{ name: 'n', description: 'D.' }], aboutPageHeadline: 'AH', aboutPageBody: 'AB.', formHeadline: 'F',
  };
  const fields = budgetStrings(copy, { pricePromises: ['PP'], costFaq: { q: 'CQ', a: 'CA' }, codeOwnedFields: ['trustBarItems', 'proofItems'] },
    ['heroHeadline', 'heroSubheadline', 'trustBarItems', 'storyHeadline', 'storyBody', 'qaItems', 'proofItems', 'serviceDetails', 'aboutPageHeadline', 'aboutPageBody', 'formHeadline']);
  assert.deepEqual(fields.map(item => `${item.field}${item.code ? '*' : ''}`), [
    'heroHeadline', 'heroSubheadline', '$pricePromises[0]*', 'trustBarItems[0]*', 'storyHeadline', 'storyBody', '$costFaq.q*', '$costFaq.a*',
    'proofItems[0].text*', 'qaItems[0].a', 'serviceDetails[0].description', 'aboutPageHeadline', 'aboutPageBody', 'formHeadline',
  ]);
});

test('over budget: the first full statement owns a key; a later item repeating it is dropped, a code string is never', () => {
  const strings = [
    s('heroSubheadline', 'alpha bravo charlie delta echo'),
    s('proofItems[0].text', 'golf hotel india juliet kilo', true),
    s('serviceDetails[0].description', 'we say alpha bravo charlie delta again here with more fresh words'),
    s('qaItems[0].a', 'golf hotel india juliet, plus lima mike november oscar papa'),
    s('serviceDetails[1].description', 'quebec romeo sierra tango uniform victor whiskey'),
  ];
  assert.deepEqual(repetitionBudgetDecisions({}, strings, { free: NO_FREE, minSentences: MIN }), [
    { field: 'serviceDetails[0].description', reason: 'over_budget' },
    { field: 'qaItems[0].a', reason: 'over_budget' },
  ]);
});

test('short references (three words or fewer) are allowed; a prose sentence is dropped only while the minimum holds', () => {
  const short = [s('heroSubheadline', 'alpha bravo charlie delta'), s('serviceDetails[0].description', 'alpha bravo charlie and then many brand new words follow')];
  assert.deepEqual(repetitionBudgetDecisions({}, short, { free: NO_FREE, minSentences: MIN }), []);
  const long = [s('heroSubheadline', 'alpha bravo charlie delta'), s('aboutPageBody', 'One two three four. Then alpha bravo charlie delta. Five six seven eight. Nine ten eleven twelve.')];
  assert.deepEqual(repetitionBudgetDecisions({}, long, { free: NO_FREE, minSentences: MIN }), [{ field: 'aboutPageBody', sentence: 1, reason: 'over_budget' }]);
  const atMinimum = [s('heroSubheadline', 'alpha bravo charlie delta'), s('aboutPageBody', 'One two three four. Then alpha bravo charlie delta. Five six seven eight.')];
  assert.deepEqual(repetitionBudgetDecisions({}, atMinimum, { free: NO_FREE, minSentences: MIN }), [], 'never below the minimum (the gate and the repair take it)');
});

test('novelty: an item with fewer than 3 new words, or under 40% new, adds nothing and is dropped', () => {
  const stems = new Set(['alpha', 'bravo', 'charlie', 'delta', 'echo']);
  assert.equal(addsNothing('alpha bravo charlie delta foxtrot', stems, NO_FREE), true, '1 new word');
  assert.equal(addsNothing('alpha bravo foxtrot golf hotel', stems, NO_FREE), false, '3 new of 5');
  assert.equal(addsNothing('alpha bravo charlie delta echo foxtrot golf hotel', stems, NO_FREE), true, '3 new of 8 is under 40%');
  assert.equal(addsNothing('foxtrot golf hotel india', stems, NO_FREE), false);
  const strings = [s('storyBody', 'alpha bravo charlie. delta echo foxtrot. golf hotel india.'), s('processSteps[0].text', 'golf, alpha, echo, bravo and juliet')];
  assert.deepEqual(repetitionBudgetDecisions({}, strings, { free: NO_FREE, minSentences: MIN }), [{ field: 'processSteps[0].text', reason: 'no_novelty' }]);
});

test('site-wide: a homepage key appears in at most two strings of a later page', () => {
  const strings = [
    s('heroSubheadline', 'alpha bravo charlie delta'),
    s('qaItems[0].a', 'alpha bravo charlie delta and the rest is quite new here'),
    s('qaItems[1].a', 'more and new: alpha bravo charlie delta, with plenty of other words'),
  ];
  // Without the homepage keys, the page's own budget already drops the repeats; with them, the cap counts the hero too.
  const decisions = repetitionBudgetDecisions({}, strings.slice(0, 1).concat(s('qaItems[1].a', 'lima mike november oscar papa quebec')), { free: NO_FREE, minSentences: MIN, priorKeys: ['alpha bravo charlie delta'] });
  assert.deepEqual(decisions, [], 'one use on this page: fine');
  assert.equal(PRIOR_KEY_MAX_STRINGS, 2);
  const capped = repetitionBudgetDecisions({}, [s('heroHeadline', 'alpha bravo charlie delta'), s('heroSubheadline', 'alpha bravo charlie delta now'), s('qaItems[0].a', 'zulu yankee: alpha bravo charlie delta, xray whiskey victor')], { free: NO_FREE, minSentences: MIN, priorKeys: ['alpha bravo charlie delta'] });
  assert.deepEqual(capped.map(item => item.reason), ['over_budget'], 'the third string is over budget');
  void strings;
});

test('real m2b1i electrician homepage: story headline echo, story / about echo, the about minimum kept', async () => {
  await codeOwned(() => {
    const page = real('electrician-2', 'home');
    const gates = briefGateContext(page.brief, page.data);
    const copy = withSystemFields(page.copy, page.brief, page.data);
    const fixes = applyDeterministicDrops(copy, page.brief, page.data, gates);
    assert.deepEqual(fixes, ['restatement_drop_sentence:aboutPageBody:5->4', 'story_headline_echo:storyHeadline', 'story_about_echo:aboutPageBody#2']);
    assert.equal(copy.storyHeadline, null, 'the hidden fallback heading takes over');
    assert.equal((copy.aboutPageBody as string).split(/(?<=[.!?])\s+/u).length, 3);
    assertBoundedGeneratedSiteCopy(copy, shapeOptions(page.brief));
    assert.deepEqual(applyDeterministicDrops(copy, page.brief, page.data, gates), [], 'idempotent');
  });
});

test('real m2b1i service page: Q&A answers that add nothing are dropped and the block falls back to null', async () => {
  await codeOwned(() => {
    const page = real('electrician-2', 'svc-ev-charger-install');
    const gates = briefGateContext(page.brief, page.data);
    const copy = withSystemFields(page.copy, page.brief, page.data);
    const { strings, options } = repetitionBudgetInputs(copy, page.brief, page.data, gates);
    assert.ok(strings.some(item => item.code && item.field.startsWith('trustBarItems')), 'the code-built trust bar is in the list');
    assert.deepEqual(applyRepetitionBudget(copy, page.brief, page.data, gates), ['budget_drop_item:qaItems[1].a:no_novelty', 'budget_drop_item:qaItems[2].a:no_novelty', 'budget_drop_depth_block:qaItems:3->0']);
    assert.equal(copy.qaItems, null);
    assert.equal(copy.qaHeadline, null);
    assert.ok(maxStatementRepeat(repetitionBudgetInputs(copy, page.brief, page.data, gates).strings, options.free) <= 1);
  });
});

test('pending templates: no drop, the copy is untouched; the site context carries no homepage keys', async () => {
  await pending(() => {
    const page = real('hebrew-plumber-1', 'home');
    const copy = withSystemFields(page.copy, page.brief, page.data);
    const before = JSON.stringify(copy);
    assert.deepEqual(applyDeterministicDrops(copy, page.brief, page.data, briefGateContext(page.brief, page.data)), []);
    assert.equal(JSON.stringify(copy), before);
    assert.equal('priorMechanismKeys' in siteGenerationContext([{ copy: page.copy as unknown as SiteCopy, classification: 'homepage' }]), false);
  });
  await codeOwned(() => {
    const page = real('hebrew-plumber-1', 'home');
    const context = siteGenerationContext([{ copy: page.copy as unknown as SiteCopy, classification: 'homepage' }]);
    assert.ok((context.priorMechanismKeys ?? []).length > 0);
    assert.deepEqual(context.priorMechanismKeys, statementKeys(page.copy, ['heroHeadline', 'heroSubheadline', 'storyHeadline', 'storyBody', 'serviceDetails', 'aboutPageHeadline', 'aboutPageBody', 'formHeadline'], ['trustBarItems', 'proofItems', 'proofHeadline']));
  });
});
