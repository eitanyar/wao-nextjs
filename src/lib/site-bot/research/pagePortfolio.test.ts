import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInternalLinkGraph,
  buildPageOpportunityPortfolio,
  scorePageOpportunity,
  selectMoneyPages,
  type PageOpportunityCandidate,
  type PagePortfolioDossier,
} from './pagePortfolio';

const service = (id: string, overrides: Partial<PageOpportunityCandidate> = {}): PageOpportunityCandidate => ({
  id,
  kind: 'money_service',
  serviceId: id,
  targetPath: `/services/${id}`,
  intent: 'commercial',
  ownerPriority: 5,
  businessValue: 8,
  capability: 8,
  demand: 7,
  serpOpportunity: 7,
  graphContribution: 6,
  expertise: 7,
  localFacts: 7,
  cannibalizationRisk: 1,
  doorwayScaledRisk: 1,
  maintenanceCost: 2,
  confidence: 8,
  ...overrides,
});

const dossier = (overrides: Partial<PagePortfolioDossier> = {}): PagePortfolioDossier => ({
  serviceModel: 'field',
  candidates: [
    service('alpha'),
    service('beta', { ownerPriority: 4 }),
    service('gamma', { ownerPriority: 3 }),
    service('delta', { ownerPriority: 2 }),
    service('epsilon', { ownerPriority: 1 }),
  ],
  ...overrides,
});

test('scorePageOpportunity exposes positive and risk components without a universal content threshold', () => {
  const scored = scorePageOpportunity(service('alpha'));

  assert.equal(scored.components.businessValue, 8);
  assert.equal(scored.components.cannibalization, -1);
  assert.equal(scored.components.doorwayScaledRisk, -1);
  assert.ok(scored.score > 0);
});

test('selectMoneyPages supports every service model and selects three to four evidence-backed services', () => {
  for (const serviceModel of ['field', 'location', 'event', 'mixed', 'remote'] as const) {
    const result = selectMoneyPages(dossier({ serviceModel }));
    assert.equal(result.gates.length, 0);
    assert.equal(result.pages.length, 4);
    assert.deepEqual(result.pages.map(page => page.id), ['alpha', 'beta', 'gamma', 'delta']);
  }
});

test('selectMoneyPages creates Gate C when owner priority is missing or materially conflicts with evidence', () => {
  const missing = selectMoneyPages(dossier({ candidates: [service('alpha', { ownerPriority: undefined })] }));
  const conflicting = selectMoneyPages(dossier({ candidates: [
    service('alpha', { ownerPriority: 10, businessValue: 1, capability: 1, demand: 1, serpOpportunity: 1, expertise: 1, localFacts: 1, confidence: 1 }),
    service('beta', { ownerPriority: 1 }),
  ] }));

  assert.equal(missing.gates[0]?.id, 'gate-c-owner-priority');
  assert.equal(conflicting.gates[0]?.id, 'gate-c-owner-priority');
});

test('buildPageOpportunityPortfolio treats thirty as a ceiling and sends excess eligible candidates to backlog', () => {
  const candidates = Array.from({ length: 35 }, (_, index) => service(`svc-${index}`, { ownerPriority: 35 - index }));
  const portfolio = buildPageOpportunityPortfolio(dossier({ candidates, maxIndexedPages: 30 }));

  assert.ok(portfolio.indexed.length < 30);
  assert.ok(portfolio.backlog.length > 0);
  assert.ok(portfolio.indexed.length + portfolio.backlog.length <= candidates.length + 2);
});

test('buildPageOpportunityPortfolio rejects city candidates without serviceability, distinct intent, or assertable local evidence', () => {
  const candidates = [
    service('alpha'),
    service('city-no-serviceability', { kind: 'qualified_service_area', areaId: 'city-a', targetPath: '/services/alpha/city-a', serviceability: false, distinctIntent: true, assertableLocalEvidence: true }),
    service('city-no-intent', { kind: 'qualified_service_area', areaId: 'city-b', targetPath: '/services/alpha/city-b', serviceability: true, distinctIntent: false, assertableLocalEvidence: true }),
    service('city-no-facts', { kind: 'qualified_service_area', areaId: 'city-c', targetPath: '/services/alpha/city-c', serviceability: true, distinctIntent: true, assertableLocalEvidence: false }),
  ];
  const portfolio = buildPageOpportunityPortfolio(dossier({ candidates }));

  assert.equal(portfolio.rejected.length, 3);
  assert.deepEqual(portfolio.rejected.map(page => page.rejectionReasons.length), [1, 1, 1]);
});

test('buildPageOpportunityPortfolio rejects cannibalizing and doorway-scaled candidates instead of creating a raw cross-product', () => {
  const portfolio = buildPageOpportunityPortfolio(dossier({ candidates: [
    service('alpha'),
    service('duplicate', { targetPath: '/services/alpha', cannibalizationRisk: 9 }),
    service('scaled-city', { kind: 'qualified_service_area', areaId: 'city-a', targetPath: '/services/alpha/city-a', serviceability: true, distinctIntent: true, assertableLocalEvidence: true, doorwayScaledRisk: 9 }),
  ] }));

  assert.equal(portfolio.rejected.length, 2);
  assert.ok(portfolio.rejected.every(page => page.rejectionReasons.length > 0));
});

test('buildPageOpportunityPortfolio holds ambiguous candidates and preserves their rationale', () => {
  const portfolio = buildPageOpportunityPortfolio(dossier({ candidates: [
    service('alpha'),
    service('ambiguous', { ambiguityReasons: ['serp evidence is mixed'] }),
  ] }));

  assert.equal(portfolio.gates.length, 1);
  assert.equal(portfolio.gates[0]?.id, 'gate-c-ambiguous');
  assert.equal(portfolio.held[0]?.id, 'ambiguous');
});

test('buildInternalLinkGraph makes every selected page reachable without indiscriminate city links', () => {
  const portfolio = buildPageOpportunityPortfolio(dossier({ candidates: [
    service('alpha'),
    service('beta'),
    service('alpha-city', { kind: 'qualified_service_area', areaId: 'city-a', targetPath: '/services/alpha/city-a', serviceability: true, distinctIntent: true, assertableLocalEvidence: true }),
    service('beta-city', { kind: 'qualified_service_area', areaId: 'city-b', targetPath: '/services/beta/city-b', serviceability: true, distinctIntent: true, assertableLocalEvidence: true }),
  ] }));
  const graph = buildInternalLinkGraph(portfolio);

  assert.equal(graph.orphans.length, 0);
  assert.ok(graph.required.every(edge => edge.fromId !== edge.toId));
  assert.equal(graph.required.filter(edge => edge.relationship === 'area_peer').length, 0);
});
