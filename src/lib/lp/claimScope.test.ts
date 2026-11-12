// Rerun-3 items 4-5: gate_fear_promise (fear into guarantee) and gate_same_day_scope (same day without a response fact).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. The negation and same-day words come from the live template file at
// runtime (Noa's parseNegationWords / parseSameDayWords); other Hebrew-like words are synthetic escapes (not words).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFearPromiseSpec, buildSameDayScopeSpec, claimWords, fearPromiseMatches, ownerNamedServices, pageHasSameDayGrant, sameDayGrants, sameDayOutOfScope, sameServiceWord, wordForms } from './claimScope';
import { blockingGateHits, copyGateContext, GATE_RULES, isWarningHit, runCopyGates, warningGateHits } from './copyGates';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import { FACT_PARSE_TOKEN_KEYS, FACT_RULE_TOKEN_KEYS, OWNER_FACT_TEMPLATES, setOwnerFactTemplatesForTests, type OwnerFactTemplates } from './ownerFactCopy';
import { briefGateContext, CLAIM_SCOPE_RULES, dropClaimScope, generateResearchPageCopy, GeneratedCopyValidationError, ungeneratedFieldsFor, type CopyRepairEvent } from './researchPageCopy';
import { SAME_DAY_FINISH_VERBS, SAME_DAY_TOKENS } from './generationData';
import type { SiteCopy } from './lpCopyPrompt';
import { renderResearchedSitePages, type ResearchedSitePage } from './researchedSite';
import { VERTICAL_ASSETS } from './verticalAssets';
import { VERTICAL_THEMES } from './verticalThemes';

const T = OWNER_FACT_TEMPLATES;
const WITHOUT = T.parseNegationWords.find(word => !/\s/.test(word) && word.length === 3) as string;
const SAME_DAY = T.parseSameDayWords[0];
// Synthetic words (escapes): a fear content word, a verb, the trade, two places.
const TILES = '\u05D0\u05D1\u05D2\u05D3\u05D4';
const BREAK = '\u05D6\u05D7\u05D8\u05E1';
const TRADE = '\u05D9\u05DA\u05DB\u05DC\u05DD';
const CITY_A = '\u05E0\u05E1\u05E2\u05E4';
const CITY_B = '\u05E6\u05E7\u05E8';
const HE = '\u05D4';

test('the template lists the gates read are present (Noa)', () => {
  assert.ok(WITHOUT, 'a one-word without / negation entry');
  assert.ok(T.parseNegationWords.length >= 4 && T.parseSameDayWords.length >= 3);
  assert.deepEqual(wordForms(`${HE}${TILES}`), [`${HE}${TILES}`, TILES]);
});

test('fear promise: a negation followed by a fear content word hits; the owner\'s own negation and the trade do not', () => {
  const fear = `${TRADE} ${BREAK} ${HE}${TILES}`;
  const spec = buildFearPromiseSpec(fear, T.parseNegationWords, [TRADE], [null, null]);
  assert.ok(spec);
  assert.deepEqual(spec.fearWords.map(forms => forms[forms.length - 1]), [BREAK, TILES], 'the trade is not a fear word');
  // The plumber-3 shape: "<trade> in <city> ... without breaking tiles" (H1).
  assert.deepEqual(fearPromiseMatches(`${TRADE} ${CITY_A} ${WITHOUT} ${BREAK} ${TILES}`, spec).length, 2);
  assert.deepEqual(fearPromiseMatches(`${TILES} ${CITY_A}`, spec), [], 'no negation, no hit');
  assert.deepEqual(fearPromiseMatches(`${WITHOUT} ${CITY_A} ${CITY_B} ${CITY_A} ${TILES}`, spec), [], 'outside the window');
  assert.deepEqual(fearPromiseMatches(`${WITHOUT} ${TRADE}`, spec), []);
  // The owner's usp negates the same word: allowed.
  const owned = buildFearPromiseSpec(fear, T.parseNegationWords, [TRADE], [`${WITHOUT} ${TILES}`, null]);
  assert.ok(owned);
  assert.deepEqual(fearPromiseMatches(`${WITHOUT} ${TILES}`, owned), []);
  assert.equal(buildFearPromiseSpec('', T.parseNegationWords, [], []), null);
  assert.equal(buildFearPromiseSpec(fear, [], [], []), null);
});

