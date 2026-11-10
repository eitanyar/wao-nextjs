// Paid-journey v2 M2a.2 "fact accuracy": hours from code, claim gates from Noa's claimTokens,
// license wording, label pins, typography rule + gates, contact/legal titles, nullable guarantee,
// Hebrew-only review quote + paraphrase guard, owner-fact repetition cap, bet prefix on city lists.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew values come from generationData.ts
// (scripted copy of docs/copy/site-bot-generation-data.md); synthetic letters are escapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ARRIVAL_TOKENS,
  CLAIM_TOKENS,
  CONTACT_TITLE_PREFIX,
  DAY_LETTERS,
  FIX_TIME_LEAD_TOKENS,
  GUARD_CUSTOMER_STEMS,
  GUARD_SPEECH_VERBS,
  SERVICE_LABEL_PINS,
  STICKY_ACTION_TOKENS,
  STICKY_PROBLEM_WORDS,
  TYPOGRAPHY_RULE_TEXT,
} from './generationData';
import { CLAIM_RULES, FACT_REPEAT_MAX } from './copyGates.config';
import { copyGateContext, copyReviewFlags, effectiveReviewQuote, GATE_RULES, isMostlyHebrew, runCopyGates, type CopyGateContext } from './copyGates';
import { displayBusinessHours, formatBusinessHoursHebrew } from './businessHours';
import {
  assertBoundedGeneratedSiteCopy,
  buildResearchPageGenerationPrompt,
  generateResearchPageCopy,
  TYPOGRAPHY_RULE,
  withSystemFields,
} from './researchPageCopy';
import { renderResearchedSitePages, researchedContactTitle, type ResearchedSitePage } from './researchedSite';
import { renderSitePages } from './renderSitePages';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { SiteCopy } from './lpCopyPrompt';
import type { PageBrief } from '../site-bot/research/pageBrief';
import type { CollectedData } from '../bot/prompts';
import { setOwnerFactTemplatesForTests } from './ownerFactCopy';

// Copy v2 (2026-11-10): these tests cover the model-written v1 path (kept for the A/B and as the pending fallback), so the
// fact templates are forced pending here. The live code-owned path: ownerFactWiring, promptV2, factRestatement, repetitionBudget.
setOwnerFactTemplatesForTests(null);

const ROOT = path.resolve(__dirname, '../../..');
const RLM = '\u200F';
const BET = '\u05D1';
const VAV = '\u05D5';
const MAQAF = '\u05BE';
const GERESH = '\u05F3';
// Synthetic Hebrew-script letter sequences (test data, not copy; contain no gate token).
const HE_WORD = '\u05D0\u05D1\u05D2\u05D3';
const PLACE_A = '\u05D7\u05D8\u05DC\u05DF'; // one word
const PLACE_B = '\u05D2\u05D3 \u05D9\u05DD'; // two words, starts with a non-bet letter
const LABEL = '\u05D2\u05D3\u05D4 \u05D6\u05D7\u05D8';

