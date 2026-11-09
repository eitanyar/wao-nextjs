import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchedSchemaGraph, buildResearchedSitemapUrls, buildStablePageSlug, israeliPhoneE164, renderResearchedSitePages, type RenderResearchedSitePagesParams, type ResearchedSitePage } from './researchedSite';
import { HE_TODO_PREFIX, RESEARCHED_SITE_LABELS, RESEARCHED_SITE_LABELS_PENDING_COPY } from './researchedSiteLabels';
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

test('clean slugs (M2a.1 C3): the planned segment with no opportunity-ID suffix; a persisted slug wins; svc fallback', () => {
  assert.equal(buildStablePageSlug('money-alpha', 'alpha-service'), 'alpha-service');
  assert.equal(buildStablePageSlug('money-alpha', 'Alpha Service'), 'alpha-service');
  assert.equal(buildStablePageSlug('money-alpha', 'alpha-service', 'saved-slug'), 'saved-slug');
  assert.equal(buildStablePageSlug('money-alpha', 'alpha-service-2'), 'alpha-service-2');
  assert.doesNotMatch(buildStablePageSlug('money-alpha', 'Delta'), /--/);
  assert.match(buildStablePageSlug('money-alpha', 'contact'), /^svc-[0-9a-f]{10}$/);
  assert.throws(() => buildStablePageSlug('../bad', 'Alpha'), /opaque/);
});

test('researched rendering selects only approved hierarchy pages and makes money pages browseable', () => {
  const pages = renderResearchedSitePages(params());
  assert.ok(pages['index.html']);
  // The hub (/services) now owns services.html; the legacy services.html is not emitted.
  assert.ok(pages['services.html']);
  assert.ok(pages['services/alpha-service.html']);
  assert.ok(pages['contact.html']);
  assert.ok(pages['privacy.html']);
  assert.equal(pages['about.html'], undefined);
  // The legacy services.html (its <!-- Services --> block) is replaced by the hub page.
  assert.doesNotMatch(pages['services.html'], /<!-- Services -->/);
  assert.match(pages['index.html'], /href="\/services.html"/);
  assert.match(pages['services.html'], /href="\/services\/alpha-service.html"/);
});

test('unsafe paths are omitted and explicit graph orphans reject rendering', () => {
  const unsafe = page({ opportunityId: 'unsafe', targetPath: '/../private' });
  assert.deepEqual(buildResearchedSitemapUrls([unsafe]), []);
  assert.throws(() => renderResearchedSitePages(params({ graphEdges: [{ fromId: 'home', toId: 'hub' }] })), /orphan/);
});

test('FAQ markup and FAQPage schema use only approved distinct FAQ items', () => {
  const pages = renderResearchedSitePages(params());
  const html = pages['services/alpha-service.html'];
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
    'services.html',
    'services/alpha-service.html',
  ]);
  const sitemap = renderResearchedSitePages(params())['sitemap.xml'];
  assert.match(sitemap, /https:\/\/test.wao.co.il\/services\/alpha-service.html/);
  assert.doesNotMatch(sitemap, /--/);
  assert.doesNotMatch(sitemap, /about.html/);
});

// ── M2b.1: trust bar, about, service cards, hero call button, service areas ──

const fullData = { businessName: 'Test Business', businessNiche: 'plumber', phone: '050-0000000', contactMethod: '', servedAreaNames: { listed: ['Bat Yam', 'Rishon', 'Azor'], overflow: ['Yavne'], source: 'travel_boundary' as const, ownerConfirmed: false } };

function emptyCopy(headline: string): SiteCopy {
  return { ...copy(headline), trustBarItems: [], aboutPageHeadline: 'Orphan about headline', aboutPageBody: '', servicesHeadline: 'Orphan services headline', serviceDetails: [] };
}

