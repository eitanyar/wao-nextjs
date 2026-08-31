import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCoreThirtyPages, buildCoreThirtySitemapUrls, coreThirtyPageSchema } from './renderCoreThirtyPages';
import type { RenderCoreThirtyPagesParams } from './renderCoreThirtyPages';
import { buildSitemap } from './renderSitePages';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { CoreThirtyNode } from './coreThirty';
import type { CoreThirtyPageCopy } from './coreThirtyCopy';
import type { CollectedData } from '../bot/prompts';

const theme = VERTICAL_THEMES['emergency-trades'];
const assets = VERTICAL_ASSETS['emergency-trades'];

const baseData: CollectedData = {
  businessName: 'עסק-בדיקה',
  businessNiche: 'שירות-בדיקה',
  phone: '050-1234567',
};

function makeNode(overrides: Partial<CoreThirtyNode> = {}): CoreThirtyNode {
  return {
    id: 'svc0-city0',
    service: 'שירות-בדיקה',
    city: 'עיר-בדיקה',
    locationType: 'service-area',
    ...overrides,
  };
}

function makeCopy(overrides: Partial<CoreThirtyPageCopy> = {}): CoreThirtyPageCopy {
  return {
    pageHeadline: 'כותרת-עמוד-בדיקה',
    narrative: 'נרטיב-בדיקה-ייחודי עם עובדות אמיתיות מהעסק',
    faqItems: [{ q: 'שאלת-בדיקה', a: 'תשובת-בדיקה' }],
    metaDescription: 'תיאור-מטא-ייחודי-לבדיקה',
    localRelevanceNote: 'הערת-רלוונטיות-מקומית-בדיקה',
    formHeadline: 'כותרת-טופס-בדיקה',
    ctaLabel: 'לחצו-כאן',
    ...overrides,
  };
}

function baseParams(overrides: Partial<RenderCoreThirtyPagesParams> = {}): RenderCoreThirtyPagesParams {
  return {
    nodes: [makeNode()],
    copies: new Map([['svc0-city0', makeCopy()]]),
    theme,
    assets,
    data: baseData,
    heroImageUrl: 'https://example.com/hero.jpg',
    slug: 'test-slug',
    siteUrl: 'https://test.wao.co.il',
    ...overrides,
  };
}

// ── renderCoreThirtyPages: skip-if-missing-copy ────────────────────────────

test('node with no matching copy produces no output page for that node', () => {
  const nodeWithCopy = makeNode({ id: 'svc0-city0' });
  const nodeWithoutCopy = makeNode({ id: 'svc1-city0', service: 'שירות-שני' });
  const copies = new Map([['svc0-city0', makeCopy()]]);

  const pages = renderCoreThirtyPages(baseParams({ nodes: [nodeWithCopy, nodeWithoutCopy], copies }));

  assert.equal(Object.keys(pages).length, 1);
  assert.ok(pages['sherut/svc0-city0.html']);
  assert.equal(pages['sherut/svc1-city0.html'], undefined);
});

test('all nodes missing copy -> empty Record, no throw', () => {
  const node = makeNode();
  const pages = renderCoreThirtyPages(baseParams({ nodes: [node], copies: new Map() }));
  assert.deepEqual(pages, {});
});

// ── Verbatim content ────────────────────────────────────────────────────────

