// Test kit (not a test file): the fixture site of the visual-pack tests and screenshots (siteLook.test.ts,
// scripts/site-bot-look.mjs preview). HEBREW-SAFETY: this module contains ZERO Hebrew bytes; Hebrew values are read from
// the read-only data/sites/test-plumber-tlv.json record.
import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from './lpCopyPrompt';
import type { RenderResearchedSitePagesParams, ResearchedSitePage } from './researchedSite';
import { VERTICAL_ASSETS } from './verticalAssets';
import { VERTICAL_THEMES } from './verticalThemes';

const ROOT = path.resolve(__dirname, '../../..');

const latinCopy = (headline: string): SiteCopy => ({
  heroHeadline: headline, heroSubheadline: `${headline} sub`, heroCta: 'Call', trustBarItems: ['Fact one', 'Fact two'],
  aboutBlurb: 'About', servicesHeadline: 'Services', serviceItems: ['Alpha'], faqHeadline: 'FAQ', faqItems: [{ q: 'Q one?', a: 'A one.' }],
  guaranteeBlock: null, reviewFeatured: 'Great job', reviewContext: null, responseTimeBadge: null, scarcityLine: null,
  formHeadline: 'Write to us', stickyBarLine: 'Caption', aboutPageHeadline: 'About', aboutPageBody: 'About body', serviceDetails: [],
} as unknown as SiteCopy);

/**
 * Render params of the fixture site: the homepage carries the Hebrew copy of data/sites/test-plumber-tlv.json (read-only),
 * two Latin service pages carry a breadcrumb (seo set). `root` overrides the repo root (the CLI runs from elsewhere).
 */
export function lookFixtureParams(root: string = ROOT): RenderResearchedSitePagesParams {
  const record = JSON.parse(fs.readFileSync(path.join(root, 'data', 'sites', 'test-plumber-tlv.json'), 'utf8')) as { collectedData: CollectedData; copy: SiteCopy };
  const data = record.collectedData;
  const home: ResearchedSitePage = {
    opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: record.copy,
    seo: { name: String(data.businessNiche ?? ''), city: data.targetLocation ?? null, serviceArea: [] },
  };
  const alpha: ResearchedSitePage = { opportunityId: 'svc-alpha', classification: 'money_service', targetPath: '/services/alpha-repair', copy: latinCopy('Alpha hook'), seo: { name: 'Alpha Repair', city: null, serviceArea: [] } };
  const gamma: ResearchedSitePage = { opportunityId: 'svc-gamma', classification: 'money_service', targetPath: '/services/gamma', copy: latinCopy('Gamma hook'), seo: { name: 'Gamma', city: null, serviceArea: [] } };
  return {
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'],
    data, heroImageUrl: VERTICAL_ASSETS['emergency-trades'].heroImages[0].url, slug: 'look-fixture', siteUrl: 'https://look-fixture.wao.co.il',
    pages: [home, alpha, gamma],
    graphEdges: [{ fromId: 'home', toId: 'svc-alpha' }, { fromId: 'home', toId: 'svc-gamma' }, { fromId: 'svc-alpha', toId: 'home' }, { fromId: 'svc-gamma', toId: 'home' }],
  };
}