/** M2a.5: a sticky-bar line that carries a section 19.4 action token (gate_sticky_action). */
// M2a.6: it also names a section 20.4 problem word (gate_sticky_naming).
const STICKY_LINE = `${STICKY_ACTION_TOKENS[0]} ${STICKY_PROBLEM_WORDS.general[0]}`;
const ctx = (overrides: Partial<CopyGateContext> = {}): CopyGateContext => ({
  soloOperator: true, serviceLabels: [], ownerFactsText: '', ownerFields: {}, reviewQuote: null, starRating: null, ...overrides,
});
const base: SiteCopy = {
  // M2a.6: the hero carries the research brief's search anchor (gate_hero_anchor).
  heroHeadline: LABEL, heroSubheadline: 'Sub', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: ['Alpha'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Promise',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form',
  stickyBarLine: STICKY_LINE, aboutPageHeadline: 'About page', aboutPageBody: 'About body', serviceDetails: [],
};
const loose = (copy: Partial<SiteCopy>) => ({ ...base, ...copy }) as unknown as Record<string, unknown>;
const rules = (hits: ReturnType<typeof runCopyGates>) => hits.map(hit => hit.rule);
/** Copy without serviceItems (the unconfirmed-service gate is not under test). */
const noSvc = (copy: Partial<SiteCopy>) => loose({ serviceItems: [], ...copy });

function briefWithSite(site: Partial<NonNullable<PageBrief['site']>> = {}): PageBrief {
  return {
    page: { id: 'svc-alpha', targetPath: '/services/alpha', pageClass: 'money_service' },
    persona: { id: 'persona', value: 'Local customer' }, waoOffer: { id: 'offer', value: 'offer' },
    targetQueries: [], approvedEntityAnchors: [{ id: 'entity-1', value: 'alpha' }], firstPartyProof: [],
    assertableLocalFacts: [], customerDecisions: [], constraints: [], links: [], informationGainGaps: [], prohibitedClaims: [],
    faqPolicy: 'none', faqCandidates: [],
    site: { pageName: LABEL, relevanceTerm: LABEL, city: null, serviceArea: [], serviceLabels: [LABEL], businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: false, ...site },
  };
}

// ---------------------------------------------------------------------------
// Data file: the generated module is a byte-exact copy (drift check at test time).
// ---------------------------------------------------------------------------

test('generationData.ts equals the ~~~json blocks of docs/copy/site-bot-generation-data.md and holds zero Hebrew bytes', () => {
  const text = fs.readFileSync(path.join(ROOT, 'docs/copy/site-bot-generation-data.md'), 'utf8');
  const blocks = [...text.matchAll(/\n~~~json\n([\s\S]*?)\n~~~/g)].map(match => JSON.parse(match[1]));
  const data = Object.assign({}, ...blocks);
  assert.deepEqual([...DAY_LETTERS], data.dayLetters);
  assert.deepEqual(JSON.parse(JSON.stringify(CLAIM_TOKENS)), data.claimTokens);
  assert.deepEqual(Object.fromEntries(Object.entries(data.serviceLabelPins).map(([key, pin]) => [key, (pin as { label: string }).label])), SERVICE_LABEL_PINS);
  assert.equal(CONTACT_TITLE_PREFIX, data.contactTitlePrefix);
  assert.equal(TYPOGRAPHY_RULE_TEXT, (data.typographyRule as string).replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))));
  // M2a.3 sections 6-13 are checked in generationGates.test.ts.
  for (const file of ['src/lib/lp/generationData.ts', 'src/lib/lp/copyGates.ts', 'src/lib/lp/researchPageCopy.ts', 'src/lib/lp/businessHours.ts', 'src/lib/site-bot/siteIdentity.ts', 'scripts/site-bot/build-generation-data.mjs']) {
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, file), 'utf8'), /[\u0590-\u05FF]/, file);
  }
});

// ---------------------------------------------------------------------------
// 1. Hours come from code.
// ---------------------------------------------------------------------------

test('1 hours: formatted in code from Noa day letters (Sun-Fri is the 1st to the 6th letter); the model may not write hours', () => {
  assert.equal(formatBusinessHoursHebrew('Sun-Fri 07:00-17:00'), `${DAY_LETTERS[0]}\u2013${DAY_LETTERS[5]} 07:00\u201317:00`);
  assert.equal(formatBusinessHoursHebrew('Sun-Thu 08:00-18:00, Fri 08:00-13:00'), `${DAY_LETTERS[0]}\u2013${DAY_LETTERS[4]} 08:00\u201318:00, ${DAY_LETTERS[5]} 08:00\u201313:00`);
  assert.equal(displayBusinessHours('Sun-Thu 08:00-18:00, by appointment'), null);
  assert.equal(displayBusinessHours(`${HE_WORD} 8-5`), `${HE_WORD} 8-5`);
  assert.equal(displayBusinessHours(''), null);
  // Gate: clock times and day-letter ranges are model-written hours.
  assert.deepEqual(rules(runCopyGates(loose({ trustBarItems: [`${DAY_LETTERS[0]}\u2013${DAY_LETTERS[4]} ${HE_WORD}`] }), ctx())), [GATE_RULES.hours]);
  assert.deepEqual(rules(runCopyGates(loose({ stickyBarLine: `${HE_WORD} 08:00` }), ctx())), [GATE_RULES.hours]);
  assert.deepEqual(runCopyGates(loose({ aboutBlurb: `${HE_WORD} 24 ${HE_WORD}` }), ctx()), []);
});

