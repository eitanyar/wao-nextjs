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
  duplicateIndexableMetaDescriptions,
  pageNameWithCity,
  researchedContactDescription,
  researchedContactTitle,
  renderResearchedSitePages,
  researchedPageH1,
  RESEARCHED_TITLE_TARGET_CHARS,
  type ResearchedSitePage,
} from './researchedSite';
import { localBusinessObject } from './renderSitePages';
import { formatBusinessHoursHebrew, parseBusinessHours } from './businessHours';
import { VERTICAL_THEMES } from './verticalThemes';
import { RESEARCHED_SITE_LABELS } from './researchedSiteLabels';
import { VERTICAL_ASSETS } from './verticalAssets';
import { primaryCtaLabel, type SiteCopy } from './lpCopyPrompt';
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
  // M2b.1b: the related-links block is labelled by its visible heading (data-section="related-links").
  const nav = /<nav data-section="related-links"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';
  return [...nav.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
}

test('C3 clean URLs: files services/<slug>.html, served URL /services/<slug> (M4 step 0), no opportunity-ID suffix; canonical, og:url and sitemap match', () => {
  const site = render();
  assert.deepEqual(buildResearchedSitemapUrls(pages, 'https://test.wao.co.il'), [
    'https://test.wao.co.il/', 'https://test.wao.co.il/services/leak-detection',
    'https://test.wao.co.il/services/drain-unblocking', 'https://test.wao.co.il/services/water-heater',
  ]);
  for (const url of buildResearchedSitemapUrls(pages, 'https://test.wao.co.il')) {
    const file = url === 'https://test.wao.co.il/' ? 'index.html' : `${url.replace('https://test.wao.co.il/', '')}.html`;
    assert.ok(site[file], file);
    assert.ok(site[file].includes(`<link rel="canonical" href="${url}" />`), file);
    assert.ok(site[file].includes(`<meta property="og:url" content="${url}" />`), file);
    assert.ok(site['sitemap.xml'].includes(`<loc>${url}</loc>`), file);
  }
  assert.doesNotMatch(site['sitemap.xml'], /--/);
  assert.doesNotMatch(site['sitemap.xml'], /\.html/, 'M4 step 0: no sitemap URL ends in .html');
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

function breadcrumbHtml(html: string): string {
  return /<nav data-section="breadcrumb"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';
}

test('C4 links: navigation draws exactly the graph edges (home -> all services; service -> home via the breadcrumb + siblings)', () => {
  const site = render();
  assert.deepEqual(navHrefs(site['index.html']), ['/services/leak-detection', '/services/drain-unblocking', '/services/water-heater']);
  // 2026-11-11 (Yonatan): the related links of a service page are its siblings only; the home edge is the breadcrumb.
  assert.deepEqual(navHrefs(site['services/leak-detection.html']), ['/services/drain-unblocking', '/services/water-heater']);
  assert.deepEqual(navHrefs(site['services/water-heater.html']), ['/services/leak-detection', '/services/drain-unblocking']);
  for (const file of ['services/leak-detection.html', 'services/drain-unblocking.html', 'services/water-heater.html']) {
    const crumbs = breadcrumbHtml(site[file]);
    // Exactly one link to "/", in the breadcrumb; its anchor is the business name (Latin: in a bdi), not a hook.
    assert.equal([...crumbs.matchAll(/href="\/"/g)].length, 1, file);
    assert.match(crumbs, /<a href="\/"><bdi>TEST M2a Plumbing<\/bdi><\/a>/, file);
  }
  assert.equal(breadcrumbHtml(site['index.html']), '', 'no breadcrumb on the homepage');
});

test('breadcrumb: above the H1, crumb 2 is the plain Service.name (not linked, aria-current), no city; CSS separator; Hebrew brand without bdi', () => {
  const site = render();
  const money = site['services/leak-detection.html'];
  assert.ok(money.indexOf('data-section="breadcrumb"') < money.indexOf('<h1'), 'breadcrumb precedes the H1');
  assert.match(money, /<nav data-section="breadcrumb" class="wao-breadcrumb" aria-label="[^"]+"><ol role="list"><li>/);
  // The approved label (docs/copy/site-bot-breadcrumb-label-2026-11-11.json, Tamar -> Noa), as escapes.
  assert.equal(RESEARCHED_SITE_LABELS.breadcrumbLabel, '\u05de\u05d9\u05e7\u05d5\u05de\u05da \u05d1\u05d0\u05ea\u05e8');
  assert.equal(/<nav data-section="breadcrumb"[^>]*aria-label="([^"]+)"/.exec(money)?.[1], RESEARCHED_SITE_LABELS.breadcrumbLabel);
  const crumbs = breadcrumbHtml(money);
  assert.ok(crumbs.endsWith(`<li><span aria-current="page">${HE_SERVICE}</span></li></ol>`), crumbs);
  assert.equal([...crumbs.matchAll(/<a /g)].length, 1, 'crumb 2 is not linked');
  assert.ok(!crumbs.includes(HE_CITY), 'no city in the breadcrumb');
  assert.equal(crumbs.replace(/<[^>]+>/g, ''), `TEST M2a Plumbing${HE_SERVICE}`, 'no separator glyph in the markup');
  assert.match(money, /\[dir="rtl"\] \.wao-breadcrumb li\+li::before\{transform:scaleX\(-1\)/);
  assert.doesNotMatch(site['index.html'], /wao-breadcrumb/);
  const hebrew = renderResearchedSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data: { ...data, businessName: HE_BRAND },
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il', pages, graphEdges,
  });
  assert.ok(breadcrumbHtml(hebrew['services/leak-detection.html']).startsWith(`<ol role="list"><li><a href="/">${HE_BRAND}</a></li>`));
});

