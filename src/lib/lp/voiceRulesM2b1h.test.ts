// Paid-journey v2 M2b.1h (Eitan-approved 2026-11-10): pitch-first generation (one call; the pitch is parsed, stored on the
// page record and never rendered), the direct-response toolkit in the prompt, the free hero shape (anchor gate kept), block
// verbatim / allow restatement (gate_phrase_repeat; the two-word phrase cap relaxed on pitch-first pages), the homepage
// story section (warn-only), and the foreign-script gate.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew values come from src/lib/lp/testdata/m2b1h-ac-bakeoff.json
// (Tamar's bake-off output for the saved ac-repair-1 eval record, copied byte-exact by script) or generationData.ts;
// synthetic letters are escapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { M2A6_PROMPT_RULES, M2B_PROMPT_RULES_AFTER_M2B2, VOICE_PROMPT_RULES } from './generationData';
import { PLURAL_ADDRESS_TOKENS } from './copyGates.config';
import {
  ALWAYS_BLOCKING_RULES,
  blockingGateHits,
  describeGateViolation,
  GATE_RULES,
  PHRASE_REPEAT_MAX_FIELDS,
  PHRASE_REPEAT_MIN_WORDS,
  PITCH_GATE_RULES,
  runCopyGates,
  warningGateHits,
  type CopyGateContext,
} from './copyGates';
import {
  assertBoundedGeneratedSiteCopy,
  briefGateContext,
  buildNoaQaMessage,
  buildPitchFirstSection,
  buildResearchPageGenerationPrompt,
  DIRECT_RESPONSE_TOOLKIT,
  generateResearchPageCopy,
  LEGACY_HERO_SHAPE_LINE,
  optionalFieldWarnings,
  PITCH_FIRST_DROPPED_RULE_IDS,
  PITCH_FIRST_HERO_LINE,
  PITCH_FIRST_RULE_EDITS,
  pitchFirstPage,
  pitchFirstRuleText,
  SITE_COPY_OPTIONAL_PRESENCE_LIMITS,
  storyPage,
  withSystemFields,
  type CopyRepairEvent,
} from './researchPageCopy';
import {
  pageNameWithCity,
  renderResearchedSitePages,
  RESEARCHED_RENDERED_WARN_ONLY_FIELDS,
  RESEARCHED_STORY_FALLBACK_HEADING,
  researchedGatedFieldsFor,
  researchedRenderedFieldsFor,
  type RenderResearchedSitePagesParams,
  type ResearchedSitePage,
} from './researchedSite';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { SiteCopy } from './lpCopyPrompt';
import { DEPTH_BLOCK_KEYS } from './depthBlocks';
import type { PageBrief } from '../site-bot/research/pageBrief';
import type { CollectedData } from '../bot/prompts';
import { setOwnerFactTemplatesForTests } from './ownerFactCopy';

// Copy v2 (2026-11-10): these tests cover the model-written v1 path (kept for the A/B and as the pending fallback), so the
// fact templates are forced pending here. The live code-owned path: ownerFactWiring, promptV2, factRestatement, repetitionBudget.
setOwnerFactTemplatesForTests(null);

const ROOT = path.resolve(__dirname, '../../..');
interface AcFixture {
  collectedData: CollectedData;
  seo: { name: string; city: string; serviceArea: string[] };
  serviceItems: string[];
  pitch: string;
  copy: Partial<SiteCopy> & { trustBarItems: string[]; serviceDetails: Array<{ name: string; description: string }> };
}
const AC: AcFixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/lib/lp/testdata/m2b1h-ac-bakeoff.json'), 'utf8'));
const HEBREW = /[\u0590-\u05FF]/;

// English filler for the fields the bake-off did not write (unrendered or system-set on a research site).
const base: SiteCopy = {
  heroHeadline: 'Hero', heroSubheadline: 'Sub', heroCta: 'Call', trustBarItems: [], aboutBlurb: 'About', servicesHeadline: 'Services',
  serviceItems: [], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: null, reviewFeatured: null, reviewContext: null,
  responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky', aboutPageHeadline: 'About page',
  aboutPageBody: 'About body.', serviceDetails: [],
};
const loose = (copy: Partial<SiteCopy>) => ({ ...base, serviceItems: AC.serviceItems, ...copy }) as unknown as Record<string, unknown>;

