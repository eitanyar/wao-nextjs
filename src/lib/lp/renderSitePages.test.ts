import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSchemaOrgType,
  localBusinessObject,
  localBusinessSchema,
  renderSitePages,
} from './renderSitePages';
import type { RenderSitePagesParams } from './renderSitePages';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { SiteCopy } from './lpCopyPrompt';
import type { CollectedData } from '../bot/prompts';

const theme = VERTICAL_THEMES['emergency-trades'];
const assets = VERTICAL_ASSETS['emergency-trades'];

const baseCopy: SiteCopy = {
  heroHeadline: 'Headline',
  heroSubheadline: 'Subheadline',
  heroCta: 'CTA',
  trustBarItems: ['Trust 1', 'Trust 2'],
  aboutBlurb: 'About blurb',
  servicesHeadline: 'Services Headline',
  serviceItems: ['S1', 'S2'],
  faqHeadline: 'FAQ Headline',
  faqItems: [
    { q: 'Q1', a: 'A1' },
    { q: 'Q2', a: 'A2' },
  ],
  guaranteeBlock: 'Guarantee',
  reviewFeatured: null,
  reviewContext: null,
  responseTimeBadge: null,
  scarcityLine: null,
  formHeadline: 'Form Headline',
  stickyBarLine: 'Sticky Bar',
  aboutPageHeadline: 'About Page Headline',
  aboutPageBody: 'About Page Body',
  serviceDetails: [
    { name: 'S1', description: 'SD1' },
    { name: 'S2', description: 'SD2' },
  ],
};

const baseData: CollectedData = {
  businessName: 'Business Name',
  businessNiche: 'plumber',
  phone: '050-1234567',
  streetAddress: 'Main St 1',
  targetLocation: 'Tel Aviv',
  businessHours: 'Sun-Thu 08:00-18:00',
  vatStatus: 'osek_patur',
};

function baseParams(overrides: Partial<RenderSitePagesParams> = {}): RenderSitePagesParams {
  return {
    copy: baseCopy,
    theme,
    assets,
    data: baseData,
    heroImageUrl: 'https://example.com/hero.jpg',
    slug: 'test-site',
    siteUrl: 'https://test-site.wao.co.il',
    ...overrides,
  };
}

// ── getSchemaOrgType ────────────────────────────────────────────────────────

test('getSchemaOrgType: maps Locksmith / \u05de\u05e0\u05e2\u05d5\u05dc\u05df to Locksmith', () => {
  assert.equal(getSchemaOrgType('Locksmith'), 'Locksmith');
  assert.equal(getSchemaOrgType('\u05de\u05e0\u05e2\u05d5\u05dc\u05df'), 'Locksmith');
  assert.equal(getSchemaOrgType('\u05de\u05e0\u05e2\u05d5\u05dc\u05df \u05de\u05d5\u05e8\u05e9\u05d4'), 'Locksmith');
});

test('getSchemaOrgType: maps Plumber / \u05d0\u05d9\u05e0\u05e1\u05d8\u05dc\u05d8\u05d5\u05e8 / \u05e9\u05e8\u05d1\u05e8\u05d1 to Plumber', () => {
  assert.equal(getSchemaOrgType('Plumber'), 'Plumber');
  assert.equal(getSchemaOrgType('\u05d0\u05d9\u05e0\u05e1\u05d8\u05dc\u05d8\u05d5\u05e8'), 'Plumber');
  assert.equal(getSchemaOrgType('\u05e9\u05e8\u05d1\u05e8\u05d1 \u05de\u05d5\u05de\u05d7\u05d4'), 'Plumber');
});

test('getSchemaOrgType: maps Electrician / \u05d7\u05e9\u05de\u05dc\u05d0\u05d9 to Electrician', () => {
  assert.equal(getSchemaOrgType('Electrician'), 'Electrician');
  assert.equal(getSchemaOrgType('\u05d7\u05e9\u05de\u05dc\u05d0\u05d9 \u05de\u05d5\u05e1\u05de\u05da'), 'Electrician');
});

test('getSchemaOrgType: maps HVAC / \u05de\u05d9\u05d6\u05d5\u05d2 \u05d0\u05d5\u05d5\u05d9\u05e8 / \u05d8\u05db\u05e0\u05d0\u05d9 \u05de\u05d6\u05d2\u05e0\u05d9\u05dd to HVACBusiness', () => {
  assert.equal(getSchemaOrgType('HVAC'), 'HVACBusiness');
  assert.equal(getSchemaOrgType('\u05de\u05d9\u05d6\u05d5\u05d2 \u05d0\u05d5\u05d5\u05d9\u05e8'), 'HVACBusiness');
  assert.equal(getSchemaOrgType('\u05d8\u05db\u05e0\u05d0\u05d9 \u05de\u05d6\u05d2\u05e0\u05d9\u05dd'), 'HVACBusiness');
});

test('getSchemaOrgType: maps Roofing / \u05d0\u05d9\u05d8\u05d5\u05dd / \u05d2\u05d2\u05d5\u05ea to RoofingContractor', () => {
  assert.equal(getSchemaOrgType('Roofing'), 'RoofingContractor');
  assert.equal(getSchemaOrgType('\u05d0\u05d9\u05d8\u05d5\u05dd \u05d2\u05d2\u05d5\u05ea'), 'RoofingContractor');
});

test('getSchemaOrgType: maps Automotive / \u05de\u05d5\u05e1\u05da / \u05e8\u05db\u05d1 to AutoRepair', () => {
  assert.equal(getSchemaOrgType('Automotive'), 'AutoRepair');
  assert.equal(getSchemaOrgType('Auto Repair'), 'AutoRepair');
  assert.equal(getSchemaOrgType('\u05de\u05d5\u05e1\u05da \u05e8\u05db\u05d1'), 'AutoRepair');
});