test('rendered page contains service/city/pageHeadline/narrative/metaDescription verbatim', () => {
  const node = makeNode({ service: 'אינסטלציה', city: 'תל אביב' });
  const copy = makeCopy({
    pageHeadline: 'אינסטלציה בתל אביב — כותרת ייחודית',
    narrative: 'נרטיב ייחודי לתל אביב עם עובדות אמיתיות',
    metaDescription: 'תיאור מטא ייחודי לאינסטלציה בתל אביב',
  });

  const pages = renderCoreThirtyPages(baseParams({ nodes: [node], copies: new Map([[node.id, copy]]) }));
  const html = pages['sherut/svc0-city0.html'];

  assert.ok(html, 'expected a rendered page for the node');
  assert.ok(html.includes(node.service), 'expected node.service verbatim');
  assert.ok(html.includes(node.city), 'expected node.city verbatim');
  assert.ok(html.includes(copy.pageHeadline), 'expected copy.pageHeadline verbatim');
  assert.ok(html.includes(copy.narrative), 'expected copy.narrative verbatim');
  assert.ok(html.includes(copy.metaDescription), 'expected copy.metaDescription verbatim');
  assert.ok(html.includes(copy.localRelevanceNote), 'expected copy.localRelevanceNote surfaced on-page');
  assert.ok(html.includes(copy.faqItems[0].q), 'expected FAQ question rendered');
  assert.ok(html.includes(copy.faqItems[0].a), 'expected FAQ answer rendered');
});

test('lead-form section uses copy.formHeadline/copy.ctaLabel, not pageHeadline reused twice', () => {
  const node = makeNode();
  const copy = makeCopy({
    pageHeadline: 'כותרת-עמוד-שונה',
    formHeadline: 'כותרת-טופס-ייחודית',
    ctaLabel: 'שלח-פרטים',
  });

  const pages = renderCoreThirtyPages(baseParams({ nodes: [node], copies: new Map([[node.id, copy]]) }));
  const html = pages['sherut/svc0-city0.html'];

  assert.ok(html.includes(copy.formHeadline), 'expected copy.formHeadline rendered in the lead-form section');
  assert.ok(html.includes(copy.ctaLabel), 'expected copy.ctaLabel rendered as the CTA button label');
});

// ── Canonical URL / file path scheme ────────────────────────────────────────

test('canonical URL and file path both use the sherut/{id}.html scheme', () => {
  const node = makeNode({ id: 'svc2-city3' });
  const pages = renderCoreThirtyPages(
    baseParams({ nodes: [node], copies: new Map([[node.id, makeCopy()]]), siteUrl: 'https://client.wao.co.il/' })
  );

  const key = 'sherut/svc2-city3.html';
  assert.ok(pages[key], 'expected the file keyed at sherut/{id}.html');
  assert.ok(
    pages[key].includes('<link rel="canonical" href="https://client.wao.co.il/sherut/svc2-city3.html" />'),
    'expected canonical to point at sherut/{id}.html with the siteUrl trailing slash stripped'
  );
});

// ── Related-pages internal linking ──────────────────────────────────────────

test('related links: same-city-different-service siblings are linked, same-service fallback NOT used', () => {
  const nodeA = makeNode({ id: 'svc0-city0', service: 'שירות-א', city: 'עיר-א' });
  const nodeB = makeNode({ id: 'svc1-city0', service: 'שירות-ב', city: 'עיר-א' }); // same city
  const nodeC = makeNode({ id: 'svc0-city1', service: 'שירות-א', city: 'עיר-ב' }); // same service
  const copies = new Map([
    [nodeA.id, makeCopy()],
    [nodeB.id, makeCopy()],
    [nodeC.id, makeCopy()],
  ]);

  const pages = renderCoreThirtyPages(baseParams({ nodes: [nodeA, nodeB, nodeC], copies }));
  const html = pages['sherut/svc0-city0.html'];

  assert.ok(html.includes('href="/sherut/svc1-city0.html"'), 'expected same-city sibling link');
  assert.ok(
    !html.includes('href="/sherut/svc0-city1.html"'),
    'expected NOT to also link the same-service sibling when a same-city sibling exists'
  );
});

test('related links: falls back to same-service-different-city when no same-city sibling exists', () => {
  const nodeA = makeNode({ id: 'svc0-city0', service: 'שירות-א', city: 'עיר-א' });
  const nodeC = makeNode({ id: 'svc0-city1', service: 'שירות-א', city: 'עיר-ב' }); // same service, different city
  const copies = new Map([
    [nodeA.id, makeCopy()],
    [nodeC.id, makeCopy()],
  ]);

  const pages = renderCoreThirtyPages(baseParams({ nodes: [nodeA, nodeC], copies }));
  const html = pages['sherut/svc0-city0.html'];

  assert.ok(html.includes('href="/sherut/svc0-city1.html"'), 'expected same-service sibling link as fallback');
});

