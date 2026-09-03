import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchedSchemaGraph, buildResearchedSitemapUrls, buildStablePageSlug, renderResearchedSitePages, type RenderResearchedSitePagesParams, type ResearchedSitePage } from './researchedSite';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { SiteCopy } from './lpCopyPrompt';

const copy = (headline: string): SiteCopy => ({
  heroHeadline: headline,
  heroSubheadline: `${headline} description`,
  heroCta: 'Contact',
  trustBarItems: ['Licensed'],
  aboutBlurb: 'About',
  servicesHeadline: 'Services',
  serviceItems: ['Alpha'],
  faqHeadline: 'FAQ',
  faqItems: [{ q: 'Supported question?', a: 'Supported answer.' }, { q: 'Duplicate question?', a: 'Second answer.' }],
  guaranteeBlock: 'Guarantee', reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null,
  formHeadline: 'Contact us', stickyBarLine: 'Call', aboutPageHeadline: 'About', aboutPageBody: 'About body',
  serviceDetails: [{ name: 'Alpha', description: 'Alpha description.' }],
});

const page = (overrides: Partial<ResearchedSitePage> = {}): ResearchedSitePage => ({
  opportunityId: 'money-alpha',
  classification: 'money_service',
  targetPath: '/services/alpha-service',
  copy: copy('Alpha service'),
  brief: {
    faqPolicy: 'optional',
    faqCandidates: [{ id: 'faq-alpha', question: 'Supported question?', answer: 'Supported answer.', source: 'owner_faq', relevance: 1, answerEvidenceIds: ['proof'] }],
  },
  ...overrides,
});

function params(overrides: Partial<RenderResearchedSitePagesParams> = {}): RenderResearchedSitePagesParams {
  const home = page({ opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: copy('Home') });
  const hub = page({ opportunityId: 'hub', classification: 'service_hub', targetPath: '/services', copy: copy('Service hub') });
  const money = page();
  return {
    theme: VERTICAL_THEMES['emergency-trades'],
    assets: VERTICAL_ASSETS['emergency-trades'],
    data: { businessName: 'Test Business', businessNiche: 'plumber', phone: '050-0000000' },
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il',
    pages: [home, hub, money],
    graphEdges: [{ fromId: 'home', toId: 'hub' }, { fromId: 'hub', toId: 'money-alpha' }],
    ...overrides,
  };
}

test('stable slugs are ASCII, opaque-ID collision safe, and preserve a persisted value', () => {
  assert.equal(buildStablePageSlug('money-alpha', 'Alpha Service'), 'alpha-service--money-alpha');
  assert.equal(buildStablePageSlug('money-alpha', 'Alpha Service', 'saved--money-alpha'), 'saved--money-alpha');
  assert.match(buildStablePageSlug('money-alpha', 'Delta'), /^[a-z0-9-]+--money-alpha$/);
  assert.throws(() => buildStablePageSlug('../bad', 'Alpha'), /opaque/);
});

test('researched rendering selects only approved hierarchy pages and makes money pages browseable', () => {
  const pages = renderResearchedSitePages(params());
  assert.ok(pages['index.html']);
  assert.ok(pages['services--hub.html']);
  assert.ok(pages['services/alpha-service--money-alpha.html']);
  assert.ok(pages['contact.html']);
  assert.ok(pages['privacy.html']);
  assert.equal(pages['about.html'], undefined);
  assert.equal(pages['services.html'], undefined);
  assert.match(pages['index.html'], /href="\/services--hub.html"/);
  assert.match(pages['services--hub.html'], /href="\/services\/alpha-service--money-alpha.html"/);
});

test('unsafe paths are omitted and explicit graph orphans reject rendering', () => {
  const unsafe = page({ opportunityId: 'unsafe', targetPath: '/../private' });
  assert.deepEqual(buildResearchedSitemapUrls([unsafe]), []);
  assert.throws(() => renderResearchedSitePages(params({ graphEdges: [{ fromId: 'home', toId: 'hub' }] })), /orphan/);
});

test('FAQ markup and FAQPage schema use only approved distinct FAQ items', () => {
  const pages = renderResearchedSitePages(params());
  const html = pages['services/alpha-service--money-alpha.html'];
  assert.match(html, /Supported question\?/);
  assert.doesNotMatch(html, /Duplicate question\?/);
  const schema = buildResearchedSchemaGraph(page(), params().data, 'https://test.wao.co.il', 'https://example.test/hero.jpg');
  const parsed = JSON.parse(schema.replace('<script type="application/ld+json">', '').replace('</script>', ''));
  const faq = parsed['@graph'].find((item: Record<string, unknown>) => item['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity.length, 1);
  assert.ok(!JSON.stringify(parsed).includes('Review'));
});

test('schema links LocalBusiness and Service without inferring a storefront or area', () => {
  const schema = buildResearchedSchemaGraph(page(), params().data, 'https://test.wao.co.il', 'https://example.test/hero.jpg');
  const parsed = JSON.parse(schema.replace('<script type="application/ld+json">', '').replace('</script>', ''));
  const business = parsed['@graph'].find((item: Record<string, unknown>) => item['@id'] === 'https://test.wao.co.il/#business');
  const service = parsed['@graph'].find((item: Record<string, unknown>) => item['@type'] === 'Service');
  assert.deepEqual(service.provider, { '@id': business['@id'] });
  assert.equal(service.areaServed, undefined);
  assert.equal(business.aggregateRating, undefined);
});

test('sitemap uses stable readable output paths and legacy output remains separate', () => {
  assert.deepEqual(buildResearchedSitemapUrls(params().pages), [
    'index.html',
    'services--hub.html',
    'services/alpha-service--money-alpha.html',
  ]);
  const sitemap = renderResearchedSitePages(params())['sitemap.xml'];
  assert.match(sitemap, /https:\/\/test.wao.co.il\/services\/alpha-service--money-alpha.html/);
  assert.doesNotMatch(sitemap, /about.html/);
  assert.doesNotMatch(sitemap, /services.html/);
});
