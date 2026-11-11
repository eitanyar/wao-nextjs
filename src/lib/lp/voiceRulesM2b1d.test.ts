// Paid-journey v2 M2b.1d: Tamar's section 22 voice rules (Noa PASS, Yonatan + Maya sign-off): the idealClientFear
// differentiator source (Adam: English keywords on word boundaries), aboutHeadlineNoPromise, the services headline closed
// set, the trust-bar filler / size gates (Adam: filler exempt when verbatim in the owner facts), the about checks scoped to
// the homepage / services hub, the deleted run-log warnings, home/hub-only field generation, the eval switch, and B7
// (a response-time trust item on an emergency page trips no fix-time / arrival gate or review flag).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew values come from generationData.ts (scripted copy of
// docs/copy/site-bot-generation-data.md); synthetic letter sequences are escapes and contain no gate token.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  ARRIVAL_TOKENS,
  BEFORE_TOKENS,
  DIFFERENTIATOR_FEAR_KEYWORDS,
  DIFFERENTIATOR_SOURCE_FIELDS_ADD,
  FIX_TIME_LEAD_TOKENS,
  FIX_TIME_WITHIN_WORDS,
  GUARD_TOKEN_SOURCES,
  HERO_CAP_AC_ONLY,
  HERO_CAP_CONCEPT_ADDITIONS,
  M2B_EVERY_PAGE_RULE_IDS,
  M2B_PROMPT_RULES,
  M2B_PROMPT_RULES_AFTER_M2B2,
  SAME_DAY_TOKENS,
  SERVICE_LABEL_PINS,
  SERVICES_HEADLINE_OPTIONS,
  SIGNATURE_WORD_TOKENS,
  TRUST_BAR_FILLER_PHRASES,
  TRUST_BAR_MAX_CHARS,
  TRUST_BAR_MAX_ITEMS,
  ABOUT_HEADLINE_NO_PROMISE,
} from './generationData';
import {
  aboutHeadlinePromiseKinds,
  blockingGateHits,
  codePointLength,
  copyGateContext,
  copyReviewFlags,
  DIFFERENTIATOR_SOURCE_FIELDS,
  differentiatorGroups,
  fearKeywordGroups,
  GATE_RULES,
  runCopyGates,
  servicesHeadlineInSet,
  WARNING_ONLY_RULES,
  warningGateHits,
  type CopyGateContext,
} from './copyGates';
import {
  applySafeDeterministicFixes,
  assertBoundedGeneratedSiteCopy,
  briefGateContext,
  buildNoaQaMessage,
  buildResearchPageGenerationPrompt,
  generateResearchPageCopy,
  normalizedServicesHeadline,
  pitchFirstRuleText,
  shapeOptions,
  SITE_COPY_STRING_LIST_LIMITS,
  TRUST_BAR_MIN_KEPT,
  ungeneratedFieldsFor,
  withSystemFields,
} from './researchPageCopy';
import { buildAccessibilityHtml, buildPrivacyHtml, prefixJoiner } from './legalPages';
import { VERTICAL_THEMES } from './verticalThemes';
import { DEPTH_BLOCK_KEYS } from './depthBlocks';
import {
  buildResearchedSiteGeneration,
  OWNER_CONTACT_MISSING,
  OWNER_CONTACT_MISSING_MESSAGE,
  ownerContactMissing,
} from '../site-bot/researchedSiteGeneration';
import { runResearchToSite } from '../site-bot/researchToSite';
import {
  RESEARCHED_HOME_HUB_ONLY_FIELDS,
  RESEARCHED_RENDERED_WARN_ONLY_FIELDS,
  researchedGatedFieldsFor,
  type ResearchedSitePage,
} from './researchedSite';
import type { SiteCopy } from './lpCopyPrompt';
import { siteGenerationContext } from '../site-bot/researchedSiteGeneration';
import { assertResearchedSiteGraphSafe } from '../site-bot/researchedSiteGraphValidation';
import type { PageBrief } from '../site-bot/research/pageBrief';
import { setOwnerFactTemplatesForTests } from './ownerFactCopy';

// Copy v2 (2026-11-10): these tests cover the model-written v1 path (kept for the A/B and as the pending fallback), so the
// fact templates are forced pending here. The live code-owned path: ownerFactWiring, promptV2, factRestatement, repetitionBudget.
setOwnerFactTemplatesForTests(null);

const ROOT = path.resolve(__dirname, '../../..');
const DATA_FILE = path.join(ROOT, 'docs/copy/site-bot-generation-data.md');
const BET = '\u05D1';
// Synthetic Hebrew-script letter sequences (test data, not copy; contain no gate token).
const HE_WORD = '\u05D0\u05D1\u05D2\u05D3';
const W1 = '\u05D0\u05D1\u05D2';
const W2 = '\u05D3\u05D4\u05D6';
const LABEL = '\u05D2\u05D3\u05D4 \u05D6\u05D7\u05D8';

