import assert from 'node:assert/strict';
import test from 'node:test';
import { renderResearchedSitePages, type RenderResearchedSitePagesParams, type ResearchedSitePage } from '../lp/researchedSite';
import { VERTICAL_ASSETS } from '../lp/verticalAssets';
import { VERTICAL_THEMES } from '../lp/verticalThemes';
import {
  assertLocalPreviewBundleSafe,
  buildOperatorLocalPreview,
  buildSyntheticLocalPreview,
  type LocalPreviewInput,
} from './localPreview';
import type { ResearchedSiteGenerationRecord } from './researchedSiteGeneration';

const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8WgWQAAAABJRU5ErkJggg==';

const copy = (headline: string) => ({
  heroHeadline: headline,
  heroSubheadline: 'Synthetic fixture only.',
  heroCta: 'Disabled',
  trustBarItems: ['Synthetic'],
  aboutBlurb: 'Synthetic fixture.',
  servicesHeadline: 'Services',
  serviceItems: ['Synthetic Service'],
  faqHeadline: 'FAQ',
  faqItems: [],
  guaranteeBlock: 'Synthetic only.',
  reviewFeatured: null,
  reviewContext: null,
  responseTimeBadge: null,
  scarcityLine: null,
  formHeadline: 'No submissions',
  stickyBarLine: 'Offline only',
  aboutPageHeadline: 'About synthetic',
  aboutPageBody: 'Synthetic fixture.',
  serviceDetails: [{ name: 'Synthetic Service', description: 'Synthetic fixture service.' }],
});

