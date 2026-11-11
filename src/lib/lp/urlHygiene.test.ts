// M4 step 0 (docs/missions/site-bot-m4-site-migration-2026-11-11.md): URL hygiene of every generated client site.
// Files stay *.html on disk; Cloudflare Pages serves /x.html as /x (redirect), so canonicals, og:url, sitemap URLs, schema
// URLs and internal links are extensionless, and every deploy output carries a real noindex 404.html.
// HEBREW-SAFETY: no Hebrew literals.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLandingPageSupportPages, buildSitemap, renderSitePages, servedPath, servedUrl } from './renderSitePages';
import type { RenderSitePagesParams } from './renderSitePages';
import { renderCoreThirtyPages, buildCoreThirtySitemapUrls } from './renderCoreThirtyPages';
import { LEGAL_HOME_LINK_TEXT } from './legalPages';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { SiteCopy } from './lpCopyPrompt';
import type { CollectedData } from '../bot/prompts';
import type { CoreThirtyNode } from './coreThirty';
import type { CoreThirtyPageCopy } from './coreThirtyCopy';

const SITE = 'https://client.wao.co.il';
const theme = VERTICAL_THEMES['emergency-trades'];
const assets = VERTICAL_ASSETS['emergency-trades'];
const copy: SiteCopy = {
  heroHeadline: 'Headline', heroSubheadline: 'Subheadline', heroCta: 'CTA', trustBarItems: ['T1'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: ['S1'], faqHeadline: 'FAQ', faqItems: [{ q: 'Q1', a: 'A1' }],
  guaranteeBlock: 'G', reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null,
  formHeadline: 'Form', stickyBarLine: 'Sticky', aboutPageHeadline: 'About page', aboutPageBody: 'About body',
  serviceDetails: [{ name: 'S1', description: 'D1' }],
};
const data: CollectedData = { businessName: 'Client Business', businessNiche: 'plumber', phone: '050-1234567', targetLocation: 'Tel Aviv' };

function params(overrides: Partial<RenderSitePagesParams> = {}): RenderSitePagesParams {
  return { copy, theme, assets, data, heroImageUrl: 'https://example.test/hero.jpg', slug: 'client', siteUrl: `${SITE}/`, fraudBlockerSid: 'sid-test', ...overrides };
}

const canonicalOf = (html: string) => /<link rel="canonical" href="([^"]*)" \/>/.exec(html)?.[1];
const ogUrlOf = (html: string) => /<meta property="og:url" content="([^"]*)" \/>/.exec(html)?.[1];
const robotsOf = (html: string) => /<meta name="robots" content="([^"]*)" \/>/.exec(html)?.[1];
const hrefs = (html: string) => [...html.matchAll(/\shref="([^"]*)"/g)].map(m => m[1]);
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1]);