test('same day: off on a granted page; a sentence naming a tail place may keep it; any other sentence hits', () => {
  assert.equal(buildSameDayScopeSpec(true, T.parseSameDayWords, null, [CITY_A]), null);
  const spec = buildSameDayScopeSpec(false, T.parseSameDayWords, `${SAME_DAY} ${CITY_A}`, [CITY_A, CITY_B]);
  assert.ok(spec);
  assert.deepEqual(spec.tailPlaces, [claimWords(CITY_A)], 'only the places the tail names');
  assert.equal(sameDayOutOfScope(`${TRADE} ${SAME_DAY}`, spec), true);
  assert.equal(sameDayOutOfScope(`${TRADE} ${CITY_A} ${SAME_DAY}`, spec), false);
  assert.equal(sameDayOutOfScope(`${TRADE} ${CITY_B} ${SAME_DAY}`, spec), true, 'a place outside the tail does not scope it');
  assert.equal(sameDayOutOfScope(TRADE, spec), false);
  const noTail = buildSameDayScopeSpec(false, T.parseSameDayWords, null, [CITY_A]);
  assert.ok(noTail);
  assert.equal(sameDayOutOfScope(`${CITY_A} ${SAME_DAY}`, noTail), true, 'no tail: every same-day sentence hits');
});

test('gates and drops: a prose sentence is dropped, a card description is emptied, the hero keeps its hit for the repair', () => {
  const fearPromise = buildFearPromiseSpec(`${BREAK} ${TILES}`, T.parseNegationWords, [], []) ?? undefined;
  const sameDayScope = buildSameDayScopeSpec(false, T.parseSameDayWords, null, []) ?? undefined;
  const ctx = copyGateContext({}, [], true, [], { fearPromise, sameDayScope });
  const s = (n: number) => `${TRADE} ${CITY_A} ${n}.`;
  const copy: Record<string, unknown> = {
    heroHeadline: `${TRADE} ${WITHOUT} ${TILES}`,
    storyBody: `${s(1)} ${s(2)} ${TRADE} ${SAME_DAY}. ${s(3)}`,
    serviceDetails: [{ name: TRADE, description: `${WITHOUT} ${BREAK} ${TILES}.` }],
  };
  const rules = runCopyGates(copy, ctx).filter(hit => CLAIM_SCOPE_RULES.includes(hit.rule)).map(hit => `${hit.field}:${hit.rule}`);
  assert.deepEqual(rules.sort(), [
    `heroHeadline:${GATE_RULES.fearPromise}`, `serviceDetails[0].description:${GATE_RULES.fearPromise}`, `storyBody:${GATE_RULES.sameDayScope}`,
  ].sort());
  const fixes = dropClaimScope(copy, ctx);
  assert.ok(fixes.length >= 2, fixes.join(','));
  assert.equal(copy.storyBody, `${s(1)} ${s(2)} ${s(3)}`);
  assert.equal((copy.serviceDetails as Array<{ description: string }>)[0].description, '');
  assert.deepEqual(runCopyGates(copy, ctx).filter(hit => CLAIM_SCOPE_RULES.includes(hit.rule)).map(hit => hit.field), ['heroHeadline'], 'only the hero goes to the repair');
});

// ---- End to end (mocked model, stand-in templates): one repair for a hero hit, then the page fails. ----

const STANDIN = {
  ...OWNER_FACT_TEMPLATES,
  ...Object.fromEntries([...FACT_PARSE_TOKEN_KEYS, ...FACT_RULE_TOKEN_KEYS].map(key => [key, [`zz${key}`]])),
} as OwnerFactTemplates;

