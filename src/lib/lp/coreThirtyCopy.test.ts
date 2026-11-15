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
  // D3b: the only Hebrew allowed is the generated voice example (byte-exact from docs/research); strip it first.
  const prompt = buildCoreThirtyTamarPrompt(node, dataLatin).replace(CORE_THIRTY_VOICE_EXAMPLE_JSON, '');
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

// ---------------------------------------------------------------------------
// Fable 5.2 D3b (2026-11-15): shared write/QA rules, voice example, code-side meta cap and dash normalisation.
// HEBREW-SAFETY: this block is ASCII-only; Hebrew expectations come from the generated voice-example module.
// ---------------------------------------------------------------------------
import {
  D3B_FACT_RULES,
  D3B_TYPOGRAPHY_RULE,
  D3B_CTA_RULE,
  D3B_REGISTER_RULE,
  META_DESCRIPTION_MAX_CHARS,
  capAtWordBoundary,
  normalizeDashes,
  finalizeCoreThirtyCopy,
  D3C_RULES,
  voiceRuleFor,
} from './coreThirtyCopy';
import { CORE_THIRTY_VOICE_EXAMPLE_JSON } from './coreThirtyVoiceExample.generated';

const EN = '\u2013';
const EM = '\u2014';

test('D3b: write prompt carries every rule (equipment, geography, dashes, meta cap, CTA, register) and the voice example', () => {
  const prompt = buildCoreThirtyTamarPrompt(makeNode(), baseData);
  for (const rule of [...D3B_FACT_RULES, D3B_TYPOGRAPHY_RULE, D3B_CTA_RULE, D3B_REGISTER_RULE]) assert.ok(prompt.includes(rule), rule.slice(0, 40));
  assert.match(prompt, /equipment, a tool, a vehicle, a service, a method or a guarantee/);
  assert.match(prompt, /Never name a neighbourhood, district, street, landmark, region or nearby city/);
  assert.ok(prompt.includes(`Never an en-dash (${EN})`));
  assert.ok(prompt.includes(`at most ${META_DESCRIPTION_MAX_CHARS} characters`));
  assert.equal(META_DESCRIPTION_MAX_CHARS, 155);
  assert.ok(!/150-160/.test(prompt), 'old 150-160 meta range is gone');
  assert.match(prompt, /lead form \(name \+ phone\)/);
  assert.match(prompt, /generic closing/);
  assert.ok(prompt.includes(CORE_THIRTY_VOICE_EXAMPLE_JSON), 'voice example embedded byte-exact');
  assert.match(prompt, /VOICE EXAMPLE \(register and rhythm ONLY\)/);
  assert.match(prompt, /Never\s+copy any of its facts, services, equipment, places/);
});

test('D3b: voice example is the parsed qwen.json[2].copy (electrician page) with all page fields', () => {
  const example = JSON.parse(CORE_THIRTY_VOICE_EXAMPLE_JSON);
  for (const key of ['pageHeadline', 'narrative', 'faqItems', 'metaDescription', 'localRelevanceNote', 'formHeadline', 'ctaLabel']) {
    assert.ok(key in example, key);
  }
  assert.equal(CORE_THIRTY_VOICE_EXAMPLE_JSON.includes(EN), false, 'example has no en-dash');
});

test('D3b: QA prompt adds rules 9-14 and, given the node, the source facts', () => {
  const bare = buildCoreThirtyNoaPrompt();
  assert.match(bare, /9\. Equipment, tools, vehicles, services, methods or guarantees not stated in SOURCE FACTS/);
  assert.match(bare, /10\. A neighbourhood, district, street, landmark, region or city not in SOURCE FACTS/);
  assert.ok(bare.includes(`11. Every en-dash (${EN}) -> em-dash (${EM})`));
  assert.ok(bare.includes(`longer than ${META_DESCRIPTION_MAX_CHARS} characters`));
  assert.match(bare, /13\. "ctaLabel" or "formHeadline" promising an immediate call/);
  assert.match(bare, /14\. Brochure or ad register/);
  const withFacts = buildCoreThirtyNoaPrompt(makeNode(), baseData);
  assert.ok(withFacts.includes('SOURCE FACTS'));
  assert.ok(withFacts.includes(`Page city: ${makeNode().city}`));
  assert.ok(withFacts.includes(`Guarantee: ${baseData.guarantee}`));
});

