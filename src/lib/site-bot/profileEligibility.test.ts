// Trade scope + per-business eligibility, built from REAL Places responses recorded 2026-11-25
// (src/lib/site-bot/fixtures/places-trade-scope-2026-11-25.json; names and place ids removed).
// HEBREW-SAFETY: zero Hebrew bytes; display names are read from the fixture / taxonomy at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import type { EligibilityCandidate } from './eligibility';
import { launchCategoryNameIndex, normalizeCategoryName, profileEligibility, tradeScope } from './profileEligibility';

interface RecordedResponse {
  probe: string;
  queriedCategory: string;
  placeId: string;
  primaryType?: string;
  types: string[];
  primaryTypeDisplayName?: { he: string; en: string };
  businessStatus?: string;
  hasWebsite: boolean;
  userRatingCount: number;
}

const fixture = JSON.parse(fs.readFileSync(
  path.join(process.cwd(), 'src/lib/site-bot/fixtures/places-trade-scope-2026-11-25.json'), 'utf8')) as { responses: RecordedResponse[] };
const responses = fixture.responses;
const byId = (placeId: string) => {
  const found = responses.find(response => response.placeId === placeId);
  assert.ok(found, placeId);
  return found;
};

/** The audit snapshot fields, as audit-lookup stores them (he display name; website / ratings forced to "eligible"). */
function candidate(response: RecordedResponse, over: Partial<EligibilityCandidate> = {}): EligibilityCandidate {
  return {
    hasWebsite: false,
    types: response.types,
    ...(response.primaryType ? { primaryType: response.primaryType } : {}),
    ...(response.primaryTypeDisplayName ? { primaryTypeDisplayName: response.primaryTypeDisplayName.he } : {}),
    businessStatus: 'OPERATIONAL',
    hasRating: true,
    userRatingCount: 7,
    ...over,
  };
}

const IN_SCOPE_PROBES = new Set(['ac_tech', 'ac_tech2', 'handyman', 'gardener', 'cleaner', 'house_cleaning', 'tutor',
  'photographer', 'pest_control', 'mover', 'plumber', 'electrician']);
const OUT_OF_SCOPE_PROBES = new Set(['restaurant', 'hair_salon', 'dentist']);

test('the fixture is the recorded evidence: every in-scope probe and the out-of-scope controls are present', () => {
  for (const probe of [...IN_SCOPE_PROBES, ...OUT_OF_SCOPE_PROBES]) {
    assert.ok(responses.some(response => response.probe === probe), probe);
  }
  for (const response of responses) {
    assert.match(response.placeId, /^fixture-\d{2}$/, 'place ids are anonymised');
    assert.equal(Object.hasOwn(response, 'displayName'), false, 'business names are removed');
  }
});

test('no recorded in-scope trade lands in the trade block (the bug: AC tech / cleaner / tutor were not_eligible_trade)', () => {
  for (const response of responses.filter(r => IN_SCOPE_PROBES.has(r.probe))) {
    assert.notEqual(tradeScope(candidate(response)).scope, 'out_of_scope', `${response.placeId} ${response.probe}`);
    assert.equal(profileEligibility(candidate(response)), 'eligible', `${response.placeId} ${response.probe}`);
  }
});

test('branch 1, in scope by primaryType: plumber, electrician, mover, general contractor (gardener / handyman)', () => {
  assert.deepEqual(tradeScope(candidate(byId('fixture-18'))), { scope: 'in_scope', categoryId: 'gcid:plumber', via: 'primary_type' });
  assert.deepEqual(tradeScope(candidate(byId('fixture-19'))), { scope: 'in_scope', categoryId: 'gcid:electrician', via: 'primary_type' });
  assert.deepEqual(tradeScope(candidate(byId('fixture-16'))), { scope: 'in_scope', categoryId: 'gcid:moving_company', via: 'primary_type' });
  assert.deepEqual(tradeScope(candidate(byId('fixture-06'))), { scope: 'in_scope', categoryId: 'gcid:general_contractor', via: 'primary_type' });
});

