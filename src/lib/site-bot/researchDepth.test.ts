// Content depth (2026-11-10): NeuronWriter data -> applyNeuron -> service briefs (lengthBand, filtered suggestedTerms,
// questionPool, blocksEnabled), on the real Hebrew fixture and on the zero-network fixture providers.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes (Hebrew comes from the captured fixture file only).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import { copyGateContext, serviceAreaHits } from '../lp/copyGates';
import { ISRAELI_LOCALITIES } from './israeliLocalities';
import { runResearchToSite } from './researchToSite';
import { buildDepthFilters, competitorBrandWords, namesOtherLocality } from './research/depthFilters';
import { fixtureResearchProviders } from './research/fixtureProviders';
import { getServiceQuery, type NeuronServiceQuery } from './research/neuronWriter';
import {
  assertBoundedPageBrief,
  buildQuestionPool,
  compilePageBrief,
  DEPTH_WORD_CEILING,
  DEPTH_WORD_FLOOR,
  filterSuggestedTerms,
  lengthBandFor,
  MAX_QUESTION_POOL,
  type PageBrief,
  type PageBriefInput,
} from './research/pageBrief';
import { applyNeuron, neuronQuestions, runSiteResearch } from './research/runResearch';
import { readResearchDossier } from './research/researchStore';
import type { SiteResearchDossier } from './research/types';

const FIXTURE_PATH = path.join(process.cwd(), 'src/lib/site-bot/research/testdata/neuronwriter-get-query-he.json');
const raw = (): Record<string, unknown> => JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) as Record<string, unknown>;

async function realQuery(): Promise<NeuronServiceQuery> {
  const response = raw();
  const keyword = String(response.keyword);
  return getServiceQuery(String(response.query), { serviceKeyword: keyword, intentCluster: keyword }, {
    apiKey: 'test', fetch: (async () => new Response(JSON.stringify(response))) as typeof globalThis.fetch,
  });
}

function emptyDossier(): SiteResearchDossier {
  const t = '2026-11-10T00:00:00.000Z';
  return {
    researchId: 'depth-1', status: 'researching', createdAt: t, updatedAt: t,
    businessTruth: { businessName: 'TEST', status: 'verified', assertions: [] },
    evidence: [], evidenceEdges: [], keywordEvidence: [], serpObservations: [], pageOpportunities: [], internalLinkEdges: [], providerUsage: [], humanGates: [],
  };
}

test('applyNeuron stores wordTarget, h2Terms, bodyTerms {t,min,max}, entities and questions per service keyword', async () => {
  const query = await realQuery();
  const dossier = emptyDossier();
  applyNeuron(dossier, query, () => new Date('2026-11-10T00:00:00.000Z'));
  const stored = dossier.neuronQueries?.[query.serviceKeyword];
  assert.ok(stored);
  assert.equal(stored.status, 'ready');
  assert.equal(stored.queryId, query.id);
  assert.equal(stored.wordTarget, query.wordTarget);
  assert.deepEqual(stored.h2Terms, query.h2Terms);
  assert.equal(stored.bodyTerms.length, query.bodyTermUsage?.length);
  assert.deepEqual(Object.keys(stored.bodyTerms[0]).sort(), ['max', 'min', 't', 'tier']);
  assert.deepEqual(stored.entities, query.entities);
  assert.deepEqual(stored.questions, neuronQuestions(query));
  assert.equal(stored.competitorTitles.length, query.competitors.length);
  // The query evidence node is unchanged (still the provenance record of the analysis).
  assert.ok(dossier.evidence.some(item => item.id.startsWith('neuron-query:') && item.providerRecordId === query.id));
  // A not-ready analysis stores no data.
  applyNeuron(dossier, { ...query, status: 'waiting' }, () => new Date());
  assert.deepEqual(dossier.neuronQueries?.[query.serviceKeyword].bodyTerms, []);
  assert.equal(dossier.neuronQueries?.[query.serviceKeyword].wordTarget, undefined);
});

