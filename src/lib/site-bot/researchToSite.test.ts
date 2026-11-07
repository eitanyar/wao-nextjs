// Paid-journey v2 M2a (B3): research -> copy_ready -> briefs -> generated site record.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import { GeneratedCopyValidationError } from '../lp/researchPageCopy';
import { fixtureResearchProviders } from './research/fixtureProviders';
import { readResearchDossier, writeResearchDossierAtomic } from './research/researchStore';
import { runSiteResearch } from './research/runResearch';
import type { SiteResearchDossier } from './research/types';
import {
  buildPageBriefs,
  generationReadiness,
  planCopyReadyDossier,
  runResearchToSite,
  safeOpportunityIdentity,
} from './researchToSite';

const now = () => new Date('2026-11-08T00:00:00.000Z');

const data: CollectedData = {
  businessName: 'TEST M2a Unit Plumbing',
  businessNiche: 'plumber',
  primaryService: 'leak detection',
  secondaryServices: 'drain unblocking',
  priorityServices: ['leak detection'],
  serviceModel: 'field',
  targetLocation: 'Holon',
  specificCities: 'Holon, Bat Yam',
  travelBoundary: '15 km from Holon',
  usp: 'Camera leak detection, two-year warranty',
  idealClientFear: 'A plumber who breaks tiles and disappears',
  yearsInField: '12',
  phone: '050-0000000',
};

const copy: SiteCopy = {
  heroHeadline: 'Headline', heroSubheadline: 'Subheadline', heroCta: 'Call',
  trustBarItems: ['Proof'], aboutBlurb: 'About', servicesHeadline: 'Services',
  serviceItems: ['Alpha'], faqHeadline: 'FAQ', faqItems: [],
  guaranteeBlock: 'Guarantee', reviewFeatured: null, reviewContext: null,
  responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky',
  aboutPageHeadline: 'About page', aboutPageBody: 'About page body',
  serviceDetails: [{ name: 'Alpha', description: 'Description' }],
};

function dirs() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'm2a-orch-'));
  return { researchBaseDir: path.join(root, 'site-research'), sitesRoot: path.join(root, 'sites') };
}

function fixtureResearch(calls: string[] = []) {
  return (id: string, input: Parameters<typeof runSiteResearch>[1], options: Parameters<typeof runSiteResearch>[2] = {}) => {
    calls.push(id);
    return runSiteResearch(id, input, { ...options, providers: fixtureResearchProviders() });
  };
}

test('fixture business: no dossier -> research -> architecture_ready -> copy_ready -> valid site record', async () => {
  const roots = dirs();
  const briefsSeen: string[] = [];
  const outcome = await runResearchToSite({ slug: 'm2a-unit-plumbing', researchId: 'm2a-unit-a', collectedData: data }, {
    ...roots, now, runResearch: fixtureResearch(),
    generateCopy: async brief => { briefsSeen.push(`${brief.page.id}:${brief.page.pageClass}`); return copy; },
  });
  assert.equal(outcome.status, 'generated', JSON.stringify(outcome));
  if (outcome.status !== 'generated') return;
  assert.equal(outcome.transitioned, true);
  assert.deepEqual(outcome.pages, [
    { id: 'home', targetPath: '/', pageClass: 'homepage' },
    { id: 'svc-leak-detection', targetPath: '/services/leak-detection', pageClass: 'money_service' },
    { id: 'svc-drain-unblocking', targetPath: '/services/drain-unblocking', pageClass: 'money_service' },
  ]);
  assert.deepEqual(briefsSeen, ['home:homepage', 'svc-leak-detection:money_service', 'svc-drain-unblocking:money_service']);
  const dossier = await readResearchDossier('m2a-unit-a', roots.researchBaseDir, { bounded: true });
  assert.equal(dossier?.status, 'copy_ready');
  assert.deepEqual(dossier?.pipelineChecks, { copy: 'pass', hebrewQa: 'pending' });
  assert.deepEqual(dossier?.pageOpportunities.map(item => item.sourceOpportunityId), ['home', 'service:leak detection', 'service:drain unblocking']);
  const record = JSON.parse(fs.readFileSync(path.join(roots.sitesRoot, 'm2a-unit-plumbing.json'), 'utf8'));
  assert.equal(record.researchId, 'm2a-unit-a');
  assert.equal(record.researchedPages.length, 3);
  assert.deepEqual(record.researchedGraphEdges, [{ fromId: 'home', toId: 'svc-leak-detection' }, { fromId: 'home', toId: 'svc-drain-unblocking' }]);

  // Re-runnable: a copy_ready dossier regenerates from its persisted plan without re-running research.
  const calls: string[] = [];
  const again = await runResearchToSite({ slug: 'm2a-unit-plumbing', researchId: 'm2a-unit-a', collectedData: data }, {
    ...roots, now, runResearch: fixtureResearch(calls), generateCopy: async () => copy,
  });
  assert.equal(again.status, 'generated');
  assert.equal(again.status === 'generated' && again.transitioned, false);
  assert.deepEqual(calls, []);
});

