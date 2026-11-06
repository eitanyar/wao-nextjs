import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { SiteCopy } from '../../lp/lpCopyPrompt';
import { assertDeployReady } from './pipelineState';
import type { SiteResearchDossier } from './types';
import { buildResearchedCopyReviewPacket, matchesResearchedCopyReviewPacket } from './copyReviewPacket';

const date = '2026-09-20T00:00:00.000Z';

function copy(headline: string): SiteCopy {
  return {
    heroHeadline: headline, heroSubheadline: 'Summary', heroCta: 'Contact', trustBarItems: [],
    aboutBlurb: 'About', servicesHeadline: 'Services', serviceItems: [], faqHeadline: 'FAQ',
    faqItems: [], guaranteeBlock: 'Guarantee', reviewFeatured: null, reviewContext: null,
    responseTimeBadge: null, scarcityLine: null, formHeadline: 'Contact', stickyBarLine: 'Call',
    aboutPageHeadline: 'About', aboutPageBody: 'About text', serviceDetails: [],
  };
}

function record() {
  const home = copy('Home');
  return {
    slug: 'example-site', researchId: 'research-alpha', approvedPageId: 'home', copy: home,
    collectedData: { businessName: 'Example', phone: '000' }, createdAt: date,
    researchedPages: [
      { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: home },
      { opportunityId: 'service', classification: 'money_service', targetPath: '/service', copy: copy('Service') },
      { opportunityId: 'proof', classification: 'proof', targetPath: '/proof', copy: copy('Proof') },
    ],
    researchedGraphEdges: [{ fromId: 'home', toId: 'service' }, { fromId: 'service', toId: 'proof' }],
  };
}

function dossier(): SiteResearchDossier {
  return {
    researchId: 'research-alpha', status: 'copy_ready', createdAt: date, updatedAt: date,
    businessTruth: { businessName: 'Example', assertions: [], status: 'verified' },
    evidence: [], evidenceEdges: [], keywordEvidence: [], serpObservations: [],
    pageOpportunities: [
      { id: 'home', targetPath: '/', opportunity: 'Home', status: 'ready', evidenceIds: [] },
      { id: 'service', targetPath: '/service', opportunity: 'Service', status: 'ready', evidenceIds: [] },
      { id: 'proof', targetPath: '/proof', opportunity: 'Proof', status: 'ready', evidenceIds: [] },
    ],
    internalLinkEdges: [], providerUsage: [], humanGates: [],
    pipelineChecks: { copy: 'pass', hebrewQa: 'pending', neuronEvaluation: 'skip', duplicateCannibalization: 'pass' },
  };
}

const bytes = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2));

test('packet inventories every researched page in record order, binds raw bytes, and changes neither source', () => {
  const sourceRecord = record();
  const sourceDossier = dossier();
  const originalRecord = structuredClone(sourceRecord);
  const originalDossier = structuredClone(sourceDossier);
  const raw = bytes(sourceRecord);
  const originalBytes = Buffer.from(raw);
  const packet = buildResearchedCopyReviewPacket(raw, sourceDossier);
  assert.deepEqual(packet, {
    sha256: createHash('sha256').update(raw).digest('hex'),
    researchId: 'research-alpha', slug: 'example-site', approvedPageId: 'home', pageCount: 3,
    pages: [
      { opportunityId: 'home', classification: 'homepage', targetPath: '/' },
      { opportunityId: 'service', classification: 'money_service', targetPath: '/service' },
      { opportunityId: 'proof', classification: 'proof', targetPath: '/proof' },
    ],
  });
  assert.equal(matchesResearchedCopyReviewPacket(raw, packet), true);
  assert.equal(matchesResearchedCopyReviewPacket(new Uint8Array(raw), packet), true);
  assert.equal(matchesResearchedCopyReviewPacket(bytes(sourceRecord), packet), true);
  assert.equal(matchesResearchedCopyReviewPacket(Buffer.from(JSON.stringify(sourceRecord)), packet), false);
  assert.deepEqual(sourceRecord, originalRecord);
  assert.deepEqual(sourceDossier, originalDossier);
  assert.deepEqual(raw, originalBytes);
  sourceRecord.researchedPages[1].targetPath = '/changed';
  assert.equal(packet.pages[1].targetPath, '/service');
  assert.deepEqual(assertDeployReady(sourceDossier), {
    ready: false, reasons: ['hebrew_qa_not_passed', 'deploy_not_ready'],
  });
  assert.equal(sourceDossier.status, 'copy_ready');
  assert.equal(sourceDossier.pipelineChecks?.hebrewQa, 'pending');
});