test('neuronQuestions: PAA first, then suggested, topic matrix and content questions, deduped', () => {
  const base = { suggestedQuestions: ['b?', 'a?'], paaQuestions: ['a?'], topicQuestions: ['c?', 'B?'], contentQuestions: ['d?'] } as Partial<NeuronServiceQuery>;
  assert.deepEqual(neuronQuestions(base as NeuronServiceQuery), [
    { question: 'a?', source: 'paa' }, { question: 'b?', source: 'suggested' }, { question: 'c?', source: 'topic' }, { question: 'd?', source: 'content' },
  ]);
});

test('lengthBand = clamp(NeuronWriter word target, 250, 600); no target -> the floor', () => {
  assert.deepEqual(lengthBandFor(418), { floor: DEPTH_WORD_FLOOR, target: 418, ceiling: DEPTH_WORD_CEILING });
  assert.equal(lengthBandFor(90).target, 250);
  assert.equal(lengthBandFor(1500).target, 600);
  assert.equal(lengthBandFor(undefined).target, 250);
  assert.equal(lengthBandFor(Number.NaN).target, 250);
});

test('depth filters on the real response: competitor brands, other places and area widening, other trades, prices', async () => {
  const query = await realQuery();
  const usage = query.bodyTermUsage ?? [];
  const basic = usage.filter(term => term.tier === 'basic');
  // From the fixture (never retyped): the base city is a basic term, the keyword is "<trade> b<city>".
  const city = basic[5].t;
  const keyword = query.serviceKeyword;
  const gates = copyGateContext({ businessNiche: basic[0].t, targetLocation: city, specificCities: city }, [keyword], true, [city]);
  const filters = buildDepthFilters({
    competitorTitles: query.competitors.flatMap(item => (item.title ? [item.title] : [])),
    basicTerms: basic.map(term => term.t),
    anchorText: [keyword, city].join(' '),
    ownerPlaces: [city],
    localities: ISRAELI_LOCALITIES,
    siteVertical: 'emergency-trades',
    widensArea: text => serviceAreaHits(text, gates).length > 0,
    keyword,
  });
  const at = (index: number) => usage[index].t;
  // Index map of the captured response (2026-11-10): 25 = a competitor's TV-show brand, 35 = a directory site brand,
  // 61 = "<trade> b<first word of another two-word town>", 49 / 50 = "... and surroundings" / "the <city> area", 68 = renovation.
  assert.equal(filters.competitorBrand?.(at(25)), true);
  assert.equal(filters.competitorBrand?.(at(35)), true);
  assert.equal(filters.otherPlace?.(at(61)), true);
  assert.equal(filters.otherPlace?.(at(49)), true);
  assert.equal(filters.otherPlace?.(at(50)), true);
  assert.equal(filters.unofferedService?.(at(68)), true);
  // Kept: ordinary trade terms, the city itself, and an ordinary word that also starts a town name (43, "the house").
  for (const index of [0, 1, 3, 6, 43]) {
    assert.equal([filters.competitorBrand, filters.otherPlace, filters.unofferedService, filters.price].some(check => check?.(at(index))), false, `index ${index}`);
  }
  assert.equal(filters.price?.('price 300'), true);
  assert.equal(filters.latinAllowed, false);
  const kept = filterSuggestedTerms(usage, filters);
  assert.ok(kept.length > 0 && kept.length <= 24);
  assert.ok(!kept.some(term => [25, 35, 49, 50, 61, 68].map(at).includes(term.t)));
  assert.ok(kept.every(term => !/[A-Za-z]/.test(term.t)));
  // Brand words never include the basic (generic) terms or the anchor words.
  const brands = competitorBrandWords(query.competitors.flatMap(item => (item.title ? [item.title] : [])), basic.map(term => term.t), [keyword, city].join(' '));
  assert.ok(!brands.has(basic[0].t) && !brands.has(city));
  assert.equal(namesOtherLocality(at(43), ISRAELI_LOCALITIES, [city]), false);
});