test('end to end: a hero that promises the fear away gets exactly one repair, then the page fails on gate_fear_promise', async () => {
  setOwnerFactTemplatesForTests(STANDIN);
  try {
    const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
    const page = compilePageBrief({
      page: { id: 'svc-leak-repair', targetPath: '/services/leak-repair', pageClass: 'money_service' },
      persona: approved('persona', 'A local customer in Holon'), waoOffer: approved('offer', 'TEST Biz'),
      targetQueries: [approved('query-1', 'leak repair Holon')], entityAnchors: [approved('entity-1', 'leak repair')],
      firstPartyProof: [], localFacts: [approved('local-area', 'Service area (owner-stated): Holon')],
      customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [], links: [],
      site: { pageName: 'leak repair', relevanceTerm: 'leak repair', city: 'Holon', serviceArea: ['Holon'], serviceLabels: ['leak repair'], businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: false },
    } as PageBriefInput);
    const data: CollectedData = { businessName: 'TEST Biz', businessNiche: 'plumber', targetLocation: 'Holon', specificCities: 'Holon', idealClientFear: 'that he breaks the bathroom tiles', usp: 'I find the leak with a camera', phone: '050-0000000' };
    const hero = 'leak repair in Holon zzparseNegationWords breaking tiles';
    const answer = Object.fromEntries(Object.entries({
      heroHeadline: hero, heroSubheadline: 'I find the leak with a camera', heroCta: 'Call', trustBarItems: [], aboutBlurb: '', servicesHeadline: 'Services',
      serviceItems: ['leak repair'], faqHeadline: '', faqItems: [], guaranteeBlock: null, reviewFeatured: null, reviewContext: null, responseTimeBadge: null,
      scarcityLine: null, formHeadline: 'Form', stickyBarLine: '', aboutPageHeadline: '', aboutPageBody: '', serviceDetails: [],
    }).filter(([key]) => !ungeneratedFieldsFor(page).includes(key)));
    const events: CopyRepairEvent[] = [];
    let repairs = 0;
    const error = await generateResearchPageCopy(page, data, {
      onEvent: event => events.push(event),
      callJson: async (system, user) => {
        if (/repairing specific fields/.test(system)) { repairs++; return JSON.stringify({ heroHeadline: hero }); }
        return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : answer);
      },
    }).then(() => null, (caught: unknown) => caught);
    const fearRepairs = events.filter(event => event.kind === 'repair' && (event.violations ?? []).some(item => item.rule === GATE_RULES.fearPromise));
    assert.equal(fearRepairs.length, 1, JSON.stringify(events.map(event => [event.stage, event.kind, (event.violations ?? []).map(item => item.rule)])));
    assert.ok(error instanceof GeneratedCopyValidationError, String(error));
    assert.ok(error.violations.some(item => item.field === 'heroHeadline' && item.rule === GATE_RULES.fearPromise));
    assert.ok(repairs >= 1);
  } finally { setOwnerFactTemplatesForTests(undefined); }
});

