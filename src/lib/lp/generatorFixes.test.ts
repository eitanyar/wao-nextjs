// 2026-11-10 generator fixes from the M2b.1h eval (docs/missions/site-bot-content-depth-2026-11-10.md "Next"), the
// reviewQuote bug, B6 as the home of proof facts, and the pricing default.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew comes from generationData.ts / lpCopyPrompt.ts constants;
// synthetic letters are escapes (not words).
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import { BARE_VERB_SENTENCE_OPENERS, SUBJECT_CARRY_TOKENS } from './generationData';
import { FACT_REPEAT_MAX } from './copyGates.config';
import {
  blockingGateHits,
  CLAUSE_REPEAT_MIN_WORDS,
  clauseRepeatKeys,
  describeGateViolation,
  effectiveReviewQuote,
  GATE_RULES,
  phraseRepeatFreeTokens,
  reviewQuoteDropReason,
  runCopyGates,
  warningGateHits,
  WARNING_ONLY_RULES,
  type CopyGateContext,
} from './copyGates';
import { hasRealReviewQuote, NO_REVIEW_ANSWER_MARKER, type SiteCopy } from './lpCopyPrompt';
import {
  briefGateContext,
  buildResearchPageGenerationPrompt,
  cutContractRules,
  FACT_LEDGER_RULES,
  generateResearchPageCopy,
  HEBREW_PATTERN_RULES,
  repetitionBudgetRules,
  siteTermsRule,
  SITE_COPY_OPTIONAL_STRING_LIMITS,
  withSystemFields,
  type CopyRepairEvent,
} from './researchPageCopy';
import {
  costFaq,
  costFaqCityOk,
  formatShekels,
  ownerPricing,
  PRICING_TEMPLATE_SLOTS,
  pricingPromisePhrases,
  RESEARCHED_PRICING_LABELS,
  RESEARCHED_PRICING_LABELS_PENDING_COPY,
} from './researchedPricing';
import { HE_TODO_PREFIX, RESEARCHED_SITE_LABELS } from './researchedSiteLabels';
import { renderResearchedSitePages, type PricingCopy, type ResearchedSitePage } from './researchedSite';
import { VERTICAL_ASSETS } from './verticalAssets';
import { VERTICAL_THEMES } from './verticalThemes';

const HEBREW = /[\u0590-\u05FF]/;
const W = ['\u05D0\u05D1\u05D2', '\u05D3\u05D4\u05D5', '\u05D6\u05D7\u05D8', '\u05D9\u05DB\u05DC', '\u05DE\u05E0\u05E1', '\u05E2\u05E4\u05E6'];
const CLAUSE = W.slice(0, 4).join(' ');

const data: CollectedData = {
  businessName: 'TEST Biz', businessNiche: 'plumber', primaryService: 'leak repair', targetLocation: 'Holon', specificCities: 'Holon',
  yearsInField: '12', usp: 'I find the leak before I open anything', phone: '050-0000000',
};

function briefInput(pageClass: 'homepage' | 'money_service', proof = true): PageBriefInput {
  const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
  const home = pageClass === 'homepage';
  return {
    page: { id: home ? 'home' : 'svc-leak-repair', targetPath: home ? '/' : '/services/leak-repair', pageClass },
    persona: approved('persona', 'A local customer in Holon'),
    waoOffer: approved('offer', 'TEST Biz: I find the leak before I open anything'),
    targetQueries: [approved('query-1', 'leak repair Holon')],
    entityAnchors: [approved('entity-1', 'leak repair')],
    firstPartyProof: [approved('proof-yearsInField', 'Years in the field (owner-stated): 12')],
    localFacts: [approved('local-area', 'Service area (owner-stated): Holon')],
    customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [],
    links: home ? [{ targetPath: '/services/leak-repair', relationship: 'service_child', evidenceIds: ['entity-1'] }] : [],
    site: {
      pageName: 'leak repair', relevanceTerm: 'leak repair', city: 'Holon', serviceArea: ['Holon'], serviceLabels: ['leak repair'],
      businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: home,
    },
    ...(home ? {} : { depth: { wordTarget: 420, terms: [], questions: [], serviceFacts: [], filters: { latinAllowed: true } } }),
    ...(proof ? {} : { firstPartyProof: [] }),
  } as PageBriefInput;
}
const brief = (pageClass: 'homepage' | 'money_service', proof = true): PageBrief => compilePageBrief(briefInput(pageClass, proof));
const ctxFor = (pageClass: 'homepage' | 'money_service', extra: Partial<CopyGateContext> = {}): CopyGateContext => ({ ...briefGateContext(brief(pageClass), data), ...extra });