test('filterSuggestedTerms: Latin terms only on a Latin keyword, deduped, valid ranges, capped; questionPool deduped, at most 8', () => {
  const terms = [{ t: 'Alpha', min: 1, max: 2 }, { t: 'alpha', min: 1, max: 2 }, { t: 'Beta', min: 3, max: 1 }, { t: 'Gamma 7', min: 1, max: 1 }];
  assert.deepEqual(filterSuggestedTerms(terms), []);
  assert.deepEqual(filterSuggestedTerms(terms, { latinAllowed: true }), [{ t: 'Alpha', min: 1, max: 2 }, { t: 'Gamma 7', min: 1, max: 1 }]);
  assert.deepEqual(filterSuggestedTerms(terms, { latinAllowed: true, price: text => /\d/.test(text) }), [{ t: 'Alpha', min: 1, max: 2 }]);
  const questions = Array.from({ length: 12 }, (_, index) => ({ question: `Question ${index % 10}?`, source: 'content' as const }));
  const pool = buildQuestionPool([{ question: 'Brand question?', source: 'paa' }, ...questions], { competitorBrand: text => text.startsWith('Brand') });
  assert.equal(pool.length, MAX_QUESTION_POOL);
  assert.deepEqual(pool.map(item => item.id), Array.from({ length: 8 }, (_, index) => `question-${index + 1}`));
  assert.equal(new Set(pool.map(item => item.question.toLowerCase())).size, pool.length);
  assert.ok(!pool.some(item => item.question.startsWith('Brand')));
});

function briefInput(overrides: Partial<PageBriefInput> = {}): PageBriefInput {
  const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
  return {
    page: { id: 'svc-alpha', targetPath: '/services/alpha', pageClass: 'money_service' },
    persona: approved('persona', 'A local customer'), waoOffer: approved('offer', 'TEST Biz: careful work'),
    targetQueries: [approved('query-1', 'alpha service')], entityAnchors: [approved('entity-1', 'alpha service')],
    firstPartyProof: [approved('proof-yearsInField', 'Years in the field (owner-stated): 12')], localFacts: [], customerDecisions: [], constraints: [],
    links: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [],
    depth: {
      wordTarget: 420,
      terms: [{ t: 'alpha', min: 1, max: 3 }],
      questions: [{ question: 'One?', source: 'paa' }, { question: 'Two?', source: 'topic' }, { question: 'Three?', source: 'content' }],
      serviceFacts: [approved('service-walkthrough', 'How a typical job runs (owner\'s own words): call, visit, fix')],
      filters: { latinAllowed: true },
    },
    ...overrides,
  };
}

test('service briefs: lengthBand, filtered suggestedTerms, questionPool, blocksEnabled from the facts that exist; bounded check', () => {
  const brief = compilePageBrief(briefInput());
  assert.deepEqual(brief.lengthBand, { floor: 250, target: 420, ceiling: 600 });
  assert.deepEqual(brief.suggestedTerms, [{ t: 'alpha', min: 1, max: 3 }]);
  assert.deepEqual(brief.questionPool?.map(item => [item.id, item.source]), [['question-1', 'paa'], ['question-2', 'topic'], ['question-3', 'content']]);
  assert.deepEqual(brief.blocksEnabled, { process: true, qa: true, proof: true });
  assert.deepEqual(brief.serviceFacts?.map(item => item.id), ['service-walkthrough']);
  assert.doesNotThrow(() => assertBoundedPageBrief(JSON.parse(JSON.stringify(brief))));
  // No service facts -> no B1; fewer than 3 questions -> no B4; no proof -> no B6.
  const thin = compilePageBrief(briefInput({ firstPartyProof: [], depth: { terms: [], questions: [{ question: 'One?', source: 'paa' }] } }));
  assert.deepEqual(thin.blocksEnabled, { process: false, qa: false, proof: false });
  assert.equal(thin.lengthBand?.target, 250);
  // No depth input (homepage, legacy) -> no depth fields at all.
  const legacy = compilePageBrief(briefInput({ depth: undefined }));
  for (const key of ['lengthBand', 'suggestedTerms', 'questionPool', 'blocksEnabled', 'serviceFacts']) assert.ok(!(key in legacy), key);
  // Request briefs: malformed depth fields are rejected.
  const bad = (patch: Partial<PageBrief>) => () => assertBoundedPageBrief({ ...JSON.parse(JSON.stringify(brief)), ...patch });
  assert.throws(bad({ lengthBand: { floor: 600, target: 250, ceiling: 300 } }), /Invalid bounded page brief/);
  assert.throws(bad({ suggestedTerms: [{ t: 'x', min: 3, max: 1 }] }), /Invalid bounded page brief/);
  assert.throws(bad({ questionPool: Array.from({ length: 9 }, (_, index) => ({ id: `question-${index}`, question: 'Q?', source: 'paa' as const })) }), /Invalid bounded page brief/);
  assert.throws(bad({ blocksEnabled: { process: true, qa: 'yes', proof: false } as never }), /Invalid bounded page brief/);
});

