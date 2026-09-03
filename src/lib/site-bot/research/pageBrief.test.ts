import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PAGE_BRIEF_PAYLOAD_CHARS,
  compilePageBrief,
  selectFaqCandidates,
  type PageBriefInput,
} from './pageBrief';

const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });

const input = (overrides: Partial<PageBriefInput> = {}): PageBriefInput => ({
  page: { id: 'service-alpha', targetPath: '/services/alpha', pageClass: 'money_service' },
  persona: approved('persona-owner', 'Urgent local buyer'),
  waoOffer: approved('offer-managed-service', 'Managed acquisition and conversion support'),
  targetQueries: [approved('query-alpha', 'alpha service near me')],
  entityAnchors: [approved('entity-alpha', 'Alpha service')],
  firstPartyProof: [approved('proof-license', 'Licensed operator')],
  localFacts: [approved('local-service-area', 'Serves the verified local area')],
  customerDecisions: [approved('decision-priority', 'Prioritize emergency response')],
  constraints: [approved('constraint-hours', 'Weekday availability only')],
  links: [{ targetPath: '/', relationship: 'site_hierarchy', evidenceIds: ['entity-alpha'] }],
  informationGainGaps: ['Need a documented arrival-time commitment.'],
  prohibitedClaims: ['Do not claim a fixed location.'],
  faqCandidates: [],
  ...overrides,
});

test('compilePageBrief includes a supported relevant FAQ and marks it optional', () => {
  const brief = compilePageBrief(input({
    faqCandidates: [{
      id: 'faq-response-time',
      question: 'How quickly can the service arrive?',
      answer: 'Arrival timing is confirmed during scheduling.',
      source: 'paa',
      relevance: 0.9,
      answerEvidenceIds: ['proof-license'],
    }],
  }));

  assert.equal(brief.faqPolicy, 'optional');
  assert.deepEqual(brief.faqCandidates.map(item => item.id), ['faq-response-time']);
});

test('compilePageBrief permits FAQ omission and rejects unsupported answers', () => {
  const brief = compilePageBrief(input({
    faqCandidates: [{
      id: 'faq-unsupported',
      question: 'Can the service arrive immediately?',
      answer: 'Arrival is guaranteed immediately.',
      source: 'review',
      relevance: 0.95,
      answerEvidenceIds: ['missing-proof'],
    }],
  }));

  assert.equal(brief.faqPolicy, 'none');
  assert.deepEqual(brief.faqCandidates, []);
});

test('selectFaqCandidates rejects questions already used by a sibling page', () => {
  const selected = selectFaqCandidates([
    {
      id: 'faq-duplicate',
      question: 'What does alpha service cost?',
      answer: 'Pricing is confirmed after scope review.',
      source: 'owner_faq',
      relevance: 0.9,
      answerEvidenceIds: ['proof-license'],
    },
    {
      id: 'faq-distinct',
      question: 'Which local areas are served?',
      answer: 'Coverage is confirmed before scheduling.',
      source: 'sales_objection',
      relevance: 0.8,
      answerEvidenceIds: ['proof-license'],
    },
  ], new Set(['what does alpha service cost']), new Set(['proof-license']));

  assert.deepEqual(selected.map(item => item.id), ['faq-distinct']);
});

test('compilePageBrief includes only approved local facts and references evidence by concise ID and value', () => {
  const brief = compilePageBrief(input({
    localFacts: [
      approved('local-area', 'Serves the verified local area'),
      { id: 'unapproved-area', value: 'Unverified coverage', status: 'held' },
    ],
  }));

  assert.deepEqual(brief.assertableLocalFacts, [{ id: 'local-area', value: 'Serves the verified local area' }]);
});

test('compilePageBrief keeps a large evidence set below the profile-safe payload bound', () => {
  const brief = compilePageBrief(input({
    firstPartyProof: Array.from({ length: 2000 }, (_, index) => approved(`proof-${index}`, `Proof ${index} ${'x'.repeat(120)}`)),
  }));

  assert.ok(JSON.stringify(brief).length <= MAX_PAGE_BRIEF_PAYLOAD_CHARS);
  assert.ok(brief.firstPartyProof.length < 2000);
});
