import test from 'node:test';
import assert from 'node:assert/strict';
import { compileBusinessTruthModel, findBusinessTruthGaps } from './businessTruth';

const owner = { sourceId: 'owner-intake-1', capturedAt: '2026-09-02T00:00:00.000Z' };

test('field businesses use owner-confirmed services and deterministic travel serviceability', () => {
  const model = compileBusinessTruthModel({
    businessName: 'Field Service',
    serviceModel: 'field',
    confirmedServices: [{ value: 'Repair Alpha', owner }],
    base: { value: 'Base City', owner },
    travelBoundary: { value: '30 km', owner },
    servedAreas: [{ value: 'City Alpha', owner }, { value: 'City Beta', owner }],
    moneyPriorities: [{ value: 'High Value Repair', owner }],
    researchedTerminology: [{ service: 'Repair Alpha', label: 'Repair Label' }],
  });

  assert.deepEqual(model.confirmedServices.map(service => service.label), ['Repair Label']);
  assert.deepEqual(model.cityPageEligibleAreas, ['City Alpha', 'City Beta']);
  assert.equal(model.serviceability.status, 'verified');
  assert.deepEqual(findBusinessTruthGaps(model), []);
});

test('fixed-location businesses can claim only their verified base', () => {
  const model = compileBusinessTruthModel({
    businessName: 'Fixed Business',
    serviceModel: 'fixed',
    confirmedServices: [{ value: 'Service Alpha', owner }],
    base: { value: 'Base City', owner },
    customerTravel: { value: true, owner },
    servedAreas: [{ value: 'Other City', owner }],
    moneyPriorities: [{ value: 'Priority Alpha', owner }],
  });

  assert.deepEqual(model.cityPageEligibleAreas, ['Base City']);
  assert.equal(model.serviceability.status, 'verified');
});

test('hybrid businesses retain verified fixed and field modes', () => {
  const model = compileBusinessTruthModel({
    businessName: 'Hybrid Business',
    serviceModel: 'hybrid',
    confirmedServices: [{ value: 'Service Alpha', owner }],
    base: { value: 'Base City', owner },
    customerTravel: { value: true, owner },
    travelBoundary: { value: '20 km', owner },
    servedAreas: [{ value: 'Field City', owner }],
    moneyPriorities: [{ value: 'Priority Alpha', owner }],
  });

  assert.deepEqual(model.cityPageEligibleAreas, ['Base City', 'Field City']);
  assert.equal(model.serviceability.status, 'verified');
});

test('remote businesses cannot receive city pages', () => {
  const model = compileBusinessTruthModel({
    businessName: 'Remote Business',
    serviceModel: 'remote',
    confirmedServices: [{ value: 'Service Alpha', owner }],
    moneyPriorities: [{ value: 'Priority Alpha', owner }],
  });

  assert.deepEqual(model.cityPageEligibleAreas, []);
  assert.equal(model.serviceability.status, 'verified');
});

test('excluded owner services override researched service suggestions', () => {
  const model = compileBusinessTruthModel({
    businessName: 'Excluded Service Business',
    serviceModel: 'remote',
    confirmedServices: [{ value: 'Service Alpha', owner }],
    excludedServices: [{ value: 'Service Beta', owner }],
    moneyPriorities: [{ value: 'Priority Alpha', owner }],
    researchedTerminology: [
      { service: 'Service Alpha', label: 'Approved Label' },
      { service: 'Service Beta', label: 'Suggested Only Label' },
    ],
    gbp: { services: ['Service Beta'] },
  });

  assert.deepEqual(model.confirmedServices.map(service => service.value), ['Service Alpha']);
  assert.deepEqual(model.gbp.services, []);
  assert.ok(model.humanGates.some(gate => gate.kind === 'category_conflict'));
});

test('unknown capability, serviceability, and priority create human gates', () => {
  const model = compileBusinessTruthModel({
    businessName: 'Incomplete Business',
    serviceModel: 'field',
  });

  assert.deepEqual(findBusinessTruthGaps(model).map(gate => gate.kind), [
    'missing_capability',
    'missing_serviceability',
    'missing_priority',
  ]);
});
