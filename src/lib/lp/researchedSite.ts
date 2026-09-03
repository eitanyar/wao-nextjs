/**
 * Research-selected site renderer.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import type { CollectedData } from '../bot/prompts';
import type { PageBrief } from '../site-bot/research/pageBrief';
import type { PageClassification } from '../site-bot/research/pagePortfolio';
import type { SiteCopy } from './lpCopyPrompt';
import type { RenderSitePagesParams } from './renderSitePages';
import {
  assembleDocument,
  contacts,
  esc,
  leadFormSection,
  localBusinessObject,
  pageHead,
  pageScript,
  renderSitePages,
  stickyHeader,
} from './renderSitePages';

const RESERVED_SEGMENTS = new Set(['api', 'assets', 'static', 'index', 'privacy', 'accessibility', 'contact', 'sitemap']);
const RENDERABLE_CLASSES = new Set<PageClassification>([
  'homepage', 'service_hub', 'money_service', 'qualified_service_area', 'trust', 'process', 'pricing', 'proof', 'supporting',
]);

export interface ResearchedSitePage {
  opportunityId: string;
  classification: PageClassification;
  targetPath: string;
  copy: SiteCopy;
  brief?: Pick<PageBrief, 'faqPolicy' | 'faqCandidates'>;
  areaServed?: { name: string; type?: 'City' | 'AdministrativeArea' | 'Place' };
  persistedSlug?: string;
}

export interface ResearchedSiteGraphEdge {
  fromId: string;
  toId: string;
}

export interface RenderResearchedSitePagesParams extends Omit<RenderSitePagesParams, 'copy'> {
  pages: ResearchedSitePage[];
  graphEdges?: ResearchedSiteGraphEdge[];
}

function normalizePath(value: string): string | null {
  const raw = value.trim().replace(/\\/g, '/');
  if (!raw || !raw.startsWith('/') || raw.includes('\0') || raw.includes('..')) return null;
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part) || RESERVED_SEGMENTS.has(part.toLowerCase()))) return null;
  return `/${parts.join('/')}`;
}

function validSlug(value: string | undefined): value is string {
  return Boolean(value && /^[a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9][a-z0-9-]*$/.test(value) && !RESERVED_SEGMENTS.has(value));
}

function asciiToken(value: string): string {
  const tokens: string[] = [];
  for (const char of value.normalize('NFKD').toLowerCase()) {
    if (/[a-z0-9]/.test(char)) tokens.push(char);
    else if (/\s|[-_./]/.test(char)) tokens.push('-');
    else if (/\p{L}|\p{N}/u.test(char)) tokens.push(`u${char.codePointAt(0)!.toString(16)}`);
  }
  return tokens.join('').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function buildStablePageSlug(opportunityId: string, label: string, persistedSlug?: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(opportunityId)) throw new Error('Opportunity ID must be opaque.');
  if (validSlug(persistedSlug)) return persistedSlug;
  const base = asciiToken(label) || 'page';
  const suffix = asciiToken(opportunityId) || `id-${Buffer.from(opportunityId).toString('hex').slice(0, 12)}`;
  return `${base.slice(0, 56).replace(/-$/g, '') || 'page'}--${suffix.slice(0, 32)}`;
}

function outputPath(page: ResearchedSitePage): string | null {
  if (page.classification === 'homepage') return 'index.html';
  const path = normalizePath(page.targetPath);
  if (!path) return null;
  const parts = path.slice(1).split('/');
  const last = parts.pop()!;
  const stable = buildStablePageSlug(page.opportunityId, last, page.persistedSlug);
  return [...parts, `${stable}.html`].join('/');
}

function approvedFaqs(page: ResearchedSitePage): Array<{ q: string; a: string }> {
  if (page.brief?.faqPolicy === 'none') return [];
  const supported = new Map((page.brief?.faqCandidates ?? []).map(item => [`${item.question}\u0000${item.answer}`, item]));
  const seen = new Set<string>();
  return page.copy.faqItems.flatMap(item => {
    const key = `${item.q}\u0000${item.a}`;
    const canonical = item.q.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
    if (!supported.has(key) || !canonical || seen.has(canonical)) return [];
    seen.add(canonical);
    return [{ q: item.q, a: item.a }];
  });
}

function selectedPages(pages: ResearchedSitePage[]): ResearchedSitePage[] {
  const ids = new Set<string>();
  const paths = new Set<string>();
  return pages.filter(page => {
    const output = outputPath(page);
    if (!RENDERABLE_CLASSES.has(page.classification) || !output || ids.has(page.opportunityId) || paths.has(output)) return false;
    ids.add(page.opportunityId);
    paths.add(output);
    return true;
  });
}

function reachablePageIds(pages: ResearchedSitePage[], edges: ResearchedSiteGraphEdge[]): Set<string> {
  const home = pages.find(page => page.classification === 'homepage');
  if (!home) return new Set();
  const reachable = new Set([home.opportunityId]);
  const usableEdges = edges.filter(edge => pages.some(page => page.opportunityId === edge.fromId) && pages.some(page => page.opportunityId === edge.toId));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of usableEdges) {
      if (reachable.has(edge.fromId) && !reachable.has(edge.toId)) {
        reachable.add(edge.toId);
        changed = true;
      }
    }
  }
  return reachable;
}

function pageUrl(siteUrl: string, output: string): string {
  return output === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${output}`;
}

function navigationLinks(page: ResearchedSitePage, pages: ResearchedSitePage[], outputs: Map<string, string>): ResearchedSitePage[] {
  if (page.classification === 'homepage') {
    const hub = pages.filter(item => item.classification === 'service_hub');
    return hub.length ? hub : pages.filter(item => item.classification !== 'homepage');
  }
  if (page.classification === 'service_hub') return pages.filter(item => item.classification === 'money_service' || item.classification === 'qualified_service_area');
  return pages.filter(item => item.opportunityId !== page.opportunityId && outputs.has(item.opportunityId)).slice(0, 3);
}

function schemaGraph(page: ResearchedSitePage, data: CollectedData, siteUrl: string, heroImageUrl: string, output: string): string {
  const { businessName } = contacts(data);
  const cleanUrl = siteUrl.replace(/\/$/, '');
  const faq = approvedFaqs(page);
  const service: Record<string, unknown> = {
    '@type': 'Service',
    '@id': `${pageUrl(cleanUrl, output)}#service`,
    name: page.copy.heroHeadline,
    provider: { '@id': `${cleanUrl}/#business` },
    description: page.copy.heroSubheadline,
    ...(page.areaServed ? { areaServed: { '@type': page.areaServed.type ?? 'Place', name: page.areaServed.name } } : {}),
  };
  const graph: Record<string, unknown>[] = [localBusinessObject(data, businessName, cleanUrl, heroImageUrl), service];
  if (faq.length) graph.push({
    '@type': 'FAQPage',
    '@id': `${pageUrl(cleanUrl, output)}#faq`,
    mainEntity: faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  });
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

function buildPageHtml(page: ResearchedSitePage, params: RenderResearchedSitePagesParams, siteUrl: string, output: string, allPages: ResearchedSitePage[], outputs: Map<string, string>): string {
  const { theme, data, heroImageUrl, slug } = params;
  const { phone, phoneHref, businessName } = contacts(data);
  const links = navigationLinks(page, allPages, outputs).flatMap(item => {
    const target = outputs.get(item.opportunityId);
    return target ? [`<a href="/${target === 'index.html' ? '' : target}" style="color:${theme.accent};font-weight:700;">${esc(item.copy.heroHeadline)}</a>`] : [];
  }).join('');
  const faq = approvedFaqs(page).map(item => `<details style="background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radiusMd};padding:14px;"><summary style="font-weight:700;color:${theme.primary};">${esc(item.q)}</summary><p style="color:${theme.textMuted};margin-top:8px;">${esc(item.a)}</p></details>`).join('');
  const head = pageHead({
    t: theme,
    title: `${page.copy.heroHeadline} — ${businessName}`,
    description: page.copy.heroSubheadline,
    canonicalUrl: pageUrl(siteUrl, output),
    ogImage: heroImageUrl,
    schema: schemaGraph(page, data, siteUrl, heroImageUrl, output),
  });
  const body = `${stickyHeader(theme, businessName, phone, phoneHref)}
  <main>
    <section style="padding:44px 20px;background:${theme.surface};text-align:center;"><div style="max-width:700px;margin:0 auto;"><h1 style="color:${theme.primary};font-size:clamp(1.6rem,4vw,2.3rem);margin-bottom:16px;">${esc(page.copy.heroHeadline)}</h1><p style="color:${theme.textMuted};line-height:1.7;">${esc(page.copy.heroSubheadline)}</p></div></section>
    ${links ? `<nav aria-label="Related pages" style="padding:20px;display:flex;flex-wrap:wrap;gap:14px;justify-content:center;background:${theme.surfaceAlt};">${links}</nav>` : ''}
    ${faq ? `<section style="padding:32px 20px;background:${theme.surfaceAlt};"><div style="max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:12px;">${faq}</div></section>` : ''}
    ${leadFormSection(theme, page.copy.formHeadline, page.copy.heroCta)}
  </main>
  ${pageScript({ slug, businessName, googleAdsCustomerId: params.googleAdsCustomerId || '', formConversionLabel: params.formConversionLabel || '', phoneConversionLabel: params.phoneConversionLabel || '', whatsappConversionLabel: params.whatsappConversionLabel || '', ctaLabel: page.copy.heroCta, includeLeadForm: true })}`;
  return assembleDocument(theme, head, body, params.gtagSnippet, data);
}

export function buildResearchedSitemapUrls(pages: ResearchedSitePage[], siteUrl = ''): string[] {
  const cleanUrl = siteUrl.replace(/\/$/, '');
  return selectedPages(pages).flatMap(page => {
    const output = outputPath(page)!;
    return [cleanUrl ? pageUrl(cleanUrl, output) : output];
  });
}

function buildResearchedSitemap(siteUrl: string, pages: ResearchedSitePage[]): string {
  const cleanUrl = siteUrl.replace(/\/$/, '');
  const urls = [...buildResearchedSitemapUrls(pages, cleanUrl), `${cleanUrl}/contact.html`];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>`;
}

export function buildResearchedSchemaGraph(page: ResearchedSitePage, data: CollectedData, siteUrl: string, heroImageUrl: string): string {
  const output = outputPath(page);
  if (!output) throw new Error('Research page has an unsafe path.');
  return schemaGraph(page, data, siteUrl, heroImageUrl, output);
}

export function renderResearchedSitePages(params: RenderResearchedSitePagesParams): Record<string, string> {
  const pages = selectedPages(params.pages);
  const home = pages.filter(page => page.classification === 'homepage');
  if (home.length !== 1) throw new Error('A researched site requires exactly one selected homepage.');
  const reachable = reachablePageIds(pages, params.graphEdges ?? []);
  if ((params.graphEdges?.length ?? 0) > 0 && pages.some(page => !reachable.has(page.opportunityId))) throw new Error('Research graph contains an orphan selected page.');
  const siteUrl = params.siteUrl.replace(/\/$/, '');
  const outputs = new Map(pages.map(page => [page.opportunityId, outputPath(page)!]));
  const legacy = renderSitePages({ ...params, copy: home[0].copy });
  delete legacy['index.html'];
  delete legacy['about.html'];
  delete legacy['services.html'];
  const rendered = Object.fromEntries(pages.map(page => {
    const output = outputs.get(page.opportunityId)!;
    return [output, buildPageHtml(page, params, siteUrl, output, pages, outputs)];
  }));
  return {
    ...legacy,
    ...rendered,
    'sitemap.xml': buildResearchedSitemap(siteUrl, pages),
  };
}
