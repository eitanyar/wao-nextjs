import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import { renderResearchedSitePages } from '../lp/researchedSite';
import { VERTICAL_ASSETS } from '../lp/verticalAssets';
import { VERTICAL_THEMES } from '../lp/verticalThemes';
import type { PageBrief } from './research/pageBrief';
import type { SiteResearchDossier } from './research/types';
import {
  buildResearchedSiteGeneration,
  persistResearchedSiteRecordAtomic,
  type ResearchedSiteGenerationRecord,
} from './researchedSiteGeneration';

const timestamp = '2026-09-20T00:00:00.000Z';
const collectedData: CollectedData = {
  businessName: 'Example Business',
  businessNiche: 'example service',
  phone: '050-0000000',
};

function copy(headline: string): SiteCopy {
  return {
    heroHeadline: headline,
    heroSubheadline: `${headline} description`,
    heroCta: 'Contact',
    trustBarItems: ['Approved proof'],
    aboutBlurb: 'About',
    servicesHeadline: 'Services',
    serviceItems: ['Example'],
    faqHeadline: 'FAQ',
    faqItems: [],
    guaranteeBlock: 'Guarantee',
    reviewFeatured: null,
    reviewContext: null,
    responseTimeBadge: null,
    scarcityLine: null,
    formHeadline: 'Contact us',
    stickyBarLine: 'Call',
    aboutPageHeadline: 'About',
    aboutPageBody: 'About body',
    serviceDetails: [{ name: 'Example', description: 'Example description' }],
  };
}

function brief(id: string, targetPath: string, pageClass: string): PageBrief {
  return {
    page: { id, targetPath, pageClass },
    persona: { id: 'persona', value: 'Buyer' },
    waoOffer: { id: 'offer', value: 'Managed service' },
    targetQueries: [{ id: 'query', value: 'example service' }],
    approvedEntityAnchors: [{ id: 'entity', value: 'Example service' }],
    firstPartyProof: [{ id: 'proof', value: 'Approved proof' }],
    assertableLocalFacts: [],
    customerDecisions: [],
    constraints: [],
    links: [],
    informationGainGaps: [],
    prohibitedClaims: [],
    faqPolicy: 'none',
    faqCandidates: [],
  };
}

const briefs = [
  brief('home', '/', 'homepage'),
  brief('services', '/services', 'service_hub'),
  brief('alpha', '/services/alpha', 'money_service'),
];

function dossier(overrides: Partial<SiteResearchDossier> = {}): SiteResearchDossier {
  return {
    researchId: 'research-alpha',
    status: 'copy_ready',
    createdAt: timestamp,
    updatedAt: timestamp,
    businessTruth: { businessName: 'Example Business', assertions: [], status: 'verified' },
    evidence: [],
    evidenceEdges: [],
    keywordEvidence: [],
    serpObservations: [],
    pageOpportunities: briefs.map(item => ({
      id: item.page.id,
      targetPath: item.page.targetPath,
      opportunity: item.page.id,
      evidenceIds: [],
      status: 'ready' as const,
    })),
    internalLinkEdges: [],
    providerUsage: [],
    humanGates: [],
    pipelineChecks: { neuronEvaluation: 'skip', duplicateCannibalization: 'pass' },
    ...overrides,
  };
}

const graphEdges = [
  { fromId: 'home', toId: 'services' },
  { fromId: 'services', toId: 'alpha' },
];

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'example-site',
    researchId: 'research-alpha',
    collectedData,
    dossier: dossier(),
    pageBriefs: briefs,
    graphEdges,
    ...overrides,
  };
}

function dependencies(generateCopy = async (item: PageBrief) => copy(item.page.id)) {
  return {
    generateCopy,
    now: () => new Date(timestamp),
    renderPages: renderResearchedSitePages,
    renderInputs: {
      theme: VERTICAL_THEMES['emergency-trades'],
      assets: VERTICAL_ASSETS['emergency-trades'],
      heroImageUrl: 'https://example.test/hero.jpg',
      siteUrl: 'https://example-site.wao.co.il',
    },
  };
}