const pageCopy = (overrides: Partial<SiteCopy> = {}): SiteCopy => ({ ...base, ...overrides });
const siteData: CollectedData = {
  businessName: 'TEST M2a Plumbing', businessNiche: 'plumber', phone: '050-0000000', targetLocation: 'Holon',
  specificCities: 'Holon, Bat Yam', businessHours: 'Sun-Thu 08:00-18:00',
};
const sitePages: ResearchedSitePage[] = [
  { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: pageCopy({ guaranteeBlock: null }), seo: { name: LABEL, city: PLACE_A, serviceArea: [PLACE_A] } },
  { opportunityId: 'svc-alpha', classification: 'money_service', targetPath: '/services/alpha', copy: pageCopy(), seo: { name: LABEL, city: PLACE_A, serviceArea: [PLACE_A] } },
];
const renderSite = (data: CollectedData = siteData) => renderResearchedSitePages({
  theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data,
  heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il', pages: sitePages,
  graphEdges: [{ fromId: 'home', toId: 'svc-alpha' }, { fromId: 'svc-alpha', toId: 'home' }],
});

test('1 hours on contact.html: the code-formatted Hebrew string, never the raw "Sun-Thu"; legacy sites unchanged', () => {
  const site = renderSite();
  assert.doesNotMatch(site['contact.html'], /Sun-Thu/);
  assert.ok(site['contact.html'].includes(`${DAY_LETTERS[0]}\u2013${DAY_LETTERS[4]} 08:00\u201318:00`));
  const legacy = renderSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data: siteData,
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il', copy: pageCopy(),
  });
  assert.match(legacy['contact.html'], /Sun-Thu 08:00-18:00/);
  assert.match(legacy['contact.html'], /<title>Form \u2014 TEST M2a Plumbing<\/title>/);
  assert.match(legacy['privacy.html'], /<title>[^<]* \u2014 TEST M2a Plumbing<\/title>/);
});

// ---------------------------------------------------------------------------
// 2-3. Claim gates from claimTokens; license grades never mapped.
// ---------------------------------------------------------------------------

test('2 every claimTokens token is rejected in final copy unless the owner stated the claim; the config carries the data tokens', () => {
  for (const [kind, tokens] of Object.entries(CLAIM_TOKENS)) {
    const rule = CLAIM_RULES.find(item => item.id === kind);
    assert.ok(rule, kind);
    assert.deepEqual([...rule!.tokens], [...tokens], kind);
    // M2a.3: fix_time is decided by the sentence check only (generationGates.test.ts).
    if (rule!.sentenceOnly) continue;
    for (const token of tokens) {
      const hits = runCopyGates(loose({ aboutBlurb: `${HE_WORD} ${token} ${HE_WORD}` }), ctx());
      assert.ok(hits.some(hit => hit.actual === `claim:${kind}`), `${kind}: ${token}`);
      // Owner-stated in Hebrew (the token itself in the owner facts) authorises it.
      assert.ok(!runCopyGates(loose({ aboutBlurb: `${HE_WORD} ${token}` }), ctx({ ownerFactsText: token })).some(hit => hit.actual === `claim:${kind}`), `${kind} authorised`);
    }
  }
  // English owner wording authorises the matching kind (never license_grade).
  const parts = CLAIM_TOKENS.parts_included[0];
  assert.deepEqual(runCopyGates(loose({ aboutBlurb: parts }), ctx({ ownerFactsText: 'Price includes parts and labor' })), []);
  // A customer's quote never authorises an owner claim.
  const report = CLAIM_TOKENS.report_included[0];
  const gates = copyGateContext({ reviewQuote: 'He left a full report' }, []);
  assert.ok(runCopyGates(loose({ aboutBlurb: report }), gates).some(hit => hit.actual === 'claim:report_included'));
  // street_address is authorised by the owner's streetAddress field.
  assert.deepEqual(runCopyGates(loose({ aboutBlurb: CLAIM_TOKENS.street_address[0] }), ctx({ ownerFields: { streetAddress: 'Herzl 1' } })), []);
});

