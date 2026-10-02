import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import { renderResearchedSitePages, type ResearchedSiteGraphEdge, type ResearchedSitePage } from '../lp/researchedSite';
import { VERTICAL_ASSETS, type VerticalAssets } from '../lp/verticalAssets';
import { detectVertical } from '../lp/verticalDetect';
import { VERTICAL_THEMES, type VerticalTheme } from '../lp/verticalThemes';
import type { ResearchedSiteGenerationRecord } from './researchedSiteGeneration';

const PREVIEW_ROOT = 'preview';
const BANNER = 'LOCAL PREVIEW - SYNTHETIC DATA - NO SUBMISSION';
const OPERATOR_BANNER = 'LOCAL OPERATOR PREVIEW - NOT PRODUCTION - NO SUBMISSION';
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const SAFE_OUTPUT = /^(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_.-]*$/;
const REMOTE_URL = /\b(?:https?:)?\/\//i;
const MAX_HERO_BYTES = 5 * 1024 * 1024;
const RENDERABLE_CLASSES = new Set([
  'homepage', 'service_hub', 'money_service', 'qualified_service_area', 'trust', 'process', 'pricing', 'proof', 'supporting',
]);

export interface LocalPreviewInput {
  synthetic: true;
  slug: string;
  canonicalOrigin: string;
  collectedData: CollectedData;
  pages: ResearchedSitePage[];
  graphEdges: ResearchedSiteGraphEdge[];
  theme: VerticalTheme;
  assets: VerticalAssets;
  heroAsset: { sourcePath: string; contents: string };
}

export interface LocalPreviewBundle {
  root: typeof PREVIEW_ROOT;
  files: Record<string, string>;
  manifest: {
    synthetic: boolean;
    deployable: false;
    canonicalOrigin: string;
    formsDisabled: true;
    outboundInteractionsDisabled: true;
    pages: string[];
    assets: string[];
    kind?: 'operator-researched';
  };
}

export interface OperatorLocalPreviewInput {
  record: ResearchedSiteGenerationRecord;
  heroDataUrl: string;
}

function requireSafeOrigin(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.invalid') || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Canonical origin must be an https .invalid origin.');
  }
  return parsed.origin;
}

function requireSafeAsset(asset: LocalPreviewInput['heroAsset']): void {
  if (!asset.sourcePath.startsWith('fixtures/site-bot/') || asset.sourcePath.includes('..') || !asset.sourcePath.endsWith('.svg')) {
    throw new Error('Hero asset path is unsafe.');
  }
  if (!asset.contents.trim() || !asset.contents.includes('<svg')) throw new Error('Local hero asset is missing.');
}

function requireSiteCopy(value: SiteCopy): void {
  if (!value || typeof value !== 'object') throw new Error('Research page copy is malformed.');
  const requiredStrings: Array<keyof SiteCopy> = [
    'heroHeadline', 'heroSubheadline', 'heroCta', 'aboutBlurb', 'servicesHeadline', 'faqHeadline',
    'guaranteeBlock', 'formHeadline', 'stickyBarLine', 'aboutPageHeadline', 'aboutPageBody',
  ];
  if (requiredStrings.some(key => typeof value[key] !== 'string' || !(value[key] as string).trim())) {
    throw new Error('Research page copy is malformed.');
  }
  if (!Array.isArray(value.trustBarItems) || !value.trustBarItems.every(item => typeof item === 'string') ||
    !Array.isArray(value.serviceItems) || !value.serviceItems.every(item => typeof item === 'string') ||
    !Array.isArray(value.faqItems) || !value.faqItems.every(item => item && typeof item.q === 'string' && typeof item.a === 'string') ||
    !Array.isArray(value.serviceDetails) || !value.serviceDetails.every(item => item && typeof item.name === 'string' && typeof item.description === 'string')) {
    throw new Error('Research page copy is malformed.');
  }
}

