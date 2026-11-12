// Site Bot Redesign A (2026-11-13): acceptance tests for the redesigned generated-site template.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew values are read from the FINAL labels file, the generation
// data module and the test-core30-verify site record (data/sites, read-only).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderSitePages, buildSitemap } from './renderSitePages';
import { renderCoreThirtyPages, buildCoreThirtySitemapUrls } from './renderCoreThirtyPages';
import { renderResearchedSitePages, serviceCardTarget, type ResearchedSitePage } from './researchedSite';
import { renderStaticHtml } from './renderStaticHtml';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import { detectVertical } from './verticalDetect';
import { DAY_LETTERS } from './generationData';
import { SITE_DESIGN_LABELS } from './siteDesignLabels';
import { SITE_FONT_PATHS, siteFontFiles } from './siteFonts';
import { EMOJI_PATTERN, formatSiteHours, heroHoursLine, isStockImageUrl, ownerImageUrl, withoutEmoji } from './siteDesign';
import type { SiteCopy } from './lpCopyPrompt';
import type { CoreThirtyNode } from './coreThirty';
import type { CoreThirtyPageCopy } from './coreThirtyCopy';

const ROOT = path.resolve(__dirname, '../../..');
const FINAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/copy/site-bot-redesign-ui-labels-FINAL-2026-11-12.json'), 'utf8')).labels as Record<string, unknown>;

/** Renders the test-core30-verify site exactly as the deploy route's legacy path does (pages + core-30 + sitemap). */
function renderCore30Verify(): Record<string, string> {
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sites/test-core30-verify.json'), 'utf8'));
  const vertical = detectVertical(record.collectedData.businessNiche || '');
  const assets = VERTICAL_ASSETS[vertical];
  const siteUrl = `https://${record.slug}.wao.co.il`;
  const params = { theme: VERTICAL_THEMES[vertical], assets, data: record.collectedData, heroImageUrl: assets.heroImages[0].url, slug: record.slug, siteUrl };
  const nodes = record.coreThirtyNodes as CoreThirtyNode[];
  const copies = new Map(Object.entries(record.coreThirtyCopies)) as Map<string, CoreThirtyPageCopy>;
  const files = { ...renderSitePages({ ...params, copy: record.copy }), ...renderCoreThirtyPages({ ...params, nodes, copies }) };
  files['sitemap.xml'] = buildSitemap(siteUrl, buildCoreThirtySitemapUrls(nodes, copies));
  return files;
}

const latinCopy = (headline: string, cards: Array<{ name: string; description: string }> = []): SiteCopy => ({
  heroHeadline: headline, heroSubheadline: `${headline} sub`, heroCta: 'Call', trustBarItems: ['Fact one', 'Fact two'],
  aboutBlurb: 'About', servicesHeadline: 'Services', serviceItems: ['Alpha'], faqHeadline: 'FAQ', faqItems: [],
  guaranteeBlock: null, reviewFeatured: 'Great job', reviewContext: null, responseTimeBadge: null, scarcityLine: null,
  formHeadline: 'Write to us', stickyBarLine: 'Caption', aboutPageHeadline: 'About', aboutPageBody: 'About body', serviceDetails: cards,
} as unknown as SiteCopy);

