// Paid-journey v2 M2a.7: warn-only gates on fields the research renderer does not show yet (Eitan-approved until M2b),
// Tamar's section 20 edits (hero-cap concepts with the service-label mask, English differentiator keywords, before cap 3,
// R8), Noa's promoted / typo gates and section 21 (the name-intro position rule).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew values come from generationData.ts (scripted copy of
// docs/copy/site-bot-generation-data.md); synthetic letter sequences are escapes and contain no gate token.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  BARE_VERB_SENTENCE_OPENERS,
  CLAIM_TOKENS,
  DIFFERENTIATOR_CAP,
  DIFFERENTIATOR_EXCLUDED_GROUPS,
  DIFFERENTIATOR_USP_KEYWORDS,
  EXTRA_GATE_FIELDS,
  GUARD_TOKEN_SOURCES,
  HERO_CAP_AC_ONLY,
  HERO_CAP_CONCEPT_ADDITIONS,
  M2A6_PROMPT_RULES,
  NAME_INTRO_LEAD_INS,
  NAME_INTRO_TOKEN,
  PREPOSITION_PAIR_NEXT_LETTER,
  PREPOSITION_PROMPT_LINE,
  PREPOSITION_SKIP_ADVERBS,
  SIGNATURE_WORD_TOKENS,
  SUBJECT_CARRY_TOKENS,
  TRADE_TERMS,
  WRONG_PREPOSITION_TOKENS,
} from './generationData';
import {
  ALWAYS_BLOCKING_RULES,
  bareVerbOpenerHits,
  blockingGateHits,
  copyGateContext,
  currentHeroCapFacts,
  differentiatorGroups,
  DIFFERENTIATOR_SIGNATURE_CAP,
  GATE_RULES,
  heroCapGroups,
  heroSignatureCapGroups,
  isWarningHit,
  NAME_OPENER,
  runCopyGates,
  tradeTermHits,
  tripledLetterHit,
  warningGateHits,
  WARNING_ONLY_RULES,
  wrongPrepositionHits,
  type CopyGateContext,
} from './copyGates';
import {
  briefGateContext,
  buildResearchPageGenerationPrompt,
  gateViolations,
  gateWarnings,
  generateResearchPageCopy,
  heroCapFacts,
  tradeTermLine,
} from './researchPageCopy';
import { RESEARCHED_GATED_FIELDS, RESEARCHED_HOME_HUB_ONLY_FIELDS, RESEARCHED_RENDERED_FIELDS, RESEARCHED_RENDERED_WARN_ONLY_FIELDS, researchedGatedFieldsFor } from './researchedSite';
import type { SiteCopy } from './lpCopyPrompt';
import { DEPTH_BLOCK_KEYS } from './depthBlocks';
import { siteGenerationContext } from '../site-bot/researchedSiteGeneration';
import type { PageBrief } from '../site-bot/research/pageBrief';

const ROOT = path.resolve(__dirname, '../../..');
const DATA_FILE = path.join(ROOT, 'docs/copy/site-bot-generation-data.md');
const BET = '\u05D1';
const VAV = '\u05D5';
// Synthetic Hebrew-script letter sequences (test data, not copy; contain no gate token).
const HE_WORD = '\u05D0\u05D1\u05D2\u05D3';
const W1 = '\u05D0\u05D1\u05D2';
const W2 = '\u05D3\u05D4\u05D6';
const W3 = '\u05D7\u05D8\u05D9\u05DA';
const LABEL = '\u05D2\u05D3\u05D4 \u05D6\u05D7\u05D8';
const CARRY = SUBJECT_CARRY_TOKENS.find(token => token !== NAME_INTRO_TOKEN)!;

const base: SiteCopy = {
  heroHeadline: LABEL, heroSubheadline: 'Sub', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: [], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Promise',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form',
  stickyBarLine: 'Sticky', aboutPageHeadline: 'About page', aboutPageBody: 'About body', serviceDetails: [],
};
const loose = (copy: Partial<SiteCopy>) => ({ ...base, ...copy }) as unknown as Record<string, unknown>;
const vctx = (overrides: Partial<CopyGateContext> = {}): CopyGateContext => ({ ...copyGateContext({}, [], true, [], { researchSite: true }), ...overrides });
const rulesOf = (copy: Record<string, unknown>, gates: CopyGateContext, rule: string) =>
  runCopyGates(copy, gates).filter(hit => hit.rule === rule).map(hit => `${hit.field}=${hit.actual}`);