test('2 fix_time sentence check: pinned label + "within <number>" is a hit unless the verb is arrival; arrival in an installation heading is flagged for review', () => {
  const installLabel = SERVICE_LABEL_PINS['water heater install'];
  const labels = [LABEL, installLabel];
  const FIX_TIME_WITHIN = FIX_TIME_LEAD_TOKENS[0];
  const fix = `${LABEL} ${FIX_TIME_WITHIN} 30 ${HE_WORD}.`;
  assert.deepEqual(runCopyGates(noSvc({ aboutBlurb: fix }), ctx({ serviceLabels: labels })).map(hit => hit.actual), ['claim:fix_time']);
  assert.deepEqual(runCopyGates(noSvc({ aboutBlurb: `${HE_WORD} ${FIX_TIME_WITHIN} 30` }), ctx({ serviceLabels: labels })), [], 'no label -> no hit');
  assert.deepEqual(runCopyGates(noSvc({ aboutBlurb: `${HE_WORD}. ${LABEL} ${HE_WORD}. ${FIX_TIME_WITHIN} 30` }), ctx({ serviceLabels: labels })), [], 'other sentence');
  for (const arrival of ARRIVAL_TOKENS) {
    assert.deepEqual(runCopyGates(noSvc({ aboutBlurb: `${LABEL}: ${arrival} ${FIX_TIME_WITHIN} 30` }), ctx({ serviceLabels: labels })), [], arrival);
  }
  assert.deepEqual(runCopyGates(noSvc({ aboutBlurb: fix }), ctx({ serviceLabels: labels, ownerFactsText: 'usp: same-day fixes' })), [], 'owner stated');
  const heading = `${installLabel} ${ARRIVAL_TOKENS[0]} ${FIX_TIME_WITHIN} 20`;
  assert.deepEqual(copyReviewFlags(noSvc({ heroHeadline: heading }), ctx({ serviceLabels: labels })), [{ field: 'heroHeadline', flag: 'arrival_time_in_installation_heading' }]);
  assert.deepEqual(copyReviewFlags(noSvc({ aboutBlurb: heading }), ctx({ serviceLabels: labels })), [], 'not a heading');
});

test('3 license: an English owner grade never authorises a Hebrew grade; only the exact grade the owner stated in Hebrew passes', () => {
  const grades = CLAIM_TOKENS.license_grade;
  const english = copyGateContext({ license: 'Master electrician license (TEST, no number)', usp: 'Licensed master electrician' }, []);
  for (const grade of grades) assert.ok(runCopyGates(loose({ trustBarItems: [grade] }), english).some(hit => hit.actual === 'claim:license_grade'), grade);
  const stated = copyGateContext({ license: `${grades[1]} ${HE_WORD}` }, []);
  assert.deepEqual(runCopyGates(loose({ trustBarItems: [grades[1]] }), stated), []);
  assert.ok(runCopyGates(loose({ trustBarItems: [grades[2]] }), stated).some(hit => hit.actual === 'claim:license_grade'));
  // Prompt: owner wording only, never a mapped grade; the legacy license-grade example is cut from the research prompt.
  const prompt = buildResearchPageGenerationPrompt(briefWithSite(), { businessNiche: 'electrician', license: 'Master electrician license' });
  assert.match(prompt, /never translate or map it to a license grade/);
  assert.doesNotMatch(prompt, /Example 2 \u2014 aboutBlurb opener/);
  assert.match(prompt, /Example 3 \u2014/);
  for (const grade of grades) assert.ok(!prompt.includes(grade), grade);
});