const baseCopy = (): SiteCopy => ({
  heroHeadline: 'leak repair in Holon', heroSubheadline: 'Subheadline', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: ['leak repair'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: null,
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky',
  aboutPageHeadline: 'About page', aboutPageBody: 'About body.', serviceDetails: [],
});
const loose = (copy: Record<string, unknown>) => ({ ...baseCopy(), ...copy }) as unknown as Record<string, unknown>;
const ruleHits = (copy: Record<string, unknown>, ctx: CopyGateContext, rule: string) => runCopyGates(copy, ctx).filter(hit => hit.rule === rule);

// ---------------------------------------------------------------------------
// Item 3: clause-level repetition budget.
// ---------------------------------------------------------------------------

test('clause budget: a shared clause of 4+ words in a second field fails that field; a short reference passes', () => {
  const ctx = ctxFor('homepage');
  assert.equal(CLAUSE_REPEAT_MIN_WORDS, 4);
  const hits = ruleHits(loose({ heroSubheadline: `${CLAUSE} ${W[4]}.`, aboutPageBody: `${W[5]} ${CLAUSE}.` }), ctx, GATE_RULES.clauseRepeat);
  assert.deepEqual(hits.map(hit => hit.field), ['aboutPageBody'], 'the first field owns the statement; the second repeats it');
  assert.equal(blockingGateHits(hits, ctx).length, 1, 'blocking on a gated field');
  assert.match(hits[0].actual ?? '', /^clause_repeat:\d+$/, 'config id only');
  assert.ok(describeGateViolation(hits[0], ctx).includes(JSON.stringify(CLAUSE)), 'the repair names the clause');
  // A short reference (three words in common) is the allowed one-line reference.
  assert.deepEqual(ruleHits(loose({ heroSubheadline: `${CLAUSE}.`, aboutPageBody: `${W.slice(0, 3).join(' ')}.` }), ctx, GATE_RULES.clauseRepeat), []);
  // A run that crosses a clause break is not one clause.
  assert.deepEqual(ruleHits(loose({ heroSubheadline: `${CLAUSE}.`, aboutPageBody: `${W[0]} ${W[1]}, ${W[2]} ${W[3]}.` }), ctx, GATE_RULES.clauseRepeat), []);
  // The trust bar counts as one field (its own items never repeat each other); the area tile is never compared.
  assert.deepEqual(ruleHits(loose({ trustBarItems: [CLAUSE, CLAUSE] }), ctx, GATE_RULES.clauseRepeat), []);
  // The search anchor (service label + city) never makes a clause on its own.
  const free = phraseRepeatFreeTokens(ctx);
  assert.deepEqual(clauseRepeatKeys('leak repair in Holon', free), []);
  // Legacy sites are unchanged.
  assert.deepEqual(ruleHits(loose({ heroSubheadline: `${CLAUSE}.`, aboutPageBody: `${CLAUSE}.` }), { ...ctx, researchSite: false }, GATE_RULES.clauseRepeat), []);
});

test('B6 is the home of the proof facts on a service page: clause repeats land on the other field, and B6 never counts against the proof caps', () => {
  const ctx = ctxFor('money_service');
  assert.ok(ctx.depth, 'a depth service page');
  const proofItems = [{ text: CLAUSE, factIds: ['proof-yearsInField'] }, { text: W[4], factIds: ['proof-yearsInField'] }];
  const hits = ruleHits(loose({ proofItems, heroSubheadline: `${CLAUSE}.` }), ctx, GATE_RULES.clauseRepeat);
  assert.deepEqual(hits.map(hit => hit.field), ['heroSubheadline'], 'B6 states it; the hero repeats it');
  // Without a depth context the gate order applies (gated fields first), so the warn-only B6 item is the repeat.
  const plain = ruleHits(loose({ proofItems, heroSubheadline: `${CLAUSE}.` }), { ...ctx, depth: undefined }, GATE_RULES.clauseRepeat);
  assert.deepEqual(plain.map(hit => hit.field), ['proofItems[0].text']);
  // Proof caps: an owner fact in FACT_REPEAT_MAX gated fields plus B6 is within the cap on a depth page.
  const fact = '12';
  const gated = ['heroSubheadline', 'formHeadline', 'heroHeadline'].slice(0, FACT_REPEAT_MAX);
  const copy = loose({ ...Object.fromEntries(gated.map(field => [field, `${W[gated.indexOf(field)]} ${fact}`])), proofItems: [{ text: `${W[5]} ${fact}`, factIds: ['proof-yearsInField'] }] });
  // Durable: even once B6 graduates from warn-only to a gated (counted) field, it stays out of the caps.
  const capped = { ...ctx, factPhrases: [fact], renderedFields: [...(ctx.renderedFields ?? []), 'proofItems'] };
  assert.deepEqual(ruleHits(copy, capped, GATE_RULES.factRepeat), [], 'B6 does not count');
  assert.ok(ruleHits(copy, { ...capped, depth: undefined }, GATE_RULES.factRepeat).length > 0, 'without B6 as home the same copy is over the cap');
});

// ---------------------------------------------------------------------------
// Item 4 (pattern A, deterministic part): warn-only subject-pronoun check beyond the about pair.
// ---------------------------------------------------------------------------

test('pattern A: a body sentence opening with a bare first-person verb and no subject is a warning (the about pair still blocks)', () => {
  const ctx = ctxFor('homepage');
  const bare = `${BARE_VERB_SENTENCE_OPENERS[0]} ${W[0]} ${W[1]}.`;
  const story = ruleHits(loose({ storyBody: bare }), ctx, GATE_RULES.subjectPronoun);
  assert.deepEqual(story.map(hit => hit.field), ['storyBody']);
  assert.equal(blockingGateHits(story, ctx).length, 0);
  assert.equal(warningGateHits(story, ctx).length, 1);
  assert.ok(WARNING_ONLY_RULES.includes(GATE_RULES.subjectPronoun));
  // With the subject pronoun, no hit; hero subheadline / trust bar fragments are never checked.
  assert.deepEqual(ruleHits(loose({ storyBody: `${SUBJECT_CARRY_TOKENS[0]} ${bare}` }), ctx, GATE_RULES.subjectPronoun), []);
  assert.deepEqual(ruleHits(loose({ heroSubheadline: bare, trustBarItems: [bare] }), ctx, GATE_RULES.subjectPronoun), []);
  // Depth items and card descriptions are checked too.
  const money = ctxFor('money_service');
  assert.deepEqual(ruleHits(loose({ proofItems: [{ text: bare, factIds: ['proof-yearsInField'] }] }), money, GATE_RULES.subjectPronoun).map(hit => hit.field), ['proofItems[0].text']);
  // The about pair keeps its blocking rule (no duplicate warning there).
  assert.deepEqual(ruleHits(loose({ aboutPageBody: bare }), ctx, GATE_RULES.subjectPronoun), []);
  assert.equal(ruleHits(loose({ aboutPageBody: bare }), ctx, GATE_RULES.bareVerbOpener).length, 1);
});

// ---------------------------------------------------------------------------
// Items 1, 2, 4: prompt rules (English, abstract, no Hebrew bytes).
// ---------------------------------------------------------------------------

test('prompt: fact ledger, repetition budget, cut contract (pitch-first pages) and Noa patterns A-H; English only', () => {
  const homePrompt = buildResearchPageGenerationPrompt(brief('homepage'), data);
  const moneyPrompt = buildResearchPageGenerationPrompt(brief('money_service'), data, ['TERM ONE', 'TERM TWO']);
  const newRules = [...FACT_LEDGER_RULES, ...HEBREW_PATTERN_RULES, ...cutContractRules(brief('homepage')), ...repetitionBudgetRules(brief('money_service'))];
  for (const rule of newRules) assert.ok(!HEBREW.test(rule), `English only: ${rule.slice(0, 40)}`);
  for (const rule of [...FACT_LEDGER_RULES, ...HEBREW_PATTERN_RULES]) {
    assert.ok(homePrompt.includes(rule) && moneyPrompt.includes(rule), rule.slice(0, 40));
  }
  assert.equal(HEBREW_PATTERN_RULES.filter(rule => /^- [A-H]\. /.test(rule)).length, 8, 'patterns A to H');
  for (const rule of cutContractRules(brief('homepage'))) assert.ok(homePrompt.includes(rule));
  assert.ok(!moneyPrompt.includes('CUT CONTRACT'), 'cut contract on pitch-first pages only');
  assert.ok(moneyPrompt.includes('PROOF HOME'), 'B6 home rule on a depth page with proof');
  assert.ok(!homePrompt.includes('PROOF HOME'));
  // Pattern F: later pages reuse the homepage terms; the homepage sets them.
  assert.ok(moneyPrompt.includes(siteTermsRule(['TERM ONE', 'TERM TWO'])!));
  assert.ok(!buildResearchPageGenerationPrompt(brief('homepage'), data, ['TERM ONE']).includes('SITE TERMS'));
  assert.equal(siteTermsRule([]), null);
  // Pattern G keeps the anchor rule: the existing anchor line is still in the prompt.
  assert.match(homePrompt, /heroHeadline MUST contain/);
});

// ---------------------------------------------------------------------------
// Item 5: the reviewQuote bug.
// ---------------------------------------------------------------------------

test('reviewQuote: a Hebrew quote that contains the legacy no-review marker word is shown (research path); the legacy path is unchanged', () => {
  const quote = `${NO_REVIEW_ANSWER_MARKER} ${W[0]} ${W[1]}`;
  assert.equal(hasRealReviewQuote({ reviewQuote: quote }), false, 'legacy LP path unchanged');
  assert.equal(effectiveReviewQuote({ reviewQuote: quote }), quote, 'research path shows it');
  assert.equal(effectiveReviewQuote({ reviewQuote: quote, hasTrustAssets: false }), null, 'an explicit no-assets answer still means no quote');
  const site = withSystemFields({ ...baseCopy() } as unknown as Record<string, unknown>, brief('homepage'), { ...data, reviewQuote: quote });
  assert.equal(site.reviewFeatured, quote);
  // It renders: the homepage review section and the service page's B6.
  const home: ResearchedSitePage = { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: { ...baseCopy(), reviewFeatured: quote } };
  const money: ResearchedSitePage = { opportunityId: 'svc', classification: 'money_service', targetPath: '/services/leak-repair', copy: { ...baseCopy(), reviewFeatured: quote, proofItems: [{ text: 'Twelve years', factIds: ['x'] }] } as SiteCopy };
  const files = renderResearchedSitePages(renderParams([home, money]));
  assert.ok(files['index.html'].includes(quote));
  assert.ok(files['services/leak-repair.html'].includes(quote));
});

test('reviewQuote: why the m2b1g eval showed no review (Latin quotes are never shown or translated) is now logged, not silent', async () => {
  assert.equal(reviewQuoteDropReason({ reviewQuote: 'Came within an hour' }, 400), 'not_hebrew');
  assert.equal(reviewQuoteDropReason({ reviewQuote: W[0].repeat(200) }, 400), 'too_long');
  assert.equal(reviewQuoteDropReason({ reviewQuote: W[0], hasTrustAssets: false }, 400), 'no_trust_assets');
  assert.equal(reviewQuoteDropReason({ reviewQuote: W[0] }, 400), null);
  assert.equal(reviewQuoteDropReason({}, 400), null);
  const events: CopyRepairEvent[] = [];
  const page = brief('homepage');
  const copy = { ...baseCopy(), heroHeadline: 'leak repair in Holon' };
  await generateResearchPageCopy(page, { ...data, reviewQuote: 'Came within an hour' }, {
    gates: false,
    onEvent: event => events.push(event),
    callJson: async (system, user) => JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : copy),
  });
  assert.ok(events.some(event => event.kind === 'warnings' && event.violations?.some(item => item.field === 'reviewFeatured' && item.rule === 'review_dropped_not_hebrew')));
  assert.equal(SITE_COPY_OPTIONAL_STRING_LIMITS.reviewFeatured, 400);
});

