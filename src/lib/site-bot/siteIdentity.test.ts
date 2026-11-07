// Paid-journey v2 M2a.1 (C3/C5): site identity = service labels + slugs, generated once.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew names come from the gate config.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleSiteIdentity,
  buildSiteIdentityPrompt,
  latinServiceSlug,
  pinnedServiceLabel,
  resolveSiteIdentity,
  withPinnedLabels,
  siteIdentityInput,
  validModelLabel,
  validModelSlug,
} from './siteIdentity';
import { planCopyReadyDossier } from './researchToSite';
import { SERVICE_LABEL_PINS } from '../lp/generationData';
import type { SiteResearchDossier } from './research/types';

// Synthetic Hebrew-script letter sequences (test data, not copy).
const HE_A = '\u05D0\u05D1\u05D2 \u05D3\u05D4\u05D5';
const HE_B = '\u05D7\u05D8\u05D9';
const now = () => new Date('2026-11-08T00:00:00.000Z');

test('slug generator: Latin names are deterministic 1-4 word slugs; model slugs must be 2-4 Latin words; reserved/invalid -> svc hash', () => {
  assert.equal(latinServiceSlug('Water heater install'), 'water-heater-install');
  assert.equal(latinServiceSlug('Emergency electrician, 24/7 call-out service'), 'emergency-electrician-24-7');
  assert.equal(latinServiceSlug('contact'), '');
  assert.equal(latinServiceSlug(HE_A), '');
  assert.equal(validModelSlug('leak-detection'), 'leak-detection');
  assert.equal(validModelSlug('Leak-Detection'), 'leak-detection');
  for (const bad of ['leak', 'leak detection', 'a-b-c-d-e', 'svc-abc-def', 'services-page'.replace('-page', ''), '', 42, 'leak_detection']) {
    assert.equal(validModelSlug(bad), '', String(bad));
  }
  const identity = assembleSiteIdentity(siteIdentityInput([HE_A, 'drain unblocking', HE_B], { businessNiche: 'plumber', targetLocation: 'Holon' }),
    { 'service-0': { slug: 'leak-detection', label: 'ignored for Hebrew input' }, 'service-2': { slug: 'NOT A SLUG!' } }, now);
  assert.deepEqual(identity.services.map(item => item.slug).slice(0, 2), ['leak-detection', 'drain-unblocking']);
  assert.match(identity.services[2].slug, /^svc-[0-9a-f]{10}$/);
  // Hebrew owner wording is the label verbatim (model label ignored).
  assert.equal(identity.services[0].label, HE_A);
  assert.equal(identity.via, 'model');
});

test('labels: Latin owner wording gets a validated Hebrew label from the model; invalid labels keep the owner wording; places are never widened', () => {
  assert.equal(validModelLabel(HE_A), HE_A);
  assert.equal(validModelLabel(`${HE_A} plus`), '');
  assert.equal(validModelLabel('x'.repeat(30)), '');
  const input = siteIdentityInput(['drain unblocking'], { businessNiche: 'plumber', targetLocation: 'Holon', specificCities: 'Holon, Bat Yam' });
  assert.deepEqual(input.places, ['Holon', 'Bat Yam']);
  const prompt = buildSiteIdentityPrompt(input)!;
  assert.match(prompt, /never.*|no region or "and surroundings"/);
  assert.doesNotMatch(prompt, /[\u0590-\u05FF]/);
  const identity = assembleSiteIdentity(input, {
    'service-0': { label: HE_A }, 'place-0': { label: HE_B }, 'place-1': { label: 'Bat Yam and area' }, trade: { label: '' },
  }, now);
  assert.equal(identity.services[0].label, HE_A);
  assert.equal(identity.services[0].slug, 'drain-unblocking');
  assert.deepEqual(identity.serviceArea, [HE_B, 'Bat Yam']);
  assert.equal(identity.baseCity, HE_B);
  assert.equal(identity.trade, 'plumber');
});