test('branch 2, explicitly out of scope: a taxonomy category off the launch list is the ONLY trade block', () => {
  for (const response of responses.filter(r => OUT_OF_SCOPE_PROBES.has(r.probe))) {
    const scope = tradeScope(candidate(response));
    assert.equal(scope.scope, 'out_of_scope', `${response.placeId} ${response.probe}`);
    assert.equal(profileEligibility(candidate(response)), 'trade', response.placeId);
  }
  // The block list is keyed by the raw Places primaryType: a block carries a `places:<type>` id, never a gcid.
  assert.deepEqual(tradeScope(candidate(byId('fixture-35'))), { scope: 'out_of_scope', categoryId: 'places:dental_clinic', via: 'primary_type' });
  assert.deepEqual(tradeScope(candidate(byId('fixture-30'))), { scope: 'out_of_scope', categoryId: 'places:restaurant', via: 'primary_type' });
  assert.deepEqual(tradeScope(candidate(byId('fixture-32'))), { scope: 'out_of_scope', categoryId: 'places:hair_salon', via: 'primary_type' });
  assert.deepEqual(tradeScope(candidate(byId('fixture-37'))), { scope: 'out_of_scope', categoryId: 'places:dentist', via: 'primary_type' });
  // The website check still runs first: every recorded control has a site.
  assert.equal(profileEligibility(candidate(byId('fixture-30'), { hasWebsite: true })), 'has_site');
});

test('branch 3a, generic primaryType: the display name is matched against the launch names', () => {
  // Real plumber response with its type stripped to the generic one the AC techs got: Google's he display name still
  // matches the plumber entry (heName / synonyms) of the launch list.
  const plumber = byId('fixture-18');
  const generic = candidate(plumber, { primaryType: 'service', types: ['point_of_interest', 'service', 'establishment'] });
  assert.deepEqual(tradeScope(generic), { scope: 'in_scope', categoryId: 'gcid:plumber', via: 'display_name' });
  assert.deepEqual(tradeScope({ ...generic, primaryTypeDisplayName: plumber.primaryTypeDisplayName!.en }),
    { scope: 'in_scope', categoryId: 'gcid:plumber', via: 'display_name' });
  // The match is exact: Google's mover display name is not one of the taxonomy's mover names, so a mover with its type
  // stripped falls through to unknown -> still eligible (never blocked).
  const movers = candidate(byId('fixture-17'), { primaryType: undefined, types: [] });
  assert.equal(tradeScope(movers).scope, 'unknown');
  assert.equal(profileEligibility(movers), 'eligible');
  // The generic display names Places returned ("Services", "Store") match no launch name.
  for (const placeId of ['fixture-02', 'fixture-14']) {
    const response = byId(placeId);
    assert.equal(launchCategoryNameIndex().has(normalizeCategoryName(response.primaryTypeDisplayName!.he)), false, placeId);
    assert.equal(launchCategoryNameIndex().has(normalizeCategoryName(response.primaryTypeDisplayName!.en)), false, placeId);
  }
});

test('branch 3b, generic primaryType: a launch trade among the types puts the business in scope', () => {
  assert.deepEqual(tradeScope(candidate(byId('fixture-20'))), { scope: 'in_scope', categoryId: 'gcid:locksmith', via: 'types' });
  assert.deepEqual(tradeScope(candidate(byId('fixture-04'))), { scope: 'in_scope', categoryId: 'gcid:general_contractor', via: 'types' });
});

test('branch 4, still unknown -> eligible: AC tech as "service", tutor as educational_institution or no type at all', () => {
  for (const placeId of ['fixture-02', 'fixture-03', 'fixture-07', 'fixture-11', 'fixture-12', 'fixture-13', 'fixture-14',
    'fixture-15', 'fixture-27']) {
    const response = byId(placeId);
    assert.deepEqual(tradeScope(candidate(response)), { scope: 'unknown', categoryId: null, via: null }, `${placeId} ${response.probe}`);
    assert.equal(profileEligibility(candidate(response)), 'eligible', placeId);
  }
  // Secondary types never block: a photographer whose types list two out-of-scope stores is still unknown, not out.
  assert.equal(tradeScope(candidate(byId('fixture-28'))).scope, 'unknown');
  // A street (route) result: unknown trade; with no ratings and no status it is the profile block, not the trade block.
  const route = byId('fixture-25');
  assert.equal(tradeScope(candidate(route)).scope, 'unknown');
  assert.equal(profileEligibility(candidate(route, { businessStatus: undefined, hasRating: false, userRatingCount: 0 })), 'profile');
});

test('the 2026-11-25 launch additions are in scope by type', () => {
  for (const type of ['cleaner', 'deck_builder', 'metal_fabricator', 'kitchen_remodeler', 'landscape_designer',
    'swimming_pool_contractor', 'solar_energy_equipment_supplier']) {
    assert.equal(tradeScope({ primaryType: type, types: [type] }).scope, 'in_scope', type);
  }
});

