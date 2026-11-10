import type { SiteCopy } from '../lp/lpCopyPrompt';
import type { ResearchedSiteGraphEdge, ResearchedSitePage } from '../lp/researchedSite';

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
/**
 * M2b.1d: page types that render (and generate) the about section; elsewhere the about pair is empty. Kept inline (this
 * module stays import-free for the deploy preflight sandbox); mirrors researchedSite.ts rendersSiteSections.
 */
const ABOUT_SECTION_CLASSES = new Set(['homepage', 'service_hub']);
const ABOUT_PAIR: readonly string[] = ['aboutPageHeadline', 'aboutPageBody'];
/** Copy v2 slice 2: never-rendered required strings (mirrors researchPageCopy RESEARCH_UNRENDERED_FIELDS, string ones). */
const UNRENDERED_STRINGS: readonly string[] = ['aboutBlurb', 'faqHeadline', 'stickyBarLine'];
const RENDERABLE_CLASSES = new Set([
  'homepage', 'service_hub', 'money_service', 'qualified_service_area', 'trust', 'process', 'pricing', 'proof', 'supporting',
]);

function requireSiteCopy(value: SiteCopy, classification: string): void {
  if (!value || typeof value !== 'object') throw new Error('Research page copy is malformed.');
  const requiredStrings: Array<keyof SiteCopy> = [
    'heroHeadline', 'heroSubheadline', 'heroCta', 'aboutBlurb', 'servicesHeadline', 'faqHeadline',
    'formHeadline', 'stickyBarLine', 'aboutPageHeadline', 'aboutPageBody',
  ];
  // M2b.1d: a page type that does not render the about section does not generate it (an empty about pair is valid there).
  // Copy v2 slice 2: the strings a research site never renders may be empty on every page type.
  const mayBeEmpty: readonly string[] = [...(ABOUT_SECTION_CLASSES.has(classification) ? [] : ABOUT_PAIR), ...UNRENDERED_STRINGS];
  if (requiredStrings.some(key => typeof value[key] !== 'string' || (!(value[key] as string).trim() && !(mayBeEmpty.includes(key) && value[key] === '')))) {
    throw new Error('Research page copy is malformed.');
  }
  // M2a.2: guaranteeBlock is null when the owner has no guarantee; when set it must be non-empty.
  if (value.guaranteeBlock !== null && (typeof value.guaranteeBlock !== 'string' || !value.guaranteeBlock.trim())) {
    throw new Error('Research page copy is malformed.');
  }
  if (!Array.isArray(value.trustBarItems) || !value.trustBarItems.every(item => typeof item === 'string') ||
    !Array.isArray(value.serviceItems) || !value.serviceItems.every(item => typeof item === 'string') ||
    !Array.isArray(value.faqItems) || !value.faqItems.every(item => item && typeof item.q === 'string' && typeof item.a === 'string') ||
    !Array.isArray(value.serviceDetails) || !value.serviceDetails.every(item => item && typeof item.name === 'string' && typeof item.description === 'string')) {
    throw new Error('Research page copy is malformed.');
  }
}

export function assertResearchedSiteGraphSafe(pages: ResearchedSitePage[], edges: ResearchedSiteGraphEdge[]): void {
  if (!Array.isArray(pages) || pages.length === 0 || !Array.isArray(edges)) throw new Error('Research pages and graph edges are required.');
  const outputs = new Set<string>();
  const ids = new Set<string>();
  for (const page of pages) {
    if (!page || !OPAQUE_ID.test(page.opportunityId) || ids.has(page.opportunityId)) throw new Error('Research pages must have unique IDs.');
    ids.add(page.opportunityId);
    if (!RENDERABLE_CLASSES.has(page.classification) || (page.classification === 'homepage' && page.targetPath !== '/') ||
      (page.classification !== 'homepage' && (!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/.test(page.targetPath) || page.targetPath.includes('..')))) {
      throw new Error('Research page path is unsafe.');
    }
    requireSiteCopy(page.copy, page.classification);
    const output = page.classification === 'homepage' ? 'index.html' : page.targetPath.slice(1).replace(/\/$/, '') || 'index.html';
    if (outputs.has(output)) throw new Error('Research pages contain a duplicate output path.');
    outputs.add(output);
  }
  if (pages.filter(page => page.classification === 'homepage').length !== 1) throw new Error('Preview requires one homepage.');
  const outgoing = new Map<string, string[]>();
  const edgeKeys = new Set<string>();
  for (const edge of edges) {
    const key = `${edge?.fromId}\u0000${edge?.toId}`;
    if (!edge || !ids.has(edge.fromId) || !ids.has(edge.toId)) throw new Error('Research graph contains an unknown page.');
    if (edgeKeys.has(key)) throw new Error('Research graph contains a duplicate edge.');
    edgeKeys.add(key);
    outgoing.set(edge.fromId, [...(outgoing.get(edge.fromId) ?? []), edge.toId]);
  }
  const home = pages.find(page => page.classification === 'homepage')!.opportunityId;
  const seen = new Set([home]);
  const queue = [home];
  while (queue.length) {
    for (const next of outgoing.get(queue.shift()!) ?? []) if (!seen.has(next)) {
      seen.add(next);
      queue.push(next);
    }
  }
  if (seen.size !== pages.length) throw new Error('Research graph contains an orphan selected page.');
}
