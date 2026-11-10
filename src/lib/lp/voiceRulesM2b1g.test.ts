// Paid-journey v2 M2b.1g: Tamar's section 23 voice rules (Noa PASS-with-fixes, Yonatan sign-off) and Adam's decisions on
// Noa's flags: uspToolRequired / foreignTool (whole-card label exemption; the camera verb satisfies but is never foreign;
// thermal counts as camera), aboutHeadlineNoTrustRepeat, Yonatan's about-headline place guard, aboutCardEcho, cardPhraseEcho
// (warn-only), city_prefix with lamed / mem and list joins, the code-built place lists, the rendered-fields fact scope, the
// definite-warranty gate (digits and spelled-out durations), the sentence-final period normalizer, and the claim:thermal
// regression (section 23 supersedes section 12 for that rule).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew values come from generationData.ts / copyGates.config.ts (scripted
// or byte-exact patches) or are byte-exact slices of docs/copy/site-bot-generation-data.md; synthetic letters are escapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ABOUT_CARD_ECHO_MIN_WORDS,
  B_INITIAL_PLACES,
  CARD_PHRASE_ECHO_MIN_LETTERS,
  CARD_PHRASE_ECHO_MIN_WORDS,
  CITY_PREFIX_LETTERS,
  CITY_PREFIX_LIST_JOINS,
  FACT_PHRASE_EXEMPT_FIELDS_RESEARCH,
  FACT_PHRASE_REPEAT_MAX_DATA,
  FACT_REPEAT_MAX_DATA,
  M2B2_EVERY_PAGE_RULE_IDS,
  M2B2_PROMPT_RULES,
  NO_FINAL_PERIOD_FIELDS,
  PLACE_LIST_BUILD,
  SENTENCE_FINAL_PERIOD_FIELDS,
  SERVICES_HEADLINE_OPTIONS,
  THERMAL_TOKENS,
  TRUST_BAR_MAX_CHARS,
  TRUST_BAR_MAX_ITEMS,
  USP_TOOL_GROUPS,
  WARRANTY_DEFINITE_BARE_DURATION,
} from './generationData';
import { CAMERA_SATISFIES_ONLY, CLAIM_RULES, FACT_PHRASE_REPEAT_MAX, FACT_REPEAT_MAX, WARRANTY_SPELLED_DURATION_SOURCE } from './copyGates.config';
import {
  ALWAYS_BLOCKING_RULES,
  blockingGateHits,
  buildAreaTile,
  buildPlaceList,
  copyGateContext,
  echoTokens,
  GATE_RULES,
  isAreaTile,
  runCopyGates,
  toolForeignStems,
  toolSatisfyStems,
  uspToolGroups,
  WARNING_ONLY_RULES,
  WARRANTY_DEFINITE_PATTERN,
  warningGateHits,
  withPlaceListPrefixes,
  type CopyGateContext,
} from './copyGates';
import {
  ABOUT_HEADLINE_PLACE_RULE,
  assertFinalPeriods,
  briefGateContext,
  buildResearchPageGenerationPrompt,
  GUARANTEE_BLOCK_RENDERED,
  normalizeFinalPeriods,
  withAreaTile,
  withSystemFields,
} from './researchPageCopy';
import { researchedGatedFieldsFor } from './researchedSite';
import type { SiteCopy } from './lpCopyPrompt';
import type { PageBrief } from '../site-bot/research/pageBrief';
import { setOwnerFactTemplatesForTests } from './ownerFactCopy';

// Copy v2 (2026-11-10): these tests cover the model-written v1 path (kept for the A/B and as the pending fallback), so the
// fact templates are forced pending here. The live code-owned path: ownerFactWiring, promptV2, factRestatement, repetitionBudget.
setOwnerFactTemplatesForTests(null);

const ROOT = path.resolve(__dirname, '../../..');
const DATA_FILE = path.join(ROOT, 'docs/copy/site-bot-generation-data.md');
const VAV = '\u05D5';
const HE = '\u05D4';
const [BET, LAMED, MEM] = CITY_PREFIX_LETTERS;
const MAQAF = '\u05BE';
// Synthetic Hebrew-script letter sequences (test data, not copy; contain no gate token).
const W1 = '\u05D0\u05D1\u05D2';
const W2 = '\u05D3\u05D4\u05D6';
const W3 = '\u05D7\u05D8\u05D9';
const W4 = '\u05DB\u05DA\u05E0';
const W5 = '\u05E1\u05E2\u05E4';
const W6 = '\u05E6\u05E7\u05E8';
const LABEL = '\u05D2\u05D3\u05D4 \u05D6\u05D7\u05D8';

