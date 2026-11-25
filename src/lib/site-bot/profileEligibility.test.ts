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
  // dental_clinic is the Places id of gcid:dentist (PLACES_TYPE_ALIASES).
  assert.deepEqual(tradeScope(candidate(byId('fixture-35'))), { scope: 'out_of_scope', categoryId: 'gcid:dentist', via: 'primary_type' });
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
