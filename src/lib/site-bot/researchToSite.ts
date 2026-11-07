/**
 * Research -> copy_ready -> page briefs -> generated site record
 * (paid-journey v2 M2a, B3). Admin/operator-only internal function: nothing
 * customer-facing calls it (the customer trigger is M2b).
 *
 * - Never overrides a research hold: a dossier held on truth gaps (or any other
 *   gate) stays held and the outcome says why.
 * - architecture_ready -> copy_ready is the only status this module performs,
 *   via transitionResearchStatus. The plan it persists gives every opportunity a
 *   generator-safe opaque ID and path (research IDs such as `service:<name>` are
 *   not opaque and Hebrew service names are not path-safe), keeping the research
 *   ID in `sourceOpportunityId`.
 * - Re-runnable: a copy_ready dossier regenerates from its persisted plan, and the
 *   site record write is atomic and identity-checked.
 *
 * Every brief value written here is English scaffolding or the owner's own answer
 * moved verbatim. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import { createHash } from 'node:crypto';
import type { CollectedData } from '../bot/prompts';
import { sitesDir } from '../dataRoots';
import { isSafeDeploymentSlug } from '../deployment/deploy-access';
import {
  generateResearchPageCopy,
  GeneratedCopyValidationError,
  type CopyRepairEvent,
  type CopyViolation,
  type QwenJsonCaller,
} from '../lp/researchPageCopy';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import type { ResearchedSiteGraphEdge } from '../lp/researchedSite';
import { detectVertical } from '../lp/verticalDetect';
import { VERTICAL_ASSETS } from '../lp/verticalAssets';
import { VERTICAL_THEMES } from '../lp/verticalThemes';
import { compilePageBrief, type BriefEvidence, type PageBrief, type PageBriefLink } from './research/pageBrief';
import type { PipelineHoldReason } from './research/pipelineState';
import { buildSiteResearchInput } from './research/researchInput';
import { readResearchDossier, writeResearchDossierAtomic } from './research/researchStore';
import { runSiteResearch } from './research/runResearch';
import { transitionResearchStatus, type HumanGate, type PageOpportunity, type ResearchStatus, type SiteResearchDossier } from './research/types';
import {
  buildResearchedSiteGeneration,
  persistResearchedSiteRecordAtomic,
  preflightResearchedSiteTarget,
  type ResearchedSiteGenerationDependencies,
} from './researchedSiteGeneration';

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const LATIN_NAME = /^[A-Za-z0-9 _-]+$/;
const RESERVED_SEGMENTS = new Set(['api', 'assets', 'static', 'index', 'privacy', 'accessibility', 'contact', 'sitemap', 'services']);
const HOME_ID = 'home';
const MAX_QUERIES_PER_PAGE = 6;

// ---------------------------------------------------------------------------
// Gate check
// ---------------------------------------------------------------------------

export type ResearchToSiteHoldReason = PipelineHoldReason | 'already_deploy_ready';

export interface GenerationReadiness {
  ready: boolean;
  dossierStatus: ResearchStatus;
  reasons: ResearchToSiteHoldReason[];
  /** Unapproved gates, as stored on the dossier (IDs + English notes; no owner data). */
  gates: Array<Pick<HumanGate, 'id' | 'status' | 'requiredFor'> & { note?: string }>;
}

/** Whether a dossier may be planned/generated. Mirrors pipelineState semantics without implying a charge. */
export function generationReadiness(dossier: SiteResearchDossier): GenerationReadiness {
  const open = dossier.humanGates.filter(gate => gate.status !== 'approved');
  const gates = open.map(gate => ({ id: gate.id, status: gate.status, requiredFor: gate.requiredFor, ...(gate.note ? { note: gate.note } : {}) }));
  const reasons: ResearchToSiteHoldReason[] = [];
  switch (dossier.status) {
    case 'architecture_ready':
    case 'copy_ready':
      break;
    case 'needs_input':
      reasons.push('research_needs_input');
      break;
    case 'held':
    case 'failed':
      reasons.push('research_held');
      break;
    case 'deploy_ready':
      reasons.push('already_deploy_ready');
      break;
    default:
      reasons.push('architecture_not_ready');
  }
  if (open.length) reasons.push('approval_not_granted');
  return { ready: reasons.length === 0, dossierStatus: dossier.status, reasons, gates };
}

