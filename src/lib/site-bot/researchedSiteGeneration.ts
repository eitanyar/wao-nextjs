/**
 * Complete, research-bound site generation and atomic persistence.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import {
  renderResearchedSitePages,
  rendersSiteSections,
  type RenderResearchedSitePagesParams,
  type ResearchedSiteGraphEdge,
  type ResearchedSitePage,
} from '../lp/researchedSite';
import { assertBoundedGeneratedSiteCopy, heroCapFacts, isApprovedPortfolioBrief, shapeOptions } from '../lp/researchPageCopy';
import type { HeroCapPageFacts } from '../lp/copyGates';
import { isSafeDeploymentSlug } from '../deployment/deploy-access';
import { assertBoundedPageBrief, type PageBrief } from './research/pageBrief';
import type { PageClassification } from './research/pagePortfolio';
import type { SiteResearchDossier } from './research/types';

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const MAX_SITE_RECORD_BYTES = 16 * 1024 * 1024;
const SAFE_PATH_SEGMENT = /^[A-Za-z0-9_-]+$/;
const RESERVED_PATH_SEGMENTS = new Set(['api', 'assets', 'static', 'index', 'privacy', 'accessibility', 'contact', 'sitemap']);
const RENDERABLE_CLASSES = new Set<PageClassification>([
  'homepage',
  'service_hub',
  'money_service',
  'qualified_service_area',
  'trust',
  'process',
  'pricing',
  'proof',
  'supporting',
]);

export interface ResearchedSiteGenerationInput {
  slug: string;
  researchId: string;
  collectedData: CollectedData;
  dossier: SiteResearchDossier;
  pageBriefs: PageBrief[];
  graphEdges: ResearchedSiteGraphEdge[];
}

export interface ResearchedSiteGenerationRecord {
  slug: string;
  researchId: string;
  approvedPageId: string;
  collectedData: CollectedData;
  copy: SiteCopy;
  researchedPages: ResearchedSitePage[];
  researchedGraphEdges: ResearchedSiteGraphEdge[];
  createdAt: string;
}

type RendererInputs = Omit<
  RenderResearchedSitePagesParams,
  'data' | 'slug' | 'pages' | 'graphEdges'
>;

/** M2a.5: what the generator knows about the site's pages generated so far (duplicate-hook gate). */
export interface ResearchedSiteGenerationContext {
  priorHeroHeadlines: readonly string[];
  /** M2a.6: the same, in route order, for the site-wide about-headline and about-opening checks. */
  priorAboutPageHeadlines: readonly string[];
  priorAboutPageBodies: readonly string[];
  /** M2a.7: hero-cap facts (masked service labels, AC page) of the same pages, for the site-wide hero cap. */
  priorHeroFacts: readonly HeroCapPageFacts[];
  /** 2026-11-10 (Noa's pattern F): the homepage's trust-bar items, so later pages reuse its term for each proof point. */
  siteTerms?: readonly string[];
}

/** M2a.6: the site context for the next page, from the pages generated so far (route order, home first); M2a.7: plus their hero-cap facts. */
/**
 * The site-wide gate context for the next page. M2b.1d (section 22.2): the about checks compare only pages that render the
 * about section (homepage / services hub), so the about priors skip every other page type (a page without a classification
 * counts, for hand-built callers).
 */
export function siteGenerationContext(pages: ReadonlyArray<{ copy: SiteCopy; classification?: string }>, facts: readonly HeroCapPageFacts[] = []): ResearchedSiteGenerationContext {
  const about = pages.filter(page => page.classification === undefined || rendersSiteSections(page.classification));
  const siteTerms = (pages.find(page => page.classification === 'homepage')?.copy.trustBarItems ?? [])
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return {
    priorHeroHeadlines: pages.map(page => page.copy.heroHeadline),
    priorAboutPageHeadlines: about.map(page => page.copy.aboutPageHeadline),
    priorAboutPageBodies: about.map(page => page.copy.aboutPageBody),
    priorHeroFacts: [...facts],
    ...(siteTerms.length ? { siteTerms } : {}),
  };
}

