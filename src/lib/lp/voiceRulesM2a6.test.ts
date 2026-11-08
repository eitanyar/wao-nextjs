// Paid-journey v2 M2a.6: Tamar's section 20 voice rules, Adam's site-wide checks, the heroCta override and
// Yonatan's H1 anchor gate.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew values come from generationData.ts (scripted copy
// of docs/copy/site-bot-generation-data.md), from the data file or the contact-label source at test time;
// synthetic letter sequences are escapes and contain no gate token.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  AC_VERTICAL_SLUG_KEYWORDS,
  ARRIVE_LOCATE_LEAD_PREFIXES,
  ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS,
  BEFORE_CAP,
  BEFORE_TIME_WORD_EXCLUSIONS,
  BEFORE_TOKENS,
  CTA_LABEL_SETS,
  GUARD_TOKEN_SOURCES,
  HERO_CTA_OVERRIDE,
  HERO_SIGNATURE_CAP,
  M2A6_PROMPT_RULES,
  MORAL_ENDING_FOLLOWING_EXCLUSIONS,
  MORAL_ENDING_TOKENS,
  MORAL_FIELDS,
  SERVICE_DETAILS_OPENER_TOKEN,
  SIGNATURE_WORD_TOKEN_ADDITIONS,
  SIGNATURE_WORD_TOKENS,
  STICKY_ACTION_TOKENS,
  STICKY_BARE_FORMS,
  STICKY_PROBLEM_WORDS,
  STICKY_WHOLE_WORD_PREFIXES,
  STICKY_WHOLE_WORDS,
  STORY_CUSTOMER_NOUNS,
  STORY_FIELDS,
  STORY_NOUN_PREFIXES,
  STORY_PAST_VERBS,
  STORY_QUANTIFIER_EXCLUSIONS,
  STORY_QUANTIFIER_PREFIXES,
  STORY_TIME_ANCHORS,
  STORY_VERB_PREFIXES,
  SUBJECT_CARRY_TOKENS,
  TILES_BREAK_EXCLUSIONS_PRECEDING_WORD,
  TILES_BREAK_FORMS,
  TILES_BREAK_PREFIX_LETTERS,
  TILES_BREAK_STRIP_PREFIXES,
  TIME_WORD_TOKENS,
  TRADE_TERMS,
} from './generationData';
import {
  aboutOpeningKey,
  beforeHitCount,
  copyGateContext,
  describeGateViolation,
  DIFFERENTIATOR_SIGNATURE_CAP,
  duplicateAboutHeadline,
  duplicateAboutOpening,
  GATE_RULES,
  heroAnchorMissing,
  heroSignatureCapGroups,
  inventedStoryKinds,
  moralEndingHits,
  normalizeAnchorText,
  promptSignatureVariants,
  runCopyGates,
  serviceDetailsOpenerOverCap,
  SIGNATURE_GROUPS,
  signatureCounts,
  slugVertical,
  stickyNamingProblems,
  tilesBreakSpans,
  TILES_GROUP,
  tradeTermHits,
  type CopyGateContext,
} from './copyGates';
import {
  assertBoundedGeneratedSiteCopy,
  briefGateContext,
  buildResearchPageGenerationPrompt,
  generateResearchPageCopy,
  researchHeroCta,
  SITE_COPY_STRING_LIMITS,
  tradeTermLine,
  withSystemFields,
} from './researchPageCopy';
import { pageNameWithCity, researchedPageH1 } from './researchedSite';
import { primaryCtaLabel, type SiteCopy } from './lpCopyPrompt';
import { siteGenerationContext } from '../site-bot/researchedSiteGeneration';
import type { PageBrief } from '../site-bot/research/pageBrief';
import type { CollectedData } from '../bot/prompts';

const ROOT = path.resolve(__dirname, '../../..');
const DATA_FILE = path.join(ROOT, 'docs/copy/site-bot-generation-data.md');
const BET = '\u05D1';
const VAV = '\u05D5';
const MEM = '\u05DE';
// Synthetic Hebrew-script letter sequences (test data, not copy; contain no gate token).
const HE_WORD = '\u05D0\u05D1\u05D2\u05D3';
const W1 = '\u05D0\u05D1\u05D2';
const W2 = '\u05D3\u05D4\u05D6';
const W3 = '\u05D7\u05D8\u05D9\u05DA';
const LABEL = '\u05D2\u05D3\u05D4 \u05D6\u05D7\u05D8';
const CITY = '\u05D8\u05D9\u05DA \u05E1\u05E2';
const CARRY = SUBJECT_CARRY_TOKENS[0];
const STICKY = `${STICKY_ACTION_TOKENS[0]} ${STICKY_PROBLEM_WORDS.general[0]}`;

const base: SiteCopy = {
  heroHeadline: LABEL, heroSubheadline: 'Sub', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: [], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Promise',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form',
  stickyBarLine: STICKY, aboutPageHeadline: 'About page', aboutPageBody: 'About body', serviceDetails: [],
};
const loose = (copy: Partial<SiteCopy>) => ({ ...base, ...copy }) as unknown as Record<string, unknown>;
const vctx = (overrides: Partial<CopyGateContext> = {}, data: CollectedData = {}): CopyGateContext =>
  ({ ...copyGateContext(data, [], true, [], { researchSite: true }), ...overrides });
const hitsOf = (copy: Record<string, unknown>, gates: CopyGateContext, rule: string) =>
  runCopyGates(copy, gates).filter(hit => hit.rule === rule).map(hit => `${hit.field}=${hit.actual}`);