function brief(slug: string, pageClass = 'money_service', pageName = LABEL, serviceLabels: string[] = [LABEL]): PageBrief {
  return {
    page: { id: pageClass === 'homepage' ? 'home' : 'svc', targetPath: pageClass === 'homepage' ? '/' : `/services/${slug}`, pageClass },
    persona: { id: 'persona', value: 'Local customer' }, waoOffer: { id: 'offer', value: 'offer' },
    targetQueries: [], approvedEntityAnchors: [{ id: 'entity-1', value: 'x' }], firstPartyProof: [],
    assertableLocalFacts: [], customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [],
    links: pageClass === 'homepage' ? [{ targetPath: `/services/${slug}`, relationship: 'service_child', evidenceIds: ['entity-1'] }] : [],
    faqPolicy: 'none', faqCandidates: [],
    site: { pageName, relevanceTerm: pageName, city: null, serviceArea: [], serviceLabels, serviceSources: serviceLabels.map(() => slug), businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: pageClass === 'homepage' },
  };
}

test('M2a.7 1: generationData carries the M2a.7 data byte-exact and counted; R8 and the preposition line reach the prompt; --check passes', () => {
  const text = fs.readFileSync(DATA_FILE, 'utf8');
  const data = Object.assign({}, ...[...text.matchAll(/\n~~~json\n([\s\S]*?)\n~~~/g)].map(match => JSON.parse(match[1])));
  const same = (actual: unknown, expected: unknown) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
  same(HERO_CAP_CONCEPT_ADDITIONS, data.heroCapConceptAdditions);
  same(DIFFERENTIATOR_USP_KEYWORDS, data.differentiatorUspKeywords);
  same(PREPOSITION_SKIP_ADVERBS, data.prepositionSkipAdverbs);
  same(WRONG_PREPOSITION_TOKENS, data.wrongPrepositionTokens);
  same(NAME_INTRO_LEAD_INS, data.nameIntroLeadIns);
  assert.equal(NAME_INTRO_TOKEN, data.nameIntroToken);
  assert.equal(NAME_INTRO_TOKEN, NAME_OPENER, 'section 21 opener is the prompt template opener');
  assert.deepEqual([Object.keys(HERO_CAP_CONCEPT_ADDITIONS).length, Object.values(HERO_CAP_CONCEPT_ADDITIONS).flat().length, HERO_CAP_AC_ONLY.length], [5, 17, 5]);
  assert.deepEqual([Object.keys(DIFFERENTIATOR_USP_KEYWORDS).length, Object.values(DIFFERENTIATOR_USP_KEYWORDS).flat().length], [8, 62]);
  assert.deepEqual([PREPOSITION_SKIP_ADVERBS.length, WRONG_PREPOSITION_TOKENS.length, NAME_INTRO_LEAD_INS.length], [3, 3, 5]);
  assert.ok(HERO_CAP_AC_ONLY.every(entry => HERO_CAP_CONCEPT_ADDITIONS.fromTheRoot.includes(entry)));
  assert.deepEqual([DIFFERENTIATOR_CAP, DIFFERENTIATOR_SIGNATURE_CAP], [2, 2]);
  assert.deepEqual([...DIFFERENTIATOR_EXCLUDED_GROUPS], ['exactly']);
  assert.deepEqual([...EXTRA_GATE_FIELDS], ['servicesHeadline']);
  assert.equal(PREPOSITION_PAIR_NEXT_LETTER, BET);
  const prep = TRADE_TERMS.find(entry => entry.id === 'services_headline_preposition')!;
  const water = TRADE_TERMS.find(entry => entry.id === 'water_flows_again')!;
  assert.deepEqual([prep.type, prep.match, water.type, water.match], ['gate', 'note', 'gate', 'note']);
  assert.equal(prep.replacementPair, data.tradeTermTokens.find((entry: { id: string }) => entry.id === prep.id).replacementPair);
  assert.ok(tradeTermLine(false).includes(JSON.stringify(prep.replacementPair)));
  const r8 = M2A6_PROMPT_RULES.find(rule => rule.id === 'R8')!;
  assert.equal(r8.text.split('\n').length, 6);
  const prompt = buildResearchPageGenerationPrompt(brief('leak-detection'), { businessNiche: 'plumber' });
  assert.ok(prompt.includes(r8.text) && prompt.includes(PREPOSITION_PROMPT_LINE));
  for (const key of ['heroCapConceptAdditions', 'differentiatorUspKeywords', 'prepositionSkipAdverbs', 'wrongPrepositionTokens']) assert.match(GUARD_TOKEN_SOURCES[key] ?? '', /section 20\. /, key);
  assert.match(GUARD_TOKEN_SOURCES.nameIntro ?? '', /section 21\. /);
  assert.equal(execFileSync('node', [path.join(ROOT, 'scripts/site-bot/build-generation-data.mjs'), '--check'], { encoding: 'utf8' }).trim(), 'generationData.ts up to date');
});