function researchedFixture(): Record<string, string> {
  const home: ResearchedSitePage = {
    opportunityId: 'home', classification: 'homepage', targetPath: '/',
    copy: latinCopy('Home hook', [{ name: 'Alpha Repair', description: 'Alpha description.' }, { name: 'Beta Work', description: 'Beta description.' }]),
    seo: { name: 'Plumber', city: null, serviceArea: [] },
  };
  const alpha: ResearchedSitePage = { opportunityId: 'svc-alpha', classification: 'money_service', targetPath: '/services/alpha-repair', copy: latinCopy('Alpha hook'), seo: { name: 'Alpha Repair', city: null, serviceArea: [] } };
  const gamma: ResearchedSitePage = { opportunityId: 'svc-gamma', classification: 'money_service', targetPath: '/services/gamma', copy: latinCopy('Gamma hook'), seo: { name: 'Gamma', city: null, serviceArea: [] } };
  return renderResearchedSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'],
    data: { businessName: 'Test Biz', businessNiche: 'plumber', phone: '050-0000000', businessHours: 'Sun-Thu 08:00-18:00, Fri 08:00-13:00' },
    heroImageUrl: VERTICAL_ASSETS['emergency-trades'].heroImages[0].url, slug: 'test-biz', siteUrl: 'https://test-biz.wao.co.il',
    pages: [home, alpha, gamma],
    graphEdges: [{ fromId: 'home', toId: 'svc-alpha' }, { fromId: 'home', toId: 'svc-gamma' }, { fromId: 'svc-alpha', toId: 'home' }, { fromId: 'svc-gamma', toId: 'home' }],
  });
}

const htmlFiles = (files: Record<string, string>) => Object.entries(files).filter(([file]) => file.endsWith('.html'));

test('labels: every Redesign A label is byte-identical to the FINAL file; hours.days reuses DAY_LETTERS; bar labels are the moved strings', () => {
  assert.equal(SITE_DESIGN_LABELS.skipLink, FINAL['skip.link']);
  assert.equal(SITE_DESIGN_LABELS.heroWhatsapp, FINAL['hero.cta.whatsapp']);
  assert.equal(SITE_DESIGN_LABELS.hoursLabel, FINAL['hero.hours.label']);
  assert.equal(SITE_DESIGN_LABELS.closedDay, FINAL['hours.closedDay']);
  assert.equal(SITE_DESIGN_LABELS.trustLabel, FINAL['trust.label']);
  assert.deepEqual([...DAY_LETTERS], FINAL['hours.days']);
  for (const value of [SITE_DESIGN_LABELS.barCall, SITE_DESIGN_LABELS.barWhatsapp]) {
    assert.ok(/^[א-ת]+$/.test(value), 'one Hebrew word, no emoji');
  }
});

test('hours: day groups with en-dash ranges, 24h, closed days in week order, one separator; unparseable hides the row', () => {
  const d = DAY_LETTERS;
  assert.equal(formatSiteHours('Sun-Thu 08:00-18:00, Fri 08:00-13:00'), `${d[0]}–${d[4]} 08:00–18:00, ${d[5]} 08:00–13:00, ${d[6]} ${SITE_DESIGN_LABELS.closedDay}`);
  assert.equal(formatSiteHours('Mon-Wed 9:00-17:00'), `${d[0]} ${SITE_DESIGN_LABELS.closedDay}, ${d[1]}–${d[3]} 09:00–17:00, ${d[4]}–${d[6]} ${SITE_DESIGN_LABELS.closedDay}`);
  assert.equal(formatSiteHours('Sun-Sat 00:00-24:00'), `${d[0]}–${d[6]} 00:00–24:00`);
  assert.equal(formatSiteHours('whenever'), null);
  assert.equal(formatSiteHours(undefined), null);
  assert.equal(heroHoursLine('whenever'), '');
  assert.ok(heroHoursLine('Sun-Thu 08:00-18:00').startsWith(`<p class="hero-note" data-hero-hours><strong>${SITE_DESIGN_LABELS.hoursLabel}</strong> `));
});

