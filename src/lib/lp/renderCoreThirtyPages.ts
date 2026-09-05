// Site Bot — core-30 (service x city) page renderer (VISION.md locked strategy,
// 2026-08-21). Renders the ~30 supplementary local-SEO pages (sherut/{id}.html)
// that sit alongside the 5-page brochure site built by renderSitePages.ts,
// reusing that module's exact visual system (theme tokens, header, nav,
// footer, page shell, schema) so a core-30 page looks like it belongs to the
// same site. Not wired into any route yet — a separate follow-up task does
// that, and a separate follow-up task calls duplicateCheck.ts as a pre-render
// gate. No network calls, no fs writes — pure render, returns a Record.
//
// No Hebrew string literals are authored in this file — every piece of
// Hebrew text rendered here flows from copy.*/data.*/node.service/node.city
// runtime values, same convention as renderSitePages.ts and coreThirtyCopy.ts.

import type { VerticalTheme } from './verticalThemes';
import type { VerticalAssets } from './verticalAssets';
import type { CollectedData } from '@/lib/bot/prompts';
import type { CoreThirtyNode } from './coreThirty';
import type { CoreThirtyPageCopy } from './coreThirtyCopy';
import {
  esc,
  contacts,
  stickyHeader,
  localBusinessObject,
  pageHead,
  leadFormSection,
  pageScript,
  assembleDocument,
} from './renderSitePages';

export interface RenderCoreThirtyPagesParams {
  nodes: CoreThirtyNode[];
  copies: Map<string, CoreThirtyPageCopy>; // keyed by CoreThirtyNode.id
  theme: VerticalTheme;
  assets: VerticalAssets;
  data: CollectedData;
  heroImageUrl: string;
  slug: string;
  siteUrl: string;
  googleAdsCustomerId?: string;
  phoneConversionLabel?: string;
  whatsappConversionLabel?: string;
  gtagSnippet?: string;
  formConversionLabel?: string;
  fraudBlockerSid?: string;
}

const MAX_RELATED_LINKS = 3;

export function renderCoreThirtyPages(params: RenderCoreThirtyPagesParams): Record<string, string> {
  const siteUrl = params.siteUrl.replace(/\/$/, '');
  const pages: Record<string, string> = {};

  for (const node of params.nodes) {
    const copy = params.copies.get(node.id);
    // A node with no real generated copy (generateCoreThirtyPageCopy can throw
    // upstream) gets no page, not a stub — mirrors Gate 1's "no filler pages"
    // principle at the render layer.
    if (!copy) continue;

    pages[`sherut/${node.id}.html`] = buildCoreThirtyNodeHtml(node, copy, params, siteUrl);
  }

  return pages;
}

// Pure helper: relative paths for every node that HAS a copy, suitable for
// passing into buildSitemap()'s extraPaths parameter.
export function buildCoreThirtySitemapUrls(
  nodes: CoreThirtyNode[],
  copies: Map<string, CoreThirtyPageCopy>
): string[] {
  return nodes.filter((n) => copies.has(n.id)).map((n) => `sherut/${n.id}.html`);
}

export function coreThirtyPageSchema(
  node: CoreThirtyNode,
  copy: CoreThirtyPageCopy,
  data: CollectedData,
  siteUrl: string,
  heroImageUrl: string
): string {
  const cleanSiteUrl = siteUrl.replace(/\/$/, '');
  const { businessName } = contacts(data);
  const businessEntity = localBusinessObject(data, businessName, cleanSiteUrl, heroImageUrl);

  const serviceEntity: Record<string, unknown> = {
    '@type': 'Service',
    '@id': `${cleanSiteUrl}/sherut/${node.id}.html#service`,
    name: copy.pageHeadline,
    serviceType: node.service,
    provider: {
      '@id': `${cleanSiteUrl}/#business`,
    },
    areaServed: {
      '@type': 'City',
      name: node.city,
    },
    description: copy.metaDescription,
  };

  const graph: Record<string, unknown>[] = [businessEntity, serviceEntity];

  if (copy.faqItems && copy.faqItems.length > 0) {
    const faqEntity: Record<string, unknown> = {
      '@type': 'FAQPage',
      '@id': `${cleanSiteUrl}/sherut/${node.id}.html#faq`,
      mainEntity: copy.faqItems.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    };
    graph.push(faqEntity);
  }

  const rootSchema = {
    '@context': 'https://schema.org',
    '@graph': graph,
  };

  return `<script type="application/ld+json">${JSON.stringify(rootSchema)}</script>`;
}