const base: SiteCopy = {
  heroHeadline: LABEL, heroSubheadline: 'Sub', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: SERVICES_HEADLINE_OPTIONS[0], serviceItems: [], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Promise',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form',
  stickyBarLine: 'Sticky', aboutPageHeadline: 'About page', aboutPageBody: 'About body', serviceDetails: [],
};
const loose = (copy: Partial<SiteCopy>) => ({ ...base, ...copy }) as unknown as Record<string, unknown>;
const vctx = (overrides: Partial<CopyGateContext> = {}, data = {}): CopyGateContext => ({ ...copyGateContext(data, [], true, [], { researchSite: true }), ...overrides });
const rulesOf = (copy: Record<string, unknown>, gates: CopyGateContext, rule: string) =>
  runCopyGates(copy, gates).filter(hit => hit.rule === rule).map(hit => `${hit.field}=${hit.actual}`);

function brief(slug: string, pageClass = 'money_service', pageName = LABEL, serviceLabels: string[] = [LABEL]): PageBrief {
  return {
    page: { id: pageClass === 'homepage' ? 'home' : pageClass === 'service_hub' ? 'hub' : 'svc', targetPath: pageClass === 'homepage' ? '/' : `/services/${slug}`, pageClass },
    persona: { id: 'persona', value: 'Local customer' }, waoOffer: { id: 'offer', value: 'offer' },
    targetQueries: [], approvedEntityAnchors: [{ id: 'entity-1', value: 'x' }], firstPartyProof: [],
    assertableLocalFacts: [], customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [],
    links: pageClass === 'homepage' ? [{ targetPath: `/services/${slug}`, relationship: 'service_child', evidenceIds: ['entity-1'] }] : [],
    faqPolicy: 'none', faqCandidates: [],
    site: { pageName, relevanceTerm: pageName, city: null, serviceArea: [], serviceLabels, serviceSources: serviceLabels.map(() => slug), businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: pageClass === 'homepage' },
  };
}