// ---------------------------------------------------------------------------
// Pricing default.
// ---------------------------------------------------------------------------

const STAND_IN = Object.fromEntries(Object.keys(RESEARCHED_PRICING_LABELS).map(key => [key, `[${key}]`])) as typeof RESEARCHED_PRICING_LABELS;
const standIn: typeof RESEARCHED_PRICING_LABELS = {
  ...STAND_IN,
  costFaqQuestion: 'Q {service} {city}?',
  costFaqAnswerFrom: 'A {business} {service} {city} {amount}.',
  costFaqAnswerCallout: 'C {amount}.',
  costFaqAnswerSurcharge: 'S {policy}.',
};
const LIVE: PricingCopy = { labels: standIn, pending: false };

function renderParams(pages: ResearchedSitePage[], collected: CollectedData = { businessName: 'TEST Biz', businessNiche: 'plumber', phone: '050-0000000' }, pricingCopy?: PricingCopy) {
  return {
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data: collected,
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'pricing-test', siteUrl: 'https://pricing.wao.co.il', pages,
    graphEdges: pages.slice(1).map(item => ({ fromId: 'home', toId: item.opportunityId })),
    ...(pricingCopy ? { pricingCopy } : {}),
  };
}

// Noa: {city} must be Hebrew. This file authors no Hebrew, so the test city is an opaque Hebrew-only token borrowed from an
// approved label (any Hebrew-letter string without Latin letters or digits exercises the rule).
const HE_CITY = RESEARCHED_SITE_LABELS.serviceAreasHeading;
const pricingData: CollectedData = {
  businessName: 'TEST Biz', businessNiche: 'plumber', phone: '050-0000000',
  primaryService: 'leak repair', secondaryServices: 'drain, boiler',
  pricingPromises: ['no_hidden_costs', 'free_quote', 'no_callout_fee'],
  startingPrices: [{ job: 'leak repair', from: 350 }, { job: 'drain', from: 1200 }],
  surchargePolicy: 'night +50%',
};
const seo = { name: 'leak repair', city: HE_CITY, serviceArea: [HE_CITY] };
const pricingPages = (): ResearchedSitePage[] => [
  { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: baseCopy(), seo },
  { opportunityId: 'svc', classification: 'money_service', targetPath: '/services/leak-repair', copy: baseCopy(), seo },
];

