// Rerun-3b item F (Noa): electrician-2's three service pages shipped one shared meta description. The meta description is
// the page's heroSubheadline (researchedSite pageHead), so gate_duplicate_meta_description holds it unique across the site:
// a heroSubheadline equal to an earlier page's (after normalisation) blocks and goes to the model's repair. No text is
// invented by code. HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import { siteGenerationContext } from '../site-bot/researchedSiteGeneration';
import type { SiteCopy } from './lpCopyPrompt';
import { copyGateContext, duplicateMetaDescription, GATE_RULES, metaDescriptionKey, runCopyGates } from './copyGates';
import { generateResearchPageCopy, ungeneratedFieldsFor, type CopyRepairEvent } from './researchPageCopy';

test('meta key: case, punctuation and spacing do not make two descriptions different', () => {
  assert.equal(metaDescriptionKey('  I explain the quote, line by line. '), 'i explain the quote line by line');
  assert.equal(duplicateMetaDescription('I explain the quote - line by line', ['Other', 'i explain the quote, line by line.']), true);
  assert.equal(duplicateMetaDescription('I explain the quote', ['I explain the quote line by line']), false, 'a prefix is not a duplicate');
  assert.equal(duplicateMetaDescription('', ['']), false);
});

test('gate: a heroSubheadline equal to an earlier page\'s is a blocking hit on heroSubheadline; the first page is free', () => {
  const ctx = copyGateContext({}, [], true, [], { researchSite: true });
  const copy = { heroSubheadline: 'I explain the quote line by line' };
  assert.deepEqual(runCopyGates(copy, ctx).filter(hit => hit.rule === GATE_RULES.duplicateMetaDescription), []);
  const later = { ...ctx, priorHeroSubheadlines: ['Something else', 'I explain the quote, line by line.'] };
  assert.deepEqual(runCopyGates(copy, later).filter(hit => hit.rule === GATE_RULES.duplicateMetaDescription), [{ field: 'heroSubheadline', rule: GATE_RULES.duplicateMetaDescription }]);
});

test('site context carries every earlier page\'s heroSubheadline', () => {
  const page = (sub: string, classification: string) => ({ copy: { heroSubheadline: sub } as SiteCopy, classification });
  assert.deepEqual(siteGenerationContext([page('Home sub', 'homepage'), page('Panel sub', 'money_service')]).priorHeroSubheadlines, ['Home sub', 'Panel sub']);
});

test('end to end (mocked model): a duplicate subheadline gets one repair and the page keeps the new one', async () => {
  const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
  const page = compilePageBrief({
    page: { id: 'svc-panel', targetPath: '/services/panel', pageClass: 'money_service' },
    persona: approved('persona', 'A local customer in Holon'), waoOffer: approved('offer', 'TEST Biz'),
    targetQueries: [approved('query-1', 'panel upgrade Holon')], entityAnchors: [approved('entity-1', 'panel upgrade')],
    firstPartyProof: [], localFacts: [approved('local-area', 'Service area (owner-stated): Holon')],
    customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [], links: [],
    site: { pageName: 'panel upgrade', relevanceTerm: 'panel upgrade', city: 'Holon', serviceArea: ['Holon'], serviceLabels: ['panel upgrade'], businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: false },
  } as PageBriefInput);
  const data: CollectedData = { businessName: 'TEST Biz', businessNiche: 'electrician', targetLocation: 'Holon', specificCities: 'Holon', phone: '050-0000000' };
  const shared = 'I explain the quote line by line before I start';
  const fresh = 'I replace the old panel and test every circuit';
  const answer = Object.fromEntries(Object.entries({
    heroHeadline: 'panel upgrade in Holon', heroSubheadline: shared, heroCta: 'Call', trustBarItems: [], aboutBlurb: '', servicesHeadline: 'Services',
    serviceItems: ['panel upgrade'], faqHeadline: '', faqItems: [], guaranteeBlock: null, reviewFeatured: null, reviewContext: null, responseTimeBadge: null,
    scarcityLine: null, formHeadline: 'Form', stickyBarLine: '', aboutPageHeadline: '', aboutPageBody: '', serviceDetails: [],
  }).filter(([key]) => !ungeneratedFieldsFor(page).includes(key)));
  const events: CopyRepairEvent[] = [];
  const copy = await generateResearchPageCopy(page, data, {
    priorHeroSubheadlines: ['Home sub', shared],
    onEvent: event => events.push(event),
    callJson: async (system, user) => {
      if (/repairing specific fields/.test(system)) return JSON.stringify({ heroSubheadline: fresh });
      return JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : answer);
    },
  });
  const repairs = events.filter(event => event.kind === 'repair' && (event.violations ?? []).some(item => item.rule === GATE_RULES.duplicateMetaDescription));
  assert.equal(repairs.length, 1, JSON.stringify(events.map(event => [event.stage, event.kind, (event.violations ?? []).map(item => item.rule)])));
  assert.equal(copy.heroSubheadline, fresh);
});
