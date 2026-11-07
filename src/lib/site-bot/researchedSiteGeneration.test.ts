import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import './research/pageBrief.test';
import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import { renderResearchedSitePages } from '../lp/researchedSite';
import { VERTICAL_ASSETS } from '../lp/verticalAssets';
import { VERTICAL_THEMES } from '../lp/verticalThemes';
import { compilePageBrief, type PageBrief } from './research/pageBrief';
import { assertDeployReady } from './research/pipelineState';
import type { SiteResearchDossier } from './research/types';
import {
  buildResearchedSiteGeneration,
  preflightResearchedSiteTarget,
  persistResearchedSiteRecordAtomic,
  type ResearchedSiteGenerationRecord,
} from './researchedSiteGeneration';

const timestamp = '2026-09-20T00:00:00.000Z';
const priorApproval = {
  sha256: 'a'.repeat(64), researchId: 'research-alpha', slug: 'example-site', approvedPageId: 'home',
  pages: [{ opportunityId: 'home', classification: 'homepage' as const, targetPath: '/' }], pageCount: 1,
};
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
  assert.ok(rendered['services.html']);
  assert.ok(rendered['services/alpha.html']);
});

test('direct builder rejects malformed first and middle copy before later calls or rendering', async () => {
  for (const [invalidAt, expectedCalls] of [['home', ['home']], ['services', ['home', 'services']]] as const) {
    const calls: string[] = [];
    await assert.rejects(() => buildResearchedSiteGeneration(buildInput(), {
      ...dependencies(async item => {
        calls.push(item.page.id);
        if (item.page.id === invalidAt) return { ...copy(item.page.id), faqItems: [{ q: 'Q', a: '' }] };
        return copy(item.page.id);
      }),
      renderPages: () => { throw new Error('unexpected rendering'); },
    }), /^Error: Invalid bounded generated site copy\.$/);
    assert.deepEqual(calls, expectedCalls);
  }
  let rendered = 0;
  const record = await buildResearchedSiteGeneration(buildInput(), {
    ...dependencies(),
    renderPages: params => { rendered++; return renderResearchedSitePages(params); },
  });
  assert.equal(rendered, 1);
  assert.equal(record.researchedPages.length, briefs.length);
  assert.equal(record.copy.heroHeadline, 'home');
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

test('direct build rejects malformed briefs before copy or rendering', async () => {
  const invalid = [
    { ...briefs[2], persona: { id: 'persona', value: 'x'.repeat(241) } },
    { ...briefs[2], faqCandidates: [{ id: 'faq', question: 'Why?', answer: 'Proof', source: 'paa' as const,
      relevance: 0.8, answerEvidenceIds: ['missing'] }] },
    { ...briefs[2], links: [{ targetPath: '/', relationship: 'parent', evidenceIds: ['missing'] }] },
  ];
  for (const candidate of invalid) {
    await assert.rejects(() => buildResearchedSiteGeneration(buildInput({ pageBriefs: [briefs[0], briefs[1], candidate] }), {
      ...dependencies(() => { throw new Error('unexpected copy generation'); }),
      renderPages: () => { throw new Error('unexpected rendering'); },
    }), /Invalid bounded page brief/);
  }
});

test('direct build accepts compiler-produced briefs with supported FAQ and links', async () => {
  const compiled = compilePageBrief({
    page: { id: 'home', targetPath: '/', pageClass: 'homepage' },
    persona: { id: 'persona', value: 'Buyer', status: 'approved' },
    waoOffer: { id: 'offer', value: 'Managed service', status: 'approved' },
    targetQueries: [], entityAnchors: [], firstPartyProof: [], localFacts: [], customerDecisions: [], constraints: [],
    links: [{ targetPath: '/services', relationship: 'child', evidenceIds: ['persona'] }],
    informationGainGaps: [], prohibitedClaims: [], faqCandidates: [{ id: 'faq', question: 'Why?',
      answer: 'Managed service', source: 'owner_faq', relevance: 0.8, answerEvidenceIds: ['offer'] }],
  });
  const record = await buildResearchedSiteGeneration(buildInput({ pageBriefs: [compiled, ...briefs.slice(1)] }), dependencies());
  assert.equal(record.researchedPages[0].brief?.faqCandidates.length, 1);
});

test('direct generation rejects non-approved or malformed dossiers before copy and rendering', async () => {
  const approved = { id: 'gate', requiredFor: 'copy_ready' as const, status: 'approved' as const, requestedAt: timestamp };
  const cases: Array<[string, Partial<SiteResearchDossier>]> = [
    ['pending', { humanGates: [approved, { ...approved, status: 'pending' }] }],
    ['held', { humanGates: [{ ...approved, status: 'held' }] }],
    ['rejected', { humanGates: [{ ...approved, status: 'rejected' }] }],
    ['unknown', { humanGates: [{ ...approved, status: 'unknown' as 'approved' }] }],
    ['missing gates', { humanGates: undefined }],
    ['null gates', { humanGates: null as unknown as SiteResearchDossier['humanGates'] }],
    ['object gates', { humanGates: {} as SiteResearchDossier['humanGates'] }],
    ['null entry', { humanGates: [null as unknown as typeof approved] }],
    ['array entry', { humanGates: [[] as unknown as typeof approved] }],
    ['primitive entry', { humanGates: ['approved' as unknown as typeof approved] }],
    ['missing status', { humanGates: [{} as typeof approved] }],
    ['foreign identity', { researchId: 'other-research', humanGates: [approved] }],
    ['invalid identity', { researchId: '../escape', humanGates: [approved] }],
    ['missing identity', { researchId: undefined, humanGates: [approved] }],
    ['non-copy-ready', { status: 'held', humanGates: [approved] }],
  ];
  for (const [name, override] of cases) {
    await assert.rejects(() => buildResearchedSiteGeneration(buildInput({ dossier: dossier(override) }), {
      ...dependencies(() => { throw new Error('unexpected copy generation'); }),
      renderPages: () => { throw new Error('unexpected rendering'); },
    }), /Research dossier is not copy ready/, name);
  }
  const generated: string[] = [];
  const record = await buildResearchedSiteGeneration(buildInput({ dossier: dossier({ humanGates: [approved] }) }),
    dependencies(async item => { generated.push(item.page.id); return copy(item.page.id); }));
  assert.deepEqual(generated, ['home', 'services', 'alpha']);
  assert.equal(record.researchId, 'research-alpha');
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
  const inputDossier = dossier({
    approvedCopyReviewPacket: structuredClone(priorApproval),
    humanGates: [{ id: 'gate', requiredFor: 'copy_ready', status: 'approved', requestedAt: timestamp }],
  });
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
  assert.equal(persistedDossiers[0].status, 'copy_ready');
  assert.equal(persistedDossiers[0].approvedCopyReviewPacket, undefined);
  assert.equal(persistedDossiers[0].updatedAt, record.createdAt);
  assert.deepEqual(persistedDossiers[0].pipelineChecks, {
    neuronEvaluation: 'skip',
    duplicateCannibalization: 'pass',
    copy: 'pass',
    hebrewQa: 'pending',
  });
  assert.deepEqual(assertDeployReady(persistedDossiers[0]), {
    ready: false, reasons: ['hebrew_qa_not_passed', 'deploy_not_ready'],
  });

  const replacement: ResearchedSiteGenerationRecord = { ...record, createdAt: '2026-09-20T01:00:00.000Z' };
  const staleQaDossier = dossier({ approvedCopyReviewPacket: structuredClone(priorApproval), pipelineChecks: {
    copy: 'pass', hebrewQa: 'pass', neuronEvaluation: 'skip', duplicateCannibalization: 'pass',
  } });
  const originalStale = structuredClone(staleQaDossier);
  let regeneratedDossier: SiteResearchDossier | undefined;
  await persistResearchedSiteRecordAtomic(replacement, {
    sitesRoot,
    dossier: staleQaDossier,
    writeDossier: async updated => { regeneratedDossier = structuredClone(updated); return true; },
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), replacement);
  assert.deepEqual(staleQaDossier, originalStale);
  assert.equal(regeneratedDossier?.status, 'copy_ready');
  assert.equal(regeneratedDossier?.approvedCopyReviewPacket, undefined);
  assert.equal(regeneratedDossier?.updatedAt, replacement.createdAt);
  assert.deepEqual(regeneratedDossier?.pipelineChecks, {
    copy: 'pass', hebrewQa: 'pending', neuronEvaluation: 'skip', duplicateCannibalization: 'pass',
  });
  assert.deepEqual(assertDeployReady(regeneratedDossier!), {
    ready: false, reasons: ['hebrew_qa_not_passed', 'deploy_not_ready'],
  });
});

test('direct persistence rejects unapproved and malformed gates without any site or dossier write', async t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-gate-'));
  t.after(() => fs.rmSync(sitesRoot, { recursive: true, force: true }));
  const record = await buildResearchedSiteGeneration(buildInput(), dependencies());
  const target = path.join(sitesRoot, 'example-site.json');
  const prior = Buffer.from(`${JSON.stringify({ ...record, createdAt: '2026-09-19T00:00:00.000Z' })}\n`);
  const cases: Array<[string, Partial<SiteResearchDossier>]> = [
    ['pending', { humanGates: [{ status: 'pending' } as SiteResearchDossier['humanGates'][number]] }],
    ['held', { humanGates: [{ status: 'held' } as SiteResearchDossier['humanGates'][number]] }],
    ['rejected', { humanGates: [{ status: 'rejected' } as SiteResearchDossier['humanGates'][number]] }],
    ['unknown', { humanGates: [{ status: 'unknown' } as unknown as SiteResearchDossier['humanGates'][number]] }],
    ['missing gates', { humanGates: undefined }],
    ['malformed gates', { humanGates: [null as unknown as SiteResearchDossier['humanGates'][number]] }],
    ['foreign identity', { researchId: 'other-research' }],
    ['non-copy-ready', { status: 'held' }],
  ];
  for (const [name, override] of cases) {
    fs.writeFileSync(target, prior);
    const fileSystem = {
      ...fs,
      mkdirSync: (() => { throw new Error('unexpected mkdir'); }) as typeof fs.mkdirSync,
      writeFileSync: (() => { throw new Error('unexpected write'); }) as typeof fs.writeFileSync,
      renameSync: (() => { throw new Error('unexpected rename'); }) as typeof fs.renameSync,
      rmSync: (() => { throw new Error('unexpected remove'); }) as typeof fs.rmSync,
    };
    await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
      sitesRoot, dossier: dossier(override), fileSystem,
      writeDossier: async () => { throw new Error('unexpected dossier write'); },
    }), /Research dossier is not copy ready/, name);
    assert.deepEqual(fs.readFileSync(target), prior, name);
    assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json'], name);
  }
});

