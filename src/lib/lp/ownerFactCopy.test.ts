// Copy v2 slice 1 (docs/missions/site-bot-code-owns-facts-2026-11-10.md): the owner-fact renderer, with injected ASCII
// stand-in templates (the real Hebrew templates arrive from Tamar -> Noa and are applied by scripts/apply-fact-templates.mjs).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes; synthetic Hebrew letters are escapes (not words).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import type { PageBrief } from '../site-bot/research/pageBrief';
import { DEPTH_BLOCK_LIMITS } from './depthBlocks';
import { FIX_TIME_LEAD_TOKENS, TRUST_BAR_MAX_CHARS, TRUST_BAR_MAX_ITEMS } from './generationData';
import {
  codeOwnedFactTemplates,
  droppedOwnerFactKeys,
  FACT_PARSE_TOKEN_KEYS,
  FACT_RULE_TOKEN_KEYS,
  FACT_TEMPLATE_KEYS,
  FACT_TEMPLATE_SLOTS,
  FACT_TEMPLATES_PENDING_COPY,
  FACT_TEMPLATES_SOURCE,
  factTemplateProblems,
  fillTemplate,
  licenseDocumentNouns,
  opensWithNegation,
  responseScope,
  warrantyScope,
  OWNER_FACT_TEMPLATES,
  ownerFacts,
  parseLicenseNumber,
  parseRating,
  parseResponseMinutes,
  parseReviewCount,
  parseWarrantyMonths,
  parsePrefixLetters,
  parseResponse,
  parseYears,
  proofItemsFromFacts,
  proofText,
  stripTrailingPunctuation,
  trustText,
  VERBATIM_CHIP_MAX_CHARS,
  setOwnerFactTemplatesForTests,
  trustBarFromFacts,
  type OwnerFactTemplates,
} from './ownerFactCopy';

// Synthetic Hebrew "words" (escapes; not real words) standing in for the Hebrew parse tokens and for Hebrew owner text.
const HE = (offset: number, length = 4) => Array.from({ length }, (_, i) => String.fromCharCode(0x05D0 + ((offset + i) % 27))).join('');
const HE_MINUTES = HE(0);
const HE_HOURS = HE(4);
const HE_ONE_HOUR = HE(8);
const HE_TWO_HOURS = HE(12);
const HE_HALF_HOUR = `${HE(16, 3)} ${HE(8)}`;
const HE_MONTHS = HE(20);
const HE_YEARS = HE(1);
const HE_ONE_YEAR = HE(5);
const HE_TWO_YEARS = HE(9);
const HE_HALF_YEAR = `${HE(16, 3)} ${HE(5)}`;
const HE_NO = HE(13, 3);
const HE_ONE_MONTH = HE(21);
const HE_TWO_MONTHS = HE(23);
const HE_YEAR_AND_HALF = `${HE_ONE_YEAR} ${HE(17, 4)}`;
const HE_SAME_DAY = `${HE(6, 4)} ${HE(10, 3)}`;

/** ASCII stand-ins: every template is a marker plus its slots, so the tests read which template and slots were used. */
const STAND_IN_TEMPLATES: OwnerFactTemplates = {
  trustYears: 'Y:{n}', trustLicense: 'L:{license}', trustLicenseNumber: 'LN:{number}', trustWarranty: 'W:{duration}',
  trustWarrantyVerbatim: '{warranty}', trustResponse: 'R:{time}', trustRating: '{rating}*/{count}', trustRatingNoCount: '{rating}*',
  proofYears: 'I have {n} years.', proofLicense: 'I hold {license}.', proofLicenseNumber: 'My licence is {number}.',
  proofWarranty: 'You get a warranty for {duration}.', proofWarrantyVerbatim: 'Warranty: {warranty}.', proofResponse: 'I arrive within {time}.',
  warrantyBareSixMonths: '6mo', warrantyBareOneYear: '1yr', warrantyBareTwoYears: '2yr', warrantyBareNYears: '{n}yr',
  warrantyLamedSixMonths: 'l6mo', warrantyLamedOneYear: 'l1yr', warrantyLamedTwoYears: 'l2yr', warrantyLamedNYears: 'l{n}yr',
  responseMinutes: '{n}min', responseOneHour: '1h', responseTwoHours: '2h', responseHours: '{n}h',
  trustYearsOne: 'Y:1', trustYearsTwo: 'Y:2', trustResponseSameDay: 'R:sameday', trustRatingOneReview: '{rating}*/1', proofYearsOne: 'I have one year.', proofYearsTwo: 'I have two years.', proofLicenseVerbatim: '{license}.', proofResponseSameDay: 'I arrive the same day.', warrantyBareOneMonth: '1mo', warrantyBareTwoMonths: '2mo', warrantyBareNMonths: '{n}mo', warrantyBareOneAndHalfYears: '18mo', warrantyLamedOneMonth: 'l1mo', warrantyLamedTwoMonths: 'l2mo', warrantyLamedNMonths: 'l{n}mo', warrantyLamedOneAndHalfYears: 'l18mo', responseOneMinute: '1min!', responseHalfHour: 'half-h',
  proofWarrantyScoped: 'You get a warranty for {duration} {scope}.', proofResponseScoped: 'I arrive within {time} {scope}.', proofResponseSameDayScoped: 'I arrive the same day {scope}.', trustCallback: 'R:{time}', trustCallbackSameDay: 'R:sameday', proofCallback: 'I call back within {time}.', proofCallbackSameDay: 'I call back the same day.', qaAnswerLead: 'At {business} in {city}:',
  parseMinuteWords: [HE_MINUTES], parseHourWords: [HE_HOURS], parseOneHourWords: [HE_ONE_HOUR], parseTwoHourWords: [HE_TWO_HOURS],
  parseHalfHourWords: [HE_HALF_HOUR], parseMonthWords: [HE_MONTHS], parseYearWords: [HE_YEARS], parseOneYearWords: [HE_ONE_YEAR],
  parseTwoYearWords: [HE_TWO_YEARS], parseHalfYearWords: [HE_HALF_YEAR], parseLicenseNumberWords: [`${HE_NO}'`],
  parseOneMonthWords: [HE_ONE_MONTH], parseTwoMonthWords: [HE_TWO_MONTHS], parseOneAndHalfYearWords: [HE_YEAR_AND_HALF], parseSameDayWords: [HE_SAME_DAY],
  parseWarrantyWords: [HE(22, 5)], warrantyScopeLeadWords: [HE(3, 2)], parseFillerWords: [HE(14, 2)], parseNegationWords: [HE(19, 3)], parseHedgeWords: [HE(24, 4)],
  parseWithinWords: [HE(26, 2)], licenseDocumentNouns: [HE(7, 5)], responseScopeLeadLetters: [HE(1, 1)], costQuestionTokens: [HE(11, 4)],
  proofCallbackArrival: 'I call back within {time} and book a visit.', proofCallbackArrivalSameDay: 'I call back the same day and book a visit.',
  trustContractorRegistered: 'RC', proofContractorRegistered: 'I am in the register.', proofContractorRegisteredDetail: 'I am in the register, {detail}.',
};
const T = STAND_IN_TEMPLATES;