test('M2a.7 2: warn-only: a hit on a field the research renderer does not show is a warning (no repair, page passes); fact / trust gates and rendered fields still fail; legacy unchanged', async () => {
  // M2b.1: the renderer shows more fields; the gate context gets the rendered fields minus the warn-only set.
  assert.deepEqual([...RESEARCHED_RENDERED_FIELDS], ['heroHeadline', 'heroSubheadline', 'formHeadline', 'faqItems', 'reviewFeatured', 'reviewContext', 'heroCta', 'trustBarItems', 'aboutPageHeadline', 'aboutPageBody', 'servicesHeadline', 'serviceDetails', 'storyHeadline', 'storyBody', ...DEPTH_BLOCK_KEYS]);
  // M2b.1f (eval 18/18): every M2b field is gated. M2b.1h: the new homepage story section is warn-only until its paid eval.
  // Content depth (2026-11-10): the service-page block fields are rendered and warn-only, like the story.
  assert.deepEqual([...RESEARCHED_RENDERED_WARN_ONLY_FIELDS], ['storyHeadline', 'storyBody', ...DEPTH_BLOCK_KEYS]);
  assert.deepEqual([...RESEARCHED_GATED_FIELDS], RESEARCHED_RENDERED_FIELDS.filter(field => !field.startsWith('story') && !DEPTH_BLOCK_KEYS.includes(field)));
  const site = briefGateContext(brief('leak-detection'), {});
  // A money page renders (and generates) none of the home/hub-only fields.
  assert.deepEqual(site.renderedFields, RESEARCHED_GATED_FIELDS.filter(field => !RESEARCHED_HOME_HUB_ONLY_FIELDS.includes(field)));
  const hubSite = briefGateContext(brief('services', 'service_hub'), {});
  assert.deepEqual(hubSite.renderedFields, [...RESEARCHED_GATED_FIELDS]);
  // The warn-only mechanism (kept for future voice rounds), via an injected list: a voice hit on a rendered field held
  // warn-only is a warning; with the default (empty) list it blocks; fact / trust gates block either way.
  const heldHub = { renderedFields: researchedGatedFieldsFor('service_hub', ['serviceDetails']) };
  assert.ok(!heldHub.renderedFields.includes('serviceDetails') && heldHub.renderedFields.includes('aboutPageBody'));
  assert.equal(isWarningHit({ field: 'serviceDetails[0].description', rule: GATE_RULES.beforeCap }, heldHub), true);
  assert.equal(isWarningHit({ field: 'serviceDetails[0].description', rule: GATE_RULES.beforeCap }, hubSite), false);
  for (const rule of ALWAYS_BLOCKING_RULES) assert.equal(isWarningHit({ field: 'serviceDetails[0].description', rule }, heldHub), false, rule);
  assert.equal(isWarningHit({ field: 'aboutBlurb', rule: GATE_RULES.signatureRepeat }, site), true);
  assert.equal(isWarningHit({ field: 'serviceDetails[2].description', rule: GATE_RULES.beforeCap }, site), true);
  assert.equal(isWarningHit({ field: 'heroSubheadline', rule: GATE_RULES.signatureRepeat }, site), false);
  for (const rule of ALWAYS_BLOCKING_RULES) assert.equal(isWarningHit({ field: 'trustBarItems[0]', rule }, site), false, rule);
  for (const rule of [GATE_RULES.inventedStory, GATE_RULES.claim, GATE_RULES.serviceArea, GATE_RULES.nameSpelling]) assert.ok(ALWAYS_BLOCKING_RULES.includes(rule), rule);
  for (const rule of WARNING_ONLY_RULES) assert.equal(isWarningHit({ field: 'heroHeadline', rule }, site), true, `${rule} is warning-only everywhere`);
  assert.equal(isWarningHit({ field: 'aboutBlurb', rule: GATE_RULES.signatureRepeat }, copyGateContext({}, [])), false, 'legacy: every hit blocks');
  // Rendered fields are counted first: a signature repeat lands on the unrendered field even when it comes first in the copy.
  const exactly = SIGNATURE_WORD_TOKENS.exactly[0];
  const copy = { aboutBlurb: `${CARRY} ${exactly}`, ...loose({ heroHeadline: `${LABEL} ${exactly}`, aboutBlurb: `${CARRY} ${exactly}` }) };
  assert.equal(Object.keys(copy)[0], 'aboutBlurb', 'aboutBlurb comes first in the copy');
  const hits = runCopyGates(copy, site).filter(hit => hit.rule === GATE_RULES.signatureRepeat);
  assert.deepEqual(hits.map(hit => hit.field), ['aboutBlurb']);
  assert.deepEqual(blockingGateHits(hits, site), []);
  assert.deepEqual(warningGateHits(hits, site).map(hit => hit.field), ['aboutBlurb']);
  assert.deepEqual(gateViolations(copy, site).filter(item => item.rule === GATE_RULES.signatureRepeat), []);
  assert.deepEqual(gateWarnings(copy, site).filter(item => item.rule === GATE_RULES.signatureRepeat).map(item => item.field), ['aboutBlurb']);
  // Generation: a warning-only page costs no repair call and logs one 'warnings' event per settled stage.
  let repairs = 0;
  const warnings: string[] = [];
  const result = await generateResearchPageCopy(brief('leak-detection'), { businessNiche: 'plumber', guarantee: 'x' }, {
    onEvent: event => { if (event.kind === 'warnings') warnings.push(`${event.stage}:${(event.violations ?? []).filter(item => item.rule === GATE_RULES.signatureRepeat).map(item => item.field).join(',')}`); },
    callJson: async (system, user) => {
      if (/repairing specific fields/.test(system)) repairs++;
      return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : { ...base, heroHeadline: `${LABEL} ${exactly}`, aboutBlurb: `${CARRY} ${exactly}` });
    },
  });
  assert.equal(result.aboutBlurb, `${CARRY} ${exactly}`);
  assert.equal(repairs, 0);
  assert.deepEqual(warnings, ['tamar:aboutBlurb', 'noa:aboutBlurb', 'final:aboutBlurb']);
  // The same repeat in a rendered field is repaired.
  repairs = 0;
  const fixed = await generateResearchPageCopy(brief('leak-detection'), { businessNiche: 'plumber', guarantee: 'x' }, {
    callJson: async (system, user) => {
      if (/repairing specific fields/.test(system)) { repairs++; return JSON.stringify({ heroSubheadline: 'Sub' }); }
      return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : { ...base, heroHeadline: `${LABEL} ${exactly}`, heroSubheadline: `${HE_WORD} ${exactly}` });
    },
  });
  assert.equal(fixed.heroSubheadline, 'Sub');
  assert.equal(repairs, 1);
  // A fact gate in an unrendered field still fails the page (an unsupported claim in aboutBlurb).
  const claim = Object.values(CLAIM_TOKENS).flat().map(token => ({ aboutBlurb: `${CARRY} ${token}` }))
    .map(fields => runCopyGates(loose(fields), site).filter(hit => hit.rule === GATE_RULES.claim)).find(found => found.length)!;
  assert.ok(claim.length > 0);
  assert.deepEqual(blockingGateHits(claim, site), claim);
  assert.equal(claim[0].field, 'aboutBlurb');
});

