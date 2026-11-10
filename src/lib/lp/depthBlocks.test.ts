// Content depth (2026-11-10): B1 process, B4 Q&A, B6 proof on service pages: shapes, the fact-trace and term-density gates
// (hard), the cross-client similarity helper (warn), generation plumbing, and rendering.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes (Hebrew comes from the captured NeuronWriter fixture and escapes).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import { compilePageBrief, type PageBrief, type PageBriefInput } from '../site-bot/research/pageBrief';
import { GATE_RULES, isWarningHit, runCopyGates } from './copyGates';
import {
  countTermOccurrences,
  crossClientSimilarity,
  CROSS_CLIENT_JACCARD_MAX,
  DEPTH_BLOCK_KEYS,
  factTraceHits,
  mergeDepthBlocks,
  ngramJaccard,
  settleDepthBlocks,
  termDensityHits,
  termLimit,
  stemSet,
} from './depthBlocks';
import { PREFIX_LETTERS } from './hebrewPrefixLetters';
import type { SiteCopy } from './lpCopyPrompt';
import {
  applySafeDeterministicFixes,
  assertBoundedGeneratedSiteCopy,
  briefGateContext,
  buildDepthSection,
  buildResearchPageGenerationPrompt,
  carryOptionalFields,
  depthLengthNote,
  depthPage,
  gateViolations,
  generateResearchPageCopy,
  withSystemFields,
} from './researchPageCopy';
import { renderResearchedSitePages, researchedGatedFieldsFor, researchedRenderedFieldsFor, type ResearchedSitePage } from './researchedSite';
import { RESEARCHED_SITE_LABELS } from './researchedSiteLabels';
import { VERTICAL_ASSETS } from './verticalAssets';
import { VERTICAL_THEMES } from './verticalThemes';
import { setOwnerFactTemplatesForTests } from './ownerFactCopy';

// Copy v2 (2026-11-10): these tests cover the model-written v1 path (kept for the A/B and as the pending fallback), so the
// fact templates are forced pending here. The live code-owned path: ownerFactWiring, promptV2, factRestatement, repetitionBudget.
setOwnerFactTemplatesForTests(null);

const HEBREW = /[\u0590-\u05FF]/;
type Loose = Record<string, unknown>;

const data: CollectedData = {
  businessName: 'TEST Biz', businessNiche: 'plumber', primaryService: 'leak repair', targetLocation: 'Holon', specificCities: 'Holon',
  yearsInField: '12', usp: 'I find the leak before I open anything', phone: '050-0000000',
};

function depthBriefInput(overrides: Partial<PageBriefInput> = {}): PageBriefInput {
  const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
  return {
    page: { id: 'svc-leak-repair', targetPath: '/services/leak-repair', pageClass: 'money_service' },
    persona: approved('persona', 'A local customer in Holon who needs leak repair now'),
    waoOffer: approved('offer', 'TEST Biz: I find the leak before I open anything'),
    targetQueries: [approved('query-1', 'leak repair Holon')],
    entityAnchors: [approved('entity-1', 'leak repair')],
    firstPartyProof: [approved('proof-yearsInField', 'Years in the field (owner-stated): 12')],
    localFacts: [approved('local-area', 'Service area (owner-stated): Holon')],
    customerDecisions: [], constraints: [], links: [], informationGainGaps: [], prohibitedClaims: [], faqCandidates: [],
    site: {
      pageName: 'leak repair', relevanceTerm: 'leak repair', city: 'Holon', serviceArea: ['Holon'], serviceLabels: ['leak repair'],
      businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: false,
    },
    depth: {
      wordTarget: 420,
      terms: [{ t: 'leak', min: 1, max: 3 }, { t: 'Holon', min: 1, max: 4 }],
      questions: [{ question: 'How fast?', source: 'paa' }, { question: 'Do you open walls?', source: 'topic' }, { question: 'Since when?', source: 'content' }],
      serviceFacts: [approved('service-walkthrough', 'How a typical job runs (owner\'s own words): he calls, I come, I find the leak, I fix it')],
      filters: { latinAllowed: true },
    },
    ...overrides,
  };
}