// ---------------------------------------------------------------------------
// 5. Typography rule + deterministic gates.
// ---------------------------------------------------------------------------

test('5 typography: Noa rule replaces TYPOGRAPHY_RULE; maqaf/hyphen inside a place name and geresh-as-quote are rejected', () => {
  assert.equal(TYPOGRAPHY_RULE, TYPOGRAPHY_RULE_TEXT);
  const [first, second] = PLACE_B.split(' ');
  const places = [PLACE_A, PLACE_B];
  for (const joiner of [MAQAF, '-']) {
    assert.deepEqual(rules(runCopyGates(loose({ aboutBlurb: `${HE_WORD} ${BET}${first}${joiner}${second}` }), ctx({ places }))), [GATE_RULES.placeHyphen], joiner);
  }
  assert.deepEqual(runCopyGates(loose({ aboutBlurb: `${HE_WORD} ${BET}${PLACE_B}` }), ctx({ places })), []);
  // A prefix hyphen before a number is fine (Noa's rule).
  assert.deepEqual(runCopyGates(loose({ aboutBlurb: `${HE_WORD} ${BET}-2024` }), ctx({ places })), []);
  assert.deepEqual(rules(runCopyGates(loose({ aboutPageBody: `${HE_WORD} ${GERESH}${HE_WORD} ${HE_WORD}${GERESH}.` }), ctx())), [GATE_RULES.gereshQuote]);
  // Abbreviation gereshes (letter + geresh) are not quotation marks.
  assert.deepEqual(runCopyGates(loose({ aboutPageBody: `${HE_WORD}${GERESH} ${HE_WORD} ${HE_WORD}${GERESH}` }), ctx()), []);
});

// ---------------------------------------------------------------------------
// 6. Contact + legal titles.
// ---------------------------------------------------------------------------

test('6 contact title `<prefix> <trade> b<city> | <brand>` (RLM only for a Latin brand); legal titles use `| brand` on researched sites', () => {
  assert.equal(researchedContactTitle(LABEL, PLACE_A, 'TEST Biz'), `${CONTACT_TITLE_PREFIX} ${LABEL} ${BET}${PLACE_A}${RLM} | TEST Biz`);
  assert.equal(researchedContactTitle(LABEL, PLACE_A, HE_WORD), `${CONTACT_TITLE_PREFIX} ${LABEL} ${BET}${PLACE_A} | ${HE_WORD}`);
  assert.equal(researchedContactTitle('', PLACE_A, 'TEST Biz'), null);
  const site = renderSite();
  const title = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  assert.equal(title(site['contact.html']), `${CONTACT_TITLE_PREFIX} ${LABEL} ${BET}${PLACE_A}${RLM} | TEST M2a Plumbing`);
  assert.ok(title(site['contact.html']).length <= 60);
  for (const file of ['privacy.html', 'accessibility.html']) {
    assert.match(title(site[file]), new RegExp(`^[^\u2014]+${RLM} \\| TEST M2a Plumbing$`), file);
  }
});

// ---------------------------------------------------------------------------
// 7. guaranteeBlock is nullable; no filler.
// ---------------------------------------------------------------------------