test('M2a.7 3: tripled_letter (any letter 3+, vav 4+) and wrong-preposition tokens (no Hebrew letter on either side) over owner-voice fields plus servicesHeadline', () => {
  const alef = '\u05D0';
  assert.equal(tripledLetterHit(`${W1}${alef}${alef}${alef}`), true);
  assert.equal(tripledLetterHit(`${alef}${alef}${W2}`), false, 'two in a row is fine');
  assert.equal(tripledLetterHit(`${W1}${VAV}${VAV}${VAV}${W2}`), false, 'three vavs are legal');
  assert.equal(tripledLetterHit(`${W1}${VAV}${VAV}${VAV}${VAV}`), true, 'four vavs');
  assert.equal(tripledLetterHit('\u05EA\u05EA\u05EA'), true, 'end of the letter range');
  assert.equal(tripledLetterHit('aaa'), false, 'Latin is not checked');
  const token = WRONG_PREPOSITION_TOKENS[0];
  assert.deepEqual(wrongPrepositionHits(`${token} ${W1}?`), [0]);
  assert.deepEqual(wrongPrepositionHits(`${HE_WORD} ${token}`), [0]);
  assert.deepEqual(wrongPrepositionHits(`${BET}${token} ${W1}`), [], 'letter before');
  assert.deepEqual(wrongPrepositionHits(`${token}${BET} ${W1}`), [], 'letter after');
  const typo = `${W1}${alef}${alef}${alef}`;
  assert.deepEqual(rulesOf(loose({ servicesHeadline: typo, heroHeadline: `${token} ${W2}`, faqHeadline: typo }), vctx(), GATE_RULES.tripledLetter), ['servicesHeadline=typo:tripled_letter']);
  assert.deepEqual(rulesOf(loose({ heroHeadline: `${token} ${W2}` }), vctx(), GATE_RULES.wrongPreposition), ['heroHeadline=wrong_preposition:0']);
  assert.deepEqual(rulesOf(loose({ aboutBlurb: typo }), copyGateContext({}, []), GATE_RULES.tripledLetter), [], 'research sites only');
});

