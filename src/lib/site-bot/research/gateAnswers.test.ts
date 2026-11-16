// Research-gate answers -> site facts at build time (2026-11-17). HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CollectedData } from '../../bot/prompts';
import type { SiteCopy } from '../../lp/lpCopyPrompt';
import type { PageBrief } from './pageBrief';
import { fixtureResearchProviders } from './fixtureProviders';
import { readResearchDossier, writeResearchDossierAtomic } from './researchStore';
import { runSiteResearch } from './runResearch';
import { deriveOpenResearchGates, persistResearchGateApproval } from './gates';
import { recordOwnerResearchGates, submitOwnerResearchGate } from './ownerGates';
import { gateAnsweredCollectedData } from './gateAnswers';
import type { SiteResearchDossier } from './types';
import { runResearchToSite } from '../researchToSite';
import { ISRAELI_LOCALITIES } from '../israeliLocalities';

const RESEARCH = '123e4567-e89b-42d3-a456-426614174abc';
const T0 = new Date('2026-11-17T08:00:00.000Z');
const at = (ms: number) => () => new Date(T0.getTime() + ms);

// No serviceAttributes and no geographicExclusions: the service_attributes and geography gates open.
const data: CollectedData = {
  businessName: 'TEST Gate Answers Plumbing',
  businessNiche: 'plumber',
  primaryService: 'leak detection',
  secondaryServices: 'drain unblocking',
  priorityServices: ['leak detection'],
  serviceModel: 'field',
  targetLocation: 'Holon',
  specificCities: 'Holon, Bat Yam',
  travelBoundary: '15 km from Holon',
  usp: 'Camera leak detection',
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

const OWNER_ATTRIBUTE = 'Owner answer: thermal camera, no tile breaking';
const STAFF_ATTRIBUTE = 'Staff answer: acoustic listening first';

function roots() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-answers-'));
  return { root, researchBaseDir: path.join(root, 'site-research'), sitesRoot: path.join(root, 'sites') };
}

function fixtureResearch() {
  return (id: string, input: Parameters<typeof runSiteResearch>[1], options: Parameters<typeof runSiteResearch>[2] = {}) =>
    runSiteResearch(id, input, { ...options, providers: fixtureResearchProviders() });
}

interface Seen { data: CollectedData[]; briefs: PageBrief[] }

async function generate(r: ReturnType<typeof roots>, slug: string): Promise<{ seen: Seen; record: { collectedData: CollectedData } }> {
  const seen: Seen = { data: [], briefs: [] };
  const outcome = await runResearchToSite({ slug, researchId: RESEARCH, collectedData: data }, {
    researchBaseDir: r.researchBaseDir, sitesRoot: r.sitesRoot, now: at(0), runResearch: fixtureResearch(), checkPlaceId: null,
    generateCopy: async (brief, pageData) => { seen.briefs.push(brief); seen.data.push(pageData); return copy; },
  });
  assert.equal(outcome.status, 'generated', JSON.stringify(outcome));
  return { seen, record: JSON.parse(fs.readFileSync(path.join(r.sitesRoot, `${slug}.json`), 'utf8')) };
}

function leakBrief(seen: Seen): string {
  const brief = seen.briefs.find(item => item.page.id === 'svc-leak-detection');
  assert.ok(brief, 'leak detection page brief');
  return JSON.stringify(brief);
}

async function ownerAnswers(r: ReturnType<typeof roots>, answers: Partial<Record<string, unknown>>) {
  const gates = deriveOpenResearchGates(RESEARCH, data);
  const recorded = await recordOwnerResearchGates(RESEARCH, gates, { baseDir: r.researchBaseDir, now: at(0) });
  assert.equal(recorded.length, gates.length);
  for (const gate of gates) {
    if (!(gate.type in answers)) continue;
    const result = await submitOwnerResearchGate(RESEARCH, gate.id, gate.evidenceDigest, answers[gate.type], { baseDir: r.researchBaseDir, now: at(1000) });
    assert.equal(result.status, 'approved');
  }
  return gates;
}

test('unanswered gates: generation input and output are unchanged', async () => {
  const r = roots();
  try {
    const { seen, record } = await generate(r, 'gate-answers-none');
    assert.ok(seen.data.every(item => JSON.stringify(item) === JSON.stringify(data)));
    assert.deepEqual(record.collectedData, data);
    assert.ok(!leakBrief(seen).includes('Service details (owner-stated)'));
    // The pure merge returns the caller's object untouched when nothing usable is stored.
    const dossier = await readResearchDossier(RESEARCH, r.researchBaseDir, { bounded: true });
    assert.equal(gateAnsweredCollectedData(data, dossier), data);
    assert.equal(gateAnsweredCollectedData(data, null), data);
  } finally {
    fs.rmSync(r.root, { recursive: true, force: true });
  }
});

