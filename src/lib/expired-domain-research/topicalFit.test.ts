import assert from 'node:assert/strict';
import test from 'node:test';
import { compileBusinessFit, compileTopicalFit } from './topicalFit';

test('fit compilers are deterministic, bounded, and evidence-linked', () => {
  const topical = compileTopicalFit({ keywords: ['topic research', 'Topic research'], historical: [{ id: 'h-2', text: 'Topic research archive', continuity: 80 }, { id: 'h-1', text: 'topic', continuity: 80 }], openSeo: [{ id: 'o-1', keyword: 'topic research', demand: 100, intent: 'commercial', cpc: 2 }] });
  assert.equal(topical.score >= 0 && topical.score <= 100, true);
  assert.deepEqual(topical.evidenceIds, ['h-1', 'h-2', 'o-1']);
  assert.equal(topical.matchedInputs.includes('topic'), true);
  const business = compileBusinessFit({ businessInputs: ['topic research'], openSeo: [{ id: 'o-1', keyword: 'topic research', demand: 100, intent: 'commercial', cpc: 2 }] });
  assert.equal(business.score >= 0 && business.score <= 100, true);
  assert.deepEqual(business.evidenceIds, ['o-1']);
});

test('fit normalizes Unicode and does not infer fit from hostname-like text', () => {
  const left = compileTopicalFit({ keywords: ['Cafe\u0301'], historical: [{ id: 'z', text: 'cafe\u0301', continuity: 50 }], openSeo: [] });
  const right = compileTopicalFit({ keywords: ['Caf\u00e9'], historical: [{ id: 'z', text: 'cafe\u0301', continuity: 50 }], openSeo: [] });
  assert.deepEqual(left, right);
  assert.equal(compileTopicalFit({ keywords: ['topic'], historical: [{ id: 'host', text: 'example.test', continuity: null }], openSeo: [] }).score, 0);
  assert.equal(compileBusinessFit({ businessInputs: ['topic'], openSeo: [] }).score, 0);
});

test('fit compilers are reorder-stable and normalize linked evidence tokens', () => {
  const topicalInput = { keywords: ['Caf\u00e9 service'], historical: [{ id: 'h-2', text: 'service history', continuity: 60 }, { id: 'h-1', text: 'cafe\u0301 archive', continuity: 80 }], openSeo: [{ id: 'o-1', keyword: 'CAF\u00c9 SERVICE', demand: 10, intent: 'commercial', cpc: 2 }] };
  const topical = compileTopicalFit(topicalInput);
  const reordered = compileTopicalFit({ keywords: [...topicalInput.keywords].reverse(), historical: [...topicalInput.historical].reverse(), openSeo: [...topicalInput.openSeo].reverse() });
  assert.deepEqual(topical, reordered); assert.deepEqual(topical.matchedInputs, ['caf\u00e9', 'service']); assert.deepEqual(topical.evidenceIds, ['h-1', 'h-2', 'o-1']);
  assert.equal(Object.values(topical.components).every(value => value >= 0 && value <= 100), true);
  assert.equal(topical.confidence >= 0 && topical.confidence <= 100, true);
});

test('unlinked authority demand and CPC evidence cannot create topical or business fit', () => {
  const topical = compileTopicalFit({ keywords: ['target'], historical: [{ id: 'history', text: 'unrelated archive', continuity: 100 }], openSeo: [{ id: 'seo', keyword: 'unrelated', demand: 100, intent: 'commercial', cpc: 100 }] });
  assert.equal(topical.score, 0); assert.equal(topical.confidence, 0); assert.deepEqual(topical.evidenceIds, []); assert.deepEqual(topical.matchedInputs, []); assert.deepEqual(topical.missingInputs, ['target']);
  const business = compileBusinessFit({ businessInputs: ['target'], openSeo: [{ id: 'seo', keyword: 'unrelated', demand: 100, intent: 'transactional', cpc: 100 }] });
  assert.equal(business.score, 0); assert.equal(business.confidence, 0); assert.deepEqual(business.evidenceIds, []);
});