test('fonts: Heebo ships inside the site (two woff2 subsets + OFL), preloaded, never from Google Fonts', () => {
  const files = siteFontFiles();
  assert.deepEqual(Object.keys(files).sort(), [SITE_FONT_PATHS.hebrew, SITE_FONT_PATHS.latin, SITE_FONT_PATHS.licence].map(p => p.slice(1)).sort());
  for (const key of [SITE_FONT_PATHS.hebrew, SITE_FONT_PATHS.latin]) {
    const bytes = files[key.slice(1)];
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'wOF2', key);
    assert.ok(bytes.length > 5000, key);
  }
  assert.match(files[SITE_FONT_PATHS.licence.slice(1)].toString('utf8'), /SIL Open Font License/);
  for (const [file, html] of [...htmlFiles(renderCore30Verify()), ...htmlFiles(researchedFixture())]) {
    assert.ok(html.includes(`<link rel="preload" href="${SITE_FONT_PATHS.hebrew}" as="font" type="font/woff2" crossorigin />`), `${file}: preload`);
    assert.ok(html.includes(`src:url(${SITE_FONT_PATHS.hebrew}) format("woff2")`), `${file}: @font-face`);
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|Secular/, `${file}: no Google Fonts, no Secular One`);
    assert.doesNotMatch(html, /font-style:\s*italic/, `${file}: never italic`);
  }
});

test('no emoji, no stock image, no rating schema, bidi regression 0, exactly one H1 on every rendered page', () => {
  assert.ok(isStockImageUrl(VERTICAL_ASSETS['emergency-trades'].heroImages[0].url));
  assert.equal(ownerImageUrl('https://images.unsplash.com/x.jpg'), '');
  assert.equal(ownerImageUrl('https://example.test/owner.jpg'), 'https://example.test/owner.jpg');
  assert.equal(withoutEmoji('✅ ok'), 'ok');
  const sites = { core30: renderCore30Verify(), researched: researchedFixture() };
  for (const [site, files] of Object.entries(sites)) {
    for (const [file, html] of htmlFiles(files)) {
      const where = `${site}/${file}`;
      assert.deepEqual(html.match(EMOJI_PATTERN), null, `${where}: emoji`);
      assert.doesNotMatch(html, /unsplash/i, `${where}: stock image URL`);
      for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) {
        assert.doesNotMatch(json, /"@type":"(?:AggregateRating|Review)"|"aggregateRating"|"review"/, `${where}: rating schema`);
      }
      assert.equal((html.match(/<bdi dir="ltr">\([^)<]*<\/bdi>/g) ?? []).length, 0, `${where}: bidi regression`);
      if (file === '404.html' || file === 'privacy.html' || file === 'accessibility.html') continue;
      assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${where}: one H1`);
      assert.doesNotMatch(html, /#25D366;color:#fff/i, `${where}: WhatsApp text contrast`);
    }
  }
});

test('header + bar (items 1-2): one header with the nav, call button hidden on mobile; slim bar with no caption, hidden on desktop', () => {
  const files = renderCore30Verify();
  for (const [file, html] of htmlFiles(files)) {
    if (file === '404.html' || file === 'privacy.html' || file === 'accessibility.html') continue;
    assert.equal((html.match(/<header\b/g) ?? []).length, 1, `${file}: one header`);
    assert.match(html, /<header class="site-hdr"><div class="wrap"><a class="brand" href="\/">[^]*?<nav class="site-nav" aria-label="[^"]+">[^]*?<a class="btn btn-call hdr-call" href="tel:/, `${file}: header`);
    assert.match(html, /\.site-hdr \.hdr-call\{display:none;\}/);
    assert.match(html, /@media \(min-width:900px\)\{[^\n]*\.site-hdr \.hdr-call\{display:inline-flex;[^\n]*\.bar,\.bar-spacer\{display:none;\}/);
    assert.match(html, new RegExp(`<div class="bar" data-action-bar><a class="btn btn-call" href="tel:[^"]+"[^>]*>[^]*?<span>${SITE_DESIGN_LABELS.barCall}</span></a><a class="btn btn-wa"[^>]*>[^]*?<span>${SITE_DESIGN_LABELS.barWhatsapp}</span></a></div>`), `${file}: bar`);
    assert.ok(html.includes(`<a class="skip" href="#main">${SITE_DESIGN_LABELS.skipLink}</a>`) && html.includes('id="main"'), `${file}: skip link target`);
  }
  // The legacy caption line is gone from the bar.
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sites/test-core30-verify.json'), 'utf8'));
  assert.ok(!files['index.html'].includes(record.copy.stickyBarLine), 'no caption');
  // The ads LP (no siteNav) keeps a plain business name and no nav.
  const lp = renderStaticHtml({ theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], copy: record.copy, data: record.collectedData, heroImageUrl: 'https://example.test/x.jpg', slug: 'lp' });
  assert.match(lp, /<header class="site-hdr"><div class="wrap"><div class="brand">/);
  assert.doesNotMatch(lp, /class="site-nav"/);
});