export interface ResearchedSiteGenerationDependencies {
  generateCopy: (brief: PageBrief, collectedData: CollectedData, site?: ResearchedSiteGenerationContext) => Promise<SiteCopy>;
  renderInputs: RendererInputs;
  renderPages?: typeof renderResearchedSitePages;
  now?: () => Date;
}

type AtomicFileSystem = Pick<
  typeof fs,
  'existsSync' | 'lstatSync' | 'mkdirSync' | 'writeFileSync' | 'renameSync' | 'rmSync' | 'realpathSync'
  | 'openSync' | 'fstatSync' | 'readSync' | 'closeSync'
>;

export interface PersistResearchedSiteRecordOptions {
  sitesRoot: string;
  dossier: SiteResearchDossier;
  writeDossier: (dossier: SiteResearchDossier) => Promise<boolean>;
  fileSystem?: AtomicFileSystem;
}

export interface PreflightResearchedSiteTargetOptions {
  sitesRoot: string;
  fileSystem?: AtomicFileSystem;
}

function fail(message: string): never {
  throw new Error(message);
}

export function assertResearchedGenerationReady(dossier: unknown, researchId: string): void {
  if (!dossier || typeof dossier !== 'object' || Array.isArray(dossier)) fail('Research dossier is not copy ready.');
  const candidate = dossier as Record<string, unknown>;
  if (candidate.status !== 'copy_ready' || typeof candidate.researchId !== 'string' ||
    !OPAQUE_ID.test(candidate.researchId) || candidate.researchId !== researchId ||
    !Array.isArray(candidate.humanGates) || candidate.humanGates.some(gate => (
      !gate || typeof gate !== 'object' || Array.isArray(gate) || gate.status !== 'approved'
    ))) {
    fail('Research dossier is not copy ready.');
  }
}

function safeTargetPath(targetPath: string, classification: PageClassification): boolean {
  if (classification === 'homepage') return targetPath === '/';
  if (!targetPath.startsWith('/') || targetPath.includes('\\') || targetPath.includes('\0') || targetPath.includes('..')) return false;
  const segments = targetPath.split('/').filter(Boolean);
  return segments.length > 0 && segments.every(segment => (
    SAFE_PATH_SEGMENT.test(segment) && !RESERVED_PATH_SEGMENTS.has(segment.toLowerCase())
  ));
}