function brief(slug: string, pageName = LABEL, city: string | null = null, pageClass = 'money_service', links: PageBrief['links'] = []): PageBrief {
  return {
    page: { id: pageClass === 'homepage' ? 'home' : 'svc', targetPath: pageClass === 'homepage' ? '/' : `/services/${slug}`, pageClass },
    persona: { id: 'persona', value: 'Local customer' }, waoOffer: { id: 'offer', value: 'offer' },
    targetQueries: [], approvedEntityAnchors: [{ id: 'entity-1', value: 'x' }], firstPartyProof: [],
    assertableLocalFacts: [], customerDecisions: [], constraints: [], links, informationGainGaps: [], prohibitedClaims: [],
    faqPolicy: 'none', faqCandidates: [],
    site: { pageName, relevanceTerm: pageName, city, serviceArea: [], serviceLabels: [pageName], serviceSources: [slug], businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: pageClass === 'homepage' },
  };
}

test('M2a.6 1: generationData.ts carries section 20 byte-exact, counted and sourced; R1-R7 are slices of the data file; --check passes', () => {
  const text = fs.readFileSync(DATA_FILE, 'utf8');
  const blocks = [...text.matchAll(/\n~~~json\n([\s\S]*?)\n~~~/g)].map(match => JSON.parse(match[1]));
  assert.equal(blocks.length, 48); // M2a.7 adds 5 blocks (sections 20 and 21)
  const data = Object.assign({}, ...blocks);
  const same = (actual: unknown, expected: unknown) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
  same(SIGNATURE_WORD_TOKEN_ADDITIONS, data.signatureWordTokenAdditions);
  same(TILES_BREAK_FORMS, data.tilesBreakForms);
  same(TILES_BREAK_EXCLUSIONS_PRECEDING_WORD, data.tilesBreakExclusionsPrecedingWord);
  same(STORY_CUSTOMER_NOUNS, data.storyCustomerNouns);
  same(STORY_PAST_VERBS, data.storyPastVerbs);
  same(STORY_QUANTIFIER_EXCLUSIONS, data.storyQuantifierExclusions);
  same(STORY_TIME_ANCHORS, data.storyTimeAnchors);
  same(MORAL_ENDING_TOKENS, data.moralEndingTokens);
  same(MORAL_ENDING_FOLLOWING_EXCLUSIONS, data.moralEndingFollowingExclusions);
  same(BEFORE_TOKENS, data.beforeTokens);
  same(BEFORE_TIME_WORD_EXCLUSIONS, data.beforeTimeWordExclusions);
  same(STICKY_BARE_FORMS, data.stickyBareForms);
  same(STICKY_PROBLEM_WORDS, data.stickyProblemWords);
  assert.equal(SERVICE_DETAILS_OPENER_TOKEN, data.serviceDetailsOpenerToken);
  same(AC_VERTICAL_SLUG_KEYWORDS, data.acVerticalSlugKeywords);
  same(ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS, data.arriveLocateNextWordExclusions);
  same(HERO_CTA_OVERRIDE, data.heroCtaOverride);
  same(TRADE_TERMS.map(entry => [entry.id, entry.tokens, entry.leadVerbs ?? null, entry.type, entry.acOnly, entry.replacement]),
    data.tradeTermTokens.map((entry: { id: string; tokens: string[]; leadVerbs?: string[]; type: string; acOnly: boolean; replacement: string }) => [entry.id, entry.tokens, entry.leadVerbs ?? null, entry.type, entry.acOnly, entry.replacement]));
  // Counts (the file is the truth; recounted for M2a.6).
  assert.deepEqual([Object.keys(SIGNATURE_WORD_TOKEN_ADDITIONS).length, Object.values(SIGNATURE_WORD_TOKEN_ADDITIONS).flat().length, TILES_BREAK_FORMS.length, TILES_BREAK_EXCLUSIONS_PRECEDING_WORD.length], [3, 11, 10, 12]);
  assert.deepEqual([STORY_CUSTOMER_NOUNS.length, STORY_PAST_VERBS.length, STORY_QUANTIFIER_EXCLUSIONS.length, STORY_TIME_ANCHORS.length], [2, 28, 3, 5]);
  assert.deepEqual([MORAL_ENDING_TOKENS.length, MORAL_ENDING_FOLLOWING_EXCLUSIONS.length, BEFORE_TOKENS.length, BEFORE_TIME_WORD_EXCLUSIONS.length], [12, 2, 3, 21]);
  assert.deepEqual([STICKY_BARE_FORMS.length, Object.values(STICKY_PROBLEM_WORDS).flat().length, STICKY_WHOLE_WORDS.length, AC_VERTICAL_SLUG_KEYWORDS.length, ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS.length], [12, 24, 3, 5, 4]);
  // M2a.7: services_headline_preposition and water_flows_again were promoted from promptOnly to gate.
  assert.deepEqual([TRADE_TERMS.length, TRADE_TERMS.filter(entry => entry.type === 'gate').length, TRADE_TERMS.filter(entry => entry.type === 'spellingFix').length, TRADE_TERMS.filter(entry => entry.type === 'promptOnly').length], [7, 5, 1, 1]);
  assert.deepEqual([TILES_BREAK_PREFIX_LETTERS.length, TILES_BREAK_STRIP_PREFIXES.length, STORY_NOUN_PREFIXES.length, STORY_VERB_PREFIXES.length, STORY_QUANTIFIER_PREFIXES.length, STICKY_WHOLE_WORD_PREFIXES.length, ARRIVE_LOCATE_LEAD_PREFIXES.length], [6, 6, 2, 1, 6, 7, 3]);
  assert.deepEqual([...STORY_FIELDS], ['aboutBlurb', 'aboutPageBody', 'heroSubheadline', 'serviceDetails[].description']);
  assert.deepEqual([...MORAL_FIELDS], ['aboutBlurb', 'aboutPageBody']);
  assert.deepEqual([BEFORE_CAP, HERO_SIGNATURE_CAP], [3, 2]); // M2a.7: before cap raised from 2
  assert.ok(TIME_WORD_TOKENS.length === 2 && TIME_WORD_TOKENS.some(token => MORAL_ENDING_TOKENS.includes(token)) && TIME_WORD_TOKENS.some(token => BEFORE_TOKENS.includes(token)));
  // Section 19.4 edit (Tamar): one planned heroCta label left, and it is the section 20.7 override.
  assert.deepEqual([...CTA_LABEL_SETS.planned.heroCta], [HERO_CTA_OVERRIDE.planned.phone]);
  assert.deepEqual(M2A6_PROMPT_RULES.map(rule => rule.id), ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']);
  const lines = text.split('\n');
  // M2a.7: R8 keeps its indented sub-bullets; the rule text is the header line plus the following sub-bullet lines, byte-exact.
  for (const rule of M2A6_PROMPT_RULES) {
    const [head, ...subs] = rule.text.split('\n');
    const at = lines.findIndex(line => line.startsWith('- **') && line.slice(2).split('**').join('') === head);
    assert.ok(at >= 0, rule.id);
    assert.deepEqual(subs, lines.slice(at + 1, at + 1 + subs.length), rule.id);
  }
  for (const key of ['signatureWordTokenAdditions', 'tilesBreakForms', 'storyTokens', 'moralEndingTokens', 'beforeTokens', 'stickyNaming', 'serviceDetailsOpenerToken', 'tradeTermTokens', 'heroCtaOverride']) {
    assert.match(GUARD_TOKEN_SOURCES[key] ?? '', /^docs\/copy\/site-bot-generation-data\.md section 20\. /, key);
  }
  assert.equal(execFileSync('node', [path.join(ROOT, 'scripts/site-bot/build-generation-data.mjs'), '--check'], { encoding: 'utf8' }).trim(), 'generationData.ts up to date');
});

test('M2a.6 2: signature additions, tile-breaking forms (whole word, prefixes, preceding-word exclusion), one count per overlap; the differentiator group is capped at 2', () => {
  for (const [group, list] of Object.entries(SIGNATURE_WORD_TOKEN_ADDITIONS)) {
    assert.deepEqual([...SIGNATURE_GROUPS[group]], [...(SIGNATURE_WORD_TOKENS[group] ?? []), ...list], group);
    for (const item of list) assert.equal(signatureCounts(`${HE_WORD} ${item} ${HE_WORD}`)[group], 1, item);
  }
  const form = TILES_BREAK_FORMS[0];
  assert.equal(tilesBreakSpans(`${HE_WORD} ${form}`).length, 1);
  assert.equal(tilesBreakSpans(`${HE_WORD} ${TILES_BREAK_PREFIX_LETTERS.join('')}${form}.`).length, 1, 'any prefix combination');
  assert.equal(tilesBreakSpans(`${HE_WORD} ${form}${BET}`).length, 0, 'whole word');
  assert.equal(tilesBreakSpans(`${HE_WORD} ${MEM}${form}`).length, 0, 'mem is not a breaking-form prefix');
  const excluded = TILES_BREAK_EXCLUSIONS_PRECEDING_WORD[0];
  assert.equal(tilesBreakSpans(`${HE_WORD} ${excluded} ${form}`).length, 0, 'preceding-word exclusion');
  for (const prefix of TILES_BREAK_STRIP_PREFIXES) assert.equal(tilesBreakSpans(`${prefix}${excluded} ${form}`).length, 0, `prefix ${prefix} stripped`);
  assert.equal(tilesBreakSpans(`${excluded}, ${form}`).length, 1, 'only a word right before it (whitespace only)');
  for (const variant of SIGNATURE_WORD_TOKENS[TILES_GROUP]) assert.equal(signatureCounts(variant)[TILES_GROUP], 1, `overlap counts once: ${variant}`);
  // Per-page cap: 1, or 2 for the group the owner's usp carries.
  const copy = loose({ heroHeadline: `${LABEL} ${form}`, aboutPageBody: `${CARRY} ${HE_WORD} ${form}` });
  assert.deepEqual(hitsOf(copy, vctx(), GATE_RULES.signatureRepeat), [`aboutPageBody=signature:${TILES_GROUP}`]);
  const usp = { usp: `${HE_WORD} ${SIGNATURE_WORD_TOKENS[TILES_GROUP][0]}` };
  assert.equal(DIFFERENTIATOR_SIGNATURE_CAP, 2);
  assert.deepEqual(hitsOf(copy, vctx({}, usp), GATE_RULES.signatureRepeat), [], 'differentiator group: twice is fine');
  assert.deepEqual(hitsOf({ ...copy, aboutBlurb: `${CARRY} ${form}` }, vctx({}, usp), GATE_RULES.signatureRepeat), [`aboutPageBody=signature:${TILES_GROUP}`], 'third use fails');
  assert.deepEqual(hitsOf(loose({ heroHeadline: `${LABEL} ${SIGNATURE_WORD_TOKENS.exactly[0]}`, aboutPageBody: `${CARRY} ${SIGNATURE_WORD_TOKENS.exactly[0]}` }), vctx({}, usp), GATE_RULES.signatureRepeat), ['aboutPageBody=signature:exactly'], 'other groups stay at 1');
  // The matching-only pointByPoint spellings never reach a prompt; the maqaf form does.
  const maqaf = SIGNATURE_GROUPS.pointByPoint.find(item => item.includes('\u05BE'))!;
  const matchingOnly = [maqaf.split('\u05BE').join('-'), maqaf.split('\u05BE').join(' ')];
  assert.ok(matchingOnly.every(item => SIGNATURE_GROUPS.pointByPoint.includes(item)));
  assert.ok(matchingOnly.every(item => !promptSignatureVariants('pointByPoint').includes(item)));
  const prompt = buildResearchPageGenerationPrompt(brief('leak-detection'), { businessNiche: 'plumber' });
  for (const item of matchingOnly) assert.ok(!prompt.includes(JSON.stringify(item)), item);
  assert.ok(prompt.includes(JSON.stringify(maqaf)));
  assert.ok(promptSignatureVariants(TILES_GROUP).includes(form), 'the breaking forms are named in the prompt');
});

test('M2a.6 3: site-wide checks: hero cap in route order, duplicate aboutPageHeadline, same aboutPageBody opening; the site context carries them', async () => {
  const tiles = (word: string) => `${word} ${SIGNATURE_WORD_TOKENS[TILES_GROUP][0]}`;
  assert.deepEqual(heroSignatureCapGroups(tiles(W3), [tiles(W1)]), [], 'second hero is fine');
  assert.deepEqual(heroSignatureCapGroups(tiles(W3), [tiles(W1), HE_WORD, tiles(W2)]), [TILES_GROUP], 'third hero fails');
  assert.deepEqual(hitsOf(loose({ heroHeadline: `${LABEL} ${tiles(W3)}` }), vctx({ priorHeroHeadlines: [tiles(W1), tiles(W2)] }), GATE_RULES.heroSignatureCap), [`heroHeadline=hero_cap:${TILES_GROUP}`]);
  assert.equal(duplicateAboutHeadline(` ${W1} ${W2} `, [`${W1} ${W2}`]), true);
  assert.equal(duplicateAboutHeadline(`${W1} ${W2} ${W3}`, [`${W1} ${W2}`]), false);
  assert.deepEqual(hitsOf(loose({ aboutPageHeadline: W1 }), vctx({ priorAboutPageHeadlines: [W1] }), GATE_RULES.duplicateAboutHeadline), ['aboutPageHeadline=duplicate:about_headline']);
  assert.equal(aboutOpeningKey(`${W1} ${W2} ${W3}, ${HE_WORD}`), `${W1} ${W2} ${W3}`);
  assert.equal(aboutOpeningKey(`${W1} ${W2}`), null);
  assert.equal(duplicateAboutOpening(`${W1}  ${W2} ${W3}, ${HE_WORD}`, [`${W1} ${W2} ${W3} ${W1}`]), true, 'punctuation stripped from the third token');
  assert.equal(duplicateAboutOpening(`${W1} ${W2}, ${W3}`, [`${W1} ${W2} ${W3}`]), false, 'only the third token is stripped');
  assert.deepEqual(hitsOf(loose({ aboutPageBody: `${CARRY} ${W1} ${W2}` }), vctx({ priorAboutPageBodies: [`${CARRY} ${W1} ${W2}.`] }), GATE_RULES.duplicateAboutOpening), ['aboutPageBody=duplicate:about_opening']);
  assert.deepEqual(hitsOf(loose({ aboutPageHeadline: W1, aboutPageBody: `${CARRY} ${W1} ${W2}` }), vctx(), GATE_RULES.duplicateAboutOpening), [], 'the first page never fails');
  const pages = [{ copy: { ...base, heroHeadline: W1, aboutPageHeadline: W2, aboutPageBody: W3 } }];
  assert.deepEqual(siteGenerationContext(pages), { priorHeroHeadlines: [W1], priorAboutPageHeadlines: [W2], priorAboutPageBodies: [W3], priorHeroFacts: [] });
  // generateResearchPageCopy takes the earlier about headlines. M2a.7: aboutPageHeadline is not rendered yet, so the
  // duplicate is a logged warning (no repair call); the repair wording is still there for M2b.
  const events: string[] = [];
  let repairs = 0;
  const result = await generateResearchPageCopy(brief('leak-detection'), { businessNiche: 'plumber', guarantee: 'x' }, {
    priorAboutPageHeadlines: [W1],
    onEvent: event => { if (event.kind === 'warnings') for (const violation of event.violations ?? []) events.push(violation.rule); },
    callJson: async (system, user) => {
      if (/repairing specific fields/.test(system)) repairs++;
      return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : { ...base, aboutPageHeadline: W1 });
    },
  });
  assert.equal(result.aboutPageHeadline, W1);
  assert.equal(repairs, 0);
  assert.ok(events.includes(GATE_RULES.duplicateAboutHeadline));
  assert.match(describeGateViolation({ field: 'aboutPageHeadline', rule: GATE_RULES.duplicateAboutHeadline }, vctx()), /is identical to the aboutPageHeadline of another page/);
});

