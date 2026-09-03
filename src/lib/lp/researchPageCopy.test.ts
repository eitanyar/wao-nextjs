import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildResearchPageCopyPrompt,
  buildSimulationGenerationResult,
  generateResearchPageCopy,
  isApprovedPortfolioBrief,
} from './researchPageCopy';
import type { SiteCopy } from './lpCopyPrompt';
import type { PageBrief } from '../site-bot/research/pageBrief';
import type { SiteResearchDossier } from '../site-bot/research/types';

const brief = (faqPolicy: PageBrief['faqPolicy'] = 'optional'): PageBrief => ({
  page: { id: 'page-alpha', targetPath: '/services/alpha', pageClass: 'money_service' },
  persona: { id: 'persona', value: 'Local buyer' },
  waoOffer: { id: 'offer', value: 'Managed service' },
  targetQueries: [{ id: 'query', value: 'alpha service' }],
  approvedEntityAnchors: [{ id: 'entity', value: 'Alpha service' }],
  firstPartyProof: [{ id: 'proof', value: 'Licensed provider' }],
  assertableLocalFacts: [{ id: 'local', value: 'Serves the approved area' }],
  customerDecisions: [{ id: 'decision', value: 'Fast booking matters' }],
  constraints: [{ id: 'constraint', value: 'No unverified claims' }],
  links: [{ targetPath: '/', relationship: 'site_hierarchy', evidenceIds: ['entity'] }],
  informationGainGaps: ['No arrival commitment is available.'],
  prohibitedClaims: ['Do not claim a storefront.'],
  faqPolicy,
  faqCandidates: faqPolicy === 'none' ? [] : [{
    id: 'faq-supported', question: 'What does alpha service include?', answer: 'Scope is confirmed before booking.',
    source: 'owner_faq', relevance: 0.9, answerEvidenceIds: ['proof'],
  }],
});

const copy: SiteCopy = {
  heroHeadline: 'Headline', heroSubheadline: 'Subheadline', heroCta: 'Call',
  trustBarItems: ['Proof'], aboutBlurb: 'About', servicesHeadline: 'Services',
  serviceItems: ['Alpha'], faqHeadline: 'FAQ', faqItems: [{ q: 'Unsupported?', a: 'Unsupported answer.' }],
  guaranteeBlock: 'Guarantee', reviewFeatured: null, reviewContext: null,
  responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky',
  aboutPageHeadline: 'About page', aboutPageBody: 'About page body',
  serviceDetails: [{ name: 'Alpha', description: 'Description' }],
};

function dossier(status: SiteResearchDossier['status'] = 'copy_ready'): SiteResearchDossier {
  const timestamp = '2026-09-02T00:00:00.000Z';
  return {
    researchId: 'research-alpha', status, createdAt: timestamp, updatedAt: timestamp,
    businessTruth: { businessName: 'Business', assertions: [], status: 'verified' },
    evidence: [], evidenceEdges: [], keywordEvidence: [], serpObservations: [],
    pageOpportunities: [{ id: 'page-alpha', targetPath: '/services/alpha', opportunity: 'Alpha', evidenceIds: ['entity'], status: 'ready' }],
    internalLinkEdges: [], providerUsage: [], humanGates: [],
  };
}

test('research copy requires a copy-ready dossier and an approved portfolio page', () => {
  assert.equal(isApprovedPortfolioBrief(dossier(), brief()), true);
  assert.equal(isApprovedPortfolioBrief(dossier('architecture_ready'), brief()), false);
  assert.equal(isApprovedPortfolioBrief(dossier(), { ...brief(), page: { id: 'other', targetPath: '/other', pageClass: 'money_service' } }), false);
});

test('research prompt includes prohibited claims and supported FAQ policy', () => {
  const prompt = buildResearchPageCopyPrompt(brief());
  assert.ok(prompt.includes('Do not claim a storefront.'));
  assert.ok(prompt.includes('What does alpha service include?'));
  assert.ok(prompt.includes('faqPolicy'));
});

test('simulation result is deterministic and explicitly non-deployable', () => {
  assert.deepEqual(
    buildSimulationGenerationResult({ businessNiche: 'Alpha', businessName: 'Business', primaryService: 'Service' }),
    { mode: 'simulation', source: 'deterministic', businessName: 'Business', primaryService: 'Service', deployable: false },
  );
});

test('FAQ policy none omits FAQ output even if a mocked model supplies one', async () => {
  const generated = await generateResearchPageCopy(brief('none'), {}, {
    callJson: async () => JSON.stringify(copy),
  });
  assert.deepEqual(generated.faqItems, []);
});

test('FAQ output uses only supported candidates instead of mocked unsupported claims', async () => {
  const generated = await generateResearchPageCopy(brief(), {}, {
    callJson: async () => JSON.stringify(copy),
  });
  assert.deepEqual(generated.faqItems, [{ q: 'What does alpha service include?', a: 'Scope is confirmed before booking.' }]);
});

test('Tamar failure rejects rather than returning fallback copy', async () => {
  await assert.rejects(() => generateResearchPageCopy(brief(), {}, {
    callJson: async () => { throw new Error('tamar failure'); },
  }), /tamar failure/);
});

test('Noa failure rejects rather than returning unreviewed Tamar copy', async () => {
  let calls = 0;
  await assert.rejects(() => generateResearchPageCopy(brief(), {}, {
    callJson: async () => {
      calls += 1;
      if (calls === 1) return JSON.stringify(copy);
      throw new Error('noa failure');
    },
  }), /noa failure/);
  assert.equal(calls, 2);
});