test('pricing: owner input is validated (fixed promise set, sane amounts, 1-3 rows, a stated fee drops the no-fee promise)', () => {
  const pricing = ownerPricing({
    pricingPromises: ['no_callout_fee', 'free_quote', 'made_up' as never, 'free_quote'],
    calloutFee: 150,
    startingPrices: [{ job: 'a', from: 100 }, { job: '', from: 5 }, { job: 'b', from: -1 }, { job: 'c', from: 200 }, { job: 'd', from: 300 }, { job: 'e', from: 400 }],
    surchargePolicy: '  x  ',
  });
  assert.deepEqual(pricing.promises, ['free_quote'], 'fixed order, known ids, no "no call-out fee" next to a fee');
  assert.equal(pricing.calloutFee, 150);
  assert.deepEqual(pricing.startingPrices.map(item => item.job), ['a', 'c', 'd']);
  assert.equal(pricing.surchargePolicy, 'x');
  assert.deepEqual(ownerPricing({}), { promises: [], calloutFee: null, startingPrices: [], surchargePolicy: null });
  assert.equal(formatShekels(1200), '1,200 ₪');
});

test('pricing: hero promise line from checked promises only; price table + one cost FAQ at the B2 position on service pages', () => {
  const files = renderResearchedSitePages(renderParams(pricingPages(), pricingData, LIVE));
  const home = files['index.html'];
  const money = files['services/leak-repair.html'];
  for (const html of [home, money]) {
    const line = html.match(/<p data-price-promise aria-label="\[promiseLineLabel\]"[^>]*>([^<]*)<\/p>/);
    assert.ok(line, 'one promise line in the hero');
    assert.equal(line![1], '[promiseFreeQuote] · [promiseNoCalloutFee] · [promiseNoHiddenCosts]', 'checked promises, fixed order');
    assert.ok(html.indexOf('data-hero-call') < html.indexOf('data-price-promise') && html.indexOf('data-price-promise') < html.indexOf('</h1>') + 2000);
  }
  assert.ok(!home.includes('data-section="prices"'), 'no price table on the homepage');
  assert.equal((money.match(/data-section="prices"/g) ?? []).length, 1, 'one price block');
  assert.ok(money.includes('<th scope="row"') && money.includes('leak repair') && money.includes('1,200'));
  assert.ok(money.includes('S night +50%.') || money.includes('night +50%'));
  const faq = money.match(/<div data-cost-faq[^>]*><h3[^>]*>([^<]*)<\/h3><p[^>]*>/);
  assert.ok(faq, 'one cost FAQ');
  assert.equal(faq![1], `Q leak repair ${HE_CITY}?`);
  assert.ok(money.includes(`A TEST Biz leak repair ${HE_CITY} <bdi>${formatShekels(350)}</bdi>.`), 'answered in its first sentence, amount isolated');
  assert.equal((money.match(/data-cost-faq/g) ?? []).length, 1);
  // Promise-only owner: the line, no table, no FAQ.
  const promiseOnly = renderResearchedSitePages(renderParams(pricingPages(), { ...pricingData, startingPrices: [], surchargePolicy: undefined }, LIVE))['services/leak-repair.html'];
  assert.ok(promiseOnly.includes('data-price-promise') && !promiseOnly.includes('data-section="prices"'));
  // Numbers but no price for this service: the table, no guessed FAQ.
  const noMatch = renderResearchedSitePages(renderParams(pricingPages(), { ...pricingData, startingPrices: [{ job: 'drain', from: 1200 }] }, LIVE))['services/leak-repair.html'];
  assert.ok(noMatch.includes('data-section="prices"') && !noMatch.includes('data-cost-faq'));
  assert.equal(costFaq(pricingData, { service: 'leak repair', city: null, business: 'B' }, standIn, false), null, 'no city, no FAQ');
});