// ---------------------------------------------------------------------------
// Plan: architecture_ready -> copy_ready
// ---------------------------------------------------------------------------

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 10);
}

function latinSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/g, '');
}

function sourceName(opportunity: PageOpportunity): string {
  return opportunity.id.replace(/^service:/, '');
}

/**
 * Generator-safe identity for a research opportunity. Latin names keep a readable
 * slug; any other script gets a stable hash (URL wording for non-Latin service
 * pages is an SEO decision, not made here).
 */
export function safeOpportunityIdentity(opportunity: PageOpportunity): { id: string; targetPath: string } {
  const name = sourceName(opportunity).trim();
  const slug = LATIN_NAME.test(name) ? latinSlug(name) : '';
  const base = slug.length >= 3 && !RESERVED_SEGMENTS.has(slug) ? slug : `svc-${shortHash(opportunity.id)}`;
  return { id: base.startsWith('svc-') ? base : `svc-${base}`, targetPath: `/services/${base}` };
}

function planned(dossier: SiteResearchDossier): boolean {
  return dossier.pageOpportunities.some(item => item.id === HOME_ID && item.targetPath === '/' && item.status === 'ready') &&
    dossier.pageOpportunities.every(item => OPAQUE_ID.test(item.id) && typeof item.pageClass === 'string');
}

/**
 * Pure. Returns a copy_ready dossier whose pageOpportunities are the generation plan:
 * one homepage plus one money-service page per research service opportunity, all with
 * opaque IDs and safe paths. Held/unknown opportunities keep their status.
 */
export function planCopyReadyDossier(dossier: SiteResearchDossier, now: () => Date = () => new Date()): SiteResearchDossier {
  if (dossier.status === 'copy_ready' && planned(dossier)) return structuredClone(dossier);
  const status = transitionResearchStatus(dossier.status, 'copy_ready');
  const next = structuredClone(dossier);
  const ids = new Set<string>([HOME_ID]);
  const paths = new Set<string>(['/']);
  const opportunities: PageOpportunity[] = [];
  for (const item of dossier.pageOpportunities) {
    if (item.id === HOME_ID || item.targetPath === '/') continue;
    const isService = item.id.startsWith('service:') || item.pageClass === 'money_service';
    const base = safeOpportunityIdentity(item);
    let { id, targetPath } = base;
    for (let n = 2; ids.has(id) || paths.has(targetPath); n++) {
      id = `${base.id}-${n}`;
      targetPath = `${base.targetPath}-${n}`;
    }
    ids.add(id);
    paths.add(targetPath);
    opportunities.push({
      ...item,
      id,
      targetPath,
      pageClass: 'money_service',
      sourceOpportunityId: item.sourceOpportunityId ?? item.id,
      // Only service opportunities have a renderer page class today; anything else is held.
      status: isService ? item.status : 'held',
    });
  }
  const assertionIds = dossier.businessTruth.assertions.map(assertion => assertion.id);
  next.pageOpportunities = [{
    id: HOME_ID,
    targetPath: '/',
    opportunity: dossier.businessTruth.businessName,
    evidenceIds: assertionIds.length ? assertionIds : ['business-truth'],
    status: 'ready',
    pageClass: 'homepage',
    sourceOpportunityId: HOME_ID,
  }, ...opportunities];
  next.internalLinkEdges = opportunities
    .filter(item => item.status === 'ready')
    .map(item => ({ fromPath: '/', toPath: item.targetPath, rationale: 'research evidence', evidenceIds: item.evidenceIds }));
  next.status = status;
  next.updatedAt = now().toISOString();
  return next;
}

// ---------------------------------------------------------------------------
// Briefs
// ---------------------------------------------------------------------------

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function approved(id: string, value: string): BriefEvidence {
  return { id, value, status: 'approved' };
}

function ownerFacts(data: CollectedData, fields: Array<[keyof CollectedData, string]>, prefix: string): BriefEvidence[] {
  return fields.flatMap(([key, label]) => {
    const value = clean(data[key]);
    return value ? [approved(`${prefix}-${String(key)}`, `${label} (owner-stated): ${value}`)] : [];
  });
}