test('7 guaranteeBlock: system-null without an owner guarantee (never repaired into filler); kept when the owner has one; renderer omits null', async () => {
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy({ ...base, guaranteeBlock: null }));
  assert.throws(() => assertBoundedGeneratedSiteCopy({ ...base, guaranteeBlock: '' }));
  const brief = briefWithSite();
  const asked: string[] = [];
  const copy = await generateResearchPageCopy(brief, { businessNiche: 'plumber' }, {
    callJson: async (_system, user) => { asked.push(user); return JSON.stringify({ ...base, guaranteeBlock: '', serviceItems: [LABEL] }); },
  });
  assert.equal(copy.guaranteeBlock, null);
  assert.equal(asked.length, 2, 'no repair call was spent on guaranteeBlock');
  assert.match(asked[0], /"guaranteeBlock": null/);
  const kept = withSystemFields({ ...base, guaranteeBlock: HE_WORD } as unknown as Record<string, unknown>, brief, { guarantee: 'Two years' });
  assert.equal(kept.guaranteeBlock, HE_WORD);
  const legacyHome = renderSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data: siteData,
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il', copy: pageCopy({ guaranteeBlock: null }),
  })['index.html'];
  assert.doesNotMatch(legacyHome, />\s*null\s*</);
  assert.ok(!legacyHome.includes('Promise'));
});

// ---------------------------------------------------------------------------
// 8. Review quote: Hebrew only, never translated; paraphrase guard.
// ---------------------------------------------------------------------------

test('8 review quote: shown only when mostly Hebrew (else null, never sent to the model); statements attributed to customers are rejected', () => {
  assert.equal(isMostlyHebrew(`${HE_WORD} ${HE_WORD} OK`), true);
  assert.equal(isMostlyHebrew('He showed me the panel'), false);
  assert.equal(effectiveReviewQuote({ reviewQuote: 'He showed me the panel' }), null);
  assert.equal(effectiveReviewQuote({ reviewQuote: ` ${HE_WORD} ` }), HE_WORD);
  const brief = briefWithSite();
  const latin = withSystemFields({ ...base } as unknown as Record<string, unknown>, brief, { reviewQuote: 'He showed me the panel', guarantee: 'x' });
  assert.equal(latin.reviewFeatured, null);
  const prompt = buildResearchPageGenerationPrompt(brief, { businessNiche: 'electrician', reviewQuote: 'He showed me the panel' });
  assert.ok(!prompt.includes('He showed me the panel'));
  assert.match(prompt, /"reviewFeatured": null/);
  const hebrew = withSystemFields({ ...base } as unknown as Record<string, unknown>, brief, { reviewQuote: HE_WORD, guarantee: 'x' });
  assert.equal(hebrew.reviewFeatured, HE_WORD);
  // Paraphrase guard: customer stem + speech verb in one sentence.
  for (const verb of GUARD_SPEECH_VERBS) {
    const said = `${HE_WORD} ${GUARD_CUSTOMER_STEMS[0]} ${HE_WORD} ${verb} ${HE_WORD}`;
    assert.deepEqual(rules(runCopyGates(loose({ aboutPageBody: said }), ctx())), [GATE_RULES.customerAttribution], verb);
    assert.deepEqual(runCopyGates(loose({ aboutPageBody: `${GUARD_CUSTOMER_STEMS[0]}. ${verb}` }), ctx()), [], 'separate sentences');
    // reviewFeatured (the verbatim quote) is exempt.
    assert.deepEqual(runCopyGates(loose({ reviewFeatured: said }), ctx()), []);
  }
});

// ---------------------------------------------------------------------------
// 9. Owner-fact repetition cap.
// ---------------------------------------------------------------------------