test('pricing: no owner pricing data renders byte-identical to a record without the fields; pending labels render nothing', () => {
  const plain = renderResearchedSitePages(renderParams(pricingPages()));
  assert.deepEqual(renderResearchedSitePages(renderParams(pricingPages(), undefined, LIVE)), plain, 'no data: no promise line, no table');
  for (const html of Object.values(plain)) assert.ok(!html.includes('data-price-promise') && !html.includes('data-section="prices"'));
  // The real (Noa-approved) labels are live, and without owner pricing data they add nothing.
  assert.equal(RESEARCHED_PRICING_LABELS_PENDING_COPY, false);
  const noData: CollectedData = { businessName: 'TEST Biz', businessNiche: 'plumber', phone: '050-0000000', primaryService: 'leak repair' };
  const realNoData = renderResearchedSitePages(renderParams(pricingPages(), noData));
  for (const html of Object.values(realNoData)) assert.ok(!html.includes('data-price-promise') && !html.includes('data-section="prices"') && !html.includes(HE_TODO_PREFIX));
  // Pending labels (a stand-in set flagged pending) still render nothing, even with owner data.
  const pending = renderResearchedSitePages(renderParams(pricingPages(), pricingData, { labels: standIn, pending: true }));
  const withoutPricing = renderResearchedSitePages(renderParams(pricingPages(), { businessName: 'TEST Biz', businessNiche: 'plumber', phone: '050-0000000', primaryService: 'leak repair', secondaryServices: 'drain, boiler' }, { labels: standIn, pending: true }));
  assert.deepEqual(pending, withoutPricing);
  assert.deepEqual(pricingPromisePhrases(pricingData, standIn, true), []);
});