function gaps(data: CollectedData): string[] {
  const missing: Array<[keyof CollectedData, string]> = [
    ['license', 'license number'], ['pricingNotes', 'price information'], ['responseTime', 'response or arrival time'],
    ['guarantee', 'guarantee'], ['yearsInField', 'years in the field'],
  ];
  return missing.filter(([key]) => !clean(data[key])).map(([, label]) => `No ${label} was supplied; do not state one.`);
}

const PROHIBITED_CLAIMS = [
  'Do not state any price, discount or price comparison unless it appears in the allowed facts.',
  'Do not claim licenses, certifications, insurance or awards that are not in the allowed facts.',
  'Do not invent reviews, ratings, customer counts or testimonials.',
  'Do not claim service areas beyond the supplied local facts.',
  'Do not promise response or arrival times that are not in the allowed facts.',
];

function commercialQueries(dossier: SiteResearchDossier): string[] {
  return dossier.keywordEvidence
    .filter(item => item.intent === 'commercial' || item.intent === 'transactional')
    .sort((left, right) => (right.searchVolume ?? 0) - (left.searchVolume ?? 0) || left.keyword.localeCompare(right.keyword))
    .map(item => item.keyword);
}

/** Pure. One brief per ready planned page, homepage first. Requires a planned copy_ready dossier. */
export function buildPageBriefs(dossier: SiteResearchDossier, data: CollectedData): PageBrief[] {
  if (dossier.status !== 'copy_ready' || !planned(dossier)) throw new Error('Dossier has no copy_ready plan.');
  const ready = dossier.pageOpportunities.filter(item => item.status === 'ready');
  const services = dossier.businessTruth.assertions.filter(item => item.assertionStatus === 'verified');
  const entities = services.map((assertion, index) => approved(`entity-${index + 1}`, assertion.claim));
  const queries = commercialQueries(dossier);
  const cities = dossier.evidence.filter(item => item.id.startsWith('city:'));
  const location = clean(data.targetLocation) || clean(data.specificCities);
  const niche = clean(data.primaryService) || clean(data.businessNiche);
  const proof = ownerFacts(data, [
    ['yearsInField', 'Years in the field'], ['guarantee', 'Guarantee'], ['license', 'License'],
    ['responseTime', 'Response time'], ['businessHours', 'Business hours'],
  ], 'proof');
  const review = clean(data.reviewQuote);
  if (review) proof.push(approved('proof-review', `Customer review quote (owner-supplied; quote verbatim or not at all): ${review}${clean(data.starRating) ? ` | star rating: ${clean(data.starRating)}` : ''}`));
  const localFacts = [
    ...(location ? [approved('local-area', `Service area (owner-stated): ${location}`)] : []),
    ...cities.map((item, index): BriefEvidence => ({
      id: `local-city-${index + 1}`, value: `City evidence: ${item.claim}`, status: item.assertionStatus === 'verified' ? 'approved' : 'held',
    })),
  ];
  const decisions = ownerFacts(data, [['idealClientFear', 'What the customer fears'], ['idealClient', 'Ideal customer']], 'decision');
  const constraints = ownerFacts(data, [['exclusions', 'Exclusions'], ['pricingNotes', 'Pricing notes']], 'constraint');
  const offerValue = clean(data.usp) || niche || dossier.businessTruth.businessName;
  // Research opportunities are named after the owner-confirmed service they came from.
  const serviceIndexFor = (page: PageOpportunity) => services.findIndex(assertion => norm(assertion.claim) === norm(page.opportunity));

  return ready.map(page => {
    const isHome = page.pageClass === 'homepage';
    const serviceIndex = isHome ? -1 : serviceIndexFor(page);
    const service = serviceIndex >= 0 ? services[serviceIndex] : undefined;
    const subject = service?.claim ?? page.opportunity;
    const pageQueries = isHome
      ? queries.slice(0, MAX_QUERIES_PER_PAGE)
      : [...queries.filter(query => query.toLowerCase().includes(subject.toLowerCase())), subject].slice(0, MAX_QUERIES_PER_PAGE);
    const orderedEntities = serviceIndex >= 0 ? [entities[serviceIndex], ...entities.filter((_, index) => index !== serviceIndex)] : entities;
    const anchorId = (serviceIndex >= 0 ? entities[serviceIndex] : entities[0])?.id ?? 'offer';
    const links: PageBriefLink[] = isHome
      ? ready.filter(item => item.pageClass !== 'homepage').map(item => {
        const index = serviceIndexFor(item);
        return { targetPath: item.targetPath, relationship: 'service_child', evidenceIds: [index >= 0 ? entities[index].id : anchorId] };
      })
      : [{ targetPath: '/', relationship: 'site_hierarchy', evidenceIds: [anchorId] }];
    return compilePageBrief({
      page: { id: page.id, targetPath: page.targetPath, pageClass: page.pageClass ?? 'money_service' },
      persona: approved('persona', isHome
        ? `A local customer${location ? ` in ${location}` : ''} looking for a ${niche || 'service provider'}`
        : `A local customer${location ? ` in ${location}` : ''} who needs ${subject} now`),
      waoOffer: approved('offer', `${dossier.businessTruth.businessName}: ${offerValue}`),
      targetQueries: [...new Set(pageQueries)].map((value, index) => approved(`query-${index + 1}`, value)),
      entityAnchors: orderedEntities,
      firstPartyProof: proof,
      localFacts,
      customerDecisions: decisions,
      constraints: [
        ...constraints,
        ...(isHome ? [] : [approved('constraint-page-topic', `This page is about ${subject}; other services appear only as secondary links.`)]),
      ],
      links,
      informationGainGaps: gaps(data),
      prohibitedClaims: PROHIBITED_CLAIMS,
      faqCandidates: [],
    });
  });
}

