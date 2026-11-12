import assert from 'node:assert/strict';
import test from 'node:test';
import { enums } from 'google-ads-api';
import {
  ISRAEL_GEO_TARGET_CONSTANT,
  STOREFRONT_RADIUS_KM,
  buildGeoTargetTypeSetting,
  buildLocationCriteria,
  extractPlaceNames,
  pickSuggestion,
  resolveGeoTargeting,
  suggestionsFromResponse,
  summarizeGeoTargets,
  type GeoSuggestion,
} from './geo-targeting';

// Synthetic Latin localities and geo IDs: the real list is Hebrew (config/market-scanner/areas.json).
const LOCALITIES = [
  { slug: 'haifa', he_name: 'Haifa' },
  { slug: 'tel-aviv', he_name: 'Tel Aviv', he_aliases: ['TLV'] },
  { slug: 'ramat-gan', he_name: 'Ramat Gan' },
];
const GEO: Record<string, GeoSuggestion[]> = {
  Haifa: [{ resourceName: 'geoTargetConstants/1007975', name: 'Haifa', countryCode: 'IL', targetType: 'City', status: 2 }],
  'Tel Aviv': [{ resourceName: 'geoTargetConstants/1007974', name: 'Tel Aviv', countryCode: 'IL', targetType: 'City', status: 'ENABLED' }],
  'Ramat Gan': [{ resourceName: 'geoTargetConstants/1008004', name: 'Ramat Gan', countryCode: 'IL', targetType: 'City' }],
  Galilee: [{ resourceName: 'geoTargetConstants/9000001', name: 'Northern District', countryCode: 'IL', targetType: 'Region' }],
  Nowhere: [{ resourceName: ISRAEL_GEO_TARGET_CONSTANT, name: 'Israel', countryCode: 'IL', targetType: 'Country' }],
};
const calls: string[] = [];
const suggest = async (name: string) => {
  calls.push(name);
  return GEO[name] ?? [];
};

test('field: every named city maps to its own geo target (not Israel), in the owner order', async () => {
  const r = await resolveGeoTargeting({ serviceModel: 'field', specificCities: 'Haifa, TLV\nRamat Gan' }, suggest, LOCALITIES);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.targets.map((t) => (t.kind === 'location' ? t.geoTargetConstant : t.kind)), [
    'geoTargetConstants/1007975', 'geoTargetConstants/1007974', 'geoTargetConstants/1008004',
  ]);
  assert.ok(r.targets.every((t) => t.kind === 'location' && t.geoTargetConstant !== ISRAEL_GEO_TARGET_CONSTANT));
});

test('mixed and an unset model behave like field', async () => {
  for (const serviceModel of ['mixed', undefined] as const) {
    const r = await resolveGeoTargeting({ serviceModel, specificCities: 'Haifa' }, suggest, LOCALITIES);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.targets[0].kind === 'location' && r.targets[0].geoTargetConstant, 'geoTargetConstants/1007975');
  }
});

test('event: named regions resolve (region-level targets are allowed)', async () => {
  const r = await resolveGeoTargeting({ serviceModel: 'event', specificCities: 'Galilee, Haifa' }, suggest, LOCALITIES);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.targets.map((t) => t.kind === 'location' && t.targetType), ['Region', 'City']);
});

test('storefront: a ~10 km radius around the street address, never a lookup', async () => {
  calls.length = 0;
  const r = await resolveGeoTargeting({ serviceModel: 'location', streetAddress: '12 Herzl St', specificCities: 'Haifa' }, suggest, LOCALITIES);
  assert.equal(r.ok, true);
  assert.equal(calls.length, 0);
  if (!r.ok) return;
  assert.equal(r.targets.length, 1);
  const t = r.targets[0];
  assert.equal(t.kind, 'proximity');
  if (t.kind === 'proximity') {
    assert.equal(t.radiusKm, STOREFRONT_RADIUS_KM);
    assert.equal(STOREFRONT_RADIUS_KM, 10);
    assert.equal(t.cityName, 'Haifa');
  }
  const [criterion] = buildLocationCriteria('customers/1/campaigns/2', r.targets) as Array<{ proximity?: unknown }>;
  assert.deepEqual(criterion.proximity, {
    address: { street_address: '12 Herzl St', city_name: 'Haifa', country_code: 'IL' },
    radius: 10,
    radius_units: enums.ProximityRadiusUnits.KILOMETERS,
  });
});

test('storefront without a street address targets the named city, not the country', async () => {
  const r = await resolveGeoTargeting({ serviceModel: 'location', specificCities: 'Haifa' }, suggest, LOCALITIES);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.targets[0].kind === 'location' && r.targets[0].geoTargetConstant, 'geoTargetConstants/1007975');
});

