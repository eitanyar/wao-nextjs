// Paid-journey v2 M2a.1 (A1-A5): deterministic copy gates.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew test strings are built from
// the byte-exact config tokens (copyGates.config.ts) plus escaped prefix letters.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CLAIM_RULES, PLURAL_ADDRESS_TOKENS, WAO_SERVICE_TERMS_HE, WE_FORM_TOKENS } from './copyGates.config';
import { CLAIM_TOKENS, STICKY_ACTION_TOKENS, STICKY_PROBLEM_WORDS } from './generationData';
import { copyGateContext, GATE_RULES, longestCommonSubstring, runCopyGates, tokenPattern, type CopyGateContext } from './copyGates';
import {
  applySafeDeterministicFixes,
  buildResearchPageGenerationPrompt,
  generateResearchPageCopy,
  SINGULAR_ADDRESS_RULE,
  TYPOGRAPHY_RULE,
  type CopyRepairEvent,
} from './researchPageCopy';
import type { SiteCopy } from './lpCopyPrompt';
import { primaryCtaLabel } from './lpCopyPrompt';
import type { PageBrief } from '../site-bot/research/pageBrief';

const VAV = '\u05D5';
const BET = '\u05D1';
// Synthetic Hebrew-script letter sequences (test data, not copy; no gate token).
const HE_WORD = '\u05D0\u05D1\u05D2\u05D3';
const LABEL_A = '\u05D2\u05D3\u05D4 \u05D6\u05D7\u05D8';
const LABEL_B = '\u05D8\u05D9\u05DA \u05E1\u05E2';

/** M2a.5: a sticky-bar line that carries a section 19.4 action token (gate_sticky_action). */
// M2a.6: it also names a section 20.4 problem word (gate_sticky_naming).
const STICKY_LINE = `${STICKY_ACTION_TOKENS[0]} ${STICKY_PROBLEM_WORDS.general[0]}`;
const ctx = (overrides: Partial<CopyGateContext> = {}): CopyGateContext => ({
  soloOperator: true, serviceLabels: [], ownerFactsText: '', ownerFields: {}, reviewQuote: null, starRating: null, ...overrides,
});