const depthBrief = (overrides: Partial<PageBriefInput> = {}): PageBrief => compilePageBrief(depthBriefInput(overrides));

const baseCopy = (): SiteCopy => ({
  heroHeadline: 'leak repair in Holon', heroSubheadline: 'Subheadline', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: ['leak repair'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: null,
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky',
  aboutPageHeadline: '', aboutPageBody: '', serviceDetails: [],
});

const blocks = (): Loose => ({
  processHeadline: 'How the job runs',
  processSteps: [
    { text: 'You call and I listen.', factIds: ['service-walkthrough'] },
    { text: 'I come and find the leak first.', factIds: ['service-walkthrough', 'offer'] },
    { text: 'I fix it.', factIds: ['service-walkthrough'] },
  ],
  qaHeadline: 'What people ask',
  qaItems: [
    { questionId: 'question-1', q: 'How fast?', a: 'TEST Biz in Holon comes to you.', factIds: ['service-walkthrough'] },
    { questionId: 'question-2', q: 'Do you open walls?', a: 'TEST Biz in Holon finds the leak before opening anything.', factIds: ['offer'] },
    { questionId: 'question-3', q: 'Since when?', a: 'TEST Biz in Holon has worked 12 years.', factIds: ['proof-yearsInField'] },
  ],
  proofHeadline: 'Facts',
  proofItems: [{ text: '12 years in the trade.', factIds: ['proof-yearsInField'] }],
});

const noDetect = { toolGroups: () => [], tellsStory: () => false };

test('term counting strips Hebrew prefix letters (real NeuronWriter terms, prefixes from the shared constant)', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/site-bot/research/testdata/neuronwriter-get-query-he.json'), 'utf8'));
  const term: string = fixture.terms.content_basic[3].t;
  const two: string = fixture.terms.content_basic[6].t;
  const [vav, , he, bet] = PREFIX_LETTERS;
  assert.equal(countTermOccurrences(`${term} x ${bet}${term}, ${vav}${he}${term}.`, term), 3);
  assert.equal(countTermOccurrences(`${he}${two} y ${two}`, two), 2);
  assert.equal(countTermOccurrences(two.split(' ')[0], two), 0);
  assert.equal(countTermOccurrences('leak, leaks; Leak', 'leak'), 2);
});

test('term density: at most the top of sugg_usage; at most once on a page under 400 words; anchor terms exempt', () => {
  assert.equal(termLimit(5, 120), 1);
  assert.equal(termLimit(5, 450), 5);
  assert.equal(termLimit(0, 450), 0);
  const copy = blocks();
  const anchors = stemSet('leak repair Holon TEST Biz');
  // 'leak' is part of the anchor (page name): exempt. 'Holon' is the city: exempt.
  assert.deepEqual(termDensityHits(copy, [{ t: 'leak', max: 1 }, { t: 'Holon', max: 1 }], 100, anchors), []);
  const hits = termDensityHits(copy, [{ t: 'leak', max: 1 }], 100, stemSet('TEST Biz'));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].limit, 1);
  assert.equal(hits[0].field, 'qaItems[1].a');
  assert.deepEqual(termDensityHits(copy, [{ t: 'leak', max: 3 }], 450, stemSet('TEST Biz')), []);
});