const base: SiteCopy = {
  heroHeadline: LABEL, heroSubheadline: 'Sub', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: SERVICES_HEADLINE_OPTIONS[0], serviceItems: [], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Promise',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form',
  stickyBarLine: 'Sticky', aboutPageHeadline: 'About page', aboutPageBody: 'About body.', serviceDetails: [],
};
const loose = (copy: Partial<SiteCopy>) => ({ ...base, ...copy }) as unknown as Record<string, unknown>;
/** A research homepage context (about section rendered), with optional owner data, labels and places. */
const home = (data: Record<string, unknown> = {}, labels: string[] = [], places: string[] = []): CopyGateContext =>
  copyGateContext(data, labels, true, places, { researchSite: true, renderedFields: researchedGatedFieldsFor('homepage') });
const rules = (copy: Record<string, unknown>, gates: CopyGateContext, rule: string) =>
  runCopyGates(copy, gates).filter(hit => hit.rule === rule).map(hit => `${hit.field}=${hit.actual}`);

function brief(slug: string, pageClass = 'money_service', city: string | null = null, serviceArea: string[] = []): PageBrief {
  return {
    page: { id: pageClass === 'homepage' ? 'home' : 'svc', targetPath: pageClass === 'homepage' ? '/' : `/services/${slug}`, pageClass },
    persona: { id: 'persona', value: 'Local customer' }, waoOffer: { id: 'offer', value: 'offer' },
    targetQueries: [], approvedEntityAnchors: [{ id: 'entity-1', value: 'x' }], firstPartyProof: [],
    assertableLocalFacts: [], customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [],
    links: pageClass === 'homepage' ? [{ targetPath: `/services/${slug}`, relationship: 'service_child', evidenceIds: ['entity-1'] }] : [],
    faqPolicy: 'none', faqCandidates: [],
    site: { pageName: LABEL, relevanceTerm: LABEL, city, serviceArea, serviceLabels: [LABEL], serviceSources: [slug], businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: pageClass === 'homepage' },
  };
}

/** Quoted Hebrew strings of the one data-file line that starts with `lead` (byte-exact slices). */
function quotedOnLine(lead: string): string[] {
  const lines = fs.readFileSync(DATA_FILE, 'utf8').split('\n').filter(line => line.startsWith(lead));
  assert.equal(lines.length, 1, lead);
  return [...lines[0].matchAll(/"([\u0590-\u05FF][^"]*)"/g)].map(match => match[1]);
}