test('builds the exact complete deployment record in deterministic brief order', async () => {
  const generated: string[] = [];
  const record = await buildResearchedSiteGeneration(buildInput(), dependencies(async item => {
    generated.push(item.page.id);
    return copy(item.page.id);
  }));

  assert.deepEqual(generated, ['home', 'services', 'alpha']);
  assert.deepEqual(Object.keys(record), [
    'slug', 'researchId', 'approvedPageId', 'collectedData', 'copy', 'researchedPages', 'researchedGraphEdges', 'createdAt',
  ]);
  assert.equal(record.approvedPageId, 'home');
  assert.equal(record.copy.heroHeadline, 'home');
  assert.deepEqual(record.researchedPages.map(page => ({
    id: page.opportunityId,
    pageClass: page.classification,
    targetPath: page.targetPath,
    faqPolicy: page.brief?.faqPolicy,
  })), [
    { id: 'home', pageClass: 'homepage', targetPath: '/', faqPolicy: 'none' },
    { id: 'services', pageClass: 'service_hub', targetPath: '/services', faqPolicy: 'none' },
    { id: 'alpha', pageClass: 'money_service', targetPath: '/services/alpha', faqPolicy: 'none' },
  ]);
  assert.deepEqual(record.researchedGraphEdges, graphEdges);
  assert.equal(record.createdAt, timestamp);

  const rendered = renderResearchedSitePages({
    ...dependencies().renderInputs,
    data: record.collectedData,
    slug: record.slug,
    pages: record.researchedPages,
    graphEdges: record.researchedGraphEdges,
  });
  assert.ok(rendered['index.html']);
  assert.ok(rendered['services--services.html']);
  assert.ok(rendered['services/alpha--alpha.html']);
});

test('rejects invalid portfolios before copy generation', async () => {
  const cases: Array<[string, ReturnType<typeof buildInput>]> = [
    ['unsafe slug', buildInput({ slug: '../escape' })],
    ['missing ready page', buildInput({ pageBriefs: briefs.slice(0, 2) })],
    ['extra page', buildInput({ pageBriefs: [...briefs, brief('extra', '/extra', 'supporting')] })],
    ['duplicate id', buildInput({ pageBriefs: [briefs[0], briefs[1], { ...briefs[2], page: { ...briefs[2].page, id: 'services' } }] })],
    ['duplicate path', buildInput({ pageBriefs: [briefs[0], briefs[1], { ...briefs[2], page: { ...briefs[2].page, targetPath: '/services' } }] })],
    ['unsafe path', buildInput({ pageBriefs: [briefs[0], briefs[1], { ...briefs[2], page: { ...briefs[2].page, targetPath: '/../private' } }] })],
    ['held page', buildInput({ dossier: dossier({ pageOpportunities: dossier().pageOpportunities.map(item => item.id === 'alpha' ? { ...item, status: 'held' } : item) }) })],
    ['unknown page', buildInput({ pageBriefs: [briefs[0], briefs[1], brief('unknown', '/unknown', 'supporting')] })],
    ['missing homepage', buildInput({ pageBriefs: [{ ...briefs[0], page: { ...briefs[0].page, pageClass: 'supporting' } }, briefs[1], briefs[2]] })],
    ['duplicate homepage', buildInput({ pageBriefs: [briefs[0], { ...briefs[1], page: { ...briefs[1].page, pageClass: 'homepage' } }, briefs[2]] })],
    ['non-renderable class', buildInput({ pageBriefs: [briefs[0], briefs[1], { ...briefs[2], page: { ...briefs[2].page, pageClass: 'backlog' } }] })],
    ['unknown graph endpoint', buildInput({ graphEdges: [...graphEdges, { fromId: 'alpha', toId: 'unknown' }] })],
    ['orphan page', buildInput({ graphEdges: [graphEdges[0]] })],
  ];

  for (const [name, input] of cases) {
    let calls = 0;
    await assert.rejects(
      () => buildResearchedSiteGeneration(input, dependencies(async item => {
        calls += 1;
        return copy(item.page.id);
      })),
      name,
    );
    assert.equal(calls, 0, `${name} generated copy`);
  }
});