test('fact trace: every item cites existing facts; its numbers, tools and stories are in the cited facts', () => {
  const ctx = { factTexts: { 'proof-yearsInField': 'Years: 12', offer: 'Camera work', walk: 'call, come, fix' }, questionIds: ['question-1'] };
  const copy = (item: Loose, block = 'proofItems'): Loose => ({ [block]: [item] });
  assert.deepEqual(factTraceHits(copy({ text: '12 years.', factIds: ['proof-yearsInField'] }), ctx, noDetect), []);
  assert.equal(factTraceHits(copy({ text: 'x', factIds: [] }), ctx, noDetect)[0].kind, 'fact_ids');
  assert.equal(factTraceHits(copy({ text: 'x', factIds: ['nope'] }), ctx, noDetect)[0].kind, 'unknown_fact');
  assert.equal(factTraceHits(copy({ text: '15 years.', factIds: ['proof-yearsInField'] }), ctx, noDetect)[0].kind, 'number');
  // The number must be in the CITED facts, not merely somewhere in the brief.
  assert.equal(factTraceHits(copy({ text: '12 years.', factIds: ['walk'] }), ctx, noDetect)[0].kind, 'number');
  const tools = { toolGroups: (text: string) => (text.includes('camera') || text.includes('Camera') ? ['camera'] : []), tellsStory: (text: string) => text.includes('once') };
  assert.deepEqual(factTraceHits(copy({ text: 'With a camera.', factIds: ['offer'] }), ctx, tools), []);
  assert.equal(factTraceHits(copy({ text: 'With a camera.', factIds: ['walk'] }), ctx, tools)[0].kind, 'tool');
  assert.equal(factTraceHits(copy({ text: 'I once saved a flat.', factIds: ['walk'] }), ctx, tools)[0].kind, 'story');
  assert.equal(factTraceHits(copy({ questionId: 'question-9', q: 'Q?', a: 'A.', factIds: ['walk'] }, 'qaItems'), ctx, noDetect)[0].kind, 'question');
  // A headline has no citations: its numbers must be in some owner fact.
  assert.equal(factTraceHits({ proofHeadline: '30 years', proofItems: [{ text: 'x', factIds: ['walk'] }] }, ctx, noDetect)[0].field, 'proofHeadline');
});

test('fact trace and term density are hard gates on a depth service page (warn-only fields still block on them)', () => {
  const brief = depthBrief();
  const gates = briefGateContext(brief, data);
  assert.ok(gates.depth);
  assert.deepEqual([...gates.depth.questionIds], ['question-1', 'question-2', 'question-3']);
  const settled = withSystemFields({ ...baseCopy(), ...blocks() }, brief, data);
  assert.deepEqual(gateViolations(settled, gates).filter(hit => hit.rule === GATE_RULES.factTrace || hit.rule === GATE_RULES.termDensity), []);
  const bad: Loose = { ...settled, proofItems: [{ text: '30 years in the trade.', factIds: ['proof-yearsInField'] }] };
  const hits = runCopyGates(bad, gates).filter(hit => hit.rule === GATE_RULES.factTrace);
  assert.deepEqual(hits.map(hit => [hit.field, hit.actual]), [['proofItems[0].text', 'trace:number']]);
  assert.equal(isWarningHit(hits[0], gates), false, 'fact trace blocks even on a warn-only field');
  assert.ok(gateViolations(bad, gates).some(hit => hit.rule === GATE_RULES.factTrace));
  // Skip rather than guess: the safe fixes drop the failing item (a block left under its minimum goes, with its headline).
  const fixed = applySafeDeterministicFixes(bad, gates);
  assert.equal(fixed.value.proofItems, null);
  assert.equal(fixed.value.proofHeadline, null);
  assert.ok(fixed.fixes.includes('drop_depth_block:proofItems:1->0'));
  assert.deepEqual(gateViolations(fixed.value, gates).filter(hit => hit.rule === GATE_RULES.factTrace), []);
  // Term density: a non-anchor term over its limit on a short page.
  const dense = depthBrief({ depth: { ...depthBriefInput().depth!, terms: [{ t: 'finds', min: 1, max: 3 }] } });
  const denseGates = briefGateContext(dense, data);
  const steps: Loose = { ...withSystemFields({ ...baseCopy(), ...blocks() }, dense, data) };
  steps.processSteps = [
    { text: 'He finds me.', factIds: ['service-walkthrough'] }, { text: 'I come.', factIds: ['service-walkthrough'] },
    { text: 'I fix it.', factIds: ['service-walkthrough'] }, { text: 'It finds its way.', factIds: ['service-walkthrough'] },
  ];
  const densityHits = runCopyGates(steps, denseGates).filter(hit => hit.rule === GATE_RULES.termDensity);
  assert.equal(densityHits.length, 1);
  assert.equal(isWarningHit(densityHits[0], denseGates), false);
  const thinned = applySafeDeterministicFixes(steps, denseGates).value;
  assert.deepEqual(runCopyGates(thinned, denseGates).filter(hit => hit.rule === GATE_RULES.termDensity), []);
  assert.ok(Array.isArray(thinned.processSteps) && thinned.processSteps.length === 3);
});