test('M2b.1d 1: generationData carries section 22 byte-exact and counted; B1-B6 are slices of the data file; --check passes', () => {
  const text = fs.readFileSync(DATA_FILE, 'utf8');
  const blocks = [...text.matchAll(/\n~~~json\n([\s\S]*?)\n~~~/g)].map(match => JSON.parse(match[1]));
  assert.equal(blocks.length, 60); // M2b.1g adds 8 (section 23)
  const data = Object.assign({}, ...blocks);
  const same = (actual: unknown, expected: unknown) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
  same(DIFFERENTIATOR_SOURCE_FIELDS_ADD, data.differentiatorSourceFieldsAdd);
  same(DIFFERENTIATOR_FEAR_KEYWORDS, data.differentiatorFearKeywords);
  same(ABOUT_HEADLINE_NO_PROMISE, { field: data.aboutHeadlineNoPromise.field, forbidLists: data.aboutHeadlineNoPromise.forbidLists });
  same(SERVICES_HEADLINE_OPTIONS, data.servicesHeadlineOptions);
  same(TRUST_BAR_FILLER_PHRASES, data.trustBarFillerPhrases);
  assert.equal(TRUST_BAR_MAX_ITEMS, data.trustBarMaxItems);
  assert.equal(TRUST_BAR_MAX_CHARS, data.trustBarMaxChars);
  assert.deepEqual(M2B_PROMPT_RULES.map(rule => rule.id), ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']);
  assert.deepEqual([...M2B_EVERY_PAGE_RULE_IDS], ['B2']);
  const section = text.slice(text.indexOf('\n## 22.'));
  for (const rule of M2B_PROMPT_RULES) {
    const [head, ...subs] = rule.text.split('\n');
    assert.ok(section.includes(`- **${rule.id} \u2014 `) && section.replace(/\*\*/g, '').includes(`- ${head}`), rule.id);
    for (const sub of subs) assert.ok(section.includes(`\n${sub}\n`), `${rule.id} sub-line`);
  }
  for (const key of ['differentiatorFearKeywords', 'aboutHeadlineNoPromise', 'servicesHeadlineOptions', 'trustBarFillerPhrases', 'm2bPromptRules']) assert.match(GUARD_TOKEN_SOURCES[key] ?? '', /section 22\b/, key);
  assert.equal(execFileSync('node', [path.join(ROOT, 'scripts/site-bot/build-generation-data.mjs'), '--check'], { encoding: 'utf8' }).trim(), 'generationData.ts up to date');
});

test('M2b.1d 2: idealClientFear is a differentiator source; English fear keywords match on word boundaries (plural / -y forms allowed, "messages" never)', () => {
  assert.deepEqual([...DIFFERENTIATOR_SOURCE_FIELDS], ['usp', 'guarantee', 'idealClientFear']);
  const groups = (fear: string) => differentiatorGroups({ ownerFields: { idealClientFear: fear } });
  // The M2a.7 fixture fears (English owner input) and the groups section 22.2 lists for them.
  assert.deepEqual(groups('That the plumber breaks the bathroom tiles, leaves a mess and disappears for a week'), ['tiles', 'noMess']);
  assert.deepEqual(groups('A technician who refills the gas without finding the leak, so the AC breaks again a month later'), ['fromTheRoot']);
  assert.deepEqual(groups('An electrician who quotes low, finds surprises inside the wall and doubles the price'), ['noSurprises']);
  assert.deepEqual([...groups('A plumber who opens the wall in the wrong place and leaves a mess')].sort(), ['noMess', 'tiles', 'wrongPlace']);
  // Adam (M2b.1d): word boundaries. Noa's overfire case never maps to noMess; the forms Tamar listed still do.
  assert.deepEqual(fearKeywordGroups("A plumber who doesn't answer messages"), []);
  assert.deepEqual(groups("A plumber who doesn't answer messages"), []);
  assert.deepEqual(groups('A messy bathroom after the job'), ['noMess']);
  assert.deepEqual(groups('He messes up the floor'), ['noMess']);
  assert.deepEqual(groups('It leaves the place dirty'), ['noMess']);
  assert.deepEqual(groups('Re-tile the whole wall'), ['tiles'], 'hyphens read as spaces');
  assert.deepEqual(groups('Industrial dust everywhere'), [], 'dust is deliberately absent');
  assert.deepEqual(groups('He never comes back'), [], 'comes back is deliberately absent');
  // A Hebrew fear counts as a Hebrew usp does (section 19.3 / 20.1 variants); with none, no group.
  assert.deepEqual(groups(`${HE_WORD} ${SIGNATURE_WORD_TOKENS.tiles[0]}`), ['tiles']);
  assert.deepEqual(groups(`${HE_WORD} ${W1} ${W2}`), []);
  // The fear source only adds: the usp keeps its plain-substring match.
  assert.deepEqual(differentiatorGroups({ ownerFields: { usp: 'Explains the quote line by line', idealClientFear: 'surprises in the price' } }), ['lineByLine', 'noSurprises']);
  // The effect: a tiles promise from the fear may appear twice per page (hero + about body), not a third time.
  const tile = SIGNATURE_WORD_TOKENS.tiles[0];
  const gates = vctx({}, { idealClientFear: 'That the plumber breaks the bathroom tiles' });
  assert.deepEqual(rulesOf(loose({ heroHeadline: `${LABEL} ${tile}`, aboutPageBody: `${W1} ${tile}` }), gates, GATE_RULES.signatureRepeat), []);
  assert.deepEqual(rulesOf(loose({ heroHeadline: `${LABEL} ${tile}`, aboutPageBody: `${W1} ${tile}`, aboutBlurb: `${W2} ${tile}` }), gates, GATE_RULES.signatureRepeat).length, 1);
  assert.deepEqual(rulesOf(loose({ heroHeadline: `${LABEL} ${tile}`, aboutPageBody: `${W1} ${tile}` }), vctx(), GATE_RULES.signatureRepeat).length, 1, 'without the fear source the tiles cap is 1');
});

test('M2b.1d 3: aboutHeadlineNoPromise: a signature variant, a hero-cap concept (own label masked, AC-only entries on AC pages) or a "before" hit fails the about headline, on home / hub pages only', () => {
  const tile = SIGNATURE_WORD_TOKENS.tiles[0];
  assert.deepEqual(aboutHeadlinePromiseKinds(`${W1} ${tile}`), ['signature:tiles']);
  assert.deepEqual(aboutHeadlinePromiseKinds(`${W1} ${W2}`), []);
  assert.deepEqual(aboutHeadlinePromiseKinds(`${BEFORE_TOKENS[0]}${W1}`), ['before']);
  const [group, entries] = Object.entries(HERO_CAP_CONCEPT_ADDITIONS).find(([, list]) => list.some(entry => !HERO_CAP_AC_ONLY.includes(entry)))!;
  const concept = entries.find(entry => !HERO_CAP_AC_ONLY.includes(entry))!;
  assert.ok(aboutHeadlinePromiseKinds(`${W1} ${concept}`).includes(`concept:${group}`));
  assert.ok(!aboutHeadlinePromiseKinds(`${W1} ${concept}`, { maskLabels: [concept], acPage: false }).includes(`concept:${group}`), 'own service label masked');
  const acOnly = HERO_CAP_AC_ONLY[0];
  const acGroup = Object.entries(HERO_CAP_CONCEPT_ADDITIONS).find(([, list]) => list.includes(acOnly))![0];
  assert.ok(!aboutHeadlinePromiseKinds(`${W1} ${acOnly}`, { maskLabels: [], acPage: false }).includes(`concept:${acGroup}`), 'AC-only entry off AC pages');
  assert.ok(aboutHeadlinePromiseKinds(`${W1} ${acOnly}`, { maskLabels: [], acPage: true }).includes(`concept:${acGroup}`));
  // As a gate: on the homepage / hub it fails (a hard gate since M2b.1f); a money page does not generate it.
  const hub = briefGateContext(brief('services', 'service_hub'), {});
  const money = briefGateContext(brief('leak-detection'), {});
  const copy = loose({ aboutPageHeadline: `${W1} ${tile}` });
  assert.deepEqual(rulesOf(copy, hub, GATE_RULES.aboutHeadlinePromise), ['aboutPageHeadline=about_promise:signature:tiles']);
  assert.deepEqual(rulesOf(copy, money, GATE_RULES.aboutHeadlinePromise), []);
});

test('M2b.1d 4: servicesHeadline is a closed set: the system normalises it (trimmed match, else the first entry) and the gate backs it up; money pages get the first entry', async () => {
  assert.ok(SERVICES_HEADLINE_OPTIONS.every(servicesHeadlineInSet));
  assert.ok(servicesHeadlineInSet(` ${SERVICES_HEADLINE_OPTIONS[1]} `));
  assert.ok(!servicesHeadlineInSet(`${SERVICES_HEADLINE_OPTIONS[1]} ${W1}`));
  assert.equal(normalizedServicesHeadline(` ${SERVICES_HEADLINE_OPTIONS[1]} `), SERVICES_HEADLINE_OPTIONS[1]);
  assert.equal(normalizedServicesHeadline(`${W1} ${W2}`), SERVICES_HEADLINE_OPTIONS[0]);
  assert.equal(normalizedServicesHeadline(null), SERVICES_HEADLINE_OPTIONS[0]);
  const hub = brief('services', 'service_hub');
  assert.deepEqual(rulesOf(loose({ servicesHeadline: `${W1} ${W2}` }), briefGateContext(hub, {}), GATE_RULES.servicesHeadlineSet), ['servicesHeadline=services_headline:not_in_set']);
  assert.equal(withSystemFields(loose({ servicesHeadline: `${W1} ${W2}` }), hub, {}).servicesHeadline, SERVICES_HEADLINE_OPTIONS[0]);
  assert.equal(withSystemFields(loose({ servicesHeadline: SERVICES_HEADLINE_OPTIONS[1] }), hub, {}).servicesHeadline, SERVICES_HEADLINE_OPTIONS[1]);
  assert.equal(withSystemFields(loose({ servicesHeadline: 'Legacy' }), { ...hub, site: undefined }, {}).servicesHeadline, 'Legacy', 'legacy briefs keep the model value');
  // Generation: an off-set headline never costs a repair call; the page ships the first entry.
  let repairs = 0;
  const result = await generateResearchPageCopy(hub, { businessNiche: 'plumber', guarantee: 'x' }, {
    callJson: async (system, user) => {
      if (/repairing specific fields/.test(system)) repairs++;
      return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : { ...base, servicesHeadline: `${W1} ${W2}` });
    },
  });
  assert.equal(result.servicesHeadline, SERVICES_HEADLINE_OPTIONS[0]);
  assert.equal(repairs, 0);
});

