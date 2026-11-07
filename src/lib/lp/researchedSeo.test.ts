// Paid-journey v2 M2a.1 (C1-C5): title formula, H1 rule, clean URLs, schema, link graph,
// business hours, and the quote-without-context render on researched sites.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew test names come from the
// byte-exact gate config; the only Hebrew letters asserted are escapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildResearchedPageTitle,
  buildResearchedSchemaGraph,
  buildResearchedSitemapUrls,
  pageNameWithCity,
  renderResearchedSitePages,
  researchedPageH1,
  RESEARCHED_TITLE_TARGET_CHARS,
  type ResearchedSitePage,
} from './researchedSite';
import { localBusinessObject } from './renderSitePages';
import { formatBusinessHoursHebrew, parseBusinessHours } from './businessHours';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { SiteCopy } from './lpCopyPrompt';
import type { CollectedData } from '../bot/prompts';

const RLM = '\u200F';
const BET = '\u05D1';
// Synthetic Hebrew-script letter sequences (test data, not copy).
const HE_SERVICE = '\u05D0\u05D1\u05D2 \u05D3\u05D4\u05D5';
const HE_CITY = '\u05D7\u05D8\u05D9';
const HE_BRAND = '\u05DB\u05DC \u05DE\u05E0';

test('C1 title formula: Latin business name gets the RLM anchor; Hebrew business name does not', () => {
  assert.equal(buildResearchedPageTitle(HE_SERVICE, HE_CITY, 'TEST M2a Plumbing'), `${HE_SERVICE} ${BET}${HE_CITY}${RLM} | TEST M2a Plumbing`);
  assert.equal(buildResearchedPageTitle(HE_SERVICE, HE_CITY, HE_BRAND), `${HE_SERVICE} ${BET}${HE_CITY} | ${HE_BRAND}`);
  // Brand last, a single " | " separator, no em-dash double suffix.
  const title = buildResearchedPageTitle(HE_SERVICE, HE_CITY, HE_BRAND);
  assert.equal(title.split(' | ').length, 2);
  assert.ok(title.endsWith(` | ${HE_BRAND}`));
  assert.ok(title.length <= RESEARCHED_TITLE_TARGET_CHARS, String(title.length));
  // A non-Hebrew city keeps the prefix readable with a hyphen; no city drops the prefix.
  assert.equal(pageNameWithCity('alpha', 'Holon'), `alpha ${BET}-Holon`);
  assert.equal(buildResearchedPageTitle('alpha', null, 'TEST'), `alpha${RLM} | TEST`);
});

test('C1 H1: the hook only if it contains the service name and the city; otherwise name + city', () => {
  const seo = { name: HE_SERVICE, city: HE_CITY, serviceArea: [HE_CITY] };
  const hookWithBoth = `${HE_SERVICE} ${BET}${HE_CITY} hook`;
  assert.equal(researchedPageH1(hookWithBoth, seo), hookWithBoth);
  assert.equal(researchedPageH1(`${HE_SERVICE} hook only`, seo), `${HE_SERVICE} ${BET}${HE_CITY}`);
  assert.equal(researchedPageH1('a hook', undefined), 'a hook');
});