function assertNoHtmlUrls(files: Record<string, string>): void {
  for (const [file, body] of Object.entries(files)) {
    for (const href of hrefs(body)) assert.doesNotMatch(href, /\.html(?:[#?]|$)/, `${file}: href ${href} ends in .html`);
    assert.doesNotMatch(body, /https:\/\/client\.wao\.co\.il\/[^"'<\s]*\.html/, `${file}: absolute site URL with .html (schema / canonical / sitemap)`);
  }
}

/** Every sitemap URL is served directly (Pages-style lookup: `/` -> index.html, `/x` -> x.html), with a self canonical. */
function assertSitemapResolves(files: Record<string, string>): void {
  const urls = locs(files['sitemap.xml']);
  assert.ok(urls.length > 0);
  for (const url of urls) {
    assert.ok(url.startsWith(`${SITE}/`), url);
    assert.doesNotMatch(url, /\.html$/, url);
    const path = url.slice(SITE.length);
    const file = path === '/' ? 'index.html' : path.endsWith('/') ? `${path.slice(1)}index.html` : `${path.slice(1)}.html`;
    assert.ok(files[file], `${url} -> ${file} is emitted`);
    assert.equal(canonicalOf(files[file]), url, `${file}: canonical = its sitemap URL (the final URL, no redirect)`);
  }
}

function assertReal404(files: Record<string, string>, sid?: string): void {
  const html = files['404.html'];
  assert.ok(html, '404.html is in the deploy output');
  assert.equal(robotsOf(html), 'noindex,follow');
  assert.equal(canonicalOf(html), undefined, '404 has no canonical');
  assert.equal(ogUrlOf(html), undefined);
  assert.match(html, /<html lang="he" dir="rtl">/);
  assert.match(html, /<h1[^>]*>404<\/h1>/);
  assert.ok(html.includes(`<a href="/" style="display:inline-flex;align-items:center;min-height:44px;">${LEGAL_HOME_LINK_TEXT}</a>`), 'home link reuses the approved legal-page label');
  assert.ok(!locs(files['sitemap.xml'] ?? '').some(url => url.endsWith('/404')), '404 is not in the sitemap');
  if (sid) assert.ok(html.includes(sid), 'the Fraud Blocker tracker is on the 404 page too (deploy verification covers every .html)');
}

test('servedPath / servedUrl: the extensionless path Cloudflare Pages serves each deploy file at', () => {
  assert.equal(servedPath('index.html'), '/');
  assert.equal(servedPath(''), '/');
  assert.equal(servedPath('about.html'), '/about');
  assert.equal(servedPath('sherut/a-b.html'), '/sherut/a-b');
  assert.equal(servedPath('services/x/index.html'), '/services/x/');
  assert.equal(servedUrl(`${SITE}/`, 'contact.html'), `${SITE}/contact`);
  assert.equal(servedUrl(SITE, 'index.html'), `${SITE}/`);
});

test('legacy site: canonical + og:url are the extensionless final URL (homepage = root), sitemap has no .html, no internal .html href', () => {
  const files = renderSitePages(params());
  const expected: Record<string, string> = {
    'index.html': `${SITE}/`, 'about.html': `${SITE}/about`, 'services.html': `${SITE}/services`, 'contact.html': `${SITE}/contact`,
    'privacy.html': `${SITE}/privacy`, 'accessibility.html': `${SITE}/accessibility`,
  };
  for (const [file, url] of Object.entries(expected)) {
    assert.equal(canonicalOf(files[file]), url, `${file} canonical`);
    if (file !== 'privacy.html' && file !== 'accessibility.html') assert.equal(ogUrlOf(files[file]), url, `${file} og:url`);
  }
  assert.deepEqual(locs(files['sitemap.xml']), [`${SITE}/`, `${SITE}/about`, `${SITE}/services`, `${SITE}/contact`]);
  assertSitemapResolves(files);
  assertNoHtmlUrls(files);
  // Internal links use the served paths.
  for (const href of ['/services', '/about', '/contact', '/privacy', '/accessibility']) assert.ok(hrefs(files['about.html']).includes(href), href);
  assertReal404(files, 'sid-test');
});

test('researched-site legal output (renderSitePages with researched/researchNav) also carries the 404 with the pipe title', () => {
  const files = renderSitePages(params({ researched: { contactTitle: 'Contact | Client Business' } }));
  assertReal404(files);
  assert.match(files['404.html'], /<title>404[^<]* \| Client Business<\/title>/);
});

test('core-30 deploy output: canonical, schema @id, sibling links and sitemap are extensionless; files stay sherut/{id}.html', () => {
  const nodes: CoreThirtyNode[] = ['a', 'b'].map(id => ({ id: `svc-${id}`, service: `Service ${id}`, city: 'City', locationType: 'service-area' }));
  const pageCopy: CoreThirtyPageCopy = { pageHeadline: 'H', metaDescription: 'M', narrative: 'N', faqItems: [{ q: 'Q', a: 'A' }], localRelevanceNote: 'L', formHeadline: 'F', ctaLabel: 'C' };
  const copies = new Map(nodes.map(n => [n.id, pageCopy]));
  const core = renderCoreThirtyPages({ nodes, copies, theme, assets, data, heroImageUrl: 'https://example.test/hero.jpg', slug: 'client', siteUrl: SITE, fraudBlockerSid: 'sid-test' });
  assert.deepEqual(Object.keys(core).sort(), ['sherut/svc-a.html', 'sherut/svc-b.html']);
  // Exactly what the site-bot deploy route assembles.
  const files: Record<string, string> = { ...renderSitePages(params()), ...core, 'sitemap.xml': buildSitemap(SITE, buildCoreThirtySitemapUrls(nodes, copies)) };
  assert.equal(canonicalOf(files['sherut/svc-a.html']), `${SITE}/sherut/svc-a`);
  assert.ok(files['sherut/svc-a.html'].includes(`"@id":"${SITE}/sherut/svc-a#service"`));
  assert.ok(hrefs(files['sherut/svc-a.html']).includes('/sherut/svc-b'));
  assert.ok(locs(files['sitemap.xml']).includes(`${SITE}/sherut/svc-b`));
  assertSitemapResolves(files);
  assertNoHtmlUrls(files);
  assertReal404(files, 'sid-test');
});

test('ads-LP deploy support pages: privacy (+ gated accessibility) with extensionless canonicals, and a real 404.html', () => {
  const files = buildLandingPageSupportPages({ theme, data, siteUrl: SITE, fraudBlockerSid: 'sid-lp' });
  assert.deepEqual(Object.keys(files).sort(), ['404.html', 'accessibility.html', 'privacy.html']);
  assert.equal(canonicalOf(files['privacy.html']), `${SITE}/privacy`);
  assert.equal(canonicalOf(files['accessibility.html']), `${SITE}/accessibility`);
  assertNoHtmlUrls(files);
  assertReal404(files, 'sid-lp');
  const exempt = buildLandingPageSupportPages({ theme, data: { ...data, vatStatus: 'osek_patur' }, siteUrl: SITE });
  assert.deepEqual(Object.keys(exempt).sort(), ['404.html', 'privacy.html']);
});