test('owner-answered gates become site facts: brief service facts, page-copy data and the stored record', async () => {
  const r = roots();
  try {
    await generate(r, 'gate-answers-owner');
    await ownerAnswers(r, {
      service_attributes: { serviceAttributes: { 'leak detection': OWNER_ATTRIBUTE } },
      geography: { travelBoundary: 'Holon and Bat Yam only', geographicExclusions: ['Tel Aviv'] },
    });
    const { seen, record } = await generate(r, 'gate-answers-owner');
    assert.ok(leakBrief(seen).includes(`Service details (owner-stated): ${OWNER_ATTRIBUTE}`));
    for (const item of [...seen.data, record.collectedData]) {
      assert.deepEqual(item.serviceAttributes, { 'leak detection': OWNER_ATTRIBUTE });
      assert.equal(item.travelBoundary, 'Holon and Bat Yam only');
      assert.deepEqual(item.geographicExclusions, ['Tel Aviv']);
    }
    // Fields no gate answered keep the caller's values.
    assert.equal(record.collectedData.secondaryServices, data.secondaryServices);
    assert.deepEqual(record.collectedData.priorityServices, data.priorityServices);
  } finally {
    fs.rmSync(r.root, { recursive: true, force: true });
  }
});

test('a staff answer for the same gate wins over the owner answer', async () => {
  const r = roots();
  try {
    await generate(r, 'gate-answers-staff');
    const gates = await ownerAnswers(r, { service_attributes: { serviceAttributes: { 'leak detection': OWNER_ATTRIBUTE } } });
    const gate = gates.find(item => item.type === 'service_attributes')!;
    const staffAnswer = { serviceAttributes: { 'leak detection': STAFF_ATTRIBUTE } };
    // The admin path: owner already approved this gate -> already_approved, and the staff answer is stored anyway.
    const staff = await persistResearchGateApproval(RESEARCH, gate, data, gate.evidenceDigest, { baseDir: r.researchBaseDir, now: at(5000), staffAnswer });
    assert.equal(staff.status, 'already_approved');
    const { seen, record } = await generate(r, 'gate-answers-staff');
    assert.ok(leakBrief(seen).includes(STAFF_ATTRIBUTE));
    assert.ok(!leakBrief(seen).includes(OWNER_ATTRIBUTE));
    assert.deepEqual(record.collectedData.serviceAttributes, { 'leak detection': STAFF_ATTRIBUTE });
  } finally {
    fs.rmSync(r.root, { recursive: true, force: true });
  }
});

test('staff path refuses a malformed answer with invalid_answer and writes nothing', async () => {
  const r = roots();
  try {
    await generate(r, 'gate-answers-invalid');
    const gate = deriveOpenResearchGates(RESEARCH, data).find(item => item.type === 'service_attributes')!;
    const before = await readResearchDossier(RESEARCH, r.researchBaseDir, { bounded: true });
    const result = await persistResearchGateApproval(RESEARCH, gate, data, gate.evidenceDigest, { baseDir: r.researchBaseDir, now: at(5000), staffAnswer: { serviceAttributes: [] } });
    assert.deepEqual(result, { status: 'invalid_answer' });
    assert.deepEqual(await readResearchDossier(RESEARCH, r.researchBaseDir, { bounded: true }), before);
  } finally {
    fs.rmSync(r.root, { recursive: true, force: true });
  }
});