const brief = (proofIds: string[] = ['proof-yearsInField', 'proof-license', 'proof-guarantee', 'proof-responseTime']): Pick<PageBrief, 'site' | 'firstPartyProof'> => ({
  firstPartyProof: proofIds.map(id => ({ id, value: `${id} (owner-stated)` })),
  site: {
    pageName: 'leak repair', relevanceTerm: 'leak repair', city: 'Holon', serviceArea: ['Holon', 'Bat Yam'], serviceLabels: ['leak repair'],
    businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: true,
  },
});

test('template set: the stand-ins are complete; the shipped constant is pending until the Tamar -> Noa file is applied', () => {
  assert.deepEqual(factTemplateProblems(T), []);
  assert.equal(FACT_TEMPLATE_KEYS.length, Object.keys(FACT_TEMPLATE_SLOTS).length + FACT_PARSE_TOKEN_KEYS.length + FACT_RULE_TOKEN_KEYS.length);
  // Incomplete sets are named by key (never copy text): missing, placeholder, wrong slots, empty parse list.
  const { trustYears: _drop, ...missing } = T;
  void _drop;
  assert.deepEqual(factTemplateProblems(missing), ['trustYears:missing']);
  assert.deepEqual(factTemplateProblems({ ...T, trustYears: '__HE_TODO_trustYears__' }), ['trustYears:pending']);
  assert.deepEqual(factTemplateProblems({ ...T, trustRating: '{rating}' }), ['trustRating:slots']);
  assert.deepEqual(factTemplateProblems({ ...T, warrantyBareOneYear: '{n}' }), ['warrantyBareOneYear:slots']);
  assert.deepEqual(factTemplateProblems({ ...T, parseMinuteWords: [] }), ['parseMinuteWords:missing']);
  // The shipped constant: pending exactly while it is incomplete; codeOwnedFactTemplates() is null then.
  assert.equal(FACT_TEMPLATES_PENDING_COPY, factTemplateProblems(OWNER_FACT_TEMPLATES).length > 0);
  if (FACT_TEMPLATES_PENDING_COPY) assert.equal(codeOwnedFactTemplates(), null);
  // The constant stays in sync with the source file: a complete file must have been applied (byte-equal values).
  const file = path.resolve(__dirname, '../../..', FACT_TEMPLATES_SOURCE);
  if (fs.existsSync(file)) {
    const json = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    if (factTemplateProblems(json).length === 0) {
      for (const key of FACT_TEMPLATE_KEYS) assert.deepEqual((OWNER_FACT_TEMPLATES as Record<string, unknown>)[key], json[key], `${key}: run node scripts/apply-fact-templates.mjs`);
    } else {
      assert.equal(FACT_TEMPLATES_PENDING_COPY, true, 'an incomplete template file keeps the flag pending');
    }
  }
});

test('test injection: an incomplete set is refused; null forces pending; undefined restores the real flag', () => {
  assert.throws(() => setOwnerFactTemplatesForTests({ ...T, trustYears: '' }), /trustYears:missing/);
  setOwnerFactTemplatesForTests(T);
  assert.equal(codeOwnedFactTemplates(), T);
  setOwnerFactTemplatesForTests(null);
  assert.equal(codeOwnedFactTemplates(), null);
  setOwnerFactTemplatesForTests(undefined);
  assert.equal(codeOwnedFactTemplates(), FACT_TEMPLATES_PENDING_COPY ? null : OWNER_FACT_TEMPLATES);
});