test('M2b.1d 5: trust bar: filler phrases fail (exempt when verbatim in the owner facts), more than 3 items fail, an item over 24 code points fails; city_prefix stays', () => {
  const filler = TRUST_BAR_FILLER_PHRASES[0];
  const gates = vctx();
  assert.deepEqual(rulesOf(loose({ trustBarItems: [W1, `${filler} ${W2}`] }), gates, GATE_RULES.trustBarFiller), ['trustBarItems[1]=trust_filler:0']);
  assert.deepEqual(rulesOf(loose({ heroSubheadline: `${filler} ${W2}` }), gates, GATE_RULES.trustBarFiller), [], 'trustBarItems only');
  // Adam (M2b.1d): mirrors the section 18 solo_operator exemption.
  assert.deepEqual(rulesOf(loose({ trustBarItems: [W1, `${filler} ${W2}`] }), vctx({}, { usp: `${W1} ${filler}` }), GATE_RULES.trustBarFiller), [], 'owner stated it verbatim');
  assert.deepEqual(rulesOf(loose({ trustBarItems: [W1, W2, HE_WORD, W1] }), gates, GATE_RULES.trustBarSize), ['trustBarItems[3]=trust_items:4']);
  assert.deepEqual(rulesOf(loose({ trustBarItems: [W1, W2, HE_WORD] }), gates, GATE_RULES.trustBarSize), []);
  const at = (n: number) => '\u05D0'.repeat(n - 1) + ' ';
  assert.equal(codePointLength(at(TRUST_BAR_MAX_CHARS)), 24);
  assert.deepEqual(rulesOf(loose({ trustBarItems: [at(TRUST_BAR_MAX_CHARS)] }), gates, GATE_RULES.trustBarSize), []);
  assert.deepEqual(rulesOf(loose({ trustBarItems: [at(TRUST_BAR_MAX_CHARS + 1)] }), gates, GATE_RULES.trustBarSize), ['trustBarItems[0]=trust_chars:25']);
  // city_prefix still gates the trust bar (bet on the first place only).
  const places = [W1, W2];
  assert.deepEqual(rulesOf(loose({ trustBarItems: [`${BET}${W1} \u05D5${W2}`] }), vctx({ places }), GATE_RULES.cityPrefix), ['trustBarItems[0]=undefined']);
  // Hard gate now: a trust-bar voice hit fails a money page.
  const money = briefGateContext(brief('leak-detection'), {});
  assert.deepEqual(blockingGateHits(runCopyGates(loose({ trustBarItems: [W1, `${filler} ${W2}`, W2] }), money), money).map(hit => hit.rule), [GATE_RULES.trustBarFiller]);
  // Last-resort safe fixes (M2b.1e: the validator shares the 3-item cap, so the list trim does it): the items past the cap
  // are dropped; then one bad item of the three is dropped too (min kept 2).
  const trimmed = applySafeDeterministicFixes(loose({ trustBarItems: [W1, W2, HE_WORD, LABEL] }), money);
  assert.deepEqual(trimmed.value.trustBarItems, [W1, W2, HE_WORD]);
  assert.deepEqual(trimmed.fixes, ['trim_items:trustBarItems:4->3']);
  const dropped = applySafeDeterministicFixes(loose({ trustBarItems: [W1, `${filler} ${W2}`, W2, HE_WORD] }), money);
  assert.deepEqual(dropped.value.trustBarItems, [W1, W2]);
  assert.deepEqual(dropped.fixes, ['trim_items:trustBarItems:4->3', 'drop_gated_item:trustBarItems:3->2']);
});