function buildCoreThirtyNodeHtml(
  node: CoreThirtyNode,
  copy: CoreThirtyPageCopy,
  params: RenderCoreThirtyPagesParams,
  siteUrl: string
): string {
  const { theme: t, data, heroImageUrl, slug } = params;
  const { phone, phoneHref, businessName } = contacts(data);
  const canonicalUrl = `${siteUrl}/sherut/${node.id}.html`;

  const head = pageHead({
    t,
    title: `${esc(copy.pageHeadline)} — ${esc(businessName)}`,
    description: copy.metaDescription,
    canonicalUrl,
    ogImage: heroImageUrl,
    schema: coreThirtyPageSchema(node, copy, data, siteUrl, heroImageUrl),
    fraudBlockerSid: params.fraudBlockerSid,
  });

  // localRelevanceNote — visually distinct callout (not a trust-bar pill row,
  // not buried in the narrative): the page's honest locationType framing.
  const relevanceNoteHtml = `
    <div style="max-width:600px;margin:0 auto;background:${t.trustBadgeBg};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:14px 18px;border-inline-start:4px solid ${t.accent};text-align:${t.heroTextAlign};">
      <p style="color:${t.textPrimary};font-size:0.92rem;line-height:1.5;font-weight:600;margin:0;">${esc(copy.localRelevanceNote)}</p>
    </div>`;

  const faqHtml = copy.faqItems.map(item => `
    <details style="background:${t.surface};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:14px 18px;">
      <summary style="font-weight:700;color:${t.primary};cursor:pointer;">${esc(item.q)}</summary>
      <p style="color:${t.textMuted};font-size:0.9rem;line-height:1.5;margin-top:8px;">${esc(item.a)}</p>
    </details>`).join('');

  const relatedLinksHtml = buildRelatedLinksBlock(node, params.nodes, t);

  const body = `${stickyHeader(t, businessName, phone, phoneHref)}

  <!-- Core-30 Hero / Narrative -->
  <section style="padding:44px 20px 24px;background:${t.surface};text-align:center;">
    <div style="max-width:600px;margin:0 auto;">
      <h1 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:clamp(1.5rem,4.5vw,2.1rem);color:${t.primary};line-height:1.25;margin-bottom:18px;">${esc(copy.pageHeadline)}</h1>
      <p style="color:${t.textMuted};font-size:1rem;line-height:1.7;">${esc(copy.narrative)}</p>
    </div>
  </section>

  <!-- Local Relevance Note (Gate 1 honesty anchor — surfaced, not buried) -->
  <section style="padding:0 20px 28px;background:${t.surface};">
    ${relevanceNoteHtml}
  </section>

  <!-- FAQ -->
  <section style="padding:32px 20px;background:${t.surfaceAlt};">
    <div style="max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:12px;">
      ${faqHtml}
    </div>
  </section>

${relatedLinksHtml}

${leadFormSection(t, copy.formHeadline, copy.ctaLabel)}

${pageScript({
    slug,
    businessName,
    googleAdsCustomerId: params.googleAdsCustomerId || '',
    formConversionLabel: params.formConversionLabel || '',
    phoneConversionLabel: params.phoneConversionLabel || '',
    whatsappConversionLabel: params.whatsappConversionLabel || '',
    ctaLabel: copy.ctaLabel,
    includeLeadForm: true,
  })}`;

  return assembleDocument(t, head, body, params.gtagSnippet, data);
}

// Internal-linking pattern that varies by genuine local relevance (Gate 1):
// prefer same-city/different-service siblings; fall back to same-service/
// different-city siblings when no same-city sibling exists; omit the block
// entirely when neither exists (never force fake links).
function buildRelatedLinksBlock(node: CoreThirtyNode, allNodes: CoreThirtyNode[], t: VerticalTheme): string {
  const sameCity = allNodes.filter((n) => n.id !== node.id && n.city === node.city);
  const sameService = allNodes.filter((n) => n.id !== node.id && n.service === node.service);

  const siblings = sameCity.length > 0 ? sameCity : sameService;
  if (siblings.length === 0) return '';

  const links = siblings
    .slice(0, MAX_RELATED_LINKS)
    .map((n) => `<a href="/sherut/${n.id}.html" style="color:${t.accent};font-weight:600;font-size:0.85rem;">${esc(n.service)} ${esc(n.city)}</a>`)
    .join('\n      ');

  return `  <!-- Related Pages -->
  <section style="padding:20px 20px 8px;background:${t.surfaceAlt};">
    <div style="max-width:700px;margin:0 auto;display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
      ${links}
    </div>
  </section>`;
}