test('M2b.1g 1: section 23 data is byte-exact and counted; C1-C6 are slices of the data file; config additions are Noa patches', () => {
  const text = fs.readFileSync(DATA_FILE, 'utf8');
  const blocks = [...text.matchAll(/\n~~~json\n([\s\S]*?)\n~~~/g)].map(match => JSON.parse(match[1]));
  assert.equal(blocks.length, 60);
  const data = Object.assign({}, ...blocks);
  const same = (actual: unknown, expected: unknown) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
  same(USP_TOOL_GROUPS, data.uspToolGroups);
  same(CITY_PREFIX_LETTERS, data.cityPrefixLetters);
  same(CITY_PREFIX_LIST_JOINS, data.cityPrefixListJoins);
  same(PLACE_LIST_BUILD, data.placeListBuild);
  same(B_INITIAL_PLACES, data.bInitialPlaces);
  same(FACT_PHRASE_EXEMPT_FIELDS_RESEARCH, data.factPhraseExemptFieldsResearch);
  same(WARRANTY_DEFINITE_BARE_DURATION, { pattern: data.warrantyDefiniteBareDuration.pattern, flags: data.warrantyDefiniteBareDuration.flags });
  same(SENTENCE_FINAL_PERIOD_FIELDS, data.sentenceFinalPeriodFields);
  same(NO_FINAL_PERIOD_FIELDS, data.noFinalPeriodFields);
  assert.equal(ABOUT_CARD_ECHO_MIN_WORDS, data.aboutCardEcho.minSharedWords);
  assert.equal(CARD_PHRASE_ECHO_MIN_WORDS, data.cardPhraseEcho.minSharedWords);
  assert.equal(CARD_PHRASE_ECHO_MIN_LETTERS, data.cardPhraseEcho.minHebrewLettersPerWord);
  assert.equal(FACT_REPEAT_MAX, FACT_REPEAT_MAX_DATA);
  assert.equal(FACT_REPEAT_MAX, data.factRepeatMax);
  assert.equal(FACT_PHRASE_REPEAT_MAX, FACT_PHRASE_REPEAT_MAX_DATA);
  assert.equal(FACT_PHRASE_REPEAT_MAX, data.factPhraseRepeatMax);
  assert.deepEqual(M2B2_PROMPT_RULES.map(rule => rule.id), ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
  for (const rule of M2B2_PROMPT_RULES) for (const line of rule.text.split('\n').slice(1)) assert.ok(text.includes(`\n${line}\n`), `${rule.id} sub-line is a slice`);
  assert.deepEqual([...M2B2_EVERY_PAGE_RULE_IDS], ['C4', 'C5']);
  // Noa's additions (applied by Python str.replace from the approved JSON): the camera verb is not a camera `he` stem, and the
  // spelled-duration source compiles.
  assert.equal(CAMERA_SATISFIES_ONLY.length, 1);
  assert.ok(!USP_TOOL_GROUPS.camera.he.includes(CAMERA_SATISFIES_ONLY[0]));
  assert.ok(!/__HE_TODO_/.test(WARRANTY_SPELLED_DURATION_SOURCE + CAMERA_SATISFIES_ONLY.join('')));
  assert.doesNotThrow(() => new RegExp(WARRANTY_SPELLED_DURATION_SOURCE, 'u'));
});

test('M2b.1g 2: uspToolRequired: the about body names the usp tool; the camera verb satisfies it; thermal-only needs thermal', () => {
  const camera = home({ usp: 'Same-day leak fixes with a camera inspection' });
  assert.deepEqual(uspToolGroups(camera), ['camera']);
  assert.deepEqual(rules(loose({ aboutPageBody: `${W1} ${W2}.` }), camera, GATE_RULES.uspToolRequired), ['aboutPageBody=usp_tool:camera']);
  assert.deepEqual(rules(loose({ aboutPageBody: `${W1} ${USP_TOOL_GROUPS.camera.he[0]}${W2}.` }), camera, GATE_RULES.uspToolRequired), []);
  assert.deepEqual(rules(loose({ aboutPageBody: `${W1} ${CAMERA_SATISFIES_ONLY[0]} ${W2}.` }), camera, GATE_RULES.uspToolRequired), [], 'the camera verb satisfies');
  // Thermal only: thermal is required (not camera), and the camera stem of "thermal camera" is never foreign.
  const thermal = home({ usp: 'Thermal imaging finds the leak' });
  assert.deepEqual(uspToolGroups(thermal), ['thermal']);
  const thermalCamera = `${USP_TOOL_GROUPS.camera.he[0]}${W1} ${USP_TOOL_GROUPS.thermal.he[0]}`;
  assert.deepEqual(rules(loose({ aboutPageBody: `${W2} ${thermalCamera}.` }), thermal, GATE_RULES.uspToolRequired), []);
  assert.deepEqual(rules(loose({ aboutPageBody: `${W2} ${thermalCamera}.` }), thermal, GATE_RULES.foreignTool), []);
  assert.deepEqual(rules(loose({ aboutPageBody: `${W2}.` }), thermal, GATE_RULES.uspToolRequired), ['aboutPageBody=usp_tool:thermal']);
  // A Hebrew usp with a camera stem names the camera; no usp tool means no requirement.
  assert.deepEqual(uspToolGroups(home({ usp: `${W1} ${USP_TOOL_GROUPS.camera.he[0]}${W2}` })), ['camera']);
  assert.deepEqual(rules(loose({ aboutPageBody: `${W1}.` }), home({ usp: 'Fixed price before any work' }), GATE_RULES.uspToolRequired), []);
  // Not on a page without the about section.
  const money = copyGateContext({ usp: 'camera' }, [], true, [], { researchSite: true, renderedFields: researchedGatedFieldsFor('money_service'), ungeneratedFields: ['aboutPageBody', 'aboutPageHeadline', 'serviceDetails', 'servicesHeadline'] });
  assert.deepEqual(rules(loose({ aboutPageBody: '' }), money, GATE_RULES.uspToolRequired), []);
  assert.deepEqual([...toolSatisfyStems('camera')], [...USP_TOOL_GROUPS.camera.he, ...CAMERA_SATISFIES_ONLY]);
});

test('M2b.1g 3: foreignTool: always blocking, rendered fields only; label and whole-card exemptions (Adam); the camera verb is never foreign', () => {
  assert.ok(ALWAYS_BLOCKING_RULES.includes(GATE_RULES.foreignTool));
  const acoustic = home({ usp: 'Finds hidden leaks with acoustic equipment' }, [LABEL]);
  const cameraStem = USP_TOOL_GROUPS.camera.he[0];
  const body = `${W1} ${toolForeignStems('acoustic')[0]}${W2} ${cameraStem}${W3}.`;
  assert.deepEqual(rules(loose({ aboutPageBody: body }), acoustic, GATE_RULES.foreignTool), ['aboutPageBody=foreign_tool:camera']);
  assert.deepEqual(blockingGateHits(runCopyGates(loose({ aboutPageBody: body }), acoustic), acoustic).filter(hit => hit.rule === GATE_RULES.foreignTool).length, 1);
  assert.deepEqual(rules(loose({ aboutPageBody: `${W1} ${toolForeignStems('acoustic')[0]}${W2} ${CAMERA_SATISFIES_ONLY[0]}.` }), acoustic, GATE_RULES.foreignTool), [], 'camera verb');
  // Unrendered field: no hit (and so no warning either).
  assert.deepEqual(rules(loose({ aboutBlurb: `${cameraStem}${W1}` }), acoustic, GATE_RULES.foreignTool), []);
  // No tool in the usp: every stem is foreign.
  const none = home({ usp: 'Fixed price before any work' }, [LABEL]);
  assert.deepEqual(rules(loose({ heroSubheadline: `${W1} ${toolForeignStems('acoustic')[0]}${W2}` }), none, GATE_RULES.foreignTool), ['heroSubheadline=foreign_tool:acoustic']);
  // A security-camera installer: the stem inside an owner-confirmed label is exempt in any field, and the whole card whose
  // label holds the stem (label + description) is exempt for that group.
  const cameraLabel = `${W4} ${cameraStem}${W5}`;
  const installer = home({ usp: 'Fixed price before any work' }, [cameraLabel]);
  assert.deepEqual(rules(loose({ heroHeadline: `${W1} ${cameraLabel}` }), installer, GATE_RULES.foreignTool), []);
  const card = { name: cameraLabel, description: `${W1} ${cameraStem}${W6} ${W2}.` };
  assert.deepEqual(rules(loose({ serviceDetails: [card] }), installer, GATE_RULES.foreignTool), []);
  // ...but not an unconfirmed card name, and not another group in that card.
  assert.deepEqual(rules(loose({ serviceDetails: [{ name: `${W2} ${cameraStem}${W5}`, description: `${W1} ${cameraStem}${W6}.` }] }), installer, GATE_RULES.foreignTool), ['serviceDetails[0].name=foreign_tool:camera', 'serviceDetails[0].description=foreign_tool:camera']);
  assert.deepEqual(rules(loose({ serviceDetails: [{ ...card, description: `${W1} ${toolForeignStems('acoustic')[0]}${W2}.` }] }), installer, GATE_RULES.foreignTool), ['serviceDetails[0].description=foreign_tool:acoustic']);
});

test('M2b.1g 4: claim:thermal uses the section 23 thermal list (supersedes section 12): ordinary AC insulation and electrical breaker wording passes', () => {
  const thermalRule = CLAIM_RULES.find(rule => rule.id === 'thermal')!;
  assert.deepEqual([...thermalRule.tokens], [...USP_TOOL_GROUPS.thermal.he]);
  // The two trade phrases are byte-exact slices of Noa's section 23 thermal note.
  const [, insulation, breaker] = quotedOnLine('- **`thermal`** has its own `he` list');
  assert.ok(THERMAL_TOKENS.some(token => insulation.includes(token)) && THERMAL_TOKENS.some(token => breaker.includes(token)), 'the section 12 list would have hit them');
  for (const [slug, phrase] of [['ac-repair', insulation], ['electrical-panel-upgrade', breaker]]) {
    const pageBrief = brief(slug);
    const gates = briefGateContext(pageBrief, { usp: 'Fixed price before any work starts' });
    const copy = loose({ heroSubheadline: `${W1} ${phrase} ${W2}`, serviceDetails: [] });
    const hits = runCopyGates(copy, gates).filter(hit => hit.actual === 'claim:thermal' || hit.rule === GATE_RULES.foreignTool);
    assert.deepEqual(hits, [], `${slug}: ${phrase.length}`);
  }
  // A real thermal-camera claim without an owner fact still fails.
  const gates = briefGateContext(brief('leak-detection'), { usp: 'Fixed price before any work starts' });
  assert.ok(runCopyGates(loose({ heroSubheadline: `${W1} ${USP_TOOL_GROUPS.thermal.he[2]}` }), gates).some(hit => hit.actual === 'claim:thermal'));
});

test('M2b.1g 5: aboutHeadlineNoTrustRepeat (digits / verbatim item; the system area tile is not compared) and Yonatan\'s one-place guard', () => {
  const places = [W1, W2, W3];
  const gates = home({}, [], places);
  const tile = buildAreaTile(places, TRUST_BAR_MAX_CHARS)!;
  const trust = [`12 ${W4}`, `${W5} ${W6}`, tile];
  assert.deepEqual(rules(loose({ trustBarItems: trust, aboutPageHeadline: `12 ${W6}` }), gates, GATE_RULES.aboutHeadlineTrustRepeat), ['aboutPageHeadline=about_trust:digits']);
  assert.deepEqual(rules(loose({ trustBarItems: trust, aboutPageHeadline: `${W4} ${W5} ${W6}` }), gates, GATE_RULES.aboutHeadlineTrustRepeat), ['aboutPageHeadline=about_trust:item:1']);
  assert.deepEqual(rules(loose({ trustBarItems: [`${W5} ${W6}`, W1], aboutPageHeadline: `${W4} ${BET}${W1}` }), gates, GATE_RULES.aboutHeadlineTrustRepeat), [], 'one-place tile');
  assert.deepEqual(rules(loose({ trustBarItems: trust, aboutPageHeadline: `${W4} ${BET}${W2}` }), gates, GATE_RULES.aboutHeadlinePlaces), []);
  assert.deepEqual(rules(loose({ trustBarItems: trust, aboutPageHeadline: `${W4} ${BET}${W1} ${VAV}${BET}${W2}` }), gates, GATE_RULES.aboutHeadlinePlaces), ['aboutPageHeadline=about_places:2']);
});

test('M2b.1g 6: aboutCardEcho (4 consecutive tokens; vav stripped; hyphen = maqaf) and cardPhraseEcho (warn-only)', () => {
  const gates = home();
  const body = `${W1} ${W2} ${W3} ${W4} ${W5}.`;
  const card = (description: string) => loose({ aboutPageBody: body, serviceDetails: [{ name: 'A', description }] });
  assert.deepEqual(rules(card(`${W6} ${W2}, ${VAV}${W3} ${W4} ${W5}`), gates, GATE_RULES.aboutCardEcho), ['serviceDetails[0].description=about_card_echo:4']);
  assert.deepEqual(rules(card(`${W6} ${W3} ${W4} ${W5}`), gates, GATE_RULES.aboutCardEcho), [], 'three words is not an echo');
  const hyphenBody = `${W1}${MAQAF}${W1} ${W2} ${W3} ${W4}.`;
  assert.deepEqual(echoTokens(`${W1}-${W1}`), [`${W1}${MAQAF}${W1}`]);
  assert.deepEqual(rules(loose({ aboutPageBody: hyphenBody, serviceDetails: [{ name: 'A', description: `${W1}-${W1} ${W2} ${W3} ${W4}` }] }), gates, GATE_RULES.aboutCardEcho), ['serviceDetails[0].description=about_card_echo:4']);
  // cardPhraseEcho: a warning only.
  assert.ok(WARNING_ONLY_RULES.includes(GATE_RULES.cardPhraseEcho));
  const cards = loose({ aboutPageBody: `${W6}.`, serviceDetails: [{ name: 'A', description: `${W1} ${W2} ${W3}` }, { name: 'B', description: `${W4} ${W2} ${W3}` }] });
  const hits = runCopyGates(cards, gates);
  assert.deepEqual(warningGateHits(hits, gates).filter(hit => hit.rule === GATE_RULES.cardPhraseEcho).map(hit => hit.field), ['serviceDetails[1].description']);
  assert.deepEqual(blockingGateHits(hits, gates).filter(hit => hit.rule === GATE_RULES.cardPhraseEcho), []);
});

test('M2b.1g 7: city_prefix with bet / lamed / mem, list joins only; ba-initial towns with space / hyphen / maqaf', () => {
  const places = [W1, W2, W3];
  const gates = home({}, [], places);
  const hit = (value: string) => rules(loose({ heroSubheadline: value }), gates, GATE_RULES.cityPrefix).length > 0;
  for (const letter of [BET, LAMED, MEM]) {
    assert.ok(hit(`${letter}${W1} ${VAV}${W2}`), `${letter}: first only`);
    assert.ok(!hit(`${letter}${W1} ${VAV}${letter}${W2}`), `${letter}: every place`);
    assert.ok(hit(`${letter}${W1}, ${W2} ${VAV}${letter}${W3}`), `${letter}: comma join`);
    assert.ok(!hit(`${letter}${W1}, ${letter}${W2} ${VAV}${letter}${W3}`), `${letter}: full list`);
  }
  assert.ok(!hit(`${MEM}${W1} ${VAV}${W4} ${W2}`), 'not a list: a word between');
  assert.ok(!hit(`${MEM}${W1} ${LAMED}${W2}`), 'not a list: a plain space without the conjunction');
  assert.ok(!hit(`${W1} ${VAV}${W2}`), 'no locative prefix: no requirement');
  for (const place of B_INITIAL_PLACES) {
    const list = buildPlaceList([W1, place], BET);
    assert.equal(list, `${BET}${W1} ${PLACE_LIST_BUILD.lastJoin}${BET}${place}`);
    const ctx = home({}, [], [W1, place]);
    const bad = (value: string) => rules(loose({ heroSubheadline: value }), ctx, GATE_RULES.cityPrefix).length > 0;
    assert.ok(!bad(list), `${place.length}: built list passes`);
    for (const sep of [' ', '-', MAQAF]) {
      const spelled = place.split(/[ \u05BE]/).join(sep);
      assert.ok(bad(`${BET}${W1} ${VAV}${spelled}`), `${place.length}/${sep}: missing letter`);
      assert.ok(!bad(`${BET}${W1} ${VAV}${BET}${spelled}`), `${place.length}/${sep}: with letter`);
    }
  }
});

test('M2b.1g 8: code-built place lists: trust tile (no prefix, in place / appended, fits the cap) and the badge place part', () => {
  assert.equal(buildPlaceList([W1]), W1);
  assert.equal(buildPlaceList([W1, W2]), `${W1} ${VAV}${W2}`);
  assert.equal(buildPlaceList([W1, W2, W3]), `${W1}, ${W2} ${VAV}${W3}`);
  assert.equal(buildPlaceList([W1, W2, W3], LAMED), `${LAMED}${W1}, ${LAMED}${W2} ${VAV}${LAMED}${W3}`);
  const places = [W1, W2, W3];
  const tile = buildAreaTile(places, TRUST_BAR_MAX_CHARS)!;
  assert.ok(isAreaTile(tile, places) && isAreaTile(`${W2} ${VAV}${W1}`, places) && !isAreaTile(`12 ${W4}`, places) && !isAreaTile(`${W4} ${BET}${W1}`, places));
  // Replaced in place (a second model tile dropped); appended while there is room; never past the item cap.
  assert.deepEqual(withAreaTile([`${W2} ${VAV}${W1}`, `12 ${W4}`], places), [tile, `12 ${W4}`]);
  assert.deepEqual(withAreaTile([`12 ${W4}`, W1, W2], places), [`12 ${W4}`, tile]);
  assert.deepEqual(withAreaTile([`12 ${W4}`], places), [`12 ${W4}`, tile]);
  const full = Array.from({ length: TRUST_BAR_MAX_ITEMS }, (_, index) => `${index + 1} ${W4}`);
  assert.deepEqual(withAreaTile(full, places), full);
  // Over the per-item cap: the longest leading run that fits, base city first.
  const long = [W1.repeat(4), W2.repeat(4), W3.repeat(4)];
  const short = buildAreaTile(long, TRUST_BAR_MAX_CHARS)!;
  assert.ok([...short].length <= TRUST_BAR_MAX_CHARS && short.startsWith(long[0]) && short !== buildPlaceList(long));
  // Badge: the list's letter goes on every place; the rest of the string is untouched.
  assert.equal(withPlaceListPrefixes(`${W4} ${W5} ${BET}${W1} ${VAV}${W2}`, places), `${W4} ${W5} ${BET}${W1} ${VAV}${BET}${W2}`);
  assert.equal(withPlaceListPrefixes(`${W4} ${BET}${W1}, ${W2} ${VAV}${W3}`, places), `${W4} ${BET}${W1}, ${BET}${W2} ${VAV}${BET}${W3}`);
  assert.equal(withPlaceListPrefixes(`${W4} ${BET}${W1}`, places), `${W4} ${BET}${W1}`);
  // withSystemFields builds both from the brief's places (base city first).
  const pageBrief = brief('leak-detection', 'money_service', W1, [W2]);
  const filled = withSystemFields(loose({ trustBarItems: [`12 ${W4}`, `${W1} ${VAV}${W2}`], responseTimeBadge: `${W4} ${BET}${W1} ${VAV}${W2}` }), pageBrief, {});
  assert.deepEqual(filled.trustBarItems, [`12 ${W4}`, `${W1} ${VAV}${W2}`]);
  assert.equal(filled.responseTimeBadge, `${W4} ${BET}${W1} ${VAV}${BET}${W2}`);
});

test('M2b.1g 9: sentence-final periods (cards, about body) and no final period on labels; heroSubheadline untouched; the invariant', () => {
  const copy = loose({
    aboutPageBody: `${W1} ${W2}`, serviceDetails: [{ name: `${LABEL}.`, description: `${W1} ${W2}` }, { name: LABEL, description: `${W3}?` }],
    trustBarItems: [`${W4}.`], heroHeadline: `${W5}.`, aboutPageHeadline: `${W6}.`, heroSubheadline: `${W1}. ${W2}`,
  });
  normalizeFinalPeriods(copy);
  assert.equal(copy.aboutPageBody, `${W1} ${W2}.`);
  assert.deepEqual(copy.serviceDetails, [{ name: LABEL, description: `${W1} ${W2}.` }, { name: LABEL, description: `${W3}?` }]);
  assert.deepEqual(copy.trustBarItems, [W4]);
  assert.equal(copy.heroHeadline, W5);
  assert.equal(copy.aboutPageHeadline, W6);
  assert.equal(copy.heroSubheadline, `${W1}. ${W2}`);
  assert.doesNotThrow(() => assertFinalPeriods(copy));
  assert.throws(() => assertFinalPeriods(loose({ aboutPageBody: W1 })), /aboutPageBody/);
  assert.throws(() => assertFinalPeriods(loose({ stickyBarLine: `${W1}.` })), /stickyBarLine/);
  // Empty (ungenerated) fields are left alone.
  assert.doesNotThrow(() => assertFinalPeriods(normalizeFinalPeriods(loose({ aboutPageBody: '', serviceDetails: [] }))));
  assert.equal(withSystemFields(loose({ aboutPageBody: W1 }), brief('x', 'homepage'), {}).aboutPageBody, `${W1}.`);
});

test('M2b.1g 10: definite warranty + bare duration (digits and Noa\'s spelled-out forms) in rendered fields; indefinite and lamed forms pass', () => {
  const warranty = CLAIM_RULES.find(rule => rule.id === 'warranty')!.tokens[0];
  const durations = /\\s\+\(\?:([^()]+)\|\\d/.exec(WARRANTY_DEFINITE_BARE_DURATION.pattern)![1].split('|');
  const spelled = /^\(\?:([^|)]+)\|[^)]*\)\\s\+([^|]+)\|/.exec(WARRANTY_SPELLED_DURATION_SOURCE)!;
  const gates = home({ guarantee: 'two years' });
  const hit = (value: string, field = 'aboutPageBody') => rules(loose({ [field]: value } as Partial<SiteCopy>), gates, GATE_RULES.warrantyDefinite).length > 0;
  assert.ok(hit(`${W1} ${HE}${warranty} ${durations[0]}.`));
  assert.ok(hit(`${W1} ${VAV}${HE}${warranty} 2 ${durations[0]}.`), 'digit duration, vav prefix');
  assert.ok(hit(`${W1} ${HE}${warranty} ${spelled[1]} ${spelled[2]}.`), 'spelled-out duration');
  assert.ok(WARRANTY_DEFINITE_PATTERN.test(`${HE}${warranty} ${spelled[1]} ${spelled[2]}`));
  assert.ok(!hit(`${W1} ${warranty} ${durations[0]}.`), 'indefinite is standard');
  assert.ok(!hit(`${W1} ${HE}${warranty} ${LAMED}${durations[0]}.`), 'the lamed form');
  assert.ok(!hit(`${HE}${warranty} ${durations[0]}`, 'aboutBlurb'), 'unrendered field');
  assert.ok(hit(`${HE}${warranty} ${durations[0]}`, 'heroSubheadline'));
});