function validatePortfolio(input: ResearchedSiteGenerationInput): PageBrief {
  if (!isSafeDeploymentSlug(input.slug)) fail('Invalid deployment slug.');
  assertResearchedGenerationReady(input.dossier, input.researchId);
  if (!Array.isArray(input.pageBriefs) || input.pageBriefs.length === 0) fail('Approved page briefs are required.');
  if (!Array.isArray(input.graphEdges)) fail('Research graph edges are required.');

  const briefIds = new Set<string>();
  const targetPaths = new Set<string>();
  let homepage: PageBrief | undefined;
  for (const brief of input.pageBriefs) {
    assertBoundedPageBrief(brief);
    if (!brief?.page || !OPAQUE_ID.test(brief.page.id)) fail('Page brief has an invalid ID.');
    if (briefIds.has(brief.page.id)) fail('Page brief IDs must be unique.');
    if (targetPaths.has(brief.page.targetPath)) fail('Page brief target paths must be unique.');
    if (!RENDERABLE_CLASSES.has(brief.page.pageClass as PageClassification)) fail('Page brief class is not renderable.');
    if (!safeTargetPath(brief.page.targetPath, brief.page.pageClass as PageClassification)) fail('Page brief target path is unsafe.');
    if (!isApprovedPortfolioBrief(input.dossier, brief)) fail('Page brief is not an approved ready opportunity.');
    briefIds.add(brief.page.id);
    targetPaths.add(brief.page.targetPath);
    if (brief.page.pageClass === 'homepage') {
      if (homepage) fail('Exactly one homepage is required.');
      homepage = brief;
    }
  }
  if (!homepage) fail('Exactly one homepage is required.');

  const ready = input.dossier.pageOpportunities.filter(opportunity => opportunity.status === 'ready');
  if (ready.length !== input.pageBriefs.length) fail('Every ready opportunity must appear exactly once.');
  const readyIds = new Set(ready.map(opportunity => opportunity.id));
  if (readyIds.size !== ready.length || ready.some(opportunity => !briefIds.has(opportunity.id))) {
    fail('Every ready opportunity must appear exactly once.');
  }
  if (input.dossier.pageOpportunities.some(opportunity => opportunity.status !== 'ready' && briefIds.has(opportunity.id))) {
    fail('Held or unknown opportunities cannot be generated.');
  }

  const reachable = new Set<string>([homepage.page.id]);
  for (const edge of input.graphEdges) {
    if (!edge || !briefIds.has(edge.fromId) || !briefIds.has(edge.toId)) fail('Research graph endpoint is unknown.');
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of input.graphEdges) {
      if (reachable.has(edge.fromId) && !reachable.has(edge.toId)) {
        reachable.add(edge.toId);
        changed = true;
      }
    }
  }
  if (input.pageBriefs.some(brief => !reachable.has(brief.page.id))) fail('Research graph contains an orphan page.');
  return homepage;
}

/**
 * M2b.1e (Adam): every generated site ships a privacy and an accessibility page that must say how to reach the owner. With
 * neither a phone nor an email there is no way to, so generation stops before any model call.
 */
export const OWNER_CONTACT_MISSING = 'owner_contact_missing';
export const OWNER_CONTACT_MISSING_MESSAGE = 'Site generation needs the owner\'s phone or email: the privacy and accessibility pages must say how to reach the owner.';

/** True when the owner data has neither a phone nor an email (the legal pages' contact fields). */
export function ownerContactMissing(data: Pick<CollectedData, 'phone' | 'email'> | null | undefined): boolean {
  const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  return !filled(data?.phone) && !filled(data?.email);
}

export async function buildResearchedSiteGeneration(
  input: ResearchedSiteGenerationInput,
  dependencies: ResearchedSiteGenerationDependencies,
): Promise<ResearchedSiteGenerationRecord> {
  if (ownerContactMissing(input.collectedData)) fail(OWNER_CONTACT_MISSING_MESSAGE);
  const homepage = validatePortfolio(input);
  const pages: ResearchedSitePage[] = [];
  const heroFacts: HeroCapPageFacts[] = [];

  for (const sourceBrief of input.pageBriefs) {
    const brief = structuredClone(sourceBrief);
    const generatedCopy = await dependencies.generateCopy(brief, structuredClone(input.collectedData), siteGenerationContext(pages, heroFacts));
    assertBoundedGeneratedSiteCopy(generatedCopy, shapeOptions(brief));
    heroFacts.push(heroCapFacts(brief, generatedCopy));
    // M2b.1h: the pitch moves from the copy to the page record (stored, never rendered).
    const { pitch, ...pageCopy } = generatedCopy;
    pages.push({
      opportunityId: brief.page.id,
      classification: brief.page.pageClass as PageClassification,
      targetPath: brief.page.targetPath,
      brief: {
        faqPolicy: brief.faqPolicy,
        faqCandidates: structuredClone(brief.faqCandidates),
      },
      copy: structuredClone(pageCopy),
      ...(typeof pitch === 'string' && pitch.trim() ? { pitch } : {}),
      ...(brief.site ? { seo: { name: brief.site.pageName, city: brief.site.city, serviceArea: [...brief.site.serviceArea] } } : {}),
    });
  }

  const graphEdges = structuredClone(input.graphEdges);
  const collectedData = structuredClone(input.collectedData);
  const renderPages = dependencies.renderPages ?? renderResearchedSitePages;
  const rendered = renderPages({
    ...dependencies.renderInputs,
    data: collectedData,
    slug: input.slug,
    pages,
    graphEdges,
  });
  if (!rendered['index.html']) fail('Generated site is not renderer compatible.');

  const homePage = pages.find(page => page.opportunityId === homepage.page.id)!;
  return {
    slug: input.slug,
    researchId: input.researchId,
    approvedPageId: homePage.opportunityId,
    collectedData,
    copy: structuredClone(homePage.copy),
    researchedPages: pages,
    researchedGraphEdges: graphEdges,
    createdAt: (dependencies.now ?? (() => new Date()))().toISOString(),
  };
}