const copy = (overrides: Partial<SiteCopy> = {}): SiteCopy => ({
  heroHeadline: 'A fear hook', heroSubheadline: 'Sub', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: ['Alpha'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Promise',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form',
  stickyBarLine: 'Sticky', aboutPageHeadline: 'About page', aboutPageBody: 'About body', serviceDetails: [], ...overrides,
});

const data: CollectedData = {
  businessName: 'TEST M2a Plumbing', businessNiche: 'plumber', phone: '050-0000000', targetLocation: 'Holon',
  specificCities: 'Holon, Bat Yam', businessHours: 'Sun-Thu 08:00-18:00, Fri 08:00-13:00',
};
const area = [HE_CITY, 'Bat Yam'];
const pages: ResearchedSitePage[] = [
  { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: copy({ reviewFeatured: 'Came within an hour' }), seo: { name: 'plumber-he', city: HE_CITY, serviceArea: area } },
  { opportunityId: 'svc-leak-detection', classification: 'money_service', targetPath: '/services/leak-detection', copy: copy(), seo: { name: HE_SERVICE, city: HE_CITY, serviceArea: area } },
  { opportunityId: 'svc-drain-unblocking', classification: 'money_service', targetPath: '/services/drain-unblocking', copy: copy(), seo: { name: 'drain-he', city: HE_CITY, serviceArea: area } },
  { opportunityId: 'svc-water-heater', classification: 'money_service', targetPath: '/services/water-heater', copy: copy(), seo: { name: 'heater-he', city: HE_CITY, serviceArea: area } },
];
// C4: brief links (home -> all; service -> home + siblings) are the graph edges.
const graphEdges = [
  ...pages.slice(1).map(page => ({ fromId: 'home', toId: page.opportunityId })),
  ...pages.slice(1).flatMap(page => [{ fromId: page.opportunityId, toId: 'home' }, ...pages.slice(1).filter(other => other !== page).map(other => ({ fromId: page.opportunityId, toId: other.opportunityId }))]),
];
const render = () => renderResearchedSitePages({
  theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data,
  heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il', pages, graphEdges,
});

function navHrefs(html: string): string[] {
  const nav = /<nav aria-label="Related pages"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';
  return [...nav.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
}

test('C3 clean URLs: /services/<slug>.html, no opportunity-ID suffix; canonical and sitemap match', () => {
  const site = render();
  assert.deepEqual(buildResearchedSitemapUrls(pages, 'https://test.wao.co.il'), [
    'https://test.wao.co.il/', 'https://test.wao.co.il/services/leak-detection.html',
    'https://test.wao.co.il/services/drain-unblocking.html', 'https://test.wao.co.il/services/water-heater.html',
  ]);
  for (const url of buildResearchedSitemapUrls(pages, 'https://test.wao.co.il')) {
    const file = url === 'https://test.wao.co.il/' ? 'index.html' : url.replace('https://test.wao.co.il/', '');
    assert.ok(site[file], file);
    assert.ok(site[file].includes(`<link rel="canonical" href="${url}" />`), file);
    assert.ok(site['sitemap.xml'].includes(`<loc>${url}</loc>`), file);
  }
  assert.doesNotMatch(site['sitemap.xml'], /--/);
});

test('C1 rendered <title> uses the formula; Service.name and link anchors are the plain service name', () => {
  const site = render();
  const money = site['services/leak-detection.html'];
  assert.ok(money.includes(`<title>${HE_SERVICE} ${BET}${HE_CITY}${RLM} | TEST M2a Plumbing</title>`));
  assert.ok(money.includes(`>${HE_SERVICE} ${BET}${HE_CITY}</h1>`), 'hook lacks name+city -> H1 is name + city');
  assert.ok(site['index.html'].includes(`<title>plumber-he ${BET}${HE_CITY}${RLM} | TEST M2a Plumbing</title>`));
  assert.ok(site['index.html'].includes(`>${HE_SERVICE}</a>`));
  const schema = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(money)![1]);
  const service = schema['@graph'].find((item: Record<string, unknown>) => item['@type'] === 'Service');
  assert.equal(service.name, HE_SERVICE);
  assert.deepEqual(service.areaServed, area.map(name => ({ '@type': 'City', name })));
});

test('C4 links: navigation draws exactly the graph edges (home -> all services; service -> home + siblings)', () => {
  const site = render();
  assert.deepEqual(navHrefs(site['index.html']), ['/services/leak-detection.html', '/services/drain-unblocking.html', '/services/water-heater.html']);
  assert.deepEqual(navHrefs(site['services/leak-detection.html']), ['/', '/services/drain-unblocking.html', '/services/water-heater.html']);
  assert.deepEqual(navHrefs(site['services/water-heater.html']), ['/', '/services/leak-detection.html', '/services/drain-unblocking.html']);
  // The home link anchor is the business name, not a hook.
  assert.match(site['services/leak-detection.html'], /<a href="\/"[^>]*>TEST M2a Plumbing<\/a>/);
});

test('C2 schema: no hard-coded priceRange/paymentAccepted, valid openingHoursSpecification, City areaServed, sameAs only when present, no invented address', () => {
  const graph = JSON.parse(buildResearchedSchemaGraph(pages[1], data, 'https://test.wao.co.il', 'https://example.test/hero.jpg')
    .replace('<script type="application/ld+json">', '').replace('</script>', ''))['@graph'];
  const business = graph.find((item: Record<string, unknown>) => item['@id'] === 'https://test.wao.co.il/#business');
  assert.equal(business.priceRange, undefined);
  assert.equal(business.paymentAccepted, undefined);
  assert.equal(business.openingHours, undefined);
  assert.equal(business.address, undefined);
  assert.equal(business.sameAs, undefined);
  assert.deepEqual(business.areaServed, area.map(name => ({ '@type': 'City', name })));
  assert.deepEqual(business.openingHoursSpecification, [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '08:00', closes: '18:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Friday'], opens: '08:00', closes: '13:00' },
  ]);
  const withMaps = localBusinessObject({ ...data, googleMapsUrl: 'https://maps.app.goo.gl/abc123', streetAddress: '1 Test St' }, 'B', 'https://x.test', 'img', { ownerFactsOnly: true });
  assert.deepEqual(withMaps.sameAs, ['https://maps.app.goo.gl/abc123']);
  assert.deepEqual(withMaps.address, { '@type': 'PostalAddress', streetAddress: '1 Test St', addressLocality: 'Holon', addressCountry: 'IL' });
  assert.deepEqual(withMaps.areaServed, [{ '@type': 'City', name: 'Holon' }, { '@type': 'City', name: 'Bat Yam' }]);
  assert.equal(localBusinessObject({ ...data, googleMapsUrl: 'https://evil.example/maps/x' }, 'B', 'https://x.test', 'img', { ownerFactsOnly: true }).sameAs, undefined);
  // Unparseable hours are omitted, never passed through as free text.
  assert.equal(localBusinessObject({ ...data, businessHours: 'mornings' }, 'B', 'https://x.test', 'img', { ownerFactsOnly: true }).openingHoursSpecification, undefined);
  // Legacy (flags unset) schema is unchanged.
  const legacy = localBusinessObject(data, 'B', 'https://x.test', 'img');
  assert.equal(legacy.priceRange, '$$');
  assert.equal(legacy.openingHours, data.businessHours);
  // The legacy contact page on a researched site carries the owner-facts schema too.
  assert.doesNotMatch(render()['contact.html'], /priceRange|paymentAccepted/);
});