function acBrief(pageClass: 'homepage' | 'service_hub' | 'money_service' = 'homepage'): PageBrief {
  const home = pageClass === 'homepage';
  return {
    page: { id: home ? 'home' : pageClass === 'service_hub' ? 'hub' : 'svc-ac-repair', targetPath: home ? '/' : pageClass === 'service_hub' ? '/services' : '/services/ac-repair', pageClass },
    persona: { id: 'persona', value: 'Local customer' }, waoOffer: { id: 'offer', value: 'offer' },
    targetQueries: [], approvedEntityAnchors: [{ id: 'entity-1', value: 'x' }], firstPartyProof: [],
    assertableLocalFacts: [], customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [],
    links: home ? [{ targetPath: '/services/ac-repair', relationship: 'service_child', evidenceIds: ['entity-1'] }] : [],
    faqPolicy: 'none', faqCandidates: [],
    site: {
      pageName: pageClass === 'money_service' ? AC.serviceItems[0] : AC.seo.name, relevanceTerm: AC.seo.name, city: AC.seo.city,
      serviceArea: AC.seo.serviceArea, serviceLabels: AC.serviceItems, serviceSources: ['AC repair', 'AC installation', 'AC cleaning'],
      businessName: String(AC.collectedData.businessName), soloOperator: true, ownerIntroPage: home,
    },
  } as unknown as PageBrief;
}
const acCtx = (pageClass: 'homepage' | 'service_hub' | 'money_service' = 'homepage'): CopyGateContext => briefGateContext(acBrief(pageClass), AC.collectedData);
const repeatHits = (copy: Record<string, unknown>, ctx: CopyGateContext) => runCopyGates(copy, ctx).filter(hit => hit.rule === GATE_RULES.phraseRepeat);
/** Every unit (field; the trust bar is one) whose text holds the phrase. */
const fieldsHolding = (copy: Record<string, unknown>, phrase: string) => {
  const units = new Set<string>();
  for (const [key, value] of Object.entries(copy)) {
    if (typeof value === 'string' && value.includes(phrase)) units.add(key);
    if (Array.isArray(value)) value.forEach((item, index) => {
      if (typeof item === 'string' && item.includes(phrase)) units.add(key);
      if (item && typeof item === 'object' && Object.values(item).some(inner => typeof inner === 'string' && inner.includes(phrase))) units.add(`${key}[${index}]`);
    });
  }
  return units;
};

test('M2b.1h 1: the repetition gate: the AC bake-off (one phrase in 3+ rendered fields) fails; a fresh-words restatement passes', () => {
  const ctx = acCtx();
  // The AC case: Tamar's bake-off homepage copy, byte-exact.
  const ac = loose(AC.copy);
  const phrase = AC.copy.trustBarItems[0];
  assert.equal(phrase.split(/\s+/).length, PHRASE_REPEAT_MIN_WORDS, 'the repeated proof line is itself a 4-word run');
  assert.ok(fieldsHolding(ac, phrase).size > PHRASE_REPEAT_MAX_FIELDS, 'the fixture really repeats it in more than two fields');
  const hits = repeatHits(ac, ctx);
  assert.ok(hits.length > 0, 'AC case fails');
  assert.ok(blockingGateHits(hits, ctx).length > 0, 'on gated (rendered) fields, so the page fails');
  assert.ok(hits.some(hit => describeGateViolation(hit, ctx).includes(JSON.stringify(phrase))), 'the repair prompt names the repeated phrase');
  for (const hit of hits) assert.match(hit.actual ?? '', /^phrase_repeat:\d+$/, 'config id only, never copy text');

  // The same promise in four fields, each time in its own words, with the verbatim proof line in exactly two: passes.
  const fresh = loose({ heroHeadline: AC.copy.heroHeadline, trustBarItems: AC.copy.trustBarItems, aboutPageBody: AC.copy.aboutPageBody, formHeadline: AC.copy.formHeadline });
  assert.equal(fieldsHolding(fresh, phrase).size, PHRASE_REPEAT_MAX_FIELDS);
  assert.deepEqual(repeatHits(fresh, ctx), []);

  // The required search anchor (trade + city) in several fields is never a repeat; nor is a service label + town.
  const anchor = pageNameWithCity(AC.seo.name, AC.seo.city);
  const card = pageNameWithCity(AC.serviceItems[0], AC.seo.city);
  assert.deepEqual(repeatHits(loose({ heroHeadline: anchor, heroSubheadline: anchor, formHeadline: anchor, aboutPageHeadline: card, aboutPageBody: card, trustBarItems: [card] }), ctx), []);

  // Gate order: gated fields first, so a warn-only story field never pushes a gated field over the cap; the story itself warns.
  const story = loose({ trustBarItems: [phrase], formHeadline: AC.copy.formHeadline, storyBody: phrase } as Partial<SiteCopy>);
  const storyHits = repeatHits(story, ctx);
  assert.deepEqual(storyHits.map(hit => hit.field), ['storyBody']);
  assert.deepEqual(blockingGateHits(storyHits, ctx), []);
  assert.equal(warningGateHits(storyHits, ctx).length, 1);
  // Money pages are gated too (verbatim repeats are blocked everywhere), over the fields they render.
  const money = acCtx('money_service');
  assert.ok(blockingGateHits(repeatHits(loose({ heroSubheadline: phrase, trustBarItems: [phrase], formHeadline: AC.copy.formHeadline }), money), money).length > 0);
  // Legacy sites (no research context) are unchanged.
  assert.deepEqual(repeatHits(ac, { ...ctx, researchSite: false }), []);
});