test('9 owner-fact repetition: a fact phrase (digit run of an owner fact) above the cap per page triggers a repair', async () => {
  const gates = copyGateContext({ yearsInField: '18 years', usp: 'within 20 minutes', phone: '050-0000001', reviewQuote: '15' }, []);
  assert.deepEqual(gates.factPhrases, ['18', '20']);
  const copy = loose({ heroSubheadline: `18 ${HE_WORD}`, trustBarItems: [`18 ${HE_WORD}`], aboutBlurb: `${HE_WORD} 18`, stickyBarLine: `${STICKY_LINE} 18` });
  const hits = runCopyGates(copy, gates).filter(hit => hit.rule === GATE_RULES.factRepeat);
  assert.equal(FACT_REPEAT_MAX, 2);
  assert.deepEqual(hits.map(hit => hit.field).sort(), ['aboutBlurb', 'stickyBarLine'].sort());
  assert.deepEqual(runCopyGates(loose({ aboutBlurb: `${HE_WORD} 180 118` }), gates), [], 'digit boundaries');
  // M2a.7: on a research site the repeats in unrendered fields (aboutBlurb, stickyBarLine) are warnings: no repair call.
  // M2b.1g (section 23.2 f): on a research site the counters count rendered fields only, so the unrendered repeats are not
  // counted at all (no warning either).
  const events: string[] = [];
  let calls = 0;
  const kept = await generateResearchPageCopy(briefWithSite(), { businessNiche: 'plumber', yearsInField: '18 years', guarantee: 'x' }, {
    callJson: async (system) => {
      calls++;
      assert.doesNotMatch(system, /repairing specific fields/);
      return JSON.stringify({ ...base, ...copy, serviceItems: [LABEL] });
    },
    onEvent: event => { if (event.kind === 'warnings') events.push(...(event.violations ?? []).map(item => `${item.field}:${item.rule}`)); },
  });
  assert.equal(kept.stickyBarLine, `${STICKY_LINE} 18`);
  assert.equal(calls, 2);
  assert.ok(!events.includes(`stickyBarLine:${GATE_RULES.factRepeat}`) && !events.includes(`aboutBlurb:${GATE_RULES.factRepeat}`));
  // The repair loop still receives a fact repeat in a rendered field.
  calls = 0;
  const repaired = await generateResearchPageCopy(briefWithSite(), { businessNiche: 'plumber', yearsInField: '18 years', guarantee: 'x' }, {
    callJson: async (system, user) => {
      calls++;
      if (/repairing specific fields/.test(system)) {
        assert.match(user, /repeats the owner fact "18"/);
        return JSON.stringify({ heroSubheadline: HE_WORD });
      }
      return JSON.stringify({ ...base, heroSubheadline: `18 ${HE_WORD} 18 ${HE_WORD} 18`, serviceItems: [LABEL] });
    },
  });
  assert.equal(repaired.heroSubheadline, HE_WORD);
  assert.ok(calls >= 3);
});

// ---------------------------------------------------------------------------
// 10. Bet prefix on every city in a list.
// ---------------------------------------------------------------------------

test('10 city lists: when the first place has the bet prefix every later place needs it (also after vav); prompt rule present', () => {
  const places = [PLACE_A, PLACE_B];
  assert.deepEqual(rules(runCopyGates(loose({ aboutBlurb: `${HE_WORD} ${BET}${PLACE_A} ${VAV}${PLACE_B}` }), ctx({ places }))), [GATE_RULES.cityPrefix]);
  assert.deepEqual(rules(runCopyGates(loose({ aboutBlurb: `${HE_WORD} ${BET}${PLACE_A}, ${PLACE_B}` }), ctx({ places }))), [GATE_RULES.cityPrefix]);
  assert.deepEqual(runCopyGates(loose({ aboutBlurb: `${HE_WORD} ${BET}${PLACE_A} ${VAV}${BET}${PLACE_B}` }), ctx({ places })), []);
  assert.deepEqual(runCopyGates(loose({ aboutBlurb: `${HE_WORD} ${PLACE_A} ${VAV}${PLACE_B}` }), ctx({ places })), [], 'not locative');
  assert.deepEqual(runCopyGates(loose({ aboutBlurb: `${BET}${PLACE_A} ${HE_WORD}. ${PLACE_B} ${HE_WORD}` }), ctx({ places })), [], 'separate sentences');
  const prompt = buildResearchPageGenerationPrompt(briefWithSite(), { businessNiche: 'plumber' });
  assert.match(prompt, /attach the locative prefix letter \(\u05D1\) to every place in the list/);
});