test('M2a.6 4: invented customer story: pattern A (noun + later past verb in one clause, quantifier excluded), pattern B (clause-start anchor); story fields only', () => {
  const [noun] = STORY_CUSTOMER_NOUNS;
  const verb = STORY_PAST_VERBS[0];
  assert.deepEqual(inventedStoryKinds(`${noun} ${HE_WORD} ${verb} ${W1}`), ['noun_verb']);
  for (const prefix of STORY_NOUN_PREFIXES) assert.deepEqual(inventedStoryKinds(`${prefix}${noun} ${STORY_VERB_PREFIXES[0]}${verb}`), ['noun_verb'], prefix);
  assert.deepEqual(inventedStoryKinds(`${BET}${noun} ${verb}`), [], 'bet is not a noun prefix');
  assert.deepEqual(inventedStoryKinds(`${noun} ${MEM}${verb}`), [], 'mem is not a verb prefix');
  assert.deepEqual(inventedStoryKinds(`${noun}? ${verb}`), [], 'the clause split stops it');
  assert.deepEqual(inventedStoryKinds(`${verb} ${noun}`), [], 'the verb must come after the noun');
  for (const quantifier of STORY_QUANTIFIER_EXCLUSIONS) {
    assert.deepEqual(inventedStoryKinds(`${quantifier} ${noun} ${verb}`), [], quantifier);
    for (const prefix of STORY_QUANTIFIER_PREFIXES) assert.deepEqual(inventedStoryKinds(`${prefix}${quantifier} ${noun} ${verb}`), [], `${prefix}${quantifier}`);
  }
  for (const anchor of STORY_TIME_ANCHORS) {
    assert.deepEqual(inventedStoryKinds(`${anchor} ${HE_WORD}`), ['time_anchor'], anchor);
    assert.deepEqual(inventedStoryKinds(`${HE_WORD}, ${VAV}${anchor} ${W1}`), ['time_anchor'], `vav ${anchor}`);
    assert.deepEqual(inventedStoryKinds(`${HE_WORD} ${anchor}.`), [], `${anchor} ends a clause`);
  }
  const story = `${CARRY} ${HE_WORD}. ${noun} ${verb}`;
  assert.deepEqual(hitsOf(loose({ aboutBlurb: story, heroSubheadline: story, serviceDetails: [{ name: LABEL, description: story }] }), vctx(), GATE_RULES.inventedStory),
    ['heroSubheadline=story:noun_verb', 'aboutBlurb=story:noun_verb', 'serviceDetails[0].description=story:noun_verb']);
  assert.deepEqual(hitsOf(loose({ formHeadline: story, aboutPageHeadline: story }), vctx(), GATE_RULES.inventedStory), [], 'not a story field');
});