test('numbers parse in any language; anything else is not a number', () => {
  // Years: the one integer in the answer.
  assert.equal(parseYears('15 years'), 15);
  assert.equal(parseYears(`18 ${HE_YEARS}`), 18);
  assert.equal(parseYears('12'), 12);
  assert.equal(parseYears('since 2005'), null, 'out of range, never computed');
  assert.equal(parseYears('10-15 years'), null, 'a range is not one number');
  assert.equal(parseYears(HE_YEARS), null);
  // Response time.
  assert.equal(parseResponseMinutes('within 30 minutes', T), 30);
  assert.equal(parseResponseMinutes(`20 ${HE_MINUTES}`, T), 20);
  assert.equal(parseResponseMinutes(`${HE(25, 3)} 20 ${HE_MINUTES}`, T), 20, 'a Hebrew lead word is fine');
  assert.equal(parseResponseMinutes('2 hours', T), 120);
  assert.equal(parseResponseMinutes(`3 ${HE_HOURS}`, T), 180);
  assert.equal(parseResponseMinutes(HE_ONE_HOUR, T), null, 'Noa: a bare hour word counts only after a within word');
  assert.equal(parseResponseMinutes(`${FIX_TIME_LEAD_TOKENS[0]} ${HE_ONE_HOUR}`, T), 60);
  assert.equal(parseResponseMinutes(HE_TWO_HOURS, T), 120);
  assert.equal(parseResponseMinutes(HE_HALF_HOUR, T), 30, 'half an hour wins over the hour word it contains');
  assert.equal(parseResponseMinutes('an hour', T), 60);
  assert.equal(parseResponseMinutes('same day', T), null);
  assert.equal(parseResponseMinutes('20-30 minutes', T), null);
  assert.equal(parseResponseMinutes('20', T), null, 'a number with no unit is not a duration');
  // Warranty: the fixed set is decided later; here any clear duration parses.
  assert.equal(parseWarrantyMonths('1 year warranty', T), 12);
  assert.equal(parseWarrantyMonths('a year on all work', T), 12);
  assert.equal(parseWarrantyMonths('6 months', T), 6);
  assert.equal(parseWarrantyMonths('two years', T), 24);
  assert.equal(parseWarrantyMonths('Six-month warranty on repairs', T), 6, 'English number words read as digits');
  assert.equal(parseWarrantyMonths('5-year warranty', T), 60);
  assert.equal(parseResponseMinutes('within one hour', T), 60);
  assert.equal(parseYears('twelve years'), 12);
  assert.equal(parseYears('someone with 15 years'), 15, 'a word containing "one" is not a number');
  assert.equal(parseWarrantyMonths(`${HE(22, 5)} ${HE_HALF_YEAR}`, T), 6, 'half a year wins over the year word it contains');
  assert.equal(parseWarrantyMonths(`${HE(22, 5)} ${HE_ONE_YEAR} ${HE(3, 2)} ${HE(7, 3)}`, T), 12);
  assert.equal(parseWarrantyMonths(`${HE(22, 5)} ${HE_TWO_YEARS}`, T), 24);
  assert.equal(parseWarrantyMonths(`3 ${HE_YEARS}`, T), 36);
  assert.equal(parseWarrantyMonths(`6 ${HE_MONTHS}`, T), 6);
  assert.equal(parseWarrantyMonths('lifetime warranty', T), null);
  // Licence number: digits plus only "no." / "licence" words.
  assert.equal(parseLicenseNumber(`${HE_NO}' 4821`, T), '4821');
  assert.equal(parseLicenseNumber('License no. 12345', T), '12345');
  assert.equal(parseLicenseNumber('Master electrician license 12345', T), null, 'other words: not a number-only answer');
  assert.equal(parseLicenseNumber('12', T), null, 'too short to be a licence number');
  // Rating and count.
  assert.equal(parseRating('4.9'), '4.9');
  assert.equal(parseRating('4,9'), '4.9');
  assert.equal(parseRating('5'), '5');
  assert.equal(parseRating('5.0'), '5');
  assert.equal(parseRating('5.5'), null);
  assert.equal(parseRating('4.9 stars'), null);
  assert.equal(parseReviewCount(64), 64);
  assert.equal(parseReviewCount('64'), 64);
  assert.equal(parseReviewCount(0), null);
});

test('ownerFacts: parsed numbers, Hebrew text verbatim, English non-numeric text dropped (never translated)', () => {
  const hebrewLicense = `${HE(2, 6)} ${HE(10, 6)} ${HE(18, 4)}`;
  const data: CollectedData = {
    yearsInField: '15 years', license: hebrewLicense, guarantee: '1 year warranty', responseTime: 'within 20 minutes', starRating: '4.9', reviewCount: 64,
  };
  const facts = ownerFacts(data, brief(), T);
  assert.deepEqual(facts.years, { kind: 'years', source: 'parsed', slots: { n: '15' }, dataKey: 'yearsInField', factId: 'proof-yearsInField' });
  assert.deepEqual(facts.license, { kind: 'license', source: 'verbatim', slots: { license: hebrewLicense }, dataKey: 'license', factId: 'proof-license' });
  assert.equal(facts.warranty?.kind, 'warranty');
  assert.equal(facts.response?.slots.minutes, '20');
  assert.deepEqual(facts.rating?.slots, { rating: '4.9', count: '64' });
  assert.equal(facts.area?.kind, 'area');
  assert.deepEqual(droppedOwnerFactKeys(data, T), []);

  // The English fixture: the licence wording is English and not a number -> dropped, and listed for the prompt.
  const english: CollectedData = { license: 'Master electrician license', guarantee: 'Satisfaction guaranteed', responseTime: 'ASAP' };
  const none = ownerFacts(english, brief(), T);
  assert.equal(none.license, undefined);
  assert.equal(none.warranty, undefined);
  assert.equal(none.response, undefined);
  assert.deepEqual(droppedOwnerFactKeys(english, T), ['license', 'guarantee', 'responseTime']);

  // A Hebrew warranty the parser cannot read stays verbatim; a parsed duration outside the fixed set falls back to it.
  const unparsed = `${HE(22, 5)} ${HE(3, 3)} ${HE(11, 4)}`;
  assert.deepEqual(ownerFacts({ guarantee: unparsed }, brief(), T).warranty, { kind: 'warrantyVerbatim', source: 'verbatim', slots: { warranty: unparsed }, dataKey: 'guarantee', factId: 'proof-guarantee' });
  const threeMonths = `${HE(22, 5)} 3 ${HE_MONTHS}`;
  assert.equal(ownerFacts({ guarantee: threeMonths }, brief(), T).warranty?.kind, 'warranty', 'Noa: any other number of months takes NMonths');
  assert.deepEqual(ownerFacts({ guarantee: '3 months' }, brief(), T).warranty?.slots, { months: '3' });
  // A Hebrew response answer that is not a duration (e.g. same day) is not rendered, but is still the owner's own words.
  assert.equal(ownerFacts({ responseTime: `${HE(1, 4)} ${HE(9, 3)}` }, brief(), T).response, undefined);
  assert.deepEqual(droppedOwnerFactKeys({ responseTime: `${HE(1, 4)} ${HE(9, 3)}` }, T), []);
  // Licence number only.
  assert.deepEqual(ownerFacts({ license: `${HE_NO}' 4821` }, brief(), T).license?.slots, { number: '4821' });
  // Over-long Hebrew text is dropped, never cut.
  assert.equal(ownerFacts({ license: HE(0, 61) }, brief(), T).license, undefined);
  // No proof id in the brief -> the fact still renders in the trust bar but has no proof reference.
  assert.equal(ownerFacts({ yearsInField: '12' }, brief([]), T).years?.factId, null);
});

