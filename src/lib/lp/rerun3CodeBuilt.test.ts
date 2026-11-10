// Rerun-3 item 6: code-built fixes. (b) proof items never repeat a trust-bar chip's fact; (c) the customers' proof heading never
// sits over code-built owner facts; (d) the review label is the rating chip's format on every page; (e) a dropped card
// description renders no empty element; (f) a spaced en-dash in a model field becomes the em-dash. (a) is in generatorFixes.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes (ASCII stand-in templates; synthetic letters are escapes).
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import type { SiteCopy } from './lpCopyPrompt';
import { FACT_PARSE_TOKEN_KEYS, FACT_RULE_TOKEN_KEYS, OWNER_FACT_TEMPLATES, setOwnerFactTemplatesForTests, type OwnerFactTemplates } from './ownerFactCopy';
import { assertBoundedGeneratedSiteCopy, emDashText, shapeOptions, ungeneratedFieldsFor, withSystemFields } from './researchPageCopy';
import { renderResearchedSitePages, type ResearchedSitePage } from './researchedSite';
import { RESEARCHED_SITE_LABELS } from './researchedSiteLabels';
import { VERTICAL_ASSETS } from './verticalAssets';
import { VERTICAL_THEMES } from './verticalThemes';

const T = {
  ...OWNER_FACT_TEMPLATES,
  trustYears: 'Y:{n}', trustWarranty: 'W:{duration}', trustRating: '{rating} * / {count}', trustRatingNoCount: '{rating} *', trustRatingOneReview: '{rating} * / 1',
  proofYears: 'I have {n} years.', proofWarranty: 'You get a warranty for {duration}.', proofResponse: 'I arrive within {time}.', proofCallback: 'I call back within {time}.',
  warrantyBareOneYear: '1yr', warrantyLamedOneYear: 'l1yr', responseMinutes: '{n}min',
  ...Object.fromEntries([...FACT_PARSE_TOKEN_KEYS, ...FACT_RULE_TOKEN_KEYS].map(key => [key, [`zz${key}`]])),
} as OwnerFactTemplates;
async function codeOwned<R>(fn: () => R | Promise<R>): Promise<R> {
  setOwnerFactTemplatesForTests(T);
  try { return await fn(); } finally { setOwnerFactTemplatesForTests(undefined); }
}

const QUOTE = '\u05D0\u05D1\u05D2 \u05D3\u05D4\u05D5 \u05D6\u05D7\u05D8';
const data: CollectedData = {
  businessName: 'TEST Biz', businessNiche: 'plumber', primaryService: 'leak repair', targetLocation: 'Holon', specificCities: 'Holon',
  yearsInField: '12', guarantee: '1 year warranty', responseTime: 'within 30 minutes', usp: 'I find the leak before I open anything',
  phone: '050-0000000', reviewQuote: QUOTE, starRating: '4.9', reviewCount: 37,
};

function brief(pageClass: 'homepage' | 'money_service'): PageBrief {
  const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
  const home = pageClass === 'homepage';
  return compilePageBrief({
    page: { id: home ? 'home' : 'svc-leak-repair', targetPath: home ? '/' : '/services/leak-repair', pageClass },
    persona: approved('persona', 'A local customer in Holon'), waoOffer: approved('offer', 'TEST Biz'),
    targetQueries: [approved('query-1', 'leak repair Holon')], entityAnchors: [approved('entity-1', 'leak repair')],
    firstPartyProof: [
      approved('proof-yearsInField', 'Years in the field (owner-stated): 12'),
      approved('proof-guarantee', 'Guarantee (owner-stated): 1 year warranty'),
      approved('proof-responseTime', 'Response time (owner-stated): within 30 minutes'),
    ],
    localFacts: [approved('local-area', 'Service area (owner-stated): Holon')],
    customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [],
    links: home ? [{ targetPath: '/services/leak-repair', relationship: 'service_child', evidenceIds: ['entity-1'] }] : [],
    site: { pageName: 'leak repair', relevanceTerm: 'leak repair', city: 'Holon', serviceArea: ['Holon'], serviceLabels: ['leak repair'], businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: home },
    ...(home ? {} : { depth: { wordTarget: 420, terms: [], questions: [], serviceFacts: [], filters: { latinAllowed: true } } }),
  } as PageBriefInput);
}

