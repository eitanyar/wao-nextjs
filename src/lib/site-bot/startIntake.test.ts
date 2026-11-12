import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIntakeCollectedData,
  emptyIntakeCard,
  intakeFromSeed,
  intakeQuestions,
  isolateTimeRanges,
  isPrefillRequest,
  stripBidiIsolates,
  MAX_INTAKE_QUESTIONS,
  missingCardFields,
  splitServiceList,
  travelStepNeedsServiceModel,
  type IntakeCard,
  type IntakeServiceModel,
} from './startIntake';
import { seedFromPrefillSnapshot } from './seedPrefill';
import { buildFixtureSnapshot } from './placePrefill';
import { buildSiteResearchInput } from './research/researchInput';
import { compileBusinessTruthModel } from './research/businessTruth';
import { deriveOpenResearchGates } from './research/gates';

const AUDIT = '123e4567-e89b-42d3-a456-426614174000';
const fullSeed = () => seedFromPrefillSnapshot(buildFixtureSnapshot({ placeId: 'fixture-place-1', displayName: 'Synthetic Business', formattedAddress: '1 Synthetic St' }));
const answers = { priorityServices: 'leak repair, boiler install', travelBoundary: 'up to 30 km from Fixture City', usp: 'arrives within 60 minutes, 12-month warranty' };

describe('startIntake: step count', () => {
  it('full pre-fill: card + at most 3 questions, service model not asked', () => {
    const { card } = intakeFromSeed(fullSeed());
    assert.equal(card.serviceModelInferred, true);
    assert.equal(travelStepNeedsServiceModel(card), false);
    const steps = intakeQuestions(card);
    assert.deepEqual(steps, ['priorityServices', 'travelBoundary', 'usp']);
    assert.ok(steps.length <= MAX_INTAKE_QUESTIONS);
    assert.deepEqual(missingCardFields(card), []);
  });

  it('no pre-fill: empty editable card, still at most 3 questions, Q2 asks the service model first', () => {
    const { card, evidence } = intakeFromSeed(undefined);
    assert.deepEqual(card, emptyIntakeCard());
    assert.deepEqual(evidence, {});
    const steps = intakeQuestions(card);
    assert.deepEqual(steps, ['priorityServices', 'travelBoundary', 'usp']);
    assert.ok(steps.length <= MAX_INTAKE_QUESTIONS);
    assert.equal(travelStepNeedsServiceModel(card), true);
    assert.deepEqual(missingCardFields(card), ['businessName', 'businessNiche', 'phone', 'city']);
  });

  it('every service model keeps the count at or under 3; an inferred remote model skips Q2', () => {
    for (const serviceModel of ['field', 'location', 'mixed', 'remote'] as IntakeServiceModel[]) {
      for (const serviceModelInferred of [true, false]) {
        const steps = intakeQuestions({ ...emptyIntakeCard(), serviceModel, serviceModelInferred });
        assert.ok(steps.length <= MAX_INTAKE_QUESTIONS);
        assert.equal(steps.includes('travelBoundary'), !(serviceModelInferred && serviceModel === 'remote'));
      }
    }
  });
});

describe('startIntake: mapping', () => {
  it('derives contact, hours, website and slug from GBP; nothing dropped is required', () => {
    const { card, evidence } = intakeFromSeed(fullSeed());
    const data = buildIntakeCollectedData(card, evidence, answers);
    assert.equal(data.businessName, 'Synthetic Business');
    assert.equal(data.businessNiche, 'Plumber');
    assert.equal(data.primaryService, 'Plumber');
    assert.equal(data.phone, '03-555-0123');
    assert.equal(data.whatsappNumber, '03-555-0123');
    assert.equal(data.businessHours, 'Sun-Thu 08:00-18:00, Fri 08:00-13:00');
    assert.equal(data.websiteUri, 'https://www.fixture-plumbing.example/');
    assert.equal(data.preferredSlug, 'fixture-plumbing');
    assert.equal(data.targetLocation, 'Fixture City');
    assert.equal(data.specificCities, 'Fixture City');
    assert.deepEqual(data.priorityServices, ['leak repair', 'boiler install']);
    assert.equal(data.secondaryServices, 'leak repair, boiler install');
    assert.equal(data.travelBoundary, answers.travelBoundary);
    assert.equal(data.usp, answers.usp);
    for (const key of ['reviewQuote', 'starRating', 'reviewCount']) assert.equal(key in data, false, key);
    assert.equal(data.hasGoogleBusiness, true);
    // The picked GBP's place_id rides on the intake record (evidence, never edited by the owner).
    assert.equal(evidence.placeId, 'fixture-place-1');
    assert.equal(data.placeId, 'fixture-place-1');
    // Plumber is not a fixed-location type: field service, so no street address is published.
    assert.equal(data.serviceModel, 'field');
    assert.equal(data.streetAddress, undefined);
    for (const dropped of ['ownerName', 'idealClientFear', 'yearsInField', 'guarantee', 'contactMethod']) {
      assert.equal(dropped in data, false, dropped);
    }
  });

  it('a fixed-location business keeps its street address', () => {
    const card: IntakeCard = { ...intakeFromSeed(fullSeed()).card, serviceModel: 'location', streetAddress: '1 Synthetic St' };
    assert.equal(buildIntakeCollectedData(card, {}, answers).streetAddress, '1 Synthetic St');
  });

  it('splits services on commas, semicolons and line breaks only, de-duplicated', () => {
    assert.deepEqual(splitServiceList(' a , b;c\n\nA ,  d  e '), ['a', 'b', 'c', 'd e']);
    assert.deepEqual(splitServiceList(undefined), []);
  });

  it('validates the start URL pair before any pre-fill request', () => {
    assert.equal(isPrefillRequest(AUDIT, 'ChIJ_synthetic-1'), true);
    assert.equal(isPrefillRequest(AUDIT, null), false);
    assert.equal(isPrefillRequest('nope', 'ChIJ_synthetic-1'), false);
    assert.equal(isPrefillRequest(AUDIT, '../../x'), false);
  });
});