test('M2a.6 5: moral ending (about fields, substring) with the following-word and time-word exclusions; before cap with left edge and time words', () => {
  MORAL_ENDING_TOKENS.forEach((token, index) => assert.deepEqual(moralEndingHits(`${HE_WORD} ${token} ${W1}`), [index], token));
  for (const word of MORAL_ENDING_FOLLOWING_EXCLUSIONS) for (const token of MORAL_ENDING_TOKENS) assert.deepEqual(moralEndingHits(`${token} ${word}`), [], `${token} ${word}`);
  const shinMoral = TIME_WORD_TOKENS.find(token => MORAL_ENDING_TOKENS.includes(token))!;
  for (const word of BEFORE_TIME_WORD_EXCLUSIONS) assert.deepEqual(moralEndingHits(`${shinMoral.slice(0, -1)}${word} ${HE_WORD}`), [], word);
  assert.deepEqual(moralEndingHits(`${shinMoral}${HE_WORD}`), [MORAL_ENDING_TOKENS.indexOf(shinMoral)]);
  const moral = `${CARRY} ${HE_WORD}. ${MORAL_ENDING_TOKENS[2]} ${W1}`;
  assert.deepEqual(hitsOf(loose({ aboutPageBody: moral, heroSubheadline: moral }), vctx(), GATE_RULES.moralEnding), ['aboutPageBody=moral:2']);
  // Before: left edge (only a single vav), the time-word exclusion on its shin token, cap per page.
  for (const token of BEFORE_TOKENS) {
    assert.equal(beforeHitCount(`${HE_WORD} ${token}${W1}`), 1, token);
    assert.equal(beforeHitCount(`${VAV}${token}${W1}`), 1, `vav ${token}`);
    assert.equal(beforeHitCount(`${MEM}${token}${W1}`), 0, `mem ${token}`);
    assert.equal(beforeHitCount(`${VAV}${VAV}${token}${W1}`), 0, `two vavs ${token}`);
  }
  const shinBefore = TIME_WORD_TOKENS.find(token => BEFORE_TOKENS.includes(token))!;
  for (const word of BEFORE_TIME_WORD_EXCLUSIONS) assert.equal(beforeHitCount(`${shinBefore.slice(0, -1)}${word}`), 0, word);
  const one = `${CARRY} ${BEFORE_TOKENS[0]}${W1}`;
  const other = `${CARRY} ${BEFORE_TOKENS[1]} ${W2}`;
  // M2a.7: the cap is 3 per page (was 2).
  assert.deepEqual(hitsOf(loose({ heroSubheadline: one, aboutBlurb: other, aboutPageBody: one }), vctx(), GATE_RULES.beforeCap), [], `${BEFORE_CAP} is fine`);
  assert.deepEqual(hitsOf(loose({ heroSubheadline: one, aboutBlurb: other, aboutPageBody: one, aboutPageHeadline: other }), vctx(), GATE_RULES.beforeCap), ['aboutPageBody=before:4']);
  assert.deepEqual(hitsOf(loose({ heroSubheadline: one, aboutBlurb: `${one} ${BEFORE_TOKENS[1]} ${W2} ${BEFORE_TOKENS[1]} ${W3}` }), vctx(), GATE_RULES.beforeCap), ['aboutBlurb=before:4'], 'counted across fields');
  assert.deepEqual(hitsOf(loose({ heroSubheadline: one, aboutBlurb: one, aboutPageBody: one, reviewContext: one }), vctx(), GATE_RULES.beforeCap), [], 'customer words do not count');
});