test('M2b.1d 6: home/hub-only fields: money pages never generate, gate or send to Noa the about pair, the service cards or the services headline; the system fills them; the validators accept that', async () => {
  const money = brief('leak-detection');
  const hub = brief('services', 'service_hub');
  const home = brief('leak-detection', 'homepage');
  assert.deepEqual([...ungeneratedFieldsFor(money)], [...RESEARCHED_HOME_HUB_ONLY_FIELDS]);
  assert.deepEqual([...ungeneratedFieldsFor(hub)], []);
  assert.deepEqual([...ungeneratedFieldsFor(home)], []);
  assert.deepEqual([...ungeneratedFieldsFor({ ...money, site: undefined })], [], 'legacy');
  const moneyPrompt = buildResearchPageGenerationPrompt(money, { businessNiche: 'plumber' });
  const hubPrompt = buildResearchPageGenerationPrompt(hub, { businessNiche: 'plumber' });
  for (const key of RESEARCHED_HOME_HUB_ONLY_FIELDS) {
    assert.ok(!moneyPrompt.includes(`"${key}"`), `money schema: ${key}`);
    assert.ok(!new RegExp(`^  - ${key}:`, 'm').test(moneyPrompt), `money hard limits: ${key}`);
    assert.ok(hubPrompt.includes(`"${key}"`), `hub schema: ${key}`);
  }
  assert.ok(!/Output exactly these keys and no others: [^\n]*aboutPageBody/.test(moneyPrompt));
  assert.ok(moneyPrompt.length < hubPrompt.length);
  // Prompt rules: B2 on every page, B1-B6 on home / hub; the lists they name. M2b.1g: with the section 23.3 cuts (C2 replaces
  // the B5 option list, C1 the B6 example), so the full B5 / B6 never reach a prompt.
  // M2b.1h: the hub is a pitch-first page, so its B1 / B6 carry the asserted promise-restatement edits.
  for (const rule of M2B_PROMPT_RULES_AFTER_M2B2) {
    assert.ok(hubPrompt.includes(pitchFirstRuleText(rule)), `hub ${rule.id}`);
    assert.equal(moneyPrompt.includes(rule.text), M2B_EVERY_PAGE_RULE_IDS.includes(rule.id), `money ${rule.id}`);
  }
  for (const rule of M2B_PROMPT_RULES.filter(item => ['B5', 'B6'].includes(item.id))) assert.ok(!hubPrompt.includes(rule.text), `hub full ${rule.id}`);
  assert.ok(moneyPrompt.includes(`trustBarFillerPhrases: ${JSON.stringify(TRUST_BAR_FILLER_PHRASES)}`));
  assert.ok(hubPrompt.includes(`servicesHeadlineOptions: ${JSON.stringify(SERVICES_HEADLINE_OPTIONS)}`));
  assert.ok(!moneyPrompt.includes(`servicesHeadlineOptions: ${JSON.stringify(SERVICES_HEADLINE_OPTIONS)}`));
  // System fill and the validator.
  const filled = withSystemFields(loose({ aboutPageHeadline: W1, aboutPageBody: W2, serviceDetails: [{ name: LABEL, description: W1 }], servicesHeadline: W1 }), money, {});
  assert.equal(filled.aboutPageHeadline, '');
  assert.equal(filled.aboutPageBody, '');
  assert.deepEqual(filled.serviceDetails, []);
  assert.equal(filled.servicesHeadline, SERVICES_HEADLINE_OPTIONS[0]);
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy(filled, shapeOptions(money)));
  assert.throws(() => assertBoundedGeneratedSiteCopy(withSystemFields(loose({ aboutPageHeadline: '' }), hub, {}), shapeOptions(hub)), 'the hub still needs its about headline');
  // Noa never sees them.
  const noa = buildNoaQaMessage(filled as unknown as SiteCopy, money);
  for (const key of RESEARCHED_HOME_HUB_ONLY_FIELDS) assert.ok(!noa.includes(`"${key}"`), `noa: ${key}`);
  // No gate (and no warning) runs on them on a money page.
  const tile = SIGNATURE_WORD_TOKENS.tiles[0];
  const gates = briefGateContext(money, {});
  const hits = runCopyGates(loose({ aboutPageBody: `${tile} ${tile} ${tile}`, aboutPageHeadline: tile, serviceDetails: [{ name: W1, description: 'x' }], servicesHeadline: W1 }), gates);
  assert.deepEqual(hits.filter(hit => RESEARCHED_HOME_HUB_ONLY_FIELDS.includes(hit.field.split(/[.[]/)[0])), []);
  // End to end: the model omits the keys on a money page; the page settles with no repair call.
  let repairs = 0;
  const systems: string[] = [];
  const { aboutPageHeadline: _h, aboutPageBody: _b, serviceDetails: _d, servicesHeadline: _s, ...withoutHomeOnly } = base;
  void _h; void _b; void _d; void _s;
  const result = await generateResearchPageCopy(money, { businessNiche: 'plumber', guarantee: 'x' }, {
    callJson: async (system, user) => {
      systems.push(user);
      if (/repairing specific fields/.test(system)) repairs++;
      return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : withoutHomeOnly);
    },
  });
  assert.equal(repairs, 0);
  assert.equal(result.aboutPageHeadline, '');
  assert.deepEqual(result.serviceDetails, []);
  assert.equal(result.servicesHeadline, SERVICES_HEADLINE_OPTIONS[0]);
  // The saved-record validator: a money page may have the empty pair, the homepage may not.
  const page = (classification: string, copy: SiteCopy): ResearchedSitePage => ({
    opportunityId: classification === 'homepage' ? 'home' : 'svc', classification: classification as ResearchedSitePage['classification'],
    targetPath: classification === 'homepage' ? '/' : '/services/x', brief: { faqPolicy: 'none', faqCandidates: [] }, copy,
  });
  const edges = [{ fromId: 'home', toId: 'svc', relationship: 'service_child' as const, anchorText: 'x' }] as unknown as Parameters<typeof assertResearchedSiteGraphSafe>[1];
  assert.doesNotThrow(() => assertResearchedSiteGraphSafe([page('homepage', base), page('money_service', result)], edges));
  assert.throws(() => assertResearchedSiteGraphSafe([page('homepage', result), page('money_service', base)], edges));
});