test('M2b.1h 2: restatement is allowed: the two-word phrase cap is a warning on pitch-first pages only; the digit cap still blocks', () => {
  const home = acCtx();
  const hub = acCtx('service_hub');
  const money = acCtx('money_service');
  assert.equal(home.promiseRestatement, true);
  assert.equal(hub.promiseRestatement, true);
  assert.ok(!money.promiseRestatement);
  // The bake-off says the promise (fixed price) in the hero, the subheadline, the trust bar and the form: four fields.
  const copy = loose({ heroHeadline: AC.copy.heroHeadline, heroSubheadline: AC.copy.heroSubheadline, trustBarItems: AC.copy.trustBarItems, formHeadline: AC.copy.formHeadline });
  const phraseCap = (ctx: CopyGateContext) => runCopyGates(copy, ctx).filter(hit => hit.rule === GATE_RULES.factRepeat && (hit.actual ?? '').startsWith('phrase:'));
  assert.ok(phraseCap(money).length > 0 && blockingGateHits(phraseCap(money), money).length > 0, 'money page: the cap still blocks');
  assert.ok(phraseCap(home).length > 0, 'homepage: still counted (logged)');
  assert.deepEqual(blockingGateHits(phraseCap(home), home), [], 'homepage: a warning, never a failure');
  // The digit cap is untouched: a number in four rendered fields still fails a pitch-first page.
  const digits = loose({ heroSubheadline: '10 a', trustBarItems: ['10 b'], formHeadline: '10 c', aboutPageHeadline: '10 d', aboutPageBody: '10 e.' });
  assert.ok(blockingGateHits(runCopyGates(digits, home), home).some(hit => hit.rule === GATE_RULES.factRepeat && (hit.actual ?? '').startsWith('fact:')));
});

test('M2b.1h 3: the hero pattern is no longer forced; the anchor-word gate still holds', () => {
  const data = AC.collectedData;
  const homePrompt = buildResearchPageGenerationPrompt(acBrief(), data);
  const moneyPrompt = buildResearchPageGenerationPrompt(acBrief('money_service'), data);
  for (const prompt of [homePrompt, moneyPrompt]) {
    assert.ok(!prompt.includes('<hook>') && !prompt.includes('<differentiator>'), 'the forced pattern is gone');
    assert.ok(prompt.includes('heroHeadline MUST contain'), 'the anchor requirement stays');
  }
  // Pitch-first pages: the hero-shape rules R7 / R8 and the legacy shape line drop; the headline carries the promise.
  for (const id of PITCH_FIRST_DROPPED_RULE_IDS) {
    const rule = M2A6_PROMPT_RULES.find(item => item.id === id)!;
    assert.ok(!homePrompt.includes(rule.text), `home drops ${id}`);
    assert.ok(moneyPrompt.includes(rule.text), `money keeps ${id}`);
  }
  assert.ok(!homePrompt.includes(LEGACY_HERO_SHAPE_LINE) && homePrompt.includes(PITCH_FIRST_HERO_LINE));
  assert.ok(moneyPrompt.includes(LEGACY_HERO_SHAPE_LINE));
  assert.match(homePrompt, /heroHeadline carries the one big promise\. It has no fixed shape/);
  // The gate: a promise-first headline with the anchor (no hook, no question) passes; the promise alone, without it, fails.
  const ctx = acCtx();
  const anchorHits = (headline: string) => runCopyGates(loose({ heroHeadline: headline }), ctx).filter(hit => hit.rule === GATE_RULES.heroAnchor).map(hit => hit.actual);
  assert.ok(!AC.copy.heroHeadline!.includes('?'), 'the bake-off hero has no hook question');
  assert.deepEqual(anchorHits(AC.copy.heroHeadline!), []);
  assert.deepEqual(anchorHits(AC.copy.trustBarItems[0]), ['missing:both']);
  assert.ok(blockingGateHits(runCopyGates(loose({ heroHeadline: AC.copy.trustBarItems[0] }), ctx), ctx).some(hit => hit.rule === GATE_RULES.heroAnchor));
  // The repair keeps the promise and fits the anchor in naturally (no "keep the hook" instruction).
  const repair = describeGateViolation({ field: 'heroHeadline', rule: GATE_RULES.heroAnchor, actual: 'missing:both' }, ctx);
  assert.ok(repair.includes('where they read naturally') && !repair.includes('hook'));
});