test('M2a.6 6: sticky naming: bare forms fail, the line names the service or a problem word of the page vertical (three whole words), slug verticals', () => {
  for (const [slug, vertical] of [['ac-repair', 'ac'], ['central-ac', 'ac'], ['hvac-service', 'ac'], ['mini-split-install', 'ac'], ['vacuum-cleaning', 'plumbing'], ['backflow-test', 'plumbing'],
    ['electrical-panel-upgrade', 'electric'], ['ev-charger-install', 'electric'], ['leak-detection', 'plumbing'], ['', 'plumbing']] as const) assert.equal(slugVertical(slug), vertical, slug);
  for (const form of STICKY_BARE_FORMS) {
    assert.deepEqual(stickyNamingProblems(form, null, 'plumbing'), ['bare'], form);
    assert.deepEqual(stickyNamingProblems(` ${form}!`, null, 'plumbing'), ['bare'], `${form}!`);
  }
  const action = STICKY_ACTION_TOKENS[0];
  assert.deepEqual(stickyNamingProblems(`${HE_WORD}? ${action}`, null, 'plumbing'), ['unnamed']);
  assert.deepEqual(stickyNamingProblems(`${LABEL}? ${action}`, LABEL, 'plumbing'), [], 'the service label names it');
  for (const vertical of ['plumbing', 'electric', 'ac'] as const) {
    for (const word of [...STICKY_PROBLEM_WORDS[vertical], ...STICKY_PROBLEM_WORDS.general]) assert.deepEqual(stickyNamingProblems(`${word}? ${action}`, null, vertical), [], `${vertical} ${word}`);
    const other = (['plumbing', 'electric', 'ac'] as const).find(item => item !== vertical)!;
    const foreign = STICKY_PROBLEM_WORDS[other].find(word => ![...STICKY_PROBLEM_WORDS[vertical], ...STICKY_PROBLEM_WORDS.general].some(own => word.includes(own)))!;
    assert.deepEqual(stickyNamingProblems(`${foreign}? ${action}`, null, vertical), ['unnamed'], `${other} word on a ${vertical} page`);
  }
  for (const word of STICKY_WHOLE_WORDS) {
    const vertical = (['plumbing', 'electric', 'ac'] as const).find(item => STICKY_PROBLEM_WORDS[item].includes(word))!;
    assert.deepEqual(stickyNamingProblems(`${action} ${HE_WORD}${word}`, null, vertical), ['unnamed'], `${word} inside a word`);
    assert.deepEqual(stickyNamingProblems(`${action} ${word}${BET}`, null, vertical), ['unnamed'], `${word} with a letter after`);
    assert.deepEqual(stickyNamingProblems(`${action} ${STICKY_WHOLE_WORD_PREFIXES.slice(0, 2).join('')}${word}`, null, vertical), [], `${word} with prefixes`);
  }
  // Gate: the homepage names serviceItems[0]; a money page its own label.
  const home = { ...vctx(), pageSlug: 'leak-detection' };
  assert.deepEqual(hitsOf(loose({ stickyBarLine: STICKY_BARE_FORMS[0] }), home, GATE_RULES.stickyNaming), ['stickyBarLine=sticky_naming:bare']);
  assert.deepEqual(hitsOf(loose({ stickyBarLine: `${HE_WORD}? ${action}` }), home, GATE_RULES.stickyNaming), ['stickyBarLine=sticky_naming:unnamed']);
  assert.deepEqual(hitsOf(loose({ stickyBarLine: `${W1}? ${action}`, serviceItems: [W1] }), home, GATE_RULES.stickyNaming), []);
  assert.deepEqual(hitsOf(loose({ stickyBarLine: `${W2}? ${action}` }), { ...home, pageServiceLabel: W2 }, GATE_RULES.stickyNaming), []);
});