test('generation is all-or-nothing and never falls through to an ambient provider', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('unexpected network request'); };
  let calls = 0;
  try {
    await assert.rejects(() => buildResearchedSiteGeneration(buildInput(), dependencies(async item => {
      calls += 1;
      if (item.page.id === 'services') throw new Error('copy generation failed');
      return copy(item.page.id);
    })), /copy generation failed/);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('renderer rejection prevents a completed generation record', async () => {
  await assert.rejects(() => buildResearchedSiteGeneration(buildInput(), {
    ...dependencies(),
    renderPages: () => { throw new Error('renderer incompatible'); },
  }), /renderer incompatible/);
});

test('atomic persistence creates and replaces a complete record and updates only a cloned dossier', async t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-'));
  t.after(() => fs.rmSync(sitesRoot, { recursive: true, force: true }));
  const inputDossier = dossier();
  const originalDossier = structuredClone(inputDossier);
  const persistedDossiers: SiteResearchDossier[] = [];
  const record = await buildResearchedSiteGeneration(buildInput({ dossier: inputDossier }), dependencies());

  await persistResearchedSiteRecordAtomic(record, {
    sitesRoot,
    dossier: inputDossier,
    writeDossier: async updated => {
      persistedDossiers.push(structuredClone(updated));
      return true;
    },
  });
  const target = path.join(sitesRoot, 'example-site.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), record);
  assert.deepEqual(inputDossier, originalDossier);
  assert.equal(persistedDossiers[0].status, 'deploy_ready');
  assert.deepEqual(persistedDossiers[0].pipelineChecks, {
    neuronEvaluation: 'skip',
    duplicateCannibalization: 'pass',
    copy: 'pass',
    hebrewQa: 'pass',
  });

  const replacement: ResearchedSiteGenerationRecord = { ...record, createdAt: '2026-09-20T01:00:00.000Z' };
  await persistResearchedSiteRecordAtomic(replacement, {
    sitesRoot,
    dossier: inputDossier,
    writeDossier: async () => true,
  });
  assert.equal(JSON.parse(fs.readFileSync(target, 'utf8')).createdAt, replacement.createdAt);
});

test('dossier persistence failure restores prior bytes or removes a new record', async t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-rollback-'));
  t.after(() => fs.rmSync(sitesRoot, { recursive: true, force: true }));
  const target = path.join(sitesRoot, 'example-site.json');
  const prior = '{"prior":true}\n';
  fs.writeFileSync(target, prior, 'utf8');
  const record = await buildResearchedSiteGeneration(buildInput(), dependencies());

  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
    sitesRoot,
    dossier: dossier(),
    writeDossier: async () => false,
  }), /dossier/i);
  assert.equal(fs.readFileSync(target, 'utf8'), prior);

  fs.rmSync(target);
  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
    sitesRoot,
    dossier: dossier(),
    writeDossier: async () => { throw new Error('dossier write failed'); },
  }), /dossier/i);
  assert.equal(fs.existsSync(target), false);
});

test('an injected atomic rename failure leaves prior site bytes unchanged', async t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-write-failure-'));
  t.after(() => fs.rmSync(sitesRoot, { recursive: true, force: true }));
  const target = path.join(sitesRoot, 'example-site.json');
  const prior = '{"prior":true}\n';
  fs.writeFileSync(target, prior, 'utf8');
  const record = await buildResearchedSiteGeneration(buildInput(), dependencies());

  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
    sitesRoot,
    dossier: dossier(),
    writeDossier: async () => true,
    fileSystem: {
      existsSync: fs.existsSync,
      lstatSync: fs.lstatSync,
      mkdirSync: fs.mkdirSync,
      readFileSync: fs.readFileSync,
      writeFileSync: fs.writeFileSync,
      renameSync: () => { throw new Error('injected rename failure'); },
      rmSync: fs.rmSync,
      realpathSync: fs.realpathSync,
    },
  }), /complete site record/i);
  assert.equal(fs.readFileSync(target, 'utf8'), prior);
});

test('persistence rejects symlink targets without changing their destination', async t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-symlink-'));
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-outside-'));
  t.after(() => {
    fs.rmSync(sitesRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  });
  const outside = path.join(outsideRoot, 'outside.json');
  fs.writeFileSync(outside, 'outside', 'utf8');
  fs.symlinkSync(outside, path.join(sitesRoot, 'example-site.json'));
  const record = await buildResearchedSiteGeneration(buildInput(), dependencies());

  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
    sitesRoot,
    dossier: dossier(),
    writeDossier: async () => true,
  }), /symlink/i);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'outside');
});

test('generate route authenticates before parsing or touching generation and persistence seams', () => {
  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/site-bot/generate/route.ts'), 'utf8');
  const auth = route.indexOf('verifyAdminToken(');
  const body = route.indexOf('req.json()');
  const dossierRead = route.indexOf('readResearchDossier(');
  const generation = route.indexOf('buildResearchedSiteGeneration(');
  const persistence = route.indexOf('persistResearchedSiteRecordAtomic(');
  assert.ok(auth >= 0 && body > auth);
  assert.ok(dossierRead > body);
  assert.ok(generation > dossierRead);
  assert.ok(persistence > generation);
});