test('dossier persistence failure restores prior bytes or removes a new record', async t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-rollback-'));
  t.after(() => fs.rmSync(sitesRoot, { recursive: true, force: true }));
  const target = path.join(sitesRoot, 'example-site.json');
  const record = await buildResearchedSiteGeneration(buildInput(), dependencies());
  const prior = `${JSON.stringify({ ...record, createdAt: '2026-09-19T00:00:00.000Z' })}\n`;
  fs.writeFileSync(target, prior, 'utf8');
  const inputDossier = dossier({ approvedCopyReviewPacket: structuredClone(priorApproval), pipelineChecks: {
    copy: 'pending', hebrewQa: 'pass', neuronEvaluation: 'skip', duplicateCannibalization: 'pass',
  } });
  const originalDossier = structuredClone(inputDossier);

  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
    sitesRoot,
    dossier: inputDossier,
    writeDossier: async updated => {
      assert.equal(updated.status, 'copy_ready');
      assert.equal(updated.pipelineChecks?.hebrewQa, 'pending');
      assert.equal(updated.approvedCopyReviewPacket, undefined);
      return false;
    },
  }), /dossier/i);
  assert.equal(fs.readFileSync(target, 'utf8'), prior);
  assert.deepEqual(inputDossier, originalDossier);

  fs.rmSync(target);
  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
    sitesRoot,
    dossier: inputDossier,
    writeDossier: async updated => {
      assert.equal(updated.approvedCopyReviewPacket, undefined);
      throw new Error('dossier write failed');
    },
  }), /dossier/i);
  assert.equal(fs.existsSync(target), false);
  assert.deepEqual(inputDossier, originalDossier);
  assert.deepEqual(fs.readdirSync(sitesRoot), []);
});