test('M2a.2 item 4: pinned service labels beat the model and the owner wording, also on persisted identities; slugs unchanged', () => {
  const input = siteIdentityInput(['Leak  Detection', 'water heater install', 'drain unblocking'], { businessNiche: 'plumber', targetLocation: 'Holon' });
  // Pinned items are not sent to the model for a label.
  assert.doesNotMatch(buildSiteIdentityPrompt(input)!, /"key":"service-0","kind":"service","text":"Leak  Detection","needsLabel":true/);
  const identity = assembleSiteIdentity(input, { 'service-0': { label: HE_A }, 'service-1': { label: HE_B }, 'service-2': { label: HE_B } }, now);
  assert.deepEqual(identity.services.map(item => [item.label, item.slug]), [
    [SERVICE_LABEL_PINS['leak detection'], 'leak-detection'],
    [SERVICE_LABEL_PINS['water heater install'], 'water-heater-install'],
    [HE_B, 'drain-unblocking'],
  ]);
  assert.equal(pinnedServiceLabel('drain unblocking'), null);
  const persisted = { ...identity, services: identity.services.map(item => ({ ...item, label: HE_A })) };
  assert.deepEqual(withPinnedLabels(persisted).services.map(item => [item.label, item.slug]), [
    [SERVICE_LABEL_PINS['leak detection'], 'leak-detection'], [SERVICE_LABEL_PINS['water heater install'], 'water-heater-install'], [HE_A, 'drain-unblocking'],
  ]);
});

test('resolveSiteIdentity makes at most one model call and degrades to deterministic output on any failure', async () => {
  let calls = 0;
  const input = siteIdentityInput([HE_A], { businessNiche: 'plumber' });
  const failed = await resolveSiteIdentity(input, async () => { calls++; throw new Error('down'); }, now);
  assert.equal(calls, 1);
  assert.match(failed.services[0].slug, /^svc-[0-9a-f]{10}$/);
  assert.equal(failed.via, 'deterministic');
  // Nothing to ask (all Hebrew wording, all-Latin slugs): no call at all.
  calls = 0;
  await resolveSiteIdentity(siteIdentityInput([], { businessNiche: HE_B }), async () => { calls++; return '{}'; }, now);
  assert.equal(calls, 0);
});

test('the slug is generated once: the plan persists it and a planned dossier is never re-slugged', () => {
  const t = '2026-11-08T00:00:00.000Z';
  const dossier: SiteResearchDossier = {
    researchId: 'r1', status: 'architecture_ready', createdAt: t, updatedAt: t,
    businessTruth: { businessName: 'TEST', status: 'verified', assertions: [] },
    evidence: [], evidenceEdges: [], keywordEvidence: [], serpObservations: [],
    pageOpportunities: [
      { id: `service:${HE_A}`, targetPath: '/services/x', opportunity: HE_A, evidenceIds: ['o'], status: 'ready' },
      { id: 'service:dup', targetPath: '/services/y', opportunity: HE_B, evidenceIds: ['o'], status: 'ready' },
    ],
    internalLinkEdges: [], providerUsage: [], humanGates: [],
  };
  const identity = assembleSiteIdentity(siteIdentityInput([HE_A, HE_B], { businessNiche: 'plumber' }),
    { 'service-0': { slug: 'leak-detection' }, 'service-1': { slug: 'leak-detection' } }, now);
  const planned = planCopyReadyDossier(dossier, now, identity);
  assert.deepEqual(planned.pageOpportunities.map(item => [item.id, item.targetPath, item.displayName ?? null]), [
    ['home', '/', null], ['svc-leak-detection', '/services/leak-detection', HE_A], ['svc-leak-detection-2', '/services/leak-detection-2', HE_B],
  ]);
  assert.deepEqual(planned.siteIdentity, identity);
  const other = assembleSiteIdentity(siteIdentityInput([HE_A, HE_B], { businessNiche: 'plumber' }), { 'service-0': { slug: 'something-else' } }, now);
  assert.deepEqual(planCopyReadyDossier(planned, now, other), planned);
});
