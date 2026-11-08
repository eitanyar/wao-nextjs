// Paid-journey v2 M2a.3: generation-gate fixes from Noa's QA of the M2a.2 eval.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew values come from generationData.ts
// (scripted copy of docs/copy/site-bot-generation-data.md) or are read from that data file at test
// time; synthetic letter sequences are escapes and contain no gate token.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  ARRIVAL_TOKENS,
  CLAIM_TOKEN_WORD_END,
  CLAIM_TOKENS,
  FIX_TIME_LEAD_TOKENS,
  FIX_TIME_WITHIN_WORDS,
  FREE_CALLOUT_TOKENS,
  FREE_EXCLUSION_WORDS,
  FREE_SCOPE_NOUNS,
  FREE_TOKENS,
  GUARD_CUSTOMER_STEMS,
  GUARD_SPEECH_VERBS,
  GUARD_TOKEN_SOURCES,
  PLURAL_ADDRESS_TOKENS_DATA,
  PLURAL_PREFIX_MODES,
  PRICE_LOCK_TOKENS,
  SAME_DAY_FINISH_VERBS,
  SAME_DAY_TOKENS,
  SERVICE_AREA_HEAD_TOKENS,
  SERVICE_AREA_LAMED_HEADS,
  SERVICE_AREA_NEARBY_TOKENS,
  SERVICE_AREA_REGION_TOKENS,
  SERVICE_AREA_TAIL_TOKENS,
  SERVICE_LABEL_PINS,
  TEMPLATE_STRINGS,
  THERMAL_TOKENS,
  WAO_SERVICE_TERMS_DATA,
  WE_FORM_VERBS,
  WE_TOKENS_DATA,
} from './generationData';
import { CLAIM_RULES, FACT_PHRASE_REPEAT_MAX, FACT_REPEAT_MAX, PLURAL_ADDRESS_TOKENS, SERVICE_DESCRIPTION_MIN_CHARS, WAO_SERVICE_TERMS_HE, WE_FORM_TOKENS } from './copyGates.config';
import {
  claimTokenPattern,
  copyGateContext,
  copyReviewFlags,
  FIX_TIME_VERBS,
  freeClaims,
  ownerFreeClasses,
  serviceAreaHits,
  fixTimeScope,
  GATE_RULES,
  NAME_OPENER,
  pagePhrases,
  runCopyGates,
  sameDayFinishScope,
  tokenPattern,
  type CopyGateContext,
} from './copyGates';
import {
  applySafeDeterministicFixes,
  briefGateContext,
  buildResearchPageGenerationPrompt,
  generateResearchPageCopy,
  isInstallPage,
  REDUPLICATION_RULE,
  SINGULAR_ADDRESS_RULE,
  withSystemFields,
} from './researchPageCopy';
import { renderResearchedSitePages, type ResearchedSitePage } from './researchedSite';
import { renderSitePages } from './renderSitePages';
import { formatBusinessHoursHebrew } from './businessHours';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { SiteCopy } from './lpCopyPrompt';
import type { PageBrief } from '../site-bot/research/pageBrief';
import type { CollectedData } from '../bot/prompts';

const ROOT = path.resolve(__dirname, '../../..');
const DATA_FILE = path.join(ROOT, 'docs/copy/site-bot-generation-data.md');
const BET = '\u05D1';
// Synthetic Hebrew-script letter sequences (test data, not copy; contain no gate token).
const HE_WORD = '\u05D0\u05D1\u05D2\u05D3';
const W1 = '\u05D0\u05D1\u05D2';
const W2 = '\u05D3\u05D4\u05D6';
const W3 = '\u05D7\u05D8\u05D9\u05DA';
const LABEL_A = '\u05D2\u05D3\u05D4 \u05D6\u05D7\u05D8';
const INSTALL_LABEL = SERVICE_LABEL_PINS['water heater install'];
const LEAK_LABEL = SERVICE_LABEL_PINS['leak detection'];

const ctx = (overrides: Partial<CopyGateContext> = {}): CopyGateContext => ({
  soloOperator: true, serviceLabels: [], ownerFactsText: '', ownerFields: {}, reviewQuote: null, starRating: null, ...overrides,
});
const base: SiteCopy = {
  heroHeadline: 'Headline', heroSubheadline: 'Sub', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: [], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Promise',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form',
  stickyBarLine: 'Sticky', aboutPageHeadline: 'About page', aboutPageBody: 'About body', serviceDetails: [],
};
const loose = (copy: Partial<SiteCopy>) => ({ ...base, ...copy }) as unknown as Record<string, unknown>;
const ids = (hits: ReturnType<typeof runCopyGates>) => hits.map(hit => hit.actual ?? hit.rule);

function brief(pageName: string, labels: string[], sources: string[], pageClass = 'money_service'): PageBrief {
  return {
    page: { id: 'svc', targetPath: '/services/x', pageClass },
    persona: { id: 'persona', value: 'Local customer' }, waoOffer: { id: 'offer', value: 'offer' },
    targetQueries: [], approvedEntityAnchors: [{ id: 'entity-1', value: 'x' }], firstPartyProof: [],
    assertableLocalFacts: [], customerDecisions: [], constraints: [], links: [], informationGainGaps: [], prohibitedClaims: [],
    faqPolicy: 'none', faqCandidates: [],
    site: { pageName, relevanceTerm: pageName, city: null, serviceArea: [], serviceLabels: labels, serviceSources: sources, businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: pageClass === 'homepage' },
  };
}

// ---------------------------------------------------------------------------
// 1. Data blocks 6-13 loaded by script, counted, sourced; config lists extended.
// ---------------------------------------------------------------------------