test('M2b.1d 7: duplicate about checks compare homepage / hub pages only; the opener warning is deleted; the opening check stays a warning', () => {
  const pages = [
    { classification: 'homepage', copy: { ...base, heroHeadline: W1, aboutPageHeadline: W1, aboutPageBody: W1 } },
    { classification: 'money_service', copy: { ...base, heroHeadline: W2, aboutPageHeadline: W2, aboutPageBody: W2 } },
    { classification: 'service_hub', copy: { ...base, heroHeadline: HE_WORD, aboutPageHeadline: HE_WORD, aboutPageBody: HE_WORD } },
  ];
  assert.deepEqual(siteGenerationContext(pages), { priorHeroHeadlines: [W1, W2, HE_WORD], priorAboutPageHeadlines: [W1, HE_WORD], priorAboutPageBodies: [W1, HE_WORD], priorHeroSubheadlines: [base.heroSubheadline, base.heroSubheadline, base.heroSubheadline], priorHeroFacts: [], siteTerms: base.trustBarItems });
  assert.ok(!('serviceDetailsOpener' in GATE_RULES));
  // M2b.1g: section 23 cardPhraseEcho is warn-only for the rescore.
  // 2026-11-10: Noa's pattern A beyond the about pair is warn-only too.
  assert.deepEqual([...WARNING_ONLY_RULES], [GATE_RULES.duplicateAboutOpening, GATE_RULES.cardPhraseEcho, GATE_RULES.subjectPronoun]);
});