test('M2b.1h 4: the prompt: PITCH FIRST (English, the 8-point toolkit, decisions first) on homepage + hub only; pitch is the first key; the cap edits apply', () => {
  const data = AC.collectedData;
  const home = buildResearchPageGenerationPrompt(acBrief(), data);
  const hub = buildResearchPageGenerationPrompt(acBrief('service_hub'), data);
  const money = buildResearchPageGenerationPrompt(acBrief('money_service'), data);
  assert.ok(pitchFirstPage(acBrief()) && pitchFirstPage(acBrief('service_hub')) && !pitchFirstPage(acBrief('money_service')));
  assert.ok(storyPage(acBrief()) && !storyPage(acBrief('service_hub')) && !storyPage(acBrief('money_service')));
  const section = buildPitchFirstSection(acBrief());
  assert.ok(home.includes(section) && hub.includes(buildPitchFirstSection(acBrief('service_hub'))));
  assert.ok(!money.includes('PITCH FIRST'));
  // English only: no Hebrew in the section, the toolkit or the rule edits (no Hebrew example lines anywhere).
  assert.doesNotMatch(section, HEBREW);
  assert.equal(DIRECT_RESPONSE_TOOLKIT.length, 8);
  for (const line of DIRECT_RESPONSE_TOOLKIT) assert.doesNotMatch(line, HEBREW);
  for (const edits of Object.values(PITCH_FIRST_RULE_EDITS)) for (const [, to] of edits) assert.doesNotMatch(to, HEBREW);
  assert.ok(section.indexOf('awareness stage') < section.indexOf('The toolkit') && section.includes('one big promise') && section.includes('unique mechanism'));
  assert.match(section, /Process for this page: first write the whole pitch as one free-flowing short sales letter/);
  assert.match(section, /never reuse the same phrase/);
  // Story lines on the homepage only.
  assert.ok(section.includes('storyBody') && !buildPitchFirstSection(acBrief('service_hub')).includes('storyBody'));
  // The schema: pitch first; the story keys after the subheadline (homepage); the key list and limits agree.
  assert.ok(home.indexOf('"pitch": ""') >= 0 && home.indexOf('"pitch": ""') < home.indexOf('"heroHeadline": ""'));
  assert.ok(home.includes('"heroSubheadline": "",\n  "storyHeadline": "",\n  "storyBody": "",'));
  assert.match(home, /Output exactly these keys and no others, with pitch first: pitch, heroHeadline, [^\n]*serviceDetails, storyHeadline, storyBody, closeLine, flags\./);
  assert.match(hub, /Output exactly these keys and no others, with pitch first: pitch, heroHeadline, [^\n]*serviceDetails, closeLine, flags\./);
  assert.ok(!hub.includes('"storyBody"') && !money.includes('"pitch"'));
  // The count caps are relaxed by asserted edits (each anchor unique); the original wording no longer reaches these prompts.
  for (const rule of [...VOICE_PROMPT_RULES, ...M2A6_PROMPT_RULES, ...M2B_PROMPT_RULES_AFTER_M2B2]) {
    const edits = PITCH_FIRST_RULE_EDITS[rule.id];
    if (!edits || PITCH_FIRST_DROPPED_RULE_IDS.includes(rule.id)) continue;
    assert.ok(hub.includes(pitchFirstRuleText(rule)), `hub ${rule.id} edited`);
    for (const [from] of edits) assert.ok(!hub.includes(from) && money.includes(from) === money.includes(rule.text), `${rule.id}: ${from.slice(0, 30)}`);
  }
  assert.throws(() => pitchFirstRuleText({ id: 'B1', text: 'changed' }), /M2b\.1h pitch-first edit/);
});

