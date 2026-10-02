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
  type RenderResearchedSitePagesParams,
  type ResearchedSiteGraphEdge,
  type ResearchedSitePage,
} from '../lp/researchedSite';
import { isApprovedPortfolioBrief } from '../lp/researchPageCopy';
import { isSafeDeploymentSlug } from '../deployment/deploy-access';
import type { PageBrief } from './research/pageBrief';
import type { PageClassification } from './research/pagePortfolio';
import { transitionResearchStatus, type SiteResearchDossier } from './research/types';

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
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

export interface ResearchedSiteGenerationDependencies {
  generateCopy: (brief: PageBrief, collectedData: CollectedData) => Promise<SiteCopy>;
  renderInputs: RendererInputs;
  renderPages?: typeof renderResearchedSitePages;
  now?: () => Date;
}

type AtomicFileSystem = Pick<
  typeof fs,
  'existsSync' | 'lstatSync' | 'mkdirSync' | 'readFileSync' | 'writeFileSync' | 'renameSync' | 'rmSync' | 'realpathSync'
>;

export interface PersistResearchedSiteRecordOptions {
  sitesRoot: string;
  dossier: SiteResearchDossier;
  writeDossier: (dossier: SiteResearchDossier) => Promise<boolean>;
  fileSystem?: AtomicFileSystem;
}

function fail(message: string): never {
  throw new Error(message);
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
  if (!OPAQUE_ID.test(input.researchId) || input.dossier.researchId !== input.researchId) fail('Invalid research dossier identity.');
  if (input.dossier.status !== 'copy_ready') fail('Research dossier is not copy ready.');
  if (!Array.isArray(input.pageBriefs) || input.pageBriefs.length === 0) fail('Approved page briefs are required.');
  if (!Array.isArray(input.graphEdges)) fail('Research graph edges are required.');

  const briefIds = new Set<string>();
  const targetPaths = new Set<string>();
  let homepage: PageBrief | undefined;
  for (const brief of input.pageBriefs) {
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

export async function buildResearchedSiteGeneration(
  input: ResearchedSiteGenerationInput,
  dependencies: ResearchedSiteGenerationDependencies,
): Promise<ResearchedSiteGenerationRecord> {
  const homepage = validatePortfolio(input);
  const pages: ResearchedSitePage[] = [];

  for (const sourceBrief of input.pageBriefs) {
    const brief = structuredClone(sourceBrief);
    const generatedCopy = await dependencies.generateCopy(brief, structuredClone(input.collectedData));
    pages.push({
      opportunityId: brief.page.id,
      classification: brief.page.pageClass as PageClassification,
      targetPath: brief.page.targetPath,
      brief: {
        faqPolicy: brief.faqPolicy,
        faqCandidates: structuredClone(brief.faqCandidates),
      },
      copy: structuredClone(generatedCopy),
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

export async function persistResearchedSiteRecordAtomic(
  record: ResearchedSiteGenerationRecord,
  options: PersistResearchedSiteRecordOptions,
): Promise<void> {
  const fileSystem = options.fileSystem ?? fs;
  if (!isSafeDeploymentSlug(record.slug)) fail('Invalid deployment slug.');
  if (options.dossier.researchId !== record.researchId || options.dossier.status !== 'copy_ready') {
    fail('Research dossier is not eligible for persistence.');
  }

  const sitesRoot = assertSafeSitesRoot(fileSystem, options.sitesRoot);
  const targetPath = path.resolve(sitesRoot, `${record.slug}.json`);
  if (!targetPath.startsWith(`${sitesRoot}${path.sep}`)) fail('Site record path escapes the sites root.');
  if (fileSystem.existsSync(targetPath) && fileSystem.lstatSync(targetPath).isSymbolicLink()) {
    fail('Site record target cannot be a symlink.');
  }

  const nonce = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const temporaryPath = path.join(sitesRoot, `.${record.slug}.${nonce}.tmp`);
  const rollbackPath = path.join(sitesRoot, `.${record.slug}.${nonce}.rollback`);
  const priorBytes = fileSystem.existsSync(targetPath) ? fileSystem.readFileSync(targetPath) : null;
  const updatedDossier = structuredClone(options.dossier);
  updatedDossier.status = transitionResearchStatus(updatedDossier.status, 'deploy_ready');
  updatedDossier.updatedAt = record.createdAt;
  updatedDossier.pipelineChecks = {
    ...updatedDossier.pipelineChecks,
    copy: 'pass',
    hebrewQa: 'pass',
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
    fail('Unable to persist deploy-ready research dossier.');
  }
}