test('an injected atomic rename failure leaves prior site bytes unchanged', async t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-write-failure-'));
  t.after(() => fs.rmSync(sitesRoot, { recursive: true, force: true }));
  const target = path.join(sitesRoot, 'example-site.json');
  const record = await buildResearchedSiteGeneration(buildInput(), dependencies());
  const prior = `${JSON.stringify({ ...record, createdAt: '2026-09-19T00:00:00.000Z' })}\n`;
  fs.writeFileSync(target, prior, 'utf8');
  let dossierWrites = 0;
  const inputDossier = dossier({ approvedCopyReviewPacket: structuredClone(priorApproval) });
  const originalDossier = structuredClone(inputDossier);

  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
    sitesRoot,
    dossier: inputDossier,
    writeDossier: async () => { dossierWrites++; return true; },
    fileSystem: {
      ...fs,
      renameSync: () => { throw new Error('injected rename failure'); },
    },
  }), /complete site record/i);
  assert.equal(fs.readFileSync(target, 'utf8'), prior);
  assert.equal(dossierWrites, 0);
  assert.deepEqual(inputDossier, originalDossier);
  assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json']);
});

test('persistence rejects foreign, missing, malformed and legacy existing identities without side effects', async t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-collision-'));
  t.after(() => fs.rmSync(sitesRoot, { recursive: true, force: true }));
  const target = path.join(sitesRoot, 'example-site.json');
  const record = await buildResearchedSiteGeneration(buildInput(), dependencies());
  const cases: Array<[string, Buffer]> = [
    ['foreign research', Buffer.from(JSON.stringify({ ...record, researchId: 'research-beta' }))],
    ['foreign embedded slug', Buffer.from(JSON.stringify({ ...record, slug: 'other-site' }))],
    ['missing research', Buffer.from(JSON.stringify({ ...record, researchId: undefined }))],
    ['missing slug', Buffer.from(JSON.stringify({ ...record, slug: undefined }))],
    ['empty research', Buffer.from(JSON.stringify({ ...record, researchId: '' }))],
    ['invalid research', Buffer.from(JSON.stringify({ ...record, researchId: '../escape' }))],
    ['legacy occupant', Buffer.from(JSON.stringify({ slug: record.slug, researchId: record.researchId }))],
    ['missing pages', Buffer.from(JSON.stringify({ ...record, researchedPages: undefined }))],
    ['empty pages', Buffer.from(JSON.stringify({ ...record, researchedPages: [] }))],
    ['missing graph', Buffer.from(JSON.stringify({ ...record, researchedGraphEdges: undefined }))],
    ['missing copy', Buffer.from(JSON.stringify({ ...record, copy: undefined }))],
    ['legacy flag', Buffer.from(JSON.stringify({ ...record, legacyCoreThirty: true }))],
    ['simulation occupant', Buffer.from(JSON.stringify({ ...record, simulation: false }))],
    ['malformed json', Buffer.from('{not-json')],
    ['malformed utf8', Buffer.from([0xff, 0xfe])],
    ['array', Buffer.from('[]')],
  ];
  for (const [name, prior] of cases) {
    fs.writeFileSync(target, prior);
    let dossierWrites = 0;
    await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
      sitesRoot,
      dossier: dossier(),
      writeDossier: async () => { dossierWrites++; return true; },
    }), name);
    assert.deepEqual(fs.readFileSync(target), prior, `${name} target changed`);
    assert.equal(dossierWrites, 0, `${name} updated dossier`);
    assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json'], `${name} left temporary files`);
  }
});