test('getSchemaOrgType: maps Medical / Clinic / \u05e8\u05d5\u05e4\u05d0 / \u05de\u05e8\u05e4\u05d0\u05d4 to MedicalBusiness', () => {
  assert.equal(getSchemaOrgType('Medical'), 'MedicalBusiness');
  assert.equal(getSchemaOrgType('Dental Clinic'), 'MedicalBusiness');
  assert.equal(getSchemaOrgType('\u05e8\u05d5\u05e4\u05d0 \u05e9\u05d9\u05e0\u05d9\u05d9\u05dd'), 'MedicalBusiness');
  assert.equal(getSchemaOrgType('\u05de\u05e8\u05e4\u05d0\u05ea \u05e2\u05d5\u05e8'), 'MedicalBusiness');
});

test('getSchemaOrgType: maps Home services / \u05e9\u05d9\u05e4\u05d5\u05e6\u05d9\u05dd / \u05d4\u05e0\u05d3\u05d9\u05de\u05df to HomeAndConstructionBusiness', () => {
  assert.equal(getSchemaOrgType('Home services'), 'HomeAndConstructionBusiness');
  assert.equal(getSchemaOrgType('\u05e9\u05d9\u05e4\u05d5\u05e6\u05d9\u05dd'), 'HomeAndConstructionBusiness');
  assert.equal(getSchemaOrgType('\u05d4\u05e0\u05d3\u05d9\u05de\u05df'), 'HomeAndConstructionBusiness');
});

test('getSchemaOrgType: falls back to LocalBusiness for unknown or missing niche', () => {
  assert.equal(getSchemaOrgType(undefined), 'LocalBusiness');
  assert.equal(getSchemaOrgType(''), 'LocalBusiness');
  assert.equal(getSchemaOrgType('lawyer'), 'LocalBusiness');
});

// ── localBusinessObject / localBusinessSchema ───────────────────────────────

test('localBusinessObject returns enriched Schema.org properties', () => {
  const data: CollectedData = {
    businessName: 'Top Locksmith',
    businessNiche: '\u05de\u05e0\u05e2\u05d5\u05dc\u05df',
    phone: '050-9999999',
    streetAddress: 'Herzl 10',
    targetLocation: 'Ramat Gan',
    businessHours: '24/7',
  };

  const obj = localBusinessObject(data, 'Top Locksmith', 'https://locksmith.wao.co.il/', 'https://example.com/hero.jpg');

  assert.equal(obj['@type'], 'Locksmith');
  assert.equal(obj['@id'], 'https://locksmith.wao.co.il/#business');
  assert.equal(obj.name, 'Top Locksmith');
  assert.equal(obj.url, 'https://locksmith.wao.co.il');
  assert.equal(obj.image, 'https://example.com/hero.jpg');
  assert.equal(obj.priceRange, '$$');
  assert.equal(obj.currenciesAccepted, 'ILS');
  assert.deepEqual(obj.paymentAccepted, ['Cash', 'Credit Card', 'Bit', 'PayBox']);
  assert.equal(obj.telephone, '050-9999999');
  assert.deepEqual(obj.address, {
    '@type': 'PostalAddress',
    streetAddress: 'Herzl 10',
    addressLocality: 'Ramat Gan',
    addressCountry: 'IL',
  });
  assert.equal(obj.openingHours, '24/7');
});

test('localBusinessSchema wraps localBusinessObject in script tag with @context', () => {
  const data: CollectedData = {
    businessName: 'Clean Plumber',
    businessNiche: 'plumber',
  };

  const scriptTag = localBusinessSchema(data, 'Clean Plumber', 'https://plumber.wao.co.il', 'https://example.com/hero.jpg');
  assert.ok(scriptTag.startsWith('<script type="application/ld+json">'));
  assert.ok(scriptTag.endsWith('</script>'));

  const jsonStr = scriptTag.replace('<script type="application/ld+json">', '').replace('</script>', '');
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed['@context'], 'https://schema.org');
  assert.equal(parsed['@type'], 'Plumber');
  assert.equal(parsed['@id'], 'https://plumber.wao.co.il/#business');
  assert.equal(parsed.priceRange, '$$');
  assert.equal(parsed.currenciesAccepted, 'ILS');
  assert.deepEqual(parsed.paymentAccepted, ['Cash', 'Credit Card', 'Bit', 'PayBox']);
});

// ── renderSitePages ─────────────────────────────────────────────────────────

test('renderSitePages outputs pages with enriched LocalBusiness JSON-LD schema', () => {
  const pages = renderSitePages(baseParams());

  const indexHtml = pages['index.html'];
  assert.ok(indexHtml, 'expected index.html');
  assert.ok(indexHtml.includes('"@id":"https://test-site.wao.co.il/#business"'));
  assert.ok(indexHtml.includes('"currenciesAccepted":"ILS"'));
  assert.ok(indexHtml.includes('"paymentAccepted":["Cash","Credit Card","Bit","PayBox"]'));
  assert.ok(indexHtml.includes('"priceRange":"$$"'));

  const aboutHtml = pages['about.html'];
  assert.ok(aboutHtml.includes('"@id":"https://test-site.wao.co.il/#business"'));

  const servicesHtml = pages['services.html'];
  assert.ok(servicesHtml.includes('"@id":"https://test-site.wao.co.il/#business"'));

  const contactHtml = pages['contact.html'];
  assert.ok(contactHtml.includes('"@id":"https://test-site.wao.co.il/#business"'));
});