test('held on truth gaps stays held: the outcome says why and nothing is generated', async () => {
  const roots = dirs();
  let generated = 0;
  const { priorityServices: _priority, travelBoundary: _travel, ...gappy } = data;
  void _priority; void _travel;
  const outcome = await runResearchToSite({ slug: 'm2a-unit-gaps', researchId: 'm2a-unit-gaps', collectedData: gappy }, {
    ...roots, now, runResearch: fixtureResearch(), generateCopy: async () => { generated++; return copy; },
  });
  assert.equal(outcome.status, 'held');
  if (outcome.status !== 'held') return;
  assert.equal(outcome.dossierStatus, 'held');
  assert.deepEqual(outcome.reasons, ['research_held', 'approval_not_granted']);
  assert.deepEqual(outcome.gates.map(gate => gate.id).sort(), ['truth_missing_priority', 'truth_missing_serviceability']);
  assert.ok(outcome.gates.every(gate => gate.status === 'held' && typeof gate.note === 'string'));
  assert.equal(generated, 0);
  assert.equal(fs.existsSync(path.join(roots.sitesRoot, 'm2a-unit-gaps.json')), false);

  // A second run never re-runs research over the hold (resume is a separate operator action).
  const calls: string[] = [];
  const again = await runResearchToSite({ slug: 'm2a-unit-gaps', researchId: 'm2a-unit-gaps', collectedData: data }, {
    ...roots, now, runResearch: fixtureResearch(calls), generateCopy: async () => { generated++; return copy; },
  });
  assert.equal(again.status, 'held');
  assert.deepEqual(calls, []);
  assert.equal(generated, 0);
  assert.equal((await readResearchDossier('m2a-unit-gaps', roots.researchBaseDir))?.status, 'held');
});

test('missing dossier with startResearch=false reports research_not_started', async () => {
  const roots = dirs();
  const outcome = await runResearchToSite({ slug: 'm2a-unit-none', researchId: 'm2a-unit-none', collectedData: data }, {
    ...roots, startResearch: false, generateCopy: async () => copy,
  });
  assert.deepEqual(outcome, { status: 'held', researchId: 'm2a-unit-none', dossierStatus: 'missing', reasons: ['research_not_started'], gates: [] });
});

function baseDossier(status: SiteResearchDossier['status']): SiteResearchDossier {
  const t = '2026-11-08T00:00:00.000Z';
  return {
    researchId: 'r1', status, createdAt: t, updatedAt: t,
    businessTruth: { businessName: 'TEST Biz', status: 'verified', assertions: [
      { id: 'owner-service:alpha', claim: 'alpha', sourceKind: 'manual', providerRecordId: 'o', retrievedAt: t, confidence: 0.95, assertionStatus: 'verified' },
    ] },
    evidence: [], evidenceEdges: [], keywordEvidence: [], serpObservations: [],
    pageOpportunities: [{ id: 'service:alpha', targetPath: '/services/alpha', opportunity: 'alpha', evidenceIds: ['o'], status: 'ready' }],
    internalLinkEdges: [], providerUsage: [], humanGates: [],
  };
}

test('state transitions: only architecture_ready moves to copy_ready; every other status is reported, not forced', () => {
  for (const status of ['pending', 'researching', 'needs_input', 'held', 'failed', 'deploy_ready'] as const) {
    assert.throws(() => planCopyReadyDossier(baseDossier(status), now), /Invalid research status transition/, status);
    assert.equal(generationReadiness(baseDossier(status)).ready, false, status);
  }
  assert.deepEqual(generationReadiness(baseDossier('pending')).reasons, ['architecture_not_ready']);
  assert.deepEqual(generationReadiness(baseDossier('needs_input')).reasons, ['research_needs_input']);
  assert.deepEqual(generationReadiness(baseDossier('deploy_ready')).reasons, ['already_deploy_ready']);
  const gated = { ...baseDossier('architecture_ready'), humanGates: [{ id: 'g1', requiredFor: 'architecture_ready' as const, status: 'pending' as const, requestedAt: 't' }] };
  assert.deepEqual(generationReadiness(gated).reasons, ['approval_not_granted']);
  assert.throws(() => planCopyReadyDossier({ ...baseDossier('architecture_ready'), status: 'copy_ready' }, now), /Invalid research status transition: copy_ready -> copy_ready/);

  const planned = planCopyReadyDossier(baseDossier('architecture_ready'), now);
  assert.equal(planned.status, 'copy_ready');
  assert.deepEqual(planned.pageOpportunities.map(item => [item.id, item.targetPath, item.pageClass, item.status]), [
    ['home', '/', 'homepage', 'ready'], ['svc-alpha', '/services/alpha', 'money_service', 'ready'],
  ]);
  assert.deepEqual(planned.internalLinkEdges.map(edge => [edge.fromPath, edge.toPath]), [['/', '/services/alpha']]);
  // Idempotent once planned.
  assert.deepEqual(planCopyReadyDossier(planned, now), planned);
});

