// Rerun-3 items 4-5: gate_fear_promise (fear into guarantee) and gate_same_day_scope (same day without a response fact).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. The negation and same-day words come from the live template file at
// runtime (Noa's parseNegationWords / parseSameDayWords); other Hebrew-like words are synthetic escapes (not words).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFearPromiseSpec, buildSameDayScopeSpec, claimWords, fearPromiseMatches, sameDayOutOfScope, wordForms } from './claimScope';
import { blockingGateHits, copyGateContext, GATE_RULES, isWarningHit, runCopyGates, warningGateHits } from './copyGates';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import { FACT_PARSE_TOKEN_KEYS, FACT_RULE_TOKEN_KEYS, OWNER_FACT_TEMPLATES, setOwnerFactTemplatesForTests, type OwnerFactTemplates } from './ownerFactCopy';
import { briefGateContext, CLAIM_SCOPE_RULES, dropClaimScope, generateResearchPageCopy, GeneratedCopyValidationError, ungeneratedFieldsFor, type CopyRepairEvent } from './researchPageCopy';

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

test('same day: off with a response fact; a sentence naming a tail place may keep it; any other sentence hits', () => {
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
