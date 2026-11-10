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
import { TRUST_BAR_MAX_CHARS, TRUST_BAR_MAX_ITEMS } from './generationData';
import {
  codeOwnedFactTemplates,
  droppedOwnerFactKeys,
  FACT_PARSE_TOKEN_KEYS,
  FACT_TEMPLATE_KEYS,
  FACT_TEMPLATE_SLOTS,
  FACT_TEMPLATES_PENDING_COPY,
  FACT_TEMPLATES_SOURCE,
  factTemplateProblems,
  fillTemplate,
  OWNER_FACT_TEMPLATES,
  ownerFacts,
  parseLicenseNumber,
  parseRating,
  parseResponseMinutes,
  parseReviewCount,
  parseWarrantyMonths,
  parseYears,
  proofItemsFromFacts,
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

/** ASCII stand-ins: every template is a marker plus its slots, so the tests read which template and slots were used. */
const STAND_IN_TEMPLATES: OwnerFactTemplates = {
  trustYears: 'Y:{n}', trustLicense: 'L:{license}', trustLicenseNumber: 'LN:{number}', trustWarranty: 'W:{duration}',
  trustWarrantyVerbatim: '{warranty}', trustResponse: 'R:{time}', trustRating: '{rating}*/{count}', trustRatingNoCount: '{rating}*',
  proofYears: 'I have {n} years.', proofLicense: 'I hold {license}.', proofLicenseNumber: 'My licence is {number}.',
  proofWarranty: 'You get a warranty for {duration}.', proofWarrantyVerbatim: 'Warranty: {warranty}.', proofResponse: 'I arrive within {time}.',
  warrantyBareSixMonths: '6mo', warrantyBareOneYear: '1yr', warrantyBareTwoYears: '2yr', warrantyBareNYears: '{n}yr',
  warrantyLamedSixMonths: 'l6mo', warrantyLamedOneYear: 'l1yr', warrantyLamedTwoYears: 'l2yr', warrantyLamedNYears: 'l{n}yr',
  responseMinutes: '{n}min', responseOneHour: '1h', responseTwoHours: '2h', responseHours: '{n}h',
  parseMinuteWords: [HE_MINUTES], parseHourWords: [HE_HOURS], parseOneHourWords: [HE_ONE_HOUR], parseTwoHourWords: [HE_TWO_HOURS],
  parseHalfHourWords: [HE_HALF_HOUR], parseMonthWords: [HE_MONTHS], parseYearWords: [HE_YEARS], parseOneYearWords: [HE_ONE_YEAR],
  parseTwoYearWords: [HE_TWO_YEARS], parseHalfYearWords: [HE_HALF_YEAR], parseLicenseNumberWords: [`${HE_NO}'`],
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
  assert.equal(FACT_TEMPLATE_KEYS.length, Object.keys(FACT_TEMPLATE_SLOTS).length + FACT_PARSE_TOKEN_KEYS.length);
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
  assert.equal(parseResponseMinutes(HE_ONE_HOUR, T), 60);
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
  assert.equal(ownerFacts({ guarantee: threeMonths }, brief(), T).warranty?.kind, 'warrantyVerbatim');
  assert.equal(ownerFacts({ guarantee: '3 months' }, brief(), T).warranty, undefined, 'English, outside the fixed set: dropped');
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
    { text: `I hold ${hebrewLicense}.`, factIds: ['proof-license'] },
    { text: 'You get a warranty for l1yr.', factIds: ['proof-guarantee'] },
    { text: 'I arrive within 30min.', factIds: ['proof-responseTime'] },
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