test('non-Latin or reserved service names get a stable opaque ID and path; collisions are suffixed', () => {
  const a = safeOpportunityIdentity({ id: 'service:caf\u00e9 repair', targetPath: '/x', opportunity: 'x', evidenceIds: [], status: 'ready' });
  assert.match(a.id, /^svc-[0-9a-f]{10}$/);
  assert.equal(a.targetPath, `/services/${a.id}`);
  assert.deepEqual(safeOpportunityIdentity({ id: 'service:caf\u00e9 repair', targetPath: '/y', opportunity: 'y', evidenceIds: [], status: 'ready' }), a);
  assert.match(safeOpportunityIdentity({ id: 'service:contact', targetPath: '/', opportunity: 'c', evidenceIds: [], status: 'ready' }).id, /^svc-[0-9a-f]{10}$/);
  const dossier = baseDossier('architecture_ready');
  dossier.pageOpportunities.push({ id: 'service:Alpha', targetPath: '/services/Alpha', opportunity: 'Alpha', evidenceIds: ['o'], status: 'held' });
  const planned = planCopyReadyDossier(dossier, now);
  assert.deepEqual(planned.pageOpportunities.map(item => [item.id, item.targetPath, item.status]), [
    ['home', '/', 'ready'], ['svc-alpha', '/services/alpha', 'ready'], ['svc-alpha-2', '/services/alpha-2', 'held'],
  ]);
});

test('briefs carry owner facts verbatim, English scaffolding, no FAQ, and pass the bounded brief check', async () => {
  const planned = planCopyReadyDossier(baseDossier('architecture_ready'), now);
  const briefs = buildPageBriefs(planned, { ...data, reviewQuote: 'Came in an hour', starRating: '5' });
  assert.deepEqual(briefs.map(brief => brief.page.id), ['home', 'svc-alpha']);
  const [home, service] = briefs;
  assert.equal(home.faqPolicy, 'none');
  assert.ok(home.firstPartyProof.some(item => item.value === 'Years in the field (owner-stated): 12'));
  assert.ok(home.firstPartyProof.some(item => item.value.includes('Came in an hour | star rating: 5')));
  assert.ok(home.assertableLocalFacts.some(item => item.value === 'Service area (owner-stated): Holon'));
  assert.deepEqual(home.links, [{ targetPath: '/services/alpha', relationship: 'service_child', evidenceIds: ['entity-1'] }]);
  assert.deepEqual(service.links, [{ targetPath: '/', relationship: 'site_hierarchy', evidenceIds: ['entity-1'] }]);
  assert.ok(service.informationGainGaps.includes('No license number was supplied; do not state one.'));
  const { assertBoundedPageBrief } = await import('./research/pageBrief');
  for (const brief of briefs) assert.doesNotThrow(() => assertBoundedPageBrief(brief));
  assert.throws(() => buildPageBriefs(baseDossier('architecture_ready'), data), /no copy_ready plan/);
});

test('a copy validation failure is reported with page + violations; the dossier stays copy_ready with no record', async () => {
  const roots = dirs();
  const outcome = await runResearchToSite({ slug: 'm2a-unit-fail', researchId: 'm2a-unit-fail', collectedData: data }, {
    ...roots, now, runResearch: fixtureResearch(),
    generateCopy: async brief => {
      if (brief.page.id === 'home') return copy;
      throw new GeneratedCopyValidationError('tamar', [{ field: 'stickyBarLine', rule: 'max_length', limit: 25, actual: 40 }]);
    },
  });
  assert.deepEqual(outcome, {
    status: 'failed', researchId: 'm2a-unit-fail', step: 'generate', reason: 'copy_validation_failed', pageId: 'svc-leak-detection',
    violations: [{ field: 'stickyBarLine', rule: 'max_length', limit: 25, actual: 40 }],
  });
  assert.equal((await readResearchDossier('m2a-unit-fail', roots.researchBaseDir))?.status, 'copy_ready');
  assert.equal(fs.existsSync(path.join(roots.sitesRoot, 'm2a-unit-fail.json')), false);
});

test('an architecture_ready dossier with an unapproved gate is held, untouched', async () => {
  const roots = dirs();
  const dossier = { ...baseDossier('architecture_ready'), researchId: 'm2a-unit-gate', humanGates: [{ id: 'gate-c-ambiguous', requiredFor: 'architecture_ready' as const, status: 'pending' as const, requestedAt: 't', note: 'Ambiguous candidate evidence requires human review.' }] };
  assert.ok(await writeResearchDossierAtomic('m2a-unit-gate', dossier, roots.researchBaseDir));
  const outcome = await runResearchToSite({ slug: 'm2a-unit-gate', researchId: 'm2a-unit-gate', collectedData: data }, { ...roots, generateCopy: async () => copy });
  assert.equal(outcome.status, 'held');
  assert.deepEqual(outcome.status === 'held' && outcome.gates, [{ id: 'gate-c-ambiguous', status: 'pending', requiredFor: 'architecture_ready', note: 'Ambiguous candidate evidence requires human review.' }]);
  assert.equal((await readResearchDossier('m2a-unit-gate', roots.researchBaseDir))?.status, 'architecture_ready');
});