function requireSafePages(pages: ResearchedSitePage[], edges: ResearchedSiteGraphEdge[]): void {
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
    requireSiteCopy(page.copy);
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

function requireHeroDataUrl(value: string): string {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new Error('Operator hero data URL is unsupported.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_HERO_BYTES || bytes.toString('base64') !== match[2]) throw new Error('Operator hero payload is invalid or oversized.');
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if ((match[1] === 'png' && !png) || (match[1] === 'jpeg' && !jpeg) || (match[1] === 'webp' && !webp)) {
    throw new Error('Operator hero payload does not match its image type.');
  }
  return value;
}

function disableLinkTag(tag: string): string {
  const href = tag.match(/\shref=(['"])(.*?)\1/i)?.[2] ?? '';
  if (/^(?:\/|#|[a-z0-9][a-z0-9_./-]*\.html(?:#.*)?$)/i.test(href) && !REMOTE_URL.test(href)) return tag;
  const label = tag.replace(/^<a\b[^>]*>/i, '').replace(/<\/a>$/i, '');
  return `<span data-local-preview-disabled-link="true">${label}</span>`;
}

function makeHtmlSafe(html: string, canonicalOrigin: string, banner = BANNER): string {
  let safe = html
    .replace(/<script\b(?![^>]*\btype=(['"])application\/ld\+json\1)[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<link\b[^>]*(?:\brel=(['"])(?:stylesheet|preconnect)\1|\bhref=(['"])(?:https?:)?\/\/[^'">]+\2)[^>]*>\s*/gi, '')
    .replace(/https:\/\/schema\.org/g, canonicalOrigin)
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, disableLinkTag)
    .replace(/<form\b[^>]*>/gi, '<form data-local-preview-inert="true"><fieldset disabled>')
    .replace(/<\/form\s*>/gi, '</fieldset></form>')
    .replace(/\s(?:action|method|target|onsubmit|onclick|onload)=(['"])[\s\S]*?\1/gi, '')
    .replace(/\s(?:src|href)=(['"])(?:https?:)?\/\/[^'">]+\1/gi, '')
    .replace(/url\((['"]?)(?:https?:)?\/\/.*?\1\)/gi, 'none');
  safe = safe.replace(/<body([^>]*)>/i, `<body$1><aside role="status" aria-live="polite" style="background:#111;color:#fff;padding:12px;text-align:center;font:700 14px sans-serif;">${banner}</aside>`);
  return safe;
}

function assertOutputPath(path: string): void {
  if (!SAFE_OUTPUT.test(path) || path.includes('..') || path.startsWith('/') || `${PREVIEW_ROOT}/${path}`.split('/').includes('..')) {
    throw new Error('Preview output path escapes the owned root.');
  }
}

export function assertLocalPreviewBundleSafe(bundle: LocalPreviewBundle): void {
  const operator = bundle.manifest.synthetic === false && bundle.manifest.kind === 'operator-researched';
  const synthetic = bundle.manifest.synthetic === true && bundle.manifest.kind === undefined;
  if (bundle.root !== PREVIEW_ROOT || (!operator && !synthetic) || bundle.manifest.deployable ||
    bundle.manifest.formsDisabled !== true || bundle.manifest.outboundInteractionsDisabled !== true) throw new Error('Preview bundle metadata is unsafe.');
  const origin = requireSafeOrigin(bundle.manifest.canonicalOrigin);
  const expected = new Set([...bundle.manifest.pages, ...bundle.manifest.assets, 'sitemap.xml', 'preview-manifest.json']);
  const declaredHero = operator
    ? bundle.files['index.html']?.match(/data-local-preview-hero="true" src="(data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2})"/)?.[1]
    : undefined;
  if (operator && !declaredHero) throw new Error('Operator preview hero data URL is missing.');
  for (const path of Object.keys(bundle.files)) {
    assertOutputPath(path);
    if (!expected.has(path)) throw new Error('Preview bundle contains an undeclared file.');
  }
  for (const path of expected) if (!(path in bundle.files)) throw new Error('Preview bundle is incomplete.');
  for (const page of bundle.manifest.pages) {
    const html = bundle.files[page];
    const banner = operator ? OPERATOR_BANNER : BANNER;
    if (!html.includes(banner) || /<script\b(?![^>]*application\/ld\+json)/i.test(html) || /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/i.test(html)) {
      throw new Error('Preview page contains an executable or request-capable seam.');
    }
    if (/\b(?:tel:|mailto:|https?:\/\/|wa\.me)\b/i.test(html.replaceAll(origin, ''))) throw new Error('Preview page contains an outbound interaction.');
    if (/<form\b(?![^>]*data-local-preview-inert)/i.test(html) || /<a\b[^>]*href=(['"])(?:tel:|mailto:|https?:|\/\/)/i.test(html)) {
      throw new Error('Preview page contains an active form or outbound link.');
    }
    const dataUrls = html.match(/data:[^'"()\s<>]+/gi) ?? [];
    if (dataUrls.length && (!operator || dataUrls.some(value => value !== declaredHero))) {
      throw new Error('Preview page contains an undeclared data URL.');
    }
  }
}

export function buildSyntheticLocalPreview(input: LocalPreviewInput): LocalPreviewBundle {
  if (input.synthetic !== true || !SAFE_SLUG.test(input.slug)) throw new Error('Preview input must be synthetic with a safe slug.');
  const canonicalOrigin = requireSafeOrigin(input.canonicalOrigin);
  requireSafeAsset(input.heroAsset);
  requireSafePages(input.pages, input.graphEdges);
  const rendered = renderResearchedSitePages({
    theme: input.theme,
    assets: input.assets,
    data: input.collectedData,
    heroImageUrl: '/assets/hero.svg',
    slug: input.slug,
    siteUrl: canonicalOrigin,
    pages: input.pages,
    graphEdges: input.graphEdges,
  });
  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(rendered)) {
    assertOutputPath(path);
    files[path] = path.endsWith('.html') ? makeHtmlSafe(content, canonicalOrigin) : content.replaceAll(canonicalOrigin, canonicalOrigin);
  }
  files['assets/hero.svg'] = input.heroAsset.contents;
  const pages = Object.keys(files).filter(path => path.endsWith('.html')).sort();
  const assets = ['assets/hero.svg'];
  const manifest = { synthetic: true as const, deployable: false as const, canonicalOrigin, formsDisabled: true as const, outboundInteractionsDisabled: true as const, pages, assets };
  files['preview-manifest.json'] = `${JSON.stringify(manifest, null, 2)}\n`;
  const bundle: LocalPreviewBundle = { root: PREVIEW_ROOT, files, manifest };
  assertLocalPreviewBundleSafe(bundle);
  return bundle;
}

export function buildOperatorLocalPreview(input: OperatorLocalPreviewInput): LocalPreviewBundle {
  const record = input?.record;
  if (!record || !SAFE_SLUG.test(record.slug)) throw new Error('Operator preview record has an unsafe slug.');
  if (!OPAQUE_ID.test(record.researchId)) throw new Error('Operator preview record has an invalid research ID.');
  if (!record.collectedData || typeof record.collectedData !== 'object' || typeof record.collectedData.businessNiche !== 'string') {
    throw new Error('Operator preview record has invalid collected data.');
  }
  requireSafePages(record.researchedPages, record.researchedGraphEdges);
  const homepage = record.researchedPages.find(page => page.classification === 'homepage')!;
  if (record.approvedPageId !== homepage.opportunityId || JSON.stringify(record.copy) !== JSON.stringify(homepage.copy)) {
    throw new Error('Operator preview homepage compatibility fields are mismatched.');
  }
  if (typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt))) throw new Error('Operator preview record is incomplete.');

  const heroDataUrl = requireHeroDataUrl(input.heroDataUrl);
  const canonicalOrigin = requireSafeOrigin(`https://${record.slug}.invalid`);
  const vertical = detectVertical(record.collectedData.businessNiche);
  const rendered = renderResearchedSitePages({
    theme: VERTICAL_THEMES[vertical],
    assets: VERTICAL_ASSETS[vertical],
    data: structuredClone(record.collectedData),
    heroImageUrl: heroDataUrl,
    slug: record.slug,
    siteUrl: canonicalOrigin,
    pages: structuredClone(record.researchedPages),
    graphEdges: structuredClone(record.researchedGraphEdges),
  });
  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(rendered)) {
    assertOutputPath(path);
    files[path] = path.endsWith('.html') ? makeHtmlSafe(content, canonicalOrigin, OPERATOR_BANNER) : content;
  }
  files['index.html'] = files['index.html'].replace(
    '<main>',
    `<main><figure style="margin:0;background:#fff;text-align:center;"><img data-local-preview-hero="true" src="${heroDataUrl}" alt="" aria-hidden="true" style="display:block;width:100%;height:auto;max-height:360px;object-fit:cover;" /></figure>`,
  );
  const pages = Object.keys(files).filter(path => path.endsWith('.html')).sort();
  const manifest = {
    synthetic: false as const,
    deployable: false as const,
    canonicalOrigin,
    formsDisabled: true as const,
    outboundInteractionsDisabled: true as const,
    pages,
    assets: [],
    kind: 'operator-researched' as const,
  };
  files['preview-manifest.json'] = `${JSON.stringify(manifest, null, 2)}\n`;
  const bundle: LocalPreviewBundle = { root: PREVIEW_ROOT, files, manifest };
  assertLocalPreviewBundleSafe(bundle);
  return bundle;
}

export type { SiteCopy };
