// Rerun-3 bug 1: a serviceDetails card name must equal an owner-confirmed service label character for character, so a label
// longer than the fixed card-name limit (25) made the homepage impossible to pass. The card-name limit is now derived from the
// labels (an exact label keeps its own length; any other name keeps the fixed limit).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes (the 27-character label is Latin; the rule is length-only).
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import {
  assertBoundedGeneratedSiteCopy,
  buildNoaQaMessage,
  buildSiteCopyHardLimitsBlock,
  explainGeneratedSiteCopyViolations,
  layoutFor,
  longServiceLabelChars,
  researchedRecordShapeOptions,
  shapeOptions,
  SITE_COPY_PAIR_LIST_LIMITS,
  withSystemFields,
} from './researchPageCopy';
import type { SiteCopy } from './lpCopyPrompt';

const LONG = 'ev charger installation xyz';
const LABELS = ['panel upgrade', 'emergency electrician', LONG];

const data: CollectedData = { businessName: 'TEST Biz', businessNiche: 'electrician', targetLocation: 'Holon', specificCities: 'Holon', phone: '050-0000000' };

function homeBrief(labels: string[] = LABELS): PageBrief {
  const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
  return compilePageBrief({
    page: { id: 'home', targetPath: '/', pageClass: 'homepage' },
    persona: approved('persona', 'A local customer in Holon'),
    waoOffer: approved('offer', 'TEST Biz'),
    targetQueries: [approved('query-1', 'electrician Holon')],
    entityAnchors: [approved('entity-1', 'electrician')],
    firstPartyProof: [], localFacts: [approved('local-area', 'Service area (owner-stated): Holon')],
    customerDecisions: [], constraints: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [],
    links: [],
    site: { pageName: 'electrician', relevanceTerm: 'electrician', city: 'Holon', serviceArea: ['Holon'], serviceLabels: labels, businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: true },
  } as PageBriefInput);
}

const copy = (name: string): SiteCopy => ({
  heroHeadline: 'Electrician in Holon', heroSubheadline: 'Subheadline', heroCta: 'Call', trustBarItems: ['Holon'],
  aboutBlurb: 'About', servicesHeadline: 'Services', serviceItems: ['panel upgrade'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: null,
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky',
  aboutPageHeadline: 'About page', aboutPageBody: 'About body.',
  serviceDetails: [{ name: 'panel upgrade', description: 'I open the panel and check every breaker.' }, { name, description: 'I run a dedicated line to the charger.' }],
});

test('the fixture label is 27 characters, over the fixed card-name limit', () => {
  assert.equal(LONG.length, 27);
  assert.equal(SITE_COPY_PAIR_LIST_LIMITS.serviceDetails.maxChars[0], 25);
  assert.equal(longServiceLabelChars(LABELS), 27);
  assert.equal(longServiceLabelChars(['short']), 0);
});

test('a card name equal to a 27-character owner label passes the generation and the stored-record validators', () => {
  const brief = homeBrief();
  const value = copy(LONG);
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy(value, shapeOptions(brief)));
  assert.deepEqual(explainGeneratedSiteCopyViolations(value, shapeOptions(brief)), []);
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy(value, researchedRecordShapeOptions('homepage', LABELS)));
  // The settled page (system fields applied) passes too.
  const settled = withSystemFields({ ...value } as unknown as Record<string, unknown>, brief, data);
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy(settled, shapeOptions(brief)));
});

test('a 27-character card name that is not an owner label still fails at the fixed limit', () => {
  const brief = homeBrief();
  const other = 'ev charger installation abc';
  assert.equal(other.length, 27);
  assert.throws(() => assertBoundedGeneratedSiteCopy(copy(other), shapeOptions(brief)));
  assert.deepEqual(explainGeneratedSiteCopyViolations(copy(other), shapeOptions(brief)), [{ field: 'serviceDetails[1].name', rule: 'max_length', limit: 25, actual: 27 }]);
  // Without the labels (old stored-record call) the fixed limit applies.
  assert.throws(() => assertBoundedGeneratedSiteCopy(copy(LONG), researchedRecordShapeOptions('homepage')));
});

test('the prompt hard limits state the label exception only when a label is longer than the limit', () => {
  const long = buildSiteCopyHardLimitsBlock('HARD LIMITS', [], layoutFor(homeBrief()));
  assert.ok(long.includes('exactly one of the owner-confirmed service names keeps that name\'s length, up to 27 characters'));
  const short = buildSiteCopyHardLimitsBlock('HARD LIMITS', [], layoutFor(homeBrief(['panel upgrade'])));
  assert.equal(short.includes('owner-confirmed service names keeps'), false);
  const { serviceLabels: _unused, ...withoutLabels } = layoutFor(homeBrief());
  void _unused;
  assert.equal(short, buildSiteCopyHardLimitsBlock('HARD LIMITS', [], withoutLabels), 'unchanged without long labels');
  assert.ok(buildNoaQaMessage(copy(LONG), homeBrief()).includes('up to 27 characters'));
});