const base: SiteCopy = {
  // M2a.6: the hero carries the research brief's search anchor (gate_hero_anchor).
  heroHeadline: LABEL_A, heroSubheadline: 'Sub', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: ['Alpha'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Promise',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form',
  stickyBarLine: STICKY_LINE, aboutPageHeadline: 'About page', aboutPageBody: 'About body',
  serviceDetails: [{ name: 'Alpha', description: 'Detail' }],
};
const loose = (copy: Partial<SiteCopy>) => ({ ...base, ...copy }) as unknown as Record<string, unknown>;
/** M2a.4: a serviceDetails description at the research-site minimum length (gate_short_description). */
const DESC = 'A complete description of the service.';

test('A1 plural address: every configured token is caught in a gated field, with and without allowed prefixes', () => {
  PLURAL_ADDRESS_TOKENS.forEach((entry, index) => {
    const hits = runCopyGates(loose({ formHeadline: `${HE_WORD} ${entry.token} ${HE_WORD}` }), ctx());
    assert.ok(hits.length >= 1 && hits.every(hit => hit.field === 'formHeadline' && hit.rule === GATE_RULES.plural), entry.token);
    assert.ok(hits.some(hit => hit.actual === `plural:${index}`), entry.token);
    const prefixed = runCopyGates(loose({ formHeadline: `${VAV}${entry.token}` }), ctx());
    assert.equal(prefixed.some(hit => hit.actual === `plural:${index}`), Boolean(entry.allowPrefix), `prefixed ${entry.token}`);
    // M2a.4 (Noa section 10 prefix note): a vav-only token never matches after shin.
    if (entry.allowPrefix === 'vav') assert.equal(runCopyGates(loose({ formHeadline: `\u05E9${entry.token}` }), ctx()).some(hit => hit.actual === `plural:${index}`), false, `shin ${entry.token}`);
  });
  // Embedded inside a longer word is not a hit (no Hebrew letter may follow the token).
  for (const entry of PLURAL_ADDRESS_TOKENS) assert.equal(tokenPattern(entry).test(`${entry.token}${BET}`), false, entry.token);
  // Nested fields are gated too.
  const nested = runCopyGates(loose({ serviceDetails: [{ name: 'Alpha', description: PLURAL_ADDRESS_TOKENS[5].token }] }), ctx());
  assert.deepEqual(nested.map(hit => hit.field), ['serviceDetails[0].description']);
});

test('A1 we-forms are rejected on solo-operator sites only; system fields are exempt', () => {
  const copy = loose({ servicesHeadline: `${HE_WORD} ${WE_FORM_TOKENS[0].token}`, aboutBlurb: WE_FORM_TOKENS[1].token });
  // M2a.3: Noa's data we-forms overlap the M2a.1 ones (a prefixed form of one is another), so compare distinct field/rule pairs.
  assert.deepEqual([...new Set(runCopyGates(copy, ctx()).map(hit => `${hit.field}|${hit.rule}`))], [
    `aboutBlurb|${GATE_RULES.we}`, `servicesHeadline|${GATE_RULES.we}`,
  ]);
  assert.deepEqual(runCopyGates(copy, ctx({ soloOperator: false })), []);
  // heroCta / serviceItems / reviewFeatured / faqItems are system-filled: never gated as text.
  assert.deepEqual(runCopyGates(loose({ heroCta: PLURAL_ADDRESS_TOKENS[0].token, reviewFeatured: PLURAL_ADDRESS_TOKENS[0].token }), ctx()), []);
});

test('A2 ASCII quote marks inside Hebrew strings are flagged; Latin-only strings are not', () => {
  assert.deepEqual(runCopyGates(loose({ trustBarItems: [`${HE_WORD}' 4821`], guaranteeBlock: `"${HE_WORD}"` }), ctx()).map(hit => [hit.field, hit.rule]), [
    ['trustBarItems[0]', GATE_RULES.asciiQuote], ['guaranteeBlock', GATE_RULES.asciiQuote],
  ]);
  assert.deepEqual(runCopyGates(loose({ guaranteeBlock: 'It\'s "fine"' }), ctx()), []);
  assert.deepEqual(runCopyGates(loose({ guaranteeBlock: `${HE_WORD}\u05F3 ${HE_WORD}\u05F4` }), ctx()), []);
});

test('A3 unconfirmed services: every serviceItems / serviceDetails name must be owner-confirmed', () => {
  const gates = ctx({ serviceLabels: [LABEL_A, LABEL_B] });
  assert.deepEqual(runCopyGates(loose({ serviceItems: [LABEL_A, LABEL_B], serviceDetails: [{ name: LABEL_A, description: 'd' }] }), gates), []);
  assert.deepEqual(runCopyGates(loose({ serviceItems: [LABEL_A, HE_WORD], serviceDetails: [{ name: `${LABEL_A} ${HE_WORD}`, description: 'd' }] }), gates)
    .map(hit => [hit.field, hit.rule]), [['serviceItems[1]', GATE_RULES.unconfirmedService], ['serviceDetails[0].name', GATE_RULES.unconfirmedService]]);
  // The safe fix drops whole unconfirmed entries; it never edits a name.
  const fixed = applySafeDeterministicFixes(loose({ serviceDetails: [{ name: LABEL_A, description: 'd' }, { name: HE_WORD, description: 'e' }] }), gates);
  assert.deepEqual(fixed.value.serviceDetails, [{ name: LABEL_A, description: 'd' }]);
  assert.ok(fixed.fixes.includes('drop_unconfirmed:serviceDetails:2->1'));
});

test('A3 claims (warranty, thermal) are rejected unless the owner facts carry them; the list is configurable', () => {
  const warranty = CLAIM_RULES.find(rule => rule.id === 'warranty')!.tokens[0];
  const thermal = CLAIM_RULES.find(rule => rule.id === 'thermal')!.tokens[0];
  const copy = loose({ guaranteeBlock: `${warranty} ${HE_WORD}`, aboutBlurb: `${HE_WORD} ${thermal}` });
  assert.deepEqual(runCopyGates(copy, ctx()).map(hit => hit.actual).sort(), ['claim:thermal', 'claim:warranty']);
  assert.deepEqual(runCopyGates(copy, ctx({ ownerFields: { guarantee: 'Two-year warranty' } })).map(hit => hit.actual), ['claim:thermal']);
  assert.deepEqual(runCopyGates(copy, ctx({ ownerFactsText: 'usp: thermal camera and a warranty' })), []);
  assert.deepEqual(runCopyGates(copy, ctx({ ownerFactsText: `${warranty} ${thermal}` })), []);
  // M2a.2: address / walk-in (and the other Noa kinds) carry Noa's data-file tokens.
  for (const id of ['street_address', 'walk_in']) assert.deepEqual(CLAIM_RULES.find(rule => rule.id === id)?.tokens, CLAIM_TOKENS[id]);
});

test('A4 WAO-offer terms (Hebrew eval leak and Latin brand terms) are rejected, and the client prompt no longer carries the offer', () => {
  const hits = runCopyGates(loose({ serviceDetails: [{ name: WAO_SERVICE_TERMS_HE[0], description: 'd' }], aboutBlurb: 'Built by WAO' }), ctx());
  // M2a.3: Noa's data terms are substrings of some M2a.1 terms, so compare distinct field/rule pairs.
  assert.deepEqual([...new Set(hits.map(hit => `${hit.field}|${hit.rule}`))], [`aboutBlurb|${GATE_RULES.waoOffer}`, `serviceDetails[0].name|${GATE_RULES.waoOffer}`]);
  const brief = briefWithSite();
  const prompt = buildResearchPageGenerationPrompt(brief, { businessNiche: 'plumber', usp: 'Same-day leaks' });
  assert.doesNotMatch(prompt, /"offer":/);
  assert.doesNotMatch(prompt, /WAO's Sabra/);
  assert.doesNotMatch(prompt, /Managed WAO offer/);
});

test('A5 the customer quote may appear only in reviewFeatured: long overlaps elsewhere are flagged', () => {
  const quote = 'Came within an hour, found the hidden leak and left the bathroom clean';
  const gates = ctx({ reviewQuote: quote, starRating: '5' });
  assert.deepEqual(runCopyGates(loose({ reviewFeatured: quote }), gates), []);
  assert.deepEqual(runCopyGates(loose({ aboutPageBody: `As one customer said: found the hidden leak and left the bathroom clean.` }), gates)
    .map(hit => [hit.field, hit.rule]), [['aboutPageBody', GATE_RULES.quoteOverlap]]);
  assert.deepEqual(runCopyGates(loose({ aboutPageBody: 'I find hidden leaks.' }), gates), []);
  assert.equal(longestCommonSubstring('abc  def', 'xx abc def yy'), 7);
  // A review context needs an owner star rating.
  assert.deepEqual(runCopyGates(loose({ reviewFeatured: quote, reviewContext: '5 stars' }), ctx({ reviewQuote: quote })).map(hit => hit.rule), [GATE_RULES.reviewContext]);
});

test('copyGateContext reads owner facts, quote and star rating from the owner data', () => {
  const gates = copyGateContext({ guarantee: 'Two years', reviewQuote: ` ${HE_WORD} `, starRating: '' }, [LABEL_A]);
  assert.equal(gates.reviewQuote, HE_WORD);
  // M2a.2: a quote that is not mostly Hebrew is never shown (and never authorises a claim).
  assert.equal(copyGateContext({ reviewQuote: 'Great' }, []).reviewQuote, null);
  assert.ok(!copyGateContext({ reviewQuote: 'warranty' }, []).ownerFactsText.includes('warranty'));
  assert.equal(gates.starRating, null);
  assert.ok(gates.ownerFactsText.includes('Two years'));
  assert.deepEqual(gates.serviceLabels, [LABEL_A]);
});

function briefWithSite(): PageBrief {
  return {
    page: { id: 'svc-alpha', targetPath: '/services/alpha', pageClass: 'money_service' },
    persona: { id: 'persona', value: 'Local customer' },
    waoOffer: { id: 'offer', value: 'Managed WAO offer' },
    targetQueries: [], approvedEntityAnchors: [{ id: 'entity-1', value: 'alpha' }], firstPartyProof: [],
    assertableLocalFacts: [], customerDecisions: [], constraints: [], links: [], informationGainGaps: [], prohibitedClaims: [],
    faqPolicy: 'none', faqCandidates: [],
    site: { pageName: LABEL_A, relevanceTerm: LABEL_A, city: null, serviceArea: [], serviceLabels: [LABEL_A, LABEL_B], businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: false },
  };
}

test('B prompts: singular rule in Tamar + Noa + repair system prompts, typography in Noa, hard rules exempt from "context only"', async () => {
  const systems: string[] = [];
  const users: string[] = [];
  const brief = briefWithSite();
  await generateResearchPageCopy(brief, { businessNiche: 'plumber' }, {
    callJson: async (system, user) => {
      systems.push(system); users.push(user);
      return JSON.stringify({ ...base, serviceDetails: [{ name: LABEL_A, description: DESC }] });
    },
  });
  assert.equal(systems.length, 2);
  for (const system of systems) assert.ok(system.includes(SINGULAR_ADDRESS_RULE));
  assert.ok(systems[1].includes(TYPOGRAPHY_RULE));
  for (const entry of [...PLURAL_ADDRESS_TOKENS, ...WE_FORM_TOKENS]) assert.ok(SINGULAR_ADDRESS_RULE.includes(entry.token), entry.token);
  assert.match(users[0], /HARD RULES, BANNED PHRASES, address and voice rules are NOT context/);
  assert.match(users[0], /each owner fact at most twice per page/);
  assert.match(users[0], /never by dropping a verb's object|Never shorten by dropping a verb's object/);
  assert.match(users[0], /never mirror an English idiom/);
  assert.match(users[0], /appears once per site and the homepage already has it/);
  assert.match(users[0], /never translate or map it to a license grade/);
  assert.match(users[1], /SYSTEM FIELDS \(never change them\)/);
});

test('B system fields: heroCta is the fixed singular label, serviceItems are the confirmed names, the quote is verbatim without context', async () => {
  const data = { businessNiche: 'plumber', reviewQuote: `${HE_WORD} ${LABEL_B}` };
  const copy = await generateResearchPageCopy(briefWithSite(), data, {
    callJson: async () => JSON.stringify({ ...base, heroCta: 'model cta', serviceItems: ['made up'], reviewFeatured: 'paraphrased', serviceDetails: [{ name: LABEL_B, description: DESC }] }),
  });
  assert.equal(copy.heroCta, primaryCtaLabel(data));
  assert.deepEqual(copy.serviceItems, [LABEL_A, LABEL_B]);
  assert.equal(copy.reviewFeatured, `${HE_WORD} ${LABEL_B}`);
  assert.equal(copy.reviewContext, null);
});

test('gate hit -> repair loop -> clean page; still failing after the budget -> the page fails (never auto-edited)', async () => {
  const plural = PLURAL_ADDRESS_TOKENS[0].token;
  const events: CopyRepairEvent[] = [];
  let calls = 0;
  const repaired = await generateResearchPageCopy(briefWithSite(), { businessNiche: 'plumber' }, {
    onEvent: event => events.push(event),
    callJson: async (system, user) => {
      calls++;
      if (/repairing specific fields/.test(system)) {
        assert.match(user, /plural \/ second-person-plural address/);
        return JSON.stringify({ formHeadline: 'Fixed form' });
      }
      return JSON.stringify({ ...base, formHeadline: `${HE_WORD} ${plural}`, serviceDetails: [{ name: LABEL_A, description: DESC }] });
    },
  });
  assert.equal(repaired.formHeadline, 'Fixed form');
  assert.ok(events.some(event => event.kind === 'violations' && event.violations?.some(v => v.rule === GATE_RULES.plural)));
  assert.ok(calls >= 3);
  // Violations never carry copy text: only field, rule and config id.
  assert.doesNotMatch(JSON.stringify(events.filter(event => event.kind === 'violations')), new RegExp(HE_WORD));

  await assert.rejects(generateResearchPageCopy(briefWithSite(), { businessNiche: 'plumber' }, {
    callJson: async system => (/repairing specific fields/.test(system)
      ? JSON.stringify({ formHeadline: `${plural}` })
      : JSON.stringify({ ...base, formHeadline: `${HE_WORD} ${plural}`, serviceDetails: [{ name: LABEL_A, description: DESC }] })),
  }), (error: Error & { violations?: Array<{ rule: string }> }) => {
    assert.ok(error.violations?.some(v => v.rule === GATE_RULES.plural));
    return true;
  });
});