function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a #RRGGBB colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function wcagContrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('breadcrumb contrast (Maya): in EVERY vertical theme, the rendered crumb text and link meet 4.5:1 on the hero background', () => {
  assert.equal(wcagContrast('#000000', '#FFFFFF').toFixed(1), '21.0');
  const themes = Object.entries(VERTICAL_THEMES);
  assert.equal(themes.length, 8);
  for (const [key, theme] of themes) {
    const site = renderResearchedSitePages({
      theme, assets: VERTICAL_ASSETS[key as keyof typeof VERTICAL_ASSETS], data,
      heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il', pages, graphEdges,
    });
    const money = site['services/leak-detection.html'];
    // Redesign A item 7: the breadcrumb sits in the solid hero (background: --primary = theme.primary); the hero override
    // paints the crumb text and link white.
    const text = /\.hero \.wao-breadcrumb\{color:(#[0-9A-Fa-f]{6});/.exec(money)?.[1];
    const link = /\.hero \.wao-breadcrumb a\{color:(#[0-9A-Fa-f]{6});/.exec(money)?.[1];
    assert.ok(/<section class="hero on-dark"[^>]*><div class="hero-grid"><div class="hero-text"><nav data-section="breadcrumb"/.test(money), `${key}: breadcrumb opens the hero`);
    assert.ok(money.includes(`--primary:${theme.primary};`), `${key}: hero background token`);
    for (const [name, colour] of [['text', text], ['link', link]] as const) {
      assert.ok(colour, `${key}: crumb ${name} colour`);
      const ratio = wcagContrast(colour!, theme.primary);
      assert.ok(ratio >= 4.5, `${key}: crumb ${name} ${colour} on primary ${theme.primary} = ${ratio.toFixed(2)}`);
    }
  }
});

test('breadcrumb schema: BreadcrumbList in the @graph, 2 items, absolute URLs equal to the root and the canonical (and sitemap)', () => {
  const site = render();
  const money = site['services/leak-detection.html'];
  const canonical = 'https://test.wao.co.il/services/leak-detection';
  assert.ok(money.includes(`<link rel="canonical" href="${canonical}" />`));
  assert.ok(site['sitemap.xml'].includes(`<loc>${canonical}</loc>`) && site['sitemap.xml'].includes('<loc>https://test.wao.co.il/</loc>'));
  const graph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(money)![1])['@graph'];
  const lists = graph.filter((item: Record<string, unknown>) => item['@type'] === 'BreadcrumbList');
  assert.equal(lists.length, 1);
  assert.equal(lists[0]['@id'], `${canonical}#breadcrumb`);
  assert.deepEqual(lists[0].itemListElement, [
    { '@type': 'ListItem', position: 1, name: 'TEST M2a Plumbing', item: 'https://test.wao.co.il/' },
    { '@type': 'ListItem', position: 2, name: HE_SERVICE, item: canonical },
  ]);
  const service = graph.find((item: Record<string, unknown>) => item['@type'] === 'Service');
  assert.equal(lists[0].itemListElement[1].name, service.name);
  const homeGraph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(site['index.html'])![1])['@graph'];
  assert.equal(homeGraph.some((item: Record<string, unknown>) => item['@type'] === 'BreadcrumbList'), false);
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

const metaOf = (html: string) => /<meta name="description" content="([^"]*)"/.exec(html)?.[1];
const robotsOf = (html: string) => /<meta name="robots" content="([^"]*)"/.exec(html)?.[1];

