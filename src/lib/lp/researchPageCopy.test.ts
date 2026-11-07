import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertBoundedGeneratedSiteCopy,
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

test('bounded copy rejects malformed shapes, excess fields and sparse arrays generically', () => {
  const sparse = [copy.trustBarItems[0], 'second'];
  delete sparse[1];
  const cases: unknown[] = [
    null, [], { ...copy, heroHeadline: undefined }, { ...copy, heroHeadline: '   ' },
    { ...copy, heroHeadline: 'x'.repeat(69) }, { ...copy, extra: 'private model content' },
    { ...copy, reviewFeatured: 'Quote' }, { ...copy, reviewContext: 'Context' },
    { ...copy, scarcityLine: 'Limited' }, { ...copy, responseTimeBadge: 12 },
    { ...copy, trustBarItems: sparse }, { ...copy, trustBarItems: ['x'.repeat(21)] },
    { ...copy, serviceItems: Array(7).fill('Item') },
    { ...copy, faqItems: [{ q: 'Q', a: '' }] },
    { ...copy, faqItems: [{ q: 'Q', a: 'A', extra: 'no' }] },
    { ...copy, faqItems: [null] },
    { ...copy, serviceDetails: [{ name: 'Name', description: { nested: 'no' } }] },
    { ...copy, serviceDetails: [{ name: 'x'.repeat(26), description: 'Detail' }] },
  ];
  for (const [index, candidate] of cases.entries()) {
    assert.throws(() => assertBoundedGeneratedSiteCopy(candidate), /^Error: Invalid bounded generated site copy\.$/, `case ${index}`);
  }
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy(copy));
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy({
    ...copy, faqItems: [], reviewFeatured: 'Quote', reviewContext: 'Context', responseTimeBadge: 'Soon',
  }));
});

test('malformed Tamar output never calls Noa and malformed Noa output is never returned', async () => {
  for (const tamar of ['{private model text', JSON.stringify({ ...copy, heroHeadline: 'x'.repeat(69) }),
    `${JSON.stringify(copy)}${' '.repeat(16 * 1024)}`]) {
    let calls = 0;
    await assert.rejects(() => generateResearchPageCopy(brief(), {}, {
      callJson: async () => {
        calls++;
        if (calls !== 1) throw new Error('unexpected Noa call');
        return tamar;
      },
    }), /^Error: Invalid bounded generated site copy\.$/);
    assert.equal(calls, 1);
  }
  for (const noa of ['{private model text', JSON.stringify({ ...copy, serviceDetails: [{ name: 'Name', description: '' }] })]) {
    let calls = 0;
    await assert.rejects(() => generateResearchPageCopy(brief(), {}, {
      callJson: async () => {
        calls++;
        if (calls === 1) return JSON.stringify(copy);
        if (calls === 2) return noa;
        throw new Error('unexpected provider call');
      },
    }), /^Error: Invalid bounded generated site copy\.$/);
    assert.equal(calls, 2);
  }
});

test('FAQ policy result is bounded after Noa and retains valid supported candidates', async () => {
  const candidate = brief();
  candidate.faqCandidates[0].answer = 'x'.repeat(121);
  let calls = 0;
  await assert.rejects(() => generateResearchPageCopy(candidate, {}, {
    callJson: async () => { calls++; return JSON.stringify(copy); },
  }), /^Error: Invalid bounded generated site copy\.$/);
  assert.equal(calls, 2);

  const seen: string[] = [];
  const generated = await generateResearchPageCopy(brief(), {}, {
    callJson: async (system) => { seen.push(system); return JSON.stringify(copy); },
  });
  assert.equal(seen.length, 2);
  assert.match(seen[0], /Tamar/);
  assert.match(seen[1], /Noa/);
  assert.deepEqual(generated.faqItems, [{ q: 'What does alpha service include?', a: 'Scope is confirmed before booking.' }]);
});

test('validator failures carry stage + every field/limit/actual, never the copy text (M0.5 B4)', async () => {
  const { GeneratedCopyValidationError, explainGeneratedSiteCopyViolations } = await import('./researchPageCopy');
  // The four-way M0 failure shape: every hard limit broken at once.
  const broken = {
    ...copy,
    stickyBarLine: 's'.repeat(33),
    servicesHeadline: 'h'.repeat(54),
    trustBarItems: ['t'.repeat(21)],
    serviceItems: ['ok', 'v'.repeat(26)],
    reviewFeatured: 'secret quote text',
    reviewContext: null,
  };
  let caught: unknown;
  await generateResearchPageCopy(brief(), {}, { callJson: async () => JSON.stringify(broken) }).catch(error => { caught = error; });
  assert.ok(caught instanceof GeneratedCopyValidationError);
  assert.match(String(caught), /^Error: Invalid bounded generated site copy\.$/);
  assert.equal(caught.stage, 'tamar');
  assert.deepEqual(caught.violations, [
    { field: 'servicesHeadline', rule: 'max_length', limit: 35, actual: 54 },
    { field: 'stickyBarLine', rule: 'max_length', limit: 25, actual: 33 },
    { field: 'reviewFeatured+reviewContext', rule: 'both_or_neither', actual: 'reviewFeatured_only' },
    { field: 'trustBarItems[0]', rule: 'max_length', limit: 20, actual: 21 },
    { field: 'serviceItems[1]', rule: 'max_length', limit: 25, actual: 26 },
  ]);
  assert.doesNotMatch(JSON.stringify(caught.violations), /secret quote|sss|hhh/);

  let calls = 0;
  caught = undefined;
  await generateResearchPageCopy(brief(), {}, { callJson: async () => (++calls === 1 ? JSON.stringify(copy) : '{not json') })
    .catch(error => { caught = error; });
  assert.ok(caught instanceof GeneratedCopyValidationError);
  assert.equal(caught.stage, 'noa');
  assert.deepEqual(caught.violations, [{ field: '$', rule: 'invalid_json' }]);

  assert.deepEqual(explainGeneratedSiteCopyViolations(copy), []);
  assert.deepEqual(explainGeneratedSiteCopyViolations({ ...copy, extra: 1, heroCta: undefined }).map(v => `${v.field}:${v.rule}`), [
    'extra:unexpected', 'heroCta:type',
  ]);
});