test('M2b.1h 5: pitch is parsed in the same call, stored, hidden from Noa, and never rendered', async () => {
  const brief = acBrief();
  // A pitch without the bake-off's hours sentence (hours are a truth gate; see test 6).
  const pitch = AC.pitch.split(/(?<=[.!?])\s+/).filter(sentence => !/\d{2}:\d{2}/.test(sentence)).join(' ');
  assert.ok(pitch.length > 100 && HEBREW.test(pitch));
  const tamarJson = { pitch, ...base, serviceItems: AC.serviceItems, heroHeadline: AC.copy.heroHeadline, storyHeadline: 'Story', storyBody: AC.copy.aboutPageBody };
  const calls: Array<{ system: string; user: string }> = [];
  const events: CopyRepairEvent[] = [];
  const result = await generateResearchPageCopy(brief, AC.collectedData, {
    gates: false,
    onEvent: event => events.push(event),
    callJson: async (system, user) => {
      calls.push({ system, user });
      return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : tamarJson);
    },
  });
  assert.equal(calls.length, 2, 'one Tamar call and one Noa call: no second generation call');
  assert.equal(result.pitch, pitch, 'stored from the same call');
  assert.equal(result.storyBody, AC.copy.aboutPageBody);
  assert.ok(!calls[1].user.includes('"pitch"') && !calls[1].user.includes(pitch), 'Noa never sees the pitch');
  assert.ok(calls[1].user.includes('"storyBody"'), 'Noa corrects the story');
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy(result));
  // Shape notes are warnings (word count here: the trimmed pitch is short), never repairs.
  assert.ok(events.some(event => event.kind === 'warnings' && event.violations?.some(item => item.field === 'pitch' && item.rule === 'word_count')));
  assert.ok(!events.some(event => event.kind === 'repair'));
  // A page record with the pitch renders without it.
  const home: ResearchedSitePage = { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: result, pitch, seo: AC.seo };
  const html = renderResearchedSitePages(renderParams([home]));
  for (const body of Object.values(html)) assert.ok(!body.includes(pitch), 'never rendered');
  // Records saved before M2b.1h (no pitch / story keys) still validate.
  const { pitch: _p, storyHeadline: _h, storyBody: _b, ...old } = result;
  void _p; void _h; void _b;
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy(old));
  assert.throws(() => assertBoundedGeneratedSiteCopy({ ...old, storyBody: 'x'.repeat(SITE_COPY_OPTIONAL_PRESENCE_LIMITS.storyBody + 1) }));
  assert.throws(() => assertBoundedGeneratedSiteCopy({ ...old, unknownKey: 'x' }));
});

test('M2b.1h 6: the pitch is excluded from the copy gates except the truth / foreign-script checks', () => {
  const ctx = acCtx();
  const page = loose({ heroHeadline: AC.copy.heroHeadline, trustBarItems: AC.copy.trustBarItems, aboutPageBody: AC.copy.aboutPageBody });
  const without = runCopyGates(page, ctx);
  const withPitch = runCopyGates({ ...page, pitch: AC.pitch }, ctx);
  // The page's own hits are identical: the pitch never enters a page count (phrase, fact, signature, before) or a page gate.
  assert.deepEqual(withPitch.filter(hit => hit.field !== 'pitch'), without);
  const pitchHits = withPitch.filter(hit => hit.field === 'pitch');
  assert.ok(pitchHits.every(hit => PITCH_GATE_RULES.includes(hit.rule)), 'only truth / foreign-script rules');
  assert.ok(pitchHits.some(hit => hit.rule === GATE_RULES.hours), 'the bake-off pitch writes clock hours: a truth hit');
  assert.deepEqual(blockingGateHits(pitchHits, ctx), pitchHits, 'truth hits on the pitch block (and are repaired)');
  // Foreign script: a CJK or Cyrillic character fails any generated field, the pitch included; Latin names are fine.
  assert.ok(ALWAYS_BLOCKING_RULES.includes(GATE_RULES.foreignScript) && PITCH_GATE_RULES.includes(GATE_RULES.foreignScript));
  for (const letter of ['\u4E2D', '\u0436', '\u0639']) {
    const hits = runCopyGates({ ...page, heroSubheadline: `${AC.copy.heroSubheadline} ${letter}`, pitch: `${letter} ${AC.copy.aboutPageBody}` }, ctx).filter(hit => hit.rule === GATE_RULES.foreignScript);
    assert.deepEqual(hits.map(hit => hit.field).sort(), ['heroSubheadline', 'pitch']);
  }
  assert.deepEqual(runCopyGates({ ...page, heroSubheadline: 'TEST AC Repair' }, ctx).filter(hit => hit.rule === GATE_RULES.foreignScript), []);
});

