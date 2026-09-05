import assert from 'node:assert/strict';
import test from 'node:test';

import { renderStaticHtml } from './renderStaticHtml';
import { renderSitePages } from './renderSitePages';
import { renderResearchedSitePages } from './researchedSite';
import { renderCoreThirtyPages } from './renderCoreThirtyPages';
import { buildPrivacyHtml, buildAccessibilityHtml } from './legalPages';
import { verifyFraudBlockerRenderedPages, verifyFraudBlockerTracker } from '../fraud-blocker/renderIntegration';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { SiteCopy } from './lpCopyPrompt';

const sid = 'sid_renderers_1';
const theme = VERTICAL_THEMES['emergency-trades'];
const assets = VERTICAL_ASSETS['emergency-trades'];
const data = { businessName: 'Fixture Business', businessNiche: 'plumber', phone: '050-0000000' };
const copy: SiteCopy = {
  heroHeadline: 'Headline', heroSubheadline: 'Subheadline', heroCta: 'Contact', trustBarItems: ['Trusted'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: ['Service'], faqHeadline: 'FAQ', faqItems: [{ q: 'Question?', a: 'Answer.' }],
  guaranteeBlock: 'Guarantee', reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null,
  formHeadline: 'Form', stickyBarLine: 'Sticky', aboutPageHeadline: 'About', aboutPageBody: 'About body',
  serviceDetails: [{ name: 'Service', description: 'Description' }],
};
const common = { theme, assets, data, heroImageUrl: 'https://example.test/hero.jpg', slug: 'fixture', siteUrl: 'https://fixture.wao.co.il', fraudBlockerSid: sid };

function assertSingleTracker(html: string): void {
  assert.deepEqual(verifyFraudBlockerTracker(html, sid), { valid: true, scriptCount: 1, fallbackCount: 1 });
}

test('all controlled renderer variants include one tracker, including legal pages', () => {
  const lp = renderStaticHtml({ ...common, copy, mode: 'ads-lp' });
  assertSingleTracker(lp);

  const standard = renderSitePages({ ...common, copy });
  assert.deepEqual(verifyFraudBlockerRenderedPages(standard, sid), { valid: true, invalidPaths: [] });
  assert.equal(standard['sitemap.xml'].includes('fraudblocker.com'), false);

  const researched = renderResearchedSitePages({
    ...common,
    pages: [
      { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy },
      { opportunityId: 'service', classification: 'money_service', targetPath: '/service', copy },
    ],
    graphEdges: [{ fromId: 'home', toId: 'service' }],
  });
  assert.deepEqual(verifyFraudBlockerRenderedPages(researched, sid), { valid: true, invalidPaths: [] });
  assert.equal(researched['sitemap.xml'].includes('fraudblocker.com'), false);

  const core = renderCoreThirtyPages({
    ...common,
    nodes: [{ id: 'service-city', service: 'Service', city: 'City', locationType: 'service-area' }],
    copies: new Map([['service-city', {
      pageHeadline: 'Page', narrative: 'Narrative', faqItems: [{ q: 'Question?', a: 'Answer.' }], metaDescription: 'Description',
      localRelevanceNote: 'Note', formHeadline: 'Form', ctaLabel: 'Contact',
    }]]),
  });
  assert.deepEqual(verifyFraudBlockerRenderedPages(core, sid), { valid: true, invalidPaths: [] });

  assertSingleTracker(buildPrivacyHtml({ theme, data, canonicalUrl: 'https://fixture.wao.co.il/privacy.html', homeHref: '/', fraudBlockerSid: sid }));
  assertSingleTracker(buildAccessibilityHtml({ theme, data, canonicalUrl: 'https://fixture.wao.co.il/accessibility.html', homeHref: '/', fraudBlockerSid: sid }));
});