const modelCopy = (): Record<string, unknown> => ({
  heroHeadline: 'leak repair in Holon \u2013 same visit', heroSubheadline: 'I open \u2013 and I check', heroCta: 'Call', trustBarItems: ['Model'],
  aboutBlurb: 'About', servicesHeadline: 'Services', serviceItems: ['leak repair'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: null,
  reviewFeatured: QUOTE, reviewContext: '4.9', responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky',
  aboutPageHeadline: 'About page', aboutPageBody: 'About body.', serviceDetails: [{ name: 'leak \u2013 repair', description: 'I open \u2013 then I close.' }],
});

test('6b: a proof item whose fact a trust-bar chip shows is dropped; no item left -> no proof section', async () => {
  await codeOwned(() => {
    const page = brief('money_service');
    const settled = withSystemFields(modelCopy(), page, data);
    assert.deepEqual(settled.trustBarItems, ['Y:12', 'W:1yr', 'Holon']);
    assert.deepEqual(settled.proofItems, [{ text: 'I call back within 30min.', factIds: ['proof-responseTime'] }]);
    // Every proof fact on the trust bar (no response time): the proof block goes.
    const none = withSystemFields(modelCopy(), page, { ...data, responseTime: '' });
    assert.equal(none.proofItems, null);
  });
});

test('6d: the review label is the rating chip format on every page, never the model value; no quote or rating -> null', async () => {
  await codeOwned(() => {
    for (const pageClass of ['homepage', 'money_service'] as const) {
      const page = brief(pageClass);
      assert.ok(ungeneratedFieldsFor(page).includes('reviewContext'), 'not generated');
      const settled = withSystemFields(modelCopy(), page, data);
      assert.equal(settled.reviewContext, '4.9 * / 37', pageClass);
      assertBoundedGeneratedSiteCopy(settled, shapeOptions(page));
      assert.equal(withSystemFields(modelCopy(), page, { ...data, starRating: '' }).reviewContext, null);
      assert.equal(withSystemFields({ ...modelCopy(), reviewFeatured: null }, page, { ...data, reviewQuote: '' }).reviewContext, null);
    }
  });
});

test('6f: spaced en-dashes in model fields become em-dashes; card names, system fields and repeated words are untouched', async () => {
  assert.equal(emDashText('a \u2013 b'), 'a \u2014 b');
  assert.equal(emDashText('a\u2013b'), 'a\u2013b', 'an unspaced range stays');
  assert.equal(emDashText('\u05D0\u05D1 \u2013 \u05D0\u05D1'), '\u05D0\u05D1 \u2013 \u05D0\u05D1', 'a reduplication stays for its own gate');
  await codeOwned(() => {
    const settled = withSystemFields(modelCopy(), brief('homepage'), data);
    assert.equal(settled.heroHeadline, 'leak repair in Holon \u2014 same visit');
    assert.equal(settled.heroSubheadline, 'I open \u2014 and I check');
    const card = (settled.serviceDetails as Array<{ name: string; description: string }>)[0];
    assert.equal(card.name, 'leak \u2013 repair', 'card names are owner labels');
    assert.equal(card.description, 'I open \u2014 then I close.');
  });
});

function render(pages: ResearchedSitePage[]): Record<string, string> {
  return renderResearchedSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data,
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'rerun3-test', siteUrl: 'https://rerun3.wao.co.il', pages,
    graphEdges: pages.slice(1).map(item => ({ fromId: 'home', toId: item.opportunityId })),
  });
}
const pageCopy = (extra: Record<string, unknown>): SiteCopy => ({ ...(modelCopy() as unknown as SiteCopy), reviewContext: null, ...extra } as SiteCopy);

test('6c: with code-owned facts the proof section uses the approved facts heading, not the customers\' heading', async () => {
  const home: ResearchedSitePage = { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: pageCopy({}) };
  const money: ResearchedSitePage = { opportunityId: 'svc-leak-repair', classification: 'money_service', targetPath: '/services/leak-repair', copy: pageCopy({ proofHeadline: null, proofItems: [{ text: 'I call back within 30min.', factIds: ['proof-responseTime'] }] }) };
  const heading = (html: string) => /<h2 id="proof-heading"[^>]*>([^<]*)<\/h2>/.exec(html)?.[1];
  await codeOwned(() => assert.equal(heading(render([home, money])['services/leak-repair.html']), RESEARCHED_SITE_LABELS.proofHeadingFactsOnly));
  setOwnerFactTemplatesForTests(null);
  try { assert.equal(heading(render([home, money])['services/leak-repair.html']), RESEARCHED_SITE_LABELS.proofHeadingReviews, 'pending templates: unchanged'); }
  finally { setOwnerFactTemplatesForTests(undefined); }
});

test('6e: a card whose description was dropped renders its name with no empty element', () => {
  const home: ResearchedSitePage = { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: pageCopy({ serviceDetails: [{ name: 'leak repair', description: '' }, { name: 'boiler', description: 'I fit it.' }] }) };
  const html = render([home])['index.html'];
  const section = html.slice(html.indexOf('data-section="service-details"'), html.indexOf('</section>', html.indexOf('data-section="service-details"')));
  assert.ok(section.includes('>leak repair</h3></div>'), 'name only, card closes');
  assert.doesNotMatch(section, /<p[^>]*>\s*<\/p>/);
});
