// Intake credentials step: gating per licensed-trade list, the skip path, the CollectedData writes and the typed-"none"
// guard. HEBREW-SAFETY: this file contains ZERO Hebrew bytes; every Hebrew string is sliced from CREDENTIALS_STEP_SOURCE
// (written by scripts/apply-credentials-copy.mjs) or the fact templates.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CONTRACTOR_LICENSE_WORDING_PENDING,
  CREDENTIALS_COPY,
  CREDENTIALS_STEP_SOURCE as S,
  credentialsCollectedFields,
  credentialTier,
  NO_WARRANTY_VALUE,
  opensWithNegationWord,
  showsLicenseQuestions,
  WARRANTY_CHOICE_COPY_KEY,
  WARRANTY_CHOICES,
  WARRANTY_PICKER_VALUES,
} from './credentialsCopy';
import { buildIntakeCollectedData, emptyIntakeCard } from './startIntake';
import { OWNER_FACT_TEMPLATES as R, ownerFacts, proofText } from '../lp/ownerFactCopy';

const root = path.resolve(__dirname, '../../..');
const json = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) as Record<string, unknown>;
const licensedNiche = S.trades.licensedTrades[0];

describe('credentials step: the copy and lists are the source files, byte-exact', () => {
  it('every string and list equals its docs/copy source', () => {
    const copy = json('docs/copy/site-bot-credentials-step-2026-11-10.json');
    for (const [key, value] of Object.entries(CREDENTIALS_COPY)) assert.equal(value, copy[key], key);
    assert.equal(Object.keys(CREDENTIALS_COPY).length, Object.keys(copy).filter(key => key !== '_rules').length);
    const trades = json('docs/copy/site-bot-licensed-trades-2026-11-10.json');
    for (const key of ['licenseExclude', 'licensedTrades', 'contractorKeywords'] as const) assert.deepEqual(S.trades[key], trades[key], key);
    assert.deepEqual(S.negationWords, R.parseNegationWords);
    for (const choice of WARRANTY_CHOICES) assert.ok(CREDENTIALS_COPY[WARRANTY_CHOICE_COPY_KEY[choice]], choice);
  });
});

describe('credentials step: licence gating (licenseExclude -> licensedTrades -> contractorKeywords, substring)', () => {
  it('every licensed-trade keyword gates the licence questions in, also inside a longer niche', () => {
    for (const keyword of S.trades.licensedTrades) {
      assert.equal(credentialTier(keyword), 'licensed', keyword);
      assert.equal(credentialTier(`${S.trades.contractorKeywords[0]} ${keyword}`), 'licensed', 'licensed wins over contractor');
      assert.equal(showsLicenseQuestions(keyword), true, keyword);
    }
  });
  it('every exclusion wins, even when it contains a licensed keyword (car electrician, gas for AC, business broker)', () => {
    for (const keyword of S.trades.licenseExclude) {
      assert.equal(credentialTier(keyword), 'none', keyword);
      assert.equal(showsLicenseQuestions(`${keyword} ${licensedNiche}`), false, 'exclusion first');
    }
    const traps = S.trades.licenseExclude.filter(exclude => S.trades.licensedTrades.some(keyword => exclude.includes(keyword)) || S.trades.contractorKeywords.some(keyword => exclude.includes(keyword)));
    assert.ok(traps.length >= 5, 'the list holds real substring traps');
  });
  it('contractors get the contractor tier; their wording is pending, so no licence question yet', () => {
    for (const keyword of S.trades.contractorKeywords) assert.equal(credentialTier(keyword), 'contractor', keyword);
    assert.equal(CONTRACTOR_LICENSE_WORDING_PENDING, true);
    assert.equal(showsLicenseQuestions(S.trades.contractorKeywords[0]), false);
  });
  it('an open trade or an empty niche never sees the licence question', () => {
    for (const niche of ['Plumber', 'Locksmith', '', undefined]) assert.equal(showsLicenseQuestions(niche), false, String(niche));
  });
});