// Rerun-3b bug B: plumber-3 home shipped a fear promise in storyHeadline. The research gate context excludes the warn-only
// rendered fields (story, depth blocks) from renderedFields, and gate_fear_promise / gate_same_day_scope were not
// always-blocking, so a hit there was a warning: dropClaimScope (blocking hits only) never saw it. Policy (Adam): a fear or
// same-day hit in ANY rendered field is dropped (nullable / droppable) or blocking (one repair, then fail); never warn-only.
test('rerun-3b bug B: a fear / same-day hit in a warn-only rendered field blocks and is dropped; unrendered stays a warning', () => {
  setOwnerFactTemplatesForTests(STANDIN);
  try {
    const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
    const home = compilePageBrief({
      page: { id: 'home', targetPath: '/', pageClass: 'homepage' },
      persona: approved('persona', 'A local customer in Holon'), waoOffer: approved('offer', 'TEST Biz'),
      targetQueries: [approved('query-1', 'plumber Holon')], entityAnchors: [approved('entity-1', 'leak repair')],
      firstPartyProof: [], localFacts: [approved('local-area', 'Service area (owner-stated): Holon')],
      customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [], links: [],
      site: { pageName: 'plumber', relevanceTerm: 'leak repair', city: 'Holon', serviceArea: ['Holon'], serviceLabels: ['leak repair'], businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: true },
    } as PageBriefInput);
    const data: CollectedData = { businessName: 'TEST Biz', businessNiche: 'plumber', targetLocation: 'Holon', specificCities: 'Holon', idealClientFear: 'that he breaks the bathroom tiles', usp: 'I find the leak with a camera', phone: '050-0000000' };
    const ctx = briefGateContext(home, data);
    assert.ok(ctx.fearPromise, 'the fear gate is on');
    assert.ok(ctx.claimScopeFields?.includes('storyHeadline') && ctx.claimScopeFields.includes('storyBody'));
    assert.ok(!ctx.renderedFields?.includes('storyHeadline'), 'storyHeadline is still warn-only for the voice gates');
    const fear = 'zzparseNegationWords breaking tiles';
    const copy: Record<string, unknown> = {
      heroHeadline: 'leak repair in Holon', storyHeadline: fear,
      storyBody: `I came at night. I found the leak. ${fear}. I cleaned up.`,
    };
    const hits = runCopyGates(copy, ctx).filter(hit => CLAIM_SCOPE_RULES.includes(hit.rule));
    assert.deepEqual(hits.map(hit => hit.field).sort(), ['storyBody', 'storyHeadline']);
    assert.deepEqual(warningGateHits(hits, ctx), [], 'never warn-only in a rendered field');
    assert.equal(blockingGateHits(hits, ctx).length, 2);
    const fixes = dropClaimScope(copy, ctx);
    assert.equal(copy.storyHeadline, null, 'nullable heading dropped');
    assert.equal(copy.storyBody, 'I came at night. I found the leak. I cleaned up.');
    assert.ok(fixes.includes('claim_scope_null:storyHeadline'), fixes.join(','));
    assert.deepEqual(runCopyGates(copy, ctx).filter(hit => CLAIM_SCOPE_RULES.includes(hit.rule)), []);
    // A field the page does not render: a warning (no repair spent on invisible text).
    assert.equal(isWarningHit({ field: 'stickyBarLine', rule: GATE_RULES.fearPromise }, ctx), true);
    assert.equal(isWarningHit({ field: 'qaItems[0].a', rule: GATE_RULES.sameDayScope }, { ...ctx, claimScopeFields: [...ctx.claimScopeFields ?? [], 'qaItems'] }), false);
  } finally { setOwnerFactTemplatesForTests(undefined); }
});

// ---- Site Bot launch step 2 (capability 1, MVP review B2): a scoped promise stays on its own service page. ----
// plumber-3: usp "fixes leaks the same day ..." (one service) plus a business-wide response fact; the drain-cleaning H1
// shipped "<drain cleaning> in Holon - same day". Two causes: the claim scope named a service only by the exact label (a
// Hebrew usp that names the job in its own words read as business-wide), and the rerun-3 same-day gate was off on every page
// whenever any response fact existed. Synthetic Hebrew letters (escapes) stand in for the words; the same-day and finish
// tokens are read from the live data at runtime.

// Synthetic words: a noun in a singular and a plural form, a second service's two words, a verb, the trade, a place.
const STEM = '\u05E1\u05E2\u05E4\u05E6';
const NOUN_ONE = `${STEM}\u05D4`;
const NOUN_MANY = `${STEM}\u05D5\u05EA`;
const SEARCH = '\u05D2\u05D3\u05D8\u05DB\u05DD';
const OPEN = '\u05D6\u05D7\u05DC\u05DE\u05DF';
const CLOGS = '\u05E7\u05E8\u05E9\u05EA\u05D5\u05EA';
const LABEL_A = `${SEARCH} ${NOUN_MANY}`;
const LABEL_B = `${OPEN} ${CLOGS}`;

