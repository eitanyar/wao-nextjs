import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  isLaunchTrade, LAUNCH_TRADE_CATEGORIES, launchTradeGroup, PLACES_TYPE_ALIASES, primaryCategoryId, toGbpCategoryId,
} from './launchTrades';

const taxonomy = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/gbp-categories-il.json'), 'utf8')) as Array<{ categoryId: string }>;
const known = new Set(taxonomy.map(category => category.categoryId));

test('every allow-listed id is a real category in the GBP taxonomy (no typos, no invented ids)', () => {
  for (const id of Object.keys(LAUNCH_TRADE_CATEGORIES)) assert.ok(known.has(id), id);
  for (const id of Object.values(PLACES_TYPE_ALIASES)) assert.ok(known.has(id), id);
});

test('launch scope = field trades (plumber, electrician class), in-home tutor, photographer', () => {
  for (const id of ['gcid:plumber', 'gcid:electrician', 'gcid:locksmith', 'gcid:hvac_contractor', 'gcid:painter', 'gcid:handyman']) {
    assert.equal(launchTradeGroup(id), 'field_trade', id);
  }
  // Added on seo-strategist sign-off 2026-11-25.
  for (const id of ['gcid:cleaner', 'gcid:deck_builder', 'gcid:metal_fabricator', 'gcid:kitchen_remodeler',
    'gcid:landscape_designer', 'gcid:swimming_pool_contractor', 'gcid:solar_energy_equipment_supplier']) {
    assert.equal(launchTradeGroup(id), 'field_trade', id);
  }
  assert.equal(Object.keys(LAUNCH_TRADE_CATEGORIES).length, 50);
  assert.equal(launchTradeGroup('gcid:tutoring_service'), 'in_home_tutor');
  assert.equal(launchTradeGroup('gcid:photographer'), 'photographer');
  const groups = new Set(Object.values(LAUNCH_TRADE_CATEGORIES));
  assert.deepEqual([...groups].sort(), ['field_trade', 'in_home_tutor', 'photographer']);
});

test('storefronts, clinics, offices, schools and online-only services are outside launch scope', () => {
  for (const id of ['gcid:restaurant', 'gcid:hair_salon', 'gcid:dentist', 'gcid:lawyer', 'gcid:accountant', 'gcid:gym',
    'gcid:auto_repair_shop', 'gcid:clothing_store', 'gcid:language_school', 'gcid:music_school', 'gcid:website_designer',
    'gcid:marketing_agency', 'gcid:commercial_photographer', 'gcid:hotel']) {
    assert.equal(isLaunchTrade(id), false, id);
  }
  for (const value of [null, undefined, '', 'plumber', 'gcid:constructor', 'gcid:__proto__', 'gcid:toString']) {
    assert.equal(isLaunchTrade(value as string | null | undefined), false, String(value));
  }
});

test('Places type ids map to gcids (aliases for the ids that differ); malformed input is null', () => {
  assert.equal(toGbpCategoryId('plumber'), 'gcid:plumber');
  assert.equal(toGbpCategoryId('gcid:electrician'), 'gcid:electrician');
  assert.equal(toGbpCategoryId(' Plumber '), 'gcid:plumber');
  assert.equal(toGbpCategoryId('roofing_contractor'), 'gcid:roofer');
  assert.equal(toGbpCategoryId('dental_clinic'), 'gcid:dentist');
  for (const bad of ['', 'a', 'plumber; drop', '../x', 'gcid:', 'x'.repeat(90), null, undefined]) {
    assert.equal(toGbpCategoryId(bad as string | null | undefined), null, String(bad));
  }
});

test('the primary category is primaryType, else the first non-generic type (older audit records)', () => {
  assert.equal(primaryCategoryId({ primaryType: 'electrician', types: ['plumber'] }), 'gcid:electrician');
  assert.equal(primaryCategoryId({ types: ['point_of_interest', 'establishment', 'plumber'] }), 'gcid:plumber');
  assert.equal(primaryCategoryId({ types: ['store', 'point_of_interest'] }), null);
  assert.equal(primaryCategoryId({ types: [] }), null);
  assert.equal(primaryCategoryId({ primaryType: '!!', types: ['locksmith'] }), 'gcid:locksmith');
});