test('M2a.6 7: serviceDetails openers: at most floor(half) of the descriptions start with the whole opener word', () => {
  const desc = (opener: boolean) => ({ name: LABEL, description: `${opener ? `${SERVICE_DETAILS_OPENER_TOKEN} ` : ''}${HE_WORD} ${W1} ${W2} ${W3} ${HE_WORD} ${W1} ${W2}` });
  const over = (flags: boolean[]) => serviceDetailsOpenerOverCap({ serviceDetails: flags.map(desc) });
  assert.deepEqual(over([true, true]), [1]);
  assert.deepEqual(over([true, false]), []);
  assert.deepEqual(over([true, false, false]), []);
  assert.deepEqual(over([true, true, false]), [1]);
  assert.deepEqual(over([true, true, false, false]), []);
  assert.deepEqual(over([true, true, true, false]), [2]);
  assert.deepEqual(over([true, true, true, true, true]), [2, 3, 4]);
  const prefixed = { name: LABEL, description: `${VAV}${SERVICE_DETAILS_OPENER_TOKEN} ${HE_WORD}` };
  assert.deepEqual(serviceDetailsOpenerOverCap({ serviceDetails: [prefixed, prefixed] }), [], 'a prefixed opener does not count');
  assert.deepEqual(serviceDetailsOpenerOverCap({ serviceDetails: [{ name: LABEL, description: `${SERVICE_DETAILS_OPENER_TOKEN}${BET} ${HE_WORD}` }] }), [], 'whole word only');
  assert.deepEqual(hitsOf(loose({ serviceDetails: [desc(true), desc(true)] }), vctx(), GATE_RULES.serviceDetailsOpener), ['serviceDetails[1].description=opener_cap:1']);
});