test('malformed or foreign stored answers are ignored safely', async () => {
  const r = roots();
  try {
    await generate(r, 'gate-answers-malformed');
    await ownerAnswers(r, { service_attributes: { serviceAttributes: { 'leak detection': OWNER_ATTRIBUTE } } });
    const dossier = (await readResearchDossier(RESEARCH, r.researchBaseDir, { bounded: true }))!;
    const good = dossier.ownerResearchGates!.find(item => item.type === 'service_attributes')!;
    const geography = dossier.ownerResearchGates!.find(item => item.type === 'geography')!;
    const foreignId = `other-research:business_boundary:${good.evidenceDigest}`;
    const tampered: SiteResearchDossier = {
      ...dossier,
      researchGateApprovals: {
        ...dossier.researchGateApprovals,
        [geography.id]: { evidenceDigest: geography.evidenceDigest, approvedAt: T0.toISOString() },
        [foreignId]: { evidenceDigest: good.evidenceDigest, approvedAt: T0.toISOString() },
      },
      ownerResearchGates: [
        // Bad shape for its type (approved, so only the re-validation stops it).
        { ...good, answer: { serviceAttributes: 'not an object' } },
        // Oversized / wrong-typed geography answer.
        { ...geography, answer: { travelBoundary: 42 }, answeredAt: T0.toISOString() },
        // Another research's gate id.
        { id: foreignId, type: 'business_boundary', evidenceDigest: good.evidenceDigest, issuedAt: T0.toISOString(), answer: { services: ['Injected'] }, answeredAt: T0.toISOString() },
        // Unknown gate type and a non-object entry.
        { id: `${RESEARCH}:staff_only:x`, type: 'staff_only' as never, evidenceDigest: 'x', issuedAt: T0.toISOString(), answer: 'x', answeredAt: T0.toISOString() },
        null as never,
      ],
      staffResearchGateAnswers: {
        // No approval for this id.
        [`${RESEARCH}:money_services:nope`]: { type: 'money_services', evidenceDigest: 'nope', answer: { priorityServices: ['Injected'] }, answeredAt: T0.toISOString() },
        // Digest does not match the id.
        [good.id]: { type: 'service_attributes', evidenceDigest: 'mismatch', answer: { serviceAttributes: { 'leak detection': STAFF_ATTRIBUTE } }, answeredAt: T0.toISOString() },
      },
    };
    assert.ok(await writeResearchDossierAtomic(RESEARCH, tampered, r.researchBaseDir));
    assert.deepEqual(gateAnsweredCollectedData(data, tampered), data);
    const { record } = await generate(r, 'gate-answers-malformed');
    assert.deepEqual(record.collectedData, data);
    // A non-object staff map is ignored too.
    assert.deepEqual(gateAnsweredCollectedData(data, { ...tampered, staffResearchGateAnswers: 'x' as never }), data);
  } finally {
    fs.rmSync(r.root, { recursive: true, force: true });
  }
});

test('pure merge: business_boundary and money_services map to secondaryServices and priorityServices; input not mutated', async () => {
  const r = roots();
  try {
    await generate(r, 'gate-answers-pure');
    const empty: CollectedData = { ...data, secondaryServices: '', priorityServices: [] };
    const gates = deriveOpenResearchGates(RESEARCH, empty);
    assert.ok(await recordOwnerResearchGates(RESEARCH, gates, { baseDir: r.researchBaseDir, now: at(0) }));
    for (const gate of gates) {
      const answer = gate.type === 'business_boundary' ? { services: ['pipe repair', 'boiler service'] }
        : gate.type === 'money_services' ? { priorityServices: ['pipe repair'] } : undefined;
      if (answer) assert.equal((await submitOwnerResearchGate(RESEARCH, gate.id, gate.evidenceDigest, answer, { baseDir: r.researchBaseDir, now: at(1000) })).status, 'approved');
    }
    const dossier = (await readResearchDossier(RESEARCH, r.researchBaseDir, { bounded: true }))!;
    const snapshot = JSON.stringify(empty);
    const merged = gateAnsweredCollectedData(empty, dossier);
    assert.equal(JSON.stringify(empty), snapshot);
    assert.equal(merged.secondaryServices, 'pipe repair, boiler service');
    assert.deepEqual(merged.priorityServices, ['pipe repair']);
    assert.equal(merged.travelBoundary, data.travelBoundary);
  } finally {
    fs.rmSync(r.root, { recursive: true, force: true });
  }
});

test('an owner geography answer naming towns recomputes the listed served areas (the local-area brief fact)', async () => {
  const r = roots();
  try {
    await generate(r, 'gate-answers-area');
    // A town name taken from the locality list itself (no literal names in this file).
    const town = ISRAELI_LOCALITIES.find(item => item.he_name.trim().length > 2)!.he_name;
    await ownerAnswers(r, { geography: { travelBoundary: town, geographicExclusions: [] } });
    const { seen, record } = await generate(r, 'gate-answers-area');
    assert.deepEqual(record.collectedData.servedAreaNames?.listed, [town]);
    const home = seen.briefs.find(item => item.page.pageClass === 'homepage')!;
    assert.ok(JSON.stringify(home).includes(town));
  } finally {
    fs.rmSync(r.root, { recursive: true, force: true });
  }
});