test('trustBarFromFacts: B2 kind order, at most TRUST_BAR_MAX_ITEMS, area tile from the brief, no response time on an install page', () => {
  const data: CollectedData = { yearsInField: '15', license: `${HE_NO}' 4821`, guarantee: '2 years', responseTime: '20 min', starRating: '5' };
  const facts = ownerFacts(data, brief(), T);
  assert.equal(TRUST_BAR_MAX_ITEMS, 3);
  assert.deepEqual(trustBarFromFacts(facts, { installPage: false }, T), ['Y:15', 'LN:4821', 'W:2yr']);
  // Fewer facts: the area tile, the rating, the response time follow in that order.
  const few = ownerFacts({ responseTime: '2 hours', starRating: '4.9', reviewCount: 64 }, brief(), T);
  const bar = trustBarFromFacts(few, { installPage: false }, T);
  assert.equal(bar.length, 3);
  assert.equal(bar[0], few.area?.slots.area, 'the area tile (buildAreaTile)');
  assert.deepEqual(bar.slice(1), ['4.9*/64', 'R:2h']);
  assert.deepEqual(trustBarFromFacts(few, { installPage: true }, T).slice(1), ['4.9*/64'], 'no response time on an installation page');
  // Rating without a count; durations from the fixed set; response forms.
  assert.deepEqual(trustBarFromFacts(ownerFacts({ starRating: '5', guarantee: '6 months' }, { ...brief(), site: undefined }, T), { installPage: false }, T), ['W:6mo', '5*']);
  assert.deepEqual(trustBarFromFacts(ownerFacts({ guarantee: '5 years', responseTime: '1 hour' }, { ...brief(), site: undefined }, T), { installPage: false }, T), ['W:5yr', 'R:1h']);
  assert.deepEqual(trustBarFromFacts(ownerFacts({ responseTime: '4 hours' }, { ...brief(), site: undefined }, T), { installPage: false }, T), ['R:4h']);
  assert.deepEqual(trustBarFromFacts(ownerFacts({ responseTime: '90 minutes' }, { ...brief(), site: undefined }, T), { installPage: false }, T), ['R:90min']);
  // An item past TRUST_BAR_MAX_CHARS is skipped, never cut.
  const long = `${HE(2, 12)} ${HE(10, 12)}`;
  assert.ok(long.length > TRUST_BAR_MAX_CHARS);
  assert.deepEqual(trustBarFromFacts(ownerFacts({ license: long, yearsInField: '9' }, { ...brief(), site: undefined }, T), { installPage: false }, T), ['Y:9']);
});

test('proofItemsFromFacts: one sentence per traced fact, existing proof ids, within the B6 limits', () => {
  const hebrewLicense = `${HE(2, 6)} ${HE(10, 6)}`;
  const facts = ownerFacts({ yearsInField: '18', license: hebrewLicense, guarantee: '1 year', responseTime: '30 minutes', starRating: '4.9' }, brief(), T);
  assert.deepEqual(proofItemsFromFacts(facts, { installPage: false }, T), [
    { text: 'I have 18 years.', factIds: ['proof-yearsInField'] },
    { text: `${hebrewLicense}.`, factIds: ['proof-license'] },
    { text: 'You get a warranty for l1yr.', factIds: ['proof-guarantee'] },
    { text: 'I call back within 30min.', factIds: ['proof-responseTime'] },
  ]);
  assert.equal(proofItemsFromFacts(facts, { installPage: true }, T).length, 3, 'no response time on an installation page');
  assert.ok(proofItemsFromFacts(facts, { installPage: false }, T).length <= DEPTH_BLOCK_LIMITS.proof.maxItems);
  // A fact whose proof id the brief does not carry is left out (factIds must reference the brief).
  assert.deepEqual(proofItemsFromFacts(ownerFacts({ yearsInField: '18' }, brief([]), T), { installPage: false }, T), []);
  // Nothing to prove -> empty (withSystemFields then sets proofItems to null).
  assert.deepEqual(proofItemsFromFacts(ownerFacts({}, brief(), T), { installPage: false }, T), []);
});

test('fillTemplate: every slot must have a value', () => {
  assert.equal(fillTemplate('a {n}  b', { n: '3' }), 'a 3 b');
  assert.throws(() => fillTemplate('a {n}', {}), /\{n\}/);
});