describe('credentials step: field writes through buildIntakeCollectedData (the checkout-init path)', () => {
  const card = (niche: string) => ({ ...emptyIntakeCard(), businessName: 'TEST', businessNiche: niche, phone: '050-0000000', city: 'Fixture City', serviceModel: 'field' as const });

  it('skip: no credentials -> no yearsInField / license / guarantee', () => {
    const data = buildIntakeCollectedData(card(licensedNiche), {}, { usp: 'x' });
    for (const key of ['yearsInField', 'license', 'guarantee']) assert.equal(key in data, false, key);
    assert.deepEqual(credentialsCollectedFields(undefined, licensedNiche), {});
    assert.deepEqual(credentialsCollectedFields({}, licensedNiche), {});
  });

  it('years, licence and a picker warranty land in the existing fields', () => {
    const licence = `${S.trades.licensedTrades[0]} 12345`;
    const data = buildIntakeCollectedData(card(licensedNiche), {}, { credentials: { years: ' 12 ', license: 'yes', licenseText: licence, warranty: 'oneYear' } });
    assert.equal(data.yearsInField, '12');
    assert.equal(data.license, licence);
    assert.equal(data.guarantee, WARRANTY_PICKER_VALUES.oneYear);
  });

  it('years: only a whole number 1..70', () => {
    for (const bad of ['0', '120', 'abc', '1.5', '-3']) assert.equal(credentialsCollectedFields({ years: bad }, licensedNiche).yearsInField, undefined, bad);
    assert.equal(credentialsCollectedFields({ years: '07' }, licensedNiche).yearsInField, '7');
  });

  it('licence: only for a licensed trade, only on "yes" with a text', () => {
    assert.equal(credentialsCollectedFields({ license: 'yes', licenseText: 'X 123' }, 'Plumber').license, undefined, 'not asked -> never stored');
    assert.equal(credentialsCollectedFields({ license: 'no', licenseText: 'X 123' }, licensedNiche).license, undefined);
    assert.equal(credentialsCollectedFields({ license: 'yes', licenseText: '  ' }, licensedNiche).license, undefined);
  });

  it('warranty: none stores the code value (never the chip label); pickers store code values', () => {
    const none = credentialsCollectedFields({ warranty: 'none' }, licensedNiche).guarantee;
    assert.equal(none, NO_WARRANTY_VALUE);
    assert.notEqual(none, CREDENTIALS_COPY.warrantyNone);
    for (const choice of ['sixMonths', 'oneYear', 'twoYears'] as const) {
      const value = credentialsCollectedFields({ warranty: choice }, 'Plumber').guarantee;
      assert.equal(value, WARRANTY_PICKER_VALUES[choice]);
      assert.notEqual(value, CREDENTIALS_COPY[WARRANTY_CHOICE_COPY_KEY[choice]]);
    }
    assert.equal(credentialsCollectedFields({ warranty: 'other', warrantyOther: '' }, 'Plumber').guarantee, undefined);
    const typed = `3 ${R.parseYearWords[0]}`;
    assert.equal(credentialsCollectedFields({ warranty: 'other', warrantyOther: typed }, 'Plumber').guarantee, typed);
  });
});

describe('credentials step: the stored values render the right facts (real templates)', () => {
  const brief = { firstPartyProof: [{ id: 'proof-guarantee', value: 'g' }, { id: 'proof-license', value: 'l' }], site: undefined };
  it('picker values produce the UNSCOPED warranty proof', () => {
    const lamed = { sixMonths: R.warrantyLamedSixMonths, oneYear: R.warrantyLamedOneYear, twoYears: R.warrantyLamedTwoYears } as const;
    for (const choice of ['sixMonths', 'oneYear', 'twoYears'] as const) {
      const fact = ownerFacts({ guarantee: WARRANTY_PICKER_VALUES[choice] }, brief, R).warranty;
      assert.ok(fact, choice);
      assert.equal(proofText(fact, R), R.proofWarranty.replace('{duration}', lamed[choice]), choice);
    }
  });
  it('negation guard: the none value, the chip label and any typed "none" never become a warranty or licence fact', () => {
    assert.equal(ownerFacts({ guarantee: NO_WARRANTY_VALUE }, brief, R).warranty, undefined);
    assert.equal(ownerFacts({ guarantee: CREDENTIALS_COPY.warrantyNone }, brief, R).warranty, undefined, 'the label is a negation too');
    for (const negation of S.negationWords) {
      const typed = `${negation} ${R.parseWarrantyWords[0]}`;
      assert.equal(opensWithNegationWord(typed), true, negation);
      assert.equal(credentialsCollectedFields({ warranty: 'other', warrantyOther: typed }, 'Plumber').guarantee, NO_WARRANTY_VALUE, negation);
      assert.equal(credentialsCollectedFields({ license: 'yes', licenseText: `${negation} ${S.trades.licensedTrades[0]}` }, licensedNiche).license, undefined, negation);
    }
    assert.equal(credentialsCollectedFields({ license: 'yes', licenseText: CREDENTIALS_COPY.licenseNo }, licensedNiche).license, undefined, 'the "no" label typed in');
    assert.equal(opensWithNegationWord('none'), true);
    assert.equal(opensWithNegationWord('No. 4821'), false);
  });
});