test('M2b.1g 11: fact counters count rendered fields only on research sites; the trust bar counts as one field in the phrase cap', () => {
  const data = { guarantee: `${W1} ${W2} ${W3}`, yearsInField: '12 years' };
  const research = home(data);
  const phrase = `${W1} ${W2}`;
  // Unrendered fields never count.
  assert.deepEqual(rules(loose({ heroSubheadline: `12 ${phrase}`, aboutBlurb: `12 ${phrase}`, stickyBarLine: `12 ${phrase}`, guaranteeBlock: `12 ${phrase}` }), research, GATE_RULES.factRepeat), []);
  // The trust bar is one field however many items hold the phrase; with it, the cap of FACT_PHRASE_REPEAT_MAX is reached.
  const atCap = loose({ trustBarItems: [phrase, `${phrase} ${W4}`], heroSubheadline: phrase, aboutPageBody: `${phrase}.` });
  assert.deepEqual(rules(atCap, research, GATE_RULES.factRepeat), []);
  assert.deepEqual(rules({ ...atCap, formHeadline: phrase }, research, GATE_RULES.factRepeat).map(item => item.split('=')[1].split(':')[0]), ['phrase']);
  assert.ok(FACT_PHRASE_EXEMPT_FIELDS_RESEARCH.every(field => !['trustBarItems'].includes(field)));
  // Legacy contexts (no renderedFields) keep the M2a counting.
  const legacy = copyGateContext(data, []);
  assert.ok(rules(loose({ heroSubheadline: `12 ${phrase}`, aboutBlurb: `12 ${phrase}`, stickyBarLine: `12 ${phrase}` }), legacy, GATE_RULES.factRepeat).length > 0);
});