// ---------------------------------------------------------------------------
// Noa's code rules (2026-11-10), against the real Noa-approved templates. Every Hebrew string is read from the template
// constant or the committed fixture-answer file (sliced, never typed).
// ---------------------------------------------------------------------------
const R = OWNER_FACT_TEMPLATES;
const live = () => assert.equal(FACT_TEMPLATES_PENDING_COPY, false, 'the Noa templates are applied');
const fact = (kind: Parameters<typeof trustText>[0]['kind'], slots: Record<string, string>) => ({ kind, source: 'parsed' as const, slots, dataKey: null, factId: 'proof-x' });

test('Noa rule: branch on n / count (years 1 / 2 / N, minutes 1, months 1 / 2 / 6 / N, one review)', () => {
  live();
  assert.equal(trustText(fact('years', { n: '1' }), R), R.trustYearsOne);
  assert.equal(trustText(fact('years', { n: '2' }), R), R.trustYearsTwo);
  assert.equal(trustText(fact('years', { n: '3' }), R), R.trustYears.replace('{n}', '3'));
  assert.equal(proofText(fact('years', { n: '1' }), R), R.proofYearsOne);
  assert.equal(proofText(fact('years', { n: '2' }), R), R.proofYearsTwo);
  assert.equal(trustText(fact('response', { minutes: '1' }), R), R.trustCallback.replace('{time}', R.responseOneMinute));
  assert.equal(trustText(fact('response', { minutes: '30', form: 'halfHour' }), R), R.trustCallback.replace('{time}', R.responseHalfHour));
  assert.equal(trustText(fact('response', { minutes: '30' }), R), R.trustCallback.replace('{time}', R.responseMinutes.replace('{n}', '30')), 'digits stay digits');
  for (const [months, key] of [['1', 'warrantyBareOneMonth'], ['2', 'warrantyBareTwoMonths'], ['6', 'warrantyBareSixMonths'], ['12', 'warrantyBareOneYear'], ['18', 'warrantyBareOneAndHalfYears'], ['24', 'warrantyBareTwoYears']] as const) {
    assert.equal(trustText(fact('warranty', { months }), R), R.trustWarranty.replace('{duration}', R[key]), months);
  }
  assert.equal(trustText(fact('warranty', { months: '3' }), R), R.trustWarranty.replace('{duration}', R.warrantyBareNMonths.replace('{n}', '3')));
  assert.equal(trustText(fact('warranty', { months: '36' }), R), R.trustWarranty.replace('{duration}', R.warrantyBareNYears.replace('{n}', '3')));
  assert.equal(proofText(fact('warranty', { months: '1' }), R), R.proofWarranty.replace('{duration}', R.warrantyLamedOneMonth));
  assert.equal(trustText(fact('rating', { rating: '4.9', count: '1' }), R), R.trustRatingOneReview.replace('{rating}', '4.9'));
  assert.equal(trustText(fact('rating', { rating: '4.9', count: '64' }), R), R.trustRating.replace('{rating}', '4.9').replace('{count}', '64'));
});

test('Noa rule: a same-day answer uses the two SameDay keys, never a duration slot', () => {
  live();
  for (const phrase of R.parseSameDayWords) assert.deepEqual(parseResponse(phrase, R), { sameDay: true }, phrase);
  assert.deepEqual(parseResponse('same day', R), { sameDay: true });
  const facts = ownerFacts({ responseTime: R.parseSameDayWords[0] }, brief(), R);
  assert.deepEqual(facts.response?.slots, { sameDay: '1' });
  assert.equal(trustText(facts.response!, R), R.trustCallbackSameDay, 'Adam: the callback set');
  assert.equal(proofText(facts.response!, R), R.proofCallbackSameDay);
  const filled = [trustText(facts.response!, R), proofText(facts.response!, R)];
  assert.ok(R.responseSameDay && filled.every(item => item !== R.trustCallback.replace('{time}', R.responseSameDay ?? '')), 'responseSameDay never fills {time}');
});

test('Noa rule: proofLicense only for licence text that opens with a document noun; otherwise proofLicenseVerbatim', () => {
  live();
  // The committed eval-fixture licence answer (Noa-approved) opens with the licence noun.
  const answers = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../docs/copy/site-bot-eval-fixture-owner-answers-2026-11-10.json'), 'utf8')) as Record<string, unknown>;
  const fixtureLicense = (JSON.stringify(answers).match(/"license":"([^"]+)"/) ?? [])[1];
  assert.ok(fixtureLicense, 'the fixture file carries a Hebrew licence answer');
  const noun = R.trustLicenseNumber.split(' ')[0];
  assert.ok(fixtureLicense.startsWith(noun), 'the fixture licence opens with the template file\'s licence noun');
  const withNoun = ownerFacts({ license: fixtureLicense }, brief(), R).license!;
  assert.equal(proofText(withNoun, R), R.proofLicense.replace('{license}', stripTrailingPunctuation(fixtureLicense)));
  const other = R.parseSameDayWords[1];
  assert.equal(proofText(fact('license', { license: other }), R), R.proofLicenseVerbatim.replace('{license}', other));
});

test('Noa rule: verbatim slots lose their trailing punctuation (the template adds the period)', () => {
  live();
  const owner = `${R.parseSameDayWords[1]}.`;
  const warranty = ownerFacts({ guarantee: owner }, brief(), R).warranty!;
  assert.equal(warranty.kind, 'warrantyVerbatim');
  assert.equal(proofText(warranty, R), R.proofWarrantyVerbatim.replace('{warranty}', R.parseSameDayWords[1]));
  assert.equal(proofText(warranty, R)?.endsWith('..'), false);
});