test('persistence rejects nonregular and oversized existing targets, including growth past stat size', async t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-size-'));
  t.after(() => fs.rmSync(sitesRoot, { recursive: true, force: true }));
  const target = path.join(sitesRoot, 'example-site.json');
  const record = await buildResearchedSiteGeneration(buildInput(), dependencies());
  let dossierWrites = 0;
  const options = {
    sitesRoot, dossier: dossier(),
    writeDossier: async () => { dossierWrites++; return true; },
  };

  fs.mkdirSync(target);
  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, options), /regular file/);
  assert.deepEqual(fs.readdirSync(target), []);
  assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json']);
  fs.rmdirSync(target);

  fs.writeFileSync(target, JSON.stringify(record));
  fs.truncateSync(target, 16 * 1024 * 1024 + 1);
  const oversizedPrior = fs.readFileSync(target);
  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, options), /existing site record/i);
  assert.deepEqual(fs.readFileSync(target), oversizedPrior);
  assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json']);

  let descriptorsOpened = 0;
  let descriptorsClosed = 0;
  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
    ...options,
    fileSystem: {
      ...fs,
      openSync: (...args: Parameters<typeof fs.openSync>) => { descriptorsOpened++; return fs.openSync(...args); },
      closeSync: descriptor => { descriptorsClosed++; fs.closeSync(descriptor); },
      fstatSync: ((descriptor: number) => ({ ...fs.fstatSync(descriptor), isFile: () => true, size: 0 })) as typeof fs.fstatSync,
    },
  }), /existing site record/i);
  assert.equal(descriptorsOpened, 1);
  assert.equal(descriptorsClosed, 1);
  assert.deepEqual(fs.readFileSync(target), oversizedPrior);
  assert.equal(dossierWrites, 0);
  assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json']);
});