test('M2a.6 8: trade terms: gate and spellingFix reject (acOnly on AC pages, ac_sewage excused after its replacement in the clause), the arrive-locate lead verbs with prefixes and exclusions; promptOnly never gates', () => {
  const sewage = TRADE_TERMS.find(entry => entry.id === 'ac_sewage')!;
  const spelling = TRADE_TERMS.find(entry => entry.type === 'spellingFix')!;
  const substring = TRADE_TERMS.find(entry => entry.match === 'substring')!;
  const locate = TRADE_TERMS.find(entry => entry.match === 'leadVerb')!;
  assert.deepEqual(tradeTermHits(`${HE_WORD} ${sewage.prefixLetters.join('')}${sewage.tokens[0]}`, true), [sewage.id]);
  assert.deepEqual(tradeTermHits(`${HE_WORD} ${sewage.tokens[0]}`, false), [], 'acOnly');
  assert.deepEqual(tradeTermHits(`${sewage.replacement} ${HE_WORD} ${sewage.tokens[0]}`, true), [], 'its replacement earlier in the clause');
  assert.deepEqual(tradeTermHits(`${sewage.replacement}, ${HE_WORD} ${sewage.tokens[0]}`, true), [sewage.id], 'a new clause');
  assert.deepEqual(tradeTermHits(`${sewage.tokens[0]} ${sewage.replacement}`, true), [sewage.id], 'only earlier counts');
  assert.deepEqual(tradeTermHits(`${spelling.prefixLetters.join('')}${spelling.tokens[0]}`, false), [spelling.id]);
  assert.deepEqual(tradeTermHits(`${spelling.tokens[0]}${BET}`, false), [], 'whole word');
  assert.deepEqual(tradeTermHits(`${HE_WORD}${substring.tokens[0]}${HE_WORD}`, false), [substring.id], 'substring');
  for (const verb of locate.leadVerbs ?? []) {
    assert.deepEqual(tradeTermHits(`${HE_WORD} ${verb} ${locate.tokens[0]} ${W1}`, false), [locate.id], verb);
    for (const prefix of ARRIVE_LOCATE_LEAD_PREFIXES) assert.deepEqual(tradeTermHits(`${prefix}${verb} ${locate.tokens[0]}`, false), [locate.id], `${prefix}${verb}`);
    for (const next of ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS) assert.deepEqual(tradeTermHits(`${verb} ${locate.tokens[0]} ${next}`, false), [], next);
    assert.deepEqual(tradeTermHits(`${verb} ${locate.tokens[0]}${BET}`, false), [], 'whole word');
    assert.deepEqual(tradeTermHits(`${MEM}${verb} ${locate.tokens[0]}`, false), [], 'mem is not a lead prefix');
  }
  assert.ok(TRADE_TERMS.filter(entry => entry.type === 'promptOnly').every(entry => entry.tokens.length === 0));
  // Gate on an AC page (slug) and on the AC homepage (its first service); owner-voice fields only.
  const ac = { ...vctx(), pageSlug: 'ac-cleaning' };
  assert.deepEqual(hitsOf(loose({ aboutPageBody: `${CARRY} ${sewage.tokens[0]}`, reviewContext: sewage.tokens[0] }), ac, GATE_RULES.tradeTerm), [`aboutPageBody=trade:${sewage.id}`]);
  assert.deepEqual(hitsOf(loose({ aboutPageBody: `${CARRY} ${sewage.tokens[0]}` }), { ...ac, pageSlug: 'leak-detection' }, GATE_RULES.tradeTerm), []);
  // The prompt lists the trade terms; the AC-only entry only on AC pages.
  assert.ok(tradeTermLine(true).includes(JSON.stringify(sewage.tokens)));
  assert.ok(!tradeTermLine(false).includes(JSON.stringify(sewage.tokens)));
  for (const entry of TRADE_TERMS.filter(item => !item.acOnly)) assert.ok(tradeTermLine(false).includes(JSON.stringify(entry.replacement)), entry.id);
  const describe = describeGateViolation({ field: 'aboutPageBody', rule: GATE_RULES.tradeTerm, actual: `trade:${sewage.id}` }, ac);
  assert.ok(describe.includes(JSON.stringify(sewage.replacement)));
});

test('M2a.6 9: heroCta override: planned-stage pages of phone sites get the section 20.7 label; WhatsApp-only, form-only, emergency and neutral keep the system label; the validator accepts it', () => {
  // The contact-method tokens, read byte-exact from primaryCtaLabel's source (phone, phone, WhatsApp, form).
  const source = fs.readFileSync(path.join(ROOT, 'src/lib/lp/lpCopyPrompt.ts'), 'utf8');
  const body = source.slice(source.indexOf('export function primaryCtaLabel'), source.indexOf('/** True when the owner supplied a real customer quote.'));
  const tokens = [...body.matchAll(/contactMethod\?\.includes\('([^']+)'\)/g)].map(match => match[1]);
  assert.equal(tokens.length, 4);
  const [phone, , whatsapp, form] = tokens;
  const planned = brief('water-heater-install');
  const override = HERO_CTA_OVERRIDE.planned.phone;
  for (const data of [{}, { contactMethod: phone }, { contactMethod: `${phone} ${whatsapp}` }, { contactMethod: 'phone' }] as CollectedData[]) {
    assert.equal(researchHeroCta(planned, data), override, JSON.stringify(data));
    assert.equal(withSystemFields(loose({}), planned, data).heroCta, override);
  }
  for (const data of [{ contactMethod: whatsapp }, { contactMethod: form }] as CollectedData[]) {
    assert.equal(researchHeroCta(planned, data), primaryCtaLabel(data));
    assert.notEqual(researchHeroCta(planned, data), override);
  }
  assert.equal(researchHeroCta(brief('leak-detection'), {}), primaryCtaLabel({}), 'emergency page');
  assert.equal(researchHeroCta(brief('about-us'), {}), primaryCtaLabel({}), 'neutral page');
  const homePlanned = brief('', LABEL, null, 'homepage', [{ targetPath: '/services/water-heater-install', relationship: 'service_child', evidenceIds: ['entity-1'] }]);
  assert.equal(researchHeroCta(homePlanned, {}), override, 'the homepage takes its first service stage');
  assert.equal(withSystemFields(loose({}), { ...planned, site: undefined }, {}).heroCta, 'Call', 'legacy briefs keep the model value');
  assert.equal(SITE_COPY_STRING_LIMITS.heroCta, Math.max(15, override.length));
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy(withSystemFields(loose({}), planned, {})));
  // The sticky bar may not equal the override either.
  assert.deepEqual(hitsOf(loose({ heroCta: override, stickyBarLine: override }), vctx(), GATE_RULES.stickyAction).filter(item => item.endsWith('equals_cta')), ['stickyBarLine=sticky:equals_cta']);
});

