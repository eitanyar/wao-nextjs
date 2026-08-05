import assert from 'node:assert/strict';
import test from 'node:test';
import {
  campaignType,
  resolveCplCeilingIls,
  isCplCeilingBreached,
  CPL_CEILING_ILS_BY_CLIENT_AND_TYPE,
  SEASONAL_REMARKETING_EXACT_CAMPAIGNS,
} from './cpl-ceiling';

// ---------------------------------------------------------------------------------------
// §8.2 — three-way classification (brand / non-brand / seasonal-remarketing).
// ---------------------------------------------------------------------------------------

test('campaignType classifies AAAsada brand campaign', () => {
  assert.equal(campaignType('ברנד', 'aasada'), 'brand');
});

test('campaignType classifies AAAsada seasonal-remarketing campaigns by exact campaign ID', () => {
  assert.equal(campaignType('some renamed campaign', 'aasada', '24045777050'), 'seasonal-remarketing');
  assert.equal(campaignType('another renamed campaign', 'aasada', '24053311090'), 'seasonal-remarketing');
});

test('campaignType classifies AAAsada seasonal-remarketing campaigns by exact name when no ID is supplied', () => {
  assert.equal(campaignType('אזכרות - שבעה - דינאמי', 'aasada'), 'seasonal-remarketing');
  assert.equal(campaignType('שבת חתן - דינאמי', 'aasada'), 'seasonal-remarketing');
});

test('campaignType is exact-match only for seasonal-remarketing — a substring/partial match does not classify', () => {
  // §8.2's named risk: "דינאמי" is a broader/riskier substring than "ברנד" — a differently
  // named campaign that merely CONTAINS "דינאמי" must NOT be swept into the looser ceiling.
  assert.equal(campaignType('קמפיין דינאמי חדש לגמרי', 'aasada'), 'non-brand');
  assert.equal(campaignType('אזכרות - שבעה - דינאמי - זהות', 'aasada'), 'non-brand'); // not an exact match
});

test('campaignType defaults evergreen AAAsada prospecting campaign to non-brand', () => {
  assert.equal(campaignType('ערים קרובות', 'aasada'), 'non-brand');
  assert.equal(campaignType('אירועים', 'aasada'), 'non-brand');
});

test('campaignType resolution order is brand before seasonal-remarketing (brand wins on conflict)', () => {
  // A hypothetical "ברנד - דינאמי" campaign must resolve to 'brand', per §8.2's explicit
  // resolution-order rule, even though it also contains the brand-adjacent substring.
  assert.equal(campaignType('ברנד - דינאמי', 'aasada'), 'brand');
});

test('campaignType defaults unclassified/unknown clients and empty names to non-brand', () => {
  assert.equal(campaignType(undefined, 'aasada'), 'non-brand');
  assert.equal(campaignType('אירועים', undefined), 'non-brand');
  assert.equal(campaignType('אירועים', 'unknown-client'), 'non-brand');
});

test('Retter has no confirmed seasonal-remarketing campaigns yet — exact list is empty', () => {
  assert.deepEqual(SEASONAL_REMARKETING_EXACT_CAMPAIGNS.retter, []);
});

// ---------------------------------------------------------------------------------------
// §8.2/§8.7 — ceiling resolution for the new bucket.
// ---------------------------------------------------------------------------------------

test('CPL_CEILING_ILS_BY_CLIENT_AND_TYPE.aasada.seasonalRemarketing is 1.25x its confirmed non-brand ceiling', () => {
  assert.equal(CPL_CEILING_ILS_BY_CLIENT_AND_TYPE.aasada.nonBrand, 80);
  assert.equal(CPL_CEILING_ILS_BY_CLIENT_AND_TYPE.aasada.seasonalRemarketing, 100);
});

test('resolveCplCeilingIls resolves the seasonal-remarketing ceiling for AAAsada', () => {
  assert.equal(resolveCplCeilingIls({ clientId: 'aasada', type: 'seasonal-remarketing' }), 100);
});

test('resolveCplCeilingIls resolves the non-brand ceiling for AAAsada unchanged', () => {
  assert.equal(resolveCplCeilingIls({ clientId: 'aasada', type: 'non-brand' }), 80);
});

test('resolveCplCeilingIls returns undefined for brand, never a ceiling number', () => {
  assert.equal(resolveCplCeilingIls({ clientId: 'aasada', type: 'brand' }), undefined);
  assert.equal(resolveCplCeilingIls({ clientId: 'retter', type: 'brand' }), undefined);
});

test('resolveCplCeilingIls returns undefined for seasonal-remarketing when no named ceiling and no campaignConfig fallback exists (Retter today)', () => {
  assert.equal(resolveCplCeilingIls({ clientId: 'retter', type: 'seasonal-remarketing' }), undefined);
});

test('isCplCeilingBreached is reused unchanged and type-agnostic — works identically for the new bucket', () => {
  assert.equal(isCplCeilingBreached(100, 100), true); // >= ceiling breaches
  assert.equal(isCplCeilingBreached(99, 100), false);
  assert.equal(isCplCeilingBreached(undefined, 100), false);
  assert.equal(isCplCeilingBreached(150, undefined), false);
});
