/**
 * Unit tests for GBP Category ID Taxonomy & Resolution Engine (spec 2026-08-26_001).
 *
 * HEBREW-SAFETY: this module contains ZERO raw Hebrew characters.
 * All test strings are ASCII, loaded dynamically from the taxonomy dataset, or Unicode escaped.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAllCategories,
  getCategoryById,
  suggestSecondaryCategories,
  resolveGbpCategory,
  formatGbpCategoryPatch,
} from './categoryTaxonomy';

test('taxonomy dataset integrity: 150+ categories with valid structure and cross-references', () => {
  const all = getAllCategories();
  assert.ok(all.length >= 150, `Expected >= 150 categories, found ${all.length}`);

  const idSet = new Set(all.map((c) => c.categoryId));
  assert.equal(idSet.size, all.length, 'All categoryId values must be unique');

  for (const cat of all) {
    assert.ok(cat.categoryId.startsWith('gcid:'), `Invalid categoryId: ${cat.categoryId}`);
    assert.ok(cat.primaryType.length > 0, `Missing primaryType in ${cat.categoryId}`);
    assert.ok(cat.enName.length > 0, `Missing enName in ${cat.categoryId}`);
    assert.ok(cat.heName.length > 0, `Missing heName in ${cat.categoryId}`);
    assert.ok(Array.isArray(cat.synonyms), `Synonyms must be an array in ${cat.categoryId}`);
    assert.ok(Array.isArray(cat.relatedCategoryIds), `Related IDs must be an array in ${cat.categoryId}`);

    for (const relId of cat.relatedCategoryIds) {
      assert.ok(
        idSet.has(relId),
        `relatedCategoryId "${relId}" in "${cat.categoryId}" does not exist in dataset`
      );
      assert.notEqual(
        relId,
        cat.categoryId,
        `Self-referential relation in category "${cat.categoryId}"`
      );
    }
  }
});

test('resolveGbpCategory: resolves exact categoryId', () => {
  const res = resolveGbpCategory('gcid:plumber');
  assert.equal(res.confidence, 'exact_id');
  assert.ok(res.matched !== null);
  assert.equal(res.matched?.categoryId, 'gcid:plumber');
  assert.equal(res.matched?.primaryType, 'plumber');
  assert.ok(res.suggestedSecondaries.length > 0);
  assert.ok(res.suggestedSecondaries.length <= 9);
});

test('resolveGbpCategory: resolves exact primaryType', () => {
  const res = resolveGbpCategory('electrician');
  assert.equal(res.confidence, 'exact_type');
  assert.ok(res.matched !== null);
  assert.equal(res.matched?.categoryId, 'gcid:electrician');
  assert.equal(res.matched?.primaryType, 'electrician');
});

test('resolveGbpCategory: resolves English name (case-insensitive) when distinct from primaryType', () => {
  const res = resolveGbpCategory('Cleaning Service');
  assert.equal(res.confidence, 'exact_name');
  assert.ok(res.matched !== null);
  assert.equal(res.matched?.categoryId, 'gcid:cleaner');
});

test('resolveGbpCategory: resolves Hebrew name and synonyms from dataset', () => {
  const plumber = getCategoryById('gcid:plumber');
  assert.ok(plumber, 'Plumber category must exist in taxonomy');

  // Test Hebrew exact name
  const resHeName = resolveGbpCategory(plumber.heName);
  assert.equal(resHeName.confidence, 'exact_name');
  assert.equal(resHeName.matched?.categoryId, 'gcid:plumber');

  // Test Hebrew synonym
  assert.ok(plumber.synonyms.length > 0, 'Plumber should have synonyms');
  const firstSyn = plumber.synonyms[0];
  const resSyn = resolveGbpCategory(firstSyn);
  assert.equal(resSyn.confidence, 'synonym');
  assert.equal(resSyn.matched?.categoryId, 'gcid:plumber');
});

test('resolveGbpCategory: handles Hebrew prefix stripping (e.g. He/Bet/Lamed prefix)', () => {
  const lawyer = getCategoryById('gcid:lawyer');
  assert.ok(lawyer, 'Lawyer category must exist in taxonomy');

  // Add prefix '\u05D4' (He-hayedia)
  const prefixed = '\u05D4' + lawyer.heName;
  const res = resolveGbpCategory(prefixed);
  assert.equal(res.confidence, 'exact_name');
  assert.equal(res.matched?.categoryId, 'gcid:lawyer');
});

test('resolveGbpCategory: returns none for unknown queries or empty inputs', () => {
  const unknown = resolveGbpCategory('unknown_xyz_nonexistent_service_999');
  assert.equal(unknown.confidence, 'none');
  assert.equal(unknown.matched, null);
  assert.deepEqual(unknown.suggestedSecondaries, []);

  const empty = resolveGbpCategory('');
  assert.equal(empty.confidence, 'none');
  assert.equal(empty.matched, null);
  assert.deepEqual(empty.suggestedSecondaries, []);

  const whitespace = resolveGbpCategory('   ');
  assert.equal(whitespace.confidence, 'none');
  assert.equal(whitespace.matched, null);
  assert.deepEqual(whitespace.suggestedSecondaries, []);
});

test('suggestSecondaryCategories: returns up to 9 valid related categories with no duplicates or self', () => {
  const plumber = getCategoryById('gcid:plumber')!;
  const secondaries = suggestSecondaryCategories(plumber);

  assert.ok(secondaries.length > 0);
  assert.ok(secondaries.length <= 9);

  const secIds = secondaries.map((s) => s.categoryId);
  const secSet = new Set(secIds);
  assert.equal(secSet.size, secIds.length, 'Suggested secondaries must not have duplicate IDs');
  assert.ok(!secSet.has('gcid:plumber'), 'Suggested secondaries must not contain primary category');

  // Verify by category ID string overload
  const byIdSecondaries = suggestSecondaryCategories('gcid:plumber', 3);
  assert.equal(byIdSecondaries.length, Math.min(3, plumber.relatedCategoryIds.length));
});

test('formatGbpCategoryPatch: produces GBP API compliant patch objects', () => {
  const primaryId = 'gcid:plumber';
  const secondaryIds = ['gcid:drainage_service', 'gcid:heating_contractor'];

  const patch = formatGbpCategoryPatch(primaryId, secondaryIds);
  assert.deepEqual(patch, {
    categories: [
      { categoryId: 'gcid:plumber', displayName: 'Plumber' },
      { categoryId: 'gcid:drainage_service', displayName: 'Drainage Service' },
      { categoryId: 'gcid:heating_contractor', displayName: 'Heating Contractor' },
    ],
  });

  // Verify deduplication and self-removal in secondaries
  const dedupePatch = formatGbpCategoryPatch(primaryId, [
    'gcid:drainage_service',
    'gcid:plumber', // self in secondaries should be omitted
    'gcid:drainage_service', // duplicate in secondaries
  ]);
  assert.equal(dedupePatch.categories.length, 2);
  assert.equal(dedupePatch.categories[0].categoryId, 'gcid:plumber');
  assert.equal(dedupePatch.categories[1].categoryId, 'gcid:drainage_service');
});
