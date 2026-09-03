import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildResearchGateAnswer,
  researchGateCopyKey,
} from './gatePresentation';
import type { CollectedData } from '../../bot/prompts';
import type { ResearchGateType } from './gates';

const cases: Array<[ResearchGateType, string]> = [
  ['business_boundary', 'gate_business_boundary'],
  ['service_attributes', 'gate_service_attributes'],
  ['geography', 'gate_geography'],
  ['money_services', 'gate_money_services'],
  ['ambiguous_intent', 'gate_ambiguous_intent'],
];

test('researchGateCopyKey maps every gate type to generated copy', () => {
  for (const [type, key] of cases) {
    assert.equal(researchGateCopyKey(type), key);
  }
});

test('buildResearchGateAnswer normalizes every gate type without mutating source data', () => {
  const collectedData: CollectedData = { primaryService: 'Service Alpha', priorityServices: ['Existing'] };
  const initial = structuredClone(collectedData);

  assert.deepEqual(buildResearchGateAnswer('business_boundary', ' One, Two ', collectedData), { services: ['One', 'Two'] });
  assert.deepEqual(buildResearchGateAnswer('service_attributes', ' Attribute ', collectedData), { serviceAttributes: { 'Service Alpha': 'Attribute' } });
  assert.deepEqual(buildResearchGateAnswer('geography', ' Area Alpha ', collectedData), { travelBoundary: 'Area Alpha', geographicExclusions: [] });
  assert.deepEqual(buildResearchGateAnswer('money_services', ' One, Two ', collectedData), { priorityServices: ['One', 'Two'] });
  assert.equal(buildResearchGateAnswer('ambiguous_intent', ' Split these ', collectedData), 'Split these');
  assert.deepEqual(collectedData, initial);
});

test('buildResearchGateAnswer rejects whitespace-only answers for every gate type', () => {
  for (const [type] of cases) {
    assert.equal(buildResearchGateAnswer(type, ' \n\t ', {}), null);
  }
});