test('M2a.3 1: generationData.ts carries data sections 6-13 byte-exact; config lists extend / replace the M2a.1 lists; --check passes', () => {
  const text = fs.readFileSync(DATA_FILE, 'utf8');
  const blocks = [...text.matchAll(/\n~~~json\n([\s\S]*?)\n~~~/g)].map(match => JSON.parse(match[1]));
  assert.equal(blocks.length, 23);
  const data = Object.assign({}, ...blocks);
  assert.deepEqual([...CLAIM_TOKEN_WORD_END], data.claimTokenWordEnd);
  assert.deepEqual([...FIX_TIME_LEAD_TOKENS], data.fixTimeLeadTokens);
  assert.deepEqual([...FIX_TIME_WITHIN_WORDS], data.fixTimeWithinWords);
  assert.deepEqual([...ARRIVAL_TOKENS], data.arrivalTokens);
  assert.deepEqual([...GUARD_CUSTOMER_STEMS], data.paraphraseGuard.customerStems);
  assert.deepEqual([...GUARD_SPEECH_VERBS], data.paraphraseGuard.speechVerbs);
  assert.deepEqual([...PLURAL_ADDRESS_TOKENS_DATA], data.pluralAddressTokens);
  assert.deepEqual([...WE_TOKENS_DATA], data.weTokens);
  assert.deepEqual([...WAO_SERVICE_TERMS_DATA], data.waoServiceTerms);
  assert.deepEqual([...THERMAL_TOKENS], data.thermalTokens);
  assert.deepEqual({ ...TEMPLATE_STRINGS }, data.templateStrings);
  // Edited claimTokens: 11 kinds incl. solo_operator, 59 tokens.
  assert.equal(Object.keys(CLAIM_TOKENS).length, 11);
  assert.equal(Object.values(CLAIM_TOKENS).flat().length, 59);
  assert.ok(CLAIM_TOKENS.solo_operator.length > 0);
  // Config: data tokens appended after the M2a.1 entries (indices stable); we-forms allowPrefix: true.
  // M2a.4: plural prefix classes come from the section 10 prefix note (see the M2a.4 tests).
  assert.deepEqual(PLURAL_ADDRESS_TOKENS.slice(-PLURAL_ADDRESS_TOKENS_DATA.length).map(entry => entry.token), [...PLURAL_ADDRESS_TOKENS_DATA]);
  // M2a.4 round 2: the section 18 verbs follow the section 10 weTokens.
  assert.deepEqual(WE_FORM_TOKENS.slice(-(WE_TOKENS_DATA.length + WE_FORM_VERBS.length), -WE_FORM_VERBS.length).map(entry => [entry.token, entry.allowPrefix]), WE_TOKENS_DATA.map(token => [token, true]));
  assert.deepEqual(WAO_SERVICE_TERMS_HE.slice(-WAO_SERVICE_TERMS_DATA.length), [...WAO_SERVICE_TERMS_DATA]);
  assert.deepEqual([...CLAIM_RULES.find(rule => rule.id === 'thermal')!.tokens], [...THERMAL_TOKENS]);
  // Every list records its data-file section.
  for (const key of ['claimTokens', 'claimTokenWordEnd', 'fixTimeLeadTokens', 'fixTimeWithinWords', 'arrivalTokens', 'customerStems', 'speechVerbs', 'pluralAddressTokens', 'weTokens', 'waoServiceTerms', 'thermalTokens', 'templateStrings']) {
    assert.match(GUARD_TOKEN_SOURCES[key] ?? '', /^docs\/copy\/site-bot-generation-data\.md section \d+\. /, key);
  }
  assert.equal(execFileSync('node', [path.join(ROOT, 'scripts/site-bot/build-generation-data.mjs'), '--check'], { encoding: 'utf8' }).trim(), 'generationData.ts up to date');
  for (const file of ['src/lib/lp/generationData.ts', 'src/lib/lp/copyGates.ts', 'src/lib/lp/researchPageCopy.ts', 'src/lib/lp/researchedSite.ts', 'src/lib/lp/generationGates.test.ts', 'scripts/site-bot/build-generation-data.mjs']) {
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, file), 'utf8'), /[\u0590-\u05FF]/, file);
  }
});

// ---------------------------------------------------------------------------
// 2. Word-end claim tokens (BLOCKER: Rehovot).
// ---------------------------------------------------------------------------