test('M2a.7 4: services_headline_preposition (left edge, next-letter check after one skip adverb, servicesHeadline too) and water_flows_again (whole word / phrase with its vav)', () => {
  const prep = TRADE_TERMS.find(entry => entry.id === 'services_headline_preposition')!;
  const water = TRADE_TERMS.find(entry => entry.id === 'water_flows_again')!;
  const [single, pair] = prep.tokens;
  assert.deepEqual(tradeTermHits(`${single} ${W1}`, false), [prep.id]);
  assert.deepEqual(tradeTermHits(`${BET}${single}`, false), [], 'a Hebrew letter right before');
  assert.deepEqual(tradeTermHits(`${W1} ${pair}`, false), [prep.id], 'pair at the end');
  assert.deepEqual(tradeTermHits(`${pair} ${W1}`, false), [prep.id], 'next word without the letter');
  assert.deepEqual(tradeTermHits(`${pair} ${BET}${W1}`, false), []);
  for (const adverb of PREPOSITION_SKIP_ADVERBS) {
    assert.deepEqual(tradeTermHits(`${pair} ${adverb} ${BET}${W1}`, false), [], adverb);
    assert.deepEqual(tradeTermHits(`${pair} ${adverb} ${W1}`, false), [prep.id], `${adverb} then no letter`);
  }
  assert.deepEqual(tradeTermHits(`${pair} ${PREPOSITION_SKIP_ADVERBS[0]} ${PREPOSITION_SKIP_ADVERBS[1]} ${BET}${W1}`, false), [prep.id], 'only one adverb is skipped');
  const [whole, phrase] = water.tokens;
  assert.deepEqual(tradeTermHits(`${W1} ${whole}`, false), [water.id]);
  assert.deepEqual(tradeTermHits(`${W1} ${whole}${BET}`, false), [], 'letter after the whole word');
  assert.deepEqual(tradeTermHits(`${W1} ${BET}${whole}`, false), [], 'other prefix');
  assert.deepEqual(tradeTermHits(`${W1} ${phrase} ${W2}`, false), [water.id]);
  assert.deepEqual(tradeTermHits(`${W1}${phrase}`, false), [], 'a non-vav letter before the phrase');
  // servicesHeadline is gated for the preposition only. M2b.1d: it is a hard gate on the pages that render it (homepage /
  // services hub), and a money page does not generate it at all.
  const site = briefGateContext(brief('leak-detection'), {});
  const hub = briefGateContext(brief('services', 'service_hub'), {});
  const copy = loose({ servicesHeadline: `${single} ${whole}` });
  assert.deepEqual(rulesOf(copy, hub, GATE_RULES.tradeTerm), [`servicesHeadline=trade:${prep.id}`]);
  assert.deepEqual(gateViolations(copy, hub).filter(item => item.rule === GATE_RULES.tradeTerm).map(item => item.field), ['servicesHeadline']);
  assert.deepEqual(rulesOf(copy, site, GATE_RULES.tradeTerm), [], 'money page: not generated, not gated');
  assert.deepEqual(gateViolations(loose({ heroHeadline: `${LABEL} ${whole}` }), site).map(item => `${item.field}:${item.actual}`), [`heroHeadline:trade:${water.id}`]);
});