function assertSafeSitesRoot(fileSystem: AtomicFileSystem, sitesRoot: string): string {
  const resolvedRoot = path.resolve(sitesRoot);
  if (fileSystem.existsSync(resolvedRoot) && fileSystem.lstatSync(resolvedRoot).isSymbolicLink()) {
    fail('Sites root cannot be a symlink.');
  }
  fileSystem.mkdirSync(resolvedRoot, { recursive: true });
  if (fileSystem.lstatSync(resolvedRoot).isSymbolicLink() || fileSystem.realpathSync(resolvedRoot) !== resolvedRoot) {
    fail('Sites root contains a symlink.');
  }
  return resolvedRoot;
}

function existingSafeSitesRoot(fileSystem: AtomicFileSystem, sitesRoot: string): string | null {
  const resolvedRoot = path.resolve(sitesRoot);
  let current = path.parse(resolvedRoot).root;
  for (const segment of resolvedRoot.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let stat: fs.Stats;
    try {
      stat = fileSystem.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('Sites root is not a regular directory.');
  }
  if (fileSystem.realpathSync(resolvedRoot) !== resolvedRoot) fail('Sites root contains a symlink.');
  return resolvedRoot;
}

function siteRecordTarget(sitesRoot: string, slug: string): string {
  const targetPath = path.join(path.resolve(sitesRoot), `${slug}.json`);
  if (!targetPath.startsWith(`${sitesRoot}${path.sep}`)) fail('Site record path escapes the sites root.');
  return targetPath;
}

function rollbackSiteRecord(
  fileSystem: AtomicFileSystem,
  targetPath: string,
  priorBytes: Buffer | null,
  rollbackPath: string,
): void {
  if (priorBytes === null) {
    fileSystem.rmSync(targetPath, { force: true });
    return;
  }
  fileSystem.writeFileSync(rollbackPath, priorBytes, { flag: 'wx' });
  fileSystem.renameSync(rollbackPath, targetPath);
}

function readPriorSiteRecord(fileSystem: AtomicFileSystem, targetPath: string): Buffer | null {
  try {
    const stat = fileSystem.lstatSync(targetPath);
    if (stat.isSymbolicLink()) fail('Site record target cannot be a symlink.');
    if (!stat.isFile()) fail('Site record target must be a regular file.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  let descriptor: number | undefined;
  try {
    descriptor = fileSystem.openSync(targetPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const stat = fileSystem.fstatSync(descriptor);
    if (!stat.isFile() || stat.size > MAX_SITE_RECORD_BYTES) fail('Invalid existing site record.');
    const chunks: Buffer[] = [];
    let total = 0;
    while (total <= MAX_SITE_RECORD_BYTES) {
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, MAX_SITE_RECORD_BYTES + 1 - total));
      const count = fileSystem.readSync(descriptor, chunk, 0, chunk.length, null);
      if (count === 0) break;
      total += count;
      if (total > MAX_SITE_RECORD_BYTES) fail('Invalid existing site record.');
      chunks.push(chunk.subarray(0, count));
    }
    return Buffer.concat(chunks, total);
  } finally {
    if (descriptor !== undefined) fileSystem.closeSync(descriptor);
  }
}

function assertPriorSiteIdentity(priorBytes: Buffer | null, record: Pick<ResearchedSiteGenerationRecord, 'slug' | 'researchId'>): void {
  if (priorBytes === null) return;
  let prior: unknown;
  try {
    prior = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(priorBytes));
  } catch {
    fail('Invalid existing site record.');
  }
  if (!prior || typeof prior !== 'object' || Array.isArray(prior)) fail('Invalid existing site record.');
  const existing = prior as Record<string, unknown>;
  if (!isSafeDeploymentSlug(existing.slug) || existing.slug !== record.slug ||
    typeof existing.researchId !== 'string' || !OPAQUE_ID.test(existing.researchId) ||
    existing.researchId !== record.researchId || existing.simulation !== undefined ||
    existing.legacyCoreThirty === true || !Array.isArray(existing.researchedPages) ||
    existing.researchedPages.length === 0 ||
    !Array.isArray(existing.researchedGraphEdges) ||
    typeof existing.approvedPageId !== 'string' || !OPAQUE_ID.test(existing.approvedPageId) ||
    !existing.collectedData || typeof existing.collectedData !== 'object' ||
    !existing.copy || typeof existing.copy !== 'object' ||
    typeof existing.createdAt !== 'string') {
    fail('Existing site record belongs to another or unknown research identity.');
  }
}

export function preflightResearchedSiteTarget(
  slug: string,
  researchId: string,
  options: PreflightResearchedSiteTargetOptions,
): void {
  if (!isSafeDeploymentSlug(slug)) fail('Invalid deployment slug.');
  if (typeof researchId !== 'string' || !OPAQUE_ID.test(researchId)) fail('Invalid research identity.');
  const fileSystem = options.fileSystem ?? fs;
  const sitesRoot = existingSafeSitesRoot(fileSystem, options.sitesRoot);
  if (sitesRoot === null) return;
  const priorBytes = readPriorSiteRecord(fileSystem, siteRecordTarget(sitesRoot, slug));
  assertPriorSiteIdentity(priorBytes, { slug, researchId });
}

export async function persistResearchedSiteRecordAtomic(
  record: ResearchedSiteGenerationRecord,
  options: PersistResearchedSiteRecordOptions,
): Promise<void> {
  const fileSystem = options.fileSystem ?? fs;
  if (!isSafeDeploymentSlug(record.slug)) fail('Invalid deployment slug.');
  assertResearchedGenerationReady(options.dossier, record.researchId);

  const sitesRoot = assertSafeSitesRoot(fileSystem, options.sitesRoot);
  const targetPath = siteRecordTarget(sitesRoot, record.slug);

  const priorBytes = readPriorSiteRecord(fileSystem, targetPath);
  assertPriorSiteIdentity(priorBytes, record);

  const nonce = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const temporaryPath = path.join(sitesRoot, `.${record.slug}.${nonce}.tmp`);
  const rollbackPath = path.join(sitesRoot, `.${record.slug}.${nonce}.rollback`);

  const updatedDossier = structuredClone(options.dossier);
  delete updatedDossier.approvedCopyReviewPacket;
  updatedDossier.updatedAt = record.createdAt;
  updatedDossier.pipelineChecks = {
    ...updatedDossier.pipelineChecks,
    copy: 'pass',
    hebrewQa: 'pending',
  };

  try {
    fileSystem.writeFileSync(temporaryPath, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
    fileSystem.renameSync(temporaryPath, targetPath);
  } catch {
    fileSystem.rmSync(temporaryPath, { force: true });
    fail('Unable to persist complete site record.');
  }

  try {
    if (!await options.writeDossier(updatedDossier)) throw new Error('Dossier writer rejected update.');
  } catch {
    try {
      rollbackSiteRecord(fileSystem, targetPath, priorBytes, rollbackPath);
    } finally {
      fileSystem.rmSync(rollbackPath, { force: true });
    }
    fail('Unable to persist research dossier.');
  }
}