test('M2b.1h 7: the story fields: homepage only, warn-only (truth gates still block), dropped when invalid, logged', () => {
  // Content depth (2026-11-10) appends the service-page block fields, warn-only like the story.
  assert.deepEqual([...RESEARCHED_RENDERED_WARN_ONLY_FIELDS], ['storyHeadline', 'storyBody', ...DEPTH_BLOCK_KEYS]);
  assert.ok(researchedRenderedFieldsFor('homepage').includes('storyBody') && !researchedGatedFieldsFor('homepage').includes('storyBody'));
  for (const pageClass of ['service_hub', 'money_service']) assert.ok(!researchedRenderedFieldsFor(pageClass).includes('storyBody'), pageClass);
  const brief = acBrief();
  const settle = (copy: Partial<SiteCopy>, target = brief) => withSystemFields(loose(copy), target, AC.collectedData);
  // Off the homepage the keys are removed; on it an over-limit value is dropped whole (never edited), and a period is added.
  assert.ok(!('storyBody' in settle({ storyBody: AC.copy.aboutPageBody }, acBrief('service_hub'))));
  assert.ok(!('pitch' in settle({ pitch: AC.pitch }, acBrief('money_service'))));
  assert.equal(settle({ storyBody: 'x'.repeat(SITE_COPY_OPTIONAL_PRESENCE_LIMITS.storyBody + 1) }).storyBody, null);
  assert.equal(settle({ storyHeadline: 'x'.repeat(SITE_COPY_OPTIONAL_PRESENCE_LIMITS.storyHeadline + 1) }).storyHeadline, null);
  assert.equal(settle({ storyBody: 'One. Two. Three' }).storyBody, 'One. Two. Three.');
  assert.equal(settle({ storyHeadline: 'Title.' }).storyHeadline, 'Title');
  assert.ok(!('storyBody' in settle({})), 'an absent key stays absent');
  // Shape notes: missing, over the limit, and the sentence count (3 to 5).
  const notes = (raw: Record<string, unknown>) => optionalFieldWarnings(raw, brief, 'tamar').map(item => `${item.field}:${item.rule}`);
  assert.deepEqual(notes({ pitch: AC.pitch, storyBody: 'One. Two. Three.' }), []);
  assert.deepEqual(notes({ pitch: AC.pitch, storyBody: 'One. Two.' }), ['storyBody:sentence_count']);
  assert.deepEqual(notes({ storyBody: 'x'.repeat(400) }), ['pitch:missing', 'storyBody:max_length']);
  assert.deepEqual(optionalFieldWarnings({}, brief, 'noa').map(item => item.field), ['storyBody'], 'Noa never sees the pitch');
  // Gating: a voice hit in the story is a warning; a truth hit (foreign script) fails the page.
  const ctx = acCtx();
  const storyHits = (body: string) => runCopyGates(loose({ storyBody: body } as Partial<SiteCopy>), ctx).filter(hit => hit.field === 'storyBody');
  const plural = storyHits(`${AC.copy.aboutPageBody} ${PLURAL_ADDRESS_TOKENS[0].token}`);
  const pluralHits = plural.filter(hit => hit.rule === GATE_RULES.plural);
  assert.ok(pluralHits.length > 0 && blockingGateHits(pluralHits, ctx).length === 0 && warningGateHits(pluralHits, ctx).length === pluralHits.length, 'voice: warning');
  assert.ok(blockingGateHits(storyHits(`${AC.copy.aboutPageBody} \u4E2D`), ctx).some(hit => hit.rule === GATE_RULES.foreignScript), 'truth: blocks');
});