test('pricing: real labels with owner data render the promise line, table and cost FAQ, with no __HE_TODO_ anywhere', () => {
  const files = renderResearchedSitePages(renderParams(pricingPages(), pricingData));
  for (const html of Object.values(files)) assert.ok(!html.includes(HE_TODO_PREFIX));
  const money = files['services/leak-repair.html'];
  assert.ok(files['index.html'].includes('data-price-promise') && money.includes('data-price-promise'));
  assert.ok(money.includes(`>${RESEARCHED_PRICING_LABELS.priceTableHeading}</h2>`));
  assert.ok(money.includes(RESEARCHED_PRICING_LABELS.promiseFreeQuote));
  assert.ok(money.includes('data-cost-faq'));
  // Noa: no space between the maqaf prefix and the amount <bdi> (the text right before {amount} in the template).
  const beforeAmount = RESEARCHED_PRICING_LABELS.costFaqAnswerFrom.split('{amount}')[0].slice(-2);
  assert.ok(!/\s$/.test(beforeAmount), 'template glues the prefix to the amount');
  assert.ok(money.includes(`${beforeAmount}<bdi>${formatShekels(350)}</bdi>`), 'no space before the amount <bdi>');
  // Noa: cells under priceTableFromColumn carry no prefix.
  assert.ok(!money.includes(RESEARCHED_PRICING_LABELS.priceFromPrefix));
  assert.match(money, new RegExp(`<td [^>]*><bdi>${formatShekels(350)}</bdi></td>`));
  assert.match(money, new RegExp(`<td [^>]*><bdi>${formatShekels(1200)}</bdi></td>`));
});