test('remote: Israel, with no lookup', async () => {
  calls.length = 0;
  const r = await resolveGeoTargeting({ serviceModel: 'remote', specificCities: 'Haifa' }, suggest, LOCALITIES);
  assert.equal(calls.length, 0);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.targets.map((t) => t.kind === 'location' && t.geoTargetConstant), [ISRAEL_GEO_TARGET_CONSTANT]);
});

test('BLOCK: a non-remote business with zero matched places is refused (no silent all-of-Israel)', async () => {
  const none = await resolveGeoTargeting({ serviceModel: 'field', specificCities: 'Atlantis' }, suggest, LOCALITIES);
  assert.equal(none.ok, false);
  assert.deepEqual(none.unmatchedNames, ['Atlantis']);

  const countryOnly = await resolveGeoTargeting({ serviceModel: 'field', specificCities: 'Nowhere' }, suggest, LOCALITIES);
  assert.equal(countryOnly.ok, false, 'a country-level suggestion is not a local match');

  const empty = await resolveGeoTargeting({ serviceModel: 'event' }, suggest, LOCALITIES);
  assert.equal(empty.ok, false);

  const failing = await resolveGeoTargeting({ serviceModel: 'field', specificCities: 'Haifa' }, async () => { throw new Error('api down'); }, LOCALITIES);
  assert.equal(failing.ok, false, 'a lookup failure blocks instead of falling back');
});

test('partial match proceeds and records the unmatched names', async () => {
  const r = await resolveGeoTargeting({ serviceModel: 'field', specificCities: 'Haifa, Atlantis' }, suggest, LOCALITIES);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const summary = summarizeGeoTargets(r);
  assert.deepEqual(summary.unmatchedNames, ['Atlantis']);
  assert.equal(summary.positiveGeoTargetType, 'PRESENCE');
  assert.deepEqual(summary.targets, [{ kind: 'location', geoTargetConstant: 'geoTargetConstants/1007975', name: 'Haifa', requestedName: 'Haifa' }]);
});

test('falls back to targetLocation only when specificCities names nothing', async () => {
  const r = await resolveGeoTargeting({ serviceModel: 'field', targetLocation: 'Tel Aviv' }, suggest, LOCALITIES);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.targets[0].kind === 'location' && r.targets[0].geoTargetConstant, 'geoTargetConstants/1007974');
});

test('PRESENCE on every campaign, and location criteria carry no bid modifier', () => {
  assert.deepEqual(buildGeoTargetTypeSetting(), { positive_geo_target_type: enums.PositiveGeoTargetType.PRESENCE });
  const criteria = buildLocationCriteria('customers/1/campaigns/2', [
    { kind: 'location', geoTargetConstant: 'geoTargetConstants/1007975', name: 'Haifa', requestedName: 'Haifa' },
  ]) as Array<Record<string, unknown>>;
  assert.deepEqual(criteria, [{ campaign: 'customers/1/campaigns/2', location: { geo_target_constant: 'geoTargetConstants/1007975' } }]);
  assert.ok(criteria.every((c) => !('bid_modifier' in c)));
});

test('extractPlaceNames: dedupes, keeps unknown pieces, skips radius answers', () => {
  assert.deepEqual(extractPlaceNames('Haifa, haifa, Somewhere New; 20 km', LOCALITIES), ['Haifa', 'Somewhere New']);
  assert.deepEqual(extractPlaceNames(['Tel Aviv', 'TLV'], LOCALITIES), ['Tel Aviv']);
});

test('pickSuggestion skips foreign, removed and country rows; suggestionsFromResponse flattens the API shape', () => {
  assert.equal(pickSuggestion([
    { resourceName: 'geoTargetConstants/1', name: 'x', countryCode: 'US', targetType: 'City' },
    { resourceName: 'geoTargetConstants/2', name: 'y', countryCode: 'IL', targetType: 'City', status: 3 },
    { resourceName: 'geoTargetConstants/3', name: 'z', countryCode: 'IL', targetType: 'City', status: 2 },
  ])?.resourceName, 'geoTargetConstants/3');
  assert.deepEqual(suggestionsFromResponse({ geo_target_constant_suggestions: [{ reach: 5, geo_target_constant: { resource_name: 'geoTargetConstants/7', name: 'n', country_code: 'IL', target_type: 'City', status: 2 } }, {}] }), [
    { resourceName: 'geoTargetConstants/7', name: 'n', canonicalName: undefined, countryCode: 'IL', targetType: 'City', status: 2, reach: 5 },
  ]);
});