test('the depth fields are rendered and warn-only on service pages only; gates are off elsewhere', () => {
  for (const key of DEPTH_BLOCK_KEYS) {
    assert.ok(researchedRenderedFieldsFor('money_service').includes(key), key);
    assert.ok(!researchedGatedFieldsFor('money_service').includes(key), key);
    for (const pageClass of ['homepage', 'service_hub']) assert.ok(!researchedRenderedFieldsFor(pageClass).includes(key), `${pageClass} ${key}`);
  }
  const home = depthBrief({ page: { id: 'home', targetPath: '/', pageClass: 'homepage' }, depth: undefined });
  assert.equal(depthPage(home), false);
  assert.equal(briefGateContext(home, data).depth, undefined);
  // Even a depth input on a homepage brief never enables the blocks there.
  assert.equal(depthPage(depthBrief({ page: { id: 'home', targetPath: '/', pageClass: 'homepage' } })), false);
});

test('system pass: disabled blocks removed, malformed blocks dropped whole, a headline repeating the H1 head term nulled', () => {
  const brief = depthBrief({ firstPartyProof: [] });
  assert.deepEqual(brief.blocksEnabled, { process: true, qa: true, proof: false });
  const settled = withSystemFields({ ...baseCopy(), ...blocks(), processHeadline: 'Our LEAK REPAIR steps' }, brief, data);
  assert.ok(!('proofItems' in settled) && !('proofHeadline' in settled));
  assert.equal(settled.processHeadline, null);
  assert.equal((settled.processSteps as unknown[]).length, 3);
  const malformed = withSystemFields({ ...baseCopy(), ...blocks(), qaItems: [{ questionId: 'question-1', q: 'Q?', a: 'A.', factIds: ['offer'] }] }, brief, data);
  assert.equal(malformed.qaItems, null);
  assert.equal(malformed.qaHeadline, null);
  const notes = settleDepthBlocks({ processSteps: [{ text: 'one', factIds: ['a'] }, { text: 'two', factIds: [] }, { text: 'three', factIds: ['a'] }] }, { process: true, qa: false, proof: false }, null);
  assert.deepEqual(notes, [{ field: 'processSteps', rule: 'depth_fact_ids' }]);
  // Absent keys stay absent; non-depth pages lose every depth key.
  assert.ok(!('qaItems' in withSystemFields(baseCopy() as unknown as Loose, brief, data)));
  const home = depthBrief({ page: { id: 'home', targetPath: '/', pageClass: 'homepage' } });
  const homeSettled = withSystemFields({ ...baseCopy(), ...blocks() }, home, data);
  for (const key of DEPTH_BLOCK_KEYS) assert.ok(!(key in homeSettled), key);
});

test('Noa corrects the block text; Tamar keeps the factIds / questionId; a dropped block key comes back', () => {
  const tamar = blocks();
  const noa: Loose = {
    processSteps: (tamar.processSteps as Loose[]).map(item => ({ text: `${item.text} (edited)` })),
    qaItems: null,
  };
  const merged = carryOptionalFields(noa, tamar);
  assert.deepEqual((merged.processSteps as Loose[]).map(item => item.factIds), (tamar.processSteps as Loose[]).map(item => item.factIds));
  assert.ok((merged.processSteps as Loose[]).every(item => String(item.text).endsWith('(edited)')));
  assert.equal(merged.qaItems, null);
  assert.deepEqual(merged.proofItems, tamar.proofItems);
  assert.deepEqual(mergeDepthBlocks({ processSteps: [{ text: 'only one' }] }, tamar).processSteps, tamar.processSteps);
});