describe('startIntake: the 3 answers close the truth gaps research used to stop on', () => {
  const truthGates = (card: IntakeCard) => compileBusinessTruthModel(
    buildSiteResearchInput('checkout:synthetic', buildIntakeCollectedData(card, {}, answers), () => new Date('2026-11-09T00:00:00Z')).businessTruth,
  ).humanGates.map(gate => gate.kind);

  it('no missing_serviceability / missing_priority / missing_capability for every service model', () => {
    const base = intakeFromSeed(fullSeed()).card;
    for (const serviceModel of ['field', 'location', 'mixed', 'remote'] as IntakeServiceModel[]) {
      assert.deepEqual(truthGates({ ...base, serviceModel }), [], serviceModel);
    }
  });

  it('the fallback card, once filled, closes them too', () => {
    const card: IntakeCard = { ...emptyIntakeCard(), businessName: 'Synthetic', businessNiche: 'Plumber', phone: '03-555-0100', city: 'Fixture City', serviceModel: 'field' };
    assert.deepEqual(truthGates(card), []);
  });

  it('pre-pay research gates: services and money priorities closed; geography exclusions and service attributes stay open (not invented)', () => {
    const data = buildIntakeCollectedData(intakeFromSeed(fullSeed()).card, {}, answers);
    assert.deepEqual(deriveOpenResearchGates('synthetic', data).map(gate => gate.type), ['service_attributes', 'geography']);
  });
});

describe('startIntake: hours bidi isolates (display only)', () => {
  const LRI = String.fromCharCode(0x2066);
  const PDI = String.fromCharCode(0x2069);
  const EN_DASH = String.fromCharCode(0x2013);
  const ISOLATES = /[\u2066-\u2069]/;

  it('wraps every time range (en dash or hyphen) in LRI/PDI, idempotently', () => {
    const display = `X 08:00${EN_DASH}18:00, Y 08:00-13:00`;
    const isolated = isolateTimeRanges(display);
    assert.equal(isolated, `X ${LRI}08:00${EN_DASH}18:00${PDI}, Y ${LRI}08:00-13:00${PDI}`);
    assert.equal(isolateTimeRanges(isolated), isolated);
    assert.equal(stripBidiIsolates(isolated), display);
    assert.equal(isolateTimeRanges('no hours here'), 'no hours here');
  });

  it('the stored collectedData never carries an isolate, even if one reached the card', () => {
    const { card } = intakeFromSeed(fullSeed());
    const edited: IntakeCard = { ...card, businessHours: isolateTimeRanges(`X 09:00${EN_DASH}17:00`), businessName: `${LRI}Synthetic${PDI}` };
    const data = buildIntakeCollectedData(edited, {}, answers);
    assert.equal(data.businessHours, `X 09:00${EN_DASH}17:00`);
    assert.equal(data.businessName, 'Synthetic');
    assert.equal(ISOLATES.test(JSON.stringify(data)), false);
  });
});

describe('startIntake: street address carry rule', () => {
  it('location and mixed businesses carry the card street address (LocalBusiness schema); field and remote do not publish it', () => {
    const base: IntakeCard = { ...intakeFromSeed(fullSeed()).card, streetAddress: '1 Synthetic St' };
    for (const serviceModel of ['location', 'mixed'] as IntakeServiceModel[]) {
      assert.equal(buildIntakeCollectedData({ ...base, serviceModel }, {}, answers).streetAddress, '1 Synthetic St', serviceModel);
    }
    for (const serviceModel of ['field', 'remote'] as IntakeServiceModel[]) {
      assert.equal(buildIntakeCollectedData({ ...base, serviceModel }, {}, answers).streetAddress, undefined, serviceModel);
    }
  });

  it('a model chosen at Q2 (no pre-fill) carries the address the owner typed', () => {
    const card: IntakeCard = { ...emptyIntakeCard(), businessName: 'S', businessNiche: 'Clinic', phone: '03-555-0100', city: 'Fixture City', streetAddress: '2 Synthetic St' };
    assert.equal(buildIntakeCollectedData({ ...card, serviceModel: 'location' }, {}, answers).streetAddress, '2 Synthetic St');
  });
});
