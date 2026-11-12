// Sell mission 2026-11-12 (docs/copy/strategy/client-copy-sell-fable52-2026-11-12.md section 3): focused tests for the selling
// rules, the new gates, the relaxations, closeLine / flags, the Ads callouts, the RSA settle step and the Ads landing copy.
// No Hebrew literals: the only Hebrew is the existing placeholder test word (code points) and tokens read from the data modules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ADS_RSA_SELLING_ADDENDUM, CLIENT_SELLING_RULES } from './clientSellingRules';
import {
  GATE_RULES, GENERIC_EXPERT_WORD_INDICES, SIGNATURE_GROUPS, WARNING_ONLY_RULES, ALWAYS_BLOCKING_RULES, copyGateContext, isWarningHit,
  runCopyGates, claimScopeSentenceRules, pitchSentenceBlocked,
} from './copyGates';
import { GENERIC_ADJECTIVE_WORDS } from './generationData';
import { CLOSE_LINE_MAX_CHARS, FLAGS_KEY, PROMPT_V2_SYSTEM_PROMPTS, SITE_COPY_OPTIONAL_PRESENCE_LIMITS, dropPitchTruth, fearPromiseSource } from './researchPageCopy';
import { buildFearPromiseSpec } from './claimScope';
import { codeOwnedFactTemplates, ownerFacts, trustText } from './ownerFactCopy';
import { buildLpCopyPrompt } from './lpCopyPrompt';
import { BUDGET_RENDER_ORDER } from './repetitionBudget';
import { RESEARCHED_RENDERED_FIELDS, RESEARCHED_RENDERED_WARN_ONLY_FIELDS } from './researchedSite';
import { TAMAR_SYSTEM_PROMPT, buildRsaBrief } from '../bot/prompts';
import * as Prompts from '../bot/prompts';
import { adsCalloutsFromFacts, adsGateContext, rsaAssetProblems, settleRsaAssets, RSA_HEADLINE_MAX } from '../bot/adsCopy';
import { AdsLandingCopyGateError, generateAdsLandingCopy } from './adsLandingCopy';

const HE_WORD = '\u05D0\u05D1\u05D2\u05D3';
const HEBREW = /[\u0590-\u05FF]/;

test('selling rules: English only, injected into the v2 Tamar and repair system prompts and the RSA prompt', () => {
  assert.ok(!HEBREW.test(CLIENT_SELLING_RULES) && !HEBREW.test(ADS_RSA_SELLING_ADDENDUM));
  assert.ok(CLIENT_SELLING_RULES.startsWith('CLIENT SELLING RULES'));
  assert.ok(PROMPT_V2_SYSTEM_PROMPTS.tamar.includes(CLIENT_SELLING_RULES));
  assert.ok(PROMPT_V2_SYSTEM_PROMPTS.repair.includes(CLIENT_SELLING_RULES));
  assert.ok(!PROMPT_V2_SYSTEM_PROMPTS.noa.includes(CLIENT_SELLING_RULES), 'Noa corrects language only');
  assert.ok(TAMAR_SYSTEM_PROMPT.includes(CLIENT_SELLING_RULES) && TAMAR_SYSTEM_PROMPT.includes(ADS_RSA_SELLING_ADDENDUM));
  assert.match(TAMAR_SYSTEM_PROMPT, /use facts only from the input/);
  assert.equal((Prompts as Record<string, unknown>).TAMAR_CALLOUT_SYSTEM_PROMPT, undefined, 'the model callout prompt is gone');
});