test('M2a.7 5: section 21: the name opener is a name intro only at a sentence start or after a lead-in plus a comma, whole word; the same rule for the subject carry', () => {
  const gates = copyGateContext({ ownerName: `${W1} ${W2}` }, []);
  const hits = (value: string) => runCopyGates(loose({ aboutPageBody: value }), gates).filter(item => item.rule === GATE_RULES.nameSpelling).length;
  const name = NAME_INTRO_TOKEN;
  assert.equal(hits(`${name} ${W3}, ${HE_WORD}`), 1, 'field start');
  assert.equal(hits(` ${name} ${W3}`), 1, 'field start after whitespace');
  for (const mark of ['.', '?', '!']) assert.equal(hits(`${HE_WORD}${mark} ${name} ${W3}`), 1, `after "${mark} "`);
  assert.equal(hits(`${HE_WORD} ${name} ${W3}`), 0, 'mid-sentence homograph');
  assert.equal(hits(`${HE_WORD}, ${name} ${W3}`), 0, 'after a comma without a lead-in');
  assert.equal(hits(`${HE_WORD}.  ${name} ${W3}`), 0, 'two spaces is not ". "');
  for (const leadIn of NAME_INTRO_LEAD_INS) {
    assert.equal(hits(`${leadIn}, ${name} ${W3}`), 1, leadIn);
    assert.equal(hits(`${HE_WORD}${leadIn}, ${name} ${W3}`), 0, `${leadIn} inside a word`);
  }
  assert.equal(hits(`${VAV}${name} ${W3}`), 0, 'no prefix letters');
  assert.equal(hits(`${name} ${W1}, ${HE_WORD}`), 0, 'the real name passes');
  // Subject carry (section 19.5): the opener carries only in the same position.
  const opener = BARE_VERB_SENTENCE_OPENERS[0];
  assert.deepEqual(bareVerbOpenerHits(`${name} ${W1}. ${opener} ${W2}`), [], 'sentence-start intro carries');
  assert.deepEqual(bareVerbOpenerHits(`${HE_WORD} ${name} ${W1}. ${opener} ${W2}`), [0], 'mid-sentence homograph does not carry');
  assert.deepEqual(bareVerbOpenerHits(`${NAME_INTRO_LEAD_INS[0]}, ${name} ${W1}. ${opener} ${W2}`), [], 'after a lead-in');
  assert.deepEqual(bareVerbOpenerHits(`${HE_WORD} ${VAV}${CARRY} ${W1}. ${opener} ${W2}`), [], 'the pronoun keeps the 19.5 rule (prefix, anywhere)');
});

