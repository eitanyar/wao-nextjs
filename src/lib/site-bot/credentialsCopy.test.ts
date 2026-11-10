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
  licenseQuestionCopy,
  NO_WARRANTY_VALUE,
  opensWithNegationWord,
  showsLicenseQuestions,
  WARRANTY_CHOICE_COPY_KEY,
  WARRANTY_CHOICES,
  WARRANTY_PICKER_VALUES,
} from './credentialsCopy';
import { buildIntakeCollectedData, emptyIntakeCard } from './startIntake';
import { contractorDetailRepeatWords, droppedOwnerFactKeys, OWNER_FACT_TEMPLATES as R, ownerFacts, proofItemsFromFacts, proofText, trustBarFromFacts, trustText } from '../lp/ownerFactCopy';
import { CONTRACTOR_REGISTERED_VALUE, contractorLicenseValue, parseContractorLicense } from './contractorRegistration';

const root = path.resolve(__dirname, '../../..');
const json = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) as Record<string, unknown>;
const licensedNiche = S.trades.licensedTrades[0];

describe('credentials step: the copy and lists are the source files, byte-exact', () => {
  it('every string and list equals its docs/copy source', () => {
    const copy = json('docs/copy/site-bot-credentials-step-2026-11-10.json');
    const facts = json('docs/copy/site-bot-fact-templates-2026-11-10.json');
    const contractorKeys = Object.keys(CREDENTIALS_COPY).filter(key => key.startsWith('contractor'));
    assert.equal(contractorKeys.length, 5, 'Noa r3: the five contractor strings come from the fact template file');
    for (const [key, value] of Object.entries(CREDENTIALS_COPY)) assert.equal(value, (key.startsWith('contractor') ? facts : copy)[key], key);
    assert.equal(Object.keys(CREDENTIALS_COPY).length, Object.keys(copy).filter(key => key !== '_rules').length + contractorKeys.length);
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
  it('contractors get the contractor tier and, with Noa r3, the contractor wording (never the licence wording)', () => {
    for (const keyword of S.trades.contractorKeywords) assert.equal(credentialTier(keyword), 'contractor', keyword);
    assert.equal(CONTRACTOR_LICENSE_WORDING_PENDING, false);
    for (const keyword of S.trades.contractorKeywords) assert.equal(showsLicenseQuestions(keyword), true, keyword);
    const contractor = licenseQuestionCopy(S.trades.contractorKeywords[0]);
    assert.deepEqual(contractor, {
      question: CREDENTIALS_COPY.contractorLicenseQuestion, yes: CREDENTIALS_COPY.contractorLicenseYes, no: CREDENTIALS_COPY.contractorLicenseNo,
      typePrompt: CREDENTIALS_COPY.contractorLicenseTypePrompt, typePlaceholder: CREDENTIALS_COPY.contractorLicenseTypePlaceholder,
    });
    assert.deepEqual(licenseQuestionCopy(licensedNiche), {
      question: CREDENTIALS_COPY.licenseQuestion, yes: CREDENTIALS_COPY.licenseYes, no: CREDENTIALS_COPY.licenseNo,
      typePrompt: CREDENTIALS_COPY.licenseTypePrompt, typePlaceholder: CREDENTIALS_COPY.licenseTypePlaceholder,
    });
    // Noa: contractorLicenseNo is in parseNegationWords, so it is safe if it ever reaches the field.
    assert.equal(opensWithNegationWord(CREDENTIALS_COPY.contractorLicenseNo), true);
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

describe('credentials step: the contractor tier (Noa r3 trustContractorRegistered / proofContractorRegistered / Detail)', () => {
  const contractorNiche = S.trades.contractorKeywords[0];
  const brief = { firstPartyProof: [{ id: 'proof-license', value: 'l' }], site: undefined };
  // Noa's own example detail, sliced from the placeholder ("e.g.: <branch>, <class>"), never typed.
  const placeholder = CREDENTIALS_COPY.contractorLicenseTypePlaceholder;
  const detail = placeholder.slice(placeholder.indexOf(': ') + 2);
  const proofOf = (license: string) => {
    const facts = ownerFacts({ license }, brief, R);
    return { fact: facts.license, proof: facts.license ? proofText(facts.license, R) : null, chip: facts.license ? trustText(facts.license, R) : null };
  };

  it('writes: yes -> the code value (with the typed detail); no -> nothing; never the chip label', () => {
    assert.equal(credentialsCollectedFields({ license: 'yes' }, contractorNiche).license, CONTRACTOR_REGISTERED_VALUE);
    assert.equal(credentialsCollectedFields({ license: 'yes', licenseText: `  ${detail} ` }, contractorNiche).license, contractorLicenseValue(detail));
    assert.equal(credentialsCollectedFields({ license: 'no', licenseText: detail }, contractorNiche).license, undefined);
    assert.deepEqual(parseContractorLicense(contractorLicenseValue(detail)), { detail });
    assert.deepEqual(parseContractorLicense(CONTRACTOR_REGISTERED_VALUE), { detail: null });
    assert.equal(parseContractorLicense(detail), null, 'typed licence text is not a contractor value');
    const data = buildIntakeCollectedData({ ...emptyIntakeCard(), businessName: 'TEST', businessNiche: contractorNiche, phone: '050-0000000', city: 'Fixture City', serviceModel: 'field' as const }, {}, { credentials: { license: 'yes' } });
    assert.equal(data.license, CONTRACTOR_REGISTERED_VALUE);
  });

  it('yes alone -> trustContractorRegistered chip and proofContractorRegistered (never trustLicense / proofLicense)', () => {
    const { fact, proof, chip } = proofOf(CONTRACTOR_REGISTERED_VALUE);
    assert.equal(fact?.kind, 'contractorRegistered');
    assert.equal(chip, R.trustContractorRegistered);
    assert.equal(proof, R.proofContractorRegistered);
    const facts = ownerFacts({ license: CONTRACTOR_REGISTERED_VALUE }, brief, R);
    assert.deepEqual(trustBarFromFacts(facts, { installPage: false }, R), [R.trustContractorRegistered]);
    assert.deepEqual(proofItemsFromFacts(facts, { installPage: false }, R), [{ text: R.proofContractorRegistered, factIds: ['proof-license'] }]);
    // The English code value never reaches the model.
    assert.ok(droppedOwnerFactKeys({ license: CONTRACTOR_REGISTERED_VALUE }, R).includes('license'));
    assert.ok(droppedOwnerFactKeys({ license: contractorLicenseValue(detail) }, R).includes('license'));
  });

  it('yes + a fitting detail -> proofContractorRegisteredDetail verbatim (Noa example); the chip never carries the detail', () => {
    const expected = R.proofContractorRegisteredDetail.replace('{detail}', detail);
    assert.equal(proofOf(contractorLicenseValue(detail)).proof, expected);
    assert.equal(proofOf(contractorLicenseValue(`${detail}.`)).proof, expected, 'trailing punctuation stripped');
    assert.equal(proofOf(contractorLicenseValue(detail)).chip, R.trustContractorRegistered);
  });

  it('detail guards: not mostly Hebrew, over 30 code points, a negation opener, or a repeat opener -> the plain proof', () => {
    // The repeat openers are sliced from the templates: "contractor" and "registration".
    assert.deepEqual(contractorDetailRepeatWords(R), ['\u05E7\u05D1\u05DC\u05DF', '\u05E8\u05D9\u05E9\u05D5\u05DD']);
    const plain = R.proofContractorRegistered;
    assert.equal(proofOf(contractorLicenseValue('Branch 100, class C1')).proof, plain, 'English');
    assert.equal(proofOf(contractorLicenseValue(`${detail} ${detail}`)).proof, plain, 'over 30 code points');
    assert.ok([...`${detail} ${detail}`].length > 30);
    assert.equal(proofOf(contractorLicenseValue(`${R.parseNegationWords[0]} ${detail}`)).proof, plain, 'negation opener');
    for (const word of contractorDetailRepeatWords(R)) assert.equal(proofOf(contractorLicenseValue(`${word} ${detail}`)).proof, plain, 'repeat opener');
    assert.equal(proofOf(contractorLicenseValue('100')).proof, plain, 'digits only: not mostly Hebrew');
  });
});
