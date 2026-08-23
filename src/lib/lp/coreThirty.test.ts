import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoreThirtyNodes, deriveLocationType } from './coreThirty';
import type { CollectedData } from '../bot/prompts';

test('empty secondaryServices -> []', () => {
  const data: CollectedData = {
    businessNiche: undefined,
    secondaryServices: '',
    specificCities: 'עיר-א, עיר-ב',
  };
  assert.deepEqual(buildCoreThirtyNodes(data), []);
});

test('empty specificCities -> []', () => {
  const data: CollectedData = {
    secondaryServices: 'שירות-א, שירות-ב',
    specificCities: '',
  };
  assert.deepEqual(buildCoreThirtyNodes(data), []);
});

test('missing both services and cities -> []', () => {
  const data: CollectedData = {};
  assert.deepEqual(buildCoreThirtyNodes(data), []);
});

test('businessNiche prepended as first service when not already present', () => {
  const data: CollectedData = {
    businessNiche: 'שירות-אב',
    secondaryServices: 'שירות-ב, שירות-ג',
    specificCities: 'עיר-א',
  };
  const nodes = buildCoreThirtyNodes(data);
  assert.equal(nodes[0].service, 'שירות-אב');
  assert.equal(nodes.length, 3);
  assert.deepEqual(
    nodes.map((n) => n.service),
    ['שירות-אב', 'שירות-ב', 'שירות-ג']
  );
});

test('businessNiche not duplicated when already present in secondaryServices', () => {
  const data: CollectedData = {
    businessNiche: 'שירות-ב',
    secondaryServices: 'שירות-ב, שירות-ג',
    specificCities: 'עיר-א',
  };
  const nodes = buildCoreThirtyNodes(data);
  const services = nodes.map((n) => n.service);
  assert.equal(services.filter((s) => s === 'שירות-ב').length, 1);
  assert.deepEqual(services, ['שירות-ב', 'שירות-ג']);
});

test('primaryService used as anchor when businessNiche absent', () => {
  const data: CollectedData = {
    primaryService: 'שירות-אב',
    secondaryServices: 'שירות-ב',
    specificCities: 'עיר-א',
  };
  const nodes = buildCoreThirtyNodes(data);
  assert.equal(nodes[0].service, 'שירות-אב');
});

test('deriveLocationType: field -> service-area', () => {
  assert.equal(deriveLocationType('field'), 'service-area');
});

test('deriveLocationType: location -> fixed-location', () => {
  assert.equal(deriveLocationType('location'), 'fixed-location');
});

test('deriveLocationType: event -> hybrid', () => {
  assert.equal(deriveLocationType('event'), 'hybrid');
});

test('deriveLocationType: mixed -> hybrid', () => {
  assert.equal(deriveLocationType('mixed'), 'hybrid');
});

test('deriveLocationType: remote -> service-area', () => {
  assert.equal(deriveLocationType('remote'), 'service-area');
});

test('deriveLocationType: missing -> service-area (does not throw)', () => {
  assert.equal(deriveLocationType(undefined), 'service-area');
});

test('serviceModel propagates uniformly to every node', () => {
  const data: CollectedData = {
    secondaryServices: 'שירות-א, שירות-ב',
    specificCities: 'עיר-א, עיר-ב',
    serviceModel: 'location',
  };
  const nodes = buildCoreThirtyNodes(data);
  assert.ok(nodes.length > 0);
  for (const n of nodes) {
    assert.equal(n.locationType, 'fixed-location');
  }
});

test('round-robin cap: 5 services x 10 cities capped to 30, every service appears in first 5 nodes', () => {
  const services = Array.from({ length: 5 }, (_, i) => `שירות-${i}`);
  const cities = Array.from({ length: 10 }, (_, i) => `עיר-${i}`);
  const data: CollectedData = {
    secondaryServices: services.join(','),
    specificCities: cities.join(','),
  };
  const nodes = buildCoreThirtyNodes(data, { maxNodes: 30 });

  assert.equal(nodes.length, 30);

  const firstFiveServices = new Set(nodes.slice(0, 5).map((n) => n.service));
  assert.equal(firstFiveServices.size, 5);
  for (const s of services) {
    assert.ok(firstFiveServices.has(s), `expected ${s} to appear in first 5 nodes`);
  }

  // Confirm it is NOT all-city-coverage-of-service[0]-first: the second node
  // should be a different service, not service[0] again with city[1].
  assert.notEqual(nodes[1].service, nodes[0].service);
});

test('cross product smaller than maxNodes returns full cross product', () => {
  const data: CollectedData = {
    secondaryServices: 'שירות-א, שירות-ב',
    specificCities: 'עיר-א, עיר-ב',
  };
  const nodes = buildCoreThirtyNodes(data, { maxNodes: 30 });
  assert.equal(nodes.length, 4);
});

test('id format matches svc{N}-city{N} scheme and is stable/reproducible', () => {
  const data: CollectedData = {
    secondaryServices: 'שירות-א, שירות-ב',
    specificCities: 'עיר-א, עיר-ב',
  };
  const nodes1 = buildCoreThirtyNodes(data);
  const nodes2 = buildCoreThirtyNodes(data);

  for (const n of nodes1) {
    assert.match(n.id, /^svc\d+-city\d+$/);
  }
  assert.deepEqual(nodes1, nodes2);

  const bySvcCity = new Map(nodes1.map((n) => [n.id, n]));
  assert.equal(bySvcCity.get('svc0-city0')?.service, 'שירות-א');
  assert.equal(bySvcCity.get('svc0-city0')?.city, 'עיר-א');
  assert.equal(bySvcCity.get('svc1-city1')?.service, 'שירות-ב');
  assert.equal(bySvcCity.get('svc1-city1')?.city, 'עיר-ב');
});