test('hours parser: day ranges, wrap-around, lists; all-or-nothing; Hebrew formatter waits for the day-letter table', () => {
  assert.deepEqual(parseBusinessHours('Fri-Sun 09:00-14:00')?.[0].dayOfWeek, ['Friday', 'Saturday', 'Sunday']);
  assert.deepEqual(parseBusinessHours('Sun/Tue 7:30–16:00'), [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday', 'Tuesday'], opens: '07:30', closes: '16:00' }]);
  assert.equal(parseBusinessHours('Sun-Thu 08:00-18:00, by appointment'), null);
  assert.equal(parseBusinessHours(''), null);
  assert.equal(formatBusinessHoursHebrew('Sun-Thu 08:00-18:00', null), null);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  assert.equal(formatBusinessHoursHebrew('Sun-Thu 08:00-18:00, Fri 08:00-13:00', letters), 'A–E 08:00–18:00, F 08:00–13:00');
});

test('the owner quote renders without a context line; with a context the line is added', () => {
  const site = render();
  assert.ok(site['index.html'].includes('\u05F4Came within an hour\u05F4</p></blockquote>'));
  const withContext = renderResearchedSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data,
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il',
    pages: [{ ...pages[0], copy: copy({ reviewFeatured: 'Came within an hour', reviewContext: '5 stars' }) }, ...pages.slice(1)], graphEdges,
  });
  assert.match(withContext['index.html'], /\u05F4Came within an hour\u05F4<\/p><div[^>]*>5 stars<\/div><\/blockquote>/);
  assert.doesNotMatch(site['services/leak-detection.html'], /<blockquote/);
});