test('M2b.1d 8 (M2b.1f): all five M2b fields block by default; an injected warn-only list still holds a field back; never gated where not rendered', () => {
  // M2b.1h: the new story section is warn-only until a paid eval proves it (the five M2b fields still block).
  // Content depth (2026-11-10) appends the service-page block fields, warn-only like the story.
  assert.deepEqual([...RESEARCHED_RENDERED_WARN_ONLY_FIELDS], ['storyHeadline', 'storyBody', ...DEPTH_BLOCK_KEYS]);
  const five = ['trustBarItems', 'servicesHeadline', 'serviceDetails', 'aboutPageHeadline', 'aboutPageBody'];
  for (const pageClass of ['homepage', 'service_hub']) for (const field of five) assert.ok(researchedGatedFieldsFor(pageClass).includes(field), `${pageClass}: ${field}`);
  assert.ok(!researchedGatedFieldsFor('money_service').includes('aboutPageBody'), 'still never where not rendered');
  const held = researchedGatedFieldsFor('homepage', ['aboutPageHeadline', 'aboutPageBody', 'serviceDetails']);
  for (const field of ['aboutPageHeadline', 'aboutPageBody', 'serviceDetails']) assert.ok(!held.includes(field), field);
  for (const field of ['trustBarItems', 'servicesHeadline']) assert.ok(held.includes(field), field);
  const tile = SIGNATURE_WORD_TOKENS.tiles[0];
  const hub = briefGateContext(brief('services', 'service_hub'), {});
  const copy = loose({ aboutPageHeadline: `${W1} ${tile}` });
  assert.deepEqual(blockingGateHits(runCopyGates(copy, hub), hub).map(hit => hit.rule), [GATE_RULES.aboutHeadlinePromise]);
  const heldHub = { ...hub, renderedFields: researchedGatedFieldsFor('service_hub', ['aboutPageHeadline']) };
  assert.deepEqual(blockingGateHits(runCopyGates(copy, heldHub), heldHub).map(hit => hit.rule), []);
  assert.deepEqual(warningGateHits(runCopyGates(copy, heldHub), heldHub).filter(hit => hit.field === 'aboutPageHeadline').map(hit => hit.rule), [GATE_RULES.aboutHeadlinePromise]);
});

test('M2b.1d 9 (B7): a response-time noun phrase in the trust bar of an emergency page trips no fix-time, same-day, install-arrival or trust-bar gate, nor the arrival-on-installation review flag', () => {
  // Composed from the real token lists: the arrival noun (ARRIVAL_TOKENS[3]), a lead token, a time word / a digit; and the
  // same-day noun phrase the M2a.7 eval wrote on ac-repair-1 (arrival noun + bet + SAME_DAY_TOKENS[0]).
  const arrivalNoun = ARRIVAL_TOKENS[3];
  const items = [
    `${arrivalNoun} ${FIX_TIME_LEAD_TOKENS[0]} ${FIX_TIME_WITHIN_WORDS[0]}`,
    `${arrivalNoun} ${FIX_TIME_LEAD_TOKENS[0]} 20 ${FIX_TIME_WITHIN_WORDS[4]}`,
    `${arrivalNoun} ${BET}${SAME_DAY_TOKENS[0]}`,
  ];
  for (const item of items) assert.ok(codePointLength(item) <= TRUST_BAR_MAX_CHARS, item.length.toString());
  const install = SERVICE_LABEL_PINS['water heater install'];
  const leak = SERVICE_LABEL_PINS['leak detection'];
  const labels = [leak, install];
  const data = { responseTime: 'Same day, within an hour', businessNiche: 'plumber' };
  const ctx = copyGateContext(data, labels, true, [], {
    serviceSources: ['leak detection', 'water heater install'], pageServiceLabel: leak, installPage: false, researchSite: true, pageSlug: 'leak-detection',
  });
  for (const item of items) {
    const copy = loose({ heroHeadline: leak, trustBarItems: [item], serviceItems: labels });
    const hits = runCopyGates(copy, ctx);
    const bad = hits.filter(hit => hit.field === 'trustBarItems[0]');
    assert.deepEqual(bad.map(hit => `${hit.rule}:${hit.actual ?? ''}`), [], item);
    assert.deepEqual(copyReviewFlags(copy, ctx), [], `review flag: ${item}`);
  }
  // The same items on the installation page itself are the existing hard gate (no arrival time there), as intended.
  const installCtx = copyGateContext(data, labels, true, [], { serviceSources: ['leak detection', 'water heater install'], pageServiceLabel: install, installPage: true, researchSite: true, pageSlug: 'water-heater-install' });
  assert.ok(runCopyGates(loose({ heroHeadline: install, trustBarItems: [items[0]] }), installCtx).some(hit => hit.rule === GATE_RULES.installArrival));
});

// ---------------------------------------------------------------------------
// M2b.1e (Adam): the trust bar 3 x 24 shared limit, min kept 2, the owner-contact guard; Noa's legal-page fixes.
// ---------------------------------------------------------------------------

