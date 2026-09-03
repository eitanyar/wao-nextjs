import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAssertEvidence,
  compileCityEvidence,
  compileSemanticEvidenceGraph,
} from './evidenceGraph';

const ownerSource = {
  kind: 'owner' as const,
  sourceId: 'owner-intake-1',
  confidence: 0.95,
};

test('owner-confirmed capabilities become assertable while competitor-only brands remain context-only', () => {
  const graph = compileSemanticEvidenceGraph({
    entities: [
      { name: 'Primary Service', type: 'service', capabilityConfirmed: true, sources: [ownerSource] },
      { name: 'Competitor Brand', type: 'brand', sources: [{
        kind: 'competitor', sourceId: 'serp-competitor-1', sourceUrl: 'https://competitor.test', confidence: 0.9,
      }] },
    ],
  });

  assert.equal(graph.nodes.find(node => node.name === 'Primary Service')?.assertionStatus, 'public_assertable');
  assert.equal(graph.nodes.find(node => node.name === 'Competitor Brand')?.assertionStatus, 'context_only');
  assert.equal(canAssertEvidence(graph.nodes.find(node => node.name === 'Competitor Brand')!), false);
});

test('city evidence fails closed for a city token and permits service-relevant official or Places facts', () => {
  const city = compileCityEvidence({
    city: 'City Alpha',
    sources: [
      { kind: 'serp', sourceId: 'serp-1', confidence: 0.95 },
      { kind: 'official', sourceId: 'official-1', sourceUrl: 'https://city.test/permit', confidence: 0.9, serviceRelevant: true },
      { kind: 'places', sourceId: 'place-1', sourceUrl: 'https://maps.test/place', confidence: 0.9, locationConfirmed: true },
    ],
  });

  assert.equal(city.assertionStatus, 'public_assertable');
  assert.equal(city.provenance.length, 3);
  assert.equal(compileCityEvidence({ city: 'City Alpha', sources: [{ kind: 'serp', sourceId: 'serp-1', confidence: 1 }] }).assertionStatus, 'context_only');
});

test('canonical semantic entities merge provenance and owner-confirmed relationships', () => {
  const graph = compileSemanticEvidenceGraph({
    entities: [
      { name: 'Service Alpha', type: 'service', capabilityConfirmed: true, sources: [ownerSource] },
      { name: ' service alpha ', type: 'service', sources: [{ kind: 'official', sourceId: 'official-1', sourceUrl: 'https://official.test', confidence: 0.8, serviceRelevant: true }] },
      { name: 'Problem Alpha', type: 'problem', sources: [ownerSource] },
    ],
    relationships: [{ from: 'Service Alpha', fromType: 'service', to: 'Problem Alpha', toType: 'problem', kind: 'solves', sources: [ownerSource] }],
  });

  assert.equal(graph.nodes.filter(node => node.type === 'service').length, 1);
  assert.equal(graph.nodes.find(node => node.type === 'service')?.provenance.length, 2);
  assert.deepEqual(graph.relationships, [{
    fromNodeId: 'service:service alpha', toNodeId: 'problem:problem alpha', kind: 'solves', assertionStatus: 'public_assertable', provenance: [ownerSource],
  }]);
});

test('question candidates retain source provenance, relevance, and optional status while near duplicates merge', () => {
  const graph = compileSemanticEvidenceGraph({
    questions: [
      { question: 'How does Service Alpha work?', source: { kind: 'paa', sourceId: 'paa-1', confidence: 0.8 }, clusterRelevance: 0.9 },
      { question: 'How does service alpha work', source: { kind: 'neuronwriter', sourceId: 'neuron-1', confidence: 0.7 }, clusterRelevance: 0.8 },
      { question: 'Can you help with Problem Alpha?', source: { kind: 'sales_objection', sourceId: 'sales-1', confidence: 0.95 }, clusterRelevance: 0.95 },
    ],
  });

  assert.equal(graph.questions.length, 2);
  assert.equal(graph.questions.find(question => question.question === 'How does Service Alpha work?')?.provenance.length, 2);
  assert.ok(graph.questions.every(question => question.status === 'optional'));
});
