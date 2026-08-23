import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoreThirtyTamarPrompt, buildCoreThirtyNoaPrompt } from './coreThirtyCopy';
import type { CoreThirtyNode } from './coreThirty';
import type { CollectedData } from '../bot/prompts';

// NOTE: generateCoreThirtyPageCopy() makes real network calls (callQwenJSON)
// and is deliberately NOT exercised here — no mocking framework, no network
// calls, no cost, no non-determinism in this test file. Only the pure prompt
// builders are tested.

function makeNode(overrides: Partial<CoreThirtyNode> = {}): CoreThirtyNode {
  return {
    id: 'svc0-city0',
    service: 'שירות-בדיקה',
    city: 'עיר-בדיקה',
    locationType: 'service-area',
    ...overrides,
  };
}

const baseData: CollectedData = {
  businessNiche: 'שירות-בדיקה',
  businessName: 'עסק-בדיקה',
  ownerName: 'בודק',
  usp: 'עובדה-בדיקה',
  yearsInField: '10',
  guarantee: 'אחריות-בדיקה',
  reviewQuote: 'ציטוט-בדיקה',
  faqQuestions: 'שאלה-בדיקה',
  exclusions: 'חריג-בדיקה',
  responseTime: 'זמן-בדיקה',
  license: 'רישיון-בדיקה',
  avgJobValue: 500,
};

test('buildCoreThirtyTamarPrompt returns a string', () => {
  const prompt = buildCoreThirtyTamarPrompt(makeNode(), baseData);
  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.length > 0);
});

test('buildCoreThirtyTamarPrompt contains node.service and node.city verbatim', () => {
  const node = makeNode({ service: 'שירות-ייחודי', city: 'עיר-ייחודית' });
  const prompt = buildCoreThirtyTamarPrompt(node, baseData);
  assert.ok(prompt.includes('שירות-ייחודי'), 'expected prompt to contain node.service verbatim');
  assert.ok(prompt.includes('עיר-ייחודית'), 'expected prompt to contain node.city verbatim');
});

test('buildCoreThirtyTamarPrompt injects real onboarding facts from CollectedData', () => {
  const prompt = buildCoreThirtyTamarPrompt(makeNode(), baseData);
  assert.ok(prompt.includes('עובדה-בדיקה'), 'expected usp fact in prompt');
  assert.ok(prompt.includes('אחריות-בדיקה'), 'expected guarantee fact in prompt');
  assert.ok(prompt.includes('ציטוט-בדיקה'), 'expected reviewQuote fact in prompt');
  assert.ok(prompt.includes('רישיון-בדיקה'), 'expected license fact in prompt');
});

test('buildCoreThirtyTamarPrompt: service-area locationType forbids implied storefront/location', () => {
  const node = makeNode({ locationType: 'service-area' });
  const prompt = buildCoreThirtyTamarPrompt(node, baseData);
  const lower = prompt.toLowerCase();
  assert.ok(lower.includes('storefront'), 'expected storefront-avoidance instruction');
  assert.ok(
    lower.includes('must never claim') || lower.includes('no physical'),
    'expected an explicit no-physical-presence instruction'
  );
  assert.ok(lower.includes('travels to'), 'expected travels-to-the-area framing');
});

test('buildCoreThirtyTamarPrompt: fixed-location locationType enforces the one-real-address constraint', () => {
  const node = makeNode({ locationType: 'fixed-location' });
  const dataWithAddress: CollectedData = { ...baseData, streetAddress: 'כתובת-בדיקה' };
  const prompt = buildCoreThirtyTamarPrompt(node, dataWithAddress);
  const lower = prompt.toLowerCase();
  assert.ok(lower.includes('one real physical location'), 'expected the one-real-location constraint');
  assert.ok(lower.includes('storefront'), 'expected storefront-avoidance instruction');
  assert.ok(prompt.includes('כתובת-בדיקה'), 'expected streetAddress fact injected verbatim');
});