test('B2: ownerNamedServices names a label by its own words (prefix letters, singular / plural), never by the trade or a place', () => {
  assert.equal(sameServiceWord(NOUN_ONE, NOUN_MANY), true, 'a feminine ending into a plural one');
  assert.equal(sameServiceWord(STEM, `${STEM}\u05D9\u05DD`), true, 'a short stem plus a plural suffix');
  assert.equal(sameServiceWord(`${STEM.slice(0, 3)}\u05D5`, STEM), false, 'four letters sharing three are two words');
  assert.equal(sameServiceWord('\u05D0\u05D1', '\u05D0\u05D1'), true);
  const verb = '\u05E9\u05E0\u05D1\u05DC';
  assert.deepEqual(ownerNamedServices(`${verb} ${NOUN_MANY}`, [LABEL_A, LABEL_B]), [LABEL_A], 'the plumber-3 usp shape: verb + the label noun');
  assert.deepEqual(ownerNamedServices(`${verb} \u05D1${NOUN_ONE}`, [LABEL_A, LABEL_B]), [LABEL_A], 'prefix letter and singular form');
  assert.deepEqual(ownerNamedServices(`${verb} ${CITY_A}`, [LABEL_A, LABEL_B], [CITY_A]), [], 'no service named: business-wide');
  assert.deepEqual(ownerNamedServices(`${TRADE} ${CITY_A}`, [`${TRADE} ${NOUN_MANY}`], [TRADE]), [], 'the trade never names a service');
  assert.deepEqual(ownerNamedServices(LABEL_B, [LABEL_A, LABEL_B]), [LABEL_B], 'the label itself');
  const shared = [`${SEARCH} ${NOUN_MANY}`, `${SEARCH} ${CLOGS}`];
  assert.deepEqual(ownerNamedServices(`${SEARCH} ${CITY_A}`, shared), [], 'a word every label carries names none of them');
  assert.deepEqual(ownerNamedServices('I fix leaks and drains', ['leak repair', 'AC and heating']), ['leak repair'], 'English: plural form; "and" is too short');
});

test('B2: same-day grants are per page: the usp names one service; a response fact names none (business-wide)', () => {
  const words = T.parseSameDayWords;
  const scopedUsp = sameDayGrants({ responseFact: false, usp: `${NOUN_MANY} ${SAME_DAY}. ${TRADE} ${CITY_A}` }, words, [LABEL_A, LABEL_B], [TRADE, CITY_A]);
  assert.deepEqual(scopedUsp, [{ source: 'usp', services: [LABEL_A] }]);
  assert.equal(pageHasSameDayGrant(scopedUsp, LABEL_A), true, 'its own service page');
  assert.equal(pageHasSameDayGrant(scopedUsp, LABEL_B), false, 'another service page');
  assert.equal(pageHasSameDayGrant(scopedUsp, null), false, 'the homepage takes business-wide grants only');
  const wide = sameDayGrants({ responseFact: true, responseTime: `${SAME_DAY} ${CITY_A}`, usp: `${NOUN_MANY} ${SAME_DAY}` }, words, [LABEL_A, LABEL_B], [CITY_A]);
  assert.deepEqual(wide.map(grant => [grant.source, grant.services]), [['response', []], ['usp', [LABEL_A]]]);
  assert.equal(pageHasSameDayGrant(wide, LABEL_B) && pageHasSameDayGrant(wide, null), true, 'a business-wide response fact covers every page');
  assert.deepEqual(sameDayGrants({ responseFact: false, usp: `${NOUN_MANY} ${CITY_A}` }, words, [LABEL_A]), [], 'no same-day word, no grant');
  assert.ok(buildSameDayScopeSpec(pageHasSameDayGrant(scopedUsp, LABEL_B), words, null, []), 'the gate is on on the other page');
  assert.equal(buildSameDayScopeSpec(pageHasSameDayGrant(scopedUsp, LABEL_A), words, null, []), null, 'and off on its own page');
});