test('persistence rejects a dangling symlink target rather than treating it as absent', async t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-dangling-'));
  t.after(() => fs.rmSync(sitesRoot, { recursive: true, force: true }));
  const target = path.join(sitesRoot, 'example-site.json');
  fs.symlinkSync(path.join(sitesRoot, 'missing.json'), target);
  const record = await buildResearchedSiteGeneration(buildInput(), dependencies());
  let dossierWrites = 0;
  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
    sitesRoot,
    dossier: dossier(),
    writeDossier: async () => { dossierWrites++; return true; },
  }), /symlink/i);
  assert.equal(fs.readlinkSync(target), path.join(sitesRoot, 'missing.json'));
  assert.equal(dossierWrites, 0);
  assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json']);
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

  let dossierWrites = 0;
  await assert.rejects(() => persistResearchedSiteRecordAtomic(record, {
    sitesRoot,
    dossier: dossier(),
    writeDossier: async () => { dossierWrites++; return true; },
  }), /symlink/i);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'outside');
  assert.equal(dossierWrites, 0);
  assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json']);
});

test('preflight permits absent roots, absent targets and same identity without writing', t => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-preflight-'));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const sitesRoot = path.join(parent, 'sites');
  const target = path.join(sitesRoot, 'example-site.json');
  const fileSystem = {
    ...fs,
    mkdirSync: (() => { throw new Error('unexpected mkdir'); }) as typeof fs.mkdirSync,
    writeFileSync: (() => { throw new Error('unexpected write'); }) as typeof fs.writeFileSync,
    renameSync: (() => { throw new Error('unexpected rename'); }) as typeof fs.renameSync,
    rmSync: (() => { throw new Error('unexpected remove'); }) as typeof fs.rmSync,
  };
  const check = () => preflightResearchedSiteTarget('example-site', 'research-alpha', { sitesRoot, fileSystem });
  check();
  assert.equal(fs.existsSync(sitesRoot), false);
  fs.mkdirSync(sitesRoot);
  check();
  assert.deepEqual(fs.readdirSync(sitesRoot), []);
  const existing = JSON.stringify({
    slug: 'example-site', researchId: 'research-alpha', approvedPageId: 'home',
    collectedData: {}, copy: {}, researchedPages: [{}], researchedGraphEdges: [], createdAt: timestamp,
  });
  fs.writeFileSync(target, existing);
  check();
  assert.equal(fs.readFileSync(target, 'utf8'), existing);
  assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json']);
  assert.throws(() => preflightResearchedSiteTarget('../escape', 'research-alpha', { sitesRoot, fileSystem }), /slug/i);
  assert.throws(() => preflightResearchedSiteTarget('example-site', '../escape', { sitesRoot, fileSystem }), /research/i);
});