test('Noa rule: parsing, most specific first; one stripped prefix letter, sliced from the lexicon', () => {
  live();
  const prefixes = parsePrefixLetters(R);
  assert.equal(prefixes.length, 4, 'four attached letters in the lexicon');
  assert.equal(parseWarrantyMonths(R.parseOneAndHalfYearWords[0], R), 18, 'a year and a half before the year word it contains');
  assert.equal(parseWarrantyMonths(R.parseHalfYearWords[0], R), 6, 'half a year before the year word');
  assert.equal(parseWarrantyMonths(R.parseTwoYearWords[0], R), 24);
  assert.equal(parseWarrantyMonths(`3 ${R.parseYearWords[0]}`, R), 36);
  assert.equal(parseWarrantyMonths(R.parseOneYearWords[0], R), 12);
  assert.equal(parseWarrantyMonths(R.parseTwoMonthWords[0], R), 2);
  assert.equal(parseWarrantyMonths(R.parseOneMonthWords[0], R), 1);
  assert.equal(parseWarrantyMonths(`${prefixes[0]}${R.parseTwoYearWords[0]}`, R), 24, 'one prefix letter stripped');
  assert.equal(parseWarrantyMonths(`${prefixes[0]}${prefixes[1]}${R.parseTwoYearWords[0]}`, R), null, 'two prefix letters: no match');
  assert.equal(parseResponseMinutes(R.parseHalfHourWords[0], R), 30);
  assert.equal(parseResponseMinutes(R.parseTwoHourWords[0], R), 120);
  assert.equal(parseResponseMinutes(`20 ${R.parseMinuteWords[0]}`, R), 20);
  assert.equal(parseResponseMinutes(R.parseOneHourWords[0], R), null, 'a bare hour word alone is not a duration');
  assert.equal(parseResponseMinutes(`${FIX_TIME_LEAD_TOKENS[0]} ${R.parseOneHourWords[0]}`, R), 60, 'within + hour');
  assert.equal(parseYears(R.parseTwoYearWords[0], R), 2);
  assert.equal(parseYears(R.parseOneAndHalfYearWords[0], R), null, 'never 1.5 years in the trade');
});

test('Noa rule: licence-number and verbatim chips longer than 24 characters are dropped', () => {
  live();
  assert.equal(VERBATIM_CHIP_MAX_CHARS, 24);
  const noBrief = { ...brief(), site: undefined };
  const longNumber = '12345678901234567';
  assert.ok(R.trustLicenseNumber.replace('{number}', longNumber).length > 24);
  assert.deepEqual(trustBarFromFacts(ownerFacts({ license: longNumber, yearsInField: '9' }, noBrief, R), { installPage: false }, R), [R.trustYears.replace('{n}', '9')]);
  const longVerbatim = `${R.parseSameDayWords[5]} ${R.parseSameDayWords[6]} ${R.parseSameDayWords[7]}`;
  assert.ok(longVerbatim.length > 24 && longVerbatim.length <= 60);
  assert.deepEqual(trustBarFromFacts(ownerFacts({ guarantee: longVerbatim }, noBrief, R), { installPage: false }, R), []);
});

// ---------------------------------------------------------------------------
// Noa r2 (2026-11-10, docs/copy/site-bot-fact-templates-2026-11-10.json `_rules`): one test per rule, against the real
// templates. Hebrew is sliced from the template constant or the committed fixture-answer file, never typed.
// ---------------------------------------------------------------------------
type FixtureAnswers = Record<string, Record<string, string>>;
const fixtureAnswers = (): FixtureAnswers => JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../docs/copy/site-bot-eval-fixture-owner-answers-2026-11-10.json'), 'utf8')) as FixtureAnswers;
const proofOf = (data: CollectedData, kind: 'warranty' | 'response' | 'license' | 'years') => {
  const facts = ownerFacts(data, brief(), R);
  return facts[kind] ? proofText(facts[kind]!, R) : undefined;
};
const W = () => R.parseWarrantyWords[0];
const LAMED = () => R.warrantyLamedOneYear[0];
/** The words of a fixture answer after its first n words (a verbatim tail, sliced). */
const tailAfter = (value: string, n: number) => value.split(' ').slice(n).join(' ');

test('Noa r2 proofWarranty: no scope tail (picker values, duration alone) -> the unscoped proof', () => {
  live();
  for (const [answer, lamed] of [[R.warrantyBareSixMonths, R.warrantyLamedSixMonths], [R.warrantyBareOneYear, R.warrantyLamedOneYear], [R.warrantyBareTwoYears, R.warrantyLamedTwoYears], [`${W()} ${R.parseOneYearWords[0]}`, R.warrantyLamedOneYear]]) {
    assert.equal(proofOf({ guarantee: answer }, 'warranty'), R.proofWarranty.replace('{duration}', lamed), answer);
  }
});