test('contact meta (2026-11-11): its own description, built from the contact title formula + call label + phone; never the homepage\'s', () => {
  const site = render();
  const expected = `${researchedContactTitle('plumber-he', HE_CITY, 'TEST M2a Plumbing')} \u2014 ${primaryCtaLabel({})} 050-0000000`;
  assert.equal(researchedContactDescription('plumber-he', HE_CITY, 'TEST M2a Plumbing', '050-0000000'), expected);
  assert.equal(metaOf(site['contact.html']), expected.replace(/"/g, '&quot;'));
  assert.notEqual(metaOf(site['contact.html']), metaOf(site['index.html']));
  assert.equal(robotsOf(site['contact.html']), 'index,follow');
  assert.ok(site['sitemap.xml'].includes('<loc>https://test.wao.co.il/contact</loc>'));
  // No valid phone: the title formula alone. No trade: no description -> noindex,follow and out of the sitemap.
  assert.equal(researchedContactDescription('plumber-he', HE_CITY, 'TEST M2a Plumbing', 'call me'), researchedContactTitle('plumber-he', HE_CITY, 'TEST M2a Plumbing'));
  assert.equal(researchedContactDescription('  ', HE_CITY, 'TEST M2a Plumbing', '050-0000000'), null);
  const noTrade = renderResearchedSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data,
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il',
    pages: [{ ...pages[0], seo: { ...pages[0].seo!, name: '' } }, ...pages.slice(1)], graphEdges,
  });
  assert.equal(robotsOf(noTrade['contact.html']), 'noindex,follow');
  assert.doesNotMatch(noTrade['sitemap.xml'], /\/contact</);
});

test('site-wide meta uniqueness covers every indexable page (homepage, service pages, contact); noindex pages are out of scope', () => {
  // The fixture copy gives every page the same heroSubheadline: home and the three service pages collide, contact does not.
  assert.deepEqual(duplicateIndexableMetaDescriptions(render()), [['index.html', 'services/leak-detection.html', 'services/drain-unblocking.html', 'services/water-heater.html']]);
  const unique = renderResearchedSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data,
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'test-client', siteUrl: 'https://test.wao.co.il',
    pages: pages.map(page => ({ ...page, copy: { ...page.copy, heroSubheadline: `Sub of ${page.opportunityId}` } })), graphEdges,
  });
  assert.deepEqual(duplicateIndexableMetaDescriptions(unique), []);
  // The contact page is checked too: a contact description equal to the homepage's is caught (punctuation / case ignored).
  const homeMeta = metaOf(unique['index.html'])!;
  const forged = { ...unique, 'contact.html': unique['contact.html'].replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${homeMeta.toUpperCase()}."`) };
  assert.equal(duplicateIndexableMetaDescriptions(forged).length, 1);
  assert.deepEqual([...duplicateIndexableMetaDescriptions(forged)[0]].sort(), ['contact.html', 'index.html']);
  // Legal pages are noindex: never compared.
  assert.equal(robotsOf(unique['privacy.html']), 'noindex,follow');
});

test('M4 step 0: a researched site deploy output has extensionless canonicals/og:url/schema/sitemap/links and a real noindex 404.html', () => {
  const site = render();
  const SITE = 'https://test.wao.co.il';
  for (const [file, body] of Object.entries(site)) {
    for (const [, href] of body.matchAll(/\shref="([^"]*)"/g)) assert.doesNotMatch(href, /\.html(?:[#?]|$)/, `${file}: ${href}`);
    assert.doesNotMatch(body, /https:\/\/test\.wao\.co\.il\/[^"'<\s]*\.html/, `${file}: absolute .html URL`);
  }
  const urls = [...site['sitemap.xml'].matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1]);
  assert.ok(urls.includes(`${SITE}/contact`));
  for (const url of urls) {
    const path = url.slice(SITE.length);
    const file = path === '/' ? 'index.html' : `${path.slice(1)}.html`;
    assert.ok(site[file], `${url} is served from ${file}`);
    assert.ok(site[file].includes(`<link rel="canonical" href="${url}" />`), `${file}: canonical is the sitemap URL`);
  }
  const notFound = site['404.html'];
  assert.ok(notFound, '404.html emitted');
  assert.match(notFound, /<meta name="robots" content="noindex,follow" \/>/);
  assert.doesNotMatch(notFound, /rel="canonical"/);
  assert.ok(!urls.some(url => url.endsWith('/404')));
});