test('M2a.6 10: Yonatan\'s H1 anchor: normalised containment of page name and city, repairable, the same rule in researchedPageH1, the prompt wording', async () => {
  assert.equal(normalizeAnchorText(` ${W1}\u00A0 \u00A0${W2}\t `), `${W1} ${W2}`);
  assert.equal(normalizeAnchorText('e\u0301'), '\u00E9', 'NFC');
  assert.equal(normalizeAnchorText(`${W1}\u05F3-${W2}`), `${W1}\u05F3-${W2}`, 'no geresh or hyphen folding');
  assert.equal(heroAnchorMissing(`${W1}? ${LABEL} ${BET}${CITY}`, LABEL, CITY), null);
  assert.equal(heroAnchorMissing(`${W1}? ${LABEL}`, LABEL, CITY), 'city');
  assert.equal(heroAnchorMissing(`${W1}? ${CITY}`, LABEL, CITY), 'name');
  assert.equal(heroAnchorMissing(W1, LABEL, CITY), 'both');
  assert.equal(heroAnchorMissing(`${W1} ${LABEL}`, LABEL, null), null, 'no city');
  const nbsp = `${W1}? ${LABEL.replace(' ', '\u00A0')} ${BET}${CITY}`;
  assert.equal(heroAnchorMissing(nbsp, LABEL, CITY), null, 'NBSP inside the name passes');
  assert.equal(heroAnchorMissing(`${W1} ${LABEL.replace(' ', '-')} ${CITY}`, LABEL, CITY), 'name', 'a hyphen is not a space');
  // researchedPageH1 uses the gate's rule: a passing hook is never swapped; the swap stays as the safety net.
  const seo = { name: LABEL, city: CITY, serviceArea: [] };
  assert.equal(researchedPageH1(nbsp, seo), nbsp);
  assert.equal(researchedPageH1(W1, seo), pageNameWithCity(LABEL, CITY));
  for (const hook of [nbsp, W1, `${W1}? ${LABEL}`, `${LABEL} ${BET}${CITY}`]) assert.equal(researchedPageH1(hook, seo) === hook, heroAnchorMissing(hook, LABEL, CITY) === null, hook);
  // Gate: researched pages only, anchor from the brief (page.seo strings), homepage anchor is the trade.
  const money = brief('leak-detection', LABEL, CITY);
  const data: CollectedData = { businessNiche: 'plumber' };
  assert.deepEqual(hitsOf(loose({ heroHeadline: W1 }), briefGateContext(money, data), GATE_RULES.heroAnchor), ['heroHeadline=missing:both']);
  assert.deepEqual(hitsOf(loose({ heroHeadline: `${W1}? ${LABEL} ${BET}${CITY}` }), briefGateContext(money, data), GATE_RULES.heroAnchor), []);
  assert.deepEqual(hitsOf(loose({ heroHeadline: W1 }), copyGateContext(data, []), GATE_RULES.heroAnchor), [], 'legacy context: no anchor gate');
  const home = brief('', W3, CITY, 'homepage');
  assert.equal(briefGateContext(home, data).anchorName, W3);
  assert.deepEqual(hitsOf(loose({ heroHeadline: `${W1} ${CITY}` }), briefGateContext(home, data), GATE_RULES.heroAnchor), ['heroHeadline=missing:name']);
  const text = describeGateViolation({ field: 'heroHeadline', rule: GATE_RULES.heroAnchor, actual: 'missing:both' }, briefGateContext(money, data));
  assert.ok(text.includes('keep the opening hook clause exactly') && text.includes(JSON.stringify(LABEL)) && text.includes(JSON.stringify(CITY)));
  // Prompt: Yonatan's wording replaces the soft rule; the example uses the title formula's city prefix.
  const prompt = buildResearchPageGenerationPrompt(money, data);
  assert.ok(prompt.includes(`- This page's search anchor is ${JSON.stringify(LABEL)} in ${JSON.stringify(CITY)}. heroHeadline MUST contain ${JSON.stringify(LABEL)} exactly and ${JSON.stringify(CITY)} exactly. Open with the customer's pain as a short first clause if you want, then put the anchor in the next clause: '<hook>? ${pageNameWithCity(LABEL, CITY)} \u2014 <differentiator>'.`));
  assert.doesNotMatch(prompt, /Where it reads naturally/);
  assert.match(buildResearchPageGenerationPrompt(home, data), /This homepage's search anchor is the trade /);
  for (const rule of M2A6_PROMPT_RULES) assert.ok(prompt.includes(rule.text), rule.id);
  // Repair loop: a hook without the anchor is repaired.
  const events: string[] = [];
  const fixed = `${W1}? ${LABEL} ${BET}${CITY}`;
  const result = await generateResearchPageCopy(money, { ...data, guarantee: 'x' }, {
    onEvent: event => { for (const violation of event.violations ?? []) events.push(violation.rule); },
    callJson: async (system, user) => {
      if (/repairing specific fields/.test(system)) return JSON.stringify({ heroHeadline: fixed });
      return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : { ...base, heroHeadline: W1 });
    },
  });
  assert.equal(result.heroHeadline, fixed);
  assert.ok(events.includes(GATE_RULES.heroAnchor));
});