test('Noa r2 proofWarrantyScoped: the owner tail verbatim (ac-repair, plumber, the intake placeholder shape)', () => {
  live();
  const answers = fixtureAnswers();
  const ac = answers['ac-repair'].guarantee;
  const plumber = answers.plumber.guarantee;
  assert.equal(proofOf({ guarantee: ac }, 'warranty'), R.proofWarrantyScoped.replace('{duration}', R.warrantyLamedSixMonths).replace('{scope}', tailAfter(ac, 3)));
  assert.equal(proofOf({ guarantee: plumber }, 'warranty'), R.proofWarrantyScoped.replace('{duration}', R.warrantyLamedTwoYears).replace('{scope}', tailAfter(plumber, 2)));
  const placeholder = `3 ${R.parseYearWords[0]} ${tailAfter(ac, 3)}`;
  assert.equal(proofOf({ guarantee: placeholder }, 'warranty'), R.proofWarrantyScoped.replace('{duration}', R.warrantyLamedNYears.replace('{n}', '3')).replace('{scope}', tailAfter(ac, 3)));
  for (const answer of [ac, plumber, placeholder]) assert.notEqual(proofOf({ guarantee: answer }, 'warranty'), R.proofWarranty.replace('{duration}', R.warrantyLamedSixMonths), 'never the unscoped form');
  // A tail that fails the grammar (a digit, punctuation, too many words) -> the owner's full answer verbatim, never unscoped.
  const digits = `${ac} 2`;
  assert.equal(proofOf({ guarantee: digits }, 'warranty'), R.proofWarrantyVerbatim.replace('{warranty}', digits));
  const comma = `${W()} ${R.parseOneYearWords[0]} ${R.warrantyScopeLeadWords[0]} ${tailAfter(ac, 3)}, ${tailAfter(ac, 3)}`;
  assert.equal(proofOf({ guarantee: comma }, 'warranty'), R.proofWarrantyVerbatim.replace('{warranty}', comma));
  const long = `${ac} ${tailAfter(plumber, 3)} ${tailAfter(plumber, 3)}`;
  assert.equal(proofOf({ guarantee: long }, 'warranty'), R.proofWarrantyVerbatim.replace('{warranty}', long));
  // A tail that fails and a full answer that is not Hebrew -> no warranty sentence at all (the chip still shows the duration).
  const english = '1 year warranty on all plumbing jobs';
  assert.equal(proofOf({ guarantee: english }, 'warranty'), null);
  assert.equal(proofItemsFromFacts(ownerFacts({ guarantee: english }, brief(), R), { installPage: false }, R).length, 0);
});

test('Noa r2 parseWarrantyWords: the warranty noun is removed before the scope test (whole word)', () => {
  live();
  assert.equal(warrantyScope(`${W()} ${R.parseTwoYearWords[0]}`, R).kind, 'none');
  assert.equal(warrantyScope(`${R.parseTwoYearWords[0]} ${W()}`, R).kind, 'none');
  assert.equal(warrantyScope(`${W()}${W()} ${R.parseTwoYearWords[0]}`, R).kind, 'unfit', 'not a whole word: something else remains');
});

test('Noa r2 warrantyScopeLeadWords: a tail must open with the standalone lead; an attached-prefix lead is not a scope', () => {
  live();
  const ac = fixtureAnswers()['ac-repair'].guarantee;
  const prefixed = `${W()} ${R.parseOneYearWords[0]} ${LAMED()}${tailAfter(ac, 3)}`;
  assert.equal(warrantyScope(prefixed, R).kind, 'unfit');
  assert.equal(proofOf({ guarantee: prefixed }, 'warranty'), R.proofWarrantyVerbatim.replace('{warranty}', prefixed));
  assert.deepEqual(warrantyScope(`${W()} ${R.parseOneYearWords[0]} ${tailAfter(ac, 3)}`, R), { kind: 'scoped', scope: tailAfter(ac, 3) });
});

test('Noa r2 parseFillerWords: fillers before the fact are ignored (warranty and response), whole words only', () => {
  live();
  const ac = fixtureAnswers()['ac-repair'].guarantee;
  for (const filler of R.parseFillerWords) {
    assert.deepEqual(warrantyScope(`${filler} ${ac}`, R), { kind: 'scoped', scope: tailAfter(ac, 3) }, filler);
    assert.equal(responseScope(`${filler} 20 ${R.parseMinuteWords[0]}`, R).kind, 'none', filler);
  }
});

test('Noa r2 parseNegationWords: a "no" answer is no fact (guarantee and licence), never verbatim, never shown to the model', () => {
  live();
  for (const negation of R.parseNegationWords) {
    const warranty = `${negation} ${W()}`;
    assert.equal(ownerFacts({ guarantee: warranty }, brief(), R).warranty, undefined, warranty);
    const license = `${negation} ${R.licenseDocumentNouns[0]}`;
    assert.equal(ownerFacts({ license }, brief(), R).license, undefined, license);
    assert.deepEqual(droppedOwnerFactKeys({ guarantee: warranty, license }, R), ['license', 'guarantee']);
  }
  assert.equal(ownerFacts({ guarantee: 'no warranty' }, brief(), R).warranty, undefined);
  assert.equal(opensWithNegation('No. 4821', R), false, 'the English licence-number abbreviation is not a negation');
  assert.equal(ownerFacts({ license: 'No. 4821' }, brief(), R).license?.kind, 'licenseNumber');
});

test('Noa r2 parseHedgeWords: a hedged answer renders no number (years, response; warranty falls back to verbatim)', () => {
  live();
  for (const hedge of R.parseHedgeWords) {
    const glued = /[-\u05BE]$/u.test(hedge);
    const years = glued ? `${hedge}20 ${R.parseYearWords[0]}` : `${hedge} 20 ${R.parseYearWords[0]}`;
    assert.equal(ownerFacts({ yearsInField: years }, brief(), R).years, undefined, years);
    const response = glued ? `${hedge}20 ${R.parseMinuteWords[0]}` : `${hedge} 20 ${R.parseMinuteWords[0]}`;
    assert.equal(ownerFacts({ responseTime: response }, brief(), R).response, undefined, response);
    const warranty = glued ? `${hedge}3 ${R.parseYearWords[0]}` : `${hedge} ${R.parseOneYearWords[0]}`;
    const fact = ownerFacts({ guarantee: warranty }, brief(), R).warranty;
    assert.ok(!fact || fact.kind === 'warrantyVerbatim', warranty);
    if (glued) assert.equal(ownerFacts({ yearsInField: `${hedge[0]}20 ${R.parseYearWords[0]}` }, brief(), R).years, undefined, 'the bare first letter before a digit');
  }
  assert.equal(ownerFacts({ yearsInField: 'almost 20 years' }, brief(), R).years, undefined);
  assert.equal(ownerFacts({ responseTime: 'about 20 minutes' }, brief(), R).response, undefined);
  assert.equal(ownerFacts({ yearsInField: '20 years' }, brief(), R).years?.slots.n, '20');
});