test('B2 regression (plumber-3 shape): a usp same-day finish for one service blocks the same promise on another service page', () => {
  const sameDay = SAME_DAY_TOKENS[0];
  const finishVerb = SAME_DAY_FINISH_VERBS.find(verb => !/\s/.test(verb)) as string;
  const data: CollectedData = {
    businessName: 'TEST Biz', businessNiche: TRADE, targetLocation: CITY_A, specificCities: CITY_A,
    usp: `${finishVerb} ${NOUN_MANY} ${sameDay}`, responseTime: `${sameDay} ${CITY_A}`, phone: '050-0000000',
  };
  const hits = (pageServiceLabel: string) => runCopyGates({ heroHeadline: `${pageServiceLabel} ${CITY_A} ${sameDay}` },
    copyGateContext(data, [LABEL_A, LABEL_B], true, [CITY_A], { pageServiceLabel, researchSite: true })).map(hit => hit.actual);
  assert.ok(!hits(LABEL_A).includes('claim:same_day_finish'), `own service page: ${hits(LABEL_A)}`);
  assert.ok(hits(LABEL_B).includes('claim:same_day_finish'), `other service page: ${hits(LABEL_B)}`);
});

// End to end (mocked model, live templates): three pages generated and rendered. The model writes the owner's same-day promise
// into every hero; the gates keep it on its own service page only, and on the homepage only when the owner gave it
// business-wide (a response fact).
const approvedItem = (id: string, value: string) => ({ id, value, status: 'approved' as const });
function scopeBrief(pageClass: 'homepage' | 'money_service', pageName: string, id: string, targetPath: string) {
  return compilePageBrief({
    page: { id, targetPath, pageClass },
    persona: approvedItem('persona', 'A local customer in Holon'), waoOffer: approvedItem('offer', 'TEST Biz'),
    targetQueries: [approvedItem('query-1', `${pageName} Holon`)], entityAnchors: [approvedItem('entity-1', pageName)],
    firstPartyProof: [], localFacts: [approvedItem('local-area', 'Service area (owner-stated): Holon')],
    customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [], links: [],
    site: { pageName, relevanceTerm: pageName, city: 'Holon', serviceArea: ['Holon'], serviceLabels: ['leak repair', 'drain cleaning'], businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: false },
  } as PageBriefInput);
}

async function generateServicePage(pageName: string, slug: string, data: CollectedData): Promise<{ copy: SiteCopy; scopeRepairs: number }> {
  const page = scopeBrief('money_service', pageName, `svc-${slug}`, `/services/${slug}`);
  const promised = `${pageName} in Holon ${SAME_DAY}`;
  const answer = Object.fromEntries(Object.entries({
    heroHeadline: promised, heroSubheadline: `I explain the ${pageName} quote line by line`, heroCta: 'Call', trustBarItems: [], aboutBlurb: '', servicesHeadline: 'Services',
    serviceItems: [pageName], faqHeadline: '', faqItems: [], guaranteeBlock: null, reviewFeatured: null, reviewContext: null, responseTimeBadge: null,
    scarcityLine: null, formHeadline: 'Form', stickyBarLine: '', aboutPageHeadline: '', aboutPageBody: '', serviceDetails: [],
  }).filter(([key]) => !ungeneratedFieldsFor(page).includes(key)));
  const events: CopyRepairEvent[] = [];
  const copy = await generateResearchPageCopy(page, data, {
    onEvent: event => events.push(event),
    callJson: async (system, user) => {
      if (/repairing specific fields/.test(system)) return JSON.stringify({ heroHeadline: `${pageName} in Holon` });
      return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : answer);
    },
  });
  const scopeRepairs = events.filter(event => event.kind === 'repair' && (event.violations ?? []).some(item => item.rule === GATE_RULES.sameDayScope || /^claim:same_day_/.test(String(item.actual ?? '')))).length;
  return { copy, scopeRepairs };
}