test('M2a.7 6: hero cap: concept additions on heroHeadline only, own service label masked (homepage: every label), AC-only entries; the site context carries each page\'s facts', () => {
  const [group, entries] = Object.entries(HERO_CAP_CONCEPT_ADDITIONS).find(([, list]) => list.some(entry => !HERO_CAP_AC_ONLY.includes(entry)))!;
  const entry = entries.find(item => !HERO_CAP_AC_ONLY.includes(item))!;
  const acEntry = HERO_CAP_AC_ONLY[0];
  const none = { maskLabels: [], acPage: false };
  assert.ok(heroCapGroups(`${W1}? ${entry}`, none).includes(group));
  const label = `${W2} ${entry}`;
  assert.deepEqual(heroCapGroups(`${W1}? ${label}`, { maskLabels: [label], acPage: false }), [], 'inside the page\'s own label');
  assert.ok(heroCapGroups(`${entry}? ${label}`, { maskLabels: [label], acPage: false }).includes(group), 'outside the label it still counts');
  assert.deepEqual(heroCapGroups(`${W1} ${acEntry}`, none), [], 'AC-only entry on a non-AC page');
  assert.deepEqual(heroCapGroups(`${W1} ${acEntry}`, { maskLabels: [], acPage: true }), ['fromTheRoot']);
  assert.ok(runCopyGates(loose({ aboutBlurb: `${CARRY} ${entry}`, aboutPageBody: `${CARRY} ${entry}` }), vctx()).every(hit => hit.rule !== GATE_RULES.signatureRepeat), 'never per-page');
  // Site-wide: the third hero with the concept fails; a prior hero that has it only inside its own label does not count.
  const hero = (word: string) => `${word}? ${entry}`;
  assert.deepEqual(heroSignatureCapGroups(hero(W3), [hero(W1), hero(W2)], none, [none, none]), [group]);
  assert.deepEqual(heroSignatureCapGroups(hero(W3), [hero(W1), `${W2}? ${label}`], none, [none, { maskLabels: [label], acPage: false }]), []);
  // Facts: money page = its own label; homepage = every serviceItems label; AC from the stage slug.
  const money = brief('ac-repair');
  assert.deepEqual(heroCapFacts(money, { serviceItems: [LABEL, W1] }), { maskLabels: [LABEL], acPage: true });
  const home = brief('leak-detection', 'homepage', W3, [LABEL, W1]);
  assert.deepEqual(heroCapFacts(home, { serviceItems: [LABEL, W1] }), { maskLabels: [LABEL, W1], acPage: false });
  assert.deepEqual(currentHeroCapFacts({ serviceItems: [LABEL] }, briefGateContext(home, {})), { maskLabels: [LABEL], acPage: false });
  assert.deepEqual(currentHeroCapFacts({}, briefGateContext(money, {})), { maskLabels: [LABEL], acPage: true });
  const facts = [{ maskLabels: [LABEL], acPage: false }];
  assert.deepEqual(siteGenerationContext([{ copy: { ...base, heroHeadline: W1 } }], facts).priorHeroFacts, facts);
  // Gate: the money page's own label is masked; the prior homepage hero is checked with its own facts.
  const ctx = { ...briefGateContext(brief('leak-detection', 'money_service', label, [label]), {}), priorHeroHeadlines: [hero(W1), hero(W2)], priorHeroFacts: [none, none] };
  assert.deepEqual(rulesOf(loose({ heroHeadline: `${W3}? ${label}` }), ctx, GATE_RULES.heroSignatureCap), []);
  assert.deepEqual(rulesOf(loose({ heroHeadline: `${entry}? ${label}` }), ctx, GATE_RULES.heroSignatureCap), [`heroHeadline=hero_cap:${group}`]);
});

test('M2a.7 7: the owner differentiator from a Hebrew or English usp / guarantee (lower-case, hyphens to spaces), several groups, never the excluded group', () => {
  const groups = (usp: unknown, guarantee?: unknown) => differentiatorGroups({ ownerFields: { usp, ...(guarantee !== undefined ? { guarantee } : {}) } });
  const [lineKeyword] = DIFFERENTIATOR_USP_KEYWORDS.lineByLine;
  const surpriseKeyword = DIFFERENTIATOR_USP_KEYWORDS.noSurprises[0];
  assert.deepEqual(groups(`I explain ${lineKeyword.toUpperCase()} of the quote`), ['lineByLine']);
  assert.deepEqual(groups(`Quote ${lineKeyword.split(' ').join('-')}, ${surpriseKeyword} in the wall`).sort(), ['lineByLine', 'noSurprises'].sort());
  assert.deepEqual(groups('Same-day fixes with a two-year warranty'), [], 'no method keyword');
  assert.deepEqual(groups('Fast service', `${DIFFERENTIATOR_USP_KEYWORDS.tiles[0]}s stay whole`), ['tiles'], 'the guarantee counts when it states a method');
  assert.deepEqual(groups(`${HE_WORD} ${SIGNATURE_WORD_TOKENS.tiles[0]}`), ['tiles'], 'Hebrew usp as before');
  assert.deepEqual(groups(`${HE_WORD} ${SIGNATURE_WORD_TOKENS.exactly[0]}`), [], 'exactly is never a differentiator group');
  // Cap 2 for the English-detected group on a research page.
  const ctx = { ...vctx(), ownerFields: { usp: `I explain ${lineKeyword}` } };
  const variant = SIGNATURE_WORD_TOKENS.lineByLine[0];
  assert.deepEqual(rulesOf(loose({ heroHeadline: `${LABEL} ${variant}`, aboutBlurb: `${CARRY} ${variant}` }), ctx, GATE_RULES.signatureRepeat), []);
  assert.deepEqual(rulesOf(loose({ heroHeadline: `${LABEL} ${variant}`, aboutBlurb: `${CARRY} ${variant}`, aboutPageBody: `${CARRY} ${variant}` }), ctx, GATE_RULES.signatureRepeat), ['aboutPageBody=signature:lineByLine']);
});