test('preflight rejects foreign, malformed, legacy and unknown identities without mutation', t => {
  const sitesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-preflight-collision-'));
  t.after(() => fs.rmSync(sitesRoot, { recursive: true, force: true }));
  const target = path.join(sitesRoot, 'example-site.json');
  const valid = {
    slug: 'example-site', researchId: 'research-alpha', approvedPageId: 'home',
    collectedData: {}, copy: {}, researchedPages: [{}], researchedGraphEdges: [], createdAt: timestamp,
  };
  const cases: Array<[string, Buffer]> = [
    ['foreign research', Buffer.from(JSON.stringify({ ...valid, researchId: 'research-beta' }))],
    ['foreign slug', Buffer.from(JSON.stringify({ ...valid, slug: 'other-site' }))],
    ['missing identity', Buffer.from(JSON.stringify({ ...valid, researchId: undefined }))],
    ['legacy', Buffer.from(JSON.stringify({ slug: valid.slug, researchId: valid.researchId }))],
    ['legacy flag', Buffer.from(JSON.stringify({ ...valid, legacyCoreThirty: true }))],
    ['simulation', Buffer.from(JSON.stringify({ ...valid, simulation: false }))],
    ['unknown copy', Buffer.from(JSON.stringify({ ...valid, copy: undefined }))],
    ['malformed json', Buffer.from('{not-json')],
    ['malformed utf8', Buffer.from([0xff, 0xfe])],
  ];
  for (const [name, bytes] of cases) {
    fs.writeFileSync(target, bytes);
    assert.throws(() => preflightResearchedSiteTarget(valid.slug, valid.researchId, { sitesRoot }), name);
    assert.deepEqual(fs.readFileSync(target), bytes, name);
    assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json'], name);
  }
});

test('preflight rejects symlink roots and targets, nonregular and oversized records', t => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-generation-preflight-files-'));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const sitesRoot = path.join(parent, 'sites');
  const realRoot = path.join(parent, 'real');
  fs.mkdirSync(realRoot);
  fs.symlinkSync(realRoot, sitesRoot);
  const check = (root = sitesRoot, fileSystem = fs) =>
    preflightResearchedSiteTarget('example-site', 'research-alpha', { sitesRoot: root, fileSystem });
  assert.throws(() => check(), /root/i);
  assert.throws(() => check(path.join(sitesRoot, 'missing')), /root/i);
  fs.rmSync(sitesRoot);
  fs.mkdirSync(sitesRoot);
  const target = path.join(sitesRoot, 'example-site.json');
  fs.symlinkSync(path.join(parent, 'missing'), target);
  assert.throws(() => check(), /symlink/i);
  fs.rmSync(target);
  fs.mkdirSync(target);
  assert.throws(() => check(), /regular file/i);
  assert.deepEqual(fs.readdirSync(target), []);
  fs.rmdirSync(target);
  fs.writeFileSync(target, '{}');
  fs.truncateSync(target, 16 * 1024 * 1024 + 1);
  assert.throws(() => check(), /existing site record/i);
  let closed = 0;
  assert.throws(() => check(sitesRoot, {
    ...fs,
    fstatSync: ((descriptor: number) => ({ ...fs.fstatSync(descriptor), isFile: () => true, size: 0 })) as typeof fs.fstatSync,
    closeSync: descriptor => { closed++; fs.closeSync(descriptor); },
  }), /existing site record/i);
  assert.equal(closed, 1);
  assert.equal(fs.statSync(target).size, 16 * 1024 * 1024 + 1);
  assert.deepEqual(fs.readdirSync(sitesRoot), ['example-site.json']);
});

test('generate route authenticates before parsing or touching generation and persistence seams', () => {
  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/site-bot/generate/route.ts'), 'utf8');
  const auth = route.indexOf('verifyAdminToken(');
  const body = route.indexOf('req.json()');
  const dossierRead = route.indexOf('readResearchDossier(');
  const gate = route.indexOf('assertResearchedGenerationReady(');
  const preflight = route.indexOf('preflightResearchedSiteTarget(');
  const generation = route.indexOf('buildResearchedSiteGeneration(');
  const persistence = route.indexOf('persistResearchedSiteRecordAtomic(');
  assert.ok(auth >= 0 && body > auth);
  assert.ok(dossierRead > body);
  assert.ok(gate > dossierRead && preflight > gate && generation > preflight);
  assert.ok(generation > dossierRead);
  assert.ok(persistence > generation);
});

test('canonical generation suite exercises synthetic actual-handler route cases', () => {
  const output = execFileSync(process.execPath, [
    '--test', path.join(process.cwd(), 'src/app/api/site-bot/generate/route.test.mjs'),
  ], { cwd: process.cwd(), encoding: 'utf8', timeout: 30_000, env: { NODE_ENV: 'test' } });
  assert.match(output, /tests 7/);
  assert.match(output, /pass 7/);
  assert.match(output, /fail 0/);
});