test('buildCoreThirtyTamarPrompt: fixed-location without streetAddress does not invent one', () => {
  const node = makeNode({ locationType: 'fixed-location' });
  const dataNoAddress: CollectedData = { ...baseData, streetAddress: undefined };
  const prompt = buildCoreThirtyTamarPrompt(node, dataNoAddress);
  assert.ok(
    prompt.toLowerCase().includes('no street address is on file'),
    'expected an explicit no-address-on-file branch'
  );
});

test('buildCoreThirtyTamarPrompt: hybrid locationType requires both studio and on-location framing', () => {
  const node = makeNode({ locationType: 'hybrid' });
  const prompt = buildCoreThirtyTamarPrompt(node, baseData);
  const lower = prompt.toLowerCase();
  assert.ok(lower.includes('studio'), 'expected studio option mentioned');
  assert.ok(lower.includes('on-location'), 'expected on-location option mentioned');
  assert.ok(
    lower.includes('both') && lower.includes('never collapse'),
    'expected an explicit both-options-required instruction'
  );
});

test('buildCoreThirtyTamarPrompt: anti-generic / differentiation mandate present', () => {
  const prompt = buildCoreThirtyTamarPrompt(makeNode(), baseData);
  assert.ok(prompt.includes('ANTI-GENERIC MANDATE'));
  assert.ok(prompt.includes('DIFFERENTIATION MANDATE'));
  assert.ok(prompt.toLowerCase().includes('forbidden'), 'expected the generic-sentence-forbidden instruction');
});

test('buildCoreThirtyTamarPrompt: output schema matches CoreThirtyPageCopy shape', () => {
  const prompt = buildCoreThirtyTamarPrompt(makeNode(), baseData);
  assert.ok(prompt.includes('"pageHeadline"'));
  assert.ok(prompt.includes('"narrative"'));
  assert.ok(prompt.includes('"faqItems"'));
  assert.ok(prompt.includes('"metaDescription"'));
  assert.ok(prompt.includes('"localRelevanceNote"'));
  assert.ok(prompt.includes('"formHeadline"'));
  assert.ok(prompt.includes('"ctaLabel"'));
});

test('buildCoreThirtyTamarPrompt: no Hebrew authored literals leak in — only injected field values appear', () => {
  // Use non-Hebrew (Latin) field values and node terms; the prompt template's
  // own authored instruction text must contain zero Hebrew characters, since
  // this file is English-instructions-only per convention.
  const node = makeNode({ service: 'TestService', city: 'TestCity' });
  const dataLatin: CollectedData = {
    businessNiche: 'TestNiche',
    usp: 'TestUSP',
    guarantee: 'TestGuarantee',
    reviewQuote: 'TestReview',
    license: 'TestLicense',
  };
  const prompt = buildCoreThirtyTamarPrompt(node, dataLatin);
  const hebrewMatch = prompt.match(/[֐-׿]/);
  assert.equal(hebrewMatch, null, `expected no Hebrew characters in the prompt template, found: ${hebrewMatch}`);
});

test('buildCoreThirtyNoaPrompt returns a non-empty string with the QA checklist substance', () => {
  const prompt = buildCoreThirtyNoaPrompt();
  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.length > 0);
  assert.ok(prompt.includes('gershayim'));
  assert.ok(prompt.includes('geresh'));
  assert.ok(prompt.includes('Double spaces'));
  assert.ok(prompt.includes('Em-dash'));
  assert.ok(prompt.includes('singular male') || prompt.toLowerCase().includes('singular male'));
  assert.ok(prompt.includes('JSON.parse'));
  assert.ok(prompt.includes('formHeadline'), 'expected formHeadline covered by the QA checklist');
  assert.ok(prompt.includes('ctaLabel'), 'expected ctaLabel covered by the QA checklist');
});

test('buildCoreThirtyNoaPrompt takes no arguments and is deterministic', () => {
  const a = buildCoreThirtyNoaPrompt();
  const b = buildCoreThirtyNoaPrompt();
  assert.equal(a, b);
});