test('related links: omitted entirely when no siblings exist at all (single node)', () => {
  const node = makeNode();
  const pages = renderCoreThirtyPages(baseParams({ nodes: [node], copies: new Map([[node.id, makeCopy()]]) }));
  const html = pages['sherut/svc0-city0.html'];

  assert.ok(!html.includes('Related Pages'), 'expected no related-pages block for a lone node');
  assert.ok(!html.includes('href="/sherut/'), 'expected zero sherut cross-links for a lone node');
});

// ── buildCoreThirtySitemapUrls ──────────────────────────────────────────────

test('buildCoreThirtySitemapUrls returns paths only for nodes present in the copies map', () => {
  const nodeA = makeNode({ id: 'svc0-city0' });
  const nodeB = makeNode({ id: 'svc1-city0', service: 'שירות-ב' });
  const copies = new Map([[nodeA.id, makeCopy()]]);

  const urls = buildCoreThirtySitemapUrls([nodeA, nodeB], copies);

  assert.deepEqual(urls, ['sherut/svc0-city0.html']);
});

test('buildCoreThirtySitemapUrls returns [] when no nodes have copy', () => {
  const nodeA = makeNode({ id: 'svc0-city0' });
  assert.deepEqual(buildCoreThirtySitemapUrls([nodeA], new Map()), []);
});

// ── buildSitemap backward compatibility (Step 1 signature extension) ───────

test('buildSitemap(siteUrl) with no second arg still returns exactly the original 4-URL XML', () => {
  const xml = buildSitemap('https://example.wao.co.il');
  const urlCount = (xml.match(/<url>/g) || []).length;

  assert.equal(urlCount, 4);
  assert.ok(xml.includes('<loc>https://example.wao.co.il/</loc>'));
  assert.ok(xml.includes('<loc>https://example.wao.co.il/about.html</loc>'));
  assert.ok(xml.includes('<loc>https://example.wao.co.il/services.html</loc>'));
  assert.ok(xml.includes('<loc>https://example.wao.co.il/contact.html</loc>'));
});

test('buildSitemap(siteUrl, extraPaths) appends the extra URLs after the static 4', () => {
  const xml = buildSitemap('https://example.wao.co.il', ['sherut/svc0-city0.html', 'sherut/svc1-city0.html']);
  const urlCount = (xml.match(/<url>/g) || []).length;

  assert.equal(urlCount, 6);
  assert.ok(xml.includes('<loc>https://example.wao.co.il/sherut/svc0-city0.html</loc>'));
  assert.ok(xml.includes('<loc>https://example.wao.co.il/sherut/svc1-city0.html</loc>'));
});

// ── coreThirtyPageSchema / Linked Schema Graph ──────────────────────────────