function input(overrides: Partial<LocalPreviewInput> = {}): LocalPreviewInput {
  const pages: ResearchedSitePage[] = [
    { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: copy('Synthetic Home') },
    { opportunityId: 'hub', classification: 'service_hub', targetPath: '/services', copy: copy('Synthetic Services') },
    { opportunityId: 'money', classification: 'money_service', targetPath: '/services/synthetic-service', copy: copy('Synthetic Money Service') },
  ];
  return {
    synthetic: true,
    slug: 'synthetic-preview',
    canonicalOrigin: 'https://synthetic-preview.invalid',
    collectedData: { businessName: 'Synthetic Workshop', businessNiche: 'synthetic service', primaryService: 'Synthetic Service', vatStatus: 'between_120k_1m' },
    pages,
    graphEdges: [{ fromId: 'home', toId: 'hub' }, { fromId: 'hub', toId: 'money' }],
    theme: VERTICAL_THEMES['emergency-trades'],
    assets: VERTICAL_ASSETS['emergency-trades'],
    heroAsset: { sourcePath: 'fixtures/site-bot/local-preview-hero.svg', contents: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' },
    ...overrides,
  };
}

function rendererParams(): RenderResearchedSitePagesParams {
  const value = input();
  return { theme: value.theme, assets: value.assets, data: value.collectedData, heroImageUrl: '/assets/hero.svg', slug: value.slug, siteUrl: value.canonicalOrigin, pages: value.pages, graphEdges: value.graphEdges };
}

function operatorRecord(overrides: Partial<ResearchedSiteGenerationRecord> = {}): ResearchedSiteGenerationRecord {
  const value = input();
  return {
    slug: 'operator-preview',
    researchId: 'research-alpha',
    approvedPageId: 'home',
    collectedData: structuredClone(value.collectedData),
    copy: structuredClone(value.pages[0].copy),
    researchedPages: structuredClone(value.pages),
    researchedGraphEdges: structuredClone(value.graphEdges),
    createdAt: '2026-09-20T00:00:00.000Z',
    ...overrides,
  };
}

test('builds a complete local bundle with a visible marker and local navigation', () => {
  const bundle = buildSyntheticLocalPreview(input());
  assertLocalPreviewBundleSafe(bundle);
  assert.deepEqual(bundle.manifest.assets, ['assets/hero.svg']);
  assert.ok(bundle.files['index.html']);
  assert.ok(bundle.files['services--hub.html']);
  assert.ok(bundle.files['services/synthetic-service--money.html']);
  assert.ok(bundle.files['contact.html']);
  assert.ok(bundle.files['privacy.html']);
  assert.ok(bundle.files['accessibility.html']);
  assert.ok(bundle.files['sitemap.xml']);
  assert.ok(bundle.files['preview-manifest.json']);
  assert.match(bundle.files['index.html'], /LOCAL PREVIEW - SYNTHETIC DATA - NO SUBMISSION/);
  assert.match(bundle.files['index.html'], /href="\/services--hub.html"/);
  assert.match(bundle.files['index.html'], /\/assets\/hero\.svg/);
  assert.match(bundle.files['sitemap.xml'], /https:\/\/synthetic-preview\.invalid/);
});

test('removes executable, remote, and lead-submission seams without fetching', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error('unexpected fetch'); }) as typeof fetch;
  try {
    const bundle = buildSyntheticLocalPreview(input());
    for (const page of bundle.manifest.pages) {
      const html = bundle.files[page];
      assert.doesNotMatch(html, /<script\b(?![^>]*application\/ld\+json)/i);
      assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/i);
      assert.doesNotMatch(html, /\b(?:tel:|mailto:|wa\.me)\b/i);
      assert.doesNotMatch(html.replaceAll(bundle.manifest.canonicalOrigin, ''), /https?:\/\//i);
      assert.doesNotMatch(html, /<a\b[^>]*href=(['"])(?:tel:|mailto:|https?:|\/\/)/i);
      if (html.includes('<form')) assert.match(html, /data-local-preview-inert="true"/);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fails closed for unsafe preview inputs and malformed bundle content', () => {
  assert.throws(() => buildSyntheticLocalPreview(input({ canonicalOrigin: 'https://example.com' })), /\.invalid/);
  assert.throws(() => buildSyntheticLocalPreview(input({ slug: '../escape' })), /safe slug/);
  assert.throws(() => buildSyntheticLocalPreview(input({ heroAsset: { sourcePath: '../hero.svg', contents: '<svg />' } })), /unsafe/);
  assert.throws(() => buildSyntheticLocalPreview(input({ heroAsset: { sourcePath: 'fixtures/site-bot/local-preview-hero.svg', contents: '' } })), /missing/);
  assert.throws(() => buildSyntheticLocalPreview(input({ graphEdges: [{ fromId: 'home', toId: 'hub' }] })), /orphan/);
  const duplicate = input();
  duplicate.pages[2] = { ...duplicate.pages[2], targetPath: '/services' };
  assert.throws(() => buildSyntheticLocalPreview(duplicate), /duplicate/);
  const bundle = buildSyntheticLocalPreview(input());
  bundle.files['../../escape.html'] = 'bad';
  assert.throws(() => assertLocalPreviewBundleSafe(bundle), /escapes/);
});

test('does not alter researched renderer behavior outside the preview seam', () => {
  const params = rendererParams();
  const before = renderResearchedSitePages(params);
  buildSyntheticLocalPreview(input());
  assert.deepEqual(renderResearchedSitePages(params), before);
});

test('builds a complete inert operator bundle without mutating the generated record', () => {
  const record = operatorRecord();
  const before = structuredClone(record);
  const bundle = buildOperatorLocalPreview({ record, heroDataUrl: pngDataUrl });

  assertLocalPreviewBundleSafe(bundle);
  assert.deepEqual(record, before);
  assert.equal(bundle.manifest.kind, 'operator-researched');
  assert.equal(bundle.manifest.synthetic, false);
  assert.equal(bundle.manifest.deployable, false);
  assert.equal(bundle.manifest.canonicalOrigin, 'https://operator-preview.invalid');
  assert.deepEqual(bundle.manifest.assets, []);
  assert.deepEqual(bundle.manifest.pages, [
    'accessibility.html',
    'contact.html',
    'index.html',
    'privacy.html',
    'services--hub.html',
    'services/synthetic-service--money.html',
  ]);
  assert.match(bundle.files['index.html'], /LOCAL OPERATOR PREVIEW - NOT PRODUCTION - NO SUBMISSION/);
  assert.match(bundle.files['index.html'], /data-local-preview-hero="true"/);
  assert.match(bundle.files['index.html'], new RegExp(pngDataUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(bundle.files['services--hub.html'], /href="\/services\/synthetic-service--money\.html"/);
  assert.match(bundle.files['sitemap.xml'], /https:\/\/operator-preview\.invalid/);
  assert.doesNotMatch(bundle.files['index.html'].replaceAll('https://operator-preview.invalid', ''), /https?:\/\//i);
});

test('operator preview rejects incomplete, mismatched, unsafe, orphan, and malformed records', () => {
  const valid = operatorRecord();
  const cases: Array<[string, ResearchedSiteGenerationRecord]> = [
    ['unsafe slug', operatorRecord({ slug: '../escape' })],
    ['missing research id', operatorRecord({ researchId: '' })],
    ['mismatched home id', operatorRecord({ approvedPageId: 'hub' })],
    ['mismatched home copy', operatorRecord({ copy: copy('Different') })],
    ['missing pages', operatorRecord({ researchedPages: [] })],
    ['missing graph', { ...operatorRecord(), researchedGraphEdges: undefined as unknown as ResearchedSiteGenerationRecord['researchedGraphEdges'] }],
    ['orphan page', operatorRecord({ researchedGraphEdges: [{ fromId: 'home', toId: 'hub' }] })],
    ['malformed copy', operatorRecord({ researchedPages: valid.researchedPages.map((page, index) => index ? page : { ...page, copy: { ...page.copy, heroHeadline: '' } }) })],
  ];
  for (const [name, record] of cases) {
    assert.throws(() => buildOperatorLocalPreview({ record, heroDataUrl: pngDataUrl }), name);
  }
  const duplicate = structuredClone(valid);
  duplicate.researchedPages[2].opportunityId = 'hub';
  assert.throws(() => buildOperatorLocalPreview({ record: duplicate, heroDataUrl: pngDataUrl }), /unique/i);
});

test('operator preview accepts only bounded PNG, JPEG, or WebP data and no undeclared data URL', () => {
  const record = operatorRecord();
  for (const heroDataUrl of [
    'https://example.invalid/hero.png',
    'data:image/svg+xml;base64,PHN2Zy8+',
    'data:image/png;base64,not-base64!',
    'data:image/png;base64,R0lGODlhAQABAAAAACw=',
    `data:image/png;base64,${Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64')}`,
  ]) assert.throws(() => buildOperatorLocalPreview({ record, heroDataUrl }), /hero/i);

  const bundle = buildOperatorLocalPreview({ record, heroDataUrl: pngDataUrl });
  bundle.files['index.html'] = bundle.files['index.html'].replace('</body>', '<img src="data:image/png;base64,AAAA" /></body>');
  assert.throws(() => assertLocalPreviewBundleSafe(bundle), /data URL/i);
});

test('operator preview has no ambient provider or network fallback and preserves synthetic serialization', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error('unexpected fetch'); }) as typeof fetch;
  try {
    buildOperatorLocalPreview({ record: operatorRecord(), heroDataUrl: pngDataUrl });
  } finally {
    globalThis.fetch = originalFetch;
  }
  const manifest = buildSyntheticLocalPreview(input()).files['preview-manifest.json'];
  assert.deepEqual(Object.keys(JSON.parse(manifest)), [
    'synthetic', 'deployable', 'canonicalOrigin', 'formsDisabled', 'outboundInteractionsDisabled', 'pages', 'assets',
  ]);
});