test('M2b.1g 12: prompt: C1-C6 on the homepage (with Yonatan\'s place line), C4 + C5 elsewhere; the guarantee fact; the trust-tile note', () => {
  const homeBrief = brief('leak-detection', 'homepage', W1, [W2]);
  const moneyBrief = brief('leak-detection', 'money_service', W1, [W2]);
  const homePrompt = buildResearchPageGenerationPrompt(homeBrief, { businessNiche: 'plumber', guarantee: 'x' });
  const moneyPrompt = buildResearchPageGenerationPrompt(moneyBrief, { businessNiche: 'plumber', guarantee: 'x' });
  for (const rule of M2B2_PROMPT_RULES) {
    assert.ok(homePrompt.includes(rule.text), `home ${rule.id}`);
    assert.equal(moneyPrompt.includes(rule.text), M2B2_EVERY_PAGE_RULE_IDS.includes(rule.id), `money ${rule.id}`);
  }
  assert.ok(homePrompt.includes(ABOUT_HEADLINE_PLACE_RULE) && !moneyPrompt.includes(ABOUT_HEADLINE_PLACE_RULE));
  assert.ok(!/[\u0590-\u05FF]/.test(ABOUT_HEADLINE_PLACE_RULE));
  assert.equal(GUARANTEE_BLOCK_RENDERED, false);
  for (const prompt of [homePrompt, moneyPrompt]) {
    assert.ok(prompt.includes('- guaranteeBlockRendered on this page (rule C4): false.'));
    assert.ok(prompt.includes(`Write at most ${TRUST_BAR_MAX_ITEMS - 1} items yourself`));
  }
  assert.ok(!buildResearchPageGenerationPrompt(brief('leak-detection', 'homepage'), { businessNiche: 'plumber' }).includes('Write at most'), 'no places, no tile note');
});