test('hero (item 7) and trust facts (item 8): solid primary hero, no image; checked list named by trust.label', () => {
  const home = researchedFixture()['index.html'];
  assert.match(home, /<section class="hero on-dark" data-section="hero"><div class="hero-grid"><div class="hero-text"><h1>/);
  assert.match(home, /\.hero\{background:var\(--primary\);color:#fff;/);
  assert.doesNotMatch(home, /background-image|<img\b/, 'no image anywhere');
  assert.ok(home.includes(`<strong>${SITE_DESIGN_LABELS.hoursLabel}</strong> <span>${formatSiteHours('Sun-Thu 08:00-18:00, Fri 08:00-13:00')}</span>`), 'hero hours');
  assert.match(home, new RegExp(`<section class="trust" data-section="trust" aria-label="${SITE_DESIGN_LABELS.trustLabel}"><ul role="list"><li><svg class="ic" aria-hidden="true"[^>]*><use href="#i-check"/></svg><span>Fact one</span></li><li>`));
  assert.match(home, /@media \(min-width:900px\)\{[^\n]*\.trust ul\{grid-template-columns:repeat\(4, 1fr\);/);
});

test('service cards (item 5, Yonatan C3): exact-match cards link as <h3><a> to the real page (in the sitemap); others plain; home drops covered related links', () => {
  const files = researchedFixture();
  const home = files['index.html'];
  assert.match(home, /<li class="svc-card" data-card-link><span class="tile">[^]*?<h3><a href="\/services\/alpha-repair">Alpha Repair<\/a><\/h3><p>Alpha description\.<\/p><\/div><svg class="ic chev"/);
  assert.match(home, /<li class="svc-card"><span class="tile">[^]*?<h3>Beta Work<\/h3><p>Beta description\.<\/p><\/div><\/li>/, 'no page, no link');
  assert.doesNotMatch(home, /class="svc"[^]*href="\/services"[^/]/, 'never the /services stand-in');
  assert.ok(files['sitemap.xml'].includes('<loc>https://test-biz.wao.co.il/services/alpha-repair</loc>'));
  assert.ok(files['services/alpha-repair.html']);
  const related = /<nav data-section="related-links"[^]*?<\/nav>/.exec(home)?.[0] ?? '';
  assert.ok(related.includes('href="/services/gamma"'), 'an uncovered page stays in the related links');
  assert.ok(!related.includes('href="/services/alpha-repair"'), 'the card already links it');
  // Exact match only: a near name or a duplicate match never links.
  const pages = [{ opportunityId: 'a', classification: 'money_service', targetPath: '/a', copy: latinCopy('a'), seo: { name: 'Alpha', city: null, serviceArea: [] } }] as ResearchedSitePage[];
  const outputs = new Map([['a', 'a.html']]);
  assert.equal(serviceCardTarget('Alpha', pages, outputs, 'B')?.href, '/a');
  assert.equal(serviceCardTarget('Alpha repair', pages, outputs, 'B'), null);
  assert.equal(serviceCardTarget('Alpha', [...pages, { ...pages[0], opportunityId: 'b' }], new Map([...outputs, ['b', 'b.html']]), 'B'), null);
});