test('M2b.1e 1: the validator and the gate share one trust-bar limit (3 items, 24 per item); a filler item in a 3-item bar is dropped (min kept 2)', () => {
  assert.deepEqual({ ...SITE_COPY_STRING_LIST_LIMITS.trustBarItems }, { maxItems: TRUST_BAR_MAX_ITEMS, itemMaxChars: TRUST_BAR_MAX_CHARS });
  assert.deepEqual([TRUST_BAR_MAX_ITEMS, TRUST_BAR_MAX_CHARS, TRUST_BAR_MIN_KEPT], [3, 24, 2]);
  const at = (n: number) => '\u05D0'.repeat(n);
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy(loose({ trustBarItems: [at(24), at(21), at(21)] })));
  assert.throws(() => assertBoundedGeneratedSiteCopy(loose({ trustBarItems: [at(25)] })));
  assert.throws(() => assertBoundedGeneratedSiteCopy(loose({ trustBarItems: [W1, W2, HE_WORD, LABEL] })));
  const money = briefGateContext(brief('leak-detection'), {});
  const filler = `${TRUST_BAR_FILLER_PHRASES[0]} ${W2}`;
  const fixed = applySafeDeterministicFixes(loose({ trustBarItems: [W1, filler, W2] }), money);
  assert.deepEqual(fixed.value.trustBarItems, [W1, W2]);
  assert.deepEqual(fixed.fixes, ['drop_gated_item:trustBarItems:3->2']);
  assert.deepEqual(blockingGateHits(runCopyGates(fixed.value, money), money), [], 'the page passes');
});

test('M2b.1e 2: generation fails early with a clear error when the owner has neither a phone nor an email', async () => {
  assert.equal(ownerContactMissing({}), true);
  assert.equal(ownerContactMissing({ phone: '   ', email: '' }), true, 'whitespace is not a contact');
  assert.equal(ownerContactMissing({ phone: '050-0000000' }), false);
  assert.equal(ownerContactMissing({ email: 'owner@example.com' }), false);
  assert.equal(ownerContactMissing(null), true);
  let copyCalls = 0;
  await assert.rejects(() => buildResearchedSiteGeneration({ slug: 'x', researchId: 'r', collectedData: { businessNiche: 'plumber' } } as unknown as Parameters<typeof buildResearchedSiteGeneration>[0], {
    generateCopy: async () => { copyCalls++; throw new Error('never'); }, renderInputs: {} as never,
  }), (error: Error) => error.message === OWNER_CONTACT_MISSING_MESSAGE);
  assert.equal(copyCalls, 0, 'before any model call');
  // The orchestrator stops at the input step, before research or the identity call.
  let research = 0;
  const outcome = await runResearchToSite({ slug: 'test-site', researchId: 'research-1', collectedData: { businessNiche: 'plumber', phone: ' ' } }, {
    runResearch: async () => { research++; throw new Error('never'); },
    callJson: async () => { research++; return '{}'; },
  });
  assert.deepEqual(outcome, { status: 'failed', researchId: 'research-1', step: 'input', reason: OWNER_CONTACT_MISSING });
  assert.equal(research, 0);
});

test('M2b.1e 3 (Noa): the legal prefix takes a hyphen only before a Latin letter or a digit, on every page; a whitespace phone is no phone', () => {
  assert.equal(prefixJoiner(HE_WORD), '');
  assert.equal(prefixJoiner('Test Owner A'), '-');
  assert.equal(prefixJoiner(' 9 Stars'), '-');
  const theme = Object.values(VERTICAL_THEMES)[0];
  const html = (data: Record<string, unknown>, researched: boolean) => [buildPrivacyHtml, buildAccessibilityHtml].map(build => build({ theme, data, canonicalUrl: 'https://x/p.html', homeHref: '/', ...(researched ? { pipeTitle: true, prefixRule: true } : {}) }));
  for (const researched of [false, true]) {
    for (const page of html({ ownerName: HE_WORD, phone: '050-0000000' }, researched)) assert.ok(page.includes(`\u05DC${HE_WORD}`) && !page.includes(`-${HE_WORD}`), `hebrew, researched=${researched}`);
    for (const page of html({ ownerName: 'Test Owner A', phone: '050-0000000' }, researched)) assert.ok(page.includes('\u05DC-Test Owner A'), `latin, researched=${researched}`);
  }
  // contactLine trims: a whitespace-only phone is omitted and the email leads; a padded phone is trimmed.
  const [privacy] = html({ ownerName: 'Test Owner A', phone: '   ', email: ' owner@example.com ' }, true);
  const last = [...privacy.matchAll(/<p>(.*?)<\/p>/g)].map(match => match[1]).pop()!;
  assert.ok(!/\d/.test(last.slice(last.indexOf('Test Owner A'))), 'no phone clause');
  assert.ok(last.includes(' owner@example.com.') && !last.includes('  '), 'email trimmed');
  const [padded] = html({ ownerName: 'Test Owner A', phone: ' 050-0000000 ' }, true);
  assert.ok(padded.includes(' 050-0000000.') && !padded.includes('  050'), 'phone trimmed');
});