test('regeneration with changed copy invalidates old packet, even when metadata is unchanged', () => {
  const source = record();
  const prior = bytes(source);
  const packet = buildResearchedCopyReviewPacket(prior, dossier());
  source.researchedPages[2].copy.heroHeadline = 'Revised proof';
  const next = bytes(source);
  assert.equal(matchesResearchedCopyReviewPacket(next, packet), false);
  const updated = buildResearchedCopyReviewPacket(next, dossier());
  assert.deepEqual(updated.pages, packet.pages);
  assert.notEqual(updated.sha256, packet.sha256);
  assert.equal(matchesResearchedCopyReviewPacket(next, updated), true);
});

test('rejects malformed bytes, non-researched or simulation records, invalid dossier state', () => {
  const valid = record();
  const baseline = dossier();
  for (const invalid of [Buffer.from('not json'), Buffer.from([0xff]), Buffer.from('null'), Buffer.alloc(0)]) {
    assert.throws(() => buildResearchedCopyReviewPacket(invalid, baseline));
  }
  const badRecords: unknown[] = [
    { ...valid, simulation: true }, { ...valid, legacyCoreThirty: true },
    { ...valid, researchId: undefined }, { ...valid, slug: '../bad' },
    { ...valid, approvedPageId: 'service' }, { ...valid, copy: copy('Different') },
    { ...valid, researchedPages: undefined },
  ];
  for (const invalid of badRecords) assert.throws(() => buildResearchedCopyReviewPacket(bytes(invalid), baseline));
  const badDossiers: SiteResearchDossier[] = [
    { ...baseline, researchId: 'other' }, { ...baseline, status: 'deploy_ready' },
    { ...baseline, pipelineChecks: { copy: 'pending', hebrewQa: 'pending' } },
    { ...baseline, pipelineChecks: { copy: 'pass', hebrewQa: 'pass' } },
  ];
  for (const invalid of badDossiers) assert.throws(() => buildResearchedCopyReviewPacket(bytes(valid), invalid));
});

test('rejects duplicate, unsafe, incomplete, orphan, and mismatched inventories', () => {
  const source = record();
  const baseline = dossier();
  const alteredRecords = [
    { ...source, researchedPages: [source.researchedPages[0], source.researchedPages[1], { ...source.researchedPages[2], opportunityId: 'service' }] },
    { ...source, researchedPages: [source.researchedPages[0], source.researchedPages[1], { ...source.researchedPages[2], targetPath: '/service' }] },
    { ...source, researchedPages: [source.researchedPages[0], source.researchedPages[1], { ...source.researchedPages[2], targetPath: '/../bad' }] },
    { ...source, researchedPages: [source.researchedPages[0], source.researchedPages[1], { ...source.researchedPages[2], targetPath: '/api' }] },
    { ...source, researchedPages: source.researchedPages.slice(0, 2) },
    { ...source, researchedGraphEdges: [{ fromId: 'home', toId: 'service' }] },
    { ...source, researchedGraphEdges: [{ fromId: 'home', toId: 'service' }, { fromId: 'service', toId: 'missing' }] },
  ];
  for (const invalid of alteredRecords) assert.throws(() => buildResearchedCopyReviewPacket(bytes(invalid), baseline));
  const alteredDossiers = [
    { ...baseline, pageOpportunities: [...baseline.pageOpportunities, baseline.pageOpportunities[0]] },
    { ...baseline, pageOpportunities: baseline.pageOpportunities.map(item => item.id === 'proof' ? { ...item, targetPath: '/different' } : item) },
    { ...baseline, pageOpportunities: baseline.pageOpportunities.map(item => item.id === 'proof' ? { ...item, status: 'held' as const } : item) },
    { ...baseline, pageOpportunities: [...baseline.pageOpportunities, { id: 'extra', targetPath: '/extra', opportunity: 'Extra', evidenceIds: [], status: 'ready' as const }] },
  ];
  for (const invalid of alteredDossiers) assert.throws(() => buildResearchedCopyReviewPacket(bytes(source), invalid));
});

test('matcher fails closed on forged, malformed, or mismatched packet metadata', () => {
  const raw = bytes(record());
  const packet = buildResearchedCopyReviewPacket(raw, dossier());
  const badPackets = [
    { ...packet, sha256: 'f'.repeat(64) }, { ...packet, sha256: packet.sha256.toUpperCase() },
    { ...packet, sha256: 'not-a-digest' }, { ...packet, slug: 'other-site' },
    { ...packet, pageCount: 2 }, { ...packet, approvedPageId: 'service' },
    { ...packet, pages: [...packet.pages].reverse() },
    { ...packet, pages: packet.pages.map((page, index) => index === 1 ? { ...page, targetPath: '/wrong' } : page) },
    { ...packet, pages: [packet.pages[0], packet.pages[0], packet.pages[2]] },
    { ...packet, reviewApproved: true },
  ];
  for (const invalid of badPackets) assert.equal(matchesResearchedCopyReviewPacket(raw, invalid), false);
  assert.equal(matchesResearchedCopyReviewPacket(Buffer.from('bad'), packet), false);
});