/** Homepage reaches every other page directly. */
export function buildGraphEdges(briefs: PageBrief[]): ResearchedSiteGraphEdge[] {
  const home = briefs.find(brief => brief.page.pageClass === 'homepage');
  if (!home) return [];
  return briefs.filter(brief => brief !== home).map(brief => ({ fromId: home.page.id, toId: brief.page.id }));
}

export function researchedRenderInputs(data: CollectedData, slug: string): ResearchedSiteGenerationDependencies['renderInputs'] {
  // Same inputs as POST /api/site-bot/generate. The staging/preview host is M2b.
  const verticalKey = detectVertical(data.businessNiche ?? '');
  const assets = VERTICAL_ASSETS[verticalKey];
  return {
    theme: VERTICAL_THEMES[verticalKey],
    assets,
    heroImageUrl: data.trustAssetUrls?.[0] || data.profilePhotoUrl || assets.heroImages[0].url,
    siteUrl: `https://${slug}.wao.co.il`,
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface ResearchToSiteInput {
  slug: string;
  researchId: string;
  collectedData: CollectedData;
}

export interface ResearchToSiteDependencies {
  /** Start research when no dossier exists (default true). An existing dossier is never re-run here. */
  startResearch?: boolean;
  runResearch?: typeof runSiteResearch;
  researchBaseDir?: string;
  sitesRoot?: string;
  callJson?: QwenJsonCaller;
  generateCopy?: (brief: PageBrief, data: CollectedData) => Promise<SiteCopy>;
  onCopyEvent?: (pageId: string, event: CopyRepairEvent) => void;
  now?: () => Date;
}

export type ResearchToSiteOutcome =
  | { status: 'generated'; slug: string; researchId: string; transitioned: boolean; pages: Array<{ id: string; targetPath: string; pageClass: string }> }
  | { status: 'held'; researchId: string; dossierStatus: ResearchStatus | 'missing'; reasons: Array<ResearchToSiteHoldReason | 'research_not_started'>; gates: GenerationReadiness['gates'] }
  | { status: 'failed'; researchId: string; step: 'input' | 'research' | 'plan' | 'preflight' | 'generate' | 'persist'; reason: string; pageId?: string; violations?: CopyViolation[] };

export async function runResearchToSite(input: ResearchToSiteInput, deps: ResearchToSiteDependencies = {}): Promise<ResearchToSiteOutcome> {
  const { slug, researchId, collectedData } = input;
  if (!isSafeDeploymentSlug(slug) || typeof researchId !== 'string' || !OPAQUE_ID.test(researchId) || !collectedData?.businessNiche) {
    return { status: 'failed', researchId: String(researchId), step: 'input', reason: 'invalid_input' };
  }
  const now = deps.now ?? (() => new Date());
  const baseDir = deps.researchBaseDir;
  let dossier = await readResearchDossier(researchId, baseDir, { bounded: true });

  if (!dossier) {
    if (deps.startResearch === false) {
      return { status: 'held', researchId, dossierStatus: 'missing', reasons: ['research_not_started'], gates: [] };
    }
    try {
      const runResearch = deps.runResearch ?? runSiteResearch;
      dossier = (await runResearch(researchId, buildSiteResearchInput(`operator:${researchId}`, collectedData, now, researchId), { now, ...(baseDir ? { baseDir } : {}) })).dossier;
    } catch (error) {
      return { status: 'failed', researchId, step: 'research', reason: error instanceof Error ? error.message.slice(0, 200) : 'research_failed' };
    }
  }

  const readiness = generationReadiness(dossier);
  if (!readiness.ready) {
    return { status: 'held', researchId, dossierStatus: readiness.dossierStatus, reasons: readiness.reasons, gates: readiness.gates };
  }

  const transitioned = dossier.status === 'architecture_ready';
  let plannedDossier: SiteResearchDossier;
  try {
    plannedDossier = planCopyReadyDossier(dossier, now);
    if (transitioned || JSON.stringify(plannedDossier) !== JSON.stringify(dossier)) {
      if (!await writeResearchDossierAtomic(researchId, plannedDossier, baseDir)) throw new Error('Unable to persist copy_ready plan.');
    }
  } catch (error) {
    return { status: 'failed', researchId, step: 'plan', reason: error instanceof Error ? error.message.slice(0, 200) : 'plan_failed' };
  }

  const pageBriefs = buildPageBriefs(plannedDossier, collectedData);
  const graphEdges = buildGraphEdges(pageBriefs);
  const sitesRoot = deps.sitesRoot ?? sitesDir();
  try {
    preflightResearchedSiteTarget(slug, researchId, { sitesRoot });
  } catch (error) {
    return { status: 'failed', researchId, step: 'preflight', reason: error instanceof Error ? error.message.slice(0, 200) : 'site_target_conflict' };
  }

  let currentPage: string | undefined;
  const generateCopy = deps.generateCopy ?? ((brief: PageBrief, data: CollectedData) => generateResearchPageCopy(brief, data, {
    ...(deps.callJson ? { callJson: deps.callJson } : {}),
    onEvent: event => deps.onCopyEvent?.(brief.page.id, event),
  }));
  let record;
  try {
    record = await buildResearchedSiteGeneration({ slug, researchId, collectedData, dossier: plannedDossier, pageBriefs, graphEdges }, {
      generateCopy: async (brief, data) => {
        currentPage = brief.page.id;
        return generateCopy(brief, data);
      },
      renderInputs: researchedRenderInputs(collectedData, slug),
      now,
    });
  } catch (error) {
    if (error instanceof GeneratedCopyValidationError) {
      return { status: 'failed', researchId, step: 'generate', reason: 'copy_validation_failed', pageId: currentPage, violations: error.violations };
    }
    return { status: 'failed', researchId, step: 'generate', reason: error instanceof Error ? error.message.slice(0, 200) : 'copy_generation_failed', pageId: currentPage };
  }

  try {
    await persistResearchedSiteRecordAtomic(record, {
      sitesRoot,
      dossier: plannedDossier,
      writeDossier: updated => writeResearchDossierAtomic(updated.researchId, updated, baseDir),
    });
  } catch (error) {
    return { status: 'failed', researchId, step: 'persist', reason: error instanceof Error ? error.message.slice(0, 200) : 'persist_failed' };
  }

  return {
    status: 'generated',
    slug,
    researchId,
    transitioned,
    pages: record.researchedPages.map(page => ({ id: page.opportunityId, targetPath: page.targetPath, pageClass: page.classification })),
  };
}