test('validator: well-formed depth blocks pass with their own byte budget; malformed ones are rejected', () => {
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy({ ...baseCopy(), ...blocks() }, { ungenerated: ['aboutPageHeadline', 'aboutPageBody', 'servicesHeadline', 'serviceDetails'] }));
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy({ ...baseCopy(), processSteps: null, processHeadline: null }, { ungenerated: ['aboutPageHeadline', 'aboutPageBody', 'servicesHeadline', 'serviceDetails'] }));
  const options = { ungenerated: ['aboutPageHeadline', 'aboutPageBody', 'servicesHeadline', 'serviceDetails'] };
  for (const patch of [
    { processSteps: [{ text: 'one', factIds: ['a'] }] },
    { qaItems: [{ q: 'Q?', a: 'A.', factIds: ['a'] }, { q: 'Q?', a: 'A.', factIds: ['a'] }, { q: 'Q?', a: 'A.', factIds: ['a'] }] },
    { proofItems: [{ text: Array.from({ length: 26 }, () => 'word').join(' '), factIds: ['a'] }] },
    { proofHeadline: 'x'.repeat(41) },
  ]) assert.throws(() => assertBoundedGeneratedSiteCopy({ ...baseCopy(), ...blocks(), ...patch }, options), /Invalid bounded generated site copy/, JSON.stringify(patch).slice(0, 60));
});

test('prompt: the DEPTH BLOCKS section (English only) and the depth keys appear on a depth service page only', () => {
  const brief = depthBrief();
  const prompt = buildResearchPageGenerationPrompt(brief, data);
  assert.ok(prompt.includes('DEPTH BLOCKS (binding on this service page):'));
  assert.ok(prompt.includes('"questionPool"') && prompt.includes('"lengthBand"') && prompt.includes('"suggestedTerms"') && prompt.includes('"serviceFacts"'));
  assert.match(prompt, /Output exactly these keys and no others: [^\n]*processHeadline, processSteps, qaHeadline, qaItems, proofHeadline, proofItems\./);
  assert.ok(!HEBREW.test(buildDepthSection(brief)));
  const home = depthBrief({ page: { id: 'home', targetPath: '/', pageClass: 'homepage' }, depth: undefined });
  const homePrompt = buildResearchPageGenerationPrompt(home, data);
  assert.ok(!homePrompt.includes('DEPTH BLOCKS') && !homePrompt.includes('processSteps'));
  // A block that is not enabled never reaches the prompt.
  const noProcess = buildDepthSection(depthBrief({ depth: { ...depthBriefInput().depth!, serviceFacts: [] } }));
  assert.ok(!noProcess.includes('processSteps (B1)') && noProcess.includes('qaItems (B4)'));
});

test('generation: Tamar writes the blocks, Noa edits the text, the final copy keeps the references and logs the length note', async () => {
  const brief = depthBrief();
  const events: Array<{ kind: string; violations?: Array<{ rule: string }> }> = [];
  let calls = 0;
  const tamar: Loose = { ...baseCopy(), ...blocks() };
  const final = await generateResearchPageCopy(brief, data, {
    gates: false,
    onEvent: event => events.push(event as never),
    callJson: async () => {
      calls++;
      if (calls === 1) return JSON.stringify(tamar);
      const { processSteps, ...rest } = tamar;
      return JSON.stringify({ ...rest, processSteps: (processSteps as Loose[]).map(item => ({ text: item.text })) });
    },
  }) as unknown as Loose;
  assert.equal(calls, 2);
  assert.deepEqual((final.processSteps as Loose[]).map(item => item.factIds), (tamar.processSteps as Loose[]).map(item => item.factIds));
  assert.deepEqual(depthLengthNote(final, brief)?.rule, 'fact_gap');
  assert.ok(events.some(event => event.kind === 'warnings' && event.violations?.some(item => item.rule === 'fact_gap')));
});

test('cross-client similarity (warn only): 5-gram Jaccard of two clients\' blocks', () => {
  const a = blocks();
  const b: Loose = {
    processSteps: [
      { text: 'The owner of the other firm answers the phone himself.', factIds: ['x'] },
      { text: 'He drives over with the tools for the drain.', factIds: ['x'] },
      { text: 'The pipe is cleared and tested with running water.', factIds: ['x'] },
    ],
  };
  const different = crossClientSimilarity(a, b);
  assert.ok(different.jaccard < CROSS_CLIENT_JACCARD_MAX && !different.warn);
  const same = crossClientSimilarity(a, a);
  assert.equal(same.jaccard, 1);
  assert.equal(same.warn, true);
  assert.equal(ngramJaccard('one two three', 'one two three'), 0, 'texts under five words have no 5-grams');
});