test('pricing (Noa rules): Hebrew city only; owner-named service only; policy punctuation; one price-confirmed chip', () => {
  const page = (city: string | null, service = 'leak repair') => ({ service, city, business: 'B' });
  // {city}: a Latin letter or a digit means no cost FAQ.
  assert.ok(costFaq(pricingData, page(HE_CITY), standIn, false));
  for (const city of ['Holon', `${HE_CITY} 2`, `${HE_CITY}-A`, '', null]) assert.equal(costFaq(pricingData, page(city), standIn, false), null, String(city));
  assert.equal(costFaqCityOk('  '), false);
  // {service}: the matched job must equal a service name the owner gave; a containment match alone is not enough.
  const notOwnerNamed: CollectedData = { ...pricingData, primaryService: 'plumbing', secondaryServices: undefined };
  assert.equal(costFaq(notOwnerNamed, page(HE_CITY), standIn, false), null, 'job is not an owner service name');
  const viaPriority: CollectedData = { ...notOwnerNamed, priorityServices: ['  Leak   Repair '] };
  assert.equal(costFaq(viaPriority, page(HE_CITY), standIn, false)?.q, `Q leak repair ${HE_CITY}?`, 'priorityServices count, normalised; slot is the owner job text');
  const contained = costFaq({ ...pricingData, startingPrices: [{ job: 'leak', from: 100 }] }, page(HE_CITY), standIn, false);
  assert.equal(contained, null, 'contained job "leak" is not an owner service name');
  const viaSecondary = costFaq({ ...pricingData, startingPrices: [{ job: 'drain', from: 100 }] }, page(HE_CITY, 'drain'), standIn, false);
  assert.equal(viaSecondary?.q, `Q drain ${HE_CITY}?`, 'secondaryServices count');
  // Amount HTML: escaped text, amount in <bdi>.
  const html = costFaq({ ...pricingData, businessName: 'A&B' }, { service: 'leak repair', city: HE_CITY, business: 'A&B' }, standIn, false, value => value.replace(/&/g, '&amp;'));
  assert.ok(html!.aHtml.startsWith(`A A&amp;B leak repair ${HE_CITY} <bdi>${formatShekels(350)}</bdi>.`));
  assert.ok(html!.a.startsWith(`A A&B leak repair ${HE_CITY} ${formatShekels(350)}.`));
  // {policy}: trailing sentence punctuation stripped; a trailing % stays.
  assert.equal(ownerPricing({ surchargePolicy: 'night +50%.' }).surchargePolicy, 'night +50%');
  assert.equal(ownerPricing({ surchargePolicy: 'double on Shabbat!! ' }).surchargePolicy, 'double on Shabbat');
  assert.equal(ownerPricing({ surchargePolicy: '...' }).surchargePolicy, null);
  assert.ok(costFaq(pricingData, page(HE_CITY), standIn, false)!.a.endsWith('S night +50%.'));
  // Chips: at most one "price confirmed" chip; price_before_work wins.
  assert.deepEqual(ownerPricing({ pricingPromises: ['price_by_phone_before_leaving', 'price_before_work', 'free_quote'] }).promises, ['free_quote', 'price_before_work']);
  assert.deepEqual(ownerPricing({ pricingPromises: ['price_by_phone_before_leaving'] }).promises, ['price_by_phone_before_leaving']);
});

test('pricing labels: the pending flag matches the placeholders, and patched templates must keep their slots', () => {
  const pending = Object.values(RESEARCHED_PRICING_LABELS).some(value => value.includes(HE_TODO_PREFIX));
  assert.equal(RESEARCHED_PRICING_LABELS_PENDING_COPY, pending);
  if (!pending) {
    for (const [key, slots] of Object.entries(PRICING_TEMPLATE_SLOTS)) {
      for (const slot of slots) assert.ok(RESEARCHED_PRICING_LABELS[key as keyof typeof RESEARCHED_PRICING_LABELS].includes(slot), `${key} keeps ${slot}`);
    }
  }
  for (const value of Object.values(RESEARCHED_PRICING_LABELS)) assert.ok(!HEBREW.test(value) || !pending);
});
