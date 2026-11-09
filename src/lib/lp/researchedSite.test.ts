import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchedSchemaGraph, buildResearchedSitemapUrls, buildStablePageSlug, israeliPhoneE164, renderResearchedSitePages, RESEARCHED_GATED_FIELDS, RESEARCHED_HOME_HUB_ONLY_FIELDS, RESEARCHED_SERVICE_AREA_CAP, researchedGatedFieldsFor, type RenderResearchedSitePagesParams, type ResearchedSitePage } from './researchedSite';
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

test('M2b.1/M2b.1b: trust bar, review and hero call on every page; cards and about on homepage + hub only; areas list === areaServed on the homepage', () => {
  const seo = { name: 'Plumber', city: 'Holon', serviceArea: ['Holon', 'Bat Yam', 'holon', 'Rishon', 'Azor', 'Yavne', 'Lod', 'Ramla', ' '] };
  const home = page({ opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: { ...copy('Home'), reviewFeatured: 'Great job' }, seo });
  const hub = page({ opportunityId: 'hub', classification: 'service_hub', targetPath: '/services', copy: copy('Service hub'), seo });
  const money = page({ copy: { ...copy('Alpha service'), reviewFeatured: 'Great job' }, seo });
  const pages = renderResearchedSitePages(params({ data: fullData, pages: [home, hub, money] }));
  for (const file of ['index.html', 'services.html', 'services/alpha-service.html']) {
    const html = pages[file];
    assert.match(html, />\s*Licensed\s*</, `${file} trust bar`);
    assert.match(html, /<a href="tel:\+972500000000" data-hero-call [^>]*min-height:48px[^>]*>[^]*<span>Contact<\/span><bdi dir="ltr">050-0000000<\/bdi><\/a>/, `${file} hero call button`);
  }
  for (const file of ['index.html', 'services.html']) {
    const html = pages[file];
    assert.match(html, /<section id="services" data-section="service-details" aria-labelledby="services-heading"[^]*<h2 id="services-heading"[^>]*>Services<\/h2>[^]*<h3[^>]*>Alpha<\/h3><p[^>]*>Alpha description\.<\/p>/, `${file} service cards`);
    assert.match(html, /<section id="about" data-section="about" aria-labelledby="about-heading"[^]*<h2 id="about-heading"[^>]*>About<\/h2><p[^>]*>About body<\/p>/, `${file} about`);
  }
  const service = pages['services/alpha-service.html'];
  for (const marker of ['data-section="service-details"', 'data-section="about"', 'id="services"', 'id="about"']) assert.ok(!service.includes(marker), `service page: ${marker}`);
  // Order (Maya C6, C2): trust bar, review, cards, about, areas, FAQ, related links, form.
  const homeHtml = pages['index.html'];
  const order = ['Licensed', 'Great job', 'data-section="service-details"', 'data-section="about"', 'data-section="service-areas"', 'data-section="faq"', 'data-section="related-links"', 'id="contact"'].map(marker => homeHtml.indexOf(marker));
  assert.ok(order.every(index => index > 0), `markers present: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'section order');
  // Areas: page.seo.serviceArea, deduped, capped at 6, same order as schema areaServed (Service and LocalBusiness).
  const expected = ['Holon', 'Bat Yam', 'Rishon', 'Azor', 'Yavne', 'Lod'];
  assert.equal(RESEARCHED_SERVICE_AREA_CAP, 6);
  const listed = [...homeHtml.match(/<ul role="list"[^>]*>([^]*?)<\/ul>/)![1].matchAll(/<li[^>]*>([^<]+)<\/li>/g)].map(m => m[1]);
  assert.deepEqual(listed, expected);
  assert.match(homeHtml, /data-section="service-areas" aria-labelledby="service-areas-heading"/);
  const graph = JSON.parse(homeHtml.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)![1])['@graph'];
  for (const node of graph.filter((item: Record<string, unknown>) => item.areaServed)) assert.deepEqual(node.areaServed.map((a: { name: string }) => a.name), expected);
  assert.equal(graph.filter((item: Record<string, unknown>) => item.areaServed).length, 2);
  assert.doesNotMatch(homeHtml, /Ramla/, 'beyond the cap: not listed, not in schema');
  for (const file of ['services.html', 'services/alpha-service.html']) assert.doesNotMatch(pages[file], /service-areas/, `${file}: homepage only`);
  assert.deepEqual(Object.keys(pages).sort(), Object.keys(renderResearchedSitePages(params())).sort());
  // servedAreaNames.listed alone (no page.seo) never renders the list.
  assert.doesNotMatch(renderResearchedSitePages(params({ data: fullData }))['index.html'], /service-areas|"areaServed"/);
});

test('M2b.1b: an area with a selected qualified_service_area page links to it (plain city name); others are plain text', () => {
  const seo = { name: 'Plumber', city: 'Holon', serviceArea: ['Holon', 'Bat Yam'] };
  const home = page({ opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: copy('Home'), seo });
  const city = page({ opportunityId: 'city-bat-yam', classification: 'qualified_service_area', targetPath: '/areas/bat-yam', copy: copy('Bat Yam plumber'), seo: { name: 'Plumber', city: 'Bat Yam', serviceArea: ['Bat Yam'] } });
  const pages = renderResearchedSitePages(params({ pages: [home, city], graphEdges: [{ fromId: 'home', toId: 'city-bat-yam' }] }));
  const list = pages['index.html'].match(/<ul role="list"[^>]*>([^]*?)<\/ul>/)![1];
  assert.match(list, /<li[^>]*>Holon<\/li>/);
  assert.match(list, /<li[^>]*><a href="\/areas\/bat-yam.html" [^>]*>Bat Yam<\/a><\/li>/);
});

test('M2b.1b: research nav uses same-page anchors that exist, an aria-label, 44px targets; FAQ and related links are labelled; a11y markup', () => {
  const pages = renderResearchedSitePages(params({ data: fullData }));
  const ids = (html: string) => new Set([...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]));
  const homeIds = ids(pages['index.html']);
  for (const [file, html] of Object.entries(pages)) {
    if (!file.endsWith('.html')) continue;
    assert.doesNotMatch(html, /href="\/about\.html"/, `${file}: no dead about.html link`);
    const nav = html.match(/<nav aria-label="([^"]+)" style="[^"]*justify-content:flex-start;[^"]*">([^]*?)<\/nav>/);
    if (file === 'privacy.html' || file === 'accessibility.html') continue;
    assert.ok(nav, `${file}: research nav`);
    assert.equal(nav![1], RESEARCHED_SITE_LABELS.mainNavLabel);
    for (const [, href, style] of nav![2].matchAll(/<a href="([^"]+)" style="([^"]+)"/g)) {
      assert.match(style, /min-height:44px/, `${file} ${href}`);
      if (href.startsWith('#')) assert.ok(file === 'index.html' && homeIds.has(href.slice(1)), `${file}: ${href}`);
      else if (href.startsWith('/#')) assert.ok(homeIds.has(href.slice(2)), `${file}: ${href}`);
      else assert.ok(href === '/' || pages[href.slice(1)], `${file}: ${href} resolves`);
    }
  }
  const home = pages['index.html'];
  assert.match(home, /<nav aria-label="[^"]+"[^>]*><a href="\/"[^>]*>[^<]+<\/a><a href="#services"[^>]*>[^<]+<\/a><a href="#about"[^>]*>[^<]+<\/a><a href="\/contact.html"/);
  assert.match(pages['services/alpha-service.html'], /<a href="\/#services"[^>]*>[^<]+<\/a><a href="\/#about"/);
  assert.match(pages['contact.html'], /<a href="\/#services"/);
  assert.match(home, /<section id="contact" style=/);
  const money = pages['services.html']; // the hub: FAQ + an outgoing link
  assert.match(money, new RegExp(`<section data-section="faq" aria-labelledby="faq-heading"[^>]*><div[^>]*><h2 id="faq-heading"[^>]*>${RESEARCHED_SITE_LABELS.faqHeading}</h2>`));
  assert.match(money, new RegExp(`<nav data-section="related-links" aria-labelledby="related-links-heading"[^>]*><h2 id="related-links-heading"[^>]*>${RESEARCHED_SITE_LABELS.relatedLinksLabel}</h2>`));
  assert.ok(money.indexOf('data-section="faq"') < money.indexOf('data-section="related-links"'), 'related links below the FAQ');
  for (const [, style] of money.matchAll(/data-section="related-links"[^]*?<\/nav>/g).next().value![0].matchAll(/<a href="[^"]+" style="([^"]+)"/g)) {
    assert.match(style, /display:inline-block;padding:12px 8px;min-height:44px;color:#A82E00;text-decoration:underline;/);
  }
  assert.match(home, /<a href="tel:050-0000000" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;[^"]*"><span aria-hidden="true">\u{1F4DE}<\/span><bdi dir="ltr">050-0000000<\/bdi><\/a>/u);
  assert.match(home, /a:focus-visible, button:focus-visible, summary:focus-visible, input:focus-visible \{ outline: 3px solid #0D1B2A; outline-offset: 2px; \}/);
  assert.match(home, /data-hero-call style="[^"]*color:#FFFFFF;/, 'hero call uses ctaText');
});

test('M2b.1b: a section with content but no headline keeps an H2 (hidden, nav link text) so headings never skip', () => {
  const home = page({ opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: { ...copy('Home'), servicesHeadline: '', aboutPageHeadline: '' } });
  const html = renderResearchedSitePages(params({ pages: [home, page({ opportunityId: 'hub', classification: 'service_hub', targetPath: '/services', copy: copy('Hub') }), page()] }))['index.html'];
  assert.match(html, /<h2 id="services-heading" class="sr-only">[^<]+<\/h2>/);
  assert.match(html, /<h2 id="about-heading" class="sr-only">[^<]+<\/h2>/);
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i] <= levels[i - 1] + 1, `heading skip at ${i}: ${levels}`);
});

test('M2b.1b: gated fields per page type never include a field the page type does not render', () => {
  assert.deepEqual([...researchedGatedFieldsFor('homepage')], [...RESEARCHED_GATED_FIELDS]);
  assert.deepEqual([...researchedGatedFieldsFor('service_hub')], [...RESEARCHED_GATED_FIELDS]);
  for (const pageClass of ['money_service', 'qualified_service_area', 'trust']) {
    for (const field of RESEARCHED_HOME_HUB_ONLY_FIELDS) assert.ok(!researchedGatedFieldsFor(pageClass).includes(field), `${pageClass}: ${field}`);
  }
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

test('M2b.1c: more than 6 source areas: visible list and both areaServed arrays capped at 6, identical, base city first', () => {
  const source = ['Holon', 'Bat Yam', 'Rishon', 'Azor', 'Yavne', 'Lod', 'Ramla', 'Rehovot', 'Ness Ziona', 'Yehud'];
  assert.ok(source.length > RESEARCHED_SERVICE_AREA_CAP);
  const seo = { name: 'Plumber', city: 'Holon', serviceArea: source };
  const home = page({ opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: copy('Home'), seo });
  const html = renderResearchedSitePages(params({ data: fullData, pages: [home, page({ seo })], graphEdges: [{ fromId: 'home', toId: 'money-alpha' }] }))['index.html'];
  const listed = [...html.match(/<ul role="list"[^>]*>([^]*?)<\/ul>/)![1].matchAll(/<li[^>]*>([^<]+)<\/li>/g)].map(m => m[1]);
  assert.equal(listed.length, 6);
  assert.equal(listed[0], 'Holon', 'base city first');
  assert.deepEqual(listed, source.slice(0, 6));
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)![1])['@graph'];
  const declared = graph.filter((node: Record<string, unknown>) => node.areaServed).map((node: { '@type': string; areaServed: Array<{ name: string }> }) => ({ type: node['@type'], names: node.areaServed.map(a => a.name) }));
  assert.equal(declared.length, 2, 'Service + LocalBusiness');
  assert.ok(declared.some((d: { type: string }) => d.type === 'Service'));
  for (const d of declared) assert.deepEqual(d.names, listed, `${d.type} areaServed === visible list`);
  for (const beyond of source.slice(6)) assert.ok(!html.includes(beyond), `${beyond}: beyond the cap`);
});

test('M2b.1c: 44px tap targets (footer links, FAQ summary, consent label + 24px checkbox, separately tappable privacy link), contact phone bidi, no dead sticky-bar padding', () => {
  const pages = renderResearchedSitePages(params({ data: fullData }));
  for (const [file, html] of Object.entries(pages)) {
    if (!file.endsWith('.html')) continue;
    const footer = html.match(/<footer[^>]*>([^]*?)<\/footer>/)![1];
    const links = [...footer.matchAll(/<a href="[^"]+" style="([^"]*)"/g)];
    assert.ok(links.length >= 1, `${file}: footer links`);
    for (const [, style] of links) assert.match(style, /display:inline-flex;align-items:center;(?:gap:0\.3em;)?min-height:44px;/, `${file}: footer link`);
    assert.doesNotMatch(html, /padding-bottom: calc\(80px/, `${file}: no padding reserved for an absent sticky bar`);
    assert.match(html, /html \{ background: #FFFFFF; \}/, `${file}: leftover viewport below a short page takes the footer (surface) colour`);
  }
  const summaries = [...pages['services/alpha-service.html'].matchAll(/<summary style="([^"]*)"/g)];
  assert.ok(summaries.length >= 1, 'FAQ rendered');
  for (const [, style] of summaries) {
    assert.match(style, /min-height:44px;padding:12px 0;cursor:pointer;/);
    assert.doesNotMatch(style, /display:/, 'native disclosure marker kept (summary stays list-item)');
  }
  for (const file of ['index.html', 'contact.html']) {
    const html = pages[file];
    assert.match(html, /<label style="display:flex;gap:10px;align-items:center;min-height:44px;cursor:pointer;">\s*<input type="checkbox" id="f-consent" required style="width:24px;height:24px;/, `${file}: consent`);
    assert.match(html, /<a href="\/privacy.html" style="display:inline-block;padding:14px 0;margin:-14px 0;/, `${file}: privacy link hit box`);
  }
  assert.match(pages['contact.html'], /<a href="tel:050-0000000" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;[^"]*"><span aria-hidden="true">\u{1F4DE}<\/span><bdi dir="ltr">050-0000000<\/bdi><\/a>/u);
});