test('M2b.1: every research page renders the trust bar, service cards, about section and hero call button; the homepage lists the service areas', () => {
  const pages = renderResearchedSitePages(params({ data: fullData }));
  for (const file of ['index.html', 'services.html', 'services/alpha-service.html']) {
    const html = pages[file];
    assert.match(html, />\s*Licensed\s*</, `${file} trust bar`);
    assert.match(html, /data-section="service-details"[^]*<h2[^>]*>Services<\/h2>[^]*<h3[^>]*>Alpha<\/h3><p[^>]*>Alpha description\.<\/p>/, `${file} service cards`);
    assert.match(html, /data-section="about"[^]*<h2[^>]*>About<\/h2><p[^>]*>About body<\/p>/, `${file} about`);
    assert.match(html, /<a href="tel:\+972500000000" data-hero-call [^>]*min-height:48px[^>]*>[^]*<span>Contact<\/span><bdi dir="ltr">050-0000000<\/bdi><\/a>/, `${file} hero call button`);
  }
  const home = pages['index.html'];
  assert.match(home, /data-section="service-areas" aria-labelledby="service-areas-heading"/);
  assert.match(home, /<h2 id="service-areas-heading"[^>]*>[^<]+<\/h2><ul role="list"[^>]*><li[^>]*>Bat Yam<\/li><li[^>]*>Rishon<\/li><li[^>]*>Azor<\/li><\/ul>/);
  assert.doesNotMatch(home, /Yavne/, 'overflow is never rendered');
  for (const file of ['services.html', 'services/alpha-service.html']) assert.doesNotMatch(pages[file], /service-areas/, `${file}: base page only`);
  // No new pages, schema areaServed unchanged (page.seo absent here: no areaServed at all).
  assert.deepEqual(Object.keys(pages).sort(), Object.keys(renderResearchedSitePages(params())).sort());
  assert.doesNotMatch(home, /"areaServed"/);
});

test('M2b.1: empty fields collapse their sections (no empty headings), no phone = no hero call button', () => {
  const home = page({ opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: emptyCopy('Home') });
  const hub = page({ opportunityId: 'hub', classification: 'service_hub', targetPath: '/services', copy: emptyCopy('Service hub') });
  const money = page({ copy: { ...emptyCopy('Alpha service'), serviceDetails: [{ name: '', description: 'Nameless.' }], trustBarItems: ['', '  '] } });
  const pages = renderResearchedSitePages(params({ data: { businessName: 'Test Business', businessNiche: 'plumber' }, pages: [home, hub, money] }));
  for (const file of ['index.html', 'services.html', 'services/alpha-service.html']) {
    const html = pages[file];
    for (const marker of ['data-section="service-details"', 'data-section="about"', 'data-section="service-areas"', 'data-hero-call', 'Orphan about headline', 'Orphan services headline', 'Nameless.']) assert.ok(!html.includes(marker), `${file}: ${marker}`);
    assert.doesNotMatch(html, /<h[1-6][^>]*>\s*<\/h[1-6]>/, `${file}: empty heading`);
    assert.doesNotMatch(html, /<section[^>]*background:[^>]*>\s*<div[^>]*max-width:700px;margin:0 auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">\s*<\/div>/, `${file}: empty trust bar`);
  }
});

test('M2b.1: israeliPhoneE164', () => {
  assert.equal(israeliPhoneE164('050-0000000'), '+972500000000');
  assert.equal(israeliPhoneE164('03-555-0123'), '+97235550123');
  assert.equal(israeliPhoneE164('+972 3-555-0123'), '+97235550123');
  assert.equal(israeliPhoneE164('972501234567'), '+972501234567');
  for (const bad of ['', undefined, '1-800-123-456', '*2700', '050-000', '00-0000000']) assert.equal(israeliPhoneE164(bad), null, String(bad));
});

// Placeholders must never ship. Skipped while the label copy is pending (Adam flips
// RESEARCHED_SITE_LABELS_PENDING_COPY to false when the waocopy -> Noa patches land).
test('M2b.1: no __HE_TODO_ placeholder reaches rendered HTML', { skip: RESEARCHED_SITE_LABELS_PENDING_COPY ? 'label copy pending (researchedSiteLabels.ts)' : false }, () => {
  for (const [file, html] of Object.entries(renderResearchedSitePages(params({ data: fullData })))) assert.ok(!html.includes(HE_TODO_PREFIX), file);
});

test('M2b.1: the pending flag matches the labels (flip it when the last placeholder is patched)', () => {
  const pending = Object.values(RESEARCHED_SITE_LABELS).some(value => value.includes(HE_TODO_PREFIX));
  assert.equal(RESEARCHED_SITE_LABELS_PENDING_COPY, pending);
});
