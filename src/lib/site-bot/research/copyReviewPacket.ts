import { createHash, timingSafeEqual } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { isSafeDeploymentSlug } from '../../deployment/deploy-access';
import type { ResearchedSitePage } from '../../lp/researchedSite';
import { assertResearchedSiteGraphSafe } from '../researchedSiteGraphValidation';
import type { SiteResearchDossier } from './types';

type PageIdentity = Pick<ResearchedSitePage, 'opportunityId' | 'classification' | 'targetPath'>;

export interface ResearchedCopyReviewPacket {
  sha256: string;
  researchId: string;
  slug: string;
  approvedPageId: string;
  pages: PageIdentity[];
  pageCount: number;
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const SAFE_PATH = /^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/;
const RESERVED_SEGMENTS = new Set(['api', 'assets', 'static', 'index', 'privacy', 'accessibility', 'contact', 'sitemap']);

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safePath(value: unknown): value is string {
  return typeof value === 'string' && (value === '/' ||
    (SAFE_PATH.test(value) && !value.includes('..') &&
      value.slice(1).split('/').every(segment => !RESERVED_SEGMENTS.has(segment.toLowerCase()))));
}

function identity(value: unknown): value is PageIdentity {
  return object(value) && typeof value.opportunityId === 'string' && OPAQUE_ID.test(value.opportunityId) &&
    typeof value.classification === 'string' && safePath(value.targetPath) &&
    (value.classification === 'homepage' ? value.targetPath === '/' : value.targetPath !== '/');
}

function digest(bytes: Buffer | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function recordInventory(bytes: Buffer | Uint8Array): Omit<ResearchedCopyReviewPacket, 'sha256'> {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) throw new Error('Invalid researched site record bytes.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('Invalid researched site record JSON.');
  }
  if (!object(parsed) || !isSafeDeploymentSlug(parsed.slug) ||
    typeof parsed.researchId !== 'string' || !OPAQUE_ID.test(parsed.researchId) ||
    parsed.simulation !== undefined || parsed.legacyCoreThirty === true ||
    typeof parsed.approvedPageId !== 'string' || !OPAQUE_ID.test(parsed.approvedPageId) ||
    !Array.isArray(parsed.researchedPages) || !Array.isArray(parsed.researchedGraphEdges)) {
    throw new Error('Invalid researched site record identity.');
  }
  // Validate the entire graph and every page's copy before extracting metadata.
  assertResearchedSiteGraphSafe(parsed.researchedPages, parsed.researchedGraphEdges);
  const pages: PageIdentity[] = parsed.researchedPages.map((page: unknown) => {
    if (!identity(page)) throw new Error('Unsafe researched page identity.');
    return { opportunityId: page.opportunityId, classification: page.classification, targetPath: page.targetPath };
  });
  const homepage = parsed.researchedPages.find((page: ResearchedSitePage) => page.classification === 'homepage');
  if (parsed.approvedPageId !== homepage.opportunityId || !isDeepStrictEqual(parsed.copy, homepage.copy)) {
    throw new Error('Researched homepage copy or identity mismatch.');
  }
  return {
    researchId: parsed.researchId,
    slug: parsed.slug,
    approvedPageId: parsed.approvedPageId,
    pages,
    pageCount: pages.length,
  };
}

export function buildResearchedCopyReviewPacket(
  recordBytes: Buffer | Uint8Array,
  dossier: SiteResearchDossier,
): ResearchedCopyReviewPacket {
  const inventory = recordInventory(recordBytes);
  if (!object(dossier) || dossier.researchId !== inventory.researchId || dossier.status !== 'copy_ready' ||
    dossier.pipelineChecks?.copy !== 'pass' || dossier.pipelineChecks?.hebrewQa !== 'pending' ||
    !Array.isArray(dossier.pageOpportunities)) {
    throw new Error('Research dossier is not eligible for copy review.');
  }
  const ids = new Set<string>();
  const paths = new Set<string>();
  const ready = new Map<string, string>();
  for (const item of dossier.pageOpportunities) {
    if (!object(item) || typeof item.id !== 'string' || !OPAQUE_ID.test(item.id) ||
      !safePath(item.targetPath) || ids.has(item.id) || paths.has(item.targetPath) ||
      !['ready', 'held', 'unknown'].includes(item.status as string)) {
      throw new Error('Invalid research opportunity identity.');
    }
    ids.add(item.id);
    paths.add(item.targetPath);
    if (item.status === 'ready') ready.set(item.id, item.targetPath);
  }
  if (ready.size !== inventory.pageCount || inventory.pages.some(page => ready.get(page.opportunityId) !== page.targetPath)) {
    throw new Error('Generated pages differ from ready research opportunities.');
  }
  return { sha256: digest(recordBytes), ...inventory };
}

export function matchesResearchedCopyReviewPacket(
  recordBytes: Buffer | Uint8Array,
  packet: ResearchedCopyReviewPacket,
): boolean {
  if (!(recordBytes instanceof Uint8Array) || !object(packet) ||
    typeof packet.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(packet.sha256) ||
    !isSafeDeploymentSlug(packet.slug) || typeof packet.researchId !== 'string' || !OPAQUE_ID.test(packet.researchId) ||
    typeof packet.approvedPageId !== 'string' || !OPAQUE_ID.test(packet.approvedPageId) ||
    !Array.isArray(packet.pages) || packet.pages.length === 0 ||
    !packet.pages.every(identity) || packet.pageCount !== packet.pages.length ||
    Object.keys(packet).sort().join(',') !== 'approvedPageId,pageCount,pages,researchId,sha256,slug' ||
    packet.pages.some(page => Object.keys(page).sort().join(',') !== 'classification,opportunityId,targetPath')) return false;
  const actual = Buffer.from(digest(recordBytes), 'hex');
  if (!timingSafeEqual(actual, Buffer.from(packet.sha256, 'hex'))) return false;
  try {
    const { sha256: _sha256, ...metadata } = packet;
    void _sha256;
    return isDeepStrictEqual(recordInventory(recordBytes), metadata);
  } catch {
    return false;
  }
}