test('B2 end to end: two service pages generated and rendered; the scoped same-day promise appears only on its own page', async () => {
  // The usp names "leak repair" in its own words ("leaks") with the same-day words; no response fact. Before the fix the
  // claim scope read that usp as business-wide (no exact label in it) and the drain page kept the promise.
  const data: CollectedData = { businessName: 'TEST Biz', businessNiche: 'plumber', targetLocation: 'Holon', specificCities: 'Holon', usp: `I fix leaks ${SAME_DAY} (same day)`, phone: '050-0000000' };
  const leak = await generateServicePage('leak repair', 'leak-repair', data);
  const drain = await generateServicePage('drain cleaning', 'drain-cleaning', data);
  assert.equal(leak.scopeRepairs, 0, 'own service page: no same-day gate');
  assert.equal(drain.scopeRepairs, 1, 'other service page: the same-day promise went to the repair');
  assert.ok(leak.copy.heroHeadline.includes(SAME_DAY));
  assert.ok(!drain.copy.heroHeadline.includes(SAME_DAY));
  // Homepage (no page service): a usp scoped to one service grants nothing there; a business-wide response fact does.
  const home = scopeBrief('homepage', 'plumber', 'home', '/');
  const homeHits = (owner: CollectedData) => runCopyGates({ heroHeadline: `plumber in Holon ${SAME_DAY}` }, briefGateContext(home, owner)).filter(hit => hit.rule === GATE_RULES.sameDayScope);
  assert.equal(homeHits(data).length, 1, 'scoped usp: blocked on the homepage');
  assert.equal(homeHits({ ...data, responseTime: SAME_DAY }).length, 0, 'business-wide response fact: allowed on the homepage');
  const homeCopy: SiteCopy = { ...leak.copy, heroHeadline: 'plumber in Holon', heroSubheadline: 'Home sub' };
  const seo = (name: string) => ({ name, city: 'Holon', serviceArea: ['Holon'] });
  const pages: ResearchedSitePage[] = [
    { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: homeCopy, seo: seo('plumber') },
    { opportunityId: 'svc-leak-repair', classification: 'money_service', targetPath: '/services/leak-repair', copy: leak.copy, seo: seo('leak repair') },
    { opportunityId: 'svc-drain-cleaning', classification: 'money_service', targetPath: '/services/drain-cleaning', copy: drain.copy, seo: seo('drain cleaning') },
  ];
  const files = renderResearchedSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data, heroImageUrl: 'https://example.test/hero.jpg',
    slug: 'scope-test', siteUrl: 'https://scope.wao.co.il', pages, graphEdges: pages.slice(1).map(item => ({ fromId: 'home', toId: item.opportunityId })),
  });
  assert.ok(files['services/leak-repair.html'].includes(SAME_DAY), 'shown on its own service page');
  assert.ok(!files['services/drain-cleaning.html'].includes(SAME_DAY), 'never on the other service page');
  assert.ok(!files['index.html'].includes(SAME_DAY), 'never on the homepage for a one-service promise');
  // The plumber-3 shape: the same scoped usp plus a business-wide response fact. The rerun-3 gate is off on every page (the
  // response covers them), so the finish-scope claim gate is what keeps the drain page clean.
  const withResponse: CollectedData = { ...data, responseTime: SAME_DAY };
  const leakR = await generateServicePage('leak repair', 'leak-repair', withResponse);
  const drainR = await generateServicePage('drain cleaning', 'drain-cleaning', withResponse);
  assert.equal(leakR.scopeRepairs, 0);
  assert.ok(leakR.copy.heroHeadline.includes(SAME_DAY));
  assert.equal(drainR.scopeRepairs, 1, 'claim:same_day_finish on the other service page');
  assert.ok(!drainR.copy.heroHeadline.includes(SAME_DAY));
});