test('lpCopyPrompt: no Hebrew example lines, no "Not salesy", hero carries the promise', () => {
  const prompt = buildLpCopyPrompt({ businessNiche: 'plumber' });
  assert.doesNotMatch(prompt, /Example \d/);
  assert.doesNotMatch(prompt, /Not salesy/);
  assert.match(prompt, /pride of a tradesman/);
  assert.match(prompt, /heroHeadline: carries the page's one big promise/);
});

test('gate_unknown_number: blocks a digit run the owner never gave (opt-in context), allows his digits', () => {
  const data = { businessNiche: 'plumber', yearsInField: '18', usp: 'arrives within 20 minutes' };
  const on = copyGateContext(data, [], true, [], { unknownNumberGate: true });
  const off = copyGateContext(data, [], true, []);
  assert.ok(ALWAYS_BLOCKING_RULES.includes(GATE_RULES.unknownNumber));
  assert.deepEqual(runCopyGates({ aboutBlurb: `${HE_WORD} 24 ${HE_WORD}` }, on).map(hit => hit.actual), ['number:24']);
  assert.deepEqual(runCopyGates({ aboutBlurb: `${HE_WORD} 18 ${HE_WORD} 20` }, on), []);
  assert.deepEqual(runCopyGates({ aboutBlurb: `${HE_WORD} 24 ${HE_WORD}` }, off), [], 'legacy contexts unchanged');
  assert.deepEqual(runCopyGates({ reviewContext: '4.9' }, on).filter(hit => hit.rule === GATE_RULES.unknownNumber), [], 'system field');
});

test('relaxations: hero cap, moral ending and the list subheadline warn; the expert family warns, the rest blocks (about-headline promise reverted)', () => {
  for (const rule of [GATE_RULES.heroSignatureCap, GATE_RULES.moralEnding, GATE_RULES.subheadlineList]) assert.ok(WARNING_ONLY_RULES.includes(rule), rule);
  for (const rule of [GATE_RULES.aboutHeadlinePromise, GATE_RULES.claim, GATE_RULES.fearPromise, GATE_RULES.factRestatement, GATE_RULES.customerSource, GATE_RULES.clauseRepeat]) assert.ok(!WARNING_ONLY_RULES.includes(rule), rule);
  const ctx = { renderedFields: ['heroHeadline'] };
  assert.equal(GENERIC_EXPERT_WORD_INDICES.length, 5);
  assert.ok(isWarningHit({ field: 'heroHeadline', rule: GATE_RULES.genericAdjective, actual: `generic_word:${GENERIC_EXPERT_WORD_INDICES[0]}` }, ctx));
  assert.ok(!isWarningHit({ field: 'heroHeadline', rule: GATE_RULES.genericAdjective, actual: 'generic_word:0' }, ctx));
  assert.ok(!isWarningHit({ field: 'heroHeadline', rule: GATE_RULES.genericAdjective, actual: 'generic_phrase:9' }, ctx), 'ranking phrases still block');
  assert.ok(GENERIC_ADJECTIVE_WORDS.length > 20);
});

test('subheadline list gate: two commas on a research site is a warning hit', () => {
  const ctx = { ...copyGateContext({}, [], true, [], { researchSite: true }) };
  assert.deepEqual(runCopyGates({ heroSubheadline: `${HE_WORD}, ${HE_WORD}, ${HE_WORD}` }, ctx).filter(hit => hit.rule === GATE_RULES.subheadlineList).length, 1);
  assert.deepEqual(runCopyGates({ heroSubheadline: `${HE_WORD}, ${HE_WORD}` }, ctx).filter(hit => hit.rule === GATE_RULES.subheadlineList).length, 0);
});

test('pitch truth hit drops that pitch sentence only', () => {
  const ctx = copyGateContext({ yearsInField: '18' }, [], true, [], { unknownNumberGate: true, researchSite: true });
  assert.ok(pitchSentenceBlocked(`${HE_WORD} 99 ${HE_WORD}.`, ctx));
  const copy: Record<string, unknown> = { pitch: `${HE_WORD} 18 ${HE_WORD}. ${HE_WORD} 99 ${HE_WORD}. ${HE_WORD} ${HE_WORD}.` };
  assert.deepEqual(dropPitchTruth(copy, ctx), ['pitch_drop_sentence:pitch:3->2']);
  assert.equal(copy.pitch, `${HE_WORD} 18 ${HE_WORD}. ${HE_WORD} ${HE_WORD}.`);
  assert.deepEqual(dropPitchTruth(copy, ctx), [], 'idempotent');
});

test('fear-promise: an English fear maps through the signature groups to Hebrew tokens; an owner usp of the same group negates it', () => {
  const templates = codeOwnedFactTemplates();
  if (!templates) return; // the templates are live in this repo; pending templates keep the gate off
  const variant = SIGNATURE_GROUPS.noSurprises[0];
  const spec = (data: Record<string, string>) => {
    const source = fearPromiseSource(data, templates);
    return buildFearPromiseSpec(source.fear, templates.parseNegationWords, [], source.ownerTexts);
  };
  const english = spec({ idealClientFear: 'An electrician who finds surprises inside the wall and doubles the price', usp: 'Explains the quote line by line' });
  assert.ok(english, 'an English fear now builds a spec');
  assert.deepEqual(claimScopeSentenceRules(`${HE_WORD} ${variant} ${HE_WORD}`, { fearPromise: english! }), [GATE_RULES.fearPromise]);
  const owned = spec({ idealClientFear: 'An electrician who finds surprises inside the wall', usp: 'No surprises: I explain every line' });
  assert.ok(!owned || claimScopeSentenceRules(`${HE_WORD} ${variant}`, { fearPromise: owned }).length === 0, 'the owner said it himself');
  const blind = spec({ idealClientFear: 'A plumber who never answers the phone' });
  assert.ok(!blind || blind.fearWords.every(forms => forms.every(form => !HEBREW.test(form))), 'no group: still blind to Hebrew copy (Noa tokens pending)');
});

test('closeLine and flags: limits; closeLine generated but not rendered (round-1b stop rule); budget keeps it if re-enabled', () => {
  assert.equal(SITE_COPY_OPTIONAL_PRESENCE_LIMITS.closeLine, CLOSE_LINE_MAX_CHARS);
  assert.equal(FLAGS_KEY, 'flags');
  assert.ok(!RESEARCHED_RENDERED_FIELDS.includes('closeLine') && !RESEARCHED_RENDERED_WARN_ONLY_FIELDS.includes('closeLine'));
  assert.ok(BUDGET_RENDER_ORDER.includes('closeLine'));
  assert.deepEqual(runCopyGates({ flags: ['claim 24/7 not provable'] }, copyGateContext({}, [], true, [], { unknownNumberGate: true })), [], 'flags are never gated');
});

test('Ads callouts: code-built from the trust texts of the owner facts, at most 25 characters, no model', () => {
  const templates = codeOwnedFactTemplates();
  if (!templates) return;
  const data = { businessNiche: 'plumber', yearsInField: '18', starRating: '4.9', reviewCount: 40 };
  const callouts = adsCalloutsFromFacts(data);
  const facts = ownerFacts(data, { site: undefined, firstPartyProof: [] }, templates);
  assert.ok(callouts.length >= 1);
  assert.ok(callouts.every(item => [...item].length <= 25));
  assert.equal(callouts[0], trustText(facts.years!, templates));
  assert.deepEqual(adsCalloutsFromFacts({ businessNiche: 'plumber' }), [], 'no facts, no callouts');
});

test('RSA settle: validate, one repair, then drop; never an ellipsis', async () => {
  const data = { businessNiche: 'plumber', yearsInField: '18' };
  const ctx = adsGateContext(data);
  const long = HE_WORD.repeat(10);
  assert.deepEqual(rsaAssetProblems(long, RSA_HEADLINE_MAX, ctx), ['too_long']);
  assert.ok(rsaAssetProblems(`${HE_WORD} 050-1234567`, RSA_HEADLINE_MAX, ctx).includes('phone'));
  assert.ok(rsaAssetProblems(`${HE_WORD}!!`, RSA_HEADLINE_MAX, ctx).includes('punctuation'));
  assert.ok(rsaAssetProblems(`${HE_WORD} 77`, RSA_HEADLINE_MAX, ctx).some(problem => problem.startsWith('gate:gate_unknown_number')));
  let calls = 0;
  const settled = await settleRsaAssets({ headlines: [`${HE_WORD} 18`, long, `${HE_WORD}!!`], descriptions: [`${HE_WORD} ${HE_WORD}`] }, data, {
    ctx,
    callJson: async () => { calls++; return JSON.stringify({ headlines: { 1: `${HE_WORD} ${HE_WORD}`, 2: `${HE_WORD}!!` } }); },
  });
  assert.equal(calls, 1);
  assert.deepEqual(settled.headlines, [`${HE_WORD} 18`, `${HE_WORD} ${HE_WORD}`]);
  assert.deepEqual(settled.dropped.map(item => item.index), [2]);
  assert.ok(settled.headlines.every(text => !text.includes('…')));
});

test('RSA brief: empty fields are skipped, the landing promise is carried', () => {
  const brief = buildRsaBrief({ businessNiche: 'plumber', usp: 'explains every line' });
  assert.doesNotMatch(brief, /undefined/);
  assert.match(brief, /Landing Page Promise: \(built from the USP\) explains every line/);
  assert.match(buildRsaBrief({ businessNiche: 'plumber' }, { landingPagePromise: 'P' }), /Landing Page Promise: P/);
});

const lpCopy = (overrides: Record<string, unknown> = {}) => ({
  heroHeadline: HE_WORD, heroSubheadline: HE_WORD, heroCta: HE_WORD, trustBarItems: [HE_WORD], aboutBlurb: HE_WORD, servicesHeadline: HE_WORD,
  serviceItems: [HE_WORD], faqHeadline: HE_WORD, faqItems: [{ q: HE_WORD, a: HE_WORD }], guaranteeBlock: HE_WORD, reviewFeatured: null, reviewContext: null,
  responseTimeBadge: null, scarcityLine: null, formHeadline: HE_WORD, stickyBarLine: HE_WORD, ...overrides,
});

test('Ads landing copy: Qwen first, Gemini on a Qwen failure; no guarantee -> null block; truth hits get one repair, then drop or throw', async () => {
  const data = { businessNiche: 'plumber', yearsInField: '18' };
  const providers: string[] = [];
  const result = await generateAdsLandingCopy(data, {
    callQwen: async () => { providers.push('q'); throw new Error('down'); },
    callGemini: async (system) => { providers.push('g'); return JSON.stringify(/repairing/.test(system) ? { trustBarItems: [HE_WORD] } : lpCopy({ trustBarItems: [`${HE_WORD} 99`, HE_WORD] })); },
  });
  assert.deepEqual(result.providers, ['gemini:fallback', 'gemini:fallback', 'gemini:fallback']);
  assert.equal(result.copy.guaranteeBlock, null, 'no owner guarantee');
  assert.equal(result.repairs, 1);
  assert.deepEqual(result.copy.trustBarItems, [HE_WORD]);
  await assert.rejects(generateAdsLandingCopy(data, {
    callQwen: async (system) => JSON.stringify(/repairing/.test(system) ? { heroHeadline: `${HE_WORD} 99` } : lpCopy({ heroHeadline: `${HE_WORD} 99` })),
  }), AdsLandingCopyGateError);
  const listDrop = await generateAdsLandingCopy(data, {
    callQwen: async (system) => JSON.stringify(/repairing/.test(system) ? {} : lpCopy({ faqItems: [{ q: HE_WORD, a: `${HE_WORD} 99` }, { q: HE_WORD, a: HE_WORD }] })),
  });
  assert.deepEqual(listDrop.dropped, ['faqItems[0]']);
  assert.equal(listDrop.copy.faqItems.length, 1);
});