const page = (copy: Partial<SiteCopy>, classification: ResearchedSitePage['classification'] = 'money_service'): ResearchedSitePage => ({
  opportunityId: classification === 'homepage' ? 'home' : 'svc-leak-repair',
  classification,
  targetPath: classification === 'homepage' ? '/' : '/services/leak-repair',
  copy: { ...baseCopy(), ...copy } as SiteCopy,
});

function render(money: Partial<SiteCopy>, home: Partial<SiteCopy> = {}): { money: string; home: string } {
  const files = renderResearchedSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data,
    heroImageUrl: 'https://example.test/hero.jpg', slug: 'depth-test', siteUrl: 'https://depth.wao.co.il',
    pages: [page(home, 'homepage'), page(money)], graphEdges: [{ fromId: 'home', toId: 'svc-leak-repair' }],
  });
  const moneyFile = Object.keys(files).find(name => name.startsWith('services/') && name.endsWith('.html'));
  return { money: files[moneyFile ?? ''] ?? '', home: files['index.html'] };
}

test('render: each block only with content, theme tokens, approved fallback H2s, B6 heading by review presence', () => {
  const plain = render({});
  for (const section of ['process', 'qa', 'proof']) assert.ok(!plain.money.includes(`data-section="${section}"`), section);
  // Null / empty blocks render exactly like a record without the fields.
  assert.equal(render({ processSteps: null, qaItems: [], proofItems: null, processHeadline: 'x' }).money, plain.money);

  const full = render(blocks() as Partial<SiteCopy>);
  for (const section of ['process', 'qa', 'proof']) assert.ok(full.money.includes(`data-section="${section}"`), section);
  assert.ok(full.money.includes('How the job runs') && full.money.includes('What people ask'));
  assert.ok(full.money.indexOf('data-section="process"') < full.money.indexOf('data-section="proof"'));
  assert.ok(full.money.indexOf('data-section="proof"') < full.money.indexOf('data-section="qa"'));

  const fallback = render({ ...blocks(), processHeadline: null, qaHeadline: null, proofHeadline: null } as Partial<SiteCopy>);
  assert.ok(fallback.money.includes(`<h2 id="process-heading"`) && fallback.money.includes(RESEARCHED_SITE_LABELS.processHeadingFallback));
  assert.ok(fallback.money.includes(RESEARCHED_SITE_LABELS.qaHeadingFallback));
  assert.ok(fallback.money.includes(RESEARCHED_SITE_LABELS.proofHeadingFactsOnly) && !fallback.money.includes(RESEARCHED_SITE_LABELS.proofHeadingReviews));

  const withReview = render({ ...blocks(), proofHeadline: null, reviewFeatured: 'Came fast and fixed it' } as Partial<SiteCopy>);
  assert.ok(withReview.money.includes(RESEARCHED_SITE_LABELS.proofHeadingReviews));
  // The review renders once, inside B6 (not also as the standalone review section).
  assert.equal(withReview.money.split('Came fast and fixed it').length - 1, 1);
  assert.ok(withReview.money.indexOf('Came fast and fixed it') > withReview.money.indexOf('data-section="proof"'));

  // Blocks never render on the homepage, even if a record carried the fields.
  const home = render({}, blocks() as Partial<SiteCopy>);
  for (const section of ['process', 'qa', 'proof']) assert.ok(!home.home.includes(`data-section="${section}"`), section);
});

test('the depth modules and the research renderer hold ZERO Hebrew bytes', () => {
  for (const file of [
    'src/lib/lp/researchedSite.ts', 'src/lib/lp/depthBlocks.ts', 'src/lib/site-bot/research/depthFilters.ts',
    'src/lib/site-bot/research/neuronWriter.ts', 'src/lib/site-bot/research/pageBrief.ts', 'src/lib/site-bot/research/fixtureProviders.ts',
    'src/lib/site-bot/voiceNote.ts',
  ]) assert.ok(!HEBREW.test(fs.readFileSync(path.join(process.cwd(), file), 'utf8')), file);
});