test('Noa r2 parseWithinWords: response only, the bare unit word must be the last word; a hedge for warranty and years', () => {
  live();
  for (const within of R.parseWithinWords) {
    assert.equal(parseResponseMinutes(`${within} ${R.parseOneHourWords[0]}`, R), 60, within);
    assert.equal(parseResponseMinutes(`${within} ${R.parseOneHourWords[0]}.`, R), 60, 'trailing punctuation stripped');
    assert.equal(parseResponseMinutes(`${within} ${R.parseOneHourWords[0]} ${R.parseFillerWords[0]}`, R), null, 'the unit word is not last');
    assert.equal(parseResponseMinutes(`${within} 3 ${R.parseHourWords[0]}`, R), 180, 'number with unit needs no lead');
    assert.equal(ownerFacts({ yearsInField: `${within} 10 ${R.parseYearWords[0]}` }, brief(), R).years, undefined, 'years: a hedge');
    const warranty = ownerFacts({ guarantee: `${within} ${R.parseOneYearWords[0]}` }, brief(), R).warranty;
    assert.ok(!warranty || warranty.kind === 'warrantyVerbatim', 'warranty: a hedge');
  }
});

test('Noa r2 licenseDocumentNouns: exact first-word match, no prefix stripping, kept out of parsePrefixLetters', () => {
  live();
  const tail = fixtureAnswers().electrician.license.split(' ').slice(1, 3).join(' ');
  for (const noun of R.licenseDocumentNouns) {
    assert.equal(proofOf({ license: `${noun} ${tail}` }, 'license'), R.proofLicense.replace('{license}', `${noun} ${tail}`), noun);
    const prefixed = `${LAMED()}${noun} ${tail}`;
    assert.equal(proofOf({ license: prefixed }, 'license'), R.proofLicenseVerbatim.replace('{license}', prefixed), 'a prefixed first word');
  }
  assert.ok(licenseDocumentNouns(R).includes(R.trustLicenseNumber.split(' ')[0]), 'the sliced noun stays a member');
  assert.equal(parsePrefixLetters(R).length, 4, 'the r2 lists do not change the prefix letters');
});

test('Noa r2 proofResponseScoped: a duration with a place tail -> the scoped proof only, no trust chip (Adam)', () => {
  live();
  const place = tailAfter(fixtureAnswers().plumber.responseTime, 2);
  const answer = `20 ${R.parseMinuteWords[0]} ${place}`;
  const facts = ownerFacts({ responseTime: answer }, brief(), R);
  assert.equal(proofText(facts.response!, R), R.proofResponseScoped.replace('{time}', R.responseMinutes.replace('{n}', '20')).replace('{scope}', place));
  assert.equal(trustText(facts.response!, R), null);
  assert.equal(trustBarFromFacts({ response: facts.response }, { installPage: false }, R).length, 0);
});

test('Noa r2 proofResponseSameDayScoped: ac-repair and plumber fixtures', () => {
  live();
  const answers = fixtureAnswers();
  for (const key of ['ac-repair', 'plumber']) {
    const answer = answers[key].responseTime;
    assert.equal(proofOf({ responseTime: answer }, 'response'), R.proofResponseSameDayScoped.replace('{scope}', tailAfter(answer, 2)), key);
    assert.equal(trustBarFromFacts(ownerFacts({ responseTime: answer }, { ...brief(), site: undefined }, R), { installPage: false }, R).length, 0, 'no chip');
  }
});

test('Noa r2 responseScopeLeadLetters: a place tail without the lead letter -> no response fact (never unscoped)', () => {
  live();
  const city = fixtureAnswers().plumber.targetLocation;
  assert.ok(!R.responseScopeLeadLetters.some(letter => city.startsWith(letter)));
  assert.equal(ownerFacts({ responseTime: `20 ${R.parseMinuteWords[0]} ${city}` }, brief(), R).response, undefined);
  assert.equal(ownerFacts({ responseTime: `${R.parseSameDayWords[3]} ${city}` }, brief(), R).response, undefined);
});

test('Noa r2 callback set (Adam): responseTime renders as a callback, chip and proof; arrival templates unused', () => {
  live();
  const minutes = ownerFacts({ responseTime: `20 ${R.parseMinuteWords[0]}` }, brief(), R).response!;
  const time = R.responseMinutes.replace('{n}', '20');
  assert.equal(trustText(minutes, R), R.trustCallback.replace('{time}', time));
  assert.equal(proofText(minutes, R), R.proofCallback.replace('{time}', time));
  const sameDay = ownerFacts({ responseTime: R.parseSameDayWords[0] }, brief(), R).response!;
  assert.equal(trustText(sameDay, R), R.trustCallbackSameDay);
  assert.equal(proofText(sameDay, R), R.proofCallbackSameDay);
  for (const value of [trustText(minutes, R), proofText(minutes, R), trustText(sameDay, R), proofText(sameDay, R)]) {
    assert.ok(![R.trustResponse.replace('{time}', time), R.proofResponse.replace('{time}', time), R.trustResponseSameDay, R.proofResponseSameDay].includes(value ?? ''));
  }
});