test('the profile checks still apply after the trade check', () => {
  const ac = byId('fixture-02');
  assert.equal(profileEligibility(candidate(ac, { businessStatus: 'CLOSED_TEMPORARILY' })), 'profile');
  assert.equal(profileEligibility(candidate(ac, { userRatingCount: 0 })), 'profile');
  assert.equal(profileEligibility(candidate(ac, { hasWebsite: true })), 'has_site');
});

// Yonatan's Places primaryType block list (docs/reviews/site-bot-places-type-block-list-yonatan-2026-11-25.md).
test('block list: one decision per recorded fixture probe (every response of the probe agrees)', () => {
  const expected: Record<string, ReadonlyArray<'in_scope' | 'unknown'> | 'out_of_scope'> = {
    ac_tech: ['in_scope', 'unknown'], ac_tech2: ['in_scope', 'unknown'], handyman: ['in_scope'], gardener: ['in_scope'],
    cleaner: ['unknown'], house_cleaning: ['unknown'], tutor: ['unknown'], photographer: ['unknown'], pest_control: ['unknown'],
    mover: ['in_scope'], plumber: ['in_scope'], electrician: ['in_scope'], noise_route: ['unknown'],
    restaurant: 'out_of_scope', hair_salon: 'out_of_scope', dentist: 'out_of_scope',
  };
  const probes = [...new Set(responses.map(response => response.probe))].sort();
  assert.deepEqual(probes, Object.keys(expected).sort(), 'every fixture probe has a decision');
  for (const probe of probes) {
    const want = expected[probe];
    for (const response of responses.filter(r => r.probe === probe)) {
      const scope = tradeScope(candidate(response));
      const label = `${probe} ${response.placeId}`;
      if (want === 'out_of_scope') {
        assert.equal(scope.scope, 'out_of_scope', label);
        assert.equal(scope.categoryId, `places:${response.primaryType}`, label);
        assert.equal(profileEligibility(candidate(response)), 'trade', label);
      } else {
        assert.ok(want.includes(scope.scope as 'in_scope' | 'unknown'), `${label} got ${scope.scope}`);
        assert.equal(profileEligibility(candidate(response)), 'eligible', label);
      }
    }
  }
});

test('block list: laundry as primaryType passes (cleaners carry it); beauty_salon as primaryType is the trade block', () => {
  assert.notEqual(tradeScope({ primaryType: 'laundry', types: ['laundry'] }).scope, 'out_of_scope');
  assert.equal(profileEligibility({ hasWebsite: false, primaryType: 'laundry', types: ['laundry'], businessStatus: 'OPERATIONAL', hasRating: true, userRatingCount: 5 }), 'eligible');
  assert.deepEqual(tradeScope({ primaryType: 'beauty_salon', types: ['beauty_salon'] }), { scope: 'out_of_scope', categoryId: 'places:beauty_salon', via: 'primary_type' });
  assert.equal(profileEligibility({ hasWebsite: false, primaryType: 'beauty_salon', types: ['beauty_salon'], businessStatus: 'OPERATIONAL', hasRating: true, userRatingCount: 5 }), 'trade');
});

test('block list: a blocked primaryType is never rescued by the display name or a launch trade among the types', () => {
  // A hair salon whose types list a plumber and whose display name is the plumber's English name: still blocked.
  const plumber = byId('fixture-18');
  const rescued = { primaryType: 'hair_salon', types: ['plumber', 'hair_salon'], primaryTypeDisplayName: plumber.primaryTypeDisplayName!.en };
  assert.deepEqual(tradeScope(rescued), { scope: 'out_of_scope', categoryId: 'places:hair_salon', via: 'primary_type' });
});

test('block list: secondary types never block; an unlisted taxonomy type passes; general_contractor always passes', () => {
  assert.notEqual(tradeScope({ primaryType: 'service', types: ['restaurant', 'beauty_salon', 'dentist'] }).scope, 'out_of_scope');
  // Before the block list, any taxonomy category off the launch list blocked; now only a listed primaryType does.
  for (const type of ['hardware_store', 'electronics_store', 'storage', 'manufacturer', 'art_studio', 'educational_institution', 'some_new_google_type']) {
    assert.notEqual(tradeScope({ primaryType: type, types: [type] }).scope, 'out_of_scope', type);
  }
  assert.deepEqual(tradeScope({ primaryType: 'general_contractor', types: ['general_contractor'] }),
    { scope: 'in_scope', categoryId: 'gcid:general_contractor', via: 'primary_type' });
});