test('M2a.3 2: word-end claim tokens need a right boundary: a Rehovot city line passes, a real street line still hits', () => {
  // Noa's own examples, read from the data file: "<token>" does not match "<longer word>" (Rehovot).
  const section = fs.readFileSync(DATA_FILE, 'utf8').split('\n## 6.')[1].split('\n## ')[0];
  const rehovot = /"[^"]+" does not match "([^"]+)" \(Rehovot\)/.exec(section)?.[1];
  assert.ok(rehovot && rehovot.startsWith(CLAIM_TOKENS.street_address[0]));
  const cityLine = `${HE_WORD} ${rehovot} ${HE_WORD}`;
  assert.ok(cityLine.includes(CLAIM_TOKENS.street_address[0]), 'the M2a.2 substring matcher would have hit');
  assert.ok(!runCopyGates(loose({ aboutBlurb: cityLine, trustBarItems: [rehovot!] }), ctx()).some(hit => hit.actual === 'claim:street_address'));
  const streetLine = `${HE_WORD} ${CLAIM_TOKENS.street_address[0]} ${HE_WORD} 12`;
  assert.deepEqual(ids(runCopyGates(loose({ aboutBlurb: streetLine }), ctx())), ['claim:street_address']);
  // Every word-end token: no hit when a Hebrew letter follows, hit at a word end; other tokens stay substrings.
  for (const token of CLAIM_TOKEN_WORD_END) {
    assert.equal(claimTokenPattern(token).test(`${token}${BET}`), false, token);
    assert.equal(claimTokenPattern(token).test(`${token} ${HE_WORD}`), true, token);
    assert.equal(claimTokenPattern(token).test(`${token}.`), true, token);
  }
  const substring = CLAIM_TOKENS.walk_in[0];
  assert.equal(claimTokenPattern(substring).test(`${substring}${BET}`), true);
});

// ---------------------------------------------------------------------------
// 3. fix_time: lead tokens (also with a prefix), within-words, no "while" collisions, arrival.
// ---------------------------------------------------------------------------

test('M2a.3 3: fix_time = lead token + digit or within-word in a sentence with a label or fix verb; "while" forms and the bare verb tokens never hit; arrival is exempt', () => {
  const labels = [LABEL_A];
  const fixHit = (value: string, extra: Partial<CopyGateContext> = {}) => runCopyGates(loose({ aboutBlurb: value }), ctx({ serviceLabels: labels, ...extra })).some(hit => hit.actual === 'claim:fix_time');
  for (const lead of FIX_TIME_LEAD_TOKENS) {
    assert.ok(fixHit(`${LABEL_A} ${lead} 30 ${HE_WORD}`), `${lead} + digit`);
    assert.ok(fixHit(`${LABEL_A} ${lead}${FIX_TIME_WITHIN_WORDS[0]}`), `${lead} + within-word, no space`);
    for (const word of FIX_TIME_WITHIN_WORDS) assert.ok(fixHit(`${LABEL_A} ${lead} ${word}${HE_WORD}`), `${lead} ${word}`);
    // A lead token followed by any other word is the "while" usage: never a hit.
    assert.equal(fixHit(`${LABEL_A} ${lead} ${HE_WORD}`), false, `${lead} while`);
  }
  // The lead token after a prefix letter (the M2a.2 lookbehind blocked it).
  assert.ok(fixHit(`${LABEL_A} ${BET}${FIX_TIME_LEAD_TOKENS[0]} 30`));
  // A fix verb without a label is enough; the bare "<verb> <lead>" tokens alone are not.
  for (const verb of FIX_TIME_VERBS) assert.ok(fixHit(`${verb} ${FIX_TIME_LEAD_TOKENS[0]} 30`), verb);
  for (const token of CLAIM_TOKENS.fix_time) assert.equal(fixHit(`${token} ${HE_WORD}`), false, token);
  for (const arrival of ARRIVAL_TOKENS) assert.equal(fixHit(`${LABEL_A} ${arrival} ${FIX_TIME_LEAD_TOKENS[0]} 20`), false, arrival);
  assert.equal(fixHit(`${HE_WORD} ${FIX_TIME_LEAD_TOKENS[0]} 30`), false, 'neither label nor fix verb');
});

// ---------------------------------------------------------------------------
// 4. solo_operator: grammar-only prompt rule, claim kind authorised only by owner facts.
// ---------------------------------------------------------------------------

test('M2a.3 4: solo_operator is a claim kind (owner-fact keywords only); the address rule is grammar only; the legacy solo example never reaches the model', () => {
  const rule = CLAIM_RULES.find(item => item.id === 'solo_operator');
  assert.ok(rule);
  assert.deepEqual([...rule!.tokens], [...CLAIM_TOKENS.solo_operator]);
  for (const token of CLAIM_TOKENS.solo_operator) {
    assert.ok(runCopyGates(loose({ aboutBlurb: `${HE_WORD} ${token}` }), ctx()).some(hit => hit.actual === 'claim:solo_operator'), token);
  }
  const token = CLAIM_TOKENS.solo_operator[0];
  for (const fact of ['I answer myself, no call centre', 'Works alone', 'Solo plumber', 'No subcontractors', 'I come personally']) {
    assert.ok(!runCopyGates(loose({ aboutBlurb: token }), copyGateContext({ usp: fact }, [])).some(hit => hit.actual === 'claim:solo_operator'), fact);
  }
  assert.ok(runCopyGates(loose({ aboutBlurb: token }), copyGateContext({ usp: 'Licensed plumber, 12 years' }, [])).some(hit => hit.actual === 'claim:solo_operator'));
  assert.doesNotMatch(SINGULAR_ADDRESS_RULE, /solo operator/);
  assert.match(SINGULAR_ADDRESS_RULE, /grammar rule, not a fact about the business: never state or imply that the owner works alone, answers the phone personally, or has no subcontractors or no call centre, unless an owner fact says so/);
  const prompt = buildResearchPageGenerationPrompt(brief(LABEL_A, [LABEL_A], ['alpha']), { businessNiche: 'plumber' });
  for (const solo of CLAIM_TOKENS.solo_operator) assert.ok(!prompt.includes(solo), solo);
  assert.doesNotMatch(prompt, /banned only BARE/);
});

// ---------------------------------------------------------------------------
// 5. Phrase-level repetition cap (no digits needed).
// ---------------------------------------------------------------------------

test('M2a.3 5: a proof phrase (owner Hebrew clause, trust-bar item or guarantee block) above the cap per page is a hit; the trust bar, guarantee block and badge are exempt', () => {
  const phrase = `${W1} ${W2}`;
  const gates = copyGateContext({ guarantee: 'Two years' }, [LABEL_A]);
  const copy = loose({
    trustBarItems: [phrase], guaranteeBlock: `${phrase} ${W3}`, responseTimeBadge: phrase,
    heroSubheadline: `${HE_WORD} ${phrase}`, aboutBlurb: `${BET}${phrase} ${HE_WORD}`, aboutPageBody: `${HE_WORD}, ${phrase}.`, stickyBarLine: phrase,
  });
  const hits = runCopyGates(copy, gates).filter(hit => hit.rule === GATE_RULES.factRepeat);
  assert.equal(FACT_REPEAT_MAX, 2);
  // M2a.4: the phrase cap is FACT_PHRASE_REPEAT_MAX (3) fields per page: the 4th field (in field order) hits.
  assert.deepEqual(hits.map(hit => hit.field), ['aboutPageBody']);
  assert.ok(hits.every(hit => hit.actual?.startsWith('phrase:')));
  // Twice is fine.
  assert.deepEqual(runCopyGates(loose({ trustBarItems: [phrase], heroSubheadline: phrase, aboutBlurb: phrase }), gates), []);
  // Owner Hebrew guarantee / pricing / USP clauses are phrase sources too (no trust bar needed).
  const owner = copyGateContext({ pricingNotes: `${W3}, ${phrase}` }, []);
  assert.ok(pagePhrases(loose({ trustBarItems: [] }), owner).some(item => item.keys.includes(phrase)));
  assert.equal(runCopyGates(loose({ trustBarItems: [], heroSubheadline: phrase, aboutBlurb: phrase, aboutPageBody: phrase, stickyBarLine: phrase }), owner).filter(hit => hit.rule === GATE_RULES.factRepeat).length, 1);
  // A service label (or place / business name) repeats freely.
  const labelled = copyGateContext({}, [phrase]);
  assert.deepEqual(runCopyGates(loose({ trustBarItems: [phrase], heroHeadline: phrase, heroSubheadline: phrase, aboutBlurb: phrase, aboutPageBody: phrase }), labelled), []);
  // Short words (under 3 letters) never form a key.
  assert.deepEqual(pagePhrases(loose({ trustBarItems: ['\u05D0\u05D1 \u05D2\u05D3'] }), ctx()), []);
});

// ---------------------------------------------------------------------------
// 6. Installation pages: arrival times are a hard gate; the review flag covers more fields.
// ---------------------------------------------------------------------------

test('M2a.3 6: on an installation page every arrival-time phrase is a hard repair and the response badge is system-null; the review flag also covers sub-headline, trust bar and sticky bar', () => {
  const labels = [INSTALL_LABEL, LEAK_LABEL];
  const install = brief(INSTALL_LABEL, labels, ['water heater install', 'leak detection']);
  const repair = brief(LEAK_LABEL, [LEAK_LABEL, INSTALL_LABEL], ['leak detection', 'water heater install']);
  assert.equal(isInstallPage(install), true);
  assert.equal(isInstallPage(repair), false);
  assert.equal(isInstallPage(brief(INSTALL_LABEL, labels, ['water heater install', 'leak detection'], 'homepage')), false);
  const arrival = `${ARRIVAL_TOKENS[0]} ${FIX_TIME_LEAD_TOKENS[0]} 20 ${FIX_TIME_WITHIN_WORDS[0]}`;
  const numberOnly = `${ARRIVAL_TOKENS[0]} 20 ${FIX_TIME_WITHIN_WORDS[0]}`;
  const data: CollectedData = { businessNiche: 'plumber', responseTime: '20 minutes', guarantee: 'x' };
  for (const field of ['heroHeadline', 'heroSubheadline', 'aboutBlurb', 'stickyBarLine'] as const) {
    assert.deepEqual(runCopyGates(loose({ [field]: arrival }), briefGateContext(install, data)).map(hit => hit.rule), [GATE_RULES.installArrival], field);
    assert.deepEqual(runCopyGates(loose({ [field]: arrival }), briefGateContext(repair, data)), [], `${field} on a repair page`);
  }
  assert.deepEqual(runCopyGates(loose({ trustBarItems: [numberOnly] }), briefGateContext(install, data)).map(hit => hit.rule), [GATE_RULES.installArrival]);
  assert.equal(withSystemFields(loose({ responseTimeBadge: arrival }), install, data).responseTimeBadge, null);
  assert.equal(withSystemFields(loose({ responseTimeBadge: arrival }), repair, data).responseTimeBadge, arrival);
  assert.match(buildResearchPageGenerationPrompt(install, data), /INSTALLATION PAGE \(binding\)/);
  assert.doesNotMatch(buildResearchPageGenerationPrompt(repair, data), /INSTALLATION PAGE/);
  // Review flag (any page): arrival time in a heading or short proof line naming the installation service.
  const named = `${INSTALL_LABEL} ${arrival}`;
  const gates = ctx({ serviceLabels: labels });
  for (const field of ['heroHeadline', 'heroSubheadline', 'stickyBarLine'] as const) {
    assert.deepEqual(copyReviewFlags(loose({ [field]: named }), gates), [{ field, flag: 'arrival_time_in_installation_heading' }], field);
  }
  assert.deepEqual(copyReviewFlags(loose({ trustBarItems: ['x', named] }), gates), [{ field: 'trustBarItems[1]', flag: 'arrival_time_in_installation_heading' }]);
  assert.deepEqual(copyReviewFlags(loose({ aboutBlurb: named }), gates), [], 'body text is not flagged');
});

// ---------------------------------------------------------------------------
// 7. Customer-source facts: fix-time scope; review-quote words never become owner claims.
// ---------------------------------------------------------------------------

test('M2a.3 7: a same-day / fix-time claim is authorised only for the services the owner fact names; the response time never authorises it; customer-quote words are rejected', () => {
  const labels = [LEAK_LABEL, INSTALL_LABEL];
  const sources = ['leak detection', 'water heater install'];
  const data: CollectedData = { usp: 'Same-day leak fixes with a camera inspection', responseTime: 'Same day in Holon' };
  const scope = fixTimeScope(copyGateContext(data, labels, true, [], { serviceSources: sources }));
  assert.ok(scope instanceof Set && [...scope].join() === LEAK_LABEL);
  const onPage = (label: string) => copyGateContext(data, labels, true, [], { serviceSources: sources, pageServiceLabel: label });
  const verb = FIX_TIME_VERBS.find(item => item) as string;
  const timed = `${verb} ${FIX_TIME_LEAD_TOKENS[0]} 30`;
  // Same-day style (fix verb + whole within-word, no lead token): a claim only outside the scope.
  const sameDay = `${verb} ${HE_WORD} ${FIX_TIME_WITHIN_WORDS.find(word => !word.includes(' '))}`;
  for (const value of [timed, sameDay]) {
    assert.ok(runCopyGates(loose({ aboutBlurb: value }), onPage(INSTALL_LABEL)).some(hit => hit.actual === 'claim:fix_time'), 'install page is out of scope');
    assert.ok(!runCopyGates(loose({ aboutBlurb: value }), onPage(LEAK_LABEL)).some(hit => hit.actual === 'claim:fix_time'), 'leak page is in scope');
  }
  // On the homepage the sentence's own label decides.
  const home = copyGateContext(data, labels, true, [], { serviceSources: sources });
  assert.ok(runCopyGates(loose({ aboutBlurb: `${INSTALL_LABEL} ${timed}` }), home).some(hit => hit.actual === 'claim:fix_time'));
  assert.ok(!runCopyGates(loose({ aboutBlurb: `${LEAK_LABEL} ${timed}` }), home).some(hit => hit.actual === 'claim:fix_time'));
  // The response time alone never authorises a fix-time claim.
  const responseOnly = copyGateContext({ responseTime: 'Same day in Holon' }, labels, true, [], { serviceSources: sources, pageServiceLabel: LEAK_LABEL });
  assert.equal(fixTimeScope(responseOnly), null);
  assert.ok(runCopyGates(loose({ aboutBlurb: timed }), responseOnly).some(hit => hit.actual === 'claim:fix_time'));
  // A service-less owner claim covers every service.
  assert.equal(fixTimeScope(copyGateContext({ usp: 'Same-day service' }, labels, true, [], { serviceSources: sources })), 'all');
  // Customer quote: its own phrases (not also owner facts) may not appear outside reviewFeatured.
  const quote = `${W1} ${W2} ${HE_WORD}, ${W3} ${HE_WORD}`;
  const quoted = copyGateContext({ reviewQuote: quote, usp: `${W3} ${HE_WORD}` }, []);
  assert.deepEqual(runCopyGates(loose({ heroSubheadline: `${HE_WORD} ${W1} ${W2}` }), quoted).map(hit => hit.rule), [GATE_RULES.customerSource]);
  assert.deepEqual(runCopyGates(loose({ heroSubheadline: `${W3} ${HE_WORD}` }), quoted), [], 'also an owner fact');
  assert.deepEqual(runCopyGates(loose({ reviewFeatured: quote }), quoted), [], 'the verbatim quote itself');
  // Prompt rule: neither the customer's words nor the opposite of the fear become an owner promise.
  const prompt = buildResearchPageGenerationPrompt(brief(LEAK_LABEL, labels, sources), data);
  assert.match(prompt, /never turn what a customer said .* or the opposite of the customer's fear .* into the owner's promise or guarantee/i);
  assert.match(prompt, new RegExp(`same-day / fix-within promise from the owner covers only these services: \\["${LEAK_LABEL}"\\]`));
});

// ---------------------------------------------------------------------------
// 8. Availability figures.
// ---------------------------------------------------------------------------

test('M2a.3 8: an availability figure (N/M) the owner did not write is a hit; the owner\'s exact figure passes', () => {
  assert.deepEqual(runCopyGates(loose({ stickyBarLine: `${HE_WORD} \u2014 24/6` }), copyGateContext({ usp: 'Around the clock, 24 hours a day' }, [])).map(hit => hit.rule), [GATE_RULES.availability]);
  assert.deepEqual(runCopyGates(loose({ stickyBarLine: `${HE_WORD} 24/7` }), copyGateContext({ usp: 'Available 24/7' }, [])), []);
  assert.deepEqual(runCopyGates(loose({ stickyBarLine: `${HE_WORD} 24 / 7` }), copyGateContext({ usp: 'Available 24/7' }, [])), []);
  assert.deepEqual(runCopyGates(loose({ aboutBlurb: `${HE_WORD} 24 ${HE_WORD}` }), copyGateContext({}, [])), []);
  assert.match(buildResearchPageGenerationPrompt(brief(LABEL_A, [LABEL_A], ['alpha']), {}), /Never write an availability figure such as 24\/7 or 24\/6 unless the owner wrote exactly that figure/);
});

// ---------------------------------------------------------------------------
// 9-10. Template strings on researched sites; legacy unchanged; split hours fixture.
// ---------------------------------------------------------------------------

const pageCopy = (overrides: Partial<SiteCopy> = {}): SiteCopy => ({ ...base, heroCta: 'CallNow', formHeadline: 'FormHead', ...overrides });
const sitePages: ResearchedSitePage[] = [
  { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: pageCopy(), seo: { name: LABEL_A, city: HE_WORD, serviceArea: [HE_WORD] } },
  { opportunityId: 'svc-alpha', classification: 'money_service', targetPath: '/services/alpha', copy: pageCopy(), seo: { name: LABEL_A, city: HE_WORD, serviceArea: [HE_WORD] } },
];
const renderInputs = { theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il' };
const splitHours: CollectedData = {
  businessName: 'TEST M2a3 Plumbing', businessNiche: 'plumber', phone: '050-0000000', targetLocation: 'Rehovot',
  specificCities: 'Rehovot, Ness Ziona', businessHours: 'Sun-Thu 08:00-18:00, Fri 08:00-13:00', ownerName: HE_WORD,
};
const researched = (data: CollectedData) => renderResearchedSitePages({ ...renderInputs, data, pages: sitePages, graphEdges: [{ fromId: 'home', toId: 'svc-alpha' }, { fromId: 'svc-alpha', toId: 'home' }] });

test('M2a.3 9: researched forms use templateStrings (submit label, thanks); contact has one formHeadline heading; legal prefix rule; legacy markup unchanged', () => {
  const site = researched(splitHours);
  for (const file of ['contact.html', 'index.html', 'services/alpha.html']) {
    const html = site[file];
    assert.ok(html, file);
    assert.ok(html.includes(`class="submit-btn">${TEMPLATE_STRINGS.formSubmitLabel}</button>`), file);
    assert.ok(html.includes(`<div id="form-success">${TEMPLATE_STRINGS.formThanks}</div>`), file);
    assert.ok(!html.includes('class="submit-btn">CallNow<'), file);
    assert.ok(html.includes(`btn.textContent = '${TEMPLATE_STRINGS.formSubmitLabel}';`), `${file}: error reset label`);
  }
  const contact = site['contact.html'];
  assert.equal((contact.match(/>FormHead<\/h[12]>/g) ?? []).length, 1, 'formHeadline once');
  assert.match(contact, /<h1[^>]*>FormHead<\/h1>/);
  // Legal pages: attached prefix before a Hebrew owner name, hyphen before a Latin one (and before WCAG).
  for (const file of ['privacy.html', 'accessibility.html']) {
    assert.ok(site[file].includes(HE_WORD) && !site[file].includes(`-${HE_WORD}`), file);
    const latin = researched({ ...splitHours, ownerName: 'Test Owner A' })[file];
    assert.ok(latin.includes('-Test Owner A'), `${file} latin`);
  }
  assert.ok(site['accessibility.html'].includes('-WCAG 2.0'));
  // Legacy path: hero CTA on the button, legacy thanks line, H2 on the contact form, hyphen before every name.
  const legacy = renderSitePages({ ...renderInputs, data: splitHours, copy: pageCopy() });
  assert.ok(legacy['contact.html'].includes('class="submit-btn">CallNow</button>'));
  assert.ok(!legacy['contact.html'].includes(TEMPLATE_STRINGS.formThanks));
  assert.equal((legacy['contact.html'].match(/>FormHead<\/h[12]>/g) ?? []).length, 2);
  assert.ok(legacy['privacy.html'].includes(`-${HE_WORD}`));
});

test('M2a.3 10: split Sun-Thu + Fri hours render with the ", " join on a researched contact page', () => {
  const expected = formatBusinessHoursHebrew(splitHours.businessHours!);
  assert.ok(expected && expected.includes(', '));
  assert.ok(researched(splitHours)['contact.html'].includes(expected!));
  // The eval fixture (fixtures/site-bot/eval-split-hours.json) carries the same split hours.
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/site-bot/eval-split-hours.json'), 'utf8')) as CollectedData;
  assert.equal(fixture.businessHours, splitHours.businessHours);
  assert.ok(researched(fixture)['contact.html'].includes(expected!));
});

test('M2a.3 safe fix: a list item over its character limit is dropped whole (never shortened) while another item remains', () => {
  const long = 'x'.repeat(21);
  const fixed = applySafeDeterministicFixes(loose({ trustBarItems: ['ok', long, 'fine'] }));
  assert.deepEqual(fixed.value.trustBarItems, ['ok', 'fine']);
  assert.deepEqual(fixed.fixes, ['drop_overlong_items:trustBarItems:3->2']);
  // The only item is never dropped (the validator then fails the page instead).
  assert.deepEqual(applySafeDeterministicFixes(loose({ trustBarItems: [long] })).value.trustBarItems, [long]);
});

// ---------------------------------------------------------------------------
// M2a.4: Noa's M2a.3 data (sections 14-15, section 10 prefix note) and the generation fixes.
// ---------------------------------------------------------------------------

const SHIN = '\u05E9';
const VAV_LETTER = '\u05D5';

test('M2a.4 1: sections 14-15 and the section 10 prefix note are loaded byte-exact; every plural token has its prefix class', () => {
  const text = fs.readFileSync(DATA_FILE, 'utf8');
  const data = Object.assign({}, ...[...text.matchAll(/\n~~~json\n([\s\S]*?)\n~~~/g)].map(match => JSON.parse(match[1])));
  assert.deepEqual([...SAME_DAY_TOKENS], data.sameDayTokens);
  assert.deepEqual([...SAME_DAY_FINISH_VERBS], data.sameDayFinishVerbs);
  assert.deepEqual([...PRICE_LOCK_TOKENS], data.priceLockTokens);
  assert.equal(SAME_DAY_TOKENS.length, 10);
  assert.equal(SAME_DAY_FINISH_VERBS.length, 9);
  assert.equal(PRICE_LOCK_TOKENS.length, 23);
  for (const key of ['sameDayTokens', 'sameDayFinishVerbs', 'priceLockTokens', 'pluralPrefixModes']) {
    assert.match(GUARD_TOKEN_SOURCES[key] ?? '', /^docs\/copy\/site-bot-generation-data\.md section 1[045]\. /, key);
  }
  // Every config plural token (M2a.1 + section 10) has exactly the class of its prefix-note bullet.
  assert.equal(Object.keys(PLURAL_PREFIX_MODES).length, PLURAL_ADDRESS_TOKENS.length);
  for (const entry of PLURAL_ADDRESS_TOKENS) {
    const mode = PLURAL_PREFIX_MODES[entry.token];
    assert.ok(mode, entry.token);
    assert.equal(entry.allowPrefix, mode === 'vav' ? 'vav' : true, entry.token);
    assert.equal(tokenPattern(entry).test(`${VAV_LETTER}${entry.token}`), true, `vav ${entry.token}`);
    // Vav-only tokens never match after shin (a relative clause: customers who called); full-set tokens do.
    assert.equal(tokenPattern(entry).test(`${SHIN}${entry.token}`), mode === 'full', `shin ${entry.token}`);
  }
  assert.equal(Object.values(PLURAL_PREFIX_MODES).filter(mode => mode === 'vav').length, 13);
  // A price-lock claim rule and the data are wired.
  assert.deepEqual([...CLAIM_RULES.find(rule => rule.id === 'price_lock')!.tokens], [...PRICE_LOCK_TOKENS]);
});

test('M2a.4 2: a price-lock claim needs an owner fact; a review quote or the customer fear never authorises it', () => {
  const hit = (value: string, data: CollectedData) => runCopyGates(loose({ aboutBlurb: value }), copyGateContext(data, [])).some(item => item.actual === 'claim:price_lock');
  for (const token of PRICE_LOCK_TOKENS) assert.ok(hit(`${HE_WORD} ${token} ${HE_WORD}`, { usp: 'Licensed, 10 years' }), token);
  const token = PRICE_LOCK_TOKENS[0];
  for (const usp of ['Gives a fixed price before any work starts', 'Final price up front', "The price won't change", 'No extras on the bill']) {
    assert.equal(hit(`${HE_WORD} ${token}`, { usp }), false, usp);
  }
  assert.equal(hit(`${HE_WORD} ${token}`, { pricingNotes: `${HE_WORD} ${token}` }), false, 'Hebrew owner wording');
  assert.equal(hit(`${HE_WORD} ${token}`, { reviewQuote: `${HE_WORD} ${token} ${HE_WORD}` }), true, 'review quote');
  assert.equal(hit(`${HE_WORD} ${token}`, { idealClientFear: `${HE_WORD} ${token}` }), true, 'customer fear');
  assert.equal(hit(`${HE_WORD} ${token}`, { idealClientFear: 'That the price will not change is a lie' }), true, 'English fear');
});

test('M2a.4 3: same-day promises: arrival needs a response time; finishing the job needs an owner usp / guarantee and stays in its service scope', () => {
  const labels = [LEAK_LABEL, INSTALL_LABEL];
  const sources = ['leak detection', 'water heater install'];
  const ids4 = (value: string, data: CollectedData, page: string | null = null) =>
    runCopyGates(loose({ aboutBlurb: value }), copyGateContext(data, labels, true, [], { serviceSources: sources, pageServiceLabel: page }))
      .map(item => item.actual).filter(id => id === 'claim:same_day_arrival' || id === 'claim:same_day_finish');
  const day = SAME_DAY_TOKENS[0];
  const arrival = `${ARRIVAL_TOKENS[0]} ${day}`;
  const finish = `${SAME_DAY_FINISH_VERBS[0]} ${day}`;
  // Every same-day token makes a same-day promise (no owner facts at all).
  for (const token of SAME_DAY_TOKENS) assert.ok(ids4(`${HE_WORD} ${token} ${HE_WORD}`, {}).length > 0, token);
  // Arrival: the response time authorises it.
  assert.deepEqual(ids4(arrival, {}), ['claim:same_day_arrival']);
  assert.deepEqual(ids4(arrival, { responseTime: 'Same day in Holon' }), []);
  // Finish: never authorised by the response time; an owner usp names the service scope.
  for (const verb of SAME_DAY_FINISH_VERBS) assert.deepEqual(ids4(`${verb} ${day}`, { responseTime: 'Same day in Holon' }), ['claim:same_day_finish'], verb);
  const usp = { usp: 'Same-day leak fixes with a camera inspection', responseTime: 'Same day in Holon' };
  assert.ok(sameDayFinishScope(copyGateContext(usp, labels, true, [], { serviceSources: sources })) instanceof Set);
  assert.deepEqual(ids4(finish, usp, LEAK_LABEL), [], 'leak page is in scope');
  assert.deepEqual(ids4(finish, usp, INSTALL_LABEL), ['claim:same_day_finish'], 'install page is out of scope');
  assert.deepEqual(ids4(`${INSTALL_LABEL} ${finish}`, usp), ['claim:same_day_finish'], 'homepage: the sentence label decides');
  assert.deepEqual(ids4(`${LEAK_LABEL} ${finish}`, usp), []);
  // A guarantee may authorise it too; other owner fields (e.g. pricing notes) never.
  assert.deepEqual(ids4(finish, { guarantee: 'Same day repair or no charge' }, LEAK_LABEL), []);
  assert.deepEqual(ids4(finish, { pricingNotes: 'Same-day fixes' }, LEAK_LABEL), ['claim:same_day_finish']);
  // A same-day sentence with neither an arrival token nor a finish verb is held to the arrival rule.
  assert.deepEqual(ids4(`${HE_WORD} ${day}`, {}), ['claim:same_day_arrival']);
  assert.deepEqual(ids4(`${HE_WORD} ${day}`, { responseTime: '20 minutes' }), []);
});

test('M2a.4 4: a reduplicated word joined by a hyphen or en-dash is a hit; the maqaf form passes', () => {
  const hits = (value: string) => runCopyGates(loose({ aboutBlurb: value }), ctx()).filter(item => item.rule === GATE_RULES.reduplicationDash).length;
  assert.equal(hits(`${HE_WORD} ${W1}-${W1} ${HE_WORD}`), 1);
  assert.equal(hits(`${HE_WORD} ${W1} - ${W1}`), 1);
  assert.equal(hits(`${W1}–${W1}`), 1);
  assert.equal(hits(`${HE_WORD} ${W1}\u05BE${W1} ${HE_WORD}`), 0);
  assert.equal(hits(`${W1}-${W2}`), 0, 'different words (a place name, a range) are not reduplication');
  assert.equal(hits(`${W1}-${W1}${BET}`), 0, 'second word must end the token');
  assert.match(REDUPLICATION_RULE, /maqaf \(\u05BE\)/);
});

test('M2a.4 5: the self-introduction must use the owner name exactly as in the facts (no transliteration)', () => {
  assert.ok(NAME_OPENER.length > 0 && !/[A-Za-z]/.test(NAME_OPENER), 'opener read from the prompt template');
  const latin = copyGateContext({ ownerName: 'Test Owner A' }, []);
  const hits = (value: string, gates: CopyGateContext) => runCopyGates(loose({ aboutBlurb: value }), gates).filter(item => item.rule === GATE_RULES.nameSpelling).length;
  assert.equal(hits(`${NAME_OPENER} Test, ${HE_WORD}`, latin), 0);
  assert.equal(hits(`${NAME_OPENER} Test Owner A, ${HE_WORD}`, latin), 0);
  assert.equal(hits(`${NAME_OPENER} ${W1}, ${HE_WORD}`, latin), 1, 'Latin name in Hebrew letters');
  const hebrew = copyGateContext({ ownerName: `${W1} ${W2}` }, []);
  assert.equal(hits(`${NAME_OPENER} ${W1}, ${HE_WORD}`, hebrew), 0);
  assert.equal(hits(`${NAME_OPENER} ${W3}, ${HE_WORD}`, hebrew), 1);
  assert.equal(hits(`${HE_WORD}${NAME_OPENER} ${W3}`, hebrew), 0, 'inside a longer word');
  assert.equal(hits(`${NAME_OPENER} ${W3}`, ctx()), 0, 'no owner name: gate off');
});

test('M2a.4 6: serviceDetails descriptions have a minimum length on research sites only', () => {
  const site = briefGateContext(brief(LABEL_A, [LABEL_A], ['alpha']), {});
  const short = loose({ serviceDetails: [{ name: LABEL_A, description: 'x'.repeat(SERVICE_DESCRIPTION_MIN_CHARS - 1) }] });
  const long = loose({ serviceDetails: [{ name: LABEL_A, description: 'x'.repeat(SERVICE_DESCRIPTION_MIN_CHARS) }] });
  assert.deepEqual(runCopyGates(short, site).map(item => `${item.field}|${item.rule}`), [`serviceDetails[0].description|${GATE_RULES.shortDescription}`]);
  assert.deepEqual(runCopyGates(long, site), []);
  assert.deepEqual(runCopyGates(short, copyGateContext({}, [LABEL_A])), [], 'non-research context');
});

test('M2a.4 7: the phrase cap counts fields (repeats inside one field count once), at most FACT_PHRASE_REPEAT_MAX per page', () => {
  const phrase = `${W1} ${W2}`;
  const gates = copyGateContext({ guarantee: 'Two years' }, [LABEL_A]);
  assert.equal(FACT_PHRASE_REPEAT_MAX, 3);
  const repeat = (copy: Partial<SiteCopy>) => runCopyGates(loose({ trustBarItems: [phrase], ...copy }), gates).filter(item => item.rule === GATE_RULES.factRepeat);
  assert.deepEqual(repeat({ heroSubheadline: `${phrase}, ${phrase}`, aboutBlurb: phrase, aboutPageBody: phrase }), []);
  assert.deepEqual(repeat({ heroSubheadline: phrase, aboutBlurb: phrase, aboutPageBody: phrase, stickyBarLine: phrase }).map(item => item.field), ['aboutPageBody']);
});

test('M2a.4 8: prompt rules for we-forms in every tense, exact names, service area, free of charge, price lock, same day, maqaf and description length', async () => {
  const site = brief(LABEL_A, [LABEL_A], ['alpha']);
  const prompt = buildResearchPageGenerationPrompt(site, { businessNiche: 'plumber' });
  assert.match(prompt, /VOICE \(binding\): the first-person plural is forbidden in every tense and form/);
  assert.match(prompt, /NAMES \(binding\): .*Never transliterate a Latin name into Hebrew letters/);
  assert.match(prompt, /SERVICE AREA \(binding\): every field, including trustBarItems, names only the places/);
  assert.match(prompt, /FREE OF CHARGE \(binding\)/);
  assert.match(prompt, /PRICE \(binding\): never promise that the price is fixed, final or will not change/);
  assert.match(prompt, /SAME DAY \(binding\)/);
  assert.ok(prompt.includes(REDUPLICATION_RULE));
  assert.ok(prompt.includes(`at least ${SERVICE_DESCRIPTION_MIN_CHARS} characters`));
  const systems: string[] = [];
  const copy = { ...base, serviceDetails: [{ name: LABEL_A, description: 'x'.repeat(SERVICE_DESCRIPTION_MIN_CHARS) }], formHeadline: `${W1}-${W1}` };
  await generateResearchPageCopy(site, { businessNiche: 'plumber' }, {
    callJson: async (system, user) => {
      systems.push(system);
      if (/repairing specific fields/.test(system)) {
        assert.match(user, /join the two words with a maqaf/);
        return JSON.stringify({ formHeadline: 'Form' });
      }
      return JSON.stringify(copy);
    },
  });
  assert.ok(systems.filter(system => /^You are Noa|repairing specific fields/.test(system)).every(system => system.includes(REDUPLICATION_RULE)));
  assert.ok(systems.some(system => /repairing specific fields/.test(system)));
});

test('M2a.4 9: the AC-repair x Rishon LeZion eval fixture (market-scan slot 5) has the eval fixture shape', () => {
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/site-bot', name), 'utf8')) as Record<string, unknown>;
  const ac = read('eval-ac-repair-rishon.json');
  const shape = read('eval-split-hours.json');
  for (const key of Object.keys(shape)) assert.ok(key in ac, key);
  assert.equal(ac.targetLocation, 'Rishon LeZion');
  assert.match(String(ac.primaryService), /^AC repair$/);
  assert.match(String(ac.businessName), /^TEST /);
  assert.doesNotMatch(JSON.stringify(ac), /[\u0590-\u05FF]/);
});

// ---------------------------------------------------------------------------
// M2a.4 round 2: Noa sections 16-18 and the same-day label correction.
// ---------------------------------------------------------------------------

const PLACE_A = '\u05D0\u05D1\u05D2\u05D3 \u05D4\u05D5\u05D6';
const PLACE_B = '\u05D7\u05D8\u05D9';

test('M2a.4 r2 1: sections 16-18 are loaded byte-exact with their prose-derived lists', () => {
  const text = fs.readFileSync(DATA_FILE, 'utf8');
  const data = Object.assign({}, ...[...text.matchAll(/\n~~~json\n([\s\S]*?)\n~~~/g)].map(match => JSON.parse(match[1])));
  assert.deepEqual([...SERVICE_AREA_TAIL_TOKENS], data.serviceAreaTailTokens);
  assert.deepEqual([...SERVICE_AREA_HEAD_TOKENS], data.serviceAreaHeadTokens);
  assert.deepEqual([...SERVICE_AREA_REGION_TOKENS], data.serviceAreaRegionTokens);
  assert.deepEqual([...SERVICE_AREA_NEARBY_TOKENS], data.serviceAreaNearbyTokens);
  assert.deepEqual(JSON.parse(JSON.stringify(FREE_SCOPE_NOUNS)), data.freeScopeNouns);
  assert.deepEqual([...FREE_TOKENS], data.freeTokens);
  assert.deepEqual([...FREE_CALLOUT_TOKENS], data.freeCalloutTokens);
  assert.deepEqual([...WE_FORM_VERBS], data.weFormVerbs);
  assert.deepEqual([SERVICE_AREA_TAIL_TOKENS.length, SERVICE_AREA_HEAD_TOKENS.length, SERVICE_AREA_REGION_TOKENS.length, SERVICE_AREA_NEARBY_TOKENS.length], [11, 6, 18, 16]);
  assert.deepEqual([FREE_TOKENS.length, FREE_CALLOUT_TOKENS.length, Object.keys(FREE_SCOPE_NOUNS).length, Object.values(FREE_SCOPE_NOUNS).flat().length, WE_FORM_VERBS.length], [22, 9, 6, 29, 64]);
  // Prose-derived: the two lamed heads are head tokens; five exclusion words, all quoted in the section 17 note.
  assert.equal(SERVICE_AREA_LAMED_HEADS.length, 2);
  for (const head of SERVICE_AREA_LAMED_HEADS) assert.ok(SERVICE_AREA_HEAD_TOKENS.includes(head));
  assert.equal(FREE_EXCLUSION_WORDS.length, 5);
  for (const word of FREE_EXCLUSION_WORDS) assert.ok(text.split('\n## 17.')[1].includes(`"${word}"`));
  // Section 18 verbs extend the we-form gate (allowPrefix: true).
  assert.deepEqual(WE_FORM_TOKENS.slice(-WE_FORM_VERBS.length).map(entry => [entry.token, entry.allowPrefix]), WE_FORM_VERBS.map(token => [token, true]));
  for (const key of ['serviceAreaTailTokens', 'freeTokens', 'freeScopeNouns', 'weFormVerbs']) assert.match(GUARD_TOKEN_SOURCES[key] ?? '', /section 1[678]\. /, key);
});

test('M2a.4 r2 2: service area: tail after a place, head before a place, region anywhere, nearby anywhere; owner places masked; travel distance never authorises', () => {
  const gates = (data: CollectedData = {}) => copyGateContext({ targetLocation: 'Alpha', specificCities: 'Alpha, Beta', travelBoundary: 'Up to 15 km, and surroundings', ...data }, [], true, [PLACE_A, PLACE_B]);
  const kinds = (value: string, data: CollectedData = {}) => serviceAreaHits(value, gates(data)).map(hit => hit.kind);
  const tail = SERVICE_AREA_TAIL_TOKENS[0];
  assert.deepEqual(kinds(`${HE_WORD} ${PLACE_A} ${tail}`), ['tail']);
  assert.deepEqual(kinds(`${BET}${PLACE_B}, ${tail}`), ['tail']);
  assert.deepEqual(kinds(`${HE_WORD} ${tail}`), [], 'after another word');
  const direct = SERVICE_AREA_HEAD_TOKENS.find(token => !SERVICE_AREA_LAMED_HEADS.includes(token))!;
  const lamed = SERVICE_AREA_LAMED_HEADS[0];
  assert.deepEqual(kinds(`${direct} ${PLACE_A}`), ['head']);
  assert.deepEqual(kinds(`${BET}${direct} ${PLACE_A}`), ['head'], 'bet prefix');
  assert.deepEqual(kinds(`\u05D4${direct} ${PLACE_A}`), [], 'never he');
  assert.deepEqual(kinds(`${direct} ${HE_WORD}`), [], 'next word is no place');
  assert.deepEqual(kinds(`${lamed} \u05DC${PLACE_B}`), ['head']);
  for (const region of SERVICE_AREA_REGION_TOKENS) {
    assert.ok(kinds(`${HE_WORD} \u05D5${region}`).includes('region'), region);
    assert.equal(kinds(`${HE_WORD} ${region}\u05D9`).includes('region'), false, `${region} + letter`);
  }
  for (const nearby of SERVICE_AREA_NEARBY_TOKENS) assert.deepEqual(kinds(`${HE_WORD} ${nearby}`), ['nearby'], nearby);
  // A region token inside an owner place name is masked.
  const region = SERVICE_AREA_REGION_TOKENS[0];
  const placeWithRegion = `${PLACE_B} ${region}`;
  assert.deepEqual(serviceAreaHits(`${HE_WORD} ${placeWithRegion}`, copyGateContext({}, [], true, [placeWithRegion])), []);
  // Authorisation: the owner's own area answer (not the travel distance), and a region the owner named.
  assert.deepEqual(kinds(`${PLACE_A} ${tail}`, { specificCities: 'Alpha and surroundings' }), []);
  assert.deepEqual(kinds(`${HE_WORD} ${region}`, { usp: `${HE_WORD} ${region}` }), []);
  assert.deepEqual(kinds(`${HE_WORD} ${region}`, { responseTime: region, reviewQuote: region }), ['region']);
  // The gate reports one hit per kind per field.
  assert.deepEqual(runCopyGates(loose({ trustBarItems: [`${PLACE_A} ${tail}`] }), gates()).map(hit => hit.actual), ['service_area:tail']);
});

test('M2a.4 r2 3: free claims are scoped by the nearest clause noun; the owner authorises a class only in one clause; unscoped and review-quote frees are rejected', () => {
  const quote = FREE_SCOPE_NOUNS.quote[0];
  const inspection = FREE_SCOPE_NOUNS.inspection[0];
  const free = FREE_TOKENS[0];
  assert.deepEqual(freeClaims(`${quote} ${free}`), ['quote']);
  assert.deepEqual(freeClaims(`${free} ${inspection}${HE_WORD}`), ['inspection'], 'noun after when none before');
  assert.deepEqual(freeClaims(`${quote}, ${HE_WORD} ${free}`), [null], 'clause-scoped');
  assert.deepEqual(freeClaims(`${inspection} ${quote} ${free}`), ['quote'], 'nearest before');
  assert.deepEqual(freeClaims(`${FREE_SCOPE_NOUNS.warranty_return[0]} ${free}`), ['warranty_return'], 'longest match first');
  assert.deepEqual(freeClaims(`${HE_WORD} ${FREE_CALLOUT_TOKENS[0]}`), ['callout']);
  for (const word of FREE_EXCLUSION_WORDS) assert.deepEqual(freeClaims(`${quote} ${FREE_TOKENS[3]} ${word}`), [], word);
  for (const token of FREE_TOKENS) assert.equal(freeClaims(`${quote} ${token}`).length >= 1, true, token);
  // Owner classes.
  assert.deepEqual([...ownerFreeClasses(copyGateContext({ pricingNotes: `${quote} ${free}, ${FREE_CALLOUT_TOKENS[2]}` }, []))].sort(), ['callout', 'quote']);
  assert.deepEqual([...ownerFreeClasses(copyGateContext({ usp: 'Free quote and a camera check' }, []))].sort(), ['inspection', 'quote']);
  assert.deepEqual([...ownerFreeClasses(copyGateContext({ usp: 'Free quote. Camera inspection' }, []))], ['quote']);
  assert.deepEqual([...ownerFreeClasses(copyGateContext({ usp: 'Everything free' }, []))], []);
  assert.deepEqual([...ownerFreeClasses(copyGateContext({ reviewQuote: `${quote} ${free}` }, []))], []);
  const hits = (value: string, data: CollectedData) => runCopyGates(loose({ aboutBlurb: value }), copyGateContext(data, [])).map(hit => hit.actual).filter(id => id?.startsWith('claim:free'));
  assert.deepEqual(hits(`${quote} ${free}`, { usp: 'Free quote' }), []);
  assert.deepEqual(hits(`${inspection}${HE_WORD} ${free}`, { usp: 'Free quote' }), ['claim:free:inspection']);
  assert.deepEqual(hits(`${HE_WORD} ${free}`, { usp: 'Free quote' }), ['claim:free:unscoped']);
});

test('M2a.4 r2 4: section 18 we-form verbs are caught with prefixes; a same-day sentence naming a service label is a finish promise', () => {
  for (const verb of WE_FORM_VERBS) {
    const ids5 = (value: string) => runCopyGates(loose({ aboutBlurb: value }), ctx()).filter(hit => hit.rule === GATE_RULES.we).length;
    assert.ok(ids5(`${HE_WORD} ${SHIN}${verb}`) >= 1, verb);
    assert.equal(ids5(`${HE_WORD} ${verb}${BET}`), 0, `${verb} + letter`);
  }
  const labels = [LEAK_LABEL, INSTALL_LABEL];
  const sameDay = (value: string, data: CollectedData) => runCopyGates(loose({ aboutBlurb: value }), copyGateContext(data, labels, true, [], { serviceSources: ['leak detection', 'water heater install'] }))
    .map(hit => hit.actual).filter(id => id?.startsWith('claim:same_day'));
  const day = SAME_DAY_TOKENS[0];
  const responseOnly = { responseTime: 'Same day in Holon' };
  assert.deepEqual(sameDay(`${INSTALL_LABEL} ${day}`, responseOnly), ['claim:same_day_finish'], 'label, no verb: finish');
  assert.deepEqual(sameDay(`${HE_WORD} ${day}`, responseOnly), [], 'no label: arrival rule');
  assert.deepEqual(sameDay(`${LEAK_LABEL} ${day}`, { ...responseOnly, usp: 'Same-day leak fixes' }), [], 'in scope');
  assert.deepEqual(sameDay(`${INSTALL_LABEL} ${ARRIVAL_TOKENS[0]} ${day}`, responseOnly), [], 'arrival token keeps the arrival rule');
});