test('D3b: capAtWordBoundary keeps <= 155 chars, never cuts mid-word, drops a dangling separator', () => {
  assert.equal(capAtWordBoundary('short text'), 'short text');
  const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
  const capped = capAtWordBoundary(words);
  assert.ok(capped.length <= 155);
  assert.ok(words.startsWith(capped));
  assert.ok(words[capped.length] === ' ', 'cut lands on a word boundary');
  assert.equal(capAtWordBoundary(`${'a'.repeat(150)} bb, ccccccccc`), `${'a'.repeat(150)} bb`);
  assert.equal(capAtWordBoundary(`${'a'.repeat(150)} ${EM} cccccccc`), 'a'.repeat(150));
  const exact = 'x'.repeat(155);
  assert.equal(capAtWordBoundary(exact), exact);
});

test('D3b: normalizeDashes turns every en-dash into a single-spaced em-dash and digit ranges into hyphens', () => {
  assert.equal(normalizeDashes(`a ${EN} b`), `a ${EM} b`);
  assert.equal(normalizeDashes(`a${EN}b`), `a ${EM} b`);
  assert.equal(normalizeDashes(`a  ${EM}b`), `a ${EM} b`);
  assert.equal(normalizeDashes(`8${EN}10`), '8-10');
  assert.equal(normalizeDashes(`8 ${EN} 10`), '8-10');
  assert.equal(normalizeDashes('well-known'), 'well-known');
  assert.equal(normalizeDashes(`a ${EM} b`), `a ${EM} b`);
});

test('D3b: finalizeCoreThirtyCopy applies dashes to every string and caps metaDescription', () => {
  const long = Array.from({ length: 30 }, (_, i) => `meta${i}`).join(' ');
  const out = finalizeCoreThirtyCopy({
    pageHeadline: `h ${EN} x`, narrative: `n ${EN} y`, faqItems: [{ q: `q ${EN} 1`, a: `a ${EN} 2` }],
    metaDescription: `${long} ${EN} end`, localRelevanceNote: `l ${EN} z`, formHeadline: 'f', ctaLabel: 'c',
  });
  const all = JSON.stringify(out);
  assert.equal(all.includes(EN), false);
  assert.ok(out.metaDescription.length <= META_DESCRIPTION_MAX_CHARS);
  assert.equal(out.faqItems[0].a, `a ${EM} 2`);
});

test('D3b round 2 (g-k): write prompt carries customer-setting, speed, voice, label and phrase-economy rules', () => {
  const prompt = buildCoreThirtyTamarPrompt(makeNode(), { ...baseData, serviceModel: 'field' });
  for (const rule of D3C_RULES) assert.ok(prompt.includes(rule), rule.slice(0, 40));
  assert.match(prompt, /never name a customer type or setting \(home, apartment, business, office, building, commercial/);
  assert.match(prompt, /no speed or waiting-time language at all, even without a number/);
  assert.match(prompt, /Never mix "we" and "I" on a page/);
  assert.match(prompt, /never output an internal field name, field value or system label/);
  assert.match(prompt, /formHeadline and ctaLabel are each an imperative or a question/);
  assert.match(prompt, /same arrival phrase .* at most two fields/);
  assert.match(prompt, /reads two ways when written without vowel points/);
  assert.ok(prompt.includes(voiceRuleFor({ serviceModel: 'field' })));
  assert.match(prompt, /one-owner field business\. The owner speaks in the first person singular/);
  assert.match(prompt, /The example speaks as "we"; your page\s+follows VOICE FOR THIS BUSINESS/);
});

test('D3b round 2: voice rule is first person singular for field / unset, one-voice for other models', () => {
  assert.match(voiceRuleFor({}), /first person singular/);
  assert.match(voiceRuleFor({ serviceModel: 'field' }), /first person singular/);
  assert.doesNotMatch(voiceRuleFor({ serviceModel: 'location' }), /first person singular/);
  assert.match(voiceRuleFor({ serviceModel: 'location' }), /never mix "we" and "I"/);
});

test('D3b round 2: QA checklist adds items 15-19 and passes the Service Model in SOURCE FACTS', () => {
  const qa = buildCoreThirtyNoaPrompt(makeNode(), { ...baseData, serviceModel: 'field' });
  assert.match(qa, /15\. A customer type or setting/);
  assert.match(qa, /16\. Speed or waiting-time language .*\n.*Response Time in SOURCE FACTS is empty/);
  assert.match(qa, /17\. Mixed "we" and "I"/);
  assert.match(qa, /18\. An internal field name, field value or system label/);
  assert.match(qa, /19\. The same arrival phrase in more than two fields/);
  assert.ok(qa.includes('Service Model: field'));
});