const contrast = (a: string, b: string) => {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function renderParams(pages: ResearchedSitePage[], theme = VERTICAL_THEMES['emergency-trades']): RenderResearchedSitePagesParams {
  return {
    theme, assets: VERTICAL_ASSETS['emergency-trades'],
    data: { businessName: 'Test Business', businessNiche: 'plumber', phone: '050-0000000' },
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il', pages,
    graphEdges: pages.length > 1 ? pages.slice(1).map(page => ({ fromId: 'home', toId: page.opportunityId })) : [],
  };
}

test('M2b.1h 8: the story section renders on the homepage only, between the hero and the services section, and not without a body', () => {
  const english: SiteCopy = { ...base, serviceItems: ['Alpha'], serviceDetails: [{ name: 'Alpha', description: 'Alpha description.' }] };
  const home = (copy: Partial<SiteCopy>): ResearchedSitePage => ({ opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: { ...english, ...copy } });
  const hub: ResearchedSitePage = { opportunityId: 'hub', classification: 'service_hub', targetPath: '/services', copy: { ...english, storyHeadline: 'Hub story', storyBody: 'Hub story body.' } };
  const pages = renderResearchedSitePages(renderParams([home({ storyHeadline: 'Story title', storyBody: 'Story body one. Two. Three.' }), hub]));
  const index = pages['index.html'];
  const story = index.indexOf('<section id="story" data-section="story" aria-labelledby="story-heading"');
  assert.ok(story > 0, 'rendered, labelled by its H2');
  assert.match(index, /<h2 id="story-heading" style="[^"]*">Story title<\/h2><p [^>]*>Story body one\. Two\. Three\.<\/p>/);
  assert.ok(index.indexOf('</h1>') < story && story < index.indexOf('id="services"'), 'between the hero and the services section');
  assert.ok(!pages['services.html'].includes('data-section="story"'), 'homepage only');
  // Theme tokens only, no fixed Hebrew UI string, readable measure; contrast of the body text on its background.
  const theme = VERTICAL_THEMES['emergency-trades'];
  const section = index.slice(story, index.indexOf('</section>', story));
  assert.ok(section.includes(`background:${theme.surfaceAlt}`) && section.includes(`color:${theme.textPrimary}`) && section.includes('max-width:640px'));
  assert.doesNotMatch(section, HEBREW);
  for (const [name, item] of Object.entries(VERTICAL_THEMES)) assert.ok(contrast(item.textPrimary, item.surfaceAlt) >= 4.5, `${name}: textPrimary on surfaceAlt`);
  // No headline: the Noa-approved fallback label names the section through a visually hidden H2; text escaped.
  assert.ok(typeof RESEARCHED_STORY_FALLBACK_HEADING === 'string' && RESEARCHED_STORY_FALLBACK_HEADING.trim().length > 0);
  const bare = renderResearchedSitePages(renderParams([home({ storyHeadline: null, storyBody: 'Body <b>' })]))['index.html'];
  assert.ok(bare.includes(`<section id="story" data-section="story" aria-labelledby="story-heading" style="`));
  assert.ok(bare.includes(`<h2 id="story-heading" class="sr-only">${RESEARCHED_STORY_FALLBACK_HEADING}</h2><p `));
  assert.match(bare, /<p [^>]*>Body &lt;b&gt;<\/p>/);
  // Absent when the field is missing: a record without story keys (before M2b.1h), a null or blank body.
  const old = renderResearchedSitePages(renderParams([home({})]))['index.html'];
  assert.ok(!old.includes('data-section="story"'));
  for (const copy of [{ storyBody: null, storyHeadline: 'Orphan' }, { storyBody: '  ' }]) {
    assert.equal(renderResearchedSitePages(renderParams([home(copy)]))['index.html'], old, 'byte-identical to the old record');
  }
});

test('M2b.1h 9: Noa message and the hard limits: story keys for Noa on the homepage, never the pitch', () => {
  const copy = { ...base, serviceItems: AC.serviceItems, pitch: AC.pitch, storyHeadline: 'S', storyBody: 'B.' } as SiteCopy;
  const noa = buildNoaQaMessage(copy, acBrief());
  assert.ok(!noa.includes('"pitch"') && !noa.includes(AC.pitch));
  assert.match(noa, /Output exactly these keys and no others: heroHeadline, [^\n]*storyHeadline, storyBody\./);
  assert.ok(noa.includes(`storyBody: max ${SITE_COPY_OPTIONAL_PRESENCE_LIMITS.storyBody} characters when set`));
});