const data: CollectedData = {
  businessName: 'TEST Depth Plumbing',
  businessNiche: 'plumber',
  primaryService: 'leak detection',
  secondaryServices: 'drain unblocking',
  priorityServices: ['leak detection'],
  serviceModel: 'field',
  targetLocation: 'Holon',
  specificCities: 'Holon, Bat Yam',
  travelBoundary: '15 km from Holon',
  usp: 'Camera leak detection, two-year warranty',
  yearsInField: '12',
  phone: '050-0000000',
  jobWalkthrough: 'He calls, I come the same day, I find the leak with the camera, I fix it and clean up.',
};

const copy: SiteCopy = {
  heroHeadline: 'Headline', heroSubheadline: 'Subheadline', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: ['Alpha'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Guarantee',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky',
  aboutPageHeadline: 'About page', aboutPageBody: 'About page body', serviceDetails: [{ name: 'Alpha', description: 'Description' }],
};

test('fixture providers: NeuronWriter data reaches the dossier and the service briefs (offline eval path)', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'depth-orch-'));
  const briefs: PageBrief[] = [];
  try {
    const outcome = await runResearchToSite({ slug: 'depth-unit-plumbing', researchId: 'depth-unit-a', collectedData: data }, {
      researchBaseDir: path.join(root, 'site-research'), sitesRoot: path.join(root, 'sites'), now: () => new Date('2026-11-10T00:00:00.000Z'),
      runResearch: (id, input, options = {}) => runSiteResearch(id, input, { ...options, providers: fixtureResearchProviders() }),
      generateCopy: async brief => { briefs.push(brief); return copy; },
    });
    assert.equal(outcome.status, 'generated', JSON.stringify(outcome));
    const dossier = await readResearchDossier('depth-unit-a', path.join(root, 'site-research'));
    const stored = Object.values(dossier?.neuronQueries ?? {});
    assert.ok(stored.length > 0);
    assert.ok(stored.every(item => item.status === 'ready' && item.wordTarget === 420 && item.bodyTerms.length === 3 && item.questions[0].source === 'paa'));
    const [home, ...services] = briefs;
    assert.equal(home.page.pageClass, 'homepage');
    assert.ok(!('lengthBand' in home) && !('blocksEnabled' in home), 'the homepage brief is unchanged');
    assert.equal(services.length, 2);
    for (const brief of services) {
      assert.equal(brief.page.pageClass, 'money_service');
      assert.deepEqual(brief.lengthBand, { floor: 250, target: 420, ceiling: 600 });
      assert.ok((brief.suggestedTerms ?? []).length > 0, brief.page.id);
      assert.ok((brief.questionPool ?? []).length >= 3 && (brief.questionPool ?? []).length <= 8, brief.page.id);
      assert.equal(brief.blocksEnabled?.qa, true);
      assert.equal(brief.blocksEnabled?.proof, true);
    }
    // The walkthrough goes to the primary service's page only (never the same steps on every page).
    const byId = new Map(services.map(brief => [brief.page.id, brief]));
    assert.equal(byId.get('svc-leak-detection')?.blocksEnabled?.process, true);
    assert.equal(byId.get('svc-drain-unblocking')?.blocksEnabled?.process, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