test('coreThirtyPageSchema produces valid JSON-LD @graph with LocalBusiness, Service, and FAQPage', () => {
  const node = makeNode({ id: 'svc0-city0', service: 'Test Service', city: 'Test City' });
  const copy = makeCopy({
    pageHeadline: 'Service in City',
    metaDescription: 'Description of service in city',
    faqItems: [
      { q: 'Question 1?', a: 'Answer 1.' },
      { q: 'Question 2?', a: 'Answer 2.' },
    ],
  });
  const data: CollectedData = {
    businessName: 'Business Name',
    businessNiche: 'plumber',
    phone: '050-1111111',
  };

  const scriptTag = coreThirtyPageSchema(node, copy, data, 'https://test.wao.co.il/', 'https://example.com/hero.jpg');
  assert.ok(scriptTag.startsWith('<script type="application/ld+json">'));
  assert.ok(scriptTag.endsWith('</script>'));

  const jsonStr = scriptTag.replace('<script type="application/ld+json">', '').replace('</script>', '');
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed['@context'], 'https://schema.org');
  assert.ok(Array.isArray(parsed['@graph']));
  assert.equal(parsed['@graph'].length, 3);

  const business = parsed['@graph'].find((e: Record<string, unknown>) => e['@type'] === 'Plumber');
  assert.ok(business, 'expected Plumber entity in @graph');
  assert.equal(business['@id'], 'https://test.wao.co.il/#business');
  assert.equal(business.name, 'Business Name');
  assert.equal(business.priceRange, '$$');
  assert.equal(business.currenciesAccepted, 'ILS');
  assert.deepEqual(business.paymentAccepted, ['Cash', 'Credit Card', 'Bit', 'PayBox']);

  const service = parsed['@graph'].find((e: Record<string, unknown>) => e['@type'] === 'Service');
  assert.ok(service, 'expected Service entity in @graph');
  assert.equal(service['@id'], 'https://test.wao.co.il/sherut/svc0-city0.html#service');
  assert.equal(service.name, 'Service in City');
  assert.equal(service.serviceType, 'Test Service');
  assert.deepEqual(service.provider, { '@id': 'https://test.wao.co.il/#business' });
  assert.deepEqual(service.areaServed, { '@type': 'City', name: 'Test City' });
  assert.equal(service.description, 'Description of service in city');

  const faq = parsed['@graph'].find((e: Record<string, unknown>) => e['@type'] === 'FAQPage');
  assert.ok(faq, 'expected FAQPage entity in @graph');
  assert.equal(faq['@id'], 'https://test.wao.co.il/sherut/svc0-city0.html#faq');
  assert.ok(Array.isArray(faq.mainEntity));
  assert.equal(faq.mainEntity.length, 2);
  assert.deepEqual(faq.mainEntity[0], {
    '@type': 'Question',
    name: 'Question 1?',
    acceptedAnswer: { '@type': 'Answer', text: 'Answer 1.' },
  });
});

test('coreThirtyPageSchema omits FAQPage when faqItems is empty', () => {
  const node = makeNode({ id: 'svc0-city0' });
  const copy = makeCopy({ faqItems: [] });
  const data: CollectedData = { businessName: 'Test Business' };

  const scriptTag = coreThirtyPageSchema(node, copy, data, 'https://test.wao.co.il', 'https://example.com/hero.jpg');
  const jsonStr = scriptTag.replace('<script type="application/ld+json">', '').replace('</script>', '');
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed['@graph'].length, 2);
  assert.ok(parsed['@graph'].some((e: Record<string, unknown>) => e['@id'] === 'https://test.wao.co.il/#business'));
  assert.ok(parsed['@graph'].some((e: Record<string, unknown>) => e['@type'] === 'Service'));
  assert.ok(!parsed['@graph'].some((e: Record<string, unknown>) => e['@type'] === 'FAQPage'));
});

test('rendered Core-30 HTML includes linked Schema graph with payment and currency metadata', () => {
  const node = makeNode({ id: 'svc0-city0' });
  const copy = makeCopy({
    faqItems: [{ q: 'Q?', a: 'A.' }],
  });
  const pages = renderCoreThirtyPages(baseParams({ nodes: [node], copies: new Map([[node.id, copy]]) }));
  const html = pages['sherut/svc0-city0.html'];

  assert.ok(html.includes('"@graph":['), 'expected @graph in rendered html');
  assert.ok(html.includes('"currenciesAccepted":"ILS"'), 'expected currenciesAccepted in rendered html');
  assert.ok(html.includes('"paymentAccepted":["Cash","Credit Card","Bit","PayBox"]'), 'expected paymentAccepted in rendered html');
  assert.ok(html.includes('"@type":"Service"'), 'expected Service in rendered html');
  assert.ok(html.includes('"@type":"FAQPage"'), 'expected FAQPage in rendered html');
});
